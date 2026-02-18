import React, { useState, useEffect } from 'react';
import { CreditCard, Banknote, Calendar } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { accountingService } from '../../services/accountingService';
import { notificationService } from '../../services/notificationService';
import { toast } from 'react-toastify';
import type { PaymentInstallment, Client } from '../../types';

interface PaymentEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    installment: PaymentInstallment | null;
    client: Client;
    onSuccess: () => void;
}

export const PaymentEntryModal: React.FC<PaymentEntryModalProps> = ({
    isOpen,
    onClose,
    installment,
    client,
    onSuccess
}) => {
    const [loading, setLoading] = useState(false);
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('virement');
    const [reference, setReference] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [sendNotification, setSendNotification] = useState(true);

    // Initialize amount with the remaining amount of the installment
    useEffect(() => {
        if (isOpen && installment) {
            const remaining = installment.amount - (installment.paidAmount || 0);
            setAmount(remaining.toString());
            setMethod('virement');
            setReference('');
            setPaymentDate(new Date().toISOString().split('T')[0]);
            setSendNotification(true);
        }
    }, [isOpen, installment]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!installment) return;

        const paymentAmount = parseInt(amount);
        if (isNaN(paymentAmount) || paymentAmount <= 0) {
            toast.error('Veuillez saisir un montant valide');
            return;
        }

        setLoading(true);
        try {
            // 1. Process payment via AccountingService
            await accountingService.processPayment(
                client.id,
                paymentAmount,
                method,
                reference,
                'system', // default receivedBy
                new Date(paymentDate)
            );

            // 2. Send notification if checked
            if (sendNotification) {
                try {
                    // We use 'payment_received' type which should be handled by notificationService
                    // If not explicitly handled, we might need to add a generic message method
                    await notificationService.notifyPaymentReceived(
                        client.id,
                        paymentAmount,
                        installment.notes || `Échéance N°${installment.installmentNumber}`
                    );
                } catch (notifError) {
                    console.warn('Failed to send notification:', notifError);
                    // Don't block the flow if notification fails
                }
            }

            toast.success('Paiement enregistré avec succès');
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error recording payment:', error);
            toast.error("Erreur lors de l'enregistrement du paiement");
        } finally {
            setLoading(false);
        }
    };

    if (!installment) return null;

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('fr-FR', { style: 'decimal', minimumFractionDigits: 0 }).format(val) + ' FCFA';
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Enregistrer un paiement"
            size="md"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Résumé de l'échéance */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <h4 className="font-semibold text-blue-900">{installment.notes}</h4>
                            <p className="text-sm text-blue-700">
                                Échéance du {new Date(installment.dueDate.seconds * 1000).toLocaleDateString('fr-FR')}
                            </p>
                        </div>
                        <div className="text-right">
                            <span className="block text-lg font-bold text-blue-800">
                                {formatCurrency(installment.amount)}
                            </span>
                            {(installment.paidAmount || 0) > 0 && (
                                <span className="text-xs text-blue-600">
                                    Déjà payé: {formatCurrency(installment.paidAmount || 0)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Formulaire */}
                <div className="space-y-4">
                    <Input
                        label="Date du versement"
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        required
                        icon={<Calendar className="w-4 h-4" />}
                    />

                    <Input
                        label="Montant du versement (Vous pouvez modifier le montant)"
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        min="1"
                        required
                        icon={<Banknote className="w-4 h-4" />}
                    />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Mode de paiement
                        </label>
                        <select
                            value={method}
                            onChange={(e) => setMethod(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="virement">Virement Bancaire</option>
                            <option value="cheque">Chèque</option>
                            <option value="especes">Espèces</option>
                            <option value="mobile_money">Mobile Money</option>
                        </select>
                    </div>

                    <Input
                        label="Référence (N° Chèque, Transaction ID)"
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        placeholder="Ex: VIR-2024-001"
                        icon={<CreditCard className="w-4 h-4" />}
                    />

                    <div className="flex items-center pt-2">
                        <input
                            type="checkbox"
                            id="notifyClient"
                            checked={sendNotification}
                            onChange={(e) => setSendNotification(e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="notifyClient" className="ml-2 text-sm text-gray-700">
                            Envoyer un reçu et une notification au client
                        </label>
                    </div>
                </div>

                <div className="flex gap-3 pt-4 border-t">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className="flex-1"
                        disabled={loading}
                    >
                        Annuler
                    </Button>
                    <Button
                        type="submit"
                        className="flex-1"
                        disabled={loading}
                        loading={loading}
                    >
                        Valider le paiement
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
