import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name: string;
}

interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  darkMode: boolean;

  // Actions
  login: (user: User) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  setDarkMode: (enabled: boolean) => void;
  toggleDarkMode: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      darkMode: false,

      login: (user) => {
        set({ user, isAuthenticated: true });
      },

      logout: () => {
        set({ user: null, isAuthenticated: false });
        // Clear farm selection on logout
        localStorage.removeItem('farm-storage');
      },

      updateUser: (updates) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, ...updates } });
        }
      },

      setDarkMode: (enabled) => {
        set({ darkMode: enabled });
        // Apply dark mode class to document
        if (enabled) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },

      toggleDarkMode: () => {
        const newValue = !get().darkMode;
        get().setDarkMode(newValue);
      },
    }),
    {
      name: 'user-storage',
      onRehydrateStorage: () => (state) => {
        // Apply dark mode on app load
        if (state?.darkMode) {
          document.documentElement.classList.add('dark');
        }
      },
    }
  )
);
