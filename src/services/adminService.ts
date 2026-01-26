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
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Admin } from '../types/admin';

export interface FirebaseAdmin {
  id?: string;
  nom: string;
  prenom: string;
  email: string;
  phoneNumber?: string;
  status: 'En attente' | 'Actif' | 'Suspendu';
  invitationStatus: 'pending' | 'sent' | 'accepted' | 'declined';
  invitationToken?: string;
  tempPassword?: string;
  userId?: string;
  createdAt: Timestamp;
  invitedAt?: Timestamp;
  acceptedAt?: Timestamp;
}

export class AdminService {
  private readonly COLLECTION_NAME = 'admins';

  async getAllAdmins(): Promise<FirebaseAdmin[]> {
    try {
      const adminsRef = collection(db, this.COLLECTION_NAME);
      const q = query(adminsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as FirebaseAdmin));
    } catch (error) {
      console.error('Erreur lors de la récupération des admins:', error);
      return [];
    }
  }

  async createAdmin(adminData: Omit<FirebaseAdmin, 'id'>): Promise<FirebaseAdmin | null> {
    try {
      const adminsRef = collection(db, this.COLLECTION_NAME);
      const docRef = await addDoc(adminsRef, adminData);

      return {
        id: docRef.id,
        ...adminData
      };
    } catch (error) {
      console.error('Erreur lors de la création de l\'admin:', error);
      return null;
    }
  }

  async updateAdmin(id: string, adminData: Partial<FirebaseAdmin>): Promise<boolean> {
    try {
      const adminRef = doc(db, this.COLLECTION_NAME, id);
      await updateDoc(adminRef, adminData);
      return true;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'admin:', error);
      return false;
    }
  }

  async deleteAdmin(id: string): Promise<boolean> {
    try {
      const adminRef = doc(db, this.COLLECTION_NAME, id);
      await deleteDoc(adminRef);
      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'admin:', error);
      return false;
    }
  }

  async getAdminByEmail(email: string): Promise<FirebaseAdmin | null> {
    try {
      const adminsRef = collection(db, this.COLLECTION_NAME);
      const q = query(adminsRef, where('email', '==', email));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return {
          id: doc.id,
          ...doc.data()
        } as FirebaseAdmin;
      }
      return null;
    } catch (error) {
      console.error('Erreur lors de la recherche de l\'admin:', error);
      return null;
    }
  }

  // Générer un token d'invitation
  generateInvitationToken(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  // Générer un mot de passe temporaire
  generateTemporaryPassword(): string {
    const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
    const numberChars = '0123456789';
    const specialChars = '!@#$%^&*';

    let password = '';

    // Au moins un de chaque type
    password += uppercaseChars.charAt(Math.floor(Math.random() * uppercaseChars.length));
    password += lowercaseChars.charAt(Math.floor(Math.random() * lowercaseChars.length));
    password += numberChars.charAt(Math.floor(Math.random() * numberChars.length));
    password += specialChars.charAt(Math.floor(Math.random() * specialChars.length));

    // Compléter jusqu'à 12 caractères
    const allChars = uppercaseChars + lowercaseChars + numberChars + specialChars;
    for (let i = password.length; i < 12; i++) {
      password += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }

    // Mélanger les caractères
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  // Marquer une invitation comme envoyée
  async markInvitationSent(id: string, token: string): Promise<boolean> {
    try {
      const adminRef = doc(db, this.COLLECTION_NAME, id);
      await updateDoc(adminRef, {
        invitationStatus: 'sent',
        invitationToken: token,
        invitedAt: Timestamp.now()
      });
      return true;
    } catch (error) {
      console.error('Erreur lors du marquage de l\'invitation:', error);
      return false;
    }
  }
}

export const adminService = new AdminService();