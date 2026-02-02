<<<<<<< HEAD
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../config/firebase';

export class StorageService {
  // Upload une image et retourne l'URL (méthode générique)
  async uploadImage(file: File, folderPath: string = 'temp'): Promise<string> {
    try {
      // Générer un nom unique pour le fichier
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const storageRef = ref(storage, `${folderPath}/${fileName}`);

      // Upload du fichier
      const snapshot = await uploadBytes(storageRef, file);

      // Récupérer l'URL de téléchargement
      const downloadURL = await getDownloadURL(snapshot.ref);

      return downloadURL;
    } catch (error: any) {
      console.error('Erreur upload image:', error);
=======
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
>>>>>>> e232376998e67a699b3bf96313d2dcc4717b2f88
      throw new Error(error.message || 'Erreur lors de l\'upload de l\'image');
    }
  }

<<<<<<< HEAD
  // Compatibilité - méthode pour matériaux
  async uploadMaterialImage(file: File, materialId?: string): Promise<string> {
    const folderPath = materialId ? `materials/${materialId}` : `materials/temp`;
    return this.uploadImage(file, folderPath);
  }

  // Supprimer une image
  async deleteImage(imageUrl: string): Promise<void> {
    try {
      // Extraire le path depuis l'URL Firebase
      const url = new URL(imageUrl);
      const path = decodeURIComponent(url.pathname.split('/o/')[1].split('?')[0]);

      const imageRef = ref(storage, path);
      await deleteObject(imageRef);
    } catch (error: any) {
      console.error('Erreur suppression image:', error);
      // Ne pas faire échouer si l'image n'existe pas
    }
  }

  // Valider le type de fichier
=======
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
>>>>>>> e232376998e67a699b3bf96313d2dcc4717b2f88
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

<<<<<<< HEAD
  // Redimensionner l'image (optionnel - côté client)
=======
  /**
   * Redimensionnement (Optionnel - conservé car utile côté client)
   */
>>>>>>> e232376998e67a699b3bf96313d2dcc4717b2f88
  async resizeImage(file: File, maxWidth: number = 800, maxHeight: number = 600): Promise<File> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();

      img.onload = () => {
<<<<<<< HEAD
        // Calculer les nouvelles dimensions
        let { width, height } = img;

=======
        let { width, height } = img;
>>>>>>> e232376998e67a699b3bf96313d2dcc4717b2f88
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
<<<<<<< HEAD

        canvas.width = width;
        canvas.height = height;

        // Dessiner l'image redimensionnée
        ctx.drawImage(img, 0, 0, width, height);

        // Convertir en blob puis en File
=======
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
>>>>>>> e232376998e67a699b3bf96313d2dcc4717b2f88
        canvas.toBlob((blob) => {
          const resizedFile = new File([blob!], file.name, {
            type: file.type,
            lastModified: Date.now()
          });
          resolve(resizedFile);
        }, file.type, 0.8);
      };
<<<<<<< HEAD

=======
>>>>>>> e232376998e67a699b3bf96313d2dcc4717b2f88
      img.src = URL.createObjectURL(file);
    });
  }
}

export const storageService = new StorageService();