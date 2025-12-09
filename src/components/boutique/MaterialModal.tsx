/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { Upload, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { storageService } from '../../services/storageService';
import type { Material } from '../../types';

interface MaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (material: Omit<Material, 'id'>) => void;
  material?: Material;
}

export const MaterialModal: React.FC<MaterialModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  material,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '' as any,
    image: '',
    supplier: '',
    description: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>('');

  // Mettre à jour le formulaire quand le matériau change
  useEffect(() => {
    if (material) {
      setFormData({
        name: material.name || '',
        category: material.category || '',
        price: material.price || 0,
        image: material.image || '',
        supplier: material.supplier || '',
        description: material.description || '',
      });
      setImagePreview(material.image || '');
    } else {
      setFormData({
        name: '',
        category: '',
        price: '',
        image: '',
        supplier: '',
        description: '',
      });
      setImagePreview('');
    }
    setErrors({});
    setSelectedFile(null);
    setUploading(false);
  }, [material, isOpen]);

  const categories = [
    'Carrelage et Grès',
    'Peinture et Enduits',
    'Plomberie et Sanitaires',
    'Électricité et Éclairage',
    'Menuiserie Bois/Alu',
    'Quincaillerie',
    'Revêtement sol',
    'Isolation thermique',
    'Matériaux de construction',
    'Outillage',
    'Autre'
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      storageService.validateImageFile(file);
      setSelectedFile(file);
      setErrors({ ...errors, image: '' });

      // Créer un aperçu local
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      setErrors({ ...errors, image: error.message });
    }
  };

  const removeImage = () => {
    setSelectedFile(null);
    setImagePreview('');
    setFormData({ ...formData, image: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      const newErrors: Record<string, string> = {};

      if (!formData.name) newErrors.name = 'Le nom est requis';
      if (!formData.category) newErrors.category = 'La catégorie est requise';
      if (!formData.price || Number(formData.price) <= 0) newErrors.price = 'Le prix doit être supérieur à 0';
      if (!formData.supplier) newErrors.supplier = 'Le fournisseur est requis';
      if (!formData.description) newErrors.description = 'La description est requise';

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        setUploading(false);
        return;
      }

      let finalImageUrl = formData.image;

      // Upload de l'image si un fichier est sélectionné
      if (selectedFile) {
        finalImageUrl = await storageService.uploadMaterialImage(selectedFile);
      }

      const materialData = {
        ...formData,
        price: Number(formData.price),
        image: finalImageUrl
      };

      onSubmit(materialData);
      handleClose();
    } catch (error: any) {
      setErrors({ ...errors, image: error.message || 'Erreur lors de l\'upload' });
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      category: '',
      price: '',
      image: '',
      supplier: '',
      description: '',
    });
    setErrors({});
    setSelectedFile(null);
    setImagePreview('');
    setUploading(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={material ? 'Modifier le matériau' : 'Nouveau matériau'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Nom du matériau"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={errors.name}
            placeholder="Carrelage Sénégalais Premium"
          />

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900">
              Catégorie
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="block w-full h-12 px-4 py-3 border-2 border-gray-300 rounded-lg shadow-sm bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors font-medium appearance-none"
            >
              <option value="">Sélectionner une catégorie</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="text-red-600 text-xs mt-1">{errors.category}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Prix (FCFA)"
            type="number"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value ? Number(e.target.value) : '' })}
            error={errors.price}
            placeholder="25000"
            min="0"
            step="0.01"
          />

          <Input
            label="Fournisseur"
            value={formData.supplier}
            onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
            error={errors.supplier}
            placeholder="SOCAREX Sénégal"
          />
        </div>

        {/* Section Upload Image */}
        <div className="space-y-4">
          <label className="block text-sm font-semibold text-gray-900">
            Image du matériau
          </label>

          {/* Zone de glisser-déposer */}
          <div className="relative">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="image-upload"
            />

            {!imagePreview ? (
              <label
                htmlFor="image-upload"
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">
                  Cliquez pour sélectionner une image
                </p>
                <p className="text-xs text-gray-400">
                  JPG, PNG, WebP (max 5MB)
                </p>
              </label>
            ) : (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Aperçu"
                  className="w-full h-32 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {errors.image && (
            <p className="text-red-600 text-xs mt-1">{errors.image}</p>
          )}

          {/* Option URL alternative */}
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-2">ou</p>
            <Input
              label="URL d'image externe"
              value={formData.image}
              onChange={(e) => {
                setFormData({ ...formData, image: e.target.value });
                if (e.target.value && !selectedFile) {
                  setImagePreview(e.target.value);
                }
              }}
              placeholder="https://images.unsplash.com/photo-..."
              size={12}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-900">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="block w-full px-4 py-3 border-2 border-gray-300 rounded-lg shadow-sm bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors font-medium resize-none"
            rows={4}
            placeholder="Description détaillée du matériau..."
          />
          {errors.description && (
            <p className="text-red-600 text-xs mt-1">{errors.description}</p>
          )}
        </div>

        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
          >
            Annuler
          </Button>
          <Button type="submit" disabled={uploading}>
            {uploading ? 'Upload en cours...' : material ? 'Modifier' : 'Créer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};