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
import { Loader2, Trash2, PlusCircle, X, Save, Clock, Eye, ArrowUpDown, Copy, Info } from "lucide-react";
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
  LOGGING_PUMPING_TEST_PURPOSE_OPTIONS,
  type Bidder,
  typeOfWellOptions,
  type Designation,
  type ReappropriationDetailFormData,
  ReappropriationDetailSchema,
  PUBLIC_DEPOSIT_APPLICATION_TYPES,
  PRIVATE_APPLICATION_TYPES,
  COLLECTOR_APPLICATION_TYPES,
  PLAN_FUND_APPLICATION_TYPES,
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

const createDefaultRemittanceDetail = (): RemittanceDetailFormData => ({ amountRemitted: undefined, dateOfRemittance: "", remittedAccount: "Bank", remittanceRemarks: "" });
const createDefaultReappropriationDetail = (): ReappropriationDetailFormData => ({ type: "Outward", refFileNo: "", amount: undefined, date: "", remarks: "", pageType: "GW Investigation", fileDetails: "" });
const createDefaultPaymentDetail = (): PaymentDetailFormData => ({ dateOfPayment: "", paymentAccount: "Bank", revenueHead: undefined, totalPaymentPerEntry: 0, paymentRemarks: "" });
const createDefaultSiteDetail = (): z.infer<typeof SiteDetailSchema> => ({ nameOfSite: "", localSelfGovt: "", constituency: undefined, latitude: undefined, longitude: undefined, purpose: "GW Investigation", estimateAmount: undefined, remittedAmount: undefined, siteConditions: undefined, tsAmount: undefined, tenderNo: "", diameter: undefined, totalDepth: undefined, casingPipeUsed: "", outerCasingPipe: "", innerCasingPipe: "", yieldDischarge: "", zoneDetails: "", waterLevel: "", drillingRemarks: "", developingRemarks: "", schemeRemarks: "", pumpDetails: "", waterTankCapacity: "", noOfTapConnections: undefined, noOfBeneficiary: "", dateOfCompletion: "", typeOfRig: undefined, contractorName: "", supervisorUid: undefined, supervisorName: undefined, supervisorDesignation: undefined, totalExpenditure: undefined, workStatus: undefined, workRemarks: "", surveyOB: "", surveyLocation: "", surveyRemarks: "", surveyRecommendedDiameter: "", surveyRecommendedTD: "", surveyRecommendedOB: "", surveyRecommendedCasingPipe: "", surveyRecommendedPlainPipe: "", surveyRecommendedSlottedPipe: "", surveyRecommendedMsCasingPipe: "", arsTypeOfScheme: undefined, arsPanchayath: undefined, arsBlock: undefined, arsAsTsDetails: undefined, arsSanctionedDate: "", arsTenderedAmount: undefined, arsAwardedAmount: undefined, arsNumberOfStructures: undefined, arsStorageCapacity: undefined, arsNumberOfFillings: undefined, isArsImport: false, pilotDrillingDepth: "", pumpingLineLength: "", deliveryLineLength: "", implementationRemarks: "", nameOfInvestigator: undefined, vesInvestigator: undefined, hydrogeologicalRemarks: "", geophysicalRemarks: "", workImages: [], workVideos: [] });

const calculatePaymentEntryTotalGlobal = (payment: PaymentDetailFormData | undefined): number => {
    if (!payment) return 0;
    return (Number(payment.revenueHead) || 0);
};

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

