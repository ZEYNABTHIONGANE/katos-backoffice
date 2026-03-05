// @ts-nocheck
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { KATOS_STANDARD_PHASES, calculateGlobalProgress, getChantierStatus } from '../types/chantier';
import type { FirebaseChantier, KatosChantierPhase, ChantierPhase } from '../types/chantier';
import { v4 as uuidv4 } from 'uuid';

interface LegacyChantier {
  id: string;
  phases: ChantierPhase[]; // Anciennes phases sans catégorie ni steps
  [key: string]: any;
}

export class ChantierMigrationService {
  private readonly COLLECTION_NAME = 'chantiers';

  // Mapper les anciennes phases vers les nouvelles
  private mapLegacyPhaseToKatos(legacyPhase: ChantierPhase): KatosChantierPhase | null {
    // Trouver la phase correspondante dans KATOS_STANDARD_PHASES
    const normalize = (s: string) => s.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const phaseNameNorm = normalize(legacyPhase.name);

    let katosTemplate = KATOS_STANDARD_PHASES.find(p => {
      const templateNameNorm = normalize(p.name);
      return templateNameNorm.includes(phaseNameNorm) || phaseNameNorm.includes(templateNameNorm);
    });

    // Mapping manuel pour les cas spéciaux
    if (!katosTemplate) {
      if (phaseName.includes('fondation') || phaseName.includes('terrassement')) {
        katosTemplate = KATOS_STANDARD_PHASES.find(p => p.name === 'Fondation');
      } else if (phaseName.includes('gros') && phaseName.includes('œuvre')) {
        katosTemplate = KATOS_STANDARD_PHASES.find(p => p.name === 'Élévation');
      } else if (phaseName.includes('toiture') || phaseName.includes('couverture')) {
        // Pas de correspondance directe, on peut ignorer ou assigner à "Coulage"
        katosTemplate = KATOS_STANDARD_PHASES.find(p => p.name === 'Coulage');
      } else if (phaseName.includes('finition')) {
        katosTemplate = KATOS_STANDARD_PHASES.find(p => p.name === 'Peinture');
      }
    }

    if (!katosTemplate) {
      console.warn(`Aucune correspondance trouvée pour la phase: ${legacyPhase.name}`);
      return null;
    }

    // Créer la nouvelle phase avec les données migrées
    const migratedPhase: KatosChantierPhase = {
      ...katosTemplate,
      id: legacyPhase.id, // Garder l'ancien ID
      progress: legacyPhase.progress, // Garder le progrès existant
      status: legacyPhase.status,
      notes: legacyPhase.notes,
      photos: legacyPhase.photos,
      lastUpdated: legacyPhase.lastUpdated,
      updatedBy: legacyPhase.updatedBy,
      assignedTeamMembers: legacyPhase.assignedTeamMembers,
      requiredMaterials: legacyPhase.requiredMaterials,
      plannedStartDate: legacyPhase.plannedStartDate,
      plannedEndDate: legacyPhase.plannedEndDate,
      actualStartDate: legacyPhase.actualStartDate,
      actualEndDate: legacyPhase.actualEndDate,
      // Générer des IDs pour les nouvelles sous-étapes
      steps: katosTemplate.steps?.map(step => ({
        ...step,
        id: uuidv4(),
        // Répartir le progrès de la phase sur les sous-étapes
        progress: legacyPhase.progress // On peut ajuster cela selon la logique métier
      }))
    };

    return migratedPhase;
  }

  // Migrer les phases manquantes (ajouter les nouvelles phases Katos)
  private addMissingKatosPhases(existingPhases: KatosChantierPhase[]): KatosChantierPhase[] {
    const existingPhaseNames = new Set(existingPhases.map(p => p.name));
    const missingPhases: KatosChantierPhase[] = [];

    KATOS_STANDARD_PHASES.forEach(templatePhase => {
      if (!existingPhaseNames.has(templatePhase.name)) {
        // Ajouter la phase manquante avec des valeurs par défaut
        const newPhase: KatosChantierPhase = {
          ...templatePhase,
          id: uuidv4(),
          lastUpdated: Timestamp.now(),
          updatedBy: 'system_migration',
          steps: templatePhase.steps?.map(step => ({
            ...step,
            id: uuidv4()
          }))
        };
        missingPhases.push(newPhase);
      }
    });

    return missingPhases;
  }

