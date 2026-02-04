// src/components/layout/OfficeSwitcher.tsx
"use client";

import React from 'react';
import { useDataStore } from '@/hooks/use-data-store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building } from 'lucide-react';

export default function OfficeSwitcher() {
    const { selectedOffice, setSelectedOffice, allOfficeAddresses } = useDataStore();

    const officeOptions = React.useMemo(() => {
        const locationMap = new Map<string, string>(); // Map lowercase to original case for display
        allOfficeAddresses.forEach(oa => {
            if (oa.officeLocation) {
                const lowerCaseLocation = oa.officeLocation.toLowerCase();
                if (!locationMap.has(lowerCaseLocation)) {
                    locationMap.set(lowerCaseLocation, oa.officeLocation);
                }
            }
        });
        return Array.from(locationMap.entries())
            .map(([lower, original]) => ({
                value: lower,
                label: original.charAt(0).toUpperCase() + original.slice(1),
            }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [allOfficeAddresses]);

    return (
        <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedOffice || 'all'} onValueChange={(value) => setSelectedOffice(value === 'all' ? null : value)}>
                <SelectTrigger className="w-[200px] h-9">
                    <SelectValue placeholder="Select Office" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Offices</SelectItem>
                    {officeOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
