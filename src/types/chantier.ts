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
  plannedStartDate?: Timestamp | null;
  plannedEndDate?: Timestamp | null;
  actualStartDate?: Timestamp | null;
  actualEndDate?: Timestamp | null;

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
  phoneNumber?: string; // Add phoneNumber to match usage in ChantierDetail
  userId?: string; // Add userId to match usage in ChantierDetail
  experience?: string;
  addedAt: Timestamp;
  addedBy: string;
}

export interface ProgressPhoto {
  id: string;
  url: string;
  type: 'image' | 'video'; // Media type
  phaseId?: string; // Optional: link to specific phase
  stepId?: string; // Optional: link to specific step
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
  actualEndDate?: Timestamp | null;

  // Phase management - Updated to use KatosChantierPhase
  phases: KatosChantierPhase[];

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
  coverImage?: string | null; // URL of the cover image
}

// Types pour la structure hiérarchique des phases Katos
export interface PhaseStep {
  id: string;
  name: string;
  description: string;
  status: PhaseStatus;
  progress: number; // 0-100%
  estimatedDuration: number; // en jours
  actualStartDate?: Timestamp | null;
  actualEndDate?: Timestamp | null;
  notes?: string;
  photos?: string[];
}

// Extension de ChantierPhase pour supporter les sous-étapes
export interface KatosChantierPhase extends Omit<ChantierPhase, 'progress'> {
  steps?: PhaseStep[]; // Sous-étapes optionnelles
  progress: number; // Calculé automatiquement à partir des steps si elles existent
  category: 'main' | 'gros_oeuvre' | 'second_oeuvre'; // Catégorie pour regroupement
  order: number; // Ordre d'exécution
}

