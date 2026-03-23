import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  onSnapshot,
  getDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type {
  FirebaseChantier,
  KatosChantierPhase,
  TeamMember,
  ProgressPhoto,
  ProgressUpdate,
  ChantierStatus
} from '../types/chantier';
import { calculateGlobalProgress, getChantierStatus, getPhaseStatus, calculatePhaseProgress } from '../types/chantier';
import { v4 as uuidv4 } from 'uuid';

export class ChantierService {
  private readonly COLLECTION_NAME = 'chantiers';

  // Nettoyer un objet pour Firestore (enlever les undefined)
  private cleanObject(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (obj instanceof Timestamp) return obj;
    if (Array.isArray(obj)) return obj.map(item => this.cleanObject(item));
    if (typeof obj !== 'object') return obj;

    const cleanedObj: any = {};
    Object.keys(obj).forEach(key => {
      const val = obj[key];
      if (val !== undefined) {
        cleanedObj[key] = this.cleanObject(val);
      }
    });
    return cleanedObj;
  }

  // Créer un nouveau chantier à partir d'un template de projet
  async createChantierFromTemplate(
    clientId: string,
    projectTemplateId: string,
    customizations: {
      name: string;
      address: string;
      assignedChefId: string;
      startDate: Date;
      plannedEndDate: Date;
      coverImage?: string;
    },
    createdBy: string
  ): Promise<string> {
    try {
      const { KATOS_STANDARD_PHASES } = await import('../types/chantier');

      // Créer les phases avec IDs uniques et métadonnées
      const phases: KatosChantierPhase[] = KATOS_STANDARD_PHASES.map(phase => {
        const newPhase: KatosChantierPhase = {
          id: uuidv4(),
          name: phase.name,
          description: phase.description,
          status: phase.status,
          progress: phase.progress,
          category: phase.category,
          order: phase.order,
          assignedTeamMembers: phase.assignedTeamMembers,
          requiredMaterials: phase.requiredMaterials,
          estimatedDuration: phase.estimatedDuration,
          photos: phase.photos,
          notes: phase.notes || '',
          lastUpdated: Timestamp.now(),
          updatedBy: createdBy,
          // Champs optionnels avec null au lieu de undefined pour Firestore
          plannedStartDate: null,
          plannedEndDate: null,
          actualStartDate: null,
          actualEndDate: null
        };

        // Ajouter les steps seulement si elles existent, avec des valeurs par défaut
        if (phase.steps && phase.steps.length > 0) {
          newPhase.steps = phase.steps.map(step => ({
            id: uuidv4(),
            name: step.name,
            description: step.description,
            status: step.status,
            progress: step.progress,
            estimatedDuration: step.estimatedDuration,
            notes: step.notes || '',
            actualStartDate: null,
            actualEndDate: null
          }));
        }

        return newPhase;
      });

      const chantierData: Omit<FirebaseChantier, 'id'> = {
        clientId,
        projectTemplateId,
        name: customizations.name,
        address: customizations.address,
        status: 'En attente' as ChantierStatus,
        globalProgress: 0,
        startDate: Timestamp.fromDate(customizations.startDate),
        plannedEndDate: Timestamp.fromDate(customizations.plannedEndDate),
        phases,
        assignedChefId: customizations.assignedChefId,
        team: [],
        gallery: [],
        updates: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy,
        // Champs optionnels avec valeurs par défaut
        coverImage: customizations.coverImage || null,
        actualEndDate: null
      };

      const chantierRef = collection(db, this.COLLECTION_NAME);
      const docRef = await addDoc(chantierRef, chantierData);

      console.log('Chantier créé avec succès:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Erreur lors de la création du chantier:', error);
      throw error;
    }
  }

  // Récupérer un chantier par ID
  async getChantierById(chantierId: string): Promise<FirebaseChantier | null> {
    try {
      const chantierRef = doc(db, this.COLLECTION_NAME, chantierId);
      const snapshot = await getDoc(chantierRef);

      if (!snapshot.exists()) {
        return null;
      }

      return {
        id: snapshot.id,
        ...snapshot.data()
      } as FirebaseChantier;
    } catch (error) {
      console.error('Erreur lors de la récupération du chantier:', error);
      return null;
    }
  }

