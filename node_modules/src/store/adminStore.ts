import { create } from 'zustand';
import { Timestamp } from 'firebase/firestore';
import { adminService } from '../services/adminService';
import type { Admin } from '../types/admin';

interface AdminState {
  admins: Admin[];
  loading: boolean;
  error: string | null;

  // Actions
  initializeAdmins: () => void;
  addAdmin: (adminData: Omit<Admin, 'id' | 'createdAt'>) => Promise<boolean>;
  updateAdmin: (id: string, adminData: Omit<Admin, 'id' | 'createdAt'>) => Promise<boolean>;
  deleteAdmin: (id: string) => Promise<boolean>;
  setAdmins: (admins: Admin[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const convertFirebaseAdmin = (firebaseAdmin: any): Admin => ({
  ...firebaseAdmin,
  createdAt: firebaseAdmin.createdAt.toDate().toISOString(),
  invitedAt: firebaseAdmin.invitedAt?.toDate().toISOString(),
  acceptedAt: firebaseAdmin.acceptedAt?.toDate().toISOString(),
});

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
      const firebaseAdmin = await adminService.createAdmin({
        ...adminData,
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
      const success = await adminService.updateAdmin(id, adminData);

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