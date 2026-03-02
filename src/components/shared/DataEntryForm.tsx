
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
import { Loader2, Trash2, PlusCircle, X, Save, Clock, Eye, ArrowUpDown, Copy, Info, ImagePlus, Video, ChevronLeft, ChevronRight, Edit } from "lucide-react";
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
  PUBLIC_DEPOSIT_APPLICATION_TYPES,
  PRIVATE_APPLICATION_TYPES,
  COLLECTOR_APPLICATION_TYPES,
  PLAN_FUND_APPLICATION_TYPES,
  LOGGING_PUMPING_TEST_PURPOSE_OPTIONS,
  type Bidder,
  type MediaItem,
  ReappropriationDetailSchema,
  type ReappropriationDetailFormData
} from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useFileEntries } from "@/hooks/useFileEntries";
import { usePendingUpdates } from "@/hooks/usePendingUpdates";
import type { StaffMember } from "@/lib/schemas";
import { z } from "zod";
import { useAuth, type UserProfile } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { getFirestore, doc, updateDoc, serverTimestamp, query, collection, where, getDocs, Timestamp } from "firebase/firestore";
import { app } from "@/lib/firebase";
import { useDataStore } from "@/hooks/use-data-store";
import { ScrollArea } from "../ui/scroll-area";
import { format, isValid, parseISO } from "date-fns";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter as TableFooterComponent } from "@/components/ui/table";
import { v4 as uuidv4 } from 'uuid';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from "@/components/ui/badge";


const db = getFirestore(app);

const toDateOrNull = (value: any): Date | null => {
    if (value === null || value === undefined || value === '') return null;
    if (value instanceof Date && isValid(value)) return value;
    if (typeof value === 'object' && value !== null && typeof value.seconds === 'number') {
        const d = new Date(value.seconds * 1000 + (value.nanoseconds || 0) / 1e6);
        if (isValid(d)) return d;
    }
    if (typeof value === 'string') {
        let d = parseISO(value); 
        if (isValid(d)) return d;
        d = new Date(value);
        if (isValid(d)) return d;
    }
    return null;
};

const createDefaultRemittanceDetail = (): RemittanceDetailFormData => ({ id: uuidv4(), amountRemitted: undefined, dateOfRemittance: "", remittedAccount: "Bank", remittanceRemarks: "" });
const createDefaultReappropriationDetail = (): ReappropriationDetailFormData => ({ type: "Outward", refFileNo: "", amount: undefined, date: "", remarks: "", pageType: "Deposit Work", fileDetails: "" });
const createDefaultPaymentDetail = (): PaymentDetailFormData => ({ id: uuidv4(), remittanceId: null, dateOfPayment: "", paymentAccount: "Bank", revenueHead: undefined, contractorsPayment: undefined, gst: undefined, incomeTax: undefined, kbcwb: undefined, refundToParty: undefined, totalPaymentPerEntry: 0, paymentRemarks: "" });
const createDefaultSiteDetail = (): z.infer<typeof SiteDetailSchema> => ({ nameOfSite: "", localSelfGovt: "", constituency: undefined, latitude: undefined, longitude: undefined, purpose: undefined, estimateAmount: undefined, remittedAmount: undefined, siteConditions: undefined, tsAmount: undefined, tenderNo: "", diameter: undefined, totalDepth: undefined, casingPipeUsed: "", outerCasingPipe: "", innerCasingPipe: "", yieldDischarge: "", zoneDetails: "", waterLevel: "", drillingRemarks: "", developingRemarks: "", schemeRemarks: "", pumpDetails: "", waterTankCapacity: "", noOfTapConnections: undefined, noOfBeneficiary: "", dateOfCompletion: "", typeOfRig: undefined, contractorName: "", supervisorUid: undefined, supervisorName: undefined, supervisorDesignation: undefined, totalExpenditure: undefined, workStatus: undefined, workRemarks: "", surveyOB: "", surveyLocation: "", surveyRemarks: "", surveyRecommendedDiameter: "", surveyRecommendedTD: "", surveyRecommendedOB: "", surveyRecommendedCasingPipe: "", surveyRecommendedPlainPipe: "", surveyRecommendedSlottedPipe: "", surveyRecommendedMsCasingPipe: "", arsTypeOfScheme: undefined, arsPanchayath: undefined, arsBlock: undefined, arsAsTsDetails: undefined, arsSanctionedDate: "", arsTenderedAmount: undefined, arsAwardedAmount: undefined, arsNumberOfStructures: undefined, arsStorageCapacity: undefined, arsNumberOfFillings: undefined, isArsImport: false, pilotDrillingDepth: "", pumpingLineLength: "", deliveryLineLength: "", implementationRemarks: "", workImages: [], workVideos: [] });


