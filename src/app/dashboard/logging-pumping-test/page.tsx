// src/app/dashboard/logging-pumping-test/page.tsx
"use client";

import { useState, useMemo, useEffect } from 'react';
import LoggingPumpingTestTable from "@/components/investigation/LoggingPumpingTestTable";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { parseISO, isValid, format } from 'date-fns';
import { usePageHeader } from '@/hooks/usePageHeader';
import { usePageNavigation } from '@/hooks/usePageNavigation';
import { useFileEntries } from '@/hooks/useFileEntries';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { LOGGING_PUMPING_TEST_TYPES } from '@/lib/schemas';
import PaginationControls from '@/components/shared/PaginationControls';

export const dynamic = 'force-dynamic';

const FilePlus2 = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4"/><path d="M14 2v6h6"/><path d="M3 15h6"/><path d="M6 12v6"/></svg> );
const Clock = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> );

const safeParseDate = (dateValue: any): Date | null => {
  if (!dateValue) return null;
  if (dateValue instanceof Date && isValid(dateValue)) return dateValue;
  if (typeof dateValue === 'string') { const parsed = parseISO(dateValue); if (isValid(parsed)) return parsed; }
  return null;
};

const ITEMS_PER_PAGE = 50;


export default function LoggingPumpingTestPage() {
  const { setHeader } = usePageHeader();
  const { user } = useAuth();
  const { fileEntries, isLoading } = useFileEntries();
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();
  const { setIsNavigating } = usePageNavigation();
  const [currentPage, setCurrentPage] = useState(1);
  
  useEffect(() => { setHeader('Logging & Pumping Test', 'List of all Logging & Pumping Test files.'); }, [setHeader]);

  const allLoggingEntries = useMemo(() => {
    let entries = fileEntries.filter(entry => 
        entry.applicationType && LOGGING_PUMPING_TEST_TYPES.includes(entry.applicationType as any)
    );
    entries.sort((a, b) => (safeParseDate(b.remittanceDetails?.[0]?.dateOfRemittance)?.getTime() ?? 0) - (safeParseDate(a.remittanceDetails?.[0]?.dateOfRemittance)?.getTime() ?? 0));
    return entries;
  }, [fileEntries]);

  const { filteredEntries, lastCreatedDate, totalSites } = useMemo(() => {
    let filtered = allLoggingEntries;
    if (searchTerm) {
        const lowerSearchTerm = searchTerm.toLowerCase();
        filtered = allLoggingEntries.filter(entry => [entry.fileNo, entry.applicantName].some(v => v?.toLowerCase().includes(lowerSearchTerm)));
    }
    
    const lastCreated = filtered.reduce((latest, entry) => {
        const createdAt = (entry as any).createdAt ? safeParseDate((entry as any).createdAt) : null;
        return (createdAt && (!latest || createdAt > latest)) ? createdAt : latest;
    }, null as Date | null);
    
    const sitesCount = filtered.reduce((acc, entry) => acc + (entry.siteDetails?.length || 0), 0);

    return { 
        filteredEntries: filtered, 
        lastCreatedDate: lastCreated,
        totalSites: sitesCount
    };
  }, [allLoggingEntries, searchTerm]);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredEntries]);

  const totalPages = Math.ceil(filteredEntries.length / ITEMS_PER_PAGE);

  const paginatedEntries = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredEntries.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredEntries, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="space-y-6">
       <Card>
         <CardContent className="p-4 space-y-4">
           <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative flex-grow w-full">
                <Input
                  type="search"
                  placeholder="Search all fields..."
                  className="w-full rounded-lg bg-background shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
               <div className="flex items-center gap-4 w-full sm:w-auto">
                 <div className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                    Total Files: <span className="font-bold text-primary">{filteredEntries.length}</span>
                </div>
                 <div className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                    Total Sites: <span className="font-bold text-primary">{totalSites}</span>
                </div>
                {lastCreatedDate && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                        <Clock className="h-3.5 w-3.5"/>
                        Last created: <span className="font-semibold text-primary/90">{format(lastCreatedDate, 'dd/MM/yy, hh:mm a')}</span>
                    </div>
                )}
                {user?.role === 'editor' && (
                    <Button onClick={() => { setIsNavigating(true); router.push('/dashboard/data-entry?workType=loggingPumpingTest'); }} className="w-full sm:w-auto shrink-0">
                        <FilePlus2 className="mr-2 h-5 w-5" /> New File
                    </Button>
                )}
               </div>
            </div>
           
           <div className="flex justify-between items-center gap-4 mt-4 pt-4 border-t">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="font-semibold">Site Name Color Legend:</span>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-600"></div><span>Completed</span></div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-yellow-600"></div><span>Pending</span></div>
                </div>
                {totalPages > 1 && (
                    <PaginationControls
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                    />
                )}
            </div>
         </CardContent>
       </Card>
       
      <LoggingPumpingTestTable fileEntries={paginatedEntries} isLoading={isLoading} searchActive={!!searchTerm} totalEntries={filteredEntries.length} />

      {totalPages > 1 && (
        <div className="flex items-center justify-center pt-4">
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
