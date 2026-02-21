// src/app/dashboard/user-management/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import UserManagementTable from "@/components/admin/UserManagementTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth, type UserProfile } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { usePageHeader } from "@/hooks/usePageHeader";
import { Loader2, ShieldAlert } from 'lucide-react';
import { useDataStore } from "@/hooks/use-data-store";
import { getFirestore, collection, query, onSnapshot, Timestamp } from "firebase/firestore";
import { app } from "@/lib/firebase";

const db = getFirestore(app);

export const dynamic = 'force-dynamic';

export default function UserManagementPage() {
  const { setHeader } = usePageHeader();
  const { user, isLoading, updateUserApproval, updateUserRole, deleteUserDocument } = useAuth();
  const { allStaffMembers, isLoading: staffLoading } = useDataStore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  const isSuperAdmin = user?.role === 'superAdmin';
  const isAdmin = user?.role === 'admin';
  const isViewer = user?.role === 'viewer';
  const canManageUsers = isAdmin || isSuperAdmin;

  useEffect(() => {
    if (!user || !user.isApproved || !['superAdmin', 'admin', 'viewer'].includes(user.role) || !user.officeLocation) {
      setUsersLoading(false);
      return;
    }
    
    setUsersLoading(true);
    // Fetch users from the office-specific sub-collection as requested
    const usersSubCollectionPath = `offices/${user.officeLocation.toLowerCase()}/users`;
    const q = query(collection(db, usersSubCollectionPath));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const usersList: UserProfile[] = [];
       querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        usersList.push({
          uid: docSnap.id,
          email: data.email || null,
          name: data.name || undefined,
          role: data.role || 'viewer',
          isApproved: data.isApproved === true,
          staffId: data.staffId || undefined,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : undefined,
          lastActiveAt: data.lastActiveAt instanceof Timestamp ? data.lastActiveAt.toDate() : undefined,
          officeLocation: data.officeLocation || user.officeLocation,
        });
      });
      setAllUsers(usersList);
      setUsersLoading(false);
    }, (error) => {
      console.error("Failed to fetch office users:", error);
      toast({ title: "Error Loading Users", description: "Could not load office-specific user data.", variant: "destructive" });
      setUsersLoading(false);
    });

    return () => unsubscribe();
  }, [user, toast]);


  useEffect(() => {
    setHeader('User Management', `Manage user accounts for the ${user?.officeLocation} office.`);
  }, [setHeader, user?.officeLocation]);


  useEffect(() => {
    if (!isLoading && user && !['superAdmin', 'admin', 'viewer'].includes(user.role)) {
      router.push('/dashboard');
    }
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || staffLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !['superAdmin', 'admin', 'viewer'].includes(user.role)) {
    return (
      <div className="space-y-6 p-6 text-center">
        <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Access Denied</h1>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-xl border-border/60">
        <CardHeader>
          <CardTitle className="text-xl">Registered Users ({allUsers.length})</CardTitle>
          <CardDescription>
            User accounts for the {user.officeLocation} office. {isAdmin && "Admin, Scientist, and Engineer roles can only be modified by a Super Admin."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserManagementTable
            users={allUsers}
            isLoading={usersLoading}
            onDataChange={() => {}} // Data reloads via onSnapshot
            currentUser={user}
            isViewer={isViewer}
            updateUserApproval={updateUserApproval}
            updateUserRole={updateUserRole}
            deleteUserDocument={deleteUserDocument}
            staffMembers={allStaffMembers}
          />
        </CardContent>
      </Card>
    </div>
  );
}
