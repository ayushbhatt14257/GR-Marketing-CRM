import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      updateUser: (patch) => set((state) => ({ user: { ...state.user, ...patch } })),
      logout: () => set({ token: null, user: null }),
    }),
    { name: 'grmc-auth' }
  )
);
