import { Timestamp } from 'firebase/firestore';
import { UserRole } from './roles';

export interface FirebaseUser {
  uid: string;
  email: string;
  displayName: string;
  username?: string; // Identifiant de connexion pour les clients
  phoneNumber?: string | null;
  clientId?: string;
  isTemporaryPassword?: boolean;
  role: UserRole;
  isChef?: boolean; // Permet aux admins d'avoir aussi le rôle de chef
  createdAt: Timestamp;
  createdBy?: string; // UID de l'utilisateur qui a créé ce compte
  isBlocked?: boolean;
  blockedAt?: Timestamp | null;
}

export interface FirebaseClient {
  id?: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  adresse: string;
  localisationSite: string;
  projetAdhere: string;
  status: 'En cours' | 'Terminé' | 'En attente';
  invitationStatus: 'pending' | 'sent' | 'accepted' | 'declined';
  invitationToken?: string;
  userId?: string; // Lié à l'utilisateur une fois qu'il accepte l'invitation
  username?: string; // Nom d'utilisateur généré pour la connexion
  tempPassword?: string; // Mot de passe temporaire
  typePaiement: 'comptant' | 'echeancier'; // Type de paiement
  createdAt: Timestamp;
  invitedAt?: Timestamp;
  acceptedAt?: Timestamp;
}

export interface FirebaseMaterial {
  id?: string;
  name: string;
  category: string;
  price: number;
  image: string;
  supplier: string;
  description: string;
  createdAt: Timestamp;
}

export interface FirebaseProject {
  id?: string;
  name: string;
  description: string;
  images: string[];
  type: string;
  price: number;
  currency: string;
  createdAt: Timestamp;
}

export interface FirebaseInvitation {
  id?: string;
  clientId: string;
  email: string;
  token: string;
  status: 'pending' | 'sent' | 'accepted' | 'declined' | 'expired';
  createdAt: Timestamp;
  sentAt?: Timestamp;
  acceptedAt?: Timestamp;
  expiresAt: Timestamp;
}

export interface FirebaseCollections {
  users: 'users';
  clients: 'clients';
  materials: 'materials';
  projects: 'projects';
  invitations: 'invitations';
  chantiers: 'chantiers';
  documents: 'documents';
  clientSelections: 'clientSelections';
  invitationCodes: 'invitationCodes';
  documentNotifications: 'documentNotifications';
}

// Collection names constant for easy reference
export const COLLECTIONS: FirebaseCollections = {
  users: 'users',
  clients: 'clients',
  materials: 'materials',
  projects: 'projects',
  invitations: 'invitations',
  chantiers: 'chantiers',
  documents: 'documents',
  clientSelections: 'clientSelections',
  invitationCodes: 'invitationCodes',
  documentNotifications: 'documentNotifications'
};