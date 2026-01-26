import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck, X } from 'lucide-react';
import { Button } from './Button';
import { notificationService } from '../../services/notificationService';
import type { Notification } from '../../types';

export const NotificationDropdown: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = notificationService.subscribeToNotifications((notifications) => {
      setNotifications(notifications);
    });

    return () => unsubscribe();
  }, []);

  // Fermer le dropdown quand on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notificationService.countUnreadNotifications(notifications);

  const handleMarkAsRead = async (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await notificationService.markAsRead(notificationId);
    } catch (error) {
      console.error('Erreur lors du marquage:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    setLoading(true);
    try {
      await notificationService.markAllAsRead();
    } catch (error) {
      console.error('Erreur lors du marquage de toutes les notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bouton de notification */}
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 h-10 w-10"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[20px] px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {/* Dropdown des notifications */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                Notifications {unreadCount > 0 && `(${unreadCount})`}
              </h3>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleMarkAllAsRead}
                    disabled={loading}
                    className="text-xs"
                  >
                    <CheckCheck className="w-3 h-3 mr-1" />
                    Tout lire
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="p-1"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* Liste des notifications */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    !notification.isRead ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    {/* Icône */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg ${notificationService.getNotificationColor(notification.type)}`}>
                      {notificationService.getNotificationIcon(notification.type)}
                    </div>

                    {/* Contenu */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900 line-clamp-1">
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                            {notification.message}
                          </p>
                          <div className="flex items-center mt-2 text-xs text-gray-500">
                            <span>{notification.clientName}</span>
                            <span className="mx-1">•</span>
                            <span>{notificationService.getRelativeTime(notification.createdAt)}</span>
                          </div>
                        </div>

                        {/* Bouton marquer comme lu */}
                        {!notification.isRead && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => handleMarkAsRead(notification.id, e)}
                            className="p-1 ml-2 flex-shrink-0"
                          >
                            <Check className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">Aucune notification</p>
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 bg-gray-50 border-t border-gray-200">
              <p className="text-xs text-center text-gray-500">
                Les notifications sont synchronisées en temps réel
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};