// Export des phases standards selon la structure Katos
export const KATOS_STANDARD_PHASES: Omit<KatosChantierPhase, 'id' | 'lastUpdated' | 'updatedBy'>[] = [
  {
    name: 'Approvisionnement',
    description: 'Commande et réception des matériaux nécessaires',
    status: 'pending',
    progress: 0,
    category: 'main',
    order: 1,
    assignedTeamMembers: [],
    requiredMaterials: [],
    estimatedDuration: 3,
    photos: [],
    notes: ''
  },

  // GROS ŒUVRE
  {
    name: 'Fondation',
    description: 'Travaux de fondation complets',
    status: 'pending',
    progress: 0,
    category: 'gros_oeuvre',
    order: 2,
    assignedTeamMembers: [],
    requiredMaterials: [],
    estimatedDuration: 10,
    photos: [],
    notes: '',
    steps: [
      {
        id: 'approvisionnement_fondation',
        name: 'Approvisionnement',
        description: 'Commande et réception des matériaux pour la fondation',
        status: 'pending',
        progress: 0,
        estimatedDuration: 2,
        notes: ''
      },
      {
        id: 'implantation',
        name: 'Implantation',
        description: 'Marquage et positionnement des fondations',
        status: 'pending',
        progress: 0,
        estimatedDuration: 1,
        notes: ''
      },
      {
        id: 'terrassement',
        name: 'Terrassement',
        description: 'Excavation et préparation du terrain',
        status: 'pending',
        progress: 0,
        estimatedDuration: 4,
        notes: ''
      },
      {
        id: 'fondation',
        name: 'Fondation',
        description: 'Coulage des fondations',
        status: 'pending',
        progress: 0,
        estimatedDuration: 5,
        notes: ''
      }
    ]
  },
  {
    name: 'Élévation',
    description: 'Construction des murs et structures verticales',
    status: 'pending',
    progress: 0,
    category: 'gros_oeuvre',
    order: 3,
    assignedTeamMembers: [],
    requiredMaterials: [],
    estimatedDuration: 15,
    photos: [],
    notes: '',
    steps: [
      {
        id: 'approvisionnement_elevation',
        name: 'Approvisionnement',
        description: 'Commande et réception des matériaux pour l\'élévation',
        status: 'pending',
        progress: 0,
        estimatedDuration: 2,
        notes: ''
      },
      {
        id: 'maconnerie',
        name: 'Maçonnerie',
        description: 'Construction des murs en maçonnerie',
        status: 'pending',
        progress: 0,
        estimatedDuration: 10,
        notes: ''
      },
      {
        id: 'beton_arme',
        name: 'Éléments béton armé',
        description: 'Mise en place des éléments en béton armé',
        status: 'pending',
        progress: 0,
        estimatedDuration: 5,
        notes: ''
      }
    ]
  },
  {
    name: 'Coulage',
    description: 'Coulage des dalles',
    status: 'pending',
    progress: 0,
    category: 'gros_oeuvre',
    order: 4,
    assignedTeamMembers: [],
    requiredMaterials: [],
    estimatedDuration: 3,
    photos: [],
    notes: '',
    steps: [
      {
        id: 'approvisionnement_coulage',
        name: 'Approvisionnement',
        description: 'Commande et réception des matériaux pour le coulage',
        status: 'pending',
        progress: 0,
        estimatedDuration: 1,
        notes: ''
      },
      {
        id: 'coulage_dalle',
        name: 'Coulage dalle',
        description: 'Coulage de la dalle de plancher',
        status: 'pending',
        progress: 0,
        estimatedDuration: 3,
        notes: ''
      }
    ]
  },
  {
    name: 'Vérification gros œuvre',
    description: 'Contrôle qualité du gros œuvre',
    status: 'pending',
    progress: 0,
    category: 'gros_oeuvre',
    order: 5,
    assignedTeamMembers: [],
    requiredMaterials: [],
    estimatedDuration: 2,
    photos: [],
    notes: ''
  },

  // SECOND ŒUVRE
  {
    name: 'Plomberie',
    description: 'Installation complète de la plomberie',
    status: 'pending',
    progress: 0,
    category: 'second_oeuvre',
    order: 6,
    assignedTeamMembers: [],
    requiredMaterials: [],
    estimatedDuration: 8,
    photos: [],
    notes: '',
    steps: [
      {
        id: 'approvisionnement_plomberie',
        name: 'Approvisionnement',
        description: 'Commande et réception des matériaux de plomberie',
        status: 'pending',
        progress: 0,
        estimatedDuration: 2,
        notes: ''
      },
      {
        id: 'alimentation',
        name: 'Alimentation',
        description: 'Installation du réseau d\'alimentation en eau',
        status: 'pending',
        progress: 0,
        estimatedDuration: 3,
        notes: ''
      },
      {
        id: 'appareillage_plomberie',
        name: 'Appareillage',
        description: 'Installation des appareils sanitaires',
        status: 'pending',
        progress: 0,
        estimatedDuration: 3,
        notes: ''
      },
      {
        id: 'evacuation',
        name: 'Évacuation',
        description: 'Installation du réseau d\'évacuation',
        status: 'pending',
        progress: 0,
        estimatedDuration: 2,
        notes: ''
      }
    ]
  },
  {
    name: 'Électricité',
    description: 'Installation électrique complète',
    status: 'pending',
    progress: 0,
    category: 'second_oeuvre',
    order: 7,
    assignedTeamMembers: [],
    requiredMaterials: [],
    estimatedDuration: 7,
    photos: [],
    notes: '',
    steps: [
      {
        id: 'approvisionnement_electricite',
        name: 'Approvisionnement',
        description: 'Commande et réception des matériaux électriques',
        status: 'pending',
        progress: 0,
        estimatedDuration: 2,
        notes: ''
      },
      {
        id: 'fourretage',
        name: 'Fourretage',
        description: 'Passage des gaines électriques',
        status: 'pending',
        progress: 0,
        estimatedDuration: 2,
        notes: ''
      },
      {
        id: 'cablage',
        name: 'Câblage',
        description: 'Installation des câbles électriques',
        status: 'pending',
        progress: 0,
        estimatedDuration: 3,
        notes: ''
      },
      {
        id: 'appareillage_electrique',
        name: 'Appareillage',
        description: 'Installation des prises et interrupteurs',
        status: 'pending',
        progress: 0,
        estimatedDuration: 2,
        notes: ''
      }
    ]
  },
  {
    name: 'Carrelage',
    description: 'Pose du carrelage',
    status: 'pending',
    progress: 0,
    category: 'second_oeuvre',
    order: 8,
    assignedTeamMembers: [],
    requiredMaterials: [],
    estimatedDuration: 6,
    photos: [],
    notes: '',
    steps: [
      {
        id: 'approvisionnement_carrelage',
        name: 'Approvisionnement',
        description: 'Commande et réception du carrelage et consommables',
        status: 'pending',
        progress: 0,
        estimatedDuration: 2,
        notes: ''
      },
      {
        id: 'pose_carrelage',
        name: 'Pose carrelage',
        description: 'Mise en place du carrelage au sol et aux murs',
        status: 'pending',
        progress: 0,
        estimatedDuration: 4,
        notes: ''
      }
    ]
  },
  {
    name: 'Étanchéité',
    description: 'Travaux d\'étanchéité',
    status: 'pending',
    progress: 0,
    category: 'second_oeuvre',
    order: 9,
    assignedTeamMembers: [],
    requiredMaterials: [],
    estimatedDuration: 3,
    photos: [],
    notes: '',
    steps: [
      {
        id: 'approvisionnement_etancheite',
        name: 'Approvisionnement',
        description: 'Commande et réception des produits d\'étanchéité',
        status: 'pending',
        progress: 0,
        estimatedDuration: 1,
        notes: ''
      },
      {
        id: 'travaux_etancheite',
        name: 'Travaux d\'étanchéité',
        description: 'Application des solutions d\'étanchéité',
        status: 'pending',
        progress: 0,
        estimatedDuration: 2,
        notes: ''
      }
    ]
  },
  {
    name: 'Menuiserie',
    description: 'Installation des menuiseries',
    status: 'pending',
    progress: 0,
    category: 'second_oeuvre',
    order: 10,
    assignedTeamMembers: [],
    requiredMaterials: [],
    estimatedDuration: 5,
    photos: [],
    notes: '',
    steps: [
      {
        id: 'approvisionnement_menuiserie',
        name: 'Approvisionnement',
        description: 'Commande et réception des menuiseries',
        status: 'pending',
        progress: 0,
        estimatedDuration: 2,
        notes: ''
      },
      {
        id: 'pose_menuiserie',
        name: 'Pose menuiserie',
        description: 'Installation des portes et fenêtres',
        status: 'pending',
        progress: 0,
        estimatedDuration: 3,
        notes: ''
      }
    ]
  },
  {
    name: 'Faux plafond',
    description: 'Installation des faux plafonds',
    status: 'pending',
    progress: 0,
    category: 'second_oeuvre',
    order: 11,
    assignedTeamMembers: [],
    requiredMaterials: [],
    estimatedDuration: 4,
    photos: [],
    notes: '',
    steps: [
      {
        id: 'approvisionnement_faux_plafond',
        name: 'Approvisionnement',
        description: 'Commande et réception des matériaux de faux plafond',
        status: 'pending',
        progress: 0,
        estimatedDuration: 2,
        notes: ''
      },
      {
        id: 'pose_faux_plafond',
        name: 'Pose faux plafond',
        description: 'Installation de la structure et des plaques',
        status: 'pending',
        progress: 0,
        estimatedDuration: 2,
        notes: ''
      }
    ]
  },
  {
    name: 'Peinture',
    description: 'Travaux de peinture complets',
    status: 'pending',
    progress: 0,
    category: 'second_oeuvre',
    order: 12,
    assignedTeamMembers: [],
    requiredMaterials: [],
    estimatedDuration: 8,
    photos: [],
    notes: '',
    steps: [
      {
        id: 'approvisionnement_peinture',
        name: 'Approvisionnement',
        description: 'Commande et réception de la peinture et accessoires',
        status: 'pending',
        progress: 0,
        estimatedDuration: 2,
        notes: ''
      },
      {
        id: 'grattage',
        name: 'Grattage',
        description: 'Préparation des surfaces',
        status: 'pending',
        progress: 0,
        estimatedDuration: 2,
        notes: ''
      },
      {
        id: 'couche_primaire',
        name: 'Application couche primaire',
        description: 'Application de la sous-couche',
        status: 'pending',
        progress: 0,
        estimatedDuration: 3,
        notes: ''
      },
      {
        id: 'couche_secondaire',
        name: 'Application couche secondaire',
        description: 'Application de la couche de finition',
        status: 'pending',
        progress: 0,
        estimatedDuration: 3,
        notes: ''
      }
    ]
  },
  {
    name: 'Vérification second œuvre',
    description: 'Contrôle qualité du second œuvre',
    status: 'pending',
    progress: 0,
    category: 'second_oeuvre',
    order: 13,
    assignedTeamMembers: [],
    requiredMaterials: [],
    estimatedDuration: 2,
    photos: [],
    notes: ''
  },
  {
    name: 'Clef en main',
    description: 'Livraison finale du projet',
    status: 'pending',
    progress: 0,
    category: 'main',
    order: 14,
    assignedTeamMembers: [],
    requiredMaterials: [],
    estimatedDuration: 1,
    photos: [],
    notes: ''
  }
];

