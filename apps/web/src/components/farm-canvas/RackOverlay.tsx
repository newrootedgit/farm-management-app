import { Group, Rect, Text } from 'react-konva';
import type { RackAssignment } from '@/lib/api-client';

interface RackOverlayProps {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  levels: number;
  traysPerLevel: number;
  assignments: RackAssignment[];
}

export function RackOverlay({
  x,
  y,
  width,
  height,
  rotation = 0,
  levels,
  traysPerLevel,
  assignments,
}: RackOverlayProps) {
  // Calculate total occupancy
  const totalCapacity = levels * traysPerLevel;
  const totalOccupied = assignments.reduce((sum, a) => sum + a.trayCount, 0);
  const occupancyRatio = totalOccupied / totalCapacity;

  // Get occupancy color
  const getOccupancyColor = () => {
    if (occupancyRatio >= 1) return '#ef4444'; // red
    if (occupancyRatio >= 0.8) return '#eab308'; // yellow
    return '#22c55e'; // green
  };

  // Get unique varieties on this rack
  const varieties = [...new Set(assignments.map((a) => a.orderItem.product.name))];

  // Calculate occupancy per level for detailed view
  const levelOccupancy = new Map<number, { trays: number; products: string[] }>();
  for (let i = 1; i <= levels; i++) {
    levelOccupancy.set(i, { trays: 0, products: [] });
  }
  for (const assignment of assignments) {
    const current = levelOccupancy.get(assignment.level);
    if (current) {
      current.trays += assignment.trayCount;
      if (!current.products.includes(assignment.orderItem.product.name)) {
        current.products.push(assignment.orderItem.product.name);
      }
    }
  }

  const badgeColor = getOccupancyColor();
  const badgeWidth = 60;
  const badgeHeight = 20;

  // Position badge at top-right of the rack
  const badgeX = width - badgeWidth - 4;
  const badgeY = 4;

  // Varieties text
  const varietiesText = varieties.length > 0
    ? varieties.length <= 2
      ? varieties.join(', ')
      : `${varieties[0]} +${varieties.length - 1}`
    : 'Empty';

  return (
    <Group x={x} y={y} rotation={rotation}>
      {/* Semi-transparent overlay when rack has contents */}
      {totalOccupied > 0 && (
        <Rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill={badgeColor}
          opacity={0.1}
          cornerRadius={4}
          listening={false}
        />
      )}

      {/* Occupancy badge */}
      <Group x={badgeX} y={badgeY}>
        <Rect
          x={0}
          y={0}
          width={badgeWidth}
          height={badgeHeight}
          fill={badgeColor}
          cornerRadius={4}
          opacity={0.9}
        />
        <Text
          x={0}
          y={3}
          width={badgeWidth}
          align="center"
          text={`${totalOccupied}/${totalCapacity}`}
          fontSize={12}
          fontStyle="bold"
          fill="#ffffff"
          listening={false}
        />
      </Group>

      {/* Varieties badge (below occupancy) */}
      {varieties.length > 0 && (
        <Group x={4} y={height - 24}>
          <Rect
            x={0}
            y={0}
            width={width - 8}
            height={20}
            fill="#1e293b"
            cornerRadius={4}
            opacity={0.85}
          />
          <Text
            x={4}
            y={4}
            width={width - 16}
            text={varietiesText}
            fontSize={10}
            fill="#ffffff"
            listening={false}
            ellipsis={true}
          />
        </Group>
      )}

      {/* Level indicators (for larger racks, show level breakdown) */}
      {height > 80 && levels > 1 && (
        <Group x={4} y={28}>
          {Array.from({ length: Math.min(levels, 5) }, (_, i) => {
            const level = i + 1;
            const levelData = levelOccupancy.get(level);
            const levelTrays = levelData?.trays ?? 0;
            const levelFillRatio = levelTrays / traysPerLevel;

            const barWidth = width - 12;
            const barHeight = 8;
            const barY = i * 12;

            return (
              <Group key={level} y={barY}>
                {/* Background bar */}
                <Rect
                  x={0}
                  y={0}
                  width={barWidth}
                  height={barHeight}
                  fill="#e2e8f0"
                  cornerRadius={2}
                  opacity={0.5}
                />
                {/* Fill bar */}
                <Rect
                  x={0}
                  y={0}
                  width={barWidth * levelFillRatio}
                  height={barHeight}
                  fill={levelFillRatio >= 1 ? '#ef4444' : levelFillRatio >= 0.8 ? '#eab308' : '#22c55e'}
                  cornerRadius={2}
                  opacity={0.8}
                />
                {/* Level label */}
                <Text
                  x={2}
                  y={-1}
                  text={`L${level}`}
                  fontSize={7}
                  fill="#475569"
                  listening={false}
                />
              </Group>
            );
          })}
        </Group>
      )}
    </Group>
  );
}
