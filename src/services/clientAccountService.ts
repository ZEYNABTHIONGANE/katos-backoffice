import {
  createUserWithEmailAndPassword,
  updateProfile,
  signOut
} from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { clientAuth, db, auth } from '../config/firebase';
import type { FirebaseUser } from '../types/firebase';
import { UserRole } from '../types/roles';

export class ClientAccountService {
  // Générer un mot de passe temporaire
  generateTemporaryPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  // Générer un identifiant client unique
  generateClientUsername(): string {
    const prefix = 'CLI';
    const timestamp = Date.now().toString().slice(-6); // 6 derniers chiffres du timestamp
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${timestamp}${random}`;
  }

  // Créer un compte client avec l'instance séparée
  async createClientAccount(
    email: string,
    clientName: string,
    clientId: string
  ): Promise<{ success: boolean; tempPassword?: string; username?: string; uid?: string; error?: string }> {
    try {
      const tempPassword = this.generateTemporaryPassword();
      const username = this.generateClientUsername();

      console.log('Création compte client avec instance séparée pour:', email);

      // Créer le compte sur l'instance séparée (n'affecte pas l'admin)
      const result = await createUserWithEmailAndPassword(clientAuth, email, tempPassword);
      const newUser = result.user;

      console.log('Compte client créé sur instance séparée:', newUser.email);

      // Mettre à jour le profil
      await updateProfile(newUser, { displayName: clientName });

      // Créer le document utilisateur dans Firestore
      const userData: FirebaseUser = {
        uid: newUser.uid,
        email: newUser.email!,
        displayName: clientName,
        username: username,
        role: UserRole.CLIENT,
        createdAt: Timestamp.now(),
        clientId: clientId,
        isTemporaryPassword: true
      };

      // Utiliser l'instance admin pour écrire dans Firestore
      // Temporairement, on écrit avec l'admin connecté sur l'instance principale
      console.log('Sauvegarde avec admin auth:', auth.currentUser?.email);
      await setDoc(doc(db, 'users', newUser.uid), userData);

      // Déconnecter immédiatement l'instance client
      await signOut(clientAuth);

      console.log('Compte client créé et instance séparée déconnectée');
      console.log('Admin reste connecté sur instance principale ✅');

      return {
        success: true,
        tempPassword,
        username,
        uid: newUser.uid
      };
    } catch (error: any) {
      console.error('Erreur lors de la création du compte client:', error);
      console.error('Code erreur:', error.code);
      console.error('Message erreur:', error.message);
      console.error('Détails complets:', JSON.stringify(error, null, 2));

      let errorMessage = 'Erreur lors de la création du compte';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Un compte existe déjà avec cet email';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Le mot de passe généré est trop faible';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Email invalide';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Problème de réseau - vérifiez votre connexion';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Trop de tentatives - réessayez plus tard';
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = 'Création de compte non autorisée - vérifiez la configuration Firebase';
      } else {
        errorMessage = `Erreur Firebase: ${error.code || 'inconnue'} - ${error.message || 'Pas de détails'}`;
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }
}

export const clientAccountService = new ClientAccountService();