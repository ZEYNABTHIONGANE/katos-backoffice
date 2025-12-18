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
import type { FirebaseMaterial } from '../types/firebase';

export class MaterialService {
  private collectionName = 'materials';

  // Tester la connexion Firestore
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔍 Test de connexion Firestore (matériaux)...');
      const materialRef = collection(db, this.collectionName);
      const q = query(materialRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      console.log('✅ Connexion Firestore OK (matériaux) - ' + snapshot.docs.length + ' matériaux trouvés');
      return { success: true };
    } catch (error: any) {
      console.error('❌ Échec du test de connexion Firestore (matériaux):', error);

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

  // Ajouter un nouveau matériau
  async addMaterial(materialData: Omit<FirebaseMaterial, 'id' | 'createdAt'>): Promise<string> {
    try {
      console.log('Ajout matériau dans Firebase:', materialData);
      const materialRef = collection(db, this.collectionName);
      const newMaterial = {
        ...materialData,
        createdAt: Timestamp.now()
      };

      console.log('Données matériau pour Firebase:', newMaterial);
      const docRef = await addDoc(materialRef, newMaterial);
      console.log('Matériau ajouté avec ID:', docRef.id);
      return docRef.id;
    } catch (error: any) {
      console.error('❌ Erreur lors de l\'ajout du matériau:', error);

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

  // Récupérer tous les matériaux
  async getMaterials(): Promise<FirebaseMaterial[]> {
    const materialRef = collection(db, this.collectionName);
    const q = query(materialRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as FirebaseMaterial));
  }

  // Mettre à jour un matériau
  async updateMaterial(id: string, updates: Partial<Omit<FirebaseMaterial, 'id' | 'createdAt'>>): Promise<void> {
    try {
      console.log('Mise à jour matériau dans Firebase:', { id, updates });
      const materialRef = doc(db, this.collectionName, id);
      await updateDoc(materialRef, updates);
      console.log('Matériau mis à jour avec succès:', id);
    } catch (error: any) {
      console.error('❌ Erreur lors de la mise à jour du matériau:', error);

      // Gérer spécifiquement l'erreur ERR_BLOCKED_BY_CLIENT
      if (error.message?.includes('ERR_BLOCKED_BY_CLIENT') ||
          error.code === 'network-request-failed' ||
          error.message?.includes('Failed to fetch')) {

        console.error('🚫 Connexion Firestore bloquée - vérifiez vos extensions de navigateur');
        throw new Error('Connexion bloquée par le navigateur. Désactivez temporairement vos extensions (ad-blockers) et réessayez.');
      }

      // Gérer spécifiquement les erreurs de permissions
      if (error.message?.includes('Missing or insufficient permissions')) {
        console.error('🔒 Permissions insuffisantes pour modifier ce matériau');
        throw new Error('Permissions insuffisantes. Vérifiez vos droits d\'accès.');
      }

      // Re-lancer l'erreur pour les autres cas
      throw error;
    }
  }

  // Supprimer un matériau
  async deleteMaterial(id: string): Promise<void> {
    try {
      console.log('Suppression matériau dans Firebase:', id);
      const materialRef = doc(db, this.collectionName, id);
      await deleteDoc(materialRef);
      console.log('Matériau supprimé avec succès:', id);
    } catch (error: any) {
      console.error('❌ Erreur lors de la suppression du matériau:', error);

      // Gérer spécifiquement l'erreur ERR_BLOCKED_BY_CLIENT
      if (error.message?.includes('ERR_BLOCKED_BY_CLIENT') ||
          error.code === 'network-request-failed' ||
          error.message?.includes('Failed to fetch')) {

        console.error('🚫 Connexion Firestore bloquée - vérifiez vos extensions de navigateur');
        throw new Error('Connexion bloquée par le navigateur. Désactivez temporairement vos extensions (ad-blockers) et réessayez.');
      }

      // Gérer spécifiquement les erreurs de permissions
      if (error.message?.includes('Missing or insufficient permissions')) {
        console.error('🔒 Permissions insuffisantes pour supprimer ce matériau');
        throw new Error('Permissions insuffisantes. Vérifiez vos droits d\'accès.');
      }

      // Re-lancer l'erreur pour les autres cas
      throw error;
    }
  }

  // Écouter les changements en temps réel
  subscribeToMaterials(callback: (materials: FirebaseMaterial[]) => void): () => void {
    const materialRef = collection(db, this.collectionName);
    const q = query(materialRef, orderBy('createdAt', 'desc'));

    return onSnapshot(q, (snapshot) => {
      const materials = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as FirebaseMaterial));
      callback(materials);
    });
  }

  // Rechercher par catégorie
  async getMaterialsByCategory(category: string): Promise<FirebaseMaterial[]> {
    const materialRef = collection(db, this.collectionName);
    const snapshot = await getDocs(materialRef);

    return snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      } as FirebaseMaterial))
      .filter(material => material.category === category);
  }
}

export const materialService = new MaterialService();