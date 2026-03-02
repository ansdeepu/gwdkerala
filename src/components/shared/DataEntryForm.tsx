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
import { Loader2, Trash2, PlusCircle, X, Save, Clock, Eye, ArrowUpDown, Copy, Info, ImagePlus, Video, ChevronLeft, ChevronRight } from "lucide-react";
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
  type ReappropriationDetailFormData,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const createDefaultRemittanceDetail = (): RemittanceDetailFormData => ({ amountRemitted: undefined, dateOfRemittance: "", remittedAccount: "Bank", remittanceRemarks: "" });
const createDefaultReappropriationDetail = (): ReappropriationDetailFormData => ({ type: "Outward", refFileNo: "", amount: undefined, date: "", remarks: "", pageType: "Deposit Work", fileDetails: "" });
const createDefaultPaymentDetail = (): PaymentDetailFormData => ({ dateOfPayment: "", paymentAccount: "Bank", revenueHead: undefined, contractorsPayment: undefined, gst: undefined, incomeTax: undefined, kbcwb: undefined, refundToParty: undefined, totalPaymentPerEntry: 0, paymentRemarks: "" });
const createDefaultSiteDetail = (): z.infer<typeof SiteDetailSchema> => ({ nameOfSite: "", localSelfGovt: "", constituency: undefined, latitude: undefined, longitude: undefined, purpose: undefined, estimateAmount: undefined, remittedAmount: undefined, siteConditions: undefined, tsAmount: undefined, tenderNo: "", diameter: undefined, totalDepth: undefined, casingPipeUsed: "", outerCasingPipe: "", innerCasingPipe: "", yieldDischarge: "", zoneDetails: "", waterLevel: "", drillingRemarks: "", developingRemarks: "", schemeRemarks: "", pumpDetails: "", waterTankCapacity: "", noOfTapConnections: undefined, noOfBeneficiary: "", dateOfCompletion: "", typeOfRig: undefined, contractorName: "", supervisorUid: undefined, supervisorName: undefined, supervisorDesignation: undefined, totalExpenditure: undefined, workStatus: undefined, workRemarks: "", surveyOB: "", surveyLocation: "", surveyRemarks: "", surveyRecommendedDiameter: "", surveyRecommendedTD: "", surveyRecommendedOB: "", surveyRecommendedCasingPipe: "", surveyRecommendedPlainPipe: "", surveyRecommendedSlottedPipe: "", surveyRecommendedMsCasingPipe: "", arsTypeOfScheme: undefined, arsPanchayath: undefined, arsBlock: undefined, arsAsTsDetails: undefined, arsSanctionedDate: "", arsTenderedAmount: undefined, arsAwardedAmount: undefined, arsNumberOfStructures: undefined, arsStorageCapacity: undefined, arsNumberOfFillings: undefined, isArsImport: false, pilotDrillingDepth: "", pumpingLineLength: "", deliveryLineLength: "", implementationRemarks: "", workImages: [], workVideos: [] });


const calculatePaymentEntryTotalGlobal = (payment: PaymentDetailFormData | undefined): number => {
  if (!payment) return 0;
  return (Number(payment.revenueHead) || 0) + (Number(payment.contractorsPayment) || 0) + (Number(payment.gst) || 0) + (Number(payment.incomeTax) || 0) + (Number(payment.kbcwb) || 0);
};

const PURPOSES_REQUIRING_DIAMETER: SitePurpose[] = ["BWC", "TWC", "FPW", "BW Dev", "TW Dev", "FPW Dev"];
const PURPOSES_REQUIRING_RIG_ACCESSIBILITY: SitePurpose[] = ["BWC", "TWC", "FPW", "BW Dev", "TW Dev", "FPW Dev"];
const FINAL_WORK_STATUSES: SiteWorkStatus[] = ['Work Failed', 'Work Completed'];
const SUPERVISOR_ONGOING_STATUSES: SiteWorkStatus[] = ["Work Order Issued", "Work in Progress", "Work Initiated", "Awaiting Dept. Rig"];
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
    workTypeContext: 'public' | 'private' | 'collector' | 'planFund' | null;
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
        <div className="p-6 pt-4 space-y-4 flex-1">
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
        return remittedAccountOptions.filter(o => o !== 'Plan Fund');
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

