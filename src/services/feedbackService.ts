import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    onSnapshot,
    query,
    orderBy,
    where,
    serverTimestamp,
    Timestamp,
    arrayUnion
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import type { VoiceNoteFeedback } from '../types/firebase';

const FEEDBACKS_SUBCOLLECTION = 'feedbacks';
const CHANTIERS_COLLECTION = 'chantiers';

export const feedbackService = {
    /**
     * Uploads a voice note audio file to Firebase Storage
     */
    uploadAudioFile: async (file: Blob, chantierId: string): Promise<string> => {
        try {
            const filename = `voice_notes/${chantierId}/${Date.now()}.m4a`;
            const storageRef = ref(storage, filename);

            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);
            return downloadURL;
        } catch (error) {
            console.error('Error uploading audio file:', error);
            throw error;
        }
    },

    /**
     * Creates a new voice note feedback document in Firestore
     */
    createVoiceNote: async (
        chantierId: string,
        phaseId: string,
        clientId: string,
        audioUrl: string,
        duration: number,
        stepId?: string
    ): Promise<string> => {
        try {
            const feedbackData: any = {
                chantierId,
                phaseId,
                clientId,
                type: 'audio',
                audioUrl,
                duration,
                createdAt: serverTimestamp(),
                status: 'unread',
                readBy: []
            };

            if (stepId) {
                feedbackData.stepId = stepId;
            }

            const feedbacksRef = collection(db, CHANTIERS_COLLECTION, chantierId, FEEDBACKS_SUBCOLLECTION);
            const docRef = await addDoc(feedbacksRef, feedbackData);
            return docRef.id;
        } catch (error) {
            console.error('Error creating voice note:', error);
            throw error;
        }
    },

    /**
     * Creates a new text message feedback document in Firestore
     */
    createTextMessage: async (
        chantierId: string,
        phaseId: string,
        clientId: string,
        text: string,
        stepId?: string
    ): Promise<string> => {
        try {
            const feedbackData: any = {
                chantierId,
                phaseId,
                clientId,
                type: 'text',
                text,
                audioUrl: '', // Placeholder
                duration: 0,
                createdAt: serverTimestamp(),
                status: 'unread',
                readBy: []
            };

            if (stepId) {
                feedbackData.stepId = stepId;
            }

            const feedbacksRef = collection(db, CHANTIERS_COLLECTION, chantierId, FEEDBACKS_SUBCOLLECTION);
            const docRef = await addDoc(feedbacksRef, feedbackData);
            return docRef.id;
        } catch (error) {
            console.error('Error creating text message:', error);
            throw error;
        }
    },

    /**
     * Subscribes to voice notes for a specific step (or phase)
     */
    subscribeToStepFeedbacks: (
        chantierId: string,
        phaseId: string,
        onUpdate: (feedbacks: VoiceNoteFeedback[]) => void,
        stepId?: string
    ) => {
        const feedbacksRef = collection(db, CHANTIERS_COLLECTION, chantierId, FEEDBACKS_SUBCOLLECTION);

        let q = query(
            feedbacksRef,
            where('phaseId', '==', phaseId),
            orderBy('createdAt', 'asc')
        );

        if (stepId) {
            q = query(q, where('stepId', '==', stepId));
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const feedbacks = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as VoiceNoteFeedback[];

            onUpdate(feedbacks);
        }, (error) => {
            console.error("Error creating feedback listener:", error);
        });

        return unsubscribe;
    },

    /**
     * Marks a feedback as read by a specific user
     */
    markAsRead: async (chantierId: string, feedbackId: string, userId: string) => {
        try {
            const feedbackRef = doc(db, CHANTIERS_COLLECTION, chantierId, FEEDBACKS_SUBCOLLECTION, feedbackId);
            await updateDoc(feedbackRef, {
                readBy: arrayUnion(userId)
            });
        } catch (error) {
            console.error('Error marking feedback as read:', error);
        }
    },

    /**
     * Deletes a voice note from Firestore (and optionally storage)
     */
    deleteVoiceNote: async (chantierId: string, feedbackId: string, audioUrl: string) => {
        try {
            // Delete from Firestore
            const feedbackRef = doc(db, CHANTIERS_COLLECTION, chantierId, FEEDBACKS_SUBCOLLECTION, feedbackId);
            await deleteDoc(feedbackRef);

            // Try to delete from storage if we can parse the ref, 
            // but for safety/simplicity we can leave it or try:
            // const storageRef = ref(storage, audioUrl);
            // await deleteObject(storageRef).catch(e => console.warn("Storage delete failed", e));
        } catch (error) {
            console.error('Error deleting voice note:', error);
            throw error;
        }
    }
};
