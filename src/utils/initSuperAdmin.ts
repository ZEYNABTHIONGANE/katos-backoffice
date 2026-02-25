import { userService } from '../services/userService';
import { UserRole } from '../types/roles';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Vérifie les propriétés du super admin au démarrage.
 * La création automatique a été retirée pour des raisons de sécurité.
 */
export async function initializeSuperAdmin(): Promise<void> {
  try {
    // Vérifier si des super admins existent déjà
    const superAdmins = await userService.getUsersByRole(UserRole.SUPER_ADMIN);

    if (superAdmins.length > 0) {
      console.log('Super Admin déjà configuré');
      // Vérifier et corriger le super admin existant si nécessaire
      await ensureSuperAdminProperties();
    }
  } catch (error: any) {
    console.error('❌ Erreur lors de la vérification du Super Admin:', error);
  }
}

/**
 * S'assurer que les super admins existants ont les bonnes propriétés
 */
async function ensureSuperAdminProperties(): Promise<void> {
  try {
    const superAdmins = await userService.getUsersByRole(UserRole.SUPER_ADMIN);

    for (const admin of superAdmins) {
      // Vérifier si isTemporaryPassword est défini
      if (admin.isTemporaryPassword === undefined) {
        console.log(`Mise à jour des propriétés pour ${admin.email}`);

        const userRef = doc(db, 'users', admin.uid);
        await setDoc(userRef, {
          ...admin,
          isTemporaryPassword: false // Super admin a un mot de passe permanent
        });
      }
    }
  } catch (error) {
    console.error('Erreur lors de la mise à jour des propriétés super admin:', error);
  }
}
