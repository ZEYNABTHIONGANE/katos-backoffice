import { create } from 'zustand';
import { Timestamp } from 'firebase/firestore';
import { adminService } from '../services/adminService';
import type { Admin } from '../types/admin';

interface AdminState {
  admins: Admin[];
  loading: boolean;
  error: string | null;

  // Actions
  initializeAdmins: () => Promise<void>;
  addAdmin: (adminData: Omit<Admin, 'id' | 'createdAt'>) => Promise<boolean>;
  updateAdmin: (id: string, adminData: Partial<Admin>) => Promise<boolean>;
  deleteAdmin: (id: string) => Promise<boolean>;
  setAdmins: (admins: Admin[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const convertFirebaseAdmin = (firebaseAdmin: any): Admin => {
  const data = firebaseAdmin;
  return {
    id: data.id,
    nom: data.nom,
    prenom: data.prenom,
    email: data.email,
    phoneNumber: data.phoneNumber,
    status: data.status,
    invitationStatus: data.invitationStatus,
    invitationToken: data.invitationToken,
    tempPassword: data.tempPassword,
    userId: data.userId,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    invitedAt: data.invitedAt?.toDate?.()?.toISOString(),
    acceptedAt: data.acceptedAt?.toDate?.()?.toISOString()
  };
};

export const useAdminStore = create<AdminState>((set, get) => ({
  admins: [],
  loading: false,
  error: null,

  initializeAdmins: async () => {
    try {
      set({ loading: true, error: null });
      const firebaseAdmins = await adminService.getAllAdmins();
      const admins = firebaseAdmins.map(convertFirebaseAdmin);
      set({ admins, loading: false });
    } catch (error: any) {
      console.error('Erreur lors de l\'initialisation des admins:', error);
      set({ error: error.message, loading: false });
    }
  },

  addAdmin: async (adminData) => {
    try {
      set({ error: null });
      const tempPassword = adminService.generateTemporaryPassword();

      // Conversion des données pour Firebase (tout ce qui est string date doit être géré si présent)
      // Pour la création, on ignore les dates optionnelles qui viendraient de l'UI comme string
      // car elles sont gérées par le service ou pas encore là.

      const firebaseAdmin = await adminService.createAdmin({
        nom: adminData.nom,
        prenom: adminData.prenom,
        email: adminData.email,
        phoneNumber: adminData.phoneNumber,
        status: 'En attente',
        invitationStatus: 'pending',
        tempPassword,
        createdAt: Timestamp.now()
      });

      if (firebaseAdmin) {
        const admin = convertFirebaseAdmin(firebaseAdmin);
        set(state => ({
          admins: [...state.admins, admin]
        }));
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Erreur lors de la création de l\'admin:', error);
      set({ error: error.message });
      return false;
    }
  },

  updateAdmin: async (id, adminData) => {
    try {
      set({ error: null });

      // Conversion partiel : si dates présentes en string, on les convertit en Timestamp pour le service
      const updateData: any = { ...adminData };
      if (adminData.invitedAt) updateData.invitedAt = Timestamp.fromDate(new Date(adminData.invitedAt));
      if (adminData.acceptedAt) updateData.acceptedAt = Timestamp.fromDate(new Date(adminData.acceptedAt));
      // createdAt ne devrait pas être mis à jour ici

      const success = await adminService.updateAdmin(id, updateData);

      if (success) {
        set(state => ({
          admins: state.admins.map(admin =>
            admin.id === id ? { ...admin, ...adminData } : admin
          )
        }));
      }
      return success;
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour de l\'admin:', error);
      set({ error: error.message });
      return false;
    }
  },

  deleteAdmin: async (id) => {
    try {
      set({ error: null });
      const success = await adminService.deleteAdmin(id);

      if (success) {
        set(state => ({
          admins: state.admins.filter(admin => admin.id !== id)
        }));
      }
      return success;
    } catch (error: any) {
      console.error('Erreur lors de la suppression de l\'admin:', error);
      set({ error: error.message });
      return false;
    }
  },

  setAdmins: (admins) => set({ admins }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));