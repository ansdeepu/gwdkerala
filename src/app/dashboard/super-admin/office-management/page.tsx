// src/app/dashboard/super-admin/office-management/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth, type UserProfile } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, PlusCircle, Trash2, Edit, Save, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SUPER_ADMIN_EMAIL } from '@/lib/config';
import UserManagementTable from '@/components/admin/UserManagementTable';
import { useDataStore } from '@/hooks/use-data-store';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { app } from '@/lib/firebase';

const db = getFirestore(app);

const districts = ["Thiruvananthapuram", "Kollam", "Pathanamthitta", "Alappuzha", "Kottayam", "Idukki", "Ernakulam", "Thrissur", "Palakkad", "Malappuram", "Kozhikode", "Wayanad", "Kannur", "Kasaragod", "Directorate"];

const NewOfficeUserSchema = z.object({
  name: z.string().min(2, "Name is required."),
  officeLocation: z.string().min(2, "Office Location is required."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match.",
  path: ["confirmPassword"],
});
type NewOfficeUserFormData = z.infer<typeof NewOfficeUserSchema>;

const EditUserSchema = z.object({
  name: z.string().min(2, "Name is required."),
  officeLocation: z.string().optional(),
});
type EditUserFormData = z.infer<typeof EditUserSchema>;

export default function OfficeManagementPage() {
  const { user: currentUser, fetchAllUsers, createOfficeAdmin, deleteUserDocument, updateUserApproval, updateUserRole, updateUserProfileByAdmin } = useAuth();
  const { allStaffMembers } = useDataStore();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOfficeUserDialogOpen, setIsOfficeUserDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userToEdit, setUserToEdit] = useState<UserProfile | null>(null);

  const officeUserForm = useForm<NewOfficeUserFormData>({
    resolver: zodResolver(NewOfficeUserSchema),
    defaultValues: { name: "", officeLocation: "", email: "", password: "", confirmPassword: "" },
  });

  const editUserForm = useForm<EditUserFormData>({
    resolver: zodResolver(EditUserSchema),
  });

  useEffect(() => {
    if (userToEdit) {
      editUserForm.reset({
        name: userToEdit.name || '',
        officeLocation: userToEdit.officeLocation || '',
      });
    }
  }, [userToEdit, editUserForm]);


  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const allUsers = await fetchAllUsers();
      const officeAdmins = allUsers.filter(u => u.email !== SUPER_ADMIN_EMAIL && u.officeLocation);
      setUsers(officeAdmins);
    } catch (error: any) {
      toast({ title: "Error", description: `Could not load users: ${error.message}`, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [fetchAllUsers, toast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const offices = useMemo(() => {
    const officeMap = new Map<string, UserProfile[]>();
    users.forEach(user => {
        if(user.officeLocation) {
            if (!officeMap.has(user.officeLocation)) {
                officeMap.set(user.officeLocation, []);
            }
            officeMap.get(user.officeLocation)!.push(user);
        }
    });
    return Array.from(officeMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [users]);

  const handleCreateOfficeUser = async (data: NewOfficeUserFormData) => {
    setIsSubmitting(true);
    try {
      const result = await createOfficeAdmin(data.email, data.password, data.name, data.officeLocation);
      if (result.success) {
        // Create the office document in the 'offices' collection
        const officeDocRef = doc(db, "offices", data.officeLocation.toLowerCase());
        await setDoc(officeDocRef, {
            name: "Ground Water Department",
            createdAt: serverTimestamp(),
        });
        
        toast({ title: "User and Office Created", description: `Account for ${data.name} and office for ${data.officeLocation} created.` });
        setIsOfficeUserDialogOpen(false);
        officeUserForm.reset();
        loadUsers();
      } else {
        throw new Error(result.error?.message || "Failed to create user.");
      }
    } catch (error: any) {
      toast({ title: "Error", description: `Could not create user or office: ${error.message}`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async (data: EditUserFormData) => {
    if (!userToEdit) return;
    setIsSubmitting(true);
    try {
        await updateUserProfileByAdmin(userToEdit.uid, { name: data.name, officeLocation: data.officeLocation });
        toast({ title: "User Updated", description: `Profile for ${data.name} has been updated.` });
        setUserToEdit(null);
        loadUsers();
    } catch (error: any) {
        toast({ title: "Update Failed", description: error.message, variant: "destructive" });
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
              <CardTitle>Office Management</CardTitle>
              <CardDescription>Manage administrator accounts for each office location.</CardDescription>
            </div>
            <Button onClick={() => setIsOfficeUserDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4"/> Create New Office User</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
            {isLoading ? (
                 <div className="flex items-center justify-center py-10"><Loader2 className="h-8 w-8 animate-spin"/></div>
            ) : offices.length > 0 ? (
                offices.map(([officeLocation, officeUsers]) => (
                    <Card key={officeLocation} className="bg-secondary/50">
                        <CardHeader>
                            <CardTitle className="text-lg">{officeLocation}</CardTitle>
                        </CardHeader>
                        <CardContent>
                           <UserManagementTable
                                users={officeUsers}
                                isLoading={isLoading}
                                onDataChange={loadUsers}
                                currentUser={currentUser}
                                isViewer={false} // Super admin is never a viewer
                                updateUserApproval={updateUserApproval}
                                updateUserRole={updateUserRole}
                                deleteUserDocument={deleteUserDocument}
                                staffMembers={allStaffMembers}
                                onEditUser={(user) => setUserToEdit(user)}
                            />
                        </CardContent>
                    </Card>
                ))
            ) : (
                 <p className="text-center text-muted-foreground py-10">No offices with assigned admins found.</p>
            )}
        </CardContent>
      </Card>
      
      <Dialog open={isOfficeUserDialogOpen} onOpenChange={setIsOfficeUserDialogOpen}>
        <DialogContent>
          <DialogHeader className="p-6 pb-4">
            <DialogTitle>Create New Office User</DialogTitle>
            <DialogDescription>
              This will create an administrator account for a specific office location.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-4">
            <Form {...officeUserForm}>
              <form onSubmit={officeUserForm.handleSubmit(handleCreateOfficeUser)} className="space-y-4">
                <FormField name="name" control={officeUserForm.control} render={({ field }) => (
                    <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl><Input placeholder="Enter user's full name" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField
                  name="officeLocation"
                  control={officeUserForm.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Office Location</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an office location" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {districts.map(district => (
                            <SelectItem key={district} value={district}>{district}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Create User
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>

      {userToEdit && (
        <Dialog open={!!userToEdit} onOpenChange={(open) => !open && setUserToEdit(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit User: {userToEdit.name}</DialogTitle>
                </DialogHeader>
                <Form {...editUserForm}>
                    <form onSubmit={editUserForm.handleSubmit(handleUpdateUser)} className="space-y-4 pt-4">
                        <FormField name="name" control={editUserForm.control} render={({ field }) => (
                            <FormItem>
                                <FormLabel>Name</FormLabel>
                                <FormControl><Input placeholder="Enter user's full name" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField
                            name="officeLocation"
                            control={editUserForm.control}
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Office Location</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                <FormControl>
                                    <SelectTrigger>
                                    <SelectValue placeholder="Select an office location" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {districts.map(district => (
                                    <SelectItem key={district} value={district}>{district}</SelectItem>
                                    ))}
                                </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setUserToEdit(null)} disabled={isSubmitting}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="h-4 w-4 mr-2" />}
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
