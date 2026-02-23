
// src/hooks/useStaffMembers.ts
"use client";

import type { StaffMember, StaffMemberFormData, Designation, StaffStatusType } from "@/lib/schemas"; 
import { designationOptions } from "@/lib/schemas";
import { useState, useEffect, useCallback } from "react";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
  getDoc,
  writeBatch,
  setDoc,
  getDocs,
  query,
  where
} from "firebase/firestore";
import { getStorage, ref as storageRef, deleteObject } from "firebase/storage"; 
import { app } from "@/lib/firebase";
import { useAuth, type UserProfile } from './useAuth';
import { useDataStore } from './use-data-store'; 
import { toast } from "./use-toast";

const db = getFirestore(app);
const storage = getStorage(app);

const sanitizeStaffMemberForFirestore = (data: any): any => {
  const sanitized: any = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key) && !['createUserAccount', 'password', 'id', 'createdAt', 'updatedAt', 'officeLocationFromPath'].includes(key)) {
      const value = data[key];
      if (value instanceof Date) sanitized[key] = value; 
      else if (value === undefined || value === "") sanitized[key] = null;
      else sanitized[key] = value;
    }
  }
  return sanitized;
};

interface StaffMembersState {
  staffMembers: StaffMember[];
  isLoading: boolean;
  addStaffMember: (staffData: StaffMemberFormData) => Promise<string | undefined>; 
  updateStaffMember: (id: string, staffData: Partial<StaffMemberFormData>) => Promise<void>; 
  deleteStaffMember: (id: string, staffName: string) => Promise<void>;
  getStaffMemberById: (id: string) => Promise<StaffMember | undefined>;
  updateStaffStatus: (id: string, newStatus: StaffStatusType) => Promise<void>; 
  approveTransfer: (id: string, currentOffice: string, targetOffice: string) => Promise<void>;
  cancelTransfer: (id: string) => Promise<void>;
}


