import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import { authService } from '../services/authService';
import { useAuthStore } from '../store/authStore';

export const useAuthInit = () => {
  const { setUser, setUserData, setLoading } = useAuthStore();

  useEffect(() => {
    setLoading(true);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          // Utilisateur connecté - récupérer ses données
          const userData = await authService.getUserData(user.uid);
          setUser(user);
          setUserData(userData);
        } else {
          // Utilisateur déconnecté
          setUser(null);
          setUserData(null);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des données utilisateur:', error);
        setUser(null);
        setUserData(null);
      } finally {
        setLoading(false);
      }
    });

    // Cleanup function
    return () => unsubscribe();
  }, [setUser, setUserData, setLoading]);
};