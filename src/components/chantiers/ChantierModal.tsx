/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { userService } from '../../services/userService';
import { useClientStore } from '../../store/clientStore';
import { useProjectStore } from '../../store/projectStore';
import { UserRole } from '../../types/roles';
import type { FirebaseUser } from '../../types/firebase';
import { chantierService } from '../../services/chantierService';
import { toast } from 'react-toastify';

interface ChantierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  chantier?: any; // Chantier à modifier (undefined pour création)
}

export const ChantierModal: React.FC<ChantierModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  chantier
}) => {
  const { clients } = useClientStore();
  const { projects } = useProjectStore();
  const [chefs, setChefs] = useState<FirebaseUser[]>([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    clientId: '',
    projectTemplateId: '',
    name: '',
    address: '',
    assignedChefId: '',
    startDate: '',
    plannedEndDate: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Charger les chefs de chantier
  useEffect(() => {
    const loadChefs = async () => {
      try {
        const availableChefs = await userService.getAvailableChefs();
        setChefs(availableChefs);
      } catch (error) {
        console.error('Erreur lors du chargement des chefs:', error);
        toast.error('Erreur lors du chargement des chefs de chantier');
      }
    };

    if (isOpen) {
      loadChefs();
    }
  }, [isOpen]);

  // Initialiser le formulaire avec les données du chantier en mode édition
  useEffect(() => {
    if (chantier && isOpen) {
      setFormData({
        clientId: chantier.clientId || '',
        projectTemplateId: chantier.projectTemplateId || '',
        name: chantier.name || '',
        address: chantier.address || '',
        assignedChefId: chantier.assignedChefId || '',
        startDate: chantier.startDate ? chantier.startDate.toDate().toISOString().split('T')[0] : '',
        plannedEndDate: chantier.plannedEndDate ? chantier.plannedEndDate.toDate().toISOString().split('T')[0] : ''
      });
    } else if (!chantier && isOpen) {
      // Réinitialiser pour un nouveau chantier
      setFormData({
        clientId: '',
        projectTemplateId: '',
        name: '',
        address: '',
        assignedChefId: '',
        startDate: '',
        plannedEndDate: ''
      });
    }
    setErrors({});
  }, [chantier, isOpen]);

  // Mettre à jour automatiquement le nom du chantier basé sur le client et projet sélectionnés
  useEffect(() => {
    if (formData.clientId && formData.projectTemplateId) {
      const selectedClient = clients.find(c => c.id === formData.clientId);
      const selectedProject = projects.find(p => p.id === formData.projectTemplateId);

      if (selectedClient && selectedProject) {
        const generatedName = `Chantier ${selectedClient.prenom} ${selectedClient.nom} - ${selectedProject.name}`;
        setFormData(prev => ({ ...prev, name: generatedName }));
      }
    }
  }, [formData.clientId, formData.projectTemplateId, clients, projects]);

  // Auto-remplir l'adresse avec la localisation du client
  useEffect(() => {
    if (formData.clientId) {
      const selectedClient = clients.find(c => c.id === formData.clientId);
      if (selectedClient) {
        setFormData(prev => ({ ...prev, address: selectedClient.localisationSite }));
      }
    }
  }, [formData.clientId, clients]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: Record<string, string> = {};

    // Ces champs sont requis seulement en mode création
    if (!chantier) {
      if (!formData.clientId) newErrors.clientId = 'Le client est requis';
      if (!formData.projectTemplateId) newErrors.projectTemplateId = 'Le projet template est requis';
    }
    if (!formData.name) newErrors.name = 'Le nom du chantier est requis';
    if (!formData.address) newErrors.address = 'L\'adresse du chantier est requise';
    if (!formData.assignedChefId) newErrors.assignedChefId = 'Le chef de chantier est requis';
    if (!formData.startDate) newErrors.startDate = 'La date de début est requise';
    if (!formData.plannedEndDate) newErrors.plannedEndDate = 'La date de fin prévue est requise';

    // Vérifier que la date de fin est après la date de début
    if (formData.startDate && formData.plannedEndDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.plannedEndDate);
      if (endDate <= startDate) {
        newErrors.plannedEndDate = 'La date de fin doit être postérieure à la date de début';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setLoading(true);

      if (chantier) {
        // Mode édition - Mise à jour du chantier existant
        await chantierService.updateChantier(chantier.id, {
          name: formData.name,
          address: formData.address,
          assignedChefId: formData.assignedChefId,
          // startDate: new Date(formData.startDate),
          // plannedEndDate: new Date(formData.plannedEndDate)
        });
        toast.success('Chantier modifié avec succès!');
      } else {
        // Mode création - Créer un nouveau chantier
        await chantierService.createChantierFromTemplate(
          formData.clientId,
          formData.projectTemplateId,
          {
            name: formData.name,
            address: formData.address,
            assignedChefId: formData.assignedChefId,
            startDate: new Date(formData.startDate),
            plannedEndDate: new Date(formData.plannedEndDate)
          },
          'admin' // TODO: Récupérer l'ID de l'utilisateur connecté
        );
        toast.success('Chantier créé avec succès!');
      }

      handleClose();
      onSuccess();
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde du chantier:', error);
      toast.error(error.message || `Erreur lors de la ${chantier ? 'modification' : 'création'} du chantier`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      clientId: '',
      projectTemplateId: '',
      name: '',
      address: '',
      assignedChefId: '',
      startDate: '',
      plannedEndDate: ''
    });
    setErrors({});
    onClose();
  };

  // Filtrer les clients qui n'ont pas déjà un chantier
  const availableClients = clients.filter(client => client.invitationStatus === 'accepted');

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={chantier ? "Modifier le projet" : "Nouveau projet"}
      size="lg"
    >
      <div className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Sélection du client */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900">
              Client *
            </label>
            <select
              value={formData.clientId}
              onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
              disabled={!!chantier} // Désactiver en mode édition
              className="block w-full h-12 px-4 py-3 border-2 border-gray-300 rounded-lg shadow-sm bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors font-medium appearance-none disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Sélectionner un client</option>
              {availableClients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.prenom} {client.nom} - {client.email}
                </option>
              ))}
            </select>
            {errors.clientId && (
              <p className="text-red-600 text-xs mt-1">{errors.clientId}</p>
            )}
          </div>

          {/* Sélection du projet template */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900">
              Projet *
            </label>
            <select
              value={formData.projectTemplateId}
              onChange={(e) => setFormData({ ...formData, projectTemplateId: e.target.value })}
              disabled={!!chantier} // Désactiver en mode édition
              className="block w-full h-12 px-4 py-3 border-2 border-gray-300 rounded-lg shadow-sm bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors font-medium appearance-none disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Sélectionner un projet</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name} {project.type}
                </option>
              ))}
            </select>
            {errors.projectTemplateId && (
              <p className="text-red-600 text-xs mt-1">{errors.projectTemplateId}</p>
            )}
          </div>

          {/* Nom du chantier */}
          <Input
            label="Nom du projet *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={errors.name}
            placeholder="Projet Villa Fatima F6"
          />

          {/* Adresse du chantier */}
          <Input
            label="Adresse du projet *"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            error={errors.address}
            placeholder="Cité Keur Gorgui, Lot 25, Dakar"
          />

          {/* Chef de chantier assigné */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900">
              Chef de projet *
            </label>
            <select
              value={formData.assignedChefId}
              onChange={(e) => setFormData({ ...formData, assignedChefId: e.target.value })}
              className="block w-full h-12 px-4 py-3 border-2 border-gray-300 rounded-lg shadow-sm bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors font-medium appearance-none"
            >
              <option value="">Sélectionner un chef de projet</option>
              {chefs.map((chef) => {
                let roleLabel = '';
                if (chef.role === UserRole.CHEF) {
                  roleLabel = 'Chef de chantier';
                } else if (chef.role === UserRole.ADMIN && chef.isChef) {
                  roleLabel = 'Admin + Chef';
                } else if (chef.role === UserRole.SUPER_ADMIN) {
                  roleLabel = 'Super Admin';
                } else {
                  roleLabel = 'Administrateur';
                }

                return (
                  <option key={chef.uid} value={chef.uid}>
                    {chef.displayName} - {roleLabel}
                  </option>
                );
              })}
            </select>
            {errors.assignedChefId && (
              <p className="text-red-600 text-xs mt-1">{errors.assignedChefId}</p>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Date de début *"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              error={errors.startDate}
              min={new Date().toISOString().split('T')[0]} // Au minimum aujourd'hui
            />

            <Input
              label="Date de fin prévue *"
              type="date"
              value={formData.plannedEndDate}
              onChange={(e) => setFormData({ ...formData, plannedEndDate: e.target.value })}
              error={errors.plannedEndDate}
              min={formData.startDate || new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Boutons */}
          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="w-full sm:w-auto order-2 sm:order-1"
              disabled={loading}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto order-1 sm:order-2"
              disabled={loading}
            >
              {loading
                ? (chantier ? 'Modification...' : 'Création...')
                : (chantier ? 'Modifier le projet' : 'Créer le projet')
              }
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};