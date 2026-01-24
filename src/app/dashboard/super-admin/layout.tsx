// src/app/dashboard/super-admin/layout.tsx
"use client";

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Users, LogOut, User, Menu, KeyRound, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

const Loader2 = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);


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


const getInitials = (name?: string) => {
  if (!name) return 'SA';
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
};

function SuperAdminNavMenu() {
    const pathname = usePathname();
    const navItems = [
        { href: '/dashboard/super-admin', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/dashboard/super-admin/user-management', label: 'User Management', icon: Users },
    ];
    return (
        <SidebarMenu>
            {navItems.map(item => (
                <SidebarMenuItem key={item.href}>
                     <Link href={item.href} passHref>
                        <SidebarMenuButton className="justify-start" isActive={pathname === item.href}>
                            <item.icon className="h-4 w-4 mr-2"/>
                            {item.label}
                        </SidebarMenuButton>
                    </Link>
                </SidebarMenuItem>
            ))}
        </SidebarMenu>
    );
}

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  React.useEffect(() => {
    if (!isLoading && (!user || user.email !== 'keralagwd@gmail.com')) {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user || user.email !== 'keralagwd@gmail.com') {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider>
        <div className="flex h-screen w-full bg-secondary/30">
        <Sidebar side="left" className="flex flex-col">
            <SidebarHeader className="p-4 border-b">
            <Link href="/dashboard/super-admin" className="flex items-center gap-2">
                <Image src="https://placehold.co/40x40/FFC107/000000.png?text=SA" alt="Super Admin Logo" width={32} height={32} className="rounded-sm" />
                <span className="font-semibold text-lg">Super Admin</span>
            </Link>
            </SidebarHeader>
            <SidebarContent className="flex-1 p-2">
                <SuperAdminNavMenu />
            </SidebarContent>
            <SidebarFooter className="p-2 border-t">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="w-full justify-start h-auto p-2">
                        <div className="flex w-full items-center gap-2">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={undefined} alt={user.name || 'User'} />
                                <AvatarFallback className="font-semibold bg-amber-200 text-amber-800">{getInitials(user.name)}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col items-start text-left w-full overflow-hidden">
                                <span className="font-medium text-sm truncate">{user.name || "Super Admin"}</span>
                                <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                            </div>
                        </div>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="start" className="w-56 mb-2">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setIsProfileOpen(true)}>
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout}>
                        <LogOut className="mr-2 h-4 w-4 text-destructive" />
                        <span className="text-destructive">Log out</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            </SidebarFooter>
        </Sidebar>
        <main className="flex-1 overflow-y-auto p-6">
            {children}
        </main>
        <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
            <DialogContent className="sm:max-w-4xl">
                 <DialogHeader>
                    <DialogTitle>Super Admin Profile</DialogTitle>
                    <DialogDescription>View your account details and manage your password.</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                    <div className="md:col-span-1">
                        <Card className="bg-secondary/30">
                            <CardHeader className="items-center text-center">
                            <Avatar className="h-24 w-24 mb-4">
                                <AvatarImage src={undefined} alt={user.name || 'User'} />
                                <AvatarFallback className="text-3xl font-semibold bg-amber-200 text-amber-800">{getInitials(user.name)}</AvatarFallback>
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
                            </CardHeader>
                            <CardContent>
                                <SuperAdminUpdatePasswordForm />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
        </div>
    </SidebarProvider>
  );
}
