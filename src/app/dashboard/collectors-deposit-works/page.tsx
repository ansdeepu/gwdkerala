// src/app/dashboard/collectors-deposit-works/page.tsx
"use client";

import { useState, useMemo, useEffect } from 'react';
import FileDatabaseTable from "@/components/database/FileDatabaseTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import type { SiteWorkStatus, DataEntryFormData, ApplicationType } from '@/lib/schemas';
import { applicationTypeDisplayMap } from '@/lib/schemas';
import { usePendingUpdates } from '@/hooks/usePendingUpdates';
import { parseISO, isValid, format } from 'date-fns';
import { usePageHeader } from '@/hooks/usePageHeader';
import { usePageNavigation } from '@/hooks/usePageNavigation';
import { useFileEntries } from '@/hooks/useFileEntries';
import PaginationControls from '@/components/shared/PaginationControls';

export const dynamic = 'force-dynamic';

const Search = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
);
const FilePlus2 = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4"/><path d="M14 2v6h6"/><path d="M3 15h6"/><path d="M6 12v6"/></svg>
);
const Clock = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);
import { PlusCircle } from 'lucide-react';


const COLLECTOR_APPLICATION_TYPES: ApplicationType[] = ["Collector_MPLAD", "Collector_MLASDF", "Collector_MLA_Asset_Development_Fund", "Collector_DRW", "Collector_SC/ST", "Collector_ARWSS", "Collector_Others"];
const SUPERVISOR_ONGOING_STATUSES: SiteWorkStatus[] = ["Work Order Issued", "Work in Progress", "Awaiting Dept. Rig", "Work Initiated"];


// Helper function to safely parse dates, whether they are strings or Date objects
const safeParseDate = (dateValue: any): Date | null => {
  if (!dateValue) return null;
  if (dateValue instanceof Date && isValid(dateValue)) {
    return dateValue;
  }
  if (typeof dateValue === 'string') {
    const parsed = parseISO(dateValue);
    if (isValid(parsed)) return parsed;
  }
  // Fallback for other potential date-like objects from Firestore
  if (typeof dateValue === 'object' && dateValue.toDate) {
    const parsed = dateValue.toDate();
    if (isValid(parsed)) return parsed;
  }
  return null;
};


