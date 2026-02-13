// src/components/investigation/InvestigationDataEntryForm.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, type FieldErrors, FormProvider, useWatch } from "react-hook-form";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Form,
} from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Loader2, Trash2, PlusCircle, X, Save, Clock, Edit, Eye, ArrowUpDown, Copy, Info } from "lucide-react";
import {
  DataEntrySchema,
  type DataEntryFormData,
  siteWorkStatusOptions,
  sitePurposeOptions,
  type SitePurpose,
  siteDiameterOptions,
  siteTypeOfRigOptions,
  fileStatusOptions,
  remittedAccountOptions,
  paymentAccountOptions,
  type RemittanceDetailFormData,
  RemittanceDetailSchema,
  type PaymentDetailFormData,
  PaymentDetailSchema,
  SiteDetailSchema,
  type SiteDetailFormData,
  applicationTypeOptions,
  applicationTypeDisplayMap,
  type ApplicationType,
  siteConditionsOptions,
  type UserRole,
  type SiteWorkStatus,
  constituencyOptions,
  type Constituency,
  INVESTIGATION_GOVT_TYPES,
  INVESTIGATION_PRIVATE_TYPES,
  INVESTIGATION_COMPLAINT_TYPES,
  LOGGING_PUMPING_TEST_TYPES,
  GW_INVESTIGATION_TYPES,
  LOGGING_PUMPING_TEST_PURPOSE_OPTIONS,
  type Bidder,
  typeOfWellOptions,
  type Designation,
} from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useFileEntries } from "@/hooks/useFileEntries";
import { usePendingUpdates } from "@/hooks/usePendingUpdates";
import type { StaffMember } from "@/lib/schemas";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { getFirestore, doc, updateDoc, serverTimestamp, query, collection, where, getDocs } from "firebase/firestore";
import { app } from "@/lib/firebase";
import { useDataStore } from "@/hooks/use-data-store";
import { ScrollArea } from "../ui/scroll-area";
import { format, isValid, parseISO } from "date-fns";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter as TableFooterComponent } from "@/components/ui/table";
import { v4 as uuidv4 } from 'uuid';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';


const db = getFirestore(app);

const createDefaultRemittanceDetail = (): RemittanceDetailFormData => ({ amountRemitted: undefined, dateOfRemittance: "", remittedAccount: "SBI", remittanceRemarks: "" });
const createDefaultPaymentDetail = (): PaymentDetailFormData => ({ dateOfPayment: "", paymentAccount: "SBI", revenueHead: undefined, contractorsPayment: undefined, gst: undefined, incomeTax: undefined, kbcwb: undefined, refundToParty: undefined, totalPaymentPerEntry: 0, paymentRemarks: "" });
const createDefaultSiteDetail = (): z.infer<typeof SiteDetailSchema> => ({ nameOfSite: "", localSelfGovt: "", constituency: undefined, latitude: undefined, longitude: undefined, purpose: "GW Investigation", estimateAmount: undefined, remittedAmount: undefined, siteConditions: undefined, tsAmount: undefined, tenderNo: "", diameter: undefined, totalDepth: undefined, casingPipeUsed: "", outerCasingPipe: "", innerCasingPipe: "", yieldDischarge: "", zoneDetails: "", waterLevel: "", drillingRemarks: "", developingRemarks: "", schemeRemarks: "", pumpDetails: "", waterTankCapacity: "", noOfTapConnections: undefined, noOfBeneficiary: "", dateOfCompletion: "", typeOfRig: undefined, contractorName: "", supervisorUid: undefined, supervisorName: undefined, supervisorDesignation: undefined, totalExpenditure: undefined, workStatus: undefined, workRemarks: "", surveyOB: "", surveyLocation: "", surveyPlainPipe: "", surveySlottedPipe: "", surveyRemarks: "", surveyRecommendedDiameter: "", surveyRecommendedTD: "", surveyRecommendedOB: "", surveyRecommendedCasingPipe: "", surveyRecommendedPlainPipe: "", surveyRecommendedSlottedPipe: "", surveyRecommendedMsCasingPipe: "", arsTypeOfScheme: undefined, arsPanchayath: undefined, arsBlock: undefined, arsAsTsDetails: undefined, arsSanctionedDate: "", arsTenderedAmount: undefined, arsAwardedAmount: undefined, arsNumberOfStructures: undefined, arsStorageCapacity: undefined, arsNumberOfFillings: undefined, isArsImport: false, pilotDrillingDepth: "", pumpingLineLength: "", deliveryLineLength: "", implementationRemarks: "", vesRequired: "No", feasibility: "No", nameOfInvestigator: undefined, vesInvestigator: undefined, hydrogeologicalRemarks: "", geophysicalRemarks: "" });


const calculatePaymentEntryTotalGlobal = (payment: PaymentDetailFormData | undefined): number => {
    if (!payment) return 0;
    return (Number(payment.revenueHead) || 0);
};

const FINAL_WORK_STATUSES: SiteWorkStatus[] = ['Work Failed', 'Work Completed'];
const INVESTIGATION_WORK_STATUS_OPTIONS = ["Pending", "VES Pending", "Completed"] as const;
const LOGGING_PUMPING_TEST_WORK_STATUS_OPTIONS = ["Pending", "Completed"] as const;

const investigationFileStatusOptions = [
    "File Under Process",
    "Completed Except Disputed",
    "Partially Completed Except Disputed",
    "Fully Disputed",
    "Fully Completed",
    "Partially Completed",
    "File Closed",
] as const;


const getFormattedErrorMessages = (errors: FieldErrors<DataEntryFormData>): string[] => {
  const messages = new Set<string>();

  const processPath = (path: string, index: number): string => {
    if (path === 'siteDetails') return `Site #${index + 1}`;
    if (path === 'remittanceDetails') return `Remittance #${index + 1}`;
    if (path === 'paymentDetails') return `Payment #${index + 1}`;
    return path;
  };

  const formattedFieldName = (fieldName: string) => {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
  };

  function findMessages(obj: any, parentPath: string = "") {
    if (!obj) return;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        const newPath = parentPath ? `${parentPath}.${key}` : key;
        
        if (value?.message && typeof value.message === 'string') {
          messages.add(`${formattedFieldName(key)}: ${value.message}`);
        } else if (Array.isArray(value)) {
          value.forEach((item, index) => {
            if (item && typeof item === 'object') {
              for (const itemKey in item) {
                if (item[itemKey]?.message) {
                  const pathPrefix = processPath(newPath, index);
                  messages.add(`${pathPrefix} - ${formattedFieldName(itemKey)}: ${item[itemKey].message}`);
                }
              }
            }
          });
        } else if (value && typeof value === 'object' && key !== 'root') {
          findMessages(value, newPath);
        }
      }
    }
  }

  findMessages(errors);
  return Array.from(messages);
};


