import { create } from 'zustand';

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

export type CanvasTool = 'select' | 'pan' | 'zone' | 'machine';

interface CanvasState {
  // Tool state
  activeTool: CanvasTool;
  setActiveTool: (tool: CanvasTool) => void;

  // Selection state
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;

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

  // Zones (local state for editing)
  zones: CanvasZone[];
  setZones: (zones: CanvasZone[]) => void;
  addZone: (zone: CanvasZone) => void;
  updateZone: (id: string, updates: Partial<CanvasZone>) => void;
  deleteZone: (id: string) => void;

  // Undo/Redo
  history: CanvasZone[][];
  historyIndex: number;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Dirty state (unsaved changes)
  isDirty: boolean;
  setDirty: (dirty: boolean) => void;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  // Tool state
  activeTool: 'select',
  setActiveTool: (tool) => set({ activeTool: tool }),

  // Selection
  selectedId: null,
  setSelectedId: (id) => set({ selectedId: id }),

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

  // Zones
  zones: [],
  setZones: (zones) => set({ zones, isDirty: false }),
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
    set((state) => ({
      zones: state.zones.filter((z) => z.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
      isDirty: true,
    }));
    get().pushHistory();
  },

  // Undo/Redo
  history: [],
  historyIndex: -1,
  pushHistory: () => {
    const { zones, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...zones]);
    set({
      history: newHistory.slice(-50), // Keep last 50 states
      historyIndex: newHistory.length - 1,
    });
  },
  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      set({
        zones: [...history[historyIndex - 1]],
        historyIndex: historyIndex - 1,
        isDirty: true,
      });
    }
  },
  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      set({
        zones: [...history[historyIndex + 1]],
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

// Helper to snap coordinates to grid
export function snapToGridValue(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}
