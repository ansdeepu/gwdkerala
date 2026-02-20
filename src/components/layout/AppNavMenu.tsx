
// src/components/layout/AppNavMenu.tsx
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/lib/schemas';
import { usePendingUpdates } from '@/hooks/usePendingUpdates'; 
import { Badge } from '@/components/ui/badge'; 
import { usePageNavigation } from '@/hooks/usePageNavigation';
import { useEffect, useState, useMemo } from 'react';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { LayoutDashboard, Users, FileText, BarChart3, Briefcase, Truck, ClipboardList, Waves, Landmark, HelpCircle, Settings, FolderOpen, Building, DollarSign, Hammer, Hourglass, ArrowUpRight, TestTube2, Droplets } from 'lucide-react';


export interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles?: UserRole[];
  subItems?: NavItem[];
}

export const regularNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/gw-investigation', label: 'GW Investigation', icon: TestTube2 },
  { href: '/dashboard/logging-pumping-test', label: 'Logging & Pumping Test', icon: Droplets },
  { href: '/dashboard/file-room', label: 'Deposit Works', icon: FolderOpen },
  { href: '/dashboard/collectors-deposit-works', label: "Collector's Deposit Works", icon: Landmark },
  { href: '/dashboard/private-deposit-works', label: 'Private Deposit Works', icon: Building },
  { href: '/dashboard/plan-fund-works', label: 'Plan Fund Works', icon: Landmark },
  { href: '/dashboard/ars', label: 'ARS', icon: Waves },
  { href: '/dashboard/agency-registration', label: 'Rig Registration', icon: ClipboardList },
  { href: '/dashboard/e-tender', label: 'e-Tender', icon: Hammer },
  { href: '/dashboard/vehicles', label: 'Vehicle & Rig', icon: Truck },
  { href: '/dashboard/pending-updates', label: 'Pending Actions', icon: Hourglass, roles: ['superAdmin', 'admin'] },
  { href: '/dashboard/reports', label: 'Reports', icon: FileText },
  { href: '/dashboard/progress-report', label: 'Progress Reports', icon: BarChart3 },
  { href: '/dashboard/report-format-suggestion', label: 'Report Builders', icon: ClipboardList },
  { href: '/dashboard/gwd-rates', label: 'GWD Rates', icon: DollarSign },
  { href: '/dashboard/establishment', label: 'Establishment', icon: Briefcase },
  { href: '/dashboard/user-management', label: 'User Management', icon: Users, roles: ['superAdmin', 'admin'] },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  { href: '/dashboard/help', label: 'Help & About', icon: HelpCircle },
];

export const superAdminNavItems: NavItem[] = [
    { href: '/dashboard/super-admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/plan-fund-works?code=4702-02-102-94', label: 'GWBDWS (4702)', icon: Landmark },
    { href: '/dashboard/plan-fund-works?code=2702-02-103-99', label: 'GWBDWS (2702)', icon: Landmark },
    { href: '/dashboard/super-admin/ars-plan', label: 'ARS - Plan', icon: Waves },
    { href: '/dashboard/super-admin/rig-registration', label: 'Rig Registration', icon: ClipboardList },
    { href: '/dashboard/super-admin/vehicles', label: 'Vehicle & Rig', icon: Truck },
    { href: '/dashboard/super-admin/progress-reports', label: 'Progress Reports', icon: BarChart3 },
    { href: '/dashboard/super-admin/report-builder', label: 'Report Builder', icon: FileText },
    { href: '/dashboard/super-admin/gwd-rates', label: 'GWD Rates', icon: DollarSign },
    { href: '/dashboard/super-admin/establishment', label: 'Establishment', icon: Briefcase },
    { href: '/dashboard/super-admin/office-management', label: 'Office Management', icon: Building },
    { href: '/dashboard/super-admin/user-management', label: 'Directorate Users', icon: Users },
    { href: '/dashboard/super-admin/settings', label: 'Settings', icon: Settings },
];

const navItemColors = [
  "text-sky-700", "text-blue-700", "text-indigo-700", "text-violet-700",
  "text-purple-700", "text-fuchsia-700", "text-pink-700", "text-rose-700",
  "text-red-700", "text-orange-700", "text-amber-700",
  "text-lime-700", "text-green-700", "text-emerald-700", "text-teal-700", "text-cyan-700"
];


export default function AppNavMenu() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { subscribeToPendingUpdates } = usePendingUpdates();
  const { setIsNavigating } = usePageNavigation();
  const [pendingCount, setPendingCount] = useState(0);

  const isSuperAdmin = user?.role === 'superAdmin';

  useEffect(() => {
    if (!user || (user.role !== 'admin' && !isSuperAdmin)) {
        setPendingCount(0);
        return;
    }
    const unsubscribe = subscribeToPendingUpdates((updates) => {
        setPendingCount(updates.length);
    });
    return () => unsubscribe();
  }, [user, isSuperAdmin, subscribeToPendingUpdates]);

  const navItems = useMemo(() => {
      const sourceItems = isSuperAdmin ? superAdminNavItems : regularNavItems;
      return sourceItems.filter(item => {
        if (!user || !user.isApproved) return false;
        if (!item.roles || item.roles.length === 0) return true;
        return item.roles.includes(user.role);
      });
  }, [user, isSuperAdmin]);

  const handleNavigation = (href: string) => {
    if (href !== pathname) {
      setIsNavigating(true);
    }
  };

  return (
    <SidebarMenu>
      {navItems.map((item, index) => (
        <SidebarMenuItem key={item.href}>
            <div className="flex items-center w-full group">
              <Link href={item.href} passHref onClick={() => handleNavigation(item.href)} className="flex-grow">
                <SidebarMenuButton
                  asChild
                  size="compact"
                  isActive={pathname === item.href || (item.href !== '/dashboard' && !!pathname && pathname.startsWith(item.href))}
                  tooltip={{ children: item.label, side: "right", align: "center" }}
                  className="justify-start pr-8"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <item.icon className={`h-4 w-4 ${navItemColors[index % navItemColors.length]}`} />
                      <span className={`font-medium ${navItemColors[index % navItemColors.length]}`}>{item.label}</span>
                    </div>
                    {item.href === '/dashboard/pending-updates' && pendingCount > 0 && (
                      <Badge className="h-5 px-2 text-xs font-semibold leading-none rounded-full bg-destructive text-destructive-foreground group-data-[collapsible=icon]:hidden">
                        {pendingCount}
                      </Badge>
                    )}
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
