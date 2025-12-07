import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  Timestamp,
  onSnapshot,
  getDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { FirebaseInvitation } from '../types/firebase';

export interface InvitationCode {
  id?: string;
  code: string;
  createdBy: string; // UID du Super Admin qui a créé le code
  createdAt: Timestamp;
  usedAt?: Timestamp;
  usedBy?: string; // UID de l'utilisateur qui a utilisé le code
  status: 'active' | 'used' | 'expired';
  expiresAt: Timestamp;
}

export class InvitationService {
  private readonly COLLECTION_NAME = 'invitationCodes';

  // Générer un code d'invitation unique
  generateInvitationCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Créer un nouveau code d'invitation
  async createInvitationCode(createdBy: string): Promise<InvitationCode | null> {
    try {
      const code = this.generateInvitationCode();
      const now = Timestamp.now();
      const expiresAt = Timestamp.fromMillis(now.toMillis() + (7 * 24 * 60 * 60 * 1000)); // Expire dans 7 jours

      const invitationData = {
        code,
        createdBy,
        createdAt: now,
        status: 'active' as const,
        expiresAt
      };

      const codesRef = collection(db, this.COLLECTION_NAME);
      const docRef = await addDoc(codesRef, invitationData);

      return {
        id: docRef.id,
        ...invitationData
      };
    } catch (error) {
      return null;
    }
  }

