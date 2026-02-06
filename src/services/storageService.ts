import { cloudinaryService } from './cloudinaryService';

export class StorageService {
  /**
   * Upload une image vers Cloudinary (précédemment Firebase)
   */
  async uploadImage(file: File, folderPath: string = 'temp'): Promise<string> {
    try {
      console.warn(`StorageService.uploadImage is now using Cloudinary. folderPath: ${folderPath} is ignored.`);
      return cloudinaryService.uploadFile(file, 'image');
    } catch (error: any) {
      console.error('Erreur upload image vers Cloudinary:', error);
      throw new Error(error.message || 'Erreur lors de l\'upload de l\'image');
    }
  }

  /**
   * Compatibilité - méthode pour matériaux
   */
  async uploadMaterialImage(file: File, materialId?: string): Promise<string> {
    return this.uploadImage(file, materialId ? `materials/${materialId}` : `materials/temp`);
  }

  /**
   * Supprimer une image (Stub: Nécessite API Admin Cloudinary pour suppression réelle)
   */
  async deleteImage(_imageUrl: string): Promise<void> {
    console.warn('Delete image on Cloudinary requires signed API or specific setup. Skipping for now.');
  }

  /**
   * Valider le type de fichier
   */
  validateImageFile(file: File): boolean {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      throw new Error('Format d\'image non supporté. Utilisez JPG, PNG ou WebP.');
    }

    if (file.size > maxSize) {
      throw new Error('L\'image est trop volumineuse. Maximum 5MB.');
    }

    return true;
  }

  /**
   * Redimensionnement (Optionnel - conservé car utile côté client)
   */
  async resizeImage(file: File, maxWidth: number = 800, maxHeight: number = 600): Promise<File> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();

      img.onload = () => {
        let { width, height } = img;
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          const resizedFile = new File([blob!], file.name, {
            type: file.type,
            lastModified: Date.now()
          });
          resolve(resizedFile);
        }, file.type, 0.8);
      };
      img.src = URL.createObjectURL(file);
    });
  }
}

export const storageService = new StorageService();