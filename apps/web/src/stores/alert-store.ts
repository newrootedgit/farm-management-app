import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AlertState {
  // Dismissed alert IDs - persisted to localStorage
  dismissedAlertIds: string[];
  // Timestamp when user last viewed alerts (for "new" badge)
  lastSeenTimestamp: number;

  // Actions
  dismissAlert: (alertId: string) => void;
  dismissMultiple: (alertIds: string[]) => void;
  clearDismissed: () => void;
  removeDismissed: (alertIds: string[]) => void;
  updateLastSeen: () => void;
}

export const useAlertStore = create<AlertState>()(
  persist(
    (set) => ({
      dismissedAlertIds: [],
      lastSeenTimestamp: 0,

      dismissAlert: (alertId) =>
        set((state) => ({
          dismissedAlertIds: state.dismissedAlertIds.includes(alertId)
            ? state.dismissedAlertIds
            : [...state.dismissedAlertIds, alertId],
        })),

      dismissMultiple: (alertIds) =>
        set((state) => ({
          dismissedAlertIds: [
            ...state.dismissedAlertIds,
            ...alertIds.filter((id) => !state.dismissedAlertIds.includes(id)),
          ],
        })),

      clearDismissed: () => set({ dismissedAlertIds: [] }),

      // Remove stale dismissed IDs (for alerts that no longer exist)
      removeDismissed: (alertIds) =>
        set((state) => ({
          dismissedAlertIds: state.dismissedAlertIds.filter(
            (id) => !alertIds.includes(id)
          ),
        })),

      updateLastSeen: () => set({ lastSeenTimestamp: Date.now() }),
    }),
    {
      name: 'alert-storage',
    }
  )
);
