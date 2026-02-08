
// src/hooks/useAuth.ts
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
  onAuthStateChanged,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword as firebaseUpdatePassword,
  updateProfile as firebaseUpdateProfile,
} from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, updateDoc, deleteDoc, Timestamp, query, where, writeBatch, serverTimestamp } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { type UserRole, type Designation } from '@/lib/schemas';
import { useToast } from "@/hooks/use-toast"; 
import { SUPER_ADMIN_EMAIL } from '@/lib/config';

const auth = getAuth(app);
const db = getFirestore(app);

export interface UserProfile {
  uid: string;
  email: string | null;
  name?: string;
  role: UserRole;
  isApproved: boolean;
  staffId?: string;
  designation?: Designation;
  officeLocation?: string; 
  createdAt?: Date;
  lastActiveAt?: Date;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthenticating: boolean;
  user: UserProfile | null;
  firebaseUser: FirebaseUser | null;
}

export const updateUserLastActive = async (uid: string): Promise<void> => {
  if (!uid) return;
  const userDocRef = doc(db, "users", uid);
  try {
    await updateDoc(userDocRef, { lastActiveAt: Timestamp.now() });
  } catch (error) {}
};


export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    isAuthenticating: false,
    user: null,
    firebaseUser: null,
  });
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true; 
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isMounted) return;

      if (!firebaseUser) {
        setAuthState({ isAuthenticated: false, isLoading: false, isAuthenticating: false, user: null, firebaseUser: null });
        return;
      }

      try {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        let userProfile: UserProfile | null = null;
        const isAdminByEmail = firebaseUser.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

        if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            const isApproved = isAdminByEmail || userData.isApproved === true;

            userProfile = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                name: userData.name ? String(userData.name) : undefined,
                role: isAdminByEmail ? 'editor' : (userData.role || 'viewer'),
                isApproved: isApproved,
                staffId: userData.staffId || undefined,
                officeLocation: userData.officeLocation,
                createdAt: userData.createdAt instanceof Timestamp ? userData.createdAt.toDate() : new Date(),
                lastActiveAt: userData.lastActiveAt instanceof Timestamp ? userData.lastActiveAt.toDate() : undefined,
            };
        } else if (isAdminByEmail) {
            userProfile = {
                uid: firebaseUser.uid, email: firebaseUser.email, name: firebaseUser.email?.split('@')[0],
                role: 'editor', isApproved: true,
                createdAt: new Date(),
            };
            await setDoc(doc(db, "users", firebaseUser.uid), {
                email: firebaseUser.email, name: userProfile.name, role: 'editor', isApproved: true, createdAt: Timestamp.now(),
            });
        }
        
        if (!isMounted) return;

        if (userProfile && userProfile.isApproved) {
            setAuthState({ isAuthenticated: true, isLoading: false, isAuthenticating: false, user: userProfile, firebaseUser });
        } else {
             if (auth.currentUser) {
                try { await signOut(auth); } catch (signOutError) {}
            }
            setAuthState({ isAuthenticated: false, isLoading: false, isAuthenticating: false, user: userProfile, firebaseUser: null });
            
            if (userProfile && !userProfile.isApproved) {
                toast({
                    title: "Account Pending Approval",
                    description: "Your account is not yet approved. Contact administrator for activation.",
                    variant: "destructive",
                });
            }
        }
      } catch (error: any) {
        console.error('[Auth] Error:', error);
        if (isMounted) {
            setAuthState({ isAuthenticated: false, isLoading: false, isAuthenticating: false, user: null, firebaseUser: null });
        }
      }
    });

    return () => { isMounted = false; unsubscribe(); };
  }, [toast]);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: any }> => {
    setAuthState(prevState => ({ ...prevState, isAuthenticating: true }));
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { success: true };
    } catch (error: any) {
      setAuthState(prevState => ({ ...prevState, isAuthenticating: false }));
      return { success: false, error: error };
    }
  }, []);

  const createUserByAdmin = useCallback(async (email: string, password: string, name: string, staffId: string, officeLocation: string): Promise<{ success: boolean; error?: any }> => {
    if (!authState.user || authState.user.role !== 'editor') {
      return { success: false, error: { message: "Permission denied." } };
    }
  
    const tempAppName = `temp-app-${Date.now()}`;
    const tempApp = initializeApp(app.options, tempAppName);
    const tempAuth = getAuth(tempApp);
  
    try {
      const userCredential = await createUserWithEmailAndPassword(tempAuth, email, password);
      const newFirebaseUser = userCredential.user;
  
      const userProfileData = {
        email: newFirebaseUser.email,
        name: name,
        staffId: staffId,
        officeLocation: officeLocation.toLowerCase(),
        role: 'viewer' as UserRole,
        isApproved: false,
        createdAt: Timestamp.now(),
        lastActiveAt: Timestamp.now(),
      };
      
      const batch = writeBatch(db);
      
      // Source of truth for Auth and Security Rules
      batch.set(doc(db, "users", newFirebaseUser.uid), userProfileData);
      
      // Office-specific list for the sub-office admin
      batch.set(doc(db, `offices/${officeLocation.toLowerCase()}/users`, newFirebaseUser.uid), userProfileData);
  
      await batch.commit();
      await signOut(tempAuth);
      await deleteApp(tempApp);
  
      return { success: true };
    } catch (error: any) {
      await deleteApp(tempApp).catch(() => {});
      return { success: false, error };
    }
  }, [authState.user]);
  
  const createOfficeAdmin = useCallback(async (email: string, password: string, name: string, officeLocation: string): Promise<{ success: boolean; error?: any }> => {
    if (!authState.user || authState.user.email !== SUPER_ADMIN_EMAIL) {
      return { success: false, error: { message: "Permission denied." } };
    }

    const tempAppName = `temp-office-admin-${Date.now()}`;
    const tempApp = initializeApp(app.options, tempAppName);
    const tempAuth = getAuth(tempApp);

    try {
      const userCredential = await createUserWithEmailAndPassword(tempAuth, email, password);
      const newFirebaseUser = userCredential.user;

      const userProfileData = {
        email: newFirebaseUser.email,
        name: name,
        officeLocation: officeLocation.toLowerCase(),
        role: 'editor' as UserRole,
        isApproved: true,
        createdAt: Timestamp.now(),
        lastActiveAt: Timestamp.now(),
      };
      
      const batch = writeBatch(db);
      batch.set(doc(db, "users", newFirebaseUser.uid), userProfileData);
      batch.set(doc(db, `offices/${officeLocation.toLowerCase()}/users`, newFirebaseUser.uid), userProfileData);
      
      await batch.commit();
      await signOut(tempAuth);
      await deleteApp(tempApp);

      return { success: true };
    } catch (error: any) {
      await deleteApp(tempApp).catch(() => {});
      return { success: false, error };
    }
  }, [authState.user]);

  const createDirectorateUser = useCallback(async (email: string, password: string, name: string): Promise<{ success: boolean; error?: any }> => {
    if (!authState.user || authState.user.email !== SUPER_ADMIN_EMAIL) {
      return { success: false, error: { message: "Permission denied." } };
    }

    const tempAppName = `temp-dir-user-${Date.now()}`;
    const tempApp = initializeApp(app.options, tempAppName);
    const tempAuth = getAuth(tempApp);

    try {
      const userCredential = await createUserWithEmailAndPassword(tempAuth, email, password);
      const newFirebaseUser = userCredential.user;

      const userProfileData = {
        email: newFirebaseUser.email,
        name: name,
        role: 'viewer' as UserRole,
        isApproved: true,
        createdAt: Timestamp.now(),
        lastActiveAt: Timestamp.now(),
      };
      await setDoc(doc(db, "users", newFirebaseUser.uid), userProfileData);

      await signOut(tempAuth);
      await deleteApp(tempApp);

      return { success: true };
    } catch (error: any) {
      await deleteApp(tempApp).catch(() => {});
      return { success: false, error };
    }
  }, [authState.user]);
  
  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("[Auth] Logout error:", error);
    }
  }, [router]);

  const fetchAllUsers = useCallback(async (): Promise<UserProfile[]> => {
    if (!authState.user || (authState.user.role !== 'editor' && authState.user.role !== 'viewer')) {
      return [];
    }
    
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      return querySnapshot.docs.map(docSnap => ({
          uid: docSnap.id,
          ...processFirestoreDoc({ id: docSnap.id, data: () => docSnap.data() })
      } as UserProfile));
    } catch (error: any) {
      throw error;
    }
  }, [authState.user]); 

  const updateUserApproval = useCallback(async (targetUserUid: string, isApproved: boolean, officeLocation?: string): Promise<void> => {
    if (!authState.user || authState.user.role !== 'editor') {
      throw new Error("Permission denied.");
    }
    const batch = writeBatch(db);
    batch.update(doc(db, "users", targetUserUid), { isApproved });
    if (officeLocation) {
        batch.update(doc(db, `offices/${officeLocation.toLowerCase()}/users`, targetUserUid), { isApproved });
    }
    await batch.commit();
  }, [authState.user]);

  const updateUserRole = useCallback(async (targetUserUid: string, newRole: UserRole, staffId?: string, officeLocation?: string): Promise<void> => {
    if (!authState.user || authState.user.role !== 'editor') {
        throw new Error("Permission denied.");
    }
    
    const batch = writeBatch(db);
    const updates: any = { role: newRole };
    if (staffId) updates.staffId = staffId;
    else if (newRole === 'viewer') updates.staffId = null;

    batch.update(doc(db, "users", targetUserUid), updates);
    if (officeLocation) {
        batch.update(doc(db, `offices/${officeLocation.toLowerCase()}/users`, targetUserUid), updates);
    }
    await batch.commit();
  }, [authState.user]);

  const deleteUserDocument = useCallback(async (targetUserUid: string, officeLocation?: string): Promise<void> => {
    if (!authState.user || (authState.user.role !== 'editor' && authState.user.email !== SUPER_ADMIN_EMAIL)) {
      throw new Error("Permission denied.");
    }
    if (authState.user.uid === targetUserUid) {
      throw new Error("You cannot delete yourself.");
    }

    const batch = writeBatch(db);
    batch.delete(doc(db, "users", targetUserUid));
    if (officeLocation) {
        batch.delete(doc(db, `offices/${officeLocation.toLowerCase()}/users`, targetUserUid));
    }
    await batch.commit();
  }, [authState.user]);

  const updatePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: any }> => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser || !firebaseUser.email) {
      return { success: false, error: { message: "No user found." } };
    }

    try {
      const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
      await reauthenticateWithCredential(firebaseUser, credential);
      await firebaseUpdatePassword(firebaseUser, newPassword);
      return { success: true };
    } catch (error: any) {
      return { success: false, error };
    }
  }, []);
  
  const updateUserProfileByAdmin = useCallback(async (targetUserUid: string, data: { name?: string; officeLocation?: string; role?: UserRole; isApproved?: boolean }): Promise<{ success: boolean; error?: any }> => {
    if (authState.user?.email !== SUPER_ADMIN_EMAIL) {
        return { success: false, error: { message: "Permission denied." } };
    }
    try {
        const batch = writeBatch(db);
        const updatePayload: { [key: string]: any } = { ...data };
        if (updatePayload.officeLocation) {
            updatePayload.officeLocation = updatePayload.officeLocation.toLowerCase();
        }
        batch.update(doc(db, "users", targetUserUid), updatePayload);
        if (data.officeLocation) {
            batch.update(doc(db, `offices/${data.officeLocation.toLowerCase()}/users`, targetUserUid), updatePayload);
        }
        await batch.commit();
        return { success: true };
    } catch(error: any) {
        return { success: false, error };
    }
  }, [authState.user]);

  const updateSuperAdminProfile = useCallback(async (newName: string): Promise<{ success: boolean; error?: any }> => {
    if (!auth.currentUser || authState.user?.email !== SUPER_ADMIN_EMAIL) {
      return { success: false, error: { message: "Permission denied." } };
    }

    try {
      await firebaseUpdateProfile(auth.currentUser, { displayName: newName });
      await updateDoc(doc(db, "users", auth.currentUser.uid), { name: newName });
      setAuthState(prev => ({ ...prev, user: prev.user ? { ...prev.user, name: newName } : null }));
      return { success: true };
    } catch (error: any) {
      return { success: false, error };
    }
  }, [authState.user]);

  return { ...authState, login, logout, fetchAllUsers, updateUserApproval, updateUserRole, deleteUserDocument, createUserByAdmin, createOfficeAdmin, createDirectorateUser, updatePassword, updateSuperAdminProfile, updateUserProfileByAdmin };
}

// Utility to convert Firestore Timestamps to JS Dates recursively
const processFirestoreDoc = (data: any): any => {
    if (!data) return data;
    const converted: { [key: string]: any } = {};
    for (const key in data) {
        const value = data[key];
        if (value instanceof Timestamp) {
            converted[key] = value.toDate();
        } else if (Array.isArray(value)) {
            converted[key] = value.map(item => typeof item === 'object' ? processFirestoreDoc(item) : item);
        } else if (typeof value === 'object' && value !== null) {
            converted[key] = processFirestoreDoc(value);
        } else {
            converted[key] = value;
        }
    }
    return converted;
};
