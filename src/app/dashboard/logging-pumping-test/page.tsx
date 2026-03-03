
// src/app/dashboard/logging-pumping-test/page.tsx
"use client";

import { useState, useMemo, useEffect } from 'react';
import LoggingPumpingTestTable from "@/components/investigation/LoggingPumpingTestTable";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
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
import { LOGGING_PUMPING_TEST_PURPOSE_OPTIONS, type SitePurpose, DataEntryFormData } from '@/lib/schemas';
import PaginationControls from '@/components/shared/PaginationControls';

export const dynamic = 'force-dynamic';

const FilePlus2 = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4"/><path d="M14 2v6h6"/><path d="M3 15h6"/><path d="M6 12v6"/></svg> );
const Clock = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> );

const safeParseDate = (dateValue: any): Date | null => {
  if (!dateValue) return null;
  if (dateValue instanceof Date && isValid(dateValue)) return dateValue;
  if (typeof dateValue === 'string') { const parsed = parseISO(dateValue); if (isValid(parsed)) return parsed; }
  if (typeof dateValue === 'object' && dateValue.toDate) { // For Firestore Timestamps
    const parsed = dateValue.toDate();
    if (isValid(parsed)) return parsed;
  }
  return null;
};

const ITEMS_PER_PAGE = 50;

const PUMPING_TEST_PURPOSES: SitePurpose[] = ["Pumping test", "Industry Pumping test", "MWSS Pumping test", "Others"];

export default function LoggingPumpingTestPage() {
  const { setHeader } = usePageHeader();
  const { user } = useAuth();
  const { fileEntries, isLoading } = useFileEntries();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("Geological");
  const router = useRouter();
  const { setIsNavigating } = usePageNavigation();
  const [currentPage, setCurrentPage] = useState(1);
  
  useEffect(() => { setHeader('Logging & Pumping Test', 'List of all Logging & Pumping Test files.'); }, [setHeader]);

  const canCreate = user?.role === 'admin' || user?.role === 'scientist' || user?.role === 'investigator';

  const { geologicalLoggingEntries, geophysicalLoggingEntries, pumpingTestEntries, lastCreatedDate } = useMemo(() => {
    const allLoggingAndPumpingEntries = fileEntries.filter(entry => {
        const hasLoggingPumpingPurpose = entry.siteDetails?.some(site => site.purpose && LOGGING_PUMPING_TEST_PURPOSE_OPTIONS.includes(site.purpose as any));
        const hasInvestigationPurpose = entry.siteDetails?.some(site => site.purpose === 'GW Investigation');
        return hasLoggingPumpingPurpose && !hasInvestigationPurpose;
    });

    allLoggingAndPumpingEntries.sort((a, b) => {
        const getSortDate = (entry: DataEntryFormData): Date | null => {
            const remittanceDate = entry.remittanceDetails?.[0]?.dateOfRemittance;
            if (remittanceDate) {
              const parsed = safeParseDate(remittanceDate);
              if (parsed) return parsed;
            }
            return safeParseDate((entry as any).createdAt);
          };
    
          const dateA = getSortDate(a);
          const dateB = getSortDate(b);
    
          if (!dateA) return 1;
          if (!dateB) return -1;
          return dateB.getTime() - dateA.getTime();
    });
    
    const geological = allLoggingAndPumpingEntries.filter(entry => 
        entry.siteDetails?.some(site => site.purpose === 'Geological logging')
    );
    const geophysical = allLoggingAndPumpingEntries.filter(entry => 
        entry.siteDetails?.some(site => site.purpose === 'Geophysical Logging')
    );
    const pumping = allLoggingAndPumpingEntries.filter(entry =>
        entry.siteDetails?.some(site => site.purpose && PUMPING_TEST_PURPOSES.includes(site.purpose as any))
    );

    const lastCreated = allLoggingAndPumpingEntries.reduce((latest, entry) => {
        const createdAt = (entry as any).createdAt ? safeParseDate((entry as any).createdAt) : null;
        return (createdAt && (!latest || createdAt > latest)) ? createdAt : latest;
    }, null as Date | null);

    return { geologicalLoggingEntries: geological, geophysicalLoggingEntries: geophysical, pumpingTestEntries: pumping, lastCreatedDate: lastCreated };
  }, [fileEntries]);

  const { filteredEntries, totalSites } = useMemo(() => {
    let sourceEntries;
    if (activeTab === 'Geological') {
        sourceEntries = geologicalLoggingEntries;
    } else if (activeTab === 'Geophysical') {
        sourceEntries = geophysicalLoggingEntries;
    } else {
        sourceEntries = pumpingTestEntries;
    }

    if (!searchTerm) {
        const sites = sourceEntries.reduce((acc, entry) => acc + (entry.siteDetails?.length || 0), 0);
        return { filteredEntries: sourceEntries, totalSites: sites };
    }

    const lowerSearchTerm = searchTerm.toLowerCase();
    const filtered = sourceEntries.filter(entry => [entry.fileNo, entry.applicantName].some(v => v?.toLowerCase().includes(lowerSearchTerm)));
    const sites = filtered.reduce((acc, entry) => acc + (entry.siteDetails?.length || 0), 0);
    return { filteredEntries: filtered, totalSites: sites };
  }, [activeTab, geologicalLoggingEntries, geophysicalLoggingEntries, pumpingTestEntries, searchTerm]);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredEntries, activeTab]);

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
                
                {canCreate && (
                    <Button onClick={() => { setIsNavigating(true); router.push('/dashboard/data-entry?workType=loggingPumpingTest'); }} size="sm" className="w-full sm:w-auto shrink-0">
                        <FilePlus2 className="mr-2 h-4 w-4" /> New File
                    </Button>
                )}
               </div>
            </div>
           
           <div className="flex justify-between items-center gap-4 pt-4 border-t">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
                    <TabsList className="grid w-full grid-cols-3 sm:w-auto">
                        <TabsTrigger value="Geological">Geological logging <Badge variant="secondary" className="ml-2">{geologicalLoggingEntries.length}</Badge></TabsTrigger>
                        <TabsTrigger value="Geophysical">Geophysical Logging <Badge variant="secondary" className="ml-2">{geophysicalLoggingEntries.length}</Badge></TabsTrigger>
                        <TabsTrigger value="PumpingTest">Pumping Test <Badge variant="secondary" className="ml-2">{pumpingTestEntries.length}</Badge></TabsTrigger>
                    </TabsList>
                </Tabs>
                <div className="flex flex-col items-end gap-2">
                    {lastCreatedDate && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                            <Clock className="h-4 w-4" />
                            Last created: <span className="font-semibold text-primary/90 font-mono">{format(lastCreatedDate, 'dd/MM/yy, hh:mm a')}</span>
                        </div>
                    )}
                    {totalPages > 1 && (
                        <PaginationControls
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={handlePageChange}
                        />
                    )}
                </div>
            </div>
         </CardContent>
       </Card>
       
      <Card>
        <CardContent className="p-0">
          <div className="max-h-[70vh] overflow-auto">
            <LoggingPumpingTestTable fileEntries={paginatedEntries} isLoading={isLoading} searchActive={!!searchTerm} totalEntries={filteredEntries.length} />
          </div>
        </CardContent>
        {totalPages > 1 && (
          <CardFooter className="p-4 flex items-center justify-center border-t">
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
