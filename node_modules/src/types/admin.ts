export interface Admin {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  phoneNumber?: string;
  status: 'En attente' | 'Actif' | 'Suspendu';
  invitationStatus: 'pending' | 'sent' | 'accepted' | 'declined';
  invitationToken?: string;
  tempPassword?: string; // Mot de passe temporaire généré
  userId?: string; // Lié à l'utilisateur une fois qu'il accepte l'invitation
  createdAt: string;
  invitedAt?: string;
  acceptedAt?: string;
}