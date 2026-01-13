import { useState } from 'react';
import type { ElementPreset, ElementType, UpdateElementPreset, CreateElementPreset, UnitSystem } from '@farm/shared';
import { DEFAULT_ELEMENT_COLORS, DEFAULT_ELEMENT_DIMENSIONS } from '@farm/shared';
import { getUnitLabel, fromBaseUnit, toBaseUnit } from '@/lib/units';
import { useEscapeKey } from '@/hooks/useEscapeKey';

const ELEMENT_TYPES: { value: ElementType; label: string }[] = [
  { value: 'GROW_RACK', label: 'Grow Rack' },
  { value: 'TABLE', label: 'Table' },
  { value: 'SINK', label: 'Sink' },
  { value: 'WALKWAY', label: 'Walkway' },
  { value: 'CIRCLE', label: 'Circle' },
  { value: 'CUSTOM', label: 'Custom' },
];

interface PresetManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  presets: ElementPreset[];
  onSelectPreset: (preset: ElementPreset) => void;
  onCreatePreset: (preset: CreateElementPreset) => void;
  onUpdatePreset: (presetId: string, updates: UpdateElementPreset) => void;
  onDeletePreset: (presetId: string) => void;
  unitSystem?: UnitSystem;
}

interface PresetFormData {
  name: string;
  type: ElementType;
  defaultWidth: string;
  defaultHeight: string;
  defaultColor: string;
  levels: string;
  traysPerLevel: string;
}

const INITIAL_FORM: PresetFormData = {
  name: '',
  type: 'GROW_RACK',
  defaultWidth: '',
  defaultHeight: '',
  defaultColor: '#38a169',
  levels: '',
  traysPerLevel: '',
};

