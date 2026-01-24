// src/app/dashboard/super-admin/page.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users } from 'lucide-react';
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function SuperAdminDashboardPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Welcome, Super Admin</CardTitle>
          <CardDescription>This is the central administration panel for the GWD Dashboard application.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-secondary/30">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">User Management</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">Manage Offices</div>
                    <p className="text-xs text-muted-foreground mb-4">
                        Create and manage administrator accounts for sub-offices.
                    </p>
                    <Button onClick={() => router.push('/dashboard/super-admin/user-management')}>Go to User Management</Button>
                </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
