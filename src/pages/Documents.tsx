import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  Upload,
  FileText,
  Download,
  Eye,
  Trash2,
  Send,
  Filter,
  Search,
  Calendar,
  User
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { useConfirm } from '../hooks/useConfirm';
import { useClientStore } from '../store/clientStore';
import { unifiedDocumentService } from '../services/unifiedDocumentService';
import { useAuthStore } from '../store/authStore';
import type { UnifiedDocument, UnifiedDocumentType } from '../types/documents';

export const Documents: React.FC = () => {
  const [documents, setDocuments] = useState<UnifiedDocument[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<UnifiedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | UnifiedDocumentType>('all');
  const [filterClient, setFilterClient] = useState<string>('all');

  const { clients } = useClientStore();
  const { userData } = useAuthStore();
  const { confirmState, confirm, handleConfirm, handleClose } = useConfirm();

  // Formulaire d'upload
  const [uploadForm, setUploadForm] = useState({
    file: null as File | null,
    clientId: '',
    type: 'other' as UnifiedDocumentType,
    description: '',
    allowDownload: true
  });

  useEffect(() => {
    loadAllDocuments();
  }, []);

  useEffect(() => {
    filterDocuments();
  }, [documents, searchTerm, filterType, filterClient]);

  const loadAllDocuments = async () => {
    setLoading(true);
    try {
      // Récupérer tous les documents pour tous les clients
      const allDocs: UnifiedDocument[] = [];
      for (const client of clients) {
        const clientDocs = await unifiedDocumentService.getClientDocuments(client.id);
        allDocs.push(...clientDocs);
      }
      setDocuments(allDocs);
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      toast.error('Erreur lors du chargement des documents');
    } finally {
      setLoading(false);
    }
  };

  const filterDocuments = () => {
    let filtered = documents;

    // Filtrer par terme de recherche
    if (searchTerm) {
      filtered = filtered.filter(doc =>
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getClientName(doc.clientId).toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtrer par type
    if (filterType !== 'all') {
      filtered = filtered.filter(doc => doc.type === filterType);
    }

    // Filtrer par client
    if (filterClient !== 'all') {
      filtered = filtered.filter(doc => doc.clientId === filterClient);
    }

    setFilteredDocuments(filtered);
  };

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? `${client.prenom} ${client.nom}` : 'Client inconnu';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Vérification de la taille (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Le fichier ne peut pas dépasser 10MB');
        return;
      }

      setUploadForm({
        ...uploadForm,
        file,
        description: uploadForm.description || file.name
      });
    }
  };

  const handleUploadDocument = async () => {
    if (!uploadForm.file || !uploadForm.clientId) {
      toast.error('Veuillez sélectionner un fichier et un client');
      return;
    }

    setUploading(true);
    try {
      const documentData: Partial<UnifiedDocument> = {
        name: uploadForm.description || uploadForm.file.name,
        type: uploadForm.type,
        description: uploadForm.description,
        visibility: 'client_only',
        allowClientDownload: uploadForm.allowDownload
      };

      await unifiedDocumentService.createDocumentForClient(
        uploadForm.clientId,
        uploadForm.file,
        documentData,
        userData?.uid || 'admin'
      );

      toast.success('Document envoyé avec succès au client');
      setShowUploadModal(false);
      resetUploadForm();
      loadAllDocuments();

    } catch (error) {
      console.error('Erreur lors de l\'upload:', error);
      toast.error('Erreur lors de l\'envoi du document');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = (document: UnifiedDocument) => {
    confirm(
      async () => {
        try {
          await unifiedDocumentService.deleteDocument(
            document.id!,
            userData?.uid || 'admin',
            'Suppression par l\'administrateur'
          );
          toast.success('Document supprimé avec succès');
          loadAllDocuments();
        } catch (error) {
          console.error('Erreur lors de la suppression:', error);
          toast.error('Erreur lors de la suppression du document');
        }
      },
      {
        title: 'Supprimer le document',
        message: `Êtes-vous sûr de vouloir supprimer "${document.name}" ? Cette action est irréversible.`,
        confirmText: 'Supprimer',
        type: 'danger'
      }
    );
  };

  const resetUploadForm = () => {
    setUploadForm({
      file: null,
      clientId: '',
      type: 'other',
      description: '',
      allowDownload: true
    });
  };

  const handleView = (document: UnifiedDocument) => {
    window.open(document.url, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Chargement des documents...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Documents</h1>
          <p className="text-gray-600">Envoyez des documents aux clients et gérez les envois</p>
        </div>
        <Button onClick={() => setShowUploadModal(true)}>
          <Send className="w-4 h-4 mr-2" />
          Envoyer un document
        </Button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total documents</p>
              <p className="text-xl font-bold text-blue-600">{documents.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Send className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Envoyés aujourd'hui</p>
              <p className="text-xl font-bold text-green-600">
                {documents.filter(doc => {
                  const today = new Date().toDateString();
                  return doc.uploadedAt.toDate().toDateString() === today;
                }).length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <User className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Clients concernés</p>
              <p className="text-xl font-bold text-purple-600">
                {new Set(documents.map(doc => doc.clientId)).size}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Calendar className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Cette semaine</p>
              <p className="text-xl font-bold text-orange-600">
                {documents.filter(doc => {
                  const weekAgo = new Date();
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  return doc.uploadedAt.toDate() >= weekAgo;
                }).length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filtres */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="all">Tous les types</option>
            <option value="plan">Plans</option>
            <option value="contract">Contrats</option>
            <option value="invoice">Factures</option>
            <option value="photo">Photos</option>
            <option value="report">Rapports</option>
            <option value="permit">Permis</option>
            <option value="progress_update">Suivi</option>
            <option value="other">Autres</option>
          </select>

          <select
            value={filterClient}
            onChange={(e) => setFilterClient(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="all">Tous les clients</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.prenom} {client.nom}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Liste des documents */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Documents envoyés ({filteredDocuments.length})
        </h3>

        {filteredDocuments.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-8 h-8 mx-auto text-gray-400 mb-2" />
            <p className="text-gray-500">Aucun document trouvé</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocuments.map((document) => (
              <Card key={document.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">
                        {unifiedDocumentService.getDocumentIcon(document.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="font-medium text-gray-900 text-sm truncate">
                          {document.name}
                        </h5>
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${unifiedDocumentService.getDocumentColor(document.type)}`}>
                          {unifiedDocumentService.getDocumentTypeLabel(document.type)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-gray-600">
                    <p className="font-medium">Client: {getClientName(document.clientId)}</p>
                    {document.description && (
                      <p className="mt-1 line-clamp-2">{document.description}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{unifiedDocumentService.formatFileSize(document.size)}</span>
                    <span>{document.uploadedAt.toDate().toLocaleDateString('fr-FR')}</span>
                  </div>

                  <div className="flex space-x-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => handleView(document)} className="flex-1">
                      <Eye className="w-3 h-3 mr-1" />
                      Voir
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleDeleteDocument(document)} className="p-2">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      {/* Modal d'upload */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Envoyer un document"
        size="lg"
      >
        <div className="space-y-6">
          {/* Sélection du client */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Client destinataire *
            </label>
            <select
              value={uploadForm.clientId}
              onChange={(e) => setUploadForm({...uploadForm, clientId: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">Sélectionner un client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.prenom} {client.nom} - {client.email}
                </option>
              ))}
            </select>
          </div>

          {/* Sélection du fichier */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fichier à envoyer *
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <input
                type="file"
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center space-y-2"
              >
                <Upload className="w-8 h-8 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {uploadForm.file ? uploadForm.file.name : 'Cliquez pour sélectionner un fichier'}
                </span>
                <span className="text-xs text-gray-500">
                  PDF, Word, Image (max 10MB)
                </span>
              </label>
            </div>
          </div>

          {uploadForm.file && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type de document
                  </label>
                  <select
                    value={uploadForm.type}
                    onChange={(e) => setUploadForm({...uploadForm, type: e.target.value as UnifiedDocumentType})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="contract">Contrat</option>
                    <option value="plan">Plan</option>
                    <option value="permit">Permis</option>
                    <option value="report">Rapport</option>
                    <option value="progress_update">Suivi d'avancement</option>
                    <option value="other">Autre</option>
                  </select>
                </div>
              </div>

              <Input
                label="Description (optionnelle)"
                value={uploadForm.description}
                onChange={(e) => setUploadForm({...uploadForm, description: e.target.value})}
                placeholder="Description du document"
              />

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="allowDownload"
                  checked={uploadForm.allowDownload}
                  onChange={(e) => setUploadForm({...uploadForm, allowDownload: e.target.checked})}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="allowDownload" className="ml-2 text-sm font-medium text-gray-700">
                  Autoriser le téléchargement par le client
                </label>
              </div>
            </>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowUploadModal(false)}
              disabled={uploading}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              onClick={handleUploadDocument}
              disabled={uploading || !uploadForm.file || !uploadForm.clientId}
              className="flex-1"
            >
              {uploading ? 'Envoi...' : 'Envoyer au client'}
            </Button>
          </div>
        </div>
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