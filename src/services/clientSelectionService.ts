import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  query,
  orderBy,
  Timestamp,
  onSnapshot,
  where
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { ClientSelection } from '../types';

export class ClientSelectionService {
  private collectionName = 'clientSelections';

  /**
   * Get all client selections
   */
  async getClientSelections(): Promise<ClientSelection[]> {
    const selectionsRef = collection(db, this.collectionName);
    const q = query(selectionsRef, orderBy('submittedAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      submittedAt: doc.data().submittedAt?.toDate?.()?.toISOString() || doc.data().submittedAt,
      reviewedAt: doc.data().reviewedAt?.toDate?.()?.toISOString() || doc.data().reviewedAt,
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt,
    } as ClientSelection));
  }

  /**
   * Get pending client selections
   */
  async getPendingSelections(): Promise<ClientSelection[]> {
    const selectionsRef = collection(db, this.collectionName);
    const q = query(
      selectionsRef,
      where('status', '==', 'submitted'),
      orderBy('submittedAt', 'desc')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      submittedAt: doc.data().submittedAt?.toDate?.()?.toISOString() || doc.data().submittedAt,
      reviewedAt: doc.data().reviewedAt?.toDate?.()?.toISOString() || doc.data().reviewedAt,
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt,
    } as ClientSelection));
  }

  /**
   * Update selection status
   */
  async updateSelectionStatus(
    selectionId: string,
    status: ClientSelection['status'],
    reviewedBy: string,
    notes?: string
  ): Promise<void> {
    const selectionRef = doc(db, this.collectionName, selectionId);
    const updates: any = {
      status,
      reviewedAt: Timestamp.now(),
      reviewedBy,
      updatedAt: Timestamp.now()
    };

    if (notes) {
      updates.notes = notes;
    }

    await updateDoc(selectionRef, updates);
  }

  /**
   * Subscribe to client selections with real-time updates
   */
  subscribeToClientSelections(callback: (selections: ClientSelection[]) => void): () => void {
    const selectionsRef = collection(db, this.collectionName);
    const q = query(selectionsRef, orderBy('submittedAt', 'desc'));

    return onSnapshot(q, (snapshot) => {
      const selections = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        submittedAt: doc.data().submittedAt?.toDate?.()?.toISOString() || doc.data().submittedAt,
        reviewedAt: doc.data().reviewedAt?.toDate?.()?.toISOString() || doc.data().reviewedAt,
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
        updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt,
      } as ClientSelection));
      callback(selections);
    });
  }

  /**
   * Subscribe to pending selections only
   */
  subscribeToPendingSelections(callback: (selections: ClientSelection[]) => void): () => void {
    const selectionsRef = collection(db, this.collectionName);
    const q = query(
      selectionsRef,
      where('status', '==', 'submitted'),
      orderBy('submittedAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const selections = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        submittedAt: doc.data().submittedAt?.toDate?.()?.toISOString() || doc.data().submittedAt,
        reviewedAt: doc.data().reviewedAt?.toDate?.()?.toISOString() || doc.data().reviewedAt,
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
        updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt,
      } as ClientSelection));
      callback(selections);
    });
  }
}

export const clientSelectionService = new ClientSelectionService();