
// src/components/layout/OfficeSwitcher.tsx
"use client";

import React from 'react';
import { useDataStore } from '@/hooks/use-data-store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building } from 'lucide-react';

export default function OfficeSwitcher() {
    const { selectedOffice, setSelectedOffice, allUsers } = useDataStore();

    const officeOptions = React.useMemo(() => {
        // Use a Set to ensure unique office locations, derived from users who have one.
        const locations = new Set<string>();
        allUsers.forEach(user => {
            if (user.officeLocation) {
                locations.add(user.officeLocation);
            }
        });
        
        return Array.from(locations)
            .map(location => ({
                value: location, // Use original casing for value
                label: location.charAt(0).toUpperCase() + location.slice(1).toLowerCase(), // Keep display friendly
            }))
            .sort((a, b) => a.label.localeCompare(b.label));
            
    }, [allUsers]);

    const handleValueChange = (value: string) => {
        const newSelection = value === 'all' ? null : value;
        setSelectedOffice(newSelection);
    };

    return (
        <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedOffice || 'all'} onValueChange={handleValueChange}>
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