// Fonction pour calculer le progrès d'une phase avec sous-étapes
export const calculatePhaseProgress = (phase: KatosChantierPhase): number => {
  if (!phase.steps || phase.steps.length === 0) {
    return phase.progress;
  }

  const totalStepProgress = phase.steps.reduce((sum, step) => sum + step.progress, 0);
  return Math.round(totalStepProgress / phase.steps.length);
};

// Fonction pour obtenir toutes les phases par catégorie
export const getPhasesByCategory = (category: 'main' | 'gros_oeuvre' | 'second_oeuvre') => {
  return KATOS_STANDARD_PHASES.filter(phase => phase.category === category);
};

// Utility functions - Updated to support both ChantierPhase and KatosChantierPhase
export const calculateGlobalProgress = (phases: (ChantierPhase | KatosChantierPhase)[]): number => {
  if (phases.length === 0) return 0;

  const totalProgress = phases.reduce((sum, phase) => {
    // If it's a KatosChantierPhase with steps, calculate progress from steps
    if ('steps' in phase && phase.steps && phase.steps.length > 0) {
      return sum + calculatePhaseProgress(phase as KatosChantierPhase);
    }
    // Otherwise use the phase progress directly
    return sum + phase.progress;
  }, 0);

  return Math.round(totalProgress / phases.length);
};

export const getChantierStatus = (phases: (ChantierPhase | KatosChantierPhase)[], plannedEndDate: Timestamp): ChantierStatus => {
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