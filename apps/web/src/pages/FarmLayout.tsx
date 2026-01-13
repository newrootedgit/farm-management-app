import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useFarmStore } from '@/stores/farm-store';
import { useCanvasStore, CanvasElement, generateId } from '@/stores/canvas-store';
import {
  useFarmLayout,
  useUpdateFarmLayout,
  useLayoutElements,
  useCreateLayoutElement,
  useDeleteLayoutElement,
  useBulkUpdateLayoutElements,
  useElementPresets,
  useCreateElementPreset,
  useUpdateElementPreset,
  useDeleteElementPreset,
  useUserPreferences,
  useUpdateUserPreferences,
  useRackAssignments,
} from '@/lib/api-client';
import { FarmCanvas, CanvasToolbar, PropertiesPanel } from '@/components/farm-canvas';
import { WallDrawModal } from '@/components/farm-canvas/WallDrawModal';
import { GrowRackModal } from '@/components/farm-canvas/GrowRackModal';
import { PresetManagerModal } from '@/components/farm-canvas/PresetManagerModal';
import { LayoutTutorial } from '@/components/farm-canvas/LayoutTutorial';
import type { UnitSystem } from '@farm/shared';

export default function FarmLayout() {
  const { currentFarmId } = useFarmStore();

  // API queries
  const { data: layout, isLoading: layoutLoading } = useFarmLayout(currentFarmId ?? undefined);
  const { data: apiElements, isLoading: elementsLoading } = useLayoutElements(currentFarmId ?? undefined);
  const { data: presets } = useElementPresets(currentFarmId ?? undefined);
  const { data: userPrefs, isLoading: prefsLoading } = useUserPreferences(currentFarmId ?? undefined);
  const { data: rackAssignments } = useRackAssignments(currentFarmId ?? undefined);

  // Mutations
  const updateLayout = useUpdateFarmLayout(currentFarmId ?? '');
  const createElement = useCreateLayoutElement(currentFarmId ?? '');
  const deleteElement = useDeleteLayoutElement(currentFarmId ?? '');
  const bulkUpdateElements = useBulkUpdateLayoutElements(currentFarmId ?? '');
  const updatePreferences = useUpdateUserPreferences(currentFarmId ?? '');
  const createPreset = useCreateElementPreset(currentFarmId ?? '');
  const updatePreset = useUpdateElementPreset(currentFarmId ?? '');
  const deletePreset = useDeleteElementPreset(currentFarmId ?? '');

  // Canvas store
  const {
    elements,
    zones,
    setElements,
    selectedIds,
    selectedType,
    setSelectedId,
    clearSelection,
    deleteSelectedElements,
    setDirty,
    unitSystem,
    setUnitSystem,
    resetWallDrawing,
    addElement: addElementToStore,
    addElements: addElementsToStore,
    updateElement,
    undo,
    redo,
    setActiveTool,
    pushHistory,
    resetHistory,
    isEditMode,
    setEditMode,
    setSavedState,
    revertToSaved,
  } = useCanvasStore();

  // Local state
  const [selectedElement, setSelectedElement] = useState<CanvasElement | null>(null);
  const [selectedElements, setSelectedElements] = useState<CanvasElement[]>([]);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [showTutorial, setShowTutorial] = useState(false);
  const [wallModalStartPoint, setWallModalStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [growRackModalOpen, setGrowRackModalOpen] = useState(false);
  const [editingGrowRack, setEditingGrowRack] = useState<CanvasElement | null>(null);
  const [presetManagerOpen, setPresetManagerOpen] = useState(false);
  const [clipboard, setClipboard] = useState<CanvasElement[]>([]);
  const [saveNotification, setSaveNotification] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const historyInitializedRef = useRef(false);
  const isSavingRef = useRef(false);

  // Sync API elements to canvas store on load
  useEffect(() => {
    // Skip sync while saving to prevent overwriting local state with stale API data
    if (isSavingRef.current) {
      return;
    }
    if (apiElements) {
      const canvasElements: CanvasElement[] = apiElements.map((el) => {
        // Walls and walkways use line coordinates (startX, startY, endX, endY)
        const isLineElement = el.type === 'WALL' || el.type === 'WALKWAY';
        return {
          id: el.id,
          name: el.name,
          type: el.type,
          // Line element coordinates - convert to number
          startX: isLineElement ? (Number(el.startX) || 0) : undefined,
          startY: isLineElement ? (Number(el.startY) || 0) : undefined,
          endX: isLineElement ? (Number(el.endX) || 0) : undefined,
          endY: isLineElement ? (Number(el.endY) || 0) : undefined,
          thickness: el.thickness != null ? Number(el.thickness) : undefined,
          // Non-line element position (rectangles)
          x: !isLineElement && el.positionX != null ? Number(el.positionX) : undefined,
          y: !isLineElement && el.positionY != null ? Number(el.positionY) : undefined,
          width: el.width != null ? Number(el.width) : undefined,
          height: el.height != null ? Number(el.height) : undefined,
          rotation: Number(el.rotation) || 0,
          color: el.color,
          opacity: el.opacity,
          presetId: el.presetId ?? undefined,
          metadata: el.metadata as CanvasElement['metadata'] ?? undefined,
        };
      });
      setElements(canvasElements);
      // Save this state as the "saved" state for cancel/revert functionality
      setSavedState(canvasElements, []);
      // Initialize history only once on first load
      if (!historyInitializedRef.current) {
        pushHistory();
        historyInitializedRef.current = true;
      }
    }
  }, [apiElements, setElements, pushHistory, setSavedState]);

  // Reset history flag when farm changes so new farm gets fresh history
  useEffect(() => {
    historyInitializedRef.current = false;
  }, [currentFarmId]);

  // Sync user preferences
  useEffect(() => {
    if (userPrefs) {
      setUnitSystem(userPrefs.preferredUnit);
      // Show tutorial if user hasn't seen it
      if (!userPrefs.hasSeenLayoutTutorial) {
        setShowTutorial(true);
      }
    }
  }, [userPrefs, setUnitSystem]);

  // Update canvas size based on container using ResizeObserver for accuracy
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCanvasSize({
          width: Math.floor(rect.width),
          height: Math.max(500, Math.floor(rect.height)),
        });
      }
    };

    // Initial size calculation
    updateSize();

    // Re-check after layout settles (fixes timing issue on page load)
    const frameId = requestAnimationFrame(() => {
      updateSize();
      // Double-check after a short delay for slow layouts
      setTimeout(updateSize, 100);
    });

    // Use ResizeObserver for ongoing size tracking
    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener('resize', updateSize);
    return () => {
      window.removeEventListener('resize', updateSize);
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
    };
  }, []);

  // Find selected element(s)
  useEffect(() => {
    if (selectedIds.length > 0 && selectedType === 'element') {
      // For single selection, set selectedElement for backward compatibility
      const firstElement = elements.find((e) => e.id === selectedIds[0]);
      setSelectedElement(firstElement ?? null);
      // Set all selected elements
      const allSelected = elements.filter((e) => selectedIds.includes(e.id));
      setSelectedElements(allSelected);
    } else {
      setSelectedElement(null);
      setSelectedElements([]);
    }
  }, [selectedIds, selectedType, elements]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // Cmd/Ctrl + Z = Undo (only in edit mode)
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        if (isEditMode) {
          e.preventDefault();
          undo();
        }
        return;
      }

      // Cmd/Ctrl + Shift + Z = Redo (only in edit mode)
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        if (isEditMode) {
          e.preventDefault();
          redo();
        }
        return;
      }

      // Cmd/Ctrl + Y = Redo (alternative, only in edit mode)
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        if (isEditMode) {
          e.preventDefault();
          redo();
        }
        return;
      }

      // Cmd/Ctrl + C = Copy (copies all selected elements)
      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        if (selectedIds.length > 0 && selectedType === 'element' && selectedElements.length > 0) {
          e.preventDefault();
          // Deep copy all selected elements
          setClipboard(selectedElements.map(el => ({
            ...el,
            metadata: el.metadata ? { ...el.metadata } : undefined,
          })));
        }
        return;
      }

      // Cmd/Ctrl + V = Paste (pastes all copied elements, only in edit mode)
      if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        if (clipboard.length > 0 && isEditMode) {
          e.preventDefault();
          const offset = 20; // Offset so pasted items are visible
          const newElements: CanvasElement[] = [];

          for (const el of clipboard) {
            const isLineElement = el.type === 'WALL' || el.type === 'WALKWAY';
            const newElement: CanvasElement = {
              ...el,
              id: generateId(isLineElement ? el.type.toLowerCase() : 'el'),
              name: `${el.name} (copy)`,
              metadata: el.metadata ? { ...el.metadata } : undefined,
            };

            // Offset position based on element type
            if (isLineElement) {
              newElement.startX = (el.startX ?? 0) + offset;
              newElement.startY = (el.startY ?? 0) + offset;
              newElement.endX = (el.endX ?? 0) + offset;
              newElement.endY = (el.endY ?? 0) + offset;
            } else {
              newElement.x = (el.x ?? 0) + offset;
              newElement.y = (el.y ?? 0) + offset;
            }

            newElements.push(newElement);
          }

          // Add all elements at once (single undo operation)
          addElementsToStore(newElements);
          const newIds = newElements.map(el => el.id);

          // Update clipboard with new positions so next paste stacks progressively
          setClipboard(newElements.map(el => ({
            ...el,
            metadata: el.metadata ? { ...el.metadata } : undefined,
          })));

          // Select all newly pasted elements
          if (newIds.length === 1) {
            setSelectedId(newIds[0], 'element');
          } else if (newIds.length > 1) {
            useCanvasStore.setState({ selectedIds: newIds, selectedType: 'element' });
          }
        }
        return;
      }

      // Cmd/Ctrl + D = Duplicate (copy + paste in one action, duplicates all selected, only in edit mode)
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        if (!isEditMode) return;
        const offset = 20;

        if (selectedIds.length > 0 && selectedType === 'element' && selectedElements.length > 0) {
          const newElements: CanvasElement[] = [];

          for (const el of selectedElements) {
            const isLineElement = el.type === 'WALL' || el.type === 'WALKWAY';
            const newElement: CanvasElement = {
              ...el,
              id: generateId(isLineElement ? el.type.toLowerCase() : 'el'),
              name: `${el.name} (copy)`,
              metadata: el.metadata ? { ...el.metadata } : undefined,
            };

            if (isLineElement) {
              newElement.startX = (el.startX ?? 0) + offset;
              newElement.startY = (el.startY ?? 0) + offset;
              newElement.endX = (el.endX ?? 0) + offset;
              newElement.endY = (el.endY ?? 0) + offset;
            } else {
              newElement.x = (el.x ?? 0) + offset;
              newElement.y = (el.y ?? 0) + offset;
            }

            newElements.push(newElement);
          }

          // Add all elements at once (single undo operation)
          addElementsToStore(newElements);
          const newIds = newElements.map(el => el.id);

          // Select all duplicated elements
          if (newIds.length === 1) {
            setSelectedId(newIds[0], 'element');
          } else if (newIds.length > 1) {
            useCanvasStore.setState({ selectedIds: newIds, selectedType: 'element' });
          }
        }
        return;
      }

      // Delete or Backspace = Delete selected item(s) (only in edit mode)
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.length > 0 && selectedType === 'element' && isEditMode) {
          e.preventDefault();
          deleteSelectedElements();
          setSelectedElement(null);
          setSelectedElements([]);
        }
        return;
      }

      // Escape = Cancel edit mode or deselect
      if (e.key === 'Escape') {
        e.preventDefault();
        if (isEditMode) {
          // Exit edit mode and revert changes
          revertToSaved();
          setEditMode(false);
        }
        clearSelection();
        setSelectedElement(null);
        setSelectedElements([]);
        resetWallDrawing();
        setActiveTool('select');
        return;
      }

      // S or V = Select tool
      if (e.key === 's' || e.key === 'S' || e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        setActiveTool('select');
        return;
      }

      // H = Pan tool
      if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        setActiveTool('pan');
        return;
      }

      // M = Measure tool
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setActiveTool('measure');
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedIds,
    selectedType,
    selectedElement,
    selectedElements,
    clipboard,
    undo,
    redo,
    addElementToStore,
    deleteSelectedElements,
    setSelectedId,
    clearSelection,
    resetWallDrawing,
    setActiveTool,
    isEditMode,
    revertToSaved,
    setEditMode,
  ]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!currentFarmId) return;

    // Set saving flag to prevent useEffect sync during save
    isSavingRef.current = true;

    try {
      // Save layout canvas data
      await updateLayout.mutateAsync({
        width: layout?.canvasData?.width ?? 1200,
        height: layout?.canvasData?.height ?? 800,
        backgroundColor: '#f5f5f5',
        gridSize: 20,
      });

      // Separate elements into: new, existing, and deleted
      const canvasIds = new Set(elements.map((el) => el.id));
      const apiIds = new Set(apiElements?.map((el) => el.id) ?? []);

      const newElements = elements.filter((el) => !apiIds.has(el.id));
      const existingElements = elements.filter((el) => apiIds.has(el.id));
      const deletedIds = (apiElements ?? []).filter((el) => !canvasIds.has(el.id)).map((el) => el.id);

      // Delete elements that were removed from the canvas
      for (const id of deletedIds) {
        await deleteElement.mutateAsync(id);
      }

      // Create new elements via API
      for (const el of newElements) {
        await createElement.mutateAsync({
          name: el.name,
          type: el.type,
          startX: el.startX,
          startY: el.startY,
          endX: el.endX,
          endY: el.endY,
          thickness: el.thickness ?? 10,
          positionX: el.x,
          positionY: el.y,
          width: el.width,
          height: el.height,
          rotation: el.rotation ?? 0,
          color: el.color,
          opacity: el.opacity,
          metadata: el.metadata,
          presetId: el.presetId,
        });
      }

      // Bulk update existing elements
      if (existingElements.length > 0) {
        const elementUpdates = existingElements.map((el) => ({
          id: el.id,
          updates: {
            name: el.name,
            startX: el.startX,
            startY: el.startY,
            endX: el.endX,
            endY: el.endY,
            thickness: el.thickness,
            positionX: el.x,
            positionY: el.y,
            width: el.width,
            height: el.height,
            rotation: el.rotation,
            color: el.color,
            opacity: el.opacity,
            metadata: el.metadata,
            presetId: el.presetId,
          },
        }));

        await bulkUpdateElements.mutateAsync(elementUpdates);
      }

      setDirty(false);

      // Update saved state so cancel reverts to this new state
      setSavedState(elements, zones);

      // Reset history so user can't undo past this saved state
      resetHistory();

      // Show success notification
      setSaveNotification('Layout saved successfully!');
      setTimeout(() => setSaveNotification(null), 3000);
    } catch (error) {
      console.error('Failed to save layout:', error);
      setSaveNotification('Failed to save layout');
      setTimeout(() => setSaveNotification(null), 3000);
    } finally {
      // Clear saving flag after a longer delay to allow React Query refetch to complete
      // This prevents the sync effect from overwriting local state with API data
      setTimeout(() => {
        isSavingRef.current = false;
      }, 3000);
    }
  }, [currentFarmId, layout, elements, zones, apiElements, updateLayout, createElement, deleteElement, bulkUpdateElements, setDirty, resetHistory, setSavedState]);

  // Handle cancel - revert to last saved state
  const handleCancel = useCallback(() => {
    revertToSaved();
    setEditMode(false);
    clearSelection();
  }, [revertToSaved, setEditMode, clearSelection]);

  // Calculate farm stats for view mode
  const farmStats = useMemo(() => {
    const growRacks = elements.filter(e => e.type === 'GROW_RACK');
    const totalCapacity = growRacks.reduce((sum, rack) => {
      const levels = rack.metadata?.levels ?? 1;
      const traysPerLevel = rack.metadata?.traysPerLevel ?? 6;
      return sum + (levels * traysPerLevel);
    }, 0);
    const inUse = rackAssignments?.reduce((sum, a) => sum + a.trayCount, 0) ?? 0;
    return { totalCapacity, inUse, rackCount: growRacks.length };
  }, [elements, rackAssignments]);

  // Calculate upcoming harvests for view mode
  const upcomingHarvests = useMemo(() => {
    if (!rackAssignments || rackAssignments.length === 0) return [];

    const harvests = rackAssignments
      .filter(a => a.orderItem?.harvestDate)
      .map(a => {
        const rackElement = elements.find(e => e.id === a.rackElementId);
        return {
          productName: a.orderItem?.product?.name ?? 'Unknown',
          rackName: rackElement?.name ?? 'Unknown Rack',
          rackId: a.rackElementId,
          harvestDate: new Date(a.orderItem!.harvestDate!),
          trayCount: a.trayCount,
        };
      })
      .filter(h => h.harvestDate >= new Date()) // Only future harvests
      .sort((a, b) => a.harvestDate.getTime() - b.harvestDate.getTime());

    return harvests;
  }, [rackAssignments, elements]);

  // Handle element selection from canvas
  const handleElementSelect = useCallback((element: CanvasElement | null) => {
    setSelectedElement(element);
  }, []);

  // Handle multi-selection from canvas (marquee or Cmd/Shift click)
  const handleMultiSelect = useCallback((selectedElements: CanvasElement[]) => {
    setSelectedElements(selectedElements);
    // Set first element as the primary selected element for backward compatibility
    setSelectedElement(selectedElements.length > 0 ? selectedElements[0] : null);
  }, []);

  // Handle unit change
  const handleUnitChange = useCallback((newUnit: UnitSystem) => {
    setUnitSystem(newUnit);
    updatePreferences.mutate({ preferredUnit: newUnit });
  }, [setUnitSystem, updatePreferences]);

  // Handle tutorial completion
  const handleTutorialComplete = useCallback(() => {
    setShowTutorial(false);
    updatePreferences.mutate({ hasSeenLayoutTutorial: true });
  }, [updatePreferences]);

  // Handle tutorial skip
  const handleTutorialSkip = useCallback(() => {
    setShowTutorial(false);
    updatePreferences.mutate({ hasSeenLayoutTutorial: true });
  }, [updatePreferences]);

  // Handle wall modal open
  const handleOpenWallModal = useCallback((startPoint: { x: number; y: number }) => {
    setWallModalStartPoint(startPoint);
  }, []);

  // Handle wall modal close
  const handleCloseWallModal = useCallback(() => {
    setWallModalStartPoint(null);
    resetWallDrawing();
  }, [resetWallDrawing]);

  // Handle saving an element as a preset
  const handleSaveAsPreset = useCallback(async (element: CanvasElement) => {
    const name = prompt('Enter a name for this preset:', `${element.name} Preset`);
    if (!name || !name.trim()) return;

    try {
      await createPreset.mutateAsync({
        name: name.trim(),
        type: element.type,
        defaultWidth: element.width,
        defaultHeight: element.height,
        defaultColor: element.color,
        // Include grow rack metadata in preset
        ...(element.type === 'GROW_RACK' && element.metadata && {
          metadata: {
            levels: element.metadata.levels,
            traysPerLevel: element.metadata.traysPerLevel,
            trayCapacity: element.metadata.trayCapacity,
          },
        }),
      });
      alert(`Preset "${name}" saved! You can now find it in the Add Element dropdown.`);
    } catch (error) {
      console.error('Failed to save preset:', error);
      alert('Failed to save preset. Please try again.');
    }
  }, [createPreset]);

  if (!currentFarmId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No Farm Selected</h2>
          <p className="text-muted-foreground">Select a farm from the sidebar to view the layout.</p>
        </div>
      </div>
    );
  }

  if (layoutLoading || elementsLoading || prefsLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Farm Layout</h1>
          <p className="text-muted-foreground">Interactive 2D view of your farm</p>
        </div>
        <button
          onClick={() => setShowTutorial(true)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
          title="View tutorial"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Tutorial
        </button>
      </div>

      <div className="flex-1 flex flex-col border rounded-lg overflow-hidden bg-card">
        <CanvasToolbar
          onSave={handleSave}
          onCancel={handleCancel}
          isSaving={updateLayout.isPending || deleteElement.isPending || bulkUpdateElements.isPending}
          presets={presets}
          onAddGrowRack={() => setGrowRackModalOpen(true)}
          onManagePresets={() => setPresetManagerOpen(true)}
          unitSystem={unitSystem}
          onUnitChange={handleUnitChange}
        />

        <div className="flex-1 flex overflow-hidden">
          {/* Canvas container */}
          <div ref={containerRef} className="flex-1 min-w-0 overflow-hidden">
            <FarmCanvas
              width={canvasSize.width}
              height={canvasSize.height}
              unitSystem={unitSystem}
              presets={presets}
              rackAssignments={rackAssignments}
              onElementSelect={handleElementSelect}
              onMultiSelect={handleMultiSelect}
              onOpenWallModal={handleOpenWallModal}
            />
          </div>

          {/* Properties panel */}
          <PropertiesPanel
            element={selectedElement}
            selectedElements={selectedElements}
            unitSystem={unitSystem}
            onSaveAsPreset={handleSaveAsPreset}
            onEditGrowRack={(element) => {
              setEditingGrowRack(element);
              setGrowRackModalOpen(true);
            }}
            isEditMode={isEditMode}
            rackAssignments={rackAssignments}
            farmStats={farmStats}
            upcomingHarvests={upcomingHarvests}
          />
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-4 text-sm text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
        <strong>Shortcuts:</strong>
        <span className="inline-flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">S</kbd> Select
        </span>
        <span className="inline-flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">H</kbd> Pan
        </span>
        <span className="inline-flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">M</kbd> Measure
        </span>
        <span className="text-border">|</span>
        <span className="inline-flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">⌘/⇧+Click</kbd> Multi-select
        </span>
        <span className="inline-flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Drag</kbd> Box select
        </span>
        <span className="text-border">|</span>
        <span className="inline-flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">⌘C</kbd> Copy
        </span>
        <span className="inline-flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">⌘V</kbd> Paste
        </span>
        <span className="inline-flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">⌘D</kbd> Duplicate
        </span>
        <span className="inline-flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">⌘Z</kbd> Undo
        </span>
        <span className="inline-flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Del</kbd> Remove
        </span>
        <span className="inline-flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Esc</kbd> Cancel
        </span>
      </div>

      {/* Save notification */}
      {saveNotification && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-sm font-medium ${
            saveNotification.includes('Failed')
              ? 'bg-red-100 text-red-800 border border-red-200'
              : 'bg-green-100 text-green-800 border border-green-200'
          }`}
        >
          {saveNotification}
        </div>
      )}

      {/* Tutorial overlay */}
      {showTutorial && (
        <LayoutTutorial
          onComplete={handleTutorialComplete}
          onSkip={handleTutorialSkip}
        />
      )}

      {/* Wall draw modal */}
      {wallModalStartPoint && (
        <WallDrawModal
          isOpen={true}
          startPoint={wallModalStartPoint}
          unitSystem={unitSystem}
          onClose={handleCloseWallModal}
          onWallCreated={handleElementSelect}
        />
      )}

      {/* Grow Rack modal */}
      <GrowRackModal
        isOpen={growRackModalOpen}
        onClose={() => {
          setGrowRackModalOpen(false);
          setEditingGrowRack(null);
        }}
        unitSystem={unitSystem}
        editingElement={editingGrowRack}
        position={{ x: 100, y: 100 }}
      />

      {/* Preset Manager modal */}
      <PresetManagerModal
        isOpen={presetManagerOpen}
        onClose={() => setPresetManagerOpen(false)}
        presets={presets ?? []}
        unitSystem={unitSystem}
        onSelectPreset={(preset) => {
          // Set the active element type with the preset
          const { setActiveElementType } = useCanvasStore.getState();
          setActiveElementType(preset.type, preset.id);
        }}
        onCreatePreset={(data) => {
          createPreset.mutate(data);
        }}
        onUpdatePreset={(presetId, data) => {
          // Update the preset in the database
          updatePreset.mutate({ presetId, data });

          // Update all canvas elements that use this preset
          const elementsUsingPreset = elements.filter(el => el.presetId === presetId);
          if (elementsUsingPreset.length > 0) {
            // Push history before making changes for undo support
            pushHistory();

            for (const el of elementsUsingPreset) {
              const updates: Partial<CanvasElement> = {};

              // Update dimensions if provided
              if (data.defaultWidth !== undefined) {
                updates.width = data.defaultWidth;
              }
              if (data.defaultHeight !== undefined) {
                updates.height = data.defaultHeight;
              }

              // Update color if provided
              if (data.defaultColor !== undefined) {
                updates.color = data.defaultColor;
              }

              // Update metadata if provided (for grow racks: levels, traysPerLevel, trayCapacity)
              if (data.metadata) {
                updates.metadata = {
                  ...el.metadata,
                  ...data.metadata,
                };
              }

              updateElement(el.id, updates);
            }

            setDirty(true);
          }
        }}
        onDeletePreset={(presetId) => {
          deletePreset.mutate(presetId);
        }}
      />
    </div>
  );
}
