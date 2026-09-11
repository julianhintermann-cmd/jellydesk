import { create } from 'zustand';

interface BackdropState {
  url: string | null;
  setBackdrop: (url: string | null) => void;
}

export const useBackdrop = create<BackdropState>((set) => ({
  url: null,
  setBackdrop: (url) => set({ url }),
}));
