// src/app/dashboard/user-management/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import UserManagementTable from "@/components/admin/UserManagementTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth, type UserProfile } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import NewUserForm from "@/components/admin/NewUserForm";
import type { NewUserByAdminFormData } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import { usePageHeader } from "@/hooks/usePageHeader";
import { Loader2, UserPlus, ShieldAlert } from 'lucide-react';
import { useDataStore } from "@/hooks/use-data-store";
import { getFirestore, collection, query, where, onSnapshot, Timestamp } from "firebase/firestore";
import { app } from "@/lib/firebase";

const db = getFirestore(app);

export const dynamic = 'force-dynamic';

export default function UserManagementPage() {
  const { setHeader } = usePageHeader();
  const { user, isLoading, createUserByAdmin, updateUserApproval, updateUserRole, deleteUserDocument } = useAuth();
  const { allStaffMembers, isLoading: staffLoading } = useDataStore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isStaffFormOpen, setIsStaffFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  const canManage = user?.role === 'editor';
  const isViewer = user?.role === 'viewer';

  useEffect(() => {
    if (!user || !user.isApproved || !['editor', 'viewer'].includes(user.role) || !user.officeLocation) {
      setUsersLoading(false);
      return;
    }
    setUsersLoading(true);
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
          officeLocation: data.officeLocation || user.officeLocation, // ensure officeLocation is present
        });
      });
      setAllUsers(usersList);
      setUsersLoading(false);
    }, (error) => {
      console.error("Failed to fetch users:", error);
      toast({ title: "Error Loading Users", description: "Could not load user data. Please try again.", variant: "destructive" });
      setUsersLoading(false);
    });

    return () => unsubscribe();
  }, [user, toast]);


  useEffect(() => {
    setHeader('User Management', `Manage user accounts for the ${user?.officeLocation} office.`);
  }, [setHeader, user?.officeLocation]);


  useEffect(() => {
    if (!isLoading && user && !['editor', 'viewer'].includes(user.role)) {
      router.push('/dashboard');
    }
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  const handleStaffFormSubmit = async (data: NewUserByAdminFormData) => {
    setIsSubmitting(true);
    try {
      const selectedStaffMember = allStaffMembers.find(s => s.id === data.staffId);
      if (!selectedStaffMember) {
        toast({ title: "Error", description: "Selected staff member not found.", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }
      if (!user?.officeLocation) {
        toast({ title: "Error", description: "Your admin account is not associated with an office location.", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }

      const result = await createUserByAdmin(data.email, data.password, selectedStaffMember.name, data.staffId, user.officeLocation);
      if (result.success) {
        toast({
          title: "User Created",
          description: `Account for ${data.email} has been successfully created and is pending approval.`,
        });
        setIsStaffFormOpen(false);
      } else {
        toast({
          title: "Creation Failed",
          description: result.error?.message || "Could not create the user account.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
       toast({
          title: "Error",
          description: error.message || "An unexpected error occurred.",
          variant: "destructive",
        });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || staffLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading permissions...</p>
      </div>
    );
  }

  if (!user || !['editor', 'viewer'].includes(user.role)) {
    return (
      <div className="space-y-6 p-6 text-center">
        <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Access Denied</h1>
        <p className="text-muted-foreground">
          You do not have permission to access this page or you are not logged in.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {canManage && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Button onClick={() => setIsStaffFormOpen(true)}>
                  <UserPlus className="mr-2 h-5 w-5" /> Add New User (from Staff)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-xl border-border/60">
        <CardHeader>
          <CardTitle className="text-xl">Registered Users ({allUsers.length})</CardTitle>
          <CardDescription>
            A list of all user accounts in the {user.officeLocation} office.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserManagementTable
            key={allUsers.length} // Force re-render when users change
            users={allUsers}
            isLoading={usersLoading}
            onDataChange={() => {}}
            currentUser={user}
            isViewer={isViewer}
            updateUserApproval={updateUserApproval}
            updateUserRole={updateUserRole}
            deleteUserDocument={deleteUserDocument}
            staffMembers={allStaffMembers}
          />
        </CardContent>
      </Card>

      <Dialog open={isStaffFormOpen} onOpenChange={setIsStaffFormOpen}>
        <DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="max-w-2xl flex flex-col p-0 h-auto">
              <NewUserForm
                  staffMembers={allStaffMembers}
                  staffLoading={staffLoading}
                  onSubmit={handleStaffFormSubmit}
                  isSubmitting={isSubmitting}
                  onCancel={() => setIsStaffFormOpen(false)}
              />
        </DialogContent>
      </Dialog>
    </div>
  );
}
