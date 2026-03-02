// src/app/dashboard/layout.tsx
"use client";

import React, { useEffect, useCallback, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
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
import { Loader2, Clock, Building } from 'lucide-react';
import OfficeSwitcher from '@/components/layout/OfficeSwitcher';

const IDLE_TIMEOUT_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds
const LAST_ACTIVE_UPDATE_INTERVAL = 5 * 60 * 1000; // Update Firestore lastActiveAt at most once per 5 minutes

function HeaderContent({ user }: { user: UserProfile | null }) {
  const { title, description } = usePageHeader();
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  
  useEffect(() => {
    setCurrentTime(new Date());
    const timerId = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);

  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL;

  return (
    <div className="flex items-center justify-between w-full gap-4 px-6 py-3">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarTrigger />
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Toggle Sidebar (Ctrl+B)</p>
          </TooltipContent>
        </Tooltip>
        <div className="flex flex-col min-w-0">
          <h1 className="text-xl font-bold tracking-tight truncate">{title}</h1>
          {description && <p className="text-xs text-muted-foreground truncate hidden lg:block">{description}</p>}
        </div>
      </div>
      
      <div className="flex items-center gap-4 shrink-0">
         {isSuperAdmin ? (
              <OfficeSwitcher />
          ) : user?.officeLocation ? (
              <div className="hidden sm:flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Building className="h-4 w-4 text-primary" />
                  <span className="whitespace-nowrap">{user.officeLocation.charAt(0).toUpperCase() + user.officeLocation.slice(1).toLowerCase()}</span>
              </div>
          ) : null}
        <div className={cn("flex items-center gap-2 text-sm font-medium text-primary whitespace-nowrap")}>
          <Clock className="h-4 w-4" />
          {currentTime ? (
            <span className="font-mono">{format(currentTime, 'dd/MM/yyyy, hh:mm:ss a')}</span>
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
