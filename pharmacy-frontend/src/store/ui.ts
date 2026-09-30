import { create } from 'zustand';

interface UiState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  desktopCollapsed: boolean;
  toggleDesktopCollapsed: () => void;
}

export const useUi = create<UiState>()((set) => ({
  sidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  desktopCollapsed: false,
  toggleDesktopCollapsed: () => set((s) => ({ desktopCollapsed: !s.desktopCollapsed })),
}));
