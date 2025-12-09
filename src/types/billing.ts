import { Timestamp } from 'firebase/firestore';

// Types pour la facturation unifiée
export interface Invoice {
  id?: string;
  clientId: string;
  chantierId?: string;
  projectId?: string;

  // Informations de base
  invoiceNumber: string; // Format: INV-2024-001
  type: 'initial' | 'progress' | 'final' | 'additional';

  // Montants
  totalAmount: number; // En FCFA
  paidAmount: number;
  remainingAmount: number;

  // Statut
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paymentStatus: 'pending' | 'partial' | 'paid' | 'overdue';

  // Dates
  issueDate: Timestamp;
  dueDate: Timestamp;
  paidDate?: Timestamp;

  // Méthode de paiement
  paymentMethod?: 'cash' | 'bank_transfer' | 'check' | 'mobile_money';
  paymentReference?: string;

  // Détails
  description: string;
  notes?: string;
  items: InvoiceItem[];

  // Fichiers attachés (PDF, etc.)
  documentUrl?: string; // URL du PDF de la facture
  attachments?: string[]; // URLs des pièces jointes

  // Métadonnées
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string; // Admin qui a créé la facture
  sentToClient: boolean;
  sentAt?: Timestamp;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category?: 'materials' | 'labor' | 'equipment' | 'other';
}

// Historique des paiements
export interface PaymentHistory {
  id?: string;
  invoiceId: string;
  clientId: string;
  amount: number;
  method: 'cash' | 'bank_transfer' | 'check' | 'mobile_money';
  reference?: string;
  date: Timestamp;
  notes?: string;
  receivedBy: string; // Admin qui a reçu le paiement
  createdAt: Timestamp;
}

// Échéanciers détaillés
export interface PaymentSchedule {
  id?: string;
  clientId: string;
  projectId: string;
  totalAmount: number;
  installments: PaymentInstallment[];
  status: 'active' | 'completed' | 'cancelled';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PaymentInstallment {
  id: string;
  scheduleId: string;
  installmentNumber: number;
  amount: number;
  dueDate: Timestamp;
  status: 'pending' | 'paid' | 'overdue';
  paidDate?: Timestamp;
  paidAmount?: number;
  paymentMethod?: string;
  reference?: string;
  notes?: string;
}

// Dashboard client avec infos paiement
export interface ClientPaymentDashboard {
  clientId: string;

  // Vue d'ensemble financière
  totalProjectCost: number;
  totalPaid: number;
  totalRemaining: number;

  // Échéancier actuel
  currentSchedule?: PaymentSchedule;
  nextPayment?: PaymentInstallment;
  overduePayments: PaymentInstallment[];

  // Factures
  recentInvoices: Invoice[];
  totalInvoices: number;

  // Historique des paiements
  recentPayments: PaymentHistory[];

  // Dernière mise à jour
  lastUpdated: Timestamp;
}