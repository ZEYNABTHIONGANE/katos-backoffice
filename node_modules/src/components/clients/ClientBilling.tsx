import React, { useState, useEffect } from 'react';
import { CreditCard, Calendar, CheckCircle, AlertCircle, Clock, Euro } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import type { Client, Project, FacturationClient, EcheancePaiement } from '../../types';
import { useProjectStore } from '../../store/projectStore';
import { toast } from 'react-toastify';

interface ClientBillingProps {
  client: Client;
}

export const ClientBilling: React.FC<ClientBillingProps> = ({ client }) => {
  const { projects } = useProjectStore();
  const [isCreatingFacturation, setIsCreatingFacturation] = useState(false);
  const [facturation, setFacturation] = useState<FacturationClient | null>(null);
  const [echeances, setEcheances] = useState<EcheancePaiement[]>([]);

  // Modal état
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    typePaiement: client.typePaiement || 'comptant' as 'comptant' | 'echeancier',
    nombreEcheances: 3,
    premierePaiement: new Date().toISOString().split('T')[0],
    montantComptant: '',
    montantTotal: '', // Montant total personnalisé
    montantParEcheance: '', // Montant par échéance personnalisé
    useCustomAmount: false // Utiliser montant personnalisé ou prix du projet
  });

  // Trouver le projet du client
  const clientProject = projects.find(p => `${p.name} ${p.type}` === client.projetAdhere);

  useEffect(() => {
    // TODO: Charger la facturation existante depuis Firestore
    // Pour l'instant on simule
    console.log('Chargement facturation pour client:', client.id);
  }, [client.id]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      minimumFractionDigits: 0,
    }).format(amount) + ' FCFA';
  };

  const calculateEcheances = () => {
    if (formData.typePaiement !== 'echeancier') return [];

    // Utiliser le montant personnalisé ou le prix du projet
    const montantTotal = formData.useCustomAmount ? (parseInt(formData.montantTotal as string) || 0) : (clientProject?.price || 0);

    if (montantTotal <= 0) return [];

    // Utiliser montant par échéance personnalisé ou calculé
    const montantParEcheance = formData.useCustomAmount && (parseInt(formData.montantParEcheance as string) || 0) > 0
      ? (parseInt(formData.montantParEcheance as string) || 0)
      : Math.ceil(montantTotal / formData.nombreEcheances);

    const echeances: Partial<EcheancePaiement>[] = [];

    for (let i = 0; i < formData.nombreEcheances; i++) {
      const dateEcheance = new Date(formData.premierePaiement);
      dateEcheance.setMonth(dateEcheance.getMonth() + i);

      echeances.push({
        numeroEcheance: i + 1,
        montant: i === formData.nombreEcheances - 1
          ? montantTotal - (montantParEcheance * (formData.nombreEcheances - 1)) // Ajuster le dernier montant
          : montantParEcheance,
        dateEcheance: dateEcheance.toISOString().split('T')[0],
        status: 'en_attente'
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
      const newFacturation: FacturationClient = {
        id: `fact_${Date.now()}`,
        clientId: client.id,
        projectId: clientProject?.id || '',
        montantTotal: montantTotal,
        typePaiement: formData.typePaiement,
        status: 'en_cours',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (formData.typePaiement === 'comptant') {
        newFacturation.montantPaye = parseInt(formData.montantComptant as string) || 0;
        newFacturation.datePaiementComptant = new Date().toISOString().split('T')[0];
        if ((parseInt(formData.montantComptant as string) || 0) >= montantTotal) {
          newFacturation.status = 'termine';
        }
      } else {
        const calculatedEcheances = calculateEcheances();
        const montantParEcheance = formData.useCustomAmount && (parseInt(formData.montantParEcheance as string) || 0) > 0
          ? (parseInt(formData.montantParEcheance as string) || 0)
          : Math.ceil(montantTotal / formData.nombreEcheances);

        newFacturation.nombreEcheances = formData.nombreEcheances;
        newFacturation.montantParEcheance = montantParEcheance;
        newFacturation.premierePaiement = formData.premierePaiement;
        // TODO: Créer les échéances en base
      }

      // TODO: Sauvegarder en Firestore
      setFacturation(newFacturation);
      setShowCreateModal(false);
      toast.success('Facturation créée avec succès');

    } catch (error) {
      console.error('Erreur création facturation:', error);
      toast.error('Erreur lors de la création de la facturation');
    } finally {
      setIsCreatingFacturation(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'termine':
        return 'text-green-600';
      case 'en_retard':
        return 'text-red-600';
      default:
        return 'text-blue-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'termine':
        return <CheckCircle className="w-4 h-4" />;
      case 'en_retard':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
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

      {/* État de la facturation */}
      {facturation ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Facturation</h3>
            <div className={`flex items-center gap-2 ${getStatusColor(facturation.status)}`}>
              {getStatusIcon(facturation.status)}
              <span className="text-sm font-medium capitalize">
                {facturation.status.replace('_', ' ')}
              </span>
            </div>
          </div>

          {facturation.typePaiement === 'comptant' ? (
            <Card className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Montant total
                  </label>
                  <p className="text-lg font-semibold">{formatCurrency(facturation.montantTotal)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Montant payé
                  </label>
                  <p className="text-lg font-semibold text-green-600">
                    {formatCurrency(facturation.montantPaye || 0)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date de paiement
                  </label>
                  <p className="text-sm">
                    {facturation.datePaiementComptant
                      ? new Date(facturation.datePaiementComptant).toLocaleDateString('fr-FR')
                      : 'Non payé'
                    }
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre d'échéances
                    </label>
                    <p className="text-lg font-semibold">{facturation.nombreEcheances}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Montant par échéance
                    </label>
                    <p className="text-lg font-semibold">
                      {formatCurrency(facturation.montantParEcheance || 0)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Premier paiement
                    </label>
                    <p className="text-sm">
                      {facturation.premierePaiement
                        ? new Date(facturation.premierePaiement).toLocaleDateString('fr-FR')
                        : 'Non défini'
                      }
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Montant total
                    </label>
                    <p className="text-lg font-semibold">{formatCurrency(facturation.montantTotal)}</p>
                  </div>
                </div>
              </Card>

              {/* Liste des échéances */}
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Échéances de paiement</h4>
                <div className="space-y-2">
                  {calculateEcheances().map((echeance, index) => (
                    <Card key={index} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="font-medium">Échéance {echeance.numeroEcheance}</p>
                            <p className="text-sm text-gray-500">
                              {echeance.dateEcheance ? new Date(echeance.dateEcheance).toLocaleDateString('fr-FR') : ''}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(echeance.montant || 0)}</p>
                          <div className={`flex items-center gap-1 text-sm ${getStatusColor(echeance.status || 'en_attente')}`}>
                            {getStatusIcon(echeance.status || 'en_attente')}
                            <span className="capitalize">
                              {(echeance.status || 'en_attente').replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Euro className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Aucune facturation
          </h3>
          <p className="text-gray-500 mb-4">
            Créez une facturation pour ce client selon son type de paiement.
          </p>
          <Button onClick={() => setShowCreateModal(true)}>
            Créer la facturation
          </Button>
        </div>
      )}

      {/* Modal de création */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Créer une facturation"
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

          {/* Option montant personnalisé */}
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
                label="Montant total personnalisé"
                type="number"
                value={formData.montantTotal}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  montantTotal: e.target.value
                }))}
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
              onChange={(e) => setFormData(prev => ({
                ...prev,
                typePaiement: e.target.value as 'comptant' | 'echeancier'
              }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="comptant">Paiement comptant</option>
              <option value="echeancier">Échéancier de paiement</option>
            </select>
          </div>

          {formData.typePaiement === 'comptant' ? (
            <Input
              label="Montant payé"
              type="number"
              value={formData.montantComptant}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                montantComptant: e.target.value
              }))}
              placeholder="Montant payé"
              min="0"
              max={clientProject?.price}
            />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nombre d'échéances"
                  type="number"
                  value={formData.nombreEcheances}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    nombreEcheances: parseInt(e.target.value) || 1
                  }))}
                  min="1"
                  max="24"
                />
                <Input
                  label="Date du premier paiement"
                  type="date"
                  value={formData.premierePaiement}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    premierePaiement: e.target.value
                  }))}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              {formData.useCustomAmount && (
                <Input
                  label="Montant par échéance (optionnel)"
                  type="number"
                  value={formData.montantParEcheance}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    montantParEcheance: e.target.value
                  }))}
                  placeholder="Laisser vide pour calcul automatique"
                  min="0"
                />
              )}

              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700 mb-2">Aperçu de l'échéancier :</p>
                <div className="text-sm space-y-1">
                  {calculateEcheances().map((echeance, index) => (
                    <div key={index} className="flex justify-between">
                      <span>Échéance {echeance.numeroEcheance}</span>
                      <span className="font-medium">
                        {formatCurrency(echeance.montant || 0)} le{' '}
                        {echeance.dateEcheance ? new Date(echeance.dateEcheance).toLocaleDateString('fr-FR') : ''}
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
              {isCreatingFacturation ? 'Création...' : 'Créer la facturation'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};