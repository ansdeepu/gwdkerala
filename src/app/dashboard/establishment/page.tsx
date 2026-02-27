
// src/app/dashboard/establishment/page.tsx
"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StaffForm from "@/components/establishment/StaffForm";
import StaffTable from "@/components/establishment/StaffTable";
import TransferredStaffTable from "@/components/establishment/TransferredStaffTable";
import RetiredStaffTable from "@/components/establishment/RetiredStaffTable";
import VacancyTable from "@/components/establishment/VacancyTable";
import { useAuth, type UserProfile } from "@/hooks/useAuth";
import { useStaffMembers } from "@/hooks/useStaffMembers";
import type { StaffMember, StaffMemberFormData, StaffStatusType } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { format, isValid } from "date-fns";
import ExcelJS from "exceljs";
import { usePageHeader } from "@/hooks/usePageHeader";
import { useDataStore } from "@/hooks/use-data-store";
import { Loader2, Search, FileDown, UserPlus, ShieldAlert } from "lucide-react";

export const dynamic = 'force-dynamic';

const isPlaceholderUrl = (url?: string | null): boolean => {
  if (!url) return false;
  return url.startsWith("https://placehold.co");
};

const formatDateSafe = (dateInput: Date | string | null | undefined): string => {
  if (!dateInput) return "";
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return isValid(date) ? format(date, "dd/MM/yyyy") : "";
};