const calculatePaymentEntryTotalGlobal = (payment: PaymentDetailFormData | undefined): number => {
  if (!payment) return 0;
  return (Number(payment.revenueHead) || 0) + (Number(payment.contractorsPayment) || 0) + (Number(payment.gst) || 0) + (Number(payment.incomeTax) || 0) + (Number(payment.kbcwb) || 0);
};

const PURPOSES_REQUIRING_DIAMETER: SitePurpose[] = ["BWC", "TWC", "FPW", "BW Dev", "TW Dev", "FPW Dev"];
const FINAL_WORK_STATUSES: SiteWorkStatus[] = ['Work Failed', 'Work Completed'];
const SUPERVISOR_ONGOING_STATUSES: SiteWorkStatus[] = ["Work Order Issued", "Work in Progress", "Awaiting Dept. Rig", "Work Initiated"];
const SITE_DIALOG_WORK_STATUS_OPTIONS = siteWorkStatusOptions.filter(
    (status) => !["Bill Prepared", "Payment Completed", "Utilization Certificate Issued"].includes(status)
);


const getFormattedErrorMessages = (errors: FieldErrors<any>): string[] => {
  const messages = new Set<string>();

  const processPath = (path: string, index: number): string => {
    if (path === 'siteDetails') return `Site #${index + 1}`;
    if (path === 'remittanceDetails') return `Remittance #${index + 1}`;
    if (path === 'reappropriationDetails') return `Re-appropriation #${index + 1}`;
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
    supervisorList: (StaffMember & { uid: string; name: string })[];
    userRole?: UserRole;
    workTypeContext: 'public' | 'private' | 'collector' | 'planFund' | 'gwInvestigation' | 'loggingPumpingTest' | null;
    returnPath: string; 
    pageToReturnTo: string | null;
    isFormDisabled?: boolean;
}

const formatDateForInput = (date: Date | string | null | undefined): string => {
    if (!date) return "";
    try { return format(new Date(date), 'yyyy-MM-dd'); } catch { return ""; }
};

const ApplicationDialogContent = ({ initialData, onConfirm, onCancel, formOptions, isEditing }: { 
    initialData: any, 
    onConfirm: (data: any) => void, 
    onCancel: () => void, 
    formOptions: readonly ApplicationType[] | ApplicationType[],
    isEditing: boolean
}) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [data, setData] = useState(initialData);
    const [errors, setErrors] = useState<{ fileNo?: string; applicantName?: string; applicationType?: string; }>();
    const [isChecking, setIsChecking] = useState(false);

    const handleChange = (key: string, value: any) => {
        setData((prev: any) => ({ ...prev, [key]: value }));
        if (value && String(value).trim()) {
            setErrors(prev => ({...prev, [key]: undefined}));
        }
    };
    
    const handleSave = async () => {
        const newErrors: { fileNo?: string; applicantName?: string; applicationType?: string; } = {};
        if (!data.fileNo?.trim()) {
            newErrors.fileNo = "File No is required.";
        }
        if (!data.applicantName?.trim()) {
            newErrors.applicantName = "Applicant Name is required.";
        }
        if (!data.applicationType) {
            newErrors.applicationType = "Type of Application is required.";
        }
        
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        if (!isEditing && user?.officeLocation && data.fileNo) {
            setIsChecking(true);
            try {
                const fileNoTrimmed = data.fileNo.trim().toUpperCase();
                
                const depositWorkTypes: string[] = [
                    ...PUBLIC_DEPOSIT_APPLICATION_TYPES,
                    ...PRIVATE_APPLICATION_TYPES,
                    ...COLLECTOR_APPLICATION_TYPES,
                    ...PLAN_FUND_APPLICATION_TYPES
                ];

                const q = query(
                    collection(db, `offices/${user.officeLocation.toLowerCase()}/fileEntries`), 
                    where("fileNo", "==", fileNoTrimmed)
                );
                
                const querySnapshot = await getDocs(q);

                const hasDuplicate = querySnapshot.docs.some(doc => {
                    const docAppType = doc.data().applicationType;
                    return docAppType && depositWorkTypes.includes(docAppType);
                });
                
                if (hasDuplicate) {
                    toast({
                        title: "Duplicate File Number",
                        description: `This file number is already used for another Deposit Work file.`,
                        variant: "destructive",
                    });
                    setIsChecking(false);
                    return; 
                }
            } catch (error) {
                toast({
                    title: "Validation Error",
                    description: "Could not verify file number. Please try again.",
                    variant: "destructive",
                });
                setIsChecking(false);
                return;
            }
            setIsChecking(false);
        }

        onConfirm(data);
    };

    return (
      <div className="flex flex-col h-auto">
        <DialogHeader>
          <DialogTitle>Application Details</DialogTitle>
        </DialogHeader>
        <div className="p-6 pt-0 space-y-4 flex-1">
             <div className="grid grid-cols-3 gap-4 items-start">
                <div className="space-y-2 col-span-1">
                    <Label htmlFor="fileNo">File No *</Label>
                    <Input id="fileNo" value={data.fileNo} onChange={(e) => handleChange('fileNo', e.target.value)} disabled={isChecking}/>
                    {errors?.fileNo && <p className="text-xs text-destructive mt-1">{errors.fileNo}</p>}
                </div>
                <div className="space-y-2 col-span-2">
                    <Label htmlFor="applicantName">Name &amp; Address of Institution/Applicant *</Label>
                    <Textarea id="applicantName" value={data.applicantName} onChange={(e) => handleChange('applicantName', e.target.value)} className="min-h-[40px]" disabled={isChecking}/>
                    {errors?.applicantName && <p className="text-xs text-destructive mt-1">{errors.applicantName}</p>}
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Phone No.</Label><Input value={data.phoneNo} onChange={(e) => handleChange('phoneNo', e.target.value)} disabled={isChecking} /></div>
                <div className="space-y-2"><Label>Secondary Mobile No.</Label><Input value={data.secondaryMobileNo} onChange={(e) => handleChange('secondaryMobileNo', e.target.value)} disabled={isChecking}/></div>
                 <div className="space-y-2">
                    <Label>Type of Application *</Label>
                    <Select onValueChange={(value) => handleChange('applicationType', value)} value={data.applicationType} disabled={isChecking}>
                        <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
                        <SelectContent className="max-h-80">
                            {formOptions.map(o => <SelectItem key={o} value={o}>{applicationTypeDisplayMap[o] || o}</SelectItem>)}
                        </SelectContent>
                    </Select>
                     {errors?.applicationType && <p className="text-xs text-destructive mt-1">{errors.applicationType}</p>}
                </div>
            </div>
        </div>
        <DialogFooter className="px-6 pb-6"><Button variant="outline" onClick={onCancel} disabled={isChecking}>Cancel</Button><Button onClick={handleSave} disabled={isChecking}>{isChecking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save</Button></DialogFooter>
      </div>
    );
};

const RemittanceDialogContent = ({ initialData, onConfirm, onCancel, isDeferredFunding }: { initialData?: any, onConfirm: (data: any) => void, onCancel: () => void, isDeferredFunding: boolean; }) => {
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
        if (isDeferredFunding) {
            return remittedAccountOptions.filter(o => o === "Plan Fund");
        }
        return remittedAccountOptions.filter(o => o !== "Plan Fund");
    }, [isDeferredFunding]);

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
                <DialogTitle>{isDeferredFunding ? 'Administrative Sanction Details' : 'Remittance Details'}</DialogTitle>
                {isDeferredFunding && <DialogDescription className="text-amber-700 bg-amber-100/50 border border-amber-200 rounded-md">The amount entered here is the deferred amount, which the department has already received for this scheme.</DialogDescription>}
            </DialogHeader>
            <div className="p-6 pt-4 space-y-4">
                <div className={cn("grid grid-cols-1 gap-4", isDeferredFunding ? "md:grid-cols-2" : "md:grid-cols-3")}>
                    <FormField name="dateOfRemittance" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Date <span className="text-destructive">*</span></FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField name="amountRemitted" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Amount (₹)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} /></FormControl><FormMessage /></FormItem> )}/>
                    {!isDeferredFunding && (
                        <FormField name="remittedAccount" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Account <span className="text-destructive">*</span></FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select Account" /></SelectTrigger></FormControl><SelectContent>{availableRemittanceAccounts.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                    )}
                </div>
                <FormField name="remittanceRemarks" control={form.control} render={({ field }) => ( <FormItem><FormLabel>{isDeferredFunding ? 'AS Remarks' : 'Remittance Remarks'}</FormLabel><FormControl><Textarea {...field} placeholder="Add any remarks for this entry..." /></FormControl><FormMessage /></FormItem> )}/>
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                <Button type="submit">Save</Button>
            </DialogFooter>
        </form>
    </Form>
    );
};

