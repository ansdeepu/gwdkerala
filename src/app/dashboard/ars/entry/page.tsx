// src/app/dashboard/ars/entry/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePageHeader } from '@/hooks/usePageHeader';
import { useAuth, type UserProfile } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useArsEntries, type ArsEntry } from '@/hooks/useArsEntries';
import { usePendingUpdates } from '@/hooks/usePendingUpdates';
import { useDataStore } from '@/hooks/use-data-store';
import { 
    ArsEntrySchema, 
    type ArsEntryFormData, 
    arsTypeOfSchemeOptions, 
    arsStatusOptions, 
    constituencyOptions,
    type Constituency,
    type StaffMember,
    type Designation,
} from '@/lib/schemas';

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, X, Eye, Info, PlusCircle } from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import MediaManager from '@/components/shared/MediaManager';
import { useFieldArray } from 'react-hook-form';
import { Separator } from '@/components/ui/separator';


export const dynamic = 'force-dynamic';

// Helper function to format date for input fields
const formatDateForInput = (date: any): string => {
    if (!date) return '';
    try {
        const d = new Date(date);
        if (isValid(d)) {
            return format(d, 'yyyy-MM-dd');
        }
    } catch (e) {
        // ignore invalid dates
    }
    return '';
};

// Main Component
export default function ArsEntryPage() {
    const { setHeader } = usePageHeader();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, isLoading: authLoading } = useAuth();
    const { toast } = useToast();
    const { getArsEntryById, addArsEntry, updateArsEntry } = useArsEntries();
    const { createArsPendingUpdate } = usePendingUpdates();
    const { allStaffMembers, allUsers, allLsgConstituencyMaps } = useDataStore();
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [arsEntry, setArsEntry] = useState<ArsEntry | null>(null);

    const id = searchParams.get('id');
    const readOnlyParam = searchParams.get('readOnly');
    const approveUpdateId = searchParams.get('approveUpdateId');

    const isReadOnly = readOnlyParam === 'true' || user?.role === 'viewer' || (user?.role === 'supervisor' && user.uid !== arsEntry?.supervisorUid);
    const canEdit = user?.role === 'admin' || user?.role === 'engineer';
    
    useEffect(() => {
        if (!id || id === 'new') {
            setHeader('New ARS Entry', 'Create a new Artificial Recharge Scheme entry.');
            setIsLoading(false);
            return;
        }

        const fetchEntry = async () => {
            setIsLoading(true);
            const entry = await getArsEntryById(id);
            if (entry) {
                setArsEntry(entry);
                setHeader(`Edit ARS: ${entry.fileNo}`, `Viewing details for ${entry.nameOfSite}`);
            } else {
                toast({ title: 'Error', description: 'ARS entry not found.', variant: 'destructive' });
                router.replace('/dashboard/ars');
            }
            setIsLoading(false);
        };
        fetchEntry();
    }, [id, getArsEntryById, setHeader, toast, router]);

    const form = useForm<ArsEntryFormData>({
        resolver: zodResolver(ArsEntrySchema),
        defaultValues: {},
    });

    const { control, handleSubmit, setValue, getValues, watch, reset } = form;
    const { fields: imageFields, append: appendImage, remove: removeImage, update: updateImage } = useFieldArray({ control, name: "workImages" });
    const { fields: videoFields, append: appendVideo, remove: removeVideo, update: updateVideo } = useFieldArray({ control, name: "workVideos" });
    const watchedLsg = watch("localSelfGovt");

    useEffect(() => {
        const initialFormValues: Partial<ArsEntryFormData> = id === null || id === 'new' ? {} : {
            ...arsEntry,
            arsSanctionedDate: formatDateForInput(arsEntry?.arsSanctionedDate),
            dateOfCompletion: formatDateForInput(arsEntry?.dateOfCompletion),
        };
        reset(initialFormValues);
    }, [arsEntry, id, reset]);

    // Supervisor selection logic
    const supervisorList = useMemo(() => {
        const supervisorRoles: Designation[] = ["Assistant Engineer", "Senior Driller", "Master Driller"];
        return allStaffMembers
            .filter(s => s.status === 'Active' && supervisorRoles.includes(s.designation as Designation))
            .sort((a,b) => a.name.localeCompare(b.name));
    }, [allStaffMembers]);

    const handleSupervisorChange = (staffId: string) => {
        const staff = supervisorList.find(s => s.id === staffId);
        if (staff) {
            const userForStaff = allUsers.find(u => u.staffId === staff.id);
            setValue('supervisorName', staff.name);
            setValue('supervisorUid', userForStaff?.uid || null);
        } else {
            setValue('supervisorName', null);
            setValue('supervisorUid', null);
        }
    };
    
    // Auto-populate constituency
    const constituencyOptionsForLsg = useMemo(() => {
        if (!watchedLsg || !allLsgConstituencyMaps) return [];
        const map = allLsgConstituencyMaps.find(m => m.name === watchedLsg);
        return map?.constituencies?.sort((a: string, b: string) => a.localeCompare(b)) || [];
    }, [watchedLsg, allLsgConstituencyMaps]);

    useEffect(() => {
        if (constituencyOptionsForLsg.length === 1 && getValues('constituency') !== constituencyOptionsForLsg[0]) {
            setValue('constituency', constituencyOptionsForLsg[0] as Constituency);
        }
    }, [constituencyOptionsForLsg, getValues, setValue]);

    const isConstituencyDisabled = isReadOnly || !watchedLsg || constituencyOptionsForLsg.length <= 1;

    const onSubmit = async (data: ArsEntryFormData) => {
        setIsSubmitting(true);
        try {
            if (id && id !== 'new') {
                if (user?.role === 'supervisor') {
                    await createArsPendingUpdate(id, data, user);
                    toast({ title: "Update Submitted", description: "Your changes have been submitted for approval." });
                } else {
                    await updateArsEntry(id, data, approveUpdateId || undefined, user || undefined);
                    toast({ title: "ARS Entry Updated", description: "The ARS details have been saved." });
                }
            } else {
                await addArsEntry(data);
                toast({ title: "ARS Entry Created", description: "The new ARS entry has been saved." });
            }
            router.push('/dashboard/ars');
        } catch (error: any) {
            toast({ title: 'Submission Failed', description: error.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (isLoading || authLoading) {
        return <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }

    return (
        <FormProvider {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <Card>
                    <CardHeader><CardTitle>1. Site Identification</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <FormField name="fileNo" control={control} render={({ field }) => ( <FormItem><FormLabel>File No *</FormLabel><FormControl><Input {...field} value={field.value ?? ''} readOnly={isReadOnly} /></FormControl><FormMessage/></FormItem> )}/>
                        <FormField name="nameOfSite" control={control} render={({ field }) => ( <FormItem><FormLabel>Name of Site *</FormLabel><FormControl><Input {...field} value={field.value ?? ''} readOnly={isReadOnly} /></FormControl><FormMessage/></FormItem> )}/>
                        <FormField name="localSelfGovt" control={control} render={({ field }) => ( <FormItem><FormLabel>Local Self Govt.</FormLabel><Select onValueChange={field.onChange} value={field.value || ""} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Select LSG"/></SelectTrigger></FormControl><SelectContent className="max-h-80">{allLsgConstituencyMaps.map(m => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem> )}/>
                        <FormField name="constituency" control={control} render={({ field }) => ( <FormItem><FormLabel>Constituency (LAC)</FormLabel><Select onValueChange={field.onChange} value={field.value || ""} disabled={isConstituencyDisabled}><FormControl><SelectTrigger><SelectValue placeholder={!watchedLsg ? "Select LSG first" : "Select Constituency"}/></SelectTrigger></FormControl><SelectContent className="max-h-80">{constituencyOptionsForLsg.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem> )}/>
                        <FormField name="arsBlock" control={control} render={({ field }) => ( <FormItem><FormLabel>Block</FormLabel><FormControl><Input {...field} value={field.value ?? ''} readOnly={isReadOnly} /></FormControl><FormMessage/></FormItem> )}/>
                        <FormField name="latitude" control={control} render={({ field }) => ( <FormItem><FormLabel>Latitude</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isReadOnly} /></FormControl><FormMessage/></FormItem> )}/>
                        <FormField name="longitude" control={control} render={({ field }) => ( <FormItem><FormLabel>Longitude</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isReadOnly} /></FormControl><FormMessage/></FormItem> )}/>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>2. Scheme Details</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <FormField name="arsTypeOfScheme" control={control} render={({ field }) => ( <FormItem><FormLabel>Type of Scheme</FormLabel><Select onValueChange={field.onChange} value={field.value || ""} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Select Scheme"/></SelectTrigger></FormControl><SelectContent>{arsTypeOfSchemeOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem> )}/>
                        <FormField name="arsNumberOfStructures" control={control} render={({ field }) => ( <FormItem><FormLabel>No. of Structures</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isReadOnly} /></FormControl><FormMessage/></FormItem> )}/>
                        <FormField name="arsStorageCapacity" control={control} render={({ field }) => ( <FormItem><FormLabel>Storage Capacity (m³)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isReadOnly} /></FormControl><FormMessage/></FormItem> )}/>
                        <FormField name="arsNumberOfFillings" control={control} render={({ field }) => ( <FormItem><FormLabel>No. of Fillings</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isReadOnly} /></FormControl><FormMessage/></FormItem> )}/>
                        <FormField name="noOfBeneficiary" control={control} render={({ field }) => ( <FormItem><FormLabel>No. of Beneficiaries</FormLabel><FormControl><Input {...field} value={field.value ?? ''} readOnly={isReadOnly} /></FormControl><FormMessage/></FormItem> )}/>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>3. Financial & Tender Details</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
                         <FormField name="arsAsTsDetails" control={control} render={({ field }) => ( <FormItem><FormLabel>AS/TS Details</FormLabel><FormControl><Input {...field} value={field.value ?? ''} readOnly={isReadOnly} /></FormControl><FormMessage/></FormItem> )}/>
                         <FormField name="arsSanctionedDate" control={control} render={({ field }) => ( <FormItem><FormLabel>Sanctioned Date</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ''} readOnly={isReadOnly}/></FormControl><FormMessage/></FormItem> )}/>
                         <FormField name="tsAmount" control={control} render={({ field }) => ( <FormItem><FormLabel>TS Amount (₹)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isReadOnly} /></FormControl><FormMessage/></FormItem> )}/>
                         <FormField name="arsTenderNo" control={control} render={({ field }) => ( <FormItem><FormLabel>Tender No.</FormLabel><FormControl><Input {...field} value={field.value ?? ''} readOnly={isReadOnly} /></FormControl><FormMessage/></FormItem> )}/>
                         <FormField name="arsContractorName" control={control} render={({ field }) => ( <FormItem><FormLabel>Contractor</FormLabel><FormControl><Input {...field} value={field.value ?? ''} readOnly={isReadOnly} /></FormControl><FormMessage/></FormItem> )}/>
                         <FormField name="arsTenderedAmount" control={control} render={({ field }) => ( <FormItem><FormLabel>Tendered Amount (₹)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isReadOnly} /></FormControl><FormMessage/></FormItem> )}/>
                         <FormField name="arsAwardedAmount" control={control} render={({ field }) => ( <FormItem><FormLabel>Awarded Amount (₹)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isReadOnly} /></FormControl><FormMessage/></FormItem> )}/>
                    </CardContent>
                </Card>
                
                 <Card>
                    <CardHeader><CardTitle>4. Work Status & Completion</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <FormField name="arsStatus" control={control} render={({ field }) => ( <FormItem><FormLabel>Work Status *</FormLabel><Select onValueChange={field.onChange} value={field.value || ""} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Select status"/></SelectTrigger></FormControl><SelectContent>{arsStatusOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem> )}/>
                            <FormField name="dateOfCompletion" control={control} render={({ field }) => ( <FormItem><FormLabel>Date of Completion</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ''} readOnly={isReadOnly}/></FormControl><FormMessage/></FormItem> )}/>
                            <FormField name="totalExpenditure" control={control} render={({ field }) => ( <FormItem><FormLabel>Total Expenditure (₹)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isReadOnly} /></FormControl><FormMessage/></FormItem> )}/>
                            <FormField name="supervisorUid" control={control} render={({ field }) => ( <FormItem><FormLabel>Supervisor</FormLabel><Select onValueChange={(staffId) => handleSupervisorChange(staffId)} value={field.value || ""} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Assign a supervisor" /></SelectTrigger></FormControl><SelectContent>{supervisorList.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.designation})</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem> )}/>
                        </div>
                        <FormField name="workRemarks" control={control} render={({ field }) => ( <FormItem><FormLabel>Work Remarks</FormLabel><FormControl><Textarea {...field} value={field.value ?? ''} readOnly={isReadOnly} /></FormControl><FormMessage/></FormItem> )}/>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader><CardTitle>5. Media Gallery</CardTitle></CardHeader>
                    <CardContent className="space-y-6">
                        <MediaManager title="Work Images" type="image" fields={imageFields} append={appendImage} remove={removeImage} update={updateImage} isReadOnly={isReadOnly} />
                        <Separator />
                        <MediaManager title="Work Videos" type="video" fields={videoFields} append={appendVideo} remove={removeVideo} update={updateVideo} isReadOnly={isReadOnly} />
                    </CardContent>
                </Card>

                <CardFooter className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
                        <X className="mr-2 h-4 w-4" /> Close
                    </Button>
                    {!isReadOnly && (
                        <Button type="submit" disabled={isSubmitting}>
                            <Save className="mr-2 h-4 w-4"/> {isSubmitting ? "Saving..." : 'Save'}
                        </Button>
                    )}
                </CardFooter>
            </form>
        </FormProvider>
    );
}
