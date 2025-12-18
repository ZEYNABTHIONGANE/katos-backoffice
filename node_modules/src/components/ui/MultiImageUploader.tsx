import React, { useState } from 'react';
import { Upload, X, Plus, Image as ImageIcon } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { storageService } from '../../services/storageService';

interface MultiImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
  label?: string;
  error?: string;
}

export const MultiImageUploader: React.FC<MultiImageUploaderProps> = ({
  images,
  onChange,
  maxImages = 10,
  label = "Images",
  error
}) => {
  const [uploading, setUploading] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (images.length + files.length > maxImages) {
      alert(`Maximum ${maxImages} images autorisées`);
      return;
    }

    setUploading(true);

    try {
      const uploadPromises = files.map(async (file) => {
        storageService.validateImageFile(file);
        return await storageService.uploadImage(file, 'projects/temp');
      });

      const newUrls = await Promise.all(uploadPromises);
      onChange([...images, ...newUrls]);
    } catch (error: any) {
      alert(error.message || 'Erreur lors de l\'upload');
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const addUrlImage = () => {
    if (newImageUrl.trim()) {
      if (images.length >= maxImages) {
        alert(`Maximum ${maxImages} images autorisées`);
        return;
      }
      onChange([...images, newImageUrl.trim()]);
      setNewImageUrl('');
    }
  };

  const removeImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-semibold text-gray-900">
        {label} ({images.length}/{maxImages})
      </label>

      {/* Zone d'upload */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Upload fichiers */}
        <div>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id="multiple-image-upload"
            disabled={uploading || images.length >= maxImages}
          />

          <label
            htmlFor="multiple-image-upload"
            className={`flex flex-col items-center justify-center h-24 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
              uploading || images.length >= maxImages
                ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
            }`}
          >
            <Upload className="w-6 h-6 text-gray-400 mb-1" />
            <p className="text-xs text-gray-600">
              {uploading ? 'Upload...' : 'Sélectionner images'}
            </p>
            <p className="text-xs text-gray-400">JPG, PNG, WebP</p>
          </label>
        </div>

        {/* URL manuelle */}
        <div className="space-y-2">
          <Input
            value={newImageUrl}
            onChange={(e) => setNewImageUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
            size="sm"
            disabled={images.length >= maxImages}
          />
          <Button
            type="button"
            onClick={addUrlImage}
            variant="outline"
            size="sm"
            disabled={!newImageUrl.trim() || images.length >= maxImages}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-1" />
            Ajouter URL
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-red-600 text-xs mt-1">{error}</p>
      )}

      {/* Aperçu des images */}
      {images.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700">Aperçu des images :</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {images.map((image, index) => (
              <div key={index} className="relative group">
                <img
                  src={image}
                  alt={`Image ${index + 1}`}
                  className="w-full h-20 object-cover rounded-lg border-2 border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
                <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                  {index + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* État vide */}
      {images.length === 0 && (
        <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg">
          <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Aucune image ajoutée</p>
          <p className="text-xs text-gray-400">Utilisez l'upload ou ajoutez une URL</p>
        </div>
      )}
    </div>
  );
};