const ReappropriationDialogContent = ({ initialData, onConfirm, onCancel }: { initialData?: any, onConfirm: (data: any) => void, onCancel: () => void }) => {
    const { allFileEntries, allArsEntries } = useDataStore();
    const form = useForm<ReappropriationDetailFormData>({
      resolver: zodResolver(ReappropriationDetailSchema),
      defaultValues: {
          ...createDefaultReappropriationDetail(),
          ...initialData,
          date: formatDateForInput(initialData?.date),
      },
    });

    const handleConfirmSubmit = (data: ReappropriationDetailFormData) => {
        onConfirm(data);
    };

    const watchedPageType = useWatch({ control: form.control, name: "pageType" });
    const watchedFileNo = useWatch({ control: form.control, name: "refFileNo" });

    const suggestions = useMemo(() => {
        if (!watchedPageType) return [];
        
        let filtered: string[] = [];
        if (watchedPageType === 'ARS') {
            filtered = allArsEntries.map(e => e.fileNo).filter(Boolean);
        } else {
            const source = allFileEntries.filter(entry => {
                const appType = entry.applicationType as any;
                if (watchedPageType === "Deposit Work") return PUBLIC_DEPOSIT_APPLICATION_TYPES.includes(appType) || PRIVATE_APPLICATION_TYPES.includes(appType) || COLLECTOR_APPLICATION_TYPES.includes(appType) || PLAN_FUND_APPLICATION_TYPES.includes(appType);
                
                const hasInvestigation = entry.siteDetails?.some(s => s.purpose === 'GW Investigation');
                const hasLoggingPumping = entry.siteDetails?.some(s => s.purpose && LOGGING_PUMPING_TEST_PURPOSE_OPTIONS.includes(s.purpose as any));
                
                if (watchedPageType === "GW Investigation") return hasInvestigation && !hasLoggingPumping;
                if (watchedPageType === "Logging & Pumping Test") return hasLoggingPumping && !hasInvestigation;
                
                return false;
            });
            filtered = source.map(e => e.fileNo).filter(Boolean);
        }
        return Array.from(new Set(filtered)).sort();
    }, [watchedPageType, allFileEntries, allArsEntries]);

    useEffect(() => {
        if (!watchedPageType || !watchedFileNo) {
            form.setValue('fileDetails', '');
            return;
        }

        let foundEntry: any = null;
        if (watchedPageType === 'ARS') {
            foundEntry = allArsEntries.find(e => e.fileNo?.toLowerCase().trim() === watchedFileNo.toLowerCase().trim());
        } else {
            foundEntry = allFileEntries.find(e => e.fileNo?.toLowerCase().trim() === watchedFileNo.toLowerCase().trim());
        }

        if (foundEntry) {
            let details = '';
            if (watchedPageType === 'ARS') {
                details = `Site: ${foundEntry.nameOfSite || 'N/A'}\nScheme: ${foundEntry.arsTypeOfScheme || 'N/A'}`;
            } else {
                details = (foundEntry.siteDetails || []).map((s: any) => `Site: ${s.nameOfSite || 'N/A'} (${s.purpose || 'N/A'})`).join('\n');
            }
            form.setValue('fileDetails', details || 'No site details found.');
        } else {
            form.setValue('fileDetails', 'File not found in database.');
        }
    }, [watchedPageType, watchedFileNo, allFileEntries, allArsEntries, form]);

    const pageTypeOptions = [
        "Deposit Work",
        "GW Investigation",
        "Logging & Pumping Test"
    ];

    return (
      <Form {...form}>
        <form onSubmit={(e) => { e.stopPropagation(); e.preventDefault(); form.handleSubmit(handleConfirmSubmit)(e); }}>
            <DialogHeader>
                <DialogTitle>Re-appropriation Details</DialogTitle>
                <DialogDescription>Track funds transferred from this file to another file.</DialogDescription>
            </DialogHeader>
            <div className="p-6 pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField name="date" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Date <span className="text-destructive">*</span></FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField name="pageType" control={form.control} render={({ field }) => ( 
                        <FormItem>
                            <FormLabel>Type of Page</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {pageTypeOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem> 
                    )}/>
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField name="refFileNo" control={form.control} render={({ field }) => ( 
                            <FormItem>
                                <FormLabel>File No. <span className="text-destructive">*</span></FormLabel>
                                <FormControl>
                                    <Input list="file-no-suggestions" placeholder="e.g., GWD/KLM/123" {...field} />
                                </FormControl>
                                <datalist id="file-no-suggestions">
                                    {suggestions.map(no => <option key={no} value={no} />)}
                                </datalist>
                                <FormMessage />
                            </FormItem> 
                        )}/>
                        <FormField name="amount" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Amount (₹) <span className="text-destructive">*</span></FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} /></FormControl><FormMessage /></FormItem> )}/>
                    </div>
                </div>
                <FormField name="fileDetails" control={form.control} render={({ field }) => ( 
                    <FormItem>
                        <FormLabel>File Details</FormLabel>
                        <FormControl><Textarea {...field} className="bg-muted resize-none" value={field.value || ""} readOnly disabled/></FormControl>
                        <FormMessage />
                    </FormItem> 
                )}/>
                <FormField name="remarks" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Remarks</FormLabel><FormControl><Textarea {...field} placeholder="Add any specific reasons or notes..." /></FormControl><FormMessage /></FormItem> )}/>
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                <Button type="submit">Save</Button>
            </DialogFooter>
        </form>
    </Form>
    );
};

