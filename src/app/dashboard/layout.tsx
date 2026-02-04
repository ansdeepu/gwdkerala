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
import { OfficeSelectionProvider } from '@/hooks/useOfficeSelection';


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
    <div className="flex flex-col w-full">
      <div className="flex items-center justify-between gap-4 px-6 pt-4 pb-2">
        <div className="flex items-center gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <SidebarTrigger />
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Toggle Sidebar (Ctrl+B)</p>
            </TooltipContent>
          </Tooltip>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
        </div>
        <div className={cn("flex items-center gap-4")}>
           {isSuperAdmin ? (
               null
           ) : user?.officeLocation ? (
                <div className="hidden sm:flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Building className="h-4 w-4 text-primary" />
                    <span>{user.officeLocation}</span>
                </div>
            ) : null}
          <div className={cn("flex items-center gap-2 text-sm font-medium text-primary")}>
            <Clock className="h-4 w-4" />
            {currentTime ? (
              <span>{format(currentTime, 'dd/MM/yyyy, hh:mm:ss a')}</span>
            ) : (
              <span className="w-40 h-4 bg-muted-foreground/20 rounded-md animate-pulse" />
            )}
          </div>
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

  useEffect(() => {
    // This effect should only run after the initial loading is complete.
    if (isLoading) return;

    if (!user) {
        // If there's no user, always redirect to login.
        router.replace('/login');
    } else if (user.email === SUPER_ADMIN_EMAIL && !pathname.startsWith('/dashboard/super-admin')) {
        // If the user IS the super admin but is NOT on a super admin page, redirect them.
        router.replace('/dashboard/super-admin');
    } else if (user.email !== SUPER_ADMIN_EMAIL && pathname.startsWith('/dashboard/super-admin')) {
        // If the user is NOT the super admin but IS on a super admin page, redirect them away.
        router.replace('/dashboard');
    }
    // No action needed if the user is in the correct section of the site.
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
  if (isLoading || !user || (user.email === SUPER_ADMIN_EMAIL && !pathname.startsWith('/dashboard/super-admin')) || (user.email !== SUPER_ADMIN_EMAIL && pathname.startsWith('/dashboard/super-admin'))) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  // Render the unified layout for all authenticated users.
  return (
    <DataStoreProvider user={user}>
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
            <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/95 backdrop-blur-sm">
                  <HeaderContent user={user} />
              </header>
            <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-6">
              {children}
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </DataStoreProvider>
  );
}


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <OfficeSelectionProvider>
      <PageNavigationProvider>
        <PageHeaderProvider>
          <TooltipProvider>
              <InnerDashboardLayout>{children}</InnerDashboardLayout>
          </TooltipProvider>
        </PageHeaderProvider>
      </PageNavigationProvider>
    </OfficeSelectionProvider>
  );
}
