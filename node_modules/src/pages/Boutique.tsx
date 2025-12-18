import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, ShoppingBag } from 'lucide-react';
import { toast } from 'react-toastify';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { MaterialModal } from '../components/boutique/MaterialModal';
import { useMaterialStore } from '../store/materialStore';
import { useConfirm } from '../hooks/useConfirm';
import type { Material } from '../types';

export const Boutique: React.FC = () => {
  const { materials, addMaterial, updateMaterial, deleteMaterial, initializeMaterials } = useMaterialStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | undefined>();
  const { confirmState, confirm, handleConfirm, handleClose } = useConfirm();

  // Initialiser les matériaux au montage du composant
  useEffect(() => {
    initializeMaterials();
  }, [initializeMaterials]);

  const handleAddMaterial = async (materialData: Omit<Material, 'id'>) => {
    const success = await addMaterial(materialData);
    if (success) {
      toast.success('Matériau ajouté avec succès à la vitrine');
      handleCloseModal();
    } else {
      toast.error('Erreur lors de l\'ajout du matériau');
    }
  };

  const handleEditMaterial = (material: Material) => {
    setSelectedMaterial(material);
    setIsModalOpen(true);
  };

  const handleUpdateMaterial = async (materialData: Omit<Material, 'id'>) => {
    if (selectedMaterial) {
      const success = await updateMaterial(selectedMaterial.id, materialData);
      if (success) {
        toast.success('Matériau modifié avec succès');
        handleCloseModal();
      } else {
        toast.error('Erreur lors de la modification du matériau');
      }
    }
  };

  const handleDeleteMaterial = (material: Material) => {
    confirm(
      async () => {
        const success = await deleteMaterial(material.id);
        if (success) {
          toast.success('Matériau supprimé avec succès');
        } else {
          toast.error('Erreur lors de la suppression du matériau');
        }
      },
      {
        title: 'Supprimer',
        message: `Êtes-vous sûr de vouloir supprimer le matériau "${material.name}" ? Cette action est irréversible et supprimera également l'image associée.`,
        confirmText: 'Supprimer le matériau',
        type: 'danger'
      }
    );
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedMaterial(undefined);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Boutique</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Gérez la vitrine des matériaux de second œuvre</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Nouveau produit
        </Button>
      </div>


      {materials.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {materials.map((material) => (
            <Card key={material.id} className="hover:shadow-lg transition-shadow flex flex-col p-4 sm:p-6">
              <div className="flex flex-col h-full space-y-3 sm:space-y-4">
                <div className="aspect-video w-full">
                  <img
                    src={material.image}
                    alt={material.name}
                    className="w-full h-32 sm:h-40 object-cover rounded-lg"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1604079628040-94301bb21b91?w=400';
                    }}
                  />
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                    <h3 className="font-semibold text-gray-900 text-sm sm:text-base line-clamp-2 flex-1">
                      {material.name}
                    </h3>
                    <span className="text-sm sm:text-base font-bold text-gold-600 whitespace-nowrap">
                      {material.price.toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      {material.category}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">
                    {material.description}
                  </p>

                  <p className="text-xs text-gray-500 truncate">
                    Fournisseur: {material.supplier}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 pt-2 mt-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs sm:text-sm"
                    onClick={() => handleEditMaterial(material)}
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    <span className="hidden sm:inline">Modifier</span>
                    <span className="sm:hidden">Mod</span>
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDeleteMaterial(material)}
                    className="sm:w-auto w-full text-xs sm:text-sm"
                  >
                    <Trash2 className="w-3 h-3 sm:mr-1" />
                    <span className="hidden sm:inline ml-1">Supprimer</span>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-4 sm:p-6">
          <div className="text-center py-8 sm:py-12">
            <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-3 sm:mb-4">
              <ShoppingBag className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
            </div>
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
              Aucun matériau disponible
            </h3>
            <p className="text-sm sm:text-base text-gray-500 mb-4">
              Commencez par ajouter des matériaux à votre vitrine
            </p>
            <Button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Nouveau produit
            </Button>
          </div>
        </Card>
      )}

      <MaterialModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={selectedMaterial ? handleUpdateMaterial : handleAddMaterial}
        material={selectedMaterial}
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