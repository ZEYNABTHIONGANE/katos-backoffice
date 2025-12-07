import { create } from 'zustand';
import { Timestamp } from 'firebase/firestore';
import { clientService } from '../services/clientService';
import type { FirebaseClient } from '../types/firebase';

// Conversion des types pour compatibilité
interface ClientForApp {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  adresse: string;
  localisationSite: string;
  projetAdhere: string;
  status: 'En cours' | 'Terminé' | 'En attente';
  invitationStatus: 'pending' | 'sent' | 'accepted' | 'declined';
  invitationToken?: string;
  userId?: string;
  createdAt: string;
  invitedAt?: string;
  acceptedAt?: string;
}

interface FirebaseClientState {
  clients: ClientForApp[];
  loading: boolean;
  error: string | null;
  addClient: (client: Omit<ClientForApp, 'id' | 'createdAt'>) => Promise<boolean>;
  updateClient: (id: string, updates: Partial<ClientForApp>) => Promise<boolean>;
  deleteClient: (id: string) => Promise<boolean>;
  initializeClients: () => void;
  setClients: (clients: ClientForApp[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

// Fonction pour convertir FirebaseClient vers ClientForApp
const convertFirebaseClient = (firebaseClient: FirebaseClient): ClientForApp => {
  const originalStatus = (firebaseClient as any).status;
  const invitationStatus = firebaseClient.invitationStatus;
  const finalStatus = invitationStatus === 'accepted' ? 'En cours' : (originalStatus || 'En attente');

  console.log(`🔄 Conversion client ${firebaseClient.id}:`, {
    nom: firebaseClient.nom,
    originalStatus,
    invitationStatus,
    finalStatus
  });

  return {
    id: firebaseClient.id!,
    nom: firebaseClient.nom,
    prenom: firebaseClient.prenom,
    email: firebaseClient.email,
    telephone: firebaseClient.telephone || '',
    adresse: firebaseClient.adresse || '',
    localisationSite: firebaseClient.localisationSite,
    projetAdhere: firebaseClient.projetAdhere,
    // Logique métier pour le statut : "En cours" si invitation acceptée, sinon utiliser le statut existant ou "En attente"
    status: finalStatus,
    invitationStatus: firebaseClient.invitationStatus,
    invitationToken: firebaseClient.invitationToken,
    userId: firebaseClient.userId,
    createdAt: firebaseClient.createdAt.toDate().toISOString().split('T')[0],
    invitedAt: firebaseClient.invitedAt?.toDate().toISOString().split('T')[0],
    acceptedAt: firebaseClient.acceptedAt?.toDate().toISOString().split('T')[0]
  };
};

// Fonction pour convertir ClientForApp vers FirebaseClient
const convertToFirebaseClient = (client: Omit<ClientForApp, 'id' | 'createdAt'>): Omit<FirebaseClient, 'id' | 'createdAt'> => {
  console.log('🔄 Conversion vers Firebase:', client);
  const firebaseClient: any = {
    nom: client.nom,
    prenom: client.prenom,
    email: client.email,
    telephone: client.telephone,
    adresse: client.adresse,
    localisationSite: client.localisationSite,
    projetAdhere: client.projetAdhere,
    status: client.status,
    invitationStatus: client.invitationStatus // Maintenant inclus dans les paramètres
  };

  // Ajouter seulement les champs non undefined
  if (client.invitationToken) {
    firebaseClient.invitationToken = client.invitationToken;
  }
  if (client.userId) {
    firebaseClient.userId = client.userId;
  }
  if (client.invitedAt) {
    firebaseClient.invitedAt = Timestamp.fromDate(new Date(client.invitedAt));
  }
  if (client.acceptedAt) {
    firebaseClient.acceptedAt = Timestamp.fromDate(new Date(client.acceptedAt));
  }

  return firebaseClient;
};

// Fonction utilitaire pour corriger manuellement les statuts (pour debug)
export const fixClientStatusesManually = async (): Promise<void> => {
  try {
    const result = await clientService.fixClientStatuses();
    console.log(`Correction manuelle: ${result.updated} clients mis à jour, ${result.errors} erreurs`);
  } catch (error) {
    console.error('Erreur correction manuelle:', error);
  }
};

export const useClientStore = create<FirebaseClientState>((set, get) => ({
  clients: [],
  loading: false,
  error: null,

  addClient: async (clientData) => {
    try {
      set({ loading: true, error: null });
      const firebaseData = convertToFirebaseClient(clientData);
      const clientId = await clientService.addClient(firebaseData);
      console.log('Client ajouté avec succès, ID:', clientId);
      set({ loading: false });
      return true;
    } catch (error: any) {
      console.error('Erreur lors de l\'ajout du client:', error);
      set({
        error: error.message || 'Erreur lors de l\'ajout du client',
        loading: false
      });
      return false;
    }
  },

  updateClient: async (id, updates) => {
    try {
      set({ loading: true, error: null });
      const firebaseUpdates: any = {};

      if (updates.nom) firebaseUpdates.nom = updates.nom;
      if (updates.prenom) firebaseUpdates.prenom = updates.prenom;
      if (updates.email) firebaseUpdates.email = updates.email;
      if (updates.localisationSite) firebaseUpdates.localisationSite = updates.localisationSite;
      if (updates.projetAdhere) firebaseUpdates.projetAdhere = updates.projetAdhere;
      if (updates.status) firebaseUpdates.status = updates.status;
      if (updates.invitationStatus) firebaseUpdates.invitationStatus = updates.invitationStatus;
      if (updates.invitationToken) firebaseUpdates.invitationToken = updates.invitationToken;
      if (updates.userId) firebaseUpdates.userId = updates.userId;

      await clientService.updateClient(id, firebaseUpdates);
      set({ loading: false });
      return true;
    } catch (error: any) {
      set({
        error: error.message || 'Erreur lors de la mise à jour du client',
        loading: false
      });
      return false;
    }
  },

  deleteClient: async (id) => {
    try {
      set({ loading: true, error: null });
      await clientService.deleteClient(id);
      set({ loading: false });
      return true;
    } catch (error: any) {
      set({
        error: error.message || 'Erreur lors de la suppression du client',
        loading: false
      });
      return false;
    }
  },

  initializeClients: () => {
    console.log('Initialisation des clients...');
    set({ loading: true, error: null });

    // Corriger les statuts clients en arrière-plan (ne pas bloquer l'initialisation)
    // TEMPORAIREMENT DÉSACTIVÉ POUR DEBUG
    // clientService.fixClientStatuses()
    //   .then(fixResult => {
    //     if (fixResult.updated > 0) {
    //       console.log(`✅ ${fixResult.updated} statuts clients corrigés`);
    //     }
    //   })
    //   .catch(error => {
    //     console.warn('⚠️ Erreur lors de la correction des statuts clients:', error);
    //   });

    // Écouter les changements en temps réel
    const unsubscribe = clientService.subscribeToClients((firebaseClients) => {
      try {
        console.log('Clients reçus de Firebase:', firebaseClients.length);
        const convertedClients = firebaseClients.map(convertFirebaseClient);
        console.log('Clients convertis:', convertedClients);
        set({
          clients: convertedClients,
          loading: false,
          error: null
        });
      } catch (error) {
        console.error('❌ Erreur lors de la conversion des clients:', error);
        set({
          loading: false,
          error: 'Erreur lors de la conversion des données client'
        });
      }
    });

    // Stocker la fonction de nettoyage pour pouvoir l'appeler plus tard si nécessaire
    (get() as any).unsubscribe = unsubscribe;
  },

  setClients: (clients) => set({ clients }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error })
}));