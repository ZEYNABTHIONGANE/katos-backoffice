export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Client {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  adresse?: string;
  localisationSite: string;
  projetAdhere: string;
  status: 'En cours' | 'Terminé' | 'En attente';
  isActive: boolean;
  invitationStatus: 'pending' | 'sent' | 'accepted' | 'declined';
  invitationToken?: string;
  userId?: string;
  username?: string;
  tempPassword?: string;
  // Facturation
  typePaiement: 'comptant' | 'echeancier';
  createdAt: string;
  invitedAt?: string;
  acceptedAt?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  images: string[];
  type: string;
  // Facturation
  price: number; // Prix du projet en FCFA
  currency: string; // 'FCFA'
  // Caractéristiques
  surface?: number;
  bedrooms?: number;
  bathrooms?: number;
}

export interface Material {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  supplier: string;
  description: string;
}

export interface ClientDocument {
  id: string;
  clientId: string;
  name: string;
  type: 'plan' | 'contract' | 'photo' | 'other';
  url: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
  description?: string;
}

export interface Notification {
  id: string;
  type: 'document_upload' | 'material_selection' | 'client_update';
  title: string;
  message: string;
  clientId: string;
  clientName: string;
  isRead: boolean;
  createdAt: string;
  data?: {
    documentName?: string;
    materialName?: string;
    materialId?: string;
    [key: string]: any;
  };
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
}

export interface ClientState {
  clients: Client[];
  addClient: (client: Omit<Client, 'id' | 'createdAt'>) => void;
  updateClient: (id: string, client: Partial<Client>) => void;
  deleteClient: (id: string) => void;
}

export interface MaterialState {
  materials: Material[];
  addMaterial: (material: Omit<Material, 'id'>) => void;
  updateMaterial: (id: string, material: Partial<Material>) => void;
  deleteMaterial: (id: string) => void;
}

export interface ProjectState {
  projects: Project[];
  addProject: (project: Omit<Project, 'id'>) => void;
  updateProject: (id: string, project: Partial<Project>) => void;
  deleteProject: (id: string) => void;
}

export interface ClientSelection {
  id: string;
  clientId: string;
  clientName?: string;
  chantierId?: string;
  selections: {
    materialId: string;
    materialName: string;
    materialCategory: string;
    materialPrice: number;
    materialImageUrl: string;
    selectedAt: string;
  }[];
  totalAmount: number;
  status: 'submitted' | 'under_review' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientSelectionState {
  clientSelections: ClientSelection[];
  updateSelectionStatus: (id: string, status: ClientSelection['status'], notes?: string) => void;
}

// Système de facturation
export interface EcheancePaiement {
  id: string;
  clientId: string;
  projectId: string;
  numeroEcheance: number; // 1, 2, 3, etc.
  montant: number;
  dateEcheance: string;
  datePaiement?: string;
  status: 'en_attente' | 'paye' | 'en_retard';
  methodePaiement?: 'especes' | 'virement' | 'cheque' | 'mobile_money';
  referencePaiement?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FacturationClient {
  id: string;
  clientId: string;
  projectId: string;
  montantTotal: number;
  typePaiement: 'comptant' | 'echeancier';
  // Pour paiement comptant
  montantPaye?: number;
  datePaiementComptant?: string;
  // Pour échéancier
  nombreEcheances?: number;
  montantParEcheance?: number;
  premierePaiement?: string; // Date du premier paiement
  echeances?: EcheancePaiement[];
  status: 'en_cours' | 'termine' | 'en_retard';
  createdAt: string;
  updatedAt: string;
}

export interface FacturationState {
  facturations: FacturationClient[];
  echeances: EcheancePaiement[];
  addFacturation: (facturation: Omit<FacturationClient, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateEcheanceStatus: (id: string, status: EcheancePaiement['status'], datePaiement?: string) => void;
  getEcheancesClient: (clientId: string) => EcheancePaiement[];
}

// Re-export des types pour la facturation moderne
export type {
  Invoice,
  PaymentHistory,
  PaymentSchedule,
  ClientPaymentDashboard,
  InvoiceItem,
  PaymentInstallment
} from './billing';

// Re-export des types pour les documents unifiés
export type {
  UnifiedDocument,
  DocumentNotification,
  DocumentStats,
  UnifiedDocumentType,
  DocumentSource,
  DocumentVisibility,
  DocumentStatus,
  DocumentCategory,
  DocumentUploadConfig
} from './documents';