// src/app/dashboard/establishment/page.tsx
"use client";

import React from 'react';
import { ShieldAlert } from "lucide-react";
import { useAuth } from '@/hooks/useAuth';

export default function EstablishmentPage() {
    const { user } = useAuth();
    const canManage = user?.role === 'editor';

    return (
        <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
            <div className="space-y-6 p-6 text-center">
                <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Access Denied</h1>
                <p className="text-muted-foreground max-w-md">
                    The Establishment page has been moved to the Super Admin dashboard to provide a centralized view of all staff across all offices. 
                    {canManage ? " Please use the link in the Super Admin sidebar to access this feature." : " Please contact an administrator if you need access to this information."}
                </p>
            </div>
        </div>
    );
}
