// src/components/investigation/LoggingPumpingTestTable.tsx
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
import { Eye, Trash2, Loader2, Clock, Copy } from "lucide-react";
import type { DataEntryFormData, SiteWorkStatus, SiteDetailFormData } from "@/lib/schemas";
import { format, isValid, parseISO } from "date-fns";
import Image from "next/image";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useFileEntries } from "@/hooks/useFileEntries";
import { useAuth } from "@/hooks/useAuth";
import PaginationControls from "@/components/shared/PaginationControls";
import { cn } from "@/lib/utils";
import { v4 as uuidv4 } from 'uuid';

const ITEMS_PER_PAGE = 50;

const getStatusColorClass = (status: SiteWorkStatus | undefined): string => {
    if (!status) return 'text-muted-foreground';
    if (status === 'Completed') return 'text-green-600';
    if (status === 'VES Pending') return 'text-orange-600';
    if (status === 'Pending') return 'text-yellow-600';
    return 'text-muted-foreground';
};

interface LoggingPumpingTestTableProps {
  fileEntries: DataEntryFormData[];
  isLoading: boolean;
  searchActive: boolean;
  totalEntries: number;
}

export default function LoggingPumpingTestTable({ fileEntries, isLoading, searchActive, totalEntries }: LoggingPumpingTestTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { deleteFileEntry, addFileEntry } = useFileEntries(); 
  const { user, isLoading: authIsLoading } = useAuth();

  const [deleteItem, setDeleteItem] = useState<DataEntryFormData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const canDelete = user?.role === 'editor';

  useEffect(() => { setCurrentPage(1); }, [fileEntries]);

  const paginatedEntries = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return fileEntries.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [fileEntries, currentPage]);

  const totalPages = Math.ceil(fileEntries.length / ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    const params = new URLSearchParams(searchParams?.toString());
    params.set('page', String(page));
    router.push(`?${params.toString()}`);
  };

  const handleViewClick = (item: DataEntryFormData) => {
    if (!item.id) return;
    const queryParams = new URLSearchParams({ id: item.id, workType: 'loggingPumpingTest' });
    router.push(`/dashboard/data-entry?${queryParams.toString()}`);
  };

  const confirmDelete = async () => {
    if (!deleteItem || !deleteItem.id) return;
    setIsDeleting(true);
    try {
        await deleteFileEntry(deleteItem.id);
        toast({ title: "File Deleted" });
    } catch (error: any) {
        toast({ title: "Error Deleting File", description: error.message, variant: "destructive" });
    } finally {
        setIsDeleting(false);
        setDeleteItem(null);
    }
  };

  if (isLoading || authIsLoading) {
    return <div className="flex items-center justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2 text-muted-foreground">Loading data...</p></div>;
  }

  if (paginatedEntries.length === 0) {
    return <Card className="shadow-lg"><CardContent className="flex flex-col items-center justify-center py-10 text-center"><Image src="https://placehold.co/128x128/F0F2F5/3F51B5.png?text=No+Files" width={100} height={100} alt="No files" className="mb-4 opacity-70 rounded-lg"/><h3 className="text-xl font-semibold">No Logging &amp; Pumping Test Files Found</h3></CardContent></Card>;
  }

  return (
    <TooltipProvider>
      <Card className="shadow-lg">
        <CardContent className="p-0">
          <div className="max-h-[70vh] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-secondary z-10">
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>File No.</TableHead>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Site Name(s)</TableHead>
                  <TableHead>Remittance</TableHead>
                  <TableHead>File Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedEntries.map((entry, index) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-center">{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</TableCell>
                    <TableCell className="font-medium">{entry.fileNo}</TableCell>
                    <TableCell>{entry.applicantName}</TableCell>
                    <TableCell>{entry.siteDetails?.map((site, idx) => (<span key={idx} className={cn("font-semibold", getStatusColorClass(site.workStatus as SiteWorkStatus))}>{site.nameOfSite}{idx < entry.siteDetails!.length - 1 ? ', ' : ''}</span>))}</TableCell>
                    <TableCell>{entry.remittanceDetails?.[0]?.dateOfRemittance ? format(new Date(entry.remittanceDetails[0].dateOfRemittance), "dd/MM/yyyy") : "N/A"}</TableCell>
                    <TableCell className="font-semibold">{entry.fileStatus}</TableCell>
                    <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => handleViewClick(entry)}><Eye className="h-4 w-4" /></Button>{canDelete && <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteItem(entry)}><Trash2 className="h-4 w-4" /></Button>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="p-4 border-t flex flex-wrap items-center justify-between gap-4">{totalPages > 1 && <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />}</CardFooter>
      </Card>
      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete this file?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDelete} className="bg-destructive">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </TooltipProvider>
  );
}
