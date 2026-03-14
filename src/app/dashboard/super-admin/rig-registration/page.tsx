// src/app/dashboard/super-admin/rig-registration/page.tsx
"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { type AgencyApplication, type RigRegistration as RigRegistrationType } from "@/hooks/useAgencyApplications";
import { useForm, useFieldArray, FormProvider, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AgencyApplicationSchema } from "@/lib/schemas";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from 'date-fns';
import { useAuth } from "@/hooks/useAuth";
import { usePageHeader } from "@/hooks/usePageHeader";
import { usePageNavigation } from "@/hooks/usePageNavigation";
import PaginationControls from "@/components/shared/PaginationControls";
import ExcelJS from "exceljs";
import { useRouter, useSearchParams } from 'next/navigation';
import { useDataStore } from '@/hooks/use-data-store';
import { Loader2, Search, Eye, FileDown, Clock, Building } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";


export const dynamic = 'force-dynamic';

const ITEMS_PER_PAGE = 50;

const RegistrationTable = ({ 
  applications, 
  onView,
  searchTerm,
  currentPage,
  itemsPerPage,
  isPendingTable = false,
}: { 
  applications: AgencyApplication[],
  onView: (id: string) => void,
  searchTerm: string,
  currentPage: number,
  itemsPerPage: number,
  isPendingTable?: boolean,
}) => {
    const { selectedOffice } = useDataStore();
    
    return (
    <div className="max-h-[70vh] overflow-auto no-scrollbar">
      <Table>
          <TableHeader className="bg-secondary sticky top-0">
              <TableRow>
                  <TableHead className="w-[80px]">Sl. No.</TableHead>
                  <TableHead>File No.</TableHead>
                  <TableHead>Office</TableHead>
                  <TableHead>Agency Name</TableHead>
                  <TableHead>Owner</TableHead>
                  {!isPendingTable && <TableHead>Active Rigs</TableHead>}
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
              </TableRow>
          </TableHeader>
          <TableBody>
              {applications.length > 0 ? (
                  applications.map((app, index) => (
                      <TableRow key={app.id}>
                          <TableCell>{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                          <TableCell>{app.fileNo || 'N/A'}</TableCell>
                           <TableCell className="font-medium capitalize">
                                {selectedOffice || (app as any).officeLocationFromPath || (app as any).officeLocation || 'N/A'}
                            </TableCell>
                          <TableCell className="font-medium">{app.agencyName}</TableCell>
                          <TableCell>{app.owner.name}</TableCell>
                          {!isPendingTable && <TableCell>{(app.rigs || []).filter(r => r.status === 'Active').length} / {(app.rigs || []).length}</TableCell>}
                          <TableCell><Badge variant={app.status === 'Active' ? 'default' : 'secondary'}>{app.status}</Badge></TableCell>
                          <TableCell className="text-center">
                              <div className="flex items-center justify-center">
                                  <Button variant="ghost" size="icon" onClick={() => onView(app.id!)}><Eye className="h-4 w-4" /></Button>
                              </div>
                          </TableCell>
                      </TableRow>
                  ))
              ) : (
                  <TableRow>
                      <TableCell colSpan={isPendingTable ? 7 : 8} className="h-24 text-center">
                          No registrations found {searchTerm ? "matching your search" : ""}.
                      </TableCell>
                  </TableRow>
              )}
          </TableBody>
      </Table>
    </div>
);
};


export default function AgencyRegistrationSuperAdminPage() {
  const { setHeader } = usePageHeader();
  const { allAgencyApplications, isLoading: applicationsLoading } = useDataStore();
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState('completed');
  const pageFromUrl = searchParams?.get('page');

  useEffect(() => {
    setHeader('All Rig Registrations', 'A read-only overview of all agency and rig registrations.');
  }, [setHeader]);
  
  useEffect(() => {
    if (pageFromUrl) {
      const pageNum = parseInt(pageFromUrl, 10);
      if (!isNaN(pageNum)) {
        setCurrentPage(pageNum);
      }
    }
  }, [pageFromUrl]);
  
  const handleView = (id: string) => {
    const pageParam = currentPage > 1 ? `&page=${currentPage}` : '';
    router.push(`/dashboard/agency-registration?id=${id}&readOnly=true${pageParam}`);
  }
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    const params = new URLSearchParams(searchParams?.toString());
    params.set('page', String(page));
    router.push(`?${params.toString()}`, { scroll: false });
  };
  
  const onTabChange = (value: string) => {
    setActiveTab(value);
  };
  
  useEffect(() => {
    const params = new URLSearchParams(searchParams?.toString());
    params.set('page', '1');
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [activeTab, router, searchParams]);

  const filteredApplications = useMemo(() => {
        if (!searchTerm) return allAgencyApplications;

        const lowercasedFilter = searchTerm.toLowerCase();

        return allAgencyApplications.filter((app: AgencyApplication) => {
            const searchableContent = [
                app.agencyName,
                app.fileNo,
                app.agencyRegistrationNo,
                app.owner?.name,
                app.owner?.mobile,
                (app as any).officeLocation,
                (app as any).officeLocationFromPath,
                ...(app.partners || []).flatMap(p => [p.name, p.mobile]),
                ...(app.rigs || []).flatMap(rig => [
                    rig.rigRegistrationNo,
                    rig.typeOfRig,
                    rig.rigVehicle?.regNo,
                ]),
            ].filter(Boolean).map(String).join(' ').toLowerCase();

            return searchableContent.includes(lowercasedFilter);
        });
    }, [allAgencyApplications, searchTerm]);
    
    const completedApplications = useMemo(() => {
        return filteredApplications.filter((app: AgencyApplication) => app.status === 'Active');
    }, [filteredApplications]);
    
    const pendingApplications = useMemo(() => {
        return filteredApplications.filter((app: AgencyApplication) => app.status === 'Pending Verification');
    }, [filteredApplications]);
  
  const paginatedCompletedApplications = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return completedApplications.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [completedApplications, currentPage]);

  const paginatedPendingApplications = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return pendingApplications.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [pendingApplications, currentPage]);

  const totalCompletedPages = Math.ceil(completedApplications.length / ITEMS_PER_PAGE);
  const totalPendingPages = Math.ceil(pendingApplications.length / ITEMS_PER_PAGE);

  if (applicationsLoading || authLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading registrations...</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardContent className="p-4 space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative flex-grow w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                    type="search" 
                    placeholder="Search by Agency, Owner, File No, Office..." 
                    className="w-full rounded-lg bg-background pl-10 shadow-sm" 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                />
              </div>
          </div>
          <Tabs defaultValue="completed" onValueChange={onTabChange} className="pt-4 border-t">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="completed">
                    <div className="flex items-center gap-2">Registration Completed <Badge>{completedApplications.length}</Badge></div>
                </TabsTrigger>
                <TabsTrigger value="pending">
                    <div className="flex items-center gap-2">Pending Applications <Badge>{pendingApplications.length}</Badge></div>
                </TabsTrigger>
            </TabsList>
            <TabsContent value="completed" className="mt-4">
                {totalCompletedPages > 1 && (
                    <div className="flex items-center justify-center py-4">
                        <PaginationControls currentPage={currentPage} totalPages={totalCompletedPages} onPageChange={handlePageChange} />
                    </div>
                )}
                <RegistrationTable 
                    applications={paginatedCompletedApplications}
                    onView={handleView}
                    searchTerm={searchTerm}
                    currentPage={currentPage}
                    itemsPerPage={ITEMS_PER_PAGE}
                />
                 {totalCompletedPages > 1 && (
                    <div className="flex items-center justify-center py-4">
                        <PaginationControls currentPage={currentPage} totalPages={totalCompletedPages} onPageChange={handlePageChange} />
                    </div>
                )}
            </TabsContent>
            <TabsContent value="pending" className="mt-4">
                 {totalPendingPages > 1 && (
                    <div className="flex items-center justify-center py-4">
                        <PaginationControls currentPage={currentPage} totalPages={totalPendingPages} onPageChange={handlePageChange} />
                    </div>
                )}
                <RegistrationTable 
                    applications={paginatedPendingApplications}
                    onView={handleView}
                    searchTerm={searchTerm}
                    currentPage={currentPage}
                    itemsPerPage={ITEMS_PER_PAGE}
                    isPendingTable={true}
                />
                 {totalPendingPages > 1 && (
                    <div className="flex items-center justify-center py-4">
                        <PaginationControls currentPage={currentPage} totalPages={totalPendingPages} onPageChange={handlePageChange} />
                    </div>
                )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
