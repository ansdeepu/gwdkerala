// src/app/dashboard/super-admin/office-management/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth, type UserProfile } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, PlusCircle, Trash2, Edit } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { userRoleOptions, type UserRole } from '@/lib/schemas';
import { useDataStore } from '@/hooks/use-data-store';
import UserManagementTable from '@/components/admin/UserManagementTable';

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

export default function OfficeManagementPage() {
  const { fetchAllUsers, createOfficeAdmin, deleteUserDocument, updateUserProfileByAdmin } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOfficeUserDialogOpen, setIsOfficeUserDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const officeUserForm = useForm<NewOfficeUserFormData>({
    resolver: zodResolver(NewOfficeUserSchema),
    defaultValues: { name: "", officeLocation: "", email: "", password: "", confirmPassword: "" },
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
        toast({ title: "User Created", description: `Account for ${data.name} has been created.` });
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

  const handleDeleteUserClick = (user: UserProfile) => {
    setUserToDelete(user);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
        await deleteUserDocument(userToDelete.uid);
        toast({ title: "User Deleted", description: `Account for ${userToDelete.email} has been deleted.` });
        loadUsers();
    } catch (error: any) {
      toast({ title: "Error", description: `Could not delete user: ${error.message}`, variant: "destructive" });
    } finally {
        setIsDeleting(false);
        setUserToDelete(null);
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
                                    {officeUsers.map(user => (
                                        <TableRow key={user.uid}>
                                            <TableCell>{user.name}</TableCell>
                                            <TableCell>{user.email}</TableCell>
                                            <TableCell><span className="capitalize">{user.role}</span></TableCell>
                                            <TableCell className="text-right">
                                               <Button variant="ghost" size="icon" onClick={() => handleDeleteUserClick(user)} disabled={isDeleting && userToDelete?.uid === user.uid}>
                                                 {isDeleting && userToDelete?.uid === user.uid ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive"/>}
                                               </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
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
      
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action will permanently delete the account for <strong>{userToDelete?.email}</strong>. This cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDeleteUser} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                    {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Delete"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
