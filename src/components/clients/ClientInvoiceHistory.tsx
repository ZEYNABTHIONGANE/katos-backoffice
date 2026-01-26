import React, { useState, useEffect } from 'react';
import { FileText, Download, Eye, Plus, Calendar, CreditCard, CheckCircle, Clock, AlertTriangle, Euro } from 'lucide-react';
import { toast } from 'react-toastify';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { invoiceService } from '../../services/invoiceService';
import type { Client, Invoice, PaymentHistory } from '../../types';

interface ClientInvoiceHistoryProps {
  client: Client;
}

export const ClientInvoiceHistory: React.FC<ClientInvoiceHistoryProps> = ({ client }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Formulaire nouvelle facture
  const [invoiceForm, setInvoiceForm] = useState({
    type: 'initial' as Invoice['type'],
    description: '',
    totalAmount: '',
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 jours
    items: [
      { id: '1', description: '', quantity: 1, unitPrice: 0, totalPrice: 0, category: 'materials' as const }
    ]
  });

  // Formulaire paiement
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'cash' as const,
    reference: '',
    notes: ''
  });

  useEffect(() => {
    loadInvoiceData();
  }, [client.id]);

  const loadInvoiceData = async () => {
    setLoading(true);
    try {
      const [invoicesData, paymentsData] = await Promise.all([
        invoiceService.getClientInvoices(client.id),
        invoiceService.getClientPaymentHistory(client.id)
      ]);

      setInvoices(invoicesData);
      setPaymentHistory(paymentsData);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      toast.error('Erreur lors du chargement de l\'historique');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      minimumFractionDigits: 0,
    }).format(amount) + ' FCFA';
  };

  const getStatusColor = (status: Invoice['status']) => {
    switch (status) {
      case 'paid': return 'text-green-600 bg-green-50';
      case 'sent': return 'text-blue-600 bg-blue-50';
      case 'overdue': return 'text-red-600 bg-red-50';
      case 'draft': return 'text-gray-600 bg-gray-50';
      case 'cancelled': return 'text-red-600 bg-red-50';
      default: return 'text-yellow-600 bg-yellow-50';
    }
  };

  const getStatusIcon = (status: Invoice['status']) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-4 h-4" />;
      case 'sent': return <Clock className="w-4 h-4" />;
      case 'overdue': return <AlertTriangle className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const handleCreateInvoice = async () => {
    setIsCreating(true);
    try {
      const invoiceNumber = await invoiceService.generateInvoiceNumber();

      const totalAmount = parseFloat(invoiceForm.totalAmount);
      if (totalAmount <= 0) {
        toast.error('Le montant total doit être supérieur à 0');
        return;
      }

      const newInvoice = {
        clientId: client.id,
        invoiceNumber,
        type: invoiceForm.type,
        totalAmount,
        paidAmount: 0,
        remainingAmount: totalAmount,
        status: 'draft' as const,
        paymentStatus: 'pending' as const,
        issueDate: new Date(),
        dueDate: new Date(invoiceForm.dueDate),
        description: invoiceForm.description,
        items: invoiceForm.items.map(item => ({
          ...item,
          totalPrice: item.quantity * item.unitPrice
        })),
        createdBy: 'current-admin', // TODO: Récupérer l'ID admin connecté
        sentToClient: false
      };

      await invoiceService.createInvoice(newInvoice);
      toast.success('Facture créée avec succès');
      setShowCreateInvoiceModal(false);
      resetInvoiceForm();
      loadInvoiceData();

    } catch (error) {
      console.error('Erreur lors de la création:', error);
      toast.error('Erreur lors de la création de la facture');
    } finally {
      setIsCreating(false);
    }
  };

  const handleAddPayment = async () => {
    if (!selectedInvoice) return;

    setIsCreating(true);
    try {
      const amount = parseFloat(paymentForm.amount);
      if (amount <= 0) {
        toast.error('Le montant doit être supérieur à 0');
        return;
      }

      if (amount > selectedInvoice.remainingAmount) {
        toast.error('Le montant ne peut pas dépasser le restant dû');
        return;
      }

      await invoiceService.updatePaymentStatus(
        selectedInvoice.id!,
        amount,
        paymentForm.method,
        paymentForm.reference,
        'current-admin' // TODO: Récupérer l'ID admin connecté
      );

      toast.success('Paiement enregistré avec succès');
      setShowPaymentModal(false);
      setSelectedInvoice(null);
      resetPaymentForm();
      loadInvoiceData();

    } catch (error) {
      console.error('Erreur lors de l\'enregistrement:', error);
      toast.error('Erreur lors de l\'enregistrement du paiement');
    } finally {
      setIsCreating(false);
    }
  };

  const resetInvoiceForm = () => {
    setInvoiceForm({
      type: 'initial',
      description: '',
      totalAmount: '',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: [
        { id: '1', description: '', quantity: 1, unitPrice: 0, totalPrice: 0, category: 'materials' }
      ]
    });
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      amount: '',
      method: 'cash',
      reference: '',
      notes: ''
    });
  };

  const updateInvoiceItem = (index: number, field: string, value: any) => {
    const newItems = [...invoiceForm.items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === 'quantity' || field === 'unitPrice') {
      newItems[index].totalPrice = newItems[index].quantity * newItems[index].unitPrice;
    }

    const totalAmount = newItems.reduce((sum, item) => sum + item.totalPrice, 0);

    setInvoiceForm({
      ...invoiceForm,
      items: newItems,
      totalAmount: totalAmount.toString()
    });
  };

  const addInvoiceItem = () => {
    const newItem = {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      category: 'materials' as const
    };
    setInvoiceForm({
      ...invoiceForm,
      items: [...invoiceForm.items, newItem]
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Chargement de l'historique...</span>
      </div>
    );
  }

  const totalBilled = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalPaid = paymentHistory.reduce((sum, payment) => sum + payment.amount, 0);
  const totalRemaining = totalBilled - totalPaid;

  return (
    <div className="space-y-6">
      {/* Résumé financier */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Euro className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total facturé</p>
              <p className="text-xl font-bold text-blue-600">{formatCurrency(totalBilled)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total payé</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Restant dû</p>
              <p className="text-xl font-bold text-orange-600">{formatCurrency(totalRemaining)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">
          Historique des factures ({invoices.length})
        </h3>
        <Button onClick={() => setShowCreateInvoiceModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle facture
        </Button>
      </div>

      {/* Liste des factures */}
      {invoices.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune facture</h3>
          <p className="text-gray-500 mb-4">
            Aucune facture n'a encore été créée pour ce client.
          </p>
          <Button onClick={() => setShowCreateInvoiceModal(true)}>
            Créer la première facture
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {invoices.map((invoice) => (
            <Card key={invoice.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="font-medium text-lg">{invoice.invoiceNumber}</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                      {getStatusIcon(invoice.status)}
                      <span className="ml-1 capitalize">{invoice.status === 'paid' ? 'Payée' : invoice.status}</span>
                    </span>
                  </div>

                  <p className="text-gray-600 mb-2">{invoice.description}</p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Date d'émission:</span>
                      <p className="font-medium">{invoice.issueDate.toDate().toLocaleDateString('fr-FR')}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Échéance:</span>
                      <p className="font-medium">{invoice.dueDate.toDate().toLocaleDateString('fr-FR')}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Montant:</span>
                      <p className="font-bold text-lg">{formatCurrency(invoice.totalAmount)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Restant:</span>
                      <p className="font-medium text-orange-600">{formatCurrency(invoice.remainingAmount)}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  {invoice.documentUrl && (
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-1" />
                      Voir
                    </Button>
                  )}
                  {invoice.remainingAmount > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedInvoice(invoice);
                        setPaymentForm({
                          ...paymentForm,
                          amount: invoice.remainingAmount.toString()
                        });
                        setShowPaymentModal(true);
                      }}
                    >
                      <CreditCard className="w-4 h-4 mr-1" />
                      Paiement
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Historique des paiements */}
      {paymentHistory.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">
            Historique des paiements ({paymentHistory.length})
          </h3>

          <div className="space-y-2">
            {paymentHistory.slice(0, 5).map((payment) => (
              <Card key={payment.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CreditCard className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="font-medium">{formatCurrency(payment.amount)}</p>
                      <p className="text-sm text-gray-500">
                        {payment.date.toDate().toLocaleDateString('fr-FR')} - {payment.method}
                        {payment.reference && ` (${payment.reference})`}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Modal création facture */}
      <Modal
        isOpen={showCreateInvoiceModal}
        onClose={() => setShowCreateInvoiceModal(false)}
        title="Nouvelle facture"
        size="lg"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type de facture</label>
              <select
                value={invoiceForm.type}
                onChange={(e) => setInvoiceForm({...invoiceForm, type: e.target.value as Invoice['type']})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="initial">Facture initiale</option>
                <option value="progress">Facture d'avancement</option>
                <option value="final">Facture finale</option>
                <option value="additional">Facture supplémentaire</option>
              </select>
            </div>

            <Input
              label="Date d'échéance"
              type="date"
              value={invoiceForm.dueDate}
              onChange={(e) => setInvoiceForm({...invoiceForm, dueDate: e.target.value})}
            />
          </div>

          <Input
            label="Description"
            value={invoiceForm.description}
            onChange={(e) => setInvoiceForm({...invoiceForm, description: e.target.value})}
            placeholder="Description de la facture"
          />

          {/* Articles */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">Articles</h4>
              <Button variant="outline" size="sm" onClick={addInvoiceItem}>
                <Plus className="w-4 h-4 mr-1" />
                Ajouter
              </Button>
            </div>

            {invoiceForm.items.map((item, index) => (
              <div key={item.id} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-5">
                  <Input
                    label="Description"
                    value={item.description}
                    onChange={(e) => updateInvoiceItem(index, 'description', e.target.value)}
                    placeholder="Description de l'article"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    label="Qté"
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateInvoiceItem(index, 'quantity', parseInt(e.target.value) || 0)}
                    min="1"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    label="Prix unitaire"
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) => updateInvoiceItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                    min="0"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total</label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg">
                    {formatCurrency(item.totalPrice)}
                  </div>
                </div>
              </div>
            ))}

            <div className="flex justify-end">
              <div className="text-right">
                <span className="text-sm text-gray-500">Montant total:</span>
                <p className="text-xl font-bold">{formatCurrency(parseFloat(invoiceForm.totalAmount) || 0)}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowCreateInvoiceModal(false)}
              disabled={isCreating}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              onClick={handleCreateInvoice}
              disabled={isCreating || !invoiceForm.description || parseFloat(invoiceForm.totalAmount) <= 0}
              className="flex-1"
            >
              {isCreating ? 'Création...' : 'Créer la facture'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal paiement */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Enregistrer un paiement"
        size="md"
      >
        {selectedInvoice && (
          <div className="space-y-6">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="font-medium">Facture: {selectedInvoice.invoiceNumber}</p>
              <p className="text-sm text-gray-600">
                Restant dû: <span className="font-medium">{formatCurrency(selectedInvoice.remainingAmount)}</span>
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Montant"
                type="number"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                placeholder="0"
                min="0"
                max={selectedInvoice.remainingAmount}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Méthode</label>
                <select
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm({...paymentForm, method: e.target.value as any})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="cash">Espèces</option>
                  <option value="bank_transfer">Virement</option>
                  <option value="check">Chèque</option>
                  <option value="mobile_money">Mobile Money</option>
                </select>
              </div>
            </div>

            <Input
              label="Référence (optionnel)"
              value={paymentForm.reference}
              onChange={(e) => setPaymentForm({...paymentForm, reference: e.target.value})}
              placeholder="Numéro de référence"
            />

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowPaymentModal(false)}
                disabled={isCreating}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                onClick={handleAddPayment}
                disabled={isCreating || !paymentForm.amount || parseFloat(paymentForm.amount) <= 0}
                className="flex-1"
              >
                {isCreating ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};