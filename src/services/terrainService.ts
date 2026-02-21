import {
    collection,
    addDoc,
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
import { storageService } from './storageService';
import type { FirebaseTerrain } from '../types/firebase';

export class TerrainService {
    private collectionName = 'terrains';

    async addTerrain(terrainData: Omit<FirebaseTerrain, 'id' | 'createdAt'>): Promise<string> {
        const terrainRef = collection(db, this.collectionName);
        const newTerrain = {
            ...terrainData,
            createdAt: Timestamp.now()
        };
        const docRef = await addDoc(terrainRef, newTerrain);
        return docRef.id;
    }

    async getTerrains(): Promise<FirebaseTerrain[]> {
        const terrainRef = collection(db, this.collectionName);
        const q = query(terrainRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as FirebaseTerrain));
    }

    async updateTerrain(id: string, updates: Partial<Omit<FirebaseTerrain, 'id' | 'createdAt'>>): Promise<void> {
        const terrainRef = doc(db, this.collectionName, id);
        await updateDoc(terrainRef, updates);
    }

    async deleteTerrain(id: string): Promise<void> {
        const terrains = await this.getTerrains();
        const terrain = terrains.find(t => t.id === id);

        if (terrain?.images && terrain.images.length > 0) {
            for (const imageUrl of terrain.images) {
                try {
                    await storageService.deleteImage(imageUrl);
                } catch (error) {
                    console.warn('Erreur suppression image terrain:', error);
                }
            }
        }

        const terrainRef = doc(db, this.collectionName, id);
        await deleteDoc(terrainRef);
    }

    subscribeToTerrains(callback: (terrains: FirebaseTerrain[]) => void): () => void {
        const terrainRef = collection(db, this.collectionName);
        const q = query(terrainRef, orderBy('createdAt', 'desc'));

        return onSnapshot(q, (snapshot) => {
            const terrains = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as FirebaseTerrain));
            callback(terrains);
        });
    }

    async uploadTerrainImages(files: File[], terrainId?: string): Promise<string[]> {
        const folderPath = terrainId ? `terrains/${terrainId}` : 'terrains/temp';
        const uploadPromises = files.map(file =>
            storageService.uploadImage(file, folderPath)
        );

        return Promise.all(uploadPromises);
    }
}

export const terrainService = new TerrainService();
