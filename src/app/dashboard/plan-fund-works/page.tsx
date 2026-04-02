
// src/app/dashboard/plan-fund-works/page.tsx
"use client";

import { useState, useMemo, useEffect } from 'react';
import FileDatabaseTable from "@/components/database/FileDatabaseTable";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import type { DataEntryFormData, SitePurpose } from '@/lib/schemas';
import { PLAN_FUND_APPLICATION_TYPES } from '@/lib/schemas';
import { parseISO, isValid, format } from 'date-fns';
import { usePageHeader } from '@/hooks/usePageHeader';
import { usePageNavigation } from '@/hooks/usePageNavigation';
import { useFileEntries } from '@/hooks/useFileEntries';
import { useDataStore } from '@/hooks/use-data-store';
import PaginationControls from '@/components/shared/PaginationControls';
import { SUPER_ADMIN_EMAIL } from '@/lib/config';
import { Search, PlusCircle, Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';

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

export default function PlanFundWorksPage() {
  const { setHeader } = usePageHeader();
  const { user } = useAuth();
  const { fileEntries, isLoading } = useFileEntries();
  const { allFileEntries } = useDataStore();
  const searchParams = useSearchParams();
  const codeFilter = searchParams.get('code');
  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL;
  
  useEffect(() => {
    const description = 'List of all deposit works funded by the Plan Fund (GWBDWS).';
    let title = 'Plan Fund Works';
    if (codeFilter) {
      if (codeFilter.includes('4702')) title = 'GWBDWS (4702)';
      else if (codeFilter.includes('2702')) title = 'GWBDWS (2702)';
      else title = `GWBDWS (${codeFilter})`;
    }
    setHeader(title, description);
  }, [setHeader, codeFilter]);

  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();
  const { setIsNavigating } = usePageNavigation();
  
  useEffect(() => {
    const saved = localStorage.getItem('plan_fund_works_search');
    if (saved) setSearchTerm(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem('plan_fund_works_search', searchTerm);
  }, [searchTerm]);

  const canCreate = (user?.role === 'admin' || user?.role === 'engineer' || user?.role === 'scientist') && !isSuperAdmin;
  
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  useEffect(() => {
    const page = searchParams?.get('page');
    if (page && !isNaN(parseInt(page))) {
      setCurrentPage(parseInt(page));
    } else {
      setCurrentPage(1);
    }
  }, [searchParams]);

  // Helper to find the latest date (Remittance or Re-appropriation Credit)
  const getDisplayDate = (entry: DataEntryFormData): Date | null => {
    let latestDate: Date | null = null;

    // 1. Check all remittance dates
    entry.remittanceDetails?.forEach(rd => {
      const d = safeParseDate(rd.dateOfRemittance);
      if (d && (!latestDate || d > latestDate)) latestDate = d;
    });

    // 2. Check all inward re-appropriation dates (credits)
    const normalizedFileNo = entry.fileNo?.toLowerCase().trim();
    if (normalizedFileNo && allFileEntries) {
      allFileEntries.forEach(otherEntry => {
        if (otherEntry.fileNo?.toLowerCase().trim() === normalizedFileNo) return;
        otherEntry.reappropriationDetails?.forEach(reapp => {
          if (reapp.refFileNo?.toLowerCase().trim() === normalizedFileNo) {
            const d = safeParseDate(reapp.date);
            if (d && (!latestDate || d > latestDate)) latestDate = d;
          }
        });
      });
    }

    return latestDate;
  };

  const { filteredEntries, totalSites, lastCreatedDate } = useMemo(() => {
    let entries = fileEntries.filter(entry => 
        !!entry.applicationType && PLAN_FUND_APPLICATION_TYPES.includes(entry.applicationType as any)
    );

    if (codeFilter) {
        const purposesFor2702: SitePurpose[] = ['MWSS Pump Reno', 'HPR'];
        const is2702Report = codeFilter.includes('2702');

        entries = entries.flatMap(entry => {
            if (!entry.siteDetails || entry.siteDetails.length === 0) return [];
            const filteredSites = entry.siteDetails.filter(site => {
                const purpose = site.purpose as SitePurpose;
                return is2702Report ? purposesFor2702.includes(purpose) : !purposesFor2702.includes(purpose);
            });
            if (filteredSites.length > 0) return [{ ...entry, siteDetails: filteredSites }];
            return [];
        });
    }
    
    entries.sort((a, b) => {
      const dateA = getDisplayDate(a);
      const dateB = getDisplayDate(b);
      
      if (dateA && dateB) return dateB.getTime() - dateA.getTime();
      if (!dateA && !dateB) {
        const createdAtA = safeParseDate((a as any).createdAt);
        const createdAtB = safeParseDate((b as any).createdAt);
        if (createdAtA && createdAtB) return createdAtB.getTime() - createdAtA.getTime();
        return 0;
      }
      if (!dateA) return 1;
      if (!dateB) return -1;
      return 0;
    });

    const totalSiteCount = entries.reduce((acc, entry) => acc + (entry.siteDetails?.length || 0), 0);

    const lastCreated = entries.reduce((latest, entry) => {
        const createdAt = (entry as any).createdAt ? safeParseDate((entry as any).createdAt) : null;
        if (createdAt && (!latest || createdAt > latest)) return createdAt;
        return latest;
    }, null as Date | null);
    
    return { filteredEntries: entries, totalSites: totalSiteCount, lastCreatedDate: lastCreated };
  }, [fileEntries, user, codeFilter, allFileEntries]);
  
  const searchFilteredEntries = useMemo(() => {
    if (!searchTerm) return filteredEntries;
    const lowerSearchTerm = searchTerm.toLowerCase();
    return filteredEntries.filter(entry => {
        const searchableContent = [
            entry.fileNo, entry.applicantName, entry.phoneNo, entry.fileStatus,
            ...(entry.siteDetails || []).map(s => s.nameOfSite),
        ].filter(Boolean).map(val => String(val).toLowerCase()).join(' '); 
        return searchableContent.includes(lowerSearchTerm);
    });
  }, [filteredEntries, searchTerm]);

  const filteredTotalSitesCount = useMemo(() => {
    return searchFilteredEntries.reduce((acc, entry) => acc + (entry.siteDetails?.length || 0), 0);
  }, [searchFilteredEntries]);
  
  const totalPages = Math.ceil(searchFilteredEntries.length / ITEMS_PER_PAGE);
  const paginatedEntries = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return searchFilteredEntries.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [searchFilteredEntries, currentPage]);
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    const params = new URLSearchParams(searchParams?.toString());
    params.set('page', String(page));
    router.push(`?${params.toString()}`, { scroll: false });
  };
  
  const startEntryNum = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endEntryNum = Math.min(currentPage * ITEMS_PER_PAGE, paginatedEntries.length) + (currentPage - 1) * ITEMS_PER_PAGE;

  return (
    <div className="space-y-6">
       <Card>
        <CardContent className="p-4 space-y-4">
           <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative flex-grow w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search all fields..."
                  className="w-full rounded-lg bg-background pl-10 shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
               <div className="flex items-center gap-4 w-full sm:w-auto">
                 <div className="text-sm font-medium text-muted-foreground whitespace-nowrap">Total Files: <span className="font-bold text-primary">{searchFilteredEntries.length}</span></div>
                 <div className="text-sm font-medium text-muted-foreground whitespace-nowrap">Total Sites: <span className="font-bold text-primary">{totalSites}</span></div>
                {lastCreatedDate && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                        <Clock className="h-3.5 w-3.5" />
                        Last created: <span className="font-semibold text-primary/90 font-mono">{format(lastCreatedDate, 'dd/MM/yy, hh:mm a')}</span>
                    </div>
                )}
                {canCreate && (
                    <Button onClick={() => { setIsNavigating(true); router.push('/dashboard/data-entry?workType=planFund'); }} className="w-full sm:w-auto shrink-0"><PlusCircle className="mr-2 h-4 w-4" /> New File</Button>
                )}
               </div>
            </div>
             <div className="flex justify-between items-center gap-4 mt-4 pt-4 border-t">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="font-semibold">Site Name Color Legend:</span>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-600"></div><span>Active / Ongoing</span></div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-yellow-600"></div><span>To be Refunded</span></div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-600"></div><span>Completed / Failed</span></div>
                </div>
                {totalPages > 1 && <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />}
            </div>
        </CardContent>
      </Card>
      
      <Card className="shadow-lg">
        <CardContent className="p-0">
            <FileDatabaseTable 
                fileEntries={paginatedEntries} 
                isLoading={isLoading}
                searchActive={!!searchTerm}
                totalEntries={searchFilteredEntries.length}
                isReadOnly={isSuperAdmin}
                currentPage={currentPage}
                userRole={user?.role}
            />
        </CardContent>
         {totalPages > 1 && (
            <CardFooter className="p-4 border-t flex flex-wrap items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground">
                    Showing <strong>{searchFilteredEntries.length > 0 ? startEntryNum : 0}</strong>-<strong>{endEntryNum}</strong> of <strong>{filteredTotalSitesCount}</strong> sites.
                </p>
                <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                />
            </CardFooter>
        )}
      </Card>
    </div>
  );
}
