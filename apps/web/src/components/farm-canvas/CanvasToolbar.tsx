import { useCanvasStore, CanvasTool } from '@/stores/canvas-store';
import { AddElementDropdown } from './AddElementDropdown';
import type { ElementPreset, UnitSystem } from '@farm/shared';

interface ToolButtonProps {
  tool: CanvasTool;
  icon: React.ReactNode;
  label: string;
  shortcut: string;
  description: string;
}

function ToolButton({ tool, icon, label, shortcut, description }: ToolButtonProps) {
  const { activeTool, setActiveTool } = useCanvasStore();
  const isActive = activeTool === tool;

  return (
    <button
      onClick={() => setActiveTool(tool)}
      className={`p-2 rounded-md transition-colors ${
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'hover:bg-muted'
      }`}
      title={`${label} (${shortcut})\n${description}`}
      data-tutorial={`tool-${tool}`}
    >
      {icon}
    </button>
  );
}

interface CanvasToolbarProps {
  onSave?: () => void;
  isSaving?: boolean;
  presets?: ElementPreset[];
  onAddGrowRack?: () => void;
  onManagePresets?: () => void;
  unitSystem?: UnitSystem;
  onUnitChange?: (unit: UnitSystem) => void;
}

export function CanvasToolbar({
  onSave,
  isSaving,
  presets,
  onAddGrowRack,
  onManagePresets,
  unitSystem = 'FEET',
  onUnitChange,
}: CanvasToolbarProps) {
  const {
    showGrid,
    toggleGrid,
    snapToGrid,
    toggleSnapToGrid,
    zoom,
    setZoom,
    setPanOffset,
    undo,
    redo,
    canUndo,
    canRedo,
    isDirty,
  } = useCanvasStore();

  return (
    <div className="flex items-center justify-between border-b bg-card p-2">
      {/* Left: Tools */}
      <div className="flex items-center gap-1">
        <ToolButton
          tool="select"
          label="Select"
          shortcut="S"
          description="Click to select, move, resize, or rotate elements."
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
          }
        />
        <ToolButton
          tool="pan"
          label="Pan"
          shortcut="H"
          description="Click and drag to move around the canvas."
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
            </svg>
          }
        />
        <ToolButton
          tool="measure"
          label="Measure"
          shortcut="M"
          description="Click two elements to measure distance between them."
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          }
        />

        <div className="w-px h-6 bg-border mx-2" />

        {/* Add Element Dropdown */}
        <AddElementDropdown
          presets={presets}
          onAddGrowRack={onAddGrowRack}
          onManagePresets={onManagePresets}
        />

        <div className="w-px h-6 bg-border mx-2" />

        {/* Undo/Redo */}
        <button
          onClick={undo}
          disabled={!canUndo()}
          className="p-2 rounded-md hover:bg-muted disabled:opacity-50"
          title="Undo"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </button>
        <button
          onClick={redo}
          disabled={!canRedo()}
          className="p-2 rounded-md hover:bg-muted disabled:opacity-50"
          title="Redo"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
          </svg>
        </button>
      </div>

      {/* Center: View options */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleGrid}
          className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
            showGrid
              ? 'bg-primary/20 text-primary border border-primary/30'
              : 'hover:bg-muted border border-transparent'
          }`}
          title={showGrid ? 'Grid visible (click to hide)' : 'Grid hidden (click to show)'}
        >
          Grid {showGrid ? '✓' : ''}
        </button>
        <button
          onClick={toggleSnapToGrid}
          className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
            snapToGrid
              ? 'bg-primary/20 text-primary border border-primary/30'
              : 'hover:bg-muted border border-transparent'
          }`}
          title={snapToGrid ? 'Snap to grid enabled (click to disable)' : 'Snap to grid disabled (click to enable)'}
        >
          Snap {snapToGrid ? '✓' : ''}
        </button>

        {/* Unit selector */}
        {onUnitChange && (
          <>
            <div className="w-px h-6 bg-border mx-2" />
            <div
              className="flex rounded-md border overflow-hidden text-sm"
              data-tutorial="unit-toggle"
            >
              <button
                onClick={() => onUnitChange('FEET')}
                className={`px-3 py-1 transition-colors ${
                  unitSystem === 'FEET'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background hover:bg-muted'
                }`}
                title="Use feet"
              >
                ft
              </button>
              <button
                onClick={() => onUnitChange('METERS')}
                className={`px-3 py-1 transition-colors ${
                  unitSystem === 'METERS'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background hover:bg-muted'
                }`}
                title="Use meters"
              >
                m
              </button>
            </div>
          </>
        )}

        <div className="w-px h-6 bg-border mx-2" />

        {/* Zoom controls */}
        <button
          onClick={() => setZoom(zoom - 0.1)}
          className="p-1.5 rounded-md hover:bg-muted"
          title="Zoom Out"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
        <span className="text-sm w-16 text-center">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom(zoom + 0.1)}
          className="p-1.5 rounded-md hover:bg-muted"
          title="Zoom In"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
        <button
          onClick={() => {
            setZoom(1);
            setPanOffset({ x: 0, y: 0 });
          }}
          className="px-2 py-1 rounded-md text-sm hover:bg-muted"
          title="Reset view to center at 100% zoom"
        >
          Center
        </button>
      </div>

      {/* Right: Save */}
      <div className="flex items-center gap-2">
        {isDirty && (
          <span className="text-sm text-muted-foreground">Unsaved changes</span>
        )}
        <button
          onClick={onSave}
          disabled={!isDirty || isSaving}
          className="px-4 py-1.5 bg-primary text-primary-foreground rounded-md text-sm disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Layout'}
        </button>
      </div>
    </div>
  );
}
