
// src/app/dashboard/super-admin/user-management/page.tsx
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
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, PlusCircle, Trash2, Edit } from 'lucide-react';
import { SUPER_ADMIN_EMAIL } from '@/lib/config';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { userRoleOptions, type UserRole } from '@/lib/schemas';

const Loader = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);

const districts = ["Thiruvananthapuram", "Kollam", "Pathanamthitta", "Alappuzha", "Kottayam", "Idukki", "Ernakulam", "Thrissur", "Palakkad", "Malappuram", "Kozhikode", "Wayanad", "Kannur", "Kasaragod"];

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

function EditUserDialog({
  user,
  isOpen,
  onClose,
  onSave,
  isSaving,
}: {
  user: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    officeLocation?: string;
    role?: UserRole;
    isApproved?: boolean;
  }) => void;
  isSaving: boolean;
}) {
  const [officeLocation, setOfficeLocation] = useState(user?.officeLocation || "");
  const [role, setRole] = useState<UserRole>(user?.role || "viewer");
  const [isApproved, setIsApproved] = useState(user?.isApproved || false);

  useEffect(() => {
    if (user) {
      setOfficeLocation(user.officeLocation || "");
      setRole(user.role || "viewer");
      setIsApproved(user.isApproved || false);
    }
  }, [user]);

  if (!user) return null;

  const handleSave = () => {
    const dataToSave: {
      officeLocation?: string;
      role?: UserRole;
      isApproved?: boolean;
    } = {};

    if (user.officeLocation && user.officeLocation !== officeLocation) {
      dataToSave.officeLocation = officeLocation;
    }
    if (user.role !== role) {
      dataToSave.role = role;
    }
    if (user.isApproved !== isApproved) {
      dataToSave.isApproved = isApproved;
    }
    onSave(dataToSave);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="p-6">
        <DialogHeader>
          <DialogTitle>Edit User: {user.name}</DialogTitle>
          <DialogDescription>
            Update details for {user.email}.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label>Name (Read-only)</Label>
            <Input value={user.name || ""} readOnly disabled />
          </div>
          {user.officeLocation && (
            <div className="space-y-2">
              <Label htmlFor="officeLocation">Office Location</Label>
              <Select
                value={officeLocation}
                onValueChange={setOfficeLocation}
              >
                <SelectTrigger id="officeLocation">
                  <SelectValue placeholder="Select an office location" />
                </SelectTrigger>
                <SelectContent>
                  {districts.map((district) => (
                    <SelectItem key={district} value={district}>
                      {district}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {/* Only show role editor for Directorate users (who don't have an office location) */}
          {!user.officeLocation && (
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {userRoleOptions.map((roleOption) => (
                    <SelectItem key={roleOption} value={roleOption}>
                      {roleOption.charAt(0).toUpperCase() + roleOption.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex items-center space-x-2 pt-2">
            <Switch
              id="isApproved"
              checked={isApproved}
              onCheckedChange={setIsApproved}
            />
            <Label htmlFor="isApproved">User is Approved</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


export default function SuperAdminUserManagementPage() {
  const { fetchAllUsers, createOfficeAdmin, createDirectorateUser, deleteUserDocument, updateUserProfileByAdmin } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOfficeUserDialogOpen, setIsOfficeUserDialogOpen] = useState(false);
  const [isDirectorateUserDialogOpen, setIsDirectorateUserDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [userToEdit, setUserToEdit] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);

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

  const { officeAdmins, directorateUsers } = useMemo(() => {
    const admins = users.filter(u => u.officeLocation && u.email !== SUPER_ADMIN_EMAIL);
    const others = users.filter(u => !u.officeLocation && u.email !== SUPER_ADMIN_EMAIL);
    return { officeAdmins: admins, directorateUsers: others };
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
  
  const handleEditUserClick = (user: UserProfile) => {
    setUserToEdit(user);
  };

  const handleEditSave = async (data: { officeLocation?: string; role?: UserRole; isApproved?: boolean; }) => {
    if (!userToEdit) return;
    setIsEditing(true);

    const { success, error } = await updateUserProfileByAdmin(userToEdit.uid, data);
    if (success) {
        toast({ title: "User Updated", description: "The user profile has been updated." });
        loadUsers();
        setUserToEdit(null);
    } else {
        toast({ title: "Update Failed", description: error?.message || "Could not update user.", variant: "destructive" });
    }
    setIsEditing(false);
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
                       <Button variant="ghost" size="icon" onClick={() => handleEditUserClick(user)}><Edit className="h-4 w-4 text-blue-600"/></Button>
                       <Button variant="ghost" size="icon" onClick={() => handleDeleteUserClick(user)} disabled={isDeleting && userToDelete?.uid === user.uid}>
                         {isDeleting && userToDelete?.uid === user.uid ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive"/>}
                       </Button>
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
                       <Button variant="ghost" size="icon" onClick={() => handleEditUserClick(user)}><Edit className="h-4 w-4 text-blue-600"/></Button>
                       <Button variant="ghost" size="icon" onClick={() => handleDeleteUserClick(user)} disabled={isDeleting && userToDelete?.uid === user.uid}>
                         {isDeleting && userToDelete?.uid === user.uid ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive"/>}
                       </Button>
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
          <DialogHeader className="p-6 pb-4">
            <DialogTitle>Create New Office User</DialogTitle>
            <DialogDescription>
              This will create a new administrator account for a specific office location.
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
      
      <EditUserDialog
        user={userToEdit}
        isOpen={!!userToEdit}
        onClose={() => setUserToEdit(null)}
        onSave={handleEditSave}
        isSaving={isEditing}
      />

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
