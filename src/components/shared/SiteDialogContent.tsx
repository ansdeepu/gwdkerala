
"use client";

import { useForm, FormProvider, useWatch, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Save, X, Info } from "lucide-react";
import { SiteDetailSchema, type SiteDetailFormData, siteWorkStatusOptions, sitePurposeOptions, type SitePurpose, siteDiameterOptions, siteTypeOfRigOptions, siteConditionsOptions, type Constituency, type StaffMember, type E_tender, type Bidder } from '@/lib/schemas';
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, isValid, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import MediaManager from '@/components/shared/MediaManager';

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
    (status) => !["Bill Prepared", "Payment Completed", "Utilization Certificate Issued", "Pending", "VES Pending"].includes(status)
);

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
            dateOfCompletion: formatDateForInput(initialData?.dateOfCompletion),
            arsSanctionedDate: formatDateForInput(initialData?.arsSanctionedDate),
            workImages: initialData?.workImages || [],
            workVideos: initialData?.workVideos || [],
        },
    });
    
    const { control, setValue, trigger, watch, handleSubmit, getValues } = form;

    const { fields: imageFields, append: appendImage, remove: removeImage, update: updateImage } = useFieldArray({ control, name: "workImages" });
    const { fields: videoFields, append: appendVideo, remove: removeVideo, update: updateVideo } = useFieldArray({ control, name: "workVideos" });

    const watchedPurpose = watch('purpose');
    const watchedWorkStatus = watch('workStatus');
    const watchedLsg = watch("localSelfGovt");
    const watchedTenderNo = watch('tenderNo');
    
    const isCompletionDateRequired = watchedWorkStatus === 'Work Completed' || watchedWorkStatus === 'Work Failed';

    const isFieldReadOnly = (isSupervisorEditable: boolean) => {
        if (isReadOnly) return true;
        if (isSupervisor) return !isSupervisorEditable;
        return false;
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

    const handleSupervisorChange = (uid: string) => {
        const staff = supervisorList.find(s => s.uid === uid);
        setValue('supervisorUid', uid);
        setValue('supervisorName', staff?.name || '');
        setValue('supervisorDesignation', staff?.designation || '');
    };

    const handleDialogSubmit = (data: SiteDetailFormData) => {
        onConfirm(data);
    };

    const isWellPurpose = useMemo(() => ['BWC', 'TWC', 'FPW'].includes(watchedPurpose as any), [watchedPurpose]);

    return (
      <div className="flex flex-col h-full overflow-hidden">
        <DialogHeader className="p-6 pb-4 shrink-0">
          <DialogTitle>{initialData?.nameOfSite ? `Edit Site Details: ${initialData.nameOfSite}` : 'Add New Site'}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full px-6 py-4">
            <Form {...form}>
              <form id="site-dialog-form" onSubmit={handleSubmit(handleDialogSubmit)} className="space-y-6">
                {/* 1. Main Details */}
                <Card className="shadow-lg">
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

                {/* 2. Investigation Details (Recommended) */}
                {isWellPurpose && (
                    <Card className="shadow-md">
                        <CardHeader><CardTitle>Investigation Details (Recommended)</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <FormField name="surveyRecommendedDiameter" control={control} render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Diameter (mm)</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || ""} disabled={isFieldReadOnly(true)}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select Diameter" /></SelectTrigger></FormControl>
                                            <SelectContent>{siteDiameterOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField name="surveyRecommendedTD" control={control} render={({ field }) => <FormItem><FormLabel>Total Depth (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage /></FormItem>} />
                                
                                {watchedPurpose === 'BWC' && (
                                    <>
                                        <FormField name="surveyRecommendedOB" control={control} render={({ field }) => <FormItem><FormLabel>OB (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage /></FormItem>} />
                                        <FormField name="surveyRecommendedCasingPipe" control={control} render={({ field }) => <FormItem><FormLabel>Casing Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage /></FormItem>} />
                                    </>
                                )}

                                {watchedPurpose === 'TWC' && (
                                    <>
                                        <FormField name="surveyRecommendedPlainPipe" control={control} render={({ field }) => <FormItem><FormLabel>Plain Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage /></FormItem>} />
                                        <FormField name="surveyRecommendedSlottedPipe" control={control} render={({ field }) => <FormItem><FormLabel>Slotted Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage /></FormItem>} />
                                        <FormField name="surveyRecommendedMsCasingPipe" control={control} render={({ field }) => <FormItem><FormLabel>MS Casing Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage /></FormItem>} />
                                    </>
                                )}

                                {watchedPurpose === 'FPW' && (
                                    <FormField name="surveyRecommendedCasingPipe" control={control} render={({ field }) => <FormItem><FormLabel>Casing Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage /></FormItem>} />
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField name="surveyLocation" control={control} render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Well Location</FormLabel>
                                        <FormControl><Textarea {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)} className="min-h-[40px]" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField name="surveyRemarks" control={control} render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Investigation Remarks</FormLabel>
                                        <FormControl><Textarea {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)} className="min-h-[40px]" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* 3. Work Implementation */}
                <Card className="shadow-md">
                    <CardHeader><CardTitle>Work Implementation</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField name="siteConditions" control={control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Site Conditions</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select Conditions" /></SelectTrigger></FormControl>
                                        <SelectContent>{siteConditionsOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField name="accessibleRig" control={control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Rig Accessibility</FormLabel>
                                    <FormControl><Input {...field} value={field.value || ''} placeholder="e.g., Small DTH accessible" readOnly={isFieldReadOnly(false)} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField name="estimateAmount" control={control} render={({ field }) => <FormItem><FormLabel>Estimate Amount (₹)</FormLabel><FormControl><Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage /></FormItem>} />
                            <FormField name="remittedAmount" control={control} render={({ field }) => <FormItem><FormLabel>Remitted Amount (₹)</FormLabel><FormControl><Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage /></FormItem>} />
                            <FormField name="tsAmount" control={control} render={({ field }) => <FormItem><FormLabel>TS Amount (₹)</FormLabel><FormControl><Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage /></FormItem>} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField name="tenderNo" control={control} render={({ field }) => <FormItem><FormLabel>Tender No.</FormLabel><FormControl><Input {...field} value={field.value ?? ''} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage /></FormItem>} />
                            <FormField name="contractorName" control={control} render={({ field }) => <FormItem><FormLabel>Contractor</FormLabel><FormControl><Input {...field} value={field.value ?? ''} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage /></FormItem>} />
                            <FormField name="supervisorUid" control={control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Supervisor</FormLabel>
                                    <Select onValueChange={handleSupervisorChange} value={field.value || ""}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select Supervisor" /></SelectTrigger></FormControl>
                                        <SelectContent className="max-h-80">
                                            <SelectItem value="_clear_">-- Clear --</SelectItem>
                                            {supervisorList.map(s => <SelectItem key={s.uid} value={s.uid}>{s.name} ({s.designation})</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                        </div>
                        <FormField name="implementationRemarks" control={control} render={({ field }) => (
                            <FormItem>
                                <FormLabel>Implementation Remarks</FormLabel>
                                <FormControl><Textarea {...field} value={field.value || ''} placeholder="Any specific remarks about implementation..." readOnly={isFieldReadOnly(false)} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                    </CardContent>
                </Card>

                {/* 4. Drilling Details (Actuals) */}
                {isWellPurpose && (
                    <Card className="shadow-md">
                        <CardHeader><CardTitle>Drilling Details (Actuals)</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <FormField name="diameter" control={control} render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Actual Diameter <span className="text-destructive">*</span></FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || ""} disabled={isFieldReadOnly(true)}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select Diameter" /></SelectTrigger></FormControl>
                                            <SelectContent>{siteDiameterOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField name="totalDepth" control={control} render={({ field }) => <FormItem><FormLabel>Actual TD (m)</FormLabel><FormControl><Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage /></FormItem>} />
                                
                                {watchedPurpose === 'BWC' && (
                                    <>
                                        <FormField name="surveyOB" control={control} render={({ field }) => <FormItem><FormLabel>Actual OB (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage /></FormItem>} />
                                        <FormField name="casingPipeUsed" control={control} render={({ field }) => <FormItem><FormLabel>Casing Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage /></FormItem>} />
                                        <FormField name="outerCasingPipe" control={control} render={({ field }) => <FormItem><FormLabel>Outer Casing (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage /></FormItem>} />
                                        <FormField name="innerCasingPipe" control={control} render={({ field }) => <FormItem><FormLabel>Inner Casing (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage /></FormItem>} />
                                    </>
                                )}

                                {watchedPurpose === 'TWC' && (
                                    <>
                                        <FormField name="pilotDrillingDepth" control={control} render={({ field }) => <FormItem><FormLabel>Pilot Drilling (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage /></FormItem>} />
                                        <FormField name="surveyPlainPipe" control={control} render={({ field }) => <FormItem><FormLabel>Plain Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage /></FormItem>} />
                                        <FormField name="surveySlottedPipe" control={control} render={({ field }) => <FormItem><FormLabel>Slotted Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage /></FormItem>} />
                                        <FormField name="outerCasingPipe" control={control} render={({ field }) => <FormItem><FormLabel>MS Casing Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage /></FormItem>} />
                                    </>
                                )}

                                {watchedPurpose === 'FPW' && (
                                    <FormField name="casingPipeUsed" control={control} render={({ field }) => <FormItem><FormLabel>Casing Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage /></FormItem>} />
                                )}

                                <FormField name="yieldDischarge" control={control} render={({ field }) => <FormItem><FormLabel>Yield (LPH)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage /></FormItem>} />
                                <FormField name="zoneDetails" control={control} render={({ field }) => <FormItem><FormLabel>Zone Details (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage /></FormItem>} />
                                <FormField name="waterLevel" control={control} render={({ field }) => <FormItem><FormLabel>Static Water (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage /></FormItem>} />
                                
                                <FormField name="typeOfRig" control={control} render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Type of Rig</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || undefined} disabled={isFieldReadOnly(true)}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select Rig" /></SelectTrigger></FormControl>
                                            <SelectContent>{siteTypeOfRigOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                            </div>
                            <FormField name="drillingRemarks" control={control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Drilling Remarks</FormLabel>
                                    <FormControl><Textarea {...field} value={field.value || ''} placeholder="Any specific remarks about drilling actuals..." readOnly={isFieldReadOnly(true)} className="min-h-[40px]" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                        </CardContent>
                    </Card>
                )}

                {/* 5. Work Status */}
                <Card className="shadow-md">
                    <CardHeader><CardTitle>Work Status</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <FormField name="workStatus" control={control} render={({ field }) => <FormItem><FormLabel>Work Status <span className="text-destructive">*</span></FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isFieldReadOnly(true)}><FormControl><SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger></FormControl><SelectContent>{SITE_DIALOG_WORK_STATUS_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</Select><FormMessage /></FormItem>} />
                           <FormField name="dateOfCompletion" control={control} render={({ field }) => <FormItem><FormLabel>Completion Date {isCompletionDateRequired && <span className="text-destructive">*</span>}</FormLabel><FormControl><Input type="date" {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)} /></FormControl><FormMessage /></FormItem>} />
                           <FormField name="totalExpenditure" control={control} render={({ field }) => <FormItem><FormLabel>Total Expenditure (₹)</FormLabel><FormControl><Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isFieldReadOnly(true)} /></FormControl><FormMessage /></FormItem>} />
                           <FormField name="workRemarks" control={control} render={({ field }) => (
                                <FormItem className="md:col-span-2">
                                    <FormLabel>Work Remarks</FormLabel>
                                    <FormControl><Textarea {...field} value={field.value ?? ""} placeholder="Add any final remarks about the work status..." readOnly={isFieldReadOnly(true)} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                       </div>
                    </CardContent>
                 </Card>

                 {/* 6. Media Gallery */}
                 <Card className="shadow-lg">
                    <CardHeader><CardTitle>Media Gallery</CardTitle></CardHeader>
                    <CardContent className="space-y-6">
                        <MediaManager
                            title="Work Images"
                            type="image"
                            fields={imageFields}
                            append={appendImage}
                            remove={removeImage}
                            update={updateImage}
                            isReadOnly={isFieldReadOnly(true)}
                        />
                        <Separator />
                        <MediaManager
                            title="Work Videos"
                            type="video"
                            fields={videoFields}
                            append={appendVideo}
                            remove={removeVideo}
                            update={updateVideo}
                            isReadOnly={isFieldReadOnly(true)}
                        />
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
