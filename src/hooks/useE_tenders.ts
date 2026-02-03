// src/hooks/useE_tenders.ts
"use client";

import { useCallback } from 'react';
import { getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, getDoc, type DocumentData, Timestamp } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { useAuth } from './useAuth';
import type { E_tenderFormData } from '@/lib/schemas/eTenderSchema';
import { toast } from './use-toast';
import { useDataStore } from './use-data-store';

const db = getFirestore(app);

export type E_tender = E_tenderFormData & {
  id: string;
  createdAt?: Date;
  updatedAt?: Date;
};

const processDoc = (docSnap: DocumentData) => {
    const data = docSnap.data();
    const processed: { [key: string]: any } = {};
    for (const key in data) {
        const value = data[key];
        if (value instanceof Timestamp) {
            processed[key] = value.toDate();
        } else if (Array.isArray(value)) {
            // Recursively process arrays of objects (like bidders, corrigendums)
            processed[key] = value.map(item => 
                (item instanceof Timestamp) ? item.toDate() : 
                (typeof item === 'object' && item !== null && !(item instanceof Date)) ? processDoc({ data: () => item }) : item
            );
        } else if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
            processed[key] = processDoc({ data: () => value });
        } else {
            processed[key] = value;
        }
    }
    return { ...processed, id: docSnap.id } as E_tender;
};

export function useE_tenders() {
    const { user } = useAuth();
    const { allE_tenders, isLoading: dataStoreLoading } = useDataStore();
    
    const addTender = useCallback(async (tenderData: Omit<E_tender, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
        if (!user) throw new Error("User must be logged in to add a tender.");
        if (!user.officeLocation) throw new Error("User has no office location.");
        const collectionPath = `offices/${user.officeLocation.toLowerCase()}/eTenders`;
        const payload = { ...tenderData, officeLocation: user.officeLocation, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
        const docRef = await addDoc(collection(db, collectionPath), payload);
        return docRef.id;
    }, [user]);

    const updateTender = useCallback(async (id: string, tenderData: Partial<E_tender>) => {
        if (!user) throw new Error("User must be logged in to update a tender.");
        if (!user.officeLocation) throw new Error("User has no office location.");
        const collectionPath = `offices/${user.officeLocation.toLowerCase()}/eTenders`;
        const docRef = doc(db, collectionPath, id);
        const payload = { ...tenderData, updatedAt: serverTimestamp() };
        if ('id' in payload) delete (payload as any).id;
        await updateDoc(docRef, payload);
    }, [user]);

    const deleteTender = useCallback(async (id: string) => {
        if (!user || user.role !== 'editor') {
            toast({ title: "Permission Denied", description: "You don't have permission to delete tenders.", variant: "destructive" });
            return;
        }
        if (!user.officeLocation) throw new Error("User has no office location.");
        const collectionPath = `offices/${user.officeLocation.toLowerCase()}/eTenders`;
        await deleteDoc(doc(db, collectionPath, id));
    }, [user, toast]);
    
    const getTender = useCallback(async (id: string): Promise<E_tender | null> => {
        if (!user || !user.officeLocation) return null;
        try {
            const collectionPath = `offices/${user.officeLocation.toLowerCase()}/eTenders`;
            const docRef = doc(db, collectionPath, id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return processDoc(docSnap);
            }
            return null;
        } catch (error) {
            console.error("Error fetching tender by ID:", error);
            return null;
        }
    }, [user]);

    return { 
        tenders: allE_tenders, 
        isLoading: dataStoreLoading, 
        addTender, 
        updateTender, 
        deleteTender, 
        getTender, 
    };
}