export default function EstablishmentPage() {
  const { setHeader } = usePageHeader();
  const { officeAddress, allOfficeAddresses, allUsers } = useDataStore();

  useEffect(() => {
    setHeader('Establishment', `Manage all staff members of the Ground Water Department, ${officeAddress?.officeLocation || ''}.`);
  }, [setHeader, officeAddress]);

  const { user, isLoading: authLoading, createUserByAdmin } = useAuth();
  const { 
    staffMembers, 
    isLoading: staffLoadingHook, 
    addStaffMember, 
    updateStaffMember, 
    deleteStaffMember,
    updateStaffStatus 
  } = useStaffMembers();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState(""); 
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(""); 
  const [isFiltering, setIsFiltering] = useState(false);
  const [filteredStaff, setFilteredStaff] = useState<StaffMember[]>([]);

  const [imageForModal, setImageForModal] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  
  const canManage = user?.role === 'admin' && user.isApproved;
  const isViewer = user?.role === 'viewer';

  const handleAddNewStaff = () => {
    setEditingStaff(null);
    setIsViewOnly(false);
    setIsFormOpen(true);
  };

  const handleEditStaff = (staff: StaffMember, viewOnly: boolean = false) => {
    setEditingStaff(staff);
    setIsViewOnly(viewOnly);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: StaffMemberFormData) => {
    if (!canManage || isViewOnly) {
        toast({ title: "Permission Denied", variant: "destructive"});
        return;
    }
    
    if (data.createUserAccount && data.email) {
        const emailExists = allUsers.some(u => u.email?.toLowerCase().trim() === data.email?.toLowerCase().trim());
        if (emailExists) {
            toast({ title: "Email Taken", description: "A user with this email already exists.", variant: "destructive" });
            return;
        }
    }

    setIsSubmittingForm(true);
    
    try {
        let staffId: string | undefined = editingStaff?.id;
        if (editingStaff) {
            await updateStaffMember(editingStaff.id, data);
            toast({ title: "Staff Record Updated" });
        } else {
            staffId = await addStaffMember(data); 
            toast({ title: "Staff Record Added" });
        }

        if (data.createUserAccount && data.email && staffId && user?.officeLocation) {
            const result = await createUserByAdmin(data.email, "123456", data.name, staffId, user.officeLocation);
            if (result.success) {
                toast({ title: "User Account Created" });
            } else {
                throw new Error(result.error?.message || "Failed to create user account.");
            }
        }

        setIsFormOpen(false);
        setEditingStaff(null);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmittingForm(false);
    }
  };
  
  const handleOpenImageModal = (imageUrl: string | null) => {
    if (imageUrl && !isPlaceholderUrl(imageUrl)) {
      setImageForModal(imageUrl);
      setIsImageModalOpen(true);
    }
  };

  const handleExportExcel = useCallback(async () => {
    if (filteredStaff.length === 0) {
      toast({ title: "No Data", description: "There is no data to export." });
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Staff Report");

    const headers = ["Sl. No.", "Name", "Designation", "PEN", "Status", "Mobile", "Email", "Roles", "Service Period"];
    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true };

    filteredStaff.forEach((staff, index) => {
      const servicePeriod = `${formatDateSafe(staff.serviceStartDate)} - ${formatDateSafe(staff.serviceEndDate) || 'Present'}`;
      worksheet.addRow([
        index + 1,
        staff.name,
        staff.designation,
        staff.pen,
        staff.status,
        staff.phoneNo || 'N/A',
        staff.email || 'N/A',
        staff.roles || 'N/A',
        servicePeriod
      ]);
    });

    worksheet.columns.forEach(column => {
      column.width = 20;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `GWD_Staff_Report_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Excel Exported" });
  }, [filteredStaff, toast]);

  useEffect(() => {
    const timerId = setTimeout(() => { setDebouncedSearchTerm(searchTerm); }, 300); 
    return () => clearTimeout(timerId);
  }, [searchTerm]);

  useEffect(() => {
    if (staffLoadingHook) return;
    setIsFiltering(true);
    const lowerSearchTerm = debouncedSearchTerm.toLowerCase();
    
    requestAnimationFrame(() => {
      if (!lowerSearchTerm) {
          setFilteredStaff(staffMembers);
      } else {
          const filtered = staffMembers.filter(staff => 
              (staff.name?.toLowerCase().includes(lowerSearchTerm)) ||
              (staff.designation?.toLowerCase().includes(lowerSearchTerm)) ||
              (staff.pen?.toLowerCase().includes(lowerSearchTerm))
          );
          setFilteredStaff(filtered);
      }
      setIsFiltering(false);
    });
  }, [debouncedSearchTerm, staffMembers, staffLoadingHook]);


  const activeStaffList = useMemo(() => filteredStaff.filter(s => s.status === 'Active' || s.status === 'Pending Transfer'), [filteredStaff]);
  const transferredStaffList = useMemo(() => filteredStaff.filter(s => s.status === 'Transferred'), [filteredStaff]);
  const retiredStaffList = useMemo(() => filteredStaff.filter(s => s.status === 'Retired'), [filteredStaff]);

  if (authLoading || staffLoadingHook) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }
  
  if (!user || !user.isApproved) {
     return <div className="p-10 text-center"><ShieldAlert className="mx-auto h-12 w-12 text-destructive mb-4" /><h1 className="text-2xl font-bold">Access Denied</h1></div>;
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative flex-grow w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="staff-search"
                name="staffSearch"
                placeholder="Search staff members..."
                className="w-full pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              {canManage && (
                <Button onClick={handleAddNewStaff} size="sm" className="w-full sm:w-auto">
                  <UserPlus className="mr-2 h-4 w-4" /> Add New Staff
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleExportExcel} className="w-full sm:w-auto">
                <FileDown className="mr-2 h-4 w-4" /> Export Excel
              </Button>
            </div>
          </div>
          <Tabs defaultValue="activeStaff" className="w-full pt-4 border-t">
            <TabsList className="grid w-full grid-cols-4 sm:w-[800px]">
              <TabsTrigger value="activeStaff">Active ({activeStaffList.length})</TabsTrigger>
              <TabsTrigger value="transferredStaff">Transferred ({transferredStaffList.length})</TabsTrigger>
              <TabsTrigger value="retiredStaff">Retired ({retiredStaffList.length})</TabsTrigger>
              <TabsTrigger value="vacancy">Vacancy</TabsTrigger>
            </TabsList>
            <TabsContent value="activeStaff" className="mt-4">
              <div className="max-h-[70vh] overflow-auto">
                <StaffTable
                  staffData={activeStaffList}
                  onEdit={(s) => handleEditStaff(s, s.status === 'Pending Transfer')}
                  onDelete={canManage ? deleteStaffMember : undefined}
                  onSetStatus={undefined}
                  isViewer={isViewer}
                  onImageClick={handleOpenImageModal}
                  isLoading={isFiltering}
                  searchActive={!!debouncedSearchTerm}
                />
              </div>
            </TabsContent>
            <TabsContent value="transferredStaff" className="mt-4">
              <div className="max-h-[70vh] overflow-auto">
                <TransferredStaffTable
                    staffData={transferredStaffList}
                    onEdit={(s) => handleEditStaff(s, true)}
                    onSetStatus={undefined}
                    isViewer={true}
                    onImageClick={handleOpenImageModal}
                    isLoading={isFiltering}
                    searchActive={!!debouncedSearchTerm}
                />
              </div>
            </TabsContent>
            <TabsContent value="retiredStaff" className="mt-4">
              <div className="max-h-[70vh] overflow-auto">
                <RetiredStaffTable
                    staffData={retiredStaffList}
                    onEdit={(s) => handleEditStaff(s, true)}
                    onSetStatus={undefined}
                    isViewer={true}
                    onImageClick={handleOpenImageModal}
                    isLoading={isFiltering}
                    searchActive={!!debouncedSearchTerm}
                />
              </div>
            </TabsContent>
            <TabsContent value="vacancy" className="mt-4">
                <div className="max-h-[70vh] overflow-auto">
                    <VacancyTable canManage={canManage} />
                </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <Dialog open={isFormOpen} onOpenChange={(isOpen) => !isOpen && setIsFormOpen(false)}>
        <DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="sm:max-w-5xl h-[95vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 shrink-0">
            <DialogTitle>{editingStaff ? (isViewer || isViewOnly ? "Staff Details" : "Edit Staff Details") : "Add New Staff Member"}</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6 flex-1 min-h-0 overflow-hidden">
            <StaffForm
                key={editingStaff?.id || 'new'}
                onSubmit={handleFormSubmit}
                initialData={editingStaff}
                isSubmitting={isSubmittingForm}
                onCancel={() => setIsFormOpen(false)}
                isViewer={isViewer || isViewOnly}
                allOfficeAddresses={allOfficeAddresses}
                allUsers={allUsers}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
        <DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="p-0 border-0 bg-transparent shadow-none w-auto max-w-[90vw]">
          <div className="flex justify-center items-center max-h-[90vh] overflow-hidden">
            {imageForModal && <img src={imageForModal} alt="Enlarged staff photo" className="max-w-full max-h-full object-contain rounded-lg"/>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
