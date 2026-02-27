
// src/components/dashboard/WorkProgress.tsx
"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, isWithinInterval, startOfMonth, endOfMonth, isValid, parse } from 'date-fns';
import { 
    type SiteDetailFormData, 
    type SiteWorkStatus, 
    type SitePurpose, 
    type DataEntryFormData, 
    type ApplicationType, 
    sitePurposeOptions,
    PRIVATE_APPLICATION_TYPES,
    LOGGING_PUMPING_TEST_PURPOSE_OPTIONS
} from '@/lib/schemas/DataEntrySchema';
import { Input } from '@/components/ui/input';
import type { UserProfile } from '@/hooks/useAuth';
import { CalendarCheck, Hourglass, TrendingUp } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface WorkProgressProps {
  allFileEntries: DataEntryFormData[];
  onOpenDialog: (data: any[], title: string, columns: any[], type: 'month') => void;
  currentUser?: UserProfile | null;
}

interface DetailedWorkSummary {
    totalCount: number;
    byPurpose: Record<SitePurpose, number>;
    data: Array<SiteDetailFormData & { fileNo: string; applicantName: string; }>;
    byPurposePrivate: Record<SitePurpose, number>;
    byPurposeDeposit: Record<SitePurpose, number>;
    privateData: Array<SiteDetailFormData & { fileNo: string; applicantName: string; }>;
    depositData: Array<SiteDetailFormData & { fileNo: string; applicantName: string; }>;
}

