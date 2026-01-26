import { useState, useEffect } from 'react';
import { projectService } from '../services/projectService';
import type { FirebaseProject } from '../types/firebase';

export const useFirebaseProjects = () => {
  const [projects, setProjects] = useState<FirebaseProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Écouter les changements en temps réel
    const unsubscribe = projectService.subscribeToProjects((updatedProjects) => {
      setProjects(updatedProjects);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const addProject = async (projectData: Omit<FirebaseProject, 'id' | 'createdAt'>) => {
    try {
      setError(null);
      await projectService.addProject(projectData);
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'ajout du projet');
      return false;
    }
  };

  const updateProject = async (id: string, updates: Partial<Omit<FirebaseProject, 'id' | 'createdAt'>>) => {
    try {
      setError(null);
      await projectService.updateProject(id, updates);
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour du projet');
      return false;
    }
  };

  const deleteProject = async (id: string) => {
    try {
      setError(null);
      await projectService.deleteProject(id);
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression du projet');
      return false;
    }
  };

  const uploadProjectImages = async (files: File[], projectId?: string) => {
    try {
      setError(null);
      return await projectService.uploadProjectImages(files, projectId);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'upload des images');
      return [];
    }
  };

  const getProjectsByType = async (type: string) => {
    try {
      setError(null);
      return await projectService.getProjectsByType(type);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la recherche par type');
      return [];
    }
  };

  return {
    projects,
    loading,
    error,
    addProject,
    updateProject,
    deleteProject,
    uploadProjectImages,
    getProjectsByType
  };
};