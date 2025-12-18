import React from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../utils/cn';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md'
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 transition-opacity backdrop-blur-sm cursor-pointer"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/60"></div>
      </div>

      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

        <div className={cn(
          'inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle w-full border border-gray-200 relative z-10',
          sizeClasses[size]
        )}>
          <div className="bg-white px-6 pt-6 pb-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">
                {title}
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="p-2 h-10 w-10 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="bg-gray-50/50 -mx-6 -mb-6 sm:-mx-8 sm:-mb-8 px-6 py-6 sm:px-8 sm:py-8 rounded-b-lg">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};