const PaymentDialogContent = ({ initialData, onConfirm, onCancel, isDeferredFunding }: { initialData: any, onConfirm: (data: any) => void, onCancel: () => void, isDeferredFunding: boolean }) => {
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

    const availablePaymentAccounts = useMemo(() => {
        if (isDeferredFunding) {
            return paymentAccountOptions.filter(o => o === "Plan Fund");
        }
        return paymentAccountOptions.filter(o => o !== "Plan Fund");
    }, [isDeferredFunding]);

    return (
        <Form {...form}>
             <form onSubmit={form.handleSubmit(handleConfirmSubmit)} className="flex flex-col h-full">
                <DialogHeader className="p-6 pb-4 shrink-0">
                    <DialogTitle>Payment Details</DialogTitle>
                </DialogHeader>
                <div className="flex-1 min-h-0">
                  <ScrollArea className="h-full px-6 py-4">
                      <div className="space-y-4">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField name="dateOfPayment" control={form.control} render={({ field }) => <FormItem><FormLabel>Date of Payment <span className="text-destructive">*</span></FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>} />
                              {!isDeferredFunding && (
                                <FormField name="paymentAccount" control={form.control} render={({ field }) => <FormItem><FormLabel>Payment Account <span className="text-destructive">*</span></FormLabel><Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select Account"/></SelectTrigger></FormControl>
                                    <SelectContent>{availablePaymentAccounts.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                </Select><FormMessage /></FormItem>} />
                              )}
                          </div>
                          <Separator/>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              <FormField name="revenueHead" control={form.control} render={({ field }) => <FormItem><FormLabel>Revenue Head (₹)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} /></FormControl><FormMessage /></FormItem>} />
                              <FormField name="contractorsPayment" control={form.control} render={({ field }) => <FormItem><FormLabel>Contractor's Payment (₹)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} /></FormControl><FormMessage /></FormItem>} />
                              <FormField name="gst" control={form.control} render={({ field }) => <FormItem><FormLabel>GST (₹)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} /></FormControl><FormMessage /></FormItem>} />
                              <FormField name="incomeTax" control={form.control} render={({ field }) => <FormItem><FormLabel>Income Tax (₹)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} /></FormControl><FormMessage /></FormItem>} />
                              <FormField name="kbcwb" control={form.control} render={({ field }) => <FormItem><FormLabel>KBCWB (₹)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} /></FormControl><FormMessage /></FormItem>} />
                              <FormField name="refundToParty" control={form.control} render={({ field }) => <FormItem><FormLabel>Refund to Party (₹)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} /></FormControl><FormMessage /></FormItem>} />
                          </div>
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

