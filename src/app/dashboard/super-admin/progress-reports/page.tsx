// src/app/dashboard/progress-report/page.tsx
"use client";

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { format, startOfDay, endOfDay, isWithinInterval, isValid, isBefore, parseISO, startOfMonth, endOfMonth, isAfter, parse } from 'date-fns';
import { cn } from "@/lib/utils";
import {
  applicationTypeOptions,
  applicationTypeDisplayMap,
  type ApplicationType,
  type SitePurpose,
  type DataEntryFormData,
  type SiteDetailFormData,
  type SiteWorkStatus,
  REPORTING_PURPOSE_ORDER,
  PUMPING_TEST_AGGREGATE_PURPOSES,
  INVESTIGATION_APP_TYPE_PURPOSES,
  INVESTIGATION_WELL_TYPE_PURPOSES,
  typeOfWellOptions,
  PUBLIC_DEPOSIT_APPLICATION_TYPES,
  PRIVATE_APPLICATION_TYPES,
} from '@/lib/schemas/DataEntrySchema';
import ExcelJS from "exceljs";
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAllFileEntriesForReports } from '@/hooks/useAllFileEntriesForReports';
import { usePageHeader } from '@/hooks/usePageHeader';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { generateProgressReportPdf } from '@/components/reports/pdf/progressReportPdfGenerator';
import download from 'downloadjs';


export const dynamic = 'force-dynamic';

const BarChart3 = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg> );
const XCircle = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg> );
const Loader2 = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> );
const Play = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polygon points="6 3 20 12 6 21 6 3"/></svg> );
const FileDown = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M12 18v-6"/><path d="m15 15-3 3-3-3"/></svg> );
const Landmark = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg> );


interface SiteDetailWithFileContext extends SiteDetailFormData {
  fileNo: string;
  applicantName: string;
  applicationType: ApplicationType;
  fileRemittanceDate?: Date | null;
}

interface ProgressStats {
  previousBalance: number;
  currentApplications: number;
  toBeRefunded: number;
  totalApplications: number;
  completed: number;
  balance: number;
  previousBalanceData: SiteDetailWithFileContext[];
  currentApplicationsData: SiteDetailWithFileContext[];
  toBeRefundedData: SiteDetailWithFileContext[];
  totalApplicationsData: SiteDetailWithFileContext[];
  completedData: SiteDetailWithFileContext[];
  balanceData: SiteDetailWithFileContext[];
}

type ApplicationTypeProgress = Record<string, any>; 
type OtherServiceProgress = Record<SitePurpose, ProgressStats>;

interface FinancialSummary {
  totalApplications: number;
  totalRemittance: number;
  totalCompleted: number;
  totalPayment: number;
  applicationData: DataEntryFormData[];
  completedData: SiteDetailWithFileContext[];
  paymentData: any[]; // To hold detailed payment records
}
type FinancialSummaryReport = Record<string, FinancialSummary>;


const BWC_DIAMETERS = ['110 mm (4.5”)', '150 mm (6”)'];
const TWC_DIAMETERS = ['150 mm (6”)', '200 mm (8”)'];


const REFUNDED_STATUSES: SiteWorkStatus[] = ['To be Refunded'];

interface DetailDialogColumn {
  key: string;
  label: string;
  isNumeric?: boolean;
}

