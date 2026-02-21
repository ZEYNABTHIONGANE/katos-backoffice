import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { MultiImageUploader } from '../ui/MultiImageUploader';
import { terrainService } from '../../services/terrainService';
import { toast } from 'react-toastify';
import type { FirebaseTerrain } from '../../types/firebase';

interface TerrainModalProps {
    isOpen: boolean;
    onClose: () => void;
    terrain?: FirebaseTerrain;
}

export const TerrainModal: React.FC<TerrainModalProps> = ({
    isOpen,
    onClose,
    terrain,
}) => {
    const [formData, setFormData] = useState<Omit<FirebaseTerrain, 'id' | 'createdAt'>>({
        reference: '',
        name: '',
        surface: 0,
        price: 0,
        currency: 'FCFA',
        documentType: 'Titre foncier',
        hasWater: false,
        hasElectricity: false,
        isHabited: false,
        description: '',
        status: 'Disponible',
        zone: '',
        images: [],
    });

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (terrain) {
                setFormData({
                    reference: terrain.reference || '',
                    name: terrain.name || '',
                    surface: terrain.surface || 0,
                    price: terrain.price || 0,
                    currency: terrain.currency || 'FCFA',
                    documentType: terrain.documentType || 'Titre foncier',
                    hasWater: !!terrain.hasWater,
                    hasElectricity: !!terrain.hasElectricity,
                    isHabited: !!terrain.isHabited,
                    description: terrain.description || '',
                    status: terrain.status || 'Disponible',
                    zone: terrain.zone || '',
                    images: terrain.images || [],
                });
            } else {
                setFormData({
                    reference: '',
                    name: '',
                    surface: 0,
                    price: 0,
                    currency: 'FCFA',
                    documentType: 'Titre foncier',
                    hasWater: false,
                    hasElectricity: false,
                    isHabited: false,
                    description: '',
                    status: 'Disponible',
                    zone: '',
                    images: [],
                });
            }
        }
    }, [terrain, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (terrain?.id) {
                await terrainService.updateTerrain(terrain.id, formData);
                toast.success('Terrain mis à jour');
            } else {
                await terrainService.addTerrain(formData);
                toast.success('Terrain ajouté');
            }
            onClose();
        } catch (error) {
            toast.error('Erreur lors de l\'enregistrement');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={terrain ? 'Modifier le terrain' : 'Ajouter un terrain'}
            size="lg"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                        label="Référence"
                        value={formData.reference}
                        onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                        placeholder="ex: T001"
                        required
                    />
                    <Input
                        label="Nom du terrain"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="ex: Terrain Yenne"
                        required
                    />
                    <Input
                        label="Zone"
                        value={formData.zone}
                        onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                        placeholder="ex: Yenne"
                        required
                    />
                    <Select
                        label="Type de document"
                        value={formData.documentType}
                        onChange={(e) => setFormData({ ...formData, documentType: e.target.value })}
                        required
                    >
                        <option value="Titre foncier">Titre foncier</option>
                        <option value="Bail">Bail</option>
                        <option value="Délibération">Délibération</option>
                        <option value="Attestation de vente">Attestation de vente</option>
                        <option value="Cession">Cession</option>
                        <option value="Domaine National">Domaine National</option>
                    </Select>
                    <Input
                        label="Surface (m²)"
                        type="number"
                        value={formData.surface.toString()}
                        onChange={(e) => setFormData({ ...formData, surface: parseInt(e.target.value) || 0 })}
                        required
                    />
                    <Input
                        label="Prix (FCFA)"
                        type="number"
                        value={formData.price.toString()}
                        onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                        required
                    />
                </div>

                <div className="flex flex-wrap gap-6">
                    <label className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            checked={formData.hasWater}
                            onChange={(e) => setFormData({ ...formData, hasWater: e.target.checked })}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">Eau disponible</span>
                    </label>
                    <label className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            checked={formData.hasElectricity}
                            onChange={(e) => setFormData({ ...formData, hasElectricity: e.target.checked })}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">Électricité disponible</span>
                    </label>
                    <label className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            checked={formData.isHabited}
                            onChange={(e) => setFormData({ ...formData, isHabited: e.target.checked })}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">Zone habitée</span>
                    </label>
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        rows={3}
                        required
                    />
                </div>

                <MultiImageUploader
                    images={formData.images}
                    onChange={(images) => setFormData({ ...formData, images })}
                    label="Images du terrain"
                    maxImages={5}
                />

                <div className="flex justify-end space-x-3">
                    <Button variant="outline" onClick={onClose} type="button">Annuler</Button>
                    <Button type="submit" loading={loading}>
                        {terrain ? 'Enregistrer les modifications' : 'Ajouter le terrain'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
