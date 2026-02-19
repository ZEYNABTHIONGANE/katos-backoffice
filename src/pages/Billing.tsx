import React, { useState } from 'react';
import { CreditCard, FileText } from 'lucide-react';
import { RoleGuard } from '../components/RoleGuard';
import { Button } from '../components/ui/Button';

export const Billing: React.FC = () => {
  const [invoices] = useState([
    {
      id: 'FAC-SN-2024-001',
      client: 'Awa Ndiaye',
      amount: 4500000,
      status: 'paid' as const,
      dueDate: '2024-03-15',
      paidAt: '2024-03-10'
    },
    {
      id: 'FAC-SN-2024-002',
      client: 'Mamadou Diop',
      amount: 2750000,
      status: 'pending' as const,
      dueDate: '2024-04-05',
      paidAt: null
    },
    {
      id: 'FAC-SN-2024-003',
      client: 'Fatou Sarr',
      amount: 6200000,
      status: 'overdue' as const,
      dueDate: '2024-03-01',
      paidAt: null
    }
  ]);

  return (
    <RoleGuard requiredPermission="canManageUsers">
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Facturation</h1>
            <p className="text-gray-600">Suivez les paiements et factures clients</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Factures ({invoices.length})
              </h3>
              <p className="text-sm text-gray-600">Vue d'ensemble des règlements</p>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full border bg-green-100 text-green-800 border-green-200">
                • Payée
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full border bg-yellow-100 text-yellow-800 border-yellow-200">
                • En attente
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full border bg-red-100 text-red-800 border-red-200">
                • En retard
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Facture
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Montant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Échéance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paiement
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <FileText className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{invoice.id}</div>
                          <div className="text-xs text-gray-500">Facture client</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {invoice.client}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {invoice.amount.toLocaleString('fr-FR', { style: 'decimal', minimumFractionDigits: 0 })} FCFA
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {invoice.status === 'paid' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-green-100 text-green-800 border-green-200">
                          Payée
                        </span>
                      )}
                      {invoice.status === 'pending' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-yellow-100 text-yellow-800 border-yellow-200">
                          En attente
                        </span>
                      )}
                      {invoice.status === 'overdue' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-red-100 text-red-800 border-red-200">
                          En retard
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(invoice.dueDate).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString('fr-FR') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={<FileText className="w-4 h-4" />}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          Voir
                        </Button>
                        {invoice.status !== 'paid' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={<CreditCard className="w-4 h-4" />}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            Marquer payée
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {invoices.length === 0 && (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune facture</h3>
                <p className="text-gray-500 mb-4">Les factures apparaîtront ici</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </RoleGuard>
  );
};
