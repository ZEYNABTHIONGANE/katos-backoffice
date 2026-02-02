import {
  collection,
  query,
  where,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  orderBy,
  Timestamp,
  writeBatch,
  getDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { cloudinaryService } from './cloudinaryService';
import type { UnifiedDocument, DocumentNotification, DocumentStats, UnifiedDocumentType } from '../types/documents';
import { chantierService } from './chantierService';

export class UnifiedDocumentService {
  private documentsCollection = 'documents';
  private notificationsCollection = 'documentNotifications';

  // Créer un document (depuis backoffice - envoi aux clients)
  async createDocumentForClient(
    clientId: string,
    file: File,
    documentData: Partial<UnifiedDocument>,
    createdBy: string,
    chantierId?: string
  ): Promise<string> {
    try {
      // 1. Upload du fichier vers Cloudinary
      const downloadURL = await cloudinaryService.uploadFile(file, (file.type.includes('video') || file.name.match(/\.(mp4|mov|avi)$/i)) ? 'video' : 'image');

      // 2. Créer l'entrée document
      const docRef = collection(db, this.documentsCollection);
      const newDocument: Omit<UnifiedDocument, 'id'> = {
        clientId,
        chantierId: chantierId || documentData.chantierId, // Use passed ID or from data
        name: documentData.name || file.name,
        originalName: file.name,
        type: documentData.type || 'other',
        mimeType: file.type,
        size: file.size,
        url: downloadURL,
        description: documentData.description,
        source: 'admin_upload',
        visibility: documentData.visibility || 'both', // Default to 'both'
        status: 'active',
        isVisible: true,
        isDeleted: false,
        isReadOnly: true, // Documents envoyés par admin sont en lecture seule
        allowClientDownload: true,
        requiresApproval: false,
        version: 1,
        uploadedAt: Timestamp.now(),
        uploadedBy: createdBy,
        ...documentData
      };

      const docDocRef = await addDoc(docRef, newDocument);

      // 3. Créer une notification pour le client
      await this.createDocumentNotification(
        docDocRef.id,
        clientId,
        'new_document',
        'Nouveau document reçu',
        `Un nouveau document "${newDocument.name}" vous a été envoyé.`,
        {
          documentName: newDocument.name,
          documentType: newDocument.type,
          senderName: 'Équipe KATOS'
        }
      );

      return docDocRef.id;
    } catch (error) {
      console.error('Erreur lors de la création du document:', error);
      throw error;
    }
  }

  // Récupérer tous les documents d'un client (pour backoffice)
  async getClientDocuments(clientId: string): Promise<UnifiedDocument[]> {
    try {
      // 1. Fetch standard documents
      const q = query(
        collection(db, this.documentsCollection),
        where('clientId', '==', clientId),
        where('status', '==', 'active'),
        orderBy('uploadedAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const documents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UnifiedDocument[];

      // 2. Fetch chef media from chantier gallery
      try {
        const chantier = await chantierService.getClientChantier(clientId);
        if (chantier && chantier.gallery && chantier.gallery.length > 0) {
          const galleryDocs: UnifiedDocument[] = chantier.gallery.map(media => ({
            id: media.id,
            clientId: clientId,
            chantierId: chantier.id,
            name: media.description || (media.type === 'video' ? 'Vidéo chantier' : 'Photo chantier'),
            originalName: media.url.split('/').pop() || 'media',
            type: (media.type === 'image' ? 'photo' : 'video') as UnifiedDocumentType, // Map video/image to DocumentType
            mimeType: media.type === 'video' ? 'video/mp4' : 'image/jpeg', // Approximation
            size: 0, // Unknown size
            url: media.url,
            thumbnailUrl: media.thumbnailUrl,
            description: media.description,
            source: 'chef_upload',
            visibility: 'both',
            status: 'active',
            isVisible: true,
            isDeleted: false,
            isReadOnly: true,
            allowClientDownload: true,
            requiresApproval: false,
            version: 1,
            uploadedAt: media.uploadedAt,
            uploadedBy: media.uploadedBy
          }));

          // Merge and sort
          const allDocs = [...documents, ...galleryDocs];
          return allDocs.sort((a, b) => {
            const dateA = a.uploadedAt?.toDate?.() || new Date();
            const dateB = b.uploadedAt?.toDate?.() || new Date();
            return dateB.getTime() - dateA.getTime();
          });
        }
      } catch (chantierError) {
        console.warn('Could not fetch chantier gallery for documents:', chantierError);
        // Continue with just documents if chantier fetch fails
      }

      return documents;
    } catch (error) {
      console.error('Erreur lors de la récupération des documents:', error);
      throw error;
    }
  }

  // Récupérer uniquement les documents visibles par le client (pour mobile)
  async getClientVisibleDocuments(clientId: string): Promise<UnifiedDocument[]> {
    try {
      const q = query(
        collection(db, this.documentsCollection),
        where('clientId', '==', clientId),
        where('status', '==', 'active'),
        where('visibility', 'in', ['client_only', 'both']),
        orderBy('uploadedAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UnifiedDocument[];
    } catch (error) {
      console.error('Erreur lors de la récupération des documents visibles:', error);
      throw error;
    }
  }

  // Écouter les documents d'un client en temps réel (pour mobile)
  subscribeToClientDocuments(
    clientId: string,
    callback: (documents: UnifiedDocument[]) => void,
    adminView: boolean = false
  ): () => void {
    const constraints = [
      where('clientId', '==', clientId),
      where('status', '==', 'active')
    ];

    // Pour la vue mobile, filtrer par visibilité
    if (!adminView) {
      constraints.push(where('visibility', 'in', ['client_only', 'both']));
    }

    const q = query(
      collection(db, this.documentsCollection),
      ...constraints,
      orderBy('uploadedAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const documents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UnifiedDocument[];
      callback(documents);
    });
  }

  // Migrer un document client upload vers le système unifié
  async migrateClientDocument(
    oldDocumentData: any,
    clientId: string
  ): Promise<string> {
    const docRef = collection(db, this.documentsCollection);
    const newDocument: Omit<UnifiedDocument, 'id'> = {
      clientId,
      name: oldDocumentData.name,
      originalName: oldDocumentData.name,
      type: oldDocumentData.type || 'other',
      mimeType: oldDocumentData.mimeType,
      size: oldDocumentData.size,
      url: oldDocumentData.url,
      description: oldDocumentData.description,
      source: 'client_upload',
      visibility: 'both', // Documents clients visibles par admin et client
      status: 'active',
      isReadOnly: false, // Clients peuvent encore gérer leurs anciens documents
      allowClientDownload: true,
      requiresApproval: true, // Documents clients nécessitent approbation
      isApproved: true, // Considérer les anciens comme approuvés
      version: 1,
      uploadedAt: oldDocumentData.uploadedAt || Timestamp.now(),
      uploadedBy: clientId
    };

    const docDocRef = await addDoc(docRef, newDocument);
    return docDocRef.id;
  }

  // Approuver un document client
  async approveDocument(documentId: string, approvedBy: string): Promise<void> {
    const docRef = doc(db, this.documentsCollection, documentId);
    await updateDoc(docRef, {
      isApproved: true,
      approvedBy,
      approvedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });

    // Notifier le client
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const docData = docSnap.data() as UnifiedDocument;
      await this.createDocumentNotification(
        documentId,
        docData.clientId,
        'document_approved',
        'Document approuvé',
        `Votre document "${docData.name}" a été approuvé.`,
        {
          documentName: docData.name,
          documentType: docData.type
        }
      );
    }
  }

  // Supprimer un document (soft delete)
  async deleteDocument(documentId: string, deletedBy: string, reason?: string): Promise<void> {
    const docRef = doc(db, this.documentsCollection, documentId);
    await updateDoc(docRef, {
      status: 'deleted',
      deletedAt: Timestamp.now(),
      deletedBy,
      deleteReason: reason,
      updatedAt: Timestamp.now()
    });
  }

  // Créer une notification de document
  private async createDocumentNotification(
    documentId: string,
    clientId: string,
    type: DocumentNotification['type'],
    title: string,
    message: string,
    metadata?: DocumentNotification['metadata']
  ): Promise<void> {
    const notificationRef = collection(db, this.notificationsCollection);
    const notification: Omit<DocumentNotification, 'id'> = {
      documentId,
      clientId,
      type,
      title,
      message,
      isRead: false,
      createdAt: Timestamp.now(),
      metadata
    };

    await addDoc(notificationRef, notification);
  }

  // Récupérer les notifications de documents pour un client
  async getClientDocumentNotifications(clientId: string): Promise<DocumentNotification[]> {
    try {
      const q = query(
        collection(db, this.notificationsCollection),
        where('clientId', '==', clientId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DocumentNotification[];
    } catch (error) {
      console.error('Erreur lors de la récupération des notifications:', error);
      throw error;
    }
  }

  // Marquer les notifications comme lues
  async markNotificationsAsRead(clientId: string, notificationIds?: string[]): Promise<void> {
    const batch = writeBatch(db);

    if (notificationIds && notificationIds.length > 0) {
      // Marquer des notifications spécifiques
      notificationIds.forEach(id => {
        const notifRef = doc(db, this.notificationsCollection, id);
        batch.update(notifRef, { isRead: true });
      });
    } else {
      // Marquer toutes les notifications non lues du client
      const q = query(
        collection(db, this.notificationsCollection),
        where('clientId', '==', clientId),
        where('isRead', '==', false)
      );

      const snapshot = await getDocs(q);
      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, { isRead: true });
      });
    }

    await batch.commit();
  }

  // Obtenir les statistiques de documents pour un client
  async getClientDocumentStats(clientId: string): Promise<DocumentStats> {
    const documents = await this.getClientDocuments(clientId);

    const stats: DocumentStats = {
      clientId,
      totalDocuments: documents.length,
      documentsByType: {} as Record<any, number>,
      documentsBySource: {} as Record<any, number>,
      pendingApproval: 0,
      approved: 0,
      rejected: 0,
      totalStorageUsed: 0,
      documentsThisWeek: 0,
      documentsThisMonth: 0,
      lastUpdated: Timestamp.now()
    };

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    documents.forEach(doc => {
      // Par type
      stats.documentsByType[doc.type] = (stats.documentsByType[doc.type] || 0) + 1;

      // Par source
      stats.documentsBySource[doc.source] = (stats.documentsBySource[doc.source] || 0) + 1;

      // Approbation
      if (doc.requiresApproval) {
        if (doc.isApproved) {
          stats.approved++;
        } else {
          stats.pendingApproval++;
        }
      }

      // Taille
      stats.totalStorageUsed += doc.size;

      // Activité
      const uploadDate = doc.uploadedAt.toDate();
      if (uploadDate > weekAgo) {
        stats.documentsThisWeek++;
      }
      if (uploadDate > monthAgo) {
        stats.documentsThisMonth++;
      }
    });

    return stats;
  }

  // Utilitaires pour les icônes et couleurs
  getDocumentIcon(type: UnifiedDocument['type']): string {
    const icons = {
      plan: '📋',
      contract: '📄',
      invoice: '🧾',
      photo: '📷',
      report: '📊',
      permit: '🔖',
      progress_update: '📈',
      video: '🎥',
      other: '📎'
    };
    return icons[type] || icons.other;
  }

  getDocumentColor(type: UnifiedDocument['type']): string {
    const colors = {
      plan: 'bg-blue-100 text-blue-800',
      contract: 'bg-green-100 text-green-800',
      invoice: 'bg-yellow-100 text-yellow-800',
      photo: 'bg-purple-100 text-purple-800',
      report: 'bg-orange-100 text-orange-800',
      permit: 'bg-red-100 text-red-800',
      progress_update: 'bg-indigo-100 text-indigo-800',
      video: 'bg-pink-100 text-pink-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[type] || colors.other;
  }

  getDocumentTypeLabel(type: UnifiedDocument['type']): string {
    const labels = {
      plan: 'Plan',
      contract: 'Contrat',
      invoice: 'Facture',
      photo: 'Photo',
      report: 'Rapport',
      permit: 'Permis',
      progress_update: 'Suivi',
      video: 'Vidéo',
      other: 'Autre'
    };
    return labels[type] || labels.other;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export const unifiedDocumentService = new UnifiedDocumentService();