
// src/hooks/useArsEntries.ts
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getFirestore, collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, getDoc, type DocumentData, Timestamp, writeBatch, query, getDocs, where } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import type { ArsEntryFormData, SiteWorkStatus, ArsStatus } from '@/lib/schemas';
import { useAuth, type UserProfile } from './useAuth';
import { toast } from './use-toast';
import { parse, isValid } from 'date-fns';
import { usePendingUpdates } from './usePendingUpdates';
import { useDataStore } from './use-data-store'; // Import the new central store hook

const db = getFirestore(app);

// This is the shape of the data as it's stored and used in the app
export type ArsEntry = ArsEntryFormData & {
  id: string;
  createdAt?: Date;
  updatedAt?: Date;
  isPending?: boolean;
};

const SUPERVISOR_EDITABLE_STATUSES: ArsStatus[] = ["Work Order Issued", "Work in Progress", "Work Completed", "Work Failed"];

const processArsDoc = (docSnap: DocumentData): ArsEntry => {
    const data = docSnap.data();
    const processed: { [key: string]: any } = { id: docSnap.id };

    for (const key in data) {
        const value = data[key];
        if (value instanceof Timestamp) {
            processed[key] = value.toDate();
        } else {
            processed[key] = value;
        }
    }
    return processed as ArsEntry;
};

// Helper function to recursively remove `undefined` values, replacing them with `null`.
const sanitizeDataForFirestore = (data: any): any => {
    if (data === undefined) {
        return null;
    }
    if (Array.isArray(data)) {
        return data.map(item => sanitizeDataForFirestore(item));
    }
    if (data && typeof data === 'object' && !(data instanceof Date) && !(data instanceof Timestamp)) {
        const sanitized: { [key: string]: any } = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                const value = data[key];
                sanitized[key] = sanitizeDataForFirestore(value);
            }
        }
        return sanitized;
    }
    return data;
};

export function useArsEntries() {
  const { user } = useAuth();
  const { allArsEntries, isLoading: dataStoreLoading } = useDataStore(); // Use the central store
  const [arsEntries, setArsEntries] = useState<ArsEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { getPendingUpdates } = usePendingUpdates();

  useEffect(() => {
    const processEntries = async () => {
      if (dataStoreLoading || !user) {
        setIsLoading(dataStoreLoading);
        return;
      }
  
      setIsLoading(true);
      let finalEntries = allArsEntries;
  
      // SUPERVISOR VISIBILITY LOGIC
      if (user?.role === "supervisor") {
        finalEntries = finalEntries.filter((entry) => {
            // Supervisor should only see files assigned to them
            const isAssigned = entry.supervisorUid === user.uid;
    
            // Supervisor should only see files that are actionable for them
            const actionableStatuses: ArsStatus[] = ["Work Order Issued", "Work in Progress"];
            const isActionable = actionableStatuses.includes(entry.arsStatus ?? "");
    
            return isAssigned && isActionable;
        });
      }
      
      setArsEntries(finalEntries);
      setIsLoading(false);
    };

    if (!dataStoreLoading) {
      processEntries();
    }
  }, [user, allArsEntries, dataStoreLoading]);


  const addArsEntry = useCallback(async (entryData: ArsEntryFormData): Promise<string> => {
    if (!user || !['admin', 'engineer', 'scientist'].includes(user.role)) throw new Error("Permission denied.");
    if (!user.officeLocation) throw new Error("User has no office location.");
    
    const payload = {
        ...entryData,
        officeLocation: user.officeLocation,
        supervisorUid: entryData.supervisorUid ?? null,
        supervisorName: entryData.supervisorName ?? null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };
    const collectionPath = `offices/${user.officeLocation.toLowerCase()}/arsEntries`;
    
    const sanitizedPayload = sanitizeDataForFirestore(payload);
    const docRef = await addDoc(collection(db, collectionPath), sanitizedPayload);
    return docRef.id;
  }, [user]);

  const updateArsEntry = useCallback(async (id: string, entryData: Partial<ArsEntryFormData>, approveUpdateId?: string, approvingUser?: UserProfile) => {
    if (!user) throw new Error("Permission denied.");
    if (!user.officeLocation) throw new Error("User has no office location.");
    const collectionPath = `offices/${user.officeLocation.toLowerCase()}/arsEntries`;
    const docRef = doc(db, collectionPath, id);

    const payload = {
        ...entryData,
        updatedAt: serverTimestamp(),
    };
    
    delete (payload as any).id;
    delete (payload as any).createdAt;

    const sanitizedPayload = sanitizeDataForFirestore(payload);

    if (approveUpdateId && approvingUser && user.role === 'admin') {
        const batch = writeBatch(db);
        batch.update(docRef, sanitizedPayload);
        
        const updateRef = doc(db, `offices/${user.officeLocation.toLowerCase()}/pendingUpdates`, approveUpdateId);
        batch.update(updateRef, { 
            status: 'approved', 
            reviewedByUid: approvingUser.uid, 
            reviewedAt: serverTimestamp() 
        });
        
        await batch.commit();
    } else if (user.role === 'admin' || user.role === 'engineer') {
        await updateDoc(docRef, sanitizedPayload);
    } else {
        throw new Error("Permission denied for direct update.");
    }
  }, [user]);
  
  const deleteArsEntry = useCallback(async (id: string) => {
    if (!user || user.role !== 'admin') {
        toast({ title: "Permission Denied", description: "You don't have permission to delete entries.", variant: "destructive" });
        return;
    }
     if (!user.officeLocation) {
        toast({ title: "Cannot Delete", description: "Your user profile is not associated with an office.", variant: "destructive" });
        return;
    }
    const collectionPath = `offices/${user.officeLocation.toLowerCase()}/arsEntries`;
    await deleteDoc(doc(db, collectionPath, id));
  }, [user, toast]);
  
  const getArsEntryById = useCallback(async (id: string): Promise<ArsEntry | null> => {
    // Find the entry from the already loaded data in the central store.
    const entry = allArsEntries.find(e => e.id === id);
    return entry || null;
  }, [allArsEntries]);

  const clearAllArsData = useCallback(async () => {
    if (!user || user.role !== 'admin' || !user.officeLocation) {
        toast({ title: "Permission Denied", variant: "destructive" });
        return;
    }
    const collectionPath = `offices/${user.officeLocation.toLowerCase()}/arsEntries`;
    const q = query(collection(db, collectionPath));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }, [user, toast]);
  
  const refreshArsEntries = useCallback(() => {
    // This function can be a no-op because the central store handles refetching
  }, []);

  return { 
    arsEntries, 
    isLoading, 
    refreshArsEntries,
    addArsEntry, 
    updateArsEntry, 
    deleteArsEntry, 
    getArsEntryById,
    clearAllArsData,
  };
}
