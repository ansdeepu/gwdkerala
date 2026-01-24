// src/app/dashboard/super-admin/user-management/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth, type UserProfile } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { SUPER_ADMIN_EMAIL } from '@/lib/config';

const Loader = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);

const NewOfficeUserSchema = z.object({
  officeLocation: z.string().min(2, "Office Location is required."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match.",
  path: ["confirmPassword"],
});

type NewOfficeUserFormData = z.infer<typeof NewOfficeUserSchema>;

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
      <DialogHeader>
        <DialogTitle>Create New Directorate User</DialogTitle>
        <DialogDescription>
          This will create a new user account with 'viewer' permissions.
        </DialogDescription>
      </DialogHeader>
      <div className="py-4">
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


export default function SuperAdminUserManagementPage() {
  const { fetchAllUsers, createOfficeAdmin, createDirectorateUser, deleteUserDocument } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOfficeUserDialogOpen, setIsOfficeUserDialogOpen] = useState(false);
  const [isDirectorateUserDialogOpen, setIsDirectorateUserDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const officeUserForm = useForm<NewOfficeUserFormData>({
    resolver: zodResolver(NewOfficeUserSchema),
    defaultValues: { officeLocation: "", email: "", password: "", confirmPassword: "" },
  });

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const allUsers = await fetchAllUsers();
      setUsers(allUsers);
    } catch (error: any) {
      toast({ title: "Error", description: `Could not load users: ${error.message}`, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [fetchAllUsers, toast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const { officeAdmins, directorateUsers } = useMemo(() => {
    const admins = users.filter(u => u.role === 'editor' && u.email !== SUPER_ADMIN_EMAIL);
    const others = users.filter(u => (u.role === 'viewer' || u.role === 'supervisor') && u.email !== SUPER_ADMIN_EMAIL);
    return { officeAdmins: admins, directorateUsers: others };
  }, [users]);

  const handleCreateOfficeUser = async (data: NewOfficeUserFormData) => {
    setIsSubmitting(true);
    try {
      const nameFromEmail = data.email.split('@')[0];
      const result = await createOfficeAdmin(data.email, data.password, nameFromEmail, data.officeLocation);
      if (result.success) {
        toast({ title: "User Created", description: `Account for ${nameFromEmail} has been created.` });
        setIsOfficeUserDialogOpen(false);
        officeUserForm.reset();
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
              <CardTitle>District/Sub-Office Admins</CardTitle>
              <CardDescription>Create and manage administrator accounts for sub-offices.</CardDescription>
            </div>
            <Button onClick={() => setIsOfficeUserDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4"/> Create New Office User</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Office Location</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center h-24"><Loader className="mx-auto h-6 w-6 animate-spin"/></TableCell></TableRow>
              ) : officeAdmins.length > 0 ? (
                officeAdmins.map(user => (
                  <TableRow key={user.uid}>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.officeLocation}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell className="text-right">
                       <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive"/></Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={4} className="text-center h-24">No office users found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Directorate Users</CardTitle>
              <CardDescription>Create and manage users for the directorate office.</CardDescription>
            </div>
            <Button onClick={() => setIsDirectorateUserDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4"/> Create New Directorate User</Button>
          </div>
        </CardHeader>
        <CardContent>
           <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center h-24"><Loader className="mx-auto h-6 w-6 animate-spin"/></TableCell></TableRow>
              ) : directorateUsers.length > 0 ? (
                directorateUsers.map(user => (
                  <TableRow key={user.uid}>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell><span className="capitalize">{user.role}</span></TableCell>
                    <TableCell className="text-right">
                       <Button variant="ghost" size="icon" disabled><Trash2 className="h-4 w-4 text-destructive"/></Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={4} className="text-center h-24">No directorate users found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isOfficeUserDialogOpen} onOpenChange={setIsOfficeUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Office User</DialogTitle>
            <DialogDescription>
              This will create a new administrator account for a specific office location.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Form {...officeUserForm}>
              <form onSubmit={officeUserForm.handleSubmit(handleCreateOfficeUser)} className="space-y-4">
                <FormField name="officeLocation" control={officeUserForm.control} render={({ field }) => (
                  <FormItem><FormLabel>Office Location</FormLabel><FormControl><Input placeholder="e.g., Kollam" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                 <FormField name="email" control={officeUserForm.control} render={({ field }) => (
                  <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="user@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                 <FormField name="password" control={officeUserForm.control} render={({ field }) => (
                  <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField name="confirmPassword" control={officeUserForm.control} render={({ field }) => (
                  <FormItem><FormLabel>Confirm Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsOfficeUserDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader className="mr-2 h-4 w-4 animate-spin"/>}
                    Create User
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>
      
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
