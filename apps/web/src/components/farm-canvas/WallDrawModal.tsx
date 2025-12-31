import { useState } from 'react';
import { useCanvasStore, generateId, CanvasElement } from '@/stores/canvas-store';
import { toBaseUnit, getUnitLabel, calculateEndpoint, getDirectionAngle } from '@/lib/units';
import { DEFAULT_ELEMENT_COLORS, DEFAULT_ELEMENT_DIMENSIONS } from '@farm/shared';
import type { UnitSystem } from '@farm/shared';

type Direction = 'N' | 'S' | 'E' | 'W';

interface WallDrawModalProps {
  isOpen: boolean;
  startPoint: { x: number; y: number };
  unitSystem: UnitSystem;
  onClose: () => void;
  onWallCreated?: (element: CanvasElement) => void;
}

export function WallDrawModal({
  isOpen,
  startPoint,
  unitSystem,
  onClose,
  onWallCreated,
}: WallDrawModalProps) {
  const [mode, setMode] = useState<'direction' | 'angle'>('direction');
  const [direction, setDirection] = useState<Direction>('E');
  const [angle, setAngle] = useState(0);
  const [length, setLength] = useState('');
  const [thickness, setThickness] = useState('0.3');

  const { addElement, setSelectedId, elements, resetWallDrawing } = useCanvasStore();

  if (!isOpen) return null;

  const unit = getUnitLabel(unitSystem);

  const handleCreate = () => {
    const lengthValue = parseFloat(length);
    const thicknessValue = parseFloat(thickness);

    if (isNaN(lengthValue) || lengthValue <= 0) {
      alert('Please enter a valid length');
      return;
    }

    // Convert length to base units (cm)
    const lengthInCm = toBaseUnit(lengthValue, unitSystem);
    const thicknessInCm = toBaseUnit(thicknessValue, unitSystem);

    // Calculate end point
    const angleInDegrees = mode === 'direction' ? getDirectionAngle(direction) : angle;
    const endPoint = calculateEndpoint(startPoint.x, startPoint.y, angleInDegrees, lengthInCm);

    const newWall: CanvasElement = {
      id: generateId('wall'),
      name: `Wall ${elements.filter((el) => el.type === 'WALL').length + 1}`,
      type: 'WALL',
      startX: startPoint.x,
      startY: startPoint.y,
      endX: endPoint.x,
      endY: endPoint.y,
      thickness: thicknessInCm || DEFAULT_ELEMENT_DIMENSIONS.WALL.thickness,
      color: DEFAULT_ELEMENT_COLORS.WALL,
      opacity: 1,
    };

    addElement(newWall);
    setSelectedId(newWall.id, 'element');
    resetWallDrawing();
    onWallCreated?.(newWall);
    onClose();
  };

  const handleClose = () => {
    resetWallDrawing();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-lg shadow-xl w-96 max-w-[90vw]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-semibold">Draw Wall</h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-muted rounded"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Start point info */}
          <div className="text-sm text-muted-foreground">
            Starting from point ({Math.round(startPoint.x)}, {Math.round(startPoint.y)})
          </div>

          {/* Mode toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setMode('direction')}
              className={`flex-1 px-3 py-2 rounded-md text-sm ${
                mode === 'direction' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
              }`}
            >
              By Direction
            </button>
            <button
              onClick={() => setMode('angle')}
              className={`flex-1 px-3 py-2 rounded-md text-sm ${
                mode === 'angle' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
              }`}
            >
              By Angle
            </button>
          </div>

          {/* Direction mode */}
          {mode === 'direction' && (
            <div>
              <label className="block text-sm font-medium mb-2">Direction</label>
              <div className="grid grid-cols-3 gap-2">
                <div />
                <button
                  onClick={() => setDirection('N')}
                  className={`p-3 rounded-md text-center ${
                    direction === 'N' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                  }`}
                >
                  <span className="text-lg">↑</span>
                  <div className="text-xs">North</div>
                </button>
                <div />
                <button
                  onClick={() => setDirection('W')}
                  className={`p-3 rounded-md text-center ${
                    direction === 'W' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                  }`}
                >
                  <span className="text-lg">←</span>
                  <div className="text-xs">West</div>
                </button>
                <div className="flex items-center justify-center text-2xl text-muted-foreground">
                  •
                </div>
                <button
                  onClick={() => setDirection('E')}
                  className={`p-3 rounded-md text-center ${
                    direction === 'E' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                  }`}
                >
                  <span className="text-lg">→</span>
                  <div className="text-xs">East</div>
                </button>
                <div />
                <button
                  onClick={() => setDirection('S')}
                  className={`p-3 rounded-md text-center ${
                    direction === 'S' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                  }`}
                >
                  <span className="text-lg">↓</span>
                  <div className="text-xs">South</div>
                </button>
                <div />
              </div>
            </div>
          )}

          {/* Angle mode */}
          {mode === 'angle' && (
            <div>
              <label className="block text-sm font-medium mb-2">Angle (degrees)</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={angle}
                  onChange={(e) => setAngle(Number(e.target.value))}
                  className="flex-1"
                />
                <input
                  type="number"
                  min="0"
                  max="360"
                  value={angle}
                  onChange={(e) => setAngle(Number(e.target.value))}
                  className="w-20 px-2 py-1 border rounded-md bg-background text-sm"
                />
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                0° = East, 90° = South, 180° = West, 270° = North
              </div>
            </div>
          )}

          {/* Length */}
          <div>
            <label className="block text-sm font-medium mb-2">Length ({unit})</label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={length}
              onChange={(e) => setLength(e.target.value)}
              placeholder={`e.g., 10 ${unit}`}
              className="w-full px-3 py-2 border rounded-md bg-background text-sm"
              autoFocus
            />
          </div>

          {/* Thickness */}
          <div>
            <label className="block text-sm font-medium mb-2">Thickness ({unit})</label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={thickness}
              onChange={(e) => setThickness(e.target.value)}
              className="w-full px-3 py-2 border rounded-md bg-background text-sm"
            />
          </div>

          {/* Preview info */}
          {length && parseFloat(length) > 0 && (
            <div className="p-3 bg-muted rounded-md text-sm">
              <div className="font-medium mb-1">Preview</div>
              <div className="text-muted-foreground">
                Wall going {mode === 'direction' ? direction : `${angle}°`} for {length} {unit}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm rounded-md hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!length || parseFloat(length) <= 0}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md disabled:opacity-50"
          >
            Create Wall
          </button>
        </div>
      </div>
    </div>
  );
}
