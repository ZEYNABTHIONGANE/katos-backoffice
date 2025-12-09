import { create } from 'zustand';
import { Timestamp } from 'firebase/firestore';
import { projectService } from '../services/projectService';
import type { FirebaseProject } from '../types/firebase';

// Conversion des types pour compatibilité
interface ProjectForApp {
  id: string;
  name: string;
  description: string;
  images: string[];
  type: string;
  price: number;
  currency: string;
}

interface FirebaseProjectState {
  projects: ProjectForApp[];
  loading: boolean;
  error: string | null;
  addProject: (project: Omit<ProjectForApp, 'id'>) => Promise<boolean>;
  updateProject: (id: string, updates: Partial<ProjectForApp>) => Promise<boolean>;
  deleteProject: (id: string) => Promise<boolean>;
  uploadProjectImages: (files: File[], projectId?: string) => Promise<string[]>;
  initializeProjects: () => void;
  setProjects: (projects: ProjectForApp[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

// Fonction pour convertir FirebaseProject vers ProjectForApp
const convertFirebaseProject = (firebaseProject: FirebaseProject): ProjectForApp => ({
  id: firebaseProject.id!,
  name: firebaseProject.name,
  description: firebaseProject.description,
  images: firebaseProject.images,
  type: firebaseProject.type,
  price: firebaseProject.price || 0,
  currency: firebaseProject.currency || 'FCFA'
});

// Fonction pour convertir ProjectForApp vers FirebaseProject
const convertToFirebaseProject = (project: Omit<ProjectForApp, 'id'>): Omit<FirebaseProject, 'id' | 'createdAt'> => ({
  name: project.name,
  description: project.description,
  images: project.images,
  type: project.type,
  price: project.price || 0,
  currency: project.currency || 'FCFA'
});

export const useProjectStore = create<FirebaseProjectState>((set, get) => ({
  projects: [],
  loading: false,
  error: null,

  addProject: async (projectData) => {
    try {
      set({ loading: true, error: null });
      const firebaseData = convertToFirebaseProject(projectData);
      await projectService.addProject(firebaseData);
      set({ loading: false });
      return true;
    } catch (error: any) {
      set({
        error: error.message || 'Erreur lors de l\'ajout du projet',
        loading: false
      });
      return false;
    }
  },

  updateProject: async (id, updates) => {
    try {
      set({ loading: true, error: null });
      const firebaseUpdates: any = {};

      // Copier tous les champs fournis (même s'ils sont vides)
      if (updates.name !== undefined) firebaseUpdates.name = updates.name;
      if (updates.description !== undefined) firebaseUpdates.description = updates.description;
      if (updates.images !== undefined) firebaseUpdates.images = updates.images;
      if (updates.type !== undefined) firebaseUpdates.type = updates.type;
      if (updates.price !== undefined) firebaseUpdates.price = updates.price;
      if (updates.currency !== undefined) firebaseUpdates.currency = updates.currency;

      await projectService.updateProject(id, firebaseUpdates);
      set({ loading: false });
      return true;
    } catch (error: any) {
      set({
        error: error.message || 'Erreur lors de la mise à jour du projet',
        loading: false
      });
      return false;
    }
  },

  deleteProject: async (id) => {
    try {
      set({ loading: true, error: null });
      await projectService.deleteProject(id);
      set({ loading: false });
      return true;
    } catch (error: any) {
      set({
        error: error.message || 'Erreur lors de la suppression du projet',
        loading: false
      });
      return false;
    }
  },

  uploadProjectImages: async (files, projectId) => {
    try {
      set({ error: null });
      return await projectService.uploadProjectImages(files, projectId);
    } catch (error: any) {
      set({ error: error.message || 'Erreur lors de l\'upload des images' });
      return [];
    }
  },

  initializeProjects: () => {
    set({ loading: true, error: null });

    // Écouter les changements en temps réel
    const unsubscribe = projectService.subscribeToProjects((firebaseProjects) => {
      const convertedProjects = firebaseProjects.map(convertFirebaseProject);
      set({
        projects: convertedProjects,
        loading: false,
        error: null
      });
    });

    // Stocker la fonction de nettoyage
    (get() as any).unsubscribe = unsubscribe;
  },

  setProjects: (projects) => set({ projects }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error })
}));