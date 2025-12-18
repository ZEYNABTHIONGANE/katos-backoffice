import React, { useState, useEffect } from 'react';
import {
  Upload,
  FileText,
  Download,
  Eye,
  Trash2,
  Send,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { toast } from 'react-toastify';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { ConfirmModal } from '../ui/ConfirmModal';
import { useConfirm } from '../../hooks/useConfirm';
import { unifiedDocumentService } from '../../services/unifiedDocumentService';
import { chantierService } from '../../services/chantierService';
import type { Client, UnifiedDocument, UnifiedDocumentType } from '../../types';

interface ClientDocumentManagerProps {
  client: Client;
}

export const ClientDocumentManager: React.FC<ClientDocumentManagerProps> = ({ client }) => {
  const [documents, setDocuments] = useState<UnifiedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeChantierId, setActiveChantierId] = useState<string | undefined>(undefined);
  const { confirmState, confirm, handleConfirm, handleClose } = useConfirm();

  // Formulaire d'upload
  const [uploadForm, setUploadForm] = useState({
    file: null as File | null,
    type: 'other' as UnifiedDocumentType,
    description: '',
    visibility: 'both' as 'client_only' | 'both',
    allowDownload: true
  });

  useEffect(() => {
    loadDocuments();
    loadChantier();
  }, [client.id]);

  const loadChantier = async () => {
    try {
      const chantier = await chantierService.getClientChantier(client.id);
      if (chantier) {
        setActiveChantierId(chantier.id);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du chantier:', error);
    }
  };

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const docs = await unifiedDocumentService.getClientDocuments(client.id);
      setDocuments(docs);
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      toast.error('Erreur lors du chargement des documents');
    } finally {
      setLoading(false);
    }
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
    if (!uploadForm.file) {
      toast.error('Veuillez sélectionner un fichier');
      return;
    }

    setUploading(true);
    try {
      if (!activeChantierId) {
        toast.warning("Attention: Aucun chantier actif détecté. Le document risque de ne pas être visible dans l'application.");
      }

      const documentData: Partial<UnifiedDocument> = {
        name: uploadForm.description || uploadForm.file.name,
        type: uploadForm.type,
        description: uploadForm.description,
        visibility: 'both', // Force visibility to both
        allowClientDownload: uploadForm.allowDownload
      };

      await unifiedDocumentService.createDocumentForClient(
        client.id,
        uploadForm.file,
        documentData,
        'current-admin', // TODO: Récupérer l'ID admin connecté
        activeChantierId
      );

      toast.success('Document envoyé avec succès au client');
      setShowUploadModal(false);
      resetUploadForm();
      loadDocuments();

    } catch (error) {
      console.error('Erreur lors de l\'upload:', error);
      toast.error('Erreur lors de l\'envoi du document');
    } finally {
      setUploading(false);
    }
  };
   // ... rest of component


  const handleDeleteDocument = (document: UnifiedDocument) => {
    confirm(
      async () => {
        try {
          await unifiedDocumentService.deleteDocument(
            document.id!,
            'current-admin', // TODO: Récupérer l'ID admin connecté
            'Suppression par l\'administrateur'
          );
          toast.success('Document supprimé avec succès');
          loadDocuments();
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

  const handleApproveDocument = async (document: UnifiedDocument) => {
    try {
      await unifiedDocumentService.approveDocument(
        document.id!,
        'current-admin' // TODO: Récupérer l'ID admin connecté
      );
      toast.success('Document approuvé');
      loadDocuments();
    } catch (error) {
      console.error('Erreur lors de l\'approbation:', error);
      toast.error('Erreur lors de l\'approbation');
    }
  };

  const resetUploadForm = () => {
    setUploadForm({
      file: null,
      type: 'other',
      description: '',
      visibility: 'both',
      allowDownload: true
    });
  };

  const handleDownload = (document: UnifiedDocument) => {
    const link = window.document.createElement('a');
    link.href = document.url;
    link.download = document.originalName;
    link.target = '_blank';
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  const handleView = (document: UnifiedDocument) => {
    window.open(document.url, '_blank');
  };

  const getDocumentsBySource = () => {
    const adminDocuments = documents.filter(doc => doc.source === 'admin_upload');
    const clientDocuments = documents.filter(doc => doc.source === 'client_upload');
    return { adminDocuments, clientDocuments };
  };

  const { adminDocuments, clientDocuments } = getDocumentsBySource();

  const getStatusColor = (document: UnifiedDocument) => {
    if (document.source === 'admin_upload') {
      return 'bg-blue-50 text-blue-700';
    }

    if (document.requiresApproval && !document.isApproved) {
      return 'bg-yellow-50 text-yellow-700';
    }

    if (document.isApproved) {
      return 'bg-green-50 text-green-700';
    }

    return 'bg-gray-50 text-gray-700';
  };

  const getStatusIcon = (document: UnifiedDocument) => {
    if (document.source === 'admin_upload') {
      return <Send className="w-4 h-4" />;
    }

    if (document.requiresApproval && !document.isApproved) {
      return <Clock className="w-4 h-4" />;
    }

    if (document.isApproved) {
      return <CheckCircle className="w-4 h-4" />;
    }

    return <AlertCircle className="w-4 h-4" />;
  };

  const getStatusText = (document: UnifiedDocument) => {
    if (document.source === 'admin_upload') {
      return 'Envoyé';
    }

    if (document.requiresApproval && !document.isApproved) {
      return 'En attente';
    }

    if (document.isApproved) {
      return 'Approuvé';
    }

    return 'Actif';
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
      {/* Header avec actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            Gestion des documents
          </h3>
          <p className="text-sm text-gray-500">
            Envoyez des documents au client et gérez les documents reçus
          </p>
        </div>
        <Button onClick={() => setShowUploadModal(true)}>
          <Upload className="w-4 h-4 mr-2" />
          Envoyer un document
        </Button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Send className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Documents envoyés</p>
              <p className="text-xl font-bold text-blue-600">{adminDocuments.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <FileText className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Documents reçus</p>
              <p className="text-xl font-bold text-green-600">{clientDocuments.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">En attente d'approbation</p>
              <p className="text-xl font-bold text-yellow-600">
                {clientDocuments.filter(doc => doc.requiresApproval && !doc.isApproved).length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Documents envoyés au client */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Documents envoyés au client ({adminDocuments.length})</h4>

        {adminDocuments.length === 0 ? (
          <Card className="p-6 text-center">
            <Send className="w-8 h-8 mx-auto text-gray-400 mb-2" />
            <p className="text-gray-500">Aucun document envoyé</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {adminDocuments.map((document) => (
              <Card key={document.id} className="p-4">
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
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(document)}`}>
                      {getStatusIcon(document)}
                      <span className="ml-1">{getStatusText(document)}</span>
                    </span>
                  </div>

                  {document.description && (
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {document.description}
                    </p>
                  )}

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
      </div>

      {/* Documents reçus du client */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Documents reçus du client ({clientDocuments.length})</h4>

        {clientDocuments.length === 0 ? (
          <Card className="p-6 text-center">
            <FileText className="w-8 h-8 mx-auto text-gray-400 mb-2" />
            <p className="text-gray-500">Aucun document reçu du client</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clientDocuments.map((document) => (
              <Card key={document.id} className="p-4">
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
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(document)}`}>
                      {getStatusIcon(document)}
                      <span className="ml-1">{getStatusText(document)}</span>
                    </span>
                  </div>

                  {document.description && (
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {document.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{unifiedDocumentService.formatFileSize(document.size)}</span>
                    <span>{document.uploadedAt.toDate().toLocaleDateString('fr-FR')}</span>
                  </div>

                  <div className="flex space-x-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => handleView(document)} className="flex-1">
                      <Eye className="w-3 h-3 mr-1" />
                      Voir
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDownload(document)} className="flex-1">
                      <Download className="w-3 h-3 mr-1" />
                      DL
                    </Button>
                    {document.requiresApproval && !document.isApproved && (
                      <Button size="sm" onClick={() => handleApproveDocument(document)}>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Approuver
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal d'upload */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Envoyer un document au client"
        size="lg"
      >
        <div className="space-y-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Client :</strong> {client.prenom} {client.nom}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Le client recevra une notification et pourra consulter ce document dans son application mobile.
            </p>
          </div>

          {/* Sélection du fichier */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fichier à envoyer
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
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type de document
                  </label>
                  <select
                    value={uploadForm.type}
                    onChange={(e) => setUploadForm({...uploadForm, type: e.target.value as UnifiedDocumentType})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="contract">Contrat</option>
                    <option value="invoice">Facture</option>
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

              {/* <div className="flex items-center">
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
              </div> */}
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
              disabled={uploading || !uploadForm.file}
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