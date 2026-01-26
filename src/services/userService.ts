import type { User } from 'firebase/auth';
import {
  createUserWithEmailAndPassword,
  updateProfile,
  signOut
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  Timestamp,
  where
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import type { FirebaseUser } from '../types/firebase';
import { UserRole } from '../types/roles';

export interface CreateUserData {
  email: string;
  displayName: string;
  role: UserRole;
  phoneNumber?: string;
}

export interface CreateUserResult {
  success: boolean;
  tempPassword?: string;
  uid?: string;
  error?: string;
  adminEmail?: string;
}

export class UserService {

  // Générer un mot de passe temporaire
  generateTemporaryPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  // Créer un nouvel utilisateur avec rôle
  async createUser(userData: CreateUserData, createdBy: string): Promise<CreateUserResult> {
    try {
      const tempPassword = this.generateTemporaryPassword();

      // Sauvegarder l'utilisateur actuel (admin) et ses credentials
      const currentUser = auth.currentUser;

      if (!currentUser) {
        return {
          success: false,
          error: 'Aucun utilisateur connecté'
        };
      }

      const adminEmail = currentUser.email!;

      // Créer le compte Firebase Auth
      const result = await createUserWithEmailAndPassword(auth, userData.email, tempPassword);
      const user = result.user;

      // Mettre à jour le profil
      await updateProfile(user, { displayName: userData.displayName });

      // Créer le document utilisateur avec le rôle
      const newUserData: FirebaseUser = {
        uid: user.uid,
        email: user.email!,
        displayName: userData.displayName,
        phoneNumber: userData.phoneNumber,
        role: userData.role,
        isTemporaryPassword: true,
        createdAt: Timestamp.now(),
        createdBy: createdBy
      };

      await setDoc(doc(db, 'users', user.uid), newUserData);

      // Stocker le mot de passe temporaire pour pouvoir le récupérer
      await setDoc(doc(db, 'temporaryPasswords', user.uid), {
        password: tempPassword,
        createdAt: Timestamp.now(),
        createdBy: createdBy
      });

      // Se déconnecter du nouveau compte pour éviter la confusion
      await signOut(auth);

      return {
        success: true,
        tempPassword,
        uid: user.uid,
        adminEmail: adminEmail // Retourner l'email admin pour la reconnexion
      };
    } catch (error: any) {
      console.error('Erreur lors de la création de l\'utilisateur:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Récupérer tous les utilisateurs
  async getAllUsers(): Promise<FirebaseUser[]> {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => doc.data() as FirebaseUser);
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs:', error);
      return [];
    }
  }

  // Récupérer un utilisateur par UID
  async getUserByUid(uid: string): Promise<FirebaseUser | null> {
    try {
      // 1. Try 'users' collection (Backoffice/Chef)
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        return userDoc.data() as FirebaseUser;
      }

      // 2. Try 'clients' collection (App Clients)
      const clientDoc = await getDoc(doc(db, 'clients', uid));
      if (clientDoc.exists()) {
        const clientData = clientDoc.data();
        return {
          uid: clientDoc.id,
          email: clientData.email,
          displayName: `${clientData.prenom || ''} ${clientData.nom || ''}`.trim() || 'Client',
          role: UserRole.CLIENT,
          // Add other fields if necessary to match FirebaseUser
          createdAt: clientData.createdAt || Timestamp.now(),
        } as FirebaseUser;
      }

      return null;
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'utilisateur:', error);
      return null;
    }
  }

  // Récupérer les utilisateurs par rôle
  async getUsersByRole(role: UserRole): Promise<FirebaseUser[]> {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('role', '==', role), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => doc.data() as FirebaseUser);
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs par rôle:', error);
      return [];
    }
  }

  // Récupérer tous les utilisateurs qui peuvent être chefs de chantier
  async getAvailableChefs(): Promise<FirebaseUser[]> {
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);

      const allUsers = snapshot.docs.map(doc => doc.data() as FirebaseUser);

      // Filtrer les utilisateurs qui peuvent être chefs
      const availableChefs = allUsers.filter(user =>
        user.role === UserRole.CHEF ||
        (user.role === UserRole.ADMIN && user.isChef === true) ||
        user.role === UserRole.SUPER_ADMIN
      );

      return availableChefs.sort((a, b) => a.displayName.localeCompare(b.displayName));
    } catch (error) {
      console.error('Erreur lors de la récupération des chefs disponibles:', error);
      return [];
    }
  }

  // Supprimer un utilisateur
  async deleteUser(uid: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Supprimer le document Firestore
      await deleteDoc(doc(db, 'users', uid));

      // Note: Pour supprimer complètement l'utilisateur de Firebase Auth,
      // il faudrait utiliser l'Admin SDK côté serveur

      return { success: true };
    } catch (error: any) {
      console.error('Erreur lors de la suppression de l\'utilisateur:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Mettre à jour le rôle d'un utilisateur
  async updateUserRole(uid: string, newRole: UserRole): Promise<{ success: boolean; error?: string }> {
    try {
      const userRef = doc(db, 'users', uid);
      await setDoc(userRef, { role: newRole }, { merge: true });

      return { success: true };
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour du rôle:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Mettre à jour le statut chef d'un utilisateur
  async updateChefStatus(uid: string, isChef: boolean): Promise<{ success: boolean; error?: string }> {
    try {
      const userRef = doc(db, 'users', uid);
      await setDoc(userRef, { isChef }, { merge: true });

      return { success: true };
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour du statut chef:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Vérifier si un email existe déjà
  async emailExists(email: string): Promise<boolean> {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const snapshot = await getDocs(q);

      return !snapshot.empty;
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'email:', error);
      return false;
    }
  }

  // Récupérer le mot de passe temporaire d'un utilisateur
  async getTemporaryPassword(uid: string): Promise<string | null> {
    try {
      const passwordDoc = await getDoc(doc(db, 'temporaryPasswords', uid));
      if (passwordDoc.exists()) {
        return passwordDoc.data().password;
      }
      return null;
    } catch (error) {
      console.error('Erreur lors de la récupération du mot de passe temporaire:', error);
      return null;
    }
  }

  // Supprimer le mot de passe temporaire (après changement)
  async removeTemporaryPassword(uid: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, 'temporaryPasswords', uid));
      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression du mot de passe temporaire:', error);
      return false;
    }
  }

  // Initialiser un super admin par défaut
  async initializeSuperAdmin(email: string, password: string, displayName: string): Promise<CreateUserResult> {
    try {
      // Vérifier si un super admin existe déjà
      const superAdmins = await this.getUsersByRole(UserRole.SUPER_ADMIN);
      if (superAdmins.length > 0) {
        return {
          success: false,
          error: 'Un super administrateur existe déjà'
        };
      }

      // Créer le compte Firebase Auth
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const user = result.user;

      // Mettre à jour le profil
      await updateProfile(user, { displayName });

      // Créer le document utilisateur
      const superAdminData: FirebaseUser = {
        uid: user.uid,
        email: user.email!,
        displayName,
        role: UserRole.SUPER_ADMIN,
        isTemporaryPassword: false,
        createdAt: Timestamp.now()
      };

      await setDoc(doc(db, 'users', user.uid), superAdminData);

      return {
        success: true,
        uid: user.uid
      };
    } catch (error: any) {
      console.error('Erreur lors de l\'initialisation du super admin:', error);

      // Si l'email existe déjà, ce n'est pas une vraie erreur
      if (error.code === 'auth/email-already-in-use') {
        return {
          success: false,
          error: 'Un compte avec cet email existe déjà'
        };
      }

      return {
        success: false,
        error: error.message
      };
    }
  }
}

export const userService = new UserService();