const MediaManager = ({
  title,
  type,
  fields,
  append,
  remove,
  update,
  isReadOnly,
}: {
  title: string;
  type: 'image' | 'video';
  fields: any[];
  append: (item: any) => void;
  remove: (index: number) => void;
  update: (index: number, item: any) => void;
  isReadOnly: boolean;
}) => {
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [editingMedia, setEditingMedia] = useState<{ index: number; data: any } | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const handleAddClick = () => {
    setEditingMedia(null);
    setIsMediaModalOpen(true);
  };

  const handleEditClick = (index: number, data: any) => {
    setEditingMedia({ index, data });
    setIsMediaModalOpen(true);
  };

  const handleMediaSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation(); 
    const formData = new FormData(e.currentTarget);
    const url = formData.get('url') as string;
    const description = formData.get('description') as string;

    if (!url) return;

    if (editingMedia) {
      update(editingMedia.index, { ...editingMedia.data, url, description });
    } else {
      append({ id: uuidv4(), url, description });
    }
    setIsMediaModalOpen(false);
  };

  const getEmbedUrl = (url: string) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const id = url.split('v=')[1]?.split('&')[0] || url.split('/').pop();
      return `https://www.youtube.com/embed/${id}`;
    }
    if (url.includes('vimeo.com')) {
      const id = url.split('/').pop();
      return `https://player.vimeo.com/video/${id}`;
    }
    return null;
  };

  const getYouTubeThumbnail = (url: string) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const id = url.split('v=')[1]?.split('&')[0] || url.split('/').pop();
      return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
    }
    return null;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          {type === 'image' ? <ImagePlus className="h-4 w-4" /> : <Video className="h-4 w-4" />}
          {title}
        </h4>
        {!isReadOnly && (
          <Button type="button" variant="outline" size="sm" onClick={handleAddClick}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add {type === 'image' ? 'Image' : 'Video'} Link
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {fields.map((field, index) => (
          <div key={field.id} className="flex flex-col gap-1 group">
            <div className="relative aspect-square rounded-lg border overflow-hidden bg-muted">
              <button
                type="button"
                onClick={() => setLightboxIndex(index)}
                className="w-full h-full flex items-center justify-center hover:opacity-80 transition-opacity"
              >
                {type === 'image' ? (
                  <img src={field.url} alt={field.description || ''} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full relative">
                    {getYouTubeThumbnail(field.url) ? (
                      <img src={getYouTubeThumbnail(field.url)!} className="w-full h-full object-cover" />
                    ) : (
                      <video src={field.url} className="w-full h-full object-cover" preload="metadata" />
                    )}
                  </div>
                )}
              </button>
              {!isReadOnly && (
                <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button type="button" variant="secondary" size="icon" className="h-7 w-7 shadow-sm" onClick={() => handleEditClick(index, field)}>
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button type="button" variant="destructive" size="icon" className="h-7 w-7 shadow-sm" onClick={() => remove(index)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
            {field.description && (
              <p className="text-xs font-semibold text-primary/80 line-clamp-2 px-1 py-1 mt-1.5 rounded">
                {field.description}
              </p>
            )}
          </div>
        ))}
        {fields.length === 0 && (
          <div className="col-span-full py-8 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground bg-muted/20">
            <p className="text-xs italic">No {type}s added yet.</p>
          </div>
        )}
      </div>

      <Dialog open={isMediaModalOpen} onOpenChange={setIsMediaModalOpen}>
        <DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="max-w-md p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle>{editingMedia ? 'Edit' : 'Add'} {type === 'image' ? 'Image' : 'Video'} Link</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleMediaSubmit} className="p-6 space-y-4">
            <div className="space-y-2">
              <Label>Media Link (URL)</Label>
              <Input name="url" defaultValue={editingMedia?.data?.url || ''} placeholder="https://..." required />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea name="description" defaultValue={editingMedia?.data?.description || ''} placeholder="Enter a brief description..." className="min-h-[100px]" />
            </div>
            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsMediaModalOpen(false)}>Cancel</Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={lightboxIndex !== null} onOpenChange={() => setLightboxIndex(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/95 border-none">
          <div className="relative flex flex-col h-[80vh]">
            <div className="flex-1 relative flex items-center justify-center p-4">
              {lightboxIndex !== null && fields[lightboxIndex] && (
                <>
                  {type === 'image' ? (
                    <img
                      src={fields[lightboxIndex].url}
                      alt={fields[lightboxIndex].description || ''}
                      className="max-w-full max-h-full object-contain shadow-2xl"
                    />
                  ) : (
                    <div className="w-full aspect-video bg-black flex items-center justify-center overflow-hidden rounded-lg shadow-2xl">
                      {getEmbedUrl(fields[lightboxIndex].url) ? (
                        <iframe
                          src={getEmbedUrl(fields[lightboxIndex].url)}
                          className="w-full h-full border-none"
                          allowFullScreen
                        />
                      ) : (
                        <video
                          src={fields[lightboxIndex].url}
                          controls
                          className="w-full h-full"
                        />
                      )}
                    </div>
                  )}
                </>
              )}

              {fields.length > 1 && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute left-4 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white"
                    onClick={() => setLightboxIndex(prev => (prev! - 1 + fields.length) % fields.length)}
                  >
                    <ChevronLeft className="h-8 w-8" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-4 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white"
                    onClick={() => setLightboxIndex(prev => (prev! + 1) % fields.length)}
                  >
                    <ChevronRight className="h-8 w-8" />
                  </Button>
                </>
              )}
            </div>
            {lightboxIndex !== null && fields[lightboxIndex]?.description && (
              <div className="p-6 bg-black/80 text-white border-t border-white/10">
                <p className="text-sm font-medium">{fields[lightboxIndex].description}</p>
              </div>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 text-white/70 hover:text-white"
              onClick={() => setLightboxIndex(null)}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
