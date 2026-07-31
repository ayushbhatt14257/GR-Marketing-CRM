import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: 'dark',
      toggle: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark';
        set({ theme: next });
        document.documentElement.classList.toggle('dark', next === 'dark');
      },
      init: () => {
        document.documentElement.classList.toggle('dark', get().theme === 'dark');
      },
    }),
    { name: 'grmc-theme' }
  )
);
