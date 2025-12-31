import { useRef, useCallback, useState } from 'react';
import { Stage, Layer, Rect, Line, Group, Text, Circle, Transformer } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import {
  useCanvasStore,
  snapToGridValue,
  CanvasZone,
  CanvasElement,
  generateId,
} from '@/stores/canvas-store';
import { DEFAULT_ELEMENT_COLORS, DEFAULT_ELEMENT_DIMENSIONS } from '@farm/shared';
import type { UnitSystem } from '@farm/shared';
import { getGridSizeForUnit, getUnitLabel } from '@/lib/units';

interface FarmCanvasProps {
  width: number;
  height: number;
  unitSystem?: UnitSystem;
  onZoneSelect?: (zone: CanvasZone | null) => void;
  onElementSelect?: (element: CanvasElement | null) => void;
  onOpenWallModal?: (startPoint: { x: number; y: number }) => void;
}

export function FarmCanvas({
  width,
  height,
  unitSystem = 'FEET',
  onZoneSelect,
  onElementSelect,
  onOpenWallModal,
}: FarmCanvasProps) {
  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  const {
    zones,
    elements,
    activeTool,
    activeElementType,
    activePresetId,
    selectedId,
    selectedType,
    setSelectedId,
    zoom,
    setZoom,
    panOffset,
    setPanOffset,
    showGrid,
    gridSize,
    snapToGrid,
    addZone,
    updateZone,
    addElement,
    updateElement,
    wallDrawing,
    setWallStartPoint,
    setWallIsDrawing,
    resetWallDrawing,
    pushHistory,
  } = useCanvasStore();

  // Wall preview state
  const [wallPreview, setWallPreview] = useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);

  // Drawing state for new zones
  const isDrawing = useRef(false);
  const drawStart = useRef({ x: 0, y: 0 });

  // Get scaled pointer position
  const getScaledPos = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };
    const pos = stage.getPointerPosition();
    return {
      x: (pos.x - panOffset.x) / zoom,
      y: (pos.y - panOffset.y) / zoom,
    };
  }, [panOffset, zoom]);

  // Get grid size based on unit system
  const unitGridSize = getGridSizeForUnit(unitSystem);

  // Snap position to grid if enabled
  const snapPosition = useCallback(
    (pos: { x: number; y: number }) => {
      if (!snapToGrid) return pos;
      return {
        x: snapToGridValue(pos.x, unitGridSize),
        y: snapToGridValue(pos.y, unitGridSize),
      };
    },
    [snapToGrid, unitGridSize]
  );

  // Handle zoom with mouse wheel
  const handleWheel = useCallback(
    (e: KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;

      const oldScale = zoom;
      const pointer = stage.getPointerPosition();
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
      const scaledPos = getScaledPos();
      const snappedPos = snapPosition(scaledPos);

      if (activeTool === 'zone') {
        // Zone drawing
        isDrawing.current = true;
        drawStart.current = snappedPos;
      } else if (activeTool === 'wall') {
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
        // Place rectangle element
        const defaults =
          DEFAULT_ELEMENT_DIMENSIONS[activeElementType as keyof typeof DEFAULT_ELEMENT_DIMENSIONS] ||
          {};
        const defaultWidth = 'width' in defaults ? defaults.width : 100;
        const defaultHeight = 'height' in defaults ? defaults.height : 60;

        const newElement: CanvasElement = {
          id: generateId('el'),
          name: `${activeElementType.replace('_', ' ')} ${elements.length + 1}`,
          type: activeElementType,
          x: snappedPos.x,
          y: snappedPos.y,
          width: defaultWidth,
          height: defaultHeight,
          rotation: 0,
          color: DEFAULT_ELEMENT_COLORS[activeElementType as keyof typeof DEFAULT_ELEMENT_COLORS] || '#666666',
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
          setSelectedId(null);
          onZoneSelect?.(null);
          onElementSelect?.(null);
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
      setWallStartPoint,
      setWallIsDrawing,
      onZoneSelect,
      onElementSelect,
    ]
  );

  // Handle mouse move
  const handleMouseMove = useCallback(() => {
    if (activeTool === 'wall' && wallDrawing.startPoint && wallDrawing.isDrawing) {
      const scaledPos = getScaledPos();
      const snappedPos = snapPosition(scaledPos);
      setWallPreview({
        startX: wallDrawing.startPoint.x,
        startY: wallDrawing.startPoint.y,
        endX: snappedPos.x,
        endY: snappedPos.y,
      });
    }
  }, [activeTool, wallDrawing, getScaledPos, snapPosition]);

  // Handle mouse up
  const handleMouseUp = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (activeTool === 'zone' && isDrawing.current) {
        const scaledPos = getScaledPos();
        const endPos = snapPosition(scaledPos);

        const newWidth = Math.abs(endPos.x - drawStart.current.x);
        const newHeight = Math.abs(endPos.y - drawStart.current.y);

        if (newWidth > 20 && newHeight > 20) {
          const newZone: CanvasZone = {
            id: `zone-${Date.now()}`,
            name: `Zone ${zones.length + 1}`,
            type: 'FIELD',
            color: '#4CAF50',
            x: Math.min(drawStart.current.x, endPos.x),
            y: Math.min(drawStart.current.y, endPos.y),
            width: newWidth,
            height: newHeight,
          };
          addZone(newZone);
          setSelectedId(newZone.id, 'zone');
          onZoneSelect?.(newZone);
        }

        isDrawing.current = false;
      } else if (activeTool === 'wall' && wallDrawing.startPoint && wallDrawing.isDrawing) {
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
      }
    },
    [
      activeTool,
      zones.length,
      elements,
      wallDrawing,
      getScaledPos,
      snapPosition,
      addZone,
      addElement,
      setSelectedId,
      resetWallDrawing,
      onZoneSelect,
      onElementSelect,
    ]
  );

  // Handle double-click for wall modal
  const handleDoubleClick = useCallback(() => {
    if (activeTool === 'wall' && wallDrawing.startPoint && onOpenWallModal) {
      onOpenWallModal(wallDrawing.startPoint);
    }
  }, [activeTool, wallDrawing.startPoint, onOpenWallModal]);

  // Handle zone click
  const handleZoneClick = useCallback(
    (zone: CanvasZone) => {
      if (activeTool === 'select') {
        setSelectedId(zone.id, 'zone');
        onZoneSelect?.(zone);
        onElementSelect?.(null);
      }
    },
    [activeTool, setSelectedId, onZoneSelect, onElementSelect]
  );

  // Handle element click
  const handleElementClick = useCallback(
    (element: CanvasElement) => {
      if (activeTool === 'select') {
        setSelectedId(element.id, 'element');
        onElementSelect?.(element);
        onZoneSelect?.(null);
      }
    },
    [activeTool, setSelectedId, onElementSelect, onZoneSelect]
  );

  // Handle drag start - push history so we can undo
  const handleDragStart = useCallback(() => {
    pushHistory();
  }, [pushHistory]);

  // Handle zone drag
  const handleZoneDragEnd = useCallback(
    (zone: CanvasZone, e: KonvaEventObject<DragEvent>) => {
      let newX = e.target.x();
      let newY = e.target.y();

      if (snapToGrid) {
        newX = snapToGridValue(newX, unitGridSize);
        newY = snapToGridValue(newY, unitGridSize);
      }

      updateZone(zone.id, { x: newX, y: newY });
    },
    [snapToGrid, unitGridSize, updateZone]
  );

  // Handle element drag
  const handleElementDragEnd = useCallback(
    (element: CanvasElement, e: KonvaEventObject<DragEvent>) => {
      let newX = e.target.x();
      let newY = e.target.y();

      if (snapToGrid) {
        newX = snapToGridValue(newX, unitGridSize);
        newY = snapToGridValue(newY, unitGridSize);
      }

      if (element.type === 'WALL') {
        // For walls, update start/end points
        const dx = newX - (element.startX ?? 0);
        const dy = newY - (element.startY ?? 0);
        updateElement(element.id, {
          startX: newX,
          startY: newY,
          endX: (element.endX ?? 0) + dx,
          endY: (element.endY ?? 0) + dy,
        });
      } else {
        updateElement(element.id, { x: newX, y: newY });
      }
    },
    [snapToGrid, unitGridSize, updateElement]
  );

  // Handle zone transform (resize)
  const handleZoneTransformEnd = useCallback(
    (zone: CanvasZone, e: KonvaEventObject<Event>) => {
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

      updateZone(zone.id, {
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight,
      });
    },
    [snapToGrid, unitGridSize, updateZone]
  );

  // Handle element transform (resize)
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

    // Calculate visible area in world coordinates
    const visibleLeft = -panOffset.x / zoom;
    const visibleTop = -panOffset.y / zoom;
    const visibleRight = visibleLeft + width / zoom;
    const visibleBottom = visibleTop + height / zoom;

    // Add some padding to ensure lines are drawn beyond visible area
    const padding = gridUnit * 2;
    const startX = Math.floor((visibleLeft - padding) / gridUnit) * gridUnit;
    const startY = Math.floor((visibleTop - padding) / gridUnit) * gridUnit;
    const endX = Math.ceil((visibleRight + padding) / gridUnit) * gridUnit;
    const endY = Math.ceil((visibleBottom + padding) / gridUnit) * gridUnit;

    // Limit number of lines to prevent performance issues
    const maxLines = 200;
    const numVerticalLines = Math.min((endX - startX) / gridUnit, maxLines);
    const numHorizontalLines = Math.min((endY - startY) / gridUnit, maxLines);

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
    const scaleX = visibleLeft + 20;
    const scaleY = visibleBottom - 40;
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

  // Handle wall endpoint drag
  const handleWallEndpointDrag = useCallback(
    (element: CanvasElement, endpoint: 'start' | 'end', e: KonvaEventObject<DragEvent>) => {
      const node = e.target;
      let newX = node.x();
      let newY = node.y();

      if (snapToGrid) {
        newX = snapToGridValue(newX, unitGridSize);
        newY = snapToGridValue(newY, unitGridSize);
      }

      // Convert from local group coordinates to absolute
      const startX = element.startX ?? 0;
      const startY = element.startY ?? 0;

      if (endpoint === 'start') {
        updateElement(element.id, {
          startX: startX + newX,
          startY: startY + newY,
        });
        // Reset the node position since we're updating the group
        node.x(0);
        node.y(0);
      } else {
        updateElement(element.id, {
          endX: startX + newX,
          endY: startY + newY,
        });
        // Keep relative position for end point
        node.x(newX);
        node.y(newY);
      }
    },
    [snapToGrid, unitGridSize, updateElement]
  );

  // Render wall element
  const renderWall = (element: CanvasElement) => {
    const isSelected = selectedId === element.id && selectedType === 'element';
    const thickness = element.thickness ?? 10;
    const relEndX = (element.endX ?? 0) - (element.startX ?? 0);
    const relEndY = (element.endY ?? 0) - (element.startY ?? 0);

    return (
      <Group
        key={element.id}
        x={element.startX ?? 0}
        y={element.startY ?? 0}
        draggable={activeTool === 'select' && !isSelected}
        onClick={() => handleElementClick(element)}
        onDragStart={handleDragStart}
        onDragEnd={(e) => handleElementDragEnd(element, e)}
      >
        <Line
          points={[0, 0, relEndX, relEndY]}
          stroke={element.color}
          strokeWidth={thickness}
          opacity={element.opacity}
          lineCap="round"
          lineJoin="round"
          hitStrokeWidth={Math.max(thickness, 20)}
          draggable={activeTool === 'select' && isSelected}
          onDragStart={handleDragStart}
          onDragEnd={(e) => {
            // When line itself is dragged, move the whole wall
            const dx = e.target.x();
            const dy = e.target.y();
            if (dx !== 0 || dy !== 0) {
              updateElement(element.id, {
                startX: (element.startX ?? 0) + dx,
                startY: (element.startY ?? 0) + dy,
                endX: (element.endX ?? 0) + dx,
                endY: (element.endY ?? 0) + dy,
              });
              e.target.x(0);
              e.target.y(0);
            }
          }}
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
                // Real-time update during drag
                const node = e.target;
                let newX = node.x();
                let newY = node.y();
                if (snapToGrid) {
                  newX = snapToGridValue(newX, unitGridSize);
                  newY = snapToGridValue(newY, unitGridSize);
                  node.x(newX);
                  node.y(newY);
                }
              }}
              onDragEnd={(e) => {
                const node = e.target;
                let newX = node.x();
                let newY = node.y();
                if (snapToGrid) {
                  newX = snapToGridValue(newX, unitGridSize);
                  newY = snapToGridValue(newY, unitGridSize);
                }
                const startX = element.startX ?? 0;
                const startY = element.startY ?? 0;
                updateElement(element.id, {
                  startX: startX + newX,
                  startY: startY + newY,
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
              x={relEndX}
              y={relEndY}
              radius={8}
              fill="#2563eb"
              stroke="#fff"
              strokeWidth={2}
              draggable
              onDragStart={handleDragStart}
              onDragMove={(e) => {
                // Real-time update during drag
                const node = e.target;
                let newX = node.x();
                let newY = node.y();
                if (snapToGrid) {
                  newX = snapToGridValue(newX, unitGridSize);
                  newY = snapToGridValue(newY, unitGridSize);
                  node.x(newX);
                  node.y(newY);
                }
              }}
              onDragEnd={(e) => {
                const node = e.target;
                let newX = node.x();
                let newY = node.y();
                if (snapToGrid) {
                  newX = snapToGridValue(newX, unitGridSize);
                  newY = snapToGridValue(newY, unitGridSize);
                }
                const startX = element.startX ?? 0;
                const startY = element.startY ?? 0;
                updateElement(element.id, {
                  endX: startX + newX,
                  endY: startY + newY,
                });
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

  // Render rectangle element (sink, table, grow rack, custom)
  const renderRectElement = (element: CanvasElement) => {
    const isSelected = selectedId === element.id && selectedType === 'element';

    return (
      <Group
        key={element.id}
        x={element.x ?? 0}
        y={element.y ?? 0}
        rotation={element.rotation ?? 0}
        draggable={activeTool === 'select'}
        onClick={() => handleElementClick(element)}
        onDragStart={handleDragStart}
        onDragEnd={(e) => handleElementDragEnd(element, e)}
        onTransformEnd={(e) => handleElementTransformEnd(element, e)}
      >
        <Rect
          width={element.width ?? 100}
          height={element.height ?? 60}
          fill={element.color}
          opacity={element.opacity}
          stroke={isSelected ? '#2563eb' : '#333'}
          strokeWidth={isSelected ? 3 : 1}
          cornerRadius={4}
        />
        <Text
          text={element.name}
          x={4}
          y={4}
          fontSize={12}
          fontStyle="bold"
          fill="#fff"
          shadowColor="#000"
          shadowBlur={2}
          shadowOpacity={0.5}
        />
      </Group>
    );
  };

  // Cursor style based on active tool
  const getCursor = () => {
    switch (activeTool) {
      case 'pan':
        return 'grab';
      case 'zone':
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
      style={{ backgroundColor: '#f5f5f5', cursor: getCursor() }}
    >
      {/* Grid layer */}
      <Layer>
        {renderGrid()}
      </Layer>

      {/* Zones layer */}
      <Layer>
        {zones.map((zone) => (
          <Group
            key={zone.id}
            x={zone.x}
            y={zone.y}
            draggable={activeTool === 'select'}
            onClick={() => handleZoneClick(zone)}
            onDragStart={handleDragStart}
            onDragEnd={(e) => handleZoneDragEnd(zone, e)}
            onTransformEnd={(e) => handleZoneTransformEnd(zone, e)}
          >
            <Rect
              width={zone.width}
              height={zone.height}
              fill={zone.color}
              opacity={0.6}
              stroke={selectedId === zone.id && selectedType === 'zone' ? '#2563eb' : '#333'}
              strokeWidth={selectedId === zone.id && selectedType === 'zone' ? 3 : 1}
              cornerRadius={4}
            />
            <Text
              text={zone.name}
              x={8}
              y={8}
              fontSize={14}
              fontStyle="bold"
              fill="#fff"
              shadowColor="#000"
              shadowBlur={2}
              shadowOpacity={0.5}
            />
            <Text
              text={zone.type}
              x={8}
              y={26}
              fontSize={11}
              fill="#fff"
              shadowColor="#000"
              shadowBlur={2}
              shadowOpacity={0.5}
            />
          </Group>
        ))}
      </Layer>

      {/* Elements layer */}
      <Layer>
        {elements.map((element) =>
          element.type === 'WALL' ? renderWall(element) : renderRectElement(element)
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
      </Layer>
    </Stage>
  );
}
