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

export type CanvasTool = 'select' | 'pan' | 'zone' | 'wall' | 'element' | 'measure';

export type WallDrawMode = 'click_points' | 'direction_length';

interface WallDrawingState {
  mode: WallDrawMode;
  startPoint: { x: number; y: number } | null;
  isDrawing: boolean;
}

interface WalkwayDrawingState {
  startPoint: { x: number; y: number } | null;
  isDrawing: boolean;
}

interface MeasurePoint {
  elementId: string;
  clickPoint: { x: number; y: number };
}

interface MeasureState {
  points: [MeasurePoint, MeasurePoint] | [MeasurePoint] | [];
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

  // Walkway drawing state
  walkwayDrawing: WalkwayDrawingState;
  setWalkwayStartPoint: (point: { x: number; y: number } | null) => void;
  setWalkwayIsDrawing: (isDrawing: boolean) => void;
  resetWalkwayDrawing: () => void;

  // Measure tool state
  measureState: MeasureState;
  addMeasurePoint: (elementId: string, clickPoint: { x: number; y: number }) => void;
  clearMeasure: () => void;

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
    // Reset walkway drawing when switching tools
    if (tool !== 'element') {
      get().resetWalkwayDrawing();
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
      if (el.type === 'WALL' || (el.type === 'WALKWAY' && el.startX !== undefined)) {
        // For walls and line-based walkways, check if any portion intersects the bounds
        const startX = el.startX ?? 0;
        const startY = el.startY ?? 0;
        const endX = el.endX ?? 0;
        const endY = el.endY ?? 0;

        if (lineIntersectsRect(
          startX, startY, endX, endY,
          bounds.x, bounds.y, bounds.width, bounds.height
        )) {
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

  // Walkway drawing
  walkwayDrawing: {
    startPoint: null,
    isDrawing: false,
  },
  setWalkwayStartPoint: (point) =>
    set((state) => ({
      walkwayDrawing: { ...state.walkwayDrawing, startPoint: point },
    })),
  setWalkwayIsDrawing: (isDrawing) =>
    set((state) => ({
      walkwayDrawing: { ...state.walkwayDrawing, isDrawing },
    })),
  resetWalkwayDrawing: () =>
    set({
      walkwayDrawing: {
        startPoint: null,
        isDrawing: false,
      },
    }),

  // Measure tool state
  measureState: {
    points: [],
  },
  addMeasurePoint: (elementId, clickPoint) => {
    const { measureState } = get();
    const newPoint: MeasurePoint = { elementId, clickPoint };
    if (measureState.points.length === 0) {
      set({ measureState: { points: [newPoint] } });
    } else if (measureState.points.length === 1) {
      // Allow measuring on the same element (different points)
      set({ measureState: { points: [measureState.points[0], newPoint] } });
    } else {
      // Reset and start with this point
      set({ measureState: { points: [newPoint] } });
    }
  },
  clearMeasure: () => set({ measureState: { points: [] } }),

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

// ============================================================================
// LINE-RECTANGLE INTERSECTION HELPERS
// ============================================================================

// Check if a line segment intersects a rectangle
function lineIntersectsRect(
  x1: number, y1: number, x2: number, y2: number,  // line segment
  rx: number, ry: number, rw: number, rh: number   // rectangle
): boolean {
  // Check if either endpoint is inside rectangle
  const p1Inside = x1 >= rx && x1 <= rx + rw && y1 >= ry && y1 <= ry + rh;
  const p2Inside = x2 >= rx && x2 <= rx + rw && y2 >= ry && y2 <= ry + rh;
  if (p1Inside || p2Inside) return true;

  // Check if line crosses any of the 4 rectangle edges
  const edges: [number, number, number, number][] = [
    [rx, ry, rx + rw, ry],           // top
    [rx, ry + rh, rx + rw, ry + rh], // bottom
    [rx, ry, rx, ry + rh],           // left
    [rx + rw, ry, rx + rw, ry + rh]  // right
  ];

  return edges.some(([ex1, ey1, ex2, ey2]) =>
    linesIntersect(x1, y1, x2, y2, ex1, ey1, ex2, ey2)
  );
}

// Line-line intersection test using cross products
function linesIntersect(
  x1: number, y1: number, x2: number, y2: number,
  x3: number, y3: number, x4: number, y4: number
): boolean {
  const d1 = direction(x3, y3, x4, y4, x1, y1);
  const d2 = direction(x3, y3, x4, y4, x2, y2);
  const d3 = direction(x1, y1, x2, y2, x3, y3);
  const d4 = direction(x1, y1, x2, y2, x4, y4);

  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }

  // Check collinear cases
  if (d1 === 0 && onSegment(x3, y3, x4, y4, x1, y1)) return true;
  if (d2 === 0 && onSegment(x3, y3, x4, y4, x2, y2)) return true;
  if (d3 === 0 && onSegment(x1, y1, x2, y2, x3, y3)) return true;
  if (d4 === 0 && onSegment(x1, y1, x2, y2, x4, y4)) return true;

  return false;
}

function direction(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): number {
  return (x3 - x1) * (y2 - y1) - (y3 - y1) * (x2 - x1);
}

function onSegment(x1: number, y1: number, x2: number, y2: number, x: number, y: number): boolean {
  return Math.min(x1, x2) <= x && x <= Math.max(x1, x2) &&
         Math.min(y1, y2) <= y && y <= Math.max(y1, y2);
}
