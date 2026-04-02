
// src/app/dashboard/gw-investigation/page.tsx
"use client";

import { useState, useMemo, useEffect } from 'react';
import InvestigationTable from "@/components/investigation/InvestigationTable";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { parseISO, isValid, format } from 'date-fns';
import { usePageHeader } from '@/hooks/usePageHeader';
import { usePageNavigation } from '@/hooks/usePageNavigation';
import { useFileEntries } from '@/hooks/useFileEntries';
import { useDataStore } from '@/hooks/use-data-store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { LOGGING_PUMPING_TEST_PURPOSE_OPTIONS, DataEntryFormData } from '@/lib/schemas';
import PaginationControls from '@/components/shared/PaginationControls';
import { Search, FilePlus2, Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';

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


export default function GWInvestigationPage() {
  const { setHeader } = usePageHeader();
  const { user } = useAuth();
  const { fileEntries, isLoading } = useFileEntries();
  const { allFileEntries } = useDataStore();
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { setIsNavigating } = usePageNavigation();
  const [currentPage, setCurrentPage] = useState(1);

  const tabFromUrl = searchParams?.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl || "Govt");
  
  useEffect(() => { setHeader('GW Investigation', 'List of all Ground Water Investigation files.'); }, [setHeader]);

  // Persistent Search Keyword Logic
  useEffect(() => {
    const saved = localStorage.getItem('gw_investigation_search');
    if (saved) setSearchTerm(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem('gw_investigation_search', searchTerm);
  }, [searchTerm]);

  const canCreate = user?.role === 'admin' || user?.role === 'scientist';

  useEffect(() => {
    const page = searchParams?.get('page');
    if (page && !isNaN(parseInt(page))) {
      setCurrentPage(parseInt(page));
    } else {
      setCurrentPage(1);
    }
  }, [searchParams]);

  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab) {
        setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl, activeTab]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const params = new URLSearchParams(searchParams?.toString());
    params.set('tab', value);
    params.set('page', '1');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Helper to find the latest available date (Remittance or Re-appropriation Credit)
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

  const allInvestigationEntries = useMemo(() => {
    let entries = fileEntries.filter(entry => {
        const isInvestigationCategory = ['Govt', 'Private', 'Complaints'].includes((entry as any).category);
        const hasInvestigationPurpose = entry.siteDetails?.some(site => site.purpose === 'GW Investigation');
        const hasLoggingPumpingPurpose = entry.siteDetails?.some(site => LOGGING_PUMPING_TEST_PURPOSE_OPTIONS.includes(site.purpose as any));
        
        return (isInvestigationCategory || hasInvestigationPurpose) && !hasLoggingPumpingPurpose;
    });

    entries.sort((a, b) => {
        const dateA = getDisplayDate(a);
        const dateB = getDisplayDate(b);
        if (dateA && dateB) return dateB.getTime() - dateA.getTime();
        if (!dateA && !dateB) {
            const caA = safeParseDate((a as any).createdAt);
            const caB = safeParseDate((b as any).createdAt);
            if (caA && caB) return caB.getTime() - caA.getTime();
            return 0;
        }
        if (!dateA) return 1;
        if (!dateB) return -1;
        return 0;
    });
    return entries;
  }, [fileEntries, allFileEntries]);

  const searchFilteredEntries = useMemo(() => {
    if (!searchTerm) return allInvestigationEntries;
    const lowerSearchTerm = searchTerm.toLowerCase();
    return allInvestigationEntries.filter(entry => {
        const searchableContent = [
            entry.fileNo, 
            entry.applicantName,
            ...(entry.siteDetails || []).map(s => s.nameOfSite),
            entry.phoneNo
        ].filter(Boolean).map(val => String(val).toLowerCase()).join(' ');
        return searchableContent.includes(lowerSearchTerm);
    });
  }, [allInvestigationEntries, searchTerm]);

  const { investigationEntries, counts, lastCreatedDate, totalSites } = useMemo(() => {
    const govt = searchFilteredEntries.filter(e => (e as any).category === 'Govt' || (e.applicationType === 'GW_Investigation' && !(e as any).category));
    const pvt = searchFilteredEntries.filter(e => (e as any).category === 'Private');
    const complaints = searchFilteredEntries.filter(e => (e as any).category === 'Complaints');

    let filtered = govt;
    if (activeTab === 'Private') filtered = pvt;
    if (activeTab === 'Complaints') filtered = complaints;
    if (activeTab === 'Govt') filtered = govt;

    const lastCreated = allInvestigationEntries.reduce((latest, entry) => {
        const createdAt = (entry as any).createdAt ? safeParseDate((entry as any).createdAt) : null;
        return (createdAt && (!latest || createdAt > latest)) ? createdAt : latest;
    }, null as Date | null);
    
    const currentTabTotalSites = filtered.reduce((acc, entry) => acc + (entry.siteDetails?.length || 0), 0);

    return { 
        investigationEntries: filtered, 
        counts: { Govt: govt.length, Private: pvt.length, Complaints: complaints.length },
        lastCreatedDate: lastCreated,
        totalSites: currentTabTotalSites
    };
  }, [searchFilteredEntries, allInvestigationEntries, activeTab]);
  
  const totalPages = Math.ceil(investigationEntries.length / ITEMS_PER_PAGE);

  const paginatedEntries = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return investigationEntries.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [investigationEntries, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    const params = new URLSearchParams(searchParams?.toString());
    params.set('page', String(page));
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleAddNewClick = () => {
    setIsNavigating(true);
    router.push(`/dashboard/data-entry?workType=gwInvestigation&tab=${activeTab}${currentPage > 1 ? `&page=${currentPage}` : ''}`);
  };

  return (
    <div className="space-y-6">
       <Card>
         <CardContent className="p-4 space-y-4">
           <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative flex-grow w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search across all categories (File No, Applicant, Site Name)..."
                  className="w-full rounded-lg bg-background shadow-sm pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
               <div className="flex items-center gap-4 w-full sm:w-auto">
                 <div className="text-sm font-medium text-muted-foreground whitespace-nowrap">Tab Total: <span className="font-bold text-primary">{investigationEntries.length}</span></div>
                 <div className="text-sm font-medium text-muted-foreground whitespace-nowrap">Total Sites: <span className="font-bold text-primary">{totalSites}</span></div>
                
                {canCreate && (
                    <Button onClick={handleAddNewClick} size="sm" className="w-full sm:w-auto shrink-0"><FilePlus2 className="mr-2 h-4 w-4" /> New File</Button>
                )}
               </div>
            </div>
           
           <div className="flex flex-wrap justify-between items-center gap-4 pt-4 border-t">
                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full sm:w-auto">
                    <TabsList className="grid w-full grid-cols-3 sm:w-auto">
                        <TabsTrigger value="Govt">Govt <Badge variant="secondary" className="ml-2">{counts.Govt}</Badge></TabsTrigger>
                        <TabsTrigger value="Private">Private <Badge variant="secondary" className="ml-2">{counts.Private}</Badge></TabsTrigger>
                        <TabsTrigger value="Complaints">Complaints <Badge variant="secondary" className="ml-2">{counts.Complaints}</Badge></TabsTrigger>
                    </TabsList>
                </Tabs>
                <div className="flex flex-col items-end gap-2">
                    {lastCreatedDate && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                            <Clock className="h-3.5 w-3.5" />
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
            <InvestigationTable 
                fileEntries={paginatedEntries} 
                isLoading={isLoading} 
                searchActive={!!searchTerm} 
                totalEntries={investigationEntries.length}
                activeTab={activeTab}
                currentPage={currentPage}
            />
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
