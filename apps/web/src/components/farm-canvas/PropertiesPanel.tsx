import { useState } from 'react';
import { useCanvasStore, CanvasZone, CanvasElement, calculateWallLength, calculateWallAngle } from '@/stores/canvas-store';
import { fromBaseUnit, toBaseUnit, getUnitLabel, calculateEndpoint } from '@/lib/units';
import type { UnitSystem } from '@farm/shared';

const ZONE_TYPES = ['FIELD', 'GREENHOUSE', 'STORAGE', 'PROCESSING', 'EQUIPMENT', 'OFFICE', 'OTHER'];
const ZONE_COLORS = [
  '#4CAF50', // Green
  '#8BC34A', // Light Green
  '#CDDC39', // Lime
  '#FFC107', // Amber
  '#FF9800', // Orange
  '#795548', // Brown
  '#607D8B', // Blue Grey
  '#9C27B0', // Purple
  '#2196F3', // Blue
  '#00BCD4', // Cyan
];

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
  zone?: CanvasZone | null;
  element?: CanvasElement | null;
  unitSystem?: UnitSystem;
  onSaveAsPreset?: (element: CanvasElement) => void;
}

export function PropertiesPanel({ zone, element, unitSystem = 'FEET', onSaveAsPreset }: PropertiesPanelProps) {
  const { updateZone, deleteZone, updateElement, deleteElement, setSelectedId } = useCanvasStore();

  // No selection
  if (!zone && !element) {
    return (
      <div className="w-64 border-l bg-card p-4">
        <h3 className="font-semibold mb-4">Properties</h3>
        <p className="text-sm text-muted-foreground">
          Select a zone or element to view and edit its properties.
        </p>
      </div>
    );
  }

  // Zone properties
  if (zone) {
    const handleDeleteZone = () => {
      if (confirm(`Delete zone "${zone.name}"?`)) {
        deleteZone(zone.id);
        setSelectedId(null);
      }
    };

    return (
      <div className="w-64 border-l bg-card p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-12rem)]">
        <h3 className="font-semibold">Zone Properties</h3>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            value={zone.name}
            onChange={(e) => updateZone(zone.id, { name: e.target.value })}
            className="w-full px-3 py-2 border rounded-md bg-background text-sm"
          />
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-medium mb-1">Type</label>
          <select
            value={zone.type}
            onChange={(e) => updateZone(zone.id, { type: e.target.value })}
            className="w-full px-3 py-2 border rounded-md bg-background text-sm"
          >
            {ZONE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* Color */}
        <div>
          <label className="block text-sm font-medium mb-1">Color</label>
          <div className="flex flex-wrap gap-2">
            {ZONE_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => updateZone(zone.id, { color })}
                className={`w-6 h-6 rounded border-2 ${
                  zone.color === color ? 'border-foreground' : 'border-transparent'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {/* Dimensions */}
        <div>
          <label className="block text-sm font-medium mb-1">Size</label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Width</label>
              <input
                type="number"
                value={Math.round(zone.width)}
                onChange={(e) => updateZone(zone.id, { width: Number(e.target.value) })}
                className="w-full px-2 py-1 border rounded-md bg-background text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Height</label>
              <input
                type="number"
                value={Math.round(zone.height)}
                onChange={(e) => updateZone(zone.id, { height: Number(e.target.value) })}
                className="w-full px-2 py-1 border rounded-md bg-background text-sm"
              />
            </div>
          </div>
        </div>

        {/* Position */}
        <div>
          <label className="block text-sm font-medium mb-1">Position</label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">X</label>
              <input
                type="number"
                value={Math.round(zone.x)}
                onChange={(e) => updateZone(zone.id, { x: Number(e.target.value) })}
                className="w-full px-2 py-1 border rounded-md bg-background text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Y</label>
              <input
                type="number"
                value={Math.round(zone.y)}
                onChange={(e) => updateZone(zone.id, { y: Number(e.target.value) })}
                className="w-full px-2 py-1 border rounded-md bg-background text-sm"
              />
            </div>
          </div>
        </div>

        {/* Delete */}
        <div className="pt-4 border-t">
          <button
            onClick={handleDeleteZone}
            className="w-full px-4 py-2 border border-destructive text-destructive rounded-md text-sm hover:bg-destructive hover:text-destructive-foreground"
          >
            Delete Zone
          </button>
        </div>
      </div>
    );
  }

  // Element properties
  if (element) {
    const isWall = element.type === 'WALL';
    const wallLength = isWall ? calculateWallLength(element) : 0;
    const wallAngle = isWall ? calculateWallAngle(element) : 0;
    const unit = getUnitLabel(unitSystem);

    // Handle wall length change - recalculate endpoint keeping angle constant
    const handleWallLengthChange = (newLengthInUserUnits: number) => {
      const newLengthInCm = toBaseUnit(newLengthInUserUnits, unitSystem);
      if (newLengthInCm <= 0) return;

      const startX = element.startX ?? 0;
      const startY = element.startY ?? 0;
      const newEnd = calculateEndpoint(startX, startY, wallAngle, newLengthInCm);

      updateElement(element.id, {
        endX: newEnd.x,
        endY: newEnd.y,
      });
    };

    // Handle wall angle change - recalculate endpoint keeping length constant
    const handleWallAngleChange = (newAngle: number) => {
      const startX = element.startX ?? 0;
      const startY = element.startY ?? 0;
      const newEnd = calculateEndpoint(startX, startY, newAngle, wallLength);

      updateElement(element.id, {
        endX: newEnd.x,
        endY: newEnd.y,
      });
    };

    const handleDeleteElement = () => {
      if (confirm(`Delete ${element.type.toLowerCase().replace('_', ' ')} "${element.name}"?`)) {
        deleteElement(element.id);
        setSelectedId(null);
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

        {/* Wall-specific properties */}
        {isWall && (
          <>
            {/* Length - editable */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Length ({unit})
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={fromBaseUnit(wallLength, unitSystem).toFixed(1)}
                onChange={(e) => handleWallLengthChange(Number(e.target.value))}
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
                  value={Math.round(wallAngle)}
                  onChange={(e) => handleWallAngleChange(Number(e.target.value))}
                  className="flex-1"
                />
                <input
                  type="number"
                  min="-180"
                  max="180"
                  value={Math.round(wallAngle)}
                  onChange={(e) => handleWallAngleChange(Number(e.target.value))}
                  className="w-16 px-2 py-1 border rounded-md bg-background text-sm text-right"
                />
                <span className="text-sm">°</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                0° = East, 90° = South, -90° = North
              </div>
            </div>

            {/* Thickness */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Thickness ({unit})
              </label>
              <input
                type="number"
                step="0.1"
                value={fromBaseUnit(element.thickness ?? 10, unitSystem).toFixed(1)}
                onChange={(e) =>
                  updateElement(element.id, {
                    thickness: toBaseUnit(Number(e.target.value), unitSystem),
                  })
                }
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

        {/* Rectangle element properties */}
        {!isWall && (
          <RectangleElementProperties
            element={element}
            defaultUnitSystem={unitSystem}
            updateElement={updateElement}
          />
        )}
        {!isWall && (
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

            {/* Tray Capacity - Grow Rack specific */}
            {element.type === 'GROW_RACK' && (
              <div>
                <label className="block text-sm font-medium mb-1">Tray Capacity</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={element.metadata?.trayCapacity ?? 0}
                  onChange={(e) =>
                    updateElement(element.id, {
                      metadata: {
                        ...element.metadata,
                        trayCapacity: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                  placeholder="Number of trays"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  How many trays can this rack hold?
                </p>
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
        {onSaveAsPreset && !isWall && (
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

  return null;
}
