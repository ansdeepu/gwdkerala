// src/app/dashboard/super-admin/page.tsx
"use client";

import { useMemo, useEffect } from 'react';
import { useDataStore } from '@/hooks/use-data-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Users, Briefcase, FileText, Waves, Hammer } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useOfficeSelection } from '@/hooks/useOfficeSelection';
import { usePageHeader } from '@/hooks/usePageHeader';

const StatCard = ({ title, value, icon: Icon }: { title: string, value: number, icon: React.ElementType }) => (
    <div className="flex items-center justify-between space-x-4">
        <div className="flex items-center space-x-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">{title}</p>
        </div>
        <p className="text-sm font-bold">{value}</p>
    </div>
);


export default function SuperAdminDashboardPage() {
  const { setHeader } = usePageHeader();
  const { 
    officeAddresses,
    allStaffMembers, 
    allFileEntries, 
    allArsEntries, 
    allAgencyApplications, 
    allE_tenders, 
    isLoading 
  } = useDataStore();
  const router = useRouter();
  const { setSelectedOffice } = useOfficeSelection();

  useEffect(() => {
    setHeader('Super Admin Dashboard', 'Overview of all sub-office activities.');
  }, [setHeader]);

  const officeData = useMemo(() => {
    return officeAddresses.map(office => {
        const location = office.officeLocation;
        return {
            ...office,
            staffCount: allStaffMembers.filter(s => s.officeLocation === location).length,
            fileEntriesCount: allFileEntries.filter(e => e.officeLocation === location).length,
            arsEntriesCount: allArsEntries.filter(e => e.officeLocation === location).length,
            agencyApplicationsCount: allAgencyApplications.filter(a => a.officeLocation === location).length,
            eTendersCount: allE_tenders.filter(t => t.officeLocation === location).length,
        };
    }).sort((a,b) => a.officeLocation.localeCompare(b.officeLocation));
  }, [officeAddresses, allStaffMembers, allFileEntries, allArsEntries, allAgencyApplications, allE_tenders]);

  const handleOfficeClick = (officeLocation: string) => {
    setSelectedOffice(officeLocation);
    router.push('/dashboard');
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading office data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {officeData.map((office) => (
          <Card 
            key={office.id} 
            className="hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer"
            onClick={() => handleOfficeClick(office.officeLocation)}
          >
            <CardHeader>
              <CardTitle>{office.officeLocation}</CardTitle>
              <CardDescription>{office.officeName}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <StatCard title="Staff Members" value={office.staffCount} icon={Users} />
              <StatCard title="File Entries" value={office.fileEntriesCount} icon={FileText} />
              <StatCard title="ARS Entries" value={office.arsEntriesCount} icon={Waves} />
              <StatCard title="Agency Registrations" value={office.agencyApplicationsCount} icon={Briefcase} />
              <StatCard title="e-Tenders" value={office.eTendersCount} icon={Hammer} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
