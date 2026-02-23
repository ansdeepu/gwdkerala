
// src/components/establishment/VacancyTable.tsx
"use client";

import React, { useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDataStore } from '@/hooks/use-data-store';
import { designationOptions } from '@/lib/schemas';
import { Edit, Save, PlusCircle, Trash2, Search, ClipboardCheck, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface VacancyTableProps {
    canManage: boolean;
}

export default function VacancyTable({ canManage }: VacancyTableProps) {
    const { allStaffMembers, allSanctionedStrength, updateSanctionedStrength } = useDataStore();
    const [searchTerm, setSearchTerm] = useState("");
    const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
    const [configData, setConfigData] = useState<{ designation: string; count: number }>({ designation: '', count: 0 });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const vacancyData = useMemo(() => {
        const activeStaff = allStaffMembers.filter(s => s.status === 'Active');
        
        // Show ALL official designations from the hierarchy
        const data = designationOptions.map(designation => {
            const sanctioned = allSanctionedStrength[designation] || 0;
            const current = activeStaff.filter(s => s.designation === designation).length;
            const vacancy = Math.max(0, sanctioned - current);
            return {
                designation,
                sanctioned,
                current,
                vacancy
            };
        });

        // Filter by search term if provided
        return data.filter(row => {
            if (!searchTerm) return true;
            return row.designation.toLowerCase().includes(searchTerm.toLowerCase());
        });
    }, [allStaffMembers, allSanctionedStrength, searchTerm]);

    const handleSaveStrength = async () => {
        if (!configData.designation) return;
        setIsSubmitting(true);
        try {
            await updateSanctionedStrength(configData.designation, configData.count);
            setIsConfigDialogOpen(false);
            setConfigData({ designation: '', count: 0 });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (designation: string, currentStrength: number) => {
        setConfigData({ designation, count: currentStrength });
        setIsConfigDialogOpen(true);
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-secondary/20 p-4 rounded-lg">
                <div className="relative flex-grow w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Filter by designation..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                {canManage && (
                    <Button onClick={() => setIsConfigDialogOpen(true)} size="sm">
                        <PlusCircle className="mr-2 h-4 w-4" /> Configure Sanctioned Strength
                    </Button>
                )}
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader className="bg-secondary">
                        <TableRow>
                            <TableHead className="w-[60px]">#</TableHead>
                            <TableHead>Designation</TableHead>
                            <TableHead className="text-center">Sanctioned Strength</TableHead>
                            <TableHead className="text-center">Current Strength</TableHead>
                            <TableHead className="text-center">Vacancy</TableHead>
                            {canManage && <TableHead className="text-right">Actions</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {vacancyData.length > 0 ? vacancyData.map((row, index) => (
                            <TableRow key={row.designation}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell className="font-semibold">{row.designation}</TableCell>
                                <TableCell className="text-center font-mono">{row.sanctioned || '0'}</TableCell>
                                <TableCell className="text-center font-mono text-green-600 font-bold">{row.current}</TableCell>
                                <TableCell className="text-center">
                                    <span className={cn(
                                        "font-mono font-bold px-2 py-1 rounded-sm",
                                        row.vacancy > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                                    )}>
                                        {row.vacancy}
                                    </span>
                                </TableCell>
                                {canManage && (
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(row.designation, row.sanctioned)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                )}
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={canManage ? 6 : 5} className="h-24 text-center text-muted-foreground">
                                    {searchTerm ? "No matching designations found." : "No vacancy data configured yet."}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Sanctioned Strength Configuration</DialogTitle>
                        <DialogDescription>Set the authorized headcount for a specific designation.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 px-6 py-4">
                        <div className="space-y-2">
                            <Label>Designation</Label>
                            <Select 
                                value={configData.designation} 
                                onValueChange={(v) => setConfigData(prev => ({ ...prev, designation: v }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Designation" />
                                </SelectTrigger>
                                <SelectContent className="max-h-80">
                                    {designationOptions.map(opt => (
                                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Authorized Count (Sanctioned Strength)</Label>
                            <Input 
                                type="number" 
                                min={0} 
                                value={configData.count || ''} 
                                onChange={(e) => setConfigData(prev => ({ ...prev, count: parseInt(e.target.value) || 0 }))}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsConfigDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveStrength} disabled={!configData.designation || isSubmitting}>
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4 mr-2" />}
                            Save Configuration
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
