import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Button } from './Button';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Supprimer',
  message = 'Êtes-vous sûr de vouloir supprimer cet élément ? Cette action est irréversible.',
  confirmText = 'Supprimer',
  cancelText = 'Annuler',
  type = 'danger',
  loading = false
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <Trash2 className="w-5 h-5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
      default:
        return <AlertTriangle className="w-5 h-5" />;
    }
  };

  const getIconBgColor = () => {
    switch (type) {
      case 'danger':
        return 'bg-red-50 text-red-600';
      case 'warning':
        return 'bg-orange-50 text-orange-600';
      default:
        return 'bg-blue-50 text-blue-600';
    }
  };

  const getConfirmButtonStyle = () => {
    switch (type) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 focus:ring-red-500';
      case 'warning':
        return 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500';
      default:
        return 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';
    }
  };

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop avec animation */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ease-out"
        onClick={onClose}
      />

      {/* Modal container */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative transform overflow-hidden rounded-xl bg-white shadow-2xl transition-all duration-300 ease-out max-w-sm w-full">
          {/* Header avec icône centré */}
          <div className="p-6 text-center">
            <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${getIconBgColor()} mb-4`}>
              {getIcon()}
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {title}
            </h3>

            <p className="text-sm text-gray-500 leading-relaxed">
              {message}
            </p>
          </div>

          {/* Actions */}
          <div className="bg-gray-50 px-6 py-4 flex flex-col-reverse sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1 h-10 text-sm font-medium"
            >
              {cancelText}
            </Button>

            <Button
              onClick={handleConfirm}
              disabled={loading}
              className={`flex-1 h-10 text-sm font-medium text-white transition-colors ${getConfirmButtonStyle()} focus:outline-none focus:ring-2 focus:ring-offset-2`}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Suppression...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  {getIcon()}
                  <span className="ml-2">{confirmText}</span>
                </div>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};