export function useStaffMembers(): StaffMembersState {
  const { user } = useAuth();
  const { allStaffMembers, isLoading: dataStoreLoading, selectedOffice } = useDataStore();
  
  const addStaffMember = useCallback(async (staffData: StaffMemberFormData): Promise<string | undefined> => {
    if (!user || (user.role !== 'admin' && user.role !== 'superAdmin')) throw new Error("User does not have permission.");
    const officeLocation = user.role === 'superAdmin' ? selectedOffice : user.officeLocation;
    if (!officeLocation) throw new Error("An office location must be selected to add staff.");

    const collectionPath = `offices/${officeLocation.toLowerCase()}/staffMembers`;
    const payload = { 
        ...sanitizeStaffMemberForFirestore(staffData), 
        officeLocation: officeLocation.toLowerCase(), 
        createdAt: serverTimestamp(), 
        updatedAt: serverTimestamp() 
    };
    const docRef = await addDoc(collection(db, collectionPath), payload);
    return docRef.id;
  }, [user, selectedOffice]);

  const updateStaffMember = useCallback(async (id: string, staffData: Partial<StaffMemberFormData>) => {
    if (!user || (user.role !== 'admin' && user.role !== 'superAdmin')) throw new Error("User does not have permission.");
    
    const memberToUpdate = allStaffMembers.find(s => s.id === id);
    if (!memberToUpdate) throw new Error("Staff member not found.");

    const currentOffice = (memberToUpdate as any).officeLocationFromPath || memberToUpdate.officeLocation || user.officeLocation;
    if (!currentOffice) throw new Error("Could not determine current office location.");

    const isSuperAdmin = user.role === 'superAdmin';
    const targetOffice = staffData.officeLocation?.toLowerCase();
    const isRequestingMove = targetOffice && targetOffice !== currentOffice.toLowerCase();

    // Logic for initiating or completing a move
    if (isRequestingMove) {
        if (!isSuperAdmin) {
            // Sub-Admins only mark as "Pending Transfer"
            const docRef = doc(db, `offices/${currentOffice.toLowerCase()}/staffMembers`, id);
            await updateDoc(docRef, {
                ...sanitizeStaffMemberForFirestore(staffData),
                status: 'Pending Transfer',
                targetOffice: targetOffice, // Store destination metadata for super admin
                updatedAt: serverTimestamp(),
            });
            toast({ title: "Transfer Initiated", description: `Transfer request to ${staffData.officeLocation} sent for Super Admin approval.` });
        } else {
            // Super Admin can bypass the workflow and move immediately if they want
            const batch = writeBatch(db);
            const oldDocRef = doc(db, `offices/${currentOffice.toLowerCase()}/staffMembers`, id);
            const newDocRef = doc(collection(db, `offices/${targetOffice}/staffMembers`));

            const newDocData = {
                ...memberToUpdate,
                ...sanitizeStaffMemberForFirestore(staffData),
                status: 'Active',
                officeLocation: targetOffice,
                updatedAt: serverTimestamp(),
            };
            delete (newDocData as any).id;
            delete (newDocData as any).officeLocationFromPath;
            delete (newDocData as any).createdAt;
            delete (newDocData as any).targetOffice;

            batch.set(newDocRef, { ...newDocData, createdAt: serverTimestamp() });
            batch.update(oldDocRef, { status: 'Transferred', updatedAt: serverTimestamp() });

            // Update linked user
            const usersRef = collection(db, 'users');
            const qUser = query(usersRef, where('staffId', '==', id));
            const userDocs = await getDocs(qUser);
            userDocs.forEach(uDoc => {
                batch.update(uDoc.ref, { officeLocation: targetOffice });
                const oldOfficeUserRef = doc(db, `offices/${currentOffice.toLowerCase()}/users`, uDoc.id);
                batch.delete(oldOfficeUserRef);
                const newOfficeUserRef = doc(db, `offices/${targetOffice}/users`, uDoc.id);
                batch.set(newOfficeUserRef, { ...uDoc.data(), officeLocation: targetOffice, updatedAt: serverTimestamp() });
            });

            await batch.commit();
            toast({ title: "Staff Transferred", description: `Record moved to ${staffData.officeLocation}.` });
        }
    } else {
        // Standard update within the same office
        const staffDocRef = doc(db, `offices/${currentOffice.toLowerCase()}/staffMembers`, id);
        const payload = { ...sanitizeStaffMemberForFirestore(staffData), updatedAt: serverTimestamp() };
        delete (payload as any).createdAt;
        delete (payload as any).officeLocationFromPath;
        await updateDoc(staffDocRef, payload);
    }
  }, [user, allStaffMembers, selectedOffice]);

  const approveTransfer = useCallback(async (id: string, currentOffice: string, targetOffice: string) => {
    if (!user || user.role !== 'superAdmin') throw new Error("Permission denied.");
    
    const memberToUpdate = allStaffMembers.find(s => s.id === id);
    if (!memberToUpdate) throw new Error("Staff member not found.");

    const batch = writeBatch(db);
    const oldDocRef = doc(db, `offices/${currentOffice.toLowerCase()}/staffMembers`, id);
    const newDocRef = doc(collection(db, `offices/${targetOffice.toLowerCase()}/staffMembers`));

    // 1. Create Active record in new office
    const newDocData = {
        ...memberToUpdate,
        status: 'Active',
        officeLocation: targetOffice.toLowerCase(),
        updatedAt: serverTimestamp(),
    };
    delete (newDocData as any).id;
    delete (newDocData as any).officeLocationFromPath;
    delete (newDocData as any).createdAt;
    delete (newDocData as any).targetOffice;

    batch.set(newDocRef, { ...newDocData, createdAt: serverTimestamp() });

    // 2. Mark old record as Transferred
    batch.update(oldDocRef, { 
        status: 'Transferred', 
        updatedAt: serverTimestamp() 
    });

    // 3. Update linked user
    const usersRef = collection(db, 'users');
    const qUser = query(usersRef, where('staffId', '==', id));
    const userDocs = await getDocs(qUser);
    userDocs.forEach(uDoc => {
        batch.update(uDoc.ref, { officeLocation: targetOffice.toLowerCase() });
        const oldOfficeUserRef = doc(db, `offices/${currentOffice.toLowerCase()}/users`, uDoc.id);
        batch.delete(oldOfficeUserRef);
        const newOfficeUserRef = doc(db, `offices/${targetOffice.toLowerCase()}/users`, uDoc.id);
        batch.set(newOfficeUserRef, { ...uDoc.data(), officeLocation: targetOffice.toLowerCase(), updatedAt: serverTimestamp() });
    });

    await batch.commit();
    toast({ title: "Transfer Approved", description: `Staff member moved to ${targetOffice}.` });
  }, [user, allStaffMembers]);

  const cancelTransfer = useCallback(async (id: string) => {
    if (!user || user.role !== 'superAdmin') throw new Error("Permission denied.");
    const member = allStaffMembers.find(s => s.id === id);
    if (!member) return;

    const currentOffice = (member as any).officeLocationFromPath || member.officeLocation;
    if (!currentOffice) throw new Error("Office location not found.");

    const docRef = doc(db, `offices/${currentOffice.toLowerCase()}/staffMembers`, id);
    await updateDoc(docRef, {
        status: 'Active',
        targetOffice: null,
        updatedAt: serverTimestamp(),
    });
    toast({ title: "Transfer Cancelled", description: `Transfer request for ${member.name} has been cancelled.` });
  }, [user, allStaffMembers]);

  const deleteStaffMember = useCallback(async (id: string) => {
    if (!user || (user.role !== 'admin' && user.role !== 'superAdmin')) throw new Error("User does not have permission.");
    const memberToDelete = allStaffMembers.find(s => s.id === id);
    if (!memberToDelete) return;

    const officeLocation = (memberToDelete as any).officeLocationFromPath || memberToDelete.officeLocation;
    if (!officeLocation) throw new Error("Could not determine office location for the staff member to delete.");

    const collectionPath = `offices/${officeLocation.toLowerCase()}/staffMembers`;
    const staffDocRef = doc(db, collectionPath, id);
    if (memberToDelete?.photoUrl && memberToDelete.photoUrl.includes("firebasestorage.googleapis.com")) { 
      try { await deleteObject(storageRef(storage, memberToDelete.photoUrl)); } catch (e) { console.warn("Failed to delete photo:", e); }
    }
    await deleteDoc(staffDocRef);
  }, [user, allStaffMembers]);

  const getStaffMemberById = useCallback(async (id: string): Promise<StaffMember | undefined> => {
     if (!user || !user.isApproved) throw new Error("User not approved to fetch details.");
     const member = allStaffMembers.find(s => s.id === id);
     if (!member) return undefined;

     const officeLocation = (member as any).officeLocationFromPath || member.officeLocation;
     if (!officeLocation) return undefined;

    const collectionPath = `offices/${officeLocation.toLowerCase()}/staffMembers`;
    const docSnap = await getDoc(doc(db, collectionPath, id));
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as StaffMember : undefined;
  }, [user, allStaffMembers]);

  const updateStaffStatus = useCallback(async (id: string, newStatus: StaffStatusType) => {
    if (!user || (user.role !== 'admin' && user.role !== 'superAdmin')) throw new Error("User does not have permission.");
    const memberToUpdate = allStaffMembers.find(s => s.id === id);
    if (!memberToUpdate) return;

    const officeLocation = (memberToUpdate as any).officeLocationFromPath || memberToUpdate.officeLocation;
    if (!officeLocation) return;

    const staffDocRef = doc(db, `offices/${officeLocation.toLowerCase()}/staffMembers`, id);
    await updateDoc(staffDocRef, { 
        status: newStatus,
        updatedAt: serverTimestamp() 
    });
  }, [user, allStaffMembers]);

  return { 
    staffMembers: allStaffMembers, 
    isLoading: dataStoreLoading, 
    addStaffMember, 
    updateStaffMember, 
    deleteStaffMember, 
    getStaffMemberById, 
    updateStaffStatus,
    approveTransfer,
    cancelTransfer
  };
}
