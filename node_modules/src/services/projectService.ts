import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { storageService } from './storageService';
import type { FirebaseProject } from '../types/firebase';

export class ProjectService {
  private collectionName = 'projects';

  // Tester la connexion Firestore
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔍 Test de connexion Firestore (projets)...');
      const projectRef = collection(db, this.collectionName);
      const q = query(projectRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      console.log('✅ Connexion Firestore OK (projets) - ' + snapshot.docs.length + ' projets trouvés');
      return { success: true };
    } catch (error: any) {
      console.error('❌ Échec du test de connexion Firestore (projets):', error);

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

  // Ajouter un nouveau projet
  async addProject(projectData: Omit<FirebaseProject, 'id' | 'createdAt'>): Promise<string> {
    try {
      console.log('Ajout projet dans Firebase:', projectData);
      const projectRef = collection(db, this.collectionName);
      const newProject = {
        ...projectData,
        createdAt: Timestamp.now()
      };

      console.log('Données projet pour Firebase:', newProject);
      const docRef = await addDoc(projectRef, newProject);
      console.log('Projet ajouté avec ID:', docRef.id);
      return docRef.id;
    } catch (error: any) {
      console.error('❌ Erreur lors de l\'ajout du projet:', error);

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

  // Récupérer tous les projets
  async getProjects(): Promise<FirebaseProject[]> {
    const projectRef = collection(db, this.collectionName);
    const q = query(projectRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as FirebaseProject));
  }

  // Mettre à jour un projet
  async updateProject(id: string, updates: Partial<Omit<FirebaseProject, 'id' | 'createdAt'>>): Promise<void> {
    try {
      console.log('Mise à jour projet dans Firebase:', { id, updates });
      const projectRef = doc(db, this.collectionName, id);
      await updateDoc(projectRef, updates);
      console.log('Projet mis à jour avec succès:', id);
    } catch (error: any) {
      console.error('❌ Erreur lors de la mise à jour du projet:', error);

      // Gérer spécifiquement l'erreur ERR_BLOCKED_BY_CLIENT
      if (error.message?.includes('ERR_BLOCKED_BY_CLIENT') ||
          error.code === 'network-request-failed' ||
          error.message?.includes('Failed to fetch')) {

        console.error('🚫 Connexion Firestore bloquée - vérifiez vos extensions de navigateur');
        throw new Error('Connexion bloquée par le navigateur. Désactivez temporairement vos extensions (ad-blockers) et réessayez.');
      }

      // Gérer spécifiquement les erreurs de permissions
      if (error.message?.includes('Missing or insufficient permissions')) {
        console.error('🔒 Permissions insuffisantes pour modifier ce projet');
        throw new Error('Permissions insuffisantes. Vérifiez vos droits d\'accès.');
      }

      // Re-lancer l'erreur pour les autres cas
      throw error;
    }
  }

  // Supprimer un projet
  async deleteProject(id: string): Promise<void> {
    try {
      console.log('Suppression projet dans Firebase:', id);

      // Récupérer le projet pour supprimer ses images
      const projects = await this.getProjects();
      const project = projects.find(p => p.id === id);

      // Supprimer les images du Storage
      if (project?.images && project.images.length > 0) {
        console.log(`Suppression de ${project.images.length} images du Storage`);
        for (const imageUrl of project.images) {
          try {
            await storageService.deleteImage(imageUrl);
            console.log('Image supprimée:', imageUrl);
          } catch (error) {
            console.warn('Erreur suppression image:', error);
          }
        }
      }

      // Supprimer le document Firestore
      const projectRef = doc(db, this.collectionName, id);
      await deleteDoc(projectRef);
      console.log('Projet supprimé avec succès:', id);
    } catch (error: any) {
      console.error('❌ Erreur lors de la suppression du projet:', error);

      // Gérer spécifiquement l'erreur ERR_BLOCKED_BY_CLIENT
      if (error.message?.includes('ERR_BLOCKED_BY_CLIENT') ||
          error.code === 'network-request-failed' ||
          error.message?.includes('Failed to fetch')) {

        console.error('🚫 Connexion Firestore bloquée - vérifiez vos extensions de navigateur');
        throw new Error('Connexion bloquée par le navigateur. Désactivez temporairement vos extensions (ad-blockers) et réessayez.');
      }

      // Gérer spécifiquement les erreurs de permissions
      if (error.message?.includes('Missing or insufficient permissions')) {
        console.error('🔒 Permissions insuffisantes pour supprimer ce projet');
        throw new Error('Permissions insuffisantes. Vérifiez vos droits d\'accès.');
      }

      // Re-lancer l'erreur pour les autres cas
      throw error;
    }
  }

  // Écouter les changements en temps réel
  subscribeToProjects(callback: (projects: FirebaseProject[]) => void): () => void {
    const projectRef = collection(db, this.collectionName);
    const q = query(projectRef, orderBy('createdAt', 'desc'));

    return onSnapshot(q, (snapshot) => {
      const projects = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as FirebaseProject));
      callback(projects);
    });
  }

  // Rechercher par type
  async getProjectsByType(type: string): Promise<FirebaseProject[]> {
    const projectRef = collection(db, this.collectionName);
    const snapshot = await getDocs(projectRef);

    return snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      } as FirebaseProject))
      .filter(project => project.type === type);
  }

  // Upload multiple images pour un projet
  async uploadProjectImages(files: File[], projectId?: string): Promise<string[]> {
    const folderPath = projectId ? `projects/${projectId}` : 'projects/temp';
    const uploadPromises = files.map(file =>
      storageService.uploadImage(file, folderPath)
    );

    return Promise.all(uploadPromises);
  }
}

export const projectService = new ProjectService();