  // Migrer un chantier spécifique
  async migrateChantier(chantierId: string): Promise<boolean> {
    try {
      console.log(`🔄 Migration du chantier ${chantierId}...`);

      const chantierRef = doc(db, this.COLLECTION_NAME, chantierId);
      const chantierDoc = await getDocs(collection(db, this.COLLECTION_NAME));

      const chantierData = chantierDoc.docs.find(doc => doc.id === chantierId);
      if (!chantierData || !chantierData.exists()) {
        console.error(`❌ Chantier ${chantierId} non trouvé`);
        return false;
      }

      const chantier = { id: chantierData.id, ...chantierData.data() } as LegacyChantier;

      // Migrer les phases existantes
      const migratedPhases: KatosChantierPhase[] = [];

      chantier.phases.forEach(legacyPhase => {
        const migratedPhase = this.mapLegacyPhaseToKatos(legacyPhase);
        if (migratedPhase) {
          migratedPhases.push(migratedPhase);
        }
      });

      // Ajouter les phases manquantes
      const missingPhases = this.addMissingKatosPhases(migratedPhases);
      const allPhases = [...migratedPhases, ...missingPhases];

      // Trier par ordre d'exécution
      allPhases.sort((a, b) => a.order - b.order);

      // Recalculer le progrès global
      const globalProgress = calculateGlobalProgress(allPhases);
      const status = getChantierStatus(allPhases, chantier.plannedEndDate);

      // Mettre à jour les champs lastUpdated et updatedBy pour toutes les phases
      const updatedPhases = allPhases.map(phase => ({
        ...phase,
        lastUpdated: phase.lastUpdated || Timestamp.now(),
        updatedBy: phase.updatedBy || 'system_migration'
      }));

      // Mettre à jour le chantier
      await updateDoc(chantierRef, {
        phases: updatedPhases,
        globalProgress,
        status,
        updatedAt: Timestamp.now(),
        migratedToKatosPhases: true, // Flag pour indiquer que la migration est faite
        migrationDate: Timestamp.now()
      });

      console.log(`✅ Chantier ${chantierId} migré avec succès (${allPhases.length} phases)`);
      return true;

    } catch (error) {
      console.error(`❌ Erreur lors de la migration du chantier ${chantierId}:`, error);
      return false;
    }
  }

