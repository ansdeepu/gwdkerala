// src/app/dashboard/logging-pumping-test/page.tsx
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

export const dynamic = 'force-dynamic';

const Search = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg> );
const FilePlus2 = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4"/><path d="M14 2v6h6"/><path d="M3 15h6"/><path d="M6 12v6"/></svg> );
const Clock = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> );

const safeParseDate = (dateValue: any): Date | null => {
  if (!dateValue) return null;
  if (dateValue instanceof Date && isValid(dateValue)) return dateValue;
  if (typeof dateValue === 'string') { const parsed = parseISO(dateValue); if (isValid(parsed)) return parsed; }
  return null;
};

export default function LoggingPumpingTestPage() {
  const { setHeader } = usePageHeader();
  const { user } = useAuth();
  const { fileEntries, isLoading } = useFileEntries();
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();
  const { setIsNavigating } = usePageNavigation();
  
  useEffect(() => { setHeader('Logging & Pumping Test', 'List of all Logging & Pumping Test files.'); }, [setHeader]);

  const { loggingEntries, lastCreatedDate } = useMemo(() => {
    let entries = fileEntries.filter(entry => entry.applicationType === 'Logging_Pumping_Test');
    entries.sort((a, b) => (safeParseDate(b.remittanceDetails?.[0]?.dateOfRemittance)?.getTime() ?? 0) - (safeParseDate(a.remittanceDetails?.[0]?.dateOfRemittance)?.getTime() ?? 0));
    const lastCreated = entries.reduce((latest, entry) => {
        const createdAt = (entry as any).createdAt ? safeParseDate((entry as any).createdAt) : null;
        return (createdAt && (!latest || createdAt > latest)) ? createdAt : latest;
    }, null as Date | null);
    return { loggingEntries: entries, lastCreatedDate: lastCreated };
  }, [fileEntries]);
  
  const filteredEntries = useMemo(() => {
    if (!searchTerm) return loggingEntries;
    const lowerSearchTerm = searchTerm.toLowerCase();
    return loggingEntries.filter(entry => [entry.fileNo, entry.applicantName].some(v => v?.toLowerCase().includes(lowerSearchTerm)));
  }, [loggingEntries, searchTerm]);

  return (
    <div className="space-y-6">
       <Card><CardContent className="p-4 space-y-4"><div className="flex flex-col sm:flex-row items-center justify-between gap-4"><div className="relative flex-grow w-full"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /><Input placeholder="Search tests..." className="w-full pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div><div className="flex items-center gap-4 w-full sm:w-auto">{lastCreatedDate && (<div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap"><Clock className="h-3.5 w-3.5"/>Last created: <span className="font-semibold text-primary/90">{format(lastCreatedDate, 'dd/MM/yy')}</span></div>)}{user?.role === 'editor' && (<Button onClick={() => { setIsNavigating(true); router.push('/dashboard/data-entry?workType=loggingPumpingTest'); }}><FilePlus2 className="mr-2 h-5 w-5" /> New File</Button>)}</div></div></CardContent></Card>
      <InvestigationTable fileEntries={filteredEntries} isLoading={isLoading} searchActive={!!searchTerm} totalEntries={filteredEntries.length} />
    </div>
  );
}
