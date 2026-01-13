import { useState, useEffect } from 'react';
import { useCanvasStore, generateId, type CanvasElement } from '@/stores/canvas-store';
import { toBaseUnit, fromBaseUnit, getUnitLabel } from '@/lib/units';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import type { UnitSystem } from '@farm/shared';
import { DEFAULT_ELEMENT_COLORS } from '@farm/shared';

interface GrowRackModalProps {
  isOpen: boolean;
  onClose: () => void;
  unitSystem: UnitSystem;
  editingElement?: CanvasElement | null;
  position?: { x: number; y: number };
}

interface GrowRackFormData {
  name: string;
  width: string;
  length: string;
  levels: string;
  traysPerLevel: string;
  color: string;
}

const DEFAULT_COLORS = [
  '#38a169', // Green (default)
  '#3182ce', // Blue
  '#805ad5', // Purple
  '#d69e2e', // Yellow
  '#319795', // Teal
  '#e53e3e', // Red
  '#ed64a6', // Pink
  '#4a5568', // Gray
];

export function GrowRackModal({
  isOpen,
  onClose,
  unitSystem,
  editingElement,
  position,
}: GrowRackModalProps) {
  const { addElement, updateElement, setSelectedId } = useCanvasStore();
  const unitLabel = getUnitLabel(unitSystem);

  // Close on ESC key
  useEscapeKey(isOpen, onClose);

  const [formData, setFormData] = useState<GrowRackFormData>({
    name: '',
    width: '2',
    length: '4',
    levels: '1',
    traysPerLevel: '4',
    color: DEFAULT_ELEMENT_COLORS.GROW_RACK || '#38a169',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof GrowRackFormData, string>>>({});

  // Reset form when opening or when editing element changes
  useEffect(() => {
    if (isOpen) {
      if (editingElement) {
        // Populate form with existing element data
        setFormData({
          name: editingElement.name,
          width: fromBaseUnit(editingElement.width ?? 60, unitSystem).toFixed(1),
          length: fromBaseUnit(editingElement.height ?? 120, unitSystem).toFixed(1),
          levels: String(editingElement.metadata?.levels ?? 1),
          traysPerLevel: String(editingElement.metadata?.traysPerLevel ?? 4),
          color: editingElement.color,
        });
      } else {
        // Reset to defaults for new element
        const elements = useCanvasStore.getState().elements;
        const rackCount = elements.filter((e) => e.type === 'GROW_RACK').length;
        setFormData({
          name: `Grow Rack ${rackCount + 1}`,
          width: '2',
          length: '4',
          levels: '1',
          traysPerLevel: '4',
          color: DEFAULT_ELEMENT_COLORS.GROW_RACK || '#38a169',
        });
      }
      setErrors({});
    }
  }, [isOpen, editingElement, unitSystem]);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof GrowRackFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    const width = parseFloat(formData.width);
    if (isNaN(width) || width <= 0) {
      newErrors.width = 'Must be greater than 0';
    }

    const length = parseFloat(formData.length);
    if (isNaN(length) || length <= 0) {
      newErrors.length = 'Must be greater than 0';
    }

    const levels = parseInt(formData.levels);
    if (isNaN(levels) || levels < 1 || levels > 20) {
      newErrors.levels = 'Must be 1-20';
    }

    const traysPerLevel = parseInt(formData.traysPerLevel);
    if (isNaN(traysPerLevel) || traysPerLevel < 1 || traysPerLevel > 100) {
      newErrors.traysPerLevel = 'Must be 1-100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const width = toBaseUnit(parseFloat(formData.width), unitSystem);
    const height = toBaseUnit(parseFloat(formData.length), unitSystem);
    const levels = parseInt(formData.levels);
    const traysPerLevel = parseInt(formData.traysPerLevel);
    const totalCapacity = levels * traysPerLevel;

    if (editingElement) {
      // Update existing element
      updateElement(editingElement.id, {
        name: formData.name.trim(),
        width,
        height,
        color: formData.color,
        metadata: {
          ...editingElement.metadata,
          levels,
          traysPerLevel,
          trayCapacity: totalCapacity,
        },
      });
    } else {
      // Create new element
      const newElement: CanvasElement = {
        id: generateId('rack'),
        name: formData.name.trim(),
        type: 'GROW_RACK',
        x: position?.x ?? 100,
        y: position?.y ?? 100,
        width,
        height,
        rotation: 0,
        color: formData.color,
        opacity: 1,
        metadata: {
          levels,
          traysPerLevel,
          trayCapacity: totalCapacity,
        },
      };
      addElement(newElement);
      setSelectedId(newElement.id, 'element');
    }

    onClose();
  };

  const totalCapacity =
    (parseInt(formData.levels) || 0) * (parseInt(formData.traysPerLevel) || 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background border rounded-lg shadow-lg w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">
            {editingElement ? 'Edit Grow Rack' : 'Add Grow Rack'}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md bg-background ${
                errors.name ? 'border-destructive' : ''
              }`}
              placeholder="e.g., Rack A1, Main Shelving"
            />
            {errors.name && (
              <p className="text-xs text-destructive mt-1">{errors.name}</p>
            )}
          </div>

          {/* Dimensions */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Dimensions ({unitLabel})
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Width</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={formData.width}
                  onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md bg-background ${
                    errors.width ? 'border-destructive' : ''
                  }`}
                />
                {errors.width && (
                  <p className="text-xs text-destructive mt-1">{errors.width}</p>
                )}
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Length</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={formData.length}
                  onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md bg-background ${
                    errors.length ? 'border-destructive' : ''
                  }`}
                />
                {errors.length && (
                  <p className="text-xs text-destructive mt-1">{errors.length}</p>
                )}
              </div>
            </div>
          </div>

          {/* Levels and Trays */}
          <div>
            <label className="block text-sm font-medium mb-1">Capacity</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Number of Levels</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={formData.levels}
                  onChange={(e) => setFormData({ ...formData, levels: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md bg-background ${
                    errors.levels ? 'border-destructive' : ''
                  }`}
                />
                {errors.levels && (
                  <p className="text-xs text-destructive mt-1">{errors.levels}</p>
                )}
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Trays per Level</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.traysPerLevel}
                  onChange={(e) => setFormData({ ...formData, traysPerLevel: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md bg-background ${
                    errors.traysPerLevel ? 'border-destructive' : ''
                  }`}
                />
                {errors.traysPerLevel && (
                  <p className="text-xs text-destructive mt-1">{errors.traysPerLevel}</p>
                )}
              </div>
            </div>
            {/* Total Capacity Display */}
            <div className="mt-2 p-3 bg-muted rounded-md">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Tray Capacity:</span>
                <span className="text-lg font-bold text-primary">{totalCapacity} trays</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formData.levels} level{parseInt(formData.levels) !== 1 ? 's' : ''} × {formData.traysPerLevel} trays
              </p>
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium mb-1">Color</label>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-8 h-8 rounded-md border-2 transition-transform hover:scale-110 ${
                    formData.color === color ? 'border-foreground ring-2 ring-primary' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-md hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              {editingElement ? 'Save Changes' : 'Add Grow Rack'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
