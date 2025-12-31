import { create } from 'zustand';
import type { ElementType, UnitSystem } from '@farm/shared';

// ============================================================================
// TYPES
// ============================================================================

export interface CanvasZone {
  id: string;
  name: string;
  type: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CanvasElement {
  id: string;
  name: string;
  type: ElementType;

  // Line geometry (walls)
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  thickness?: number;

  // Rectangle geometry
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;

  color: string;
  opacity: number;
  presetId?: string;

  // Custom metadata (e.g., tray capacity for grow racks)
  metadata?: {
    levels?: number;
    traysPerLevel?: number;
    trayCapacity?: number;
    [key: string]: unknown;
  };
}

export type CanvasTool = 'select' | 'pan' | 'zone' | 'wall' | 'element';

export type WallDrawMode = 'click_points' | 'direction_length';

interface WallDrawingState {
  mode: WallDrawMode;
  startPoint: { x: number; y: number } | null;
  isDrawing: boolean;
}

interface HistoryState {
  zones: CanvasZone[];
  elements: CanvasElement[];
}

// ============================================================================
// STORE INTERFACE
// ============================================================================

interface CanvasState {
  // Tool state
  activeTool: CanvasTool;
  setActiveTool: (tool: CanvasTool) => void;

  // Active element type for placement
  activeElementType: ElementType | null;
  activePresetId: string | null;
  setActiveElementType: (type: ElementType | null, presetId?: string | null) => void;

  // Selection state (supports multi-select)
  selectedIds: string[];
  selectedType: 'zone' | 'element' | null;
  setSelectedId: (id: string | null, type?: 'zone' | 'element' | null) => void;
  toggleSelection: (id: string, type: 'zone' | 'element') => void;
  addToSelection: (id: string, type: 'zone' | 'element') => void;
  selectElementsInBounds: (bounds: { x: number; y: number; width: number; height: number }) => void;
  clearSelection: () => void;
  deleteSelectedElements: () => void;

  // Canvas view state
  zoom: number;
  setZoom: (zoom: number) => void;
  panOffset: { x: number; y: number };
  setPanOffset: (offset: { x: number; y: number }) => void;

  // Grid settings
  showGrid: boolean;
  toggleGrid: () => void;
  gridSize: number;
  setGridSize: (size: number) => void;
  snapToGrid: boolean;
  toggleSnapToGrid: () => void;

  // Unit system
  unitSystem: UnitSystem;
  setUnitSystem: (unit: UnitSystem) => void;

  // Zones
  zones: CanvasZone[];
  setZones: (zones: CanvasZone[]) => void;
  addZone: (zone: CanvasZone) => void;
  updateZone: (id: string, updates: Partial<CanvasZone>) => void;
  deleteZone: (id: string) => void;

  // Layout Elements
  elements: CanvasElement[];
  setElements: (elements: CanvasElement[]) => void;
  addElement: (element: CanvasElement) => void;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  deleteElement: (id: string) => void;

  // Wall drawing state
  wallDrawing: WallDrawingState;
  setWallDrawMode: (mode: WallDrawMode) => void;
  setWallStartPoint: (point: { x: number; y: number } | null) => void;
  setWallIsDrawing: (isDrawing: boolean) => void;
  resetWallDrawing: () => void;

  // Undo/Redo
  history: HistoryState[];
  historyIndex: number;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Dirty state
  isDirty: boolean;
  setDirty: (dirty: boolean) => void;
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useCanvasStore = create<CanvasState>((set, get) => ({
  // Tool state
  activeTool: 'select',
  setActiveTool: (tool) => {
    set({ activeTool: tool });
    // Reset wall drawing when switching away from wall tool
    if (tool !== 'wall') {
      get().resetWallDrawing();
    }
  },

  // Active element type
  activeElementType: null,
  activePresetId: null,
  setActiveElementType: (type, presetId = null) => {
    set({
      activeElementType: type,
      activePresetId: presetId ?? null,
      activeTool: type === 'WALL' ? 'wall' : type ? 'element' : 'select',
    });
  },

  // Selection (multi-select support)
  selectedIds: [],
  selectedType: null,
  setSelectedId: (id, type = null) => set({
    selectedIds: id ? [id] : [],
    selectedType: type
  }),
  toggleSelection: (id, type) => set((state) => {
    const isSelected = state.selectedIds.includes(id);
    if (isSelected) {
      const newIds = state.selectedIds.filter((i) => i !== id);
      return {
        selectedIds: newIds,
        selectedType: newIds.length > 0 ? type : null
      };
    } else {
      return {
        selectedIds: [...state.selectedIds, id],
        selectedType: type
      };
    }
  }),
  addToSelection: (id, type) => set((state) => {
    if (state.selectedIds.includes(id)) return state;
    return {
      selectedIds: [...state.selectedIds, id],
      selectedType: type
    };
  }),
  selectElementsInBounds: (bounds) => {
    const { elements } = get();
    const selectedIds: string[] = [];

    for (const el of elements) {
      if (el.type === 'WALL') {
        // For walls, check if either endpoint is within bounds
        const startX = el.startX ?? 0;
        const startY = el.startY ?? 0;
        const endX = el.endX ?? 0;
        const endY = el.endY ?? 0;

        const startInBounds =
          startX >= bounds.x && startX <= bounds.x + bounds.width &&
          startY >= bounds.y && startY <= bounds.y + bounds.height;
        const endInBounds =
          endX >= bounds.x && endX <= bounds.x + bounds.width &&
          endY >= bounds.y && endY <= bounds.y + bounds.height;

        if (startInBounds || endInBounds) {
          selectedIds.push(el.id);
        }
      } else {
        // For rectangles, check if the element overlaps with bounds
        const elX = el.x ?? 0;
        const elY = el.y ?? 0;
        const elW = el.width ?? 0;
        const elH = el.height ?? 0;

        const overlaps =
          elX < bounds.x + bounds.width &&
          elX + elW > bounds.x &&
          elY < bounds.y + bounds.height &&
          elY + elH > bounds.y;

        if (overlaps) {
          selectedIds.push(el.id);
        }
      }
    }

    set({ selectedIds, selectedType: selectedIds.length > 0 ? 'element' : null });
  },
  clearSelection: () => set({ selectedIds: [], selectedType: null }),
  deleteSelectedElements: () => {
    const { selectedIds, elements, zones } = get();
    if (selectedIds.length === 0) return;

    get().pushHistory();
    set({
      elements: elements.filter((e) => !selectedIds.includes(e.id)),
      zones: zones.filter((z) => !selectedIds.includes(z.id)),
      selectedIds: [],
      selectedType: null,
      isDirty: true,
    });
  },

  // View
  zoom: 1,
  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(3, zoom)) }),
  panOffset: { x: 0, y: 0 },
  setPanOffset: (offset) => set({ panOffset: offset }),

