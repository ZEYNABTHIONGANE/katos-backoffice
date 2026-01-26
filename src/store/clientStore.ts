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
  isActive: boolean;
  invitationStatus: 'pending' | 'sent' | 'accepted' | 'declined';
  invitationToken?: string;
  userId?: string;
  username?: string;
  tempPassword?: string;
  typePaiement: 'comptant' | 'echeancier';
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
  toggleClientStatus: (client: ClientForApp) => Promise<boolean>;
}

// Fonction pour convertir FirebaseClient vers ClientForApp
const convertFirebaseClient = (firebaseClient: FirebaseClient): ClientForApp => {
  // Gestion sécurisée du statut
  let finalStatus: 'En cours' | 'Terminé' | 'En attente';

  try {
    const originalStatus = firebaseClient.status;
    const invitationStatus = firebaseClient.invitationStatus;

    // Logique métier: Si invitation acceptée -> En cours, sinon utiliser le statut existant ou défaut
    if (invitationStatus === 'accepted') {
      finalStatus = 'En cours';
    } else {
      finalStatus = originalStatus || 'En attente';
    }

    console.log(`🔄 Conversion client ${firebaseClient.id}:`, {
      nom: firebaseClient.nom,
      originalStatus,
      invitationStatus,
      finalStatus
    });
  } catch (error) {
    console.error(`❌ Erreur conversion client ${firebaseClient.id}:`, error);
    finalStatus = 'En attente'; // Valeur par défaut sécurisée
  }

  try {
    return {
      id: firebaseClient.id!,
      nom: firebaseClient.nom || '',
      prenom: firebaseClient.prenom || '',
      email: firebaseClient.email || '',
      telephone: firebaseClient.telephone || '',
      adresse: firebaseClient.adresse || '',
      localisationSite: firebaseClient.localisationSite || '',
      projetAdhere: firebaseClient.projetAdhere || '',
      status: finalStatus,
      isActive: firebaseClient.isActive !== false, // Default to true if undefined
      invitationStatus: firebaseClient.invitationStatus || 'pending',
      invitationToken: firebaseClient.invitationToken || undefined,
      userId: firebaseClient.userId || undefined,
      username: firebaseClient.username || undefined,
      tempPassword: firebaseClient.tempPassword || undefined,
      typePaiement: firebaseClient.typePaiement || 'comptant',
      createdAt: firebaseClient.createdAt?.toDate?.()?.toISOString?.()?.split?.('T')?.[0] || new Date().toISOString().split('T')[0],
      invitedAt: firebaseClient.invitedAt?.toDate?.()?.toISOString?.()?.split?.('T')?.[0] || undefined,
      acceptedAt: firebaseClient.acceptedAt?.toDate?.()?.toISOString?.()?.split?.('T')?.[0] || undefined
    };
  } catch (error) {
    console.error(`❌ Erreur lors de la conversion finale du client ${firebaseClient.id}:`, error);
    // Retourner un objet minimal valide en cas d'erreur
    return {
      id: firebaseClient.id || 'unknown',
      nom: firebaseClient.nom || 'Inconnu',
      prenom: firebaseClient.prenom || '',
      email: firebaseClient.email || '',
      telephone: '',
      adresse: '',
      localisationSite: '',
      projetAdhere: '',
      status: 'En attente' as const,
      isActive: true,
      invitationStatus: 'pending' as const,
      invitationToken: undefined,
      userId: undefined,
      username: undefined,
      tempPassword: undefined,
      typePaiement: 'comptant' as const,
      createdAt: new Date().toISOString().split('T')[0],
      invitedAt: undefined,
      acceptedAt: undefined
    };
  }
};

// Fonction pour convertir ClientForApp vers FirebaseClient
const convertToFirebaseClient = (client: Omit<ClientForApp, 'id' | 'createdAt'>): Omit<FirebaseClient, 'id' | 'createdAt'> => {
  console.log('🔄 Conversion vers Firebase:', client);

  try {
    const firebaseClient: any = {
      nom: client.nom || '',
      prenom: client.prenom || '',
      email: client.email || '',
      telephone: client.telephone || '',
      adresse: client.adresse || '',
      localisationSite: client.localisationSite || '',
      projetAdhere: client.projetAdhere || '',
      status: client.status || 'En attente',
      isActive: client.isActive !== undefined ? client.isActive : true,
      invitationStatus: client.invitationStatus || 'pending',
      typePaiement: client.typePaiement || 'comptant'
    };

    // Ajouter seulement les champs non undefined
    if (client.invitationToken) {
      firebaseClient.invitationToken = client.invitationToken;
    }
    if (client.userId) {
      firebaseClient.userId = client.userId;
    }
    if (client.username) {
      firebaseClient.username = client.username;
    }
    if (client.tempPassword) {
      firebaseClient.tempPassword = client.tempPassword;
    }
    if (client.invitedAt) {
      firebaseClient.invitedAt = Timestamp.fromDate(new Date(client.invitedAt));
    }
    if (client.acceptedAt) {
      firebaseClient.acceptedAt = Timestamp.fromDate(new Date(client.acceptedAt));
    }

    console.log('✅ Conversion vers Firebase réussie:', firebaseClient);
    return firebaseClient;

  } catch (error) {
    console.error('❌ Erreur lors de la conversion vers Firebase:', error);
    // Retourner un objet minimal valide
    return {
      nom: client.nom || '',
      prenom: client.prenom || '',
      email: client.email || '',
      telephone: client.telephone || '',
      adresse: client.adresse || '',
      localisationSite: client.localisationSite || '',
      projetAdhere: client.projetAdhere || '',
      status: 'En attente' as const,
      isActive: true,
      invitationStatus: 'pending' as const,
      typePaiement: 'comptant' as const
    };
  }
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
      if (updates.telephone) firebaseUpdates.telephone = updates.telephone;
      if (updates.adresse) firebaseUpdates.adresse = updates.adresse;
      if (updates.localisationSite) firebaseUpdates.localisationSite = updates.localisationSite;
      if (updates.projetAdhere) firebaseUpdates.projetAdhere = updates.projetAdhere;
      if (updates.status) firebaseUpdates.status = updates.status;
      if (updates.isActive !== undefined) firebaseUpdates.isActive = updates.isActive;
      if (updates.invitationStatus) firebaseUpdates.invitationStatus = updates.invitationStatus;
      if (updates.invitationToken) firebaseUpdates.invitationToken = updates.invitationToken;
      if (updates.userId) firebaseUpdates.userId = updates.userId;
      if (updates.username) firebaseUpdates.username = updates.username;
      if (updates.tempPassword) firebaseUpdates.tempPassword = updates.tempPassword;
      if (updates.typePaiement) firebaseUpdates.typePaiement = updates.typePaiement;

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

  toggleClientStatus: async (client) => {
    try {
      set({ loading: true, error: null });
      const newStatus = !client.isActive;
      await clientService.updateClient(client.id, { isActive: newStatus });
      console.log(`Client ${client.id} status toggled to ${newStatus}`);
      set({ loading: false });
      return true;
    } catch (error: any) {
      console.error('Erreur lors du changement de statut:', error);
      set({
        error: error.message || 'Erreur lors du changement de statut',
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