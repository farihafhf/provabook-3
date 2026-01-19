import { create } from 'zustand';

interface NavigationState {
  activeContext: 'foreign' | 'local' | null;
  setActiveContext: (context: 'foreign' | 'local' | null) => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  activeContext: null,
  setActiveContext: (context) => set({ activeContext: context }),
}));
