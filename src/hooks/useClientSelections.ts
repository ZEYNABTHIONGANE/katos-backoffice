import { useState, useEffect } from 'react';
import { clientSelectionService } from '../services/clientSelectionService';
import { clientService } from '../services/clientService';
import type { ClientSelection } from '../types';

export const useClientSelections = () => {
  const [clientSelections, setClientSelections] = useState<ClientSelection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const setupRealtimeSubscription = () => {
      try {
        unsubscribe = clientSelectionService.subscribeToClientSelections(async (selections) => {
          // Enrich selections with client names
          const enrichedSelections = await Promise.all(
            selections.map(async (selection) => {
              try {
                console.log('Enriching selection for clientId:', selection.clientId);

                // Get all clients first
                const clients = await clientService.getClients();
                console.log('All clients:', clients.map(c => ({ id: c.id, userId: c.userId, email: c.email, nom: c.nom, prenom: c.prenom })));

                // Find client by userId
                let client = clients.find(c => c.userId === selection.clientId);
                console.log('Client found by userId:', client);

                // If not found by userId, try to find by email
                if (!client) {
                  console.log('No client found by userId, trying to find user by UID and then client by email...');
                  // In a real scenario, you'd need to get user data from Firebase Auth
                  // For now, let's try to find the client by any available data
                  client = clients.find(c => c.id === selection.clientId);
                  console.log('Client found by id:', client);
                }

                const clientName = client ? `${client.prenom} ${client.nom}` : `Client ${selection.clientId.substring(0, 8)}...`;
                console.log('Final client name:', clientName);

                return {
                  ...selection,
                  clientName
                };
              } catch (error) {
                console.error('Error enriching selection with client name:', error);
                return {
                  ...selection,
                  clientName: `Client ${selection.clientId.substring(0, 8)}...`
                };
              }
            })
          );

          setClientSelections(enrichedSelections);
          setLoading(false);
          setError(null);
        });
      } catch (err) {
        console.error('Error setting up client selections subscription:', err);
        setError('Erreur lors du chargement des sélections clients');
        setLoading(false);
      }
    };

    setupRealtimeSubscription();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const updateSelectionStatus = async (
    selectionId: string,
    status: ClientSelection['status'],
    notes?: string
  ) => {
    try {
      // For now, we'll use a placeholder user ID. In a real app, this would come from auth context
      await clientSelectionService.updateSelectionStatus(selectionId, status, 'admin', notes);
    } catch (error) {
      console.error('Error updating selection status:', error);
      throw new Error('Erreur lors de la mise à jour du statut');
    }
  };

  return {
    clientSelections,
    loading,
    error,
    updateSelectionStatus
  };
};