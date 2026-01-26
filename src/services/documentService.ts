import {
  collection,
  query,
  where,
  getDocs,
  doc,
  deleteDoc,
  onSnapshot,
  orderBy
} from 'firebase/firestore';
import { deleteObject, ref } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import type { ClientDocument } from '../types';

export const documentService = {
  // Récupérer tous les documents d'un client
  async getClientDocuments(clientId: string): Promise<ClientDocument[]> {
    try {
      const q = query(
        collection(db, 'clientDocuments'),
        where('clientId', '==', clientId),
        orderBy('uploadedAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ClientDocument[];
    } catch (error) {
      console.error('Erreur lors de la récupération des documents:', error);
      throw error;
    }
  },

  // Écouter les documents d'un client en temps réel
  subscribeToClientDocuments(
    clientId: string,
    callback: (documents: ClientDocument[]) => void
  ) {
    const q = query(
      collection(db, 'clientDocuments'),
      where('clientId', '==', clientId),
      orderBy('uploadedAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const documents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ClientDocument[];
      callback(documents);
    });
  },

  // Supprimer un document
  async deleteDocument(documentId: string, documentUrl: string): Promise<void> {
    try {
      // Supprimer le document de Firestore
      await deleteDoc(doc(db, 'clientDocuments', documentId));

      // Supprimer le fichier de Storage
      if (documentUrl) {
        const fileRef = ref(storage, documentUrl);
        await deleteObject(fileRef);
      }
    } catch (error) {
      console.error('Erreur lors de la suppression du document:', error);
      throw error;
    }
  },

  // Formater la taille du fichier
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // Obtenir l'icône selon le type de fichier
  getFileIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📊';
    return '📎';
  },

  // Obtenir la couleur selon le type de document
  getDocumentTypeColor(type: ClientDocument['type']): string {
    switch (type) {
      case 'plan': return 'bg-blue-100 text-blue-800';
      case 'contract': return 'bg-green-100 text-green-800';
      case 'photo': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  },

  // Obtenir le label français du type
  getDocumentTypeLabel(type: ClientDocument['type']): string {
    switch (type) {
      case 'plan': return 'Plan';
      case 'contract': return 'Contrat';
      case 'photo': return 'Photo';
      case 'other': return 'Autre';
      default: return 'Document';
    }
  }
};