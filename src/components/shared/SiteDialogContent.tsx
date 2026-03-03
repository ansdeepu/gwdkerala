"use client";

import { useForm, FormProvider, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Save, X } from "lucide-react";
import { SiteDetailSchema, type SiteDetailFormData, siteWorkStatusOptions, sitePurposeOptions, type SitePurpose, siteDiameterOptions, siteTypeOfRigOptions, siteConditionsOptions, type Constituency, type StaffMember, type E_tender, type Bidder } from '@/lib/schemas';
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, isValid, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Helper functions
const toDateOrNull = (value: any): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'string') {
        const d = parseISO(value);
        if (isValid(d)) return d;
    }
    if (typeof value === 'object' && value.seconds) {
        const d = new Date(value.seconds * 1000);
        if (isValid(d)) return d;
    }
    return null;
};

const formatDateForInput = (date: any): string => {
    if (!date) return '';
    const d = toDateOrNull(date);
    return d ? format(d, 'yyyy-MM-dd') : '';
};

const SITE_DIALOG_WORK_STATUS_OPTIONS = siteWorkStatusOptions.filter(
    (status) => !["Bill Prepared", "Payment Completed", "Utilization Certificate Issued"].includes(status)
);

// Component
export default function SiteDialogContent({ initialData, onConfirm, onCancel, isReadOnly, isSupervisor, supervisorList, allLsgConstituencyMaps, allE_tenders }: {
    initialData: Partial<SiteDetailFormData>;
    onConfirm: (data: SiteDetailFormData) => void;
    onCancel: () => void;
    isReadOnly: boolean;
    isSupervisor: boolean;
    supervisorList: (StaffMember & { uid: string; name: string; })[];
    allLsgConstituencyMaps: any[];
    allE_tenders: E_tender[];
}) {
    const form = useForm<SiteDetailFormData>({
        resolver: zodResolver(SiteDetailSchema),
        defaultValues: {
            ...initialData,
            dateOfCompletion: formatDateForInput(initialData.dateOfCompletion),
        },
    });
    
    const { control, setValue, trigger, watch, handleSubmit, getValues } = form;

    const watchedPurpose = watch('purpose');
    const watchedWorkStatus = watch('workStatus');
    const watchedLsg = watch("localSelfGovt");
    const watchedTenderNo = watch('tenderNo');
    
    const isCompletionDateRequired = watchedWorkStatus === 'Work Completed' || watchedWorkStatus === 'Work Failed';

    const isFieldReadOnly = (isSupervisorEditable: boolean) => {
        if (isReadOnly) return true;
        if (isSupervisor) return !isSupervisorEditable;
        return false; // Editor can edit everything
    };

    const sortedLsgMaps = useMemo(() => {
        return [...allLsgConstituencyMaps].sort((a, b) => a.name.localeCompare(b.name));
    }, [allLsgConstituencyMaps]);
    
    const constituencyOptionsForLsg = useMemo(() => {
        if (!watchedLsg) return [];
        const map = allLsgConstituencyMaps.find(m => m.name === watchedLsg);
        if (!map || !map.constituencies) return [];
        return [...map.constituencies].sort((a, b) => a.localeCompare(b));
    }, [watchedLsg, allLsgConstituencyMaps]);
    
    const handleLsgChange = useCallback((lsgName: string) => {
        setValue('localSelfGovt', lsgName);
        const map = allLsgConstituencyMaps.find(m => m.name === lsgName);
        const constituencies = map?.constituencies || [];
        setValue('constituency', undefined);
        if (constituencies.length === 1) {
            setValue('constituency', constituencies[0] as Constituency);
        }
        trigger('constituency');
    }, [setValue, allLsgConstituencyMaps, trigger]);

    useEffect(() => {
        if (!watchedLsg) return;
        const map = allLsgConstituencyMaps.find(m => m.name === watchedLsg);
        const constituencies = map?.constituencies || [];
        if (constituencies.length === 1 && getValues("constituency") !== constituencies[0]) {
            setValue('constituency', constituencies[0] as Constituency);
        }
    }, [watchedLsg, allLsgConstituencyMaps, setValue, getValues]);

    const isConstituencyDisabled = useMemo(() => {
        if (isFieldReadOnly(false)) return true;
        if (!watchedLsg) return true;
        if (constituencyOptionsForLsg.length <= 1) return true;
        return false;
    }, [isFieldReadOnly, watchedLsg, constituencyOptionsForLsg]);

    useEffect(() => {
        const selectedTender = allE_tenders.find(t => t.eTenderNo === watchedTenderNo);
        if (selectedTender) {
            const validBidders = (selectedTender.bidders || []).filter((b: Bidder) => b.status === 'Accepted' && typeof b.quotedAmount === 'number' && b.quotedAmount > 0);
            const l1Bidder = validBidders.length > 0 ? validBidders.reduce((lowest: Bidder, current: Bidder) => (lowest.quotedAmount! < current.quotedAmount!) ? lowest : current) : null;
            setValue('contractorName', l1Bidder ? `${l1Bidder.name}, ${l1Bidder.address}` : '');
        }
    }, [watchedTenderNo, allE_tenders, setValue]);

    const handleDialogSubmit = (data: SiteDetailFormData) => {
        onConfirm(data);
    };

    const isWellPurpose = useMemo(() => ['BWC', 'TWC', 'FPW'].includes(watchedPurpose as any), [watchedPurpose]);
    const isDevPurpose = useMemo(() => ['BW Dev', 'TW Dev', 'FPW Dev'].includes(watchedPurpose as any), [watchedPurpose]);
    const isSchemePurpose = useMemo(() => ['MWSS', 'MWSS Ext', 'Pumping Scheme', 'MWSS Pump Reno'].includes(watchedPurpose as any), [watchedPurpose]);
    const isHPSPurpose = useMemo(() => ['HPS', 'HPR'].includes(watchedPurpose as any), [watchedPurpose]);
    const isARSPurpose = useMemo(() => watchedPurpose === 'ARS', [watchedPurpose]);

    return (
      <div className="flex flex-col h-full overflow-hidden">
        <DialogHeader className="p-6 pb-4 shrink-0">
          <DialogTitle>{initialData?.nameOfSite ? `Edit Site Details: ${initialData.nameOfSite}` : 'Add New Site'}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full px-6 py-4">
            <Form {...form}>
              <form id="site-dialog-form" onSubmit={handleSubmit(handleDialogSubmit)} className="space-y-6">
                <Card>
                    <CardHeader><CardTitle>Main Details</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             <FormField name="nameOfSite" control={control} render={({ field }) => <FormItem><FormLabel>Name of Site <span className="text-destructive">*</span></FormLabel><FormControl><Input {...field} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage /></FormItem>} />
                             <FormField name="purpose" control={control} render={({ field }) => ( <FormItem><FormLabel>Purpose <span className="text-destructive">*</span></FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isFieldReadOnly(false)}><FormControl><SelectTrigger><SelectValue placeholder="Select Purpose" /></SelectTrigger></FormControl><SelectContent>{sitePurposeOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                             <FormField name="localSelfGovt" control={control} render={({ field }) => ( <FormItem><FormLabel>Local Self Govt.</FormLabel><Select onValueChange={(value) => handleLsgChange(value)} value={field.value} disabled={isFieldReadOnly(false)}><FormControl><SelectTrigger><SelectValue placeholder="Select LSG"/></SelectTrigger></FormControl><SelectContent className="max-h-80"><SelectItem value="_clear_" onSelect={(e) => { e.preventDefault(); field.onChange(undefined); }}>-- Clear Selection --</SelectItem>{sortedLsgMaps.map(map => <SelectItem key={map.id} value={map.name}>{map.name}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem> )}/>
                             <FormField name="constituency" control={control} render={({ field }) => ( <FormItem><FormLabel>Constituency (LAC)</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isConstituencyDisabled}><FormControl><SelectTrigger><SelectValue placeholder={!watchedLsg ? "Select LSG first" : "Select Constituency"}/></SelectTrigger></FormControl><SelectContent><SelectItem value="_clear_" onSelect={(e) => { e.preventDefault(); field.onChange(undefined); }}>-- Clear Selection --</SelectItem>{constituencyOptionsForLsg.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem> )}/>
                             <FormField name="latitude" control={control} render={({ field }) => <FormItem><FormLabel>Latitude</FormLabel><FormControl><Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isFieldReadOnly(true)} /></FormControl><FormMessage /></FormItem>} />
                             <FormField name="longitude" control={control} render={({ field }) => <FormItem><FormLabel>Longitude</FormLabel><FormControl><Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isFieldReadOnly(true)} /></FormControl><FormMessage /></FormItem>} />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Financial & Work Details</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField name="estimateAmount" control={control} render={({ field }) => <FormItem><FormLabel>Site Estimate (₹)</FormLabel><FormControl><Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage /></FormItem>} />
                        <FormField name="remittedAmount" control={control} render={({ field }) => <FormItem><FormLabel>Remitted for Site (₹)</FormLabel><FormControl><Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage /></FormItem>} />
                        <FormField name="tsAmount" control={control} render={({ field }) => <FormItem><FormLabel>TS Amount (₹)</FormLabel><FormControl><Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage /></FormItem>} />
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <FormField name="tenderNo" control={control} render={({ field }) => <FormItem><FormLabel>Tender No.</FormLabel><FormControl><Input {...field} value={field.value ?? ''} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage /></FormItem>} />
                       <FormField name="contractorName" control={control} render={({ field }) => <FormItem><FormLabel>Contractor</FormLabel><FormControl><Input {...field} value={field.value ?? ''} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage /></FormItem>} />
                     </div>
                  </CardContent>
                </Card>
                
                <Card>
                    <CardHeader><CardTitle>Survey Details</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <FormField name="surveyLocation" control={control} render={({ field }) => (
                                <FormItem className="md:col-span-2">
                                    <FormLabel>Survey Location</FormLabel>
                                    <FormControl><Textarea {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)} className="min-h-[40px]" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField name="surveyRemarks" control={control} render={({ field }) => (
                                <FormItem className="md:col-span-2">
                                    <FormLabel>Survey Remarks</FormLabel>
                                    <FormControl><Textarea {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)} className="min-h-[40px]" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                        </div>
                    </CardContent>
                </Card>

                {isWellPurpose && (
                    <Card>
                        <CardHeader><CardTitle>Drilling Details</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            {/* ... Fields ... */}
                        </CardContent>
                    </Card>
                )}

                 <Card>
                    <CardHeader><CardTitle>Work Status</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <FormField name="workStatus" control={control} render={({ field }) => <FormItem><FormLabel>Status <span className="text-destructive">*</span></FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isFieldReadOnly(true)}><FormControl><SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger></FormControl><SelectContent>{SITE_DIALOG_WORK_STATUS_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
                           <FormField name="dateOfCompletion" control={control} render={({ field }) => <FormItem><FormLabel>Completion Date {isCompletionDateRequired && <span className="text-destructive">*</span>}</FormLabel><FormControl><Input type="date" {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)} /></FormControl><FormMessage /></FormItem>} />
                           <FormField name="workRemarks" control={control} render={({ field }) => (
                                <FormItem className="md:col-span-2">
                                    <FormLabel>Status Remarks</FormLabel>
                                    <FormControl><Textarea {...field} value={field.value ?? ""} placeholder="Add status-related remarks..." readOnly={isFieldReadOnly(true)} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                       </div>
                    </CardContent>
                 </Card>
              </form>
            </Form>
          </ScrollArea>
        </div>
        <div className="flex justify-end p-6 pt-4 shrink-0 border-t">
          <Button variant="outline" type="button" onClick={onCancel}>{isReadOnly ? 'Close' : 'Cancel'}</Button>
          {!isReadOnly && <Button type="submit" form="site-dialog-form">Save</Button>}
        </div>
      </div>
    );
}
