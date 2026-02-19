// src/app/dashboard/super-admin/office-management/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth, type UserProfile } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, PlusCircle, Trash2, Edit, Save, X, Info } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import UserManagementTable from '@/components/admin/UserManagementTable';
import { useDataStore } from '@/hooks/use-data-store';
import { getFirestore, doc, setDoc, serverTimestamp, getDocs, query, where, collection } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { usePageHeader } from '@/hooks/usePageHeader';

const db = getFirestore(app);

const districts = ["Thiruvananthapuram", "Kollam", "Pathanamthitta", "Alappuzha", "Kottayam", "Idukki", "Ernakulam", "Thrissur", "Palakkad", "Malappuram", "Kozhikode", "Wayanad", "Kannur", "Kasaragod", "Directorate"];

const NewOfficeAdminSchema = z.object({
  name: z.string().min(2, "Name is required."),
  officeLocation: z.string().min(2, "Office Location is required."),
  officeCode: z.string().min(1, "Office Code is required.").max(10, "Code is too long."),
  email: z.string().email("Invalid email address."),
});
type NewOfficeAdminFormData = z.infer<typeof NewOfficeAdminSchema>;

const EditUserSchema = z.object({
  name: z.string().min(2, "Name is required."),
  officeLocation: z.string().optional(),
});
type EditUserFormData = z.infer<typeof EditUserSchema>;

export default function OfficeManagementPage() {
  const { setHeader } = usePageHeader();
  const { user: currentUser, fetchAllUsers, createOfficeAdmin, deleteUserDocument, updateUserApproval, updateUserRole, updateUserProfileByAdmin } = useAuth();
  const { allStaffMembers } = useDataStore();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOfficeUserDialogOpen, setIsOfficeUserDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userToEdit, setUserToEdit] = useState<UserProfile | null>(null);

  useEffect(() => {
    setHeader("Office Management", "Create and manage accounts for each office location.");
  }, [setHeader]);

  const officeAdminForm = useForm<NewOfficeAdminFormData>({
    resolver: zodResolver(NewOfficeAdminSchema),
    defaultValues: { name: "", officeLocation: "", officeCode: "", email: "" },
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
      const officeUsers = allUsers.filter(u => u.role !== 'superAdmin' && u.officeLocation);
      setUsers(officeUsers);
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
            const loc = user.officeLocation.toLowerCase();
            if (!officeMap.has(loc)) {
                officeMap.set(loc, []);
            }
            officeMap.get(loc)!.push(user);
        }
    });
    return Array.from(officeMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [users]);

  const handleCreateOfficeSetup = async (data: NewOfficeAdminFormData) => {
    setIsSubmitting(true);
    const lowerCaseOfficeLocation = data.officeLocation.toLowerCase();
    try {
      const result = await createOfficeAdmin(data.email, data.name, data.officeLocation);
      if (result.success) {
        
        const officeAddressesRef = collection(db, "officeAddresses");
        const q = query(officeAddressesRef, where("officeLocation", "==", lowerCaseOfficeLocation));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            const newOfficeAddressDocRef = doc(officeAddressesRef); 
            await setDoc(newOfficeAddressDocRef, {
                officeName: `Ground Water Department, ${data.officeLocation}`,
                officeLocation: lowerCaseOfficeLocation,
                officeCode: data.officeCode.toUpperCase(),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        }
        
        const officeDocRef = doc(db, "offices", lowerCaseOfficeLocation);
        await setDoc(officeDocRef, {
            name: `Ground Water Department, ${data.officeLocation}`,
            createdAt: serverTimestamp(),
        }, { merge: true });
        
        toast({ title: "Office Accounts Created", description: `Admin, Scientist, and Engineer accounts for ${data.officeLocation} created successfully.` });
        setIsOfficeUserDialogOpen(false);
        officeAdminForm.reset();
        loadUsers();
      } else {
        throw new Error(result.error?.message || "Failed to create users.");
      }
    } catch (error: any) {
      toast({ title: "Error", description: `Could not create office setup: ${error.message}`, variant: "destructive" });
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
      <div className="flex justify-end">
        <Button onClick={() => setIsOfficeUserDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4"/> Setup New Office Accounts</Button>
      </div>
      <div className="space-y-4">
        {isLoading ? (
              <div className="flex items-center justify-center py-10"><Loader2 className="h-8 w-8 animate-spin"/></div>
        ) : offices.length > 0 ? (
            offices.map(([officeLocation, officeUsers]) => (
                <Card key={officeLocation} className="bg-secondary/50">
                    <CardHeader>
                        <CardTitle className="text-lg capitalize">{officeLocation}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <UserManagementTable
                            users={officeUsers}
                            isLoading={isLoading}
                            onDataChange={loadUsers}
                            currentUser={currentUser}
                            isViewer={false}
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
              <p className="text-center text-muted-foreground py-10">No offices found.</p>
        )}
      </div>
      
      <Dialog open={isOfficeUserDialogOpen} onOpenChange={setIsOfficeUserDialogOpen}>
        <DialogContent>
          <DialogHeader className="p-6 pb-4">
            <DialogTitle>Setup New Office Accounts</DialogTitle>
            <DialogDescription>
              This will automatically create 3 accounts for the office: Admin, Scientist, and Engineer.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-4">
            <Form {...officeAdminForm}>
              <form onSubmit={officeAdminForm.handleSubmit(handleCreateOfficeSetup)} className="space-y-4">
                <FormField name="name" control={officeAdminForm.control} render={({ field }) => (
                    <FormItem>
                        <FormLabel>Admin Name</FormLabel>
                        <FormControl><Input placeholder="Full name of the Office Admin" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                    name="officeLocation"
                    control={officeAdminForm.control}
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Office Location</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select location" />
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
                    <FormField name="officeCode" control={officeAdminForm.control} render={({ field }) => (
                        <FormItem>
                            <FormLabel>Office Code</FormLabel>
                            <FormControl><Input placeholder="e.g., KLM" {...field} /></FormControl>
                            <FormDescription className="text-[10px]">Short code for file numbers.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>
                 <FormField name="email" control={officeAdminForm.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admin Email</FormLabel>
                    <FormControl><Input type="email" placeholder="e.g. gwdklm@gmail.com" {...field} /></FormControl>
                    <FormDescription>Scientist & Engineer emails will be generated from this prefix.</FormDescription>
                     <div className="!mt-2 flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-md text-sm text-blue-800">
                        <Info className="h-4 w-4 mt-0.5 shrink-0" />
                        <p>Default password for all auto-created accounts: <strong>123456</strong></p>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}/>
                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsOfficeUserDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Create Office Accounts
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
                    <DialogDescription>
                        Modify the user's name or reassign their office location.
                    </DialogDescription>
                </DialogHeader>
                <Form {...editUserForm}>
                    <form onSubmit={editUserForm.handleSubmit(handleUpdateUser)}>
                        <div className="space-y-4 px-6 py-4">
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
                        </div>
                        <DialogFooter>
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
