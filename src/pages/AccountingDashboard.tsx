import React, { useState, useEffect } from 'react';
import {
    Euro,
    TrendingUp,
    AlertCircle,
    CheckCircle,
    Clock,
    Search,
    Download,
    Bell
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useClientStore } from '../store/clientStore';
import { invoiceService } from '../services/invoiceService';
import { accountingService } from '../services/accountingService';
import { notificationService } from '../services/notificationService';
import { toast } from 'react-toastify';
import { ClientDetailsModal } from '../components/clients/ClientDetailsModal';
import { CreditCard, FileText, Users, Receipt } from 'lucide-react';
import type { Client, ClientPaymentDashboard, PaymentHistory, Project } from '../types';
import { ReceiptPreview } from '../components/accounting/ReceiptPreview';
import { useProjectStore } from '../store/projectStore';

export const AccountingDashboard: React.FC = () => {
    const { clients } = useClientStore();
    const [loading, setLoading] = useState(true);
    const [globalStats, setGlobalStats] = useState({
        totalExpected: 0,
        totalCollected: 0,
        totalOverdue: 0,
        collectionRate: 0
    });
    const [clientFinancials, setClientFinancials] = useState<(Client & { dashboard: ClientPaymentDashboard })[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'overdue' | 'up_to_date'>('all');
    const [activeTab, setActiveTab] = useState<'clients' | 'transactions'>('clients');
    const [globalPayments, setGlobalPayments] = useState<PaymentHistory[]>([]);
    const { projects } = useProjectStore();

    // Modal states
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<PaymentHistory | null>(null);
    const [showReceiptModal, setShowReceiptModal] = useState(false);

    useEffect(() => {
        loadFinancialData();
    }, [clients]);

    const loadFinancialData = async () => {
        setLoading(true);
        try {
            const financials = await Promise.all(
                clients.map(async (client) => {
                    const dashboard = await invoiceService.getClientPaymentDashboard(client.id);
                    return { ...client, dashboard };
                })
            );

            setClientFinancials(financials);

            // Calculate global stats
            const stats = financials.reduce(
                (acc, curr) => ({
                    totalExpected: acc.totalExpected + curr.dashboard.totalProjectCost,
                    totalCollected: acc.totalCollected + curr.dashboard.totalPaid,
                    totalOverdue: acc.totalOverdue + curr.dashboard.totalOverdue
                }),
                { totalExpected: 0, totalCollected: 0, totalOverdue: 0 }
            );

            setGlobalStats({
                ...stats,
                collectionRate: stats.totalExpected > 0 ? (stats.totalCollected / stats.totalExpected) * 100 : 0
            });

            // Load global payment history
            const history = await invoiceService.getAllPaymentHistory();
            setGlobalPayments(history);

        } catch (error) {
            console.error('Error loading financial data:', error);
            toast.error('Erreur lors du chargement des données financières');
        } finally {
            setLoading(false);
        }
    };

    const getClientName = (clientId: string) => {
        const client = clients.find(c => c.id === clientId);
        return client ? `${client.nom} ${client.prenom}` : 'Client inconnu';
    };

    const getClientProject = (clientId: string) => {
        const client = clients.find(c => c.id === clientId);
        if (!client) return null;
        return projects.find(p => p.id === client.projetAdhere || p.name === client.projetAdhere);
    };

    const handleManualReminder = async (client: Client, amount: number) => {
        try {
            await notificationService.sendPaymentReminder(
                client.id,
                amount,
                new Date(), // Date du jour pour le rappel manuel
                'overdue' // On considère que c'est un rappel pour retard ou dû
            );
            toast.success(`Rappel envoyé à ${client.nom} ${client.prenom}`);
        } catch (error) {
            console.error('Error sending reminder:', error);
            toast.error("Erreur lors de l'envoi du rappel");
        }
    };

    const handleManageClient = (client: Client) => {
        setSelectedClient(client);
        setIsDetailsModalOpen(true);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'decimal',
            minimumFractionDigits: 0,
        }).format(amount) + ' FCFA';
    };

    const filteredClients = clientFinancials.filter(item => {
        const matchesSearch =
            item.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.prenom.toLowerCase().includes(searchTerm.toLowerCase());

        if (filterStatus === 'overdue') {
            return matchesSearch && item.dashboard.totalOverdue > 0;
        }
        if (filterStatus === 'up_to_date') {
            return matchesSearch && item.dashboard.totalOverdue === 0;
        }
        return matchesSearch;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Chargement des finances...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Tableau de Bord Comptable</h1>
                <div className="flex gap-2">
                    <Button onClick={() => accountingService.checkPaymentReminders()} variant="outline">
                        <Bell className="w-4 h-4 mr-2" />
                        Vérifier les échéances
                    </Button>
                </div>
            </div>

            {/* Quick Stats Overlay (Smaller version if needed, or keep originals) */}

            {/* Tabs */}
            <div className="flex border-b border-gray-200">
                <button
                    className={`px-6 py-3 text-sm font-medium ${activeTab === 'clients' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('clients')}
                >
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Suivi par Client
                    </div>
                </button>
                <button
                    className={`px-6 py-3 text-sm font-medium ${activeTab === 'transactions' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('transactions')}
                >
                    <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4" />
                        Historique des Reçus
                    </div>
                </button>
            </div>

            {/* Global Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4 border-l-4 border-blue-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Chiffre d'Affaires Total</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-2">
                                {formatCurrency(globalStats.totalExpected)}
                            </h3>
                        </div>
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <Euro className="w-5 h-5 text-blue-600" />
                        </div>
                    </div>
                </Card>

                <Card className="p-4 border-l-4 border-green-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Encaissé</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-2">
                                {formatCurrency(globalStats.totalCollected)}
                            </h3>
                            <p className="text-sm text-green-600 mt-1 flex items-center">
                                <TrendingUp className="w-3 h-3 mr-1" />
                                {globalStats.collectionRate.toFixed(1)}%
                            </p>
                        </div>
                        <div className="p-2 bg-green-50 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                    </div>
                </Card>

                <Card className="p-4 border-l-4 border-red-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total En Retard</p>
                            <h3 className="text-2xl font-bold text-red-600 mt-2">
                                {formatCurrency(globalStats.totalOverdue)}
                            </h3>
                        </div>
                        <div className="p-2 bg-red-50 rounded-lg">
                            <AlertCircle className="w-5 h-5 text-red-600" />
                        </div>
                    </div>
                </Card>

                <Card className="p-4 border-l-4 border-orange-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Reste à Recouvrer</p>
                            <h3 className="text-2xl font-bold text-orange-600 mt-2">
                                {formatCurrency(globalStats.totalExpected - globalStats.totalCollected)}
                            </h3>
                        </div>
                        <div className="p-2 bg-orange-50 rounded-lg">
                            <Clock className="w-5 h-5 text-orange-600" />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                        placeholder="Rechercher un client..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <select
                        className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm focus:ring-2 focus:ring-blue-500"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as any)}
                    >
                        <option value="all">Tous les statuts</option>
                        <option value="overdue">En retard</option>
                        <option value="up_to_date">À jour</option>
                    </select>
                    <Button variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        Exporter
                    </Button>
                </div>
            </div>

            {/* Client List or Transaction List */}
            {activeTab === 'clients' ? (
                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Projet</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Payé</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Reste</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredClients.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                                    {item.nom[0]}
                                                </div>
                                                <div className="ml-3">
                                                    <div className="text-sm font-medium text-gray-900">{item.nom} {item.prenom}</div>
                                                    <div className="text-sm text-gray-500">{item.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {item.projetAdhere}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                                            {formatCurrency(item.dashboard.totalProjectCost)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">
                                            {formatCurrency(item.dashboard.totalPaid)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-blue-600">
                                            {formatCurrency(item.dashboard.totalRemaining)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            {item.dashboard.totalOverdue > 0 ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                    En retard ({formatCurrency(item.dashboard.totalOverdue)})
                                                </span>
                                            ) : item.dashboard.totalRemaining === 0 ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    Soldé
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    À jour
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {item.dashboard.totalOverdue > 0 && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-red-600 hover:text-red-900"
                                                    onClick={() => handleManualReminder(item, item.dashboard.totalOverdue)}
                                                >
                                                    <Bell className="w-4 h-4 mr-1" />
                                                    Relancer
                                                </Button>
                                            )}
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleManageClient(item)}
                                                className="ml-2"
                                            >
                                                <CreditCard className="w-4 h-4 mr-1" />
                                                Gérer
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            ) : (
                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Méthode</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {globalPayments.map((payment) => (
                                    <tr key={payment.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(payment.date.seconds * 1000).toLocaleDateString('fr-FR')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{getClientName(payment.clientId)}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-green-600">
                                            {formatCurrency(payment.amount)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                                            {payment.method.replace('_', ' ')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-blue-600 hover:text-blue-900"
                                                    onClick={() => {
                                                        setSelectedPaymentForReceipt(payment);
                                                        setShowReceiptModal(true);
                                                    }}
                                                >
                                                    <FileText className="w-4 h-4 mr-1" />
                                                    Voir Reçu
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-orange-600 hover:text-orange-900"
                                                    onClick={async () => {
                                                        const client = clients.find(c => c.id === payment.clientId);
                                                        if (client) {
                                                            try {
                                                                await notificationService.notifyPaymentReceived(
                                                                    client.id,
                                                                    payment.amount,
                                                                    `Paiement du ${new Date(payment.date.seconds * 1000).toLocaleDateString('fr-FR')}`
                                                                );
                                                                toast.success('Notification envoyée');
                                                            } catch (err) {
                                                                toast.error('Erreur notification');
                                                            }
                                                        }
                                                    }}
                                                >
                                                    <Bell className="w-4 h-4 mr-1" />
                                                    Notifier
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {
                selectedClient && (
                    <ClientDetailsModal
                        isOpen={isDetailsModalOpen}
                        onClose={() => {
                            setIsDetailsModalOpen(false);
                            setSelectedClient(null);
                            loadFinancialData(); // Reload data when closing modal to refresh amounts
                        }}
                        client={selectedClient}
                        initialTab="billing"
                    />
                )
            }

            {/* Receipt Preview Modal */}
            {
                showReceiptModal && selectedPaymentForReceipt && (
                    <ReceiptPreview
                        payment={selectedPaymentForReceipt}
                        client={clients.find(c => c.id === selectedPaymentForReceipt.clientId)!}
                        project={getClientProject(selectedPaymentForReceipt.clientId)!}
                        onClose={() => {
                            setShowReceiptModal(false);
                            setSelectedPaymentForReceipt(null);
                        }}
                    />
                )
            }
        </div >
    );
};
