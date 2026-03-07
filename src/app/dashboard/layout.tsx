
// src/app/dashboard/layout.tsx
"use client";

import React, { useEffect, useCallback, useState, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import AppSidebar from '@/components/layout/AppSidebar';
import { useToast } from "@/hooks/use-toast";
import { PageNavigationProvider, usePageNavigation } from '@/hooks/usePageNavigation';
import { PageHeaderProvider, usePageHeader } from '@/hooks/usePageHeader';
import { DataStoreProvider } from '@/hooks/use-data-store';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth, type UserProfile, updateUserLastActive } from '@/hooks/useAuth';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import FirebaseErrorListener from '@/components/FirebaseErrorListener';
import { SUPER_ADMIN_EMAIL } from '@/lib/config';
import { Loader2, Clock, Building, ChevronRight, Home } from 'lucide-react';
import OfficeSwitcher from '@/components/layout/OfficeSwitcher';

const IDLE_TIMEOUT_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds
const LAST_ACTIVE_UPDATE_INTERVAL = 5 * 60 * 1000; // Update Firestore lastActiveAt at most once per 5 minutes

function HeaderContent({ user }: { user: UserProfile | null }) {
  const { title, description } = usePageHeader();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  
  useEffect(() => {
    setCurrentTime(new Date());
    const timerId = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);

  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL;

  const breadcrumbs = useMemo(() => {
    if (!pathname) return [];
    const segments = pathname.split('/').filter(Boolean);
    const result: Array<{ href: string; label: string; isLast: boolean }> = [];
    
    segments.forEach((segment, index) => {
      const href = `/${segments.slice(0, index + 1).join('/')}`;
      const isLast = index === segments.length - 1;
      
      // Map segments to friendly names
      let label = segment.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      
      if (segment === 'dashboard') label = 'Dashboard';
      else if (segment === 'gw-investigation') label = 'GW Investigation';
      else if (segment === 'logging-pumping-test') label = 'Logging & Pumping Test';
      else if (segment === 'file-room') label = 'Deposit Works';
      else if (segment === 'collectors-deposit-works') label = "Collector's Deposit Works";
      else if (segment === 'private-deposit-works') label = 'Private Deposit Works';
      else if (segment === 'plan-fund-works') label = 'Plan Fund Works';
      else if (segment === 'agency-registration') label = 'Rig Registration';
      else if (segment === 'e-tender') label = 'e-Tender';
      else if (segment === 'vehicles') label = 'Vehicle & Rig';
      else if (segment === 'pending-updates') label = 'Pending Actions';
      else if (segment === 'report-format-suggestion') label = 'Report Builders';
      else if (segment === 'gwd-rates') label = 'GWD Rates';
      else if (segment === 'super-admin') label = 'Super Admin';
      else if (segment === 'data-entry') {
          // Add the parent category based on workType context
          const workType = searchParams?.get('workType');
          const workTypeMapping: Record<string, { label: string, href: string }> = {
              'gwInvestigation': { label: 'GW Investigation', href: '/dashboard/gw-investigation' },
              'loggingPumpingTest': { label: 'Logging & Pumping Test', href: '/dashboard/logging-pumping-test' },
              'public': { label: 'Deposit Works', href: '/dashboard/file-room' },
              'private': { label: 'Private Deposit Works', href: '/dashboard/private-deposit-works' },
              'collector': { label: "Collector's Deposit Works", href: '/dashboard/collectors-deposit-works' },
              'planFund': { label: 'Plan Fund Works', href: '/dashboard/plan-fund-works' },
          };
          
          if (workType && workTypeMapping[workType]) {
              result.push({ 
                  href: workTypeMapping[workType].href, 
                  label: workTypeMapping[workType].label, 
                  isLast: false 
              });
          }
          label = 'File Entry';
      }
      
      // If it's the last segment, use the page title if it's more descriptive than the segment
      const displayLabel = isLast && title && !title.includes('Loading') ? title : label;

      result.push({ href, label: displayLabel, isLast });
    });

    return result;
  }, [pathname, title, searchParams]);

  return (
    <div className="flex items-center justify-between w-full gap-4 px-6 py-3">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <SidebarTrigger />
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Toggle Sidebar (Ctrl+B)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <div className="flex flex-col min-w-0">
          {/* Navigation Address (Breadcrumbs) */}
          <nav className="flex items-center space-x-1 text-xs text-muted-foreground mb-1" aria-label="Breadcrumb">
            <Link href="/dashboard" className="hover:text-primary transition-colors flex items-center">
              <Home className="h-3 w-3 mr-1" />
              <span>Dashboard</span>
            </Link>
            {breadcrumbs.filter(b => b.href !== '/dashboard').map((crumb, idx) => (
              <React.Fragment key={crumb.href + idx}>
                <ChevronRight className="h-3 w-3 shrink-0" />
                {crumb.isLast ? (
                  <span className="font-medium text-primary truncate max-w-[200px]">{crumb.label}</span>
                ) : (
                  <Link href={crumb.href} className="hover:text-primary transition-colors truncate max-w-[150px]">
                    {crumb.label}
                  </Link>
                )}
              </React.Fragment>
            ))}
          </nav>

          <h1 className="text-xl font-bold tracking-tight truncate leading-tight">{title}</h1>
          {description && <p className="text-[10px] text-muted-foreground truncate hidden lg:block">{description}</p>}
        </div>
      </div>
      
      <div className="flex items-center gap-4 shrink-0">
         {isSuperAdmin ? (
              <OfficeSwitcher />
          ) : user?.officeLocation ? (
              <div className="hidden sm:flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Building className="h-4 w-4 text-primary" />
                  <span className="whitespace-nowrap font-bold">{user.officeLocation.charAt(0).toUpperCase() + user.officeLocation.slice(1).toLowerCase()}</span>
              </div>
          ) : null}
        <div className={cn("flex items-center gap-2 text-sm font-medium text-primary whitespace-nowrap")}>
          <Clock className="h-4 w-4" />
          {currentTime ? (
            <span className="font-mono font-bold">{format(currentTime, 'dd/MM/yyyy, hh:mm:ss a')}</span>
          ) : (
            <span className="w-40 h-4 bg-muted-foreground/20 rounded-md animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
}

function InnerDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth();
  const idleTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityFirestoreUpdateRef = React.useRef<number>(0); 
  const { toast } = useToast();
  const { isNavigating, setIsNavigating } = usePageNavigation();

  const isDashboardPage = pathname === '/dashboard';

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
        router.replace('/login');
        return;
    } 

    const isSuperAdmin = user.email === SUPER_ADMIN_EMAIL;

    // If Super Admin lands on a page that is not theirs, redirect. But allow access to shared pages
    if (isSuperAdmin && pathname === '/dashboard') {
        router.replace('/dashboard/super-admin');
        return;
    }
    
    // If a regular user tries to access any super admin page, redirect them to their dashboard.
    if (!isSuperAdmin && pathname.startsWith('/dashboard/super-admin')) {
        router.replace('/dashboard');
        return;
    }

  }, [user, isLoading, pathname, router]);

  const performIdleLogout = useCallback(() => {
    toast({
      title: "Session Expired",
      description: "You have been signed out due to inactivity.",
      duration: 5000,
    });
    logout();
  }, [logout, toast]);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    if (user?.uid) { 
      idleTimerRef.current = setTimeout(performIdleLogout, IDLE_TIMEOUT_DURATION);
      const now = Date.now();
      if (now - lastActivityFirestoreUpdateRef.current > LAST_ACTIVE_UPDATE_INTERVAL) {
        lastActivityFirestoreUpdateRef.current = now;
        updateUserLastActive(user.uid);
      }
    }
  }, [user, performIdleLogout]);


  useEffect(() => {
    if (user) {
      const activityEvents: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
      const handleUserActivity = () => resetIdleTimer();
      
      activityEvents.forEach(event => window.addEventListener(event, handleUserActivity, { passive: true }));
      resetIdleTimer(); // Initial setup
      
      return () => {
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        activityEvents.forEach(event => window.removeEventListener(event, handleUserActivity));
      };
    } else {
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    }
  }, [user, resetIdleTimer]);

  useEffect(() => {
      setIsNavigating(false);
  }, [pathname, setIsNavigating]);

  // While loading auth OR if a user is being redirected, show a clean loader.
  const isRedirecting = !isLoading && user && (
    (user.email === SUPER_ADMIN_EMAIL && pathname === '/dashboard') ||
    (user.email !== SUPER_ADMIN_EMAIL && pathname.startsWith('/dashboard/super-admin'))
  );

  if (isLoading || !user || isRedirecting) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  // Render the unified layout for all authenticated users.
  return (
      <SidebarProvider defaultOpen>
        {isNavigating && (
          <div className="page-transition-spinner">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        <div className="flex h-screen w-full overflow-hidden">
          <AppSidebar />
          <SidebarInset className="flex flex-col flex-1 overflow-hidden">
            <FirebaseErrorListener />
            <header className="sticky top-0 z-30 flex items-center border-b bg-background/95 backdrop-blur-sm w-full min-h-[64px]">
                  <HeaderContent user={user} />
              </header>
            <main className={cn(
              "flex-1 overflow-x-hidden overflow-y-auto bg-background",
              !isDashboardPage && "p-6" // Apply padding only if it's NOT the dashboard page
            )}>
              {children}
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
  );
}


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
  return (
    <PageNavigationProvider>
      <PageHeaderProvider>
        <DataStoreProvider user={user}>
            <TooltipProvider>
                <InnerDashboardLayout>{children}</InnerDashboardLayout>
            </TooltipProvider>
        </DataStoreProvider>
      </PageHeaderProvider>
    </PageNavigationProvider>
  );
}
