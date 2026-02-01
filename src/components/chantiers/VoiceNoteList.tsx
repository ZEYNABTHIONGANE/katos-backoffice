import React, { useEffect, useState, useRef } from 'react';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import type { VoiceNoteFeedback } from '../../types/firebase';
import { feedbackService } from '../../services/feedbackService';
import { userService } from '../../services/userService';
import { useAuthStore } from '../../store/authStore';
import { Play, Pause, Trash2, Send } from 'lucide-react';
import { UserRole } from '../../types/roles';

interface VoiceNoteListProps {
    chantierId: string;
    phaseId: string;
    stepId?: string;
    currentUserId?: string;
}

interface UserInfo {
    name: string;
    roleLabel: string;
}

export const VoiceNoteList: React.FC<VoiceNoteListProps> = ({ chantierId, phaseId, stepId }) => {
    const { userData } = useAuthStore();
    const [feedbacks, setFeedbacks] = useState<VoiceNoteFeedback[]>([]);
    const [playingId, setPlayingId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [usersInfo, setUsersInfo] = useState<Record<string, UserInfo>>({});
    const [text, setText] = useState('');

    // State for delete modal
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<VoiceNoteFeedback | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Check if user is admin or super admin
    const canDelete = userData?.role === 'admin' || userData?.role === 'super_admin';

    useEffect(() => {
        const unsubscribe = feedbackService.subscribeToStepFeedbacks(
            chantierId,
            phaseId,
            (newFeedbacks) => {
                setFeedbacks(newFeedbacks);
                // Fetch names
                const uids = Array.from(new Set(newFeedbacks.map(f => f.clientId)));
                fetchNames(uids);
            },
            stepId
        );
        return () => unsubscribe();
    }, [chantierId, phaseId, stepId]);

    const fetchNames = async (uids: string[]) => {
        const newInfo: Record<string, UserInfo> = { ...usersInfo };
        for (const uid of uids) {
            if (!newInfo[uid]) {
                try {
                    const user = await userService.getUserByUid(uid);
                    if (user) {
                        let roleLabel = 'Utilisateur';
                        if (user.role === UserRole.CLIENT) roleLabel = 'Client';
                        else if (user.role === UserRole.CHEF || user.isChef) roleLabel = 'Chef';
                        else if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) roleLabel = 'Admin';

                        newInfo[uid] = {
                            name: user.displayName,
                            roleLabel: roleLabel
                        };
                    } else {
                        newInfo[uid] = { name: 'Utilisateur', roleLabel: '' };
                    }
                } catch (e) {
                    newInfo[uid] = { name: 'Utilisateur', roleLabel: '' };
                }
            }
        }
        setUsersInfo(newInfo);
    };

    const handlePlay = (url: string, id: string) => {
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

    const handleDeleteClick = (feedback: VoiceNoteFeedback) => {
        if (!canDelete) return;
        setItemToDelete(feedback);
        setDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;

        setIsDeleting(true);
        try {
            await feedbackService.deleteVoiceNote(itemToDelete.chantierId, itemToDelete.id);
            setDeleteModalOpen(false);
            setItemToDelete(null);
        } catch (error) {
            console.error("Erreur lors de la suppression:", error);
            alert("Erreur lors de la suppression");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSendText = async () => {
        if (!text.trim() || !userData) return;

        const messageToSend = text.trim();
        setText('');

        try {
            await feedbackService.createTextMessage(
                chantierId,
                phaseId,
                userData.uid,
                messageToSend,
                stepId
            );
        } catch (error) {
            console.error("Failed to send text", error);
            setText(messageToSend);
        }
    };

    if (feedbacks.length === 0 && !userData) return null; // Logic usually implies auth user is needed to verify perms or send messages. 
    // If not logged in, we probably wouldn't see this page.

    return (
        <div className="mt-4 space-y-3">
            <h4 className="text-sm font-semibold text-gray-700">Messages & Notes vocales</h4>

            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {feedbacks.map((item) => {
                    const isPlaying = playingId === item.id;
                    const info = usersInfo[item.clientId] || { name: 'Chargement...', roleLabel: '' };
                    const isMe = userData?.uid === item.clientId;
                    const isText = item.type === 'text';

                    return (
                        <div key={item.id} className={`flex items-start space-x-3 ${isMe ? 'flex-row-reverse space-x-reverse' : ''}`}>
                            <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%]`}>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-medium text-gray-500">
                                        {info.name}
                                    </span>
                                    {info.roleLabel && !isMe && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${info.roleLabel === 'Chef' ? 'bg-purple-100 text-purple-700' :
                                                info.roleLabel === 'Client' ? 'bg-green-100 text-green-700' :
                                                    'bg-gray-200 text-gray-700'
                                            }`}>
                                            {info.roleLabel}
                                        </span>
                                    )}
                                </div>

                                <div className={`relative p-3 rounded-2xl ${isMe
                                        ? 'bg-blue-600 text-white rounded-tr-none'
                                        : 'bg-gray-100 text-gray-800 rounded-tl-none'
                                    }`}>
                                    {isText ? (
                                        <p className="text-sm whitespace-pre-wrap">{item.text}</p>
                                    ) : (
                                        <div className="flex items-center space-x-3">
                                            <button
                                                onClick={() => handlePlay(item.audioUrl, item.id)}
                                                className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full transition-colors ${isMe ? 'bg-white text-blue-600 hover:bg-gray-100' : 'bg-blue-600 text-white hover:bg-blue-700'
                                                    }`}
                                            >
                                                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                                            </button>
                                            <div className="flex items-center space-x-2">
                                                <div className={`h-1 w-16 rounded-full overflow-hidden ${isMe ? 'bg-blue-400' : 'bg-gray-300'}`}>
                                                    <div
                                                        className={`h-full rounded-full ${isMe ? 'bg-white' : 'bg-blue-500'} ${isPlaying ? 'animate-pulse' : ''}`}
                                                        style={{ width: isPlaying ? '100%' : '0%' }}
                                                    />
                                                </div>
                                                <span className={`text-xs font-mono ${isMe ? 'text-blue-100' : 'text-gray-500'}`}>{Math.round(item.duration)}s</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] text-gray-400">
                                        {item.createdAt?.seconds ? new Date(item.createdAt.seconds * 1000).toLocaleDateString() : ''}
                                    </span>
                                    {canDelete && (
                                        <button
                                            onClick={() => handleDeleteClick(item)}
                                            className="text-gray-400 hover:text-red-500 p-0.5"
                                            title="Supprimer"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Input Area */}
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Écrire un message..."
                    className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendText();
                        }
                    }}
                />
                <button
                    onClick={handleSendText}
                    disabled={!text.trim()}
                    className={`p-2 rounded-full ${text.trim()
                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        } transition-all duration-200`}
                >
                    <Send size={18} />
                </button>
            </div>

            <ConfirmModal
                isOpen={deleteModalOpen}
                onClose={() => {
                    if (!isDeleting) {
                        setDeleteModalOpen(false);
                        setItemToDelete(null);
                    }
                }}
                onConfirm={handleConfirmDelete}
                title="Supprimer le message"
                message="Êtes-vous sûr de vouloir supprimer ce message ? Cette action est irréversible."
                confirmText="Supprimer"
                loading={isDeleting}
            />
        </div>
    );
};
