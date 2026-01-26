import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services/authService';

export const AuthListener: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { setUser, setUserData, setLoading } = useAuthStore();

  useEffect(() => {
    setLoading(true);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const userData = await authService.getUserData(firebaseUser.uid);

          // Vérifier si l'utilisateur est bloqué
          if (userData && userData.isBlocked) {
            // Déconnecter l'utilisateur bloqué
            await authService.signOut();
            return;
          }

          setUserData(userData);
        } catch (error) {
          console.error('Erreur lors de la récupération des données utilisateur:', error);
        }
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setUserData, setLoading]);

  return <>{children}</>;
};