import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Building2, FileText, ChevronRight, TrendingUp, Activity, AlertCircle, HardHat } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '../components/ui/Card';
import { useClientStore } from '../store/clientStore';
import { useClientSelections } from '../hooks/useClientSelections';
import { useProjectStore } from '../store/projectStore';
import { useRealtimeChantiers } from '../hooks/useRealtimeChantiers';
import { unifiedDocumentService } from '../services/unifiedDocumentService';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { clients } = useClientStore();
  const { clientSelections } = useClientSelections();
  const { projects } = useProjectStore();
  const { totalChantiers, chantiersActifs } = useRealtimeChantiers();
  const [docCount, setDocCount] = useState(0);

  useEffect(() => {
    const fetchDocCount = async () => {
      try {
        const promises = clients.map(client => unifiedDocumentService.getClientDocuments(client.id));
        const results = await Promise.all(promises);
        const total = results.reduce((acc, docs) => acc + docs.length, 0);
        setDocCount(total);
      } catch (error) {
        console.error('Error fetching document count:', error);
      }
    };

    if (clients.length > 0) {
      fetchDocCount();
    }
  }, [clients]);

  const stats = [
    {
      name: 'Clients',
      value: clients.length,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-100',
      path: '/clients',
      trend: `${clients.filter(c => c.status === 'En cours').length} actifs`,
      trendColor: 'text-blue-600'
    },
    {
      name: 'Villas',
      value: projects.length,
      icon: Building2,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-100',
      path: '/projects',
      trend: 'Modèles disponibles',
      trendColor: 'text-emerald-600'
    },
    {
      name: 'Projets',
      value: totalChantiers,
      icon: HardHat,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-100',
      path: '/chantiers',
      trend: `${chantiersActifs} en cours`,
      trendColor: 'text-orange-600'
    },
    {
      name: 'Documents',
      value: docCount,
      icon: FileText,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-100',
      path: '/documents',
      trend: 'Totalfichiers',
      trendColor: 'text-indigo-600'
    },
  ];

  const recentClients = clients.slice(-5).reverse();
  const pendingSelections = clientSelections.filter(s => s.status === 'submitted');

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

  return (
    <div className="space-y-8 p-2">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Tableau de bord</h1>
          <p className="text-gray-500 mt-2">Vue d'ensemble de votre activité Katos.</p>
        </div>
        <div className="hidden sm:block">
          <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {stats.map((stat) => (
          <motion.div
            key={stat.name}
            variants={item}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            onClick={() => navigate(stat.path)}
            className={`
              relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border ${stat.borderColor}
              cursor-pointer hover:shadow-md transition-shadow group
            `}
          >
            <div className="flex flex-col h-full justify-between">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${stat.bgColor} group-hover:scale-110 transition-transform duration-300`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                {stat.trend && (
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full bg-opacity-10 ${stat.bgColor} ${stat.trendColor}`}>
                    {stat.trend}
                  </span>
                )}
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                <div className="flex items-baseline mt-1">
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>

              <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full opacity-5 bg-gradient-to-br from-gray-900 to-transparent pointer-events-none" />
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Section notifications sélections en attente */}
      {pendingSelections.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-2xl p-6 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Building2 className="w-32 h-32 text-orange-600" />
          </div>
          <div className="flex items-center relative z-10 flex-wrap gap-4">
            <div className="flex items-center">
              <div className="p-3 bg-white rounded-full shadow-sm mr-4">
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-orange-900">
                  Action requise : {pendingSelections.length} sélection(s) en attente
                </h3>
                <p className="text-orange-700 mt-1">
                  Des clients ont soumis leurs sélections de matériaux.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/clients')} // Pas de page dédiée selections, on va vers clients ou on pourrait filtrer
              className="ml-auto px-4 py-2 bg-white text-orange-700 text-sm font-bold rounded-lg shadow-sm hover:bg-orange-50 transition-colors"
            >
              Voir les sélections
            </button>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card className="border-gray-100 shadow-sm overflow-hidden h-full">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Clients Récents</h3>
                <p className="text-sm text-gray-500">Derniers clients ajoutés</p>
              </div>
              <button
                onClick={() => navigate('/clients')}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center transition-colors"
              >
                Voir tout <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {recentClients.length > 0 ? (
                recentClients.map((client, index) => (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={client.id}
                    className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between group cursor-pointer"
                    onClick={() => navigate('/clients')}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-sm">
                        {client.prenom[0]}{client.nom[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{client.nom} {client.prenom}</p>
                        <div className="flex items-center text-xs text-gray-500 mt-0.5">
                          <Building2 className="w-3 h-3 mr-1" />
                          {client.projetAdhere || 'Non assigné'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${client.status === 'En cours'
                          ? 'bg-blue-50 text-blue-700 border-blue-100'
                          : client.status === 'Terminé'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : 'bg-amber-50 text-amber-700 border-amber-100'
                          }`}
                      >
                        {client.status === 'En cours' && <Activity className="w-3 h-3 mr-1" />}
                        {client.status}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-300 ml-4 group-hover:text-gray-500 transition-colors" />
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500 bg-gray-50 m-4 rounded-xl border border-dashed border-gray-200">
                  <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p>Aucun client enregistré pour le moment</p>
                  <button
                    onClick={() => navigate('/clients')}
                    className="mt-4 text-blue-600 font-medium hover:underline"
                  >
                    Ajouter un client
                  </button>
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="border-gray-100 shadow-sm h-full bg-gradient-to-b from-gray-900 to-gray-800 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
            <div className="relative z-10 p-6 flex flex-col h-full justify-between">
              <div>
                <h3 className="text-xl font-bold mb-2">Aperçu Rapide</h3>
                <p className="text-gray-400 text-sm mb-6">Résumé de la performance globale.</p>

                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-300">Total Projets</span>
                      <span className="font-bold">{clients.length}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-300">Actifs</span>
                      <span className="font-bold">{clients.filter(c => c.status === 'En cours').length}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-indigo-500 h-2 rounded-full"
                        style={{ width: `${clients.length > 0 ? (clients.filter(c => c.status === 'En cours').length / clients.length) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-300">Terminés</span>
                      <span className="font-bold">{clients.filter(c => c.status === 'Terminé').length}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-emerald-500 h-2 rounded-full"
                        style={{ width: `${clients.length > 0 ? (clients.filter(c => c.status === 'Terminé').length / clients.length) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigate('/chantiers')}
                className="mt-8 w-full py-3 bg-white text-gray-900 rounded-xl font-bold hover:bg-gray-100 transition-colors flex items-center justify-center"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Voir les statistiques
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};