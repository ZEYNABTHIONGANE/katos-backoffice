import { notificationService } from '../services/notificationService';
import type { Notification } from '../types';

// Ces fonctions seraient appelées par l'app mobile lors des actions clients

export const notificationTriggers = {
  // Notification lors de l'upload d'un document
  async triggerDocumentUpload(
    clientId: string,
    clientName: string,
    documentName: string,
    documentType: 'plan' | 'contract' | 'photo' | 'other'
  ) {
    const typeLabels = {
      plan: 'un plan',
      contract: 'un contrat',
      photo: 'une photo',
      other: 'un document'
    };

    await notificationService.createNotification({
      type: 'document_upload',
      title: 'Nouveau document uploadé',
      message: `${clientName} a uploadé ${typeLabels[documentType]} : "${documentName}"`,
      clientId,
      clientName,
      isRead: false,
      data: {
        documentName,
        documentType
      }
    });
  },

  // Notification lors de la sélection d'un matériau
  async triggerMaterialSelection(
    clientId: string,
    clientName: string,
    materialName: string,
    materialId: string,
    quantity?: number
  ) {
    const quantityText = quantity ? ` (${quantity} unité${quantity > 1 ? 's' : ''})` : '';

    await notificationService.createNotification({
      type: 'material_selection',
      title: 'Matériau sélectionné',
      message: `${clientName} a sélectionné le matériau "${materialName}"${quantityText} depuis la boutique`,
      clientId,
      clientName,
      isRead: false,
      data: {
        materialName,
        materialId,
        quantity
      }
    });
  },

  // Notification lors de la mise à jour du profil client
  async triggerClientUpdate(
    clientId: string,
    clientName: string,
    updateType: 'profile' | 'project' | 'preferences'
  ) {
    const updateLabels = {
      profile: 'son profil',
      project: 'les détails de son projet',
      preferences: 'ses préférences'
    };

    await notificationService.createNotification({
      type: 'client_update',
      title: 'Profil client mis à jour',
      message: `${clientName} a modifié ${updateLabels[updateType]}`,
      clientId,
      clientName,
      isRead: false,
      data: {
        updateType
      }
    });
  },

  // Fonction pour créer des notifications de test (pour démonstration)
  async createTestNotifications() {
    const testClients = [
      { id: 'client1', name: 'Jean Dupont' },
      { id: 'client2', name: 'Marie Martin' },
      { id: 'client3', name: 'Pierre Durand' }
    ];

    // Notification de document
    await this.triggerDocumentUpload(
      testClients[0].id,
      testClients[0].name,
      'Plan-Villa-Zeyna-F4.pdf',
      'plan'
    );

    // Notification de sélection matériau
    await this.triggerMaterialSelection(
      testClients[1].id,
      testClients[1].name,
      'Carrelage blanc brillant 60x60',
      'mat_001',
      25
    );

    // Notification de mise à jour profil
    await this.triggerClientUpdate(
      testClients[2].id,
      testClients[2].name,
      'project'
    );

    console.log('Notifications de test créées avec succès !');
  }
};

// Exemples d'utilisation pour l'app mobile :
/*
// Lors de l'upload d'un document dans l'app mobile :
await notificationTriggers.triggerDocumentUpload(
  currentUser.id,
  `${currentUser.prenom} ${currentUser.nom}`,
  file.name,
  documentType
);

// Lors de la sélection d'un matériau dans la boutique :
await notificationTriggers.triggerMaterialSelection(
  currentUser.id,
  `${currentUser.prenom} ${currentUser.nom}`,
  selectedMaterial.name,
  selectedMaterial.id,
  selectedQuantity
);

// Lors de la modification du profil :
await notificationTriggers.triggerClientUpdate(
  currentUser.id,
  `${currentUser.prenom} ${currentUser.nom}`,
  'profile'
);
*/