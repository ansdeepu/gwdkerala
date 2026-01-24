// src/app/dashboard/super-admin/profile/page.tsx
"use client";

import React, { useState } from 'react';
import { useAuth, type UserProfile } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { KeyRound, Loader2, ShieldCheck, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UpdatePasswordSchema, type UpdatePasswordFormData } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from '@/components/ui/button';

const getInitials = (name?: string) => {
  if (!name) return 'SA';
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
};

function SuperAdminUpdatePasswordForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { updatePassword } = useAuth();
  const { toast } = useToast();

  const form = useForm<UpdatePasswordFormData>({
    resolver: zodResolver(UpdatePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: UpdatePasswordFormData) => {
    setIsSubmitting(true);
    const { success, error } = await updatePassword(data.currentPassword, data.newPassword);

    if (success) {
      toast({
        title: "Password Updated",
        description: "Your password has been changed successfully.",
      });
      form.reset();
    } else {
      toast({
        title: "Update Failed",
        description: error?.message || "An unknown error occurred.",
        variant: "destructive",
      });
    }
    setIsSubmitting(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="currentPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Current Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Enter your current password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Enter a new password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm New Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Re-enter the new password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <KeyRound className="mr-2 h-4 w-4" />
          )}
          {isSubmitting ? "Updating..." : "Update Password"}
        </Button>
      </form>
    </Form>
  );
}


export default function SuperAdminProfilePage() {
    const { user, isLoading: authLoading } = useAuth();

    if (authLoading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!user) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <p className="text-muted-foreground">User not found. Please log in again.</p>
            </div>
        );
    }
    
    const avatarColorClass = "bg-amber-200 text-amber-800"; // Specific for super admin

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Super Admin Profile</CardTitle>
                    <CardDescription>View your account details and manage your password.</CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-1">
                          <Card>
                            <CardHeader className="items-center text-center">
                              <Avatar className="h-24 w-24 mb-4">
                                <AvatarImage src={undefined} alt={user.name || 'User'} />
                                <AvatarFallback className={cn("text-3xl", avatarColorClass)}>{getInitials(user.name)}</AvatarFallback>
                              </Avatar>
                              <CardTitle className="text-2xl">{user.name || 'Super Admin'}</CardTitle>
                              <CardDescription>{user.email}</CardDescription>
                            </CardHeader>
                            <CardContent className="text-sm space-y-3 text-center">
                                <div className="flex items-center justify-center space-x-2">
                                    <ShieldCheck className="h-5 w-5 text-primary" />
                                    <span className="font-medium">Role:</span>
                                    <Badge variant='default'>Super Admin</Badge>
                                </div>
                            </CardContent>
                          </Card>
                        </div>

                        <div className="md:col-span-2">
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center space-x-3">
                                         <KeyRound className="h-6 w-6 text-primary" />
                                        <CardTitle>Change Password</CardTitle>
                                    </div>
                                    <CardDescription>
                                        Enter your current password and a new password to update your login credentials.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <SuperAdminUpdatePasswordForm />
                                </CardContent>
                            </Card>
                        </div>
                      </div>
                </CardContent>
            </Card>
        </div>
    );
}
