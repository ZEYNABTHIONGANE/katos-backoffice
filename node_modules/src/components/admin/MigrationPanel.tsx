import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { migrationService } from '../../scripts/migrateChantierPhases';
import { AlertCircle, CheckCircle, Clock, Database, RefreshCw } from 'lucide-react';

interface MigrationStatus {
  total: number;
  migrated: number;
  pending: number;
}

export const MigrationPanel: React.FC = () => {
  const [status, setStatus] = useState<MigrationStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResults, setMigrationResults] = useState<{ success: number; failed: number } | null>(null);

  const checkStatus = async () => {
    setIsChecking(true);
    try {
      const migrationStatus = await migrationService.checkMigrationStatus();
      setStatus(migrationStatus);
    } catch (error) {
      console.error('Erreur lors de la vérification:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const runMigration = async () => {
    if (!confirm('Êtes-vous sûr de vouloir migrer tous les chantiers vers la nouvelle structure Katos ?')) {
      return;
    }

    setIsMigrating(true);
    setMigrationResults(null);

    try {
      const results = await migrationService.migrateAllChantiers();
      setMigrationResults(results);

      // Refaire une vérification du statut après migration
      await checkStatus();
    } catch (error) {
      console.error('Erreur lors de la migration:', error);
      alert('Erreur lors de la migration. Consultez la console pour plus de détails.');
    } finally {
      setIsMigrating(false);
    }
  };

  React.useEffect(() => {
    // Vérifier le statut au chargement
    checkStatus();
  }, []);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Database className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">
            Migration vers les phases Katos
          </h2>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900">À propos de cette migration</h3>
                <p className="text-sm text-blue-800 mt-1">
                  Cette migration met à jour tous les chantiers existants pour utiliser la nouvelle structure
                  de phases Katos avec 14 phases détaillées et leurs sous-étapes.
                </p>
              </div>
            </div>
          </div>

          {/* Statut de la migration */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900">Statut de la migration</h3>
              <Button
                onClick={checkStatus}
                disabled={isChecking}
                size="sm"
                variant="outline"
              >
                {isChecking ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Actualiser
              </Button>
            </div>

            {status ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="text-2xl font-bold text-gray-900">{status.total}</div>
                    <div className="text-sm text-gray-600">Total chantiers</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded">
                    <div className="text-2xl font-bold text-green-600">{status.migrated}</div>
                    <div className="text-sm text-gray-600">Migrés</div>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded">
                    <div className="text-2xl font-bold text-yellow-600">{status.pending}</div>
                    <div className="text-sm text-gray-600">En attente</div>
                  </div>
                </div>

                {/* Barre de progression */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progression</span>
                    <span>{status.total > 0 ? Math.round((status.migrated / status.total) * 100) : 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${status.total > 0 ? (status.migrated / status.total) * 100 : 0}%`
                      }}
                    ></div>
                  </div>
                </div>

                {/* Statut global */}
                <div className="flex items-center gap-2">
                  {status.pending === 0 ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-green-600 font-medium">
                        Tous les chantiers sont migrés
                      </span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-5 h-5 text-yellow-600" />
                      <span className="text-yellow-600 font-medium">
                        {status.pending} chantier(s) à migrer
                      </span>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                {isChecking ? 'Vérification en cours...' : 'Cliquez sur "Actualiser" pour vérifier le statut'}
              </div>
            )}
          </div>

          {/* Résultats de migration */}
          {migrationResults && (
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">Résultats de la dernière migration</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-green-50 rounded">
                  <div className="text-xl font-bold text-green-600">{migrationResults.success}</div>
                  <div className="text-sm text-gray-600">Réussies</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded">
                  <div className="text-xl font-bold text-red-600">{migrationResults.failed}</div>
                  <div className="text-sm text-gray-600">Échouées</div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={runMigration}
              disabled={isMigrating || (status?.pending === 0)}
              className="flex-1"
            >
              {isMigrating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  Migration en cours...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 mr-2" />
                  {status?.pending === 0 ? 'Migration terminée' : 'Démarrer la migration'}
                </>
              )}
            </Button>
          </div>

          {/* Avertissement */}
          {status && status.pending > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-900">Important</h4>
                  <p className="text-sm text-yellow-800 mt-1">
                    Cette opération modifiera définitivement la structure des données.
                    Assurez-vous d'avoir une sauvegarde avant de continuer.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};