export default function CollectorsDepositWorksPage() {
  const { setHeader } = usePageHeader();
  const { user } = useAuth();
  const { fileEntries, isLoading } = useFileEntries();
  
  useEffect(() => {
    const description = 'List of all deposit works funded by the District Collector.';
    setHeader("Collector's Deposit Works", description);
  }, [setHeader, user]);

  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setIsNavigating } = usePageNavigation();
  
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

  const { collectorDepositWorkEntries, totalSites, lastCreatedDate } = useMemo(() => {
    let entries = fileEntries.filter(entry => 
        !!entry.applicationType && COLLECTOR_APPLICATION_TYPES.includes(entry.applicationType)
    );
    
    // Sort all entries by the first remittance date, newest first.
    entries.sort((a, b) => {
      const dateAValue = a.remittanceDetails?.[0]?.dateOfRemittance;
      const dateBValue = b.remittanceDetails?.[0]?.dateOfRemittance;

      const dateA = safeParseDate(dateAValue);
      const dateB = safeParseDate(dateBValue);
      
      if (dateA && dateB) {
        return dateB.getTime() - dateA.getTime();
      }
      if (!dateA && !dateB) {
        const createdAtA = safeParseDate((a as any).createdAt);
        const createdAtB = safeParseDate((b as any).createdAt);
        if (createdAtA && createdAtB) {
          return createdAtB.getTime() - createdAtA.getTime();
        }
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


    const lastCreated = entries.reduce((latest, entry) => {
        const createdAt = (entry as any).createdAt ? safeParseDate((entry as any).createdAt) : null;
        if (createdAt && (!latest || createdAt > latest)) {
            return createdAt;
        }
        return latest;
    }, null as Date | null);
    
    return { collectorDepositWorkEntries: entries, totalSites: totalSiteCount, lastCreatedDate: lastCreated };
  }, [fileEntries, user]);
  
  const filteredEntries = useMemo(() => {
    if (!searchTerm) {
      return collectorDepositWorkEntries;
    }
    const lowerSearchTerm = searchTerm.toLowerCase();
    return collectorDepositWorkEntries.filter(entry => {
        const appTypeDisplay = entry.applicationType ? applicationTypeDisplayMap[entry.applicationType as ApplicationType] : "";
        const searchableContent = [
            entry.fileNo, entry.applicantName, entry.phoneNo, entry.secondaryMobileNo, appTypeDisplay, entry.fileStatus, entry.remarks, entry.constituency,
            entry.estimateAmount, entry.totalRemittance, entry.totalPaymentAllEntries, entry.overallBalance,
            ...(entry.siteDetails || []).flatMap(site => [
                site.nameOfSite, site.purpose, site.workStatus, site.contractorName,
                site.supervisorName, site.tenderNo, site.drillingRemarks,
                site.workRemarks, site.surveyRemarks, site.surveyLocation,
                site.pumpDetails, site.latitude, site.longitude, site.estimateAmount,
                site.remittedAmount, site.siteConditions, site.accessibleRig,
                site.tsAmount, site.diameter, site.totalDepth, site.casingPipeUsed,
                site.outerCasingPipe, site.innerCasingPipe, site.yieldDischarge,
                site.zoneDetails, site.waterLevel, site.waterTankCapacity,
                site.noOfTapConnections, site.noOfBeneficiary, site.typeOfRig,
                site.totalExpenditure, site.surveyOB, site.surveyPlainPipe,
                site.surveySlottedPipe, site.surveyRecommendedDiameter,
                site.surveyRecommendedTD, site.surveyRecommendedOB,
                site.surveyRecommendedCasingPipe, site.surveyRecommendedPlainPipe,
                site.surveyRecommendedSlottedPipe, site.surveyRecommendedMsCasingPipe,
                site.arsNumberOfStructures, site.arsStorageCapacity, site.arsNumberOfFillings,
                site.constituency, site.localSelfGovt, site.pumpingLineLength, site.deliveryLineLength,
                site.pilotDrillingDepth,
            ]),
            ...(entry.remittanceDetails || []).flatMap(rd => [ rd.amountRemitted, rd.remittedAccount, rd.remittanceRemarks, rd.dateOfRemittance ? format(new Date(rd.dateOfRemittance), "dd/MM/yyyy") : '']),
            ...(entry.paymentDetails || []).flatMap(pd => [ pd.paymentAccount, pd.revenueHead, pd.contractorsPayment, pd.gst, pd.incomeTax, pd.kbcwb, pd.refundToParty, pd.totalPaymentPerEntry, pd.paymentRemarks, pd.dateOfPayment ? format(new Date(pd.dateOfPayment), "dd/MM/yyyy") : '' ]),
        ]
        .filter(val => val !== null && val !== undefined)
        .map(val => String(val).toLowerCase())
        .join(' || '); 

        return searchableContent.includes(lowerSearchTerm);
    });
  }, [collectorDepositWorkEntries, searchTerm]);

  const filteredTotalSites = useMemo(() => {
    return filteredEntries.reduce((acc, entry) => acc + (entry.siteDetails?.length || 0), 0);
  }, [filteredEntries]);


  const handleAddNewClick = () => {
    setIsNavigating(true);
    router.push('/dashboard/data-entry?workType=collector');
  };

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
                 <div className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                    Total Files: <span className="font-bold text-primary">{filteredEntries.length}</span>
                </div>
                 <div className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                    Total Sites: <span className="font-bold text-primary">{totalSites}</span>
                </div>
                {lastCreatedDate && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                        <Clock className="h-4 w-4" />
                        Last created: <span className="font-semibold text-primary/90 font-mono">{format(lastCreatedDate, 'dd/MM/yy, hh:mm a')}</span>
                    </div>
                )}
                {canCreate && (
                    <Button onClick={handleAddNewClick} className="w-full sm:w-auto shrink-0">
                        <PlusCircle className="mr-2 h-4 w-4" /> New File
                    </Button>
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
