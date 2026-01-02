import { useState, useEffect } from 'react';
import { useCanvasStore, CanvasElement, calculateWallLength, calculateWallAngle } from '@/stores/canvas-store';
import { fromBaseUnit, toBaseUnit, getUnitLabel, calculateEndpoint } from '@/lib/units';
import type { UnitSystem } from '@farm/shared';

// Editable number input that only commits on blur/enter
function EditableNumberInput({
  value,
  onChange,
  min,
  step = 0.1,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  step?: number;
  className?: string;
}) {
  const [localValue, setLocalValue] = useState(value.toFixed(1));
  const [isFocused, setIsFocused] = useState(false);

  // Update local value when prop changes (but not while editing)
  useEffect(() => {
    if (!isFocused) {
      setLocalValue(value.toFixed(1));
    }
  }, [value, isFocused]);

  const handleCommit = () => {
    const num = parseFloat(localValue);
    if (!isNaN(num) && (min === undefined || num >= min)) {
      onChange(num);
    } else {
      // Reset to current value if invalid
      setLocalValue(value.toFixed(1));
    }
    setIsFocused(false);
  };

  return (
    <input
      type="number"
      step={step}
      min={min}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onFocus={() => setIsFocused(true)}
      onBlur={handleCommit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          handleCommit();
          (e.target as HTMLInputElement).blur();
        }
      }}
      className={className}
    />
  );
}

const ELEMENT_COLORS = [
  '#4a5568', // Gray (walls)
  '#3182ce', // Blue (sinks)
  '#805ad5', // Purple (tables)
  '#38a169', // Green (grow racks)
  '#e53e3e', // Red
  '#d69e2e', // Yellow
  '#319795', // Teal
  '#ed64a6', // Pink
];

// Rectangle element size properties with unit toggle
function RectangleElementProperties({
  element,
  defaultUnitSystem,
  updateElement,
}: {
  element: CanvasElement;
  defaultUnitSystem: UnitSystem;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
}) {
  const [displayUnit, setDisplayUnit] = useState<UnitSystem>(defaultUnitSystem);
  const unitLabel = getUnitLabel(displayUnit);

  return (
  <div>
    <div className="flex items-center justify-between mb-1">
      <label className="text-sm font-medium">Size</label>
      <div className="flex rounded-md border overflow-hidden text-xs">
        <button
          onClick={() => setDisplayUnit('FEET')}
          className={`px-2 py-0.5 transition-colors ${
            displayUnit === 'FEET'
              ? 'bg-primary text-primary-foreground'
              : 'bg-background hover:bg-muted'
          }`}
        >
          ft
        </button>
        <button
          onClick={() => setDisplayUnit('METERS')}
          className={`px-2 py-0.5 transition-colors ${
            displayUnit === 'METERS'
              ? 'bg-primary text-primary-foreground'
              : 'bg-background hover:bg-muted'
          }`}
        >
          m
        </button>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-2">
      <div>
        <label className="text-xs text-muted-foreground">Width ({unitLabel})</label>
        <input
          type="number"
          step="0.1"
          min="0.1"
          value={fromBaseUnit(element.width ?? 100, displayUnit).toFixed(1)}
          onChange={(e) =>
            updateElement(element.id, {
              width: toBaseUnit(Number(e.target.value), displayUnit),
            })
          }
          className="w-full px-2 py-1 border rounded-md bg-background text-sm"
        />
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Length ({unitLabel})</label>
        <input
          type="number"
          step="0.1"
          min="0.1"
          value={fromBaseUnit(element.height ?? 60, displayUnit).toFixed(1)}
          onChange={(e) =>
            updateElement(element.id, {
              height: toBaseUnit(Number(e.target.value), displayUnit),
            })
          }
          className="w-full px-2 py-1 border rounded-md bg-background text-sm"
        />
      </div>
    </div>
  </div>
  );
}

interface PropertiesPanelProps {
  element?: CanvasElement | null;
  selectedElements?: CanvasElement[];
  unitSystem?: UnitSystem;
  onSaveAsPreset?: (element: CanvasElement) => void;
  onEditGrowRack?: (element: CanvasElement) => void;
}