  // Récupérer tous les codes d'invitation
  async getAllInvitationCodes(): Promise<InvitationCode[]> {
    try {
      const codesRef = collection(db, this.COLLECTION_NAME);
      const q = query(codesRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as InvitationCode));
    } catch (error) {
      return [];
    }
  }

  // Valider et utiliser un code d'invitation
  async validateAndUseCode(code: string, usedBy: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const codesRef = collection(db, this.COLLECTION_NAME);
      const q = query(codesRef, where('code', '==', code));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return { valid: false, error: 'Code d\'invitation invalide' };
      }

      const codeDoc = snapshot.docs[0];
      const codeData = codeDoc.data() as InvitationCode;

      // Vérifier si le code a déjà été utilisé
      if (codeData.status === 'used') {
        return { valid: false, error: 'Ce code a déjà été utilisé' };
      }

      // Vérifier si le code a expiré
      if (codeData.expiresAt.toMillis() < Date.now()) {
        // Marquer comme expiré
        await updateDoc(doc(db, this.COLLECTION_NAME, codeDoc.id), {
          status: 'expired'
        });
        return { valid: false, error: 'Ce code a expiré' };
      }

      // Marquer le code comme utilisé
      await updateDoc(doc(db, this.COLLECTION_NAME, codeDoc.id), {
        status: 'used',
        usedAt: Timestamp.now(),
        usedBy
      });

      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'Erreur lors de la validation du code' };
    }
  }

  // Mettre à jour le usedBy d'un code
  async updateCodeUsedBy(id: string, usedBy: string): Promise<boolean> {
    try {
      const codeRef = doc(db, this.COLLECTION_NAME, id);
      await updateDoc(codeRef, { usedBy });
      return true;
    } catch (error) {
      return false;
    }
  }

  // Réactiver un code (pour les cas d'erreur)
  async reactivateCode(id: string): Promise<boolean> {
    try {
      const codeRef = doc(db, this.COLLECTION_NAME, id);
      await updateDoc(codeRef, {
        status: 'active',
        usedAt: null,
        usedBy: null
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  // Supprimer un code d'invitation
  async deleteInvitationCode(id: string): Promise<boolean> {
    try {
      const codeRef = doc(db, this.COLLECTION_NAME, id);
      await deleteDoc(codeRef);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Nettoyer les codes expirés (à appeler périodiquement)
  async cleanExpiredCodes(): Promise<number> {
    try {
      const codesRef = collection(db, this.COLLECTION_NAME);
      const q = query(codesRef, where('expiresAt', '<', Timestamp.now()));
      const snapshot = await getDocs(q);

      const deletePromises = snapshot.docs.map(doc =>
        updateDoc(doc.ref, { status: 'expired' })
      );

      await Promise.all(deletePromises);
      return snapshot.size;
    } catch (error) {
      return 0;
    }
  }

  // Créer un compte client à partir d'un clientId
  async createClientAccount(clientId: string, email: string): Promise<{ success: boolean; credentials?: string; error?: string }> {
    try {
      // Récupérer les informations du client
      const clientRef = doc(db, 'clients', clientId);
      const clientDoc = await getDoc(clientRef);

      if (!clientDoc.exists()) {
        return { success: false, error: 'Client non trouvé' };
      }

      const clientData = clientDoc.data();

      // Vérifier que le client a un email
      if (!email && !clientData.email) {
        return { success: false, error: 'Email requis pour créer le compte' };
      }

      const clientEmail = email || clientData.email;

      // Vérifier si un compte existe déjà pour ce client
      if (clientData.userId) {
        return {
          success: false,
          error: 'Un compte existe déjà pour ce client'
        };
      }

      // Vérifier si l'email est déjà utilisé dans Firebase Auth
      // En consultant la collection users pour voir si un utilisateur avec cet email existe
      const usersRef = collection(db, 'users');
      const emailQuery = query(usersRef, where('email', '==', clientEmail));
      const emailSnapshot = await getDocs(emailQuery);

      if (!emailSnapshot.empty) {
        // Un compte existe déjà avec cet email
        const existingUserDoc = emailSnapshot.docs[0];
        const existingUser = existingUserDoc.data();

        // Si l'utilisateur existant est déjà lié à ce client, on peut récupérer ses infos
        if (existingUser.clientId === clientId) {
          // Mettre à jour le client avec l'userId existant
          await updateDoc(clientRef, {
            userId: existingUser.uid,
            acceptedAt: existingUser.createdAt || Timestamp.now()
          });

          return {
            success: false,
            error: `Compte récupéré ! L'utilisateur était déjà créé avec l'identifiant: ${existingUser.username}`
          };
        } else {
          return {
            success: false,
            error: 'Un compte Firebase existe déjà avec cet email mais lié à un autre client. Utilisez un autre email.'
          };
        }
      }

      // Utiliser le nouveau service de création de comptes clients
      const { clientAccountService } = await import('./clientAccountService');
      const result = await clientAccountService.createClientAccount(
        clientEmail,
        `${clientData.prenom} ${clientData.nom}`,
        clientId
      );

      if (result.success) {
        // Mettre à jour le client avec l'userId (l'admin est toujours connecté ✅)
        if (result.uid) {
          await updateDoc(clientRef, {
            userId: result.uid,
            acceptedAt: Timestamp.now()
          });
        }

        // Formater les identifiants pour l'affichage
        const credentials = `🔑 IDENTIFIANTS DE CONNEXION

Identifiant: ${result.username}
Mot de passe: ${result.tempPassword}

📱 Instructions de connexion:
1. Utilisez l'identifiant (pas l'email)
2. Entrez le mot de passe fourni
3. Changez le mot de passe lors de la première connexion

⚠️ IMPORTANT:
- Gardez ces informations confidentielles
- Le mot de passe doit être changé à la première connexion`;

        return {
          success: true,
          credentials
        };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Erreur lors de la création du compte client:', error);
      return {
        success: false,
        error: 'Erreur lors de la création du compte client'
      };
    }
  }

  // Créer ou récupérer une invitation pour un client
  private async getOrCreateInvitation(clientId: string, email: string): Promise<FirebaseInvitation> {
    try {
      // Chercher une invitation existante pour ce client
      const invitationsRef = collection(db, 'invitations');
      const q = query(invitationsRef, where('clientId', '==', clientId));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        // Retourner l'invitation existante
        const existingInvitation = snapshot.docs[0];
        return {
          id: existingInvitation.id,
          ...existingInvitation.data()
        } as FirebaseInvitation;
      }

      // Créer une nouvelle invitation
      const invitationData = {
        clientId,
        email,
        status: 'pending' as const,
        createdAt: Timestamp.now(),
        expiresAt: Timestamp.fromMillis(Date.now() + (30 * 24 * 60 * 60 * 1000)), // 30 jours
        token: this.generateInvitationCode() // Réutiliser la méthode de génération de code
      };

      const docRef = await addDoc(invitationsRef, invitationData);

      return {
        id: docRef.id,
        ...invitationData
      };
    } catch (error) {
      console.error('Erreur lors de la création/récupération de l\'invitation:', error);
      throw error;
    }
  }

  // Récupérer toutes les invitations clients
  async getClientInvitations(clientId?: string): Promise<FirebaseInvitation[]> {
    try {
      const invitationsRef = collection(db, 'invitations');
      let q;

      if (clientId) {
        // Filtrer par clientId si fourni
        q = query(invitationsRef, where('clientId', '==', clientId), orderBy('createdAt', 'desc'));
      } else {
        // Récupérer toutes les invitations
        q = query(invitationsRef, orderBy('createdAt', 'desc'));
      }

      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as FirebaseInvitation));
    } catch (error) {
      console.error('Erreur lors de la récupération des invitations:', error);
      return [];
    }
  }

  // Écouter les changements sur la collection invitations (pour les clients)
  subscribeToInvitations(callback: (invitations: FirebaseInvitation[]) => void): () => void {
    const invitationsRef = collection(db, 'invitations');
    const q = query(invitationsRef, orderBy('createdAt', 'desc'));

    return onSnapshot(q, (snapshot) => {
      const invitations: FirebaseInvitation[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as FirebaseInvitation));

      callback(invitations);
    }, (error) => {
      console.error('Erreur lors de l\'écoute des invitations:', error);
      callback([]);
    });
  }

  // Générer une URL d'invitation web
  generateInvitationUrl(token: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/invitation?token=${token}`;
  }

  // Générer une URL directe
  generateDirectUrl(token: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/direct-access?token=${token}`;
  }

  // Supprimer une invitation
  async deleteInvitation(invitationId: string): Promise<boolean> {
    try {
      const invitationRef = doc(db, 'invitations', invitationId);
      await deleteDoc(invitationRef);
      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'invitation:', error);
      return false;
    }
  }

}

export const invitationService = new InvitationService();