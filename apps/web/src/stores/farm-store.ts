import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FarmState {
  currentFarmId: string | null;
  setCurrentFarm: (farmId: string | null) => void;
}

export const useFarmStore = create<FarmState>()(
  persist(
    (set) => ({
      currentFarmId: null,
      setCurrentFarm: (farmId) => set({ currentFarmId: farmId }),
    }),
    {
      name: 'farm-storage',
    }
  )
);

// UI state store
interface UIState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
