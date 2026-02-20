
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
} from "firebase/firestore";
import { getStorage, ref as storageRef, deleteObject } from "firebase/storage"; 
import { app } from "@/lib/firebase";
import { useAuth } from './useAuth';
import { useDataStore } from './use-data-store'; // Import the central store hook

const db = getFirestore(app);
const storage = getStorage(app);

const sanitizeStaffMemberForFirestore = (data: any): any => {
  const sanitized: any = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key) && !['isTransferred', 'place', 'id', 'createdAt', 'updatedAt'].includes(key)) {
      const value = data[key];
      if (value instanceof Date) sanitized[key] = value; // Keep as Date object for serverTimestamp
      else if (value === undefined) sanitized[key] = null;
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
}


export function useStaffMembers(): StaffMembersState {
  const { user } = useAuth();
  const { allStaffMembers, isLoading: dataStoreLoading } = useDataStore();
  
  const addStaffMember = useCallback(async (staffData: StaffMemberFormData): Promise<string | undefined> => {
    if (!user || user.role !== 'admin') throw new Error("User does not have permission.");
    if (!user.officeLocation) throw new Error("User has no office location.");
    const collectionPath = `offices/${user.officeLocation.toLowerCase()}/staffMembers`;
    const payload = { ...sanitizeStaffMemberForFirestore(staffData), officeLocation: user.officeLocation, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    const docRef = await addDoc(collection(db, collectionPath), payload);
    return docRef.id;
  }, [user]);

  const updateStaffMember = useCallback(async (id: string, staffData: Partial<StaffMemberFormData>) => {
    if (!user || user.role !== 'admin') throw new Error("User does not have permission.");
    if (!user.officeLocation) throw new Error("User has no office location.");
    const collectionPath = `offices/${user.officeLocation.toLowerCase()}/staffMembers`;
    const staffDocRef = doc(db, collectionPath, id);
    const existingMember = allStaffMembers.find(s => s.id === id);

    if (staffData.photoUrl === "" && existingMember?.photoUrl && existingMember.photoUrl.includes("firebasestorage.googleapis.com")) { 
      try { await deleteObject(storageRef(storage, existingMember.photoUrl)); } catch (e) { console.warn("Failed to delete old photo:", e); }
    }
    const payload = { ...sanitizeStaffMemberForFirestore(staffData), updatedAt: serverTimestamp() };
    delete payload.createdAt;
    await updateDoc(staffDocRef, payload);
  }, [user, allStaffMembers]);

  const deleteStaffMember = useCallback(async (id: string) => {
    if (!user || user.role !== 'admin') throw new Error("User does not have permission.");
    if (!user.officeLocation) throw new Error("User has no office location.");
    const collectionPath = `offices/${user.officeLocation.toLowerCase()}/staffMembers`;
    const staffDocRef = doc(db, collectionPath, id);
    const staffMemberToDelete = allStaffMembers.find(s => s.id === id);
    if (staffMemberToDelete?.photoUrl && staffMemberToDelete.photoUrl.includes("firebasestorage.googleapis.com")) { 
      try { await deleteObject(storageRef(storage, staffMemberToDelete.photoUrl)); } catch (e) { console.warn("Failed to delete photo:", e); }
    }
    await deleteDoc(staffDocRef);
  }, [user, allStaffMembers]);

  const getStaffMemberById = useCallback(async (id: string): Promise<StaffMember | undefined> => {
     if (!user || !user.isApproved || !user.officeLocation) throw new Error("User not approved to fetch details.");
    const collectionPath = `offices/${user.officeLocation.toLowerCase()}/staffMembers`;
    const docSnap = await getDoc(doc(db, collectionPath, id));
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as StaffMember : undefined;
  }, [user]);

  const updateStaffStatus = useCallback(async (id: string, newStatus: StaffStatusType) => {
    if (!user || user.role !== 'admin') throw new Error("User does not have permission.");
    if (!user.officeLocation) throw new Error("User has no office location.");
    const collectionPath = `offices/${user.officeLocation.toLowerCase()}/staffMembers`;
    const staffDocRef = doc(db, collectionPath, id);
    await updateDoc(staffDocRef, { status: newStatus, updatedAt: serverTimestamp() });
  }, [user]);

  return { 
    staffMembers: allStaffMembers, 
    isLoading: dataStoreLoading, 
    addStaffMember, 
    updateStaffMember, 
    deleteStaffMember, 
    getStaffMemberById, 
    updateStaffStatus 
  };
}
