import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  where,
  getDocs,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Notification } from '../types';

export const notificationService = {
  // Écouter les notifications en temps réel
  subscribeToNotifications(callback: (notifications: Notification[]) => void) {
    const q = query(
      collection(db, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt
      })) as Notification[];
      callback(notifications);
    });
  },

  // Marquer une notification comme lue
  async markAsRead(notificationId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        isRead: true
      });
    } catch (error) {
      console.error('Erreur lors du marquage de la notification:', error);
      throw error;
    }
  },

  // Marquer toutes les notifications comme lues
  async markAllAsRead(): Promise<void> {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('isRead', '==', false)
      );

      const querySnapshot = await getDocs(q);
      const updatePromises = querySnapshot.docs.map(docSnapshot =>
        updateDoc(docSnapshot.ref, { isRead: true })
      );

      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Erreur lors du marquage de toutes les notifications:', error);
      throw error;
    }
  },

  // Créer une notification (utilisé par l'app mobile)
  async createNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<void> {
    try {
      await addDoc(collection(db, 'notifications'), {
        ...notification,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Erreur lors de la création de la notification:', error);
      throw error;
    }
  },

  // Envoyer un rappel de paiement
  async sendPaymentReminder(
    clientId: string,
    amount: number,
    dueDate: Date,
    type: 'upcoming' | 'due_today' | 'overdue'
  ) {
    let title = '';
    let message = '';
    const formattedAmount = new Intl.NumberFormat('fr-FR', { style: 'decimal', minimumFractionDigits: 0 }).format(amount) + ' FCFA';
    const dateStr = dueDate.toLocaleDateString('fr-FR');

    switch (type) {
      case 'upcoming':
        title = 'Rappel de paiement à venir';
        message = `Bonjour cher client, nous vous rappelons votre paiement mensuel de ${formattedAmount} prévu à la date du ${dateStr}. Merci de votre confiance.`;
        break;
      case 'due_today':
        title = 'Paiement dû aujourd\'hui';
        message = `Bonjour cher client, nous vous rappelons que votre paiement mensuel de ${formattedAmount} est prévu pour aujourd'hui (${dateStr}). Merci de votre confiance.`;
        break;
      case 'overdue':
        title = 'Paiement en retard';
        message = `Bonjour cher client, nous vous rappelons votre paiement mensuel de ${formattedAmount} qui était prévu à la date du ${dateStr} et qui est actuellement en retard. Merci de votre confiance.`;
        break;
    }

    await this.createNotification({
      userId: clientId,
      type: 'payment',
      title,
      message,
      isRead: false,
      link: '/billing'
    });
  },

  // Obtenir l'icône selon le type de notification
  getNotificationIcon(type: Notification['type']): string {
    switch (type) {
      case 'document_upload':
        return '📄';
      case 'material_selection':
        return '🛒';
      case 'client_update':
        return '👤';
      case 'payment':
        return '💰';
      default:
        return '🔔';
    }
  },

  // Obtenir la couleur selon le type de notification
  getNotificationColor(type: Notification['type']): string {
    switch (type) {
      case 'document_upload':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'material_selection':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'client_update':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'payment':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  },

  // Formater le temps relatif
  getRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMs / 3600000);
    const diffInDays = Math.floor(diffInMs / 86400000);

    if (diffInMinutes < 1) {
      return 'À l\'instant';
    } else if (diffInMinutes < 60) {
      return `Il y a ${diffInMinutes} min`;
    } else if (diffInHours < 24) {
      return `Il y a ${diffInHours}h`;
    } else if (diffInDays < 7) {
      return `Il y a ${diffInDays} jour${diffInDays > 1 ? 's' : ''}`;
    } else {
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short'
      });
    }
  },

  // Compter les notifications non lues
  countUnreadNotifications(notifications: Notification[]): number {
    return notifications.filter(n => !n.isRead).length;
  },

  // Notifier le client d'un paiement reçu
  async notifyPaymentReceived(
    clientId: string,
    amount: number,
    description: string
  ) {
    const formattedAmount = new Intl.NumberFormat('fr-FR', { style: 'decimal', minimumFractionDigits: 0 }).format(amount) + ' FCFA';

    await this.createNotification({
      userId: clientId,
      type: 'payment',
      title: 'Paiement reçu',
      message: `Nous avons bien reçu votre paiement de ${formattedAmount} ${description}. Vous pouvez consulter votre reçu dans l'application.`,
      isRead: false,
      link: '/billing'
    });
  }
};