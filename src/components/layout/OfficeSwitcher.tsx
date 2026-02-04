// src/components/layout/OfficeSwitcher.tsx
"use client";

import React from 'react';
import { useOfficeSelection } from '@/hooks/useOfficeSelection';
import { useDataStore } from '@/hooks/use-data-store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building } from 'lucide-react';

export default function OfficeSwitcher() {
    const { selectedOffice, setSelectedOffice } = useOfficeSelection();
    const { officeAddresses } = useDataStore();

    const officeLocations = React.useMemo(() => {
        const locations = new Set(officeAddresses.map(oa => oa.officeLocation));
        return Array.from(locations).sort();
    }, [officeAddresses]);

    return (
        <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedOffice || 'all'} onValueChange={(value) => setSelectedOffice(value === 'all' ? null : value)}>
                <SelectTrigger className="w-[200px] h-9">
                    <SelectValue placeholder="Select Office" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Offices</SelectItem>
                    {officeLocations.map(location => (
                        <SelectItem key={location} value={location}>{location}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
