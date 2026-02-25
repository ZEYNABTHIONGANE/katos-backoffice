import React, { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services/authService';
import { invitationService } from '../services/invitationService';
import { UserRole } from '../types/roles';
import logo from '../assets/logo.png';

export const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { isAuthenticated } = useAuthStore();

  // Si déjà connecté, rediriger vers le dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (!nom.trim() || !prenom.trim()) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (!invitationCode.trim()) {
      toast.error('Veuillez saisir votre code d\'invitation');
      return;
    }

    setLoading(true);

    try {
      // D'abord valider le code d'invitation AVANT de créer le compte
      const validation = await invitationService.validateAndUseCode(invitationCode, 'temp');

      if (!validation.valid || !validation.codeId) {
        toast.error(validation.error || 'Code d\'invitation invalide');
        setLoading(false);
        return;
      }

      // Si le code est valide, créer le compte Firebase Auth
      const user = await authService.signUp(
        email,
        password,
        `${prenom} ${nom}`,
        UserRole.ADMIN
      );

      // Mettre à jour le code avec le vrai UID utilisateur
      await invitationService.updateCodeUsedBy(validation.codeId, user.uid);

      toast.success('Inscription réussie ! Vous pouvez maintenant vous connecter.');

      // Rediriger vers la page de connexion
      window.location.href = '/login';

    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        toast.error('Un compte existe déjà avec cet email. Utilisez la page de connexion.');
      } else if (error.code === 'auth/weak-password') {
        toast.error('Le mot de passe est trop faible');
      } else if (error.code === 'auth/invalid-email') {
        toast.error('Email invalide');
      } else {
        toast.error('Erreur lors de l\'inscription. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <img className="h-16 w-auto" src={logo} alt="Katos Construction" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Créer votre compte
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Utilisez le code d'invitation fourni par votre administrateur
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Prénom"
                type="text"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                required
                placeholder="Jean"
              />
              <Input
                label="Nom"
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                required
                placeholder="Dupont"
              />
            </div>

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@example.com"
            />

            <Input
              label="Code d'invitation"
              type="text"
              value={invitationCode}
              onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
              required
              placeholder="Votre code d'invitation (ex: ABC12345)"
            />

            <div className="relative">
              <Input
                label="Mot de passe"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Choisissez un mot de passe"
              />
              <button
                type="button"
                className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            <div className="relative">
              <Input
                label="Confirmer le mot de passe"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Confirmez votre mot de passe"
              />
              <button
                type="button"
                className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              • Utilisez le code d'invitation fourni par votre administrateur
              <br />
              • Choisissez votre propre email et mot de passe
              <br />
              • Le code d'invitation ne peut être utilisé qu'une seule fois
            </p>
          </div>

          <Button
            type="submit"
            className="w-full"
            loading={loading}
            icon={<UserPlus className="w-5 h-5" />}
          >
            Créer mon compte
          </Button>

          <div className="text-center">
            <Link
              to="/login"
              className="text-sm text-blue-600 hover:text-blue-500 font-medium"
            >
              Déjà un compte ? Se connecter
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};