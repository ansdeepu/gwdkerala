
// src/app/dashboard/collectors-deposit-works/page.tsx
"use client";

import { useState, useMemo, useEffect } from 'react';
import FileDatabaseTable from "@/components/database/FileDatabaseTable";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import type { DataEntryFormData } from '@/lib/schemas';
import { COLLECTOR_APPLICATION_TYPES } from '@/lib/schemas';
import { parseISO, isValid, format } from 'date-fns';
import { usePageHeader } from '@/hooks/usePageHeader';
import { usePageNavigation } from '@/hooks/usePageNavigation';
import { useFileEntries } from '@/hooks/useFileEntries';
import { useDataStore } from '@/hooks/use-data-store';
import PaginationControls from '@/components/shared/PaginationControls';
import { Search, PlusCircle, Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';

const safeParseDate = (dateValue: any): Date | null => {
  if (!dateValue) return null;
  if (dateValue instanceof Date && isValid(dateValue)) return dateValue;
  if (typeof dateValue === 'string') {
    const parsed = parseISO(dateValue);
    if (isValid(parsed)) return parsed;
  }
  if (typeof dateValue === 'object' && (dateValue as any).toDate) {
    const parsed = (dateValue as any).toDate();
    if (isValid(parsed)) return parsed;
  }
  return null;
};

export default function CollectorsDepositWorksPage() {
  const { setHeader } = usePageHeader();
  const { user } = useAuth();
  const { fileEntries, isLoading } = useFileEntries();
  const { allFileEntries } = useDataStore();
  
  useEffect(() => {
    const description = 'List of all deposit works funded by the District Collector.';
    setHeader("Collector's Deposit Works", description);
  }, [setHeader, user]);

  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setIsNavigating } = usePageNavigation();
  
  useEffect(() => {
    const saved = localStorage.getItem('collector_works_search');
    if (saved) setSearchTerm(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem('collector_works_search', searchTerm);
  }, [searchTerm]);

  const canCreate = user?.role === 'admin' || user?.role === 'engineer' || user?.role === 'scientist';
  
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

  // Helper to find the latest available date (Remittance or Inward Re-appropriation Credit)
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

  const { collectorDepositWorkEntries, totalSites, lastUpdatedDate } = useMemo(() => {
    let entries = fileEntries.filter(entry => 
        !!entry.applicationType && (COLLECTOR_APPLICATION_TYPES as readonly string[]).includes(entry.applicationType as string)
    );
    
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

    let totalSiteCount = 0;
    if (user?.role === 'supervisor' && user.uid) {
        totalSiteCount = entries.reduce((acc, entry) => {
            const supervisorSites = entry.siteDetails?.filter(site => {
                const isAssignedByUid = site.supervisorUid === user.uid;
                const isAssignedByName = user.name && site.supervisorName?.includes(user.name);
                return isAssignedByUid || isAssignedByName;
            }) || [];
            return acc + supervisorSites.length;
        }, 0);
    } else {
        totalSiteCount = entries.reduce((acc, entry) => acc + (entry.siteDetails?.length || 0), 0);
    }

    const lastUpdated = entries.reduce((latest, entry) => {
        const updatedAt = (entry as any).updatedAt ? safeParseDate((entry as any).updatedAt) : null;
        if (updatedAt && (!latest || updatedAt > latest)) return updatedAt;
        const createdAt = (entry as any).createdAt ? safeParseDate((entry as any).createdAt) : null;
        if (createdAt && (!latest || createdAt > latest)) return createdAt;
        return latest;
    }, null as Date | null);
    
    return { collectorDepositWorkEntries: entries, totalSites: totalSiteCount, lastUpdatedDate: lastUpdated };
  }, [fileEntries, user, allFileEntries]);
  
  const filteredEntries = useMemo(() => {
    if (!searchTerm) return collectorDepositWorkEntries;
    const lowerSearchTerm = searchTerm.toLowerCase();
    return collectorDepositWorkEntries.filter(entry => {
        const searchableContent = [
            entry.fileNo, entry.applicantName, entry.phoneNo, entry.fileStatus,
            ...(entry.siteDetails || []).map(s => s.nameOfSite),
        ].filter(Boolean).map(val => String(val).toLowerCase()).join(' '); 
        return searchableContent.includes(lowerSearchTerm);
    });
  }, [collectorDepositWorkEntries, searchTerm]);

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
  const endEntryNum = Math.min(currentPage * ITEMS_PER_PAGE, paginatedEntries.length) + (currentPage - 1) * ITEMS_PER_PAGE;

  return (
    <div className="space-y-6">
       <Card>
        <CardContent className="p-4 space-y-4">
           <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative flex-grow w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground/80" />
                <Input
                  type="search"
                  placeholder="Search all fields..."
                  className="w-full rounded-lg bg-background pl-10 shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
               <div className="flex items-center gap-4 w-full sm:w-auto">
                 <div className="text-sm font-medium text-muted-foreground whitespace-nowrap">Total Files: <span className="font-bold text-primary">{filteredEntries.length}</span></div>
                 <div className="text-sm font-medium text-muted-foreground whitespace-nowrap">Total Sites: <span className="font-bold text-primary">{totalSites}</span></div>
                {lastUpdatedDate && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                        <Clock className="h-4 w-4" />
                        Last updated: <span className="font-semibold text-primary/90 font-mono">{format(lastUpdatedDate, 'dd/MM/yy, hh:mm a')}</span>
                    </div>
                )}
                {canCreate && (
                    <Button onClick={() => { setIsNavigating(true); router.push('/dashboard/data-entry?workType=collector'); }} className="w-full sm:w-auto shrink-0"><PlusCircle className="mr-2 h-4 w-4" /> New File</Button>
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
                totalEntries={filteredEntries.length}
                currentPage={currentPage}
                userRole={user?.role}
            />
        </CardContent>
        {totalPages > 1 && (
          <CardFooter className="p-4 border-t flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Showing <strong>{filteredEntries.length > 0 ? startEntryNum : 0}</strong>-<strong>{endEntryNum}</strong> of <strong>{filteredTotalSites}</strong> sites.
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
