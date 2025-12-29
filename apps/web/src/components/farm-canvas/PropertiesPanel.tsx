import { useCanvasStore, CanvasZone } from '@/stores/canvas-store';

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

interface PropertiesPanelProps {
  zone: CanvasZone | null;
}

export function PropertiesPanel({ zone }: PropertiesPanelProps) {
  const { updateZone, deleteZone, setSelectedId } = useCanvasStore();

  if (!zone) {
    return (
      <div className="w-64 border-l bg-card p-4">
        <h3 className="font-semibold mb-4">Properties</h3>
        <p className="text-sm text-muted-foreground">
          Select a zone to view and edit its properties, or draw a new zone using the toolbar.
        </p>
      </div>
    );
  }

  const handleDelete = () => {
    if (confirm(`Delete zone "${zone.name}"?`)) {
      deleteZone(zone.id);
      setSelectedId(null);
    }
  };

  return (
    <div className="w-64 border-l bg-card p-4 space-y-4">
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
          onClick={handleDelete}
          className="w-full px-4 py-2 border border-destructive text-destructive rounded-md text-sm hover:bg-destructive hover:text-destructive-foreground"
        >
          Delete Zone
        </button>
      </div>
    </div>
  );
}
