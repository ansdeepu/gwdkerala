// src/components/admin/PendingUpdatesTable.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { usePendingUpdates } from '@/hooks/usePendingUpdates';
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
import type { PendingUpdate, SiteDetailFormData, ArsEntryFormData, DataEntryFormData } from '@/lib/schemas';
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
  canApprove,
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
  canApprove: boolean;
}) => {
  return (
    <Card className="overflow-hidden shadow-md">
      <CardHeader className="bg-secondary/10">
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
                <TableHead className="w-[60px]">Sl. No.</TableHead>
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
                  const siteNames = update.updatedSiteDetails.map((s: SiteDetailFormData | ArsEntryFormData) => s.nameOfSite).join(', ');
                  
                  let purposeDisplay: string;
                  if (update.isArsUpdate) {
                    const arsDetail = update.updatedSiteDetails[0] as ArsEntryFormData;
                    purposeDisplay = arsDetail?.arsTypeOfScheme || 'N/A';
                  } else {
                    const siteDetails = update.updatedSiteDetails as SiteDetailFormData[];
                    purposeDisplay = siteDetails.map((s: SiteDetailFormData) => s.purpose || 'N/A').join(', ');
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
                      <TableCell className="text-center">{index + 1}</TableCell>
                      <TableCell className="font-medium font-mono text-xs">{update.fileNo}</TableCell>
                      {!isArsTable && <TableCell className="max-w-[150px] truncate">{applicantName}</TableCell>}
                      <TableCell className="max-w-[150px] truncate">{siteNames}</TableCell>
                      {!isArsTable && <TableCell className="text-xs">{purposeDisplay}</TableCell>}
                      <TableCell className="text-xs">{update.submittedByName}</TableCell>
                      <TableCell className="text-[10px] whitespace-nowrap">
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
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                            <Button variant="link" className="p-0 h-auto text-xs" onClick={() => handleViewChanges(update)}><ListChecks className="mr-1 h-3 w-3" />Diff</Button>
                            {canApprove && reviewLink ? (
                            <Button asChild size="sm" variant="outline" className="h-8 text-xs"><Link href={reviewLink}><CheckCircle className="mr-1 h-3 w-3" /> Review</Link></Button>
                            ) : (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                <Button size="sm" variant="outline" className="h-8 text-xs" disabled><CheckCircle className="mr-1 h-3 w-3" /> Review</Button>
                                </TooltipTrigger>
                                <TooltipContent><p>{!canApprove ? "Only assigned role (Scientist/Engineer) can approve this." : "Original file could not be found to start review."}</p></TooltipContent>
                            </Tooltip>
                            )}
                            {canApprove && (
                                <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={() => setUpdateToReject(update.id)} disabled={isRejecting || isRejected}><XCircle className="mr-1 h-3 w-3" /> Reject</Button>
                            )}
                            <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setUpdateToDelete(update.id)} disabled={isDeleting}>
                                <Trash2 className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Permanently Delete Update</p></TooltipContent>
                            </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={isArsTable ? 7 : 9} className="h-20 text-center text-muted-foreground italic">No pending updates in this category.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};


export default function PendingUpdatesPage() {
  const { setHeader } = usePageHeader();
  const { user } = useAuth();
  const { rejectUpdate, deleteUpdate, subscribeToPendingUpdates } = usePendingUpdates();
  const { allFileEntries: fileEntries, isLoading: filesLoading } = useDataStore();
  const { allArsEntries: arsEntries, isLoading: arsLoading } = useDataStore();
  const { toast } = useToast();
  
  const [pendingUpdates, setPendingUpdates] = useState<PendingUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [updateToReject, setUpdateToReject] = useState<string | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  
  const [updateToDelete, setUpdateToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [changesToView, setChangesToView] = useState<{ title: string; changes: { field: string; oldValue: string; newValue: string }[] } | null>(null);

  useEffect(() => {
    setHeader('Pending Actions', 'Review and approve or reject updates submitted by supervisors.');
  }, [setHeader]);

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = subscribeToPendingUpdates((updates) => {
      setPendingUpdates(updates);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [subscribeToPendingUpdates]);

  const { depositWorkUpdates, arsUpdates, gwInvestigationUpdates, loggingPumpingTestUpdates } = useMemo(() => {
    const ars: PendingUpdate[] = [];
    const investigation: PendingUpdate[] = [];
    const logging: PendingUpdate[] = [];
    const deposit: PendingUpdate[] = [];

    pendingUpdates.forEach(update => {
        if (update.isArsUpdate) {
            ars.push(update);
        } else {
            const firstSite = update.updatedSiteDetails[0] as SiteDetailFormData;
            const purpose = firstSite?.purpose || 'Deposit Work';

            if (purpose === 'GW Investigation') {
                investigation.push(update);
            } else if (LOGGING_PUMPING_TEST_PURPOSE_OPTIONS.includes(purpose as any)) {
                logging.push(update);
            } else {
                deposit.push(update);
            }
        }
    });

    return { 
        arsUpdates: ars, 
        gwInvestigationUpdates: investigation, 
        loggingPumpingTestUpdates: logging, 
        depositWorkUpdates: deposit 
    };
  }, [pendingUpdates]);

  const handleReject = async () => {
    if (!updateToReject) return;
    setIsRejecting(true);
    try {
      await rejectUpdate(updateToReject, rejectionReason);
      toast({
        title: "Update Rejected",
        description: "The supervisor's changes have been rejected and they have been notified.",
      });
    } catch (error: any) {
      toast({ title: "Rejection Failed", description: error.message || "Could not reject the update.", variant: "destructive" });
    } finally {
      setIsRejecting(false);
      setUpdateToReject(null);
      setRejectionReason("");
    }
  };

  const handleDelete = async () => {
    if (!updateToDelete) return;
    setIsDeleting(true);
    try {
      await deleteUpdate(updateToDelete);
      toast({ title: "Update Deleted", description: "The pending update has been permanently removed." });
    } catch (error: any) {
      toast({ title: "Deletion Failed", description: error.message || "Could not delete the update.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setUpdateToDelete(null);
    }
  };

  const handleViewChanges = (update: PendingUpdate) => {
    let originalEntry: any | undefined;
    if (update.isArsUpdate) {
        originalEntry = arsEntries.find(f => f.id === update.arsId);
    } else {
        originalEntry = fileEntries.find(f => f.fileNo === update.fileNo);
    }

    if (!originalEntry) {
        toast({ title: "Error", description: `Original record for File No: ${update.fileNo} not found in current cache.`, variant: "destructive" });
        return;
    }

    const allChanges: { field: string; oldValue: string; newValue: string }[] = [];
    let title = `Changes for File No: ${update.fileNo}`;

    const originalSites = update.isArsUpdate ? [originalEntry] : (originalEntry as DataEntryFormData).siteDetails || [];

    update.updatedSiteDetails.forEach((updatedSite: SiteDetailFormData | ArsEntryFormData) => {
        let originalSite: SiteDetailFormData | ArsEntryFormData | undefined;
        if (!update.isArsUpdate) {
          originalSite = (originalSites as SiteDetailFormData[]).find(
            s => s.nameOfSite === (updatedSite as SiteDetailFormData).nameOfSite
          );
        } else {
          originalSite = originalSites[0] as ArsEntryFormData;
        }

        if (!update.isArsUpdate) {
          const siteName = (updatedSite as SiteDetailFormData).nameOfSite;
          if (update.updatedSiteDetails.length > 1) {
            allChanges.push({ field: `--- Site: ${siteName} ---`, oldValue: '', newValue: '' });
          } else {
            title = `Changes for site "${siteName}"`;
          }
        }
        
        if (!originalSite) {
            allChanges.push({ field: "Site Status", oldValue: "Exists", newValue: "NEW SITE ADDED" });
            return;
        }

        Object.keys(updatedSite).forEach(key => {
            const typedKey = key as keyof (SiteDetailFormData | ArsEntryFormData);
            if (typedKey === 'workImages' || typedKey === 'workVideos') return; // Skip media comparison for summary view

            let originalValue = (originalSite as any)[typedKey];
            let updatedValue = (updatedSite as any)[typedKey];
            
            if (typedKey.toLowerCase().includes('date')) {
                originalValue = formatDateValue(originalValue);
                updatedValue = formatDateValue(updatedValue);
            } else {
                originalValue = originalValue ?? '';
                updatedValue = updatedValue ?? '';
            }

            if (String(originalValue) !== String(updatedValue)) {
                allChanges.push({
                    field: getFieldName(typedKey),
                    oldValue: String(originalValue) || '(empty)',
                    newValue: String(updatedValue) || '(empty)',
                });
            }
        });
    });
    
    if (allChanges.length > 0) {
      setChangesToView({ title, changes: allChanges });
    } else {
      toast({ title: "No Property Changes", description: "Only media or complex objects were updated, which are not listed in this diff view.", variant: "default" });
    }
  };

  const isAdmin = user?.role === 'admin';
  const isScientist = user?.role === 'scientist';
  const isEngineer = user?.role === 'engineer';

  if (isLoading || filesLoading || arsLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading pending updates...</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-8">
        {(isAdmin || isScientist) && (
            <>
                <UpdateTable
                    title="GW Investigation Updates"
                    icon={TestTube2}
                    updates={gwInvestigationUpdates}
                    fileEntries={fileEntries}
                    arsEntries={arsEntries}
                    handleViewChanges={handleViewChanges}
                    setUpdateToReject={setUpdateToReject}
                    setUpdateToDelete={setUpdateToDelete}
                    isRejecting={isRejecting}
                    isDeleting={isDeleting}
                    canApprove={isAdmin || isScientist}
                />
                <UpdateTable
                    title="Logging & Pumping Test Updates"
                    icon={Droplets}
                    updates={loggingPumpingTestUpdates}
                    fileEntries={fileEntries}
                    arsEntries={arsEntries}
                    handleViewChanges={handleViewChanges}
                    setUpdateToReject={setUpdateToReject}
                    setUpdateToDelete={setUpdateToDelete}
                    isRejecting={isRejecting}
                    isDeleting={isDeleting}
                    canApprove={isAdmin || isScientist}
                />
            </>
        )}
        
        {(isAdmin || isEngineer) && (
            <>
                <UpdateTable
                    title="Deposit Work Updates"
                    icon={FolderOpen}
                    updates={depositWorkUpdates}
                    fileEntries={fileEntries}
                    arsEntries={arsEntries}
                    handleViewChanges={handleViewChanges}
                    setUpdateToReject={setUpdateToReject}
                    setUpdateToDelete={setUpdateToDelete}
                    isRejecting={isRejecting}
                    isDeleting={isDeleting}
                    canApprove={isAdmin || isEngineer}
                />
                <UpdateTable
                    title="ARS Updates"
                    icon={Waves}
                    updates={arsUpdates}
                    isArsTable={true}
                    fileEntries={fileEntries}
                    arsEntries={arsEntries}
                    handleViewChanges={handleViewChanges}
                    setUpdateToReject={setUpdateToReject}
                    setUpdateToDelete={setUpdateToDelete}
                    isRejecting={isRejecting}
                    isDeleting={isDeleting}
                    canApprove={isAdmin || isEngineer}
                />
            </>
        )}
      </div>
      
      <AlertDialog open={!!updateToReject} onOpenChange={() => setUpdateToReject(null)}>
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Reject this update?</AlertDialogTitle><AlertDialogDescription>Please provide a reason for the rejection below.</AlertDialogDescription></AlertDialogHeader>
            <div className="py-2"><Label htmlFor="rejection-reason" className="text-left">Reason (Optional)</Label><Textarea id="rejection-reason" placeholder="e.g., Incorrect work status." value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} className="mt-2" /></div>
            <AlertDialogFooter><AlertDialogCancel disabled={isRejecting}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleReject} disabled={isRejecting} className="bg-destructive hover:bg-destructive/90">{isRejecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Yes, Reject"}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!updateToDelete} onOpenChange={() => setUpdateToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Permanently delete this update?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone and will remove the update record permanently.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">{isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Yes, Delete"}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!changesToView} onOpenChange={() => setChangesToView(null)}>
        <DialogContent className="sm:max-w-2xl p-0">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle>{changesToView?.title}</DialogTitle>
            <DialogDescription>Review the changes submitted by the supervisor.</DialogDescription>
          </DialogHeader>
          <div className="p-6">
            <ScrollArea className="max-h-[60vh] pr-4">
              <Table>
                <TableHeader><TableRow><TableHead className="w-[30%]">Field</TableHead><TableHead className="w-[35%]">Original Value</TableHead><TableHead className="w-[35%]">New Value</TableHead></TableRow></TableHeader>
                <TableBody>{changesToView?.changes.map((change, index) => (<TableRow key={index}><TableCell className="font-medium text-xs">{change.field}</TableCell><TableCell className="text-xs text-muted-foreground line-through">{change.oldValue}</TableCell><TableCell className="text-xs font-semibold text-primary">{change.newValue}</TableCell></TableRow>))}</TableBody>
              </Table>
            </ScrollArea>
          </div>
          <DialogFooter className="p-6 pt-4 border-t">
            <DialogClose asChild>
              <Button>Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
