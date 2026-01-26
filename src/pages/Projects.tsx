import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ImageCarousel } from '../components/ui/ImageCarousel';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { ProjectModal } from '../components/projects/ProjectModal';
import { useProjectStore } from '../store/projectStore';
import { useConfirm } from '../hooks/useConfirm';
import type { Project } from '../types';

export const Projects: React.FC = () => {
  const { projects, addProject, updateProject, deleteProject, error } = useProjectStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>();
  const { confirmState, confirm, handleConfirm, handleClose } = useConfirm();

  const handleAddProject = () => {
    setEditingProject(undefined);
    setIsModalOpen(true);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setIsModalOpen(true);
  };

  const handleDeleteProject = (project: Project) => {
    confirm(
      () => deleteProject(project.id),
      {
        title: 'Supprimer',
        message: `Êtes-vous sûr de vouloir supprimer le projet "${project.name} ${project.type}" ? Cette action est irréversible et supprimera également toutes les images associées.`,
        confirmText: 'Supprimer le projet',
        type: 'danger'
      }
    );
  };

  const handleSubmit = async (projectData: Omit<Project, 'id'>) => {
    try {
      if (editingProject) {
        const success = await updateProject(editingProject.id, projectData);
        if (success) {
          toast.success('Projet mis à jour avec succès');
        } else {
          toast.error(error || 'Erreur lors de la mise à jour du projet');
        }
      } else {
        const success = await addProject(projectData);
        if (success) {
          toast.success('Projet créé avec succès');
        } else {
          toast.error(error || 'Erreur lors de la création du projet');
        }
      }
    } catch (error) {
      toast.error('Une erreur inattendue est survenue');
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Villas</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">Gérez vos villas</p>
        </div>
        <Button onClick={handleAddProject} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle Villa
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-4">
        {projects.map((project) => (
          <Card key={project.id} className="overflow-hidden flex flex-col">
            <ImageCarousel
              images={project.images}
              alt={`${project.name} ${project.type}`}
              aspectRatio="video"
              showDots={true}
              showArrows={true}
              className="flex-shrink-0"
            />
            <div className="p-4 sm:p-6 flex-1 flex flex-col">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3 gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 leading-tight break-words">
                    {project.name} {project.type}
                  </h3>
                </div>
                <div className="flex space-x-1 sm:space-x-2 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditProject(project)}
                    className="p-2"
                  >
                    <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteProject(project)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2"
                  >
                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                </div>
              </div>
              <p className="text-gray-600 text-xs sm:text-sm line-clamp-3 flex-1">{project.description}</p>
            </div>
          </Card>
        ))}
      </div>

      {projects.length === 0 && (
        <div className="text-center py-8 sm:py-12 px-4">
          <div className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Plus className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
          </div>
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">Aucun projet</h3>
          <p className="text-sm sm:text-base text-gray-600 mb-4">Commencez par créer votre premier projet</p>
          <Button onClick={handleAddProject} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Créer un projet
          </Button>
        </div>
      )}

      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        project={editingProject}
      />

      <ConfirmModal
        isOpen={confirmState.isOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        type={confirmState.type}
        loading={confirmState.loading}
      />
    </div>
  );
};