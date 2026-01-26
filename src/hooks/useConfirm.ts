import { useState } from 'react';

interface ConfirmOptions {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

interface ConfirmState extends ConfirmOptions {
  isOpen: boolean;
  onConfirm?: () => void;
  loading: boolean;
}

export const useConfirm = () => {
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    isOpen: false,
    loading: false
  });

  const confirm = (onConfirm: () => void, options?: ConfirmOptions) => {
    setConfirmState({
      isOpen: true,
      onConfirm,
      loading: false,
      ...options
    });
  };

  const handleConfirm = async () => {
    if (confirmState.onConfirm) {
      setConfirmState(prev => ({ ...prev, loading: true }));

      try {
        await confirmState.onConfirm();
      } catch (error) {
        console.error('Error during confirmation action:', error);
      } finally {
        setConfirmState(prev => ({ ...prev, loading: false, isOpen: false }));
      }
    }
  };

  const handleClose = () => {
    if (!confirmState.loading) {
      setConfirmState(prev => ({ ...prev, isOpen: false }));
    }
  };

  return {
    confirmState,
    confirm,
    handleConfirm,
    handleClose
  };
};