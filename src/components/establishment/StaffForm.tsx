
// src/components/establishment/StaffForm.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Loader2, Save, X, ImageUp, Unplug, Expand, UserCheck, Info, CalendarIcon } from "lucide-react";
import { StaffMemberFormDataSchema, type StaffMemberFormData, designationOptions, staffStatusOptions, type StaffStatusType, designationMalayalamOptions } from "@/lib/schemas";
import type { StaffMember, OfficeAddress } from "@/lib/schemas";
import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { format, isValid, parseISO } from "date-fns";
import { ScrollArea } from "../ui/scroll-area";
import { Checkbox } from "../ui/checkbox";
import { useAuth, type UserProfile } from "@/hooks/useAuth";

interface StaffFormProps {
  onSubmit: (data: StaffMemberFormData) => Promise<void>;
  initialData?: StaffMember | null;
  isSubmitting: boolean;
  onCancel: () => void;
  isViewer?: boolean;
  allOfficeAddresses: OfficeAddress[];
  allUsers: UserProfile[];
}

const isValidWebUrl = (url?: string | null): boolean => {
  if (!url) return false;
  try {
    const newUrl = new URL(url);
    return newUrl.protocol === 'http:' || newUrl.protocol === 'https:';
  } catch (_) {
    return false;
  }
};

const isPlaceholderUrl = (url?: string | null): boolean => {
  if (!url) return false;
  return url.startsWith("https://placehold.co");
};

const toDateOrNull = (value: any): Date | null => {
    if (!value) return null;
    if (value instanceof Date && !isNaN(value.getTime())) return value;
    if (typeof value === 'object' && value !== null && typeof value.seconds === 'number') {
        return new Date(value.seconds * 1000 + (value.nanoseconds || 0) / 1e6);
    }
    if (typeof value === 'string') {
        const d = parseISO(value);
        if (isValid(d)) return d;
    }
    return null;
};

const getField = (data: any, key: string): any => {
    if (!data) return undefined;
    
    if (data[key] !== undefined && data[key] !== null) return data[key];
    
    const mappings: Record<string, string[]> = {
        'name': ['name', 'Name', 'Full Name'],
        'nameMalayalam': ['nameMalayalam', 'NameMalayalam', 'Name (Malayalam)', 'Name malayalam'],
        'designation': ['designation', 'Designation', 'Roles/Responsibilities', 'roles', 'Post'],
        'designationMalayalam': ['designationMalayalam', 'DesignationMalayalam', 'Designation (Malayalam)', 'Designation malayalam', 'Post (Malayalam)'],
        'pen': ['pen', 'PEN'],
        'email': ['email', 'Email', 'Email ID'],
        'phoneNo': ['phoneNo', 'PhoneNo', 'PhoneNumber', 'Phone', 'phone'],
        'status': ['status', 'Status'],
        'photoUrl': ['photoUrl', 'PhotoUrl', 'Photo', 'photo'],
        'officeLocation': ['officeLocation', 'OfficeLocation', 'Office', 'location'],
        'targetOffice': ['targetOffice', 'TargetOffice'],
        'serviceStartDate': ['serviceStartDate', 'ServiceStartDate', 'Period of Service From', 'dateOfJoining'],
        'serviceEndDate': ['serviceEndDate', 'ServiceEndDate', 'Period of Service To'],
    };

    if (mappings[key]) {
        for (const altKey of mappings[key]) {
            if (data[altKey] !== undefined && data[altKey] !== null) return data[altKey];
        }
    }

    const searchKey = key.toLowerCase();
    const foundKey = Object.keys(data).find(k => k.toLowerCase() === searchKey);
    if (foundKey) return data[foundKey];

    return undefined;
};

const capitalize = (s?: string) => {
    if (!s) return "";
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};

