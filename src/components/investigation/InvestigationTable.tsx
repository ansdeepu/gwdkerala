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

const getStatusColorClass = (status: SiteWorkStatus | undefined): string => {
    if (!status) return 'text-muted-foreground';
    const completedOrFailed: SiteWorkStatus[] = ["Work Completed", "Bill Prepared", "Payment Completed", "Utilization Certificate Issued", "Work Failed", "Completed"];
    if (completedOrFailed.includes(status)) return 'text-green-600';
    if (status === 'VES Pending') return 'text-orange-600';
    if (status === 'Pending') return 'text-yellow-600';
    return 'text-muted-foreground';
};

interface InvestigationTableProps {
  fileEntries: DataEntryFormData[];
  isLoading: boolean;
  searchActive: boolean;
  totalEntries: number;
}

export default function InvestigationTable({ fileEntries, isLoading, searchActive, totalEntries }: InvestigationTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { deleteFileEntry, addFileEntry } = useFileEntries(); 
  const { user, isLoading: authIsLoading } = useAuth();

  const [deleteItem, setDeleteItem] = useState<DataEntryFormData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const canDelete = user?.role === 'editor';

  const handleViewClick = (item: DataEntryFormData) => {
    if (!item.id) return;
    const queryParams = new URLSearchParams({ id: item.id, workType: item.applicationType === 'Logging_Pumping_Test' ? 'loggingPumpingTest' : 'gwInvestigation' });
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

  if (isLoading || authIsLoading) {
    return <div className="flex items-center justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2 text-muted-foreground">Loading data...</p></div>;
  }

  if (fileEntries.length === 0) {
    return <Card className="shadow-lg"><CardContent className="flex flex-col items-center justify-center py-10 text-center"><Image src="https://placehold.co/128x128/F0F2F5/3F51B5.png?text=No+Files" width={100} height={100} alt="No files" className="mb-4 opacity-70 rounded-lg"/><h3 className="text-xl font-semibold">No Investigation Files Found</h3></CardContent></Card>;
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
                {fileEntries.map((entry, index) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-center">{index + 1}</TableCell>
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
      </Card>
      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete this investigation file?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDelete} className="bg-destructive">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </TooltipProvider>
  );
}
