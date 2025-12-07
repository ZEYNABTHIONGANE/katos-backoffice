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
  localisationSite: string;
  projetAdhere: string;
  status: 'En cours' | 'Terminé' | 'En attente';
  invitationStatus: 'pending' | 'sent' | 'accepted' | 'declined';
  invitationToken?: string;
  userId?: string;
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