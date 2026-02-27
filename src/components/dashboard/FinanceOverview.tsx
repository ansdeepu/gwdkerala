
// src/components/dashboard/FinanceOverview.tsx
"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useAllFileEntriesForReports } from '@/hooks/useAllFileEntriesForReports';
import { usePageHeader } from '@/hooks/usePageHeader';
import { format, startOfDay, endOfDay, isWithinInterval, isValid, parseISO, parse } from 'date-fns';
import { cn } from "@/lib/utils";
import type { DataEntryFormData, SitePurpose, SiteWorkStatus, ApplicationType } from '@/lib/schemas';
import { sitePurposeOptions, COLLECTOR_APPLICATION_TYPES, PLAN_FUND_APPLICATION_TYPES, PUBLIC_DEPOSIT_APPLICATION_TYPES, PRIVATE_APPLICATION_TYPES } from '@/lib/schemas';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Loader2, RefreshCw, XCircle, Landmark, TrendingUp, TrendingDown, Wallet, CalendarIcon } from 'lucide-react';

interface FinancialSummary {
  totalApplications: number;
  totalRemittance: number;
  totalCompleted: number;
  totalPayment: number;
  applicationData: DataEntryFormData[]; 
  completedData: SiteDetailWithFileContext[];
}
type FinancialSummaryReport = Record<string, FinancialSummary>;


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

interface FinanceOverviewProps {
    allFileEntries: DataEntryFormData[];
    onOpenDialog: (data: any[], title: string, columns: any[], type: 'detail' | 'rig' | 'age' | 'month' | 'fileStatus' | 'finance') => void;
    dates: { start?: Date, end?: Date };
    onSetDates: (dates: { start?: Date, end?: Date }) => void;
  }

