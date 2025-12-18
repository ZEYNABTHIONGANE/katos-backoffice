import { useState, useEffect } from 'react';
import { clientService } from '../services/clientService';
import type { FirebaseClient } from '../types/firebase';

export const useFirebaseClients = () => {
  const [clients, setClients] = useState<FirebaseClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Écouter les changements en temps réel
    const unsubscribe = clientService.subscribeToClients((updatedClients) => {
      setClients(updatedClients);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const addClient = async (clientData: Omit<FirebaseClient, 'id' | 'createdAt'>) => {
    try {
      setError(null);
      await clientService.addClient(clientData);
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'ajout du client');
      return false;
    }
  };

  const updateClient = async (id: string, updates: Partial<Omit<FirebaseClient, 'id' | 'createdAt'>>) => {
    try {
      setError(null);
      await clientService.updateClient(id, updates);
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour du client');
      return false;
    }
  };

  const deleteClient = async (id: string) => {
    try {
      setError(null);
      await clientService.deleteClient(id);
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression du client');
      return false;
    }
  };

  return {
    clients,
    loading,
    error,
    addClient,
    updateClient,
    deleteClient
  };
};