const ApplicationDialogContent = ({ initialData, onConfirm, onCancel, isEditing }: { 
    initialData: any, 
    onConfirm: (data: any) => void, 
    onCancel: () => void,
    isEditing: boolean
}) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [data, setData] = useState({
        ...initialData,
        category: initialData?.category || undefined
    });
    const [errors, setErrors] = useState<{ fileNo?: string; applicantName?: string; applicationType?: string; category?: string; }>({});
    const [isChecking, setIsChecking] = useState(false);

    const filteredAppTypeOptions = useMemo(() => {
        if (data.category === 'Govt') return INVESTIGATION_GOVT_TYPES;
        if (data.category === 'Private') return INVESTIGATION_PRIVATE_TYPES;
        if (data.category === 'Complaints') return INVESTIGATION_COMPLAINT_TYPES;
        return [];
    }, [data.category]);

    const handleChange = (key: string, value: any) => {
        setData((prev: any) => ({ ...prev, [key]: value }));
        if (value && String(value).trim()) {
            setErrors(prev => ({...prev, [key]: undefined}));
        }
         if (key === 'category') {
            setData((prev: any) => ({ ...prev, applicationType: undefined }));
        }
    };
    
    const handleSave = async () => {
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
        if (!data.category) {
            newErrors.category = "Category is required.";
        }
        
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        if (!isEditing && user?.officeLocation && data.fileNo) {
            setIsChecking(true);
            try {
                const fileNoTrimmed = data.fileNo.trim().toUpperCase();
                const q = query(collection(db, `offices/${user.officeLocation.toLowerCase()}/fileEntries`), where("fileNo", "==", fileNoTrimmed));
                const querySnapshot = await getDocs(q);
                
                const hasDuplicate = querySnapshot.docs.some(doc => {
                    const siteDetails = doc.data().siteDetails as SiteDetailFormData[] | undefined;
                    return siteDetails?.some(site => site.purpose === 'GW Investigation');
                });

                if (hasDuplicate) {
                    toast({
                        title: "Duplicate File Number",
                        description: `This file number is already used for another GW Investigation file.`,
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
          <DialogTitle>GW Investigation Application Details</DialogTitle>
        </DialogHeader>
        <div className="p-6 pt-0 space-y-4 flex-1">
             <div className="grid grid-cols-3 gap-4 items-start">
                <div className="space-y-2 col-span-1">
                    <Label htmlFor="fileNo">File No *</Label>
                    <Input id="fileNo" value={data.fileNo || ''} onChange={(e) => handleChange('fileNo', e.target.value)} disabled={isChecking}/>
                    {errors.fileNo && <p className="text-xs text-destructive mt-1">{errors.fileNo}</p>}
                </div>
                <div className="space-y-2 col-span-2">
                    <Label htmlFor="applicantName">Name &amp; Address of Institution/Applicant *</Label>
                    <Textarea id="applicantName" value={data.applicantName || ''} onChange={(e) => handleChange('applicantName', e.target.value)} className="min-h-[40px]" disabled={isChecking}/>
                    {errors.applicantName && <p className="text-xs text-destructive mt-1">{errors.applicantName}</p>}
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2"><Label>Phone No.</Label><Input value={data.phoneNo || ''} onChange={(e) => handleChange('phoneNo', e.target.value)} disabled={isChecking} /></div>
                <div className="space-y-2"><Label>Secondary Mobile No.</Label><Input value={data.secondaryMobileNo || ''} onChange={(e) => handleChange('secondaryMobileNo', e.target.value)} disabled={isChecking}/></div>
                
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

                 <div className="space-y-2">
                    <Label>Type of Application *</Label>
                    <Select onValueChange={(value) => handleChange('applicationType', value)} value={data.applicationType || ''} disabled={!data.category || isChecking}>
                        <SelectTrigger><SelectValue placeholder={!data.category ? "Select Category First" : "Select Type"} /></SelectTrigger>
                        <SelectContent className="max-h-80">
                            {filteredAppTypeOptions.map(o => <SelectItem key={o} value={o}>{applicationTypeDisplayMap[o as any] || o}</SelectItem>)}
                        </SelectContent>
                    </Select>
                     {errors.applicationType && <p className="text-xs text-destructive mt-1">{errors.applicationType}</p>}
                </div>
            </div>
        </div>
        <DialogFooter className="px-6 pb-6">
            <Button variant="outline" onClick={onCancel} disabled={isChecking}>Cancel</Button>
            <Button onClick={handleSave} disabled={isChecking}>{isChecking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save</Button>
        </DialogFooter>
      </div>
    );
};

const RemittanceDialogContent = ({ initialData, onConfirm, onCancel, category }: { initialData?: any, onConfirm: (data: any) => void, onCancel: () => void, category?: string | null }) => {
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
    
    const availableRemittanceAccounts = ["Bank", "STSB", "Revenue Head"];

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
                {category === 'Complaints' && (
                    <div className="flex items-start gap-2 p-3 mt-2 text-sm text-amber-800 bg-amber-100/50 border border-amber-200 rounded-md">
                        <Info className="h-4 w-4 mt-0.5 shrink-0" />
                        <p>For the 'Complaints' category, remittance is not applicable. Please enter the amount as zero and select any bank account to proceed.</p>
                    </div>
                )}
            </DialogHeader>
            <div className="p-6 pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField name="dateOfRemittance" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Date <span className="text-destructive">*</span></FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField name="amountRemitted" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Amount (₹)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField name="remittedAccount" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Account <span className="text-destructive">*</span></FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select Account" /></SelectTrigger></FormControl><SelectContent>{availableRemittanceAccounts.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                </div>
                <FormField name="remittanceRemarks" control={form.control} render={({ field }) => ( <FormItem><FormLabel>{category === 'Complaints' ? 'Remarks' : 'Remittance Remarks'}</FormLabel><FormControl><Textarea {...field} placeholder="Add any remarks for this entry..." /></FormControl><FormMessage /></FormItem> )}/>
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

const PaymentDialogContent = ({ initialData, onConfirm, onCancel, workTypeContext }: { initialData: any, onConfirm: (data: any) => void, onCancel: () => void, workTypeContext: string | null }) => {
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

    const availablePaymentAccounts = ["Bank", "STSB"];

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

const SiteDialogContent = ({ initialData, onConfirm, onCancel, isReadOnly, isSupervisor, allLsgConstituencyMaps, allStaffMembers, workTypeContext }: { initialData: any, onConfirm: (data: any) => void, onCancel: () => void, isReadOnly: boolean, isSupervisor: boolean, allLsgConstituencyMaps: any[], allStaffMembers: StaffMember[], workTypeContext: string | null }) => {
    
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

    const pageTitle = 'GW Investigation';
    const workStatusOptions = ["Pending", "VES Pending", "Completed"] as const;

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

    const isFieldReadOnly = (isSupervisorEditable: boolean) => {
        if (isReadOnly) { // Global readonly (viewer)
            return true;
        }
        if (isSupervisor) {
            return !isSupervisorEditable;
        }
        return false; // Editor can edit everything
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <DialogHeader className="p-6 pb-4 shrink-0">
                <DialogTitle>{initialData?.nameOfSite ? `Edit Site` : `Add New Site`}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 min-h-0">
                <ScrollArea className="h-full px-6 py-4">
                    <Form {...form}>
                        <form id="investigation-site-dialog-form" onSubmit={(e) => { e.stopPropagation(); handleSubmit(handleDialogSubmit)(e); }} className="space-y-6">
                            <Card>
                                <CardHeader><CardTitle>Main Details</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <FormField name="nameOfSite" control={control} render={({ field }) => <FormItem><FormLabel>Name of Site <span className="text-destructive">*</span></FormLabel><FormControl><Input {...field} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage /></FormItem>} />
                                        <FormField name="purpose" control={control} render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Purpose</FormLabel>
                                                <FormControl><Input value="GW Investigation" readOnly className="bg-muted" /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField name="localSelfGovt" control={control} render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Local Self Govt.</FormLabel>
                                                {isFieldReadOnly(false) ? (<FormControl><Input {...field} value={field.value || ''} readOnly /></FormControl>) : (
                                                <Select onValueChange={(value) => handleLsgChange(value)} value={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select LSG"/></SelectTrigger></FormControl>
                                                    <SelectContent className="max-h-80">
                                                        <SelectItem value="_clear_" onSelect={(e) => { e.preventDefault(); field.onChange(undefined); }}>-- Clear Selection --</SelectItem>
                                                        {sortedLsgMaps.map(map => <SelectItem key={map.id} value={map.name}>{map.name}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                                )}
                                                <FormMessage/>
                                            </FormItem>
                                        )} />
                                        <FormField name="constituency" control={control} render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Constituency (LAC)</FormLabel>
                                                {isFieldReadOnly(false) ? (<FormControl><Input {...field} value={field.value || ''} readOnly /></FormControl>) : (
                                                <Select onValueChange={field.onChange} value={field.value} disabled={constituencyOptionsForLsg.length <= 1}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select Constituency"/></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="_clear_" onSelect={(e) => { e.preventDefault(); field.onChange(undefined); }}>-- Clear Selection --</SelectItem>
                                                        {constituencyOptionsForLsg.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                                )}
                                                <FormMessage/>
                                            </FormItem>
                                        )} />
                                        <FormField name="latitude" control={control} render={({ field }) => <FormItem><FormLabel>Latitude</FormLabel><FormControl><Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isFieldReadOnly(true)} /></FormControl><FormMessage /></FormItem>} />
                                        <FormField name="longitude" control={control} render={({ field }) => <FormItem><FormLabel>Longitude</FormLabel><FormControl><Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isFieldReadOnly(true)} /></FormControl><FormMessage /></FormItem>} />
                                    </div>
                                </CardContent>
                            </Card>
                            
                            <Card>
                                <CardHeader><CardTitle>Survey Details</CardTitle></CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <FormField name="nameOfInvestigator" control={control} render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Name of Investigator (Hydrogeological)</FormLabel>
                                                {isFieldReadOnly(false) ? (<FormControl><Input {...field} value={field.value || ''} readOnly /></FormControl>) : (
                                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select Staff" /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        {hydroStaff.map(staff => <SelectItem key={staff.id} value={staff.name}>{staff.name} ({staff.designation})</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                                )}
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField name="dateOfInvestigation" control={control} render={({ field }) => <FormItem><FormLabel>Date of Investigation</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ''} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage /></FormItem>} />
                                        <FormField name="typeOfWell" control={control} render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Type of Well <span className="text-destructive">*</span></FormLabel>
                                                {isFieldReadOnly(false) ? (<FormControl><Input {...field} value={field.value || ''} readOnly /></FormControl>) : (
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select Well Type" /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        {typeOfWellOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                                )}
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </div>
                                    <FormField name="hydrogeologicalRemarks" control={form.control} render={({ field }) => <FormItem><FormLabel>Hydrogeological Remarks</FormLabel><FormControl><Textarea {...field} value={field.value || ""} placeholder="Add specific remarks for the hydrogeological investigation..." readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage /></FormItem>} />
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField name="vesRequired" control={control} render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>VES Required</FormLabel>
                                                {isFieldReadOnly(false) ? (<FormControl><Input {...field} value={field.value || ''} readOnly /></FormControl>) : (
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl><SelectTrigger className="w-[180px]"><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="Yes">Yes</SelectItem>
                                                        <SelectItem value="No">No</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                )}
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        
                                        {watchedVesRequired === "Yes" && (
                                            <div className="space-y-4 p-4 border rounded-md bg-secondary/20 md:col-span-2 grid md:grid-cols-2 gap-4">
                                                <FormField name="vesInvestigator" control={control} render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Name of Investigator (Geophysical)</FormLabel>
                                                        {isFieldReadOnly(false) ? (<FormControl><Input {...field} value={field.value || ''} readOnly /></FormControl>) : (
                                                        <Select onValueChange={field.onChange} value={field.value || ""}>
                                                            <FormControl><SelectTrigger><SelectValue placeholder="Select Staff" /></SelectTrigger></FormControl>
                                                            <SelectContent>
                                                                {geophysStaff.map(staff => <SelectItem key={staff.id} value={staff.name}>{staff.name} ({staff.designation})</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                        )}
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                                <FormField name="vesDate" control={control} render={({ field }) => <FormItem><FormLabel>Date of VES conducted</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ''} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage /></FormItem>} />
                                                <FormField name="geophysicalRemarks" control={form.control} render={({ field }) => <FormItem className="md:col-span-2"><FormLabel>Geophysical Remarks</FormLabel><FormControl><Textarea {...field} value={field.value || ""} placeholder="Add specific remarks for the VES..." readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage /></FormItem>} />
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-4 border-t">
                                        <FormField name="feasibility" control={control} render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Feasibility <span className="text-destructive">*</span></FormLabel>
                                                {isFieldReadOnly(false) ? (<FormControl><Input {...field} value={field.value || ''} readOnly /></FormControl>) : (
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl><SelectTrigger className="w-[180px]"><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="Yes">Yes</SelectItem>
                                                        <SelectItem value="No">No</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                )}
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </div>

                                    {watchedFeasibility === "Yes" && watchedTypeOfWell && (
                                        <div className="space-y-4 pt-4 border-t">
                                            <h4 className="font-semibold text-sm">Recommended measurements</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <FormField name="surveyRecommendedDiameter" control={control} render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Diameter (mm)</FormLabel>
                                                        {watchedTypeOfWell === "Open Well" ? (
                                                            <FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(false)} placeholder="Enter diameter" /></FormControl>
                                                        ) : (
                                                            isFieldReadOnly(false) ? (<FormControl><Input {...field} value={field.value || ''} readOnly /></FormControl>) : (
                                                            <Select onValueChange={field.onChange} value={field.value || ""}>
                                                                <FormControl><SelectTrigger><SelectValue placeholder="Select Diameter" /></SelectTrigger></FormControl>
                                                                <SelectContent><SelectItem value="_clear_" onSelect={(e) => { e.preventDefault(); field.onChange(undefined); }}>-- Clear Selection --</SelectItem>{siteDiameterOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                                            </Select>
                                                            )
                                                        )}
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                                <FormField name="surveyRecommendedTD" control={control} render={({ field }) => <FormItem><FormLabel>TD (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage /></FormItem>} />
                                                {watchedTypeOfWell === "Bore Well" && <FormField name="surveyRecommendedOB" control={control} render={({ field }) => <FormItem><FormLabel>OB (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage /></FormItem>} />}
                                                {watchedTypeOfWell === "Bore Well" && <FormField name="surveyRecommendedCasingPipe" control={control} render={({ field }) => <FormItem><FormLabel>Casing Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage /></FormItem>} />}
                                                {watchedTypeOfWell === "Filter Point Well" && <FormField name="surveyRecommendedCasingPipe" control={control} render={({ field }) => <FormItem><FormLabel>Casing Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage /></FormItem>} />}
                                                {watchedTypeOfWell === "Tube Well" && (
                                                    <>
                                                        <FormField name="surveyRecommendedPlainPipe" control={control} render={({ field }) => <FormItem><FormLabel>Plain Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage /></FormItem>} />
                                                        <FormField name="surveyRecommendedSlottedPipe" control={control} render={({ field }) => <FormItem><FormLabel>Slotted Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage /></FormItem>} />
                                                        <FormField name="surveyRecommendedMsCasingPipe" control={control} render={({ field }) => <FormItem><FormLabel>MS Casing Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage /></FormItem>} />
                                                    </>
                                                )}
                                                <FormField name="surveyLocation" control={control} render={({ field }) => <FormItem className="md:col-span-2"><FormLabel>Location of well</FormLabel><FormControl><Textarea {...field} value={field.value || ''} className="min-h-[40px]" readOnly={isFieldReadOnly(false)}/></FormControl><FormMessage /></FormItem>} />
                                                <FormField name="surveyRemarks" control={control} render={({ field }) => <FormItem className="md:col-span-3"><FormLabel>Survey Remarks</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} readOnly={isFieldReadOnly(false)}/></FormControl><FormMessage /></FormItem>} />
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader><CardTitle>Work Status</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField name="workStatus" control={control} render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Status <span className="text-destructive">*</span></FormLabel>
                                                {isFieldReadOnly(true) ? (<FormControl><Input {...field} value={field.value || ''} readOnly /></FormControl>) : (
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        {workStatusOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                                )}
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField name="dateOfCompletion" control={control} render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Completion Date {isCompletionDateRequired && <span className="text-destructive">*</span>}</FormLabel>
                                                <FormControl><Input type="date" {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
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
            <DialogFooter className="p-6 pt-4 shrink-0 border-t">
                <Button variant="outline" type="button" onClick={onCancel}>{isReadOnly ? 'Close' : 'Cancel'}</Button>
                {!isReadOnly && <Button type="submit" form="investigation-site-dialog-form">Save</Button>}
            </DialogFooter>
        </div>
    );
};

export default function InvestigationDataEntryFormComponent({ fileNoToEdit, initialData, userRole, workTypeContext, returnPath, pageToReturnTo, isFormDisabled = false, allLsgConstituencyMaps, allStaffMembers }: DataEntryFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileIdToEdit = searchParams.get("id");
  const approveUpdateId = searchParams.get("approveUpdateId");

  const { addFileEntry, updateFileEntry } = useFileEntries();
  const { createPendingUpdate } = usePendingUpdates();
  const { toast } = useToast();
  const { user } = useAuth();
  const { allFileEntries } = useDataStore();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeAccordionItem, setActiveAccordionItem] = useState<string | undefined>(undefined);
  const [dialogState, setDialogState] = useState<{ type: null | 'application' | 'remittance' | 'reappropriation' | 'payment' | 'site' | 'reorderSite' | 'viewSite'; data: any, isView?: boolean }>({ type: null, data: null, isView: false });
  const [itemToDelete, setItemToDelete] = useState<{ type: 'remittance' | 'reappropriation' | 'payment' | 'site'; index: number } | null>(null);

  const isEditor = userRole === 'admin' || userRole === 'scientist' || userRole === 'investigator';
  const isSupervisor = userRole === 'supervisor';
  const isViewer = userRole === 'viewer';
  const isEditing = !!fileIdToEdit;

  const remittanceTitle = "2. Remittance Details";
  const pageTitle = 'GW Investigation';
  
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
        setValue("category", data.category, { shouldDirty: true });
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

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
        <Card><CardHeader className="flex flex-row justify-between items-start"><div><CardTitle className="text-xl">1. {pageTitle} Details</CardTitle></div>{isEditor && !isFormDisabled && <Button type="button" onClick={() => openDialog('application', getValues(), false)} disabled={isSupervisor || isViewer}><Eye className="h-4 w-4 mr-2" />Edit</Button>}</CardHeader><CardContent><div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4"><DetailRow label="File No." value={watch('fileNo')} /><DetailRow label="Applicant Name &amp; Address" value={watch('applicantName')} /><DetailRow label="Phone No." value={watch('phoneNo')} /><DetailRow label="Secondary Mobile No." value={watch('secondaryMobileNo')} /><DetailRow label="Category" value={watch('category')} /><DetailRow label="Type of Application" value={watch('applicationType') ? applicationTypeDisplayMap[watch('applicationType') as ApplicationType] : ''} /></div></CardContent></Card>
        
        <Card><CardHeader className="flex flex-row justify-between items-start"><div><CardTitle className="text-xl">{remittanceTitle}</CardTitle></div>{isEditor && !isFormDisabled && <Button type="button" onClick={() => openDialog('remittance', createDefaultRemittanceDetail())} disabled={isSupervisor || isViewer}><PlusCircle className="h-4 w-4 mr-2" />Add</Button>}</CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Amount (₹)</TableHead><TableHead>Account</TableHead><TableHead>Remarks</TableHead>{isEditor && !isFormDisabled && <TableHead>Actions</TableHead>}</TableRow></TableHeader><TableBody>{remittanceFields.length > 0 ? remittanceFields.map((item, index) => (
            <TableRow key={item.id}>
                <TableCell>{item.dateOfRemittance ? format(new Date(item.dateOfRemittance), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                <TableCell>{(Number(item.amountRemitted) || 0).toLocaleString('en-IN')}</TableCell>
                <TableCell>{item.remittedAccount}</TableCell>
                <TableCell>{item.remittanceRemarks}</TableCell>
                {isEditor && !isFormDisabled && <TableCell><div className="flex gap-1"><Button type="button" variant="ghost" size="icon" onClick={() => openDialog('remittance', { index, ...item }, false)}><Eye className="h-4 w-4"/></Button><Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => setItemToDelete({type: 'remittance', index})} disabled={isSupervisor || isViewer}><Trash2 className="h-4 w-4"/></Button></div></TableCell>}
            </TableRow>)) : <TableRow><TableCell colSpan={5} className="text-center h-24">No details added.</TableCell></TableRow>}</TableBody><TableFooterComponent><TableRow><TableCell colSpan={isEditor && !isFormDisabled ? 4 : 3} className="text-right font-bold">Total Remittance</TableCell><TableCell className="font-bold text-right">₹{totalRemittanceWatched?.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '0.00'}</TableCell></TableRow></TableFooterComponent></Table></CardContent></Card>
        
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

        <Card><CardHeader className="flex flex-row justify-between items-start"><div><CardTitle className="text-xl">4. {pageTitle} Site Details</CardTitle></div>{isEditor && !isFormDisabled && <Button type="button" onClick={() => openDialog('site', {})} disabled={isSupervisor || isViewer}><PlusCircle className="h-4 w-4 mr-2" />Add Site</Button>}</CardHeader><CardContent><Accordion type="single" collapsible className="w-full space-y-2" value={activeAccordionItem} onValueChange={setActiveAccordionItem}>{siteFields.length > 0 ? siteFields.map((site, index) => (<AccordionItem key={site.id} value={`site-${index}`} className="border bg-background rounded-lg shadow-sm"><AccordionTrigger className="flex-1 text-base font-semibold px-4 group"><div className="flex justify-between items-center w-full"><div>Site #{index + 1}: {site.nameOfSite || "Unnamed Site"}</div><div className="flex items-center space-x-1 mr-2"><Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.preventDefault(); e.stopPropagation(); openDialog('site', { index, ...site }, false); }}><Eye className="h-4 w-4"/></Button>{isEditor && !isFormDisabled && (<><Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setItemToDelete({type: 'site', index}); }}><Trash2 className="h-4 w-4" /></Button></>)}</div></div></AccordionTrigger><AccordionContent className="p-6 pt-0"><div className="border-t pt-6 space-y-4"><dl className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-4"><DetailRow label="Purpose" value={site.purpose} /><DetailRow label="Status" value={site.workStatus} /><DetailRow label="Investigator" value={site.nameOfInvestigator} /></dl></div></AccordionContent></AccordionItem>)) : <div className="text-center py-8 text-muted-foreground">No sites added.</div>}</Accordion></CardContent></Card>
        <Card><CardHeader className="flex flex-row justify-between items-start"><div><CardTitle className="text-xl">5. Payment Details</CardTitle></div>{isEditor && !isFormDisabled && <Button type="button" onClick={() => openDialog('payment', createDefaultPaymentDetail())} disabled={isSupervisor || isViewer}><PlusCircle className="h-4 w-4 mr-2" />Add</Button>}</CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Acct.</TableHead><TableHead className="text-right">Total (₹)</TableHead><TableHead>Remarks</TableHead>{isEditor && !isFormDisabled && <TableHead>Actions</TableHead>}</TableRow></TableHeader><TableBody>{paymentFields.length > 0 ? paymentFields.map((item, index) => (<TableRow key={item.id}><TableCell>{item.dateOfPayment ? format(new Date(item.dateOfPayment), 'dd/MM/yy') : 'N/A'}</TableCell><TableCell>{item.paymentAccount}</TableCell><TableCell className="text-right">{(Number(item.totalPaymentPerEntry) || 0).toLocaleString('en-IN')}</TableCell><TableCell>{item.paymentRemarks}</TableCell>{isEditor && !isFormDisabled && <TableCell><div className="flex gap-1"><Button type="button" variant="ghost" size="icon" onClick={() => openDialog('payment', { index, ...item }, false)}><Eye className="h-4 w-4"/></Button><Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => setItemToDelete({type: 'payment', index})} disabled={isSupervisor || isViewer}><Trash2 className="h-4 w-4"/></Button></div></TableCell>}</TableRow>)) : <TableRow><TableCell colSpan={5} className="text-center h-24">No payments added.</TableCell></TableRow>}</TableBody><TableFooterComponent><TableRow><TableCell colSpan={isEditor && !isFormDisabled ? 4 : 3} className="text-right font-bold">Total Payment</TableCell><TableCell className="font-bold text-right">₹{totalPaymentWatched?.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '0.00'}</TableCell></TableRow></TableFooterComponent></Table></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-xl">6. Final Details</CardTitle></CardHeader><CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="p-4 border rounded-lg space-y-4 bg-secondary/30"><h3 className="font-semibold text-lg text-primary">Financial Summary</h3><dl className="space-y-2">
            <div className="flex justify-between items-baseline"><dt>Total Remittance</dt><dd className="font-mono">₹{totalRemittanceWatched?.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '0.00'}</dd></div>
            <div className="flex justify-between items-baseline text-green-600 font-semibold"><dt>Total Re-appropriation credit</dt><dd className="font-mono font-bold">₹{(totalReappropriationCreditWatched || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</dd></div>
            <div className="flex justify-between items-baseline"><dt>Total Payment</dt><dd className="font-mono">₹{totalPaymentWatched?.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '0.00'}</dd></div>
            <div className="flex justify-between items-baseline text-red-600 font-semibold"><dt>Total Re-appropriation debit</dt><dd className="font-mono font-bold">₹{(totalReappropriationWatched || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '0.00'}</dd></div>
            <Separator /><div className="flex justify-between items-baseline font-bold"><dt>Overall Balance</dt><dd className="font-mono text-xl">₹{(watch('overallBalance') || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '0.00'}</dd></div></dl></div><div className="p-4 border rounded-lg space-y-4 bg-secondary/30"><FormField control={control} name="fileStatus" render={({ field }) => <FormItem><FormLabel>File Status <span className="text-destructive">*</span></FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isViewer || isFormDisabled || isSupervisor}><FormControl><SelectTrigger><SelectValue placeholder="Select final file status" /></SelectTrigger></FormControl><SelectContent className="max-h-80">{investigationFileStatusOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} /><FormField control={control} name="remarks" render={({ field }) => <FormItem><FormLabel>Final Remarks</FormLabel><FormControl><Textarea {...field} placeholder="Final remarks..." readOnly={isViewer || isFormDisabled || isSupervisor} /></FormControl><FormMessage /></FormItem>} /></div></CardContent></Card>
        {!(isViewer || isFormDisabled) && (<CardFooter className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => router.push(returnPath)} disabled={isSubmitting}><X className="mr-2 h-4 w-4"/> Cancel</Button><Button type="submit" disabled={isSubmitting}><Save className="mr-2 h-4 w-4"/> {isSubmitting ? "Saving..." : 'Save & Exit'}</Button></CardFooter>)}
        
        <Dialog open={dialogState.type === 'application'} onOpenChange={closeDialog}><DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="max-w-4xl"><ApplicationDialogContent initialData={dialogState.data} onConfirm={handleDialogConfirm} onCancel={closeDialog} isEditing={isEditing} /></DialogContent></Dialog>
        <Dialog open={dialogState.type === 'remittance'} onOpenChange={closeDialog}><DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="max-w-3xl"><RemittanceDialogContent initialData={dialogState.data} onConfirm={handleDialogConfirm} onCancel={closeDialog} category={watch('category')} /></DialogContent></Dialog>
        <Dialog open={dialogState.type === 'reappropriation'} onOpenChange={closeDialog}><DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="max-w-3xl"><ReappropriationDialogContent initialData={dialogState.data} onConfirm={handleDialogConfirm} onCancel={closeDialog} /></DialogContent></Dialog>
        <Dialog open={dialogState.type === 'site'} onOpenChange={closeDialog}><DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="max-w-6xl h-[90vh] flex flex-col p-0"><SiteDialogContent initialData={dialogState.data} onConfirm={handleDialogConfirm} onCancel={closeDialog} isReadOnly={isViewer || isFormDisabled} isSupervisor={isSupervisor} allLsgConstituencyMaps={allLsgConstituencyMaps} allStaffMembers={allStaffMembers} workTypeContext={workTypeContext} /></DialogContent></Dialog>
        <Dialog open={dialogState.type === 'payment'} onOpenChange={closeDialog}><DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="max-w-4xl flex flex-col p-0"><PaymentDialogContent initialData={dialogState.data} onConfirm={handleDialogConfirm} onCancel={closeDialog} workTypeContext={workTypeContext} /></DialogContent></Dialog>
        <AlertDialog open={itemToDelete !== null} onOpenChange={() => setItemToDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>Delete this entry?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogAction onClick={handleDeleteItem} className="bg-destructive">Delete</AlertDialogAction><AlertDialogCancel>Cancel</AlertDialogCancel></AlertDialogFooter></AlertDialogContent></AlertDialog>
      </form>
    </FormProvider>
  );
}
