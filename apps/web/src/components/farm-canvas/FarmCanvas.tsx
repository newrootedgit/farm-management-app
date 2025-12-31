import { useRef, useCallback, useState, useLayoutEffect } from 'react';
import { Stage, Layer, Rect, Line, Group, Text, Circle, Transformer } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type Konva from 'konva';
import {
  useCanvasStore,
  snapToGridValue,
  CanvasElement,
  generateId,
} from '@/stores/canvas-store';
import { DEFAULT_ELEMENT_COLORS, DEFAULT_ELEMENT_DIMENSIONS } from '@farm/shared';
import type { UnitSystem, ElementPreset } from '@farm/shared';
import { getGridSizeForUnit, getUnitLabel } from '@/lib/units';

interface FarmCanvasProps {
  width: number;
  height: number;
  unitSystem?: UnitSystem;
  presets?: ElementPreset[];
  onElementSelect?: (element: CanvasElement | null) => void;
  onMultiSelect?: (elements: CanvasElement[]) => void;
  onOpenWallModal?: (startPoint: { x: number; y: number }) => void;
}

export function FarmCanvas({
  width,
  height,
  unitSystem = 'FEET',
  presets = [],
  onElementSelect,
  onMultiSelect,
  onOpenWallModal,
}: FarmCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const selectedShapesRef = useRef<Map<string, Konva.Group>>(new Map());
  const {
    elements,
    activeTool,
    activeElementType,
    activePresetId,
    selectedIds,
    selectedType,
    setSelectedId,
    toggleSelection,
    selectElementsInBounds,
    clearSelection,
    zoom,
    setZoom,
    panOffset,
    setPanOffset,
    showGrid,
    snapToGrid,
    addElement,
    updateElement,
    wallDrawing,
    setWallStartPoint,
    setWallIsDrawing,
    resetWallDrawing,
    pushHistory,
  } = useCanvasStore();

  // Marquee selection state
  const [marquee, setMarquee] = useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);
  const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false);

  // Wall preview state
  const [wallPreview, setWallPreview] = useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);

  // Snap indicator state
  const [snapIndicator, setSnapIndicator] = useState<{ x: number; y: number } | null>(null);

  // Middle mouse button panning state
  const [isMiddleMousePanning, setIsMiddleMousePanning] = useState(false);
  const lastPanPos = useRef<{ x: number; y: number } | null>(null);

  // Track when the selected shape ref changes to trigger transformer update
  const [transformerKey, setTransformerKey] = useState(0);

  // Update transformer when selection changes - use useLayoutEffect to run after ref callbacks
  useLayoutEffect(() => {
    if (transformerRef.current) {
      // Get all selected non-wall shapes
      const selectedNodes: Konva.Group[] = [];
      for (const id of selectedIds) {
        const node = selectedShapesRef.current.get(id);
        const element = elements.find((e) => e.id === id);
        // Only add non-wall elements to transformer
        if (node && element && element.type !== 'WALL') {
          selectedNodes.push(node);
        }
      }
      transformerRef.current.nodes(selectedNodes);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectedIds, selectedType, transformerKey, elements]);

  // Get scaled pointer position
  const getScaledPos = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };
    const pos = stage.getPointerPosition();
    if (!pos) return { x: 0, y: 0 };
    return {
      x: (pos.x - panOffset.x) / zoom,
      y: (pos.y - panOffset.y) / zoom,
    };
  }, [panOffset, zoom]);

  // Get grid size based on unit system
  const unitGridSize = getGridSizeForUnit(unitSystem);

  // Find nearby wall endpoints for snapping
  const findNearbyWallEndpoint = useCallback(
    (pos: { x: number; y: number }, excludeId?: string): { x: number; y: number } | null => {
      // Adjust snap distance based on zoom - larger distance when zoomed out
      const baseSnapDistance = 25;
      const snapDistance = baseSnapDistance / Math.max(zoom, 0.5);

      let closestPoint: { x: number; y: number } | null = null;
      let closestDist = Infinity;

      for (const el of elements) {
        if (el.type !== 'WALL' || el.id === excludeId) continue;

        // Check start point
        const startX = el.startX ?? 0;
        const startY = el.startY ?? 0;
        const startDist = Math.sqrt(Math.pow(pos.x - startX, 2) + Math.pow(pos.y - startY, 2));
        if (startDist < snapDistance && startDist < closestDist) {
          closestDist = startDist;
          closestPoint = { x: startX, y: startY };
        }

        // Check end point
        const endX = el.endX ?? 0;
        const endY = el.endY ?? 0;
        const endDist = Math.sqrt(Math.pow(pos.x - endX, 2) + Math.pow(pos.y - endY, 2));
        if (endDist < snapDistance && endDist < closestDist) {
          closestDist = endDist;
          closestPoint = { x: endX, y: endY };
        }
      }

      return closestPoint;
    },
    [elements, zoom]
  );

  // Snap position to grid if enabled, also snap to wall endpoints
  const snapPosition = useCallback(
    (pos: { x: number; y: number }, excludeWallId?: string) => {
      // First try to snap to nearby wall endpoints
      const wallSnap = findNearbyWallEndpoint(pos, excludeWallId);
      if (wallSnap) {
        return wallSnap;
      }

      // Otherwise snap to grid
      if (!snapToGrid) return pos;
      return {
        x: snapToGridValue(pos.x, unitGridSize),
        y: snapToGridValue(pos.y, unitGridSize),
      };
    },
    [snapToGrid, unitGridSize, findNearbyWallEndpoint]
  );

  // Handle zoom with mouse wheel
  const handleWheel = useCallback(
    (e: KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;

      const oldScale = zoom;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const scaleBy = 1.1;
      const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;

      setZoom(newScale);

      const mousePointTo = {
        x: (pointer.x - panOffset.x) / oldScale,
        y: (pointer.y - panOffset.y) / oldScale,
      };

      setPanOffset({
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      });
    },
    [zoom, panOffset, setZoom, setPanOffset]
  );

  // Handle mouse down
  const handleMouseDown = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      // Middle mouse button (scroll wheel click) = pan
      if (e.evt.button === 1) {
        e.evt.preventDefault();
        setIsMiddleMousePanning(true);
        lastPanPos.current = { x: e.evt.clientX, y: e.evt.clientY };
        return;
      }

      const scaledPos = getScaledPos();
      const snappedPos = snapPosition(scaledPos);

      if (activeTool === 'wall') {
        // Wall drawing - first click sets start point
        if (!wallDrawing.startPoint) {
          setWallStartPoint(snappedPos);
          setWallIsDrawing(true);
          setWallPreview({
            startX: snappedPos.x,
            startY: snappedPos.y,
            endX: snappedPos.x,
            endY: snappedPos.y,
          });
        }
      } else if (activeTool === 'element' && activeElementType && activeElementType !== 'WALL') {
        // Place rectangle element - use preset data if available
        const activePreset = activePresetId ? presets.find((p) => p.id === activePresetId) : null;
        const defaults =
          DEFAULT_ELEMENT_DIMENSIONS[activeElementType as keyof typeof DEFAULT_ELEMENT_DIMENSIONS] ||
          {};
        const defaultWidth = activePreset?.defaultWidth ?? ('width' in defaults ? defaults.width : 100);
        const defaultHeight = activePreset?.defaultHeight ?? ('height' in defaults ? defaults.height : 60);
        const defaultColor = activePreset?.defaultColor ?? DEFAULT_ELEMENT_COLORS[activeElementType as keyof typeof DEFAULT_ELEMENT_COLORS] ?? '#666666';
        const elementName = activePreset?.name ?? `${activeElementType.replace('_', ' ')} ${elements.length + 1}`;

        const newElement: CanvasElement = {
          id: generateId('el'),
          name: elementName,
          type: activeElementType,
          x: snappedPos.x,
          y: snappedPos.y,
          width: defaultWidth,
          height: defaultHeight,
          rotation: 0,
          color: defaultColor,
          opacity: 1,
          presetId: activePresetId ?? undefined,
        };
        addElement(newElement);
        setSelectedId(newElement.id, 'element');
        onElementSelect?.(newElement);
      } else if (activeTool === 'select') {
        // Check if clicked on empty space
        const clickedOnEmpty = e.target === e.target.getStage();
        if (clickedOnEmpty) {
          const hasModifier = e.evt.shiftKey || e.evt.metaKey || e.evt.ctrlKey;

          // If no modifier key, clear selection and start marquee
          if (!hasModifier) {
            clearSelection();
            onElementSelect?.(null);
            onMultiSelect?.([]);
          }

          // Start marquee selection
          setIsMarqueeSelecting(true);
          setMarquee({
            startX: scaledPos.x,
            startY: scaledPos.y,
            endX: scaledPos.x,
            endY: scaledPos.y,
          });
        }
      }
    },
    [
      activeTool,
      activeElementType,
      activePresetId,
      elements.length,
      wallDrawing.startPoint,
      getScaledPos,
      snapPosition,
      addElement,
      setSelectedId,
      clearSelection,
      setWallStartPoint,
      setWallIsDrawing,
      onElementSelect,
      onMultiSelect,
      presets,
    ]
  );

  // Handle mouse move
  const handleMouseMove = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      // Handle middle mouse button panning
      if (isMiddleMousePanning && lastPanPos.current) {
        const dx = e.evt.clientX - lastPanPos.current.x;
        const dy = e.evt.clientY - lastPanPos.current.y;
        setPanOffset({
          x: panOffset.x + dx,
          y: panOffset.y + dy,
        });
        lastPanPos.current = { x: e.evt.clientX, y: e.evt.clientY };
        return;
      }

      // Handle marquee selection
      if (isMarqueeSelecting && marquee) {
        const scaledPos = getScaledPos();
        setMarquee({
          ...marquee,
          endX: scaledPos.x,
          endY: scaledPos.y,
        });
        return;
      }

      if (activeTool === 'wall' && wallDrawing.startPoint && wallDrawing.isDrawing) {
        const scaledPos = getScaledPos();
        const snappedPos = snapPosition(scaledPos);

        // Check if we're snapping to a wall endpoint
        const wallSnap = findNearbyWallEndpoint(scaledPos);
        setSnapIndicator(wallSnap);

        setWallPreview({
          startX: wallDrawing.startPoint.x,
          startY: wallDrawing.startPoint.y,
          endX: snappedPos.x,
          endY: snappedPos.y,
        });
      } else {
        setSnapIndicator(null);
      }
    },
    [activeTool, wallDrawing, getScaledPos, snapPosition, findNearbyWallEndpoint, isMiddleMousePanning, panOffset, setPanOffset, isMarqueeSelecting, marquee]
  );

  // Handle mouse up
  const handleMouseUp = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      // Stop middle mouse panning
      if (e.evt.button === 1 || isMiddleMousePanning) {
        setIsMiddleMousePanning(false);
        lastPanPos.current = null;
        if (e.evt.button === 1) return;
      }

      // Complete marquee selection
      if (isMarqueeSelecting && marquee) {
        setIsMarqueeSelecting(false);

        // Calculate normalized bounds (handle negative width/height)
        const x = Math.min(marquee.startX, marquee.endX);
        const y = Math.min(marquee.startY, marquee.endY);
        const width = Math.abs(marquee.endX - marquee.startX);
        const height = Math.abs(marquee.endY - marquee.startY);

        // Only select if the marquee has some size
        if (width > 5 || height > 5) {
          selectElementsInBounds({ x, y, width, height });
          // Notify parent of multi-selection
          const selectedElements = elements.filter((el) => {
            if (el.type === 'WALL') {
              const startInBounds =
                (el.startX ?? 0) >= x && (el.startX ?? 0) <= x + width &&
                (el.startY ?? 0) >= y && (el.startY ?? 0) <= y + height;
              const endInBounds =
                (el.endX ?? 0) >= x && (el.endX ?? 0) <= x + width &&
                (el.endY ?? 0) >= y && (el.endY ?? 0) <= y + height;
              return startInBounds || endInBounds;
            } else {
              const elX = el.x ?? 0;
              const elY = el.y ?? 0;
              const elW = el.width ?? 0;
              const elH = el.height ?? 0;
              return elX < x + width && elX + elW > x && elY < y + height && elY + elH > y;
            }
          });
          if (selectedElements.length > 0) {
            onMultiSelect?.(selectedElements);
            if (selectedElements.length === 1) {
              onElementSelect?.(selectedElements[0]);
            }
          }
        }

        setMarquee(null);
        return;
      }

      if (activeTool === 'wall' && wallDrawing.startPoint && wallDrawing.isDrawing) {
        // Wall drawing - second click sets end point
        const scaledPos = getScaledPos();
        const endPos = snapPosition(scaledPos);

        // Calculate distance
        const dx = endPos.x - wallDrawing.startPoint.x;
        const dy = endPos.y - wallDrawing.startPoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Only create wall if it has some length
        if (distance > 10) {
          const newWall: CanvasElement = {
            id: generateId('wall'),
            name: `Wall ${elements.filter((el) => el.type === 'WALL').length + 1}`,
            type: 'WALL',
            startX: wallDrawing.startPoint.x,
            startY: wallDrawing.startPoint.y,
            endX: endPos.x,
            endY: endPos.y,
            thickness: DEFAULT_ELEMENT_DIMENSIONS.WALL.thickness,
            color: DEFAULT_ELEMENT_COLORS.WALL,
            opacity: 1,
          };
          addElement(newWall);
          setSelectedId(newWall.id, 'element');
          onElementSelect?.(newWall);
        }

        resetWallDrawing();
        setWallPreview(null);
        setSnapIndicator(null);
      }
    },
    [
      activeTool,
      elements,
      wallDrawing,
      getScaledPos,
      snapPosition,
      addElement,
      setSelectedId,
      resetWallDrawing,
      onElementSelect,
      onMultiSelect,
      isMiddleMousePanning,
      isMarqueeSelecting,
      marquee,
      selectElementsInBounds,
    ]
  );

  // Handle double-click for wall modal
  const handleDoubleClick = useCallback(() => {
    if (activeTool === 'wall' && wallDrawing.startPoint && onOpenWallModal) {
      onOpenWallModal(wallDrawing.startPoint);
    }
  }, [activeTool, wallDrawing.startPoint, onOpenWallModal]);

  // Handle element click - supports Cmd/Shift for multi-select
  const handleElementClick = useCallback(
    (element: CanvasElement, e: KonvaEventObject<MouseEvent>) => {
      if (activeTool === 'select') {
        const hasModifier = e.evt.shiftKey || e.evt.metaKey || e.evt.ctrlKey;

        if (hasModifier) {
          // Toggle selection with modifier key
          toggleSelection(element.id, 'element');
          // Notify parent - get updated selection
          const willBeSelected = !selectedIds.includes(element.id);
          if (willBeSelected) {
            const newSelectedElements = [...elements.filter((el) => selectedIds.includes(el.id)), element];
            onMultiSelect?.(newSelectedElements);
          } else {
            const newSelectedElements = elements.filter(
              (el) => selectedIds.includes(el.id) && el.id !== element.id
            );
            onMultiSelect?.(newSelectedElements);
            if (newSelectedElements.length === 1) {
              onElementSelect?.(newSelectedElements[0]);
            } else if (newSelectedElements.length === 0) {
              onElementSelect?.(null);
            }
          }
        } else {
          // Single select without modifier
          setSelectedId(element.id, 'element');
          onElementSelect?.(element);
        }
        // Trigger transformer update after ref is set by render
        setTransformerKey((k) => k + 1);
      }
    },
    [activeTool, setSelectedId, toggleSelection, selectedIds, elements, onElementSelect, onMultiSelect]
  );

  // Handle drag start - push history so we can undo
  const handleDragStart = useCallback(() => {
    pushHistory();
  }, [pushHistory]);

  // Handle element drag (for non-wall elements like tables, sinks, etc.)
  const handleElementDragEnd = useCallback(
    (element: CanvasElement, e: KonvaEventObject<DragEvent>) => {
      let newX = e.target.x();
      let newY = e.target.y();

      if (snapToGrid) {
        newX = snapToGridValue(newX, unitGridSize);
        newY = snapToGridValue(newY, unitGridSize);
      }

      updateElement(element.id, { x: newX, y: newY });
    },
    [snapToGrid, unitGridSize, updateElement]
  );

  // Handle element transform (resize/rotate)
  const handleElementTransformEnd = useCallback(
    (element: CanvasElement, e: KonvaEventObject<Event>) => {
      const node = e.target;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();

      node.scaleX(1);
      node.scaleY(1);

      let newWidth = Math.max(20, node.width() * scaleX);
      let newHeight = Math.max(20, node.height() * scaleY);
      let newX = node.x();
      let newY = node.y();

      if (snapToGrid) {
        newWidth = snapToGridValue(newWidth, unitGridSize);
        newHeight = snapToGridValue(newHeight, unitGridSize);
        newX = snapToGridValue(newX, unitGridSize);
        newY = snapToGridValue(newY, unitGridSize);
      }

      updateElement(element.id, {
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight,
        rotation: node.rotation(),
      });
    },
    [snapToGrid, unitGridSize, updateElement]
  );

  // Render grid lines - each square = 1 unit (1 ft or 1 m)
  const renderGrid = () => {
    if (!showGrid) return null;

    const lines: React.ReactNode[] = [];
    const gridUnit = getGridSizeForUnit(unitSystem);
    const unitLabel = getUnitLabel(unitSystem);

    // Calculate the full visible canvas area in world coordinates
    const canvasLeft = -panOffset.x / zoom;
    const canvasTop = -panOffset.y / zoom;
    const canvasRight = canvasLeft + width / zoom;
    const canvasBottom = canvasTop + height / zoom;

    // Add small buffer to ensure edges are covered
    const buffer = gridUnit * 2;
    const startX = Math.floor((canvasLeft - buffer) / gridUnit) * gridUnit;
    const startY = Math.floor((canvasTop - buffer) / gridUnit) * gridUnit;
    const endX = Math.ceil((canvasRight + buffer) / gridUnit) * gridUnit;
    const endY = Math.ceil((canvasBottom + buffer) / gridUnit) * gridUnit;

    // Limit lines to prevent performance issues
    const maxLines = 150;
    const numVerticalLines = Math.min(Math.ceil((endX - startX) / gridUnit), maxLines);
    const numHorizontalLines = Math.min(Math.ceil((endY - startY) / gridUnit), maxLines);

    // Draw vertical lines
    for (let i = 0; i <= numVerticalLines; i++) {
      const x = startX + i * gridUnit;
      const isMajor = Math.round(x / gridUnit) % 5 === 0;
      lines.push(
        <Line
          key={`v-${i}`}
          points={[x, startY, x, endY]}
          stroke={isMajor ? '#999' : '#ccc'}
          strokeWidth={isMajor ? 1.5 : 0.75}
        />
      );
    }

    // Draw horizontal lines
    for (let i = 0; i <= numHorizontalLines; i++) {
      const y = startY + i * gridUnit;
      const isMajor = Math.round(y / gridUnit) % 5 === 0;
      lines.push(
        <Line
          key={`h-${i}`}
          points={[startX, y, endX, y]}
          stroke={isMajor ? '#999' : '#ccc'}
          strokeWidth={isMajor ? 1.5 : 0.75}
        />
      );
    }

    // Add scale indicator (fixed position relative to viewport)
    const scaleX = canvasLeft + 20;
    const scaleY = canvasBottom - 40;
    lines.push(
      <Group key="scale-indicator" x={scaleX} y={scaleY}>
        {/* Background for better visibility */}
        <Rect
          x={-5}
          y={-10}
          width={gridUnit + 50}
          height={35}
          fill="rgba(255,255,255,0.85)"
          cornerRadius={4}
        />
        <Line
          points={[0, 0, gridUnit, 0]}
          stroke="#333"
          strokeWidth={3}
        />
        <Line
          points={[0, -8, 0, 8]}
          stroke="#333"
          strokeWidth={3}
        />
        <Line
          points={[gridUnit, -8, gridUnit, 8]}
          stroke="#333"
          strokeWidth={3}
        />
        <Text
          text={`1 ${unitLabel}`}
          x={gridUnit / 2 - 12}
          y={10}
          fontSize={14}
          fontStyle="bold"
          fill="#333"
        />
      </Group>
    );

    return lines;
  };

  // Handle wall drag (whole wall movement)
  const handleWallDrag = useCallback(
    (element: CanvasElement, e: KonvaEventObject<DragEvent>) => {
      // Get the delta movement from the drag (Line's position relative to Group)
      const dx = e.target.x();
      const dy = e.target.y();

      // Always reset the dragged element's position first
      e.target.x(0);
      e.target.y(0);

      // Skip if no actual movement
      if (dx === 0 && dy === 0) return;

      // Get current positions - ensure they're numbers
      const currentStartX = typeof element.startX === 'number' ? element.startX : 0;
      const currentStartY = typeof element.startY === 'number' ? element.startY : 0;
      const currentEndX = typeof element.endX === 'number' ? element.endX : 0;
      const currentEndY = typeof element.endY === 'number' ? element.endY : 0;

      let newStartX = currentStartX + dx;
      let newStartY = currentStartY + dy;

      // Apply grid snapping if enabled
      if (snapToGrid) {
        newStartX = snapToGridValue(newStartX, unitGridSize);
        newStartY = snapToGridValue(newStartY, unitGridSize);
      }

      // Calculate actual delta after snapping
      const actualDx = newStartX - currentStartX;
      const actualDy = newStartY - currentStartY;

      // Only update if there's actual movement after snapping
      if (actualDx !== 0 || actualDy !== 0) {
        updateElement(element.id, {
          startX: newStartX,
          startY: newStartY,
          endX: currentEndX + actualDx,
          endY: currentEndY + actualDy,
        });
      }
    },
    [snapToGrid, unitGridSize, updateElement]
  );

  // Render wall element
  const renderWall = (element: CanvasElement) => {
    const isSelected = selectedIds.includes(element.id) && selectedType === 'element';
    const thickness = element.thickness ?? 10;

    // Ensure coordinates are numbers (walls loaded from API might have null/undefined)
    const startX = typeof element.startX === 'number' ? element.startX : 0;
    const startY = typeof element.startY === 'number' ? element.startY : 0;
    const endX = typeof element.endX === 'number' ? element.endX : 0;
    const endY = typeof element.endY === 'number' ? element.endY : 0;

    const relEndX = endX - startX;
    const relEndY = endY - startY;

    return (
      <Group
        key={element.id}
        x={startX}
        y={startY}
        draggable={false}
        onMouseDown={(e) => {
          // Stop propagation to prevent Stage from handling this click
          e.cancelBubble = true;
        }}
        onClick={(e) => handleElementClick(element, e)}
      >
        <Line
          points={[0, 0, relEndX, relEndY]}
          stroke={element.color}
          strokeWidth={thickness}
          opacity={element.opacity}
          lineCap="round"
          lineJoin="round"
          hitStrokeWidth={Math.max(thickness, 20)}
          draggable={activeTool === 'select'}
          onDragStart={handleDragStart}
          onDragEnd={(e) => handleWallDrag(element, e)}
        />
        {/* Draggable endpoint handles when selected */}
        {isSelected && (
          <>
            {/* Start point handle */}
            <Circle
              x={0}
              y={0}
              radius={8}
              fill="#2563eb"
              stroke="#fff"
              strokeWidth={2}
              draggable
              onDragStart={handleDragStart}
              onDragMove={(e) => {
                // Real-time update during drag with wall snapping
                const node = e.target;
                const worldPos = { x: startX + node.x(), y: startY + node.y() };
                const snapped = snapPosition(worldPos, element.id);
                node.x(snapped.x - startX);
                node.y(snapped.y - startY);
              }}
              onDragEnd={(e) => {
                const node = e.target;
                const worldPos = { x: startX + node.x(), y: startY + node.y() };
                const snapped = snapPosition(worldPos, element.id);

                // Update the element
                updateElement(element.id, {
                  startX: snapped.x,
                  startY: snapped.y,
                });

                // Reset handle to origin (start point is always at 0,0 relative to group)
                node.x(0);
                node.y(0);
              }}
              onMouseEnter={(e) => {
                const container = e.target.getStage()?.container();
                if (container) container.style.cursor = 'move';
              }}
              onMouseLeave={(e) => {
                const container = e.target.getStage()?.container();
                if (container) container.style.cursor = 'default';
              }}
            />
            {/* End point handle */}
            <Circle
              x={relEndX}
              y={relEndY}
              radius={8}
              fill="#2563eb"
              stroke="#fff"
              strokeWidth={2}
              draggable
              onDragStart={handleDragStart}
              onDragMove={(e) => {
                // Real-time update during drag with wall snapping
                const node = e.target;
                const worldPos = { x: startX + node.x(), y: startY + node.y() };
                const snapped = snapPosition(worldPos, element.id);
                node.x(snapped.x - startX);
                node.y(snapped.y - startY);
              }}
              onDragEnd={(e) => {
                const node = e.target;
                const worldPos = { x: startX + node.x(), y: startY + node.y() };
                const snapped = snapPosition(worldPos, element.id);

                // Update the element
                updateElement(element.id, {
                  endX: snapped.x,
                  endY: snapped.y,
                });

                // Reset handle to new relative position
                node.x(snapped.x - startX);
                node.y(snapped.y - startY);
              }}
              onMouseEnter={(e) => {
                const container = e.target.getStage()?.container();
                if (container) container.style.cursor = 'move';
              }}
              onMouseLeave={(e) => {
                const container = e.target.getStage()?.container();
                if (container) container.style.cursor = 'default';
              }}
            />
          </>
        )}
      </Group>
    );
  };

  // Render rectangle element (sink, table, grow rack, walkway, circle, custom)
  const renderRectElement = (element: CanvasElement) => {
    const isSelected = selectedIds.includes(element.id) && selectedType === 'element';
    const isGrowRack = element.type === 'GROW_RACK';
    const isCircle = element.type === 'CIRCLE';
    const trayCapacity = element.metadata?.trayCapacity ?? 0;
    const levels = element.metadata?.levels ?? 1;
    const elementWidth = element.width ?? 100;
    const elementHeight = element.height ?? 60;

    return (
      <Group
        key={element.id}
        x={element.x ?? 0}
        y={element.y ?? 0}
        width={elementWidth}
        height={elementHeight}
        rotation={element.rotation ?? 0}
        draggable={activeTool === 'select'}
        ref={(node) => {
          // Store ref in map for multi-select transformer support
          if (node) {
            selectedShapesRef.current.set(element.id, node);
          } else {
            selectedShapesRef.current.delete(element.id);
          }
        }}
        onMouseDown={(e) => {
          // Stop propagation to prevent Stage from handling this click
          e.cancelBubble = true;
        }}
        onClick={(e) => handleElementClick(element, e)}
        onDragStart={handleDragStart}
        onDragEnd={(e) => handleElementDragEnd(element, e)}
        onTransformEnd={(e) => handleElementTransformEnd(element, e)}
      >
        {/* Shape - Circle or Rectangle */}
        {isCircle ? (
          <Circle
            x={elementWidth / 2}
            y={elementHeight / 2}
            radius={Math.min(elementWidth, elementHeight) / 2}
            fill={element.color}
            opacity={element.opacity}
            stroke={isSelected ? '#2563eb' : '#333'}
            strokeWidth={isSelected ? 3 : 1}
          />
        ) : (
          <Rect
            width={elementWidth}
            height={elementHeight}
            fill={element.color}
            opacity={element.opacity}
            stroke={isSelected ? '#2563eb' : '#333'}
            strokeWidth={isSelected ? 3 : 1}
            cornerRadius={element.type === 'WALKWAY' ? 2 : 4}
          />
        )}
        {/* Element name - clipped to element width */}
        <Text
          text={element.name}
          x={4}
          y={4}
          width={elementWidth - 8}
          fontSize={Math.min(12, elementHeight / 3)}
          fontStyle="bold"
          fill="#fff"
          shadowColor="#000"
          shadowBlur={2}
          shadowOpacity={0.5}
          ellipsis={true}
        />
        {/* Grow rack specific: show levels and capacity */}
        {isGrowRack && (
          <>
            {/* Level indicator lines */}
            {levels > 1 && Array.from({ length: levels - 1 }).map((_, i) => (
              <Line
                key={`level-${i}`}
                points={[
                  4,
                  (elementHeight / levels) * (i + 1),
                  elementWidth - 4,
                  (elementHeight / levels) * (i + 1),
                ]}
                stroke="rgba(255,255,255,0.4)"
                strokeWidth={1}
                dash={[4, 2]}
              />
            ))}
            {/* Capacity badge */}
            <Group x={elementWidth - 4} y={elementHeight - 4}>
              <Rect
                x={-40}
                y={-18}
                width={40}
                height={18}
                fill="rgba(0,0,0,0.7)"
                cornerRadius={3}
              />
              <Text
                text={`${trayCapacity} 🌱`}
                x={-38}
                y={-15}
                fontSize={11}
                fill="#fff"
              />
            </Group>
            {/* Levels badge (top right) */}
            {levels > 1 && (
              <Group x={elementWidth - 4} y={4}>
                <Rect
                  x={-28}
                  y={0}
                  width={28}
                  height={16}
                  fill="rgba(0,0,0,0.6)"
                  cornerRadius={3}
                />
                <Text
                  text={`${levels}L`}
                  x={-24}
                  y={2}
                  fontSize={10}
                  fill="#fff"
                />
              </Group>
            )}
          </>
        )}
      </Group>
    );
  };

  // Cursor style based on active tool
  const getCursor = () => {
    if (isMiddleMousePanning) return 'grabbing';
    switch (activeTool) {
      case 'pan':
        return 'grab';
      case 'wall':
      case 'element':
        return 'crosshair';
      default:
        return 'default';
    }
  };

  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      scaleX={zoom}
      scaleY={zoom}
      x={panOffset.x}
      y={panOffset.y}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDblClick={handleDoubleClick}
      onContextMenu={(e) => e.evt.preventDefault()}
      style={{ backgroundColor: '#f5f5f5', cursor: getCursor() }}
    >
      {/* Grid layer - non-listening so clicks pass through to stage */}
      <Layer listening={false}>
        {renderGrid()}
      </Layer>

      {/* Elements layer */}
      <Layer>
        {elements.map((element) =>
          element.type === 'WALL' ? renderWall(element) : renderRectElement(element)
        )}
        {/* Transformer for resize/rotate - only for non-wall elements */}
        {selectedIds.length > 0 && selectedType === 'element' && selectedIds.some(id => {
          const el = elements.find(e => e.id === id);
          return el && el.type !== 'WALL';
        }) && (
          <Transformer
            ref={transformerRef}
            rotateEnabled={selectedIds.length === 1}
            enabledAnchors={selectedIds.length === 1
              ? ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right', 'top-center', 'bottom-center']
              : ['top-left', 'top-right', 'bottom-left', 'bottom-right']
            }
            boundBoxFunc={(oldBox, newBox) => {
              // Limit minimum size
              if (newBox.width < 20 || newBox.height < 20) {
                return oldBox;
              }
              return newBox;
            }}
            anchorSize={10}
            anchorCornerRadius={2}
            borderStroke="#2563eb"
            borderStrokeWidth={2}
            anchorStroke="#2563eb"
            anchorFill="#fff"
            rotateAnchorOffset={25}
            rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
          />
        )}
      </Layer>

      {/* Wall preview layer */}
      <Layer>
        {wallPreview && (
          <Line
            points={[
              wallPreview.startX,
              wallPreview.startY,
              wallPreview.endX,
              wallPreview.endY,
            ]}
            stroke={DEFAULT_ELEMENT_COLORS.WALL}
            strokeWidth={DEFAULT_ELEMENT_DIMENSIONS.WALL.thickness}
            opacity={0.5}
            lineCap="round"
            dash={[10, 5]}
          />
        )}
        {/* Start point indicator when drawing wall */}
        {wallDrawing.startPoint && wallDrawing.isDrawing && (
          <Circle
            x={wallDrawing.startPoint.x}
            y={wallDrawing.startPoint.y}
            radius={8}
            fill="#2563eb"
            stroke="#fff"
            strokeWidth={2}
          />
        )}
        {/* Snap indicator - shows when snapping to wall endpoint */}
        {snapIndicator && (
          <>
            <Circle
              x={snapIndicator.x}
              y={snapIndicator.y}
              radius={12}
              stroke="#22c55e"
              strokeWidth={3}
              fill="transparent"
            />
            <Circle
              x={snapIndicator.x}
              y={snapIndicator.y}
              radius={4}
              fill="#22c55e"
            />
          </>
        )}
        {/* Marquee selection rectangle */}
        {marquee && isMarqueeSelecting && (
          <Rect
            x={Math.min(marquee.startX, marquee.endX)}
            y={Math.min(marquee.startY, marquee.endY)}
            width={Math.abs(marquee.endX - marquee.startX)}
            height={Math.abs(marquee.endY - marquee.startY)}
            fill="rgba(37, 99, 235, 0.1)"
            stroke="#2563eb"
            strokeWidth={1}
            dash={[5, 5]}
          />
        )}
      </Layer>
    </Stage>
  );
}
