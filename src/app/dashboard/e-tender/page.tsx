
// src/app/dashboard/e-tender/page.tsx
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useE_tenders, type E_tender } from '@/hooks/useE_tenders';
import { usePageHeader } from '@/hooks/usePageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateSafe, getStatusBadgeClass, toDateOrNull } from '@/components/e-tender/utils';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { E_tenderStatus } from '@/lib/schemas/eTenderSchema';
import { eTenderStatusOptions } from '@/lib/schemas/eTenderSchema';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, startOfDay, endOfDay, isWithinInterval, parse, isBefore, isAfter, isValid } from 'date-fns';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import PaginationControls from '@/components/shared/PaginationControls';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { TrendingUp, XCircle, Loader2, PlusCircle, Search, Trash2, Eye, Users, Copy, Clock } from 'lucide-react';


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

const StatCard = ({ title, count, onClick, colorClass }: { title: string, count: number, onClick: () => void, colorClass: string }) => (
    <button
        onClick={onClick}
        disabled={count === 0}
        className={cn(
            "p-3 border rounded-lg text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full",
            colorClass,
            "hover:bg-opacity-20"
        )}
    >
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold">{count}</p>
    </button>
);


export default function ETenderListPage() {
    const { setHeader } = usePageHeader();
    const router = useRouter();
    const { tenders: allE_tenders, isLoading, deleteTender, addTender } = useE_tenders();
    const { toast } = useToast();
    const { user } = useAuth();
    
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

    // State for L1 Leaderboard date filters
    const [l1StartDate, setL1StartDate] = useState('');
    const [l1EndDate, setL1EndDate] = useState('');

    const canEdit = user?.role === 'admin' || user?.role === 'engineer' || user?.role === 'scientist';

    React.useEffect(() => {
        setHeader('e-Tenders', 'Manage all electronic tenders for the department.');
    }, [setHeader]);
    
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
          tender.eTenderNo, `GKT/${tender.fileNo}/${tender.eTenderNo}`,
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

        return { filteredTenders: filtered, lastCreatedDate: lastCreated };
    }, [allE_tenders, searchTerm, statusFilter]);

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
      { title: 'Tender Process', data: categorizedTenders.tenderProcess, colorClass: 'border-blue-500/50 bg-blue-500/5' },
      { title: 'Bids Submitted', data: categorizedTenders.bidsSubmitted, colorClass: 'border-amber-500/50 bg-amber-500/5' },
      { title: 'To Be Opened', data: categorizedTenders.toBeOpened, colorClass: 'border-sky-500/50 bg-sky-500/5' },
      { title: 'Pending Selection', data: categorizedTenders.pendingSelection, colorClass: 'border-indigo-500/50 bg-indigo-500/5' },
      { title: 'Pending Work Order', data: categorizedTenders.pendingWorkOrder, colorClass: 'border-emerald-500/50 bg-emerald-500/5' },
    ];


    return (
        <div className="space-y-6">
            <Card>
                <CardContent className="p-4 space-y-4">
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
                                        <Button size="sm" onClick={handleCreateNew} className="w-full sm:w-auto shrink-0">
                                            <PlusCircle className="mr-2 h-4 w-4" /> Create New
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                     <div className="border-t pt-4 mt-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                            {dashboardStats.map(stat => (
                                <StatCard
                                    key={stat.title}
                                    title={stat.title}
                                    count={stat.data.length}
                                    onClick={() => setDialogContent({ title: stat.title, tenders: stat.data })}
                                    colorClass={stat.colorClass}
                                />
                            ))}
                            <Button variant="outline" className="h-full flex-col items-start p-3 w-full" onClick={() => setIsLeaderboardOpen(true)}>
                                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2"><TrendingUp className="h-4 w-4"/> Contractor's List</p>
                                <p className="text-2xl font-bold">{l1ContractorsData.length}</p>
                            </Button>
                        </div>
                    </div>
                     <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t">
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="font-semibold">Row Color Legend:</span>
                            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-gray-400"></div><span>Tender Process</span></div>
                            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-orange-400"></div><span>Bid Opened</span></div>
                            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-blue-400"></div><span>Selection Notice</span></div>
                            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-400"></div><span>Work Order</span></div>
                            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-purple-400"></div><span>Supply Order</span></div>
                            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-yellow-400"></div><span>Retender</span></div>
                            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-400"></div><span>Cancelled</span></div>
                        </div>
                        {lastCreatedDate && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                                <Clock className="h-4 w-4"/>
                                Last created: <span className="font-semibold text-primary/90 font-mono">{format(lastCreatedDate, 'dd/MM/yy, hh:mm a')}</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center justify-center pt-4 border-t">
                        {totalPages > 1 && <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <TooltipProvider>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Sl. No.</TableHead>
                                        <TableHead>eTender Ref. No.</TableHead>
                                        <TableHead className="min-w-[350px]">Name of Work</TableHead>
                                        <TableHead>Last Date of Receipt</TableHead>
                                        <TableHead>Date of Opening</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="w-[1%] text-center">Actions</TableHead>
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
                                                    <TableCell className="align-top">{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</TableCell>
                                                    <TableCell className="font-bold align-top">
                                                        <div className="flex flex-col">
                                                            <span className="whitespace-normal break-words">{`GKT/${tender.fileNo}/${tender.eTenderNo}`}</span>
                                                            <span className="text-xs font-normal">Dated: {formatDateSafe(tender.tenderDate)}</span>
                                                            {hasRetenders && <Badge variant="secondary" className="mt-1 w-fit bg-yellow-200 text-yellow-800">Re-tender</Badge>}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="whitespace-normal break-words align-top min-w-[350px]">{tender.nameOfWork}</TableCell>
                                                    <TableCell className="whitespace-normal break-words align-top">{formatDateSafe(lastDateOfReceipt, true)}</TableCell>
                                                    <TableCell className="whitespace-normal break-words align-top">{formatDateSafe(dateOfOpening, true)}</TableCell>
                                                    <TableCell className="align-top">
                                                        {tender.presentStatus && <Badge className={cn(getStatusBadgeClass(tender.presentStatus))}>{tender.presentStatus}</Badge>}
                                                    </TableCell>
                                                    <TableCell className="text-center align-top">
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
                    {totalPages > 1 && (
                         <div className="flex items-center justify-center py-4">
                           <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                        </div>
                    )}
                </CardContent>
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
                            <TableHead>Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dialogContent?.tenders.map(t => (
                            <TableRow key={t.id}>
                              <TableCell>{t.eTenderNo}</TableCell>
                              <TableCell>{t.nameOfWork}</TableCell>
                              <TableCell>{formatDateSafe(t.tenderDate)}</TableCell>
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
                  <DialogTitle>Contractor's List</DialogTitle>
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
                                <button key={index} onClick={() => { setDialogContent({ title: `L1 Tenders for ${contractor.name}`, tenders: contractor.tenders }); setIsLeaderboardOpen(false); }} className="w-full text-left p-3 rounded-md hover:bg-secondary transition-colors flex justify-between items-center">
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
        </div>
    );
}
