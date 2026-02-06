import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, User, Camera, Users, BarChart3, Clock, Play, ChevronUp } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useRealtimeChantier } from '../hooks/useRealtimeChantier';
import { useUserNames } from '../hooks/useUserNames';
import { VoiceNoteList } from '../components/chantiers/VoiceNoteList';
import type { ChantierStatus, KatosChantierPhase, PhaseStep, ProgressPhoto } from '../types/chantier';

export const ChantierDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showAllPhotos, setShowAllPhotos] = useState(false);

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
    // ... user IDs collection logic remains same ...
    return Array.from(ids);
  }, [chantier]);

  const { getUserName, loading: userNamesLoading } = useUserNames(userIds);

  // Refs pour le scroll
  const progressRef = React.useRef<HTMLDivElement>(null);
  const phasesRef = React.useRef<HTMLDivElement>(null);
  const teamRef = React.useRef<HTMLDivElement>(null);
  const galleryRef = React.useRef<HTMLDivElement>(null);

  const scrollToSection = (section: 'progress' | 'phases' | 'team' | 'gallery') => {
    const refs = {
      progress: progressRef,
      phases: phasesRef,
      team: teamRef,
      gallery: galleryRef
    };

    refs[section]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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

  const renderGalleryItem = (photo: ProgressPhoto) => {
    const isVideo = photo.type === 'video' || photo.url.includes('.mp4') || photo.url.includes('.mov');

    // Tentative de récupération d'une miniature pour la vidéo
    let thumbnailUrl = photo.url;
    if (isVideo) {
      if (photo.thumbnailUrl) {
        thumbnailUrl = photo.thumbnailUrl;
      } else if (photo.url.includes('cloudinary.com')) {
        // Astuce Cloudinary: changer l'extension pour avoir une image jpg
        // Remplace la fin de l'URL (.mp4, .mov, etc.) par .jpg
        thumbnailUrl = photo.url.replace(/\.[^/.]+$/, ".jpg");
      }
    }

    return (
      <div key={photo.id} className="relative group cursor-pointer" onClick={() => window.open(photo.url, '_blank')}>
        <img
          src={thumbnailUrl}
          alt={photo.description || 'Progrès du chantier'}
          className="w-full h-24 object-cover rounded-lg group-hover:opacity-90 transition-opacity bg-gray-100"
          onError={(e) => {
            // Fallback si la miniature générée échoue ou si l'image est cassée
            (e.target as HTMLImageElement).src = 'https://placehold.co/400x300?text=Indisponible';
          }}
        />
        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-black bg-opacity-50 rounded-full p-2">
              <Play className="w-6 h-6 text-white fill-current" />
            </div>
          </div>
        )}
        {photo.description && (
          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-2 rounded-b-lg truncate">
            {photo.description}
          </div>
        )}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all rounded-lg" />
      </div>
    );
  };

  if (loading) {
    // ... loading state ...
  }

  if (error || !hasChantier || !chantier) {
    // ... error state ...
  }

  return (
    <div className="space-y-6">
      {/* ... Header and Stats sections unchanged ... */}

      {/* ... Progress, Phases, Team sections unchanged ... */}

      {/* Galerie photos */}
      <div ref={galleryRef}>
        {chantier.gallery.length > 0 ? (
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Galerie photos</h3>
              <span className="text-sm text-gray-500">{chantier.gallery.length} éléments</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Affichage des items */}
              {(showAllPhotos ? chantier.gallery : chantier.gallery.slice(0, 8)).map(renderGalleryItem)}

              {/* Carte "Voir plus" */}
              {!showAllPhotos && chantier.gallery.length > 8 && (
                <div
                  className="flex flex-col items-center justify-center bg-gray-100 rounded-lg h-24 cursor-pointer hover:bg-gray-200 transition-colors"
                  onClick={() => setShowAllPhotos(true)}
                >
                  <span className="text-lg font-bold text-gray-700">+{chantier.gallery.length - 8}</span>
                  <span className="text-xs text-gray-600">Voir tout</span>
                </div>
              )}

              {/* Carte "Voir moins" */}
              {showAllPhotos && chantier.gallery.length > 8 && (
                <div
                  className="flex flex-col items-center justify-center bg-gray-100 rounded-lg h-24 cursor-pointer hover:bg-gray-200 transition-colors border border-dashed border-gray-300"
                  onClick={() => setShowAllPhotos(false)}
                >
                  <ChevronUp className="w-6 h-6 text-gray-500 mb-1" />
                  <span className="text-xs text-gray-600">Voir moins</span>
                </div>
              )}
            </div>
          </Card>
        ) : (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Galerie photos</h3>
            <p className="text-gray-500 text-sm">Aucune photo pour le moment.</p>
          </Card>
        )}
      </div>

      {/* Dernières mises à jour */}
      {chantier.updates.length > 0 && (
// ... updates section ...
    </div>
  );
};