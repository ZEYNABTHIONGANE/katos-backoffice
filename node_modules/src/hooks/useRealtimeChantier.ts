import { useState, useEffect } from 'react';
import { chantierService } from '../services/chantierService';
import type { FirebaseChantier } from '../types/chantier';

export const useRealtimeChantier = (chantierId: string | null) => {
  const [chantier, setChantier] = useState<FirebaseChantier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chantierId) {
      setChantier(null);
      setLoading(false);
      setError(null);
      return;
    }

    console.log(`🔄 Hook useRealtimeChantier: Écoute du chantier ${chantierId}`);
    setLoading(true);
    setError(null);

    const unsubscribe = chantierService.subscribeToChantier(chantierId, (chantierData) => {
      console.log(`📊 Hook useRealtimeChantier: Chantier ${chantierId} mis à jour`, chantierData?.name);
      setChantier(chantierData);
      setLoading(false);
      setError(chantierData === null ? 'Chantier non trouvé' : null);
    });

    // Cleanup function
    return () => {
      console.log(`🔌 Hook useRealtimeChantier: Déconnexion du chantier ${chantierId}`);
      unsubscribe();
    };
  }, [chantierId]);

  return {
    chantier,
    loading,
    error,
    // Données calculées
    hasChantier: !!chantier,
    globalProgress: chantier?.globalProgress || 0,
    status: chantier?.status || 'En attente',
    phasesActives: chantier?.phases?.filter(phase => phase.status === 'in-progress') || [],
    phasesTerminees: chantier?.phases?.filter(phase => phase.status === 'completed') || [],
    totalPhases: chantier?.phases?.length || 0,
    totalEquipe: chantier?.team?.length || 0,
    totalPhotos: chantier?.gallery?.length || 0,
    totalUpdates: chantier?.updates?.length || 0
  };
};