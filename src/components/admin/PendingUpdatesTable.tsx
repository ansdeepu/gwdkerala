// src/components/admin/PendingUpdatesTable.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { usePendingUpdates, type PendingUpdate } from '@/hooks/usePendingUpdates';
import { useDataStore } from '@/hooks/use-data-store';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, UserX, ListChecks, Trash2, FolderOpen, Waves } from 'lucide-react';
import { formatDistanceToNow, format, isValid } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { SiteDetailFormData, ArsEntryFormData, DataEntryFormData } from '@/lib/schemas';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const toDateOrNull = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date && isValid(value)) return value;
  if (value && typeof value.seconds === 'number' && typeof value.nanoseconds === 'number') {
    const date = new Date(value.seconds * 1000 + value.nanoseconds / 1000000);
    return isValid(date) ? date : null;
  }
  if (typeof value === 'string') {
    const parsedDate = new Date(value);
    if (isValid(parsedDate)) return parsedDate;
  }
  return null;
};

const formatDateValue = (value: any): string => {
  const date = toDateOrNull(value);
  return date ? format(date, 'dd/MM/yyyy') : String(value || 'Not Set');
};

const getFieldName = (key: string) => {
    return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase());
};

const UpdateTable = ({
  title,
  icon: Icon,
  updates,
  isArsTable = false,
  fileEntries,
  handleViewChanges,
  setUpdateToReject,
  setUpdateToDelete,
  isRejecting,
  isDeleting,
  arsEntries,
}: {
  title: string;
  icon: React.ElementType;
  updates: PendingUpdate[];
  isArsTable?: boolean;
  fileEntries: DataEntryFormData[];
  handleViewChanges: (update: PendingUpdate) => void;
  setUpdateToReject: (id: string | null) => void;
  setUpdateToDelete: (id: string | null) => void;
  isRejecting: boolean;
  isDeleting: boolean;
  arsEntries: any[];
}) => {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          {title} ({updates.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sl. No.</TableHead>
                <TableHead>File No.</TableHead>
                {!isArsTable && <TableHead>Applicant Name</TableHead>}
                <TableHead>Site Name(s)</TableHead>
                {!isArsTable && <TableHead>Purpose(s)</TableHead>}
                <TableHead>Submitted By</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center w-[240px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {updates.length > 0 ? (
                updates.map((update, index) => {
                  const isUnassigned = update.status === 'supervisor-unassigned';
                  const parentFile = isArsTable ? arsEntries.find(a => a.id === update.arsId) : fileEntries.find(f => f.fileNo === update.fileNo);
                  const applicantName = update.isArsUpdate ? 'N/A' : (parentFile as DataEntryFormData)?.applicantName || 'N/A';
                  const siteName = update.updatedSiteDetails.map(s => (s as SiteDetailFormData).nameOfSite).join(', ');
                  
                  let purpose: string;
                  if (update.isArsUpdate) {
                    const arsDetail = update.updatedSiteDetails[0] as ArsEntryFormData;
                    purpose = arsDetail?.arsTypeOfScheme || 'N/A';
                  } else {
                    const siteDetails = update.updatedSiteDetails as SiteDetailFormData[];
                    purpose = siteDetails.map(s => s.purpose || 'N/A').join(', ');
                  }

                  const isRejected = update.status === 'rejected';

                  let reviewLink = '';
                  if (update.isArsUpdate && update.arsId) {
                    reviewLink = `/dashboard/ars/entry?id=${update.arsId}&approveUpdateId=${update.id}`;
                  } else if (!update.isArsUpdate) {
                    const parentFileId = (parentFile as DataEntryFormData)?.id;
                    if (parentFileId) {
                      reviewLink = `/dashboard/data-entry?id=${parentFileId}&approveUpdateId=${update.id}`;
                    }
                  }

                  return (
                    <TableRow key={update.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium">{update.fileNo}</TableCell>
                      {!isArsTable && <TableCell>{applicantName}</TableCell>}
                      <TableCell>{siteName}</TableCell>
                      {!isArsTable && <TableCell>{purpose}</TableCell>}
                      <TableCell>{update.submittedByName}</TableCell>
                      <TableCell>
                        {formatDistanceToNow(update.submittedAt, { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant={isUnassigned ? "destructive" : isRejected ? "outline" : "default"} className={isRejected ? "text-destructive border-destructive" : ""}>
                              {isUnassigned ? <UserX className="mr-1 h-3 w-3" /> : isRejected && <XCircle className="mr-1 h-3 w-3" />}
                              {isUnassigned ? "Unassigned" : isRejected ? "Rejected" : update.status}
                            </Badge>
                          </TooltipTrigger>
                          {(isUnassigned || isRejected) && update.notes && <TooltipContent><p>{update.notes}</p></TooltipContent>}
                        </Tooltip>
                      </TableCell>
                      <TableCell className="text-center space-x-1">
                        <Button variant="link" className="p-0 h-auto" onClick={() => handleViewChanges(update)}><ListChecks className="mr-2 h-4 w-4" />View</Button>
                        {reviewLink ? (
                          <Button asChild size="sm" variant="outline"><Link href={reviewLink}><CheckCircle className="mr-2 h-4 w-4" /> Review</Link></Button>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="outline" disabled><CheckCircle className="mr-2 h-4 w-4" /> Review</Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Original file could not be found to start review.</p></TooltipContent>
                          </Tooltip>
                        )}
                        <Button size="sm" variant="destructive" onClick={() => setUpdateToReject(update.id)} disabled={isRejecting || isRejected}><XCircle className="mr-2 h-4 w-4" /> Reject</Button>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setUpdateToDelete(update.id)} disabled={isDeleting}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Permanently Delete Update</p></TooltipContent>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={isArsTable ? 7 : 9} className="h-24 text-center">No pending updates in this category.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
export default UpdateTable;