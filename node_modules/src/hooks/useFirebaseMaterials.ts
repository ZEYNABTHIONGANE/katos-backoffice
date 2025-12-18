import { useState, useEffect } from 'react';
import { materialService } from '../services/materialService';
import type { FirebaseMaterial } from '../types/firebase';

export const useFirebaseMaterials = () => {
  const [materials, setMaterials] = useState<FirebaseMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Écouter les changements en temps réel
    const unsubscribe = materialService.subscribeToMaterials((updatedMaterials) => {
      setMaterials(updatedMaterials);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const addMaterial = async (materialData: Omit<FirebaseMaterial, 'id' | 'createdAt'>) => {
    try {
      setError(null);
      await materialService.addMaterial(materialData);
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'ajout du matériau');
      return false;
    }
  };

  const updateMaterial = async (id: string, updates: Partial<Omit<FirebaseMaterial, 'id' | 'createdAt'>>) => {
    try {
      setError(null);
      await materialService.updateMaterial(id, updates);
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour du matériau');
      return false;
    }
  };

  const deleteMaterial = async (id: string) => {
    try {
      setError(null);
      await materialService.deleteMaterial(id);
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression du matériau');
      return false;
    }
  };

  const getMaterialsByCategory = async (category: string) => {
    try {
      setError(null);
      return await materialService.getMaterialsByCategory(category);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la recherche par catégorie');
      return [];
    }
  };

  return {
    materials,
    loading,
    error,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    getMaterialsByCategory
  };
};