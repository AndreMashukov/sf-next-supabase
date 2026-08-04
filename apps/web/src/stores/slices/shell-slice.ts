import type { StateCreator } from 'zustand';
import type { UiStore } from '../ui-store';

export type ShellSlice = {
  sidebarOpen: boolean;
  isMobile: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setIsMobile: (isMobile: boolean) => void;
};

export const createShellSlice: StateCreator<UiStore, [], [], ShellSlice> = (set) => ({
  sidebarOpen: true,
  isMobile: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setIsMobile: (isMobile) =>
    set((state) => ({
      isMobile,
      // Collapse the sidebar when switching into the mobile breakpoint.
      ...(isMobile && state.sidebarOpen ? { sidebarOpen: false } : {}),
    })),
});
