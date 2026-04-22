// src/app/dashboard/e-tender/page.tsx
"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useE_tenders, type E_tender } from '@/hooks/useE_tenders';
import { usePageHeader } from '@/hooks/usePageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateSafe, getStatusBadgeClass, toDateOrNull } from '@/components/e-tender/utils';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { E_tenderStatus, Bidder, ArsEntryFormData, SiteWorkStatus, ArsStatus } from "@/lib/schemas";
import { eTenderStatusOptions } from '@/lib/schemas';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, startOfDay, endOfDay, isWithinInterval, parse, isBefore, isAfter, addDays, isValid } from 'date-fns';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import PaginationControls from '@/components/shared/PaginationControls';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter } from "@/components/ui/dialog";
import { useDataStore } from '@/hooks/use-data-store';
import { TrendingUp, XCircle, Loader2, PlusCircle, Search, Trash2, Eye, Users, Copy, Clock, FolderOpen, Bell, Hammer, FileDown, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import ExcelJS from 'exceljs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DataEntryFormData } from '@/lib/schemas';
import type { ArsEntry } from '@/hooks/useArsEntries';
import { Separator } from '@/components/ui/separator';


const ITEMS_PER_PAGE = 50;

const getStatusRowClass = (status?: E_tenderStatus | null): string => {
    if (!status) return "";
    switch (status) {
        case 'Tender Preparation':
        case 'Tender Process':
            return "bg-gray-500/5 hover:bg-gray-500/10 text-gray-700";
        case 'Bid Opened':
            return "bg-orange-500/5 hover:bg-orange-500/10 text-orange-700";
        case 'Retender':
            return "bg-yellow-500/5 hover:bg-yellow-500/10 text-yellow-700";
        case 'Tender Cancelled':
            return "bg-red-500/5 hover:bg-red-500/10 text-red-700 line-through";
        case 'Selection Notice Issued':
            return "bg-blue-500/5 hover:bg-blue-500/10 text-blue-700";
        case 'Work Order Issued':
            return "bg-green-500/5 hover:bg-green-500/10 text-green-700";
        case 'Supply Order Issued':
            return "bg-purple-500/5 hover:bg-purple-500/10 text-purple-700";
        default:
            return "";
    }
};

const StatCard = ({ title, count, onClick, colorClass, icon: Icon }: { title: string, count: number, onClick: () => void, colorClass: string, icon?: React.ElementType }) => (
    <button
        onClick={onClick}
        disabled={count === 0}
        className={cn(
            "p-3 border rounded-lg text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between shadow-sm",
            colorClass,
            "hover:bg-opacity-20"
        )}
    >
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}
          <p className="text-xs font-semibold text-muted-foreground whitespace-normal leading-tight">{title}</p>
        </div>
        <p className="text-2xl font-bold">{count}</p>
    </button>
);

type WorkOrderRow = {
    id: string;
    slNo: number;
    dateWorkOrder: string;
    dateWorkOrderRaw: Date | null;
    eTenderNo: string;
    nameOfWork: string;
    contractor: string;
    supervisor: string;
    quotedAmount?: number;
    expectedDateOfCompletion: string;
    expectedDateOfCompletionRaw: Date | null;
    isOverdue: boolean;
    tenderType?: 'Work' | 'Purchase' | null;
    purchaseStatus: 'Ongoing' | 'Completed';
};

type WorkOrderSortKey = keyof WorkOrderRow;


