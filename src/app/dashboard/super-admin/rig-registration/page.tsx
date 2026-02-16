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


export const dynamic = 'force-dynamic';

const ITEMS_PER_PAGE = 50;

const formatDateSafe = (d: any): string => {
    if (!d) return 'N/A';
    try {
        const date = new Date(d.seconds * 1000);
        return format(date, 'dd/MM/yyyy');
    } catch {
        try {
            return format(new Date(d), 'dd/MM/yyyy');
        } catch {
            return 'N/A';
        }
    }
};

const RegistrationTable = ({ 
  applications, 
  onView,
  searchTerm,
  currentPage,
  itemsPerPage,
}: { 
  applications: AgencyApplication[],
  onView: (id: string) => void,
  searchTerm: string,
  currentPage: number,
  itemsPerPage: number,
}) => (
    <div className="max-h-[70vh] overflow-auto no-scrollbar">
      <Table>
          <TableHeader className="bg-secondary sticky top-0">
              <TableRow>
                  <TableHead className="w-[80px]">Sl. No.</TableHead>
                  <TableHead>File No.</TableHead>
                  <TableHead>Office</TableHead>
                  <TableHead>Agency Name</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Active Rigs</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
              </TableRow>
          </TableHeader>
          <TableBody>
              {applications.length > 0 ? (
                  applications.map((app, index) => (
                      <TableRow key={app.id}>
                          <TableCell>{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                          <TableCell>{app.fileNo || 'N/A'}</TableCell>
                           <TableCell className="font-medium">
                                {((app as any).officeLocation || 'N/A').charAt(0).toUpperCase() + ((app as any).officeLocation || '').slice(1).toLowerCase()}
                            </TableCell>
                          <TableCell className="font-medium">{app.agencyName}</TableCell>
                          <TableCell>{app.owner.name}</TableCell>
                          <TableCell>{(app.rigs || []).filter(r => r.status === 'Active').length} / {(app.rigs || []).length}</TableCell>
                          <TableCell className="text-center">
                              <div className="flex items-center justify-center">
                                  <Button variant="ghost" size="icon" onClick={() => onView(app.id!)}><Eye className="h-4 w-4" /></Button>
                              </div>
                          </TableCell>
                      </TableRow>
                  ))
              ) : (
                  <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                          No registrations found {searchTerm ? "matching your search" : ""}.
                      </TableCell>
                  </TableRow>
              )}
          </TableBody>
      </Table>
    </div>
);


export default function AgencyRegistrationSuperAdminPage() {
  const { setHeader } = usePageHeader();
  const { allAgencyApplications, isLoading: applicationsLoading } = useDataStore();
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
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
  
  const paginatedApplications = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredApplications.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredApplications, currentPage]);

  const totalPages = Math.ceil(filteredApplications.length / ITEMS_PER_PAGE);

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
          {totalPages > 1 && (
              <div className="flex items-center justify-center py-4 border-t">
                  <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
              </div>
          )}
          <RegistrationTable 
              applications={paginatedApplications}
              onView={handleView}
              searchTerm={searchTerm}
              currentPage={currentPage}
              itemsPerPage={ITEMS_PER_PAGE}
          />
           {totalPages > 1 && (
              <div className="flex items-center justify-center py-4 border-t">
                  <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
              </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
