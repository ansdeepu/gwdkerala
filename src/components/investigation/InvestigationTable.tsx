// src/components/investigation/InvestigationTable.tsx
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, Trash2, Loader2, Clock, Copy, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import type { DataEntryFormData, SiteWorkStatus, SiteDetailFormData } from "@/lib/schemas";
import { format, isValid, parseISO } from "date-fns";
import Image from "next/image";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useFileEntries } from "@/hooks/useFileEntries";
import { useAuth } from "@/hooks/useAuth";
import { useDataStore } from "@/hooks/use-data-store";
import PaginationControls from "@/components/shared/PaginationControls";
import { cn } from "@/lib/utils";
import { v4 as uuidv4 } from 'uuid';

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
    if (status === 'Work Completed' || status === 'Completed') return 'text-green-600';
    if (status === 'VES Pending') return 'text-orange-600';
    if (status === 'Pending') return 'text-yellow-600';
    return 'text-muted-foreground';
};

interface InvestigationTableProps {
  fileEntries: DataEntryFormData[];
  isLoading: boolean;
  searchActive: boolean;
  totalEntries: number;
  activeTab?: string;
  currentPage?: number;
}

type SortKey = keyof DataEntryFormData | 'firstRemittanceDate';

export default function InvestigationTable({ fileEntries, isLoading, searchActive, totalEntries, activeTab, currentPage }: InvestigationTableProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { deleteFileEntry, addFileEntry } = useFileEntries(); 
  const { user, isLoading: authIsLoading } = useAuth();
  const { allFileEntries } = useDataStore();

  const [deleteItem, setDeleteItem] = useState<DataEntryFormData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [itemToCopy, setItemToCopy] = useState<DataEntryFormData | null>(null);
  const [isCopying, setIsCopying] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>({ key: 'firstRemittanceDate', direction: 'desc' });

  const canDelete = user?.role === 'admin';
  const canCopy = user?.role === 'admin';

  // Helper to find the first available date (Remittance or Inward Re-appropriation Credit)
  const getDisplayDate = (entry: DataEntryFormData): Date | null => {
    const directRemittance = entry.remittanceDetails?.[0]?.dateOfRemittance;
    if (directRemittance) return safeParseDate(directRemittance);

    const directReapp = entry.reappropriationDetails?.[0]?.date;
    if (directReapp) return safeParseDate(directReapp);

    const normalizedFileNo = entry.fileNo?.toLowerCase().trim();
    if (normalizedFileNo && allFileEntries) {
        for (const otherEntry of allFileEntries) {
            if (otherEntry.fileNo?.toLowerCase().trim() === normalizedFileNo) continue;
            const credit = otherEntry.reappropriationDetails?.find(r => r.refFileNo?.toLowerCase().trim() === normalizedFileNo);
            if (credit && credit.date) return safeParseDate(credit.date);
        }
    }
    return null;
  };

  const requestSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: SortKey) => {
    if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown className="ml-2 h-3 w-3 opacity-30 group-hover:opacity-100" />;
    if (sortConfig.direction === 'asc') return <ArrowUp className="ml-2 h-3 w-3" />;
    return <ArrowDown className="ml-2 h-3 w-3" />;
  };

  const sortedFileEntries = useMemo(() => {
    let sortableItems = [...fileEntries];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof DataEntryFormData];
        let bValue: any = b[sortConfig.key as keyof DataEntryFormData];
        
        if (sortConfig.key === 'firstRemittanceDate') {
          const dateA = getDisplayDate(a);
          const dateB = getDisplayDate(b);
          aValue = dateA?.getTime() || 0;
          bValue = dateB?.getTime() || 0;
        }
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [fileEntries, sortConfig, allFileEntries]);

  const handleViewClick = (item: DataEntryFormData) => {
    if (!item.id) return;
    const queryParams = new URLSearchParams({ id: item.id, workType: 'gwInvestigation' });
    if (activeTab) queryParams.set('tab', activeTab);
    if (currentPage && currentPage > 1) queryParams.set('page', String(currentPage));
    router.push(`/dashboard/data-entry?${queryParams.toString()}`);
  };

  const confirmDelete = async () => {
    if (!deleteItem || !deleteItem.id) return;
    setIsDeleting(true);
    try {
        await deleteFileEntry(deleteItem.id);
        toast({ title: "Investigation File Deleted" });
    } catch (error: any) {
        toast({ title: "Error Deleting File", description: error.message, variant: "destructive" });
    } finally {
        setIsDeleting(false);
        setDeleteItem(null);
    }
  };
  
  const handleCopyClick = (item: DataEntryFormData) => {
    if (!canCopy) return;
    setItemToCopy(item);
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
          if (!newDocId) {
            throw new Error("Failed to get ID for new copied file.");
          }
          
          toast({ title: 'File Copied', description: `A copy of ${itemToCopy.fileNo} was created. You can now edit it.` });
          const queryParams = new URLSearchParams({ id: newDocId, workType: 'gwInvestigation' });
          if (activeTab) queryParams.set('tab', activeTab);
          router.push(`/dashboard/data-entry?${queryParams.toString()}`);

      } catch (error: any) {
          toast({ title: 'Copy Failed', description: error.message || 'Could not copy the file.', variant: 'destructive' });
      } finally {
          setIsCopying(false);
          setItemToCopy(null);
      }
  };

  if (isLoading || authIsLoading) {
    return <div className="flex items-center justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2 text-muted-foreground">Loading data...</p></div>;
  }

  if (sortedFileEntries.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center py-10 text-center">
            <Image src="https://placehold.co/128x128/F0F2F5/3F51B5.png?text=No+Files" width={100} height={100} alt="No files" className="mb-4 opacity-70 rounded-lg" data-ai-hint="empty box document"/>
            <h3 className="text-xl font-semibold">No Investigation Files Found</h3>
            <p className="text-muted-foreground">{searchActive ? "No files match your search criteria." : "There are no files in this category."}</p>
        </div>
    );
  }

  return (
    <>
      <TooltipProvider>
        <div className="max-h-[70vh] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-secondary z-10">
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead><Button variant="ghost" className="p-0 hover:bg-transparent font-bold" onClick={() => requestSort('fileNo')}>File No. {getSortIcon('fileNo')}</Button></TableHead>
                <TableHead><Button variant="ghost" className="p-0 hover:bg-transparent font-bold" onClick={() => requestSort('applicantName')}>Applicant {getSortIcon('applicantName')}</Button></TableHead>
                <TableHead>Site Name(s)</TableHead>
                <TableHead><Button variant="ghost" className="p-0 hover:bg-transparent font-bold" onClick={() => requestSort('firstRemittanceDate')}>Remittance {getSortIcon('firstRemittanceDate')}</Button></TableHead>
                <TableHead>
                  {user?.role === 'investigator' ? (
                    "Work Status"
                  ) : (
                    <Button variant="ghost" className="p-0 hover:bg-transparent font-bold" onClick={() => requestSort('fileStatus')}>
                      File Status {getSortIcon('fileStatus')}
                    </Button>
                  )}
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedFileEntries.map((entry, index) => {
                const displayDate = getDisplayDate(entry);
                return (
                <TableRow key={entry.id}>
                  <TableCell className="text-center font-mono">{(currentPage ? (currentPage - 1) * 50 : 0) + index + 1}</TableCell>
                  <TableCell className="font-medium">{entry.fileNo}</TableCell>
                  <TableCell>{entry.applicantName}</TableCell>
                  <TableCell>{entry.siteDetails?.map((site, idx) => (<span key={idx} className={cn("font-semibold", getStatusColorClass(site.workStatus as SiteWorkStatus))}>{site.nameOfSite}{idx < entry.siteDetails!.length - 1 ? ', ' : ''}</span>))}</TableCell>
                  <TableCell>
                    {displayDate ? format(displayDate, "dd/MM/yyyy") : "N/A"}
                  </TableCell>
                  <TableCell className="font-semibold">
                    {user?.role === 'investigator' ? (
                      <div className="flex flex-col gap-0.5">
                        {(entry.siteDetails || []).map((site, idx) => (
                          <span key={idx} className={cn("text-xs font-bold", getStatusColorClass(site.workStatus as SiteWorkStatus))}>
                            {site.workStatus || 'N/A'}
                          </span>
                        ))}
                      </div>
                    ) : (
                      entry.fileStatus
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => handleViewClick(entry)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>View Details</p></TooltipContent>
                    </Tooltip>
                    {canCopy && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => handleCopyClick(entry)} disabled={isCopying}>
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Make a Copy</p></TooltipContent>
                        </Tooltip>
                    )}
                    {canDelete && 
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteItem(entry)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Delete File</p></TooltipContent>
                      </Tooltip>
                    }
                  </TableCell>
                </TableRow>
              )})}
            </TableBody>
          </Table>
        </div>
      </TooltipProvider>
      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete this investigation file?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDelete} className="bg-destructive">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
       <AlertDialog open={!!itemToCopy} onOpenChange={() => setItemToCopy(null)}>
        <AlertDialogContent>
        <AlertDialogHeader>
            <AlertDialogTitle>Confirm Copy</AlertDialogTitle>
            <AlertDialogDescription>
            Are you sure you want to create a copy of file <strong>{itemToCopy?.fileNo}</strong>?
            </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToCopy(null)} disabled={isCopying}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
                onClick={confirmCopy}
                disabled={isCopying}
            >
            {isCopying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Yes, Copy"}
            </AlertDialogAction>
        </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
