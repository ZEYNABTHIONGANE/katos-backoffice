import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ImageCarousel } from '../ui/ImageCarousel';
import type { Client } from '../../types';
import { useProjectStore } from '../../store/projectStore';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (client: Omit<Client, 'id' | 'createdAt'>) => void;
  client?: Client;
}

export const ClientModal: React.FC<ClientModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  client,
}) => {
  const [formData, setFormData] = useState<{
    nom: string;
    prenom: string;
    email: string;
    telephone: string;
    adresse: string;
    localisationSite: string;
    projetAdhere: string;
    typePaiement: 'comptant' | 'echeancier';
    status: 'En cours' | 'Terminé' | 'En attente';
    budgetEstimé: string;
    terrainSurface: string;
    terrainLocation: string;
    hasTitreFoncier: boolean;
  }>({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    adresse: '',
    localisationSite: '',
    projetAdhere: '',
    typePaiement: 'comptant',
    status: 'En attente',
    budgetEstimé: '',
    terrainSurface: '',
    terrainLocation: '',
    hasTitreFoncier: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Mettre à jour le formulaire quand le client change
  useEffect(() => {
    if (client) {
      setFormData({
        nom: client.nom || '',
        prenom: client.prenom || '',
        email: client.email || '',
        telephone: client.telephone || '',
        adresse: client.adresse || '',
        localisationSite: client.localisationSite || '',
        projetAdhere: client.projetAdhere || '',
        typePaiement: client.typePaiement || 'comptant',
        status: client.status || 'En attente',
        budgetEstimé: client.budgetEstimé || '',
        terrainSurface: client.terrainSurface || '',
        terrainLocation: client.terrainLocation || '',
        hasTitreFoncier: !!client.hasTitreFoncier,
      });
    } else {
      setFormData({
        nom: '',
        prenom: '',
        email: '',
        telephone: '',
        adresse: '',
        localisationSite: '',
        projetAdhere: '',
        typePaiement: 'comptant',
        status: 'En attente',
        budgetEstimé: '',
        terrainSurface: '',
        terrainLocation: '',
        hasTitreFoncier: false,
      });
    }
    setErrors({});
  }, [client, isOpen]);
  const { projects } = useProjectStore();
  const selectedProject = projects.find(p => p.name === formData.projetAdhere);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    if (!formData.nom) newErrors.nom = 'Le nom est requis';
    if (!formData.prenom) newErrors.prenom = 'Le prénom est requis';
    if (!formData.email) newErrors.email = 'L\'email est requis';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'L\'email n\'est pas valide';
    }
    if (!formData.localisationSite) newErrors.localisationSite = 'La localisation du site est requise';
    if (!formData.projetAdhere) newErrors.projetAdhere = 'Le projet adhéré est requis';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({
      ...formData,
      invitationStatus: 'pending' as const,
      isActive: formData.status !== 'Terminé'
    });
    handleClose();
  };

  const handleClose = () => {
    setFormData({
      nom: '',
      prenom: '',
      email: '',
      telephone: '',
      adresse: '',
      localisationSite: '',
      projetAdhere: '',
      typePaiement: 'comptant',
      status: 'En attente',
      budgetEstimé: '',
      terrainSurface: '',
      terrainLocation: '',
      hasTitreFoncier: false,
    });
    setErrors({});
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={client ? 'Modifier le client' : 'Nouveau client'}
      size="lg"
    >
      <div className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <Input
              label="Prénom"
              value={formData.prenom}
              onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
              error={errors.prenom}
              placeholder="Amadou"
            />

            <Input
              label="Nom"
              value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              error={errors.nom}
              placeholder="Diallo"
            />

          </div>

          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            error={errors.email}
            placeholder="amadou.diallo@example.com"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <Input
              label="Téléphone"
              value={formData.telephone}
              onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
              error={errors.telephone}
              placeholder="+221 77 123 45 67"
            />

            <Input
              label="Adresse"
              value={formData.adresse}
              onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
              error={errors.adresse}
              placeholder="Rue 10, Cité Keur Gorgui"
            />
          </div>

          <Input
            label="Localisation du site"
            value={formData.localisationSite}
            onChange={(e) => setFormData({ ...formData, localisationSite: e.target.value })}
            error={errors.localisationSite}
            placeholder="Cité Keur Gorgui, Lot 25, Dakar"
          />

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900">
              Projet adhéré
            </label>
            <select
              value={formData.projetAdhere}
              onChange={(e) => setFormData({ ...formData, projetAdhere: e.target.value })}
              className="block w-full h-12 px-4 py-3 border-2 border-gray-300 rounded-lg shadow-sm bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors font-medium appearance-none"
            >
              <option value="">Sélectionner un projet</option>
              {projects.map((project) => (
                <option key={project.id} value={`${project.name} ${project.type}`}>
                  {project.name} {project.type}
                </option>
              ))}
            </select>
            {errors.projetAdhere && (
              <p className="text-red-600 text-xs mt-1">{errors.projetAdhere}</p>
            )}
          </div>

          {selectedProject && (
            <div className="mt-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Aperçu du projet</h4>
              <div className="space-y-3">
                <ImageCarousel
                  images={selectedProject.images}
                  alt={selectedProject.name}
                  aspectRatio="wide"
                  className="h-24 sm:h-32"
                  showDots={true}
                  showArrows={true}
                />
                <div>
                  <h5 className="font-medium text-gray-900 text-sm sm:text-base">{selectedProject.name}</h5>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2 sm:line-clamp-3">{selectedProject.description}</p>
                  {selectedProject.price && (
                    <p className="text-sm font-semibold text-blue-600 mt-1">
                      {new Intl.NumberFormat('fr-FR', {
                        style: 'decimal',
                        minimumFractionDigits: 0,
                      }).format(selectedProject.price)} FCFA
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900">
              Type de paiement
            </label>
            <select
              value={formData.typePaiement}
              onChange={(e) => setFormData({ ...formData, typePaiement: e.target.value as 'comptant' | 'echeancier' })}
              className="block w-full h-12 px-4 py-3 border-2 border-gray-300 rounded-lg shadow-sm bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors font-medium appearance-none"
            >
              <option value="comptant">Paiement comptant</option>
              <option value="echeancier">Échéancier de paiement</option>
            </select>
            <p className="text-xs text-gray-500">
              {formData.typePaiement === 'comptant'
                ? 'Le client paiera la totalité en une fois'
                : 'Le client paiera en plusieurs échéances selon le montant du projet'
              }
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900">
              Statut
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as Client['status'] })}
              className="block w-full h-12 px-4 py-3 border-2 border-gray-300 rounded-lg shadow-sm bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors font-medium appearance-none"
            >
              <option value="En attente">En attente</option>
              <option value="En cours">En cours</option>
              <option value="Terminé">Terminé</option>
            </select>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg space-y-4 border border-gray-200">
            <h4 className="text-sm font-bold text-gray-900 border-b pb-2">Détails Techniques (du Prospect)</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Budget Estimé (FCFA)"
                value={formData.budgetEstimé}
                onChange={(e) => setFormData({ ...formData, budgetEstimé: e.target.value })}
                placeholder="15 000 000"
              />
              <Input
                label="Surface Terrain (m²)"
                value={formData.terrainSurface}
                onChange={(e) => setFormData({ ...formData, terrainSurface: e.target.value })}
                placeholder="200"
              />
            </div>

            <Input
              label="Localisation Terrain"
              value={formData.terrainLocation}
              onChange={(e) => setFormData({ ...formData, terrainLocation: e.target.value })}
              placeholder="Diamniadio, Lot 5"
            />

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="hasTitreFoncier"
                checked={formData.hasTitreFoncier}
                onChange={(e) => setFormData({ ...formData, hasTitreFoncier: e.target.checked })}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="hasTitreFoncier" className="text-sm font-medium text-gray-700">
                Détient un Titre Foncier
              </label>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Annuler
            </Button>
            <Button type="submit" className="w-full sm:w-auto order-1 sm:order-2">
              {client ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};