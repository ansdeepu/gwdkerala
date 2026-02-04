// src/app/dashboard/super-admin/page.tsx
"use client";

import { useMemo, useEffect } from 'react';
import { useDataStore } from '@/hooks/use-data-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Users, Briefcase, FileText, Waves, Hammer, Building } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useOfficeSelection } from '@/hooks/useOfficeSelection';
import { usePageHeader } from '@/hooks/usePageHeader';
import { Button } from '@/components/ui/button';

const KPIStatCard = ({ title, value, icon: Icon }: { title: string, value: string | number, icon: React.ElementType }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
        </CardContent>
    </Card>
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
  const { setSelectedOffice, selectedOffice } = useOfficeSelection();

  useEffect(() => {
    setHeader('Super Admin Dashboard', 'High-level overview of all sub-office activities.');
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
  
  const filteredOfficeData = useMemo(() => {
    if (!selectedOffice) {
        return officeData; // Show all if "All Offices" is selected
    }
    return officeData.filter(office => office.officeLocation === selectedOffice);
  }, [officeData, selectedOffice]);
  
  const totals = useMemo(() => ({
    offices: officeAddresses.length,
    staff: allStaffMembers.length,
    files: allFileEntries.length,
    ars: allArsEntries.length,
    agencies: allAgencyApplications.length,
    tenders: allE_tenders.length,
  }), [officeAddresses, allStaffMembers, allFileEntries, allArsEntries, allAgencyApplications, allE_tenders]);

  const handleOfficeClick = (officeLocation: string) => {
    setSelectedOffice(officeLocation);
    router.push('/dashboard');
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading department data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <KPIStatCard title="Total Offices" value={totals.offices} icon={Building} />
            <KPIStatCard title="Total Staff" value={totals.staff} icon={Users} />
            <KPIStatCard title="Total File Entries" value={totals.files} icon={FileText} />
            <KPIStatCard title="Total ARS Entries" value={totals.ars} icon={Waves} />
            <KPIStatCard title="Agency Registrations" value={totals.agencies} icon={Briefcase} />
            <KPIStatCard title="e-Tenders" value={totals.tenders} icon={Hammer} />
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Office-wise Summary</CardTitle>
                <CardDescription>Click on an office row to drill down into its specific dashboard.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Office Location</TableHead>
                            <TableHead className="text-right">Staff</TableHead>
                            <TableHead className="text-right">Files</TableHead>
                            <TableHead className="text-right">ARS</TableHead>
                            <TableHead className="text-right">Agencies</TableHead>
                            <TableHead className="text-right">e-Tenders</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredOfficeData.map(office => (
                            <TableRow key={office.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleOfficeClick(office.officeLocation)}>
                                <TableCell className="font-medium">{office.officeLocation}</TableCell>
                                <TableCell className="text-right">{office.staffCount}</TableCell>
                                <TableCell className="text-right">{office.fileEntriesCount}</TableCell>
                                <TableCell className="text-right">{office.arsEntriesCount}</TableCell>
                                <TableCell className="text-right">{office.agencyApplicationsCount}</TableCell>
                                <TableCell className="text-right">{office.eTendersCount}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
  );
}
