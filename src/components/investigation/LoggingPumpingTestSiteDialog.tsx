// src/components/investigation/LoggingPumpingTestSiteDialog.tsx
"use client";
import React, { useEffect, useMemo, useCallback } from 'react';
import { useForm, FormProvider, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Save, X } from "lucide-react";
import {
  SiteDetailSchema,
  type SiteDetailFormData,
  type SitePurpose,
  type StaffMember,
  LOGGING_PUMPING_TEST_PURPOSE_OPTIONS,
  LOGGING_PUMPING_TEST_WORK_STATUS_OPTIONS
} from '@/lib/schemas';
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { ScrollArea } from "../ui/scroll-area";
import MediaManager from '@/components/shared/MediaManager';
import { Separator } from '@/components/ui/separator';

const formatDateForInput = (date: any): string => {
    if (!date) return '';
    try { return new Date(date).toISOString().split('T')[0]; } catch { return ''; }
};

interface LoggingPumpingTestSiteDialogProps {
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

export default function LoggingPumpingTestSiteDialog({ initialData, onConfirm, onCancel, isReadOnly, isInvestigator, allLsgConstituencyMaps, allStaffMembers }: LoggingPumpingTestSiteDialogProps) {
    const form = useForm<SiteDetailFormData>({
        resolver: zodResolver(SiteDetailSchema),
        defaultValues: {
            ...initialData,
            dateOfInvestigation: formatDateForInput(initialData?.dateOfInvestigation),
            workImages: initialData?.workImages || [],
            workVideos: initialData?.workVideos || [],
        },
    });

    const { control, handleSubmit, watch } = form;
    const { fields: imageFields, append: appendImage, remove: removeImage, update: updateImage } = useFieldArray({ control, name: "workImages" });
    const { fields: videoFields, append: appendVideo, remove: removeVideo, update: updateVideo } = useFieldArray({ control, name: "workVideos" });
    const watchedPurpose = watch('purpose');

    const investigatorList = useMemo(() => allStaffMembers.filter(s => s.designation === 'Investigator' || s.designation === 'Geological Assistant' || s.designation === 'Geophysical Assistant'), [allStaffMembers]);

    return (
        <FormProvider {...form}>
            <form id="logging-pumping-site-dialog-form" onSubmit={handleSubmit(onConfirm)} className="flex flex-col h-full overflow-hidden">
                <DialogHeader className="p-6 pb-4 shrink-0 border-b">
                    <DialogTitle>{initialData?.nameOfSite ? `Edit Site: ${initialData.nameOfSite}` : 'Add New Site'}</DialogTitle>
                </DialogHeader>
                <div className="flex-1 min-h-0">
                    <ScrollArea className="h-full px-6 py-4">
                        <div className="space-y-6">
                            <Card>
                                <CardHeader><CardTitle className="text-lg text-primary">Main Details</CardTitle></CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <FormField name="nameOfSite" control={control} render={({ field }) => <FormItem><FormLabel>Name of Site <span className="text-destructive">*</span></FormLabel><FormControl><Input {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                                    <FormField name="purpose" control={control} render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Purpose <span className="text-destructive">*</span></FormLabel>
                                            <Select onValueChange={(val) => field.onChange(val === '_clear_' ? undefined : val)} value={field.value || ""} disabled={isReadOnly}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select Purpose" /></SelectTrigger></FormControl>
                                                <SelectContent>{LOGGING_PUMPING_TEST_PURPOSE_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader><CardTitle className="text-lg text-primary">Investigation Details</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField name="nameOfInvestigator" control={control} render={({ field }) => <FormItem><FormLabel>Investigator</FormLabel><Select onValueChange={field.onChange} value={field.value || ''} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Select Investigator"/></SelectTrigger></FormControl><SelectContent>{investigatorList.map(s => <SelectItem key={s.id} value={s.name}>{s.name} ({s.designation})</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>} />
                                        <FormField name="dateOfInvestigation" control={control} render={({ field }) => <FormItem><FormLabel>Date of Investigation</FormLabel><FormControl><Input type="date" {...field} value={field.value || ''} readOnly={isReadOnly}/></FormControl><FormMessage/></FormItem>} />
                                    </div>
                                    <FormField name="hydrogeologicalRemarks" control={control} render={({ field }) => <FormItem><FormLabel>Hydrogeological Remarks</FormLabel><FormControl><Textarea {...field} value={field.value || ''} readOnly={isReadOnly}/></FormControl><FormMessage/></FormItem>} />
                                    <FormField name="geophysicalRemarks" control={control} render={({ field }) => <FormItem><FormLabel>Geophysical Remarks</FormLabel><FormControl><Textarea {...field} value={field.value || ''} readOnly={isReadOnly}/></FormControl><FormMessage/></FormItem>} />
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader><CardTitle className="text-lg text-primary">Work Status</CardTitle></CardHeader>
                                <CardContent>
                                    <FormField name="workStatus" control={control} render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Work Status <span className="text-destructive">*</span></FormLabel>
                                            <Select onValueChange={(val) => field.onChange(val === '_clear_' ? undefined : val)} value={field.value || ""} disabled={isReadOnly}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger></FormControl>
                                                <SelectContent className="max-h-80">
                                                    <SelectItem value="_clear_">-- Clear Selection --</SelectItem>
                                                    {LOGGING_PUMPING_TEST_WORK_STATUS_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
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
                    <Button variant="outline" type="button" onClick={onCancel}>Cancel</Button>
                    {!isReadOnly && <Button type="submit">Save Changes</Button>}
                </div>
            </form>
        </FormProvider>
    );
}