export function PresetManagerModal({
  isOpen,
  onClose,
  presets,
  onSelectPreset,
  onCreatePreset,
  onUpdatePreset,
  onDeletePreset,
  unitSystem = 'FEET',
}: PresetManagerModalProps) {
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PresetFormData>(INITIAL_FORM);

  // Close on ESC key
  useEscapeKey(isOpen, onClose);

  const unitLabel = getUnitLabel(unitSystem);

  if (!isOpen) return null;

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setMode('list');
    setEditingId(null);
  };

  const startCreating = () => {
    setForm({
      ...INITIAL_FORM,
      defaultColor: DEFAULT_ELEMENT_COLORS.GROW_RACK,
    });
    setMode('create');
  };

  const startEditing = (preset: ElementPreset) => {
    setEditingId(preset.id);
    setForm({
      name: preset.name,
      type: preset.type,
      defaultWidth: preset.defaultWidth ? fromBaseUnit(preset.defaultWidth, unitSystem).toFixed(1) : '',
      defaultHeight: preset.defaultHeight ? fromBaseUnit(preset.defaultHeight, unitSystem).toFixed(1) : '',
      defaultColor: preset.defaultColor,
      levels: preset.metadata?.levels?.toString() ?? '',
      traysPerLevel: preset.metadata?.traysPerLevel?.toString() ?? '',
    });
    setMode('edit');
  };

  const handleTypeChange = (type: ElementType) => {
    const defaults = type in DEFAULT_ELEMENT_DIMENSIONS
      ? DEFAULT_ELEMENT_DIMENSIONS[type as keyof typeof DEFAULT_ELEMENT_DIMENSIONS]
      : {};
    setForm({
      ...form,
      type,
      defaultColor: DEFAULT_ELEMENT_COLORS[type] || '#666666',
      defaultWidth: 'width' in defaults ? fromBaseUnit((defaults as { width: number }).width, unitSystem).toFixed(1) : '',
      defaultHeight: 'height' in defaults ? fromBaseUnit((defaults as { height: number }).height, unitSystem).toFixed(1) : '',
    });
  };

  const handleCreate = () => {
    const metadata: Record<string, unknown> = {};
    if (form.type === 'GROW_RACK') {
      const levels = form.levels ? parseInt(form.levels) : 1;
      const traysPerLevel = form.traysPerLevel ? parseInt(form.traysPerLevel) : 4;
      metadata.levels = levels;
      metadata.traysPerLevel = traysPerLevel;
      metadata.trayCapacity = levels * traysPerLevel;
    }

    onCreatePreset({
      name: form.name,
      type: form.type,
      defaultWidth: form.defaultWidth ? toBaseUnit(parseFloat(form.defaultWidth), unitSystem) : undefined,
      defaultHeight: form.defaultHeight ? toBaseUnit(parseFloat(form.defaultHeight), unitSystem) : undefined,
      defaultColor: form.defaultColor,
      ...(Object.keys(metadata).length > 0 && { metadata }),
    });
    resetForm();
  };

  const handleUpdate = () => {
    if (!editingId) return;

    const metadata: Record<string, unknown> = {};
    if (form.type === 'GROW_RACK') {
      const levels = form.levels ? parseInt(form.levels) : 1;
      const traysPerLevel = form.traysPerLevel ? parseInt(form.traysPerLevel) : 4;
      metadata.levels = levels;
      metadata.traysPerLevel = traysPerLevel;
      metadata.trayCapacity = levels * traysPerLevel;
    }

    onUpdatePreset(editingId, {
      name: form.name,
      defaultWidth: form.defaultWidth ? toBaseUnit(parseFloat(form.defaultWidth), unitSystem) : undefined,
      defaultHeight: form.defaultHeight ? toBaseUnit(parseFloat(form.defaultHeight), unitSystem) : undefined,
      defaultColor: form.defaultColor,
      ...(Object.keys(metadata).length > 0 && { metadata }),
    });
    resetForm();
  };

  const getTypeLabel = (type: ElementType) => {
    return type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const renderForm = (isEditing: boolean) => (
    <div className="p-6 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g., 4-Level Grow Rack"
            className="w-full px-3 py-2 border rounded-md bg-background"
          />
        </div>

        {!isEditing && (
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={form.type}
              onChange={(e) => handleTypeChange(e.target.value as ElementType)}
              className="w-full px-3 py-2 border rounded-md bg-background"
            >
              {ELEMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Width ({unitLabel})</label>
          <input
            type="number"
            step="0.1"
            value={form.defaultWidth}
            onChange={(e) => setForm({ ...form, defaultWidth: e.target.value })}
            placeholder="Auto"
            className="w-full px-3 py-2 border rounded-md bg-background"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Height ({unitLabel})</label>
          <input
            type="number"
            step="0.1"
            value={form.defaultHeight}
            onChange={(e) => setForm({ ...form, defaultHeight: e.target.value })}
            placeholder="Auto"
            className="w-full px-3 py-2 border rounded-md bg-background"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium mb-1">Color</label>
          <div className="flex gap-2">
            <input
              type="color"
              value={form.defaultColor}
              onChange={(e) => setForm({ ...form, defaultColor: e.target.value })}
              className="w-12 h-10 border rounded cursor-pointer"
            />
            <input
              type="text"
              value={form.defaultColor}
              onChange={(e) => setForm({ ...form, defaultColor: e.target.value })}
              className="flex-1 px-3 py-2 border rounded-md bg-background font-mono text-sm"
            />
          </div>
        </div>

        {/* Grow Rack specific fields */}
        {form.type === 'GROW_RACK' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Levels</label>
              <input
                type="number"
                min="1"
                max="20"
                value={form.levels}
                onChange={(e) => setForm({ ...form, levels: e.target.value })}
                placeholder="1"
                className="w-full px-3 py-2 border rounded-md bg-background"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Trays per Level</label>
              <input
                type="number"
                min="1"
                max="100"
                value={form.traysPerLevel}
                onChange={(e) => setForm({ ...form, traysPerLevel: e.target.value })}
                placeholder="4"
                className="w-full px-3 py-2 border rounded-md bg-background"
              />
            </div>
            {(form.levels || form.traysPerLevel) && (
              <div className="col-span-2 p-3 bg-muted rounded-md">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Capacity:</span>
                  <span className="text-lg font-bold text-primary">
                    {(parseInt(form.levels) || 1) * (parseInt(form.traysPerLevel) || 4)} trays
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <button
          onClick={resetForm}
          className="px-4 py-2 text-sm hover:bg-muted rounded-md transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={isEditing ? handleUpdate : handleCreate}
          disabled={!form.name.trim()}
          className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isEditing ? 'Save Changes' : 'Create Preset'}
        </button>
      </div>
    </div>
  );

  const renderPresetList = () => (
    <>
      <div className="flex-1 overflow-y-auto p-6">
        {presets.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <svg className="h-12 w-12 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-lg font-medium mb-2">No presets yet</p>
            <p className="text-sm mb-4">Create a preset to quickly add elements with predefined settings.</p>
            <button
              onClick={startCreating}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Create Your First Preset
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {presets.map((preset) => (
              <div
                key={preset.id}
                className="border rounded-lg overflow-hidden"
              >
                <div className="flex items-center p-4 hover:bg-muted/30 transition-colors">
                  {/* Color preview */}
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                    style={{ backgroundColor: preset.defaultColor }}
                  >
                    {preset.icon || preset.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 ml-4 min-w-0">
                    <div className="font-medium truncate">{preset.name}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-3">
                      <span>{getTypeLabel(preset.type)}</span>
                      {preset.defaultWidth && preset.defaultHeight && (
                        <>
                          <span className="text-border">•</span>
                          <span>
                            {fromBaseUnit(preset.defaultWidth, unitSystem).toFixed(1)} × {fromBaseUnit(preset.defaultHeight, unitSystem).toFixed(1)} {unitLabel}
                          </span>
                        </>
                      )}
                      {preset.type === 'GROW_RACK' && preset.metadata && 'trayCapacity' in preset.metadata && (
                        <>
                          <span className="text-border">•</span>
                          <span>{String(preset.metadata.trayCapacity)} trays</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => {
                        onSelectPreset(preset);
                        onClose();
                      }}
                      className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                    >
                      Use
                    </button>
                    <button
                      onClick={() => startEditing(preset)}
                      className="px-3 py-1.5 text-sm border hover:bg-muted rounded-md transition-colors"
                      title="Edit preset"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete preset "${preset.name}"?`)) {
                          onDeletePreset(preset.id);
                        }
                      }}
                      className="p-2 hover:bg-destructive/10 text-destructive rounded-md transition-colors"
                      title="Delete preset"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {presets.length > 0 && (
        <div className="px-6 py-4 border-t bg-muted/30">
          <p className="text-sm text-muted-foreground">
            Tip: You can also save elements from the canvas as presets using the properties panel.
          </p>
        </div>
      )}
    </>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => {
          resetForm();
          onClose();
        }}
      />

      {/* Modal */}
      <div className="relative bg-background rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            {mode !== 'list' && (
              <button
                onClick={resetForm}
                className="p-1 hover:bg-muted rounded-md transition-colors"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <h2 className="text-xl font-semibold">
              {mode === 'create' ? 'Create New Preset' : mode === 'edit' ? 'Edit Preset' : 'Saved Presets'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {mode === 'list' && presets.length > 0 && (
              <button
                onClick={startCreating}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Preset
              </button>
            )}
            <button
              onClick={() => {
                resetForm();
                onClose();
              }}
              className="p-2 hover:bg-muted rounded-md transition-colors"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        {mode === 'list' ? renderPresetList() : renderForm(mode === 'edit')}
      </div>
    </div>
  );
}
