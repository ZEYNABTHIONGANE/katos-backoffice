import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight, AlertCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import logo from '../assets/logo.png';
import { toast } from 'react-toastify';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isResetMode, setIsResetMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const { login, loading, error, resetPassword } = useAuthStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(email, password);
    if (success) {
      navigate('/dashboard');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Veuillez entrer votre adresse email');
      return;
    }

    const { success, error } = await resetPassword(email);
    if (success) {
      toast.success('Email de réinitialisation envoyé ! Vérifiez votre boîte mail.');
      setIsResetMode(false);
    } else {
      toast.error(error || 'Erreur lors de l\'envoi de l\'email');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <img
            src={logo}
            alt="Katos Construction"
            className="h-16 w-auto"
          />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {isResetMode ? 'Réinitialisation du mot de passe' : 'Connexion Backoffice'}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {isResetMode
            ? "Entrez votre email pour recevoir un lien de réinitialisation."
            : "Accédez à votre espace de gestion"}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100">
          {error && (
            <div className="rounded-md bg-red-50 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Erreur de connexion
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isResetMode ? (
            /* Formulaire de réinitialisation */
            <form className="space-y-6" onSubmit={handleResetPassword}>
              <Input
                label="Email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail className="w-4 h-4" />}
                placeholder="votre@email.com"
              />

              <div>
                <Button
                  type="submit"
                  className="w-full flex justify-center py-2 px-4"
                  loading={loading}
                >
                  Envoyer le lien
                  {!loading && <ArrowRight className="ml-2 w-4 h-4" />}
                </Button>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setIsResetMode(false)}
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 flex items-center justify-center mx-auto"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Retour à la connexion
                </button>
              </div>
            </form>
          ) : (
            /* Formulaire de connexion standard */
            <form className="space-y-6" onSubmit={handleLogin}>
              <Input
                label="Email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail className="w-4 h-4" />}
                placeholder="votre@email.com"
              />

              <div className="relative">
                <Input
                  label="Mot de passe"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  icon={<Lock className="w-4 h-4" />}
                  placeholder="••••••••"
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />
                <div className="absolute right-0 top-0">
                  <button
                    type="button"
                    onClick={() => setIsResetMode(true)}
                    className="text-xs font-medium text-blue-600 hover:text-blue-500"
                    tabIndex={-1}
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
              </div>

              <div>
                <Button
                  type="submit"
                  className="w-full flex justify-center py-2 px-4"
                  loading={loading}
                >
                  Se connecter
                  {!loading && <ArrowRight className="ml-2 w-4 h-4" />}
                </Button>
              </div>

              <div className="text-center mt-4 border-t pt-4">
                <Link
                  to="/register"
                  className="text-sm text-blue-600 hover:text-blue-500 font-medium"
                >
                  Créer votre compte
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};