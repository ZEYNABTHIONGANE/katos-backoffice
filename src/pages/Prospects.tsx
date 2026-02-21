
import React, { useState, useEffect } from 'react';
import { Mail, Phone, Trash2, CheckCircle, XCircle, Clock, Filter, UserPlus, Users, Eye, X, MapPin, Ruler, FileText, Banknote } from 'lucide-react';
import { toast } from 'react-toastify';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { prospectService } from '../services/prospectService';
import type { FirebaseProspect } from '../services/prospectService';
import { clientService } from '../services/clientService';
import { clientAccountService } from '../services/clientAccountService';
import { useConfirm } from '../hooks/useConfirm';

export const Prospects: React.FC = () => {
    const [prospects, setProspects] = useState<FirebaseProspect[]>([]);
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'validated' | 'rejected'>('all');
    const [loading, setLoading] = useState(true);
    const [selectedProspect, setSelectedProspect] = useState<FirebaseProspect | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const { confirmState, confirm, handleConfirm, handleClose } = useConfirm();

    useEffect(() => {
        const unsubscribe = prospectService.subscribeToProspects((data) => {
            setProspects(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleDelete = (prospect: FirebaseProspect) => {
        confirm(
            async () => {
                try {
                    await prospectService.deleteProspect(prospect.id);
                    toast.success('Prospect supprimé avec succès');
                } catch (error) {
                    toast.error('Erreur lors de la suppression');
                }
            },
            {
                title: 'Supprimer le prospect',
                message: `Êtes-vous sûr de vouloir supprimer "${prospect.firstName} ${prospect.lastName}" ?`,
                confirmText: 'Supprimer',
                type: 'danger'
            }
        );
    };

    const handleValidate = (prospect: FirebaseProspect) => {
        confirm(
            async () => {
                try {
                    // 1. Create client from prospect data
                    const clientId = await clientService.addClient({
                        nom: prospect.lastName,
                        prenom: prospect.firstName,
                        email: prospect.email,
                        telephone: prospect.phone,
                        adresse: '',
                        localisationSite: '',
                        projetAdhere: prospect.project || 'Non spécifié',
                        status: 'En attente',
                        isActive: true,
                        invitationStatus: 'pending',
                        typePaiement: 'echeancier',
                        budgetEstimé: prospect.budget,
                        terrainSurface: prospect.terrainSurface,
                        terrainLocation: prospect.terrainLocation,
                        hasTitreFoncier: prospect.hasTitreFoncier
                    });

                    // 2. Create client account (Auth + Firestore User)
                    const accountResult = await clientAccountService.createClientAccount(
                        prospect.email,
                        `${prospect.firstName} ${prospect.lastName}`,
                        clientId
                    );

                    // 3. Update client document with account info
                    if (accountResult.success) {
                        await clientService.updateClient(clientId, {
                            userId: accountResult.uid,
                            username: accountResult.username,
                            tempPassword: accountResult.tempPassword,
                            invitationStatus: 'accepted' // Automatically accepted since account is created
                        });
                    }

                    // 4. Update prospect status
                    await prospectService.updateProspectStatus(prospect.id, 'validated');

                    if (accountResult.success) {
                        toast.success(
                            <div>
                                <p className="font-bold text-green-700 mb-1">Prospect validé et compte créé !</p>
                                <p className="text-sm text-gray-700">Identifiant : <span className="font-mono font-bold">{accountResult.username}</span></p>
                                <p className="text-sm text-gray-700">Mot de passe : <span className="font-mono font-bold">{accountResult.tempPassword}</span></p>
                            </div>,
                            { autoClose: false }
                        );
                    } else {
                        toast.success('Prospect validé (profil créé), mais erreur lors de la création du compte auto : ' + accountResult.error);
                    }
                } catch (error) {
                    toast.error('Erreur lors de la validation');
                }
            },
            {
                title: 'Valider le prospect',
                message: `Voulez-vous valider "${prospect.firstName} ${prospect.lastName}" et le convertir en client ?`,
                confirmText: 'Valider',
                type: 'info'
            }
        );
    };

    const handleViewDetails = (prospect: FirebaseProspect) => {
        setSelectedProspect(prospect);
        setIsDetailModalOpen(true);
    };

    const getTypeLabel = (type?: string) => {
        switch (type) {
            case 'Standard': return 'Modèle Catalogue';
            case 'Custom': return 'Projet Personnalisé';
            case 'Meeting': return 'Rendez-vous Conseil';
            default: return 'Non spécifié';
        }
    };

    const filteredProspects = prospects.filter(p => {
        if (statusFilter === 'all') return true;
        return p.status === statusFilter;
    });

    const getStatusBadge = (status: FirebaseProspect['status']) => {
        switch (status) {
            case 'pending':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" /> En attente</span>;
            case 'validated':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" /> Validé</span>;
            case 'rejected':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" /> Refusé</span>;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Prospects</h1>
                    <p className="text-gray-600 mt-1">Gérez les demandes d'adhésion depuis l'application mobile</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <div className="relative">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="appearance-none bg-white border border-gray-300 text-gray-700 py-2 px-4 pr-8 rounded leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                        >
                            <option value="all">Tous les prospects</option>
                            <option value="pending">En attente</option>
                            <option value="validated">Validés</option>
                            <option value="rejected">Refusés</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                            <Filter className="h-4 w-4" />
                        </div>
                    </div>
                </div>
            </div>

            <Card className="p-0">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Chargement des prospects...</div>
                ) : filteredProspects.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prospect</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Projet souhaité</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Budget</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredProspects.map((prospect) => (
                                    <tr key={prospect.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{prospect.firstName} {prospect.lastName}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900 flex items-center mb-1">
                                                <Mail className="w-3 h-3 mr-2 text-gray-400" /> {prospect.email}
                                            </div>
                                            <div className="text-sm text-gray-500 flex items-center">
                                                <Phone className="w-3 h-3 mr-2 text-gray-400" /> {prospect.phone}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">{prospect.project || '-'}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {prospect.createdAt?.toDate ? prospect.createdAt.toDate().toLocaleDateString() : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-semibold text-gray-900">{prospect.budget ? `${prospect.budget} FCFA` : '-'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(prospect.status)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex space-x-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleViewDetails(prospect)}
                                                    className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                                    title="Voir les détails"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                                {prospect.status === 'pending' && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleValidate(prospect)}
                                                        className="bg-green-50 text-green-600 hover:bg-green-100 border-green-200"
                                                        title="Convertir en client"
                                                    >
                                                        <UserPlus className="w-4 h-4" />
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleDelete(prospect)}
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    title="Supprimer"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-12 px-4">
                        <Users className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">Aucun prospect</h3>
                        <p className="text-gray-500">Les demandes de l'application mobile apparaîtront ici.</p>
                    </div>
                )}
            </Card>

            <Modal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                title="Détails du Prospect"
                size="lg"
            >
                {selectedProspect && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-start border-b pb-4">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">{selectedProspect.firstName} {selectedProspect.lastName}</h2>
                                <p className="text-sm text-gray-500">Demande reçue le {selectedProspect.createdAt?.toDate ? selectedProspect.createdAt.toDate().toLocaleString() : 'N/A'}</p>
                            </div>
                            {getStatusBadge(selectedProspect.status)}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Contact Info */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center">
                                    <Users className="w-4 h-4 mr-2 text-indigo-500" /> Informations Personnelles
                                </h3>
                                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                                    <div className="flex items-center text-sm">
                                        <Mail className="w-4 h-4 mr-3 text-gray-400" />
                                        <span className="text-gray-900 font-medium">{selectedProspect.email}</span>
                                    </div>
                                    <div className="flex items-center text-sm">
                                        <Phone className="w-4 h-4 mr-3 text-gray-400" />
                                        <span className="text-gray-900 font-medium">{selectedProspect.phone}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Project Info */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center">
                                    <FileText className="w-4 h-4 mr-2 text-indigo-500" /> Type de Projet
                                </h3>
                                <div className="bg-indigo-50 p-4 rounded-lg">
                                    <div className="text-indigo-900 font-bold">{getTypeLabel(selectedProspect.type)}</div>
                                    <div className="text-sm text-indigo-700 mt-1">{selectedProspect.project || 'Aucun modèle spécifique'}</div>
                                </div>
                            </div>
                        </div>

                        {/* Technical Details */}
                        {selectedProspect.type !== 'Meeting' && (
                            <div className="space-y-4 border-t pt-6">
                                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center">
                                    <MapPin className="w-4 h-4 mr-2 text-indigo-500" /> Détails du Terrain & Budget
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="bg-white border rounded-lg p-3">
                                        <div className="text-xs text-gray-500 mb-1 flex items-center">
                                            <MapPin className="w-3 h-3 mr-1" /> Localisation
                                        </div>
                                        <div className="text-sm font-semibold text-gray-900">{selectedProspect.terrainLocation || '-'}</div>
                                    </div>
                                    <div className="bg-white border rounded-lg p-3">
                                        <div className="text-xs text-gray-500 mb-1 flex items-center">
                                            <Ruler className="w-3 h-3 mr-1" /> Surface
                                        </div>
                                        <div className="text-sm font-semibold text-gray-900">{selectedProspect.terrainSurface ? `${selectedProspect.terrainSurface} m²` : '-'}</div>
                                    </div>
                                    <div className="bg-white border rounded-lg p-3">
                                        <div className="text-xs text-gray-500 mb-1 flex items-center">
                                            <Banknote className="w-3 h-3 mr-1" /> Budget prévisionnel
                                        </div>
                                        <div className="text-sm font-semibold text-gray-900">{selectedProspect.budget ? `${selectedProspect.budget} FCFA` : 'Non spécifié'}</div>
                                    </div>
                                </div>
                                <div className="bg-blue-50 p-3 rounded-lg flex items-center">
                                    <div className={`w-3 h-3 rounded-full mr-2 ${selectedProspect.hasTitreFoncier ? 'bg-green-500' : 'bg-red-500'}`} />
                                    <span className="text-xs font-medium text-gray-700">
                                        Détenteur d'un Titre Foncier : <span className="font-bold">{selectedProspect.hasTitreFoncier ? 'OUI' : 'NON / EN COURS'}</span>
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Description */}
                        {selectedProspect.description && (
                            <div className="space-y-4 border-t pt-6">
                                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center">
                                    <FileText className="w-4 h-4 mr-2 text-indigo-500" /> Notes / Besoins spécifiques
                                </h3>
                                <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                                    {selectedProspect.description}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end pt-6 border-t space-x-3">
                            <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>Fermer</Button>
                            {selectedProspect.status === 'pending' && (
                                <Button
                                    onClick={() => {
                                        setIsDetailModalOpen(false);
                                        handleValidate(selectedProspect);
                                    }}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                    Valider & Créer Compte
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

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
