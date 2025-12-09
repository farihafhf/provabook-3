import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  department?: string;
  phone?: string;
  profilePictureUrl?: string | null;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  setAuth: (user: User, token: string) => void;
  updateUser: (user: Partial<User>) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      setAuth: (user, token) => {
        localStorage.setItem('access_token', token);
        set({ user, accessToken: token });
      },
      updateUser: (userData) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, ...userData } });
        }
      },
      logout: () => {
        localStorage.removeItem('access_token');
        set({ user: null, accessToken: null });
      },
      isAuthenticated: () => {
        return !!get().accessToken;
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
