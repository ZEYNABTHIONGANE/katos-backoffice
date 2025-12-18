import { create } from 'zustand';
import { Timestamp } from 'firebase/firestore';
import { materialService } from '../services/materialService';
import type { FirebaseMaterial } from '../types/firebase';

// Conversion des types pour compatibilité
interface MaterialForApp {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  supplier: string;
  description: string;
}

interface FirebaseMaterialState {
  materials: MaterialForApp[];
  loading: boolean;
  error: string | null;
  addMaterial: (material: Omit<MaterialForApp, 'id'>) => Promise<boolean>;
  updateMaterial: (id: string, updates: Partial<MaterialForApp>) => Promise<boolean>;
  deleteMaterial: (id: string) => Promise<boolean>;
  initializeMaterials: () => void;
  setMaterials: (materials: MaterialForApp[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

// Fonction pour convertir FirebaseMaterial vers MaterialForApp
const convertFirebaseMaterial = (firebaseMaterial: FirebaseMaterial): MaterialForApp => ({
  id: firebaseMaterial.id!,
  name: firebaseMaterial.name,
  category: firebaseMaterial.category,
  price: firebaseMaterial.price,
  image: firebaseMaterial.image,
  supplier: firebaseMaterial.supplier,
  description: firebaseMaterial.description
});

// Fonction pour convertir MaterialForApp vers FirebaseMaterial
const convertToFirebaseMaterial = (material: Omit<MaterialForApp, 'id'>): Omit<FirebaseMaterial, 'id' | 'createdAt'> => ({
  name: material.name,
  category: material.category,
  price: material.price,
  image: material.image,
  supplier: material.supplier,
  description: material.description
});

export const useMaterialStore = create<FirebaseMaterialState>((set, get) => ({
  materials: [],
  loading: false,
  error: null,

  addMaterial: async (materialData) => {
    try {
      set({ loading: true, error: null });
      const firebaseData = convertToFirebaseMaterial(materialData);
      await materialService.addMaterial(firebaseData);
      set({ loading: false });
      return true;
    } catch (error: any) {
      set({
        error: error.message || 'Erreur lors de l\'ajout du matériau',
        loading: false
      });
      return false;
    }
  },

  updateMaterial: async (id, updates) => {
    try {
      set({ loading: true, error: null });
      const firebaseUpdates: any = {};

      if (updates.name) firebaseUpdates.name = updates.name;
      if (updates.category) firebaseUpdates.category = updates.category;
      if (updates.price !== undefined) firebaseUpdates.price = updates.price;
      if (updates.image) firebaseUpdates.image = updates.image;
      if (updates.supplier) firebaseUpdates.supplier = updates.supplier;
      if (updates.description) firebaseUpdates.description = updates.description;

      await materialService.updateMaterial(id, firebaseUpdates);
      set({ loading: false });
      return true;
    } catch (error: any) {
      set({
        error: error.message || 'Erreur lors de la mise à jour du matériau',
        loading: false
      });
      return false;
    }
  },

  deleteMaterial: async (id) => {
    try {
      set({ loading: true, error: null });
      await materialService.deleteMaterial(id);
      set({ loading: false });
      return true;
    } catch (error: any) {
      set({
        error: error.message || 'Erreur lors de la suppression du matériau',
        loading: false
      });
      return false;
    }
  },

  initializeMaterials: () => {
    set({ loading: true, error: null });

    // Écouter les changements en temps réel
    const unsubscribe = materialService.subscribeToMaterials((firebaseMaterials) => {
      const convertedMaterials = firebaseMaterials.map(convertFirebaseMaterial);
      set({
        materials: convertedMaterials,
        loading: false,
        error: null
      });
    });

    // Stocker la fonction de nettoyage
    (get() as any).unsubscribe = unsubscribe;
  },

  setMaterials: (materials) => set({ materials }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error })
}));