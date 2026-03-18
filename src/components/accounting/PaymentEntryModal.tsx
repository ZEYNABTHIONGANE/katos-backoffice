import React, { useState, useEffect } from 'react';
import { CreditCard, Banknote, Calendar, Info } from 'lucide-react';
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

    // Réinitialiser à chaque ouverture — champ vide pour que le montant soit libre
    useEffect(() => {
        if (isOpen && installment) {
            setAmount('');
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
            await accountingService.processPayment(
                client.id,
                paymentAmount,
                method,
                reference,
                'system',
                new Date(paymentDate)
            );

            if (sendNotification) {
                try {
                    await notificationService.notifyPaymentReceived(
                        client.id,
                        paymentAmount,
                        installment.notes || `Échéance N°${installment.installmentNumber}`
                    );
                } catch (notifError) {
                    console.warn('Failed to send notification:', notifError);
                }
            }

            toast.success('Versement enregistré avec succès');
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error recording payment:', error);
            toast.error("Erreur lors de l'enregistrement du versement");
        } finally {
            setLoading(false);
        }
    };

    if (!installment) return null;

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('fr-FR', { style: 'decimal', minimumFractionDigits: 0 }).format(val) + ' FCFA';

    const alreadyPaid = installment.paidAmount || 0;
    const totalDue = installment.amount;
    const remaining = Math.max(0, totalDue - alreadyPaid);
    const enteredAmount = parseInt(amount) || 0;
    const isOverpayment = enteredAmount > remaining && remaining > 0;
    const newTotal = alreadyPaid + enteredAmount;
    const newRemaining = Math.max(0, totalDue - newTotal);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Enregistrer un versement"
            size="md"
        >
            <form onSubmit={handleSubmit} className="space-y-5">

                {/* Résumé de l'échéance */}
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 space-y-3">
                    <div className="flex justify-between items-start">
                        <div>
                            <h4 className="font-semibold text-blue-900">
                                {installment.notes || `Échéance N°${installment.installmentNumber}`}
                            </h4>
                            <p className="text-sm text-blue-600">
                                Prévu le {new Date(installment.dueDate.seconds * 1000).toLocaleDateString('fr-FR')}
                            </p>
                        </div>
                        <div className="text-right">
                            <span className="block text-xs text-blue-500 uppercase tracking-wider">Montant prévu</span>
                            <span className="block text-lg font-bold text-blue-800">{formatCurrency(totalDue)}</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-blue-100">
                        <div className="text-center">
                            <p className="text-xs text-blue-500 mb-0.5">Déjà versé</p>
                            <p className="font-semibold text-green-700">{formatCurrency(alreadyPaid)}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-blue-500 mb-0.5">Reste à percevoir</p>
                            <p className="font-semibold text-orange-600">{formatCurrency(remaining)}</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <Input
                        label="Date du versement"
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        required
                        icon={<Calendar className="w-4 h-4" />}
                    />

                    <div>
                        <Input
                            label="Montant versé — le client peut verser n'importe quelle somme"
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            min="1"
                            required
                            placeholder={`Ex : ${formatCurrency(remaining)}`}
                            icon={<Banknote className="w-4 h-4" />}
                        />
                        {/* Aperçu en temps réel */}
                        {enteredAmount > 0 && (
                            <div className={`mt-2 p-3 rounded-lg text-sm flex items-start gap-2 ${
                                isOverpayment
                                    ? 'bg-amber-50 border border-amber-200 text-amber-800'
                                    : 'bg-green-50 border border-green-200 text-green-800'
                            }`}>
                                <Info className="w-4 h-4 mt-0.5 shrink-0" />
                                <div>
                                    {isOverpayment ? (
                                        <p>
                                            <strong>Versement supérieur au restant dû.</strong>
                                            {' '}Le surplus de{' '}
                                            <strong>{formatCurrency(enteredAmount - remaining)}</strong>
                                            {' '}sera appliqué sur les prochaines échéances.
                                        </p>
                                    ) : (
                                        <>
                                            <p>Après ce versement : <strong>Total payé → {formatCurrency(newTotal)}</strong></p>
                                            {newRemaining > 0 && (
                                                <p>Il restera à percevoir : <strong>{formatCurrency(newRemaining)}</strong></p>
                                            )}
                                            {newRemaining === 0 && (
                                                <p className="font-semibold">Cette échéance sera entièrement soldée ✔</p>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

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
                        Valider le versement
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
