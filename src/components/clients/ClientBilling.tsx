import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle, AlertCircle, Clock, Banknote, Trash2, Bell } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import type { Client } from '../../types';
import { useProjectStore } from '../../store/projectStore';
import { toast } from 'react-toastify';
import { accountingService } from '../../services/accountingService';
import { invoiceService } from '../../services/invoiceService';
import { notificationService } from '../../services/notificationService';
import { PaymentEntryModal } from '../accounting/PaymentEntryModal';
import { ReceiptPreview } from '../accounting/ReceiptPreview';
import { FileText } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

interface ClientBillingProps {
  client: Client;
}

export const ClientBilling: React.FC<ClientBillingProps> = ({ client }) => {
  const { projects } = useProjectStore();
  const [isCreatingFacturation, setIsCreatingFacturation] = useState(false);
  const [paymentDashboard, setPaymentDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // States pour les modales
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<any>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<any>(null);
  const [expandedInstallment, setExpandedInstallment] = useState<number | null>(null);

  // Modal état
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    typePaiement: client.typePaiement || 'comptant' as 'comptant' | 'echeancier',
    nombreEcheances: 3,
    premierePaiement: new Date().toISOString().split('T')[0],
    montantComptant: '',
    montantTotal: '', // Montant total personnalisé
    montantAcompte: '', // Montant de l'acompte
    montantParEcheance: '', // Montant par échéance personnalisé
    useCustomAmount: false // Utiliser montant personnalisé ou prix du projet
  });

  // Trouver le projet du client
  const clientProject = projects.find(p => `${p.name} ${p.type}` === client.projetAdhere);

  const fetchPaymentDashboard = async () => {
    try {
      const dashboard = await invoiceService.getClientPaymentDashboard(client.id);
      setPaymentDashboard(dashboard);
    } catch (error) {
      console.error("Erreur chargement dashboard paiement:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.id]);

  // Initialiser l'acompte par défaut quand la modale s'ouvre
  useEffect(() => {
    if (showCreateModal && !formData.montantAcompte && clientProject?.price) {
      setFormData(prev => ({
        ...prev,
        montantAcompte: Math.round(clientProject.price * 0.20).toString()
      }));
    }
  }, [showCreateModal, clientProject, formData.montantAcompte]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      minimumFractionDigits: 0,
    }).format(amount) + ' FCFA';
  };

  const calculateEcheances = () => {
    if (formData.typePaiement !== 'echeancier') return [];

    // Utiliser le montant personnalisé ou le prix du projet
    const total = formData.useCustomAmount ? (parseInt(formData.montantTotal as string) || 0) : (clientProject?.price || 0);
    const acompte = parseInt(formData.montantAcompte) || 0;

    if (total <= 0) return [];

    const remaining = total - acompte;
    const monthlyAmount = Math.ceil(remaining / formData.nombreEcheances);

    const echeances: any[] = [];

    // Acompte
    echeances.push({
      numeroEcheance: 0,
      montant: acompte,
      dateEcheance: new Date().toISOString().split('T')[0],
      status: 'pending',
      label: 'Acompte initial'
    });

    let currentBalance = remaining;

    for (let i = 0; i < formData.nombreEcheances; i++) {
      const dateEcheance = new Date(formData.premierePaiement);
      dateEcheance.setMonth(dateEcheance.getMonth() + i);

      // Ajuster la dernière mensualité
      const amount = (i === formData.nombreEcheances - 1) ? currentBalance : monthlyAmount;
      currentBalance -= amount;

      echeances.push({
        numeroEcheance: i + 1,
        montant: amount,
        dateEcheance: dateEcheance.toISOString().split('T')[0],
        status: 'en_attente',
        label: `Mensualité ${i + 1}/${formData.nombreEcheances}`
      });
    }

    return echeances;
  };

  const handleCreateFacturation = async () => {
    const montantTotal = formData.useCustomAmount ? (parseInt(formData.montantTotal as string) || 0) : (clientProject?.price || 0);

    if (montantTotal <= 0) {
      toast.error('Le montant total doit être supérieur à 0');
      return;
    }

    setIsCreatingFacturation(true);
    try {
      if (formData.typePaiement === 'echeancier') {
        const acompte = parseInt(formData.montantAcompte) || 0;
        await accountingService.initializeClientAccounting(
          client.id,
          clientProject?.id || '',
          montantTotal,
          formData.nombreEcheances,
          acompte,
          new Date(formData.premierePaiement)
        );
        toast.success('Comptabilité initialisée avec succès (Acompte + Échéancier)');
      } else {
        // Logique pour paiement comptant à implémenter si besoin
        toast.info('Fonctionnalité paiement comptant à venir');
      }

      setShowCreateModal(false);
      fetchPaymentDashboard();

    } catch (error) {
      console.error('Erreur création facturation:', error);
      toast.error('Erreur lors de la création de la facturation');
      setIsCreatingFacturation(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir réinitialiser la comptabilité ? Cela supprimera l\'échéancier et les factures initiales.')) {
      return;
    }

    setLoading(true);
    try {
      await accountingService.resetClientAccounting(client.id);
      setPaymentDashboard(null);
      toast.success('Comptabilité réinitialisée');
    } catch (error) {
      console.error('Erreur reset:', error);
      toast.error('Erreur lors de la réinitialisation');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
      case 'active':
        return 'text-green-600';
      case 'overdue':
        return 'text-red-600';
      case 'partial':
        return 'text-orange-600';
      default:
        return 'text-blue-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
      case 'active':
        return <CheckCircle className="w-4 h-4" />;
      case 'overdue':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const isOverdueExtended = (dueDate: any) => {
    if (!dueDate) return false;
    const date = new Date(dueDate.seconds * 1000);
    const twoDaysAfter = new Date(date);
    twoDaysAfter.setDate(date.getDate() + 2);
    return new Date() > twoDaysAfter;
  };

  const shouldShowReminder = (dueDate: any) => {
    if (!dueDate) return false;
    const date = new Date(dueDate.seconds * 1000);
    const now = new Date();

    // 10 jours avant l'échéance
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // 10 jours avant la fin du mois
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const daysUntilEndOfMonth = Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return (diffDays >= 0 && diffDays <= 10) || (daysUntilEndOfMonth >= 0 && daysUntilEndOfMonth <= 10);
  };

  if (!clientProject) {
    return (
      <div className="text-center py-12">
        <CreditCard className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Projet non trouvé
        </h3>
        <p className="text-gray-500">
          Aucun projet correspondant trouvé pour "{client.projetAdhere}"
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Informations du projet */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">{clientProject.name}</h3>
            <p className="text-sm text-gray-500">{clientProject.type}</p>
            <p className="text-2xl font-bold text-blue-600 mt-2">
              {formatCurrency(clientProject.price)}
            </p>
          </div>
          <div className="text-right">
            <div className={`flex items-center gap-2 ${client.typePaiement === 'comptant' ? 'text-green-600' : 'text-blue-600'}`}>
              <CreditCard className="w-4 h-4" />
              <span className="text-sm font-medium">
                {client.typePaiement === 'comptant' ? 'Paiement comptant' : 'Échéancier'}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Dashboard Paiement */}
      {loading ? (
        <div className="text-center py-8">Chargement...</div>
      ) : paymentDashboard && paymentDashboard.currentSchedule ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Suivi des Paiements</h3>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 ${getStatusColor(paymentDashboard.currentSchedule.status)}`}>
                {getStatusIcon(paymentDashboard.currentSchedule.status)}
                <span className="text-sm font-medium capitalize">
                  {paymentDashboard.currentSchedule.status}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Réinitialiser
              </Button>
            </div>
          </div>

          <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Projet</label>
                <p className="text-lg font-semibold">{formatCurrency(paymentDashboard.totalProjectCost)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Payé</label>
                <p className="text-lg font-semibold text-green-600">{formatCurrency(paymentDashboard.totalPaid)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reste à payer</label>
                <p className="text-lg font-semibold text-blue-600">{formatCurrency(paymentDashboard.totalRemaining)}</p>
              </div>
            </div>
          </Card>

          {/* Échéancier Simplifié */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">N°</th>
                  <th className="px-4 py-3 text-left">Date Prévue</th>
                  <th className="px-4 py-3 text-right">Montant</th>
                  <th className="px-4 py-3 text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paymentDashboard.currentSchedule.installments
                  .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                  .map((inst: any, index: number) => {
                    const isExpanded = expandedInstallment === index;
                    const overdue = inst.status !== 'paid' && isOverdueExtended(inst.dueDate);
                    const showReminder = inst.status !== 'paid' && shouldShowReminder(inst.dueDate);

                    return (
                      <React.Fragment key={index}>
                        <tr
                          className={`hover:bg-blue-50 cursor-pointer transition-colors ${isExpanded ? 'bg-blue-50/50' : ''}`}
                          onClick={() => setExpandedInstallment(isExpanded ? null : index)}
                        >
                          <td className="px-4 py-4 text-sm font-medium text-gray-900">
                            {inst.installmentNumber === 0 ? 'Acompte' : inst.installmentNumber}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600">
                            {inst.dueDate ? new Date(inst.dueDate.seconds * 1000).toLocaleDateString('fr-FR') : '-'}
                          </td>
                          <td className="px-4 py-4 text-sm text-right font-semibold">
                            {formatCurrency(inst.amount)}
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${inst.status === 'paid' ? 'bg-green-100 text-green-800' :
                              overdue ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                              }`}>
                              {inst.status === 'paid' ? 'Payé' : overdue ? 'Retard' : 'Attente'}
                            </span>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-blue-50/30">
                            <td colSpan={4} className="px-4 py-4">
                              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div className="space-y-1">
                                  <p className="text-sm font-medium text-gray-900">{inst.notes || `Échéance de paiement`}</p>
                                  <div className="text-xs text-gray-500 space-y-1">
                                    <p>Montant total : {formatCurrency(inst.amount)}</p>
                                    <p>Déjà payé : <span className="text-green-600 font-medium">{formatCurrency(inst.paidAmount || 0)}</span></p>
                                    <p>Reste à percevoir : <span className="text-blue-600 font-medium">{formatCurrency(inst.amount - (inst.paidAmount || 0))}</span></p>
                                  </div>
                                  {inst.paidDate && (
                                    <p className="text-xs text-green-600 italic mt-2 flex items-center gap-1">
                                      <CheckCircle className="w-3 h-3" />
                                      Réglé le {new Date(inst.paidDate.seconds * 1000).toLocaleDateString('fr-FR')}
                                    </p>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {inst.status !== 'paid' && (
                                    <>
                                      <Button
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedInstallment(inst);
                                          setShowPaymentModal(true);
                                        }}
                                      >
                                        Enregistrer Paiement
                                      </Button>
                                      {showReminder && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="text-orange-600 border-orange-200 hover:bg-orange-50"
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            try {
                                              const dueDate = new Date(inst.dueDate.seconds * 1000);
                                              const now = new Date();
                                              const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

                                              let type: 'upcoming' | 'due_today' | 'overdue' = 'upcoming';
                                              if (diffDays < 0) type = 'overdue';
                                              else if (diffDays === 0) type = 'due_today';

                                              await notificationService.sendPaymentReminder(
                                                client.id,
                                                inst.amount - (inst.paidAmount || 0),
                                                dueDate,
                                                type
                                              );
                                              toast.success('Rappel envoyé');
                                            } catch {
                                              toast.error('Erreur rappel');
                                            }
                                          }}
                                        >
                                          Rappel
                                        </Button>
                                      )}
                                    </>
                                  )}
                                  {(inst.paidAmount || 0) > 0 && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedPaymentForReceipt({
                                          amount: inst.paidAmount,
                                          date: inst.paidDate || Timestamp.now(),
                                          method: inst.paymentMethod || 'virement',
                                          reference: inst.reference || ''
                                        });
                                        setShowReceiptModal(true);
                                      }}
                                    >
                                      Voir Reçu
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {paymentDashboard.currentSchedule.installments.length > itemsPerPage && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-gray-500">
                Affichage de {(currentPage - 1) * itemsPerPage + 1} à {Math.min(currentPage * itemsPerPage, paymentDashboard.currentSchedule.installments.length)} sur {paymentDashboard.currentSchedule.installments.length}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                >
                  Précédent
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage * itemsPerPage >= paymentDashboard.currentSchedule.installments.length}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
          {/* Historique des Transactions */}
          <div className="pt-6 border-t mt-6">
            <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-400" />
              Historique des Transactions
            </h4>
            <div className="space-y-3">
              {paymentDashboard.recentPayments.length > 0 ? (
                paymentDashboard.recentPayments.map((payment: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-white rounded-full">
                        <Banknote className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(payment.amount)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {payment.date ? new Date(payment.date.seconds * 1000).toLocaleDateString('fr-FR') : ''} • {payment.method}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => {
                          setSelectedPaymentForReceipt(payment);
                          setShowReceiptModal(true);
                        }}
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        Reçu
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                        onClick={async () => {
                          try {
                            await notificationService.notifyPaymentReceived(
                              client.id,
                              payment.amount,
                              `Paiement du ${new Date(payment.date.seconds * 1000).toLocaleDateString('fr-FR')}`
                            );
                            toast.success('Notification envoyée au mobile du client');
                          } catch {
                            toast.error('Erreur lors de l\'envoi de la notification');
                          }
                        }}
                      >
                        <Bell className="w-4 h-4 mr-1" />
                        Notifier
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg italic">
                  Aucune transaction enregistrée.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Banknote className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Aucune facturation active
          </h3>
          <p className="text-gray-500 mb-4">
            Initialisez la comptabilité pour ce client.
          </p>
          <Button onClick={() => setShowCreateModal(true)}>
            Initialiser la comptabilité
          </Button>
        </div>
      )
      }

      {/* Modal de création */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Initialiser la comptabilité"
        size="lg"
      >
        <div className="space-y-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 text-blue-800">
              <CreditCard className="w-4 h-4" />
              <span className="font-medium">
                Projet: {clientProject?.name || 'Non défini'}
                {clientProject?.price ? ` - ${formatCurrency(clientProject.price)}` : ''}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="useCustomAmount"
                checked={formData.useCustomAmount}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  useCustomAmount: e.target.checked,
                  montantTotal: e.target.checked ? (prev.montantTotal || (clientProject?.price?.toString() || '')) : ''
                }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="useCustomAmount" className="ml-2 text-sm font-medium text-gray-700">
                Utiliser un montant personnalisé
              </label>
            </div>

            {formData.useCustomAmount && (
              <Input
                label="Montant total du projet"
                type="number"
                value={formData.montantTotal}
                onChange={(e) => {
                  const newTotal = parseInt(e.target.value) || 0;
                  setFormData(prev => ({
                    ...prev,
                    montantTotal: e.target.value,
                    montantAcompte: Math.round(newTotal * 0.20).toString()
                  }));
                }}
                placeholder="0"
                min="1"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type de paiement
            </label>
            <select
              value={formData.typePaiement}
              onChange={(e) => {
                const type = e.target.value as 'comptant' | 'echeancier';
                const total = formData.useCustomAmount ? (parseInt(formData.montantTotal) || 0) : (clientProject?.price || 0);
                setFormData(prev => ({
                  ...prev,
                  typePaiement: type,
                  montantAcompte: type === 'echeancier' ? Math.round(total * 0.20).toString() : ''
                }));
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="echeancier">Échéancier (Acompte + Mensualités)</option>
              <option value="comptant">Paiement comptant</option>
            </select>
          </div>

          {formData.typePaiement === 'comptant' ? (
            <div className="p-4 bg-yellow-50 text-yellow-800 rounded">
              Le paiement comptant génère une facture pour la totalité du montant.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Montant de l'acompte (Apport)"
                  type="number"
                  value={formData.montantAcompte}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    montantAcompte: e.target.value
                  }))}
                  min="0"
                />
                <Input
                  label="Nombre de mensualités"
                  type="number"
                  value={formData.nombreEcheances}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    nombreEcheances: parseInt(e.target.value) || 1
                  }))}
                  min="1"
                  max="60"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Date de début (Acompte immédiat)"
                  type="date"
                  value={formData.premierePaiement}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    premierePaiement: e.target.value
                  }))}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700 mb-2">Aperçu de l'échéancier prévisionnel :</p>
                <div className="text-sm space-y-1 max-h-40 overflow-y-auto">
                  {calculateEcheances().map((echeance, index) => (
                    <div key={index} className="flex justify-between border-b border-gray-100 py-1 last:border-0">
                      <span>{echeance.label}</span>
                      <span className="font-medium">
                        {formatCurrency(echeance.montant || 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowCreateModal(false)}
              disabled={isCreatingFacturation}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              onClick={handleCreateFacturation}
              disabled={isCreatingFacturation}
              className="flex-1"
            >
              {isCreatingFacturation ? 'Traitement...' : 'Valider et Initialiser'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Payment Entry Modal */}
      {
        showPaymentModal && selectedInstallment && (
          <PaymentEntryModal
            isOpen={showPaymentModal}
            onClose={() => {
              setShowPaymentModal(false);
              setSelectedInstallment(null);
            }}
            installment={selectedInstallment}
            client={client}
            onSuccess={() => {
              fetchPaymentDashboard();
              setShowPaymentModal(false);
            }}
          />
        )
      }

      {/* Receipt Preview Modal */}
      {
        showReceiptModal && selectedPaymentForReceipt && clientProject && (
          <ReceiptPreview
            payment={selectedPaymentForReceipt}
            client={client}
            project={clientProject}
            onClose={() => {
              setShowReceiptModal(true);
              setSelectedPaymentForReceipt(null);
            }}
          />
        )
      }
    </div >
  );
};