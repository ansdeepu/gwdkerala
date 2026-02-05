// src/app/dashboard/super-admin/vehicles/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { usePageHeader } from '@/hooks/usePageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DepartmentVehicle, HiredVehicle, RigCompressor } from '@/lib/schemas';
import { DepartmentVehicleTable, HiredVehicleTable, RigCompressorTable, VehicleViewDialog } from '@/components/vehicles/VehicleTables';
import { useDataStore } from '@/hooks/use-data-store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function VehiclesSuperAdminPage() {
    const { setHeader } = usePageHeader();
    const canEdit = false; // Super admin has read-only access

    const {
        allDepartmentVehicles, 
        allHiredVehicles,
        allRigCompressors,
        isLoading,
    } = useDataStore();

    const [viewingVehicle, setViewingVehicle] = useState<DepartmentVehicle | HiredVehicle | RigCompressor | null>(null);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

    useEffect(() => {
        setHeader("All Vehicle & Rig Management", "A read-only overview of all vehicles and units across all offices.");
    }, [setHeader]);
    
    const handleView = (vehicle: DepartmentVehicle | HiredVehicle | RigCompressor) => {
        setViewingVehicle(vehicle);
        setIsViewDialogOpen(true);
    };

    const { presentDepartmentVehicles, historyDepartmentVehicles } = useMemo(() => ({
        presentDepartmentVehicles: allDepartmentVehicles.filter(v => v.rcStatus !== 'Garaged'),
        historyDepartmentVehicles: allDepartmentVehicles.filter(v => v.rcStatus === 'Garaged'),
    }), [allDepartmentVehicles]);

    const { presentHiredVehicles, historyHiredVehicles } = useMemo(() => ({
        presentHiredVehicles: allHiredVehicles.filter(v => v.rcStatus !== 'Garaged'),
        historyHiredVehicles: allHiredVehicles.filter(v => v.rcStatus === 'Garaged'),
    }), [allHiredVehicles]);

    const { presentRigCompressors, historyRigCompressors } = useMemo(() => ({
        presentRigCompressors: allRigCompressors.filter(v => v.status !== 'Garaged'),
        historyRigCompressors: allRigCompressors.filter(v => v.status === 'Garaged'),
    }), [allRigCompressors]);

    return (
        <div className="space-y-6">
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <VehicleViewDialog vehicle={viewingVehicle} onClose={() => setIsViewDialogOpen(false)} />
            </Dialog>

            {isLoading ? (
                 <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                 </div>
            ) : (
                <Tabs defaultValue="present">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="present">Present Data</TabsTrigger>
                        <TabsTrigger value="history">History</TabsTrigger>
                    </TabsList>
                    <TabsContent value="present" className="mt-4 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Department Vehicles ({presentDepartmentVehicles.length})</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <DepartmentVehicleTable 
                                    data={presentDepartmentVehicles} 
                                    onEdit={() => {}}
                                    onDelete={async () => {}}
                                    canEdit={canEdit}
                                    onView={handleView}
                                />
                            </CardContent>
                        </Card>

                        <Card>
                             <CardHeader>
                                <CardTitle>Hired Vehicles ({presentHiredVehicles.length})</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <HiredVehicleTable 
                                    data={presentHiredVehicles} 
                                    onEdit={() => {}}
                                    onDelete={async () => {}}
                                    canEdit={canEdit}
                                    onView={handleView}
                                />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Rig & Compressor Units ({presentRigCompressors.length})</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <RigCompressorTable 
                                    data={presentRigCompressors} 
                                    onEdit={() => {}}
                                    onDelete={async () => {}}
                                    canEdit={canEdit}
                                    onView={handleView}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="history" className="mt-4 space-y-6">
                         <Card>
                            <CardHeader>
                                <CardTitle>Department Vehicles (Garaged)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <DepartmentVehicleTable 
                                    data={historyDepartmentVehicles} 
                                    onEdit={() => {}} 
                                    onDelete={async () => {}}
                                    canEdit={canEdit}
                                    onView={handleView}
                                />
                            </CardContent>
                        </Card>
                        <Card>
                             <CardHeader>
                                <CardTitle>Hired Vehicles (Garaged)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <HiredVehicleTable 
                                    data={historyHiredVehicles} 
                                    onEdit={() => {}} 
                                    onDelete={async () => {}}
                                    canEdit={canEdit}
                                    onView={handleView}
                                />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Rig & Compressor Units (Garaged)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <RigCompressorTable 
                                    data={historyRigCompressors} 
                                    onEdit={() => {}} 
                                    onDelete={async () => {}}
                                    canEdit={canEdit}
                                    onView={handleView}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}
