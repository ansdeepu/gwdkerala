// src/app/dashboard/super-admin/layout.tsx
"use client";

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Users, LogOut, User, Menu, KeyRound, ShieldCheck, FileText, BarChart3, Briefcase, Truck, ClipboardList, Waves, Landmark, HelpCircle, Settings, FolderOpen, Building, DollarSign, Hammer, Hourglass, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SUPER_ADMIN_EMAIL } from '@/lib/config';
import { Tooltip, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { usePageNavigation } from '@/hooks/usePageNavigation';


const Loader2 = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);

const getInitials = (name?: string) => {
  if (!name) return 'SA';
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
};

function SuperAdminNavMenu() {
    const pathname = usePathname();
    const { setIsNavigating } = usePageNavigation();

    const handleNavigation = (href: string) => {
        if (href !== pathname) {
            setIsNavigating(true);
        }
    };
    
    const navItems = [
      { href: '/dashboard/super-admin', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/dashboard/super-admin/user-management', label: 'User Management', icon: Users },
      { href: '/dashboard/super-admin/establishment', label: 'Establishment', icon: Briefcase },
      { href: '/dashboard/super-admin/plan-fund-works?code=4702-02-102-94', label: 'GWBDWS (4702)', icon: Landmark },
      { href: '/dashboard/super-admin/plan-fund-works?code=2702-02-103-99', label: 'GWBDWS (2702)', icon: Landmark },
      { href: '/dashboard/super-admin/ars-plan', label: 'ARS - Plan', icon: Waves },
      { href: '/dashboard/super-admin/rig-registration', label: 'Rig Registration', icon: ClipboardList },
      { href: '/dashboard/super-admin/vehicles', label: 'Vehicle & Rig', icon: Truck },
      { href: '/dashboard/super-admin/progress-reports', label: 'Progress Reports', icon: BarChart3 },
      { href: '/dashboard/super-admin/report-builder', label: 'Report Builder', icon: FileText },
      { href: '/dashboard/super-admin/settings', label: 'Settings', icon: Settings },
    ];

    const navItemColors = [
      "text-sky-700", "text-blue-700", "text-indigo-700", "text-violet-700",
      "text-purple-700", "text-fuchsia-700", "text-pink-700", "text-rose-700",
      "text-red-700", "text-orange-700", "text-amber-700",
      "text-lime-700", "text-green-700", "text-emerald-700", "text-teal-700", "text-cyan-700"
    ];

    return (
        <SidebarMenu>
            {navItems.map((item, index) => (
                <SidebarMenuItem key={item.href}>
                    <div className="flex items-center w-full group">
                      <Link href={item.href} passHref onClick={() => handleNavigation(item.href)} className="flex-grow">
                        <SidebarMenuButton
                          asChild
                          size="compact"
                          isActive={pathname === item.href}
                          tooltip={{ children: item.label, side: "right", align: "center" }}
                          className="justify-start pr-8"
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                              <item.icon className={`h-4 w-4 ${navItemColors[index % navItemColors.length]}`} />
                              <span className={`font-medium ${navItemColors[index % navItemColors.length]}`}>{item.label}</span>
                            </div>
                          </div>
                        </SidebarMenuButton>
                      </Link>
                       <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <a href={item.href} target="_blank" rel="noopener noreferrer" className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-sidebar-accent group-data-[collapsible=icon]:hidden">
                                    <ArrowUpRight className="h-4 w-4" />
                                </a>
                            </TooltipTrigger>
                            <TooltipContent side="right"><p>Open in new tab</p></TooltipContent>
                        </Tooltip>
                       </TooltipProvider>
                    </div>
                </SidebarMenuItem>
            ))}
        </SidebarMenu>
    );
}

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (!isLoading && (!user || user.email !== SUPER_ADMIN_EMAIL)) {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user || user.email !== SUPER_ADMIN_EMAIL) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Render the Super Admin layout for the super admin
  return (
        <SidebarProvider>
            <div className="flex h-screen w-full bg-secondary/30">
            <Sidebar side="left" className="flex flex-col" collapsible="icon">
                <SidebarHeader className="p-4 border-b">
                <Link href="/dashboard/super-admin" className="flex items-center gap-2">
                    <Image src="https://placehold.co/40x40/FFC107/000000.png?text=GWD" alt="Super Admin Logo" width={32} height={32} className="rounded-sm" data-ai-hint="logo" />
                    <div className="group-data-[collapsible=icon]:hidden">
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
                        <SidebarMenuButton className="w-full h-auto p-2" tooltip={{children: user?.name || "User Profile", side: "right", align: "center"}}>
                            <div className="flex w-full items-center gap-2">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={undefined} alt={user.name || 'User'} />
                                    <AvatarFallback className="font-semibold bg-amber-200 text-amber-800">{getInitials(user.name)}</AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col items-start text-left w-full overflow-hidden group-data-[collapsible=icon]:hidden">
                                    <span className="font-medium text-sm truncate">{user.name || "Super Admin"}</span>
                                    <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                                </div>
                            </div>
                        </SidebarMenuButton>
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