export function PropertiesPanel({ element, selectedElements = [], unitSystem = 'FEET', onSaveAsPreset, onEditGrowRack }: PropertiesPanelProps) {
  const { updateElement, deleteElement, clearSelection, deleteSelectedElements } = useCanvasStore();

  // Multiple selection
  if (selectedElements.length > 1) {
    return (
      <div className="w-64 border-l bg-card p-4 space-y-4">
        <h3 className="font-semibold">Multiple Selection</h3>
        <p className="text-sm text-muted-foreground">
          {selectedElements.length} elements selected
        </p>

        <div className="text-xs space-y-1">
          {selectedElements.map((el) => (
            <div key={el.id} className="flex items-center gap-2 p-1 rounded bg-muted">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: el.color }}
              />
              <span className="truncate">{el.name}</span>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t space-y-2">
          <button
            onClick={() => clearSelection()}
            className="w-full px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-md text-sm"
          >
            Clear Selection
          </button>
          <button
            onClick={() => {
              if (confirm(`Delete ${selectedElements.length} elements?`)) {
                deleteSelectedElements();
              }
            }}
            className="w-full px-4 py-2 border border-destructive text-destructive rounded-md text-sm hover:bg-destructive hover:text-destructive-foreground"
          >
            Delete All ({selectedElements.length})
          </button>
        </div>
      </div>
    );
  }

  // No selection
  if (!element) {
  return (
    <div className="w-64 border-l bg-card p-4">
      <h3 className="font-semibold mb-4">Properties</h3>
      <p className="text-sm text-muted-foreground">
        Select an element to view and edit its properties.
      </p>
      <p className="text-xs text-muted-foreground mt-2">
        Tip: Hold Shift or Cmd to select multiple elements, or drag to create a selection box.
      </p>
    </div>
  );
  }

  const isWall = element.type === 'WALL';
  // Line-based walkways also use wall-style properties (startX/startY/endX/endY/thickness)
  const isLineBasedWalkway = element.type === 'WALKWAY' && element.startX !== undefined;
  const isLineElement = isWall || isLineBasedWalkway;
  const lineLength = isLineElement ? calculateWallLength(element) : 0;
  const lineAngle = isLineElement ? calculateWallAngle(element) : 0;
  const unit = getUnitLabel(unitSystem);

  // Handle line element length change - recalculate endpoint keeping angle constant
  const handleLineLengthChange = (newLengthInUserUnits: number) => {
    const newLengthInCm = toBaseUnit(newLengthInUserUnits, unitSystem);
    if (newLengthInCm <= 0) return;

    const startX = element.startX ?? 0;
    const startY = element.startY ?? 0;
    const newEnd = calculateEndpoint(startX, startY, lineAngle, newLengthInCm);

    updateElement(element.id, {
      endX: newEnd.x,
      endY: newEnd.y,
    });
  };

  // Handle line element angle change - recalculate endpoint keeping length constant
  const handleLineAngleChange = (newAngle: number) => {
    const startX = element.startX ?? 0;
    const startY = element.startY ?? 0;
    const newEnd = calculateEndpoint(startX, startY, newAngle, lineLength);

    updateElement(element.id, {
      endX: newEnd.x,
      endY: newEnd.y,
    });
  };

  const handleDeleteElement = () => {
    if (confirm(`Delete ${element.type.toLowerCase().replace('_', ' ')} "${element.name}"?`)) {
      deleteElement(element.id);
      clearSelection();
    }
  };

  return (
    <div className="w-64 border-l bg-card p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-12rem)]">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">
          {element.type.replace('_', ' ')} Properties
        </h3>
        <span className="text-xs px-2 py-1 bg-secondary rounded">
          {element.type}
        </span>
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium mb-1">Name</label>
        <input
          type="text"
          value={element.name}
          onChange={(e) => updateElement(element.id, { name: e.target.value })}
          className="w-full px-3 py-2 border rounded-md bg-background text-sm"
        />
      </div>

      {/* Line element properties (walls and line-based walkways) */}
      {isLineElement && (
        <>
          {/* Length - editable */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Length ({unit})
            </label>
            <EditableNumberInput
              value={fromBaseUnit(lineLength, unitSystem)}
              onChange={handleLineLengthChange}
              min={0.1}
              className="w-full px-3 py-2 border rounded-md bg-background text-sm"
            />
          </div>

          {/* Angle */}
          <div>
            <label className="block text-sm font-medium mb-1">Angle</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="-180"
                max="180"
                value={Math.round(lineAngle)}
                onChange={(e) => handleLineAngleChange(Number(e.target.value))}
                className="flex-1"
              />
              <input
                type="number"
                min="-180"
                max="180"
                value={Math.round(lineAngle)}
                onChange={(e) => handleLineAngleChange(Number(e.target.value))}
                className="w-16 px-2 py-1 border rounded-md bg-background text-sm text-right"
              />
              <span className="text-sm">°</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              0° = East, 90° = South, -90° = North
            </div>
          </div>

          {/* Thickness/Width */}
          <div>
            <label className="block text-sm font-medium mb-1">
              {isLineBasedWalkway ? 'Width' : 'Thickness'} ({unit})
            </label>
            <EditableNumberInput
              value={fromBaseUnit(element.thickness ?? (isLineBasedWalkway ? 90 : 10), unitSystem)}
              onChange={(val) =>
                updateElement(element.id, {
                  thickness: toBaseUnit(val, unitSystem),
                })
              }
              min={0.1}
              className="w-full px-3 py-2 border rounded-md bg-background text-sm"
            />
          </div>

          {/* Start/End positions - collapsed by default */}
          <div>
            <label className="block text-sm font-medium mb-1">Start Point</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">X</label>
                <input
                  type="number"
                  value={Math.round(element.startX ?? 0)}
                  onChange={(e) =>
                    updateElement(element.id, { startX: Number(e.target.value) })
                  }
                  className="w-full px-2 py-1 border rounded-md bg-background text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Y</label>
                <input
                  type="number"
                  value={Math.round(element.startY ?? 0)}
                  onChange={(e) =>
                    updateElement(element.id, { startY: Number(e.target.value) })
                  }
                  className="w-full px-2 py-1 border rounded-md bg-background text-sm"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">End Point</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">X</label>
                <input
                  type="number"
                  value={Math.round(element.endX ?? 0)}
                  onChange={(e) =>
                    updateElement(element.id, { endX: Number(e.target.value) })
                  }
                  className="w-full px-2 py-1 border rounded-md bg-background text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Y</label>
                <input
                  type="number"
                  value={Math.round(element.endY ?? 0)}
                  onChange={(e) =>
                    updateElement(element.id, { endY: Number(e.target.value) })
                  }
                  className="w-full px-2 py-1 border rounded-md bg-background text-sm"
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Rectangle element properties (not for walls or line-based walkways) */}
      {!isLineElement && (
        <RectangleElementProperties
          element={element}
          defaultUnitSystem={unitSystem}
          updateElement={updateElement}
        />
      )}
      {!isLineElement && (
        <>

          {/* Position */}
          <div>
            <label className="block text-sm font-medium mb-1">Position</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">X</label>
                <input
                  type="number"
                  value={Math.round(element.x ?? 0)}
                  onChange={(e) =>
                    updateElement(element.id, { x: Number(e.target.value) })
                  }
                  className="w-full px-2 py-1 border rounded-md bg-background text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Y</label>
                <input
                  type="number"
                  value={Math.round(element.y ?? 0)}
                  onChange={(e) =>
                    updateElement(element.id, { y: Number(e.target.value) })
                  }
                  className="w-full px-2 py-1 border rounded-md bg-background text-sm"
                />
              </div>
            </div>
          </div>

          {/* Rotation */}
          <div>
            <label className="block text-sm font-medium mb-1">Rotation</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="360"
                value={element.rotation ?? 0}
                onChange={(e) =>
                  updateElement(element.id, { rotation: Number(e.target.value) })
                }
                className="flex-1"
              />
              <input
                type="number"
                min="0"
                max="360"
                value={Math.round(element.rotation ?? 0)}
                onChange={(e) =>
                  updateElement(element.id, { rotation: Number(e.target.value) % 360 })
                }
                className="w-14 px-1 py-0.5 border rounded-md bg-background text-sm text-right"
              />
              <span className="text-sm">°</span>
            </div>
          </div>

          {/* Door specific properties */}
          {element.type === 'DOOR' && (
            <div className="space-y-3 p-3 bg-muted/50 rounded-md">
              <label className="block text-sm font-medium">Door Swing</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Hinge Side</label>
                  <select
                    value={(element.metadata?.swingDirection as string) ?? 'left'}
                    onChange={(e) =>
                      updateElement(element.id, {
                        metadata: { ...element.metadata, swingDirection: e.target.value },
                      })
                    }
                    className="w-full px-2 py-1.5 border rounded-md bg-background text-sm"
                  >
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Swing Direction</label>
                  <select
                    value={(element.metadata?.swingAngle as string) ?? 'in'}
                    onChange={(e) =>
                      updateElement(element.id, {
                        metadata: { ...element.metadata, swingAngle: e.target.value },
                      })
                    }
                    className="w-full px-2 py-1.5 border rounded-md bg-background text-sm"
                  >
                    <option value="in">Inward</option>
                    <option value="out">Outward</option>
                  </select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Position door against a wall and rotate to align.
              </p>
            </div>
          )}

          {/* Grow Rack specific properties */}
          {element.type === 'GROW_RACK' && (
            <div className="space-y-3">
              {/* Edit in modal button */}
              {onEditGrowRack && (
                <button
                  onClick={() => onEditGrowRack(element)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-secondary hover:bg-secondary/80 rounded-md text-sm transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Grow Rack
                </button>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Rack Configuration</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Levels</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={element.metadata?.levels ?? 1}
                      onChange={(e) => {
                        const levels = Number(e.target.value);
                        const traysPerLevel = element.metadata?.traysPerLevel ?? 4;
                        updateElement(element.id, {
                          metadata: {
                            ...element.metadata,
                            levels,
                            trayCapacity: levels * traysPerLevel,
                          },
                        });
                      }}
                      className="w-full px-2 py-1 border rounded-md bg-background text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Trays/Level</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={element.metadata?.traysPerLevel ?? 4}
                      onChange={(e) => {
                        const traysPerLevel = Number(e.target.value);
                        const levels = element.metadata?.levels ?? 1;
                        updateElement(element.id, {
                          metadata: {
                            ...element.metadata,
                            traysPerLevel,
                            trayCapacity: levels * traysPerLevel,
                          },
                        });
                      }}
                      className="w-full px-2 py-1 border rounded-md bg-background text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Total Capacity Display */}
              <div className="p-3 bg-muted rounded-md">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Capacity:</span>
                  <span className="text-lg font-bold text-primary">
                    {element.metadata?.trayCapacity ??
                      (element.metadata?.levels ?? 1) * (element.metadata?.traysPerLevel ?? 4)} trays
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Color */}
      <div>
        <label className="block text-sm font-medium mb-1">Color</label>
        <div className="flex flex-wrap gap-2">
          {ELEMENT_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => updateElement(element.id, { color })}
              className={`w-6 h-6 rounded border-2 ${
                element.color === color ? 'border-foreground' : 'border-transparent'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <input
          type="color"
          value={element.color}
          onChange={(e) => updateElement(element.id, { color: e.target.value })}
          className="w-full h-8 mt-2 cursor-pointer"
        />
      </div>

      {/* Opacity */}
      <div>
        <label className="block text-sm font-medium mb-1">Opacity</label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            value={element.opacity}
            onChange={(e) =>
              updateElement(element.id, { opacity: Number(e.target.value) })
            }
            className="flex-1"
          />
          <span className="text-sm w-12 text-right">
            {Math.round(element.opacity * 100)}%
          </span>
        </div>
      </div>

      {/* Save as Preset - for reusable elements */}
      {onSaveAsPreset && !isLineElement && (
        <div className="pt-4 border-t">
          <button
            onClick={() => onSaveAsPreset(element)}
            className="w-full px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-md text-sm transition-colors flex items-center justify-center gap-2"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            Save as Preset
          </button>
          <p className="text-xs text-muted-foreground mt-1 text-center">
            Reuse this configuration for future elements
          </p>
        </div>
      )}

      {/* Delete */}
      <div className="pt-4 border-t">
        <button
          onClick={handleDeleteElement}
          className="w-full px-4 py-2 border border-destructive text-destructive rounded-md text-sm hover:bg-destructive hover:text-destructive-foreground"
        >
          Delete {element.type.replace('_', ' ')}
        </button>
      </div>
    </div>
  );
}
