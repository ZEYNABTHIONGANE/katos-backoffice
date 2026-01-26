import { useEffect } from 'react';
import { useClientStore } from '../store/clientStore';
import { useMaterialStore } from '../store/materialStore';
import { useProjectStore } from '../store/projectStore';
import { useAdminStore } from '../store/adminStore';
import { useAuthStore } from '../store/authStore';
import { initializeSuperAdmin } from '../utils/initSuperAdmin';

export const DataInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  const { initializeClients } = useClientStore();
  const { initializeMaterials } = useMaterialStore();
  const { initializeProjects } = useProjectStore();
  const { initializeAdmins } = useAdminStore();

  // Initialiser le super admin au démarrage de l'application
  useEffect(() => {
    const initSuperAdmin = async () => {
      try {
        await initializeSuperAdmin();
      } catch (error) {
        console.error('Erreur lors de l\'initialisation du Super Admin:', error);
      }
    };

    initSuperAdmin();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      // Initialiser toutes les données Firebase quand l'utilisateur est connecté
      initializeClients();
      initializeMaterials();
      initializeProjects();
      initializeAdmins();
    }
  }, [isAuthenticated, initializeClients, initializeMaterials, initializeProjects, initializeAdmins]);

  return <>{children}</>;
};