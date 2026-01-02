import { useState, useRef, useEffect } from 'react';
import { useCanvasStore } from '@/stores/canvas-store';
import type { ElementType, ElementPreset } from '@farm/shared';
import { DEFAULT_ELEMENT_COLORS } from '@farm/shared';

interface AddElementDropdownProps {
  presets?: ElementPreset[];
  onAddGrowRack?: () => void;
  onManagePresets?: () => void;
}

const BUILT_IN_ELEMENTS: Array<{
  type: ElementType;
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    type: 'GROW_RACK',
    label: 'Grow Rack',
    description: 'Multi-tier growing rack',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5h16M4 5v14M20 5v14M4 9h16M4 13h16M4 17h16M8 5v14M16 5v14" />
      </svg>
    ),
  },
  {
    type: 'WALL',
    label: 'Wall',
    description: 'Draw walls by clicking points',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    ),
  },
  {
    type: 'DOOR',
    label: 'Door',
    description: 'Door with swing direction arc',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h3v16H4zM7 4h4a2 2 0 012 2v12a2 2 0 01-2 2H7" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 12a5 5 0 005-5" strokeDasharray="3 3" />
      </svg>
    ),
  },
  {
    type: 'WALKWAY',
    label: 'Walkway',
    description: 'Walking path between elements',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
  },
  {
    type: 'TABLE',
    label: 'Table',
    description: 'Work table or surface',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 6v10a2 2 0 002 2h12a2 2 0 002-2V6M4 6l2-4h12l2 4M10 18v4M14 18v4M6 22h12" />
      </svg>
    ),
  },
  {
    type: 'SINK',
    label: 'Sink',
    description: 'Utility sink or water source',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
  },
  {
    type: 'CIRCLE',
    label: 'Circle/Tank',
    description: 'Round element (water tank, barrel)',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <circle cx="12" cy="12" r="9" strokeWidth={2} />
      </svg>
    ),
  },
];

export function AddElementDropdown({
  presets = [],
  onAddGrowRack,
  onManagePresets,
}: AddElementDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { setActiveElementType, activeElementType, activePresetId } = useCanvasStore();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectElement = (type: ElementType, presetId?: string) => {
    // For grow racks, open the modal instead of direct placement
    if (type === 'GROW_RACK' && onAddGrowRack && !presetId) {
      onAddGrowRack();
      setIsOpen(false);
      return;
    }
    setActiveElementType(type, presetId ?? null);
    setIsOpen(false);
  };

  const hasActiveElement = activeElementType !== null;

  return (
    <div className="relative" ref={dropdownRef} data-tutorial="add-element">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
          hasActiveElement
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary hover:bg-secondary/80'
        }`}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Element
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-popover border rounded-md shadow-lg z-50 max-h-[70vh] overflow-y-auto">
          {/* Built-in elements */}
          <div className="p-2">
            <div className="text-xs font-medium text-muted-foreground px-2 py-1">
              Standard Elements
            </div>
            {BUILT_IN_ELEMENTS.map((element) => (
              <button
                key={element.type}
                onClick={() => handleSelectElement(element.type)}
                className={`w-full flex items-center gap-3 px-2 py-2 rounded-md text-left transition-colors ${
                  activeElementType === element.type && !activePresetId
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted'
                }`}
              >
                <div
                  className="p-1.5 rounded"
                  style={{ backgroundColor: (DEFAULT_ELEMENT_COLORS[element.type as keyof typeof DEFAULT_ELEMENT_COLORS] || '#666666') + '20' }}
                >
                  {element.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{element.label}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {element.description}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Saved Presets button */}
          <div className="border-t" />
          <div className="p-2">
            <button
              onClick={() => {
                setIsOpen(false);
                onManagePresets?.();
              }}
              className="w-full flex items-center gap-3 px-2 py-2 rounded-md text-left hover:bg-muted transition-colors"
            >
              <div className="p-1.5 rounded bg-muted">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">Saved Presets</div>
                <div className="text-xs text-muted-foreground">
                  {presets.length > 0 ? `${presets.length} preset${presets.length === 1 ? '' : 's'} saved` : 'Manage your custom presets'}
                </div>
              </div>
              <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Cancel selection */}
          {hasActiveElement && (
            <>
              <div className="border-t" />
              <div className="p-2">
                <button
                  onClick={() => {
                    setActiveElementType(null);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-2 py-2 rounded-md text-left hover:bg-destructive/10 text-destructive transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  <div className="font-medium text-sm">Cancel Element Placement</div>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
