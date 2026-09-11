import { create } from 'zustand';

export interface AppearanceState {
  systemTransparency: boolean;
  userReducedTransparency: boolean;
  setSystemTransparency: (value: boolean) => void;
  setUserReducedTransparency: (value: boolean) => void;
}

export const useAppearance = create<AppearanceState>((set) => ({
  systemTransparency: true,
  userReducedTransparency: false,
  setSystemTransparency: (value) => set({ systemTransparency: value }),
  setUserReducedTransparency: (value) => set({ userReducedTransparency: value }),
}));

export const selectReducedTransparency = (s: AppearanceState): boolean =>
  s.userReducedTransparency || !s.systemTransparency;
