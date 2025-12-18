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
    // Mapping basé sur le nom de l'ancienne phase
    const phaseName = legacyPhase.name.toLowerCase();

    // Trouver la phase correspondante dans KATOS_STANDARD_PHASES
    let katosTemplate = KATOS_STANDARD_PHASES.find(p =>
      p.name.toLowerCase().includes(phaseName) ||
      phaseName.includes(p.name.toLowerCase())
    );

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
      console.log('🚀 Début de la migration de tous les chantiers...');

      const chantiersRef = collection(db, this.COLLECTION_NAME);
      const snapshot = await getDocs(chantiersRef);

      const results = { success: 0, failed: 0 };
      const batch = writeBatch(db);
      let batchSize = 0;
      const MAX_BATCH_SIZE = 500; // Limite Firestore

      for (const chantierDoc of snapshot.docs) {
        const chantierData = chantierDoc.data() as any;

        // Vérifier si déjà migré
        if (chantierData.migratedToKatosPhases) {
          console.log(`⏭️ Chantier ${chantierDoc.id} déjà migré, ignoré`);
          continue;
        }

        try {
          const chantier = { id: chantierDoc.id, ...chantierData } as LegacyChantier;

          // Migrer les phases
          const migratedPhases: KatosChantierPhase[] = [];

          chantier.phases?.forEach(legacyPhase => {
            const migratedPhase = this.mapLegacyPhaseToKatos(legacyPhase);
            if (migratedPhase) {
              migratedPhases.push(migratedPhase);
            }
          });

          // Ajouter les phases manquantes
          const missingPhases = this.addMissingKatosPhases(migratedPhases);
          const allPhases = [...migratedPhases, ...missingPhases];
          allPhases.sort((a, b) => a.order - b.order);

          // Recalculer le progrès
          const globalProgress = calculateGlobalProgress(allPhases);
          const status = getChantierStatus(allPhases, chantier.plannedEndDate);

          // Mettre à jour les champs lastUpdated et updatedBy pour toutes les phases
          const updatedPhases = allPhases.map(phase => ({
            ...phase,
            lastUpdated: phase.lastUpdated || Timestamp.now(),
            updatedBy: phase.updatedBy || 'system_migration'
          }));

          // Ajouter au batch
          const chantierRef = doc(db, this.COLLECTION_NAME, chantierDoc.id);
          batch.update(chantierRef, {
            phases: updatedPhases,
            globalProgress,
            status,
            updatedAt: Timestamp.now(),
            migratedToKatosPhases: true,
            migrationDate: Timestamp.now()
          });

          batchSize++;

          // Exécuter le batch si on atteint la limite
          if (batchSize >= MAX_BATCH_SIZE) {
            await batch.commit();
            console.log(`📦 Batch de ${batchSize} chantiers traité`);
            batchSize = 0;
          }

          results.success++;

        } catch (error) {
          console.error(`❌ Erreur migration chantier ${chantierDoc.id}:`, error);
          results.failed++;
        }
      }

      // Exécuter le dernier batch s'il reste des éléments
      if (batchSize > 0) {
        await batch.commit();
        console.log(`📦 Dernier batch de ${batchSize} chantiers traité`);
      }

      console.log(`🎉 Migration terminée: ${results.success} réussies, ${results.failed} échouées`);
      return results;

    } catch (error) {
      console.error('❌ Erreur lors de la migration générale:', error);
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

      snapshot.docs.forEach(doc => {
        if (doc.data().migratedToKatosPhases) {
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