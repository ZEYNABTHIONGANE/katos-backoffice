/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import {
  User, Mail, Shield, Settings as SettingsIcon,
  Download, Bell, BarChart3,
  Save, Edit3, Phone, Eye, EyeOff, Database
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { MigrationPanel } from '../components/admin/MigrationPanel';
import { useAuthStore } from '../store/authStore';
import { useClientStore } from '../store/clientStore';
import { useMaterialStore } from '../store/materialStore';
import { useProjectStore } from '../store/projectStore';
import { authService } from '../services/authService';
import { toast } from 'react-toastify';
import { notificationTriggers } from '../utils/notificationTriggers';
import { useConfirm } from '../hooks/useConfirm';
import { updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export const Settings: React.FC = () => {
  const { user, userData, setUser, setUserData } = useAuthStore();
  const { clients } = useClientStore();
  const { materials } = useMaterialStore();
  const { projects } = useProjectStore();
  const { confirmState, confirm, handleConfirm, handleClose } = useConfirm();

  const [editingProfile, setEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    name: userData?.displayName || user?.displayName || '',
    email: user?.email || '',
    phoneNumber: userData?.phoneNumber || ''
  });

  // Gestion du changement de mot de passe
  const [loadingPasswordChange, setLoadingPasswordChange] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // États pour l'affichage des mots de passe
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Gestion du changement de mot de passe
  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Les nouveaux mots de passe ne correspondent pas');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Le nouveau mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoadingPasswordChange(true);
    try {
      const result = await authService.changePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );

      if (result.success) {
        toast.success('Mot de passe changé avec succès');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        toast.error(result.error || 'Erreur lors du changement de mot de passe');
      }
    } catch (error: any) {
      console.error('Erreur complète:', error);

      // Messages d'erreur plus spécifiques
      let errorMessage = 'Erreur lors du changement de mot de passe';
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = 'Mot de passe actuel incorrect. Veuillez vérifier votre mot de passe.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Le nouveau mot de passe est trop faible';
      } else if (error.code === 'auth/requires-recent-login') {
        errorMessage = 'Veuillez vous reconnecter avant de changer votre mot de passe';
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
    } finally {
      setLoadingPasswordChange(false);
    }
  };

  const handleExportData = () => {
    confirm(
      () => performExport(),
      {
        title: 'Exporter les données',
        message: 'Voulez-vous vraiment exporter toutes les données en format CSV ? Cette action créera plusieurs fichiers de téléchargement.',
        confirmText: 'Exporter',
        type: 'info'
      }
    );
  };

  const performExport = () => {
    // Fonction pour convertir en CSV
    const arrayToCSV = (array: any[]) => {
      if (array.length === 0) return '';

      const headers = Object.keys(array[0]);
      const csvHeaders = headers.join(',');

      const csvRows = array.map(row =>
        headers.map(header => {
          const value = row[header];
          // Échapper les virgules et guillemets
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      );

      return [csvHeaders, ...csvRows].join('\n');
    };

    // Créer les fichiers CSV
    const date = new Date().toISOString().split('T')[0];

    // Export clients
    if (clients.length > 0) {
      const clientsCSV = arrayToCSV(clients);
      const blob = new Blob([clientsCSV], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `katos-clients-${date}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    // Export matériaux
    if (materials.length > 0) {
      const materialsCSV = arrayToCSV(materials);
      const blob = new Blob([materialsCSV], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `katos-materiaux-${date}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    // Export projets
    if (projects.length > 0) {
      const projectsCSV = arrayToCSV(projects);
      const blob = new Blob([projectsCSV], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `katos-projets-${date}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    toast.success(`Données exportées en CSV (${clients.length + materials.length + projects.length} entrées)`);
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      // Mettre à jour le displayName dans Firebase Auth
      await updateProfile(user, { displayName: profileData.name });

      // Mettre à jour les données dans Firestore
      if (userData) {
        await setDoc(doc(db, 'users', user.uid), {
          ...userData,
          displayName: profileData.name,
          phoneNumber: profileData.phoneNumber || null
        });
      }

      // Mettre à jour le store
      setUser({ ...user, displayName: profileData.name });
      setUserData(userData ? {
        ...userData,
        displayName: profileData.name,
        phoneNumber: profileData.phoneNumber || null
      } : null);

      setEditingProfile(false);
      toast.success('Profil mis à jour avec succès');
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      toast.error('Erreur lors de la mise à jour du profil');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-6xl mx-auto p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 lg:space-y-8">
        {/* Header moderne avec glassmorphism */}
        <div className="relative overflow-hidden rounded-xl sm:rounded-2xl shadow-lg sm:shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-500 via-primary-600 to-secondary-500"></div>
          <div className="relative p-4 sm:p-6 lg:p-8 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-3 sm:space-x-6">
                <div className="p-2 sm:p-3 lg:p-4 bg-white/15 rounded-xl sm:rounded-2xl backdrop-blur-sm border border-white/10">
                  <SettingsIcon className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-black" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-black">Paramètres</h1>
                </div>
              </div>
              <div className="hidden sm:block">
                <div className="text-right">
                  <p className="text-white/80 text-xs sm:text-sm">Interface Katos</p>
                  <p className="text-white font-semibold text-sm sm:text-base">Version 1.0</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Profil utilisateur */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gray-100 rounded-xl shadow-lg">
                    <User className="w-6 h-6 text-primary-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Profil utilisateur</h2>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingProfile(!editingProfile)}
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  {editingProfile ? 'Annuler' : 'Modifier'}
                </Button>
              </div>

              <div className="space-y-4">
                {editingProfile ? (
                  <>
                    <Input
                      label="Nom complet"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    />
                    <Input
                      label="Email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      disabled
                    />
                    <Input
                      label="Téléphone"
                      value={profileData.phoneNumber}
                      onChange={(e) => setProfileData({ ...profileData, phoneNumber: e.target.value })}
                      placeholder="+221 XX XXX XX XX"
                    />
                    <Button onClick={handleSaveProfile} className="w-full">
                      <Save className="w-4 h-4 mr-2" />
                      Sauvegarder
                    </Button>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                      <User className="w-5 h-5 text-gray-600" />
                      <span className="font-medium">{profileData.name}</span>
                    </div>
                    <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                      <Mail className="w-5 h-5 text-gray-600" />
                      <span className="font-medium">{profileData.email}</span>
                    </div>
                    <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                      <Phone className="w-5 h-5 text-gray-600" />
                      <span className="font-medium">{profileData.phoneNumber || 'Non renseigné'}</span>
                    </div>
                    <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                      <Shield className="w-5 h-5 text-gray-600" />
                      <span className="font-medium">Administrateur</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Changement de mot de passe */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Changer le mot de passe</h2>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-900">
                    Mot de passe actuel
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      placeholder="Votre mot de passe actuel"
                      className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-900">
                    Nouveau mot de passe
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      placeholder="Nouveau mot de passe (min. 6 caractères)"
                      className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-900">
                    Confirmer le nouveau mot de passe
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      placeholder="Confirmez le nouveau mot de passe"
                      className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <Button
                  onClick={handleChangePassword}
                  className="w-full"
                  loading={loadingPasswordChange}
                  disabled={loadingPasswordChange}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {loadingPasswordChange ? 'Changement en cours...' : 'Changer le mot de passe'}
                </Button>
              </div>
            </div>
          </Card>

          {/* Statistiques Firebase */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Statistiques des données</h2>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                  <div className="text-2xl font-bold text-blue-600">{clients.length}</div>
                  <div className="text-sm text-blue-700 font-medium">Clients</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
                  <div className="text-2xl font-bold text-green-600">{materials.length}</div>
                  <div className="text-sm text-green-700 font-medium">Matériaux</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
                  <div className="text-2xl font-bold text-purple-600">{projects.length}</div>
                  <div className="text-sm text-purple-700 font-medium">Projets</div>
                </div>
              </div>
            </div>
          </Card>

          {/* Export des données */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg">
                  <Download className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Export des données</h2>
              </div>

              <div className="space-y-4">
                <p className="text-gray-600 text-sm">
                  Exportez toutes vos données au format CSV pour Excel et autres tableurs.
                </p>

                <Button
                  className="w-full justify-start bg-green-600 hover:bg-green-700"
                  onClick={handleExportData}
                >
                  <Download className="w-4 h-4 mr-3" />
                  Exporter en CSV
                </Button>

                <div className="text-xs text-gray-500 mt-2">
                  Génère 3 fichiers CSV : clients, matériaux et projets
                </div>
              </div>
            </div>
          </Card>

          {/* Notifications */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                  <Bell className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
              </div>

              <div className="space-y-4">
                <p className="text-gray-600 text-sm">
                  Recevez des notifications pour les nouvelles commandes et mises à jour.
                </p>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Bell className="w-5 h-5 text-gray-600" />
                    <div>
                      <span className="font-medium block">Notifications activées</span>
                      <span className="text-sm text-gray-500">Alertes temps réel</span>
                    </div>
                  </div>
                  <div className="w-14 h-7 bg-primary-500 rounded-full relative cursor-pointer">
                    <div className="w-6 h-6 bg-white rounded-full absolute top-0.5 right-0.5 transition-transform shadow-sm"></div>
                  </div>
                </div>

                {/* Section de test des notifications */}
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Test des notifications</h3>
                  <p className="text-xs text-gray-500 mb-3">
                    Testez le système de notifications en simulant des actions clients
                  </p>
                  <Button
                    onClick={async () => {
                      try {
                        await notificationTriggers.createTestNotifications();
                        toast.success('Notifications de test créées !');
                      } catch (error) {
                        toast.error('Erreur lors de la création des notifications');
                      }
                    }}
                    className="w-full"
                    size="sm"
                  >
                    Créer des notifications de test
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Section Migration - Visible seulement pour les super admins */}
          {userData?.role === 'super_admin' && (
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg">
                    <Database className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Migration des données</h2>
                </div>

                <MigrationPanel />
              </div>
            </Card>
          )}
        </div>

      </div>

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