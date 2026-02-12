import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface ShowcaseContent {
    heroProject: {
        title: string;
        subtitle: string;
        description: string;
        imageUrl: string;
    };
    promo: {
        active: boolean;
        title: string;
        subtitle: string;
    };
    featuredVillas: string[]; // IDs des projets (villas) mis en avant
    updatedAt: any;
}

class ShowcaseService {
    private collectionName = 'settings';
    private docName = 'showcase';

    /**
     * Récupère le contenu du showcase
     */
    async getShowcaseContent(): Promise<ShowcaseContent | null> {
        try {
            const docRef = doc(db, this.collectionName, this.docName);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                return docSnap.data() as ShowcaseContent;
            }
            return null;
        } catch (error) {
            console.error('Erreur lors de la récupération du showcase:', error);
            return null;
        }
    }

    /**
     * Met à jour le contenu du showcase
     */
    async updateShowcaseContent(content: Partial<ShowcaseContent>): Promise<void> {
        try {
            const docRef = doc(db, this.collectionName, this.docName);
            await setDoc(docRef, {
                ...content,
                updatedAt: Timestamp.now()
            }, { merge: true });
        } catch (error) {
            console.error('Erreur lors de la mise à jour du showcase:', error);
            throw error;
        }
    }
}

export const showcaseService = new ShowcaseService();
