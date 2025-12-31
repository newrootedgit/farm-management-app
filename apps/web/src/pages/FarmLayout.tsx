import { useEffect, useState, useRef, useCallback } from 'react';
import { useFarmStore } from '@/stores/farm-store';
import { useCanvasStore, CanvasZone, CanvasElement, generateId } from '@/stores/canvas-store';
import {
  useFarmLayout,
  useUpdateFarmLayout,
  useZones,
  useLayoutElements,
  useCreateLayoutElement,
  useUpdateLayoutElement,
  useDeleteLayoutElement,
  useBulkUpdateLayoutElements,
  useElementPresets,
  useCreateElementPreset,
  useUserPreferences,
  useUpdateUserPreferences,
} from '@/lib/api-client';
import { FarmCanvas, CanvasToolbar, PropertiesPanel } from '@/components/farm-canvas';
import { WallDrawModal } from '@/components/farm-canvas/WallDrawModal';
import { LayoutTutorial } from '@/components/farm-canvas/LayoutTutorial';
import type { UnitSystem } from '@farm/shared';

export default function FarmLayout() {
  const { currentFarmId } = useFarmStore();

  // API queries
  const { data: layout, isLoading: layoutLoading } = useFarmLayout(currentFarmId ?? undefined);
  const { data: apiZones, isLoading: zonesLoading } = useZones(currentFarmId ?? undefined);
  const { data: apiElements, isLoading: elementsLoading } = useLayoutElements(currentFarmId ?? undefined);
  const { data: presets } = useElementPresets(currentFarmId ?? undefined);
  const { data: userPrefs, isLoading: prefsLoading } = useUserPreferences(currentFarmId ?? undefined);

  // Mutations
  const updateLayout = useUpdateFarmLayout(currentFarmId ?? '');
  const createElement = useCreateLayoutElement(currentFarmId ?? '');
  const updateElement = useUpdateLayoutElement(currentFarmId ?? '');
  const deleteElement = useDeleteLayoutElement(currentFarmId ?? '');
  const bulkUpdateElements = useBulkUpdateLayoutElements(currentFarmId ?? '');
  const updatePreferences = useUpdateUserPreferences(currentFarmId ?? '');
  const createPreset = useCreateElementPreset(currentFarmId ?? '');

  // Canvas store
  const {
    zones,
    elements,
    setZones,
    setElements,
    selectedId,
    selectedType,
    setSelectedId,
    setDirty,
    unitSystem,
    setUnitSystem,
    resetWallDrawing,
    addZone,
    deleteZone,
    addElement: addElementToStore,
    deleteElement: deleteElementFromStore,
    undo,
    redo,
    setActiveTool,
  } = useCanvasStore();

  // Local state
  const [selectedZone, setSelectedZone] = useState<CanvasZone | null>(null);
  const [selectedElement, setSelectedElement] = useState<CanvasElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [showTutorial, setShowTutorial] = useState(false);
  const [wallModalStartPoint, setWallModalStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [clipboard, setClipboard] = useState<{ type: 'zone' | 'element'; data: CanvasZone | CanvasElement } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync API zones to canvas store on load
  useEffect(() => {
    if (apiZones) {
      const canvasZones: CanvasZone[] = apiZones.map((z) => ({
        id: z.id,
        name: z.name,
        type: z.type,
        color: z.color,
        x: z.positionX ?? 50,
        y: z.positionY ?? 50,
        width: z.width ?? 150,
        height: z.height ?? 100,
      }));
      setZones(canvasZones);
    }
  }, [apiZones, setZones]);

  // Sync API elements to canvas store on load
  useEffect(() => {
    if (apiElements) {
      const canvasElements: CanvasElement[] = apiElements.map((el) => ({
        id: el.id,
        name: el.name,
        type: el.type,
        startX: el.startX ?? undefined,
        startY: el.startY ?? undefined,
        endX: el.endX ?? undefined,
        endY: el.endY ?? undefined,
        thickness: el.thickness ?? undefined,
        x: el.positionX ?? undefined,
        y: el.positionY ?? undefined,
        width: el.width ?? undefined,
        height: el.height ?? undefined,
        rotation: el.rotation ?? 0,
        color: el.color,
        opacity: el.opacity,
        presetId: el.presetId ?? undefined,
        metadata: el.metadata as CanvasElement['metadata'] ?? undefined,
      }));
      setElements(canvasElements);
    }
  }, [apiElements, setElements]);

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

  // Update canvas size based on container
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCanvasSize({
          width: rect.width,
          height: Math.max(500, rect.height),
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Find selected zone or element
  useEffect(() => {
    if (selectedId && selectedType === 'zone') {
      const zone = zones.find((z) => z.id === selectedId);
      setSelectedZone(zone ?? null);
      setSelectedElement(null);
    } else if (selectedId && selectedType === 'element') {
      const element = elements.find((e) => e.id === selectedId);
      setSelectedElement(element ?? null);
      setSelectedZone(null);
    } else {
      setSelectedZone(null);
      setSelectedElement(null);
    }
  }, [selectedId, selectedType, zones, elements]);

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

      // Cmd/Ctrl + Z = Undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      // Cmd/Ctrl + Shift + Z = Redo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
        return;
      }

      // Cmd/Ctrl + Y = Redo (alternative)
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        redo();
        return;
      }

      // Cmd/Ctrl + C = Copy
      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        if (selectedId && selectedType === 'zone' && selectedZone) {
          e.preventDefault();
          setClipboard({ type: 'zone', data: { ...selectedZone } });
        } else if (selectedId && selectedType === 'element' && selectedElement) {
          e.preventDefault();
          setClipboard({ type: 'element', data: { ...selectedElement } });
        }
        return;
      }

      // Cmd/Ctrl + V = Paste
      if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        if (clipboard) {
          e.preventDefault();
          const offset = 20; // Offset so pasted item is visible

          if (clipboard.type === 'zone') {
            const original = clipboard.data as CanvasZone;
            const newZone: CanvasZone = {
              ...original,
              id: `zone-${Date.now()}`,
              name: `${original.name} (copy)`,
              x: original.x + offset,
              y: original.y + offset,
            };
            addZone(newZone);
            setSelectedId(newZone.id, 'zone');
          } else if (clipboard.type === 'element') {
            const original = clipboard.data as CanvasElement;
            const newElement: CanvasElement = {
              ...original,
              id: generateId(original.type === 'WALL' ? 'wall' : 'el'),
              name: `${original.name} (copy)`,
            };

            // Offset position based on element type
            if (original.type === 'WALL') {
              newElement.startX = (original.startX ?? 0) + offset;
              newElement.startY = (original.startY ?? 0) + offset;
              newElement.endX = (original.endX ?? 0) + offset;
              newElement.endY = (original.endY ?? 0) + offset;
            } else {
              newElement.x = (original.x ?? 0) + offset;
              newElement.y = (original.y ?? 0) + offset;
            }

            addElementToStore(newElement);
            setSelectedId(newElement.id, 'element');
          }
        }
        return;
      }

      // Cmd/Ctrl + D = Duplicate (copy + paste in one action)
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        const offset = 20;

        if (selectedId && selectedType === 'zone' && selectedZone) {
          const newZone: CanvasZone = {
            ...selectedZone,
            id: `zone-${Date.now()}`,
            name: `${selectedZone.name} (copy)`,
            x: selectedZone.x + offset,
            y: selectedZone.y + offset,
          };
          addZone(newZone);
          setSelectedId(newZone.id, 'zone');
        } else if (selectedId && selectedType === 'element' && selectedElement) {
          const newElement: CanvasElement = {
            ...selectedElement,
            id: generateId(selectedElement.type === 'WALL' ? 'wall' : 'el'),
            name: `${selectedElement.name} (copy)`,
          };

          if (selectedElement.type === 'WALL') {
            newElement.startX = (selectedElement.startX ?? 0) + offset;
            newElement.startY = (selectedElement.startY ?? 0) + offset;
            newElement.endX = (selectedElement.endX ?? 0) + offset;
            newElement.endY = (selectedElement.endY ?? 0) + offset;
          } else {
            newElement.x = (selectedElement.x ?? 0) + offset;
            newElement.y = (selectedElement.y ?? 0) + offset;
          }

          addElementToStore(newElement);
          setSelectedId(newElement.id, 'element');
        }
        return;
      }

      // Delete or Backspace = Delete selected item
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId && selectedType === 'zone') {
          e.preventDefault();
          deleteZone(selectedId);
          setSelectedId(null);
          setSelectedZone(null);
        } else if (selectedId && selectedType === 'element') {
          e.preventDefault();
          deleteElementFromStore(selectedId);
          setSelectedId(null);
          setSelectedElement(null);
        }
        return;
      }

      // Escape = Deselect / Cancel
      if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedId(null);
        setSelectedZone(null);
        setSelectedElement(null);
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

      // Z = Zone tool
      if (e.key === 'z' && !e.metaKey && !e.ctrlKey) {
        // Only if not combined with Cmd/Ctrl (which is undo)
        e.preventDefault();
        setActiveTool('zone');
        return;
      }

      // H = Pan tool
      if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        setActiveTool('pan');
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedId,
    selectedType,
    selectedZone,
    selectedElement,
    clipboard,
    undo,
    redo,
    addZone,
    deleteZone,
    addElementToStore,
    deleteElementFromStore,
    setSelectedId,
    resetWallDrawing,
    setActiveTool,
  ]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!currentFarmId) return;

    try {
      // Save layout canvas data
      await updateLayout.mutateAsync({
        width: layout?.canvasData?.width ?? 1200,
        height: layout?.canvasData?.height ?? 800,
        backgroundColor: '#f5f5f5',
        gridSize: 20,
      });

      // Bulk update all elements
      if (elements.length > 0) {
        const elementUpdates = elements.map((el) => ({
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
          },
        }));

        // Only send updates for elements that exist in the API
        const existingElements = elementUpdates.filter((update) =>
          apiElements?.some((apiEl) => apiEl.id === update.id)
        );

        if (existingElements.length > 0) {
          await bulkUpdateElements.mutateAsync(existingElements);
        }
      }

      setDirty(false);
    } catch (error) {
      console.error('Failed to save layout:', error);
    }
  }, [currentFarmId, layout, elements, apiElements, updateLayout, bulkUpdateElements, setDirty]);

  // Handle zone selection from canvas
  const handleZoneSelect = useCallback((zone: CanvasZone | null) => {
    setSelectedZone(zone);
    if (!zone) {
      setSelectedElement(null);
    }
  }, []);

  // Handle element selection from canvas
  const handleElementSelect = useCallback((element: CanvasElement | null) => {
    setSelectedElement(element);
    if (!element) {
      setSelectedZone(null);
    }
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

  // Handle create preset (placeholder - could open a modal)
  const handleCreatePreset = useCallback(() => {
    // For now, just alert - this could open a modal to create a preset
    alert('To create a preset, first add an element to the canvas, configure it, then click "Save as Preset" in the properties panel.');
  }, []);

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

  if (layoutLoading || zonesLoading || elementsLoading || prefsLoading) {
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
          isSaving={updateLayout.isPending || bulkUpdateElements.isPending}
          presets={presets}
          onCreatePreset={handleCreatePreset}
          unitSystem={unitSystem}
          onUnitChange={handleUnitChange}
        />

        <div className="flex-1 flex">
          {/* Canvas container */}
          <div ref={containerRef} className="flex-1">
            <FarmCanvas
              width={canvasSize.width}
              height={canvasSize.height}
              unitSystem={unitSystem}
              onZoneSelect={handleZoneSelect}
              onElementSelect={handleElementSelect}
              onOpenWallModal={handleOpenWallModal}
            />
          </div>

          {/* Properties panel */}
          <PropertiesPanel
            zone={selectedZone}
            element={selectedElement}
            unitSystem={unitSystem}
            onSaveAsPreset={handleSaveAsPreset}
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
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Z</kbd> Zone
        </span>
        <span className="inline-flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">H</kbd> Pan
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
    </div>
  );
}