  // Récupérer le chantier d'un client spécifique
  async getClientChantier(clientId: string): Promise<FirebaseChantier | null> {
    try {
      const chantiersRef = collection(db, this.COLLECTION_NAME);
      const q = query(chantiersRef, where('clientId', '==', clientId));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return null;
      }

      // Un client ne devrait avoir qu'un seul chantier actif
      const chantierDoc = snapshot.docs[0];
      return {
        id: chantierDoc.id,
        ...chantierDoc.data()
      } as FirebaseChantier;
    } catch (error) {
      console.error('Erreur lors de la récupération du chantier client:', error);
      return null;
    }
  }

  // Récupérer tous les chantiers assignés à un chef
  async getChefChantiers(chefId: string): Promise<FirebaseChantier[]> {
    try {
      const chantiersRef = collection(db, this.COLLECTION_NAME);
      const q = query(chantiersRef, where('assignedChefId', '==', chefId), orderBy('updatedAt', 'desc'));
      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as FirebaseChantier));
    } catch (error) {
      console.error('Erreur lors de la récupération des chantiers du chef:', error);
      return [];
    }
  }

  // Récupérer tous les chantiers (pour les admins)
  async getAllChantiers(): Promise<FirebaseChantier[]> {
    try {
      const chantiersRef = collection(db, this.COLLECTION_NAME);
      const q = query(chantiersRef, orderBy('updatedAt', 'desc'));
      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as FirebaseChantier));
    } catch (error) {
      console.error('Erreur lors de la récupération de tous les chantiers:', error);
      return [];
    }
  }

  // Mettre à jour la progression d'une phase
  async updatePhaseProgress(
    chantierId: string,
    phaseId: string,
    progress: number,
    notes?: string,
    updatedBy?: string
  ): Promise<void> {
    try {
      const chantier = await this.getChantierById(chantierId);
      if (!chantier) {
        throw new Error('Chantier non trouvé');
      }

      const updatedPhases = chantier.phases.map(phase => {
        if (phase.id === phaseId) {
          return {
            ...phase,
            progress: Math.max(0, Math.min(100, progress)), // Clamp entre 0 et 100
            status: getPhaseStatus(progress),
            notes: notes || phase.notes,
            lastUpdated: Timestamp.now(),
            updatedBy: updatedBy || 'system'
          };
        }
        return phase;
      });

      const globalProgress = calculateGlobalProgress(updatedPhases);
      const status = getChantierStatus(updatedPhases, chantier.plannedEndDate);

      await this.updateChantier(chantierId, {
        phases: updatedPhases,
        globalProgress,
        status,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la phase:', error);
      throw error;
    }
  }

  // Mettre à jour la progression d'une sous-étape
  async updateStepProgress(
    chantierId: string,
    phaseId: string,
    stepId: string,
    progress: number,
    notes?: string,
    updatedBy?: string
  ): Promise<void> {
    try {
      const chantier = await this.getChantierById(chantierId);
      if (!chantier) {
        throw new Error('Chantier non trouvé');
      }

      const updatedPhases = chantier.phases.map(phase => {
        if (phase.id === phaseId && 'steps' in phase && phase.steps) {
          // Mettre à jour la sous-étape
          const updatedSteps = phase.steps.map(step => {
            if (step.id === stepId) {
              const newProgress = Math.max(0, Math.min(100, progress));
              const now = Timestamp.now();

              return {
                ...step,
                progress: newProgress,
                status: getPhaseStatus(newProgress),
                notes: notes || step.notes,
                updatedBy: updatedBy || 'system',
                // Mettre à jour les dates selon le progrès
                actualStartDate: step.actualStartDate || (newProgress > 0 ? now : null),
                actualEndDate: newProgress >= 100 ? now : (newProgress < 100 ? null : step.actualEndDate)
              };
            }
            return step;
          });

          // Recalculer le progrès de la phase basé sur les sous-étapes
          const phaseProgress = calculatePhaseProgress({ ...phase, steps: updatedSteps });

          return {
            ...phase,
            steps: updatedSteps,
            progress: phaseProgress,
            status: getPhaseStatus(phaseProgress),
            lastUpdated: Timestamp.now(),
            updatedBy: updatedBy || 'system'
          };
        }
        return phase;
      });

      const globalProgress = calculateGlobalProgress(updatedPhases);
      const status = getChantierStatus(updatedPhases, chantier.plannedEndDate);

      await this.updateChantier(chantierId, {
        phases: updatedPhases,
        globalProgress,
        status,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la sous-étape:', error);
      throw error;
    }
  }

  // Ajouter une photo à une phase
  async addPhasePhoto(
    chantierId: string,
    phaseId: string,
    photoUrl: string,
    description?: string,
    uploadedBy?: string,
    stepId?: string
  ): Promise<void> {
    try {
      const chantier = await this.getChantierById(chantierId);
      if (!chantier) {
        throw new Error('Chantier non trouvé');
      }

      let updatedPhases = chantier.phases.map(phase => {
        if (phase.id === phaseId) {
          return {
            ...phase,
            photos: [...phase.photos, photoUrl],
            lastUpdated: Timestamp.now(),
            updatedBy: uploadedBy || 'system'
          };
        }
        return phase;
      });

      // Si un stepId est fourni, ajouter aussi à la sous-étape
      if (stepId) {
        updatedPhases = updatedPhases.map(phase => {
          if (phase.id === phaseId && (phase as any).steps) {
            const steps = (phase as any).steps.map((step: any) => {
              if (step.id === stepId) {
                return {
                  ...step,
                  photos: [...(step.photos || []), photoUrl]
                };
              }
              return step;
            });
            return { ...phase, steps };
          }
          return phase;
        });
      }

      // Ajouter aussi à la galerie générale
      const newPhoto: ProgressPhoto = {
        id: uuidv4(),
        url: photoUrl,
        type: 'image',
        phaseId,
        stepId,
        description,
        uploadedAt: Timestamp.now(),
        uploadedBy: uploadedBy || 'system'
      };

      await this.updateChantier(chantierId, {
        phases: updatedPhases,
        gallery: [...chantier.gallery, newPhoto],
        updatedAt: Timestamp.now()
      });

      // Notifier le client et le backoffice
      try {
        const { notificationService } = await import('./notificationService');
        const phaseName = updatedPhases.find(p => p.id === phaseId)?.name;
        const mediaType = photoUrl.match(/\.(mp4|mov|avi|webm|mkv)(\?|$)/i) ? 'video' : 'photo';

        // 1. Notifier le client
        if (chantier.clientId) {
          await notificationService.notifyMediaUploaded(
            chantier.clientId,
            mediaType,
            chantier.name,
            phaseName,
            'client'
          );
        }

        // 2. Notifier les admins
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const { db } = await import('../config/firebase');
        const adminsQuery = query(
          collection(db, 'users'), 
          where('role', 'in', ['admin', 'super_admin'])
        );
        const adminDocs = await getDocs(adminsQuery);
        
        for (const adminDoc of adminDocs.docs) {
          await notificationService.notifyMediaUploaded(
            adminDoc.id,
            mediaType,
            chantier.name,
            phaseName,
            'backoffice'
          );
        }
      } catch (error) {
        console.error('Erreur lors de l\'envoi des notifications média:', error);
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la photo:', error);
      throw error;
    }
  }

  // Ajouter un membre à l'équipe
  async addTeamMember(
    chantierId: string,
    member: Omit<TeamMember, 'id' | 'addedAt' | 'addedBy'>,
    addedBy: string
  ): Promise<void> {
    try {
      const chantier = await this.getChantierById(chantierId);
      if (!chantier) {
        throw new Error('Chantier non trouvé');
      }

      const newMember: TeamMember = {
        ...member,
        id: uuidv4(),
        addedAt: Timestamp.now(),
        addedBy
      };

      await this.updateChantier(chantierId, {
        team: [...chantier.team, newMember],
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Erreur lors de l\'ajout du membre d\'équipe:', error);
      throw error;
    }
  }

  // Supprimer un membre de l'équipe
  async removeTeamMember(chantierId: string, memberId: string): Promise<void> {
    try {
      const chantier = await this.getChantierById(chantierId);
      if (!chantier) {
        throw new Error('Chantier non trouvé');
      }

      const updatedTeam = chantier.team.filter(member => member.id !== memberId);

      await this.updateChantier(chantierId, {
        team: updatedTeam,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Erreur lors de la suppression du membre d\'équipe:', error);
      throw error;
    }
  }

  // Ajouter une mise à jour de progression
  async addProgressUpdate(
    chantierId: string,
    update: Omit<ProgressUpdate, 'id' | 'createdAt' | 'createdBy'>,
    createdBy: string
  ): Promise<void> {
    try {
      const chantier = await this.getChantierById(chantierId);
      if (!chantier) {
        throw new Error('Chantier non trouvé');
      }

      const newUpdate: ProgressUpdate = {
        ...update,
        id: uuidv4(),
        createdAt: Timestamp.now(),
        createdBy
      };

      await this.updateChantier(chantierId, {
        updates: [newUpdate, ...chantier.updates], // Nouvelles mises à jour en premier
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la mise à jour:', error);
      throw error;
    }
  }

  // Mettre à jour un chantier
  async updateChantier(chantierId: string, updates: Partial<FirebaseChantier>): Promise<void> {
    try {
      const chantierRef = doc(db, this.COLLECTION_NAME, chantierId);
      
      // Nettoyer les données pour éviter les erreurs "undefined"
      const cleanedUpdates = this.cleanObject(updates);
      
      await updateDoc(chantierRef, {
        ...cleanedUpdates,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du chantier:', error);
      throw error;
    }
  }

  // Supprimer un média de la galerie et des phases/étapes
  async deleteGalleryItem(chantierId: string, mediaId: string): Promise<void> {
    try {
      if (!chantierId) throw new Error('ID du chantier manquant');
      if (!mediaId) throw new Error('ID du média manquant');

      const chantier = await this.getChantierById(chantierId);
      if (!chantier) {
        throw new Error('Chantier non trouvé');
      }

      // Initialiser la galerie si elle n'existe pas
      const gallery = chantier.gallery || [];

      // Trouver l'URL du média à supprimer pour le nettoyer des phases
      const mediaToDelete = gallery.find(m => m.id === mediaId);
      if (!mediaToDelete) {
        throw new Error(`Média ${mediaId} non trouvé dans ce projet`);
      }

      const mediaUrl = mediaToDelete.url;

      // 1. Supprimer de la galerie
      const updatedGallery = gallery.filter(m => m.id !== mediaId);

      // 2. Supprimer de toutes les phases et étapes
      const updatedPhases = (chantier.phases || []).map(phase => {
        // Supprimer de la phase
        const phasePhotos = (phase.photos || []).filter(url => url !== mediaUrl);
        
        // Supprimer des étapes si elles existent
        let updatedSteps = phase.steps;
        if (phase.steps && Array.isArray(phase.steps)) {
          updatedSteps = phase.steps.map(step => ({
            ...step,
            photos: (step.photos || []).filter(url => url !== mediaUrl)
          }));
        }

        return {
          ...phase,
          photos: phasePhotos,
          steps: updatedSteps,
          lastUpdated: Timestamp.now(),
          updatedBy: 'admin'
        };
      });

      await this.updateChantier(chantierId, this.cleanObject({
        gallery: updatedGallery,
        phases: updatedPhases,
        updatedAt: Timestamp.now()
      }));

      console.log(`Média ${mediaId} supprimé avec succès du chantier ${chantierId}`);
    } catch (error: any) {
      console.error('Erreur lors de la suppression du média:', error);
      throw new Error(error.message || 'Erreur lors de la suppression');
    }
  }

  // Supprimer un chantier
  async deleteChantier(chantierId: string): Promise<void> {
    try {
      const chantierRef = doc(db, this.COLLECTION_NAME, chantierId);
      await deleteDoc(chantierRef);
    } catch (error) {
      console.error('Erreur lors de la suppression du chantier:', error);
      throw error;
    }
  }

  // Écouter les changements d'un chantier en temps réel
  subscribeToChantier(chantierId: string, callback: (chantier: FirebaseChantier | null) => void): () => void {
    const chantierRef = doc(db, this.COLLECTION_NAME, chantierId);

    return onSnapshot(chantierRef, (doc) => {
      if (doc.exists()) {
        callback({
          id: doc.id,
          ...doc.data()
        } as FirebaseChantier);
      } else {
        callback(null);
      }
    }, (error) => {
      console.error('Erreur lors de l\'écoute du chantier:', error);
      callback(null);
    });
  }

  // Écouter les changements des chantiers d'un chef
  subscribeToChefChantiers(chefId: string, callback: (chantiers: FirebaseChantier[]) => void): () => void {
    const chantiersRef = collection(db, this.COLLECTION_NAME);
    const q = query(chantiersRef, where('assignedChefId', '==', chefId), orderBy('updatedAt', 'desc'));

    return onSnapshot(q, (snapshot) => {
      const chantiers: FirebaseChantier[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as FirebaseChantier));

      callback(chantiers);
    }, (error) => {
      console.error('Erreur lors de l\'écoute des chantiers du chef:', error);
      callback([]);
    });
  }

  // Écouter le chantier d'un client
  subscribeToClientChantier(clientId: string, callback: (chantier: FirebaseChantier | null) => void): () => void {
    const chantiersRef = collection(db, this.COLLECTION_NAME);
    const q = query(chantiersRef, where('clientId', '==', clientId));

    return onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const chantierDoc = snapshot.docs[0];
        callback({
          id: chantierDoc.id,
          ...chantierDoc.data()
        } as FirebaseChantier);
      } else {
        callback(null);
      }
    }, (error) => {
      console.error('Erreur lors de l\'écoute du chantier client:', error);
      callback(null);
    });
  }

  // Écouter tous les chantiers en temps réel (pour les admins)
  subscribeToAllChantiers(callback: (chantiers: FirebaseChantier[]) => void): () => void {
    const chantiersRef = collection(db, this.COLLECTION_NAME);
    const q = query(chantiersRef, orderBy('updatedAt', 'desc'));

    return onSnapshot(q, (snapshot) => {
      const chantiers: FirebaseChantier[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as FirebaseChantier));

      console.log(`📡 Mise à jour temps réel: ${chantiers.length} chantiers reçus`);
      callback(chantiers);
    }, (error) => {
      console.error('Erreur lors de l\'écoute de tous les chantiers:', error);
      callback([]);
    });
  }
}

export const chantierService = new ChantierService();