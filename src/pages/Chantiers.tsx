/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { Plus, MapPin, User, Calendar, BarChart3, Search, Filter, Edit, Trash2, Clock, CheckCircle, AlertCircle, Layout } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { ChantierModal } from '../components/chantiers/ChantierModal';
import type { ChantierStatus } from '../types/chantier';
import { useRealtimeChantiers } from '../hooks/useRealtimeChantiers';
import { useUserNames } from '../hooks/useUserNames';
import { useConfirm } from '../hooks/useConfirm';
import { chantierService } from '../services/chantierService';
import { toast } from 'react-toastify';

export const Chantiers: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ChantierStatus | 'Tous'>('Tous');
  const [isChantierModalOpen, setIsChantierModalOpen] = useState(false);
  const [selectedChantier, setSelectedChantier] = useState<any>(null);

  const navigate = useNavigate();

  // Utiliser le hook pour les données temps réel
  const {
    chantiers,
    loading,
    error,
    totalChantiers,
    chantiersActifs,
    chantiersTermines,
    chantiersEnRetard,
    chantiersEnAttente
  } = useRealtimeChantiers();

  // Collecter les IDs des chefs pour récupérer leurs noms
  const chefIds = React.useMemo(() => {
    const ids = new Set<string>();
    chantiers.forEach(chantier => {
      if (chantier.assignedChefId) {
        ids.add(chantier.assignedChefId);
      }
    });
    return Array.from(ids);
  }, [chantiers]);

  const { getUserName } = useUserNames(chefIds);
  const { confirmState, confirm, handleConfirm, handleClose } = useConfirm();

  // Gestion des actions
  const handleEditChantier = (chantier: any) => {
    setSelectedChantier(chantier);
    setIsChantierModalOpen(true);
  };

  const handleDeleteChantier = (chantier: any) => {
    confirm(
      async () => {
        try {
          await chantierService.deleteChantier(chantier.id);
          toast.success('Chantier supprimé avec succès');
        } catch (error) {
          console.error('Erreur lors de la suppression:', error);
          toast.error('Erreur lors de la suppression du chantier');
        }
      },
      {
        title: 'Supprimer le chantier',
        message: `Êtes-vous sûr de vouloir supprimer le chantier "${chantier.name}" ? Cette action est irréversible.`,
        confirmText: 'Supprimer',
        cancelText: 'Annuler',
        type: 'danger'
      }
    );
  };

  const handleCloseModal = () => {
    setIsChantierModalOpen(false);
    setSelectedChantier(null);
  };

  // Filtrer les chantiers
  const filteredChantiers = chantiers.filter(chantier => {
    const matchesSearch = chantier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chantier.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'Tous' || chantier.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: ChantierStatus) => {
    switch (status) {
      case 'En cours':
        return 'bg-blue-100 text-blue-800';
      case 'Terminé':
        return 'bg-green-100 text-green-800';
      case 'En attente':
        return 'bg-yellow-100 text-yellow-800';
      case 'En retard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 75) return 'bg-green-500';
    if (progress >= 50) return 'bg-blue-500';
    if (progress >= 25) return 'bg-yellow-500';
    return 'bg-gray-300';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Projets</h1>
          </div>
          <p className="text-gray-600 mt-1">Gestion des projets de construction</p>
        </div>
        <Button onClick={() => setIsChantierModalOpen(true)} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Nouveau projet
        </Button>
      </div>

      {/* Filtres */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Rechercher par nom ou adresse..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ChantierStatus | 'Tous')}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="Tous">Tous les statuts</option>
              <option value="En attente">En attente</option>
              <option value="En cours">En cours</option>
              <option value="Terminé">Terminé</option>
              <option value="En retard">En retard</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Statistiques */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"
      >
        {[
          { label: 'Tous', count: totalChantiers, color: 'text-slate-600', icon: Layout, bgColor: 'bg-slate-50', borderColor: 'border-slate-100' },
          { label: 'En attente', count: chantiersEnAttente, color: 'text-yellow-600', icon: Clock, bgColor: 'bg-yellow-50', borderColor: 'border-yellow-100' },
          { label: 'En cours', count: chantiersActifs, color: 'text-blue-600', icon: BarChart3, bgColor: 'bg-blue-50', borderColor: 'border-blue-100' },
          { label: 'Terminé', count: chantiersTermines, color: 'text-emerald-600', icon: CheckCircle, bgColor: 'bg-emerald-50', borderColor: 'border-emerald-100' },
          { label: 'En retard', count: chantiersEnRetard, color: 'text-red-600', icon: AlertCircle, bgColor: 'bg-red-50', borderColor: 'border-red-100' }
        ].map((stat) => (
          <motion.div
            key={stat.label}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className={`relative overflow-hidden rounded-2xl bg-white p-4 shadow-sm border ${stat.borderColor} group transition-shadow hover:shadow-md`}
          >
            <div className="flex flex-col h-full justify-between">
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-lg ${stat.bgColor} group-hover:scale-110 transition-transform duration-300`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">{stat.label}</p>
                <div className="flex items-baseline mt-1">
                  <p className="text-xl font-bold text-gray-900">{stat.count}</p>
                </div>
              </div>
              <div className="absolute -right-4 -bottom-4 w-16 h-16 rounded-full opacity-5 bg-gradient-to-br from-gray-900 to-transparent pointer-events-none" />
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Liste des chantiers */}
      {loading ? (
        <Card className="p-8">
          <div className="text-center text-gray-500">Chargement des projets en temps réel...</div>
        </Card>
      ) : error ? (
        <Card className="p-8">
          <div className="text-center text-red-500">
            Erreur de connexion: {error}
            <br />
            <span className="text-sm text-gray-500">La synchronisation temps réel sera rétablie automatiquement</span>
          </div>
        </Card>
      ) : filteredChantiers.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredChantiers.map((chantier) => (
            <Card key={chantier.id} className="p-0 hover:shadow-md transition-shadow overflow-hidden">
              {/* Cover Image */}
              {chantier.coverImage && (
                <div className="h-48 w-full relative">
                  <img
                    src={chantier.coverImage}
                    alt={`Cover ${chantier.name}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full shadow-sm ${getStatusColor(chantier.status)}`}>
                      {chantier.status}
                    </span>
                  </div>
                </div>
              )}

              <div className="p-6 space-y-4">
                {/* Header (with adjustments if image exists) */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{chantier.name}</h3>
                    <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                      <MapPin className="w-4 h-4" />
                      <span>{chantier.address}</span>
                    </div>
                  </div>
                  {!chantier.coverImage && (
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(chantier.status)}`}>
                      {chantier.status}
                    </span>
                  )}
                </div>

                {/* Progression */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Progression</span>
                    <span className="font-medium">{chantier.globalProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${getProgressColor(chantier.globalProgress)}`}
                      style={{ width: `${chantier.globalProgress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Infos supplémentaires */}
                <div className="flex justify-between text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    <span>Chef: {chantier.assignedChefId ? getUserName(chantier.assignedChefId) : 'Non assigné'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>Fin prévue: {chantier.plannedEndDate.toDate().toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>

                {/* Phases actives */}
                <div>
                  <div className="text-sm text-gray-600 mb-2">Phases en cours:</div>
                  <div className="flex flex-wrap gap-2">
                    {chantier.phases
                      .filter(phase => phase.status === 'in-progress')
                      .slice(0, 3)
                      .map((phase) => (
                        <span
                          key={phase.id}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                        >
                          {phase.name}
                        </span>
                      ))
                    }
                    {chantier.phases.filter(phase => phase.status === 'in-progress').length > 3 && (
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                        +{chantier.phases.filter(phase => phase.status === 'in-progress').length - 3}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => navigate(`/chantiers/${chantier.id}`)}
                  >
                    <BarChart3 className="w-4 h-4 mr-1" />
                    Voir détails
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditChantier(chantier)}
                    className="px-3"
                    title="Modifier"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDeleteChantier(chantier)}
                    className="px-3"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8">
          <div className="text-center text-gray-500">
            {searchTerm || statusFilter !== 'Tous' ?
              'Aucun chantier ne correspond aux critères de recherche.' :
              'Aucun chantier créé pour le moment.'
            }
          </div>
        </Card>
      )}

      {/* Modal de création/édition de chantier */}
      <ChantierModal
        isOpen={isChantierModalOpen}
        onClose={handleCloseModal}
        chantier={selectedChantier}
        onSuccess={() => {
          // Pas besoin de recharger - la liste se met à jour automatiquement via le listener temps réel
          console.log('✅ Projet créé/modifié - mise à jour automatique en cours...');
          handleCloseModal();
        }}
      />

      {/* Modal de confirmation */}
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