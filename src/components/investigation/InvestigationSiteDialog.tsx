
// src/components/investigation/InvestigationSiteDialog.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm, FormProvider, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Save, X, Info } from "lucide-react";
import {
  SiteDetailSchema,
  type SiteDetailFormData,
  type SitePurpose,
  type Constituency,
  constituencyOptions,
  type StaffMember,
  typeOfWellOptions,
  INVESTIGATION_WORK_STATUS_OPTIONS,
  siteDiameterOptions
} from '@/lib/schemas';
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { ScrollArea } from "../ui/scroll-area";
import MediaManager from '@/components/shared/MediaManager';
import { Separator } from '@/components/ui/separator';

const formatDateForInput = (date: any): string => {
    if (!date) return '';
    try { return new Date(date).toISOString().split('T')[0]; } catch { return ''; }
};

interface InvestigationSiteDialogProps {
    initialData: Partial<SiteDetailFormData>;
    onConfirm: (data: SiteDetailFormData) => void;
    onCancel: () => void;
    isReadOnly: boolean;
    isInvestigator: boolean;
    isSupervisor: boolean;
    allLsgConstituencyMaps: any[];
    allStaffMembers: StaffMember[];
    workTypeContext: string | null;
}

export default function InvestigationSiteDialog({ initialData, onConfirm, onCancel, isReadOnly, isInvestigator, isSupervisor, allLsgConstituencyMaps, allStaffMembers, workTypeContext }: InvestigationSiteDialogProps) {
    const form = useForm<SiteDetailFormData>({
        resolver: zodResolver(SiteDetailSchema),
        defaultValues: {
            ...initialData,
            purpose: "GW Investigation",
            dateOfInvestigation: formatDateForInput(initialData?.dateOfInvestigation),
            vesDate: formatDateForInput(initialData?.vesDate),
            dateOfCompletion: formatDateForInput(initialData?.dateOfCompletion),
            workImages: initialData?.workImages || [],
            workVideos: initialData?.workVideos || [],
        },
    });

    const { control, handleSubmit, watch, setValue, trigger, getValues } = form;
    const { fields: imageFields, append: appendImage, remove: removeImage, update: updateImage } = useFieldArray({ control, name: "workImages" });
    const { fields: videoFields, append: appendVideo, remove: removeVideo, update: updateVideo } = useFieldArray({ control, name: "workVideos" });
    
    const watchedLsg = watch("localSelfGovt");
    const watchedVesRequired = watch("vesRequired");
    const watchedTypeOfWell = watch("typeOfWell");
    const watchedFeasibility = watch("feasibility");
    const watchedWorkStatus = watch("workStatus");

    useEffect(() => {
        if (!watchedLsg || !allLsgConstituencyMaps) {
            return;
        }
        const map = allLsgConstituencyMaps.find(m => m.name === watchedLsg);
        const constituencies = map?.constituencies || [];
        
        if (constituencies.length === 1) {
            const autoValue = constituencies[0];
            if (getValues('constituency') !== autoValue) {
                setValue('constituency', autoValue as Constituency, { shouldDirty: true, shouldValidate: true });
            }
        } else {
            const current = getValues('constituency');
            if (current && !constituencies.includes(current)) {
                setValue('constituency', undefined);
            }
        }
    }, [watchedLsg, allLsgConstituencyMaps, setValue, getValues]);

    const hydroInvestigatorList = useMemo(() => 
        allStaffMembers.filter(s => 
            s.status === 'Active' && 
            ['Hydrogeologist', 'Junior Hydrogeologist', 'Geological Assistant'].includes(s.designation as any)
        ).sort((a, b) => a.name.localeCompare(b.name)), 
    [allStaffMembers]);

    const geoInvestigatorList = useMemo(() => 
        allStaffMembers.filter(s => 
            s.status === 'Active' && 
            ['Geophysicist', 'Junior Geophysicist', 'Geophysical Assistant'].includes(s.designation as any)
        ).sort((a, b) => a.name.localeCompare(b.name)), 
    [allStaffMembers]);

    const handleFormSubmit = (data: SiteDetailFormData) => onConfirm(data);
    
    const sortedLsgMaps = useMemo(() => [...(allLsgConstituencyMaps || [])].sort((a, b) => a.name.localeCompare(b.name)), [allLsgConstituencyMaps]);
    const constituencyOptionsForLsg = useMemo(() => {
        if (!watchedLsg || !allLsgConstituencyMaps) return [];
        const map = allLsgConstituencyMaps.find(m => m.name === watchedLsg);
        return map?.constituencies?.sort((a: string, b: string) => a.localeCompare(b)) || [];
    }, [watchedLsg, allLsgConstituencyMaps]);

    const handleLsgChange = useCallback((lsgName: string, fieldOnChange: (v: string) => void) => {
        const normalized = lsgName === '_clear_' ? '' : lsgName;
        fieldOnChange(normalized);
    }, []);

    const isConstituencyDisabled = useMemo(() => {
        if (isReadOnly) return true;
        if (!watchedLsg) return true;
        if (constituencyOptionsForLsg.length <= 1) return true;
        return false;
    }, [isReadOnly, watchedLsg, constituencyOptionsForLsg]);

    const isCompletionDateRequired = watchedWorkStatus === 'Completed';

    const latLongReadOnly = isReadOnly && !isSupervisor && !isInvestigator;

    return (
        <FormProvider {...form}>
            <form id="investigation-site-dialog-form" onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col h-full overflow-hidden">
                <DialogHeader className="p-6 pb-4 shrink-0 border-b">
                    <DialogTitle>{initialData?.nameOfSite ? `Edit Site: ${initialData.nameOfSite}` : 'Add New Site'}</DialogTitle>
                    <DialogDescription>Enter site specific details for the Investigation work.</DialogDescription>
                </DialogHeader>
                <div className="flex-1 min-h-0">
                    <ScrollArea className="h-full px-6 py-4">
                        <div className="space-y-6">
                            <Card>
                                <CardHeader><CardTitle className="text-lg text-primary">Main Details</CardTitle></CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <FormField name="nameOfSite" control={control} render={({ field }) => <FormItem><FormLabel>Name of Site <span className="text-destructive">*</span></FormLabel><FormControl><Input {...field} value={field.value ?? ''} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                                    <FormField name="purpose" control={control} render={({ field }) => <FormItem><FormLabel>Purpose</FormLabel><FormControl><Input {...field} value={field.value ?? ''} readOnly className="bg-muted" /></FormControl><FormMessage /></FormItem>} />
                                    <FormField name="localSelfGovt" control={control} render={({ field }) => <FormItem><FormLabel>Local Self Govt. <span className="text-destructive">*</span></FormLabel><Select onValueChange={(val) => handleLsgChange(val, field.onChange)} value={field.value || ""} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Select LSG" /></SelectTrigger></FormControl><SelectContent className="max-h-80"><SelectItem value="_clear_">-- Clear Selection --</SelectItem>{sortedLsgMaps.map(map => <SelectItem key={map.id} value={map.name}>{map.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
                                    <FormField name="constituency" control={control} render={({ field }) => <FormItem><FormLabel>Constituency (LAC)</FormLabel><Select onValueChange={(val) => field.onChange(val === '_clear_' ? undefined : val)} value={field.value || ""} disabled={isConstituencyDisabled}><FormControl><SelectTrigger><SelectValue placeholder={!watchedLsg ? "Select LSG first" : "Select Constituency"} /></SelectTrigger></FormControl><SelectContent className="max-h-80"><SelectItem value="_clear_">-- Clear Selection --</SelectItem>{constituencyOptionsForLsg.map((o: string) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</Select><FormMessage /></FormItem>} />
                                    <FormField name="latitude" control={control} render={({ field }) => <FormItem><FormLabel>Latitude</FormLabel><FormControl><Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={latLongReadOnly} /></FormControl><FormMessage /></FormItem>} />
                                    <FormField name="longitude" control={control} render={({ field }) => <FormItem><FormLabel>Longitude</FormLabel><FormControl><Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={latLongReadOnly} /></FormControl><FormMessage /></FormItem>} />
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader><CardTitle className="text-lg text-primary">Investigation Details</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <FormField name="nameOfInvestigator" control={control} render={({ field }) => <FormItem><FormLabel>Investigator (Hydrogeological)</FormLabel><Select onValueChange={field.onChange} value={field.value || ''} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Select Investigator" /></SelectTrigger></FormControl><SelectContent>{hydroInvestigatorList.map(s => <SelectItem key={s.id} value={s.name}>{s.name} ({s.designation})</SelectItem>)}</Select><FormMessage /></FormItem>} />
                                        <FormField name="typeOfWell" control={control} render={({ field }) => <FormItem><FormLabel>Type of Well <span className="text-destructive">*</span></FormLabel><Select onValueChange={field.onChange} value={field.value || ''} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Select Well Type" /></SelectTrigger></FormControl><SelectContent>{typeOfWellOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</Select><FormMessage /></FormItem>} />
                                        <FormField name="dateOfInvestigation" control={control} render={({ field }) => <FormItem><FormLabel>Date of Investigation</FormLabel><FormControl><Input type="date" {...field} value={field.value || ''} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                                    </div>
                                    <FormField name="hydrogeologicalRemarks" control={control} render={({ field }) => <FormItem><FormLabel>Hydrogeological Remarks</FormLabel><FormControl><Textarea {...field} value={field.value || ''} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
                                        <FormField name="vesRequired" control={control} render={({ field }) => <FormItem><FormLabel>VES Required?</FormLabel><Select onValueChange={field.onChange} value={field.value || ''} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Select Yes/No" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem></Select><FormMessage /></FormItem>} />
                                    </div>

                                    {watchedVesRequired === 'Yes' && (
                                        <div className="p-4 border rounded-lg bg-blue-50/30 space-y-4">
                                            <h4 className="text-sm font-bold text-blue-800">Geophysical (VES) Details</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <FormField name="vesDate" control={control} render={({ field }) => <FormItem><FormLabel>Date of VES Conducted</FormLabel><FormControl><Input type="date" {...field} value={field.value || ''} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                                                <FormField name="vesInvestigator" control={control} render={({ field }) => <FormItem><FormLabel>Name of Investigator (Geophysical)</FormLabel><Select onValueChange={field.onChange} value={field.value || ''} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Select Investigator" /></SelectTrigger></FormControl><SelectContent>{geoInvestigatorList.map(s => <SelectItem key={s.id} value={s.name}>{s.name} ({s.designation})</SelectItem>)}</Select><FormMessage /></FormItem>} />
                                            </div>
                                            <FormField name="geophysicalRemarks" control={control} render={({ field }) => <FormItem><FormLabel>Geophysical Remarks</FormLabel><FormControl><Textarea {...field} value={field.value || ''} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
                                        <FormField name="feasibility" control={control} render={({ field }) => <FormItem><FormLabel>Feasibility</FormLabel><Select onValueChange={field.onChange} value={field.value || ''} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Select Yes/No" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem></Select><FormMessage /></FormItem>} />
                                    </div>
                                </CardContent>
                            </Card>

                            {watchedFeasibility === 'Yes' && !!watchedTypeOfWell && (
                                <Card className="border-green-200 bg-green-50/10">
                                    <CardHeader><CardTitle className="text-lg text-primary">Recommended Measurements</CardTitle></CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {watchedTypeOfWell === 'Open Well' && (
                                                <FormField name="surveyRecommendedDiameter" control={control} render={({ field }) => <FormItem><FormLabel>Diameter (mm)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isReadOnly} placeholder="Enter diameter" /></FormControl><FormMessage /></FormItem>} />
                                            )}

                                            {watchedTypeOfWell === 'Pond' && (
                                                <FormField name="pondDimensions" control={control} render={({ field }) => <FormItem><FormLabel>Length × Breadth (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isReadOnly} placeholder="e.g. 10x15" /></FormControl><FormMessage /></FormItem>} />
                                            )}

                                            {(watchedTypeOfWell === 'Bore Well' || watchedTypeOfWell === 'Tube Well' || watchedTypeOfWell === 'Filter Point Well') && (
                                                <FormField name="surveyRecommendedDiameter" control={control} render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Diameter (mm)</FormLabel>
                                                        <Select onValueChange={(val) => field.onChange(val === '_clear_' ? undefined : val)} value={field.value || ""} disabled={isReadOnly}>
                                                            <FormControl><SelectTrigger><SelectValue placeholder="Select Diameter" /></SelectTrigger></FormControl>
                                                            <SelectContent>{siteDiameterOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}/>
                                            )}

                                            <FormField name="surveyRecommendedTD" control={control} render={({ field }) => <FormItem><FormLabel>TD (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                                            
                                            {watchedTypeOfWell === 'Bore Well' && (
                                                <>
                                                    <FormField name="surveyRecommendedOB" control={control} render={({ field }) => <FormItem><FormLabel>OB (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                                                    <FormField name="surveyRecommendedCasingPipe" control={control} render={({ field }) => <FormItem><FormLabel>Casing Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                                                </>
                                            )}

                                            {watchedTypeOfWell === 'Tube Well' && (
                                                <>
                                                    <FormField name="surveyRecommendedPlainPipe" control={control} render={({ field }) => <FormItem><FormLabel>Plain Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                                                    <FormField name="surveyRecommendedSlottedPipe" control={control} render={({ field }) => <FormItem><FormLabel>Slotted Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                                                    <FormField name="surveyRecommendedMsCasingPipe" control={control} render={({ field }) => <FormItem><FormLabel>MS Casing Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                                                </>
                                            )}

                                            {(watchedTypeOfWell === 'Bore Well' || watchedTypeOfWell === 'Filter Point Well') && (
                                                <FormField name="surveyRecommendedCasingPipe" control={control} render={({ field }) => <FormItem><FormLabel>Casing Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField name="surveyLocation" control={control} render={({ field }) => <FormItem><FormLabel>Well Location</FormLabel><FormControl><Textarea {...field} value={field.value || ''} readOnly={isReadOnly} className="min-h-[40px]" /></FormControl><FormMessage /></FormItem>} />
                                            <FormField name="surveyRemarks" control={control} render={({ field }) => <FormItem><FormLabel>Remarks</FormLabel><FormControl><Textarea {...field} value={field.value || ''} readOnly={isReadOnly} className="min-h-[40px]" /></FormControl><FormMessage /></FormItem>} />
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            <Card>
                                <CardHeader><CardTitle className="text-lg text-primary">Work Status</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField name="workStatus" control={control} render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Status <span className="text-destructive">*</span></FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value || ""} disabled={isReadOnly}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger></FormControl>
                                                    <SelectContent className="max-h-80">
                                                        {INVESTIGATION_WORK_STATUS_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField name="dateOfCompletion" control={control} render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Completion Date {isCompletionDateRequired && <span className="text-destructive">*</span>}</FormLabel>
                                                <FormControl><Input type="date" {...field} value={field.value || ''} readOnly={isReadOnly} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </div>
                                    <FormField name="workRemarks" control={control} render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Status Remarks</FormLabel>
                                            <FormControl><Textarea {...field} value={field.value || ''} readOnly={isReadOnly} placeholder="Remarks regarding completion or pending status..." /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader><CardTitle className="text-lg text-primary">Media Gallery</CardTitle></CardHeader>
                                <CardContent className="space-y-6">
                                    <MediaManager title="Work Images" type="image" fields={imageFields} append={appendImage} remove={removeImage} update={updateImage} isReadOnly={isReadOnly} />
                                    <Separator />
                                    <MediaManager title="Work Videos" type="video" fields={videoFields} append={appendVideo} remove={removeVideo} update={updateVideo} isReadOnly={isReadOnly} />
                                </CardContent>
                            </Card>
                        </div>
                    </ScrollArea>
                </div>
                <div className="flex justify-end p-6 pt-4 shrink-0 border-t gap-2">
                    <Button variant="outline" type="button" onClick={onCancel}>{isReadOnly ? 'Close' : 'Cancel'}</Button>
                    {!isReadOnly && <Button type="submit" form="investigation-site-dialog-form">Save Changes</Button>}
                </div>
            </form>
        </FormProvider>
    );
}
