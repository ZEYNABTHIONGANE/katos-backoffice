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
  getDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Notification } from '../types';

export const notificationService = {
  // Résoudre un clientId (collection 'clients') en userId (UID Firebase Auth)
  async getClientUserId(clientId: string): Promise<string | null> {
    try {
      if (!clientId) return null;
      const clientDoc = await getDoc(doc(db, 'clients', clientId));
      if (clientDoc.exists()) {
        const clientData = clientDoc.data();
        return clientData.userId || null;
      }
      return null;
    } catch (error) {
      console.error('Erreur lors de la résolution du userId du client:', error);
      return null;
    }
  },

  // Écouter les notifications en temps réel pour un utilisateur spécifique
  subscribeToNotifications(userId: string, callback: (notifications: Notification[]) => void) {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      limit(50)
    );

    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt
      })) as Notification[];

      // Sort in memory to avoid needing a composite index
      notifications.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });

      callback(notifications);
    }, (error) => {
      console.error('Erreur lors de l\'écoute des notifications:', error);
      callback([]);
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

  // Marquer toutes les notifications comme lues pour un utilisateur
  async markAllAsRead(userId: string): Promise<void> {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
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

    const userId = await this.getClientUserId(clientId);
    if (!userId) {
      console.warn(`Impossible d'envoyer le rappel de paiement : aucun userId pour le client ${clientId}`);
      return;
    }

    await this.createNotification({
      userId,
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
      case 'photo':
        return '📷';
      case 'video':
        return '🎥';
      case 'chat':
        return '💬';
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
      case 'photo':
        return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'video':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'chat':
        return 'bg-blue-100 text-blue-800 border-blue-200';
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

    const userId = await this.getClientUserId(clientId);
    if (!userId) {
      console.warn(`Impossible d'envoyer la notification de paiement : aucun userId pour le client ${clientId}`);
      return;
    }

    await this.createNotification({
      userId,
      type: 'payment',
      title: 'Paiement reçu',
      message: `Nous avons bien reçu votre paiement de ${formattedAmount} ${description}. Vous pouvez consulter votre reçu dans l'application.`,
      isRead: false,
      link: '/billing'
    });
  },

  // Notifier le client qu'un média a été ajouté
  async notifyMediaUploaded(
    targetId: string, // clientId or userId depending on role
    type: 'photo' | 'video' | 'document',
    projectName: string,
    phaseName?: string,
    recipientRole: 'client' | 'backoffice' = 'client'
  ) {
    if (recipientRole === 'backoffice') {
      return; // Désactivé selon la demande utilisateur
    }

    const typeLabel = type === 'photo' ? 'une photo' : type === 'video' ? 'une vidéo' : 'un document';
    const senderLabel = "L'équipe";
    
    // Si c'est pour le backoffice et que le message vient de l'équipe (par ex. Chef)
    // l'utilisateur veut "L'équipe a ajouté une vidéo au projet ..."
    // On va ajuster senderLabel si besoin. Ici on suppose que staff-to-staff = "L'équipe"
    
    const locationInfo = (recipientRole === 'client' && phaseName) 
      ? ` de la phase "${phaseName}"` 
      : ` au projet "${projectName}"`;

    let userId: string | null = targetId;
    if (recipientRole === 'client') {
      userId = await this.getClientUserId(targetId);
    }
    
    if (!userId) {
      console.warn(`Impossible d'envoyer la notification de média : aucun userId valide pour ${targetId}`);
      return;
    }

    await this.createNotification({
      userId,
      type: type as any,
      title: 'Nouveau média ajouté',
      message: `${senderLabel} a ajouté ${typeLabel}${locationInfo}.`,
      isRead: false,
      link: type === 'document' ? '/documents' : '/chantier'
    });
  },

  // Notifier le client d'un nouveau message
  async notifyNewMessage(
    targetId: string, // clientId or userId depending on role
    senderName: string,
    messagePreview: string,
    projectName?: string,
    recipientRole: 'client' | 'backoffice' = 'client'
  ) {
    if (recipientRole === 'backoffice') {
      return; // Désactivé selon la demande utilisateur
    }

    const projectInfo = projectName ? ` concernant le projet "${projectName}"` : '';

    let userId: string | null = targetId;
    if (recipientRole === 'client') {
      userId = await this.getClientUserId(targetId);
    }

    if (!userId) {
      console.warn(`Impossible d'envoyer la notification de message : aucun userId valide pour ${targetId}`);
      return;
    }

    await this.createNotification({
      userId,
      type: 'chat',
      title: 'Nouveau message',
      message: `Vous avez un nouveau message de ${senderName}${projectInfo}.`,
      isRead: false,
      link: '/chat'
    });
  }
};