const SiteDialogContent = ({ initialData, onConfirm, onCancel, supervisorList, isReadOnly, isSupervisor, allLsgConstituencyMaps, allE_tenders }: { initialData: any, onConfirm: (data: any) => void, onCancel: () => void, supervisorList: any[], isReadOnly: boolean, isSupervisor: boolean, allLsgConstituencyMaps: any[], allE_tenders: any[] }) => {
    const { toast } = useToast();
    const defaults = useMemo(() => {
        const d = initialData?.nameOfSite ? initialData : createDefaultSiteDetail();
        if (d.workImages) {
            d.workImages = d.workImages.map((img: any) => ({ ...img, id: img.id || uuidv4() }));
        }
        if (d.workVideos) {
            d.workVideos = d.workVideos.map((vid: any) => ({ ...vid, id: vid.id || uuidv4() }));
        }
        return d;
    }, [initialData]);

    const form = useForm<SiteDetailFormData>({
      resolver: zodResolver(SiteDetailSchema),
      defaultValues: { 
        ...defaults, 
        dateOfCompletion: formatDateForInput(defaults.dateOfCompletion),
        workImages: defaults.workImages || [],
        workVideos: defaults.workVideos || []
      },
    });
    
    const { control, setValue, trigger, watch, handleSubmit, getValues } = form;

    const { fields: imageFields, append: appendImage, remove: removeImage, update: updateImage } = useFieldArray({ control, name: "workImages" });
    const { fields: videoFields, append: appendVideo, remove: removeVideo, update: updateVideo } = useFieldArray({ control, name: "workVideos" });

    const watchedLsg = watch("localSelfGovt");
    const watchedPurpose = watch('purpose');
    const watchedWorkStatus = watch('workStatus');
    const watchedTenderNo = watch('tenderNo');
    const isCompletionDateRequired = watchedWorkStatus && FINAL_WORK_STATUSES.includes(watchedWorkStatus as SiteWorkStatus);
    
    const wellConstructionPurposes: SitePurpose[] = ["BWC", "TWC", "FPW"];
    const isDrillingPurpose = wellConstructionPurposes.includes(watchedPurpose as SitePurpose);
    const wellDevelopmentPurposes: SitePurpose[] = ["BW Dev", "TW Dev", "FPW Dev"];
    const isDevelopingPurpose = wellDevelopmentPurposes.includes(watchedPurpose as SitePurpose);
    
    const isSchemePurpose = !isDrillingPurpose && !isDevelopingPurpose && watchedPurpose;
    const isMWSSSchemePurpose = ['MWSS', 'MWSS Ext', 'Pumping Scheme', 'MWSS Pump Reno'].includes(watchedPurpose as SitePurpose);
    const isHPSPurpose = ['HPS', 'HPR'].includes(watchedPurpose as SitePurpose);
    const isARSPurpose = ['ARS'].includes(watchedPurpose as SitePurpose);


    const handleDialogSubmit = (data: SiteDetailFormData) => {
        onConfirm(data);
    };

    const handleDialogError = (errors: FieldErrors<SiteDetailFormData>) => {
        console.error("Site Dialog Validation Errors:", errors);
        const messages = getFormattedErrorMessages(errors);
        toast({
            title: "Validation Error",
            description: (
                <ul className="list-disc pl-4 text-xs mt-1">
                    {messages.map((m, i) => <li key={i}>{m}</li>)}
                </ul>
            ),
            variant: "destructive"
        });
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

    const siteConditionOptionsForPurpose = useMemo(() => {
        if (watchedPurpose && PURPOSES_REQUIRING_RIG_ACCESSIBILITY.includes(watchedPurpose as SitePurpose)) {
            return siteConditionsOptions;
        }
        return ['Land Dispute', 'Work Disputes and Conflicts'];
    }, [watchedPurpose]);
    
    const isFieldReadOnly = (isSupervisorEditable: boolean) => {
        if (isReadOnly) return true;
        if (isSupervisor) return !isSupervisorEditable;
        return false;
    };
    
    const sortedTenders = useMemo(() => {
        return [...allE_tenders].sort((a, b) => {
            const dateA = toDateOrNull(a.tenderDate)?.getTime() ?? 0;
            const dateB = b.tenderDate instanceof Date ? b.tenderDate.getTime() : (typeof b.tenderDate === 'string' ? new Date(b.tenderDate).getTime() : 0);
            if (dateA !== dateB) return dateB - (dateA || 0);

            const getTenderNumber = (tenderNo: string | undefined | null): number => {
                if (!tenderNo) return 0;
                const match = tenderNo.match(/T-(\d+)/);
                return match ? parseInt(match[1], 10) : 0;
            };

            const numA = getTenderNumber(a.eTenderNo);
            const numB = getTenderNumber(b.eTenderNo);
            return numB - numA;
        });
    }, [allE_tenders]);
    
    const staffMap = useMemo(() => {
        const map = new Map<string, StaffMember & { uid: string }>();
        supervisorList.forEach(item => map.set(item.id, item));
        return map;
    }, [supervisorList]);

    const tenderSupervisors = useMemo(() => {
        if (!watchedTenderNo) return [];
        const tender = allE_tenders.find(t => t.eTenderNo === watchedTenderNo);
        if (!tender) return [];

        const supervisors: { id: string; name: string; designation?: string }[] = [];
        const addedUids = new Set<string>();

        const addSupervisor = (staffId: string | null | undefined) => {
            if (!staffId || addedUids.has(staffId)) return;
            const supervisorUser = staffMap.get(staffId);
            if (supervisorUser) {
                supervisors.push({ id: supervisorUser.uid, name: supervisorUser.name, designation: supervisorUser.designation });
                addedUids.add(staffId);
            }
        };

        if (tender.nameOfAssistantEngineer) {
            const ae = Array.from(staffMap.values()).find(s => s.name === tender.nameOfAssistantEngineer);
            if (ae) addSupervisor(ae.id);
        }
        addSupervisor(tender.supervisor1Id);
        addSupervisor(tender.supervisor2Id);
        addSupervisor(tender.supervisor3Id);

        return supervisors;
    }, [watchedTenderNo, allE_tenders, staffMap]);

    useEffect(() => {
        const selectedTender = allE_tenders.find(t => t.eTenderNo === watchedTenderNo);
        if (selectedTender) {
            const validBidders = (selectedTender.bidders || []).filter((b: Bidder) => typeof b.quotedAmount === 'number' && b.quotedAmount > 0);
            const l1Bidder = validBidders.length > 0 
                ? validBidders.reduce((lowest: Bidder, current: Bidder) => (lowest.quotedAmount! < current.quotedAmount!) ? lowest : current)
                : null;
            setValue('contractorName', l1Bidder ? `${l1Bidder.name}, ${l1Bidder.address}` : '');

            if (tenderSupervisors.length === 1) {
                const supervisor = tenderSupervisors[0];
                setValue('supervisorUid', supervisor.id);
                setValue('supervisorName', supervisor.name);
                setValue('supervisorDesignation', supervisor.designation);
            } else {
                setValue('supervisorUid', undefined);
                setValue('supervisorName', '');
                setValue('supervisorDesignation', undefined);
            }
        }
    }, [watchedTenderNo, allE_tenders, setValue, tenderSupervisors]);

    const handleSupervisorChange = (uid: string) => {
        const staff = supervisorList.find(s => s.uid === uid);
        setValue('supervisorUid', uid);
        setValue('supervisorName', staff?.name || '');
        setValue('supervisorDesignation', staff?.designation as string || undefined);
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <DialogHeader className="p-6 pb-4 shrink-0">
                <DialogTitle>{initialData?.nameOfSite ? "Edit Site Details" : "Add New Site"}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 min-h-0">
                <ScrollArea className="h-full px-6 py-4">
                    <Form {...form}>
                        <form
                          id="site-dialog-form"
                          onSubmit={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleSubmit(handleDialogSubmit, handleDialogError)(e);
                          }}
                          className="space-y-4"
                        >
                            <Card><CardHeader><CardTitle>Main Details</CardTitle></CardHeader><CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField name="nameOfSite" control={control} render={({ field }) => <FormItem><FormLabel>Name of Site <span className="text-destructive">*</span></FormLabel><FormControl><Input {...field} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage /></FormItem>} />
                            <FormField name="purpose" control={control} render={({ field }) => <FormItem><FormLabel>Purpose <span className="text-destructive">*</span></FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isFieldReadOnly(false)}><FormControl><SelectTrigger><SelectValue placeholder="Select Purpose" /></SelectTrigger></FormControl><SelectContent><SelectItem value="_clear_" onSelect={(e) => { e.preventDefault(); field.onChange(undefined); }}>-- Clear Selection --</SelectItem>{sitePurposeOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
                            <FormField name="localSelfGovt" control={control} render={({ field }) => <FormItem><FormLabel>Local Self Govt.</FormLabel>{isFieldReadOnly(false) ? (<FormControl><Input {...field} value={field.value || ''} readOnly /></FormControl>) : (<Select onValueChange={(value) => handleLsgChange(value)} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select LSG"/></SelectTrigger></FormControl><SelectContent className="max-h-80"><SelectItem value="_clear_" onSelect={(e) => { e.preventDefault(); field.onChange(undefined); }}>-- Clear Selection --</SelectItem>{sortedLsgMaps.map(map => <SelectItem key={map.id} value={map.name}>{map.name}</SelectItem>)}</SelectContent></Select>)}<FormMessage/></FormItem>} />
                            <FormField name="constituency" control={control} render={({ field }) => <FormItem><FormLabel>Constituency (LAC)</FormLabel>{isFieldReadOnly(false) ? (<FormControl><Input {...field} value={field.value || ''} readOnly /></FormControl>) : (
                                <Select onValueChange={field.onChange} value={field.value} disabled={constituencyOptionsForLsg.length <= 1}><FormControl><SelectTrigger><SelectValue placeholder="Select Constituency"/></SelectTrigger></FormControl><SelectContent><SelectItem value="_clear_" onSelect={(e) => { e.preventDefault(); field.onChange(undefined); }}>-- Clear Selection --</SelectItem>{constituencyOptionsForLsg.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
                            )}<FormMessage/></FormItem>} />
                            <FormField name="latitude" control={control} render={({ field }) => <FormItem><FormLabel>Latitude</FormLabel><FormControl><Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isFieldReadOnly(true)} /></FormControl><FormMessage /></FormItem>} />
                            <FormField name="longitude" control={control} render={({ field }) => <FormItem><FormLabel>Longitude</FormLabel><FormControl><Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isFieldReadOnly(true)} /></FormControl><FormMessage /></FormItem>} />
                        </div>
                            </CardContent></Card>
                            
                           {isDrillingPurpose && (
                                <Card><CardHeader><CardTitle>Survey Details (Recommended)</CardTitle></CardHeader><CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <FormField name="surveyRecommendedDiameter" control={control} render={({ field }) => <FormItem><FormLabel>Diameter (mm)</FormLabel><Select onValueChange={field.onChange} value={field.value || ""} disabled={isFieldReadOnly(false)}><FormControl><SelectTrigger><SelectValue placeholder="Select Diameter" /></SelectTrigger></FormControl><SelectContent><SelectItem value="_clear_" onSelect={(e) => { e.preventDefault(); field.onChange(undefined); }}>-- Clear Selection --</SelectItem>{siteDiameterOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
                                        <FormField name="surveyRecommendedTD" control={control} render={({ field }) => <FormItem><FormLabel>Total Depth (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage /></FormItem>} />
                                        {watchedPurpose === 'BWC' && <FormField name="surveyRecommendedOB" control={control} render={({ field }) => <FormItem><FormLabel>OB (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage /></FormItem>} />}
                                        {watchedPurpose === 'BWC' && <FormField name="surveyRecommendedCasingPipe" control={control} render={({ field }) => <FormItem><FormLabel>Casing Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage /></FormItem>} />}
                                        {watchedPurpose === 'TWC' && <FormField name="surveyRecommendedPlainPipe" control={control} render={({ field }) => <FormItem><FormLabel>Plain Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage /></FormItem>} />}
                                        {watchedPurpose === 'TWC' && <FormField name="surveyRecommendedSlottedPipe" control={control} render={({ field }) => <FormItem><FormLabel>Slotted Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage /></FormItem>} />}
                                        {watchedPurpose === 'TWC' && <FormField name="surveyRecommendedMsCasingPipe" control={control} render={({ field }) => <FormItem><FormLabel>MS Casing Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage /></FormItem>} />}
                                        {watchedPurpose === 'FPW' && <FormField name="surveyRecommendedCasingPipe" control={control} render={({ field }) => <FormItem><FormLabel>Casing Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage /></FormItem>} />}
                                        <FormField name="surveyLocation" control={control} render={({ field }) => <FormItem><FormLabel>Survey Location</FormLabel><FormControl><Textarea {...field} value={field.value || ''} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage /></FormItem>} />
                                        <FormField name="surveyRemarks" control={control} render={({ field }) => <FormItem><FormLabel>Survey Remarks</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage /></FormItem>} />
                                    </div>
                                </CardContent></Card>
                            )}

                            <Card><CardHeader><CardTitle>Work Implementation</CardTitle></CardHeader><CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                   <FormField name="siteConditions" control={control} render={({ field }) => <FormItem><FormLabel>{PURPOSES_REQUIRING_RIG_ACCESSIBILITY.includes(watchedPurpose as SitePurpose) ? "Rig and Site Accessibility" : "Site Conditions"}</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isFieldReadOnly(false)}><FormControl><SelectTrigger><SelectValue placeholder="Select Condition" /></SelectTrigger></FormControl><SelectContent><SelectItem value="_clear_" onSelect={(e) => { e.preventDefault(); field.onChange(undefined); }}>-- Clear Selection --</SelectItem>{siteConditionOptionsForPurpose.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
                                   <FormField name="estimateAmount" control={control} render={({ field }) => <FormItem><FormLabel>Estimate Amount (₹)</FormLabel><FormControl><Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage /></FormItem>} />
                                   <FormField name="remittedAmount" control={control} render={({ field }) => <FormItem><FormLabel>Remitted Amount (₹)</FormLabel><FormControl><Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage /></FormItem>} />
                                   <FormField name="tsAmount" control={control} render={({ field }) => <FormItem><FormLabel>TS Amount (₹)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage /></FormItem>} />
                                   <FormField name="tenderNo" control={control} render={({ field }) => ( <FormItem> <FormLabel>Tender No.</FormLabel> <Select onValueChange={(value) => field.onChange(value === '_clear_' ? '' : value)} value={field.value || ''} disabled={isFieldReadOnly(false)}> <FormControl><SelectTrigger><SelectValue placeholder="Select a Tender" /></SelectTrigger></FormControl> <SelectContent className="max-h-80"> <SelectItem value="_clear_" onSelect={(e) => { e.preventDefault(); field.onChange(''); }}>-- Clear Selection --</SelectItem> {sortedTenders.filter(t => t.eTenderNo).map(t => ( <SelectItem key={t.id} value={t.eTenderNo!}>{t.eTenderNo}</SelectItem> ))} </SelectContent> </Select> <FormMessage /> </FormItem> )} />
                                   <FormField name="contractorName" control={control} render={({ field }) => <FormItem><FormLabel>Contractor</FormLabel><FormControl><Textarea {...field} value={field.value || ''} readOnly className="bg-muted min-h-[40px]"/></FormControl><FormMessage/></FormItem>} />
                                   {tenderSupervisors.length > 1 ? (
                                        <FormField name="supervisorUid" control={form.control} render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Supervisor</FormLabel>
                                                <Select onValueChange={(uid) => handleSupervisorChange(uid)} value={field.value || ""}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a Supervisor" /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        {tenderSupervisors.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name} ({s.designation})</SelectItem>))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}/>
                                    ) : (
                                      <FormItem>
                                        <FormLabel>Supervisor</FormLabel>
                                        <FormControl>
                                          <Textarea value={getValues('supervisorName') ? `${getValues('supervisorName')}, ${getValues('supervisorDesignation') || ''}` : ''} readOnly className="bg-muted min-h-[40px]" />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                   <FormField name="implementationRemarks" control={control} render={({ field }) => <FormItem><FormLabel>Implementation Remarks</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} readOnly={isFieldReadOnly(true)} /></FormControl><FormMessage /></FormItem>} />
                                </div>
                            </CardContent></Card>
                            
                           {isDevelopingPurpose && (
                                <Card>
                                    <CardHeader><CardTitle>Developing Details</CardTitle></CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <FormField name="diameter" control={control} render={({ field }) => <FormItem><FormLabel>Actual Diameter {PURPOSES_REQUIRING_DIAMETER.includes(watchedPurpose as SitePurpose) && <span className="text-destructive">*</span>}</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isFieldReadOnly(true)}><FormControl><SelectTrigger><SelectValue placeholder="Select Diameter" /></SelectTrigger></FormControl><SelectContent><SelectItem value="_clear_" onSelect={(e) => { e.preventDefault(); field.onChange(undefined); }}>-- Clear Selection --</SelectItem>{siteDiameterOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
                                            <FormField name="totalDepth" control={control} render={({ field }) => <FormItem><FormLabel>Total Depth (m)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isFieldReadOnly(true)} /></FormControl><FormMessage /></FormItem>} />
                                            <FormField name="yieldDischarge" control={control} render={({ field }) => <FormItem><FormLabel>Yield (LPH)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)} /></FormControl><FormMessage /></FormItem>} />
                                            <FormField name="waterLevel" control={control} render={({ field }) => <FormItem><FormLabel>Static Water (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)} /></FormControl><FormMessage /></FormItem>} />
                                            <FormField name="developingRemarks" control={control} render={({ field }) => <FormItem><FormLabel>Developing Remarks</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} readOnly={isFieldReadOnly(true)} /></FormControl><FormMessage /></FormItem>} />
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {isDrillingPurpose && (
                               <Card>
                                    <CardHeader><CardTitle>Drilling Details (Actuals)</CardTitle></CardHeader><CardContent className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <FormField name="diameter" control={control} render={({field}) => <FormItem><FormLabel>Actual Diameter {PURPOSES_REQUIRING_DIAMETER.includes(watchedPurpose as SitePurpose) && <span className="text-destructive">*</span>}</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isFieldReadOnly(true)}><FormControl><SelectTrigger><SelectValue placeholder="Select Diameter"/></SelectTrigger></FormControl><SelectContent><SelectItem value="_clear_" onSelect={(e) => { e.preventDefault(); field.onChange(undefined); }}>-- Clear Selection --</SelectItem>{siteDiameterOptions.map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>}/>
                                            {watchedPurpose === 'TWC' && <FormField name="pilotDrillingDepth" control={control} render={({field})=> <FormItem><FormLabel>Pilot Drilling (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage/></FormItem>} />}
                                            <FormField name="totalDepth" control={control} render={({field})=> <FormItem><FormLabel>Actual TD (m)</FormLabel><FormControl><Input type="number" {...field} onChange={e=>field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isFieldReadOnly(true)} /></FormControl><FormMessage/></FormItem>} />
                                            {watchedPurpose === 'BWC' && <FormField name="surveyOB" control={control} render={({field})=> <FormItem><FormLabel>Actual OB (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage/></FormItem>} />}
                                            {watchedPurpose !== 'TWC' && <FormField name="casingPipeUsed" control={control} render={({field})=> <FormItem><FormLabel>Casing Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage/></FormItem>} />}
                                            {watchedPurpose === 'BWC' && <FormField name="outerCasingPipe" control={control} render={({field})=> <FormItem><FormLabel>Outer Casing (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage/></FormItem>} />}
                                            {watchedPurpose === 'BWC' && <FormField name="innerCasingPipe" control={control} render={({field})=> <FormItem><FormLabel>Inner Casing (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage/></FormItem>} />}
                                            {watchedPurpose === 'TWC' && <FormField name="surveyPlainPipe" control={control} render={({field})=> <FormItem><FormLabel>Plain Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage/></FormItem>} />}
                                            {watchedPurpose === 'TWC' && <FormField name="surveySlottedPipe" control={control} render={({field})=> <FormItem><FormLabel>Slotted Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage/></FormItem>} />}
                                            {watchedPurpose === 'TWC' && <FormField name="outerCasingPipe" control={control} render={({field})=> <FormItem><FormLabel>MS Casing Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage/></FormItem>} />}
                                            <FormField name="yieldDischarge" control={control} render={({field})=> <FormItem><FormLabel>Yield (LPH)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage/></FormItem>} />
                                            <FormField name="zoneDetails" control={control} render={({ field }) => <FormItem><FormLabel>Zone Details (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)} /></FormControl><FormMessage /></FormItem>} />
                                            <FormField name="waterLevel" control={control} render={({field})=> <FormItem><FormLabel>Static Water (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage/></FormItem>} />
                                            <FormField name="typeOfRig" control={control} render={({field})=> <FormItem><FormLabel>Type of Rig</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isFieldReadOnly(true)}><FormControl><SelectTrigger><SelectValue placeholder="Select Rig Type"/></SelectTrigger></FormControl><SelectContent><SelectItem value="_clear_" onSelect={(e) => { e.preventDefault(); field.onChange(undefined); }}>-- Clear Selection --</SelectItem>{siteTypeOfRigOptions.map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>} />
                                            <FormField name="drillingRemarks" control={control} render={({ field }) => <FormItem><FormLabel>Drilling Remarks</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} readOnly={isFieldReadOnly(true)} /></FormControl><FormMessage /></FormItem>} />
                                        </div>
                                    </CardContent></Card>
                            )}

                            {isSchemePurpose && (
                                <Card>
                                    <CardHeader><CardTitle>Scheme Details</CardTitle></CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {isMWSSSchemePurpose && <>
                                                <FormField name="yieldDischarge" control={control} render={({field})=> <FormItem><FormLabel>Well Discharge (LPH)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage/></FormItem>} />
                                                <FormField name="pumpDetails" control={control} render={({ field }) => <FormItem><FormLabel>Pump Details</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} readOnly={isFieldReadOnly(true)} /></FormControl><FormMessage /></FormItem>} />
                                                <FormField name="pumpingLineLength" control={control} render={({field})=> <FormItem><FormLabel>Pumping Line (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage/></FormItem>} />
                                                <FormField name="deliveryLineLength" control={control} render={({field})=> <FormItem><FormLabel>Delivery Line (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage/></FormItem>} />
                                                <FormField name="waterTankCapacity" control={control} render={({field})=> <FormItem><FormLabel>Tank Capacity (L)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage/></FormItem>} />
                                                <FormField name="noOfTapConnections" control={control} render={({field})=> <FormItem><FormLabel># Taps</FormLabel><FormControl><Input type="number" {...field} onChange={e=>field.onChange(e.target.value==='' ? undefined : +e.target.value)} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage/></FormItem>} />
                                            </>}
                                            {isHPSPurpose && <>
                                                <FormField name="totalDepth" control={control} render={({field})=> <FormItem><FormLabel>Depth Erected (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage/></FormItem>} />
                                                <FormField name="waterLevel" control={control} render={({field})=> <FormItem><FormLabel>Water Level (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage/></FormItem>} />
                                            </>}
                                           {isARSPurpose && <>
                                                <FormField name="arsNumberOfStructures" control={control} render={({field})=> <FormItem><FormLabel>Number of Structures</FormLabel><FormControl><Input type="number" {...field} onChange={e=>field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage/></FormItem>} />
                                                <FormField name="arsStorageCapacity" control={control} render={({field})=> <FormItem><FormLabel>Storage Capacity (m³)</FormLabel><FormControl><Input type="number" {...field} onChange={e=>field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage/></FormItem>} />
                                                <FormField name="arsNumberOfFillings" control={control} render={({field})=> <FormItem><FormLabel>Number of Fillings</FormLabel><FormControl><Input type="number" {...field} onChange={e=>field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage/></FormItem>} />
                                            </>}

                                            <FormField name="noOfBeneficiary" control={control} render={({field})=> <FormItem><FormLabel># Beneficiaries</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage/></FormItem>} />
                                            <FormField name="schemeRemarks" control={control} render={({ field }) => <FormItem><FormLabel>Scheme Remarks</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} readOnly={isFieldReadOnly(true)} /></FormControl><FormMessage /></FormItem>} />
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            <Card>
                                <CardHeader><CardTitle>Work Status</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <FormField name="workStatus" control={control} render={({ field }) => <FormItem><FormLabel>Work Status <span className="text-destructive">*</span></FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isFieldReadOnly(true)}><FormControl><SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger></FormControl><SelectContent className="max-h-80"><SelectItem value="_clear_" onSelect={(e) => { e.preventDefault(); field.onChange(undefined); }}>-- Clear Selection --</SelectItem>{(isSupervisor ? SUPERVISOR_ONGOING_STATUSES : SITE_DIALOG_WORK_STATUS_OPTIONS).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
                                        <FormField name="dateOfCompletion" control={control} render={({ field }) => <FormItem><FormLabel>Completion Date {isCompletionDateRequired && <span className="text-destructive">*</span>}</FormLabel><FormControl><Input type="date" {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)} /></FormControl><FormMessage /></FormItem>} />
                                        {!isSupervisor && <FormField name="totalExpenditure" control={control} render={({ field }) => <FormItem><FormLabel>Total Expenditure (₹)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage /></FormItem>} />}
                                        <FormField name="workRemarks" control={control} render={({ field }) => <FormItem><FormLabel>Work Remarks</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} readOnly={isFieldReadOnly(true)} /></FormControl><FormMessage /></FormItem>} />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
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

                            <DialogFooter className="p-6 pt-4 shrink-0 border-t">
                                <Button variant="outline" type="button" onClick={onCancel}>{isReadOnly ? 'Close' : 'Cancel'}</Button>
                                {!isReadOnly && <Button type="submit" form="site-dialog-form">Save</Button>}
                            </DialogFooter>
                        </form>
                    </Form>
                </ScrollArea>
            </div>
        </div>
    );
};

export default function DataEntryFormComponent({ fileNoToEdit, initialData, supervisorList, userRole, workTypeContext, returnPath, pageToReturnTo, isFormDisabled = false }: DataEntryFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileIdToEdit = searchParams.get("id");
  const approveUpdateId = searchParams.get("approveUpdateId");

  const { addFileEntry, updateFileEntry } = useFileEntries();
  const { createPendingUpdate } = usePendingUpdates();
  const { toast } = useToast();
  const { user } = useAuth();
  const { allFileEntries, allLsgConstituencyMaps, allE_tenders } = useDataStore();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeAccordionItem, setActiveAccordionItem] = useState<string | undefined>(undefined);
  const [dialogState, setDialogState] = useState<{ type: null | 'application' | 'remittance' | 'reappropriation' | 'payment' | 'site' | 'reorderSite' | 'viewSite'; data: any, isView?: boolean }>({ type: null, data: null, isView: false });
  const [itemToDelete, setItemToDelete] = useState<{ type: 'remittance' | 'reappropriation' | 'payment' | 'site'; index: number } | null>(null);

  const isEditor = userRole === 'admin' || userRole === 'scientist' || userRole === 'engineer';
  const isSupervisor = userRole === 'supervisor';
  const isViewer = userRole === 'viewer';
  const isEditing = !!fileIdToEdit;

  const isDeferredFunding = useMemo(() => {
    const type = watch('applicationType');
    return !!type && (PLAN_FUND_APPLICATION_TYPES.includes(type as any) || COLLECTOR_APPLICATION_TYPES.includes(type as any));
  }, [watch]);

  const remittanceTitle = isDeferredFunding ? "2. Administrative Sanction" : "2. Remittance Details";
  const pageTitle = isDeferredFunding ? 'Deferred Works' : 'Deposit Work';
  
  const form = useForm<DataEntryFormData>({ resolver: zodResolver(DataEntrySchema), defaultValues: initialData });
  const { control, handleSubmit, setValue, getValues, watch } = form;
  
  const currentFileNo = watch("fileNo");

  const autoCredits = useMemo(() => {
    if (!currentFileNo) return [];
    const normalizedFileNo = currentFileNo.toLowerCase().trim();
    const credits: any[] = [];
    allFileEntries.forEach(entry => {
        if (entry.fileNo?.toLowerCase().trim() === normalizedFileNo) return;
        entry.reappropriationDetails?.forEach(reapp => {
            if (reapp.refFileNo?.toLowerCase().trim() === normalizedFileNo) {
                const hasInvestigation = entry.siteDetails?.some(s => s.purpose === 'GW Investigation');
                const hasLoggingPumping = entry.siteDetails?.some(s => s.purpose && LOGGING_PUMPING_TEST_PURPOSE_OPTIONS.includes(s.purpose as any));
                let sourcePageType = "Deposit Work";
                if (hasInvestigation && !hasLoggingPumping) sourcePageType = "GW Investigation";
                else if (hasLoggingPumping && !hasInvestigation) sourcePageType = "Logging & Pumping Test";

                credits.push({
                    ...reapp,
                    sourceFileNo: entry.fileNo,
                    sourceApplicantName: entry.applicantName,
                    sourcePageType: sourcePageType
                });
            }
        });
    });
    return credits;
  }, [currentFileNo, allFileEntries]);

  const { fields: remittanceFields, append: appendRemittance, remove: removeRemittance, update: updateRemittance } = useFieldArray({ control, name: "remittanceDetails" });
  const { fields: reappropriationFields, append: appendReappropriation, remove: removeReappropriation, update: updateReappropriation } = useFieldArray({ control, name: "reappropriationDetails" });
  const { fields: siteFields, append: appendSite, remove: removeSite, update: updateSite, move: moveSite } = useFieldArray({ control, name: "siteDetails" });
  const { fields: paymentFields, append: appendPayment, remove: removePayment, update: updatePayment } = useFieldArray({ control, name: "paymentDetails" });

  const watchedRemittanceDetails = watch("remittanceDetails");
  const watchedReappropriationDetails = watch("reappropriationDetails");
  const watchedPaymentDetails = watch("paymentDetails");

  const sortedCombinedReappropriations = useMemo(() => {
    const manual = reappropriationFields.map((field, index) => ({
        ...field,
        _originalIndex: index,
        _source: 'manual' as const,
        dateObj: toDateOrNull(field.date)
    }));
    const auto = autoCredits.map((credit) => ({
        ...credit,
        _source: 'auto' as const,
        dateObj: toDateOrNull(credit.date)
    }));
    return [...manual, ...auto].sort((a, b) => {
        const timeA = a.dateObj?.getTime() ?? 0;
        const timeB = b.dateObj?.getTime() ?? 0;
        return timeB - timeA; 
    });
  }, [reappropriationFields, autoCredits]);

  useEffect(() => {
    const totalRemittance = watchedRemittanceDetails?.reduce((sum, item) => {
        return sum + (Number(item.amountRemitted) || 0);
    }, 0) || 0;
    setValue("totalRemittance", totalRemittance);

    const totalReappDebit = watchedReappropriationDetails?.reduce((sum, item) => {
        return sum + (Number(item.amount) || 0);
    }, 0) || 0;
    setValue("totalReappropriation", totalReappDebit);

    const totalReappCredit = autoCredits.reduce((sum, item) => {
        return sum + (Number(item.amount) || 0);
    }, 0);
    setValue("totalReappropriationCredit", totalReappCredit);

    const spendableRemittance = watchedRemittanceDetails?.reduce((sum, item) => {
        if (item.remittedAccount !== 'Revenue Head') {
            return sum + (Number(item.amountRemitted) || 0);
        }
        return sum;
    }, 0) || 0;
    
    const totalPayment = watchedPaymentDetails?.reduce((sum, item) => sum + calculatePaymentEntryTotalGlobal(item), 0) || 0;
    setValue("totalPaymentAllEntries", totalPayment);

    setValue("overallBalance", spendableRemittance + totalReappCredit - totalPayment - totalReappDebit);
    
  }, [watchedRemittanceDetails, watchedReappropriationDetails, watchedPaymentDetails, autoCredits, setValue]);

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

  const openDialog = (type: 'application' | 'remittance' | 'reappropriation' | 'payment' | 'site' | 'reorderSite' | 'viewSite', data: any, isView: boolean = false) => setDialogState({ type, data, isView });
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
    } else if (type === 'remittance') {
        const remittanceData = data as RemittanceDetailFormData;
        if (originalData.index !== undefined) {
            updateRemittance(originalData.index, remittanceData);
        } else {
            appendRemittance(remittanceData);
            if (remittanceData.remittedAccount === 'Revenue Head' && remittanceData.amountRemitted && remittanceData.amountRemitted > 0) {
                const newPaymentEntry: PaymentDetailFormData = {
                    dateOfPayment: remittanceData.dateOfRemittance,
                    paymentAccount: "Bank",
                    revenueHead: remittanceData.amountRemitted,
                    totalPaymentPerEntry: calculatePaymentEntryTotalGlobal({ revenueHead: remittanceData.amountRemitted }),
                    paymentRemarks: "Auto-entry for remittance to Revenue Head.",
                };
                appendPayment(newPaymentEntry);
                toast({ title: "Payment Entry Added", description: "An automatic payment entry was created for the Revenue Head remittance." });
            }
        }
    } else if (type === 'reappropriation') {
        if (originalData.index !== undefined) {
            updateReappropriation(originalData.index, data);
        } else {
            appendReappropriation(data);
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
    if (type === 'remittance') removeRemittance(index); 
    else if (type === 'reappropriation') removeReappropriation(index);
    else if (type === 'payment') removePayment(index); 
    else if (type === 'site') removeSite(index);
    if (isEditor && fileIdToEdit) {
        setIsSubmitting(true);
        try { await updateFileEntry(fileIdToEdit, getValues()); toast({ title: "Item Removed" }); } 
        catch (error: any) { toast({ title: "Error", description: error.message, variant: "destructive" }); } 
        finally { setIsSubmitting(false); }
    } else toast({ title: "Removed locally" });
    setItemToDelete(null);
  };
  
  const totalRemittanceWatched = watch('totalRemittance');
  const totalReappropriationWatched = watch('totalReappropriation');
  const totalReappropriationCreditWatched = watch('totalReappropriationCredit');
  const totalPaymentWatched = watch('totalPaymentAllEntries');

  const getSourceApplicationTypes = () => {
    if (workTypeContext === 'collector') return COLLECTOR_APPLICATION_TYPES;
    if (workTypeContext === 'planFund') return PLAN_FUND_APPLICATION_TYPES;
    if (workTypeContext === 'private') return PRIVATE_APPLICATION_TYPES;
    return PUBLIC_DEPOSIT_APPLICATION_TYPES;
  };

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
        <Card><CardHeader className="flex flex-row justify-between items-start"><div><CardTitle className="text-xl">1. {pageTitle} Details</CardTitle></div>{isEditor && !isFormDisabled && <Button type="button" onClick={() => openDialog('application', getValues(), false)} disabled={isSupervisor || isViewer}><Eye className="h-4 w-4 mr-2" />Edit</Button>}</CardHeader><CardContent><div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4"><DetailRow label="File No." value={watch('fileNo')} /><DetailRow label="Applicant Name &amp; Address" value={watch('applicantName')} /><DetailRow label="Phone No." value={watch('phoneNo')} /><DetailRow label="Secondary Mobile No." value={watch('secondaryMobileNo')} /><DetailRow label="Type of Application" value={watch('applicationType') ? applicationTypeDisplayMap[watch('applicationType') as ApplicationType] : ''} /></div></CardContent></Card>
        
        <Card><CardHeader className="flex flex-row justify-between items-start"><div><CardTitle className="text-xl">{remittanceTitle}</CardTitle></div>{isEditor && !isFormDisabled && <Button type="button" onClick={() => openDialog('remittance', createDefaultRemittanceDetail())} disabled={isSupervisor || isViewer}><PlusCircle className="h-4 w-4 mr-2" />Add</Button>}</CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Amount (₹)</TableHead>{!isDeferredFunding && <TableHead>Account</TableHead>}<TableHead>Remarks</TableHead>{isEditor && !isFormDisabled && <TableHead>Actions</TableHead>}</TableRow></TableHeader><TableBody>{remittanceFields.length > 0 ? remittanceFields.map((item, index) => (
            <TableRow key={item.id}>
                <TableCell>{item.dateOfRemittance ? format(new Date(item.dateOfRemittance), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                <TableCell>{(Number(item.amountRemitted) || 0).toLocaleString('en-IN')}</TableCell>
                {!isDeferredFunding && <TableCell>{item.remittedAccount}</TableCell>}
                <TableCell>{item.remittanceRemarks}</TableCell>
                {isEditor && !isFormDisabled && <TableCell><div className="flex gap-1"><Button type="button" variant="ghost" size="icon" onClick={() => openDialog('remittance', { index, ...item }, false)}><Eye className="h-4 w-4"/></Button><Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => setItemToDelete({type: 'remittance', index})} disabled={isSupervisor || isViewer}><Trash2 className="h-4 w-4"/></Button></div></TableCell>}
            </TableRow>)) : <TableRow><TableCell colSpan={5} className="text-center h-24">No details added.</TableCell></TableRow>}</TableBody><TableFooterComponent><TableRow><TableCell colSpan={isEditor && !isFormDisabled ? (isDeferredFunding ? 2 : 3) : (isDeferredFunding ? 1 : 2)} className="text-right font-bold">Total {isDeferredFunding ? 'Sanction' : 'Remittance'}</TableCell><TableCell className="font-bold text-right">₹{totalRemittanceWatched?.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '0.00'}</TableCell></TableRow></TableFooterComponent></Table></CardContent></Card>
        
        <Card>
            <CardHeader className="flex flex-row justify-between items-start">
                <div><CardTitle className="text-xl">3. Re-appropriation Details</CardTitle></div>
                {isEditor && !isFormDisabled && <Button type="button" onClick={() => openDialog('reappropriation', createDefaultReappropriationDetail())} disabled={isSupervisor || isViewer}><PlusCircle className="h-4 w-4 mr-2" />Add</Button>}
            </CardHeader>
            <CardContent>
                <div className="relative max-h-[400px] overflow-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Type of Page</TableHead>
                                <TableHead>File No</TableHead>
                                <TableHead>File Details</TableHead>
                                <TableHead className="text-right">Credit</TableHead>
                                <TableHead className="text-right">Debit</TableHead>
                                <TableHead>Remarks</TableHead>
                                {isEditor && !isFormDisabled && <TableHead>Actions</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedCombinedReappropriations.length > 0 ? sortedCombinedReappropriations.map((item, index) => {
                                if (item._source === 'auto') {
                                    return (
                                        <TableRow key={`credit-${index}`} className="bg-green-50/50">
                                            <TableCell className="whitespace-nowrap">{item.date ? format(new Date(item.date), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                                            <TableCell className="text-xs">{item.sourcePageType || 'N/A'}</TableCell>
                                            <TableCell className="font-mono text-xs">{item.sourceFileNo}</TableCell>
                                            <TableCell className="text-xs">{item.sourceApplicantName || 'N/A'}</TableCell>
                                            <TableCell className="text-right font-bold text-green-600">{(Number(item.amount) || 0).toLocaleString('en-IN')}</TableCell>
                                            <TableCell className="text-right font-bold text-muted-foreground">-</TableCell>
                                            <TableCell className="text-xs italic max-w-[150px] truncate">{item.remarks}</TableCell>
                                            {isEditor && !isFormDisabled && <TableCell className="text-center"><TooltipProvider><Tooltip><TooltipTrigger asChild><Info className="h-4 w-4 text-muted-foreground mx-auto" /></TooltipTrigger><TooltipContent><p>Inward transfer from another file. Non-editable.</p></TooltipContent></Tooltip></TooltipProvider></TableCell>}
                                        </TableRow>
                                    );
                                } else {
                                    return (
                                        <TableRow key={item.id}>
                                            <TableCell className="whitespace-nowrap">{item.date ? format(new Date(item.date), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                                            <TableCell className="text-xs">{item.pageType || 'N/A'}</TableCell>
                                            <TableCell className="font-mono text-xs">{item.refFileNo}</TableCell>
                                            <TableCell className="text-xs">{item.fileDetails || 'N/A'}</TableCell>
                                            <TableCell className="text-right font-bold text-muted-foreground">-</TableCell>
                                            <TableCell className="text-right font-bold text-red-600">
                                                {(Number(item.amount) || 0).toLocaleString('en-IN')}
                                            </TableCell>
                                            <TableCell className="text-xs italic max-w-[150px] truncate">{item.remarks}</TableCell>
                                            {isEditor && !isFormDisabled && <TableCell><div className="flex gap-1"><Button type="button" variant="ghost" size="icon" onClick={() => openDialog('reappropriation', { index: item._originalIndex, ...item })} disabled={isSupervisor || isViewer}><Eye className="h-4 w-4"/></Button><Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => setItemToDelete({type: 'reappropriation', index: item._originalIndex})} disabled={isSupervisor || isViewer}><Trash2 className="h-4 w-4"/></Button></div></TableCell>}
                                        </TableRow>
                                    );
                                }
                            }) : <TableRow><TableCell colSpan={8} className="text-center h-24">No re-appropriation details added.</TableCell></TableRow>}
                        </TableBody>
                        <TableFooterComponent>
                            <TableRow className="bg-muted/50 font-bold">
                                <TableCell colSpan={4} className="text-right">Totals</TableCell>
                                <TableCell className="text-right text-green-600">₹{(totalReappropriationCreditWatched || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                                <TableCell className="text-right text-red-600">₹{(totalReappropriationWatched || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                                <TableCell colSpan={isEditor && !isFormDisabled ? 2 : 1} className="text-right">
                                    Balance: <span className={cn((totalReappropriationCreditWatched - totalReappropriationWatched) >= 0 ? "text-green-600" : "text-red-600")}>
                                        ₹{Math.abs(totalReappropriationCreditWatched - totalReappropriationWatched).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                    </span>
                                </TableCell>
                            </TableRow>
                        </TableFooterComponent>
                    </Table>
                </div>
            </CardContent>
        </Card>

        <Card><CardHeader className="flex flex-row justify-between items-start"><div><CardTitle className="text-xl">4. {pageTitle} Site Details</CardTitle></div>{isEditor && !isFormDisabled && <Button type="button" onClick={() => openDialog('site', {})} disabled={isSupervisor || isViewer}><PlusCircle className="h-4 w-4 mr-2" />Add Site</Button>}</CardHeader><CardContent><Accordion type="single" collapsible className="w-full space-y-2" value={activeAccordionItem} onValueChange={setActiveAccordionItem}>{siteFields.length > 0 ? siteFields.map((site, index) => (<AccordionItem key={site.id} value={`site-${index}`} className="border bg-background rounded-lg shadow-sm"><AccordionTrigger className="flex-1 text-base font-semibold px-4 group"><div className="flex justify-between items-center w-full"><div>Site #{index + 1}: {site.nameOfSite || "Unnamed Site"}</div><div className="flex items-center space-x-1 mr-2"><Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.preventDefault(); e.stopPropagation(); openDialog('site', { index, ...site }, false); }}><Eye className="h-4 w-4"/></Button>{isEditor && !isFormDisabled && (<><Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setItemToDelete({type: 'site', index}); }}><Trash2 className="h-4 w-4" /></Button></>)}</div></div></AccordionTrigger><AccordionContent className="p-6 pt-0"><div className="border-t pt-6 space-y-4"><dl className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-4"><DetailRow label="Purpose" value={site.purpose} /><DetailRow label="Status" value={site.workStatus} /><DetailRow label="Supervisor" value={site.supervisorName} /></dl></div></AccordionContent></AccordionItem>)) : <div className="text-center py-8 text-muted-foreground">No sites added.</div>}</Accordion></CardContent></Card>
        <Card><CardHeader className="flex flex-row justify-between items-start"><div><CardTitle className="text-xl">5. Payment Details</CardTitle></div>{isEditor && !isFormDisabled && <Button type="button" onClick={() => openDialog('payment', createDefaultPaymentDetail())} disabled={isSupervisor || isViewer}><PlusCircle className="h-4 w-4 mr-2" />Add</Button>}</CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Date</TableHead>{!isDeferredFunding && <TableHead>Acct.</TableHead>}<TableHead className="text-right">Total (₹)</TableHead><TableHead>Remarks</TableHead>{isEditor && !isFormDisabled && <TableHead>Actions</TableHead>}</TableRow></TableHeader><TableBody>{paymentFields.length > 0 ? paymentFields.map((item, index) => (<TableRow key={item.id}><TableCell>{item.dateOfPayment ? format(new Date(item.dateOfPayment), 'dd/MM/yy') : 'N/A'}</TableCell>{!isDeferredFunding && <TableCell>{item.paymentAccount}</TableCell>}<TableCell className="text-right">{(Number(item.totalPaymentPerEntry) || 0).toLocaleString('en-IN')}</TableCell><TableCell>{item.paymentRemarks}</TableCell>{isEditor && !isFormDisabled && <TableCell><div className="flex gap-1"><Button type="button" variant="ghost" size="icon" onClick={() => openDialog('payment', { index, ...item }, false)}><Eye className="h-4 w-4"/></Button><Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => setItemToDelete({type: 'payment', index})} disabled={isSupervisor || isViewer}><Trash2 className="h-4 w-4"/></Button></div></TableCell>}</TableRow>)) : <TableRow><TableCell colSpan={5} className="text-center h-24">No payments added.</TableCell></TableRow>}</TableBody><TableFooterComponent><TableRow><TableCell colSpan={isEditor && !isFormDisabled ? (isDeferredFunding ? 2 : 3) : (isDeferredFunding ? 1 : 2)} className="text-right font-bold">Total Payment</TableCell><TableCell className="font-bold text-right">₹{totalPaymentWatched?.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '0.00'}</TableCell></TableRow></TableFooterComponent></Table></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-xl">6. Final Details</CardTitle></CardHeader><CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="p-4 border rounded-lg space-y-4 bg-secondary/30"><h3 className="font-semibold text-lg text-primary">Financial Summary</h3><dl className="space-y-2">
            <div className="flex justify-between items-baseline"><dt>Total {isDeferredFunding ? 'Sanction' : 'Remittance'}</dt><dd className="font-mono">₹{totalRemittanceWatched?.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '0.00'}</dd></div>
            <div className="flex justify-between items-baseline text-green-600 font-semibold"><dt>Total Re-appropriation credit</dt><dd className="font-mono font-bold">₹{(totalReappropriationCreditWatched || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</dd></div>
            <div className="flex justify-between items-baseline"><dt>Total Payment</dt><dd className="font-mono">₹{totalPaymentWatched?.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '0.00'}</dd></div>
            <div className="flex justify-between items-baseline text-red-600 font-semibold"><dt>Total Re-appropriation debit</dt><dd className="font-mono font-bold">₹{(totalReappropriationWatched || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '0.00'}</dd></div>
            <Separator /><div className="flex justify-between items-baseline font-bold"><dt>Overall Balance</dt><dd className="font-mono text-xl">₹{(watch('overallBalance') || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '0.00'}</dd></div></dl></div><div className="p-4 border rounded-lg space-y-4 bg-secondary/30"><FormField control={control} name="fileStatus" render={({ field }) => <FormItem><FormLabel>File Status <span className="text-destructive">*</span></FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isViewer || isFormDisabled || isSupervisor}><FormControl><SelectTrigger><SelectValue placeholder="Select final file status" /></SelectTrigger></FormControl><SelectContent className="max-h-80">{fileStatusOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} /><FormField control={control} name="remarks" render={({ field }) => <FormItem><FormLabel>Final Remarks</FormLabel><FormControl><Textarea {...field} placeholder="Final remarks..." readOnly={isViewer || isFormDisabled || isSupervisor} /></FormControl><FormMessage /></FormItem>} /></div></CardContent></Card>
        {!(isViewer || isFormDisabled) && (<CardFooter className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => router.push(returnPath)} disabled={isSubmitting}><X className="mr-2 h-4 w-4"/> Cancel</Button><Button type="submit" disabled={isSubmitting}><Save className="mr-2 h-4 w-4"/> {isSubmitting ? "Saving..." : 'Save & Exit'}</Button></CardFooter>)}
        <Dialog open={dialogState.type === 'application'} onOpenChange={closeDialog}><DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="max-w-4xl"><ApplicationDialogContent initialData={dialogState.data} onConfirm={handleDialogConfirm} onCancel={closeDialog} formOptions={getSourceApplicationTypes()} isEditing={isEditing} /></DialogContent></Dialog>
        <Dialog open={dialogState.type === 'remittance'} onOpenChange={closeDialog}><DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="max-w-3xl"><RemittanceDialogContent initialData={dialogState.data} onConfirm={handleDialogConfirm} onCancel={closeDialog} isDeferredFunding={isDeferredFunding} /></DialogContent></Dialog>
        <Dialog open={dialogState.type === 'reappropriation'} onOpenChange={closeDialog}><DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="max-w-3xl"><ReappropriationDialogContent initialData={dialogState.data} onConfirm={handleDialogConfirm} onCancel={closeDialog} /></DialogContent></Dialog>
        <Dialog open={dialogState.type === 'site'} onOpenChange={closeDialog}><DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="max-w-6xl h-[90vh] flex flex-col p-0"><SiteDialogContent initialData={dialogState.data} onConfirm={handleDialogConfirm} onCancel={closeDialog} supervisorList={supervisorList} isReadOnly={isViewer || isFormDisabled} isSupervisor={isSupervisor} allLsgConstituencyMaps={allLsgConstituencyMaps} allE_tenders={allE_tenders} /></DialogContent></Dialog>
        <Dialog open={dialogState.type === 'payment'} onOpenChange={closeDialog}><DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="max-w-4xl flex flex-col p-0"><PaymentDialogContent initialData={dialogState.data} onConfirm={handleDialogConfirm} onCancel={closeDialog} isDeferredFunding={isDeferredFunding} /></DialogContent></Dialog>
        <AlertDialog open={itemToDelete !== null} onOpenChange={() => setItemToDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>Delete this entry?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogAction onClick={handleDeleteItem} className="bg-destructive">Delete</AlertDialogAction><AlertDialogCancel>Cancel</AlertDialogCancel></AlertDialogFooter></AlertDialogContent></AlertDialog>
      </form>
    </FormProvider>
  );
}