function WorkOrderDataDialog({ isOpen, onOpenChange, tenders }: { isOpen: boolean, onOpenChange: (open: boolean) => void, tenders: E_tender[] }) {
    const { allStaffMembers, allFileEntries, allArsEntries } = useDataStore();
    const { updateTender: updateTenderInDb } = useE_tenders();
    const { toast } = useToast();
    const [sortConfig, setSortConfig] = useState<{ key: WorkOrderSortKey; direction: 'asc' | 'desc' } | null>(null);
    const [activeTab, setActiveTab] = useState('ongoingWorks');
    const [sitesForTender, setSitesForTender] = useState<{ tenderNo: string; sites: any[] } | null>(null);
    
    const requestSort = (key: WorkOrderSortKey) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: WorkOrderSortKey) => {
        if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown className="ml-2 h-3 w-3 opacity-30 group-hover:opacity-100" />;
        return sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-3 w-3" /> : <ArrowDown className="ml-2 h-3 w-3" />;
    };
    
    const handleTenderNoClick = (tenderNo: string) => {
        const normalizedInput = tenderNo.trim().toUpperCase();
        const getSites = (dataSource: (DataEntryFormData[] | ArsEntry[]), isArs: boolean) => {
            const sites: any[] = [];
            dataSource.forEach((entry: any) => {
                if (isArs) {
                    const entryTenderNo = entry.arsTenderNo?.trim().toUpperCase();
                    if (entryTenderNo === normalizedInput) {
                        sites.push({
                            name: entry.nameOfSite,
                            status: entry.arsStatus,
                            source: 'ARS Scheme',
                            fileNo: entry.fileNo,
                            supervisor: entry.supervisorName || 'N/A'
                        });
                    }
                } else {
                    entry.siteDetails?.forEach((site: any) => {
                        const siteTenderNo = site.tenderNo?.trim().toUpperCase();
                        if (siteTenderNo === normalizedInput) {
                            sites.push({
                                name: site.nameOfSite,
                                status: site.workStatus,
                                source: 'Deposit Work',
                                fileNo: entry.fileNo,
                                supervisor: site.supervisorName || 'N/A'
                            });
                        }
                    });
                }
            });
            return sites;
        };
        
        const linkedSites = [
            ...getSites(allFileEntries, false),
            ...getSites(allArsEntries, true)
        ];
    
        setSitesForTender({ tenderNo, sites: linkedSites.length > 0 ? linkedSites : [] });
    };

    const workOrderData = useMemo(() => {
        let filteredTenders = tenders.filter(t => (t.presentStatus === 'Work Order Issued' || t.presentStatus === 'Supply Order Issued') && t.dateWorkOrder);

        const getL1Bidder = (tender: E_tender) => {
            if (!tender.bidders || tender.bidders.length === 0) return null;
            const validBidders = tender.bidders.filter(b => b.status === 'Accepted' && typeof b.quotedAmount === 'number' && b.quotedAmount > 0);
            if (validBidders.length === 0) return null;
            return validBidders.reduce((lowest, current) => 
                (current.quotedAmount! < lowest.quotedAmount!) ? current : lowest
            );
        };

        const mappedData: WorkOrderRow[] = filteredTenders.map((tender, index) => {
                const l1Bidder = getL1Bidder(tender);
                const hasRejectedBids = tender.bidders?.some(b => b.status === 'Rejected');
                const contractAmount = (hasRejectedBids && tender.agreedAmount) ? tender.agreedAmount : (l1Bidder ? l1Bidder.quotedAmount : undefined);

                const supervisorStaff = [
                    tender.nameOfAssistantEngineer,
                    tender.supervisor1Name,
                    tender.supervisor2Name,
                    tender.supervisor3Name,
                ].filter(Boolean).map(name => {
                    const staff = allStaffMembers.find(s => s.name === name);
                    return staff ? `${staff.name} (${staff.designation})` : name;
                }).join(', ');
                
                const workOrderDate = toDateOrNull(tender.dateWorkOrder);
                let expectedDateOfCompletion: Date | null = null;
                if (workOrderDate && tender.periodOfCompletion) {
                    expectedDateOfCompletion = addDays(workOrderDate, tender.periodOfCompletion);
                }

                const isOverdue = expectedDateOfCompletion ? new Date() > expectedDateOfCompletion : false;

                return {
                    id: tender.id,
                    slNo: index + 1,
                    dateWorkOrder: tender.dateWorkOrder ? formatDateSafe(tender.dateWorkOrder) : 'N/A',
                    dateWorkOrderRaw: workOrderDate,
                    eTenderNo: tender.eTenderNo || 'N/A',
                    nameOfWork: tender.nameOfWork || 'N/A',
                    contractor: l1Bidder ? l1Bidder.name || 'N/A' : 'N/A',
                    supervisor: supervisorStaff || 'N/A',
                    quotedAmount: contractAmount ?? undefined,
                    expectedDateOfCompletion: expectedDateOfCompletion ? formatDateSafe(expectedDateOfCompletion) : 'N/A',
                    expectedDateOfCompletionRaw: expectedDateOfCompletion,
                    isOverdue,
                    tenderType: tender.tenderType ?? undefined,
                    purchaseStatus: (tender as any).purchaseStatus || 'Ongoing',
                };
            });

        const completedOrFinalStatuses: (SiteWorkStatus | ArsStatus)[] = ["Work Completed", "Work Failed", "Work Cancelled", "Bill Prepared", "Payment Completed", "Utilization Certificate Issued", "Completed"];
        const tenderSitesMap = new Map<string, { status: (SiteWorkStatus | ArsStatus), isFinal: boolean }[]>();

        allFileEntries.forEach(file => {
            file.siteDetails?.forEach(site => {
                if (site.tenderNo && site.workStatus) {
                    const normalizedTenderNo = site.tenderNo.trim().toUpperCase();
                    if (!tenderSitesMap.has(normalizedTenderNo)) {
                        tenderSitesMap.set(normalizedTenderNo, []);
                    }
                    tenderSitesMap.get(normalizedTenderNo)!.push({
                        status: site.workStatus,
                        isFinal: completedOrFinalStatuses.includes(site.workStatus as any)
                    });
                }
            });
        });

        allArsEntries.forEach(ars => {
            if (ars.arsTenderNo && ars.arsStatus) {
                const normalizedTenderNo = ars.arsTenderNo.trim().toUpperCase();
                if (!tenderSitesMap.has(normalizedTenderNo)) {
                    tenderSitesMap.set(normalizedTenderNo, []);
                }
                tenderSitesMap.get(normalizedTenderNo)!.push({
                    status: ars.arsStatus,
                    isFinal: completedOrFinalStatuses.includes(ars.arsStatus as any)
                });
            }
        });
        
        const completedTenderNos = new Set<string>();
        tenderSitesMap.forEach((sites, tenderNo) => {
            if (sites.length > 0 && sites.every(site => site.isFinal)) {
                completedTenderNos.add(tenderNo);
            }
        });

        const ongoingWorksList = mappedData.filter(row => row.tenderType === 'Work' && !completedTenderNos.has(row.eTenderNo.trim().toUpperCase()));
        const purchaseList = mappedData.filter(row => row.tenderType === 'Purchase');
        const completedWorksList = mappedData.filter(row => row.tenderType === 'Work' && completedTenderNos.has(row.eTenderNo.trim().toUpperCase()));

        const sortList = (list: WorkOrderRow[]) => {
            if (!sortConfig) return list;
            return [...list].sort((a, b) => {
                let aValue: any;
                let bValue: any;

                if (sortConfig.key === 'dateWorkOrder') {
                    aValue = a.dateWorkOrderRaw?.getTime() ?? 0;
                    bValue = b.dateWorkOrderRaw?.getTime() ?? 0;
                } else if (sortConfig.key === 'expectedDateOfCompletion') {
                    aValue = a.expectedDateOfCompletionRaw?.getTime() ?? 0;
                    bValue = b.expectedDateOfCompletionRaw?.getTime() ?? 0;
                } else {
                    aValue = a[sortConfig.key] ?? '';
                    bValue = b[sortConfig.key] ?? '';
                }

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        };

        return { 
            ongoingWorks: sortList(ongoingWorksList).map((row, i) => ({ ...row, slNo: i + 1 })), 
            purchase: sortList(purchaseList).map((row, i) => ({ ...row, slNo: i + 1 })),
            completedWorks: sortList(completedWorksList).map((row, i) => ({ ...row, slNo: i + 1 })) 
        };
    }, [tenders, allStaffMembers, sortConfig, allFileEntries, allArsEntries]);
    
    const handleExportExcel = useCallback(async () => {
        let dataToExport: WorkOrderRow[] = [];
        if (activeTab === 'ongoingWorks') dataToExport = workOrderData.ongoingWorks;
        else if (activeTab === 'purchase') dataToExport = workOrderData.purchase;
        else if (activeTab === 'completedWorks') dataToExport = workOrderData.completedWorks;

        if (dataToExport.length === 0) {
            toast({ title: "No Data", description: "There is no data to export from this tab.", variant: "default" });
            return;
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(`WorkOrderData_${activeTab}`);
        
        const headers = ["Sl. No.", "Date of Work Order", "e-Tender No.", "Name of Work", "Contractor", "Supervisor", "Quoted Amount (Rs.)", "Expected Date of Completion"];
        if (activeTab === 'purchase') headers.push("Status");

        const headerRow = worksheet.addRow(headers);
        headerRow.font = { bold: true };
        headerRow.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F0F0F0' } };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });

        dataToExport.forEach(row => {
            const values = [
                row.slNo,
                row.dateWorkOrder,
                row.eTenderNo,
                row.nameOfWork,
                row.contractor,
                row.supervisor,
                row.quotedAmount,
                row.expectedDateOfCompletion,
            ];
            if (activeTab === 'purchase') {
                values.push(row.purchaseStatus);
            }

            const newRow = worksheet.addRow(values);
            
            const isPurchaseCompleted = activeTab === 'purchase' && row.purchaseStatus === 'Completed';
            if ((row.isOverdue && activeTab === 'ongoingWorks') || isPurchaseCompleted) {
                newRow.eachCell(cell => {
                    cell.font = { ...cell.font, color: { argb: 'FF0000' } };
                });
            }
            newRow.eachCell(cell => {
                 cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });
        });

        worksheet.columns.forEach(column => {
            let maxLength = 0;
            column.eachCell!({ includeEmpty: true }, (cell) => {
                let columnLength = cell.value ? cell.value.toString().length : 10;
                if (columnLength > maxLength) {
                    maxLength = columnLength;
                }
            });
            column.width = maxLength < 15 ? 15 : maxLength + 2;
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `GWD_WorkOrderData_${activeTab}_${format(new Date(), 'yyyyMMdd')}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
    }, [workOrderData, activeTab, toast]);

    const handlePurchaseStatusChange = async (id: string, status: 'Ongoing' | 'Completed') => {
        try {
            await updateTenderInDb(id, { purchaseStatus: status });
            toast({ title: "Status Updated", description: "Purchase status has been saved." });
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    const renderTable = (data: WorkOrderRow[], isPurchaseTab: boolean = false) => (
        <div className="overflow-x-auto min-w-full">
            <Table className="min-w-[1000px]">
                <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                        <TableHead className="w-[50px] text-center">Sl.</TableHead>
                        <TableHead className="w-[100px]"><Button variant="ghost" className="p-0 hover:bg-transparent text-xs" onClick={() => requestSort('dateWorkOrder')}>Order Date {getSortIcon('dateWorkOrder')}</Button></TableHead>
                        <TableHead className="w-[120px]"><Button variant="ghost" className="p-0 hover:bg-transparent text-xs" onClick={() => requestSort('eTenderNo')}>Tender No. {getSortIcon('eTenderNo')}</Button></TableHead>
                        <TableHead className="min-w-[200px]"><Button variant="ghost" className="p-0 hover:bg-transparent text-xs" onClick={() => requestSort('nameOfWork')}>Name of Work {getSortIcon('nameOfWork')}</Button></TableHead>
                        <TableHead className="w-[150px]"><Button variant="ghost" className="p-0 hover:bg-transparent text-xs" onClick={() => requestSort('contractor')}>Contractor {getSortIcon('contractor')}</Button></TableHead>
                        <TableHead className="w-[150px]"><Button variant="ghost" className="p-0 hover:bg-transparent text-xs" onClick={() => requestSort('supervisor')}>Supervisor {getSortIcon('supervisor')}</Button></TableHead>
                        <TableHead className="text-right w-[100px]"><Button variant="ghost" className="p-0 hover:bg-transparent text-xs" onClick={() => requestSort('quotedAmount')}>Amount {getSortIcon('quotedAmount')}</Button></TableHead>
                        <TableHead className="w-[100px]"><Button variant="ghost" className="p-0 hover:bg-transparent text-xs" onClick={() => requestSort('expectedDateOfCompletion')}>Completion {getSortIcon('expectedDateOfCompletion')}</Button></TableHead>
                        {isPurchaseTab && <TableHead className="w-[120px] text-center">Status</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.length > 0 ? (
                        data.map(row => {
                            const isPurchaseCompleted = isPurchaseTab && row.purchaseStatus === 'Completed';
                            return (
                                <TableRow key={row.id} className={cn(
                                    ((row.isOverdue && activeTab === 'ongoingWorks') || isPurchaseCompleted) && "text-destructive font-bold", 
                                    "text-[11px]"
                                )}>
                                    <TableCell className="text-center py-2">{row.slNo}</TableCell>
                                    <TableCell className="py-2">{row.dateWorkOrder}</TableCell>
                                    <TableCell className="py-2 font-mono">
                                        <Button variant="link" className={cn("p-0 h-auto font-mono text-xs", isPurchaseCompleted && "text-destructive")} onClick={() => handleTenderNoClick(row.eTenderNo)}>
                                            {row.eTenderNo}
                                        </Button>
                                    </TableCell>
                                    <TableCell className="py-2 font-medium max-w-[250px] whitespace-normal break-words leading-tight">{row.nameOfWork}</TableCell>
                                    <TableCell className="py-2 max-w-[150px] whitespace-normal break-words leading-tight">{row.contractor}</TableCell>
                                    <TableCell className="py-2 text-[10px] max-w-[150px] whitespace-normal break-words leading-tight">{row.supervisor}</TableCell>
                                    <TableCell className="py-2 text-right font-mono">{row.quotedAmount?.toLocaleString('en-IN')}</TableCell>
                                    <TableCell className="py-2">{row.expectedDateOfCompletion}</TableCell>
                                    {isPurchaseTab && (
                                        <TableCell className="py-2 text-center">
                                            <Select 
                                                value={row.purchaseStatus} 
                                                onValueChange={(val) => handlePurchaseStatusChange(row.id, val as 'Ongoing' | 'Completed')}
                                            >
                                                <SelectTrigger className="h-7 text-[10px] w-full">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Ongoing">Ongoing</SelectItem>
                                                    <SelectItem value="Completed">Completed</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                    )}
                                </TableRow>
                            );
                        })
                    ) : (
                        <TableRow>
                            <TableCell colSpan={isPurchaseTab ? 9 : 8} className="h-24 text-center">
                                No tenders found in this category.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="max-w-6xl h-[85vh] flex flex-col p-0 overflow-hidden">
                    <DialogHeader className="p-6 pb-4 border-b shrink-0">
                        <DialogTitle>Work Order Data</DialogTitle>
                        <DialogDescription>List of all tenders with work or supply orders issued.</DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                            <div className="px-6 border-b shrink-0 bg-background/50">
                                <TabsList className="grid w-full grid-cols-3 max-w-[450px] h-8">
                                    <TabsTrigger value="ongoingWorks" className="text-xs h-7">Ongoing Works ({workOrderData.ongoingWorks.length})</TabsTrigger>
                                    <TabsTrigger value="completedWorks" className="text-xs h-7">Completed Works ({workOrderData.completedWorks.length})</TabsTrigger>
                                    <TabsTrigger value="purchase" className="text-xs h-7">Purchase ({workOrderData.purchase.length})</TabsTrigger>
                                </TabsList>
                            </div>
                            <div className="px-6 py-2 text-xs text-muted-foreground flex items-center gap-4 border-b">
                                <span className="font-semibold">Row Color Legend:</span>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-destructive/80"></div>
                                    <span className="font-medium">Overdue (Ongoing Works) / Completed (Purchase)</span>
                                </div>
                            </div>
                            <div className="flex-1 min-h-0 overflow-hidden">
                                <ScrollArea className="h-full">
                                    <TabsContent value="ongoingWorks" className="m-0 border-0 p-0 outline-none">
                                        {renderTable(workOrderData.ongoingWorks)}
                                    </TabsContent>
                                    <TabsContent value="completedWorks" className="m-0 border-0 p-0 outline-none">
                                        {renderTable(workOrderData.completedWorks)}
                                    </TabsContent>
                                    <TabsContent value="purchase" className="m-0 border-0 p-0 outline-none">
                                        {renderTable(workOrderData.purchase, true)}
                                    </TabsContent>
                                </ScrollArea>
                            </div>
                        </Tabs>
                    </div>
                    <DialogFooter className="p-4 border-t shrink-0 flex-row justify-end items-center gap-2">
                        <Button variant="outline" size="sm" onClick={handleExportExcel} className="h-8">
                            <FileDown className="mr-2 h-4 w-4" /> Export Excel
                        </Button>
                        <DialogClose asChild><Button size="sm" className="h-8">Close</Button></DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={!!sitesForTender} onOpenChange={() => setSitesForTender(null)}>
                <DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="sm:max-w-xl p-0">
                    <DialogHeader className="p-6 pb-4">
                        <DialogTitle>Sites for Tender: {sitesForTender?.tenderNo}</DialogTitle>
                        <DialogDescription>List of all sites linked to this tender.</DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[60vh] overflow-y-auto px-6 pb-6 pt-2">
                        <ul className="space-y-3">
                            {sitesForTender?.sites.map((site, index) => {
                                const getSiteStatusClass = (status: any) => {
                                    if (!status) return "";
                                    if (status === 'Work Cancelled') return 'line-through text-gray-500';
                                    if (['Work Completed', 'Work Failed', 'Bill Prepared', 'Payment Completed', 'Utilization Certificate Issued'].includes(status)) return 'text-red-700';
                                    return 'text-green-700';
                                };
                                return (
                                    <li key={index} className="p-3 border rounded-md bg-secondary/50">
                                        <div className="flex justify-between items-start">
                                            <span className="font-semibold pr-2 text-base">{site.name}</span>
                                            <span className={cn('text-sm font-bold whitespace-nowrap', getSiteStatusClass(site.status))}>{site.status}</span>
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            ({site.source} - {site.fileNo})
                                        </div>
                                        {site.supervisor && site.supervisor !== 'N/A' && (
                                            <div className="text-sm text-primary font-medium mt-2 pl-2">
                                                Supervisor: {site.supervisor}
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                            {sitesForTender?.sites.length === 0 && <p className="text-muted-foreground text-center py-4">No sites found linked to this tender.</p>}
                        </ul>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

const TenderDetailRow = ({ label, value }: { label: string; value: any }) => {
  if (value === null || value === undefined || value === '') return null;
  const displayValue = label.toLowerCase().includes('date')
    ? formatDateSafe(value)
    : (typeof value === 'number' ? value.toLocaleString('en-IN') : String(value));
  return (
    <div className="py-1">
      <p className="font-medium text-sm text-muted-foreground">{label}:</p>
      <p className="text-sm text-foreground break-words font-semibold">{displayValue}</p>
    </div>
  );
};


function TenderSummaryDialog({ tender, isOpen, onOpenChange }: { tender: E_tender | null, isOpen: boolean, onOpenChange: (open: boolean) => void }) {
    const { allStaffMembers, officeAddress } = useDataStore();

    const l1Bidder = useMemo(() => {
        if (!tender || !tender.bidders || tender.bidders.length === 0) return null;
        const validBidders = tender.bidders.filter(b => b.status === 'Accepted' && typeof b.quotedAmount === 'number' && b.quotedAmount > 0);
        if (validBidders.length === 0) return null;
        return validBidders.reduce((lowest, current) => 
            (current.quotedAmount! < lowest.quotedAmount!) ? current : lowest
        );
    }, [tender]);

    const hasRejectedBids = useMemo(() => tender?.bidders?.some(b => b.status === 'Rejected'), [tender?.bidders]);
    const l1Amount = (hasRejectedBids && tender?.agreedAmount) ? tender?.agreedAmount : l1Bidder?.quotedAmount;

    const supervisors = useMemo(() => {
        if (!tender) return 'N/A';
        const staffNames = [
            tender.nameOfAssistantEngineer,
            tender.supervisor1Name,
            tender.supervisor2Name,
            tender.supervisor3Name,
        ].filter(Boolean);

        return staffNames.map(name => {
            const staff = allStaffMembers.find(s => s.name === name);
            return staff ? `${staff.name} (${staff.designation})` : name;
        }).join(', ') || 'N/A';
    }, [tender, allStaffMembers]);

    if (!tender) return null;
    
    const tenderRefNo = `${officeAddress?.officeCode || 'GKT'}/${tender.fileNo}/${tender.eTenderNo}`;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl p-0">
                 <DialogHeader className="p-6 pb-2 border-b">
                    <DialogTitle className="text-xl">{tenderRefNo}</DialogTitle>
                </DialogHeader>
                <div className="py-2 px-6 max-h-[70vh] overflow-y-auto">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                        <TenderDetailRow label="Tender Date" value={tender.tenderDate} />
                        <TenderDetailRow label="Tender Amount (Rs.)" value={tender.estimateAmount} />
                        <TenderDetailRow label="Tender Fee (Rs.)" value={tender.tenderFormFee} />
                        <TenderDetailRow label="EMD (Rs.)" value={tender.emd} />
                        <TenderDetailRow label="Last Date & Time of Receipt" value={formatDateSafe(tender.dateTimeOfReceipt, true)} />
                        <TenderDetailRow label="Date & Time of Opening" value={formatDateSafe(tender.dateTimeOfOpening, true)} />
                        <div className="md:col-span-2">
                            <TenderDetailRow label="Name of Work" value={tender.nameOfWork} />
                        </div>
                        <div className="md:col-span-2">
                            <Separator className="my-2"/>
                        </div>
                        <TenderDetailRow label="L1 Amount" value={l1Amount} />
                        <TenderDetailRow label="Selection Notice Date" value={tender.selectionNoticeDate} />
                        <TenderDetailRow label="Performance Guarantee Amount" value={tender.performanceGuaranteeAmount} />
                        <TenderDetailRow label="Additional Performance Guarantee Amount" value={tender.additionalPerformanceGuaranteeAmount} />
                        <TenderDetailRow label="Stamp Paper required" value={tender.stampPaperAmount} />
                        <TenderDetailRow label="Date - Work / Supply Order" value={tender.dateWorkOrder} />
                        <div className="md:col-span-2">
                            <TenderDetailRow label="Supervisors" value={supervisors} />
                        </div>
                    </div>
                </div>
                <DialogFooter className="p-6 pt-4 mt-2 border-t">
                    <DialogClose asChild><Button>Close</Button></DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

type SortKey = keyof E_tender;


export default function ETenderListPage() {
    const { setHeader } = usePageHeader();
    const router = useRouter();
    const { tenders: allE_tenders, isLoading, deleteTender, addTender } = useE_tenders();
    const { toast } = useToast();
    const { user } = useAuth();
    const { officeAddress } = useDataStore();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<E_tenderStatus | 'all'>('all');
    const [tenderToDelete, setTenderToDelete] = useState<E_tender | null>(null);
    const [isDeletingTender, setIsDeletingTender] = useState(false);
    const [tenderToCopy, setTenderToCopy] = useState<E_tender | null>(null);
    const [isCopying, setIsCopying] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    
    // State for Dialogs
    const [dialogContent, setDialogContent] = useState<{ title: string; tenders: E_tender[] } | null>(null);
    const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
    const [isWorkOrderDialogOpen, setIsWorkOrderDialogOpen] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);
    const [tenderForDialog, setTenderForDialog] = useState<E_tender | null>(null);


    // State for L1 Leaderboard date filters
    const [l1StartDate, setL1StartDate] = useState('');
    const [l1EndDate, setL1EndDate] = useState('');

    const canEdit = user?.role === 'admin' || user?.role === 'engineer' || user?.role === 'scientist';

    useEffect(() => {
        const savedSearch = localStorage.getItem('eTenderSearchTerm');
        if (savedSearch) {
          setSearchTerm(savedSearch);
        }
    }, []);
    
    const searchParams = useSearchParams();

    useEffect(() => {
        localStorage.setItem('eTenderSearchTerm', searchTerm);
    }, [searchTerm]);

    React.useEffect(() => {
        setHeader('e-Tenders', 'Manage all electronic tenders for the department.');
    }, [setHeader]);

    const requestSort = (key: SortKey) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: SortKey) => {
        if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown className="ml-2 h-3 w-3 opacity-30 group-hover:opacity-100" />;
        return sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-3 w-3" /> : <ArrowDown className="ml-2 h-3 w-3" />;
    };
    
    const categorizedTenders = useMemo(() => {
        const now = new Date();
        const list = Array.isArray(allE_tenders) ? allE_tenders : [];

        const activeTenders = list.filter(t => t.presentStatus !== "Tender Cancelled" && t.presentStatus !== "Work Order Issued" && t.presentStatus !== "Supply Order Issued");

        const sortByTenderNoDesc = (a: E_tender, b: E_tender) => {
            const getTenderNumber = (tenderNo: string | undefined | null): number => {
                if (!tenderNo) return 0;
                const match = tenderNo.match(/T-(\d+)/);
                return match ? parseInt(match[1], 10) : 0;
            };
            const numA = getTenderNumber(a.eTenderNo);
            const numB = getTenderNumber(b.eTenderNo);
            return numB - numA;
        };
        
        let tenderProcess: E_tender[] = [];
        let bidsSubmitted: E_tender[] = [];
        let toBeOpened: E_tender[] = [];
        let pendingSelection: E_tender[] = [];
        let pendingWorkOrder: E_tender[] = [];
        
        activeTenders.forEach(t => {
          const latestRetender = t.retenders && t.retenders.length > 0 ? t.retenders[t.retenders.length - 1] : null;
          const latestDateCorrigendum = t.corrigendums?.filter(c => c.corrigendumType === 'Date Extension').sort((a,b) => (toDateOrNull(b.corrigendumDate)?.getTime() ?? 0) - (toDateOrNull(a.corrigendumDate)?.getTime() ?? 0))[0] || null;

          let receipt: Date | null = null;
          let opening: Date | null = null;
          
          if (latestRetender) {
              receipt = toDateOrNull(latestRetender.lastDateOfReceipt);
              opening = toDateOrNull(latestRetender.dateOfOpeningTender);
          } else if (latestDateCorrigendum) {
              receipt = toDateOrNull(latestDateCorrigendum.lastDateOfReceipt);
              opening = toDateOrNull(latestDateCorrigendum.dateOfOpeningTender);
          } else {
              receipt = toDateOrNull(t.dateTimeOfReceipt);
              opening = toDateOrNull(t.dateTimeOfOpening);
          }
          
          const hasOpeningDetails = !!(t.dateOfOpeningBid || t.dateOfTechnicalAndFinancialBidOpening || t.technicalCommitteeMember1 || t.technicalCommitteeMember2 || t.technicalCommitteeMember3);
          const hasSelectionDetails = !!(t.selectionNoticeDate || t.performanceGuaranteeAmount);
          const hasWorkOrderDetails = !!(t.agreementDate || t.dateWorkOrder);
        
          if (t.presentStatus === 'Tender Process' && receipt && isValid(receipt) && isBefore(now, receipt)) {
              tenderProcess.push(t);
              return;
          }
          
          if (receipt && opening && isValid(receipt) && isValid(opening) && isAfter(now, receipt) && isBefore(now, opening)) {
            bidsSubmitted.push(t);
            return; 
          }
          
          if (opening && isValid(opening) && isAfter(now, opening) && !hasOpeningDetails) {
            toBeOpened.push(t);
          } 
          else if (hasOpeningDetails && !hasSelectionDetails && t.presentStatus === 'Bid Opened') {
            pendingSelection.push(t);
          } 
          else if (hasSelectionDetails && !hasWorkOrderDetails) {
            const excludedStatuses = ["Tender Process", "Bid Opened", "Retender", "Tender Cancelled"];
            if (t.presentStatus && !excludedStatuses.includes(t.presentStatus)) {
               pendingWorkOrder.push(t);
            }
          }
        });

        tenderProcess.sort(sortByTenderNoDesc);
        bidsSubmitted.sort(sortByTenderNoDesc);
        toBeOpened.sort(sortByTenderNoDesc);
        pendingSelection.sort(sortByTenderNoDesc);
        pendingWorkOrder.sort(sortByTenderNoDesc);

        return { tenderProcess, bidsSubmitted, toBeOpened, pendingSelection, pendingWorkOrder };
    }, [allE_tenders]);


    const { filteredTenders, lastCreatedDate } = useMemo(() => {
      const list = allE_tenders || [];
      const processedTenders = list.map(tender => {
        const bidderNames = (tender.bidders || []).map(b => b.name).filter(Boolean).join(' ').toLowerCase();
        const searchableContent = [
          tender.eTenderNo, `${officeAddress?.officeCode || 'GKT'}/${tender.fileNo}/${tender.eTenderNo}`,
          tender.fileNo, tender.nameOfWork, tender.nameOfWorkMalayalam, tender.location, tender.tenderType,
          tender.presentStatus, tender.periodOfCompletion, tender.estimateAmount?.toString(),
          formatDateSafe(tender.tenderDate), formatDateSafe(tender.dateTimeOfOpening, true),
          formatDateSafe(tender.dateTimeOfReceipt, true), bidderNames
        ].filter(Boolean).map(String).join(' ').toLowerCase();
        return {
          ...tender,
          _searchableContent: searchableContent,
        };
      });

        let lastCreated: Date | null = null;
        if (processedTenders.length > 0) {
            lastCreated = processedTenders.reduce((latest, current) => {
                const currentCreatedAt = toDateOrNull(current.createdAt);
                if (currentCreatedAt && (!latest || currentCreatedAt > latest)) {
                    return currentCreatedAt;
                }
                return latest;
            }, null as Date | null);
        }

        let filtered = processedTenders;
        
        if (statusFilter !== 'all') {
            filtered = filtered.filter(tender => tender.presentStatus === statusFilter);
        }
        
        if (searchTerm) {
          const lowercasedFilter = searchTerm.toLowerCase();
          filtered = filtered.filter(tender => tender._searchableContent.includes(lowercasedFilter));
        }
        
        if (sortConfig !== null) {
            filtered.sort((a, b) => {
                let aValue: any = a[sortConfig.key];
                let bValue: any = b[sortConfig.key];
                
                if (sortConfig.key === 'tenderDate' || sortConfig.key === 'dateTimeOfReceipt' || sortConfig.key === 'dateTimeOfOpening') {
                    aValue = toDateOrNull(aValue)?.getTime() ?? 0;
                    bValue = toDateOrNull(bValue)?.getTime() ?? 0;
                }
        
                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        } else {
            // default sort
            filtered.sort((a, b) => {
                const dateA = toDateOrNull(a.tenderDate)?.getTime() ?? 0;
                const dateB = toDateOrNull(b.tenderDate)?.getTime() ?? 0;
                if (dateA !== dateB) return dateB - dateA;
                
                const getTenderNumber = (tenderNo: string | undefined | null): number => {
                    if (!tenderNo) return 0;
                    const match = tenderNo.match(/T-(\d+)/);
                    return match ? parseInt(match[1], 10) : 0;
                };
                const numA = getTenderNumber(a.eTenderNo);
                const numB = getTenderNumber(b.eTenderNo);
                return numB - numA;
            });
        }


        return { filteredTenders: filtered, lastCreatedDate: lastCreated };
    }, [allE_tenders, searchTerm, statusFilter, officeAddress, sortConfig]);

    const l1ContractorsData = useMemo(() => {
        const sDate = l1StartDate ? startOfDay(parse(l1StartDate, 'yyyy-MM-dd', new Date())) : null;
        const eDate = l1EndDate ? endOfDay(parse(l1EndDate, 'yyyy-MM-dd', new Date())) : null;

        const tendersToConsider = allE_tenders.filter(tender => {
            if (!sDate || !eDate) return true;
            const tenderDate = toDateOrNull(tender.tenderDate);
            return tenderDate && isWithinInterval(tenderDate, { start: sDate, end: eDate });
        });

        const contractorMap = new Map<string, { tenders: E_tender[], count: number }>();

        tendersToConsider.forEach(tender => {
            const acceptedBidders = (tender.bidders || []).filter(
                b => b.status === 'Accepted' && typeof b.quotedAmount === 'number' && b.quotedAmount > 0
            );
            if (acceptedBidders.length > 0) {
                const l1Bidder = acceptedBidders.reduce((lowest, current) => 
                    current.quotedAmount! < lowest.quotedAmount! ? current : lowest
                );

                if (l1Bidder.name) {
                    if (!contractorMap.has(l1Bidder.name)) {
                        contractorMap.set(l1Bidder.name, { tenders: [], count: 0 });
                    }
                    const contractorEntry = contractorMap.get(l1Bidder.name)!;
                    contractorEntry.tenders.push(tender);
                    contractorEntry.count += 1;
                }
            }
        });

        return Array.from(contractorMap.entries())
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.count - a.count);
    }, [allE_tenders, l1StartDate, l1EndDate]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter]);

    const paginatedTenders = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredTenders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredTenders, currentPage]);
    
    const totalPages = Math.ceil(filteredTenders.length / ITEMS_PER_PAGE);
    const startEntryNum = (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const endEntryNum = Math.min(currentPage * ITEMS_PER_PAGE, filteredTenders.length);


    const handleCreateNew = () => {
        router.push('/dashboard/e-tender/new');
    };

    const handleViewAndEdit = (id: string) => {
        router.push(`/dashboard/e-tender/${id}`);
    };
    
    const handleDeleteClick = (tender: E_tender) => {
        setTenderToDelete(tender);
    };
    
    const handleCopyClick = (tender: E_tender) => {
        setTenderToCopy(tender);
    };

    const confirmCopy = async () => {
        if (!tenderToCopy) return;
        setIsCopying(true);
        try {
            const newTenderId = await addTender({
                ...tenderToCopy,
                eTenderNo: `${tenderToCopy.eTenderNo}-COPY`,
                presentStatus: 'Tender Preparation',
                bidders: [],
                corrigendums: [],
                retenders: [],
                dateOfOpeningBid: null,
                dateOfTechnicalAndFinancialBidOpening: null,
                technicalCommitteeMember1: null,
                technicalCommitteeMember2: null,
                technicalCommitteeMember3: null,
                selectionNoticeDate: null,
                performanceGuaranteeAmount: null,
                additionalPerformanceGuaranteeAmount: null,
                stampPaperAmount: null,
                agreementDate: null,
                dateWorkOrder: null,
                nameOfAssistantEngineer: null,
                supervisor1Id: null, supervisor1Name: null, supervisor1Phone: null,
                supervisor2Id: null, supervisor2Name: null, supervisor2Phone: null,
                supervisor3Id: null, supervisor3Name: null, supervisor3Phone: null,
                remarks: '',
            });
            toast({ title: "Tender Copied", description: "A new tender has been created. Redirecting to edit..." });
            router.push(`/dashboard/e-tender/${newTenderId}`);
        } catch (error: any) {
            toast({ title: "Copy Failed", description: error.message, variant: 'destructive' });
        } finally {
            setIsCopying(false);
            setTenderToCopy(null);
        }
    };


    const confirmDelete = async () => {
        if (!tenderToDelete) return;
        setIsDeletingTender(true);
        try {
            await deleteTender(tenderToDelete.id);
            toast({ title: "Tender Deleted", description: `Tender "${tenderToDelete.eTenderNo}" has been removed.` });
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: 'destructive' });
        } finally {
            setIsDeletingTender(false);
            setTenderToDelete(null);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="ml-3 text-muted-foreground">Loading tenders...</p>
            </div>
        );
    }
    
    const dashboardStats = [
      { type: 'tenderProcess', label: 'Tender Process', data: categorizedTenders.tenderProcess, colorClass: 'border-blue-500/50 bg-blue-500/5', icon: Clock },
      { type: 'bidsSubmitted', label: 'Bids Submitted', data: categorizedTenders.bidsSubmitted, colorClass: 'border-amber-500/50 bg-amber-500/5', icon: Users },
      { type: 'toBeOpened', label: 'To Be Opened', data: categorizedTenders.toBeOpened, colorClass: 'border-sky-500/50 bg-sky-500/5', icon: FolderOpen },
      { type: 'pendingSelection', label: 'Pending Selection Notice', data: categorizedTenders.pendingSelection, colorClass: 'border-indigo-500/50 bg-indigo-500/5', icon: Bell },
      { type: 'pendingWorkOrder', label: 'Pending Work Order', data: categorizedTenders.pendingWorkOrder, colorClass: 'border-emerald-500/50 bg-emerald-500/5', icon: Hammer },
    ];


    return (
        <div className="space-y-6">
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div className="relative flex-grow w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search across all fields..."
                                className="w-full pl-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
                           <div className="flex w-full sm:w-auto items-center gap-2">
                                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as E_tenderStatus | 'all')}>
                                    <SelectTrigger className="w-full sm:w-[200px]">
                                        <SelectValue placeholder="Filter by Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        {eTenderStatusOptions.map(status => (
                                            <SelectItem key={status} value={status}>{status}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {canEdit && (
                                    <div className="flex items-center gap-2">
                                        <Button size="sm" onClick={() => router.push('/dashboard/bidders')} variant="secondary" className="shrink-0">
                                            <Users className="mr-2 h-4 w-4" /> Bidders List
                                        </Button>
                                        <Button size="sm" onClick={() => setIsWorkOrderDialogOpen(true)} variant="outline" className="shrink-0">
                                            <FolderOpen className="mr-2 h-4 w-4" /> Work Order Data
                                        </Button>
                                        <Button size="sm" onClick={handleCreateNew} className="w-full sm:w-auto shrink-0">
                                            <PlusCircle className="mr-2 h-4 w-4" /> Create New
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                     <div className="border-t pt-4 mt-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                            {dashboardStats.map(stat => (
                                <StatCard
                                    key={stat.type}
                                    title={stat.label}
                                    count={stat.data.length}
                                    onClick={() => setDialogContent({ title: stat.label, tenders: stat.data })}
                                    colorClass={stat.colorClass}
                                    icon={stat.icon}
                                />
                            ))}
                            <StatCard
                                title="Contractor's List"
                                count={l1ContractorsData.length}
                                onClick={() => setIsLeaderboardOpen(true)}
                                colorClass="border-gray-500/50 bg-gray-500/5"
                                icon={TrendingUp}
                            />
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[10px] mt-2 pt-2 border-t">
                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap text-muted-foreground">
                            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-gray-400"></div><span>Tender Process</span></div>
                            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-orange-400"></div><span>Bid Opened</span></div>
                            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-blue-400"></div><span>Selection Notice</span></div>
                            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-green-400"></div><span>Work Order</span></div>
                            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-purple-400"></div><span>Supply Order</span></div>
                            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div><span>Retender</span></div>
                            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-red-400"></div><span>Cancelled</span></div>
                        </div>
                        {lastCreatedDate && (
                            <div className="flex items-center gap-1.5 text-muted-foreground whitespace-nowrap">
                                <Clock className="h-3.5 w-3.5"/>
                                Last created: <span className="font-mono font-bold">{format(lastCreatedDate, 'dd/MM/yy, hh:mm a')}</span>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-0">
                    <div className="max-h-[70vh] overflow-auto">
                        <TooltipProvider>
                            <Table>
                                <TableHeader className="sticky top-0 bg-secondary z-10">
                                    <TableRow>
                                        <TableHead className="w-[4%] px-2 py-3 text-sm">Sl. No.</TableHead>
                                        <TableHead className="w-[14%] px-2 py-3"><Button variant="ghost" className="p-0 hover:bg-transparent" onClick={() => requestSort('eTenderNo')}>eTender Ref. No. {getSortIcon('eTenderNo')}</Button></TableHead>
                                        <TableHead className="w-[42%] px-2 py-3"><Button variant="ghost" className="p-0 hover:bg-transparent" onClick={() => requestSort('nameOfWork')}>Name of Work {getSortIcon('nameOfWork')}</Button></TableHead>
                                        <TableHead className="w-[12%] px-2 py-3"><Button variant="ghost" className="p-0 hover:bg-transparent" onClick={() => requestSort('dateTimeOfReceipt')}>Last Date of Receipt {getSortIcon('dateTimeOfReceipt')}</Button></TableHead>
                                        <TableHead className="w-[12%] px-2 py-3"><Button variant="ghost" className="p-0 hover:bg-transparent" onClick={() => requestSort('dateTimeOfOpening')}>Date of Opening {getSortIcon('dateTimeOfOpening')}</Button></TableHead>
                                        <TableHead className="w-[8%] px-2 py-3"><Button variant="ghost" className="p-0 hover:bg-transparent" onClick={() => requestSort('presentStatus')}>Status {getSortIcon('presentStatus')}</Button></TableHead>
                                        <TableHead className="text-center w-[8%] px-2 py-3">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedTenders.length > 0 ? (
                                        paginatedTenders.map((tender, index) => {
                                            const hasRetenders = tender.retenders && tender.retenders.length > 0;
                                            const latestRetender = hasRetenders ? tender.retenders![tender.retenders!.length - 1] : null;

                                            const lastDateOfReceipt = latestRetender ? latestRetender.lastDateOfReceipt : tender.dateTimeOfReceipt;
                                            const dateOfOpening = latestRetender ? latestRetender.dateOfOpeningTender : tender.dateTimeOfOpening;

                                            return (
                                                <TableRow key={tender.id} className={getStatusRowClass(tender.presentStatus)}>
                                                    <TableCell className="align-top py-2 px-3">{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</TableCell>
                                                    <TableCell className="font-bold align-top py-2 px-3">
                                                        <div className="flex flex-col">
                                                            <button className="text-left hover:underline" onClick={() => setTenderForDialog(tender)}>
                                                                <span className="whitespace-normal break-words">{`${officeAddress?.officeCode || 'GKT'}/${tender.fileNo}/${tender.eTenderNo}`}</span>
                                                            </button>
                                                            <span className="text-xs font-normal">Dated: {formatDateSafe(tender.tenderDate)}</span>
                                                            {hasRetenders && <Badge variant="secondary" className="mt-1 w-fit bg-yellow-200 text-yellow-800">Re-tender</Badge>}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="whitespace-normal break-words align-top py-2 px-3">{tender.nameOfWork}</TableCell>
                                                    <TableCell className="whitespace-nowrap align-top py-2 px-3">{formatDateSafe(lastDateOfReceipt, true)}</TableCell>
                                                    <TableCell className="whitespace-nowrap align-top py-2 px-3">{formatDateSafe(dateOfOpening, true)}</TableCell>
                                                    <TableCell className="align-top py-2 px-3">
                                                        {tender.presentStatus && <Badge className={cn(getStatusBadgeClass(tender.presentStatus))}>{tender.presentStatus}</Badge>}
                                                    </TableCell>
                                                    <TableCell className="text-center align-top py-2 px-3">
                                                        <div className="flex flex-col items-center justify-center space-y-1">
                                                            <Tooltip>
                                                                <TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewAndEdit(tender.id)}><Eye className="h-4 w-4" /></Button></TooltipTrigger>
                                                                <TooltipContent><p>View / Edit Tender</p></TooltipContent>
                                                            </Tooltip>
                                                            {canEdit && (
                                                                <>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopyClick(tender)}><Copy className="h-4 w-4" /></Button></TooltipTrigger>
                                                                        <TooltipContent><p>Copy Tender</p></TooltipContent>
                                                                    </Tooltip>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive h-8 w-8" onClick={() => handleDeleteClick(tender)}><Trash2 className="h-4 w-4" /></Button></TooltipTrigger>
                                                                        <TooltipContent><p>Delete Tender</p></TooltipContent>
                                                                    </Tooltip>
                                                                </>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-24 text-center">
                                                No tenders found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TooltipProvider>
                    </div>
                </CardContent>
                {totalPages > 1 && (
                     <CardFooter className="p-4 border-t flex flex-wrap items-center justify-between gap-4">
                        <p className="text-sm text-muted-foreground">
                            Showing <strong>{filteredTenders.length > 0 ? startEntryNum : 0}</strong>-<strong>{endEntryNum}</strong> of <strong>{filteredTenders.length}</strong> tenders.
                        </p>
                        <PaginationControls
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                        />
                    </CardFooter>
                )}
            </Card>
            
             <AlertDialog open={!!tenderToDelete} onOpenChange={() => setTenderToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the tender <strong>{tenderToDelete?.eTenderNo}</strong>. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeletingTender}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} disabled={isDeletingTender} className="bg-destructive hover:bg-destructive/90">
                            {isDeletingTender ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
             <AlertDialog open={!!tenderToCopy} onOpenChange={() => setTenderToCopy(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Copy</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will create a new tender by copying the basic details from <strong>{tenderToCopy?.eTenderNo}</strong>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isCopying}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmCopy} disabled={isCopying}>
                            {isCopying ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Copy Tender"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
             <Dialog open={!!dialogContent} onOpenChange={() => setDialogContent(null)}>
              <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-4 border-b">
                  <DialogTitle>{dialogContent?.title}</DialogTitle>
                  <DialogDescription>
                    Showing {dialogContent?.tenders.length} tender(s).
                  </DialogDescription>
                </DialogHeader>
                <div className="flex-1 min-h-0">
                  <ScrollArea className="h-full">
                    <div className="p-6 pt-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tender No</TableHead>
                            <TableHead>Name of Work</TableHead>
                            <TableHead>Work Order date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dialogContent?.tenders.map(t => (
                            <TableRow key={t.id}>
                              <TableCell>{t.eTenderNo}</TableCell>
                              <TableCell>{t.nameOfWork}</TableCell>
                              <TableCell>{formatDateSafe(t.dateWorkOrder)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </ScrollArea>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isLeaderboardOpen} onOpenChange={setIsLeaderboardOpen}>
              <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-4 border-b">
                  <DialogTitle>{`Contractor's List`}</DialogTitle>
                   <div className="flex flex-col sm:flex-row gap-2 pt-4 items-end">
                        <div className="grid w-full sm:w-auto flex-1 gap-1.5">
                            <Label htmlFor="l1-start-date-dialog">From</Label>
                            <Input id="l1-start-date-dialog" type="date" value={l1StartDate} onChange={e => setL1StartDate(e.target.value)} />
                        </div>
                        <div className="grid w-full sm:w-auto flex-1 gap-1.5">
                            <Label htmlFor="l1-end-date-dialog">To</Label>
                            <Input id="l1-end-date-dialog" type="date" value={l1EndDate} onChange={e => setL1EndDate(e.target.value)} />
                        </div>
                        <Button variant="ghost" onClick={() => { setL1StartDate(''); setL1EndDate(''); }}><XCircle className="h-4 w-4 mr-2" />Clear</Button>
                    </div>
                </DialogHeader>
                 <div className="flex-1 min-h-0">
                    <ScrollArea className="h-full">
                        <div className="p-6 pt-0">
                        {l1ContractorsData.length > 0 ? (
                            <div className="space-y-2">
                            {l1ContractorsData.map((contractor, index) => (
                                <button key={index} onClick={() => { setDialogContent({ title: `Tenders for ${contractor.name}`, tenders: contractor.tenders }); setIsLeaderboardOpen(false); }} className="w-full text-left p-3 rounded-md hover:bg-secondary transition-colors flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-sm">{index + 1}. {contractor.name}</p>
                                </div>
                                <Badge>{contractor.count} {contractor.count > 1 ? 'Tenders' : 'Tender'}</Badge>
                                </button>
                            ))}
                            </div>
                        ) : (
                            <div className="text-center text-muted-foreground py-10">No L1 contractors found for the selected period.</div>
                        )}
                        </div>
                    </ScrollArea>
                </div>
              </DialogContent>
            </Dialog>

            <WorkOrderDataDialog 
                isOpen={isWorkOrderDialogOpen} 
                onOpenChange={setIsWorkOrderDialogOpen} 
                tenders={allE_tenders} 
            />

            <TenderSummaryDialog 
                tender={tenderForDialog} 
                isOpen={!!tenderForDialog} 
                onOpenChange={() => setTenderForDialog(null)}
            />
        </div>
    );
}
      
    