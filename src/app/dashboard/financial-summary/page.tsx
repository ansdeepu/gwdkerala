// src/app/dashboard/financial-summary/page.tsx
"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { usePageHeader } from '@/hooks/usePageHeader';
import { format, startOfDay, endOfDay, isWithinInterval, isValid, parseISO, parse } from 'date-fns';
import { cn } from "@/lib/utils";
import type { DataEntryFormData, SitePurpose, SiteWorkStatus, ApplicationType } from '@/lib/schemas';
import { sitePurposeOptions, PLAN_FUND_APPLICATION_TYPES, COLLECTOR_APPLICATION_TYPES, PUBLIC_DEPOSIT_APPLICATION_TYPES, PRIVATE_APPLICATION_TYPES } from '@/lib/schemas';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { getFirestore, collectionGroup, query, onSnapshot, DocumentData, Timestamp } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { useDataStore } from '@/hooks/use-data-store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export const dynamic = 'force-dynamic';

const db = getFirestore(app);

const Loader2 = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);
const XCircle = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
);
const Landmark = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>
);


interface FinancialSummary {
  totalApplications: number;
  totalRemittance: number;
  totalCompleted: number;
  totalPayment: number;
  applicationData: DataEntryFormData[]; 
  completedData: DataEntryFormData[];
}
type FinancialSummaryReport = Record<string, FinancialSummary>;


const processFirestoreDoc = <T,>(doc: DocumentData): T => {
    const data = doc.data();
    const converted: { [key: string]: any } = { id: doc.id };

    for (const key in data) {
        const value = data[key];
        if (value instanceof Timestamp) {
            converted[key] = value.toDate();
        } else if (Array.isArray(value)) {
            converted[key] = value.map(item =>
                typeof item === 'object' && item !== null && !(item instanceof Timestamp)
                    ? processFirestoreDoc({ data: () => item, id: '' })
                    : (item instanceof Timestamp ? item.toDate() : item)
            );
        } else if (typeof value === 'object' && value !== null) {
            converted[key] = processFirestoreDoc({ data: () => value, id: '' });
        } else {
            converted[key] = value;
        }
    }
    return converted as T;
};


