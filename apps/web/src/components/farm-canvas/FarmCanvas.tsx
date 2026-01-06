import { useRef, useCallback, useState, useLayoutEffect } from 'react';
import { Stage, Layer, Rect, Line, Group, Text, Circle, Transformer, Arc, Label, Tag } from 'react-konva';
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
import type { RackAssignment } from '@/lib/api-client';

// Calculate font size that fits text within a given width
function calculateFitFontSize(text: string, maxWidth: number, maxFontSize: number = 14, minFontSize: number = 8): number {
  // Approximate character width as 0.6 of font size (for sans-serif bold)
  const charWidthRatio = 0.6;
  const estimatedWidth = text.length * maxFontSize * charWidthRatio;
  if (estimatedWidth <= maxWidth) return maxFontSize;
  const scaledSize = maxWidth / (text.length * charWidthRatio);
  return Math.max(minFontSize, Math.min(maxFontSize, scaledSize));
}

// Format distance in the appropriate unit (convert from cm to feet or meters)
function formatDistance(distanceCm: number, unitSystem: UnitSystem): string {
  if (unitSystem === 'FEET') {
    // Convert cm to feet (30.48 cm per foot)
    const feet = distanceCm / 30.48;
    if (feet < 1) {
      const inches = feet * 12;
      return `${inches.toFixed(1)}"`;
    }
    return `${feet.toFixed(1)}'`;
  } else {
    // Convert cm to meters
    const meters = distanceCm / 100;
    if (meters < 1) {
      return `${distanceCm.toFixed(0)}cm`;
    }
    return `${meters.toFixed(2)}m`;
  }
}

interface FarmCanvasProps {
  width: number;
  height: number;
  unitSystem?: UnitSystem;
  presets?: ElementPreset[];
  rackAssignments?: RackAssignment[];
  onElementSelect?: (element: CanvasElement | null) => void;
  onMultiSelect?: (elements: CanvasElement[]) => void;
  onOpenWallModal?: (startPoint: { x: number; y: number }) => void;
}

