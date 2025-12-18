import React from 'react';
import { User, Menu, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useLayout } from '../../hooks/useLayout';
import { NotificationDropdown } from '../ui/NotificationDropdown';

export const TopBar: React.FC = () => {
  const { user } = useAuthStore();
  const { isMobileMenuOpen, toggleMobileMenu } = useLayout();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 h-14 sm:h-16">
      <div className="flex items-center justify-between h-full px-3 sm:px-6">
        {/* Left section - Mobile menu + Title */}
        <div className="flex items-center gap-3">
          {/* Mobile menu button */}
          <button
            onClick={toggleMobileMenu}
            className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-all touch-manipulation cursor-pointer"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>

          {/* Title - Responsive */}
          <div className="flex items-center">
            <h2 className="text-sm sm:text-lg lg:text-xl font-semibold text-gray-800 truncate">
              <span className="hidden sm:inline">Projet Katos connect</span>
              <span className="sm:hidden">Katos</span>
            </h2>
          </div>
        </div>

        {/* Right section - Notifications + Profile */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Notifications */}
          <NotificationDropdown />

          {/* User Profile */}
          <div className="flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl sm:rounded-2xl p-1.5 sm:p-2 hover:from-gray-100 hover:to-gray-150 transition-all duration-300 cursor-pointer group">
            <div className="w-7 h-7 sm:w-10 sm:h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg sm:rounded-xl flex items-center justify-center shadow-md sm:shadow-lg group-hover:shadow-xl transition-shadow duration-300">
              <User className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
            </div>

            {/* User info - Hidden on small screens */}
            <div className="hidden sm:flex flex-col">
              <span className="text-xs sm:text-sm font-semibold text-gray-800 group-hover:text-gray-900 transition-colors truncate max-w-24 lg:max-w-none">
                {user?.displayName || 'Utilisateur'}
              </span>
              <span className="text-xs text-gray-500">Admin</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};