const DetailRow = ({ label, value, className }: { label: string; value: any, className?: string }) => {
    if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
        return null;
    }

    let displayValue = String(value);
    
    if (label.toLowerCase().includes('date') && value) {
        try {
            displayValue = format(new Date(value), "dd/MM/yyyy");
        } catch (e) { /* Keep original string if formatting fails */ }
    } else if (typeof value === 'number') {
        displayValue = value.toLocaleString('en-IN');
    }

    return (
        <div className={className}>
            <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
            <dd className="text-sm font-semibold">{displayValue}</dd>
        </div>
    );
};


interface DataEntryFormProps {
    fileNoToEdit?: string;
    initialData: DataEntryFormData;
    userRole?: UserRole;
    workTypeContext: 'public' | 'private' | 'collector' | 'planFund' | 'gwInvestigation' | 'loggingPumpingTest' | null;
    returnPath: string; 
    pageToReturnTo: string | null;
    isFormDisabled?: boolean;
    allLsgConstituencyMaps: any[];
    allStaffMembers: StaffMember[];
}

const formatDateForInput = (date: Date | string | null | undefined): string => {
    if (!date) return "";
    try { return format(new Date(date), 'yyyy-MM-dd'); } catch { return ""; }
};

// Dialog Content Components
const ApplicationDialogContent = ({ initialData, onConfirm, onCancel, formOptions, workTypeContext }: { initialData: any, onConfirm: (data: any) => void, onCancel: () => void, formOptions: readonly ApplicationType[] | ApplicationType[], workTypeContext: string | null }) => {
    const [data, setData] = useState({
        ...initialData,
        category: initialData?.category || undefined
    });
    const [errors, setErrors] = useState<{ fileNo?: string; applicantName?: string; applicationType?: string; category?: string; }>({});

    const isInvestigationContext = workTypeContext === 'gwInvestigation' || workTypeContext === 'loggingPumpingTest';
    const pageTitle = workTypeContext === 'loggingPumpingTest' ? 'Logging & Pumping Test' : 'GW Investigation';

    const filteredAppTypeOptions = useMemo(() => {
        if (!isInvestigationContext) return formOptions;
        if (data.category === 'Govt') return INVESTIGATION_GOVT_TYPES;
        if (data.category === 'Private') return INVESTIGATION_PRIVATE_TYPES;
        if (data.category === 'Complaints') return INVESTIGATION_COMPLAINT_TYPES;
        if (workTypeContext === 'loggingPumpingTest') return LOGGING_PUMPING_TEST_TYPES;
        return [];
    }, [isInvestigationContext, data.category, formOptions, workTypeContext]);

    const handleChange = (key: string, value: any) => {
        setData((prev: any) => ({ ...prev, [key]: value }));
        if (value && String(value).trim()) {
            setErrors(prev => ({...prev, [key]: undefined}));
        }
         if (key === 'category') {
            setData((prev: any) => ({ ...prev, applicationType: undefined }));
        }
    };
    
    const handleSave = () => {
        const newErrors: { fileNo?: string; applicantName?: string; applicationType?: string; category?: string; } = {};
        if (!data.fileNo?.trim()) {
            newErrors.fileNo = "File No is required.";
        }
        if (!data.applicantName?.trim()) {
            newErrors.applicantName = "Applicant Name is required.";
        }
        if (!data.applicationType) {
            newErrors.applicationType = "Type of Application is required.";
        }
        if (isInvestigationContext && !data.category) {
            newErrors.category = "Category is required.";
        }
        
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        onConfirm(data);
    };

    return (
      <div className="flex flex-col h-auto">
        <DialogHeader>
          <DialogTitle>{pageTitle} Application Details</DialogTitle>
        </DialogHeader>
        <div className="p-6 pt-0 space-y-4 flex-1">
             <div className="grid grid-cols-3 gap-4 items-start">
                <div className="space-y-2 col-span-1">
                    <Label htmlFor="fileNo">File No *</Label>
                    <Input id="fileNo" value={data.fileNo || ''} onChange={(e) => handleChange('fileNo', e.target.value)} />
                    {errors.fileNo && <p className="text-xs text-destructive mt-1">{errors.fileNo}</p>}
                </div>
                <div className="space-y-2 col-span-2">
                    <Label htmlFor="applicantName">Name & Address of Institution/Applicant *</Label>
                    <Textarea id="applicantName" value={data.applicantName || ''} onChange={(e) => handleChange('applicantName', e.target.value)} className="min-h-[40px]"/>
                    {errors.applicantName && <p className="text-xs text-destructive mt-1">{errors.applicantName}</p>}
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2"><Label>Phone No.</Label><Input value={data.phoneNo || ''} onChange={(e) => handleChange('phoneNo', e.target.value)} /></div>
                <div className="space-y-2"><Label>Secondary Mobile No.</Label><Input value={data.secondaryMobileNo || ''} onChange={(e) => handleChange('secondaryMobileNo', e.target.value)} /></div>
                
                {isInvestigationContext && (
                    <div className="space-y-2">
                        <Label>Category *</Label>
                        <Select onValueChange={(value) => handleChange('category', value)} value={data.category}>
                            <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Govt">Govt</SelectItem>
                                <SelectItem value="Private">Private</SelectItem>
                                <SelectItem value="Complaints">Complaints</SelectItem>
                            </SelectContent>
                        </Select>
                        {errors.category && <p className="text-xs text-destructive mt-1">{errors.category}</p>}
                    </div>
                )}

                 <div className="space-y-2">
                    <Label>Type of Application *</Label>
                    <Select onValueChange={(value) => handleChange('applicationType', value)} value={data.applicationType || ''} disabled={isInvestigationContext && !data.category && workTypeContext !== 'loggingPumpingTest'}>
                        <SelectTrigger><SelectValue placeholder={isInvestigationContext && !data.category ? "Select Category First" : "Select Type"} /></SelectTrigger>
                        <SelectContent className="max-h-80">
                            {filteredAppTypeOptions.map(o => <SelectItem key={o} value={o}>{applicationTypeDisplayMap[o as any] || o}</SelectItem>)}
                        </SelectContent>
                    </Select>
                     {errors.applicationType && <p className="text-xs text-destructive mt-1">{errors.applicationType}</p>}
                </div>
            </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onCancel}>Cancel</Button><Button onClick={handleSave}>Save</Button></DialogFooter>
      </div>
    );
};

