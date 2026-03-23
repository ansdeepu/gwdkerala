
"use client";
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
    sitePurposeOptions, 
    applicationTypeOptions, 
    applicationTypeDisplayMap, 
    constituencyOptions, 
    type ApplicationType, 
    type SitePurpose, 
    type DataEntryFormData, 
    type ArsEntryFormData, 
    arsTypeOfSchemeOptions,
    PUBLIC_DEPOSIT_APPLICATION_TYPES,
    PRIVATE_APPLICATION_TYPES,
    COLLECTOR_APPLICATION_TYPES,
    PLAN_FUND_APPLICATION_TYPES,
    LOGGING_PUMPING_TEST_PURPOSE_OPTIONS
} from '@/lib/schemas';
import { useDataStore } from '@/hooks/use-data-store';
import { useToast } from '@/hooks/use-toast';
import { format, isValid, startOfDay, endOfDay, isWithinInterval, parseISO } from 'date-fns';
import ExcelJS from 'exceljs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { PlusCircle, FileDown } from 'lucide-react';

type ReportSource = 'deposit' | 'private' | 'ars' | 'gwInvestigation' | 'loggingPumpingTest' | 'collector' | 'planFund';
type ReportRow = Record<string, string | number | undefined | null>;

const reportableFields = [
    // File-level fields
    { id: 'fileNo', label: 'File No', sources: ['deposit', 'private', 'collector', 'planFund', 'gwInvestigation', 'loggingPumpingTest', 'ars'], accessor: (entry: any) => entry.fileNo },
    { id: 'applicantName', label: 'Applicant Name', sources: ['deposit', 'private', 'collector', 'planFund', 'gwInvestigation', 'loggingPumpingTest'], accessor: (entry: any) => entry.applicantName },
    { id: 'applicationType', label: 'Application Type', sources: ['deposit', 'private', 'collector', 'planFund', 'gwInvestigation', 'loggingPumpingTest'], accessor: (entry: any) => entry.applicationType ? applicationTypeDisplayMap[entry.applicationType as ApplicationType] : 'N/A' },
    { id: 'fileStatus', label: 'File Status', sources: ['deposit', 'private', 'collector', 'planFund', 'gwInvestigation', 'loggingPumpingTest'], accessor: (entry: any) => entry.fileStatus },
    { id: 'totalRemittance', label: 'Total Remittance (₹)', sources: ['deposit', 'private', 'collector', 'planFund', 'gwInvestigation', 'loggingPumpingTest'], accessor: (entry: any) => entry.totalRemittance },
    { id: 'totalPayment', label: 'Total Payment (₹)', sources: ['deposit', 'private', 'collector', 'planFund', 'gwInvestigation', 'loggingPumpingTest'], accessor: (entry: any) => entry.totalPaymentAllEntries },
    { id: 'overallBalance', label: 'Overall Balance (₹)', sources: ['deposit', 'private', 'collector', 'planFund', 'gwInvestigation', 'loggingPumpingTest'], accessor: (entry: any) => entry.overallBalance },
    { id: 'remittanceDate', label: 'First Remittance Date', sources: ['deposit', 'private', 'collector', 'planFund', 'gwInvestigation', 'loggingPumpingTest'], accessor: (entry: any) => entry.remittanceDetails?.[0]?.dateOfRemittance },

    // Site-level fields (common)
    { id: 'siteName', label: 'Site Name', sources: ['deposit', 'private', 'collector', 'planFund', 'gwInvestigation', 'loggingPumpingTest', 'ars'], accessor: (entry: any) => entry.nameOfSite },
    { id: 'localSelfGovt', label: 'Local Self Govt.', sources: ['deposit', 'private', 'collector', 'planFund', 'gwInvestigation', 'loggingPumpingTest', 'ars'], accessor: (entry: any) => entry.localSelfGovt },
    { id: 'constituency', label: 'Constituency', sources: ['deposit', 'private', 'collector', 'planFund', 'gwInvestigation', 'loggingPumpingTest', 'ars'], accessor: (entry: any) => entry.constituency },
    { id: 'latitude', label: 'Latitude', sources: ['deposit', 'private', 'collector', 'planFund', 'gwInvestigation', 'loggingPumpingTest', 'ars'], accessor: (entry: any) => entry.latitude },
    { id: 'longitude', label: 'Longitude', sources: ['deposit', 'private', 'collector', 'planFund', 'gwInvestigation', 'loggingPumpingTest', 'ars'], accessor: (entry: any) => entry.longitude },
    { id: 'purpose', label: 'Site Purpose', sources: ['deposit', 'private', 'collector', 'planFund', 'gwInvestigation', 'loggingPumpingTest'], accessor: (entry: any) => entry.purpose },
    { id: 'workStatus', label: 'Site Work Status', sources: ['deposit', 'private', 'collector', 'planFund', 'gwInvestigation', 'loggingPumpingTest'], accessor: (entry: any) => entry.workStatus },
    { id: 'dateOfCompletion', label: 'Site Completion Date', sources: ['deposit', 'private', 'collector', 'planFund', 'gwInvestigation', 'loggingPumpingTest', 'ars'], accessor: (entry: any) => entry.dateOfCompletion },
    { id: 'totalExpenditure', label: 'Site Total Expenditure (₹)', sources: ['deposit', 'private', 'collector', 'planFund', 'gwInvestigation', 'loggingPumpingTest', 'ars'], accessor: (entry: any) => entry.totalExpenditure },
    
    // ARS specific fields
    { id: 'arsTypeOfScheme', label: 'ARS Scheme Type', sources: ['ars'], accessor: (entry: ArsEntryFormData) => entry.arsTypeOfScheme },
    { id: 'arsStatus', label: 'ARS Status', sources: ['ars'], accessor: (entry: ArsEntryFormData) => entry.arsStatus },
    { id: 'arsStorageCapacity', label: 'ARS Storage Capacity (m³)', sources: ['ars'], accessor: (entry: ArsEntryFormData) => entry.arsStorageCapacity },

    // Investigation specific fields
    { id: 'typeOfWell', label: 'Type of Well', sources: ['gwInvestigation', 'loggingPumpingTest'], accessor: (entry: any) => entry.typeOfWell },
    { id: 'feasibility', label: 'Feasibility', sources: ['gwInvestigation'], accessor: (entry: any) => entry.feasibility },
    { id: 'vesRequired', label: 'VES Required', sources: ['gwInvestigation'], accessor: (entry: any) => entry.vesRequired },
    { id: 'nameOfInvestigator', label: 'Investigator', sources: ['gwInvestigation', 'loggingPumpingTest'], accessor: (entry: any) => entry.nameOfInvestigator },
];