export default function FinanceOverview({ allFileEntries, onOpenDialog, dates, onSetDates }: FinanceOverviewProps) {
    const { isReportLoading } = useAllFileEntriesForReports();
    
    const transformedFinanceMetrics = useMemo(() => {
        if (isReportLoading) return null;
    
        let sDate: Date | null = null;
        let eDate: Date | null = null;
        const isDateFilterActive = !!dates.start && !!dates.end;

        if (isDateFilterActive && dates.start && dates.end) {
            sDate = startOfDay(dates.start);
            eDate = endOfDay(dates.end);
        }

        let sbiCredit = 0, stsbCredit = 0, revenueHeadCreditDirect = 0;
        let sbiDebit = 0, stsbDebit = 0;
        let planFundExpenditure = 0;
        let collectorFundExpenditure = 0;
        let planFundDeferredAmount = 0;
        let collectorFundDeferredAmount = 0;

        const operationalAccountEntries: DataEntryFormData[] = [];
        const adminSanctionEntries: DataEntryFormData[] = [];

        allFileEntries.forEach(e => {
            const appType = e.applicationType as ApplicationType;
            const isAdminSanctioned = appType && ((COLLECTOR_APPLICATION_TYPES as any).includes(appType) || (PLAN_FUND_APPLICATION_TYPES as any).includes(appType));

            if (isAdminSanctioned) {
                adminSanctionEntries.push(e);
            } else {
                operationalAccountEntries.push(e);
            }
        });


        // Operational Accounts
        operationalAccountEntries.forEach(entry => {
            entry.remittanceDetails?.forEach(rd => {
                const remittedDate = rd.dateOfRemittance ? safeParseDate(rd.dateOfRemittance) : null;
                const isInPeriod = !isDateFilterActive || (remittedDate && isValid(remittedDate) && sDate && eDate && isWithinInterval(remittedDate, { start: sDate, end: eDate }));
                if (isInPeriod) {
                    const amount = Number(rd.amountRemitted) || 0;
                    if (rd.remittedAccount === 'SBI' || rd.remittedAccount === 'Bank') sbiCredit += amount;
                    else if (rd.remittedAccount === 'STSB') stsbCredit += amount;
                }
            });
            entry.paymentDetails?.forEach(pd => {
                const paymentDate = pd.dateOfPayment ? safeParseDate(pd.dateOfPayment) : null;
                const isInPeriod = !isDateFilterActive || (paymentDate && isValid(paymentDate) && sDate && eDate && isWithinInterval(paymentDate, { start: sDate, end: eDate }));
                if (isInPeriod) {
                    const currentPaymentDebitAmount = (Number(pd.contractorsPayment) || 0) + (Number(pd.gst) || 0) + (Number(pd.incomeTax) || 0) + (Number(pd.kbcwb) || 0) + (Number(pd.refundToParty) || 0);
                    if (pd.paymentAccount === 'SBI' || pd.paymentAccount === 'Bank') sbiDebit += currentPaymentDebitAmount;
                    else if (pd.paymentAccount === 'STSB') stsbDebit += currentPaymentDebitAmount;
                }
            });
        });

        // Administrative Sanction
        adminSanctionEntries.forEach(entry => {
            const isPlanFund = entry.applicationType && (PLAN_FUND_APPLICATION_TYPES as any).includes(entry.applicationType as ApplicationType);
            const isCollectorFund = entry.applicationType && (COLLECTOR_APPLICATION_TYPES as any).includes(entry.applicationType as ApplicationType);
            entry.remittanceDetails?.forEach(rd => {
                const remittedDate = rd.dateOfRemittance ? safeParseDate(rd.dateOfRemittance) : null;
                const isInPeriod = !isDateFilterActive || (remittedDate && isValid(remittedDate) && sDate && eDate && isWithinInterval(remittedDate, { start: sDate, end: eDate }));
                if (isInPeriod) {
                    const amount = Number(rd.amountRemitted) || 0;
                    if (isPlanFund) planFundDeferredAmount += amount;
                    if (isCollectorFund) collectorFundDeferredAmount += amount;
                }
            });
            entry.paymentDetails?.forEach(pd => {
                const paymentDate = pd.dateOfPayment ? safeParseDate(pd.dateOfPayment) : null;
                const isInPeriod = !isDateFilterActive || (paymentDate && isValid(paymentDate) && sDate && eDate && isWithinInterval(paymentDate, { start: sDate, end: eDate }));
                if (isInPeriod) {
                    const totalPaymentPerEntry = (Number(pd.totalPaymentPerEntry) || 0);
                    if (isPlanFund) planFundExpenditure += totalPaymentPerEntry;
                    if (isCollectorFund) collectorFundExpenditure += totalPaymentPerEntry;
                }
            });
        });

        // Revenue Head (all entries)
        allFileEntries.forEach(entry => {
             entry.remittanceDetails?.forEach(rd => {
                const remDate = rd.dateOfRemittance ? safeParseDate(rd.dateOfRemittance) : null;
                const isInPeriod = !isDateFilterActive || (remDate && isValid(remDate) && sDate && eDate && isWithinInterval(remDate, { start: sDate, end: eDate }));
                if (isInPeriod && rd.remittedAccount === 'Revenue Head') {
                    revenueHeadCreditDirect += Number(rd.amountRemitted) || 0;
                }
            });
            entry.paymentDetails?.forEach(pd => {
                const paymentDate = pd.dateOfPayment ? safeParseDate(pd.dateOfPayment) : null;
                const isInPeriod = !isDateFilterActive || (paymentDate && isValid(paymentDate) && sDate && eDate && isWithinInterval(paymentDate, { start: sDate, end: eDate }));
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
    }, [dates.start, dates.end, allFileEntries, isReportLoading]);


    const handleClearFinanceDates = () => {
        onSetDates({ start: undefined, end: undefined });
    };
    
    const handleAmountClick = (account: 'Bank' | 'STSB' | 'RevenueHead' | 'PlanFund' | 'CollectorFund', type: 'credit' | 'debit' | 'expenditure') => {
        let title = '';
        const dataForDialog: Array<Record<string, any>> = [];
        let columnsForDialog: Array<{ key: string; label: string; isNumeric?: boolean; }> = [];
      
        const sDateObj = dates?.start ? startOfDay(dates.start) : null;
        const eDateObj = dates?.end ? endOfDay(dates.end) : null;
        const isDateFilterActive = !!sDateObj && !!eDateObj;
      
        const checkDateInRange = (targetDateValue?: Date | string | null): boolean => {
          if (!isDateFilterActive) return true; 
          if (!targetDateValue || !sDateObj || !eDateObj) return false;
          const targetDate = targetDateValue instanceof Date ? targetDateValue : parseISO(targetDateValue as any);
          if (!isValid(targetDate)) return false;
          return isWithinInterval(targetDate, { start: sDateObj, end: eDateObj });
        };
      
        allFileEntries.forEach(entry => {
          const siteNames = entry.siteDetails?.map(sd => sd.nameOfSite || 'N/A').filter(Boolean).join(', ') || 'N/A';
          const sitePurposes = entry.siteDetails?.map(sd => sd.purpose || 'N/A').filter(Boolean).join(', ') || 'N/A';

          const processCredit = (remittanceType: 'PlanFund' | 'CollectorFund') => {
            title = `${remittanceType === 'PlanFund' ? 'Plan Fund' : "Collector's Fund"} Sanction Details`;
            columnsForDialog = [
              { key: 'slNo', label: 'Sl. No.' }, { key: 'fileNo', label: 'File No.' }, { key: 'applicantName', label: 'Applicant Name' },
              { key: 'siteNames', label: 'Site(s)' }, { key: 'sitePurposes', label: 'Purpose(s)' },
              { key: 'amount', label: 'Sanctioned (₹)', isNumeric: true }, { key: 'date', label: 'Sanction Date' },
            ];
            const targetAppTypes = remittanceType === 'PlanFund' ? PLAN_FUND_APPLICATION_TYPES : COLLECTOR_APPLICATION_TYPES;
            if (entry.applicationType && (targetAppTypes as any).includes(entry.applicationType)) {
                entry.remittanceDetails?.forEach(rd => {
                    if (checkDateInRange(rd.dateOfRemittance)) {
                      dataForDialog.push({
                        fileNo: entry.fileNo || 'N/A', applicantName: entry.applicantName || 'N/A', siteNames, sitePurposes,
                        amount: Number(rd.amountRemitted || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                        date: rd.dateOfRemittance ? format(new Date(rd.dateOfRemittance), 'dd/MM/yyyy') : 'N/A',
                      });
                    }
                });
            }
          };

          if ((account === 'PlanFund' || account === 'CollectorFund') && type === 'credit') {
            processCredit(account);
          } else if ((account === 'Bank' || account === 'STSB') && type === 'credit') {
            title = `${account} - Credit Details`;
            columnsForDialog = [
              { key: 'slNo', label: 'Sl. No.' }, { key: 'fileNo', label: 'File No.' }, { key: 'applicantName', label: 'Applicant Name' },
              { key: 'siteNames', label: 'Site(s)' }, { key: 'sitePurposes', label: 'Purpose(s)' },
              { key: 'amount', label: 'Remitted (₹)', isNumeric: true }, { key: 'date', label: 'Remitted Date' },
            ];
            entry.remittanceDetails?.forEach(rd => {
              if ((rd.remittedAccount === account || (account === 'Bank' && rd.remittedAccount === 'SBI')) && checkDateInRange(rd.dateOfRemittance)) {
                dataForDialog.push({
                  fileNo: entry.fileNo || 'N/A', applicantName: entry.applicantName || 'N/A', siteNames, sitePurposes,
                  amount: Number(rd.amountRemitted || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                  date: rd.dateOfRemittance ? format(new Date(rd.dateOfRemittance), 'dd/MM/yyyy') : 'N/A',
                });
              }
            });
          } else if ((account === 'Bank' || account === 'STSB') && type === 'debit') {
            title = `${account} - Withdrawal Details`;
            columnsForDialog = [
              { key: 'slNo', label: 'Sl. No.' }, { key: 'fileNo', label: 'File No.' }, { key: 'applicantName', label: 'Applicant Name' },
              { key: 'siteNames', label: 'Site(s)' }, { key: 'sitePurposes', label: 'Purpose(s)' },
              { key: 'amount', label: 'Paid (₹)', isNumeric: true }, { key: 'date', label: 'Payment Date' },
            ];
            entry.paymentDetails?.forEach(pd => {
              if ((pd.paymentAccount === account || (account === 'Bank' && pd.paymentAccount === 'SBI')) && checkDateInRange(pd.dateOfPayment)) {
                const paymentAmount = (Number(pd.contractorsPayment) || 0) + (Number(pd.gst) || 0) + (Number(pd.incomeTax) || 0) + (Number(pd.kbcwb) || 0) + (Number(pd.refundToParty) || 0);
                if (paymentAmount > 0) {
                  dataForDialog.push({
                    fileNo: entry.fileNo || 'N/A', applicantName: entry.applicantName || 'N/A', siteNames, sitePurposes,
                    amount: paymentAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                    date: pd.dateOfPayment && isValid(new Date(pd.dateOfPayment)) ? format(new Date(pd.dateOfPayment), 'dd/MM/yyyy') : 'N/A',
                  });
                }
              }
            });
          } else if (account === 'RevenueHead' && type === 'credit') {
            title = 'Revenue Head - Credit Details';
            columnsForDialog = [
              { key: 'slNo', label: 'Sl. No.' }, { key: 'fileNo', label: 'File No.' }, { key: 'applicantName', label: 'Applicant Name' },
              { key: 'siteNames', label: 'Site(s)' }, { key: 'sitePurposes', label: 'Purpose(s)' },
              { key: 'source', label: 'Source' }, { key: 'amount', label: 'Credited (₹)', isNumeric: true },
              { key: 'date', label: 'Credited Date' },
            ];
            entry.remittanceDetails?.forEach(rd => {
              if (rd.remittedAccount === 'Revenue Head' && checkDateInRange(rd.dateOfRemittance)) {
                dataForDialog.push({
                  fileNo: entry.fileNo || 'N/A', applicantName: entry.applicantName || 'N/A', siteNames, sitePurposes,
                  source: 'Direct Remittance', amount: Number(rd.amountRemitted || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                  date: rd.dateOfRemittance ? format(new Date(rd.dateOfRemittance), 'dd/MM/yyyy') : 'N/A',
                });
              }
            });
            entry.paymentDetails?.forEach(pd => {
              if (pd.revenueHead && Number(pd.revenueHead) > 0 && checkDateInRange(pd.dateOfPayment)) {
                dataForDialog.push({
                  fileNo: entry.fileNo || 'N/A', applicantName: entry.applicantName || 'N/A', siteNames, sitePurposes,
                  source: 'From Payment', amount: Number(pd.revenueHead).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                  date: pd.dateOfPayment && isValid(new Date(pd.dateOfPayment)) ? format(new Date(pd.dateOfPayment), 'dd/MM/yyyy') : 'N/A',
                });
              }
            });
          } else if ((account === 'PlanFund' || account === 'CollectorFund') && type === 'expenditure') {
             title = `${account === 'PlanFund' ? 'Plan Fund' : "Collector's Fund"} Expenditure`;
             columnsForDialog = [
              { key: 'slNo', label: 'Sl. No.' }, { key: 'fileNo', label: 'File No.' }, { key: 'applicantName', label: 'Applicant Name' },
              { key: 'siteNames', label: 'Site(s)' }, { key: 'sitePurposes', label: 'Purpose(s)' },
              { key: 'amount', label: 'Paid (₹)', isNumeric: true }, { key: 'date', label: 'Payment Date' },
            ];
            const targetAppTypes = account === 'PlanFund' ? PLAN_FUND_APPLICATION_TYPES : COLLECTOR_APPLICATION_TYPES;

             if(entry.applicationType && (targetAppTypes as any).includes(entry.applicationType)) {
                entry.paymentDetails?.forEach(pd => {
                    if (checkDateInRange(pd.dateOfPayment)) {
                       const paymentAmount = Number(pd.totalPaymentPerEntry) || 0;
                       if(paymentAmount > 0) {
                           dataForDialog.push({
                                fileNo: entry.fileNo || 'N/A', applicantName: entry.applicantName || 'N/A', siteNames, sitePurposes,
                                amount: paymentAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                                date: pd.dateOfPayment && isValid(new Date(pd.dateOfPayment)) ? format(new Date(pd.dateOfPayment), 'dd/MM/yyyy') : 'N/A',
                           });
                       }
                    }
                });
            }
          }
        });
    
        const dataWithSlNo = dataForDialog.map((item, index) => ({ slNo: index + 1, ...item }));
        onOpenDialog(dataWithSlNo, title, columnsForDialog, 'finance');
      };

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2"><Landmark className="h-5 w-5 text-primary" />Finance Overview</CardTitle>
                        <CardDescription>Summary of credits, withdrawals, and balances. Defaults to all-time data. Click amounts for details.</CardDescription>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-4 border-t mt-4">
                    <Input 
                        type="date" 
                        id="finance-start-date"
                        name="financeStartDate"
                        className="w-[240px]" 
                        value={dates.start ? format(dates.start, 'yyyy-MM-dd') : ''} 
                        onChange={(e) => onSetDates({...dates, start: e.target.value ? parse(e.target.value, 'yyyy-MM-dd', new Date()) : undefined})}
                    />
                    <Input 
                        type="date" 
                        id="finance-end-date"
                        name="financeEndDate"
                        className="w-[240px]" 
                        value={dates.end ? format(dates.end, 'yyyy-MM-dd') : ''} 
                        onChange={(e) => onSetDates({...dates, end: e.target.value ? parse(e.target.value, 'yyyy-MM-dd', new Date()) : undefined})}
                    />
                    <Button onClick={handleClearFinanceDates} variant="ghost" className="h-9 px-3"><XCircle className="mr-2 h-4 w-4"/>Clear Dates</Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {transformedFinanceMetrics ? (
                    <>
                        <Card className="shadow-inner bg-background/50">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-lg">Operational Accounts</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                        <TableHead>Account</TableHead>
                                            <TableHead className="text-right">Credit (₹)</TableHead>
                                            <TableHead className="text-right">Withdrawal (₹)</TableHead>
                                            <TableHead className="text-right">Balance (₹)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell className="font-medium">Bank</TableCell>
                                            <TableCell className="text-right font-mono font-bold"><Button variant="link" className="text-green-600 p-0 h-auto font-bold" onClick={() => handleAmountClick('Bank', 'credit')} disabled={!transformedFinanceMetrics.sbiCredit}>{transformedFinanceMetrics.sbiCredit.toLocaleString('en-IN')}</Button></TableCell>
                                            <TableCell className="text-right font-mono font-bold"><Button variant="link" className="text-red-600 p-0 h-auto font-bold" onClick={() => handleAmountClick('Bank', 'debit')} disabled={!transformedFinanceMetrics.sbiDebit}>{transformedFinanceMetrics.sbiDebit.toLocaleString('en-IN')}</Button></TableCell>
                                            <TableCell className="text-right font-mono font-bold">{transformedFinanceMetrics.sbiBalance.toLocaleString('en-IN')}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-medium">STSB</TableCell>
                                            <TableCell className="text-right font-mono font-bold"><Button variant="link" className="text-green-600 p-0 h-auto font-bold" onClick={() => handleAmountClick('STSB', 'credit')} disabled={!transformedFinanceMetrics.stsbCredit}>{transformedFinanceMetrics.stsbCredit.toLocaleString('en-IN')}</Button></TableCell>
                                            <TableCell className="text-right font-mono font-bold"><Button variant="link" className="text-red-600 p-0 h-auto font-bold" onClick={() => handleAmountClick('STSB', 'debit')} disabled={!transformedFinanceMetrics.stsbDebit}>{transformedFinanceMetrics.stsbDebit.toLocaleString('en-IN')}</Button></TableCell>
                                            <TableCell className="text-right font-mono font-bold">{transformedFinanceMetrics.stsbBalance.toLocaleString('en-IN')}</TableCell>
                                        </TableRow>
                                    </TableBody>
                                    <TableFooter><TableRow className="bg-muted"><TableCell className="font-bold">Total Balance</TableCell><TableCell colSpan={3} className="text-right font-bold text-lg text-primary">₹{(transformedFinanceMetrics.sbiBalance + transformedFinanceMetrics.stsbBalance).toLocaleString('en-IN')}</TableCell></TableRow></TableFooter>
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
                                                <Button variant="link" className="p-0 h-auto font-mono text-right w-full block font-bold" onClick={() => handleAmountClick('PlanFund', 'credit')} disabled={!transformedFinanceMetrics.planFundDeferredAmount}>
                                                    {transformedFinanceMetrics.planFundDeferredAmount.toLocaleString('en-IN')}
                                                </Button>
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-bold">
                                                <Button variant="link" className="p-0 h-auto font-mono text-right w-full block text-red-600 font-bold" onClick={() => handleAmountClick('PlanFund', 'expenditure')} disabled={!transformedFinanceMetrics.planFundExpenditure}>
                                                    {transformedFinanceMetrics.planFundExpenditure.toLocaleString('en-IN')}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-medium">Collector's Deposit Works</TableCell>
                                            <TableCell className="text-right font-mono font-bold">
                                                <Button variant="link" className="p-0 h-auto font-mono text-right w-full block font-bold" onClick={() => handleAmountClick('CollectorFund', 'credit')} disabled={!transformedFinanceMetrics.collectorFundDeferredAmount}>
                                                    {transformedFinanceMetrics.collectorFundDeferredAmount.toLocaleString('en-IN')}
                                                </Button>
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-bold">
                                                <Button variant="link" className="p-0 h-auto font-mono text-right w-full block text-red-600 font-bold" onClick={() => handleAmountClick('CollectorFund', 'expenditure')} disabled={!transformedFinanceMetrics.collectorFundExpenditure}>
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
                                    <Button variant="link" className="text-green-600 p-0 h-auto text-lg font-bold font-mono" onClick={() => handleAmountClick('RevenueHead', 'credit')} disabled={!transformedFinanceMetrics.revenueHeadCredit}>
                                        ₹{transformedFinanceMetrics.revenueHeadCredit.toLocaleString('en-IN')}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                ) : (
                    <div className="h-40 flex items-center justify-center"><p className="text-muted-foreground">Calculating financial data...</p></div>
                )}
            </CardContent>
             <CardFooter>
              <p className="text-xs text-muted-foreground pt-4">
                  Note: Operational Accounts data is based on Deposit Works (Public & Private). Administrative Sanction data is based on Collector's & Plan Fund works. Revenue Head includes credits from all work types.
              </p>
            </CardFooter>
        </Card>
    );
}
