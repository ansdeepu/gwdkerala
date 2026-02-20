// src/hooks/useAgencyApplications.ts
"use client";

import { useCallback } from 'react';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { app } from '@/lib/firebase';
import type { AgencyApplication as AgencyApplicationFormData, RigRegistration as RigRegistrationFormData, OwnerInfo } from '@/lib/schemas';
import { useAuth } from './useAuth';
import { toast } from './use-toast';
import { useDataStore } from './use-data-store'; // Import the central store hook

const db = getFirestore(app);

// Type definitions that include the ID and handle Date objects
export type RigRegistration = RigRegistrationFormData & { id: string };
export type AgencyApplication = Omit<AgencyApplicationFormData, 'rigs'> & {
  id: string;
  rigs: RigRegistration[];
  createdAt?: Date;
  updatedAt?: Date;
};

export function useAgencyApplications() {
  const { user } = useAuth();
  const { allAgencyApplications, isLoading: dataStoreLoading } = useDataStore(); // Use the central store

  const addApplication = useCallback(async (applicationData: Omit<AgencyApplication, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user) throw new Error("User must be logged in to add an application.");
    if (!user.officeLocation) throw new Error("User must have an office location.");

    const payload = {
        ...applicationData,
        officeLocation: user.officeLocation,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };
    const collectionPath = `offices/${user.officeLocation.toLowerCase()}/agencyApplications`;
    await addDoc(collection(db, collectionPath), payload);
  }, [user]);

  const updateApplication = useCallback(async (id: string, applicationData: Partial<AgencyApplication>) => {
    if (!user) throw new Error("User must be logged in to update an application.");
    if (!user.officeLocation) throw new Error("User must have an office location.");
    
    const collectionPath = `offices/${user.officeLocation.toLowerCase()}/agencyApplications`;
    const docRef = doc(db, collectionPath, id);
    const payload = {
        ...applicationData,
        updatedAt: serverTimestamp(),
    };
    if ('id' in payload) {
      delete (payload as any).id;
    }
    
    await updateDoc(docRef, payload);
  }, [user]);
  
  const deleteApplication = useCallback(async (id: string) => {
    if (!user || (user.role !== 'admin' && user.role !== 'engineer')) {
        toast({ title: "Permission Denied", description: "You don't have permission to delete applications.", variant: "destructive" });
        return;
    }
    if (!user.officeLocation) throw new Error("User must have an office location.");
    const collectionPath = `offices/${user.officeLocation.toLowerCase()}/agencyApplications`;
    const docRef = doc(db, collectionPath, id);
    await deleteDoc(docRef);
  }, [user, toast]);
  
  return { 
    applications: allAgencyApplications, 
    isLoading: dataStoreLoading, 
    addApplication, 
    updateApplication, 
    deleteApplication 
  };
}

// Re-exporting types for convenience in other files
export type { OwnerInfo };