const safeParseDate = (dateValue: any): Date | null => {
  if (!dateValue) return null;
  if (dateValue instanceof Date) return dateValue;
  if (typeof dateValue === 'object' && dateValue !== null && typeof (dateValue as any).seconds === 'number') {
    return new Date((dateValue as any).seconds * 1000);
  }
  if (typeof dateValue === 'string') {
    const parsed = new Date(dateValue);
    if (isValid(parsed)) return parsed;
  }
  return null;
};

export default function CustomReportBuilder() {
  const { allFileEntries, allArsEntries, allLsgConstituencyMaps } = useDataStore();
  const { toast } = useToast();

  const [selectedPage, setSelectedPage] = useState<ReportSource>('deposit');
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedPurpose, setSelectedPurpose] = useState<string>('all');
  const [selectedLsg, setSelectedLsg] = useState<string>('all');
  const [selectedConstituency, setSelectedConstituency] = useState<string>('all');
  const [selectedAppType, setSelectedAppType] = useState<string>('all');
  const [selectedSchemeType, setSelectedSchemeType] = useState<string>('all');
  
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [reportData, setReportData] = useState<ReportRow[] | null>(null);
  const [reportHeaders, setReportHeaders] = useState<string[]>([]);

  const lsgOptions = useMemo(() => allLsgConstituencyMaps.map(m => m.name).sort(), [allLsgConstituencyMaps]);

  const availableFields = useMemo(() => {
    return reportableFields.filter(f => {
        // 1. Check source compatibility
        const sourceMatch = (f as any).sources ? (f as any).sources.includes(selectedPage) : true;
        if (!sourceMatch) return false;

        // 2. Check purpose compatibility (only if source is not ARS)
        if (selectedPage !== 'ars' && selectedPurpose !== 'all') {
            if ((f as any).purpose && !(f as any).purpose.includes(selectedPurpose as SitePurpose)) return false;
        }

        return true;
    });
  }, [selectedPurpose, selectedPage]);
  
  useEffect(() => {
    setSelectedFields([]);
    setReportData(null);
  }, [selectedPage]);

  const handleGenerateReport = useCallback(() => {
    if (selectedFields.length === 0) {
        toast({ title: "No Fields Selected", variant: "destructive" });
        return;
    }

    let sourceData: any[] = [];
    if (selectedPage === 'deposit') sourceData = allFileEntries.filter(e => e.applicationType && PUBLIC_DEPOSIT_APPLICATION_TYPES.includes(e.applicationType as any));
    else if (selectedPage === 'private') sourceData = allFileEntries.filter(e => e.applicationType && PRIVATE_APPLICATION_TYPES.includes(e.applicationType as any));
    else if (selectedPage === 'collector') sourceData = allFileEntries.filter(e => e.applicationType && COLLECTOR_APPLICATION_TYPES.includes(e.applicationType as any));
    else if (selectedPage === 'planFund') sourceData = allFileEntries.filter(e => e.applicationType && PLAN_FUND_APPLICATION_TYPES.includes(e.applicationType as any));
    else if (selectedPage === 'gwInvestigation') sourceData = allFileEntries.filter(e => e.siteDetails?.some(s => s.purpose === 'GW Investigation'));
    else if (selectedPage === 'loggingPumpingTest') sourceData = allFileEntries.filter(e => e.siteDetails?.some(s => s.purpose && LOGGING_PUMPING_TEST_PURPOSE_OPTIONS.includes(s.purpose as any)));
    else if (selectedPage === 'ars') sourceData = allArsEntries;

    const fromDate = startDate ? startOfDay(new Date(startDate)) : null;
    const toDate = endDate ? endOfDay(new Date(endDate)) : null;

    let siteLevelData: any[] = [];
    sourceData.forEach(entry => {
        const dateToTest = selectedPage === 'ars' ? entry.arsSanctionedDate : entry.remittanceDetails?.[0]?.dateOfRemittance;
        const entryDate = safeParseDate(dateToTest);
        if (fromDate && toDate) {
            if (!entryDate || !isWithinInterval(entryDate, { start: fromDate, end: toDate })) return;
        }

        if (selectedPage === 'ars') {
            siteLevelData.push(entry);
        } else {
            entry.siteDetails?.forEach((site: any) => {
                siteLevelData.push({ ...entry, ...site, siteDetails: undefined });
            });
        }
    });

    if (selectedPage === 'ars') {
        if (selectedSchemeType !== 'all') siteLevelData = siteLevelData.filter(e => e.arsTypeOfScheme === selectedSchemeType);
    } else {
        if (selectedPurpose !== 'all') siteLevelData = siteLevelData.filter(e => e.purpose === selectedPurpose);
        if (selectedAppType !== 'all') siteLevelData = siteLevelData.filter(e => e.applicationType === selectedAppType);
    }
    
    if (selectedLsg !== 'all') siteLevelData = siteLevelData.filter(e => e.localSelfGovt === selectedLsg);
    if (selectedConstituency !== 'all') siteLevelData = siteLevelData.filter(e => e.constituency === selectedConstituency);
    
    const selectedFieldObjects = reportableFields.filter(f => selectedFields.includes(f.id));
    const headers = selectedFieldObjects.map(f => f.label);
    const dataForReport = siteLevelData.map(entry => {
        const row: ReportRow = {};
        selectedFieldObjects.forEach(field => {
            const value = field.accessor(entry);
            if (value instanceof Date) row[field.label] = format(value, "dd/MM/yyyy");
            else row[field.label] = value ?? 'N/A';
        });
        return row;
    });

    setReportData(dataForReport);
    setReportHeaders(headers);
    if (dataForReport.length === 0) toast({ title: "No Data Found" });
  }, [selectedFields, selectedPage, startDate, endDate, selectedPurpose, selectedLsg, selectedConstituency, selectedAppType, selectedSchemeType, allFileEntries, allArsEntries, toast]);

  const handleExportExcel = async () => {
    if (!reportData?.length) return;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Report');
    worksheet.addRow(reportHeaders).font = { bold: true };
    reportData.forEach(row => worksheet.addRow(reportHeaders.map(h => row[h])));
    const buffer = await workbook.xlsx.writeBuffer();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([buffer]));
    a.download = `Report_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`;
    a.click();
  };

  return (
    <div className="space-y-6">
        <Card>
            <CardContent className="space-y-4 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2"><Label>Data Source</Label>
                        <Select value={selectedPage} onValueChange={(v) => setSelectedPage(v as ReportSource)}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="deposit">Deposit Works</SelectItem>
                                <SelectItem value="collector">Collector's Deposit Works</SelectItem>
                                <SelectItem value="private">Private Deposit Works</SelectItem>
                                <SelectItem value="planFund">Plan Fund Works</SelectItem>
                                <SelectItem value="ars">ARS</SelectItem>
                                <SelectItem value="gwInvestigation">GW Investigation</SelectItem>
                                <SelectItem value="loggingPumpingTest">Logging & Pumping Test</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2"><Label>From Date</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
                    <div className="space-y-2"><Label>To Date</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
                    <div className="space-y-2"><Label>Purpose</Label>
                        <Select value={selectedPurpose} onValueChange={setSelectedPurpose} disabled={selectedPage === 'ars'}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent><SelectItem value="all">All Purposes</SelectItem>{sitePurposeOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader className="flex flex-row justify-between items-center">
                <div><CardTitle>Select Report Fields</CardTitle><CardDescription>Available columns for {selectedPage}.</CardDescription></div>
                <Button variant="link" onClick={() => setSelectedFields(selectedFields.length === availableFields.length ? [] : availableFields.map(f => f.id))}>
                    {selectedFields.length === availableFields.length ? 'Deselect All' : 'Select All'}
                </Button>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4 border rounded-lg bg-secondary/20 max-h-96 overflow-y-auto">
                    {availableFields.map(field => (
                        <div key={field.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-secondary/50">
                            <Checkbox id={field.id} checked={selectedFields.includes(field.id)} onCheckedChange={() => setSelectedFields(prev => prev.includes(field.id) ? prev.filter(id => id !== field.id) : [...prev, field.id])} />
                            <label htmlFor={field.id} className="text-sm font-medium cursor-pointer">{field.label}</label>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>

        <div className="flex gap-4 pt-4 border-t">
          <Button onClick={handleGenerateReport}><PlusCircle className="mr-2 h-4 w-4" />Generate Report</Button>
          <Button variant="outline" onClick={() => setReportData(null)}>Clear</Button>
          <Button onClick={handleExportExcel} disabled={!reportData?.length}><FileDown className="mr-2 h-4 w-4" />Export Excel</Button>
        </div>

        {reportData && (
          <div className="pt-8">
            <h3 className="text-lg font-semibold mb-2">Generated Data ({reportData.length} rows)</h3>
            <div className="border rounded-lg max-h-[60vh] overflow-auto">
              <Table>
                  <TableHeader className="sticky top-0 bg-secondary z-10"><TableRow>{reportHeaders.map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
                  <TableBody>
                      {reportData.map((row, i) => <TableRow key={i}>{reportHeaders.map(h => <TableCell key={h} className="text-xs whitespace-nowrap">{String(row[h] ?? '-')}</TableCell>)}</TableRow>)}
                  </TableBody>
              </Table>
            </div>
          </div>
        )}
    </div>
  );
}
