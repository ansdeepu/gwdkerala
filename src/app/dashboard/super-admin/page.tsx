// src/app/dashboard/super-admin/page.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Briefcase, FileText } from 'lucide-react';
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { usePageHeader } from "@/hooks/usePageHeader";
import { useEffect } from "react";

export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const { setHeader } = usePageHeader();

  useEffect(() => {
    setHeader("Super Admin Dashboard", "Central administration panel for the GWD Dashboard application.");
  }, [setHeader]);

  const quickLinks = [
    { title: "Office Management", description: "Create and manage office administrator accounts.", icon: Users, href: "/dashboard/super-admin/office-management" },
    { title: "Establishment", description: "View and manage all staff across all offices.", icon: Briefcase, href: "/dashboard/super-admin/establishment" },
    { title: "Progress Reports", description: "Generate high-level progress reports.", icon: FileText, href: "/dashboard/super-admin/progress-reports" },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickLinks.map((link) => (
                <Card key={link.href} className="bg-secondary/30 hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">{link.title}</CardTitle>
                        <link.icon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground mb-4 h-10">{link.description}</p>
                        <Button onClick={() => router.push(link.href)}>Go to {link.title}</Button>
                    </CardContent>
                </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
