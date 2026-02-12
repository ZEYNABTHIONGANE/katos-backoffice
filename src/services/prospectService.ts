
import {
    collection,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    Timestamp,
    onSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface FirebaseProspect {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    project?: string;
    status: 'pending' | 'validated' | 'rejected';
    createdAt: Timestamp;
}

export class ProspectService {
    private collectionName = 'prospects';

    async getProspects(): Promise<FirebaseProspect[]> {
        const ref = collection(db, this.collectionName);
        const q = query(ref, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirebaseProspect));
    }

    async updateProspectStatus(id: string, status: FirebaseProspect['status']): Promise<void> {
        const ref = doc(db, this.collectionName, id);
        await updateDoc(ref, { status });
    }

    async deleteProspect(id: string): Promise<void> {
        await deleteDoc(doc(db, this.collectionName, id));
    }

    subscribeToProspects(callback: (prospects: FirebaseProspect[]) => void): () => void {
        const ref = collection(db, this.collectionName);
        const q = query(ref, orderBy('createdAt', 'desc'));
        return onSnapshot(q, (snapshot) => {
            callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirebaseProspect)));
        });
    }
}

export const prospectService = new ProspectService();
