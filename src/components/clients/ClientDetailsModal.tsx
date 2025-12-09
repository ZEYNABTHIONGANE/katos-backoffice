import React, { useState } from 'react';
import { User, Mail, MapPin, Phone, Calendar, Settings, CreditCard, FileText, FolderOpen } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { ClientInvitations } from './ClientInvitations';
import { ClientBilling } from './ClientBilling';
import { ClientInvoiceHistory } from './ClientInvoiceHistory';
import { ClientDocumentManager } from './ClientDocumentManager';
import type { Client } from '../../types';
import type { FirebaseClient } from '../../types/firebase';
import { Timestamp } from 'firebase/firestore';

interface ClientDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  onUpdate?: () => void;
}

export const ClientDetailsModal: React.FC<ClientDetailsModalProps> = ({
  isOpen,
  onClose,
  client,
  onUpdate
}) => {
  const [activeTab, setActiveTab] = useState<'infos' | 'access' | 'documents' | 'invoices' | 'billing'>('infos');

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

  const tabs = [
    { key: 'infos', label: 'Informations', icon: User },
    { key: 'access', label: 'Accès App', icon: Settings },
    { key: 'documents', label: 'Documents', icon: FolderOpen },
    { key: 'invoices', label: 'Factures', icon: FileText },
    { key: 'billing', label: 'Échéancier', icon: CreditCard }
  ] as const;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="xl">
      <div className="space-y-6">
        {/* Header avec infos client */}
        <div className="border-b border-gray-200 pb-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {client.prenom} {client.nom}
              </h2>
              <div className="flex items-center space-x-4 mt-2">
                <span
                  className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(client.status)}`}
                >
                  {client.status}
                </span>
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar className="w-4 h-4 mr-1" />
                  Client depuis {new Date(client.createdAt).toLocaleDateString('fr-FR')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="min-h-[400px]">
          {activeTab === 'infos' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Informations personnelles</h3>

                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">Email</div>
                      <div className="text-sm text-gray-600">{client.email || 'Non renseigné'}</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">Téléphone</div>
                      <div className="text-sm text-gray-600">{client.telephone || 'Non renseigné'}</div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">Adresse</div>
                      <div className="text-sm text-gray-600">{client.adresse || 'Non renseignée'}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Projet</h3>

                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-900 mb-1">Projet adhéré</div>
                    <div className="text-sm text-gray-600">{client.projetAdhere}</div>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-900 mb-1">Localisation du site</div>
                    <div className="text-sm text-gray-600">{client.localisationSite}</div>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-900 mb-1">Statut du projet</div>
                    <span
                      className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(client.status)}`}
                    >
                      {client.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'access' && (
            <ClientInvitations
              client={convertToFirebaseClient(client)}
              onUpdate={onUpdate}
            />
          )}

          {activeTab === 'documents' && (
            <ClientDocumentManager client={client} />
          )}

          {activeTab === 'invoices' && (
            <ClientInvoiceHistory client={client} />
          )}

          {activeTab === 'billing' && (
            <ClientBilling client={client} />
          )}
        </div>
      </div>
    </Modal>
  );
};
