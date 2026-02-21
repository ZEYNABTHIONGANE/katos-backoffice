import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { Camera, Music, Play, Pause, ExternalLink, X } from 'lucide-react';
import { feedbackService } from '../../services/feedbackService';
import type { ProgressPhoto } from '../../types/chantier';
import type { VoiceNoteFeedback } from '../../types/firebase';
import { motion, AnimatePresence } from 'framer-motion';

interface ChantierMediaGalleryProps {
    isOpen: boolean;
    onClose: () => void;
    chantierId: string;
    gallery: ProgressPhoto[];
    chantierName: string;
}

export const ChantierMediaGallery: React.FC<ChantierMediaGalleryProps> = ({
    isOpen,
    onClose,
    chantierId,
    gallery,
    chantierName
}) => {
    const [filter, setFilter] = useState<'all' | 'image' | 'video' | 'audio'>('all');
    const [voiceNotes, setVoiceNotes] = useState<VoiceNoteFeedback[]>([]);
    const [playingId, setPlayingId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [selectedMedia, setSelectedMedia] = useState<any | null>(null);

    useEffect(() => {
        if (isOpen && chantierId) {
            const unsubscribe = feedbackService.subscribeToAllChantierFeedbacks(chantierId, (feedbacks) => {
                // Only keep audio feedbacks for the media gallery
                setVoiceNotes(feedbacks.filter(f => f.type === 'audio'));
            });
            return () => unsubscribe();
        }
    }, [isOpen, chantierId]);

    const handlePlayAudio = (url: string, id: string) => {
        if (playingId === id) {
            audioRef.current?.pause();
            setPlayingId(null);
        } else {
            if (audioRef.current) {
                audioRef.current.pause();
            }
            const audio = new Audio(url);
            audioRef.current = audio;
            audio.play();
            setPlayingId(id);
            audio.onended = () => setPlayingId(null);
        }
    };

    const filteredMedia = React.useMemo(() => {
        const photos = gallery.map(p => {
            const isVideo = p.type === 'video' || /\.(mp4|mov|avi|webm|mkv)(\?|$)/i.test(p.url);
            let thumbnailUrl = p.url;

            if (isVideo) {
                if (p.thumbnailUrl) {
                    thumbnailUrl = p.thumbnailUrl;
                } else if (p.url.includes('cloudinary.com')) {
                    const urlParts = p.url.split('?');
                    const baseUrl = urlParts[0];
                    const queryParams = urlParts[1] ? `?${urlParts[1]}` : '';
                    thumbnailUrl = baseUrl.replace(/\.[^/.]+$/, ".jpg") + queryParams;
                }
            }

            return {
                ...p,
                mediaType: p.type as 'image' | 'video',
                thumbnailUrl
            };
        });

        const audios = voiceNotes.map(v => ({
            id: v.id,
            url: v.audioUrl,
            mediaType: 'audio' as const,
            description: `Note vocale - ${v.createdAt?.seconds ? new Date(v.createdAt.seconds * 1000).toLocaleDateString() : 'Envoi...'}`,
            uploadedAt: v.createdAt,
            duration: v.duration,
            thumbnailUrl: null
        }));

        const all = [...photos, ...audios].sort((a, b) => {
            const dateA = a.uploadedAt?.seconds || 0;
            const dateB = b.uploadedAt?.seconds || 0;
            return dateB - dateA;
        });

        if (filter === 'all') return all;
        return all.filter(m => m.mediaType === filter);
    }, [gallery, voiceNotes, filter]);

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title={`Médiathèque - ${chantierName}`}
                size="xl"
            >
                <div className="space-y-6">
                    {/* Filtres */}
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            Tous
                        </button>
                        <button
                            onClick={() => setFilter('image')}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === 'image' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            Photos
                        </button>
                        <button
                            onClick={() => setFilter('video')}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === 'video' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            Vidéos
                        </button>
                        <button
                            onClick={() => setFilter('audio')}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === 'audio' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            Audios
                        </button>
                    </div>

                    {/* Grille de médias */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto p-1">
                        <AnimatePresence mode="popLayout">
                            {filteredMedia.map((item: any) => (
                                <motion.div
                                    key={item.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-200 group"
                                >
                                    {item.mediaType === 'image' && (
                                        <div className="w-full h-full relative">
                                            <img
                                                src={item.url}
                                                alt={item.description}
                                                className="w-full h-full object-cover cursor-pointer transition-transform duration-500 group-hover:scale-110"
                                                onClick={() => setSelectedMedia(item)}
                                            />
                                            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/40 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white uppercase tracking-wider">
                                                Photo
                                            </div>
                                        </div>
                                    )}

                                    {item.mediaType === 'video' && (
                                        <div className="w-full h-full relative cursor-pointer group/video" onClick={() => setSelectedMedia(item)}>
                                            <img
                                                src={item.thumbnailUrl}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                alt="Video preview"
                                                onError={(e) => {
                                                    // Fallback if Cloudinary thumb fails
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                }}
                                            />
                                            <video
                                                src={`${item.url}#t=0.5`}
                                                className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover/video:opacity-100 transition-opacity duration-300"
                                                muted
                                                playsInline
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-opacity-40 transition-all">
                                                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xl">
                                                    <Play size={20} className="text-white fill-white ml-1" />
                                                </div>
                                            </div>
                                            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-blue-600/60 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white uppercase tracking-wider">
                                                Vidéo
                                            </div>
                                        </div>
                                    )}

                                    {item.mediaType === 'audio' && (
                                        <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex flex-col items-center justify-center p-4 relative overflow-hidden">
                                            {/* Decorative circles for audio */}
                                            <div className="absolute -top-4 -right-4 w-16 h-16 bg-white/10 rounded-full blur-xl" />
                                            <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-white/10 rounded-full blur-xl" />

                                            <div
                                                onClick={() => handlePlayAudio(item.url, item.id)}
                                                className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white flex items-center justify-center cursor-pointer hover:bg-white/30 transition-all hover:scale-110 shadow-2xl z-10"
                                            >
                                                {playingId === item.id ? <Pause size={28} /> : <Play size={28} className="fill-white ml-1.5" />}
                                            </div>

                                            <div className="mt-3 flex flex-col items-center z-10">
                                                <span className="text-[10px] font-black text-white/90 uppercase tracking-[0.2em]">Note Vocale</span>
                                                <span className="text-[10px] text-white/70 font-mono mt-0.5">{Math.round(item.duration)}s</span>
                                            </div>

                                            {/* Waveform visualizer simulation */}
                                            <div className="absolute bottom-2 left-0 right-0 flex justify-center items-end gap-[2px] px-4 opacity-40">
                                                {[3, 6, 4, 8, 5, 9, 4, 7, 3, 6].map((h, i) => (
                                                    <div
                                                        key={i}
                                                        className={`w-1 bg-white rounded-full ${playingId === item.id ? 'animate-pulse' : ''}`}
                                                        style={{ height: `${h * 2}px`, animationDelay: `${i * 0.1}s` }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Overlay description */}
                                    {item.description && (
                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                                            <p className="text-[10px] text-white truncate font-medium">
                                                {item.description}
                                            </p>
                                        </div>
                                    )}

                                    {/* Link icon for visual media */}
                                    {(item.mediaType === 'image' || item.mediaType === 'video') && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                window.open(item.url, '_blank');
                                            }}
                                            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/10 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <ExternalLink size={14} className="text-white" />
                                        </button>
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {filteredMedia.length === 0 && (
                            <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                                <Camera size={48} className="mb-4 opacity-20" />
                                <p className="text-sm font-medium">Aucun média trouvé</p>
                            </div>
                        )}
                    </div>
                </div>
            </Modal>

            {/* Visionneuse plein écran */}
            <AnimatePresence>
                {selectedMedia && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 md:p-10"
                    >
                        <button
                            onClick={() => setSelectedMedia(null)}
                            className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors"
                        >
                            <X size={32} />
                        </button>

                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative max-w-5xl w-full max-h-full flex flex-col items-center"
                        >
                            {selectedMedia.mediaType === 'image' && (
                                <img
                                    src={selectedMedia.url}
                                    alt={selectedMedia.description}
                                    className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
                                />
                            )}
                            {selectedMedia.mediaType === 'video' && (
                                <video
                                    src={selectedMedia.url}
                                    controls
                                    autoPlay
                                    className="max-w-full max-h-[80vh] rounded-lg shadow-2xl"
                                />
                            )}
                            {selectedMedia.description && (
                                <p className="text-white mt-6 text-lg font-medium bg-white/10 px-6 py-2 rounded-full backdrop-blur-md">
                                    {selectedMedia.description}
                                </p>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};
