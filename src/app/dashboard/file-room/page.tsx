
// src/app/dashboard/file-room/page.tsx
"use client";

import { useState, useMemo, useEffect } from 'react';
import FileDatabaseTable from "@/components/database/FileDatabaseTable";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import type { SiteWorkStatus, DataEntryFormData, ApplicationType } from '@/lib/schemas';
import { 
    applicationTypeDisplayMap, 
    PRIVATE_APPLICATION_TYPES, 
    COLLECTOR_APPLICATION_TYPES, 
    PLAN_FUND_APPLICATION_TYPES,
    LOGGING_PUMPING_TEST_PURPOSE_OPTIONS,
} from '@/lib/schemas';
import { parseISO, isValid, format } from 'date-fns';
import { usePageHeader } from '@/hooks/usePageHeader';
import { usePageNavigation } from '@/hooks/usePageNavigation';
import { useFileEntries } from '@/hooks/useFileEntries'; 
import PaginationControls from '@/components/shared/PaginationControls';

export const dynamic = 'force-dynamic';

const Search = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
);
const FilePlus2 = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4"/><path d="M14 2v6h6"/><path d="M3 15h6"/><path d="M6 12v6"/></svg>
);
const Clock = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);

const SUPERVISOR_ONGOING_STATUSES: SiteWorkStatus[] = ["Work Order Issued", "Work in Progress", "Awaiting Dept. Rig", "Work Initiated"];

const safeParseDate = (dateValue: any): Date | null => {
  if (!dateValue) return null;
  if (dateValue instanceof Date && isValid(dateValue)) return dateValue;
  if (typeof dateValue === 'string') {
    const parsed = parseISO(dateValue);
    if (isValid(parsed)) return parsed;
  }
  if (typeof dateValue === 'object' && dateValue.toDate) {
    const parsed = dateValue.toDate();
    if (isValid(parsed)) return parsed;
  }
  return null;
};

