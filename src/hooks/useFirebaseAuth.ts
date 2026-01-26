import { useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import { authService } from '../services/authService';
import type { FirebaseUser } from '../types/firebase';

export const useFirebaseAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      setError(null);

      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const data = await authService.getUserData(firebaseUser.uid);
          setUserData(data);
        } catch (err) {
          setError('Erreur lors de la récupération des données utilisateur');
          console.error(err);
        }
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      await authService.signIn(email, password);
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur de connexion');
      setLoading(false);
      return false;
    }
  };

  const signUp = async (
    email: string,
    password: string,
    displayName: string,
    phoneNumber?: string
  ) => {
    try {
      setError(null);
      setLoading(true);
      await authService.signUp(email, password, displayName, phoneNumber);
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création du compte');
      setLoading(false);
      return false;
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      await authService.signOut();
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la déconnexion');
      return false;
    }
  };

  return {
    user,
    userData,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!user
  };
};