const RemittanceDialogContent = ({ initialData, onConfirm, onCancel, isDeferredFunding }: { initialData?: any, onConfirm: (data: any) => void, onCancel: () => void, isDeferredFunding: boolean; }) => {
    const { toast } = useToast();
    const form = useForm<RemittanceDetailFormData>({
      resolver: zodResolver(RemittanceDetailSchema),
      defaultValues: {
          ...createDefaultRemittanceDetail(),
          ...initialData,
          dateOfRemittance: formatDateForInput(initialData?.dateOfRemittance),
      },
    });

    const handleConfirmSubmit = (data: RemittanceDetailFormData) => {
        onConfirm(data);
    };
    
    const availableRemittanceAccounts = useMemo(() => {
        // For GW investigation, only SBI and STSB should be available
        return ["SBI", "STSB", "Revenue Head"];
    }, []);

    return (
      <Form {...form}>
        <form
          onSubmit={(e) => {
            e.stopPropagation();
            e.preventDefault();
            form.handleSubmit(handleConfirmSubmit)(e);
          }}
        >
            <DialogHeader>
                <DialogTitle>Remittance Details</DialogTitle>
            </DialogHeader>
            <div className="p-6 pt-0 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField name="dateOfRemittance" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Date <span className="text-destructive">*</span></FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField name="amountRemitted" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Amount (₹)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField name="remittedAccount" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Account <span className="text-destructive">*</span></FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select Account" /></SelectTrigger></FormControl><SelectContent>{availableRemittanceAccounts.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                </div>
                <FormField name="remittanceRemarks" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Remittance Remarks</FormLabel><FormControl><Textarea {...field} placeholder="Add any remarks for this entry..." /></FormControl><FormMessage /></FormItem> )}/>
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                <Button type="submit">Save</Button>
            </DialogFooter>
        </form>
    </Form>
    );
};

const PaymentDialogContent = ({ initialData, onConfirm, onCancel, isDeferredFunding, workTypeContext }: { initialData: any, onConfirm: (data: any) => void, onCancel: () => void, isDeferredFunding: boolean, workTypeContext: string | null }) => {
    const pageTitle = workTypeContext === 'loggingPumpingTest' ? 'Logging & Pumping Test' : 'GW Investigation';

    const form = useForm<PaymentDetailFormData>({
      resolver: zodResolver(PaymentDetailSchema),
      defaultValues: {
        ...createDefaultPaymentDetail(),
        ...initialData,
        dateOfPayment: formatDateForInput(initialData?.dateOfPayment),
      },
    });
    
    const handleConfirmSubmit = (data: PaymentDetailFormData) => {
        onConfirm(data);
    };

    const availablePaymentAccounts = ["SBI", "STSB"];

    return (
        <Form {...form}>
             <form onSubmit={form.handleSubmit(handleConfirmSubmit)} className="flex flex-col h-full">
                <DialogHeader className="p-6 pb-4 shrink-0">
                    <DialogTitle>{pageTitle} Payment Details</DialogTitle>
                </DialogHeader>
                <div className="flex-1 min-h-0">
                  <ScrollArea className="h-full px-6 py-4">
                      <div className="space-y-4">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField name="dateOfPayment" control={form.control} render={({ field }) => <FormItem><FormLabel>Date of Payment <span className="text-destructive">*</span></FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>} />
                              <FormField name="paymentAccount" control={form.control} render={({ field }) => <FormItem><FormLabel>Payment Account <span className="text-destructive">*</span></FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select Account"/></SelectTrigger></FormControl><SelectContent>{availablePaymentAccounts.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
                          </div>
                          <Separator/>
                          <FormField name="revenueHead" control={form.control} render={({ field }) => <FormItem><FormLabel>Revenue Head (₹)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} /></FormControl><FormMessage /></FormItem>} />
                          <Separator/>
                          <FormField name="paymentRemarks" control={form.control} render={({ field }) => <FormItem><FormLabel>Payment Remarks</FormLabel><FormControl><Textarea {...field} placeholder="Add any remarks for this payment entry..." /></FormControl><FormMessage /></FormItem>} />
                      </div>
                  </ScrollArea>
                </div>
                <DialogFooter className="p-6 pt-4 shrink-0">
                    <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                    <Button type="submit">Save</Button>
                </DialogFooter>
            </form>
        </Form>
    );
};