const ReportCategoryTable = ({
  accordionId,
  title,
  data,
  categoryKeys,
  categoryLabels,
  onCountClick,
  diameter,
}: {
  accordionId: string;
  title: string;
  data: Record<string, any>; 
  categoryKeys: readonly string[];
  categoryLabels: Record<string, string>;
  onCountClick: (data: SiteDetailWithFileContext[], title: string) => void;
  diameter?: string; 
}) => {
  const metrics: Array<{ key: keyof ProgressStats; label: string }> = [
    { key: 'previousBalance', label: 'Previous Balance' },
    { key: 'currentApplications', label: 'Current Application' },
    { key: 'toBeRefunded', label: 'To be Refunded' },
    { key: 'totalApplications', label: 'Total Application' },
    { key: 'completed', label: 'Completed' },
    { key: 'balance', label: 'Balance' },
  ];

  const { categoryTotals, hasData } = useMemo(() => {
    const totals: ProgressStats = { previousBalance: 0, currentApplications: 0, toBeRefunded: 0, totalApplications: 0, completed: 0, balance: 0, previousBalanceData: [], currentApplicationsData: [], toBeRefundedData: [], totalApplicationsData: [], completedData: [], balanceData: [] };
    let dataFound = false;

    categoryKeys.forEach(catKey => {
        const statsSource = diameter ? data[catKey]?.[diameter] : data[catKey];
        const stats = statsSource as ProgressStats | undefined;
        if (stats) {
            if (Object.values(stats).some(val => (typeof val === 'number' && val > 0) || (Array.isArray(val) && val.length > 0))) {
                dataFound = true;
            }
            metrics.forEach(metric => {
                const count = (stats[metric.key] as number) || 0;
                const dataKey = `${metric.key}Data` as keyof ProgressStats;
                const metricData = stats[dataKey] as SiteDetailWithFileContext[] | undefined;
                
                (totals[metric.key] as number) += count;
                 if (Array.isArray(totals[dataKey]) && Array.isArray(metricData)) {
                    (totals[dataKey] as any[]).push(...metricData);
                 }
            });
        }
    });
    return { categoryTotals: totals, hasData: dataFound };
  }, [data, categoryKeys, diameter, metrics]);

  if (!hasData) return null;

  return (
    <AccordionItem value={accordionId} className="border-b-0">
      <Card className="shadow-lg">
        <AccordionTrigger className="p-6 hover:no-underline [&[data-state=open]]:border-b">
          <CardTitle>{title}</CardTitle>
        </AccordionTrigger>
        <AccordionContent>
          <CardContent className="pt-6">
            <div className="relative overflow-x-auto">
              <Table className="min-w-full border-collapse">
                <TableHeader>
                  <TableRow>
                    <TableHead className="border p-2 align-middle text-left min-w-[200px] font-semibold">Category</TableHead>
                    {metrics.map(metric => (
                      <TableHead key={metric.key} className="border p-2 text-center font-semibold min-w-[100px] whitespace-normal break-words">{metric.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoryKeys.map(catKey => {
                    const stats = (diameter ? data[catKey]?.[diameter] : data[catKey]) as ProgressStats | undefined;

                    if (!stats || !Object.values(stats).some(val => (typeof val === 'number' && val > 0))) return null;
                    
                    return (
                    <TableRow key={catKey}>
                      <TableCell className="border p-2 text-left font-medium">{categoryLabels[catKey] || catKey}</TableCell>
                      {metrics.map(metric => {
                        const count = stats[metric.key] as number ?? 0;
                        const metricData = stats[`${metric.key}Data` as keyof ProgressStats] as SiteDetailWithFileContext[] ?? [];
                        return (
                          <TableCell key={`${catKey}-${metric.key}`} className={cn("border p-2 text-center", (metric.key === 'balance' || metric.key === 'totalApplications') && "font-bold")}>
                            <Button variant="link" className="p-0 h-auto font-semibold" disabled={count === 0} onClick={() => onCountClick(metricData, `${title} - ${categoryLabels[catKey] || catKey} - ${metric.label}`)}>
                              {count}
                            </Button>
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  )})}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-muted/50">
                    <TableCell className="border p-2 text-left font-bold">Total</TableCell>
                    {metrics.map(metric => (
                      <TableCell key={`total-${metric.key}`} className={cn("border p-2 text-center font-bold")}>
                        <Button variant="link" className="p-0 h-auto font-bold" disabled={(categoryTotals[metric.key] as number) === 0} onClick={() => onCountClick(categoryTotals[`${metric.key}Data` as keyof ProgressStats] as SiteDetailWithFileContext[], `Total for ${title} - ${metric.label}`)}>
                          {categoryTotals[metric.key] as number}
                        </Button>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </CardContent>
        </AccordionContent>
      </Card>
    </AccordionItem>
  );
};


export default function ProgressReportPage() {
  const { setHeader } = usePageHeader();
  const { reportEntries: fileEntries, isReportLoading: entriesLoading, officeAddress } = useAllFileEntriesForReports();
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [isFiltering, setIsFiltering] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const { toast } = useToast();

  const [reportData, setReportData] = useState<{
    bwcData: ApplicationTypeProgress;
    twcData: ApplicationTypeProgress;
    progressSummaryData: OtherServiceProgress;
    gwInvestigationData: Record<string, ProgressStats>;
    vesData: Record<string, ProgressStats>;
    geologicalLoggingData: ApplicationTypeProgress;
    geophysicalLoggingData: ApplicationTypeProgress;
    pumpingTestData: ApplicationTypeProgress;
    privateFinancialSummaryData: FinancialSummaryReport;
    governmentFinancialSummaryData: FinancialSummaryReport;
    totalRevenueHeadCredit: number;
    revenueHeadCreditData: any[];
  } | null>(null);

  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [detailDialogTitle, setDetailDialogTitle] = useState("");
  const [detailDialogData, setDetailDialogData] = useState<Array<SiteDetailWithFileContext | DataEntryFormData | Record<string, any>>>([]);
  const [detailDialogColumns, setDetailDialogColumns] = useState<DetailDialogColumn[]>([]);

  useEffect(() => {
    setHeader('Progress Reports', 'Generate monthly or periodic progress reports for various schemes and services.');
  }, [setHeader]);
  
  useEffect(() => {
    setStartDate(startOfMonth(new Date()));
    setEndDate(endOfMonth(new Date()));
  }, []);
  
  const calculatePaymentEntryTotalGlobal = (payment: any): number => {
    if (!payment) return 0;
    return (Number(payment.contractorsPayment) || 0) + (Number(payment.gst) || 0) + (Number(payment.incomeTax) || 0) + (Number(payment.kbcwb) || 0) + (Number(payment.refundToParty) || 0);
  };

  const handleGenerateReport = useCallback(() => {
    if (!startDate || !endDate) {
        toast({ title: "Date Range Required", description: "Please select both a 'From' and 'To' date to generate the report.", variant: "destructive" });
        return;
    }
    setIsFiltering(true);
    setReportData(null); 

    const sDate = startOfDay(startDate);
    const eDate = endOfDay(endDate);

    const safeParseDate = (dateInput: any): Date | null => {
        if (!dateInput) return null;
        if (dateInput instanceof Date && isValid(dateInput)) return dateInput;
        if (dateInput.toDate && typeof dateInput.toDate === 'function') {
            const d = dateInput.toDate();
            return isValid(d) ? d : null;
        }
        if (typeof dateInput === 'string') {
            const d = parseISO(dateInput);
            if (isValid(d)) return d;
        }
        return null;
    };
    
    const includedSites: SiteDetailWithFileContext[] = fileEntries.flatMap(entry => 
        (entry.siteDetails || [])
        .filter(site => site.workStatus !== "Addl. AS Awaited")
        .map(site => {
            const firstRemittanceDate = safeParseDate(entry.remittanceDetails?.[0]?.dateOfRemittance);
            return { ...site, fileNo: entry.fileNo!, applicantName: entry.applicantName!, applicationType: entry.applicationType!, fileRemittanceDate: firstRemittanceDate, id: entry.id };
        })
    );

    const initialStats = (): ProgressStats => ({ previousBalance: 0, currentApplications: 0, toBeRefunded: 0, totalApplications: 0, completed: 0, balance: 0, previousBalanceData: [], currentApplicationsData: [], toBeRefundedData: [], totalApplicationsData: [], completedData: [], balanceData: [] });

    // Detailed Data Structures
    const bwcData: ApplicationTypeProgress = {};
    const twcData: ApplicationTypeProgress = {};
    applicationTypeOptions.forEach(appType => {
      bwcData[appType] = {}; BWC_DIAMETERS.forEach(d => { bwcData[appType][d] = initialStats(); });
      twcData[appType] = {}; TWC_DIAMETERS.forEach(d => { twcData[appType][d] = initialStats(); });
    });
    
    const gwInvestigationData: Record<string, ProgressStats> = {}; typeOfWellOptions.forEach(w => gwInvestigationData[w] = initialStats());
    const vesData: Record<string, ProgressStats> = {}; typeOfWellOptions.forEach(w => vesData[w] = initialStats());
    const geologicalLoggingData: ApplicationTypeProgress = {}; applicationTypeOptions.forEach(a => geologicalLoggingData[a] = initialStats());
    const geophysicalLoggingData: ApplicationTypeProgress = {}; applicationTypeOptions.forEach(a => geophysicalLoggingData[a] = initialStats());
    const pumpingTestData: ApplicationTypeProgress = {}; applicationTypeOptions.forEach(a => pumpingTestData[a] = initialStats());
    
    // Main Summary Data Structure
    const progressSummaryData: OtherServiceProgress = {} as OtherServiceProgress;
    REPORTING_PURPOSE_ORDER.forEach(p => { progressSummaryData[p as SitePurpose] = initialStats(); });
    
    includedSites.forEach(siteWithFileContext => {
        const { fileRemittanceDate, ...site } = siteWithFileContext;
        const purpose = site.purpose as SitePurpose;
        const diameter = site.diameter;
        const workStatus = site.workStatus as SiteWorkStatus | undefined;
        const completionDate = safeParseDate(site.dateOfCompletion);
        const applicationType = siteWithFileContext.applicationType;

        const isCurrentApplicationInPeriod = fileRemittanceDate && isWithinInterval(fileRemittanceDate, { start: sDate, end: eDate });
        const isCompletedInPeriod = completionDate && isWithinInterval(completionDate, { start: sDate, end: eDate });
        const isToBeRefunded = workStatus && REFUNDED_STATUSES.includes(workStatus);
        const wasActiveBeforePeriod = fileRemittanceDate && isBefore(fileRemittanceDate, sDate) && (!completionDate || !isBefore(completionDate, sDate));

        const updateStats = (statsObj: ProgressStats) => {
            if (!statsObj) return;
            if (isCurrentApplicationInPeriod) { statsObj.currentApplications++; statsObj.currentApplicationsData.push(siteWithFileContext); }
            if (wasActiveBeforePeriod) { statsObj.previousBalance++; statsObj.previousBalanceData.push(siteWithFileContext); }
            if (isCompletedInPeriod) { statsObj.completed++; statsObj.completedData.push(siteWithFileContext); }
            if (isToBeRefunded && fileRemittanceDate && isBefore(fileRemittanceDate, eDate)) { statsObj.toBeRefunded++; statsObj.toBeRefundedData.push(siteWithFileContext); }
        };
        
        let summaryPurposeKey: SitePurpose | null = null;
        if (purpose && PUMPING_TEST_AGGREGATE_PURPOSES.includes(purpose)) {
            summaryPurposeKey = 'Pumping test';
        } else if (purpose && REPORTING_PURPOSE_ORDER.includes(purpose)) {
            summaryPurposeKey = purpose;
        }

        if (summaryPurposeKey) {
            updateStats(progressSummaryData[summaryPurposeKey]);
        }
        
        if (purpose === 'GW Investigation' && site.vesRequired === 'Yes' && progressSummaryData['VES']) {
            updateStats(progressSummaryData['VES']);
        }
        
        if (purpose === 'BWC' && diameter && BWC_DIAMETERS.includes(diameter) && applicationType) {
          if (bwcData[applicationType]?.[diameter]) { updateStats(bwcData[applicationType][diameter]); }
        } else if (purpose === 'TWC' && diameter && TWC_DIAMETERS.includes(diameter) && applicationType) {
          if (twcData[applicationType]?.[diameter]) { updateStats(twcData[applicationType][diameter]); }
        } else if (INVESTIGATION_WELL_TYPE_PURPOSES.includes(purpose as SitePurpose)) {
            const wellType = (site as any).typeOfWell;
            if (wellType && gwInvestigationData[wellType]) { 
                const targetData = purpose === "GW Investigation" ? gwInvestigationData : vesData;
                updateStats(targetData[wellType]);
            }
        } else if (INVESTIGATION_APP_TYPE_PURPOSES.includes(purpose as SitePurpose)) {
            if (applicationType) {
                const targetData = purpose === "Geological logging" ? geologicalLoggingData : geophysicalLoggingData;
                updateStats(targetData[applicationType]);
            }
        } else if (PUMPING_TEST_AGGREGATE_PURPOSES.includes(purpose as SitePurpose)) {
            if (applicationType) { updateStats(pumpingTestData[applicationType]); }
        }
    });

    const calculateBalanceAndTotal = (stats: ProgressStats) => {
        stats.totalApplications = stats.previousBalance + stats.currentApplications - stats.toBeRefunded;
        stats.balance = stats.totalApplications - stats.completed;
        const totalApplicationSites = new Map<string, SiteDetailWithFileContext>();
        [...stats.previousBalanceData, ...stats.currentApplicationsData].forEach(site => { const key = `${site.fileNo}-${site.nameOfSite}`; if (!totalApplicationSites.has(key)) totalApplicationSites.set(key, site); });
        const toBeRefundedKeys = new Set(stats.toBeRefundedData.map(site => `${site.fileNo}-${site.nameOfSite}`));
        toBeRefundedKeys.forEach(key => totalApplicationSites.delete(key));
        stats.totalApplicationsData = Array.from(totalApplicationSites.values());
        const completedKeys = new Set(stats.completedData.map(site => `${site.fileNo}-${site.nameOfSite}`));
        stats.balanceData = stats.totalApplicationsData.filter(site => !completedKeys.has(`${site.fileNo}-${site.nameOfSite}`));
    };
    
    Object.values(progressSummaryData).forEach(calculateBalanceAndTotal);
    applicationTypeOptions.forEach(appType => {
      BWC_DIAMETERS.forEach(d => { if(bwcData[appType]?.[d]) calculateBalanceAndTotal(bwcData[appType][d]) });
      TWC_DIAMETERS.forEach(d => { if(twcData[appType]?.[d]) calculateBalanceAndTotal(twcData[appType][d]) });
      if(geologicalLoggingData[appType]) calculateBalanceAndTotal(geologicalLoggingData[appType]);
      if(geophysicalLoggingData[appType]) calculateBalanceAndTotal(geophysicalLoggingData[appType]);
      if(pumpingTestData[appType]) calculateBalanceAndTotal(pumpingTestData[appType]);
    });
    typeOfWellOptions.forEach(w => {
      if(gwInvestigationData[w]) calculateBalanceAndTotal(gwInvestigationData[w]);
      if(vesData[w]) calculateBalanceAndTotal(vesData[w]);
    });

    // Financial Summary Calculation
    const privateFinancialSummaryData: FinancialSummaryReport = {};
    const governmentFinancialSummaryData: FinancialSummaryReport = {};
    const revenueHeadCreditData: any[] = [];
    
    const privateEntries = fileEntries.filter(entry => entry.applicationType && PRIVATE_APPLICATION_TYPES.includes(entry.applicationType as any));
    const governmentEntries = fileEntries.filter(entry => !entry.applicationType || !PRIVATE_APPLICATION_TYPES.includes(entry.applicationType as any));
    
    const processFinancialSummary = (entries: DataEntryFormData[], summaryData: FinancialSummaryReport) => {
        const checkDateInRange = (date: any) => {
            const d = safeParseDate(date);
            return d && isWithinInterval(d, { start: sDate, end: eDate });
        };

        entries.forEach(entry => {
            const purpose = entry.siteDetails?.[0]?.purpose || 'Others';
            
            const hasRemittanceInPeriod = entry.remittanceDetails?.some(rd => checkDateInRange(rd.dateOfRemittance));

            if (hasRemittanceInPeriod) {
                if (!summaryData[purpose]) {
                    summaryData[purpose] = { totalApplications: 0, totalRemittance: 0, totalCompleted: 0, totalPayment: 0, applicationData: [], completedData: [], paymentData: [] };
                }
                summaryData[purpose].totalApplications++;
                summaryData[purpose].applicationData.push(entry);
                entry.remittanceDetails?.forEach(rd => {
                    if (checkDateInRange(rd.dateOfRemittance)) {
                        summaryData[purpose].totalRemittance += (Number(rd.amountRemitted) || 0);
                    }
                });
            }

            entry.paymentDetails?.forEach(pd => {
                if (checkDateInRange(pd.dateOfPayment)) {
                    if (!summaryData[purpose]) {
                        summaryData[purpose] = { totalApplications: 0, totalRemittance: 0, totalCompleted: 0, totalPayment: 0, applicationData: [], completedData: [], paymentData: [] };
                    }
                    const paymentAmount = calculatePaymentEntryTotalGlobal(pd);
                    summaryData[purpose].totalPayment += paymentAmount;
                    summaryData[purpose].paymentData.push({ ...pd, fileNo: entry.fileNo, applicantName: entry.applicantName, siteDetails: entry.siteDetails || [] });
                }
            });

            entry.siteDetails?.forEach(site => {
                const completionDate = safeParseDate(site.dateOfCompletion);
                if (completionDate && isValid(completionDate) && isWithinInterval(completionDate, { start: sDate, end: eDate })) {
                    if (!summaryData[purpose]) {
                        summaryData[purpose] = { totalApplications: 0, totalRemittance: 0, totalCompleted: 0, totalPayment: 0, applicationData: [], completedData: [], paymentData: [] };
                    }
                    summaryData[purpose].totalCompleted++;
                    const siteWithContext = { ...site, fileNo: entry.fileNo!, applicantName: entry.applicantName!, applicationType: entry.applicationType! };
                    summaryData[purpose].completedData.push(siteWithContext);
                }
            });
        });
    };
    
    processFinancialSummary(privateEntries, privateFinancialSummaryData);
    processFinancialSummary(governmentEntries, governmentFinancialSummaryData);

    const uniqueRevenueCredits = new Map<string, { entryId: string; amount: number }>();
    fileEntries.forEach(entry => {
        if (!entry.id) return;
        entry.paymentDetails?.forEach(pd => {
            const paymentDate = safeParseDate(pd.dateOfPayment);
            if (paymentDate && isValid(paymentDate) && isWithinInterval(paymentDate, { start: sDate, end: eDate }) && pd.revenueHead) {
                const amount = Number(pd.revenueHead) || 0;
                if (amount > 0) {
                    const existing = uniqueRevenueCredits.get(entry.id!);
                    if (existing) {
                        existing.amount += amount;
                    } else {
                        uniqueRevenueCredits.set(entry.id!, { entryId: entry.id!, amount });
                    }
                }
            }
        });
    });

    const totalRevenueHeadCredit = Array.from(uniqueRevenueCredits.values()).reduce((sum, item) => sum + item.amount, 0);

    setReportData({ 
        bwcData, twcData, progressSummaryData, gwInvestigationData, vesData, geologicalLoggingData, geophysicalLoggingData, pumpingTestData, 
        privateFinancialSummaryData, 
        governmentFinancialSummaryData,
        totalRevenueHeadCredit,
        revenueHeadCreditData: Array.from(uniqueRevenueCredits.values()),
    });
    setIsFiltering(false);
  }, [fileEntries, startDate, endDate, toast]);
  
  useEffect(() => {
    if (!entriesLoading) {
      if (startDate && endDate) {
        handleGenerateReport();
      } else {
        setIsFiltering(false);
        setReportData(null);
      }
    }
  }, [entriesLoading, startDate, endDate, handleGenerateReport]); 

  const handleResetFilters = () => {
    const today = new Date();
    setStartDate(startOfMonth(today));
    setEndDate(endOfMonth(today));
  };
  
  const handleExportExcel = async () => { /* Excel export logic here */ };

  const handleCountClick = (data: Array<any>, title: string) => {
    if (!data || data.length === 0) return;
    setDetailDialogTitle(title);

    let columns: DetailDialogColumn[];
    let dialogData: Array<Record<string, any>>;

    const isPaymentData = data[0] && 'paymentAccount' in data[0];
    const isFileLevelData = data[0] && 'siteDetails' in data[0];
    const isRevenueHeadData = title === 'Revenue Head Credits';
    
    if (isRevenueHeadData) {
        columns = [
            { key: 'slNo', label: 'Sl. No.' },
            { key: 'fileNo', label: 'File No.' },
            { key: 'applicantName', label: 'Applicant' },
            { key: 'siteNames', label: 'Site(s)' },
            { key: 'purposes', label: 'Purpose(s)' },
            { key: 'workStatuses', label: 'Work Status(es)' },
            { key: 'amount', label: 'Credited Amount (₹)', isNumeric: true },
        ];
        
        const relevantFileEntries = fileEntries.filter(entry => data.some((creditItem: any) => creditItem.entryId === entry.id));
        
        dialogData = relevantFileEntries.map((entry, index) => {
            const creditEntry = data.find((creditItem: any) => creditItem.entryId === entry.id);
            const totalCreditForFile = creditEntry ? creditEntry.amount : 0;
            const sites = (entry.siteDetails && entry.siteDetails.length > 0)
                ? entry.siteDetails
                : [{ nameOfSite: 'N/A', purpose: 'N/A', workStatus: entry.fileStatus }];

            return {
                slNo: index + 1,
                fileNo: entry.fileNo,
                applicantName: entry.applicantName,
                siteNames: sites.map(s => s.nameOfSite).join(', '),
                purposes: [...new Set(sites.map(s => s.purpose))].join(', '),
                workStatuses: [...new Set(sites.map(s => s.workStatus))].join(', '),
                amount: totalCreditForFile.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            };
        });

    } else if (isPaymentData) {
        columns = [
            { key: 'slNo', label: 'Sl. No.' },
            { key: 'fileNo', label: 'File No.' },
            { key: 'applicantName', label: 'Applicant' },
            { key: 'siteNames', label: 'Site Name(s)' },
            { key: 'purposes', label: 'Purpose(s)' },
            { key: 'workStatuses', label: 'Work Status(es)' },
            { key: 'dateOfPayment', label: 'Payment Date' },
            { key: 'totalPaymentPerEntry', label: 'Amount (₹)', isNumeric: true },
        ];
        dialogData = data.map((payment, index) => ({
            slNo: index + 1,
            fileNo: payment.fileNo,
            applicantName: payment.applicantName,
            siteNames: (payment.siteDetails || []).map((s: any) => s.nameOfSite).join(', ') || 'N/A',
            purposes: [...new Set((payment.siteDetails || []).map((s: any) => s.purpose))].join(', ') || 'N/A',
            workStatuses: [...new Set((payment.siteDetails || []).map((s: any) => s.workStatus))].join(', ') || 'N/A',
            dateOfPayment: payment.dateOfPayment ? format(new Date(payment.dateOfPayment), 'dd/MM/yyyy') : 'N/A',
            totalPaymentPerEntry: (Number(payment.totalPaymentPerEntry) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        }));
    } else if (isFileLevelData) {
        columns = [
            { key: 'slNo', label: 'Sl. No.' }, { key: 'fileNo', label: 'File No.' },
            { key: 'applicantName', label: 'Applicant' }, { key: 'siteName', label: 'Site Name' },
            { key: 'purpose', label: 'Purpose' }, { key: 'workStatus', label: 'Work Status' },
            { key: 'remittedAmount', label: 'Remitted (₹)', isNumeric: true }, { key: 'remittanceDate', label: 'First Remittance' }
        ];

        dialogData = (data as DataEntryFormData[]).flatMap((entry, entryIndex) => 
            (entry.siteDetails && entry.siteDetails.length > 0 ? entry.siteDetails : [{nameOfSite: 'N/A', purpose: 'N/A', workStatus: 'N/A'}]).map((site, siteIndex) => ({
                slNo: `${entryIndex + 1}.${siteIndex + 1}`,
                fileNo: entry.fileNo, applicantName: entry.applicantName,
                siteName: site.nameOfSite, purpose: site.purpose, workStatus: site.workStatus,
                remittedAmount: (Number(entry.totalRemittance) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                remittanceDate: entry.remittanceDetails?.[0]?.dateOfRemittance ? format(new Date(entry.remittanceDetails[0].dateOfRemittance), 'dd/MM/yyyy') : 'N/A'
            }))
        ).map((item, index) => ({...item, slNo: index + 1}));
    } else {
         columns = [ { key: 'slNo', label: 'Sl. No.' }, { key: 'fileNo', label: 'File No.' }, { key: 'applicantName', label: 'Applicant' }, { key: 'nameOfSite', label: 'Site Name' }, { key: 'purpose', label: 'Purpose' }, { key: 'workStatus', label: 'Work Status' }, ];
         dialogData = (data as SiteDetailWithFileContext[]).map((site, index) => ({ slNo: index + 1, fileNo: site.fileNo, applicantName: site.applicantName, nameOfSite: site.nameOfSite, purpose: site.purpose, workStatus: site.workStatus }));
    }
    
    setDetailDialogColumns(columns);
    setDetailDialogData(dialogData);
    setIsDetailDialogOpen(true);
  };
  
  const exportDialogDataToExcel = async () => { /* Export dialog data logic here */ };

  const uniqueApplicationTypes = useMemo(() => [...new Set(applicationTypeOptions.filter(type => !['GW_Investigation', 'Logging_Pumping_Test'].some(prefix => type.startsWith(prefix))))], []);

  const handleFinancialTotalClick = (type: 'applications' | 'remittance' | 'completed' | 'payment', financialData: FinancialSummaryReport, category: string) => {
      const allData = Object.values(financialData);
      let aggregatedData: any[] = [];
      let title = '';
  
      if (type === 'applications' || type === 'remittance') {
          aggregatedData = allData.flatMap(d => d.applicationData);
          title = `All Remitted Applications (${category})`;
      } else if (type === 'completed') {
          aggregatedData = allData.flatMap(d => d.completedData);
          title = `All Completed Works (${category})`;
      } else if (type === 'payment') {
          aggregatedData = allData.flatMap(d => d.paymentData || []);
          title = `All Payments (${category})`;
      }
      
      if (aggregatedData.length > 0) {
          handleCountClick(aggregatedData, title);
      }
  };


  const FinancialSummaryTable = ({ data, onCellClick, onTotalClick, category }: { data: FinancialSummaryReport, onCellClick: (dataType: 'application' | 'payment', purpose: string, data: any[], title: string) => void, onTotalClick: (type: 'applications' | 'remittance' | 'completed' | 'payment') => void, category: string }) => {
    const categories = Object.keys(data);
    const totals = {
        totalApplications: categories.reduce((sum, key) => sum + data[key].totalApplications, 0),
        totalRemittance: categories.reduce((sum, key) => sum + data[key].totalRemittance, 0),
        totalCompleted: categories.reduce((sum, key) => sum + data[key].totalCompleted, 0),
        totalPayment: categories.reduce((sum, key) => sum + data[key].totalPayment, 0),
    };
    if (categories.length === 0) return <p className="text-center text-sm text-muted-foreground p-4">No data for this category in the selected period.</p>;
    return (
        <Table>
            <TableHeader><TableRow><TableHead>Type of Purpose</TableHead><TableHead className="text-center">Total Application Received</TableHead><TableHead className="text-right">Total Remittance (₹)</TableHead><TableHead className="text-center">No. of Application Completed</TableHead><TableHead className="text-right">Total Payment (₹)</TableHead></TableRow></TableHeader>
            <TableBody>
                {categories.map(key => (
                    <TableRow key={key}>
                        <TableCell className="font-medium">{key}</TableCell>
                        <TableCell className="text-center"><Button variant="link" disabled={data[key].totalApplications === 0} onClick={() => onCellClick('application', key, data[key].applicationData, `${category} Applications for ${key}`)}>{data[key].totalApplications}</Button></TableCell>
                        <TableCell className="text-right font-mono"><Button variant="link" className="p-0 h-auto font-mono text-right w-full block" disabled={data[key].totalRemittance === 0} onClick={() => onCellClick('application', key, data[key].applicationData, `${category} Remittances for ${key}`)}>{data[key].totalRemittance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Button></TableCell>
                        <TableCell className="text-center"><Button variant="link" disabled={data[key].totalCompleted === 0} onClick={() => onCellClick('application', key, data[key].completedData, `${category} Completed Works for ${key}`)}>{data[key].totalCompleted}</Button></TableCell>
                        <TableCell className="text-right font-mono"><Button variant="link" className="p-0 h-auto font-mono text-right w-full block" disabled={data[key].totalPayment === 0} onClick={() => onCellClick('payment', key, data[key].paymentData, `${category} Payments for ${key}`)}>{data[key].totalPayment.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Button></TableCell>
                    </TableRow>
                ))}
            </TableBody>
            <TableFooter>
                <TableRow className="font-bold bg-secondary">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-center"><Button variant="link" className="p-0 h-auto font-bold" onClick={() => onTotalClick('applications')}>{totals.totalApplications}</Button></TableCell>
                    <TableCell className="text-right font-mono"><Button variant="link" className="p-0 h-auto font-bold font-mono text-right w-full block" onClick={() => onTotalClick('remittance')}>{totals.totalRemittance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Button></TableCell>
                    <TableCell className="text-center"><Button variant="link" className="p-0 h-auto font-bold" onClick={() => onTotalClick('completed')}>{totals.totalCompleted}</Button></TableCell>
                    <TableCell className="text-right font-mono"><Button variant="link" className="p-0 h-auto font-bold font-mono text-right w-full block" onClick={() => onTotalClick('payment')}>{totals.totalPayment.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Button></TableCell>
                </TableRow>
            </TableFooter>
        </Table>
    );
  };
  
   const handleGeneratePdfReport = async () => {
    if (!reportData) {
      toast({ title: 'No report data to generate PDF.' });
      return;
    }
    setIsGeneratingPdf(true);
    try {
      const pdfBytes = await generateProgressReportPdf(
        reportData,
        officeAddress,
        startDate,
        endDate
      );
      download(pdfBytes, `Progress_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`, 'application/pdf');
      toast({ title: "PDF Generated", description: "Progress report has been downloaded." });
    } catch (error: any) {
      console.error("PDF Generation Error:", error);
      toast({ title: "PDF Generation Failed", description: error.message, variant: 'destructive' });
    } finally {
      setIsGeneratingPdf(false);
    }
  };


  if (entriesLoading) {
    return <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex h-full flex-col space-y-6">
      <Card className="shadow-lg bg-background no-print">
          <CardHeader>
            <div className="flex flex-col sm:flex-row flex-wrap gap-2 pt-4">
                <Input 
                    type="date" 
                    id="progress-report-start-date"
                    name="progressReportStartDate"
                    placeholder="From Date" 
                    className="w-full sm:w-auto" 
                    value={startDate ? format(startDate, 'yyyy-MM-dd') : ''} 
                    onChange={(e) => setStartDate(e.target.value ? parse(e.target.value, 'yyyy-MM-dd', new Date()) : undefined)} 
                />
                <Input 
                    type="date" 
                    id="progress-report-end-date"
                    name="progressReportEndDate"
                    placeholder="To Date" 
                    className="w-full sm:w-auto" 
                    value={endDate ? format(endDate, 'yyyy-MM-dd') : ''} 
                    onChange={(e) => setEndDate(e.target.value ? parse(e.target.value, 'yyyy-MM-dd', new Date()) : undefined)} 
                />
                <Button onClick={handleGenerateReport} disabled={isFiltering || !startDate || !endDate}><Play className="mr-2 h-4 w-4" />Generate</Button>
                <Button onClick={handleResetFilters} variant="outline" className="w-full sm:w-auto flex-grow sm:flex-grow-0"><XCircle className="mr-2 h-4 w-4" />Clear</Button>
                <Button onClick={handleExportExcel} disabled={!reportData || isFiltering} variant="outline" className="w-full sm:w-auto flex-grow sm:flex-grow-0"><FileDown className="mr-2 h-4 w-4" />Export</Button>
                <Button onClick={handleGeneratePdfReport} disabled={!reportData || isFiltering || isGeneratingPdf} variant="outline" className="w-full sm:w-auto flex-grow sm:flex-grow-0">
                  {isGeneratingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                  Progress Report
                </Button>
            </div>
          </CardHeader>
      </Card>
      
      <ScrollArea className="flex-1">
        <div className="space-y-8 pr-4">
            {isFiltering ? (
                <div className="flex items-center justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2 text-muted-foreground">Generating reports...</p></div>
            ) : reportData ? (
            <>
                <Card className="shadow-lg">
                    <CardHeader><CardTitle>Progress Summary (Aggregate)</CardTitle></CardHeader>
                    <CardContent>
                        <div className="relative overflow-x-auto">
                            <Table className="min-w-full border-collapse">
                            <TableHeader><TableRow><TableHead className="border p-2 align-middle text-center font-semibold">Service Type</TableHead><TableHead className="border p-2 text-center font-semibold">Previous Balance</TableHead><TableHead className="border p-2 text-center font-semibold">Current Application</TableHead><TableHead className="border p-2 text-center font-semibold">To be refunded</TableHead><TableHead className="border p-2 text-center font-bold">Total Application</TableHead><TableHead className="border p-2 text-center font-semibold">Completed</TableHead><TableHead className="border p-2 text-center font-bold">Balance</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {REPORTING_PURPOSE_ORDER.map(purpose => {
                                const stats = reportData.progressSummaryData[purpose as SitePurpose];
                                return (
                                    <TableRow key={purpose}>
                                        <TableCell className="border p-2 font-medium">
                                            {purpose === 'Pumping test' ? 'Pumping Test (Agg.)' : 
                                             purpose === 'Geological logging' ? 'Geological Logging' :
                                             purpose}
                                        </TableCell>
                                        <TableCell className="border p-2 text-center"><Button variant="link" className="p-0 h-auto" disabled={stats?.previousBalance === 0} onClick={() => handleCountClick(stats.previousBalanceData, `${purpose} - Previous Balance`)}>{stats?.previousBalance || 0}</Button></TableCell>
                                        <TableCell className="border p-2 text-center"><Button variant="link" className="p-0 h-auto" disabled={stats?.currentApplications === 0} onClick={() => handleCountClick(stats.currentApplicationsData, `${purpose} - Current Applications`)}>{stats?.currentApplications || 0}</Button></TableCell>
                                        <TableCell className="border p-2 text-center"><Button variant="link" className="p-0 h-auto" disabled={stats?.toBeRefunded === 0} onClick={() => handleCountClick(stats.toBeRefundedData, `${purpose} - To be Refunded`)}>{stats?.toBeRefunded || 0}</Button></TableCell>
                                        <TableCell className="border p-2 text-center font-bold"><Button variant="link" className="p-0 h-auto font-bold" disabled={stats?.totalApplications === 0} onClick={() => handleCountClick(stats.totalApplicationsData, `Site Details for ${purpose} Applications`)}>{stats?.totalApplications || 0}</Button></TableCell>
                                        <TableCell className="border p-2 text-center"><Button variant="link" className="p-0 h-auto" disabled={stats?.completed === 0} onClick={() => handleCountClick(stats.completedData, `${purpose} - Completed`)}>{stats?.completed || 0}</Button></TableCell>
                                        <TableCell className="border p-2 text-center font-bold"><Button variant="link" className="p-0 h-auto font-bold" disabled={stats?.balance === 0} onClick={() => handleCountClick(stats.balanceData, `${purpose} - Balance`)}>{stats?.balance || 0}</Button></TableCell>
                                    </TableRow>
                                )})}
                            </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                <Accordion type="multiple" className="w-full space-y-4" defaultValue={[]}>
                  <ReportCategoryTable accordionId="gw-investigation" title="GW Investigation" data={reportData.gwInvestigationData} categoryKeys={typeOfWellOptions} categoryLabels={Object.fromEntries(typeOfWellOptions.map(o => [o,o]))} onCountClick={handleCountClick} />
                  <ReportCategoryTable accordionId="ves" title="VES" data={reportData.vesData} categoryKeys={typeOfWellOptions} categoryLabels={Object.fromEntries(typeOfWellOptions.map(o => [o,o]))} onCountClick={handleCountClick} />
                  <ReportCategoryTable accordionId="pumping-test" title="Pumping Test" data={reportData.pumpingTestData} categoryKeys={uniqueApplicationTypes} categoryLabels={applicationTypeDisplayMap} onCountClick={handleCountClick} />
                  <ReportCategoryTable accordionId="geo-logging" title="Geological Logging" data={reportData.geologicalLoggingData} categoryKeys={uniqueApplicationTypes} categoryLabels={applicationTypeDisplayMap} onCountClick={handleCountClick} />
                  <ReportCategoryTable accordionId="geophys-logging" title="Geophysical Logging" data={reportData.geophysicalLoggingData} categoryKeys={uniqueApplicationTypes} categoryLabels={applicationTypeDisplayMap} onCountClick={handleCountClick} />
                </Accordion>

                <Accordion type="multiple" className="w-full space-y-4" defaultValue={[]}>
                  <ReportCategoryTable accordionId="bwc-110" title="BWC - 110 mm (4.5”)" diameter="110 mm (4.5”)" data={reportData.bwcData} categoryKeys={uniqueApplicationTypes} categoryLabels={applicationTypeDisplayMap} onCountClick={handleCountClick} />
                  <ReportCategoryTable accordionId="bwc-150" title="BWC - 150 mm (6”)" diameter="150 mm (6”)" data={reportData.bwcData} categoryKeys={uniqueApplicationTypes} categoryLabels={applicationTypeDisplayMap} onCountClick={handleCountClick} />
                  <ReportCategoryTable accordionId="twc-150" title="TWC - 150 mm (6”)" diameter="150 mm (6”)" data={reportData.twcData} categoryKeys={uniqueApplicationTypes} categoryLabels={applicationTypeDisplayMap} onCountClick={handleCountClick} />
                  <ReportCategoryTable accordionId="twc-200" title="TWC - 200 mm (8”)" diameter="200 mm (8”)" data={reportData.twcData} categoryKeys={uniqueApplicationTypes} categoryLabels={applicationTypeDisplayMap} onCountClick={handleCountClick} />
                </Accordion>

                <Card>
                    <CardHeader><CardTitle>Financial Summary - Private Applications</CardTitle><CardDescription>A summary of financial and application counts for each purpose within the selected period.</CardDescription></CardHeader>
                    <CardContent><FinancialSummaryTable data={reportData.privateFinancialSummaryData} onCellClick={(dataType, purpose, data, title) => handleCountClick(data, title)} onTotalClick={(type) => handleFinancialTotalClick(type, reportData.privateFinancialSummaryData, "Private")} category="Private" /></CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Financial Summary - Government & Other Applications</CardTitle><CardDescription>A summary of financial and application counts for each purpose within the selected period.</CardDescription></CardHeader>
                    <CardContent><FinancialSummaryTable data={reportData.governmentFinancialSummaryData} onCellClick={(dataType, purpose, data, title) => handleCountClick(data, title)} onTotalClick={(type) => handleFinancialTotalClick(type, reportData.governmentFinancialSummaryData, "Government")} category="Government" /></CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><Landmark className="h-5 w-5 text-primary" />Revenue Head Summary</CardTitle><CardDescription>Total amount credited to the Revenue Head within the selected period.</CardDescription></CardHeader>
                    <CardContent className="text-center">
                        <Button variant="link" className="text-4xl font-bold text-green-600 p-0 h-auto hover:underline" onClick={() => handleCountClick(reportData.revenueHeadCreditData, 'Revenue Head Credits')} disabled={reportData.totalRevenueHeadCredit === 0}>
                            ₹{reportData.totalRevenueHeadCredit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Button>
                    </CardContent>
                </Card>
            </>
            ) : (
                <div className="flex items-center justify-center py-10 border-2 border-dashed rounded-lg"><p className="text-muted-foreground">Select a date range and click "Generate Report" to view progress.</p></div>
            )}
        </div>
      </ScrollArea>
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}><DialogContent className="sm:max-w-4xl flex flex-col h-[90vh]"><DialogHeader className="p-6 pb-4 border-b"><DialogTitle>{detailDialogTitle}</DialogTitle><DialogDescription>Showing {detailDialogData.length} records.</DialogDescription></DialogHeader><div className="flex-1 min-h-0 px-6 py-4"><ScrollArea className="h-full pr-4 -mr-4">{detailDialogData.length > 0 ? (<Table><TableHeader className="sticky top-0 bg-background z-10"><TableRow>{detailDialogColumns.map(col => <TableHead key={col.key} className={cn(col.isNumeric && 'text-right')}>{col.label}</TableHead>)}</TableRow></TableHeader><TableBody>{detailDialogData.map((row, rowIndex) => (<TableRow key={rowIndex}>{detailDialogColumns.map(col => <TableCell key={col.key} className={cn('text-xs', col.isNumeric && 'text-right font-mono')}>{row[col.key]}</TableCell>)}</TableRow>))}</TableBody></Table>) : (<p className="text-center text-muted-foreground py-8">No details found for this selection.</p>)}</ScrollArea></div><DialogFooter className="p-6 pt-4 border-t"><Button variant="outline" disabled={detailDialogData.length === 0} onClick={() => {}}><FileDown className="mr-2 h-4 w-4" /> Export to Excel</Button><DialogClose asChild><Button type="button" variant="secondary">Close</Button></DialogClose></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