  // Grid
  showGrid: true,
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
  gridSize: 20,
  setGridSize: (size) => set({ gridSize: size }),
  snapToGrid: true,
  toggleSnapToGrid: () => set((state) => ({ snapToGrid: !state.snapToGrid })),

  // Unit system
  unitSystem: 'FEET',
  setUnitSystem: (unit) => set({ unitSystem: unit }),

  // Zones
  zones: [],
  setZones: (zones) => set({ zones }),
  addZone: (zone) => {
    set((state) => ({
      zones: [...state.zones, zone],
      isDirty: true,
    }));
    get().pushHistory();
  },
  updateZone: (id, updates) => {
    set((state) => ({
      zones: state.zones.map((z) => (z.id === id ? { ...z, ...updates } : z)),
      isDirty: true,
    }));
  },
  deleteZone: (id) => {
    set((state) => {
      const newSelectedIds = state.selectedIds.filter((i) => i !== id);
      return {
        zones: state.zones.filter((z) => z.id !== id),
        selectedIds: newSelectedIds,
        selectedType: newSelectedIds.length > 0 ? state.selectedType : null,
        isDirty: true,
      };
    });
    get().pushHistory();
  },

  // Layout Elements
  elements: [],
  setElements: (elements) => set({ elements }),
  addElement: (element) => {
    set((state) => ({
      elements: [...state.elements, element],
      isDirty: true,
    }));
    get().pushHistory();
  },
  updateElement: (id, updates) => {
    set((state) => ({
      elements: state.elements.map((e) => (e.id === id ? { ...e, ...updates } : e)),
      isDirty: true,
    }));
  },
  deleteElement: (id) => {
    set((state) => {
      const newSelectedIds = state.selectedIds.filter((i) => i !== id);
      return {
        elements: state.elements.filter((e) => e.id !== id),
        selectedIds: newSelectedIds,
        selectedType: newSelectedIds.length > 0 ? state.selectedType : null,
        isDirty: true,
      };
    });
    get().pushHistory();
  },

  // Wall drawing
  wallDrawing: {
    mode: 'click_points',
    startPoint: null,
    isDrawing: false,
  },
  setWallDrawMode: (mode) =>
    set((state) => ({
      wallDrawing: { ...state.wallDrawing, mode },
    })),
  setWallStartPoint: (point) =>
    set((state) => ({
      wallDrawing: { ...state.wallDrawing, startPoint: point },
    })),
  setWallIsDrawing: (isDrawing) =>
    set((state) => ({
      wallDrawing: { ...state.wallDrawing, isDrawing },
    })),
  resetWallDrawing: () =>
    set({
      wallDrawing: {
        mode: 'click_points',
        startPoint: null,
        isDrawing: false,
      },
    }),

  // Undo/Redo
  history: [],
  historyIndex: -1,
  pushHistory: () => {
    const { zones, elements, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({
      zones: [...zones],
      elements: [...elements],
    });
    set({
      history: newHistory.slice(-50), // Keep last 50 states
      historyIndex: newHistory.length - 1,
    });
  },
  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      set({
        zones: [...prevState.zones],
        elements: [...prevState.elements],
        historyIndex: historyIndex - 1,
        isDirty: true,
      });
    }
  },
  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      set({
        zones: [...nextState.zones],
        elements: [...nextState.elements],
        historyIndex: historyIndex + 1,
        isDirty: true,
      });
    }
  },
  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  // Dirty state
  isDirty: false,
  setDirty: (dirty) => set({ isDirty: dirty }),
}));

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Snap coordinates to grid
export function snapToGridValue(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

// Calculate wall length
export function calculateWallLength(element: CanvasElement): number {
  if (
    element.startX == null ||
    element.startY == null ||
    element.endX == null ||
    element.endY == null
  ) {
    return 0;
  }
  const dx = element.endX - element.startX;
  const dy = element.endY - element.startY;
  return Math.sqrt(dx * dx + dy * dy);
}

// Calculate wall angle (in degrees)
export function calculateWallAngle(element: CanvasElement): number {
  if (
    element.startX == null ||
    element.startY == null ||
    element.endX == null ||
    element.endY == null
  ) {
    return 0;
  }
  const dx = element.endX - element.startX;
  const dy = element.endY - element.startY;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

// Generate unique ID
export function generateId(prefix: string = 'el'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Get the first selected ID (for backward compatibility)
export function getSelectedId(state: { selectedIds: string[] }): string | null {
  return state.selectedIds.length > 0 ? state.selectedIds[0] : null;
}
