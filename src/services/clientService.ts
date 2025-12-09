import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { FirebaseClient } from '../types/firebase';

export class ClientService {
  private collectionName = 'clients';

  // Tester la connexion Firestore
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔍 Test de connexion Firestore...');
      const clientRef = collection(db, this.collectionName);
      const q = query(clientRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      console.log('✅ Connexion Firestore OK - ' + snapshot.docs.length + ' documents trouvés');
      return { success: true };
    } catch (error: any) {
      console.error('❌ Échec du test de connexion Firestore:', error);

      if (error.message?.includes('ERR_BLOCKED_BY_CLIENT') ||
          error.code === 'network-request-failed' ||
          error.message?.includes('Failed to fetch')) {
        return {
          success: false,
          error: 'Connexion bloquée par le navigateur. Vérifiez vos extensions (ad-blockers).'
        };
      }

      return {
        success: false,
        error: error.message || 'Erreur de connexion inconnue'
      };
    }
  }

  // Ajouter un nouveau client
  async addClient(clientData: Omit<FirebaseClient, 'id' | 'createdAt'>): Promise<string> {
    try {
      console.log('Ajout client dans Firebase:', clientData);
      const clientRef = collection(db, this.collectionName);

      // Nettoyer les valeurs undefined
      const cleanedData: any = {};
      Object.entries(clientData).forEach(([key, value]) => {
        if (value !== undefined) {
          cleanedData[key] = value;
        }
      });

      const newClient = {
        ...cleanedData,
        // invitationStatus est maintenant fourni dans cleanedData
        status: cleanedData.status || 'En attente', // Valeur par défaut si non fournie
        createdAt: Timestamp.now()
      };

      console.log('Données nettoyées pour Firebase:', newClient);
      const docRef = await addDoc(clientRef, newClient);
      console.log('Client ajouté avec ID:', docRef.id);
      return docRef.id;
    } catch (error: any) {
      console.error('❌ Erreur lors de l\'ajout du client:', error);

      // Gérer spécifiquement l'erreur ERR_BLOCKED_BY_CLIENT
      if (error.message?.includes('ERR_BLOCKED_BY_CLIENT') ||
          error.code === 'network-request-failed' ||
          error.message?.includes('Failed to fetch')) {

        console.error('🚫 Connexion Firestore bloquée - vérifiez vos extensions de navigateur');
        throw new Error('Connexion bloquée par le navigateur. Désactivez temporairement vos extensions (ad-blockers) et réessayez.');
      }

      // Re-lancer l'erreur pour les autres cas
      throw error;
    }
  }

  // Récupérer tous les clients
  async getClients(): Promise<FirebaseClient[]> {
    const clientRef = collection(db, this.collectionName);
    const q = query(clientRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as FirebaseClient));
  }

  // Récupérer un client par son ID
  async getClientById(id: string): Promise<FirebaseClient | null> {
    try {
      const clientRef = doc(db, this.collectionName, id);
      const snapshot = await getDoc(clientRef);

      if (!snapshot.exists()) {
        return null;
      }

      return {
        id: snapshot.id,
        ...snapshot.data()
      } as FirebaseClient;
    } catch (error) {
      console.error('Erreur lors de la récupération du client:', error);
      return null;
    }
  }

  // Mettre à jour un client
  async updateClient(id: string, updates: Partial<Omit<FirebaseClient, 'id' | 'createdAt'>>): Promise<void> {
    try {
      console.log('Mise à jour client dans Firebase:', { id, updates });
      const clientRef = doc(db, this.collectionName, id);
      await updateDoc(clientRef, updates);
      console.log('Client mis à jour avec succès:', id);
    } catch (error: any) {
      console.error('❌ Erreur lors de la mise à jour du client:', error);

      // Gérer spécifiquement l'erreur ERR_BLOCKED_BY_CLIENT
      if (error.message?.includes('ERR_BLOCKED_BY_CLIENT') ||
          error.code === 'network-request-failed' ||
          error.message?.includes('Failed to fetch')) {

        console.error('🚫 Connexion Firestore bloquée - vérifiez vos extensions de navigateur');
        throw new Error('Connexion bloquée par le navigateur. Désactivez temporairement vos extensions (ad-blockers) et réessayez.');
      }

      // Gérer spécifiquement les erreurs de permissions
      if (error.message?.includes('Missing or insufficient permissions')) {
        console.error('🔒 Permissions insuffisantes pour modifier ce client');
        throw new Error('Permissions insuffisantes. Vérifiez vos droits d\'accès.');
      }

      // Re-lancer l'erreur pour les autres cas
      throw error;
    }
  }

  // Récupérer un client par son ID utilisateur
  async getClientByUserId(userId: string): Promise<FirebaseClient | null> {
    const clientRef = collection(db, this.collectionName);
    const q = query(clientRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data()
    } as FirebaseClient;
  }

  // Récupérer un client par email
  async getClientByEmail(email: string): Promise<FirebaseClient | null> {
    const clientRef = collection(db, this.collectionName);
    const q = query(clientRef, where('email', '==', email));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data()
    } as FirebaseClient;
  }

  // Supprimer un client
  async deleteClient(id: string): Promise<void> {
    try {
      console.log('Suppression client dans Firebase:', id);
      const clientRef = doc(db, this.collectionName, id);
      await deleteDoc(clientRef);
      console.log('Client supprimé avec succès:', id);
    } catch (error: any) {
      console.error('❌ Erreur lors de la suppression du client:', error);

      // Gérer spécifiquement l'erreur ERR_BLOCKED_BY_CLIENT
      if (error.message?.includes('ERR_BLOCKED_BY_CLIENT') ||
          error.code === 'network-request-failed' ||
          error.message?.includes('Failed to fetch')) {

        console.error('🚫 Connexion Firestore bloquée - vérifiez vos extensions de navigateur');
        throw new Error('Connexion bloquée par le navigateur. Désactivez temporairement vos extensions (ad-blockers) et réessayez.');
      }

      // Gérer spécifiquement les erreurs de permissions
      if (error.message?.includes('Missing or insufficient permissions')) {
        console.error('🔒 Permissions insuffisantes pour supprimer ce client');
        throw new Error('Permissions insuffisantes. Vérifiez vos droits d\'accès.');
      }

      // Re-lancer l'erreur pour les autres cas
      throw error;
    }
  }

  // Écouter les changements en temps réel
  subscribeToClients(callback: (clients: FirebaseClient[]) => void): () => void {
    console.log('Démarrage de l\'écoute des clients...');
    const clientRef = collection(db, this.collectionName);
    const q = query(clientRef, orderBy('createdAt', 'desc'));

    return onSnapshot(q,
      (snapshot) => {
        console.log('Changement détecté dans la collection clients. Nombre de docs:', snapshot.docs.length);
        const clients = snapshot.docs.map(doc => {
          const data = doc.data();
          console.log('Document client:', doc.id, data);
          return {
            id: doc.id,
            ...data
          } as FirebaseClient;
        });
        console.log('Envoi des clients au callback:', clients.length);
        callback(clients);
      },
      (error) => {
        console.error('❌ Erreur dans l\'écoute des clients:', error);
        // Callback avec une liste vide en cas d'erreur pour éviter de casser l'interface
        console.log('📞 Envoi de liste vide au callback suite à l\'erreur');
        callback([]);
      }
    );
  }

  // Fonction utilitaire pour corriger les statuts des clients existants
  async fixClientStatuses(): Promise<{ updated: number; errors: number }> {
    try {
      console.log('🔧 Début de la correction des statuts clients...');
      const clientsRef = collection(db, this.collectionName);
      const snapshot = await getDocs(clientsRef);

      let updated = 0;
      let errors = 0;

      for (const clientDoc of snapshot.docs) {
        const data = clientDoc.data();

        // Si le client a une invitation acceptée mais statut différent de "En cours"
        if (data.invitationStatus === 'accepted' && data.status !== 'En cours') {
          try {
            await updateDoc(doc(db, this.collectionName, clientDoc.id), {
              status: 'En cours'
            });
            console.log(`✅ Client ${clientDoc.id} mis à jour: ${data.status} → En cours`);
            updated++;
          } catch (error) {
            console.error(`❌ Erreur mise à jour client ${clientDoc.id}:`, error);
            errors++;
          }
        }
      }

      console.log(`🎉 Correction terminée: ${updated} clients mis à jour, ${errors} erreurs`);
      return { updated, errors };
    } catch (error) {
      console.error('❌ Erreur lors de la correction des statuts:', error);
      throw error;
    }
  }
}

export const clientService = new ClientService();