export default function StaffForm({ onSubmit, initialData, isSubmitting, onCancel, isViewer = false, allOfficeAddresses, allUsers }: StaffFormProps) {
  const { user } = useAuth();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const defaultValues = useMemo((): StaffMemberFormData => {
    const rawData = initialData || {};
    
    const normalize = (val: any) => {
        if (val === null || val === undefined) return "";
        return String(val).trim();
    };

    const designationValue = normalize(getField(rawData, 'designation'));
    const designationMalayalamValue = normalize(getField(rawData, 'designationMalayalam'));
    const statusValue = normalize(getField(rawData, 'status')) as StaffStatusType;
    
    const currentTarget = normalize(getField(rawData, 'targetOffice'));
    const currentOffice = normalize(getField(rawData, 'officeLocation'));
    const officeLocationValue = currentTarget || currentOffice;

    const userForStaff = allUsers.find(u => 
        u.staffId && initialData?.id && 
        String(u.staffId).trim().toLowerCase() === String(initialData.id).trim().toLowerCase()
    );
    const email = normalize(getField(rawData, 'email') || userForStaff?.email);

    let dobDateStr = "";
    const rawDob = getField(rawData, 'dateOfBirth');
    if (rawDob) {
        const d = toDateOrNull(rawDob);
        if (d && isValid(d)) dobDateStr = format(d, 'yyyy-MM-dd');
    }

    let serviceStartDateStr = "";
    const rawServiceStartDate = getField(rawData, 'serviceStartDate');
    if (rawServiceStartDate) {
        const d = toDateOrNull(rawServiceStartDate);
        if (d && isValid(d)) serviceStartDateStr = format(d, 'yyyy-MM-dd');
    }

    let serviceEndDateStr = "";
    const rawServiceEndDate = getField(rawData, 'serviceEndDate');
    if (rawServiceEndDate) {
        const d = toDateOrNull(rawServiceEndDate);
        if (d && isValid(d)) serviceEndDateStr = format(d, 'yyyy-MM-dd');
    }

    return {
        name: normalize(getField(rawData, 'name')),
        nameMalayalam: normalize(getField(rawData, 'nameMalayalam')),
        designation: designationOptions.find(o => o.toLowerCase().trim() === designationValue.toLowerCase()) as any,
        designationMalayalam: designationMalayalamOptions.find(o => o.toLowerCase().trim() === designationMalayalamValue.toLowerCase()) as any,
        pen: normalize(getField(rawData, 'pen')),
        email,
        dateOfBirth: dobDateStr,
        serviceStartDate: serviceStartDateStr,
        serviceEndDate: serviceEndDateStr,
        phoneNo: normalize(getField(rawData, 'phoneNo')),
        roles: normalize(getField(rawData, 'roles')),
        photoUrl: normalize(getField(rawData, 'photoUrl')),
        status: staffStatusOptions.find(o => o.toLowerCase().trim() === statusValue.toLowerCase()) as StaffStatusType || 'Active',
        remarks: normalize(getField(rawData, 'remarks')),
        officeLocation: officeLocationValue,
        createUserAccount: false,
    };
  }, [initialData, allUsers]);

  const form = useForm<StaffMemberFormData>({
    resolver: zodResolver(StaffMemberFormDataSchema),
    defaultValues
  });
  
  const { watch, control, handleSubmit, reset } = form;
  
  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const watchedPhotoUrl = watch("photoUrl");
  const watchedStatus = watch("status");
  
  const userAccountExists = useMemo(() => {
    return allUsers.some(user => user.staffId && initialData?.id && String(user.staffId).trim().toLowerCase() === String(initialData.id).trim().toLowerCase());
  }, [initialData, allUsers]);

  const showUserCreation = !isViewer && !userAccountExists;
  
  useEffect(() => {
    const url = watchedPhotoUrl ?? null;
    if (isValidWebUrl(url) && !isPlaceholderUrl(url)) {
      setImagePreview(url);
      setImageLoadError(false);
    } else {
      setImagePreview(null); 
      setImageLoadError(!!(watchedPhotoUrl && watchedPhotoUrl.trim() !== ""));
    }
  }, [watchedPhotoUrl]);

  const handleFormSubmitInternal = (data: StaffMemberFormData) => {
    if (isViewer) return;
    onSubmit(data);
  };

  const canExpandImage = imagePreview && !imageLoadError && !isPlaceholderUrl(imagePreview);

  const visibleStatusOptions = useMemo(() => {
    return staffStatusOptions.filter(o => o !== 'Pending Transfer');
  }, []);

  const isTransferring = watchedStatus === 'Transferred' || watchedStatus === 'Pending Transfer' || user?.role === 'superAdmin';

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(handleFormSubmitInternal)} className="flex flex-col h-full overflow-hidden">
        <ScrollArea className="flex-1 pr-6 -mr-6">
          <div className="space-y-6 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter full name" {...field} readOnly={isViewer} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nameMalayalam"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name (in Malayalam)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter full name in Malayalam" {...field} value={field.value || ""} readOnly={isViewer} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="designation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Designation</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""} disabled={isViewer || isSubmitting}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select designation" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {designationOptions.map(option => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="designationMalayalam"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Designation (in Malayalam)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""} disabled={isViewer || isSubmitting}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Malayalam designation" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-80">
                        {designationMalayalamOptions.map(option => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pen"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PEN</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter PEN" {...field} readOnly={isViewer} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Enter email address" {...field} value={field.value || ""} readOnly={isViewer} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="phoneNo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="Enter 10 digit phone number" {...field} value={field.value || ""} readOnly={isViewer} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                       <Input type="date" {...field} value={field.value || ""} readOnly={isViewer}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
                />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
               <FormField
                control={form.control}
                name="serviceStartDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Period of Service (From)</FormLabel>
                    <FormControl>
                       <Input type="date" {...field} value={field.value || ""} readOnly={isViewer}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="serviceEndDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Period of Service (To)</FormLabel>
                    <FormControl>
                       <Input type="date" {...field} value={field.value || ""} readOnly={isViewer}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
                />
               <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""} disabled={isViewer || isSubmitting}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {visibleStatusOptions.map(option => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                        {field.value === 'Pending Transfer' && (
                            <SelectItem value="Pending Transfer">Pending Transfer</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="photoUrl"
                render={({ field }) => (
                    <FormItem className="space-y-2">
                        <FormLabel>Staff Photo URL</FormLabel>
                        <div className="flex items-start gap-4">
                            <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
                              <DialogTrigger asChild>
                                <button
                                  type="button"
                                  className={cn(
                                    "relative h-24 w-24 rounded-md border flex items-center justify-center cursor-default",
                                    canExpandImage && "cursor-pointer hover:opacity-80 transition-opacity"
                                  )}
                                  onClick={() => canExpandImage && setIsImageModalOpen(true)}
                                  disabled={!canExpandImage}
                                  aria-label={canExpandImage ? "View larger image" : "Image preview"}
                                >
                                  {imagePreview && !imageLoadError && (
                                    <Image
                                        src={imagePreview}
                                        alt="Staff photo preview"
                                        width={96}
                                        height={96}
                                        className="rounded-md object-cover h-full w-full"
                                        data-ai-hint="person face"
                                        onError={() => {
                                            setImagePreview(null);
                                            setImageLoadError(true);
                                        }}
                                    />
                                  )}
                                  {(!imagePreview || imageLoadError) && (
                                      <div className="h-full w-full bg-muted flex items-center justify-center rounded-md">
                                          {imageLoadError ? (
                                              <Unplug className="h-10 w-10 text-destructive" />
                                          ) : (
                                              <ImageUp className="h-10 w-10 text-muted-foreground" />
                                          )}
                                      </div>
                                  )}
                                  {canExpandImage && (
                                    <div className="absolute bottom-1 right-1 bg-black/50 p-1 rounded-sm">
                                      <Expand className="h-3 w-3 text-white" />
                                    </div>
                                  )}
                                </button>
                              </DialogTrigger>
                               {canExpandImage && imagePreview && (
                                <DialogContent className="p-2">
                                  <div className="flex justify-center items-center max-h-[80vh] overflow-hidden">
                                    <img src={imagePreview} alt="Staff photo enlarged" className="max-w-full max-h-[75vh] object-contain rounded-md"/>
                                  </div>
                                </DialogContent>
                              )}
                            </Dialog>

                            <div className="flex-1">
                                <FormControl>
                                    <Input 
                                        placeholder="https://example.com/photo.jpg" 
                                        {...field} 
                                        value={field.value || ""}
                                        readOnly={isViewer}
                                    />
                                </FormControl>
                                <FormDescription>
                                    Enter a direct public URL. Uploading files is not supported.
                                </FormDescription>
                                 {imageLoadError && <p className="text-xs text-destructive mt-1">Invalid or unloadable URL</p>}
                            </div>
                        </div>
                        <FormMessage />
                    </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <FormField
                control={form.control}
                name="roles"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Roles/Responsibilities</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g., Section Clerk, Field Supervisor" className="resize-y min-h-[120px]" {...field} value={field.value || ""} readOnly={isViewer}/>
                    </FormControl>
                    <FormDescription>(Optional)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="remarks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Remarks</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Any additional remarks about the staff member." className="resize-y min-h-[120px]" {...field} value={field.value || ""} readOnly={isViewer}/>
                    </FormControl>
                    <FormDescription>(Optional)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {isTransferring && (
                <div className="pt-4 border-t space-y-4">
                    <FormField
                        control={form.control}
                        name="officeLocation"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Transfer to Office</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ""} disabled={isViewer || isSubmitting}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select destination office" /></SelectTrigger></FormControl>
                                    <SelectContent className="max-h-80">
                                        {allOfficeAddresses.map(office => (
                                            <SelectItem key={office.id} value={office.officeLocation}>
                                                {office.officeName || capitalize(office.officeLocation)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormDescription className="text-xs">
                                    {user?.role === 'superAdmin' 
                                        ? "Select the destination office. Click 'Save Changes' to update the request, or use the 'Approve' button in the table to complete the move." 
                                        : "Select the destination office. This request will be sent to the Super Admin for final approval."
                                    }
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            )}
          </div>
        </ScrollArea>
        
        <div className="flex flex-col sm:flex-row justify-between items-center pt-6 mt-auto gap-4 border-t shrink-0">
          <div className="flex-1 w-full sm:w-auto">
            {showUserCreation ? (
              <div className="p-3 rounded-md bg-primary/10 border border-primary/20">
                <FormField
                  control={form.control}
                  name="createUserAccount"
                  render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                          <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isViewer || isSubmitting}
                          />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                          <FormLabel className="font-semibold text-primary">
                          Create User Account
                          </FormLabel>
                          <FormDescription className="text-xs text-primary/80">
                          This will create a user account with the default password: <strong>123456</strong>
                          </FormDescription>
                      </div>
                      </FormItem>
                  )}
                  />
              </div>
            ) : (
                initialData && userAccountExists && !isViewer && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <UserCheck className="h-4 w-4 text-green-600" />
                        <span>User account already exists.</span>
                    </div>
                )
            )}
          </div>
          <div className="flex justify-end space-x-3 w-full sm:w-auto">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                <X className="mr-2 h-4 w-4" /> Cancel
            </Button>
            {!isViewer && (
                <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {initialData?.id ? "Save Changes" : "Add Staff Member"}
                </Button>
            )}
          </div>
        </div>
      </form>
    </Form>
  );
}