const safeParseDate = (dateValue: any): Date | null => {
  if (!dateValue) return null;
  if (dateValue instanceof Date) return dateValue;
  if (typeof dateValue === 'object' && dateValue !== null && typeof (dateValue as any).seconds === 'number') {
    return new Date((dateValue as any).seconds * 1000);
  }
  if (typeof dateValue === 'string') {
    const parsed = new Date(dateValue);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return null;
};

const ProgressCategory = ({
  title,
  summary,
  onTotalClick,
  onPurposeClick,
}: {
  title: string;
  summary: DetailedWorkSummary;
  onTotalClick: () => void;
  onPurposeClick: (purpose: SitePurpose) => void;
}) => {
  const isCompleted = title.includes('Completed');
  const Icon = isCompleted ? TrendingUp : Hourglass;
  const colorClass = isCompleted ? "text-green-600" : "text-orange-600";

  return (
    <div className="space-y-3 p-4 border rounded-lg bg-secondary/20">
      <div className="flex justify-between items-center">
        <h3 className={`text-base font-semibold flex items-center gap-2 ${colorClass}`}>
          <Icon className="h-5 w-5" />
          {title}
        </h3>
        <Button variant="link" className="text-sm p-0 h-auto" onClick={onTotalClick} disabled={summary.totalCount === 0}>
          View All ({summary.totalCount})
        </Button>
      </div>
      <div className="space-y-2">
        {summary.totalCount > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {sitePurposeOptions.filter(p => summary.byPurpose[p] > 0).map(p => (
              <button key={`${p}-${title}`} className="flex justify-between items-center text-sm p-2 rounded-md hover:bg-orange-100/50" onClick={() => onPurposeClick(p)}>
                <span className="font-medium">{p}</span>
                <span className={`font-bold ${colorClass}`}>{summary.byPurpose[p]}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic text-center py-4">No works in this category.</p>
        )}
      </div>
    </div>
  );
};

const WorkProgressCategoryView = ({
    entries,
    workReportMonth,
    currentUser,
    handleMonthStatClick,
    handleMonthPurposeClick
}: {
    entries: DataEntryFormData[];
    workReportMonth: Date;
    currentUser?: UserProfile | null;
    handleMonthStatClick: (type: 'ongoing' | 'completed', dataSource: DetailedWorkSummary) => void;
    handleMonthPurposeClick: (dataSource: DetailedWorkSummary, purpose: SitePurpose, type: 'Ongoing' | 'Completed') => void;
}) => {
    const categoryStats = useMemo(() => {
        const startOfMonthDate = startOfMonth(workReportMonth);
        const endOfMonthDate = endOfMonth(workReportMonth);

        const ongoingWorkStatuses: SiteWorkStatus[] = ["Work Order Issued", "Work in Progress", "Work Initiated", "Awaiting Dept. Rig", "Pending", "VES Pending"];
        const completedWorkStatuses: SiteWorkStatus[] = ["Work Failed", "Work Completed", "Bill Prepared", "Payment Completed", "Utilization Certificate Issued"];
        
        const isSupervisor = currentUser?.role === 'supervisor';
        const uniqueCompletedSites = new Map<string, SiteDetailFormData & { fileNo: string; applicantName: string; applicationType?: ApplicationType; }>();
        const ongoingSites: Array<SiteDetailFormData & { fileNo: string; applicantName: string; applicationType?: ApplicationType; }> = [];

        for (const entry of entries) {
            if (!entry.siteDetails) continue;
            for (const site of entry.siteDetails) {
                if (isSupervisor && site.supervisorUid !== currentUser.uid) continue;

                if (site.workStatus && completedWorkStatuses.includes(site.workStatus as SiteWorkStatus) && site.dateOfCompletion) {
                    const completionDate = safeParseDate(site.dateOfCompletion);
                    if (completionDate && isValid(completionDate) && isWithinInterval(completionDate, { start: startOfMonthDate, end: endOfMonthDate })) {
                        const siteKey = `${entry.fileNo}-${site.nameOfSite}-${site.purpose}`;
                        if (!uniqueCompletedSites.has(siteKey)) {
                            uniqueCompletedSites.set(siteKey, { ...site, fileNo: entry.fileNo || 'N/A', applicantName: entry.applicantName || 'N/A', applicationType: entry.applicationType });
                        }
                    }
                }
                
                if (site.workStatus && ongoingWorkStatuses.includes(site.workStatus as SiteWorkStatus)) {
                    ongoingSites.push({ ...site, fileNo: entry.fileNo || 'N/A', applicantName: entry.applicantName || 'N/A', applicationType: entry.applicationType });
                }
            }
        }
        
        const createDetailedSummary = (sites: (SiteDetailFormData & { fileNo: string; applicantName: string; applicationType?: ApplicationType; })[]): DetailedWorkSummary => {
            const byPurpose = sitePurposeOptions.reduce((acc, p) => ({ ...acc, [p]: 0 }), {} as Record<SitePurpose, number>);
            const byPurposePrivate = { ...byPurpose };
            const byPurposeDeposit = { ...byPurpose };
            
            const privateData: typeof sites = [];
            const depositData: typeof sites = [];

            sites.forEach(site => {
                if (site.purpose && sitePurposeOptions.includes(site.purpose as SitePurpose)) {
                    const purpose = site.purpose as SitePurpose;
                    byPurpose[purpose]++;
                    
                    if(site.applicationType && PRIVATE_APPLICATION_TYPES.includes(site.applicationType)) {
                        byPurposePrivate[purpose]++;
                        privateData.push(site);
                    } else {
                        byPurposeDeposit[purpose]++;
                        depositData.push(site);
                    }
                }
            });
            return { 
                totalCount: sites.length, 
                byPurpose, 
                data: sites,
                byPurposePrivate,
                byPurposeDeposit,
                privateData,
                depositData,
            };
        };

        return {
            completedSummary: createDetailedSummary(Array.from(uniqueCompletedSites.values())),
            ongoingSummary: createDetailedSummary(ongoingSites),
        };
    }, [entries, workReportMonth, currentUser]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ProgressCategory
                title={`Completed in ${format(workReportMonth, 'MMMM')}`}
                summary={categoryStats.completedSummary}
                onTotalClick={() => handleMonthStatClick('completed', categoryStats.completedSummary)}
                onPurposeClick={(p) => handleMonthPurposeClick(categoryStats.completedSummary, p, 'Completed')}
            />
            <ProgressCategory
                title="Total Ongoing Works"
                summary={categoryStats.ongoingSummary}
                onTotalClick={() => handleMonthStatClick('ongoing', categoryStats.ongoingSummary)}
                onPurposeClick={(p) => handleMonthPurposeClick(categoryStats.ongoingSummary, p, 'Ongoing')}
            />
        </div>
    );
};


export default function WorkProgress({ allFileEntries, onOpenDialog, currentUser }: WorkProgressProps) {
  const [workReportMonth, setWorkReportMonth] = useState<Date>(new Date());
  
  const { 
    depositWorkEntries,
    gwInvestigationEntries, 
    loggingPumpingTestEntries 
  } = useMemo(() => {
    const gwInvestigationEntries: DataEntryFormData[] = [];
    const loggingPumpingTestEntries: DataEntryFormData[] = [];
    const depositWorkEntries: DataEntryFormData[] = [];

    for (const entry of allFileEntries) {
        const hasGwPurpose = entry.siteDetails?.some(site => site.purpose === 'GW Investigation');
        const hasLpPurpose = entry.siteDetails?.some(site => site.purpose && LOGGING_PUMPING_TEST_PURPOSE_OPTIONS.includes(site.purpose as any));

        if (hasGwPurpose && !hasLpPurpose) {
            gwInvestigationEntries.push(entry);
        } else if (hasLpPurpose && !hasGwPurpose) {
            loggingPumpingTestEntries.push(entry);
        } else if (!hasGwPurpose && !hasLpPurpose) {
            depositWorkEntries.push(entry);
        }
    }
    return { depositWorkEntries, gwInvestigationEntries, loggingPumpingTestEntries };
  }, [allFileEntries]);

  const handleMonthStatClick = (type: 'ongoing' | 'completed', summary: DetailedWorkSummary) => {
    if (summary.totalCount === 0) return;

    const columns = [
      { key: 'slNo', label: 'Sl. No.' }, { key: 'fileNo', label: 'File No.' },
      { key: 'applicantName', label: 'Applicant Name' }, { key: 'siteName', label: 'Site Name' },
      { key: 'purpose', label: 'Purpose' }, { key: 'workStatus', label: 'Work Status' },
      { key: 'supervisorName', label: 'Supervisor' },
    ];

    const dialogData = summary.data.map((site, index) => ({
      slNo: index + 1, fileNo: site.fileNo, applicantName: site.applicantName, siteName: site.nameOfSite,
      purpose: site.purpose, workStatus: site.workStatus, supervisorName: site.supervisorName || 'N/A',
    }));

    const title = type === 'ongoing' ? "Total Ongoing Works" : `Works Completed in ${format(workReportMonth, 'MMMM yyyy')}`;
    onOpenDialog(dialogData, title, columns, 'month');
  };

  const handleMonthPurposeClick = (dataSource: DetailedWorkSummary, purpose: SitePurpose, type: 'Ongoing' | 'Completed') => {
    const filteredData = dataSource.data.filter(d => d.purpose === purpose);
    if (filteredData.length === 0) return;

    const dialogData = filteredData.map((site, index) => ({
      slNo: index + 1, fileNo: site.fileNo, applicantName: site.applicantName, siteName: site.nameOfSite,
      workStatus: site.workStatus, supervisorName: site.supervisorName || 'N/A',
    }));

    const columns = [
      { key: 'slNo', label: 'Sl. No.' }, { key: 'fileNo', label: 'File No.' },
      { key: 'applicantName', label: 'Applicant Name' }, { key: 'siteName', label: 'Site Name' },
      { key: 'workStatus', label: 'Work Status' }, { key: 'supervisorName', label: 'Supervisor' },
    ];
    onOpenDialog(dialogData, `${type} '${purpose}' Works`, columns, 'month');
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateString = e.target.value;
    const parsedDate = parse(dateString, 'yyyy-MM', new Date());
    if (isValid(parsedDate)) {
      setWorkReportMonth(parsedDate);
    }
  };


  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex-grow">
            <CardTitle className="flex items-center gap-2"><CalendarCheck className="h-5 w-5 text-primary" />Work Progress for {format(workReportMonth, 'MMMM yyyy')}</CardTitle>
            <CardDescription>Summary of completed and ongoing work by category.</CardDescription>
          </div>
          <div className="shrink-0">
             <Input 
                type="month" 
                id="work-report-month"
                name="workReportMonth"
                className="w-full sm:w-[200px]" 
                value={format(workReportMonth, 'yyyy-MM')} 
                onChange={handleMonthChange} 
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="deposit">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="deposit">Deposit Works <Badge variant="secondary" className="ml-2">{depositWorkEntries.length}</Badge></TabsTrigger>
            <TabsTrigger value="gwInvestigation">GW Investigation <Badge variant="secondary" className="ml-2">{gwInvestigationEntries.length}</Badge></TabsTrigger>
            <TabsTrigger value="loggingPumpingTest">Logging &amp; Pumping <Badge variant="secondary" className="ml-2">{loggingPumpingTestEntries.length}</Badge></TabsTrigger>
          </TabsList>
          <TabsContent value="deposit" className="mt-4">
            <WorkProgressCategoryView 
                entries={depositWorkEntries}
                workReportMonth={workReportMonth}
                currentUser={currentUser}
                handleMonthStatClick={handleMonthStatClick}
                handleMonthPurposeClick={handleMonthPurposeClick}
            />
          </TabsContent>
          <TabsContent value="gwInvestigation" className="mt-4">
             <WorkProgressCategoryView 
                entries={gwInvestigationEntries}
                workReportMonth={workReportMonth}
                currentUser={currentUser}
                handleMonthStatClick={handleMonthStatClick}
                handleMonthPurposeClick={handleMonthPurposeClick}
            />
          </TabsContent>
          <TabsContent value="loggingPumpingTest" className="mt-4">
             <WorkProgressCategoryView 
                entries={loggingPumpingTestEntries}
                workReportMonth={workReportMonth}
                currentUser={currentUser}
                handleMonthStatClick={handleMonthStatClick}
                handleMonthPurposeClick={handleMonthPurposeClick}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
