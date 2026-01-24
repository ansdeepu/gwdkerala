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

const Loader2 = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);

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
                <div>
                    <span className="font-semibold text-lg">GWD Directorate</span>
                    <p className="text-xs text-muted-foreground">Super Admin</p>
                </div>
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
                    <DropdownMenuItem onClick={() => router.push('/dashboard/super-admin/profile')}>
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
        </div>
    </SidebarProvider>
  );
}
