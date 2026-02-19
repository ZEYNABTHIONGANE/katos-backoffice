import React, { useState, useEffect } from 'react';
import {
    TrendingUp,
    AlertCircle,
    CheckCircle,
    Clock,
    Search,
    Download,
    Bell,
    Banknote
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
import { CreditCard, FileText, Users, Banknote as Receipt } from 'lucide-react';
import type { Client, ClientPaymentDashboard, PaymentHistory, Project } from '../types';
import { ReceiptPreview } from '../components/accounting/ReceiptPreview';
import { useProjectStore } from '../store/projectStore';
import { motion } from 'framer-motion';

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

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

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
            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            >
                <motion.div
                    variants={item}
                    whileHover={{ y: -5, transition: { duration: 0.2 } }}
                    className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-blue-100 group transition-shadow hover:shadow-md"
                >
                    <div className="flex flex-col h-full justify-between">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 rounded-xl bg-blue-50 group-hover:scale-110 transition-transform duration-300">
                                <Banknote className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Chiffre d'Affaires Total</p>
                            <div className="flex items-baseline mt-1">
                                <p className="text-2xl font-bold text-gray-900">{formatCurrency(globalStats.totalExpected)}</p>
                            </div>
                        </div>
                        <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full opacity-5 bg-gradient-to-br from-blue-900 to-transparent pointer-events-none" />
                    </div>
                </motion.div>

                <motion.div
                    variants={item}
                    whileHover={{ y: -5, transition: { duration: 0.2 } }}
                    className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-emerald-100 group transition-shadow hover:shadow-md"
                >
                    <div className="flex flex-col h-full justify-between">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 rounded-xl bg-emerald-50 group-hover:scale-110 transition-transform duration-300">
                                <CheckCircle className="w-6 h-6 text-emerald-600" />
                            </div>
                            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 bg-opacity-50">
                                {globalStats.collectionRate.toFixed(1)}% encaissé
                            </span>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Encaissé</p>
                            <div className="flex items-baseline mt-1">
                                <p className="text-2xl font-bold text-gray-900">{formatCurrency(globalStats.totalCollected)}</p>
                            </div>
                        </div>
                        <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full opacity-5 bg-gradient-to-br from-emerald-900 to-transparent pointer-events-none" />
                    </div>
                </motion.div>

                <motion.div
                    variants={item}
                    whileHover={{ y: -5, transition: { duration: 0.2 } }}
                    className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-red-100 group transition-shadow hover:shadow-md"
                >
                    <div className="flex flex-col h-full justify-between">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 rounded-xl bg-red-50 group-hover:scale-110 transition-transform duration-300">
                                <AlertCircle className="w-6 h-6 text-red-600" />
                            </div>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total En Retard</p>
                            <div className="flex items-baseline mt-1">
                                <p className="text-2xl font-bold text-red-600">{formatCurrency(globalStats.totalOverdue)}</p>
                            </div>
                        </div>
                        <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full opacity-5 bg-gradient-to-br from-red-900 to-transparent pointer-events-none" />
                    </div>
                </motion.div>

                <motion.div
                    variants={item}
                    whileHover={{ y: -5, transition: { duration: 0.2 } }}
                    className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-orange-100 group transition-shadow hover:shadow-md"
                >
                    <div className="flex flex-col h-full justify-between">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 rounded-xl bg-orange-50 group-hover:scale-110 transition-transform duration-300">
                                <Clock className="w-6 h-6 text-orange-600" />
                            </div>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Reste à Recouvrer</p>
                            <div className="flex items-baseline mt-1">
                                <p className="text-2xl font-bold text-orange-600">{formatCurrency(globalStats.totalExpected - globalStats.totalCollected)}</p>
                            </div>
                        </div>
                        <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full opacity-5 bg-gradient-to-br from-orange-900 to-transparent pointer-events-none" />
                    </div>
                </motion.div>
            </motion.div>

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
