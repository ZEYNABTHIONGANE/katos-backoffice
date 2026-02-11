import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { MultiImageUploader } from '../ui/MultiImageUploader';
import { ImageCarousel } from '../ui/ImageCarousel';
import type { Project } from '../../types';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (project: Omit<Project, 'id'>) => void;
  project?: Project;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  project,
}) => {
  const [formData, setFormData] = useState<{
    name: string;
    type: string;
    description: string;
    images: string[];
    price: string;
    currency: string;
    surface: string;
    bedrooms: string;
    bathrooms: string;
  }>({
    name: '',
    type: '',
    description: '',
    images: [] as string[],
    price: '',
    currency: 'FCFA',
    surface: '',
    bedrooms: '',
    bathrooms: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Mettre à jour le formulaire quand le projet change
  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '',
        type: project.type || '',
        description: project.description || '',
        images: project.images || [],
        price: project.price ? project.price.toString() : '',
        currency: project.currency || 'FCFA',
        surface: project.surface ? project.surface.toString() : '',
        bedrooms: project.bedrooms ? project.bedrooms.toString() : '',
        bathrooms: project.bathrooms ? project.bathrooms.toString() : '',
      });
    } else {
      setFormData({
        name: '',
        type: '',
        description: '',
        images: [],
        price: '',
        currency: 'FCFA',
        surface: '',
        bedrooms: '',
        bathrooms: '',
      });
    }
    setErrors({});
  }, [project, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    if (!formData.name) newErrors.name = 'Le nom est requis';
    if (!formData.type) newErrors.type = 'Le type est requis';
    if (!formData.description) newErrors.description = 'La description est requise';
    if (!formData.images || formData.images.length === 0) newErrors.images = 'Au moins une image est requise';
    const priceNum = parseInt(formData.price);
    if (!formData.price || isNaN(priceNum) || priceNum <= 0) newErrors.price = 'Le prix doit être supérieur à 0';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({
      ...formData,
      price: parseInt(formData.price) || 0,
      surface: formData.surface ? parseInt(formData.surface) : undefined,
      bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : undefined,
      bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : undefined,
    });
    handleClose();
  };

  const handleClose = () => {
    setFormData({
      name: '',
      type: '',
      description: '',
      images: [],
      price: '',
      currency: 'FCFA',
      surface: '',
      bedrooms: '',
      bathrooms: '',
    });
    setErrors({});
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={project ? 'Modifier le projet' : 'Nouveau projet'}
      size="lg"
    >
      <div className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <Input
              label="Nom du projet"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={errors.name}
              placeholder="Villa Kenza F3"
            />

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-900">
                Type de projet
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="block w-full h-12 px-4 py-3 border-2 border-gray-300 rounded-lg shadow-sm bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors font-medium appearance-none"
              >
                <option value="">Sélectionner un type</option>
                <option value="F1">F1</option>
                <option value="F2">F2</option>
                <option value="F3">F3</option>
                <option value="F4">F4</option>
                <option value="F5">F5</option>
                <option value="F6">F6</option>
                <option value="F7+">F7+</option>
              </select>
              {errors.type && (
                <p className="text-red-600 text-xs mt-1">{errors.type}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900">
              Prix du projet
            </label>
            <div className="relative">
              <Input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                error={errors.price}
                placeholder="Prix du projet"
                min="1"
                step="1000"
                inputMode="numeric"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-gray-500 text-sm font-medium">FCFA</span>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Prix total du projet en francs CFA. Ce montant sera utilisé pour calculer les échéances de paiement.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <Input
              label="Surface (m²)"
              type="number"
              value={formData.surface}
              onChange={(e) => setFormData({ ...formData, surface: e.target.value })}
              placeholder="ex: 150"
            />
            <Input
              label="Chambres"
              type="number"
              value={formData.bedrooms}
              onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
              placeholder="ex: 4"
            />
            <Input
              label="Toilettes"
              type="number"
              value={formData.bathrooms}
              onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
              placeholder="ex: 3"
            />
          </div>

          {/* Section Upload Images */}
          <MultiImageUploader
            images={formData.images}
            onChange={(images) => setFormData({ ...formData, images })}
            maxImages={8}
            label="Images du projet"
            error={errors.images}
          />

          {/* Aperçu carousel si images présentes */}
          {formData.images.length > 0 && (
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-900">
                Aperçu du projet
              </label>
              <ImageCarousel
                images={formData.images}
                alt="Aperçu du projet"
                aspectRatio="video"
                className="h-48"
                showDots={true}
                showArrows={true}
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="block w-full px-4 py-3 border-2 border-gray-300 rounded-lg shadow-sm bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors font-medium resize-none"
              rows={4}
              placeholder="Description détaillée du projet..."
            />
            {errors.description && (
              <p className="text-red-600 text-xs mt-1">{errors.description}</p>
            )}
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
              {project ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};