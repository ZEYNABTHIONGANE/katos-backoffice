import type { User } from 'firebase/auth';
import {
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth';
import { doc, setDoc, getDoc, Timestamp, deleteDoc, collection, getDocs, updateDoc, query, orderBy, where } from 'firebase/firestore';
import { auth, db, app } from '../config/firebase';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import type { FirebaseUser } from '../types/firebase';
import { UserRole } from '../types/roles';

export class AuthService {
  async signIn(email: string, password: string): Promise<User> {
    const result = await signInWithEmailAndPassword(auth, email, password);
    const user = result.user;

    // Vérifier si l'utilisateur est bloqué
    const userData = await this.getUserData(user.uid);
    if (userData && userData.isBlocked) {
      // Se déconnecter immédiatement si bloqué
      await signOut(auth);
      throw new Error('Votre compte a été bloqué. Contactez l\'administrateur.');
    }

    return user;
  }

  async signUp(
    email: string,
    password: string,
    displayName: string,
    role: UserRole = UserRole.CLIENT,
    phoneNumber?: string
  ): Promise<User> {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const user = result.user;

    await updateProfile(user, { displayName });

    const userData: FirebaseUser = {
      uid: user.uid,
      email: user.email!,
      displayName,
      phoneNumber: phoneNumber || null,
      role,
      createdAt: Timestamp.now()
    };

    await setDoc(doc(db, 'users', user.uid), userData);
    return user;
  }

  async signOut(): Promise<void> {
    await signOut(auth);
  }

  async getUserData(uid: string): Promise<FirebaseUser | null> {
    const userDoc = await getDoc(doc(db, 'users', uid));
    return userDoc.exists() ? userDoc.data() as FirebaseUser : null;
  }

  getCurrentUser(): User | null {
    return auth.currentUser;
  }

  // Écouter les changements d'état d'authentification
  onAuthStateChange(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, callback);
  }

  // Changer le mot de passe de l'utilisateur connecté
  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const user = auth.currentUser;
      if (!user) {
        return {
          success: false,
          error: 'Aucun utilisateur connecté'
        };
      }

      if (!user.email) {
        return {
          success: false,
          error: 'Email utilisateur non disponible'
        };
      }

      console.log('Tentative de ré-authentification pour:', user.email);

      // Ré-authentifier l'utilisateur avec son mot de passe actuel
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      console.log('Ré-authentification réussie, changement de mot de passe...');

      // Changer le mot de passe
      await updatePassword(user, newPassword);

      // Marquer que le mot de passe n'est plus temporaire (seulement si nécessaire)
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.isTemporaryPassword) {
            await setDoc(doc(db, 'users', user.uid), {
              ...userData,
              isTemporaryPassword: false
            });
          }
        }
      } catch (firestoreError) {
        // Ignorer les erreurs Firestore pour ne pas empêcher le changement de mot de passe
        console.warn('Impossible de mettre à jour le flag isTemporaryPassword:', firestoreError);
      }

      return { success: true };
    } catch (error: any) {
      console.error('Erreur lors du changement de mot de passe:', error);

      let errorMessage = 'Erreur lors du changement de mot de passe';
      if (error.code === 'auth/wrong-password') {
        errorMessage = 'Mot de passe actuel incorrect';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Le nouveau mot de passe est trop faible';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Trop de tentatives. Veuillez réessayer plus tard';
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

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

  // Vérifier si un identifiant existe déjà
  async isUsernameAvailable(username: string): Promise<boolean> {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', username));
      const snapshot = await getDocs(q);
      return snapshot.empty;
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'identifiant:', error);
      return false;
    }
  }

  // Générer un identifiant unique disponible
  async generateUniqueUsername(): Promise<string> {
    let username = this.generateClientUsername();
    let attempts = 0;

    while (!(await this.isUsernameAvailable(username)) && attempts < 10) {
      username = this.generateClientUsername();
      attempts++;
    }

    if (attempts >= 10) {
      throw new Error('Impossible de générer un identifiant unique');
    }

    return username;
  }

  // Créer un compte client avec mot de passe temporaire
  async createClientAccount(
    email: string,
    clientName: string,
    clientId: string
  ): Promise<{ success: boolean; tempPassword?: string; username?: string; uid?: string; error?: string }> {
    try {
      const tempPassword = this.generateTemporaryPassword();
      const username = await this.generateUniqueUsername();

      // Sauvegarder l'utilisateur admin actuel
      const adminUser = auth.currentUser;
      const adminToken = await adminUser?.getIdToken();

      if (!adminUser || !adminToken) {
        return {
          success: false,
          error: 'Aucun utilisateur admin connecté'
        };
      }

      console.log('Admin actuel sauvegardé:', adminUser.email);

      // Créer le compte client (cela va malheureusement déconnecter l'admin)
      const result = await createUserWithEmailAndPassword(auth, email, tempPassword);
      const newUser = result.user;

      console.log('Compte client créé:', newUser.email);

      // Mettre à jour le profil
      await updateProfile(newUser, { displayName: clientName });

      // Créer le document utilisateur
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

      await setDoc(doc(db, 'users', newUser.uid), userData);

      // Déconnecter le client
      await signOut(auth);

      console.log('Compte client créé et déconnecté');

      // NOTE: L'admin sera déconnecté. C'est une limitation de Firebase côté client.
      // Pour éviter cela, il faudrait utiliser Firebase Admin SDK côté serveur.

      return {
        success: true,
        tempPassword,
        username,
        uid: newUser.uid
      };
    } catch (error: any) {
      console.error('Erreur lors de la création du compte client:', error);

      let errorMessage = 'Erreur lors de la création du compte';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Un compte existe déjà avec cet email';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Le mot de passe généré est trop faible';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Email invalide';
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  // Récupérer tous les utilisateurs
  async getAllUsers(): Promise<FirebaseUser[]> {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      } as FirebaseUser));
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs:', error);
      return [];
    }
  }

  // Bloquer/débloquer un utilisateur
  async toggleUserStatus(uid: string): Promise<{ success: boolean; error?: string }> {
    try {
      const userRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        return { success: false, error: 'Utilisateur non trouvé' };
      }

      const userData = userDoc.data() as FirebaseUser;
      const currentStatus = userData.isBlocked || false; // par défaut false si undefined
      const newStatus = !currentStatus;

      await updateDoc(userRef, {
        isBlocked: newStatus,
        blockedAt: newStatus ? Timestamp.now() : null
      });

      return { success: true };
    } catch (error) {
      console.error('Erreur lors du changement de statut utilisateur:', error);
      return {
        success: false,
        error: 'Erreur lors du changement de statut'
      };
    }
  }

  // Supprimer un utilisateur
  async deleteUser(uid: string): Promise<{ success: boolean; error?: string }> {
    try {
      const userRef = doc(db, 'users', uid);
      await deleteDoc(userRef);

      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'utilisateur:', error);
      return {
        success: false,
        error: 'Erreur lors de la suppression'
      };
    }
  }

  // Régénérer les accès d'un client (nouveau mot de passe et identifiant)
  async regenerateClientAccess(uid: string): Promise<{ success: boolean; username?: string; tempPassword?: string; error?: string }> {
    try {
      const userRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        return { success: false, error: 'Utilisateur non trouvé' };
      }

      const userData = userDoc.data() as FirebaseUser;

      if (userData.role !== UserRole.CLIENT) {
        return { success: false, error: 'Cette action est réservée aux clients' };
      }

      // Générer de nouveaux identifiants
      const newUsername = await this.generateUniqueUsername();
      const newPassword = this.generateTemporaryPassword();

      // Mettre à jour le document utilisateur
      await updateDoc(userRef, {
        username: newUsername,
        isTemporaryPassword: true // Marquer comme temporaire
      });

      // Note: Pour changer le mot de passe Firebase Auth, il faudrait utiliser l'Admin SDK
      // Pour l'instant, nous retournons juste les nouveaux identifiants

      return {
        success: true,
        username: newUsername,
        tempPassword: newPassword
      };
    } catch (error: any) {
      console.error('Erreur lors de la régénération des accès:', error);
      return {
        success: false,
        error: 'Erreur lors de la régénération des accès'
      };
    }
  }
}

export const authService = new AuthService();