// src/app/dashboard/super-admin/user-management/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth, type UserProfile } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Loader = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
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

export default function SuperAdminUserManagementPage() {
  const { fetchAllUsers, createOfficeAdmin, deleteUserDocument } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<NewOfficeUserFormData>({
    resolver: zodResolver(NewOfficeUserSchema),
    defaultValues: {
      officeLocation: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
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
    const admins = users.filter(u => u.role === 'editor' && u.email !== 'keralagwd@gmail.com');
    const others = users.filter(u => (u.role === 'viewer' || u.role === 'supervisor') && u.email !== 'keralagwd@gmail.com');
    return { officeAdmins: admins, directorateUsers: others };
  }, [users]);


  const handleCreateUser = async (data: NewOfficeUserFormData) => {
    setIsSubmitting(true);
    try {
      const nameFromEmail = data.email.split('@')[0];
      const result = await createOfficeAdmin(data.email, data.password, nameFromEmail, data.officeLocation);
      if (result.success) {
        toast({ title: "User Created", description: `Account for ${nameFromEmail} has been created.` });
        setIsDialogOpen(false);
        form.reset();
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
              <CardTitle>User Management</CardTitle>
              <CardDescription>Create and manage administrator accounts for sub-offices and directorate users.</CardDescription>
            </div>
            <Button onClick={() => setIsDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4"/> Create New Office User</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="officeAdmins">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="officeAdmins">District/Sub-Office Admins</TabsTrigger>
              <TabsTrigger value="directorateUsers">Directorate Users</TabsTrigger>
            </TabsList>
            <TabsContent value="officeAdmins" className="mt-4">
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
            </TabsContent>
            <TabsContent value="directorateUsers" className="mt-4">
               <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Office Location</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center h-24"><Loader className="mx-auto h-6 w-6 animate-spin"/></TableCell></TableRow>
                  ) : directorateUsers.length > 0 ? (
                    directorateUsers.map(user => (
                      <TableRow key={user.uid}>
                        <TableCell>{user.name}</TableCell>
                        <TableCell>{user.officeLocation || 'Directorate'}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell><span className="capitalize">{user.role}</span></TableCell>
                        <TableCell className="text-right">
                           <Button variant="ghost" size="icon" disabled><Trash2 className="h-4 w-4 text-destructive"/></Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={5} className="text-center h-24">No directorate users found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Office User</DialogTitle>
            <DialogDescription>
              This will create a new administrator account for a specific office location.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateUser)} className="space-y-4">
                <FormField name="officeLocation" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel>Office Location</FormLabel><FormControl><Input placeholder="e.g., Kollam" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                 <FormField name="email" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="user@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                 <FormField name="password" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField name="confirmPassword" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel>Confirm Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader className="mr-2 h-4 w-4 animate-spin"/>}
                    Create User
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}