import React, { useState, useEffect } from 'react';
import { Plus, Eye, Edit, Trash2, Phone, MapPin, Users, Mail } from 'lucide-react';
import { toast } from 'react-toastify';
import { Timestamp } from 'firebase/firestore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { ClientModal } from '../components/clients/ClientModal';
import { ClientDetailsModal } from '../components/clients/ClientDetailsModal';
import { ClientInvitations } from '../components/clients/ClientInvitations';
import { Modal } from '../components/ui/Modal';
import { useClientStore } from '../store/clientStore';
import { useConfirm } from '../hooks/useConfirm';
import type { Client } from '../types';
import type { FirebaseClient } from '../types/firebase';

export const Clients: React.FC = () => {
  const { clients, addClient, updateClient, deleteClient, initializeClients } = useClientStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | undefined>();
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [viewingClient, setViewingClient] = useState<Client | undefined>();
  const [isInvitationsModalOpen, setIsInvitationsModalOpen] = useState(false);
  const [invitationClient, setInvitationClient] = useState<Client | undefined>();
  const { confirmState, confirm, handleConfirm, handleClose } = useConfirm();

  // Initialiser les clients au montage du composant
  useEffect(() => {
    initializeClients();
  }, [initializeClients]);

  // Convertir Client vers FirebaseClient pour les invitations
  const convertToFirebaseClient = (client: Client): FirebaseClient => ({
    id: client.id,
    nom: client.nom,
    prenom: client.prenom,
    email: client.email,
    telephone: client.telephone || '',
    adresse: client.adresse || '',
    localisationSite: client.localisationSite,
    projetAdhere: client.projetAdhere,
    status: client.status,
    invitationStatus: client.invitationStatus,
    invitationToken: client.invitationToken,
    userId: client.userId,
    username: client.username,
    tempPassword: client.tempPassword,
    createdAt: Timestamp.fromDate(new Date(client.createdAt)),
    invitedAt: client.invitedAt ? Timestamp.fromDate(new Date(client.invitedAt)) : undefined,
    acceptedAt: client.acceptedAt ? Timestamp.fromDate(new Date(client.acceptedAt)) : undefined
  });

  const handleAddClient = async (clientData: Omit<Client, 'id' | 'createdAt'>) => {
    // S'assurer que tous les champs requis sont présents
    const normalizedData = {
      ...clientData,
      telephone: clientData.telephone || '',
      adresse: clientData.adresse || ''
    };

    const success = await addClient(normalizedData);
    if (success) {
      toast.success('Profil client créé avec succès');
      handleCloseModal();
    } else {
      toast.error('Erreur lors de la création du client');
    }
  };

  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    setIsModalOpen(true);
  };

  const handleUpdateClient = async (clientData: Omit<Client, 'id' | 'createdAt'>) => {
    if (selectedClient) {
      const success = await updateClient(selectedClient.id, clientData);
      if (success) {
        toast.success('Client modifié avec succès');
        handleCloseModal();
      } else {
        toast.error('Erreur lors de la modification du client');
      }
    }
  };

  const handleDeleteClient = (client: Client) => {
    confirm(
      async () => {
        const success = await deleteClient(client.id);
        if (success) {
          toast.success('Client supprimé avec succès');
        } else {
          toast.error('Erreur lors de la suppression du client');
        }
      },
      {
        title: 'Supprimer',
        message: `Êtes-vous sûr de vouloir supprimer le client "${client.prenom} ${client.nom}" ? Cette action est irréversible.`,
        confirmText: 'Supprimer le client',
        type: 'danger'
      }
    );
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedClient(undefined);
  };

  const getStatusColor = (status: Client['status']) => {
    switch (status) {
      case 'En cours':
        return 'bg-green-100 text-green-800';
      case 'Terminé':
        return 'bg-purple-100 text-purple-800';
      case 'En attente':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Clients</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Gérez vos clients et leurs projets</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Nouveau client
        </Button>
      </div>


      <Card className="p-0 sm:p-6">
        {clients.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="hidden sm:table-cell px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Projet
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="hidden lg:table-cell px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    App Mobile
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <div>
                        <div className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                          {client.nom} {client.prenom}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500 flex items-center mt-1 sm:hidden">
                          <Phone className="w-3 h-3 mr-1 flex-shrink-0" />
                          <span className="truncate">{client.localisationSite}</span>
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500 items-center mt-1 hidden sm:flex">
                          <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                          <span className="truncate">{client.localisationSite}</span>
                        </div>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell px-3 sm:px-6 py-3 sm:py-4">
                      <div className="space-y-1">
                        <div className="text-xs sm:text-sm text-gray-900 truncate">
                          {client.email || 'Aucun email'}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500 truncate">
                          Contact principal
                        </div>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <div>
                        <div className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                          {client.projetAdhere}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <span
                        className={`inline-flex px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-medium rounded-full ${getStatusColor(
                          client.status
                        )}`}
                      >
                        <span className="hidden sm:inline">{client.status}</span>
                        <span className="sm:hidden">
                          {client.status === 'En cours' ? 'EC' : client.status === 'Terminé' ? 'T' : 'EA'}
                        </span>
                      </span>
                    </td>
                    <td className="hidden lg:table-cell px-3 sm:px-6 py-3 sm:py-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          client.userId ? 'bg-green-500' :
                          client.email ? 'bg-yellow-500' :
                          'bg-gray-300'
                        }`} />
                        <span className="text-xs text-gray-600">
                          {client.userId ? 'Connecté' :
                           client.email ? 'Compte créé' :
                           'Pas de compte'}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <div className="flex space-x-1 sm:space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setViewingClient(client);
                            setIsDetailsModalOpen(true);
                          }}
                          className="p-1 sm:p-2"
                          title="Voir détails"
                        >
                          <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setInvitationClient(client);
                            setIsInvitationsModalOpen(true);
                          }}
                          className="p-1 sm:p-2"
                          title="Gérer invitations"
                        >
                          <Mail className="w-3 h-3 sm:w-4 sm:h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditClient(client)}
                          className="p-1 sm:p-2"
                          title="Modifier"
                        >
                          <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteClient(client)}
                          className="p-1 sm:p-2"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 sm:py-12 px-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-3 sm:mb-4">
              <Users className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
            </div>
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
              Aucun client enregistré
            </h3>
            <p className="text-sm sm:text-base text-gray-500 mb-4">
              Commencez par ajouter votre premier client
            </p>
            <Button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Nouveau client
            </Button>
          </div>
        )}
      </Card>

      <ClientModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={selectedClient ? handleUpdateClient : handleAddClient}
        client={selectedClient}
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

      {viewingClient && (
        <ClientDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={() => {
            setIsDetailsModalOpen(false);
            setViewingClient(undefined);
          }}
          client={viewingClient}
          onUpdate={() => {
            // Les données seront automatiquement mises à jour via le listener en temps réel
          }}
        />
      )}

      {invitationClient && (
        <Modal
          isOpen={isInvitationsModalOpen}
          onClose={() => {
            setIsInvitationsModalOpen(false);
            setInvitationClient(undefined);
          }}
          title={`Invitations - ${invitationClient.prenom} ${invitationClient.nom}`}
          size="lg"
        >
          <ClientInvitations
            client={convertToFirebaseClient(invitationClient)}
            onUpdate={() => {
              // Les données seront automatiquement mises à jour via le listener en temps réel
            }}
          />
        </Modal>
      )}
    </div>
  );
};