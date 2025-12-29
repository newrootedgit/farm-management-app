import { useRef, useEffect, useCallback } from 'react';
import { Stage, Layer, Rect, Line, Group, Text } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useCanvasStore, snapToGridValue, CanvasZone } from '@/stores/canvas-store';

interface FarmCanvasProps {
  width: number;
  height: number;
  onZoneSelect?: (zone: CanvasZone | null) => void;
}

export function FarmCanvas({ width, height, onZoneSelect }: FarmCanvasProps) {
  const stageRef = useRef<any>(null);
  const {
    zones,
    activeTool,
    selectedId,
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
  } = useCanvasStore();

  // Drawing state for new zones
  const isDrawing = useRef(false);
  const drawStart = useRef({ x: 0, y: 0 });

  // Handle zoom with mouse wheel
  const handleWheel = useCallback((e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = zoom;
    const pointer = stage.getPointerPosition();
    const scaleBy = 1.1;
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;

    setZoom(newScale);

    // Adjust pan to zoom towards pointer
    const mousePointTo = {
      x: (pointer.x - panOffset.x) / oldScale,
      y: (pointer.y - panOffset.y) / oldScale,
    };

    setPanOffset({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  }, [zoom, panOffset, setZoom, setPanOffset]);

  // Handle mouse down
  const handleMouseDown = useCallback((e: KonvaEventObject<MouseEvent>) => {
    const stage = stageRef.current;
    if (!stage) return;

    const pos = stage.getPointerPosition();
    const scaledPos = {
      x: (pos.x - panOffset.x) / zoom,
      y: (pos.y - panOffset.y) / zoom,
    };

    if (activeTool === 'zone') {
      isDrawing.current = true;
      drawStart.current = snapToGrid
        ? { x: snapToGridValue(scaledPos.x, gridSize), y: snapToGridValue(scaledPos.y, gridSize) }
        : scaledPos;
    } else if (activeTool === 'select') {
      // Check if clicked on empty space
      const clickedOnEmpty = e.target === e.target.getStage();
      if (clickedOnEmpty) {
        setSelectedId(null);
        onZoneSelect?.(null);
      }
    }
  }, [activeTool, zoom, panOffset, snapToGrid, gridSize, setSelectedId, onZoneSelect]);

  // Handle mouse up
  const handleMouseUp = useCallback((e: KonvaEventObject<MouseEvent>) => {
    if (activeTool === 'zone' && isDrawing.current) {
      const stage = stageRef.current;
      if (!stage) return;

      const pos = stage.getPointerPosition();
      const scaledPos = {
        x: (pos.x - panOffset.x) / zoom,
        y: (pos.y - panOffset.y) / zoom,
      };

      const endPos = snapToGrid
        ? { x: snapToGridValue(scaledPos.x, gridSize), y: snapToGridValue(scaledPos.y, gridSize) }
        : scaledPos;

      const newWidth = Math.abs(endPos.x - drawStart.current.x);
      const newHeight = Math.abs(endPos.y - drawStart.current.y);

      // Only create zone if it has some size
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
        setSelectedId(newZone.id);
        onZoneSelect?.(newZone);
      }

      isDrawing.current = false;
    }
  }, [activeTool, zoom, panOffset, snapToGrid, gridSize, zones.length, addZone, setSelectedId, onZoneSelect]);

  // Handle zone click
  const handleZoneClick = useCallback((zone: CanvasZone) => {
    if (activeTool === 'select') {
      setSelectedId(zone.id);
      onZoneSelect?.(zone);
    }
  }, [activeTool, setSelectedId, onZoneSelect]);

  // Handle zone drag
  const handleZoneDragEnd = useCallback((zone: CanvasZone, e: KonvaEventObject<DragEvent>) => {
    let newX = e.target.x();
    let newY = e.target.y();

    if (snapToGrid) {
      newX = snapToGridValue(newX, gridSize);
      newY = snapToGridValue(newY, gridSize);
    }

    updateZone(zone.id, { x: newX, y: newY });
  }, [snapToGrid, gridSize, updateZone]);

  // Handle zone transform (resize)
  const handleZoneTransformEnd = useCallback((zone: CanvasZone, e: KonvaEventObject<Event>) => {
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Reset scale
    node.scaleX(1);
    node.scaleY(1);

    let newWidth = Math.max(20, node.width() * scaleX);
    let newHeight = Math.max(20, node.height() * scaleY);
    let newX = node.x();
    let newY = node.y();

    if (snapToGrid) {
      newWidth = snapToGridValue(newWidth, gridSize);
      newHeight = snapToGridValue(newHeight, gridSize);
      newX = snapToGridValue(newX, gridSize);
      newY = snapToGridValue(newY, gridSize);
    }

    updateZone(zone.id, {
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight,
    });
  }, [snapToGrid, gridSize, updateZone]);

  // Render grid lines
  const renderGrid = () => {
    if (!showGrid) return null;

    const lines = [];
    const gridWidth = width / zoom;
    const gridHeight = height / zoom;

    // Vertical lines
    for (let i = 0; i <= gridWidth / gridSize; i++) {
      lines.push(
        <Line
          key={`v-${i}`}
          points={[i * gridSize, 0, i * gridSize, gridHeight]}
          stroke="#e0e0e0"
          strokeWidth={0.5}
        />
      );
    }

    // Horizontal lines
    for (let i = 0; i <= gridHeight / gridSize; i++) {
      lines.push(
        <Line
          key={`h-${i}`}
          points={[0, i * gridSize, gridWidth, i * gridSize]}
          stroke="#e0e0e0"
          strokeWidth={0.5}
        />
      );
    }

    return lines;
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
      onMouseUp={handleMouseUp}
      style={{ backgroundColor: '#f5f5f5' }}
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
            onDragEnd={(e) => handleZoneDragEnd(zone, e)}
            onTransformEnd={(e) => handleZoneTransformEnd(zone, e)}
          >
            <Rect
              width={zone.width}
              height={zone.height}
              fill={zone.color}
              opacity={0.6}
              stroke={selectedId === zone.id ? '#2563eb' : '#333'}
              strokeWidth={selectedId === zone.id ? 3 : 1}
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
    </Stage>
  );
}
