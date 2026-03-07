// src/components/database/FileDatabaseTable.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, Trash2, Loader2, Copy } from "lucide-react";
import type { DataEntryFormData, SiteWorkStatus, SiteDetailFormData, ApplicationType } from "@/lib/schemas";
import { 
    LOGGING_PUMPING_TEST_PURPOSE_OPTIONS,
    PUBLIC_DEPOSIT_APPLICATION_TYPES,
    PRIVATE_APPLICATION_TYPES,
    COLLECTOR_APPLICATION_TYPES,
    PLAN_FUND_APPLICATION_TYPES
} from "@/lib/schemas";
import { format, isValid, parseISO } from "date-fns";
import Image from "next/image";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useFileEntries } from "@/hooks/useFileEntries";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { v4 as uuidv4 } from 'uuid';
import { usePendingUpdates } from "@/hooks/usePendingUpdates";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

const ITEMS_PER_PAGE = 50;

const safeParseDate = (dateValue: any): Date | null => {
  if (!dateValue) return null;
  if (dateValue instanceof Date && isValid(dateValue)) return dateValue;
  if (typeof dateValue === 'string') {
    const parsed = parseISO(dateValue);
    if (isValid(parsed)) return parsed;
  }
  if (typeof dateValue === 'object' && dateValue.toDate) {
    const parsed = dateValue.toDate();
    if (isValid(parsed)) return parsed;
  }
  return null;
};

const getStatusColorClass = (status: SiteWorkStatus | undefined): string => {
    if (!status) return 'text-muted-foreground';
    const completedOrFailed: SiteWorkStatus[] = ["Work Completed", "Bill Prepared", "Payment Completed", "Utilization Certificate Issued", "Work Failed"];
    if (completedOrFailed.includes(status as SiteWorkStatus)) return 'text-red-600';
    if (status === 'To be Refunded') return 'text-yellow-600';
    return 'text-green-600';
};

interface FileDatabaseTableProps {
  fileEntries: DataEntryFormData[];
  isLoading: boolean;
  searchActive: boolean;
  totalEntries: number;
  isReadOnly?: boolean;
  currentPage?: number;
}

