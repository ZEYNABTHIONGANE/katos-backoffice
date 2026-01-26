/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Plus, Users as UsersIcon, Shield, Key, Trash2, Copy, Ban, CheckCircle, RotateCw, HardHat } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { RoleGuard } from '../components/RoleGuard';
import { useAuthStore } from '../store/authStore';
import { useConfirm } from '../hooks/useConfirm';
import { invitationService, type InvitationCode } from '../services/invitationService';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import type { FirebaseUser } from '../types/firebase';
import { UserRole } from '../types/roles';


export const Users: React.FC = () => {
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [invitationCodes, setInvitationCodes] = useState<InvitationCode[]>([]);
  const [users, setUsers] = useState<FirebaseUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [creatingCode, setCreatingCode] = useState(false);
  const [activeTab, setActiveTab] = useState<'codes' | 'users'>('codes');
  const [regeneratedAccess, setRegeneratedAccess] = useState<string | null>(null);
  const [showAccessModal, setShowAccessModal] = useState(false);

  const { userData } = useAuthStore();
  const { confirmState, confirm, handleConfirm, handleClose } = useConfirm();

  useEffect(() => {
    loadInvitationCodes();
    loadUsers();
  }, []);

  const loadInvitationCodes = async () => {
    setLoading(true);
    try {
      const codes = await invitationService.getAllInvitationCodes();
      setInvitationCodes(codes);
    } catch (error) {
      toast.error('Erreur lors du chargement des codes');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const allUsers = await authService.getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoadingUsers(false);
    }
  };


  const handleGenerateCode = async () => {
    if (!userData) {
      toast.error('Vous devez être connecté');
      return;
    }

    try {
      setCreatingCode(true);
      const newCode = await invitationService.createInvitationCode(userData.uid);

      if (newCode) {
        setGeneratedCode(newCode.code);
        setShowCodeModal(true);
        await loadInvitationCodes(); // Recharger la liste
        toast.success('Code d\'invitation généré avec succès');
      } else {
        toast.error('Erreur lors de la génération du code');
      }
    } catch (error) {
      toast.error('Erreur lors de la génération du code');
    } finally {
      setCreatingCode(false);
    }
  };

  const handleDeleteCode = (code: InvitationCode) => {
    if (!userData) return;

    confirm(
      async () => {
        try {
          const success = await invitationService.deleteInvitationCode(code.id!);
          if (success) {
            toast.success('Code supprimé avec succès');
            await loadInvitationCodes();
          } else {
            toast.error('Erreur lors de la suppression du code');
          }
        } catch (error) {
          toast.error('Erreur lors de la suppression du code');
        }
      },
      {
        title: 'Supprimer le code',
        message: `Êtes-vous sûr de vouloir supprimer le code "${code.code}" ? Cette action est irréversible.`,
        confirmText: 'Supprimer',
        type: 'danger'
      }
    );
  };

  const copyCodeToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Code copié dans le presse-papiers');
    } catch (error) {
      // Fallback pour les anciens navigateurs
      const textArea = document.createElement('textarea');
      textArea.value = code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast.success('Code copié dans le presse-papiers');
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'used':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'expired':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Actif';
      case 'used':
        return 'Utilisé';
      case 'expired':
        return 'Expiré';
      default:
        return 'Inconnu';
    }
  };

  const handleToggleUserStatus = (user: FirebaseUser) => {
    if (!userData) return;

    const isCurrentlyBlocked = user.isBlocked || false;
    const action = isCurrentlyBlocked ? 'débloquer' : 'bloquer';
    const actionCaps = isCurrentlyBlocked ? 'Débloquer' : 'Bloquer';

    confirm(
      async () => {
        try {
          const result = await authService.toggleUserStatus(user.uid);
          if (result.success) {
            toast.success(`Utilisateur ${action}é avec succès`);
            await loadUsers();
          } else {
            toast.error(result.error || `Erreur lors du ${action}age`);
          }
        } catch (error) {
          toast.error(`Erreur lors du ${action}age`);
        }
      },
      {
        title: `${actionCaps} l'utilisateur`,
        message: `Êtes-vous sûr de vouloir ${action} l'utilisateur "${user.displayName}" ? ${isCurrentlyBlocked ? 'Il pourra à nouveau se connecter.' : 'Il ne pourra plus se connecter.'}`,
        confirmText: actionCaps,
        type: isCurrentlyBlocked ? 'info' : 'warning'
      }
    );
  };


  const getRoleText = (role: UserRole) => {
    switch (role) {
      case UserRole.SUPER_ADMIN:
        return 'Super Admin';
      case UserRole.ADMIN:
        return 'Admin';
      case UserRole.CHEF:
        return 'Chef de chantier';
      case UserRole.CLIENT:
        return 'Client';
      default:
        return 'Inconnu';
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case UserRole.SUPER_ADMIN:
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case UserRole.ADMIN:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case UserRole.CHEF:
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case UserRole.CLIENT:
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleRegenerateAccess = (user: FirebaseUser) => {
    if (!userData || user.role !== UserRole.CLIENT) return;

    confirm(
      async () => {
        try {
          const result = await authService.regenerateClientAccess(user.uid);
          if (result.success) {
            const accessInfo = `🔑 NOUVEAUX IDENTIFIANTS

Identifiant: ${result.username}
Mot de passe: ${result.tempPassword}

📱 Instructions:
1. Utilisez le nouvel identifiant
2. Entrez le nouveau mot de passe
3. Changez le mot de passe à la première connexion

⚠️ Les anciens identifiants ne fonctionnent plus`;

            setRegeneratedAccess(accessInfo);
            setShowAccessModal(true);
            await loadUsers();
            toast.success('Nouveaux identifiants générés avec succès');
          } else {
            toast.error(result.error || 'Erreur lors de la régénération');
          }
        } catch (error) {
          toast.error('Erreur lors de la régénération des accès');
        }
      },
      {
        title: 'Régénérer les accès',
        message: `Êtes-vous sûr de vouloir générer de nouveaux identifiants pour "${user.displayName}" ? Les anciens identifiants ne fonctionneront plus.`,
        confirmText: 'Régénérer',
        type: 'warning'
      }
    );
  };

  const handleToggleChefStatus = (user: FirebaseUser) => {
    if (!userData) return;

    const currentStatus = user.isChef || false;
    const action = currentStatus ? 'retirer le rôle chef' : 'attribuer le rôle chef';
    const actionCaps = currentStatus ? 'Retirer le rôle chef' : 'Attribuer le rôle chef';

    confirm(
      async () => {
        try {
          const result = await userService.updateChefStatus(user.uid, !currentStatus);
          if (result.success) {
            toast.success(`Rôle chef ${currentStatus ? 'retiré' : 'attribué'} avec succès`);
            await loadUsers();
          } else {
            toast.error(result.error || `Erreur lors de ${action}`);
          }
        } catch (error) {
          toast.error(`Erreur lors de ${action}`);
        }
      },
      {
        title: actionCaps,
        message: `Êtes-vous sûr de vouloir ${action} à "${user.displayName}" ? ${!currentStatus ? 'Il pourra être assigné aux chantiers.' : 'Il ne pourra plus être assigné aux nouveaux chantiers.'}`,
        confirmText: actionCaps,
        type: currentStatus ? 'warning' : 'info'
      }
    );
  };

  if (loading && activeTab === 'codes') {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (loadingUsers && activeTab === 'users') {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <UsersIcon className="w-8 h-8 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestion des utilisateurs</h1>
            <p className="text-gray-600">Gérez les codes d'invitation et les utilisateurs</p>
          </div>
        </div>

        {activeTab === 'codes' && (
          <RoleGuard requiredPermission="canManageUsers">
            <Button onClick={handleGenerateCode} loading={creatingCode} icon={<Plus className="w-4 h-4" />}>
              Générer un code
            </Button>
          </RoleGuard>
        )}
      </div>

      {/* Onglets */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('codes')}
            className={`py-2 px-1 border-b-2 font-medium text-sm cursor-pointer ${activeTab === 'codes'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <Key className="w-4 h-4 inline mr-2" />
            Codes d'invitation ({invitationCodes.length})
          </button>
          <RoleGuard requiredPermission="canManageUsers">
            <button
              onClick={() => setActiveTab('users')}
              className={`py-2 px-1 border-b-2 font-medium text-sm cursor-pointer ${activeTab === 'users'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <UsersIcon className="w-4 h-4 inline mr-2" />
              Utilisateurs ({users.length})
            </button>
          </RoleGuard>
        </nav>
      </div>

      {/* Contenu des onglets */}
      {activeTab === 'codes' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Codes d'invitation ({invitationCodes.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Créé le
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expire le
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invitationCodes.map((code) => {
                  return (
                    <tr key={code.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className="text-sm font-mono font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded">
                            {code.code}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeColor(code.status)}`}>
                          {getStatusText(code.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {code.createdAt.toDate().toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {code.expiresAt.toDate().toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          {code.status === 'active' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyCodeToClipboard(code.code)}
                              icon={<Copy className="w-4 h-4" />}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              Copier
                            </Button>
                          )}
                          <RoleGuard requiredPermission="canDeleteUsers">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteCode(code)}
                              icon={<Trash2 className="w-4 h-4" />}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              Supprimer
                            </Button>
                          </RoleGuard>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {invitationCodes.length === 0 && (
              <div className="text-center py-12">
                <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun code d'invitation</h3>
                <p className="text-gray-500 mb-4">Générez votre premier code d'invitation</p>
                <RoleGuard requiredPermission="canManageUsers">
                  <Button onClick={handleGenerateCode} loading={creatingCode} icon={<Plus className="w-4 h-4" />}>
                    Générer un code
                  </Button>
                </RoleGuard>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Liste des utilisateurs */}
      {activeTab === 'users' && (
        <RoleGuard requiredPermission="canManageUsers">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Utilisateurs ({users.length})
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Utilisateur
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rôle
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Chef de chantier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Créé le
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => {
                    const isCurrentUser = user.uid === userData?.uid;
                    const isSuperAdmin = user.role === UserRole.SUPER_ADMIN;
                    const canModifyUser = userData?.role === UserRole.SUPER_ADMIN && !isCurrentUser;

                    return (
                      <tr key={user.uid} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                <UsersIcon className="w-5 h-5 text-gray-600" />
                              </div>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900 flex items-center space-x-2">
                                <span>{user.displayName}</span>
                                {isCurrentUser && (
                                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                    Vous
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500">
                                {user.role === UserRole.CLIENT && user.username
                                  ? `ID: ${user.username} • ${user.email}`
                                  : user.email
                                }
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(user.role)}`}>
                              {getRoleText(user.role)}
                            </span>
                            {user.role === UserRole.ADMIN && user.isChef && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-orange-100 text-orange-800 border-orange-200">
                                <HardHat className="w-3 h-3 mr-1" />
                                Chef
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {(user.role === UserRole.ADMIN || user.role === UserRole.CHEF || user.role === UserRole.SUPER_ADMIN) ? (
                            <div className="flex items-center space-x-2">
                              {(user.role === UserRole.CHEF || user.isChef || user.role === UserRole.SUPER_ADMIN) ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-green-100 text-green-800 border-green-200">
                                  <HardHat className="w-3 h-3 mr-1" />
                                  Peut gérer les chantiers
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-gray-100 text-gray-800 border-gray-200">
                                  Admin uniquement
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {(user.isBlocked || false) ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-red-100 text-red-800 border-red-200">
                                <Ban className="w-3 h-3 mr-1" />
                                Bloqué
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-green-100 text-green-800 border-green-200">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Actif
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.createdAt.toDate().toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            {canModifyUser && user.role === UserRole.CLIENT && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRegenerateAccess(user)}
                                icon={<RotateCw className="w-4 h-4" />}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                Nouveaux accès
                              </Button>
                            )}
                            {canModifyUser && user.role === UserRole.ADMIN && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleToggleChefStatus(user)}
                                icon={<HardHat className="w-4 h-4" />}
                                className={user.isChef
                                  ? "text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                  : "text-green-600 hover:text-green-700 hover:bg-green-50"
                                }
                              >
                                {user.isChef ? 'Retirer chef' : 'Rendre chef'}
                              </Button>
                            )}
                            {canModifyUser && !isSuperAdmin && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleToggleUserStatus(user)}
                                icon={(user.isBlocked || false) ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                                className={(user.isBlocked || false)
                                  ? "text-green-600 hover:text-green-700 hover:bg-green-50"
                                  : "text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                }
                              >
                                {(user.isBlocked || false) ? 'Débloquer' : 'Bloquer'}
                              </Button>
                            )}
                            {isSuperAdmin && !isCurrentUser && (
                              <span className="text-xs text-gray-400 italic">
                                Super Admin protégé
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {users.length === 0 && (
                <div className="text-center py-12">
                  <UsersIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun utilisateur</h3>
                  <p className="text-gray-500 mb-4">Les utilisateurs apparaîtront ici</p>
                </div>
              )}
            </div>
          </div>
        </RoleGuard>
      )}

      {/* Modal de visualisation du code généré */}
      <Modal
        isOpen={showCodeModal}
        onClose={() => {
          setShowCodeModal(false);
          setGeneratedCode(null);
        }}
        title="Code d'invitation généré"
      >
        {generatedCode && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Key className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Code d'invitation
                  </h3>
                  <p className="text-sm text-gray-600">Valable 7 jours</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Code à transmettre
                </label>
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-md text-center">
                  <code className="text-2xl font-mono text-gray-800 tracking-wider font-bold">
                    {generatedCode}
                  </code>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-800">
                    Instructions
                  </h4>
                  <ul className="mt-2 text-sm text-blue-700 space-y-1">
                    <li>• Transmettez ce code à l'administrateur</li>
                    <li>• Il devra s'inscrire sur la page d'inscription</li>
                    <li>• Le code expire dans 7 jours</li>
                    <li>• Un code ne peut être utilisé qu'une seule fois</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCodeModal(false);
                  setGeneratedCode(null);
                }}
              >
                Fermer
              </Button>
              <Button onClick={() => copyCodeToClipboard(generatedCode)}>
                <Copy className="w-4 h-4 mr-2" />
                Copier le code
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal pour afficher les nouveaux accès */}
      <Modal
        isOpen={showAccessModal}
        onClose={() => {
          setShowAccessModal(false);
          setRegeneratedAccess(null);
        }}
        title="Nouveaux identifiants générés"
      >
        {regeneratedAccess && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <RotateCw className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Identifiants régénérés
                  </h3>
                  <p className="text-sm text-gray-600">Transmettez ces informations au client</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap">{regeneratedAccess}</pre>
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Shield className="w-5 h-5 text-orange-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-orange-800">
                    Important
                  </h4>
                  <ul className="mt-2 text-sm text-orange-700 space-y-1">
                    <li>• Les anciens identifiants ne fonctionnent plus</li>
                    <li>• Le client devra changer son mot de passe</li>
                    <li>• Transmettez ces informations de manière sécurisée</li>
                    <li>• Ne partagez jamais ces informations par email non sécurisé</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAccessModal(false);
                  setRegeneratedAccess(null);
                }}
              >
                Fermer
              </Button>
              <Button onClick={() => navigator.clipboard.writeText(regeneratedAccess)}>
                <Copy className="w-4 h-4 mr-2" />
                Copier les identifiants
              </Button>
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
        type={confirmState.type}
      />
    </div>
  );
};
