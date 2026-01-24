// src/app/login/page.tsx
"use client";

import LoginForm from "@/components/auth/LoginForm";
import Image from "next/image";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";


export const dynamic = 'force-dynamic';

const Loader2 = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);


export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // This effect handles the redirection once authentication state is fully settled.
    // It will only redirect when loading is complete and the user is authenticated.
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  // Show a loading spinner while the auth state is being determined,
  // or if the user is authenticated and we are in the process of redirecting.
  if (isLoading || isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Only render the login form if auth state is settled and user is not authenticated.
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/20 p-4">
      <div className="flex w-full max-w-4xl flex-col items-center space-y-8 rounded-xl bg-card p-8 shadow-2xl md:flex-row md:space-y-0 md:space-x-10 md:p-12">
        {/* Left Column: Branding */}
        <div className="flex w-full flex-col items-center text-center md:w-1/2 md:items-start md:text-left">
          <Image
            src="https://placehold.co/120x120/2563EB/FFFFFF.png?text=GWD%0AKOLLAM&font=lato&fontWeight=900&font-size=24"
            alt="GWD Kollam Logo"
            width={100}
            height={100}
            className="mb-6 rounded-lg shadow-md"
            data-ai-hint="abstract logo"
            priority
          />
          <h1 className="mb-3 text-3xl font-bold tracking-tight text-primary md:text-4xl">
            GWD Kollam Dashboard
          </h1>
          <p className="mb-6 text-muted-foreground md:text-lg">
            Efficiently manage and monitor ground water resources.
          </p>
          <p className="text-xs text-muted-foreground">
            Access requires an authorized account.
          </p>
        </div>
        {/* Right Column: Login Form */}
        <div className="w-full md:w-1/2">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
