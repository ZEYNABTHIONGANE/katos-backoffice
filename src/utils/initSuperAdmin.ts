import { userService } from '../services/userService';
import { UserRole } from '../types/roles';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export const DEFAULT_SUPER_ADMIN = {
  email: 'admin@katos.sn',
  password: 'Katos2024!',
  displayName: 'Super Administrateur'
};

/**
 * Initialise un super admin par défaut si aucun n'existe
 */
export async function initializeSuperAdmin(): Promise<void> {
  try {
    // Vérifier si des super admins existent déjà
    const superAdmins = await userService.getUsersByRole(UserRole.SUPER_ADMIN);

    if (superAdmins.length > 0) {
      console.log('Super Admin déjà configuré');

      // Vérifier et corriger le super admin existant si nécessaire
      await ensureSuperAdminProperties();
      return;
    }

    console.log('Création du Super Admin par défaut...');

    const result = await userService.initializeSuperAdmin(
      DEFAULT_SUPER_ADMIN.email,
      DEFAULT_SUPER_ADMIN.password,
      DEFAULT_SUPER_ADMIN.displayName
    );

    if (result.success) {
      console.log('✅ Super Admin créé avec succès');
      console.log('📧 Email:', DEFAULT_SUPER_ADMIN.email);
      console.log('🔑 Mot de passe:', DEFAULT_SUPER_ADMIN.password);
      console.log('⚠️  Pensez à changer le mot de passe après la première connexion');
    } else {
      console.error('❌ Erreur lors de la création du Super Admin:', result.error);
    }
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('ℹ️  Super Admin déjà existant avec cet email');
    } else {
      console.error('❌ Erreur lors de l\'initialisation du Super Admin:', error);
    }
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

/**
 * Force la création d'un nouveau super admin (à utiliser avec précaution)
 */
export async function createNewSuperAdmin(
  email: string,
  password: string,
  displayName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await userService.initializeSuperAdmin(email, password, displayName);
    return result;
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
}