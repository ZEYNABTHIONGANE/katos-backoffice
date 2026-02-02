import { useState, useEffect } from 'react';
import { chantierService } from '../services/chantierService';
<<<<<<< HEAD
=======
import { useAuthStore } from '../store/authStore';
>>>>>>> e232376998e67a699b3bf96313d2dcc4717b2f88
import type { FirebaseChantier } from '../types/chantier';

export const useRealtimeChantiers = () => {
  const [chantiers, setChantiers] = useState<FirebaseChantier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

<<<<<<< HEAD
  useEffect(() => {
=======
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      console.log('⏳ Hook useRealtimeChantiers: En attente d\'authentification...');
      setLoading(false);
      return;
    }

>>>>>>> e232376998e67a699b3bf96313d2dcc4717b2f88
    console.log('🔄 Hook useRealtimeChantiers: Initialisation de l\'écoute temps réel');
    setLoading(true);
    setError(null);

    const unsubscribe = chantierService.subscribeToAllChantiers((chantiersData) => {
      console.log(`📊 Hook useRealtimeChantiers: ${chantiersData.length} chantiers reçus`);
      setChantiers(chantiersData);
      setLoading(false);
      setError(null);
    });

    // Cleanup function
    return () => {
      console.log('🔌 Hook useRealtimeChantiers: Déconnexion');
      unsubscribe();
    };
<<<<<<< HEAD
  }, []);
=======
  }, [isAuthenticated]);
>>>>>>> e232376998e67a699b3bf96313d2dcc4717b2f88

  return {
    chantiers,
    loading,
    error,
    // Statistiques calculées
    totalChantiers: chantiers.length,
    chantiersActifs: chantiers.filter(c => c.status === 'En cours').length,
    chantiersTermines: chantiers.filter(c => c.status === 'Terminé').length,
    chantiersEnRetard: chantiers.filter(c => c.status === 'En retard').length,
    chantiersEnAttente: chantiers.filter(c => c.status === 'En attente').length
  };
};