const safeParseDate = (dateValue: any): Date | null => {
  if (!dateValue) return null;
  if (dateValue instanceof Date) return dateValue;
  if (typeof dateValue === 'object' && dateValue !== null && typeof (dateValue as any).seconds === 'number') {
    return new Date((dateValue as any).seconds * 1000);
  }
  if (typeof dateValue === 'string' || typeof dateValue === 'number') {
    const parsed = new Date(dateValue);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return null;
};


export default function FinancialSummaryPage() {
    const { setHeader } = usePageHeader();
    const { user } = useAuth();
    const { officeAddresses } = useDataStore();
    const { toast } = useToast();
    
    const [allFileEntries, setAllFileEntries] = useState<DataEntryFormData[]>([]);
    const [entriesLoading, setEntriesLoading] = useState(true);
    const [financeStartDate, setFinanceStartDate] = useState<Date | undefined>(undefined);
    const [financeEndDate, setFinanceEndDate] = useState<Date | undefined>(undefined);
    const [selectedOffice, setSelectedOffice] = useState<string>('all');
    
    useEffect(() => {
        setHeader('Financial Summary', 'An overview of financial metrics including credits, debits, and balances.');
    }, [setHeader]);

    useEffect(() => {
        if (!user) {
          setEntriesLoading(false);
          return;
        }

        const q = query(collectionGroup(db, 'fileEntries'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
          const data = snapshot.docs.map(doc => processFirestoreDoc<DataEntryFormData>({ id: doc.id, data: () => doc.data() }));
          setAllFileEntries(data);
          setEntriesLoading(false);
        }, (error) => {
          console.error("Error fetching all file entries for reports:", error);
          toast({ title: "Error Loading Data", description: error.message, variant: "destructive" });
          setEntriesLoading(false);
        });

        return () => unsubscribe();
    }, [user, toast]);

    const officeLocations = useMemo(() => officeAddresses.map(o => o.officeLocation).sort(), [officeAddresses]);

    const transformedFinanceMetrics = useMemo(() => {
        if (entriesLoading) return null;
    
        const sDate = financeStartDate ? startOfDay(financeStartDate) : null;
        const eDate = financeEndDate ? endOfDay(financeEndDate) : null;
        const isDateFilterActive = !!sDate && !!eDate;

        let entriesToProcess = allFileEntries;
        if (selectedOffice !== 'all') {
            entriesToProcess = allFileEntries.filter(e => e.officeLocation === selectedOffice);
        }

        let sbiCredit = 0, stsbCredit = 0, revenueHeadCreditDirect = 0;
        let sbiDebit = 0, stsbDebit = 0;
        let planFundDeferredAmount = 0;
        let collectorFundDeferredAmount = 0;
        let planFundExpenditure = 0;
        let collectorFundExpenditure = 0;

        const operationalAccountEntries = entriesToProcess.filter(e => {
            const appType = e.applicationType as ApplicationType;
            return PUBLIC_DEPOSIT_APPLICATION_TYPES.includes(appType as any) || PRIVATE_APPLICATION_TYPES.includes(appType as any) || !appType;
        });

        const adminSanctionEntries = entriesToProcess.filter(e => {
            const appType = e.applicationType as ApplicationType;
            return appType && (COLLECTOR_APPLICATION_TYPES.includes(appType as any) || PLAN_FUND_APPLICATION_TYPES.includes(appType as any));
        });

        operationalAccountEntries.forEach((entry: DataEntryFormData) => {
          entry.remittanceDetails?.forEach(rd => {
            const remittedDate = rd.dateOfRemittance ? safeParseDate(rd.dateOfRemittance) : null;
            const isInPeriod = !isDateFilterActive || (remittedDate && isValid(remittedDate) && isWithinInterval(remittedDate, { start: sDate!, end: eDate! }));
            if (isInPeriod) {
              const amount = Number(rd.amountRemitted) || 0;
              if (rd.remittedAccount === 'SBI') sbiCredit += amount;
              else if (rd.remittedAccount === 'STSB') stsbCredit += amount;
            }
          });

          entry.paymentDetails?.forEach(pd => {
            const paymentDate = pd.dateOfPayment ? safeParseDate(pd.dateOfPayment) : null;
            const isInPeriod = !isDateFilterActive || (paymentDate && isValid(paymentDate) && isWithinInterval(paymentDate, { start: sDate!, end: eDate! }));
            
            if (isInPeriod) {
              const currentPaymentDebitAmount = (Number(pd.contractorsPayment) || 0) + (Number(pd.gst) || 0) + (Number(pd.incomeTax) || 0) + (Number(pd.kbcwb) || 0) + (Number(pd.refundToParty) || 0);

              if (pd.paymentAccount === 'SBI') sbiDebit += currentPaymentDebitAmount;
              else if (pd.paymentAccount === 'STSB') stsbDebit += currentPaymentDebitAmount;
            }
          });
        });
        
        adminSanctionEntries.forEach((entry: DataEntryFormData) => {
          const isPlanFund = entry.applicationType && PLAN_FUND_APPLICATION_TYPES.includes(entry.applicationType as any);
          const isCollectorFund = entry.applicationType && COLLECTOR_APPLICATION_TYPES.includes(entry.applicationType as any);

          entry.remittanceDetails?.forEach(rd => {
            const remittedDate = rd.dateOfRemittance ? safeParseDate(rd.dateOfRemittance) : null;
            const isInPeriod = !isDateFilterActive || (remittedDate && isValid(remittedDate) && isWithinInterval(remittedDate, { start: sDate!, end: eDate! }));
            
            if (isInPeriod) {
              const amount = Number(rd.amountRemitted) || 0;
              if (isPlanFund) planFundDeferredAmount += amount;
              if (isCollectorFund) collectorFundDeferredAmount += amount;
            }
          });

          entry.paymentDetails?.forEach(pd => {
            const paymentDate = pd.dateOfPayment ? safeParseDate(pd.dateOfPayment) : null;
            const isInPeriod = !isDateFilterActive || (paymentDate && isValid(paymentDate) && isWithinInterval(paymentDate, { start: sDate!, end: eDate! }));
            
            if (isInPeriod) {
              const totalPaymentPerEntry = (Number(pd.totalPaymentPerEntry) || 0);
              if (isPlanFund) planFundExpenditure += totalPaymentPerEntry;
              if (isCollectorFund) collectorFundExpenditure += totalPaymentPerEntry;
            }
          });
        });

        entriesToProcess.forEach((entry: DataEntryFormData) => {
            entry.remittanceDetails?.forEach(rd => {
                const remDate = rd.dateOfRemittance ? safeParseDate(rd.dateOfRemittance) : null;
                const isInPeriod = !isDateFilterActive || (remDate && isValid(remDate) && isWithinInterval(remDate, { start: sDate!, end: eDate! }));
                if (isInPeriod && rd.remittedAccount === 'Revenue Head') {
                    revenueHeadCreditDirect += Number(rd.amountRemitted) || 0;
                }
            });
            entry.paymentDetails?.forEach(pd => {
                const paymentDate = pd.dateOfPayment ? safeParseDate(pd.dateOfPayment) : null;
                const isInPeriod = !isDateFilterActive || (paymentDate && isValid(paymentDate) && isWithinInterval(paymentDate, { start: sDate!, end: eDate! }));
                 if (isInPeriod && pd.revenueHead) {
                    revenueHeadCreditDirect += Number(pd.revenueHead) || 0;
                 }
            });
        });
        
        return {
          sbiCredit, sbiDebit, sbiBalance: sbiCredit - sbiDebit,
          stsbCredit, stsbDebit, stsbBalance: stsbCredit - stsbDebit,
          revenueHeadCredit: revenueHeadCreditDirect,
          planFundDeferredAmount,
          collectorFundDeferredAmount,
          planFundExpenditure,
          collectorFundExpenditure,
        };
    }, [financeStartDate, financeEndDate, allFileEntries, entriesLoading, selectedOffice]);


    const handleClearFinanceDates = () => {
        setFinanceStartDate(undefined);
        setFinanceEndDate(undefined);
    };

    const parseDateFromString = (dateString: string): Date | undefined => {
        if (!dateString) return undefined;
        const parsedDate = parse(dateString, 'dd/MM/yyyy', new Date());
        return isValid(parsedDate) ? parsedDate : undefined;
    };


    if (entriesLoading) {
      return (
        <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-3 text-muted-foreground">Loading financial data...</p>
        </div>
      );
    }

    return (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <CardTitle className="flex items-center gap-2"><Landmark className="h-5 w-5 text-primary" />Financial Summary</CardTitle>
                <CardDescription>An overview of financial metrics including credits, debits, and balances.</CardDescription>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-4 border-t mt-4">
              {user?.email === "keralagwd@gmail.com" && (
                <div className="space-y-1">
                  <Label htmlFor="office-select">Office Location</Label>
                  <Select value={selectedOffice} onValueChange={setSelectedOffice}>
                    <SelectTrigger id="office-select" className="w-full sm:w-[240px]">
                      <SelectValue placeholder="Select Office" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Offices</SelectItem>
                        {officeLocations.map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1">
                <Label>From Date</Label>
                <Input type="date" placeholder="From: yyyy-mm-dd" className="w-[180px]" value={financeStartDate ? format(financeStartDate, "yyyy-MM-dd") : ''} onChange={(e) => setFinanceStartDate(e.target.value ? new Date(e.target.value) : undefined)} />
              </div>
              <div className="space-y-1">
                <Label>To Date</Label>
                <Input type="date" placeholder="To: yyyy-mm-dd" className="w-[180px]" value={financeEndDate ? format(financeEndDate, "yyyy-MM-dd") : ''} onChange={(e) => setFinanceEndDate(e.target.value ? new Date(e.target.value) : undefined)} />
              </div>
              <div className="self-end">
                <Button onClick={handleClearFinanceDates} variant="ghost" className="h-9 px-3"><XCircle className="mr-2 h-4 w-4"/>Clear Dates</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
              {transformedFinanceMetrics ? (
                <div className="space-y-6">
                  <Card className="shadow-inner bg-background/50">
                      <CardHeader className="pb-4">
                          <CardTitle className="text-lg">Operational Accounts</CardTitle>
                      </CardHeader>
                      <CardContent>
                          <Table>
                            <TableHeader><TableRow><TableHead>Account</TableHead><TableHead className="text-right">Total Credit (₹)</TableHead><TableHead className="text-right">Total Debit (₹)</TableHead><TableHead className="text-right">Balance (₹)</TableHead></TableRow></TableHeader>
                            <TableBody>
                              <TableRow><TableCell className="font-medium">SBI</TableCell><TableCell className="text-right font-mono font-bold text-green-600">{transformedFinanceMetrics.sbiCredit.toLocaleString('en-IN')}</TableCell><TableCell className="text-right font-mono font-bold text-red-600">{transformedFinanceMetrics.sbiDebit.toLocaleString('en-IN')}</TableCell><TableCell className="text-right font-mono font-bold">{transformedFinanceMetrics.sbiBalance.toLocaleString('en-IN')}</TableCell></TableRow>
                              <TableRow><TableCell className="font-medium">STSB</TableCell><TableCell className="text-right font-mono font-bold text-green-600">{transformedFinanceMetrics.stsbCredit.toLocaleString('en-IN')}</TableCell><TableCell className="text-right font-mono font-bold text-red-600">{transformedFinanceMetrics.stsbDebit.toLocaleString('en-IN')}</TableCell><TableCell className="text-right font-mono font-bold">{transformedFinanceMetrics.stsbBalance.toLocaleString('en-IN')}</TableCell></TableRow>
                            </TableBody>
                            <TableFooter><TableRow className="bg-muted/80"><TableCell className="font-bold">Total Balance</TableCell><TableCell colSpan={3} className="text-right font-bold text-lg text-primary">₹{(transformedFinanceMetrics.sbiBalance + transformedFinanceMetrics.stsbBalance).toLocaleString('en-IN')}</TableCell></TableRow></TableFooter>
                          </Table>
                      </CardContent>
                  </Card>
                   <Card className="shadow-inner bg-background/50">
                      <CardHeader className="pb-4">
                          <CardTitle className="text-lg">Administrative Sanction of Funds</CardTitle>
                      </CardHeader>
                      <CardContent>
                          <Table>
                               <TableHeader>
                                <TableRow>
                                  <TableHead>Fund Type</TableHead>
                                  <TableHead className="text-right">Total Sanctioned Amount (₹)</TableHead>
                                  <TableHead className="text-right">Total Expenditure (₹)</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                  <TableRow>
                                      <TableCell className="font-medium">Plan Fund (GWBDWS)</TableCell>
                                      <TableCell className="text-right font-mono font-bold">
                                          <Button variant="link" className="p-0 h-auto font-mono text-right w-full block font-bold" disabled={!transformedFinanceMetrics.planFundDeferredAmount}>
                                              {transformedFinanceMetrics.planFundDeferredAmount.toLocaleString('en-IN')}
                                          </Button>
                                      </TableCell>
                                      <TableCell className="text-right font-mono font-bold text-red-600">
                                          <Button variant="link" className="p-0 h-auto font-mono text-right w-full block font-bold text-red-600" disabled={!transformedFinanceMetrics.planFundExpenditure}>
                                              {transformedFinanceMetrics.planFundExpenditure.toLocaleString('en-IN')}
                                          </Button>
                                      </TableCell>
                                  </TableRow>
                                  <TableRow>
                                      <TableCell className="font-medium">Collector's Deposit Works</TableCell>
                                       <TableCell className="text-right font-mono font-bold">
                                            <Button variant="link" className="p-0 h-auto font-mono text-right w-full block font-bold" disabled={!transformedFinanceMetrics.collectorFundDeferredAmount}>
                                                {transformedFinanceMetrics.collectorFundDeferredAmount.toLocaleString('en-IN')}
                                            </Button>
                                       </TableCell>
                                       <TableCell className="text-right font-mono font-bold text-red-600">
                                            <Button variant="link" className="p-0 h-auto font-mono text-right w-full block font-bold text-red-600" disabled={!transformedFinanceMetrics.collectorFundExpenditure}>
                                               {transformedFinanceMetrics.collectorFundExpenditure.toLocaleString('en-IN')}
                                            </Button>
                                       </TableCell>
                                  </TableRow>
                              </TableBody>
                          </Table>
                      </CardContent>
                  </Card>
                   <Card className="shadow-inner bg-background/50">
                      <CardHeader className="pb-4">
                          <CardTitle className="text-lg">Revenue Head Summary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="p-4 flex items-center justify-between">
                            <span className="font-medium">Total Credited to Revenue Head</span>
                            <span className="text-lg font-bold font-mono text-green-600">
                                ₹{transformedFinanceMetrics.revenueHeadCredit.toLocaleString('en-IN')}
                            </span>
                        </div>
                      </CardContent>
                  </Card>
                </div>
              ) : (<div className="h-40 flex items-center justify-center"><p className="text-muted-foreground">Calculating financial data...</p></div>)}
            </CardContent>
            <CardFooter>
                <p className="text-xs text-muted-foreground pt-4">
                    Note: Operational Accounts data is based on Deposit Works (Public & Private). Administrative Sanction data is based on Collector's & Plan Fund works. Revenue Head includes credits from all work types.
                </p>
          </CardFooter>
        </Card>
    );
}
