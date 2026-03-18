import {
    collection,
    Timestamp,
    doc,
    writeBatch,
    query,
    where,
    getDocs
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { invoiceService } from './invoiceService';
import type {
    PaymentSchedule,
    PaymentInstallment,
    Invoice
} from '../types/billing';

export class AccountingService {
    private schedulesCollection = 'paymentSchedules';

    // Calculer l'acompte (20%)
    calculateDeposit(totalAmount: number): number {
        return Math.round(totalAmount * 0.20);
    }

    // Calculer le reste à payer après l'acompte
    calculateRemainingAfterDeposit(totalAmount: number): number {
        return totalAmount - this.calculateDeposit(totalAmount);
    }

    // Générer un échéancier de paiement
    generateSchedule(
        totalAmount: number,
        depositAmount: number,
        depositPaid: boolean,
        startDate: Date,
        months: number
    ): Omit<PaymentSchedule, 'id' | 'clientId' | 'projectId' | 'createdAt' | 'updatedAt'> {
        const remaining = totalAmount - (depositPaid ? depositAmount : 0);
        const monthlyAmount = Math.ceil((totalAmount - depositAmount) / months);

        const installments: PaymentInstallment[] = [];

        // Si l'acompte n'est pas encore payé, c'est la première échéance
        if (!depositPaid) {
            installments.push({
                id: `inst_${Date.now()}_deposit`,
                scheduleId: '', // Sera rempli lors de la sauvegarde
                installmentNumber: 0,
                amount: depositAmount,
                dueDate: Timestamp.fromDate(startDate),
                status: 'pending',
                notes: "pour l'acompte initial"
            });
        }

        // Générer les mensualités
        let currentBalance = remaining;

        for (let i = 1; i <= months; i++) {
            const dueDate = new Date(startDate);
            dueDate.setMonth(dueDate.getMonth() + i);

            // Ajuster la dernière mensualité pour tomber juste
            const amount = (i === months) ? currentBalance : monthlyAmount;
            currentBalance -= amount;

            installments.push({
                id: `inst_${Date.now()}_${i}`,
                scheduleId: '',
                installmentNumber: i,
                amount: amount,
                dueDate: Timestamp.fromDate(dueDate),
                status: 'pending',
                notes: 'pour ce mois-ci'
            });
        }

        return {
            totalAmount,
            installments,
            status: 'active'
        };
    }

    // Initialiser la comptabilité pour un client (Contrat)
    async initializeClientAccounting(
        clientId: string,
        projectId: string,
        totalAmount: number,
        months: number = 12,
        depositAmount: number = 0,
        startDate: Date = new Date()
    ): Promise<string> {
        try {
            // 1. Créer la facture d'acompte
            const finalDepositAmount = depositAmount > 0 ? depositAmount : this.calculateDeposit(totalAmount);
            const invoiceNumber = await invoiceService.generateInvoiceNumber();

            const depositInvoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'> = {
                clientId,
                projectId,
                invoiceNumber,
                type: 'initial',
                status: 'sent',
                paymentStatus: 'pending',
                issueDate: Timestamp.now(),
                dueDate: Timestamp.fromDate(new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000)), // 7 jours à partir de la date de démarrage
                description: 'Acompte initial',
                notes: 'Paiement requis pour démarrer le chantier',
                items: [{
                    id: `item_${Date.now()}`,
                    description: 'Acompte sur travaux',
                    quantity: 1,
                    unitPrice: finalDepositAmount,
                    totalPrice: finalDepositAmount,
                    category: 'other'
                }],
                totalAmount: finalDepositAmount,
                paidAmount: 0,
                remainingAmount: finalDepositAmount,
                createdBy: 'system',
                sentToClient: true
            };

            await invoiceService.createInvoice(depositInvoice);

            // 2. Générer l'échéancier prévisionnel
            const scheduleData = this.generateSchedule(totalAmount, finalDepositAmount, false, startDate, months);

            // 3. Sauvegarder l'échéancier
            const scheduleId = await invoiceService.createPaymentSchedule({
                clientId,
                projectId,
                ...scheduleData,
                status: 'active'
            } as any); // Type assertion needed because generateSchedule returns specific shape

            return scheduleId;
        } catch (error) {
            console.error('Erreur initialisation comptabilité:', error);
            throw error;
        }
    }

    // Réinitialiser la comptabilité d'un client
    async resetClientAccounting(clientId: string): Promise<void> {
        try {
            const batch = writeBatch(db);

            // 1. Trouver l'échéancier
            const schedule = await invoiceService.getClientPaymentSchedule(clientId);
            if (schedule) {
                // Supprimer l'échéancier
                const scheduleRef = doc(db, this.schedulesCollection, schedule.id!);
                batch.delete(scheduleRef);
            }

            // 2. Trouver et supprimer les factures de type 'initial' ou liées au projet
            // Note: On pourrait aussi supprimer toutes les factures du client si on veut un reset total
            const invoicesQ = query(
                collection(db, 'invoices'),
                where('clientId', '==', clientId),
                where('type', '==', 'initial') // On cible principalement l'acompte
            );
            const invoicesSnapshot = await getDocs(invoicesQ);
            invoicesSnapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });

            // 3. Supprimer l'historique des paiements liés
            const paymentsQ = query(
                collection(db, 'paymentHistory'),
                where('clientId', '==', clientId)
            );
            const paymentsSnapshot = await getDocs(paymentsQ);
            paymentsSnapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });

            await batch.commit();
        } catch (error) {
            console.error('Erreur lors de la réinitialisation:', error);
            throw error;
        }
    }

    // Traiter un paiement et mettre à jour l'échéancier
    async processPayment(
        clientId: string,
        amount: number,
        method: string,
        reference?: string,
        receivedBy?: string,
        paymentDate: Date = new Date()
    ): Promise<void> {
        try {
            // 1. Récupérer l'échéancier actif
            const schedule = await invoiceService.getClientPaymentSchedule(clientId);
            if (!schedule) throw new Error("Aucun échéancier actif trouvé pour ce client.");

            // 2. Trouver les échéances non payées
            let remainingPayment = amount;
            const updatedInstallments = [...schedule.installments];
            let scheduleUpdated = false;

            // Trier par date pour payer les plus anciennes en premier
            updatedInstallments.sort((a, b) => a.dueDate.toDate().getTime() - b.dueDate.toDate().getTime());

            for (const installment of updatedInstallments) {
                if (remainingPayment <= 0) break;
                if (installment.status === 'paid') continue;

                const alreadyPaid = installment.paidAmount || 0;
                const remainingOnInstallment = installment.amount - alreadyPaid;

                if (remainingOnInstallment > 0) {
                    const amountToPay = Math.min(remainingPayment, remainingOnInstallment);

                    installment.paidAmount = alreadyPaid + amountToPay;
                    remainingPayment -= amountToPay;

                    if (installment.paidAmount >= installment.amount) {
                        installment.status = 'paid';
                        installment.paidDate = Timestamp.fromDate(paymentDate);
                    } else {
                        installment.status = 'pending'; // Reste partiel
                    }

                    // Ajouter des métadonnées de paiement si nécessaire
                    installment.paymentMethod = method;
                    installment.reference = reference;

                    scheduleUpdated = true;
                }
            }

            // 3. Mettre à jour l'échéancier si modifié et créer l'historique
            if (scheduleUpdated) {
                const batch = writeBatch(db);

                // Mettre à jour l'échéancier
                const scheduleRef = doc(db, this.schedulesCollection, schedule.id!);
                batch.update(scheduleRef, {
                    installments: updatedInstallments,
                    updatedAt: Timestamp.now()
                });

                // --- NOUVEAU: Mettre à jour les factures correspondantes ---
                try {
                    const invoicesQ = query(
                        collection(db, 'invoices'),
                        where('clientId', '==', clientId),
                        where('paymentStatus', 'in', ['pending', 'overdue'])
                    );
                    const invoicesSnapshot = await getDocs(invoicesQ);

                    if (!invoicesSnapshot.empty) {
                        let invoiceRemainingPayment = amount;
                        const sortedInvoices = invoicesSnapshot.docs
                            .map(d => ({ id: d.id, ...d.data() } as Invoice))
                            .sort((a, b) => a.dueDate.toDate().getTime() - b.dueDate.toDate().getTime());

                        for (const invoice of sortedInvoices) {
                            if (invoiceRemainingPayment <= 0) break;

                            const alreadyPaid = invoice.paidAmount || 0;
                            const remainingOnInvoice = invoice.totalAmount - alreadyPaid;

                            if (remainingOnInvoice > 0) {
                                const amountToApply = Math.min(invoiceRemainingPayment, remainingOnInvoice);
                                const newPaidAmount = alreadyPaid + amountToApply;
                                const newRemainingAmount = Math.max(0, invoice.totalAmount - newPaidAmount);

                                const invoiceRef = doc(db, 'invoices', invoice.id!);
                                batch.update(invoiceRef, {
                                    paidAmount: newPaidAmount,
                                    remainingAmount: newRemainingAmount,
                                    paymentStatus: newRemainingAmount <= 0 ? 'paid' : 'pending',
                                    updatedAt: Timestamp.now()
                                });

                                invoiceRemainingPayment -= amountToApply;
                            }
                        }
                    }
                } catch (invoiceError) {
                    console.error('Erreur lors de la mise à jour des factures pendant le paiement:', invoiceError);
                    // On continue quand même pour ne pas bloquer le paiement principal
                }
                // -----------------------------------------------------------

                // Créer l'entrée dans l'historique des paiements
                const paymentHistoryRef = collection(db, 'paymentHistory');
                const paymentData = {
                    clientId,
                    amount: amount,
                    method: method as any,
                    reference: reference || '',
                    date: Timestamp.fromDate(paymentDate),
                    receivedBy: receivedBy || 'system',
                    createdAt: Timestamp.now(),
                    notes: `Paiement reçu (${amount} FCFA)`
                };
                const paymentDocRef = doc(paymentHistoryRef);
                batch.set(paymentDocRef, paymentData);

                await batch.commit();
            }

        } catch (error) {
            console.error('Erreur lors du traitement du paiement:', error);
            throw error;
        }
    }

    // Vérifier les rappels de paiement (à appeler périodiquement ou au chargement du dashboard)
    async checkPaymentReminders(): Promise<void> {
        try {
            const schedulesQuery = query(collection(db, this.schedulesCollection), where('status', '==', 'active'));
            const snapshot = await getDocs(schedulesQuery);

            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const tenDaysFromNow = new Date(today);
            tenDaysFromNow.setDate(today.getDate() + 10);

            for (const docSnapshot of snapshot.docs) {
                const schedule = docSnapshot.data() as PaymentSchedule;
                const clientId = schedule.clientId;

                for (const installment of schedule.installments) {
                    if (installment.status === 'paid') continue;

                    const dueDate = installment.dueDate.toDate();
                    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

                    // 1. Rappel 10 jours avant
                    if (dueDateOnly.getTime() === tenDaysFromNow.getTime()) {
                        await import('./notificationService').then(m =>
                            m.notificationService.sendPaymentReminder(clientId, installment.amount, dueDate, 'upcoming')
                        );
                    }

                    // 2. Jour J
                    if (dueDateOnly.getTime() === today.getTime()) {
                        await import('./notificationService').then(m =>
                            m.notificationService.sendPaymentReminder(clientId, installment.amount, dueDate, 'due_today')
                        );
                    }

                    // 3. En retard (ex: 1 jour après, 7 jours après)
                    if (dueDateOnly < today && installment.status !== 'overdue') {
                        await import('./notificationService').then(m =>
                            m.notificationService.sendPaymentReminder(clientId, installment.amount, dueDate, 'overdue')
                        );
                    }
                }
            }
        } catch (error) {
            console.error('Erreur lors de la vérification des rappels:', error);
        }
    }
}

export const accountingService = new AccountingService();
