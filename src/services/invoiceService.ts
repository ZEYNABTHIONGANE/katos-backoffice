import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  orderBy,
  limit,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Invoice, PaymentHistory, PaymentSchedule, ClientPaymentDashboard } from '../types/billing';

export class InvoiceService {
  private invoicesCollection = 'invoices';
  private paymentsCollection = 'paymentHistory';
  private schedulesCollection = 'paymentSchedules';

  // Créer une nouvelle facture
  async createInvoice(invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const invoiceRef = collection(db, this.invoicesCollection);
    const newInvoice: Omit<Invoice, 'id'> = {
      ...invoiceData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      sentToClient: false
    };

    const docRef = await addDoc(invoiceRef, newInvoice);
    return docRef.id;
  }

  // Générer un numéro de facture unique
  async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const q = query(
      collection(db, this.invoicesCollection),
      where('invoiceNumber', '>=', `INV-${year}-000`),
      where('invoiceNumber', '<=', `INV-${year}-999`),
      orderBy('invoiceNumber', 'desc'),
      limit(1)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return `INV-${year}-001`;
    }

    const lastInvoice = snapshot.docs[0].data() as Invoice;
    const lastNumber = parseInt(lastInvoice.invoiceNumber.split('-')[2]);
    const nextNumber = (lastNumber + 1).toString().padStart(3, '0');

    return `INV-${year}-${nextNumber}`;
  }

  // Récupérer toutes les factures d'un client
  async getClientInvoices(clientId: string): Promise<Invoice[]> {
    try {
      const q = query(
        collection(db, this.invoicesCollection),
        where('clientId', '==', clientId),
        orderBy('issueDate', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Invoice[];
    } catch (error) {
      console.error('Erreur lors de la récupération des factures:', error);
      throw error;
    }
  }

  // Écouter les factures d'un client en temps réel
  subscribeToClientInvoices(
    clientId: string,
    callback: (invoices: Invoice[]) => void
  ): () => void {
    const q = query(
      collection(db, this.invoicesCollection),
      where('clientId', '==', clientId),
      orderBy('issueDate', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const invoices = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Invoice[];
      callback(invoices);
    });
  }

  // Mettre à jour le statut de paiement d'une facture
  async updatePaymentStatus(
    invoiceId: string,
    paidAmount: number,
    paymentMethod: string,
    reference?: string,
    receivedBy?: string
  ): Promise<void> {
    const batch = writeBatch(db);

    // Récupérer la facture
    const invoiceRef = doc(db, this.invoicesCollection, invoiceId);
    const invoiceSnap = await getDoc(invoiceRef);

    if (!invoiceSnap.exists()) {
      throw new Error('Facture introuvable');
    }

    const invoice = invoiceSnap.data() as Invoice;
    const newPaidAmount = (invoice.paidAmount || 0) + paidAmount;
    const remainingAmount = invoice.totalAmount - newPaidAmount;

    // Déterminer le nouveau statut
    let paymentStatus: Invoice['paymentStatus'];
    let status: Invoice['status'] = invoice.status;

    if (remainingAmount <= 0) {
      paymentStatus = 'paid';
      status = 'paid';
    } else if (newPaidAmount > 0) {
      paymentStatus = 'partial';
    } else {
      paymentStatus = 'pending';
    }

    // Mettre à jour la facture
    const invoiceUpdate = {
      paidAmount: newPaidAmount,
      remainingAmount,
      paymentStatus,
      status,
      paidDate: remainingAmount <= 0 ? Timestamp.now() : invoice.paidDate,
      updatedAt: Timestamp.now()
    };
    batch.update(invoiceRef, invoiceUpdate);

    // Créer l'entrée dans l'historique des paiements
    const paymentHistoryRef = collection(db, this.paymentsCollection);
    const paymentData: Omit<PaymentHistory, 'id'> = {
      invoiceId,
      clientId: invoice.clientId,
      amount: paidAmount,
      method: paymentMethod as any,
      reference,
      date: Timestamp.now(),
      receivedBy: receivedBy || '',
      createdAt: Timestamp.now()
    };
    const paymentDocRef = doc(paymentHistoryRef);
    batch.set(paymentDocRef, paymentData);

    await batch.commit();
  }

  // Récupérer l'historique des paiements d'un client
  async getClientPaymentHistory(clientId: string): Promise<PaymentHistory[]> {
    try {
      const q = query(
        collection(db, this.paymentsCollection),
        where('clientId', '==', clientId),
        orderBy('date', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PaymentHistory[];
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'historique:', error);
      throw error;
    }
  }

  // Créer un échéancier de paiement
  async createPaymentSchedule(scheduleData: Omit<PaymentSchedule, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const scheduleRef = collection(db, this.schedulesCollection);
    const newSchedule: Omit<PaymentSchedule, 'id'> = {
      ...scheduleData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    const docRef = await addDoc(scheduleRef, newSchedule);
    return docRef.id;
  }

  // Récupérer l'échéancier d'un client
  async getClientPaymentSchedule(clientId: string): Promise<PaymentSchedule | null> {
    try {
      const q = query(
        collection(db, this.schedulesCollection),
        where('clientId', '==', clientId),
        where('status', '==', 'active'),
        limit(1)
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;

      return {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data()
      } as PaymentSchedule;
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'échéancier:', error);
      return null;
    }
  }

  // Construire le dashboard de paiement client
  async getClientPaymentDashboard(clientId: string): Promise<ClientPaymentDashboard> {
    const [invoices, payments, schedule] = await Promise.all([
      this.getClientInvoices(clientId),
      this.getClientPaymentHistory(clientId),
      this.getClientPaymentSchedule(clientId)
    ]);

    const totalProjectCost = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const totalRemaining = totalProjectCost - totalPaid;

    // Trouver la prochaine échéance
    let nextPayment;
    let overduePayments;

    if (schedule) {
      const now = new Date();
      const pendingInstallments = schedule.installments.filter(inst => inst.status === 'pending');

      nextPayment = pendingInstallments
        .sort((a, b) => a.dueDate.toDate().getTime() - b.dueDate.toDate().getTime())[0];

      overduePayments = pendingInstallments.filter(
        inst => inst.dueDate.toDate() < now
      );
    }

    return {
      clientId,
      totalProjectCost,
      totalPaid,
      totalRemaining,
      currentSchedule: schedule || undefined,
      nextPayment,
      overduePayments: overduePayments || [],
      recentInvoices: invoices.slice(0, 5),
      totalInvoices: invoices.length,
      recentPayments: payments.slice(0, 5),
      lastUpdated: Timestamp.now()
    };
  }

  // Marquer une facture comme envoyée au client
  async markInvoiceAsSent(invoiceId: string): Promise<void> {
    const invoiceRef = doc(db, this.invoicesCollection, invoiceId);
    await updateDoc(invoiceRef, {
      sentToClient: true,
      sentAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
  }

  // Supprimer une facture (soft delete)
  async deleteInvoice(invoiceId: string): Promise<void> {
    const invoiceRef = doc(db, this.invoicesCollection, invoiceId);
    await updateDoc(invoiceRef, {
      status: 'cancelled',
      updatedAt: Timestamp.now()
    });
  }
}

export const invoiceService = new InvoiceService();