export function FarmCanvas({
  width,
  height,
  unitSystem = 'FEET',
  presets = [],
  rackAssignments = [],
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
    walkwayDrawing,
    setWalkwayStartPoint,
    setWalkwayIsDrawing,
    resetWalkwayDrawing,
    measureState,
    addMeasurePoint,
    clearMeasure,
    pushHistory,
    isEditMode,
  } = useCanvasStore();

  // Marquee selection state
  const [marquee, setMarquee] = useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);
  const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false);

  // Track initial positions for multi-element drag
  const dragStartPositions = useRef<Map<string, { x: number; y: number; startX?: number; startY?: number; endX?: number; endY?: number }>>(new Map());

  // Wall preview state
  const [wallPreview, setWallPreview] = useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);

  // Walkway preview state
  const [walkwayPreview, setWalkwayPreview] = useState<{
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

  // Notification state for user feedback
  const [notification, setNotification] = useState<{ message: string; type: 'error' | 'info' } | null>(null);

  // Distance indicator state for showing distances while dragging
  const [distanceGuides, setDistanceGuides] = useState<Array<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    distance: number;
    direction: 'horizontal' | 'vertical';
  }>>([]);

  // Show notification helper
  const showNotification = useCallback((message: string, type: 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // Update transformer when selection changes - use useLayoutEffect to run after ref callbacks
  useLayoutEffect(() => {
    if (transformerRef.current) {
      // Get all selected shapes (excluding walls and doors which have custom controls)
      const selectedNodes: Konva.Group[] = [];
      for (const id of selectedIds) {
        const node = selectedShapesRef.current.get(id);
        const element = elements.find((e) => e.id === id);
        // Only add non-wall, non-door elements to transformer
        if (node && element && element.type !== 'WALL' && element.type !== 'DOOR') {
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

  // Helper to get element bounds (works for both line-based and rectangle elements)
  const getElementBounds = useCallback((el: CanvasElement): { x: number; y: number; width: number; height: number } => {
    // Line-based elements (walls, line-based walkways)
    if (el.type === 'WALL' || (el.type === 'WALKWAY' && el.startX !== undefined)) {
      const startX = el.startX ?? 0;
      const startY = el.startY ?? 0;
      const endX = el.endX ?? 0;
      const endY = el.endY ?? 0;
      const thickness = el.thickness ?? 10;
      const halfT = thickness / 2;

      // Get bounding box of the line
      const minX = Math.min(startX, endX) - halfT;
      const minY = Math.min(startY, endY) - halfT;
      const maxX = Math.max(startX, endX) + halfT;
      const maxY = Math.max(startY, endY) + halfT;

      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }

    // Rectangle-based elements (doors use center positioning)
    if (el.type === 'DOOR') {
      const w = el.width ?? 90;
      const h = el.height ?? 10;
      return {
        x: (el.x ?? 0) - w / 2,
        y: (el.y ?? 0) - h / 2,
        width: w,
        height: h,
      };
    }

    // Standard rectangle elements
    return {
      x: el.x ?? 0,
      y: el.y ?? 0,
      width: el.width ?? 100,
      height: el.height ?? 60,
    };
  }, []);

  // Calculate distance guides for dragged element
  const calculateDistanceGuides = useCallback((
    elementId: string,
    currentBounds: { x: number; y: number; width: number; height: number }
  ) => {
    const guides: Array<{
      x1: number; y1: number;
      x2: number; y2: number;
      distance: number;
      direction: 'horizontal' | 'vertical';
    }> = [];

    const threshold = 300; // Only show for elements within this distance

    let closestLeft: typeof guides[0] | null = null;
    let closestRight: typeof guides[0] | null = null;
    let closestTop: typeof guides[0] | null = null;
    let closestBottom: typeof guides[0] | null = null;

    for (const el of elements) {
      if (el.id === elementId) continue;

      const targetBounds = getElementBounds(el);

      // Calculate distances between edges
      const draggedLeft = currentBounds.x;
      const draggedRight = currentBounds.x + currentBounds.width;
      const draggedTop = currentBounds.y;
      const draggedBottom = currentBounds.y + currentBounds.height;

      const targetLeft = targetBounds.x;
      const targetRight = targetBounds.x + targetBounds.width;
      const targetTop = targetBounds.y;
      const targetBottom = targetBounds.y + targetBounds.height;

      // Check vertical overlap (for horizontal distance measurement)
      const verticalOverlap = draggedBottom > targetTop && draggedTop < targetBottom;

      // Check horizontal overlap (for vertical distance measurement)
      const horizontalOverlap = draggedRight > targetLeft && draggedLeft < targetRight;

      if (verticalOverlap) {
        // Distance from dragged right edge to target left edge (target is to the right)
        if (targetLeft >= draggedRight) {
          const dist = targetLeft - draggedRight;
          if (dist < threshold && (!closestRight || dist < closestRight.distance)) {
            const y = Math.max(draggedTop, targetTop) +
                     (Math.min(draggedBottom, targetBottom) - Math.max(draggedTop, targetTop)) / 2;
            closestRight = {
              x1: draggedRight, y1: y,
              x2: targetLeft, y2: y,
              distance: dist,
              direction: 'horizontal',
            };
          }
        }

        // Distance from dragged left edge to target right edge (target is to the left)
        if (targetRight <= draggedLeft) {
          const dist = draggedLeft - targetRight;
          if (dist < threshold && (!closestLeft || dist < closestLeft.distance)) {
            const y = Math.max(draggedTop, targetTop) +
                     (Math.min(draggedBottom, targetBottom) - Math.max(draggedTop, targetTop)) / 2;
            closestLeft = {
              x1: targetRight, y1: y,
              x2: draggedLeft, y2: y,
              distance: dist,
              direction: 'horizontal',
            };
          }
        }
      }

      if (horizontalOverlap) {
        // Distance from dragged bottom to target top (target is below)
        if (targetTop >= draggedBottom) {
          const dist = targetTop - draggedBottom;
          if (dist < threshold && (!closestBottom || dist < closestBottom.distance)) {
            const x = Math.max(draggedLeft, targetLeft) +
                     (Math.min(draggedRight, targetRight) - Math.max(draggedLeft, targetLeft)) / 2;
            closestBottom = {
              x1: x, y1: draggedBottom,
              x2: x, y2: targetTop,
              distance: dist,
              direction: 'vertical',
            };
          }
        }

        // Distance from dragged top to target bottom (target is above)
        if (targetBottom <= draggedTop) {
          const dist = draggedTop - targetBottom;
          if (dist < threshold && (!closestTop || dist < closestTop.distance)) {
            const x = Math.max(draggedLeft, targetLeft) +
                     (Math.min(draggedRight, targetRight) - Math.max(draggedLeft, targetLeft)) / 2;
            closestTop = {
              x1: x, y1: targetBottom,
              x2: x, y2: draggedTop,
              distance: dist,
              direction: 'vertical',
            };
          }
        }
      }
    }

    // Collect only the closest guides
    if (closestLeft) guides.push(closestLeft);
    if (closestRight) guides.push(closestRight);
    if (closestTop) guides.push(closestTop);
    if (closestBottom) guides.push(closestBottom);

    setDistanceGuides(guides);
  }, [elements, getElementBounds]);

  // Find wall at exact click position (for placing doors)
  const findWallAtPosition = useCallback(
    (clickX: number, clickY: number, doorWidth: number): { wall: CanvasElement; position: number; snapX: number; snapY: number; angle: number } | null => {
      const snapDistance = 40; // Must click reasonably close to wall
      let nearestWall: { wall: CanvasElement; position: number; snapX: number; snapY: number; angle: number } | null = null;
      let nearestDist = Infinity;

      for (const el of elements) {
        if (el.type !== 'WALL') continue;

        const startX = el.startX ?? 0;
        const startY = el.startY ?? 0;
        const endX = el.endX ?? 0;
        const endY = el.endY ?? 0;

        const wallDx = endX - startX;
        const wallDy = endY - startY;
        const wallLength = Math.sqrt(wallDx * wallDx + wallDy * wallDy);
        if (wallLength < doorWidth) continue;

        // Find closest point on wall line to click
        const t = Math.max(0, Math.min(1, ((clickX - startX) * wallDx + (clickY - startY) * wallDy) / (wallLength * wallLength)));
        const closestX = startX + t * wallDx;
        const closestY = startY + t * wallDy;
        const dist = Math.sqrt((clickX - closestX) ** 2 + (clickY - closestY) ** 2);

        if (dist < snapDistance && dist < nearestDist) {
          // Check if door fits at this position
          const halfDoorInWallUnits = (doorWidth / 2) / wallLength;
          if (t >= halfDoorInWallUnits && t <= 1 - halfDoorInWallUnits) {
            nearestDist = dist;
            const angle = Math.atan2(wallDy, wallDx) * (180 / Math.PI);
            nearestWall = {
              wall: el,
              position: t,
              snapX: closestX,
              snapY: closestY,
              angle: angle,
            };
          }
        }
      }

      return nearestWall;
    },
    [elements]
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

      if (activeTool === 'wall' && isEditMode) {
        // Wall drawing - first click sets start point (only in edit mode)
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
      } else if (activeTool === 'element' && activeElementType === 'WALKWAY' && isEditMode) {
        // Walkway drawing - like walls, click-drag to draw a line
        if (!walkwayDrawing.startPoint) {
          setWalkwayStartPoint(snappedPos);
          setWalkwayIsDrawing(true);
          setWalkwayPreview({
            startX: snappedPos.x,
            startY: snappedPos.y,
            endX: snappedPos.x,
            endY: snappedPos.y,
          });
        }
      } else if (activeTool === 'element' && activeElementType && activeElementType !== 'WALL' && activeElementType !== 'WALKWAY' && isEditMode) {
        // Place rectangle element - use preset data if available
        const activePreset = activePresetId ? presets.find((p) => p.id === activePresetId) : null;
        const defaults =
          DEFAULT_ELEMENT_DIMENSIONS[activeElementType as keyof typeof DEFAULT_ELEMENT_DIMENSIONS] ||
          {};
        const defaultWidth = activePreset?.defaultWidth ?? ('width' in defaults ? defaults.width : 100);
        const defaultHeight = activePreset?.defaultHeight ?? ('height' in defaults ? defaults.height : 60);
        const defaultColor = activePreset?.defaultColor ?? DEFAULT_ELEMENT_COLORS[activeElementType as keyof typeof DEFAULT_ELEMENT_COLORS] ?? '#666666';
        const elementName = activePreset?.name ?? `${activeElementType.replace('_', ' ')} ${elements.length + 1}`;

        // Special handling for DOOR - must click directly on a wall
        if (activeElementType === 'DOOR') {
          const doorWidth = defaultWidth as number;
          const doorHeight = defaultHeight as number;

          // Check if any walls exist
          const walls = elements.filter(el => el.type === 'WALL');
          if (walls.length === 0) {
            showNotification('Draw a wall first before adding doors', 'error');
            return;
          }

          // Find wall at click position (tight snap distance of 25px)
          const wallSnap = findWallAtPosition(snappedPos.x, snappedPos.y, doorWidth);

          if (!wallSnap) {
            showNotification('Click directly on a wall to place a door', 'info');
            return;
          }

          const newDoor: CanvasElement = {
            id: generateId('door'),
            name: elementName,
            type: 'DOOR',
            // Store center position - renderDoor will use offset for rotation
            x: wallSnap.snapX,
            y: wallSnap.snapY,
            width: doorWidth,
            height: doorHeight,
            rotation: wallSnap.angle,
            color: defaultColor,
            opacity: 1,
            metadata: {
              attachedWallId: wallSnap.wall.id,
              wallPosition: wallSnap.position,
              swingDirection: 'left',
              swingAngle: 'in',
            },
          };
          addElement(newDoor);
          setSelectedId(newDoor.id, 'element');
          onElementSelect?.(newDoor);
        } else {
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
            // Copy metadata from preset (e.g., levels, traysPerLevel, trayCapacity for grow racks)
            metadata: activePreset?.metadata ? { ...activePreset.metadata } as CanvasElement['metadata'] : undefined,
          };
          addElement(newElement);
          setSelectedId(newElement.id, 'element');
          onElementSelect?.(newElement);
        }
      } else if (activeTool === 'measure') {
        // In measure mode, clicking on empty canvas clears the measurement
        const clickedOnEmpty = e.target === e.target.getStage();
        if (clickedOnEmpty) {
          clearMeasure();
        }
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
      findWallAtPosition,
      showNotification,
      clearMeasure,
      isEditMode,
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
      } else if (walkwayDrawing.startPoint && walkwayDrawing.isDrawing) {
        const scaledPos = getScaledPos();
        const snappedPos = snapPosition(scaledPos);

        setWalkwayPreview({
          startX: walkwayDrawing.startPoint.x,
          startY: walkwayDrawing.startPoint.y,
          endX: snappedPos.x,
          endY: snappedPos.y,
        });
      } else {
        setSnapIndicator(null);
      }
    },
    [activeTool, wallDrawing, walkwayDrawing, getScaledPos, snapPosition, findNearbyWallEndpoint, isMiddleMousePanning, panOffset, setPanOffset, isMarqueeSelecting, marquee]
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

      // Handle walkway drawing completion
      if (walkwayDrawing.startPoint && walkwayDrawing.isDrawing) {
        const scaledPos = getScaledPos();
        const endPos = snapPosition(scaledPos);

        // Calculate distance
        const dx = endPos.x - walkwayDrawing.startPoint.x;
        const dy = endPos.y - walkwayDrawing.startPoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Only create walkway if it has some length
        if (distance > 10) {
          const newWalkway: CanvasElement = {
            id: generateId('walkway'),
            name: `Walkway ${elements.filter((el) => el.type === 'WALKWAY').length + 1}`,
            type: 'WALKWAY',
            startX: walkwayDrawing.startPoint.x,
            startY: walkwayDrawing.startPoint.y,
            endX: endPos.x,
            endY: endPos.y,
            thickness: DEFAULT_ELEMENT_DIMENSIONS.WALKWAY.width, // Use width as thickness for line-based walkway
            color: DEFAULT_ELEMENT_COLORS.WALKWAY,
            opacity: 1,
          };
          addElement(newWalkway);
          setSelectedId(newWalkway.id, 'element');
          onElementSelect?.(newWalkway);
        }

        resetWalkwayDrawing();
        setWalkwayPreview(null);
      }
    },
    [
      activeTool,
      elements,
      wallDrawing,
      walkwayDrawing,
      getScaledPos,
      snapPosition,
      addElement,
      setSelectedId,
      resetWallDrawing,
      resetWalkwayDrawing,
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
      if (activeTool === 'measure') {
        // In measure mode, clicking an element adds the click point to measurement
        const clickPoint = getScaledPos();
        addMeasurePoint(element.id, clickPoint);
        return;
      }

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
    [activeTool, setSelectedId, toggleSelection, selectedIds, elements, onElementSelect, onMultiSelect, addMeasurePoint, getScaledPos]
  );

  // Handle drag start - capture initial positions for multi-drag (history pushed on drag END)
  const handleDragStart = useCallback((draggedElementId: string) => {
    // Store initial positions of all selected elements for multi-drag
    dragStartPositions.current.clear();
    if (selectedIds.length > 1 && selectedIds.includes(draggedElementId)) {
      for (const id of selectedIds) {
        const el = elements.find((e) => e.id === id);
        if (el) {
          if (el.type === 'WALL' || (el.type === 'WALKWAY' && el.startX !== undefined)) {
            dragStartPositions.current.set(id, {
              x: 0,
              y: 0,
              startX: el.startX ?? 0,
              startY: el.startY ?? 0,
              endX: el.endX ?? 0,
              endY: el.endY ?? 0,
            });
          } else {
            dragStartPositions.current.set(id, {
              x: el.x ?? 0,
              y: el.y ?? 0,
            });
          }
        }
      }
    }
  }, [selectedIds, elements]);

  // Handle multi-element drag move - moves all selected elements together
  const handleMultiDragMove = useCallback((draggedElementId: string, newX: number, newY: number) => {
    if (selectedIds.length <= 1 || !selectedIds.includes(draggedElementId)) return;

    const draggedStart = dragStartPositions.current.get(draggedElementId);
    if (!draggedStart) return;

    const dx = newX - draggedStart.x;
    const dy = newY - draggedStart.y;

    // Move all other selected elements visually
    for (const id of selectedIds) {
      if (id === draggedElementId) continue;

      const node = selectedShapesRef.current.get(id);
      const startPos = dragStartPositions.current.get(id);
      if (!node || !startPos) continue;

      const el = elements.find((e) => e.id === id);
      if (!el) continue;

      if (el.type === 'WALL' || (el.type === 'WALKWAY' && el.startX !== undefined)) {
        // For walls/line walkways, we need to offset from origin since they use startX/startY
        node.x(dx);
        node.y(dy);
      } else {
        // For regular elements, set to new position
        node.x(startPos.x + dx);
        node.y(startPos.y + dy);
      }
    }
  }, [selectedIds, elements]);

  // Handle element drag (for non-wall elements like tables, sinks, etc.) - moves all selected elements
  const handleElementDragEnd = useCallback(
    (element: CanvasElement, e: KonvaEventObject<DragEvent>) => {
      const newX = e.target.x();
      const newY = e.target.y();
      const origX = element.x ?? 0;
      const origY = element.y ?? 0;

      // Always snap to grid
      const snappedX = snapToGridValue(newX, unitGridSize);
      const snappedY = snapToGridValue(newY, unitGridSize);
      const dx = snappedX - origX;
      const dy = snappedY - origY;

      // Skip if no actual movement
      if (dx === 0 && dy === 0) return;

      // If multiple elements are selected and dragged element is one of them,
      // move all selected elements
      if (selectedIds.length > 1 && selectedIds.includes(element.id)) {
        for (const id of selectedIds) {
          const el = elements.find((e) => e.id === id);
          if (!el) continue;

          if (el.type === 'WALL') {
            const elStartX = typeof el.startX === 'number' ? el.startX : 0;
            const elStartY = typeof el.startY === 'number' ? el.startY : 0;
            const elEndX = typeof el.endX === 'number' ? el.endX : 0;
            const elEndY = typeof el.endY === 'number' ? el.endY : 0;
            updateElement(el.id, {
              startX: elStartX + dx,
              startY: elStartY + dy,
              endX: elEndX + dx,
              endY: elEndY + dy,
            });
          } else if (el.id === element.id) {
            // The dragged element - use snapped position
            updateElement(el.id, { x: snappedX, y: snappedY });
          } else {
            // Other selected elements - apply delta
            const elX = typeof el.x === 'number' ? el.x : 0;
            const elY = typeof el.y === 'number' ? el.y : 0;
            updateElement(el.id, { x: elX + dx, y: elY + dy });
          }
        }
      } else {
        // Single element drag
        updateElement(element.id, { x: snappedX, y: snappedY });
      }

      // Push history AFTER making changes (so history contains the new state)
      pushHistory();
    },
    [snapToGrid, unitGridSize, updateElement, selectedIds, elements, pushHistory]
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

      // Push history AFTER transform for undo support
      pushHistory();
    },
    [snapToGrid, unitGridSize, updateElement, pushHistory]
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

  // Handle wall drag (whole wall movement) - moves all selected elements
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

      // Always snap to grid
      const newStartX = snapToGridValue(currentStartX + dx, unitGridSize);
      const newStartY = snapToGridValue(currentStartY + dy, unitGridSize);

      // Calculate actual delta after snapping
      const actualDx = newStartX - currentStartX;
      const actualDy = newStartY - currentStartY;

      // Only update if there's actual movement after snapping
      if (actualDx !== 0 || actualDy !== 0) {
        // Move all selected elements, not just the dragged one
        const elementsToMove = selectedIds.length > 1 && selectedIds.includes(element.id)
          ? elements.filter((el) => selectedIds.includes(el.id))
          : [element];

        for (const el of elementsToMove) {
          if (el.type === 'WALL') {
            const elStartX = typeof el.startX === 'number' ? el.startX : 0;
            const elStartY = typeof el.startY === 'number' ? el.startY : 0;
            const elEndX = typeof el.endX === 'number' ? el.endX : 0;
            const elEndY = typeof el.endY === 'number' ? el.endY : 0;
            updateElement(el.id, {
              startX: elStartX + actualDx,
              startY: elStartY + actualDy,
              endX: elEndX + actualDx,
              endY: elEndY + actualDy,
            });
          } else {
            // Non-wall elements use x/y
            const elX = typeof el.x === 'number' ? el.x : 0;
            const elY = typeof el.y === 'number' ? el.y : 0;
            updateElement(el.id, {
              x: elX + actualDx,
              y: elY + actualDy,
            });
          }
        }

        // Push history AFTER making changes
        pushHistory();
      }
    },
    [snapToGrid, unitGridSize, updateElement, selectedIds, elements, pushHistory]
  );

  // Render wall element with gaps for attached doors
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
    const wallLength = Math.sqrt(relEndX * relEndX + relEndY * relEndY);

    // Find doors attached to this wall
    const attachedDoors = getDoorsOnWall(element.id);

    // Calculate wall segments with gaps for doors
    const getWallSegments = (): Array<{ start: number; end: number }> => {
      if (attachedDoors.length === 0) {
        return [{ start: 0, end: 1 }];
      }

      // Sort doors by position
      const doorGaps = attachedDoors
        .map((door) => {
          const pos = (door.metadata?.wallPosition as number) ?? 0.5;
          const doorWidth = door.width ?? 90;
          const halfWidth = (doorWidth / 2) / wallLength;
          return { start: pos - halfWidth, end: pos + halfWidth };
        })
        .sort((a, b) => a.start - b.start);

      // Build segments around the gaps
      const segments: Array<{ start: number; end: number }> = [];
      let currentStart = 0;

      for (const gap of doorGaps) {
        if (gap.start > currentStart) {
          segments.push({ start: currentStart, end: gap.start });
        }
        currentStart = gap.end;
      }

      if (currentStart < 1) {
        segments.push({ start: currentStart, end: 1 });
      }

      return segments;
    };

    const segments = getWallSegments();

    // Check if we're placing a door - if so, let clicks pass through to Stage
    const isPlacingDoor = activeTool === 'element' && activeElementType === 'DOOR';

    return (
      <Group
        key={element.id}
        x={startX}
        y={startY}
        draggable={false}
        onMouseDown={(e) => {
          // When placing doors, let click pass through to Stage
          if (isPlacingDoor) return;
          // Otherwise stop propagation to prevent Stage from handling this click
          e.cancelBubble = true;
        }}
        onClick={(e) => {
          // When placing doors, don't handle wall click
          if (isPlacingDoor) return;
          handleElementClick(element, e);
        }}
      >
        {/* Render wall segments */}
        {segments.map((seg, i) => (
          <Line
            key={`seg-${i}`}
            points={[
              relEndX * seg.start,
              relEndY * seg.start,
              relEndX * seg.end,
              relEndY * seg.end,
            ]}
            stroke={element.color}
            strokeWidth={thickness}
            opacity={element.opacity}
            lineCap="round"
            lineJoin="round"
            hitStrokeWidth={Math.max(thickness, 20)}
            draggable={isEditMode && activeTool === 'select'}
            onDragStart={() => handleDragStart(element.id)}
            onDragMove={(e) => {
              const node = e.target;
              const dx = node.x();
              const dy = node.y();
              // Calculate new wall position
              const newStartX = startX + dx;
              const newStartY = startY + dy;
              const newEndX = endX + dx;
              const newEndY = endY + dy;
              const halfT = thickness / 2;
              // Calculate bounding box
              calculateDistanceGuides(element.id, {
                x: Math.min(newStartX, newEndX) - halfT,
                y: Math.min(newStartY, newEndY) - halfT,
                width: Math.abs(newEndX - newStartX) + thickness,
                height: Math.abs(newEndY - newStartY) + thickness,
              });
              // Move other selected elements during drag
              handleMultiDragMove(element.id, dx, dy);
            }}
            onDragEnd={(e) => {
              handleWallDrag(element, e);
              setDistanceGuides([]);
            }}
          />
        ))}
        {/* Draggable endpoint handles when selected (edit mode only) */}
        {isEditMode && isSelected && (
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
              onDragStart={() => handleDragStart(element.id)}
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

                // Push history AFTER making changes
                pushHistory();

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
              onDragStart={() => handleDragStart(element.id)}
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

                // Push history AFTER making changes
                pushHistory();

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

  // Find the nearest wall for door snapping (tighter for dragging)
  const findNearestWallForDoor = useCallback(
    (doorX: number, doorY: number, doorWidth: number): { wall: CanvasElement; position: number; snapX: number; snapY: number; angle: number } | null => {
      const snapDistance = 30;
      let nearestWall: { wall: CanvasElement; position: number; snapX: number; snapY: number; angle: number } | null = null;
      let nearestDist = Infinity;

      for (const el of elements) {
        if (el.type !== 'WALL') continue;

        const startX = el.startX ?? 0;
        const startY = el.startY ?? 0;
        const endX = el.endX ?? 0;
        const endY = el.endY ?? 0;

        // Calculate wall vector
        const wallDx = endX - startX;
        const wallDy = endY - startY;
        const wallLength = Math.sqrt(wallDx * wallDx + wallDy * wallDy);
        if (wallLength < doorWidth) continue; // Wall too short for door

        // Find closest point on wall line to door center
        const t = Math.max(0, Math.min(1, ((doorX - startX) * wallDx + (doorY - startY) * wallDy) / (wallLength * wallLength)));
        const closestX = startX + t * wallDx;
        const closestY = startY + t * wallDy;
        const dist = Math.sqrt((doorX - closestX) ** 2 + (doorY - closestY) ** 2);

        if (dist < snapDistance && dist < nearestDist) {
          // Check if door fits at this position (not too close to ends)
          const halfDoorInWallUnits = (doorWidth / 2) / wallLength;
          if (t >= halfDoorInWallUnits && t <= 1 - halfDoorInWallUnits) {
            nearestDist = dist;
            const angle = Math.atan2(wallDy, wallDx) * (180 / Math.PI);
            nearestWall = {
              wall: el,
              position: t,
              snapX: closestX,
              snapY: closestY,
              angle: angle,
            };
          }
        }
      }

      return nearestWall;
    },
    [elements]
  );

  // Get doors attached to a specific wall
  const getDoorsOnWall = useCallback(
    (wallId: string) => {
      return elements.filter(
        (el) => el.type === 'DOOR' && el.metadata?.attachedWallId === wallId
      );
    },
    [elements]
  );

  // Render door element with swing arc
  const renderDoor = (element: CanvasElement) => {
    const isSelected = selectedIds.includes(element.id) && selectedType === 'element';
    const elementWidth = element.width ?? 90;
    const elementHeight = element.height ?? 10;
    const swingDirection = (element.metadata?.swingDirection as 'left' | 'right') ?? 'left';
    const swingAngle = (element.metadata?.swingAngle as 'in' | 'out') ?? 'in';
    const isAttached = !!element.metadata?.attachedWallId;

    // Half dimensions for center-based positioning
    const halfWidth = elementWidth / 2;
    const halfHeight = elementHeight / 2;

    // Arc settings - drawn relative to door center
    const arcRadius = elementWidth * 0.9;
    // Hinge position (local coords relative to center)
    const hingeX = swingDirection === 'left' ? -halfWidth : halfWidth;
    // Arc rotation based on swing direction
    let arcRotation = 0;
    if (swingDirection === 'left' && swingAngle === 'in') {
      arcRotation = -90;
    } else if (swingDirection === 'left' && swingAngle === 'out') {
      arcRotation = 0;
    } else if (swingDirection === 'right' && swingAngle === 'in') {
      arcRotation = 180;
    } else {
      arcRotation = 90;
    }

    return (
      <Group
        key={element.id}
        x={element.x ?? 0}
        y={element.y ?? 0}
        rotation={element.rotation ?? 0}
        draggable={isEditMode && activeTool === 'select'}
        onMouseDown={(e) => {
          e.cancelBubble = true;
        }}
        onClick={(e) => handleElementClick(element, e)}
        onDragStart={() => handleDragStart(element.id)}
        onDragMove={(e) => {
          const node = e.target;
          // Move other selected elements during drag
          handleMultiDragMove(element.id, node.x(), node.y());
        }}
        onDragEnd={(e) => {
          // Get the group's new center position after drag
          const group = e.target;
          const newX = group.x();
          const newY = group.y();

          // Try to snap to a wall (position is already center)
          const wallSnap = findNearestWallForDoor(newX, newY, elementWidth);

          if (wallSnap) {
            // Snap to wall - store center position
            updateElement(element.id, {
              x: wallSnap.snapX,
              y: wallSnap.snapY,
              rotation: wallSnap.angle,
              metadata: {
                ...element.metadata,
                attachedWallId: wallSnap.wall.id,
                wallPosition: wallSnap.position,
              },
            });
          } else {
            // Not near a wall - snap back to original position (doors must stay on walls)
            group.x(element.x ?? 0);
            group.y(element.y ?? 0);
          }
        }}
      >
        {/* Door panel - positioned relative to center */}
        <Rect
          x={-halfWidth}
          y={-halfHeight}
          width={elementWidth}
          height={elementHeight}
          fill={element.color}
          opacity={element.opacity}
          stroke={isSelected ? '#2563eb' : '#333'}
          strokeWidth={isSelected ? 3 : 1}
          cornerRadius={2}
        />
        {/* Swing arc */}
        <Arc
          x={hingeX}
          y={0}
          innerRadius={arcRadius - 2}
          outerRadius={arcRadius}
          angle={90}
          rotation={arcRotation}
          fill="transparent"
          stroke={element.color}
          strokeWidth={2}
          opacity={0.4}
          dash={[5, 3]}
        />
        {/* Hinge indicator */}
        <Circle
          x={swingDirection === 'left' ? -halfWidth + 4 : halfWidth - 4}
          y={0}
          radius={3}
          fill="#333"
          stroke="#fff"
          strokeWidth={1}
        />
        {/* Attached indicator */}
        {isAttached && (
          <Circle
            x={0}
            y={-halfHeight - 6}
            radius={4}
            fill="#22c55e"
            stroke="#fff"
            strokeWidth={1}
          />
        )}
      </Group>
    );
  };

  // Render walkway with striped pattern (line-based, like walls)
  const renderWalkway = (element: CanvasElement) => {
    const isSelected = selectedIds.includes(element.id) && selectedType === 'element';
    const thickness = element.thickness ?? 30;

    // Get coordinates
    const startX = typeof element.startX === 'number' ? element.startX : 0;
    const startY = typeof element.startY === 'number' ? element.startY : 0;
    const endX = typeof element.endX === 'number' ? element.endX : 0;
    const endY = typeof element.endY === 'number' ? element.endY : 0;

    const relEndX = endX - startX;
    const relEndY = endY - startY;
    const length = Math.sqrt(relEndX * relEndX + relEndY * relEndY);
    const angle = Math.atan2(relEndY, relEndX) * (180 / Math.PI);

    // Stripe settings
    const stripeSpacing = 20;
    const stripeCount = Math.floor(length / stripeSpacing);

    return (
      <Group
        key={element.id}
        x={startX}
        y={startY}
        rotation={angle}
        draggable={false}
        onMouseDown={(e) => {
          e.cancelBubble = true;
        }}
        onClick={(e) => handleElementClick(element, e)}
      >
        {/* Base walkway fill */}
        <Rect
          x={0}
          y={-thickness / 2}
          width={length}
          height={thickness}
          fill={element.color}
          opacity={element.opacity}
          cornerRadius={4}
          hitStrokeWidth={Math.max(thickness, 20)}
          draggable={isEditMode && activeTool === 'select'}
          onDragStart={() => handleDragStart(element.id)}
          onDragMove={(e) => {
            const node = e.target;
            const dx = node.x();
            const dy = node.y();
            // Calculate new walkway position (rotated)
            const rad = (angle * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            const worldDx = cos * dx - sin * dy;
            const worldDy = sin * dx + cos * dy;
            const newStartX = startX + worldDx;
            const newStartY = startY + worldDy;
            const newEndX = endX + worldDx;
            const newEndY = endY + worldDy;
            const halfT = thickness / 2;
            calculateDistanceGuides(element.id, {
              x: Math.min(newStartX, newEndX) - halfT,
              y: Math.min(newStartY, newEndY) - halfT,
              width: Math.abs(newEndX - newStartX) + thickness,
              height: Math.abs(newEndY - newStartY) + thickness,
            });
            // Move other selected elements during drag
            handleMultiDragMove(element.id, worldDx, worldDy);
          }}
          onDragEnd={(e) => {
            // Get the delta movement
            const node = e.target;
            const dx = node.x();
            const dy = node.y() + thickness / 2; // Account for initial y offset

            // Reset node position
            node.x(0);
            node.y(-thickness / 2);

            if (dx === 0 && dy === 0) {
              setDistanceGuides([]);
              return;
            }

            // Convert local drag delta to world coordinates (account for rotation)
            const rad = (angle * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            const worldDx = cos * dx - sin * dy;
            const worldDy = sin * dx + cos * dy;

            // Always snap to grid
            const newStartX = snapToGridValue(startX + worldDx, unitGridSize);
            const newStartY = snapToGridValue(startY + worldDy, unitGridSize);
            const actualDx = newStartX - startX;
            const actualDy = newStartY - startY;

            if (actualDx !== 0 || actualDy !== 0) {
              updateElement(element.id, {
                startX: startX + actualDx,
                startY: startY + actualDy,
                endX: endX + actualDx,
                endY: endY + actualDy,
              });
            }
            setDistanceGuides([]);
          }}
        />
        {/* Diagonal stripes */}
        {Array.from({ length: stripeCount }).map((_, i) => (
          <Line
            key={`stripe-${i}`}
            points={[
              i * stripeSpacing + stripeSpacing / 2,
              -thickness / 2,
              i * stripeSpacing,
              thickness / 2,
            ]}
            stroke="#ffffff"
            strokeWidth={3}
            opacity={0.4}
            listening={false}
          />
        ))}
        {/* Border lines */}
        <Line
          points={[0, -thickness / 2, length, -thickness / 2]}
          stroke={isSelected ? '#2563eb' : 'rgba(0,0,0,0.3)'}
          strokeWidth={isSelected ? 2 : 1}
          listening={false}
        />
        <Line
          points={[0, thickness / 2, length, thickness / 2]}
          stroke={isSelected ? '#2563eb' : 'rgba(0,0,0,0.3)'}
          strokeWidth={isSelected ? 2 : 1}
          listening={false}
        />
        {/* Endpoint handles when selected (edit mode only) */}
        {isEditMode && isSelected && (
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
              onDragStart={() => handleDragStart(element.id)}
              onDragMove={(e) => {
                const node = e.target;
                const worldPos = {
                  x: startX + Math.cos((angle * Math.PI) / 180) * node.x() - Math.sin((angle * Math.PI) / 180) * node.y(),
                  y: startY + Math.sin((angle * Math.PI) / 180) * node.x() + Math.cos((angle * Math.PI) / 180) * node.y(),
                };
                const snapped = snapPosition(worldPos, element.id);
                // Convert back to local coords
                const localX = (snapped.x - startX) * Math.cos((-angle * Math.PI) / 180) - (snapped.y - startY) * Math.sin((-angle * Math.PI) / 180);
                const localY = (snapped.x - startX) * Math.sin((-angle * Math.PI) / 180) + (snapped.y - startY) * Math.cos((-angle * Math.PI) / 180);
                node.x(localX);
                node.y(localY);
              }}
              onDragEnd={(e) => {
                const node = e.target;
                const worldPos = {
                  x: startX + Math.cos((angle * Math.PI) / 180) * node.x() - Math.sin((angle * Math.PI) / 180) * node.y(),
                  y: startY + Math.sin((angle * Math.PI) / 180) * node.x() + Math.cos((angle * Math.PI) / 180) * node.y(),
                };
                const snapped = snapPosition(worldPos, element.id);
                updateElement(element.id, {
                  startX: snapped.x,
                  startY: snapped.y,
                });
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
              x={length}
              y={0}
              radius={8}
              fill="#2563eb"
              stroke="#fff"
              strokeWidth={2}
              draggable
              onDragStart={() => handleDragStart(element.id)}
              onDragMove={(e) => {
                const node = e.target;
                const worldPos = {
                  x: startX + Math.cos((angle * Math.PI) / 180) * node.x() - Math.sin((angle * Math.PI) / 180) * node.y(),
                  y: startY + Math.sin((angle * Math.PI) / 180) * node.x() + Math.cos((angle * Math.PI) / 180) * node.y(),
                };
                const snapped = snapPosition(worldPos, element.id);
                const localX = (snapped.x - startX) * Math.cos((-angle * Math.PI) / 180) - (snapped.y - startY) * Math.sin((-angle * Math.PI) / 180);
                const localY = (snapped.x - startX) * Math.sin((-angle * Math.PI) / 180) + (snapped.y - startY) * Math.cos((-angle * Math.PI) / 180);
                node.x(localX);
                node.y(localY);
              }}
              onDragEnd={(e) => {
                const node = e.target;
                const worldPos = {
                  x: startX + Math.cos((angle * Math.PI) / 180) * node.x() - Math.sin((angle * Math.PI) / 180) * node.y(),
                  y: startY + Math.sin((angle * Math.PI) / 180) * node.x() + Math.cos((angle * Math.PI) / 180) * node.y(),
                };
                const snapped = snapPosition(worldPos, element.id);
                updateElement(element.id, {
                  endX: snapped.x,
                  endY: snapped.y,
                });
                // Recalculate new length for handle position
                const newLength = Math.sqrt(
                  Math.pow(snapped.x - startX, 2) + Math.pow(snapped.y - startY, 2)
                );
                node.x(newLength);
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
          </>
        )}
      </Group>
    );
  };

  // Render rectangle element (sink, table, grow rack, circle, custom)
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
        draggable={isEditMode && activeTool === 'select'}
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
        onDragStart={() => handleDragStart(element.id)}
        onDragMove={(e) => {
          const node = e.target;
          const newX = node.x();
          const newY = node.y();
          calculateDistanceGuides(element.id, {
            x: newX,
            y: newY,
            width: elementWidth,
            height: elementHeight,
          });
          // Move other selected elements during drag
          handleMultiDragMove(element.id, newX, newY);
        }}
        onDragEnd={(e) => {
          handleElementDragEnd(element, e);
          setDistanceGuides([]);
        }}
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
        {/* Element name - for GROW_RACK in view mode, center and auto-scale; otherwise top-left */}
        {isGrowRack && !isEditMode ? (
          <Text
            text={element.name}
            x={4}
            y={4}
            width={elementWidth - 8}
            height={elementHeight - 30}
            fontSize={calculateFitFontSize(element.name, elementWidth - 16, 16, 9)}
            fontStyle="bold"
            fill="#fff"
            shadowColor="#000"
            shadowBlur={3}
            shadowOpacity={0.7}
            align="center"
            verticalAlign="middle"
            wrap="none"
            ellipsis={true}
          />
        ) : (
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
        )}
        {/* Grow rack specific: show levels and capacity in edit mode, RackOverlay in view mode */}
        {isGrowRack && (
          <>
            {/* Edit mode: show capacity/level badges */}
            {isEditMode && (
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
            {/* View mode: clean, simple display with name and tray count */}
            {!isEditMode && (() => {
              const rackAssignmentsForThis = rackAssignments.filter(a => a.rackElementId === element.id);
              const totalOccupied = rackAssignmentsForThis.reduce((sum, a) => sum + a.trayCount, 0);
              const totalCapacity = levels * (element.metadata?.traysPerLevel ?? 6);
              const occupancyRatio = totalCapacity > 0 ? totalOccupied / totalCapacity : 0;

              // Color based on occupancy
              const getBorderColor = () => {
                if (totalOccupied === 0) return '#6b7280'; // gray for empty
                if (occupancyRatio >= 1) return '#ef4444'; // red for full
                if (occupancyRatio >= 0.8) return '#eab308'; // yellow for nearly full
                return '#22c55e'; // green for has space
              };

              return (
                <>
                  {/* Occupancy border indicator */}
                  <Rect
                    x={0}
                    y={0}
                    width={elementWidth}
                    height={elementHeight}
                    stroke={getBorderColor()}
                    strokeWidth={3}
                    cornerRadius={4}
                    listening={false}
                  />
                  {/* Tray count badge at bottom center */}
                  <Group x={elementWidth / 2} y={elementHeight - 6}>
                    <Rect
                      x={-30}
                      y={-16}
                      width={60}
                      height={18}
                      fill="rgba(0,0,0,0.75)"
                      cornerRadius={9}
                    />
                    <Text
                      text={`${totalOccupied} trays`}
                      x={-30}
                      y={-14}
                      width={60}
                      align="center"
                      fontSize={11}
                      fontStyle="bold"
                      fill="#fff"
                      listening={false}
                    />
                  </Group>
                </>
              );
            })()}
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
      case 'measure':
        return 'crosshair';
      default:
        return 'default';
    }
  };

  // Get measurement data between two click points
  const getMeasurementData = useCallback(() => {
    if (measureState.points.length !== 2) return null;

    const point1 = measureState.points[0];
    const point2 = measureState.points[1];

    const dx = point2.clickPoint.x - point1.clickPoint.x;
    const dy = point2.clickPoint.y - point1.clickPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return {
      x1: point1.clickPoint.x,
      y1: point1.clickPoint.y,
      x2: point2.clickPoint.x,
      y2: point2.clickPoint.y,
      distance,
    };
  }, [measureState.points]);

  return (
    <div className="relative" style={{ width, height }}>
      {/* Measure mode instruction overlay */}
      {activeTool === 'measure' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-green-100 text-green-800 border border-green-200 rounded-lg shadow-lg text-sm font-medium">
          {measureState.points.length === 0
            ? 'Click on any element to set the first measurement point'
            : measureState.points.length === 1
            ? 'Click on another point to measure distance'
            : `Distance: ${formatDistance(getMeasurementData()?.distance ?? 0, unitSystem)}`}
        </div>
      )}
      {/* Notification overlay */}
      {notification && (
        <div
          className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg text-sm font-medium transition-opacity ${
            notification.type === 'error'
              ? 'bg-red-100 text-red-800 border border-red-200'
              : 'bg-blue-100 text-blue-800 border border-blue-200'
          }`}
        >
          {notification.message}
        </div>
      )}
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
        {elements.map((element) => {
          if (element.type === 'WALL') return renderWall(element);
          if (element.type === 'DOOR') return renderDoor(element);
          // Line-based walkways use renderWalkway, old rectangle walkways use renderRectElement
          if (element.type === 'WALKWAY' && element.startX !== undefined) return renderWalkway(element);
          return renderRectElement(element);
        })}
        {/* Transformer for resize/rotate - only in edit mode, exclude walls, doors, grow racks, and line-walkways */}
        {isEditMode && selectedIds.length > 0 && selectedType === 'element' && selectedIds.some(id => {
          const el = elements.find(e => e.id === id);
          // Exclude walls, doors, grow racks (use properties panel), and line-based walkways (they have custom handles)
          const isLineWalkway = el?.type === 'WALKWAY' && el.startX !== undefined;
          return el && el.type !== 'WALL' && el.type !== 'DOOR' && el.type !== 'GROW_RACK' && !isLineWalkway;
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
        {/* Walkway preview */}
        {walkwayPreview && (() => {
          const dx = walkwayPreview.endX - walkwayPreview.startX;
          const dy = walkwayPreview.endY - walkwayPreview.startY;
          const length = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
          const thickness = DEFAULT_ELEMENT_DIMENSIONS.WALKWAY.width;
          const stripeSpacing = 20;
          const stripeCount = Math.floor(length / stripeSpacing);

          return (
            <Group x={walkwayPreview.startX} y={walkwayPreview.startY} rotation={angle}>
              <Rect
                x={0}
                y={-thickness / 2}
                width={length}
                height={thickness}
                fill={DEFAULT_ELEMENT_COLORS.WALKWAY}
                opacity={0.5}
                cornerRadius={4}
              />
              {Array.from({ length: stripeCount }).map((_, i) => (
                <Line
                  key={`preview-stripe-${i}`}
                  points={[
                    i * stripeSpacing + stripeSpacing / 2,
                    -thickness / 2,
                    i * stripeSpacing,
                    thickness / 2,
                  ]}
                  stroke="#ffffff"
                  strokeWidth={3}
                  opacity={0.3}
                />
              ))}
            </Group>
          );
        })()}
        {/* Start point indicator when drawing walkway */}
        {walkwayDrawing.startPoint && walkwayDrawing.isDrawing && (
          <Circle
            x={walkwayDrawing.startPoint.x}
            y={walkwayDrawing.startPoint.y}
            radius={8}
            fill={DEFAULT_ELEMENT_COLORS.WALKWAY}
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
        {/* Distance guide lines */}
        {distanceGuides.map((guide, i) => (
          <Group key={`guide-${i}`}>
            <Line
              points={[guide.x1, guide.y1, guide.x2, guide.y2]}
              stroke="#ef4444"
              strokeWidth={1}
              dash={[4, 4]}
            />
            {/* Distance label */}
            <Label
              x={(guide.x1 + guide.x2) / 2}
              y={(guide.y1 + guide.y2) / 2}
              offsetX={guide.direction === 'horizontal' ? 0 : -8}
              offsetY={guide.direction === 'horizontal' ? 10 : 0}
            >
              <Tag
                fill="rgba(0,0,0,0.75)"
                cornerRadius={3}
                pointerDirection={guide.direction === 'horizontal' ? 'down' : 'left'}
                pointerWidth={6}
                pointerHeight={4}
              />
              <Text
                text={formatDistance(guide.distance, unitSystem)}
                fill="#fff"
                fontSize={11}
                padding={4}
              />
            </Label>
          </Group>
        ))}
        {/* Measure tool visualization */}
        {activeTool === 'measure' && measureState.points.length > 0 && (
          <>
            {/* Highlight first click point */}
            {measureState.points[0] && (
              <Circle
                x={measureState.points[0].clickPoint.x}
                y={measureState.points[0].clickPoint.y}
                radius={8}
                fill="#22c55e"
                stroke="#fff"
                strokeWidth={2}
              />
            )}
            {/* Highlight second click point */}
            {measureState.points[1] && (
              <Circle
                x={measureState.points[1].clickPoint.x}
                y={measureState.points[1].clickPoint.y}
                radius={8}
                fill="#22c55e"
                stroke="#fff"
                strokeWidth={2}
              />
            )}
            {/* Measurement line and distance label */}
            {(() => {
              const measurement = getMeasurementData();
              if (!measurement) return null;
              const { x1, y1, x2, y2, distance } = measurement;
              const midX = (x1 + x2) / 2;
              const midY = (y1 + y2) / 2;
              return (
                <Group>
                  {/* Measurement line */}
                  <Line
                    points={[x1, y1, x2, y2]}
                    stroke="#22c55e"
                    strokeWidth={2}
                    dash={[8, 4]}
                  />
                  {/* Distance label */}
                  <Label x={midX} y={midY} offsetY={15}>
                    <Tag
                      fill="#22c55e"
                      cornerRadius={4}
                      pointerDirection="down"
                      pointerWidth={8}
                      pointerHeight={6}
                    />
                    <Text
                      text={formatDistance(distance, unitSystem)}
                      fill="#fff"
                      fontSize={14}
                      fontStyle="bold"
                      padding={6}
                    />
                  </Label>
                </Group>
              );
            })()}
          </>
        )}
      </Layer>
    </Stage>
    </div>
  );
}
