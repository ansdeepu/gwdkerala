// src/components/dashboard/SupervisorWork.tsx
"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DataEntryFormData, SitePurpose, StaffMember, Designation, SiteWorkStatus } from '@/lib/schemas';
import { sitePurposeOptions } from '@/lib/schemas';
import type { UserProfile } from '@/hooks/useAuth';
import { Users } from 'lucide-react';


interface SupervisorWorkProps {
  allFileEntries: DataEntryFormData[];
  allUsers: UserProfile[];
  staffMembers: StaffMember[];
  onOpenDialog: (data: any[], title: string, columns: any[], type: 'month') => void;
}

export default function SupervisorWork({ allFileEntries, allUsers, staffMembers, onOpenDialog }: SupervisorWorkProps) {
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string | undefined>(undefined);

  const supervisorList = useMemo(() => {
    const investigatorDesignations: Designation[] = [
        "Hydrogeologist", "Junior Hydrogeologist", "Geological Assistant", 
        "Geophysicist", "Junior Geophysicist", "Geophysical Assistant"
    ];

    const staffMap = new Map(staffMembers.map(s => [s.id, s]));
    
    const potentialSupervisors = new Map<string, { uid: string, name: string }>();

    allUsers.forEach(u => {
      if (!u.isApproved) return;

      let isAdded = false;

      // Condition 1: User has 'supervisor' role.
      if (u.role === 'supervisor') {
          // Use staff name if available, otherwise user name.
          const staffInfo = u.staffId ? staffMap.get(u.staffId) : null;
          const name = staffInfo?.name || u.name || u.email || "";
          potentialSupervisors.set(u.uid, { uid: u.uid, name });
          isAdded = true;
      }

      // Condition 2: User is linked to an investigator staff member.
      if (!isAdded && u.staffId) {
        const staff = staffMap.get(u.staffId);
        if (staff && staff.designation && investigatorDesignations.includes(staff.designation as Designation)) {
          potentialSupervisors.set(u.uid, { uid: u.uid, name: staff.name });
        }
      }
    });
    
    return Array.from(potentialSupervisors.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allUsers, staffMembers]);

  const supervisorOngoingWorks = useMemo(() => {
    const byPurpose = sitePurposeOptions.reduce((acc, p) => ({ ...acc, [p]: 0 }), {} as Record<SitePurpose, number>);
    if (!selectedSupervisorId) return { works: [], byPurpose, totalCount: 0 };

    const selectedStaffName = supervisorList.find(s => s.uid === selectedSupervisorId)?.name;
    
    const ongoingWorkStatuses: SiteWorkStatus[] = ["Work Order Issued", "Work in Progress", "Awaiting Dept. Rig", "Work Initiated", "Pending", "VES Pending"];
    let works: Array<{ fileNo: string; applicantName: string; siteName: string; workStatus: string; purpose?: SitePurpose; supervisorName?: string | null }> = [];

    for (const entry of allFileEntries) {
        entry.siteDetails?.forEach(site => {
            const isAssignedSupervisor = site.supervisorUid === selectedSupervisorId;
            const isAssignedInvestigator = selectedStaffName && (site.nameOfInvestigator === selectedStaffName || site.vesInvestigator === selectedStaffName);
            
            const isOngoing = site.workStatus && ongoingWorkStatuses.includes(site.workStatus as SiteWorkStatus);

            if ((isAssignedSupervisor || isAssignedInvestigator) && isOngoing) {
                works.push({
                    fileNo: entry.fileNo || 'N/A', applicantName: entry.applicantName || 'N/A',
                    siteName: site.nameOfSite || 'Unnamed Site', workStatus: site.workStatus!,
                    purpose: site.purpose, supervisorName: site.supervisorName || site.nameOfInvestigator || site.vesInvestigator,
                });
                if(site.purpose && (sitePurposeOptions.includes(site.purpose as SitePurpose))) {
                    byPurpose[site.purpose as SitePurpose]++;
                }
            }
        });
    }
    return { works, byPurpose, totalCount: works.length };
  }, [selectedSupervisorId, allFileEntries, supervisorList]);

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
      <CardContent className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Select onValueChange={setSelectedSupervisorId} value={selectedSupervisorId}>
            <SelectTrigger><SelectValue placeholder="Select a Staff Member" /></SelectTrigger>
            <SelectContent>
              {supervisorList.length > 0 ? (
                supervisorList.map(s => <SelectItem key={s.uid} value={s.uid}>{s.name}</SelectItem>)
              ) : (<p className="p-2 text-sm text-muted-foreground">No Supervisors or Investigators found</p>)}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
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
