import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, User, Camera, Users, BarChart3, Clock } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { motion } from 'framer-motion';
import { useRealtimeChantier } from '../hooks/useRealtimeChantier';
import { useUserNames } from '../hooks/useUserNames';
import { VoiceNoteList } from '../components/chantiers/VoiceNoteList';
import type { ChantierStatus, KatosChantierPhase, PhaseStep } from '../types/chantier';

export const ChantierDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    chantier,
    loading,
    error,
    hasChantier,
    globalProgress,
    status,
    phasesActives,
    totalEquipe,
    totalPhotos,

  } = useRealtimeChantier(id || null);

  // Collecter tous les IDs utilisateurs pour récupérer leurs noms
  const userIds = React.useMemo(() => {
    if (!chantier) return [];

    const ids = new Set<string>();

    // Ajouter le chef assigné
    if (chantier.assignedChefId) {
      ids.add(chantier.assignedChefId);
    }

    // Ajouter les utilisateurs des phases
    chantier.phases.forEach(phase => {
      if (phase.updatedBy) ids.add(phase.updatedBy);
    });

    // Ajouter les créateurs des mises à jour
    chantier.updates.forEach(update => {
      if (update.createdBy) ids.add(update.createdBy);
    });

    // Ajouter les membres de l'équipe qui ont un userId
    chantier.team.forEach(member => {
      if (member.userId) ids.add(member.userId);
    });

    // Ajouter les uploadeurs de photos
    chantier.gallery.forEach(photo => {
      if (photo.uploadedBy) ids.add(photo.uploadedBy);
    });

    return Array.from(ids);
  }, [chantier]);

  const { getUserName, loading: userNamesLoading } = useUserNames(userIds);

  const getStatusColor = (status: ChantierStatus) => {
    switch (status) {
      case 'En cours':
        return 'bg-blue-100 text-blue-800';
      case 'Terminé':
        return 'bg-green-100 text-green-800';
      case 'En attente':
        return 'bg-yellow-100 text-yellow-800';
      case 'En retard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 75) return 'bg-green-500';
    if (progress >= 50) return 'bg-blue-500';
    if (progress >= 25) return 'bg-yellow-500';
    return 'bg-gray-300';
  };

  const renderGalleryItem = (photo: any) => {
    // Robust video detection: check type OR file extension (case insensitive)
    const isVideo = photo.type === 'video' ||
      /\.(mp4|mov|avi|webm|mkv)(\?|$)/i.test(photo.url);

    // Tentative de récupération d'une miniature pour la vidéo
    let thumbnailUrl = photo.url;
    let useVideoTag = false;

    if (isVideo) {
      if (photo.thumbnailUrl) {
        thumbnailUrl = photo.thumbnailUrl;
      } else if (photo.url.includes('cloudinary.com')) {
        // Astuce Cloudinary: changer l'extension pour avoir une image jpg
        // Attention aux query params (ex: ?alt=media&token=...)
        const urlParts = photo.url.split('?');
        const baseUrl = urlParts[0];
        const queryParams = urlParts[1] ? `?${urlParts[1]}` : '';

        // Remplace l'extension à la fin de l'URL de base
        const newBaseUrl = baseUrl.replace(/\.[^/.]+$/, ".jpg");
        thumbnailUrl = `${newBaseUrl}${queryParams}`;
      } else {
        // Fallback: use video tag to display the first frame
        useVideoTag = true;
      }
    }

    return (
      <div key={photo.id} className="relative group cursor-pointer" onClick={() => window.open(photo.url, '_blank')}>
        {isVideo && useVideoTag ? (
          <video
            src={`${photo.url}#t=0.5`}
            className="w-full h-24 object-cover rounded-lg bg-gray-900"
            preload="metadata"
            muted
            playsInline
            onMouseOver={(e) => {
              const video = e.target as HTMLVideoElement;
              video.play().catch(() => { }); // Ignore auto-play errors
            }}
            onMouseOut={(e) => {
              const video = e.target as HTMLVideoElement;
              video.pause();
              video.currentTime = 0.5; // Reset to thumb frame
            }}
          />
        ) : (
          <img
            src={thumbnailUrl}
            alt={photo.description || 'Progrès du chantier'}
            className="w-full h-24 object-cover rounded-lg group-hover:opacity-90 transition-opacity bg-gray-100"
            onError={(e) => {
              // Fallback si la miniature générée échoue ou si l'image est cassée
              (e.target as HTMLImageElement).src = 'https://placehold.co/400x300?text=Indisponible';
            }}
          />
        )}

        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black bg-opacity-50 rounded-full p-2">
              <span className="w-6 h-6 text-white">▶</span>
            </div>
          </div>
        )}
        {photo.description && (
          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-2 rounded-b-lg truncate pointer-events-none">
            {photo.description}
          </div>
        )}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all rounded-lg pointer-events-none" />
      </div>
    );
  };
  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="p-8">
          <div className="text-center text-gray-500">Chargement du chantier en temps réel...</div>
        </Card>
      </div>
    );
  }

  if (error || !hasChantier || !chantier) {
    return (
      <div className="space-y-6">
        <Card className="p-8">
          <div className="text-center text-red-500">
            {error || 'Chantier non trouvé'}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/chantiers')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">{chantier.name}</h1>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(status)}`}>
                {status}
              </span>
            </div>
            <div className="space-y-1 text-gray-600 mt-1">
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>{chantier.address}</span>
              </div>
              {chantier.assignedChefId && (
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <span>Chef: {userNamesLoading ? 'Chargement...' : getUserName(chantier.assignedChefId)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Statistiques principales */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <motion.div
          whileHover={{ y: -5, transition: { duration: 0.2 } }}
          className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-blue-100 group transition-shadow hover:shadow-md"
        >
          <div className="flex flex-col h-full justify-between">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-blue-50 group-hover:scale-110 transition-transform duration-300">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Progression</p>
              <div className="flex items-baseline mt-1">
                <p className="text-2xl font-bold text-gray-900">{globalProgress}%</p>
              </div>
            </div>
            <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full opacity-5 bg-gradient-to-br from-blue-900 to-transparent pointer-events-none" />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -5, transition: { duration: 0.2 } }}
          className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-yellow-100 group transition-shadow hover:shadow-md"
        >
          <div className="flex flex-col h-full justify-between">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-yellow-50 group-hover:scale-110 transition-transform duration-300">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-yellow-50 text-yellow-600 bg-opacity-50">
                {phasesActives.length} actives
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Phases</p>
              <div className="flex items-baseline mt-1">
                <p className="text-2xl font-bold text-gray-900">{chantier.phases.length}</p>
              </div>
            </div>
            <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full opacity-5 bg-gradient-to-br from-yellow-900 to-transparent pointer-events-none" />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -5, transition: { duration: 0.2 } }}
          className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-green-100 group transition-shadow hover:shadow-md"
        >
          <div className="flex flex-col h-full justify-between">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-green-50 group-hover:scale-110 transition-transform duration-300">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Membres équipe</p>
              <div className="flex items-baseline mt-1">
                <p className="text-2xl font-bold text-gray-900">{totalEquipe}</p>
              </div>
            </div>
            <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full opacity-5 bg-gradient-to-br from-green-900 to-transparent pointer-events-none" />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -5, transition: { duration: 0.2 } }}
          className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-purple-100 group transition-shadow hover:shadow-md"
        >
          <div className="flex flex-col h-full justify-between">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-purple-50 group-hover:scale-110 transition-transform duration-300">
                <Camera className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Photos / Vidéos</p>
              <div className="flex items-baseline mt-1">
                <p className="text-2xl font-bold text-gray-900">{totalPhotos}</p>
              </div>
            </div>
            <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full opacity-5 bg-gradient-to-br from-purple-900 to-transparent pointer-events-none" />
          </div>
        </motion.div>
      </motion.div>

      {/* Progression générale */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Progression générale</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Progression</span>
            <span className="font-medium">{globalProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${getProgressColor(globalProgress)}`}
              style={{ width: `${globalProgress}%` }}
            ></div>
          </div>
        </div>
      </Card>

      {/* Phases */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Phases du projet</h3>
        <div className="space-y-4">
          {chantier.phases.map((phase) => {
            const katosPhase = phase as KatosChantierPhase;
            const hasSteps = katosPhase.steps && katosPhase.steps.length > 0;

            return (
              <div key={phase.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900">{phase.name}</h4>
                    {katosPhase.category && (
                      <span className={`px-2 py-1 text-xs rounded ${katosPhase.category === 'gros_oeuvre' ? 'bg-orange-100 text-orange-700' :
                        katosPhase.category === 'second_oeuvre' ? 'bg-purple-100 text-purple-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                        {katosPhase.category === 'gros_oeuvre' ? 'Gros œuvre' :
                          katosPhase.category === 'second_oeuvre' ? 'Second œuvre' : 'Principal'}
                      </span>
                    )}
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${phase.status === 'completed' ? 'bg-green-100 text-green-800' :
                    phase.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                    {phase.status === 'completed' ? 'Terminée' :
                      phase.status === 'in-progress' ? 'En cours' : 'En attente'}
                  </span>
                </div>
                {phase.description && (
                  <p className="text-sm text-gray-600 mb-3">{phase.description}</p>
                )}

                {/* Progress global de la phase */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Progression globale</span>
                    <span className="font-medium">{phase.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${getProgressColor(phase.progress)}`}
                      style={{ width: `${phase.progress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Sous-étapes si elles existent */}
                {hasSteps && (
                  <div className="mt-4 space-y-2">
                    <h5 className="text-sm font-medium text-gray-700">Détail des étapes:</h5>
                    <div className="space-y-2 ml-4">
                      {katosPhase.steps!.map((step: PhaseStep) => (
                        <div key={step.id} className="py-2 border-b border-gray-100 last:border-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${step.status === 'completed' ? 'bg-teal-500' :
                                step.status === 'in-progress' ? 'bg-indigo-500' :
                                  'bg-slate-300'
                                }`}></div>
                              <span className="text-sm text-gray-700">{step.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full ${step.progress === 100 ? 'bg-teal-500' :
                                    step.progress >= 50 ? 'bg-indigo-500' :
                                      step.progress > 0 ? 'bg-indigo-400' :
                                        'bg-slate-300'
                                    }`}
                                  style={{ width: `${step.progress}%` }}
                                ></div>
                              </div>
                              <span className="text-xs text-gray-500 w-8">{step.progress}%</span>
                            </div>
                          </div>

                          <VoiceNoteList
                            chantierId={chantier.id || ''}
                            phaseId={phase.id}
                            stepId={step.id}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {phase.notes && !phase.notes.includes('Progression mise à jour via l\'application mobile') && (
                  <div className="mt-3 text-sm text-gray-600">
                    <strong>Notes:</strong> {phase.notes}
                  </div>
                )}
                {phase.lastUpdated && (
                  <div className="mt-2 text-xs text-gray-500">
                    Dernière mise à jour: {phase.lastUpdated.toDate().toLocaleString('fr-FR')}
                    {phase.updatedBy && ` par ${getUserName(phase.updatedBy)}`}
                  </div>
                )}

                {/* Discussion de la phase */}
                <div className="mt-6 border-t pt-4">
                  <h5 className="text-sm font-semibold text-gray-700 mb-3">
                    {hasSteps ? "Discussion générale de la phase" : "Messages et notes vocales"}
                  </h5>
                  <VoiceNoteList
                    chantierId={chantier.id || ''}
                    phaseId={phase.id}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Équipe */}
      {chantier.team.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Équipe</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {chantier.team.map((member) => (
              <div key={member.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                <User className="w-8 h-8 text-gray-400" />
                <div>
                  <div className="font-medium text-gray-900">{member.name}</div>
                  <div className="text-sm text-gray-600">{member.role}</div>
                  {member.phoneNumber && (
                    <div className="text-xs text-gray-500">{member.phoneNumber}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Galerie photos */}
      {/* {chantier.gallery.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Galerie photos</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {chantier.gallery.slice(0, 8).map((photo) => (
              <div key={photo.id} className="relative">
                <img
                  src={photo.url}
                  alt={photo.description || 'Photo du chantier'}
                  className="w-full h-24 object-cover rounded-lg"
                />
                {photo.description && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-2 rounded-b-lg">
                    {photo.description}
                  </div>
                )}
              </div>
            ))}
            {chantier.gallery.length > 8 && (
              <div className="flex items-center justify-center bg-gray-100 rounded-lg h-24">
                <span className="text-sm text-gray-600">+{chantier.gallery.length - 8} photos</span>
              </div>
            )}
          </div>
        </Card>
      )} */}

      {/* Dernières mises à jour */}
      {chantier.updates.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Dernières mises à jour</h3>
          <div className="space-y-3">
            {chantier.updates.slice(0, 5).map((update) => (
              <div key={update.id} className="border-l-4 border-blue-500 pl-4">
                <div className="font-medium text-gray-900">{update.title}</div>
                {update.description && (
                  <div className="text-sm text-gray-600 mt-1">{update.description}</div>
                )}
                <div className="text-xs text-gray-500 mt-1">
                  {update.createdAt.toDate().toLocaleString('fr-FR')} par {getUserName(update.createdBy)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};