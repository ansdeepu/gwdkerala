
// src/app/dashboard/data-entry/page.tsx
"use client";
import DataEntryFormComponent from "@/components/shared/DataEntryForm";
import InvestigationDataEntryFormComponent from "@/components/investigation/InvestigationDataEntryForm";
import LoggingPumpingTestDataEntryFormComponent from "@/components/investigation/LoggingPumpingTestDataEntryForm";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Loader2, ArrowLeft } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth, type UserProfile } from "@/hooks/useAuth";
import { useFileEntries } from "@/hooks/useFileEntries";
import { useStaffMembers } from "@/hooks/useStaffMembers";
import { useMemo, useEffect, useState } from "react";
import type { DataEntryFormData, StaffMember, ApplicationType } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import { usePendingUpdates } from "@/hooks/usePendingUpdates";
import { isValid, format, parseISO } from 'date-fns';
import { usePageHeader } from "@/hooks/usePageHeader";
import { useDataStore } from "@/hooks/use-data-store";
import { 
    PUBLIC_DEPOSIT_APPLICATION_TYPES, 
    PRIVATE_APPLICATION_TYPES, 
    COLLECTOR_APPLICATION_TYPES, 
    PLAN_FUND_APPLICATION_TYPES, 
    GW_INVESTIGATION_TYPES,
    LOGGING_PUMPING_TEST_TYPES,
    INVESTIGATION_GOVT_TYPES, 
    INVESTIGATION_PRIVATE_TYPES, 
    INVESTIGATION_COMPLAINT_TYPES,
    LOGGING_PUMPING_TEST_PURPOSE_OPTIONS
} from '@/lib/schemas';

export const dynamic = 'force-dynamic';

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

const processDataForForm = (data: any): any => {
  const transform = (obj: any): any => {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) return obj.map(transform);
    if (typeof obj === 'object') {
      const maybeDate = toDateOrNull(obj);
      if (maybeDate) return format(maybeDate, 'yyyy-MM-dd');
      const newObj: { [key: string]: any } = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const value = obj[key];
          if (key.toLowerCase().includes('date')) {
            const date = toDateOrNull(value);
            newObj[key] = date && isValid(date) ? format(date, 'yyyy-MM-dd') : "";
          } else {
            newObj[key] = transform(value);
          }
        }
      }
      return newObj;
    }
    return obj;
  };
  return transform(data);
};

const getFormDefaults = (workType: string | null): DataEntryFormData => ({
  fileNo: "", 
  applicantName: "", 
  phoneNo: "", 
  secondaryMobileNo: "",
  category: undefined,
  applicationType: workType === 'planFund' ? 'GWBDWS' as ApplicationType : undefined, 
  constituency: undefined,
  estimateAmount: undefined, 
  assignedSupervisorUids: [],
  remittanceDetails: [], 
  totalRemittance: 0, 
  reappropriationDetails: [],
  totalReappropriation: 0,
  totalReappropriationCredit: 0,
  siteDetails: [], 
  paymentDetails: [], 
  totalPaymentAllEntries: 0, 
  overallBalance: 0,
  fileStatus: 'File Under Process', 
  remarks: "",
});

interface PageData {
  initialData: DataEntryFormData;
  allUsers: UserProfile[];
}

