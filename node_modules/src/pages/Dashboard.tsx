import React from 'react';
import { Users, Building, Clock, CheckCircle, ShoppingCart, AlertCircle } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { useClientStore } from '../store/clientStore';
import { useMaterialStore } from '../store/materialStore';
import { useClientSelections } from '../hooks/useClientSelections';

export const Dashboard: React.FC = () => {
  const { clients } = useClientStore();
  const { materials } = useMaterialStore();
  const { clientSelections, updateSelectionStatus } = useClientSelections();

  const stats = [
    {
      name: 'Total Clients',
      value: clients.length,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      name: 'Projets en cours',
      value: clients.filter(client => client.status === 'En cours').length,
      icon: Building,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      name: 'Projets en attente',
      value: clients.filter(client => client.status === 'En attente').length,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      name: 'Projets terminés',
      value: clients.filter(client => client.status === 'Terminé').length,
      icon: CheckCircle,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  const recentClients = clients.slice(-3).reverse();
  const recentSelections = clientSelections.slice(0, 3);
  const pendingSelections = clientSelections.filter(s => s.status === 'submitted');

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleStatusUpdate = async (selectionId: string, status: 'approved' | 'rejected') => {
    try {
      await updateSelectionStatus(selectionId, status);
    } catch (error) {
      console.error('Error updating selection status:', error);
      // You might want to show a toast notification here
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">Vue d'ensemble de votre activité</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {stats.map((stat) => (
          <Card key={stat.name} className="hover:shadow-lg transition-shadow p-4 sm:p-6">
            <div className="flex items-center">
              <div className={`p-2 sm:p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${stat.color}`} />
              </div>
              <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">{stat.name}</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Section notifications sélections en attente */}
      {pendingSelections.length > 0 && (
        <Card className="p-4 sm:p-6 border-orange-200 bg-orange-50">
          <div className="flex items-center mb-3 sm:mb-4">
            <AlertCircle className="w-5 h-5 text-orange-600 mr-2" />
            <h3 className="text-base sm:text-lg font-semibold text-orange-800">
              {pendingSelections.length} nouvelle(s) sélection(s) en attente
            </h3>
          </div>
          <p className="text-sm text-orange-700">
            Des clients ont soumis leurs sélections de matériaux et attendent votre validation.
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card className="p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
            Derniers clients ajoutés
          </h3>
          <div className="space-y-2 sm:space-y-3">
            {recentClients.length > 0 ? (
              recentClients.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm sm:text-base font-medium text-gray-900 truncate">{client.nom} {client.prenom}</p>
                    <p className="text-xs sm:text-sm text-gray-600 truncate">{client.projetAdhere}</p>
                  </div>
                  <div className="text-right ml-2 flex-shrink-0">
                    <span
                      className={`inline-flex px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-medium rounded-full ${
                        client.status === 'En cours'
                          ? 'bg-green-100 text-green-800'
                          : client.status === 'Terminé'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {client.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm sm:text-base text-gray-500 text-center py-3 sm:py-4">
                Aucun client enregistré
              </p>
            )}
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">
              Sélections clients récentes
            </h3>
            <ShoppingCart className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-2 sm:space-y-3">
            {recentSelections.length > 0 ? (
              recentSelections.map((selection) => (
                <div
                  key={selection.id}
                  className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm sm:text-base font-medium text-gray-900 truncate">
                        {selection.clientName}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500">
                        {formatDateTime(selection.submittedAt)}
                      </p>
                    </div>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        selection.status === 'submitted'
                          ? 'bg-yellow-100 text-yellow-800'
                          : selection.status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : selection.status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {selection.status === 'submitted'
                        ? 'En attente'
                        : selection.status === 'approved'
                        ? 'Approuvé'
                        : selection.status === 'rejected'
                        ? 'Rejeté'
                        : 'En révision'}
                    </span>
                  </div>

                  <div className="mb-2">
                    <p className="text-xs sm:text-sm text-gray-600 mb-1">
                      {selection.selections.length} matériau(x) • {formatPrice(selection.totalAmount)}
                    </p>
                    <div className="text-xs text-gray-500">
                      {selection.selections.slice(0, 2).map((item, index) => (
                        <span key={index}>
                          {item.materialName}
                          {index < Math.min(selection.selections.length - 1, 1) && ', '}
                        </span>
                      ))}
                      {selection.selections.length > 2 && (
                        <span> +{selection.selections.length - 2} autre(s)</span>
                      )}
                    </div>
                  </div>

                  {selection.status === 'submitted' && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleStatusUpdate(selection.id, 'approved')}
                        className="flex-1 px-3 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors"
                      >
                        Approuver
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(selection.id, 'rejected')}
                        className="flex-1 px-3 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors"
                      >
                        Rejeter
                      </button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm sm:text-base text-gray-500 text-center py-3 sm:py-4">
                Aucune sélection client
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};