export default function FileManagerPage() {
  const { setHeader } = usePageHeader();
  const { user } = useAuth();
  const { fileEntries, isLoading } = useFileEntries(); 
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setIsNavigating } = usePageNavigation();
  
  useEffect(() => {
    setHeader('Deposit Works', 'List of all public and government deposit works.');
  }, [setHeader]);

  const ITEMS_PER_PAGE = 50;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const page = searchParams?.get('page');
    if (page && !isNaN(parseInt(page))) {
      setCurrentPage(parseInt(page));
    } else {
      setCurrentPage(1);
    }
  }, [searchParams]);

  const canCreate = user?.role === 'admin' || user?.role === 'engineer' || user?.role === 'scientist';
  
  const { depositWorkEntries, totalSites, lastCreatedDate } = useMemo(() => {
    let entries = fileEntries.filter(entry => {
        const hasInvestigationPurpose = entry.siteDetails?.some(site => site.purpose === 'GW Investigation');
        const hasLoggingPumpingPurpose = entry.siteDetails?.some(site => site.purpose && LOGGING_PUMPING_TEST_PURPOSE_OPTIONS.includes(site.purpose as any));
        if (hasInvestigationPurpose || hasLoggingPumpingPurpose) return false;
        if (entry.applicationType && PRIVATE_APPLICATION_TYPES.includes(entry.applicationType as any)) return false;
        if (entry.applicationType && COLLECTOR_APPLICATION_TYPES.includes(entry.applicationType as any)) return false;
        if (entry.applicationType && PLAN_FUND_APPLICATION_TYPES.includes(entry.applicationType as any)) return false;
        return true;
    });
    
    entries.sort((a, b) => {
      const dateA = safeParseDate(a.remittanceDetails?.[0]?.dateOfRemittance);
      const dateB = safeParseDate(b.remittanceDetails?.[0]?.dateOfRemittance);
      if (dateA && dateB) return dateB.getTime() - dateA.getTime();
      const createdAtA = safeParseDate((a as any).createdAt);
      const createdAtB = safeParseDate((b as any).createdAt);
      if (createdAtA && createdAtB) return createdAtB.getTime() - createdAtA.getTime();
      return 0;
    });

    let totalSiteCount = 0;
    if (user?.role === 'supervisor' && user.uid) {
        totalSiteCount = entries.reduce((acc, entry) => {
            const supervisorSites = entry.siteDetails?.filter(site => site.supervisorUid === user.uid && site.workStatus && SUPERVISOR_ONGOING_STATUSES.includes(site.workStatus as SiteWorkStatus)) || [];
            return acc + supervisorSites.length;
        }, 0);
    } else {
        totalSiteCount = entries.reduce((acc, entry) => acc + (entry.siteDetails?.length || 0), 0);
    }

    const lastCreated = entries.reduce((latest, entry) => {
        const createdAt = (entry as any).createdAt ? safeParseDate((entry as any).createdAt) : null;
        if (createdAt && (!latest || createdAt > latest)) return createdAt;
        return latest;
    }, null as Date | null);
    
    return { depositWorkEntries: entries, totalSites: totalSiteCount, lastCreatedDate: lastCreated };
  }, [fileEntries, user]);
  
  const filteredEntries = useMemo(() => {
    if (!searchTerm) return depositWorkEntries;
    const lowerSearchTerm = searchTerm.toLowerCase();
    return depositWorkEntries.filter(entry => {
        const searchableContent = [
            entry.fileNo, entry.applicantName, entry.phoneNo, entry.fileStatus,
            ...(entry.siteDetails || []).map(s => s.nameOfSite),
        ].filter(Boolean).map(val => String(val).toLowerCase()).join(' '); 
        return searchableContent.includes(lowerSearchTerm);
    });
  }, [depositWorkEntries, searchTerm]);

  const filteredTotalSites = useMemo(() => {
    return filteredEntries.reduce((acc, entry) => acc + (entry.siteDetails?.length || 0), 0);
  }, [filteredEntries]);

  const totalPages = Math.ceil(filteredEntries.length / ITEMS_PER_PAGE);
  const paginatedEntries = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredEntries.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredEntries, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    const params = new URLSearchParams(searchParams?.toString());
    params.set('page', String(page));
    router.push(`?${params.toString()}`, { scroll: false });
  };
  
  const startEntryNum = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endEntryNum = Math.min(currentPage * ITEMS_PER_PAGE, filteredEntries.length);

  return (
    <div className="space-y-6">
       <Card>
        <CardContent className="p-4 space-y-4">
           <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
              <div className="relative flex-grow w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Search files..." className="w-full pl-10 shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
               <div className="flex items-center gap-4 shrink-0 whitespace-nowrap overflow-x-auto no-scrollbar py-1">
                 <div className="text-sm font-medium text-muted-foreground">Files: <span className="font-bold text-primary">{filteredEntries.length}</span></div>
                 <div className="text-sm font-medium text-muted-foreground">Sites: <span className="font-bold text-primary">{totalSites}</span></div>
                {lastCreatedDate && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        Last created: <span className="font-semibold text-primary/90 font-mono">{format(lastCreatedDate, 'dd/MM/yy, hh:mm a')}</span>
                    </div>
                )}
                {canCreate && (
                    <Button onClick={() => { setIsNavigating(true); router.push('/dashboard/data-entry?workType=public'); }} size="sm" className="shrink-0"><FilePlus2 className="mr-2 h-4 w-4" /> New File</Button>
                )}
               </div>
            </div>
             <div className="flex justify-between items-center gap-4 mt-4 pt-4 border-t">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="font-semibold">Legend:</span>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-600"></div><span>Active</span></div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-yellow-600"></div><span>Refund</span></div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-600"></div><span>Closed</span></div>
                </div>
                {totalPages > 1 && <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />}
            </div>
        </CardContent>
      </Card>
      
      <FileDatabaseTable 
        fileEntries={paginatedEntries} 
        isLoading={isLoading}
        searchActive={!!searchTerm}
        totalEntries={filteredEntries.length}
        currentPage={currentPage}
      />
      
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
           <p className="text-sm text-muted-foreground">
            Showing <strong>{filteredEntries.length > 0 ? startEntryNum : 0}</strong>-<strong>{endEntryNum}</strong> of <strong>{filteredTotalSites}</strong> sites.
          </p>
          <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
}
