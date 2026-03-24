// src/components/dashboard/SupervisorWork.tsx
"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DataEntryFormData, SitePurpose, StaffMember, Designation, SiteWorkStatus, ArsStatus } from '@/lib/schemas';
import type { ArsEntry } from '@/hooks/useArsEntries';
import { sitePurposeOptions } from '@/lib/schemas';
import type { UserProfile } from '@/hooks/useAuth';
import { Users } from 'lucide-react';


interface SupervisorWorkProps {
  allFileEntries: DataEntryFormData[];
  allArsEntries: ArsEntry[];
  allUsers: UserProfile[];
  staffMembers: StaffMember[];
  onOpenDialog: (data: any[], title: string, columns: any[], type: 'month') => void;
}

export default function SupervisorWork({ allFileEntries, allArsEntries, allUsers, staffMembers, onOpenDialog }: SupervisorWorkProps) {
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string | undefined>(undefined);

  const supervisorList = useMemo(() => {
    const staffMap = new Map(staffMembers.map(s => [s.id, s]));
    
    // Filter strictly by the Investigator or Supervisor roles as defined in the User Management system
    return allUsers
      .filter(u => u.isApproved && (u.role === 'supervisor' || u.role === 'investigator'))
      .map(u => {
        const staffInfo = u.staffId ? staffMap.get(u.staffId) : null;
        const name = staffInfo?.name || u.name || u.email?.split('@')[0] || "User";
        const designation = staffInfo?.designation || (u.role.charAt(0).toUpperCase() + u.role.slice(1));
        
        return {
          uid: u.uid,
          name,
          designation,
          displayName: `${name} (${designation})`,
          staffId: u.staffId
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allUsers, staffMembers]);

  const supervisorOngoingWorks = useMemo(() => {
    const byPurpose = sitePurposeOptions.reduce((acc, p) => ({ ...acc, [p]: 0 }), {} as Record<SitePurpose, number>);
    if (!selectedSupervisorId) return { works: [], byPurpose, totalCount: 0 };

    const selectedStaff = supervisorList.find(s => s.uid === selectedSupervisorId);
    const selectedStaffName = selectedStaff?.name;
    
    const ongoingWorkStatuses: SiteWorkStatus[] = ["Work Order Issued", "Work in Progress", "Awaiting Dept. Rig", "Work Initiated", "Pending", "VES Pending"];
    let works: Array<{ fileNo: string; applicantName: string; siteName: string; workStatus: string; purpose?: SitePurpose; supervisorName?: string | null }> = [];

    // Process file entries
    for (const entry of allFileEntries) {
        entry.siteDetails?.forEach(site => {
            const isAssignedSupervisor = site.supervisorUid === selectedSupervisorId || 
                (selectedStaffName && site.supervisorName?.includes(selectedStaffName));
            const isAssignedInvestigator = selectedStaffName && (site.nameOfInvestigator === selectedStaffName || site.vesInvestigator === selectedStaffName);
            
            const isOngoing = site.workStatus && (ongoingWorkStatuses as any).includes(site.workStatus);

            if ((isAssignedSupervisor || isAssignedInvestigator) && isOngoing) {
                works.push({
                    fileNo: entry.fileNo || 'N/A', applicantName: entry.applicantName || 'N/A',
                    siteName: site.nameOfSite || 'Unnamed Site', workStatus: site.workStatus!,
                    purpose: site.purpose as SitePurpose, supervisorName: site.supervisorName || site.nameOfInvestigator || site.vesInvestigator,
                });
                if(site.purpose && (sitePurposeOptions as any).includes(site.purpose)) {
                    byPurpose[site.purpose as SitePurpose]++;
                }
            }
        });
    }

    // Process ARS entries
    const arsOngoingWorkStatuses: ArsStatus[] = ["Work Order Issued", "Work in Progress", "Work Initiated"];
    for (const arsEntry of allArsEntries) {
        const isAssigned = arsEntry.supervisorUid === selectedSupervisorId || (selectedStaffName && arsEntry.supervisorName === selectedStaffName);
        const isOngoing = arsEntry.arsStatus && arsOngoingWorkStatuses.includes(arsEntry.arsStatus);

        if (isAssigned && isOngoing) {
            works.push({
                fileNo: arsEntry.fileNo || 'N/A',
                applicantName: 'ARS Scheme',
                siteName: arsEntry.nameOfSite || 'Unnamed ARS Site',
                workStatus: arsEntry.arsStatus!,
                purpose: 'ARS',
                supervisorName: arsEntry.supervisorName,
            });
            if(byPurpose['ARS'] !== undefined) {
                byPurpose['ARS']++;
            }
        }
    }
    
    return { works, byPurpose, totalCount: works.length };
  }, [selectedSupervisorId, allFileEntries, allArsEntries, supervisorList]);

  const handleSupervisorWorkClick = (purpose: string) => {
    if (!supervisorOngoingWorks || supervisorOngoingWorks.totalCount === 0) return;
  
    const filteredWorks = supervisorOngoingWorks.works.filter(work => work.purpose === purpose);
    const columns = [
      { key: 'slNo', label: 'Sl. No.' }, { key: 'fileNo', label: 'File No.' },
      { key: 'applicantName', label: 'Applicant Name' }, { key: 'siteName', label: 'Site Name' },
      { key: 'workStatus', label: 'Work Status' },
    ];
    const dataWithSlNo = filteredWorks.map((work, index) => ({ slNo: index + 1, ...work }));
  
    const selectedSupervisorName = supervisorList.find(s => s.uid === selectedSupervisorId)?.name || "Selected Supervisor";
    onOpenDialog(dataWithSlNo, `Ongoing '${purpose}' Works for ${selectedSupervisorName}`, columns, 'month');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" />Supervisor's Ongoing Work</CardTitle>
        <CardDescription>Select a staff member to view their assigned ongoing projects by category.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-1/3">
          <Select onValueChange={setSelectedSupervisorId} value={selectedSupervisorId} name="supervisorFilter">
            <SelectTrigger id="supervisor-select-trigger"><SelectValue placeholder="Select a Staff Member" /></SelectTrigger>
            <SelectContent>
              {supervisorList.length > 0 ? (
                supervisorList.map(s => <SelectItem key={s.uid} value={s.uid}>{s.displayName}</SelectItem>)
              ) : (
                <div className="p-4 text-sm text-muted-foreground text-center italic border-2 border-dashed rounded-md m-2">
                    No active Investigators or Supervisors identified in User Management.
                </div>
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full md:w-2/3">
          {selectedSupervisorId ? (
            supervisorOngoingWorks.totalCount > 0 ? (
              <Table>
                <TableHeader><TableRow><TableHead>Category</TableHead><TableHead className="text-right">Count</TableHead></TableRow></TableHeader>
                <TableBody>
                  {sitePurposeOptions.filter(p => supervisorOngoingWorks.byPurpose[p] > 0).map(p => (
                    <TableRow key={p}>
                      <TableCell className="font-medium">{p}</TableCell>
                      <TableCell className="text-right"><Button variant="link" className="p-0 h-auto" onClick={() => handleSupervisorWorkClick(p)}>{supervisorOngoingWorks.byPurpose[p]}</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (<p className="text-muted-foreground italic mt-2">No ongoing works found for this staff member.</p>)
          ) : (<p className="text-muted-foreground italic mt-2">Please select a staff member to see their work.</p>)}
        </div>
      </CardContent>
    </Card>
  );
}
