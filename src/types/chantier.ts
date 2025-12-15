import { Timestamp } from 'firebase/firestore';

export type ChantierStatus = 'En attente' | 'En cours' | 'Terminé' | 'En retard';
export type PhaseStatus = 'pending' | 'in-progress' | 'completed' | 'blocked';

export interface ChantierPhase {
  id: string;
  name: string;
  description: string;
  status: PhaseStatus;
  progress: number; // 0-100%

  // Planning
  plannedStartDate?: Timestamp;
  plannedEndDate?: Timestamp;
  actualStartDate?: Timestamp;
  actualEndDate?: Timestamp;

  // Resources
  assignedTeamMembers: string[]; // Team member IDs
  requiredMaterials: RequiredMaterial[];
  estimatedDuration: number; // in days

  // Progress tracking
  notes?: string;
  photos: string[]; // Photo URLs for this phase
  lastUpdated: Timestamp;
  updatedBy: string; // Chef who last updated
}

export interface TeamMember {
  id: string;
  name: string;
  role: string; // Maçon, Électricien, Plombier, etc.
  phone?: string;
  experience?: string;
  addedAt: Timestamp;
  addedBy: string;
}

export interface ProgressPhoto {
  id: string;
  url: string;
  type: 'image' | 'video'; // Media type
  phaseId?: string; // Optional: link to specific phase
  description?: string;
  uploadedAt: Timestamp;
  uploadedBy: string;
  duration?: number; // Video duration in seconds (for videos only)
  thumbnailUrl?: string; // Video thumbnail URL (for videos only)
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface ProgressUpdate {
  id: string;
  title: string;
  description: string;
  type: 'phase_completion' | 'issue' | 'delivery' | 'milestone';
  relatedPhaseId?: string;
  photos: string[];
  createdAt: Timestamp;
  createdBy: string;
  isVisibleToClient: boolean;
}

export interface RequiredMaterial {
  materialId: string; // Reference to materials collection
  quantity: number;
  unit: string;
  status: 'ordered' | 'delivered' | 'installed';
  deliveryDate?: Timestamp;
}

export interface FirebaseChantier {
  id?: string;
  clientId: string; // Reference to client
  projectTemplateId: string; // Reference to base project template
  name: string; // Client-specific name (e.g., "Chantier Moussa Diop - Villa Amina")
  address: string; // Actual construction site address
  status: ChantierStatus;
  globalProgress: number; // 0-100% calculated from phases
  startDate: Timestamp;
  plannedEndDate: Timestamp;
  actualEndDate?: Timestamp;

  // Phase management
  phases: ChantierPhase[];

  // Team and resources
  assignedChefId: string; // Site manager/chef de chantier
  team: TeamMember[];

  // Progress documentation
  gallery: ProgressPhoto[];
  updates: ProgressUpdate[];

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string; // Admin who created the chantier
  coverImage?: string; // URL of the cover image
}

// Export des phases standards basées sur l'analyse de l'app mobile
export const STANDARD_PHASES: Omit<ChantierPhase, 'id' | 'lastUpdated' | 'updatedBy'>[] = [
  {
    name: 'Fondations',
    description: 'Terrassement et coulage des fondations',
    status: 'pending',
    progress: 0,
    assignedTeamMembers: [],
    requiredMaterials: [],
    estimatedDuration: 14, // 2 semaines
    photos: [],
    notes: ''
  },
  {
    name: 'Gros œuvre',
    description: 'Construction de la structure principale',
    status: 'pending',
    progress: 0,
    assignedTeamMembers: [],
    requiredMaterials: [],
    estimatedDuration: 30, // 1 mois
    photos: [],
    notes: ''
  },
  {
    name: 'Toiture',
    description: 'Installation de la charpente et couverture',
    status: 'pending',
    progress: 0,
    assignedTeamMembers: [],
    requiredMaterials: [],
    estimatedDuration: 10, // 10 jours
    photos: [],
    notes: ''
  },

  {
    name: 'Finitions',
    description: 'Peinture, carrelage et finitions intérieures',
    status: 'pending',
    progress: 0,
    assignedTeamMembers: [],
    requiredMaterials: [],
    estimatedDuration: 20, // ~3 semaines
    photos: [],
    notes: ''
  }
];

// Utility functions
export const calculateGlobalProgress = (phases: ChantierPhase[]): number => {
  if (phases.length === 0) return 0;
  const totalProgress = phases.reduce((sum, phase) => sum + phase.progress, 0);
  return Math.round(totalProgress / phases.length);
};

export const getChantierStatus = (phases: ChantierPhase[], plannedEndDate: Timestamp): ChantierStatus => {
  const globalProgress = calculateGlobalProgress(phases);
  const now = new Date();
  const endDate = plannedEndDate.toDate();

  if (globalProgress === 100) return 'Terminé';
  if (globalProgress === 0) return 'En attente';
  if (now > endDate && globalProgress < 100) return 'En retard';
  return 'En cours';
};

export const getPhaseStatus = (progress: number): PhaseStatus => {
  if (progress === 0) return 'pending';
  if (progress === 100) return 'completed';
  return 'in-progress';
};