import { create } from 'zustand';
import type { User } from 'firebase/auth';
import type { FirebaseUser } from '../types/firebase';
import { authService } from '../services/authService';
import { Timestamp } from 'firebase/firestore';

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
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
}


export const useAuthStore = create<FirebaseAuthState>((set, get) => ({
  user: null,
  userData: null,
  isAuthenticated: false,
  loading: true,
  error: null,

  resetPassword: async (email: string) => {
    try {
      set({ loading: true, error: null });
      const result = await authService.resetPassword(email);
      set({ loading: false });
      return result;
    } catch (error: any) {
      set({
        error: error.message || 'Erreur inconnue',
        loading: false
      });
      return { success: false, error: error.message };
    }
  },

  login: async (email: string, password: string) => {
    try {
      set({ loading: true, error: null });
      const user = await authService.signIn(email, password);
      // Récupérer les données utilisateur et convertir les Timestamps si nécessaire
      // Note: authService.getUserData retourne FirebaseUser avec Timestamp
      // Si le store attend des dates en string, il faudrait convertir ici.
      // Mais FirebaseUser a été défini avec Timestamp dans src/types/firebase.ts
      // Vérifions si le composant attend des strings.
      // Pour l'instant, on garde Timestamp comme défini dans l'interface.
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
    // Note: isBlocked est optionnel sur FirebaseUser
    if (userData && userData.isBlocked) {
      // Déconnecter automatiquement si bloqué
      // Appel asynchrone sans await car dans un setter sync
      authService.signOut().then(() => {
        set({
          user: null,
          userData: null,
          isAuthenticated: false,
          error: 'Votre compte a été bloqué. Veuillez vous reconnecter.'
        });
      });
      return;
    }
    set({ userData });
  },
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error })
}));