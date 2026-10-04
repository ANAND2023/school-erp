import { create } from 'zustand';

export const useUiStore = create((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  snackbar: {
    open: false,
    message: '',
    severity: 'info',
  },
  showSnackbar: (message, severity = 'info') =>
    set({
      snackbar: {
        open: true,
        message,
        severity,
      },
    }),
  closeSnackbar: () =>
    set((state) => ({
      snackbar: {
        ...state.snackbar,
        open: false,
      },
    })),
}));