export default function DataEntryPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const fileIdToEdit = searchParams?.get("id");
  const approveUpdateId = searchParams?.get("approveUpdateId");
  const pageToReturnTo = searchParams?.get('page') ?? null;
  const workTypeContext = searchParams?.get('workType') as 'public' | 'private' | 'collector' | 'planFund' | 'gwInvestigation' | 'loggingPumpingTest' | null;
  const readOnlyParam = searchParams?.get('readOnly');

  const { user, isLoading: authIsLoading, fetchAllUsers } = useAuth();
  const { fetchEntryForEditing } = useFileEntries();
  const { staffMembers, isLoading: staffIsLoading } = useStaffMembers();
  const { getPendingUpdateById, hasPendingUpdateForFile } = usePendingUpdates();
  const { toast } = useToast();
  const { setHeader } = usePageHeader();
  const { allLsgConstituencyMaps, allE_tenders, allStaffMembers } = useDataStore();
  
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [fileNoForHeader, setFileNoForHeader] = useState<string | null>(null);
  const [isFormDisabledForSupervisor, setIsFormDisabledForSupervisor] = useState(false);
  
  const isApprovingUpdate = !!(user?.role === 'admin' && approveUpdateId);
  const effectiveUserRole = readOnlyParam === 'true' ? 'viewer' : user?.role;
  
  const returnPath = useMemo(() => {
    let base = '/dashboard/file-room'; 
    
    if (approveUpdateId) {
        base = '/dashboard/pending-updates'; 
    } else if (fileIdToEdit && pageData?.initialData) { // Editing existing, determine path from content
        const hasInvestigationPurpose = pageData?.initialData?.siteDetails?.some(site => site.purpose === 'GW Investigation');
        const hasLoggingPumpingPurpose = pageData?.initialData?.siteDetails?.some(site => site.purpose && LOGGING_PUMPING_TEST_PURPOSE_OPTIONS.includes(site.purpose as any));

        if (hasInvestigationPurpose && !hasLoggingPumpingPurpose) {
            base = '/dashboard/gw-investigation';
        } else if (hasLoggingPumpingPurpose && !hasInvestigationPurpose) {
            base = '/dashboard/logging-pumping-test';
        } else {
             const appType = pageData?.initialData.applicationType;
             if (COLLECTOR_APPLICATION_TYPES.includes(appType as any)) {
                base = '/dashboard/collectors-deposit-works';
            } else if (PLAN_FUND_APPLICATION_TYPES.includes(appType as any)) {
                base = '/dashboard/plan-fund-works';
            } else if (PRIVATE_APPLICATION_TYPES.includes(appType as any)) {
                base = '/dashboard/private-deposit-works';
            }
        }
    } else if (workTypeContext) { // Creating new, determine from context
        if (workTypeContext === 'collector') base = '/dashboard/collectors-deposit-works';
        else if (workTypeContext === 'planFund') base = '/dashboard/plan-fund-works';
        else if (workTypeContext === 'private') base = '/dashboard/private-deposit-works';
        else if (workTypeContext === 'gwInvestigation') base = '/dashboard/gw-investigation';
        else if (workTypeContext === 'loggingPumpingTest') base = '/dashboard/logging-pumping-test';
    }
    return pageToReturnTo ? `${base}?page=${pageToReturnTo}` : base;
   }, [approveUpdateId, pageToReturnTo, fileIdToEdit, workTypeContext, pageData]);

  useEffect(() => {
    const loadAllData = async () => {
        setDataLoading(true);
        if (authIsLoading) return;
        if (!user) { setErrorState("You must be logged in."); setDataLoading(false); return; }
        try {
            const allUsersResult = (user.role === 'admin') ? await fetchAllUsers() : [];
            if (!fileIdToEdit) { 
                let defaultData = getFormDefaults(workTypeContext);
                setPageData({ initialData: defaultData, allUsers: allUsersResult }); 
                setDataLoading(false);
                return; 
            }
            const originalEntry = await fetchEntryForEditing(fileIdToEdit);
            if (!originalEntry) { setErrorState("Could not find the requested file."); setDataLoading(false); return; }
             if (user.role === 'supervisor' && user.uid) {
                const hasPending = await hasPendingUpdateForFile(originalEntry.fileNo, user.uid);
                if (hasPending) { setIsFormDisabledForSupervisor(true); toast({ title: "Edits Locked", description: "Pending update review required." }); }
            }
            let dataForForm: DataEntryFormData = originalEntry;
            if (isApprovingUpdate && approveUpdateId) {
                const pendingUpdate = await getPendingUpdateById(approveUpdateId);
                if (pendingUpdate) {
                    let mergedData = JSON.parse(JSON.stringify(originalEntry));
                    const updatedSitesMap = new Map(pendingUpdate.updatedSiteDetails.map(site => [site.nameOfSite, site]));
                    mergedData.siteDetails = mergedData.siteDetails?.map((originalSite: any) => updatedSitesMap.get(originalSite.nameOfSite) || originalSite) || [];
                    dataForForm = mergedData;
                }
            }
            setFileNoForHeader(dataForForm.fileNo);
            setPageData({ initialData: processDataForForm(dataForForm), allUsers: allUsersResult });
        } catch (error) { setErrorState("Could not load all required data."); } finally { setDataLoading(false); }
    };
    loadAllData();
  }, [fileIdToEdit, approveUpdateId, user, authIsLoading, fetchAllUsers, fetchEntryForEditing, getPendingUpdateById, toast, isApprovingUpdate, hasPendingUpdateForFile, workTypeContext]);

  useEffect(() => {
    let title = "Loading...";
    let description = "";
    const isCreatingNew = !fileIdToEdit;
    if (!dataLoading) {
        if (errorState) { title = "Error"; description = errorState; } 
        else if (user?.role === 'admin') {
            if (isCreatingNew) {
                if (workTypeContext === 'private') title = "New Private Deposit Work";
                else if (workTypeContext === 'collector') title = "New Collector's Deposit Work";
                else if (workTypeContext === 'planFund') title = "New Plan Fund Work";
                else if (workTypeContext === 'gwInvestigation') title = "New GW Investigation"; 
                else if (workTypeContext === 'loggingPumpingTest') title = "New Logging & Pumping Test";
                else title = "New Deposit Work";
            } else if (approveUpdateId) title = "Approve Pending Updates";
            else if (fileNoForHeader) title = `Edit File: ${fileNoForHeader}`;
        } else if (user?.role === 'viewer' || readOnlyParam === 'true') {
            if (fileNoForHeader) title = `View File: ${fileNoForHeader}`;
        }
    }
    setHeader(title, description);
  }, [fileIdToEdit, user, approveUpdateId, setHeader, fileNoForHeader, workTypeContext, dataLoading, errorState, readOnlyParam]);

  const supervisorList = useMemo(() => {
    if (!user || !pageData || staffIsLoading) return [];
    return pageData.allUsers.filter(u => u.role === 'supervisor' && u.isApproved && u.staffId).map(userProfile => {
        const staffInfo = staffMembers.find(s => s.id === userProfile.staffId && s.status === 'Active');
        return staffInfo ? { ...staffInfo, uid: userProfile.uid, name: staffInfo.name } : null;
    }).filter((s): s is (StaffMember & { uid: string; name: string }) => s !== null).sort((a, b) => a.name.localeCompare(b.name));
   }, [pageData, staffMembers, user, staffIsLoading]);
  
  const hasInvestigationPurpose = useMemo(() => 
    pageData?.initialData?.siteDetails?.some(site => site.purpose === 'GW Investigation'), 
    [pageData]
  );
  
   const hasLoggingPumpingPurpose = useMemo(() => 
    pageData?.initialData?.siteDetails?.some(site => site.purpose && LOGGING_PUMPING_TEST_PURPOSE_OPTIONS.includes(site.purpose as any)),
    [pageData]
  );

   const isGwInvestigationType = workTypeContext === 'gwInvestigation' || (!!fileIdToEdit && hasInvestigationPurpose && !hasLoggingPumpingPurpose);
  const isLoggingPumpingTestType = workTypeContext === 'loggingPumpingTest' || (!!fileIdToEdit && hasLoggingPumpingPurpose && !hasInvestigationPurpose);
  
  if (authIsLoading || dataLoading) return <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  if (errorState) return <div className="flex h-screen items-center justify-center text-center p-6"><Card><CardContent className="pt-6"><ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-4" /><h1 className="text-xl font-bold">{errorState}</h1><Button className="mt-4" variant="outline" onClick={() => router.back()}>Go Back</Button></CardContent></Card></div>;
  
  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-end p-4 border-b space-y-0">
            <Button variant="destructive" size="sm" onClick={() => router.push(returnPath)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
            </Button>
        </CardHeader>
        <CardContent className="p-6">
          {pageData && pageData.initialData ? (
             isGwInvestigationType ? (
                <InvestigationDataEntryFormComponent
                    fileNoToEdit={fileNoForHeader ?? undefined}
                    initialData={pageData.initialData}
                    allStaffMembers={allStaffMembers}
                    userRole={effectiveUserRole}
                    workTypeContext={workTypeContext}
                    returnPath={returnPath}
                    pageToReturnTo={pageToReturnTo} 
                    isFormDisabled={isFormDisabledForSupervisor}
                    allLsgConstituencyMaps={allLsgConstituencyMaps}
                />
             ) : isLoggingPumpingTestType ? (
                <LoggingPumpingTestDataEntryFormComponent
                    fileNoToEdit={fileNoForHeader ?? undefined}
                    initialData={pageData.initialData}
                    allStaffMembers={allStaffMembers}
                    userRole={effectiveUserRole}
                    workTypeContext={workTypeContext}
                    returnPath={returnPath}
                    pageToReturnTo={pageToReturnTo} 
                    isFormDisabled={isFormDisabledForSupervisor}
                    allLsgConstituencyMaps={allLsgConstituencyMaps}
                />
             ) : (
                <DataEntryFormComponent
                    fileNoToEdit={fileNoForHeader ?? undefined}
                    initialData={pageData.initialData}
                    supervisorList={supervisorList}
                    userRole={effectiveUserRole}
                    workTypeContext={workTypeContext}
                    returnPath={returnPath}
                    pageToReturnTo={pageToReturnTo}
                    isFormDisabled={isFormDisabledForSupervisor}
                />
              )
          ) : <div className="flex h-64 items-center justify-center"><p className="text-muted-foreground">Loading entry details...</p></div>}
        </CardContent>
      </Card>
    </div>
  );
}
