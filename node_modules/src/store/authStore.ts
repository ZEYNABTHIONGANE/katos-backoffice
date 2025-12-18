import { create } from 'zustand';
import type { User } from 'firebase/auth';
import type { FirebaseUser } from '../types/firebase';
import { authService } from '../services/authService';

interface FirebaseAuthState {
  user: User | null;
  userData: FirebaseUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<boolean>;
  setUser: (user: User | null) => void;
  setUserData: (userData: FirebaseUser | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<FirebaseAuthState>((set, get) => ({
  user: null,
  userData: null,
  isAuthenticated: false,
  loading: true,
  error: null,

  login: async (email: string, password: string) => {
    try {
      set({ loading: true, error: null });
      const user = await authService.signIn(email, password);
      const userData = await authService.getUserData(user.uid);
      set({
        user,
        userData,
        isAuthenticated: true,
        loading: false
      });
      return true;
    } catch (error: any) {
      set({
        error: error.message || 'Erreur de connexion',
        loading: false
      });
      return false;
    }
  },

  logout: async () => {
    try {
      await authService.signOut();
      set({
        user: null,
        userData: null,
        isAuthenticated: false,
        error: null
      });
      return true;
    } catch (error: any) {
      set({ error: error.message || 'Erreur lors de la déconnexion' });
      return false;
    }
  },

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setUserData: (userData) => {
    // Vérifier si l'utilisateur est bloqué
    if (userData && userData.isBlocked) {
      // Déconnecter automatiquement si bloqué
      authService.signOut();
      set({
        user: null,
        userData: null,
        isAuthenticated: false,
        error: 'Votre compte a été bloqué. Veuillez vous reconnecter.'
      });
      return;
    }
    set({ userData });
  },
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error })
}));