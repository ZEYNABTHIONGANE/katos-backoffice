import React, { useState, useEffect } from 'react';
import { Mail, Send, Check, X, Clock, AlertCircle, RotateCcw, Copy, FolderPlus, AlertTriangle } from 'lucide-react';
import { chantierService } from '../../services/chantierService';
import { ChantierModal } from '../chantiers/ChantierModal';
import { toast } from 'react-toastify';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ConfirmModal } from '../ui/ConfirmModal';
import { invitationService } from '../../services/invitationService';
import type { FirebaseClient, FirebaseInvitation } from '../../types/firebase';
import { useConfirm } from '../../hooks/useConfirm';

interface ClientInvitationsProps {
  client: FirebaseClient;
  onUpdate?: () => void;
}

export const ClientInvitations: React.FC<ClientInvitationsProps> = ({
  client,
  onUpdate
}) => {
  const [invitations, setInvitations] = useState<FirebaseInvitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [credentials, setCredentials] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [hasChantier, setHasChantier] = useState<boolean | null>(null);
  const [isChantierModalOpen, setIsChantierModalOpen] = useState(false);
  const { confirmState, confirm, handleConfirm, handleClose } = useConfirm();

  // Charger les invitations du client
  const loadInvitations = async () => {
    if (!client.id) return;

    setLoading(true);
    try {
      const clientInvitations = await invitationService.getClientInvitations(client.id);
      setInvitations(clientInvitations);
    } catch (error) {
      console.error('Erreur lors du chargement des invitations:', error);
      toast.error('Impossible de charger les invitations');
    } finally {
      setLoading(false);
    }
  };

  // Vérifier si le client a un chantier
  const checkChantier = async () => {
    if (!client.id) return;
    try {
      const chantier = await chantierService.getClientChantier(client.id);
      setHasChantier(!!chantier);
    } catch (error) {
      console.error('Erreur vérification chantier:', error);
    }
  };

  // Créer un compte client avec mot de passe temporaire
  const createClientAccount = async () => {
    if (!client.id || !client.email) {
      toast.error('Client invalide - email requis');
      return;
    }

    setCreatingAccount(true);
    try {
      const result = await invitationService.createClientAccount(client.id, client.email);

      if (result.success) {
        console.log('Compte créé avec succès, credentials:', result.credentials);

        setCredentials(result.credentials || '');
        toast.success('Compte créé', {
          autoClose: 3000
        });

        await loadInvitations();
        onUpdate?.();

        console.log('État credentials après mise à jour:', result.credentials);
      } else {
        console.error('Erreur lors de la création:', result.error);
        toast.error(result.error || 'Erreur lors de la création du compte');
      }
    } catch (error) {
      console.error('Erreur lors de la création du compte:', error);
      toast.error('Erreur lors de la création du compte');
    } finally {
      setCreatingAccount(false);
    }
  };

  // Copier le lien d'invitation web
  const copyInvitationLink = async (token: string) => {
    const invitationUrl = invitationService.generateInvitationUrl(token);
    try {
      await navigator.clipboard.writeText(invitationUrl);
      toast.success('Lien web copié dans le presse-papiers');
    } catch (error) {
      // Fallback pour les navigateurs qui ne supportent pas l'API clipboard
      const textArea = document.createElement('textarea');
      textArea.value = invitationUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast.success('Lien web copié dans le presse-papiers');
    }
  };


  // Supprimer une invitation
  const deleteInvitation = async (invitationId: string) => {
    try {
      await invitationService.deleteInvitation(invitationId);
      toast.success('Invitation supprimée');
      await loadInvitations();
      onUpdate?.();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  // Régénérer les accès client
  const regenerateClientAccess = async () => {
    if (!client.id) {
      toast.error('Client invalide');
      return;
    }

    setRegenerating(true);
    try {
      const result = await invitationService.regenerateClientAccess(client.id);

      if (result.success) {
        setCredentials(result.credentials || '');
        toast.success('Accès régénérés avec succès', {
          autoClose: 3000
        });
        onUpdate?.();
      } else {
        toast.error(result.error || 'Erreur lors de la régénération des accès');
      }
    } catch (error) {
      console.error('Erreur lors de la régénération:', error);
      toast.error('Erreur lors de la régénération des accès');
    } finally {
      setRegenerating(false);
    }
  };

  // Confirmer la suppression
  const handleDeleteInvitation = (invitation: FirebaseInvitation) => {
    confirm(
      () => deleteInvitation(invitation.id!),
      {
        title: 'Supprimer l\'invitation',
        message: `Êtes-vous sûr de vouloir supprimer cette invitation envoyée le ${invitation.createdAt.toDate().toLocaleDateString('fr-FR')} ?`,
        confirmText: 'Supprimer',
        type: 'danger'
      }
    );
  };

  // Confirmer la régénération
  const handleRegenerateAccess = () => {
    confirm(
      regenerateClientAccess,
      {
        title: 'Réinitialiser les accès',
        message: `Cette action va créer un NOUVEAU compte de connexion pour ${client.prenom} ${client.nom}. Les anciens identifiants ne fonctionneront plus définitivement. Utile si le client n'arrive plus à se connecter.`,
        confirmText: 'Réinitialiser',
        type: 'warning'
      }
    );
  };

  // Charger les invitations au montage
  useEffect(() => {
    loadInvitations();
    checkChantier();
  }, [client.id]);

  // Écouter les changements en temps réel - désactivé temporairement
  useEffect(() => {
    if (!client.id) return;

    // Temporairement désactivé pour éviter les problèmes de permissions
    // const unsubscribe = invitationService.subscribeToInvitations((allInvitations) => {
    //   const clientInvitations = allInvitations.filter(inv => inv.clientId === client.id);
    //   setInvitations(clientInvitations);
    // });

    // return unsubscribe;
  }, [client.id]);

  const getStatusIcon = (status: FirebaseInvitation['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'sent':
        return <Send className="w-4 h-4 text-blue-500" />;
      case 'accepted':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'declined':
        return <X className="w-4 h-4 text-red-500" />;
      case 'expired':
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: FirebaseInvitation['status']) => {
    switch (status) {
      case 'pending':
        return 'En attente';
      case 'sent':
        return 'Envoyée';
      case 'accepted':
        return 'Acceptée';
      case 'declined':
        return 'Déclinée';
      case 'expired':
        return 'Expirée';
      default:
        return 'Inconnue';
    }
  };

  const getStatusColor = (status: FirebaseInvitation['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'declined':
        return 'bg-red-100 text-red-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const canCreateAccount = () => {
    // Peut créer un compte si :
    // 1. Le client a un email
    // 2. Le client n'a pas encore de compte (pas d'userId)
    if (!client.email) return false;
    return !client.userId;
  };

  const getAccountStatus = () => {
    if (!client.email) {
      return { status: 'no-email', dot: '●', color: 'text-gray-400', text: 'Email requis' };
    }

    if (client.userId) {
      return {
        status: 'active',
        dot: '●',
        color: 'text-green-500',
        text: `Connecté le ${client.acceptedAt?.toDate().toLocaleDateString('fr-FR') || ''}`
      };
    }

    return { status: 'no-account', dot: '●', color: 'text-gray-400', text: 'Aucun compte' };
  };

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Compte App Mobile
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {canCreateAccount() && (
            <Button
              onClick={createClientAccount}
              disabled={creatingAccount}
              size="sm"
              className="flex items-center gap-2"
            >
              {creatingAccount ? (
                <RotateCcw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {creatingAccount ? 'Création...' : 'Créer le compte'}
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* Statut de connexion - Version minimaliste */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Email</span>
            <span className="font-medium text-gray-900">{client.email || 'Non renseigné'}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-gray-600">Statut</span>
            <div className="flex items-center gap-2">
              <span className={`${getAccountStatus().color} text-lg leading-none`}>{getAccountStatus().dot}</span>
              <span className="text-gray-900 text-xs">{getAccountStatus().text}</span>
            </div>
          </div>
        </div>

        {/* Alerte si pas de chantier */}
        {!hasChantier && hasChantier !== null && (
          <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-bold text-orange-800">Aucun projet de construction lié</h4>
                <p className="text-xs text-orange-700 mt-1">
                  Le client peut se connecter mais verra "Aucun chantier". Pour que son avancement s'affiche, vous devez créer un projet pour lui.
                </p>
                <Button
                  onClick={() => setIsChantierModalOpen(true)}
                  size="sm"
                  className="mt-3 bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-2"
                >
                  <FolderPlus className="w-4 h-4" />
                  Créer le projet maintenant
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Identifiants de connexion sauvegardés */}
        {(client.username && client.tempPassword) && !credentials && (
          <div className="border border-blue-200 rounded-lg overflow-hidden">
            <div className="bg-blue-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-blue-500 text-lg">●</span>
                <span className="text-sm font-medium text-blue-900">Identifiants sauvegardés</span>
              </div>
            </div>
            <div className="bg-white p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Identifiant</label>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{client.username}</span>
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(client.username!);
                        toast.success('Identifiant copié', { autoClose: 1000 });
                      }}
                      size="sm"
                      variant="outline"
                      className="px-2 h-7"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Mot de passe</label>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{client.tempPassword}</span>
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(client.tempPassword!);
                        toast.success('Mot de passe copié', { autoClose: 1000 });
                      }}
                      size="sm"
                      variant="outline"
                      className="px-2 h-7"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    const fullCredentials = `Identifiant: ${client.username}\nMot de passe: ${client.tempPassword}`;
                    navigator.clipboard.writeText(fullCredentials);
                    toast.success('Identifiants copiés', { autoClose: 2000 });
                  }}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copier tout
                </Button>
                <Button
                  onClick={handleRegenerateAccess}
                  disabled={regenerating}
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <RotateCcw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
                  {regenerating ? 'Réinitialisation...' : 'Réinitialiser'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Identifiants de connexion créés ou régénérés */}
        {credentials && (
          <div className="border border-green-200 rounded-lg overflow-hidden">
            <div className="bg-green-50 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-green-500 text-lg">●</span>
                <span className="text-sm font-medium text-green-900">
                  {client.username ? 'Nouveaux identifiants générés' : 'Compte créé'}
                </span>
              </div>
              <Button
                onClick={() => setCredentials(null)}
                size="sm"
                variant="outline"
                className="text-gray-500 hover:text-gray-700 border-none"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="bg-white p-4">
              <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-gray-100">
                <pre className="whitespace-pre-wrap leading-relaxed">{credentials}</pre>
              </div>
              <div className="mt-3">
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(credentials);
                    toast.success('Identifiants copiés', { autoClose: 2000 });
                  }}
                  size="sm"
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  <Copy className="w-4 h-4" />
                  Copier
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Liste des invitations */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RotateCcw className="w-6 h-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Chargement...</span>
          </div>
        ) : invitations.length > 0 ? (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">
              Historique des invitations ({invitations.length})
            </h4>
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(invitation.status)}
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(invitation.status)}`}
                      >
                        {getStatusText(invitation.status)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Créée le {invitation.createdAt.toDate().toLocaleDateString('fr-FR')} à{' '}
                      {invitation.createdAt.toDate().toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                    {invitation.expiresAt && (
                      <p className="text-xs text-gray-500">
                        Expire le {invitation.expiresAt.toDate().toLocaleDateString('fr-FR')}
                      </p>
                    )}
                    {invitation.acceptedAt && (
                      <p className="text-xs text-green-600">
                        Acceptée le {invitation.acceptedAt.toDate().toLocaleDateString('fr-FR')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {(invitation.status === 'pending' || invitation.status === 'sent') && invitation.token && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyInvitationLink(invitation.token!)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      title="Copier le lien d'invitation"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  )}
                  {invitation.status !== 'accepted' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteInvitation(invitation)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="Supprimer l'invitation"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* Messages d'aide */}
        {!client.email && (
          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-yellow-500">⚠️</span>
              <span className="text-yellow-800">Un email est requis pour créer un compte mobile</span>
            </div>
          </div>
        )}

        {!canCreateAccount() && client.email && !client.username && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-blue-500">●</span>
              <span className="text-blue-800">Compte déjà créé</span>
            </div>
          </div>
        )}

        {canCreateAccount() && !credentials && !(client.username && client.tempPassword) && (
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-center">
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                Aucun compte mobile
              </h3>
              <p className="text-xs text-gray-600 mb-3">
                Ce client n'a pas encore de compte pour l'application mobile. Cliquez sur "Créer le compte" pour générer les identifiants de connexion.
              </p>
            </div>
          </div>
        )}
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

      {/* Modal de création de chantier */}
      <ChantierModal
        isOpen={isChantierModalOpen}
        onClose={() => setIsChantierModalOpen(false)}
        onSuccess={() => {
          setIsChantierModalOpen(false);
          checkChantier();
          onUpdate?.();
        }}
      // On laisse l'utilisateur confirmer le client dans la modal qui s'ouvre.
      />
    </Card>
  );
};