export default function FileDatabaseTable({ 
  fileEntries, 
  isLoading, 
  searchActive, 
  totalEntries, 
  isReadOnly = false,
  currentPage = 1
}: FileDatabaseTableProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { deleteFileEntry, addFileEntry } = useFileEntries(); 
  const { user, isLoading: authIsLoading } = useAuth();
  const { getPendingUpdates } = usePendingUpdates();

  const [deleteItem, setDeleteItem] = useState<DataEntryFormData | null>(null);
  const [itemToCopy, setItemToCopy] = useState<DataEntryFormData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [pendingUpdatesMap, setPendingUpdatesMap] = useState<Record<string, boolean>>({});

  const canEdit = !isReadOnly && (user?.role === 'admin' || user?.role === 'supervisor');
  const canDelete = !isReadOnly && user?.role === 'admin';
  const canCopy = !isReadOnly && user?.role === 'admin';

  useEffect(() => {
    if (user?.role === 'supervisor' && user.uid) {
        getPendingUpdates(null, user.uid).then(updates => {
            const map: Record<string, boolean> = {};
            updates.forEach(u => {
                if(u.fileNo && u.status === 'pending') {
                    map[u.fileNo] = true;
                }
            });
            setPendingUpdatesMap(map);
        });
    }
  }, [user, fileEntries, getPendingUpdates]);

  const handleViewClick = (item: DataEntryFormData) => {
    if (!item.id) return;
    const hasInvestigationPurpose = item.siteDetails?.some(site => site.purpose === 'GW Investigation');
    const hasLoggingPumpingPurpose = item.siteDetails?.some(site => site.purpose && LOGGING_PUMPING_TEST_PURPOSE_OPTIONS.includes(site.purpose as any));

    let workType = '';
    const appType = item.applicationType as any;

    if (hasInvestigationPurpose && !hasLoggingPumpingPurpose) {
        workType = 'gwInvestigation';
    } else if (hasLoggingPumpingPurpose && !hasInvestigationPurpose) {
        workType = 'loggingPumpingTest';
    } else if (appType && (PUBLIC_DEPOSIT_APPLICATION_TYPES as any).includes(appType)) {
        workType = 'public';
    } else if (appType && (PRIVATE_APPLICATION_TYPES as any).includes(appType)) {
        workType = 'private';
    } else if (appType && (COLLECTOR_APPLICATION_TYPES as any).includes(appType)) {
        workType = 'collector';
    } else if (appType && (PLAN_FUND_APPLICATION_TYPES as any).includes(appType)) {
        workType = 'planFund';
    } else {
        // Default fallback for deposit works
        workType = 'public';
    }

    const queryParams = new URLSearchParams({ id: item.id });
    if (workType) queryParams.set('workType', workType);
    if (isReadOnly) queryParams.set('readOnly', 'true');
    if (currentPage > 1) queryParams.set('page', String(currentPage));
    router.push(`/dashboard/data-entry?${queryParams.toString()}`);
  };

  const confirmDelete = async () => {
    if (!canDelete || !deleteItem || !deleteItem.id) return;
    setIsDeleting(true);
    try {
        await deleteFileEntry(deleteItem.id);
        toast({ title: "File Entry Deleted" });
    } catch (error: any) {
        toast({ title: "Error Deleting File", description: error.message, variant: "destructive" });
    } finally {
        setIsDeleting(false);
        setDeleteItem(null);
    }
  };

  const confirmCopy = async () => {
      if (!canCopy || !itemToCopy || !itemToCopy.id) return;
      setIsCopying(true);
      try {
          const newFileEntry: DataEntryFormData = {
              ...JSON.parse(JSON.stringify(itemToCopy)),
              id: uuidv4(),
              fileNo: `${itemToCopy.fileNo}-COPY`,
          };
          delete (newFileEntry as any).createdAt;
          delete (newFileEntry as any).updatedAt;
          const newDocId = await addFileEntry(newFileEntry);
          toast({ title: 'File Copied' });
          router.push(`/dashboard/data-entry?id=${newDocId}`);
      } catch (error: any) {
          toast({ title: 'Copy Failed', description: error.message, variant: 'destructive' });
      } finally {
          setIsCopying(false);
          setItemToCopy(null);
      }
  };

  if (isLoading || authIsLoading) {
    return <div className="flex items-center justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2 text-muted-foreground">Loading data...</p></div>;
  }

  if (fileEntries.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <Image src="https://placehold.co/128x128/F0F2F5/3F51B5.png?text=No+Files" width={100} height={100} alt="No files" className="mb-4 opacity-70 rounded-lg" />
          <h3 className="text-xl font-semibold">No Files Found</h3>
          <p className="text-muted-foreground">{searchActive ? "No files match your search." : "There are no file entries recorded yet."}</p>
        </CardContent>
      </Card>
    );
  }

  const offset = (currentPage - 1) * ITEMS_PER_PAGE;
  const SUPERVISOR_ONGOING_STATUSES: SiteWorkStatus[] = ["Work Order Issued", "Work in Progress", "Awaiting Dept. Rig", "Work Initiated"];

  return (
    <>
      <Card className="shadow-lg">
        <CardContent className="p-0">
          <div className="max-h-[70vh] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-secondary z-10">
                <TableRow>
                  <TableHead className="w-[5%] px-2 py-3 text-sm">Sl. No.</TableHead>
                  <TableHead className="w-[10%] px-2 py-3 text-sm">File No.</TableHead>
                  <TableHead className="w-[15%] px-2 py-3 text-sm">Applicant Name</TableHead>
                  <TableHead className="w-[25%] px-2 py-3 text-sm">Site Name(s)</TableHead>
                  <TableHead className="w-[10%] px-2 py-3 text-sm">Purpose(s)</TableHead>
                  <TableHead className="w-[10%] px-2 py-3 text-sm">Remittance</TableHead>
                  <TableHead className="w-[10%] px-2 py-3 text-sm">File Status</TableHead>
                  <TableHead className="text-center w-[15%] px-2 py-3 text-sm">Actions</TableHead>
                </TableRow>
              </TableHeader>
                <TableBody>
                  {fileEntries.map((entry, index) => {
                    let sitesToDisplay: SiteDetailFormData[] = entry.siteDetails || [];
                    if (user?.role === 'supervisor') {
                        sitesToDisplay = sitesToDisplay.filter(site => {
                            const isAssigned = site.supervisorUid === user.uid;
                            const isOngoing = site.workStatus && SUPERVISOR_ONGOING_STATUSES.includes(site.workStatus as SiteWorkStatus);
                            const hasPendingUpdate = pendingUpdatesMap[entry.fileNo];
                            return isAssigned && (isOngoing || hasPendingUpdate);
                        });
                    }
                    return (
                    <TableRow key={entry.id}>
                      <TableCell className="w-[5%] px-2 py-2 text-sm text-center font-mono">{offset + index + 1}</TableCell>
                      <TableCell className="font-medium w-[10%] px-2 py-2 text-sm">{entry.fileNo}</TableCell>
                      <TableCell className="w-[15%] px-2 py-2 text-sm">{entry.applicantName}</TableCell>
                      <TableCell className="w-[25%] px-2 py-2 text-sm">
                        {sitesToDisplay.length > 0 ? sitesToDisplay.map((site, idx) => (
                          <span key={idx} className={cn("font-semibold", getStatusColorClass(site.workStatus as SiteWorkStatus))}>
                            {site.nameOfSite}{idx < sitesToDisplay.length - 1 ? ', ' : ''}
                          </span>
                        )) : <span className="text-muted-foreground italic">No active sites</span>}
                      </TableCell>
                      <TableCell className="w-[10%] px-2 py-2 text-sm">
                        {sitesToDisplay.map((site, idx) => (
                          <span key={idx} className={cn(getStatusColorClass(site.workStatus as SiteWorkStatus))}>
                              {site.purpose || 'N/A'}{idx < sitesToDisplay.length - 1 ? ', ' : ''}
                          </span>
                        ))}
                      </TableCell>
                      <TableCell className="w-[10%] px-2 py-2 text-sm">
                        {entry.remittanceDetails?.[0]?.dateOfRemittance ? format(new Date(entry.remittanceDetails[0].dateOfRemittance), "dd/MM/yyyy") : "N/A"}
                      </TableCell>
                      <TableCell className="font-semibold w-[10%] px-2 py-2 text-sm">{entry.fileStatus}</TableCell>
                      <TableCell className="text-right w-[15%] px-2 py-2">
                          <div className="flex items-center justify-end space-x-1">
                            <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => handleViewClick(entry)}><Eye className="h-4 w-4" /></Button>
                            </TooltipTrigger><TooltipContent><p>View Full File Details</p></TooltipContent></Tooltip></TooltipProvider>
                            {canCopy && (
                                <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => setItemToCopy(entry)} disabled={isCopying}><Copy className="h-4 w-4" /></Button>
                                </TooltipTrigger><TooltipContent><p>Make a Copy</p></TooltipContent></Tooltip></TooltipProvider>
                            )}
                            {canDelete && (
                                <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => setDeleteItem(entry)} disabled={isDeleting}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger><TooltipContent><p>Delete File</p></TooltipContent></Tooltip></TooltipProvider>
                            )}
                          </div>
                      </TableCell>
                    </TableRow>
                  )})}
                </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
          <AlertDialogContent>
          <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>Delete file <strong>{deleteItem?.fileNo}</strong>? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive" disabled={isDeleting}>
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Delete"}
              </AlertDialogAction>
          </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!itemToCopy} onOpenChange={() => setItemToCopy(null)}>
          <AlertDialogContent>
          <AlertDialogHeader>
              <AlertDialogTitle>Confirm Copy</AlertDialogTitle>
              <AlertDialogDescription>Create a copy of file <strong>{itemToCopy?.fileNo}</strong>?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
              <AlertDialogCancel disabled={isCopying}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmCopy} disabled={isCopying}>
              {isCopying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Yes, Copy"}
              </AlertDialogAction>
          </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
