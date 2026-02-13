// src/app/dashboard/gw-investigation/page.tsx
"use client";

import { useState, useMemo, useEffect } from 'react';
import InvestigationTable from "@/components/investigation/InvestigationTable";
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
import { INVESTIGATION_GOVT_TYPES, INVESTIGATION_PRIVATE_TYPES, INVESTIGATION_COMPLAINT_TYPES } from '@/lib/schemas';
import PaginationControls from '@/components/shared/PaginationControls';

export const dynamic = 'force-dynamic';

const Search = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg> );
const FilePlus2 = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4"/><path d="M14 2v6h6"/><path d="M3 15h6"/><path d="M6 12v6"/></svg> );
const Clock = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> );

const safeParseDate = (dateValue: any): Date | null => {
  if (!dateValue) return null;
  if (dateValue instanceof Date && isValid(dateValue)) return dateValue;
  if (typeof dateValue === 'string') { const parsed = parseISO(dateValue); if (isValid(parsed)) return parsed; }
  return null;
};

const ITEMS_PER_PAGE = 50;


export default function GWInvestigationPage() {
  const { setHeader } = usePageHeader();
  const { user } = useAuth();
  const { fileEntries, isLoading } = useFileEntries();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("Govt");
  const router = useRouter();
  const { setIsNavigating } = usePageNavigation();
  const [currentPage, setCurrentPage] = useState(1);
  
  useEffect(() => { setHeader('GW Investigation', 'List of all Ground Water Investigation files.'); }, [setHeader]);

  const allInvestigationEntries = useMemo(() => {
    // Filter strictly for entries that have a category (new logic) or the legacy GW_Investigation type
    let entries = fileEntries.filter(entry => 
        (entry as any).category || 
        entry.applicationType === 'GW_Investigation'
    );
    entries.sort((a, b) => (safeParseDate(b.remittanceDetails?.[0]?.dateOfRemittance)?.getTime() ?? 0) - (safeParseDate(a.remittanceDetails?.[0]?.dateOfRemittance)?.getTime() ?? 0));
    return entries;
  }, [fileEntries]);

  const { investigationEntries, counts, lastCreatedDate, totalSites } = useMemo(() => {
    // Categorize entries based on the new 'category' field
    const govt = allInvestigationEntries.filter(e => (e as any).category === 'Govt' || (e.applicationType === 'GW_Investigation' && !(e as any).category));
    const pvt = allInvestigationEntries.filter(e => (e as any).category === 'Private');
    const complaints = allInvestigationEntries.filter(e => (e as any).category === 'Complaints');

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
  }, [allInvestigationEntries, activeTab]);
  
  const filteredEntries = useMemo(() => {
    if (!searchTerm) return investigationEntries;
    const lowerSearchTerm = searchTerm.toLowerCase();
    return investigationEntries.filter(entry => [entry.fileNo, entry.applicantName].some(v => v?.toLowerCase().includes(lowerSearchTerm)));
  }, [investigationEntries, searchTerm]);

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
                {lastCreatedDate && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                        <Clock className="h-3.5 w-3.5"/>
                        Last created: <span className="font-semibold text-primary/90">{format(lastCreatedDate, 'dd/MM/yy, hh:mm a')}</span>
                    </div>
                )}
                {totalPages > 1 && (
                    <PaginationControls
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                    />
                )}
                {user?.role === 'editor' && (
                    <Button onClick={() => { setIsNavigating(true); router.push('/dashboard/data-entry?workType=gwInvestigation'); }} className="w-full sm:w-auto shrink-0">
                        <FilePlus2 className="mr-2 h-5 w-5" /> New File
                    </Button>
                )}
               </div>
            </div>
           
           <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full pt-4 border-t">
             <TabsList className="grid w-full grid-cols-3 sm:w-[450px]">
               <TabsTrigger value="Govt">Govt <Badge variant="secondary" className="ml-2">{counts.Govt}</Badge></TabsTrigger>
               <TabsTrigger value="Private">Private <Badge variant="secondary" className="ml-2">{counts.Private}</Badge></TabsTrigger>
               <TabsTrigger value="Complaints">Complaints <Badge variant="secondary" className="ml-2">{counts.Complaints}</Badge></TabsTrigger>
             </TabsList>
           </Tabs>
           
           <div className="flex justify-between items-center gap-4 mt-4 pt-4 border-t">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="font-semibold">Site Name Color Legend:</span>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-600"></div><span>Completed</span></div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-yellow-600"></div><span>Pending</span></div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-orange-600"></div><span>VES Pending</span></div>
                </div>
            </div>
         </CardContent>
       </Card>
       
      <InvestigationTable fileEntries={paginatedEntries} isLoading={isLoading} searchActive={!!searchTerm} totalEntries={filteredEntries.length} />

    </div>
  );
}
