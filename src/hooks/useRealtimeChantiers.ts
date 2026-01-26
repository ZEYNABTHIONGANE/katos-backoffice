import { useState, useEffect } from 'react';
import { chantierService } from '../services/chantierService';
import type { FirebaseChantier } from '../types/chantier';

export const useRealtimeChantiers = () => {
  const [chantiers, setChantiers] = useState<FirebaseChantier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, []);

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