  // Migrer tous les chantiers
  async migrateAllChantiers(): Promise<{ success: number; failed: number }> {
    try {
      console.log('🚀 Début de la synchronisation des chantiers (Phases & Approvisionnement)...');

      const chantiersRef = collection(db, this.COLLECTION_NAME);
      const snapshot = await getDocs(chantiersRef);

      const results = { success: 0, failed: 0 };

      // Utiliser des batchs (attention: max 500 opérations par batch)
      let batch = writeBatch(db);
      let batchSize = 0;

      for (const chantierDoc of snapshot.docs) {
        const chantierData = chantierDoc.data() as any;

        try {
          const chantier = { id: chantierDoc.id, ...chantierData };
          let phasesChanged = false;

          // 1. S'assurer que les phases sont au format Katos (avec catégories/steps)
          const normalize = (s: string) => s.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

          let currentPhases = chantier.phases?.map(phase => {
            if (!phase.category) {
              phasesChanged = true;
              return this.mapLegacyPhaseToKatos(phase);
            }
            return phase;
          }).filter(p => p !== null) as KatosChantierPhase[];

          // 2. Ajouter les phases Katos manquantes
          const existingNamesNorm = new Set(currentPhases.map(p => normalize(p.name)));
          KATOS_STANDARD_PHASES.forEach(template => {
            if (!existingNamesNorm.has(normalize(template.name))) {
              phasesChanged = true;
              currentPhases.push({
                ...template,
                id: uuidv4(),
                lastUpdated: Timestamp.now(),
                updatedBy: 'system_sync',
                steps: template.steps?.map(s => ({ ...s, id: uuidv4() }))
              } as KatosChantierPhase);
            }
          });

          // 3. Synchroniser toutes les étapes manquantes de chaque phase
          currentPhases = currentPhases.map(phase => {
            const template = KATOS_STANDARD_PHASES.find(t => normalize(t.name) === normalize(phase.name));
            if (template && template.steps) {
              const existingStepNamesNorm = new Set(phase.steps?.map(s => normalize(s.name)) || []);
              const stepsToAdd = template.steps.filter(s => !existingStepNamesNorm.has(normalize(s.name)));

              if (stepsToAdd.length > 0) {
                phasesChanged = true;
                const newSteps = stepsToAdd.map(s => ({
                  ...s,
                  id: uuidv4(),
                  progress: phase.progress // Les nouvelles étapes héritent du progrès actuel pour garder la moyenne intacte
                }));
                // Fusionner et trier (ou au moins mettre les nouveaux à la fin s'ils ne sont pas Approvisionnement)
                // Idéalement on garde l'ordre du template si possible
                const combinedSteps = [...(phase.steps || [])];

                // On insère l'approvisionnement en premier si elle vient d'être ajoutée
                newSteps.forEach(newStep => {
                  if (newStep.name === 'Approvisionnement') {
                    combinedSteps.unshift(newStep);
                  } else {
                    combinedSteps.push(newStep);
                  }
                });

                phase.steps = combinedSteps;
              }
            }
            return phase;
          });

          if (phasesChanged || !chantierData.migratedToKatosPhases) {
            // Trier par ordre
            currentPhases.sort((a, b) => a.order - b.order);

            // Recalculer le progrès
            const globalProgress = calculateGlobalProgress(currentPhases);
            const status = getChantierStatus(currentPhases, chantier.plannedEndDate);

            const chantierRef = doc(db, this.COLLECTION_NAME, chantierDoc.id);
            batch.update(chantierRef, {
              phases: currentPhases,
              globalProgress,
              status,
              updatedAt: Timestamp.now(),
              migratedToKatosPhases: true,
              migrationDate: Timestamp.now()
            });

            batchSize++;
            if (batchSize >= 450) {
              await batch.commit();
              batch = writeBatch(db);
              batchSize = 0;
            }
            results.success++;
          }

        } catch (error) {
          console.error(`❌ Erreur sync chantier ${chantierDoc.id}:`, error);
          results.failed++;
        }
      }

      if (batchSize > 0) {
        await batch.commit();
      }

      console.log(`🎉 Sync terminée: ${results.success} chantiers mis à jour, ${results.failed} erreurs`);
      return results;

    } catch (error) {
      console.error('❌ Erreur lors de la sync générale:', error);
      throw error;
    }
  }

  // Vérifier l'état de la migration
  async checkMigrationStatus(): Promise<{
    total: number;
    migrated: number;
    pending: number;
  }> {
    try {
      const chantiersRef = collection(db, this.COLLECTION_NAME);
      const snapshot = await getDocs(chantiersRef);

      let migrated = 0;
      const total = snapshot.docs.length;
      const normalize = (s: string) => s.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (!data.migratedToKatosPhases) return;

        // Vérification plus profonde : a-t-il bien toutes les phases et tous les steps ?
        const phases = data.phases as any[];
        if (!phases || phases.length < KATOS_STANDARD_PHASES.length) return;

        const allStepsPresent = phases.every(phase => {
          const template = KATOS_STANDARD_PHASES.find(t => normalize(t.name) === normalize(phase.name));
          if (!template || !template.steps) return true;
          if (!phase.steps || phase.steps.length < template.steps.length) return false;
          return true;
        });

        if (allStepsPresent) {
          migrated++;
        }
      });

      return {
        total,
        migrated,
        pending: total - migrated
      };

    } catch (error) {
      console.error('❌ Erreur lors de la vérification du statut:', error);
      throw error;
    }
  }
}

export const migrationService = new ChantierMigrationService();

// Script pour exécuter la migration
if (typeof window === 'undefined') {
  // Exécution en mode script Node.js
  console.log('🔄 Lancement de la migration des chantiers...');
  migrationService.migrateAllChantiers()
    .then(results => {
      console.log('✅ Migration terminée:', results);
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Échec de la migration:', error);
      process.exit(1);
    });
}