const SiteDialogContent = ({ initialData, onConfirm, onCancel, isReadOnly, allLsgConstituencyMaps, allStaffMembers, workTypeContext }: { initialData: any, onConfirm: (data: any) => void, onCancel: () => void, isReadOnly: boolean, allLsgConstituencyMaps: any[], allStaffMembers: StaffMember[], workTypeContext: string | null }) => {
    
    const defaults = {
        ...(initialData?.nameOfSite ? initialData : createDefaultSiteDetail()),
    };

    const form = useForm<SiteDetailFormData>({
      resolver: zodResolver(SiteDetailSchema),
      defaultValues: { 
        ...defaults, 
        dateOfCompletion: formatDateForInput(defaults.dateOfCompletion),
        dateOfInvestigation: formatDateForInput(defaults.dateOfInvestigation),
        vesDate: formatDateForInput(defaults.vesDate)
      },
    });
    
    const { control, setValue, trigger, handleSubmit, getValues } = form;

    const watchedLsg = useWatch({ control, name: "localSelfGovt" });
    const watchedTypeOfWell = useWatch({ control, name: 'typeOfWell' });
    const watchedVesRequired = useWatch({ control, name: 'vesRequired' });
    const watchedWorkStatus = useWatch({ control, name: 'workStatus' });
    const watchedFeasibility = useWatch({ control, name: 'feasibility' });
    const isCompletionDateRequired = watchedWorkStatus === 'Completed';

    const pageTitle = workTypeContext === 'loggingPumpingTest' ? 'Logging & Pumping Test' : 'GW Investigation';
    
    const workStatusOptions = workTypeContext === 'loggingPumpingTest' ? LOGGING_PUMPING_TEST_WORK_STATUS_OPTIONS : INVESTIGATION_WORK_STATUS_OPTIONS;
    const purposeOptions = workTypeContext === 'loggingPumpingTest' ? LOGGING_PUMPING_TEST_PURPOSE_OPTIONS : ['GW Investigation'];


    const handleDialogSubmit = (data: SiteDetailFormData) => {
        onConfirm(data);
    };
    
    const sortedLsgMaps = useMemo(() => {
        return [...allLsgConstituencyMaps].sort((a, b) => a.name.localeCompare(b.name));
    }, [allLsgConstituencyMaps]);

    const constituencyOptionsForLsg = useMemo(() => {
        if (!watchedLsg) return [];
        const map = allLsgConstituencyMaps.find(m => m.name === watchedLsg);
        if (!map || !map.constituencies) return [];
        return [...map.constituencies].sort((a,b) => a.localeCompare(b));
    }, [watchedLsg, allLsgConstituencyMaps]);

    const handleLsgChange = useCallback((lsgName: string) => {
        setValue('localSelfGovt', lsgName);
        const map = allLsgConstituencyMaps.find(m => m.name === lsgName);
        const constituencies = map?.constituencies || [];
        setValue('constituency', undefined, { shouldValidate: true });
        if (constituencies.length === 1) {
            setValue('constituency', constituencies[0] as Constituency, { shouldValidate: true });
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

    const hydroStaff = useMemo(() => {
        const hydroDesignations: Designation[] = ["Hydrogeologist", "Junior Hydrogeologist", "Geological Assistant"];
        return allStaffMembers.filter(s => s.designation && hydroDesignations.includes(s.designation) && s.status === 'Active');
    }, [allStaffMembers]);

    const geophysStaff = useMemo(() => {
        const geophysDesignations: Designation[] = ["Geophysicist", "Junior Geophysicist", "Geophysical Assistant"];
        return allStaffMembers.filter(s => s.designation && geophysDesignations.includes(s.designation) && s.status === 'Active');
    }, [allStaffMembers]);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <DialogHeader className="p-6 pb-4 shrink-0">
                <DialogTitle>{initialData?.nameOfSite ? `Edit ${pageTitle} Site` : `Add New ${pageTitle} Site`}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 min-h-0">
                <ScrollArea className="h-full px-6 py-4">
                    <Form {...form}>
                        <form id="investigation-site-dialog-form" onSubmit={(e) => { e.stopPropagation(); handleSubmit(handleDialogSubmit)(e); }} className="space-y-6">
                            <Card>
                                <CardHeader><CardTitle>Main Details</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <FormField name="nameOfSite" control={control} render={({ field }) => <FormItem><FormLabel>Name of Site <span className="text-destructive">*</span></FormLabel><FormControl><Input {...field} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                                        
                                        {workTypeContext === 'loggingPumpingTest' ? (
                                            <FormField name="purpose" control={control} render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Purpose <span className="text-destructive">*</span></FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}>
                                                        <FormControl><SelectTrigger><SelectValue placeholder="Select Purpose" /></SelectTrigger></FormControl>
                                                        <SelectContent>
                                                            {purposeOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                        ) : (
                                            <FormField name="purpose" control={control} render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Purpose</FormLabel>
                                                    <FormControl><Input value="GW Investigation" readOnly className="bg-muted" /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                        )}
                                        
                                        <FormField name="localSelfGovt" control={control} render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Local Self Govt.</FormLabel>
                                                <Select onValueChange={(value) => handleLsgChange(value)} value={field.value} disabled={isReadOnly}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select LSG"/></SelectTrigger></FormControl>
                                                    <SelectContent className="max-h-80">
                                                        <SelectItem value="_clear_" onSelect={(e) => { e.preventDefault(); field.onChange(undefined); }}>-- Clear Selection --</SelectItem>
                                                        {sortedLsgMaps.map(map => <SelectItem key={map.id} value={map.name}>{map.name}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage/>
                                            </FormItem>
                                        )} />
                                        <FormField name="constituency" control={control} render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Constituency (LAC)</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly || constituencyOptionsForLsg.length <= 1}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select Constituency"/></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="_clear_" onSelect={(e) => { e.preventDefault(); field.onChange(undefined); }}>-- Clear Selection --</SelectItem>
                                                        {constituencyOptionsForLsg.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage/>
                                            </FormItem>
                                        )} />
                                        <FormField name="latitude" control={control} render={({ field }) => <FormItem><FormLabel>Latitude</FormLabel><FormControl><Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                                        <FormField name="longitude" control={control} render={({ field }) => <FormItem><FormLabel>Longitude</FormLabel><FormControl><Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                                    </div>
                                </CardContent>
                            </Card>
                            
                            {workTypeContext === 'loggingPumpingTest' ? (
                                <Card>
                                    <CardHeader><CardTitle>Work Details</CardTitle></CardHeader>
                                    <CardContent className="space-y-4">
                                        <FormField name="typeOfWell" control={control} render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Type of Well <span className="text-destructive">*</span></FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select Well Type" /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        {typeOfWellOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField name="hydrogeologicalRemarks" control={form.control} render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Description of Work</FormLabel>
                                                <FormControl><Textarea {...field} value={field.value || ""} placeholder="Add a description of the work performed..." readOnly={isReadOnly} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField name="geophysicalRemarks" control={form.control} render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Remarks</FormLabel>
                                                <FormControl><Textarea {...field} value={field.value || ""} placeholder="Add any additional remarks..." readOnly={isReadOnly} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </CardContent>
                                </Card>
                            ) : (
                                <Card>
                                    <CardHeader><CardTitle>Survey Details</CardTitle></CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <FormField name="nameOfInvestigator" control={control} render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Name of Investigator (Hydrogeological)</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value || ""}>
                                                        <FormControl><SelectTrigger><SelectValue placeholder="Select Staff" /></SelectTrigger></FormControl>
                                                        <SelectContent>
                                                            {hydroStaff.map(staff => <SelectItem key={staff.id} value={staff.name}>{staff.name} ({staff.designation})</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            <FormField name="dateOfInvestigation" control={control} render={({ field }) => <FormItem><FormLabel>Date of Investigation</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>} />
                                            <FormField name="typeOfWell" control={control} render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Type of Well <span className="text-destructive">*</span></FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl><SelectTrigger><SelectValue placeholder="Select Well Type" /></SelectTrigger></FormControl>
                                                        <SelectContent>
                                                            {typeOfWellOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                        </div>
                                        <FormField name="hydrogeologicalRemarks" control={control} render={({ field }) => <FormItem><FormLabel>Hydrogeological Remarks</FormLabel><FormControl><Textarea {...field} value={field.value || ""} placeholder="Add specific remarks for the hydrogeological investigation..." /></FormControl><FormMessage /></FormItem>} />
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <FormField name="vesRequired" control={control} render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>VES Required</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="Yes">Yes</SelectItem>
                                                            <SelectItem value="No">No</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                        </div>
                                        
                                        {watchedVesRequired === "Yes" && (
                                            <div className="space-y-4 p-4 border rounded-md bg-secondary/20">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <FormField name="vesInvestigator" control={control} render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Name of Investigator (Geophysical)</FormLabel>
                                                            <Select onValueChange={field.onChange} value={field.value || ""}>
                                                                <FormControl><SelectTrigger><SelectValue placeholder="Select Staff" /></SelectTrigger></FormControl>
                                                                <SelectContent>
                                                                    {geophysStaff.map(staff => <SelectItem key={staff.id} value={staff.name}>{staff.name} ({staff.designation})</SelectItem>)}
                                                                </SelectContent>
                                                            </Select>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )} />
                                                    <FormField name="vesDate" control={control} render={({ field }) => <FormItem><FormLabel>Date of VES conducted</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>} />
                                                </div>
                                                <FormField name="geophysicalRemarks" control={form.control} render={({ field }) => <FormItem><FormLabel>Geophysical Remarks</FormLabel><FormControl><Textarea {...field} value={field.value || ""} placeholder="Add specific remarks for the VES..." /></FormControl><FormMessage /></FormItem>} />
                                            </div>
                                        )}

                                        <FormField name="feasibility" control={control} render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Feasibility</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl><SelectTrigger className="w-[180px]"><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="Yes">Yes</SelectItem>
                                                        <SelectItem value="No">No</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        
                                        {watchedFeasibility === "Yes" && (
                                            <div className="space-y-4 pt-4 border-t">
                                                <h4 className="font-semibold text-sm">Recommended measurements</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <FormField name="surveyRecommendedDiameter" control={control} render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Diameter (mm)</FormLabel>
                                                            <Select onValueChange={field.onChange} value={field.value || ""} disabled={isReadOnly}>
                                                                <FormControl><SelectTrigger><SelectValue placeholder="Select Diameter" /></SelectTrigger></FormControl>
                                                                <SelectContent><SelectItem value="_clear_" onSelect={(e) => { e.preventDefault(); field.onChange(undefined); }}>-- Clear Selection --</SelectItem>{siteDiameterOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                                            </Select>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )} />
                                                    <FormField name="surveyRecommendedTD" control={control} render={({ field }) => <FormItem><FormLabel>TD (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                                                    {watchedTypeOfWell === "Bore Well" && <FormField name="surveyRecommendedOB" control={control} render={({ field }) => <FormItem><FormLabel>OB (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />}
                                                    {watchedTypeOfWell === "Bore Well" && <FormField name="surveyRecommendedCasingPipe" control={control} render={({ field }) => <FormItem><FormLabel>Casing Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />}
                                                    {watchedTypeOfWell === "Filter Point Well" && <FormField name="surveyRecommendedCasingPipe" control={control} render={({ field }) => <FormItem><FormLabel>Casing Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />}
                                                    {watchedTypeOfWell === "Tube Well" && (
                                                        <>
                                                            <FormField name="surveyRecommendedPlainPipe" control={control} render={({ field }) => <FormItem><FormLabel>Plain Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                                                            <FormField name="surveyRecommendedSlottedPipe" control={control} render={({ field }) => <FormItem><FormLabel>Slotted Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                                                            <FormField name="surveyRecommendedMsCasingPipe" control={control} render={({ field }) => <FormItem><FormLabel>MS Casing Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
                                                        </>
                                                    )}
                                                    <FormField name="surveyLocation" control={control} render={({ field }) => <FormItem className="md:col-span-2"><FormLabel>Location of well</FormLabel><FormControl><Textarea {...field} value={field.value || ""} className="min-h-[40px]" readOnly={isReadOnly}/></FormControl><FormMessage /></FormItem>} />
                                                    <FormField name="surveyRemarks" control={control} render={({ field }) => <FormItem className="md:col-span-3"><FormLabel>Survey Remarks</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} placeholder="Recommended measurements remarks..." readOnly={isReadOnly}/></FormControl><FormMessage /></FormItem>} />
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            <Card>
                                <CardHeader><CardTitle>Work Status</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField name="workStatus" control={control} render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Status <span className="text-destructive">*</span></FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        {workStatusOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField name="dateOfCompletion" control={control} render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Completion Date {isCompletionDateRequired && <span className="text-destructive">*</span>}</FormLabel>
                                                <FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField name="workRemarks" control={form.control} render={({ field }) => (
                                            <FormItem className="md:col-span-2">
                                                <FormLabel>Status Remarks</FormLabel>
                                                <FormControl><Textarea {...field} value={field.value ?? ""} placeholder="Add status-related remarks..." /></FormControl>
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
            <DialogFooter className="p-6 pt-4 shrink-0">
                <Button variant="outline" type="button" onClick={onCancel}>{isReadOnly ? 'Close' : 'Cancel'}</Button>
                {!isReadOnly && <Button type="submit" form="investigation-site-dialog-form">Save</Button>}
            </DialogFooter>
        </div>
    );
};

export default function InvestigationDataEntryFormComponent({ fileNoToEdit, initialData, allStaffMembers, userRole, workTypeContext, returnPath, pageToReturnTo, isFormDisabled = false, allLsgConstituencyMaps }: DataEntryFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileIdToEdit = searchParams.get("id");
  const approveUpdateId = searchParams.get("approveUpdateId");

  const { addFileEntry, updateFileEntry } = useFileEntries();
  const { createPendingUpdate } = usePendingUpdates();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeAccordionItem, setActiveAccordionItem] = useState<string | undefined>(undefined);
  const [dialogState, setDialogState] = useState<{ type: null | 'application' | 'remittance' | 'payment' | 'site' | 'reorderSite' | 'viewSite'; data: any, isView?: boolean }>({ type: null, data: null, isView: false });
  const [itemToDelete, setItemToDelete] = useState<{ type: 'remittance' | 'payment' | 'site'; index: number } | null>(null);

  const isEditor = userRole === 'editor';
  const isSupervisor = userRole === 'supervisor';
  const isViewer = userRole === 'viewer';

  const remittanceTitle = "2. Remittance Details";
  const pageTitle = workTypeContext === 'loggingPumpingTest' ? 'Logging & Pumping Test' : 'GW Investigation';
  
  const form = useForm<DataEntryFormData>({ resolver: zodResolver(DataEntrySchema), defaultValues: initialData });
  const { control, handleSubmit, setValue, getValues, watch } = form;

  const applicationTypeOptionsForForm = useMemo(() => {
    switch (workTypeContext) {
        case 'gwInvestigation': return [...INVESTIGATION_GOVT_TYPES, ...INVESTIGATION_PRIVATE_TYPES, ...INVESTIGATION_COMPLAINT_TYPES];
        case 'loggingPumpingTest': return Array.from(LOGGING_PUMPING_TEST_TYPES);
        default: return [...INVESTIGATION_GOVT_TYPES, ...INVESTIGATION_PRIVATE_TYPES, ...INVESTIGATION_COMPLAINT_TYPES, ...LOGGING_PUMPING_TEST_TYPES];
    }
  }, [workTypeContext]);
  
  useEffect(() => { 
    if (!fileIdToEdit && applicationTypeOptionsForForm.length === 1 && workTypeContext !== 'loggingPumpingTest') { 
        setValue("applicationType", applicationTypeOptionsForForm[0] as any); 
    } 
  }, [fileIdToEdit, applicationTypeOptionsForForm, setValue, workTypeContext]);

  const { fields: remittanceFields, append: appendRemittance, remove: removeRemittance, update: updateRemittance } = useFieldArray({ control, name: "remittanceDetails" });
  const { fields: siteFields, append: appendSite, remove: removeSite, update: updateSite, move: moveSite } = useFieldArray({ control, name: "siteDetails" });
  const { fields: paymentFields, append: appendPayment, remove: removePayment, update: updatePayment } = useFieldArray({ control, name: "paymentDetails" });

  const watchedRemittanceDetails = watch("remittanceDetails");
  const watchedPaymentDetails = watch("paymentDetails");

  useEffect(() => {
    const totalRemittance = watchedRemittanceDetails?.reduce((sum, item) => {
        return sum + (Number(item.amountRemitted) || 0);
    }, 0) || 0;
    setValue("totalRemittance", totalRemittance);

    const spendableRemittance = watchedRemittanceDetails?.reduce((sum, item) => {
        if (item.remittedAccount !== 'Revenue Head') {
            return sum + (Number(item.amountRemitted) || 0);
        }
        return sum;
    }, 0) || 0;
    
    const totalPayment = watchedPaymentDetails?.reduce((sum, item) => sum + calculatePaymentEntryTotalGlobal(item), 0) || 0;
    setValue("totalPaymentAllEntries", totalPayment);

    const projectExpenses = 0;

    setValue("overallBalance", spendableRemittance - projectExpenses);
    
  }, [watchedRemittanceDetails, watchedPaymentDetails, setValue]);

  const onInvalid = (errors: FieldErrors<DataEntryFormData>) => {
    const messages = getFormattedErrorMessages(errors);
    toast({ title: "Validation Error", description: (<ul className="list-disc pl-5 mt-2 space-y-1">{messages.map((msg, i) => <li key={i} className="text-xs">{msg}</li>)}</ul>), variant: "destructive", duration: 10000 });
  };
  
  const onSubmit = async (data: DataEntryFormData) => {
    setIsSubmitting(true);
    try {
        const sanitizedData = {
          ...data,
          constituency: data.constituency === undefined ? null : data.constituency,
        };

        if (!user) throw new Error("Authentication error.");
        if (isSupervisor) {
            await createPendingUpdate(sanitizedData.fileNo, sanitizedData.siteDetails!, user, {});
            toast({ title: "Update Submitted" });
        } else if (fileIdToEdit) {
            await updateFileEntry(fileIdToEdit, sanitizedData, approveUpdateId || undefined);
            toast({ title: "File Updated" });
        } else {
            await addFileEntry(sanitizedData);
            toast({ title: "File Created" });
        }
        router.push(returnPath);
    } catch (error: any) { toast({ title: "Submission Failed", description: error.message, variant: "destructive" }); } finally { setIsSubmitting(false); }
  };

  const openDialog = (type: 'application' | 'remittance' | 'payment' | 'site' | 'reorderSite' | 'viewSite', data: any, isView: boolean = false) => setDialogState({ type, data, isView });
  const closeDialog = () => setDialogState({ type: null, data: null, isView: false });

  const handleDialogConfirm = (data: any) => {
    const { type, data: originalData } = dialogState;
    if (!type) return;
    if (type === 'application') {
        setValue("fileNo", data.fileNo, { shouldDirty: true });
        setValue("applicantName", data.applicantName, { shouldDirty: true });
        setValue("phoneNo", data.phoneNo, { shouldDirty: true });
        setValue("secondaryMobileNo", data.secondaryMobileNo, { shouldDirty: true });
        setValue("applicationType", data.applicationType, { shouldDirty: true });
        setValue("category", data.category, { shouldDirty: true });
    } else if (type === 'remittance') {
        const remittanceData = data as RemittanceDetailFormData;
        if (originalData.index !== undefined) {
            updateRemittance(originalData.index, remittanceData);
        } else {
            appendRemittance(remittanceData);
        }
        if (remittanceData.remittedAccount === 'Revenue Head' && remittanceData.amountRemitted && remittanceData.amountRemitted > 0) {
            const newPaymentEntry: PaymentDetailFormData = {
                dateOfPayment: remittanceData.dateOfRemittance,
                paymentAccount: "SBI",
                revenueHead: remittanceData.amountRemitted,
                totalPaymentPerEntry: calculatePaymentEntryTotalGlobal({ revenueHead: remittanceData.amountRemitted }),
                paymentRemarks: "Auto-entry for remittance to Revenue Head.",
            };
            appendPayment(newPaymentEntry);
            toast({ title: "Payment Entry Added", description: "An automatic payment entry was created for the Revenue Head remittance." });
        }
    } else if (type === 'payment') {
        const paymentData = { ...data, totalPaymentPerEntry: calculatePaymentEntryTotalGlobal(data) };
        if (originalData.index !== undefined) {
            updatePayment(originalData.index, paymentData);
        } else {
            appendPayment(paymentData);
        }
    } else if (type === 'site') {
        if (originalData.index !== undefined) updateSite(originalData.index, data); else appendSite(data);
    }
    closeDialog();
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    const { type, index } = itemToDelete;
    if (type === 'remittance') removeRemittance(index); else if (type === 'payment') removePayment(index); else if (type === 'site') removeSite(index);
    if (isEditor && fileIdToEdit) {
        setIsSubmitting(true);
        try { await updateFileEntry(fileIdToEdit, getValues()); toast({ title: "Item Removed" }); } 
        catch (error: any) { toast({ title: "Error", description: error.message, variant: "destructive" }); } 
        finally { setIsSubmitting(false); }
    } else toast({ title: "Removed locally" });
    setItemToDelete(null);
  };
  
  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
        <Card><CardHeader className="flex flex-row justify-between items-start"><div><CardTitle className="text-xl">1. {pageTitle} Details</CardTitle></div>{isEditor && !isFormDisabled && <Button type="button" onClick={() => openDialog('application', getValues())} disabled={isSupervisor || isViewer}><Edit className="h-4 w-4 mr-2" />Edit</Button>}</CardHeader><CardContent><div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4"><DetailRow label="File No." value={watch('fileNo')} /><DetailRow label="Applicant Name & Address" value={watch('applicantName')} /><DetailRow label="Phone No." value={watch('phoneNo')} /><DetailRow label="Secondary Mobile No." value={watch('secondaryMobileNo')} /><DetailRow label="Category" value={watch('category')} /><DetailRow label="Type of Application" value={watch('applicationType') ? applicationTypeDisplayMap[watch('applicationType') as ApplicationType] : ''} /></div></CardContent></Card>
        <Card><CardHeader className="flex flex-row justify-between items-start"><div><CardTitle className="text-xl">{remittanceTitle}</CardTitle></div>{isEditor && !isFormDisabled && <Button type="button" onClick={() => openDialog('remittance', createDefaultRemittanceDetail())} disabled={isSupervisor || isViewer}><PlusCircle className="h-4 w-4 mr-2" />Add</Button>}</CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Amount (₹)</TableHead><TableHead>Account</TableHead><TableHead>Remarks</TableHead>{isEditor && !isFormDisabled && <TableHead>Actions</TableHead>}</TableRow></TableHeader><TableBody>{remittanceFields.length > 0 ? remittanceFields.map((item, index) => (<TableRow key={item.id}><TableCell>{item.dateOfRemittance ? format(new Date(item.dateOfRemittance), 'dd/MM/yyyy') : 'N/A'}</TableCell><TableCell>{(Number(item.amountRemitted) || 0).toLocaleString('en-IN')}</TableCell><TableCell>{item.remittedAccount}</TableCell><TableCell>{item.remittanceRemarks}</TableCell>{isEditor && !isFormDisabled && <TableCell><div className="flex gap-1"><Button type="button" variant="ghost" size="icon" onClick={() => openDialog('remittance', { index, ...item })}><Edit className="h-4 w-4"/></Button><Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => setItemToDelete({type: 'remittance', index})}><Trash2 className="h-4 w-4"/></Button></div></TableCell>}</TableRow>)) : <TableRow><TableCell colSpan={5} className="text-center h-24">No details added.</TableCell></TableRow>}</TableBody><TableFooterComponent><TableRow><TableCell colSpan={isEditor && !isFormDisabled ? 4 : 3} className="text-right font-bold">Total Remittance</TableCell><TableCell className="font-bold">₹{watch('totalRemittance')?.toLocaleString('en-IN')}</TableCell></TableRow></TableFooterComponent></Table></CardContent></Card>
        <Card><CardHeader className="flex flex-row justify-between items-start"><div><CardTitle className="text-xl">3. {pageTitle} Site Details</CardTitle></div>{isEditor && !isFormDisabled && <Button type="button" onClick={() => openDialog('site', {})} disabled={isSupervisor || isViewer}><PlusCircle className="h-4 w-4 mr-2" />Add Site</Button>}</CardHeader><CardContent><Accordion type="single" collapsible className="w-full space-y-2" value={activeAccordionItem} onValueChange={setActiveAccordionItem}>{siteFields.length > 0 ? siteFields.map((site, index) => (<AccordionItem key={site.id} value={`site-${index}`} className="border bg-background rounded-lg shadow-sm"><AccordionTrigger className="flex-1 text-base font-semibold px-4 group"><div className="flex justify-between items-center w-full"><div>Site #{index + 1}: {site.nameOfSite || "Unnamed Site"}</div><div className="flex items-center space-x-1 mr-2"><Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.preventDefault(); e.stopPropagation(); openDialog('site', { index, ...site }); }}><Eye className="h-4 w-4"/></Button>{isEditor && !isFormDisabled && (<><Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setItemToDelete({type: 'site', index}); }}><Trash2 className="h-4 w-4" /></Button></>)}</div></div></AccordionTrigger><AccordionContent className="p-6 pt-0"><div className="border-t pt-6 space-y-4"><dl className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-4"><DetailRow label="Purpose" value={site.purpose} /><DetailRow label="Status" value={site.workStatus} /><DetailRow label="Investigator" value={site.nameOfInvestigator} /></dl></div></AccordionContent></AccordionItem>)) : <div className="text-center py-8 text-muted-foreground">No sites added.</div>}</Accordion></CardContent></Card>
        <Card><CardHeader className="flex flex-row justify-between items-start"><div><CardTitle className="text-xl">4. Payment Details</CardTitle></div>{isEditor && !isFormDisabled && <Button type="button" onClick={() => openDialog('payment', createDefaultPaymentDetail())} disabled={isSupervisor || isViewer}><PlusCircle className="h-4 w-4 mr-2" />Add</Button>}</CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Acct.</TableHead><TableHead className="text-right">Total (₹)</TableHead><TableHead>Remarks</TableHead>{isEditor && !isFormDisabled && <TableHead>Actions</TableHead>}</TableRow></TableHeader><TableBody>{paymentFields.length > 0 ? paymentFields.map((item, index) => (<TableRow key={item.id}><TableCell>{item.dateOfPayment ? format(new Date(item.dateOfPayment), 'dd/MM/yy') : 'N/A'}</TableCell><TableCell>{item.paymentAccount}</TableCell><TableCell className="text-right">{(Number(item.totalPaymentPerEntry) || 0).toLocaleString('en-IN')}</TableCell><TableCell>{item.paymentRemarks}</TableCell>{isEditor && !isFormDisabled && <TableCell><div className="flex gap-1"><Button type="button" variant="ghost" size="icon" onClick={() => openDialog('payment', { index, ...item })}><Edit className="h-4 w-4"/></Button><Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => setItemToDelete({type: 'payment', index})}><Trash2 className="h-4 w-4"/></Button></div></TableCell>}</TableRow>)) : <TableRow><TableCell colSpan={5} className="text-center h-24">No payments added.</TableCell></TableRow>}</TableBody><TableFooterComponent><TableRow><TableCell colSpan={isEditor && !isFormDisabled ? 4 : 3} className="text-right font-bold">Total Payment</TableCell><TableCell className="font-bold text-right">₹{watch('totalPaymentAllEntries')?.toLocaleString('en-IN')}</TableCell></TableRow></TableFooterComponent></Table></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-xl">5. Final Details</CardTitle></CardHeader><CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="p-4 border rounded-lg space-y-4 bg-secondary/30"><h3 className="font-semibold text-lg text-primary">Financial Summary</h3><dl className="space-y-2"><div className="flex justify-between items-baseline"><dt>Total Remittance</dt><dd className="font-mono">₹{watch('totalRemittance')?.toLocaleString('en-IN') || '0.00'}</dd></div><div className="flex justify-between items-baseline"><dt>Total Payment</dt><dd className="font-mono">₹{watch('totalPaymentAllEntries')?.toLocaleString('en-IN') || '0.00'}</dd></div><Separator /><div className="flex justify-between items-baseline font-bold"><dt>Overall Balance</dt><dd className="font-mono text-xl">₹{watch('overallBalance')?.toLocaleString('en-IN') || '0.00'}</dd></div></dl></div><div className="p-4 border rounded-lg space-y-4 bg-secondary/30"><FormField control={control} name="fileStatus" render={({ field }) => <FormItem><FormLabel>File Status <span className="text-destructive">*</span></FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isViewer || isFormDisabled || isSupervisor}><FormControl><SelectTrigger><SelectValue placeholder="Select final file status" /></SelectTrigger></FormControl><SelectContent className="max-h-80">{investigationFileStatusOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} /><FormField control={control} name="remarks" render={({ field }) => <FormItem><FormLabel>Final Remarks</FormLabel><FormControl><Textarea {...field} placeholder="Final remarks..." readOnly={isViewer || isFormDisabled || isSupervisor} /></FormControl><FormMessage /></FormItem>} /></div></CardContent></Card>
        {!(isViewer || isFormDisabled) && (<CardFooter className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => router.push(returnPath)} disabled={isSubmitting}><X className="mr-2 h-4 w-4"/> Cancel</Button><Button type="submit" disabled={isSubmitting}><Save className="mr-2 h-4 w-4"/> {isSubmitting ? "Saving..." : 'Save & Exit'}</Button></CardFooter>)}
        <Dialog open={dialogState.type === 'application'} onOpenChange={closeDialog}><DialogContent className="max-w-4xl"><ApplicationDialogContent initialData={dialogState.data} onConfirm={handleDialogConfirm} onCancel={closeDialog} formOptions={applicationTypeOptionsForForm} workTypeContext={workTypeContext} /></DialogContent></Dialog>
        <Dialog open={dialogState.type === 'remittance'} onOpenChange={closeDialog}><DialogContent className="max-w-3xl"><RemittanceDialogContent initialData={dialogState.data} onConfirm={handleDialogConfirm} onCancel={closeDialog} isDeferredFunding={false} /></DialogContent></Dialog>
        <Dialog open={dialogState.type === 'site'} onOpenChange={closeDialog}><DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0"><SiteDialogContent initialData={dialogState.data} onConfirm={handleDialogConfirm} onCancel={closeDialog} isReadOnly={isViewer || isFormDisabled} allLsgConstituencyMaps={allLsgConstituencyMaps} allStaffMembers={allStaffMembers} workTypeContext={workTypeContext} /></DialogContent></Dialog>
        <Dialog open={dialogState.type === 'payment'} onOpenChange={closeDialog}><DialogContent className="max-w-xl flex flex-col p-0"><PaymentDialogContent initialData={dialogState.data} onConfirm={handleDialogConfirm} onCancel={closeDialog} isDeferredFunding={false} workTypeContext={workTypeContext} /></DialogContent></Dialog>
        <AlertDialog open={itemToDelete !== null} onOpenChange={() => setItemToDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>Delete this entry?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteItem} className="bg-destructive">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      </form>
    </FormProvider>
  );
}
