// src/app/dashboard/super-admin/user-management/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, type UserProfile } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, PlusCircle, Trash2, Edit } from 'lucide-react';
import { SUPER_ADMIN_EMAIL } from '@/lib/config';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { userRoleOptions, type UserRole } from '@/lib/schemas';
import UserManagementTable from '@/components/admin/UserManagementTable';
import { useDataStore } from '@/hooks/use-data-store';
import { usePageHeader } from '@/hooks/usePageHeader';

const NewDirectorateUserSchema = z.object({
  name: z.string().min(2, "Name is required."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match.",
  path: ["confirmPassword"],
});

type NewDirectorateUserFormData = z.infer<typeof NewDirectorateUserSchema>;

function NewDirectorateUserForm({ onSubmit, onCancel, isSubmitting }: { onSubmit: (data: NewDirectorateUserFormData) => void, onCancel: () => void, isSubmitting: boolean }) {
  const form = useForm<NewDirectorateUserFormData>({
    resolver: zodResolver(NewDirectorateUserSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  return (
    <DialogContent>
      <DialogHeader className="p-6 pb-4">
        <DialogTitle>Create New Directorate User</DialogTitle>
        <DialogDescription>
          This will create a new user account with 'viewer' permissions.
        </DialogDescription>
      </DialogHeader>
      <div className="px-6 py-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField name="name" control={form.control} render={({ field }) => (
              <FormItem><FormLabel>Name</FormLabel><FormControl><Input placeholder="e.g., John Doe" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField name="email" control={form.control} render={({ field }) => (
              <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="user@example.com" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField name="password" control={form.control} render={({ field }) => (
              <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField name="confirmPassword" control={form.control} render={({ field }) => (
              <FormItem><FormLabel>Confirm Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create User
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </div>
    </DialogContent>
  );
}

export default function DirectorateUserManagementPage() {
  const { setHeader } = usePageHeader();
  const { fetchAllUsers, createDirectorateUser, deleteUserDocument, updateUserProfileByAdmin, user: currentUser } = useAuth();
  const { allStaffMembers } = useDataStore();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDirectorateUserDialogOpen, setIsDirectorateUserDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    setHeader("Directorate User Management", "Create and manage users for the directorate office.");
  }, [setHeader]);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const allUsers = await fetchAllUsers();
      // Filter for users without an officeLocation (Directorate users)
      const directorateOnlyUsers = allUsers.filter(u => !u.officeLocation && u.email !== SUPER_ADMIN_EMAIL);
      setUsers(directorateOnlyUsers);
    } catch (error: any) {
      toast({ title: "Error", description: `Could not load users: ${error.message}`, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [fetchAllUsers, toast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleCreateDirectorateUser = async (data: NewDirectorateUserFormData) => {
    setIsSubmitting(true);
    try {
      const result = await createDirectorateUser(data.email, data.password, data.name);
      if (result.success) {
        toast({ title: "User Created", description: `Account for ${data.name} has been created.` });
        setIsDirectorateUserDialogOpen(false);
        loadUsers();
      } else {
        throw new Error(result.error?.message || "Failed to create user.");
      }
    } catch (error: any) {
      toast({ title: "Error", description: `Could not create user: ${error.message}`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Directorate User Management</CardTitle>
              <CardDescription>Create and manage users for the directorate office.</CardDescription>
            </div>
            <Button onClick={() => setIsDirectorateUserDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4"/> Create New Directorate User</Button>
          </div>
        </CardHeader>
        <CardContent>
           <UserManagementTable
              users={users}
              isLoading={isLoading}
              onDataChange={loadUsers}
              currentUser={currentUser}
              isViewer={false} // Super admin can manage
              updateUserApproval={async () => {}} // Placeholder, will be handled by Edit dialog
              updateUserRole={async () => {}} // Placeholder
              deleteUserDocument={deleteUserDocument}
              staffMembers={allStaffMembers}
           />
        </CardContent>
      </Card>
      
      <Dialog open={isDirectorateUserDialogOpen} onOpenChange={setIsDirectorateUserDialogOpen}>
        <NewDirectorateUserForm 
          onSubmit={handleCreateDirectorateUser} 
          onCancel={() => setIsDirectorateUserDialogOpen(false)} 
          isSubmitting={isSubmitting} 
        />
      </Dialog>
    </div>
  );
}
