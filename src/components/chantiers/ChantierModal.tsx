/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Upload, X } from 'lucide-react';
import { userService } from '../../services/userService';
import { useClientStore } from '../../store/clientStore';
import { useProjectStore } from '../../store/projectStore';
import { UserRole } from '../../types/roles';
import type { FirebaseUser } from '../../types/firebase';
import { chantierService } from '../../services/chantierService';
import { storageService } from '../../services/storageService';
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

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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
        console.log('🔄 Chargement des chefs disponibles...');
        const availableChefs = await userService.getAvailableChefs();
        console.log(`✅ ${availableChefs.length} chefs chargés:`, availableChefs);
        setChefs(availableChefs);
      } catch (error) {
        console.error('❌ Erreur lors du chargement des chefs:', error);
        toast.error('Erreur lors du chargement des chefs de chantier');
      }
    };

    if (isOpen) {
      loadChefs();
    }
  }, [isOpen]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        storageService.validateImageFile(file);
        setImageFile(file);
        // Create preview URL
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);
      } catch (error: any) {
        toast.error(error.message);
      }
    }
  };

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

  // Mettre à jour le nom du chantier si le projet est changé manuellement (garde cette logique au cas où)
  useEffect(() => {
    if (formData.clientId && formData.projectTemplateId && !chantier) {
      const selectedClient = clients.find(c => c.id === formData.clientId);
      const selectedProject = projects.find(p => p.id === formData.projectTemplateId);

      if (selectedClient && selectedProject) {
        // Seulement régénérer le nom si c'est différent du projet associé au client
        // (cas où l'utilisateur change manuellement le projet)
        // Trouver l'ID du projet associé au client pour comparer correctement
        const associatedProject = projects.find(p =>
          p.id === selectedClient.projetAdhere ||
          p.name === selectedClient.projetAdhere ||
          selectedClient.projetAdhere.toLowerCase().includes(p.name.toLowerCase())
        );

        const associatedProjectId = associatedProject?.id;

        // Seulement régénérer si l'utilisateur a vraiment changé le projet (comparer les IDs)
        if (associatedProjectId && associatedProjectId !== formData.projectTemplateId) {
          // Si l'utilisateur a changé le projet, utiliser le nom du nouveau projet sélectionné
          const generatedName = `Chantier ${selectedClient.prenom} ${selectedClient.nom} - ${selectedProject.name}`;
          setFormData(prev => ({ ...prev, name: generatedName }));
        }
      }
    }
  }, [formData.clientId, formData.projectTemplateId, clients, projects, chantier]);

  // Auto-remplir TOUT dès qu'un client est sélectionné
  useEffect(() => {
    if (formData.clientId && !chantier) { // Seulement en mode création
      const selectedClient = clients.find(c => c.id === formData.clientId);

      if (selectedClient && selectedClient.projetAdhere) {
        // Chercher d'abord par ID, puis par nom, puis par correspondance partielle
        let selectedProject = projects.find(p => p.id === selectedClient.projetAdhere);

        // Si pas trouvé par ID, chercher par nom exact
        if (!selectedProject) {
          selectedProject = projects.find(p => p.name === selectedClient.projetAdhere);
        }

        // Si toujours pas trouvé, chercher par correspondance partielle (pour "Villa AICHA F6" -> "Villa AICHA")
        if (!selectedProject) {
          selectedProject = projects.find(p =>
            selectedClient.projetAdhere.toLowerCase().includes(p.name.toLowerCase()) ||
            p.name.toLowerCase().includes(selectedClient.projetAdhere.toLowerCase())
          );
        }

        if (selectedProject) {
          // Auto-générer le nom du chantier en utilisant le nom complet du client (avec F6)
          // au lieu du nom du projet trouvé (qui peut être incomplet)
          const generatedName = `Chantier ${selectedClient.prenom} ${selectedClient.nom} - ${selectedClient.projetAdhere}`;

          setFormData(prev => ({
            ...prev,
            // Auto-sélectionner le projet associé au client (utiliser l'ID du projet trouvé)
            projectTemplateId: selectedProject.id,
            // Auto-générer le nom du chantier
            name: generatedName,
            // Auto-remplir l'adresse
            address: selectedClient.localisationSite
          }));
        }
      }
    }
  }, [formData.clientId, clients, projects, chantier]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: Record<string, string> = {};

    // Ces champs sont requis seulement en mode création
    if (!chantier) {
      if (!formData.clientId) newErrors.clientId = 'Le client est requis';
      if (!formData.projectTemplateId) newErrors.projectTemplateId = 'Le projet template est requis';
      if (!formData.startDate) newErrors.startDate = 'La date de début est requise';
      if (!formData.plannedEndDate) newErrors.plannedEndDate = 'La date de fin prévue est requise';
    }

    if (!formData.name) newErrors.name = 'Le nom du chantier est requis';
    if (!formData.address) newErrors.address = 'L\'adresse du chantier est requise';
    if (!formData.assignedChefId) newErrors.assignedChefId = 'Le chef de chantier est requis';

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

      let coverImageUrl = chantier?.coverImage;

      // Upload image if selected
      if (imageFile) {
        try {
          coverImageUrl = await storageService.uploadImage(imageFile, 'chantiers/covers');
        } catch (uploadError: any) {
          console.error('Erreur upload image:', uploadError);
          toast.error("Erreur lors de l'upload de l'image, le chantier sera créé sans image.");
        }
      }

      if (chantier) {
        // Mode édition - Mise à jour du chantier existant
        const updates: any = {
          name: formData.name,
          address: formData.address,
          assignedChefId: formData.assignedChefId,
          coverImage: coverImageUrl || null,
        };

        if (formData.startDate) updates.startDate = new Date(formData.startDate);
        if (formData.plannedEndDate) updates.plannedEndDate = new Date(formData.plannedEndDate);

        await chantierService.updateChantier(chantier.id, updates);
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
            plannedEndDate: new Date(formData.plannedEndDate),
            coverImage: coverImageUrl
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

          {/* Cover Image Upload */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900">
              Image de couverture
            </label>

            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-primary-500 transition-colors cursor-pointer relative"
              onClick={() => document.getElementById('cover-image-upload')?.click()}>

              {previewUrl ? (
                <div className="relative w-full h-48">
                  <img
                    src={previewUrl}
                    alt="Cover preview"
                    className="w-full h-full object-cover rounded-md"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImageFile(null);
                      setPreviewUrl(null);
                    }}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600 justify-center">
                    <label htmlFor="cover-image-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none">
                      <span>Télécharger une photo</span>
                      <input
                        id="cover-image-upload"
                        name="cover-image-upload"
                        type="file"
                        className="sr-only"
                        accept="image/*"
                        onChange={handleImageChange}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </label>
                    <p className="pl-1">ou glisser-déposer</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    PNG, JPG, WEBP jusqu'à 5MB
                  </p>
                </div>
              )}
            </div>
          </div>

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
              Villa *
            </label>
            <select
              value={formData.projectTemplateId}
              onChange={(e) => setFormData({ ...formData, projectTemplateId: e.target.value })}
              disabled={!!chantier} // Désactiver en mode édition
              className="block w-full h-12 px-4 py-3 border-2 border-gray-300 rounded-lg shadow-sm bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors font-medium appearance-none disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Sélectionner une villa</option>
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
              {chefs.length === 0 && (
                <option value="" disabled>Aucun chef disponible (vérifiez les rôles)</option>
              )}
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