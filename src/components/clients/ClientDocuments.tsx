import React, { useState, useEffect } from 'react';
import { Download, Trash2, Eye, FileText, RotateCcw } from 'lucide-react';
import { toast } from 'react-toastify';
import { Button } from '../ui/Button';
import { ConfirmModal } from '../ui/ConfirmModal';
import { useConfirm } from '../../hooks/useConfirm';
import { documentService } from '../../services/documentService';
import type { Client, ClientDocument } from '../../types';

interface ClientDocumentsProps {
  client: Client;
}

export const ClientDocuments: React.FC<ClientDocumentsProps> = ({ client }) => {
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const { confirmState, confirm, handleConfirm, handleClose } = useConfirm();

  useEffect(() => {
    if (client?.id) {
      setLoading(true);
      try {
        const unsubscribe = documentService.subscribeToClientDocuments(
          client.id,
          (docs) => {
            setDocuments(docs);
            setLoading(false);
          }
        );

        return () => {
          try {
            unsubscribe();
          } catch (error) {
            console.log('Erreur lors de la désinscription:', error);
          }
        };
      } catch (error) {
        console.error('Erreur lors de l\'abonnement aux documents:', error);
        setDocuments([]);
        setLoading(false);
      }
    }
  }, [client?.id]);

  const handleDeleteDocument = (document: ClientDocument) => {
    confirm(
      async () => {
        try {
          await documentService.deleteDocument(document.id, document.url);
          toast.success('Document supprimé avec succès');
        } catch (error) {
          toast.error('Erreur lors de la suppression du document');
        }
      },
      {
        title: 'Supprimer',
        message: `Êtes-vous sûr de vouloir supprimer le document "${document.name}" ? Cette action est irréversible.`,
        confirmText: 'Supprimer le document',
        type: 'danger'
      }
    );
  };

  const handleDownload = (document: ClientDocument) => {
    const link = window.document.createElement('a');
    link.href = document.url;
    link.download = document.name;
    link.target = '_blank';
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  const handleView = (document: ClientDocument) => {
    window.open(document.url, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RotateCcw className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Chargement des documents...</span>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Aucun document
        </h3>
        <p className="text-gray-500">
          {client.prenom} {client.nom} n'a pas encore uploadé de documents depuis l'application mobile.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          Documents ({documents.length})
        </h3>
        <div className="text-sm text-gray-500">
          Synchronisés en temps réel
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents.map((document) => (
          <div key={document.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
            <div className="space-y-3">
              {/* Header avec icône et type */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">
                    {documentService.getFileIcon(document.mimeType)}
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${documentService.getDocumentTypeColor(document.type)}`}>
                    {documentService.getDocumentTypeLabel(document.type)}
                  </span>
                </div>
              </div>

              {/* Nom du document */}
              <div>
                <h4 className="font-medium text-gray-900 text-sm line-clamp-2 mb-1">
                  {document.name}
                </h4>
                <p className="text-xs text-gray-500">
                  {documentService.formatFileSize(document.size)}
                </p>
              </div>

              {/* Description si disponible */}
              {document.description && (
                <p className="text-xs text-gray-600 line-clamp-2">
                  {document.description}
                </p>
              )}

              {/* Date d'upload */}
              <p className="text-xs text-gray-400">
                Ajouté le {new Date(document.uploadedAt).toLocaleDateString('fr-FR')}
              </p>

              {/* Actions */}
              <div className="flex space-x-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleView(document)}
                  className="flex-1 text-xs"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  Voir
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(document)}
                  className="flex-1 text-xs"
                >
                  <Download className="w-3 h-3 mr-1" />
                  DL
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDeleteDocument(document)}
                  className="p-2"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

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