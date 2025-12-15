import { Timestamp } from 'firebase/firestore';

// Système de documents unifié pour coordonner backoffice et mobile
export type UnifiedDocumentType =
  | 'plan'
  | 'contract'
  | 'invoice'
  | 'photo'
  | 'report'
  | 'permit'
  | 'progress_update'
  | 'video'
  | 'other';

export type DocumentSource = 'client_upload' | 'admin_upload' | 'chef_upload';
export type DocumentVisibility = 'client_only' | 'admin_only' | 'both';
export type DocumentStatus = 'active' | 'archived' | 'deleted';

// Document unifié qui remplace clientDocuments
export interface UnifiedDocument {
  id?: string;

  // Références
  clientId: string;
  chantierId?: string;
  projectId?: string;
  invoiceId?: string; // Lié à une facture spécifique

  // Informations du fichier
  name: string;
  originalName: string;
  type: UnifiedDocumentType;
  mimeType: string;
  size: number;
  url: string; // Firebase Storage URL
  thumbnailUrl?: string; // Pour les images

  // Métadonnées
  description?: string;
  tags?: string[];
  category?: string;

  // Contrôle d'accès
  source: DocumentSource; // Qui a uploadé le document
  visibility: DocumentVisibility; // Qui peut voir le document
  status: DocumentStatus;

  // Permissions spéciales
  isReadOnly: boolean; // Le client ne peut pas modifier/supprimer
  allowClientDownload: boolean;
  requiresApproval: boolean; // Document client nécessite approbation admin
  isApproved?: boolean;
  approvedBy?: string;
  approvedAt?: Timestamp;

  // Dates
  uploadedAt: Timestamp;
  uploadedBy: string; // User ID
  updatedAt?: Timestamp;
  updatedBy?: string;

  // Version et historique
  version: number;
  previousVersionId?: string;

  // Soft delete
  deletedAt?: Timestamp;
  deletedBy?: string;
  deleteReason?: string;

  // Compatibility with mobile app
  isVisible?: boolean;
  isDeleted?: boolean;
}

// Catégories pour organiser les documents côté mobile
export interface DocumentCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  description?: string;
  allowClientUpload: boolean; // Le client peut-il uploader dans cette catégorie
  order: number;
}

// Notification pour nouveaux documents
export interface DocumentNotification {
  id?: string;
  documentId: string;
  clientId: string;
  type: 'new_document' | 'document_approved' | 'document_updated';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Timestamp;
  metadata?: {
    documentName: string;
    documentType: string;
    senderName?: string;
  };
}

// Configuration pour l'upload côté mobile
export interface DocumentUploadConfig {
  clientId: string;

  // Types autorisés pour le client
  allowedTypes: UnifiedDocumentType[];

  // Limites d'upload
  maxFileSize: number; // en bytes
  maxFilesPerDay: number;
  allowedMimeTypes: string[];

  // Restrictions
  requiresApproval: boolean;
  autoArchiveAfterDays?: number;

  // Dernière mise à jour
  updatedAt: Timestamp;
  updatedBy: string;
}

// Statistiques pour le dashboard admin
export interface DocumentStats {
  clientId: string;

  // Totaux
  totalDocuments: number;
  documentsByType: Record<UnifiedDocumentType, number>;
  documentsBySource: Record<DocumentSource, number>;

  // Status
  pendingApproval: number;
  approved: number;
  rejected: number;

  // Taille
  totalStorageUsed: number; // en bytes

  // Activité récente
  documentsThisWeek: number;
  documentsThisMonth: number;

  // Dernière mise à jour
  lastUpdated: Timestamp;
}