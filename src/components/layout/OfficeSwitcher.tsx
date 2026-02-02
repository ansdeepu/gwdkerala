
"use client";

import React from 'react';
import { useOfficeSelection } from '@/hooks/useOfficeSelection';
import { useDataStore } from '@/hooks/use-data-store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

export default function OfficeSwitcher() {
  const { selectedOffice, setSelectedOffice } = useOfficeSelection();
  const { officeAddresses, isLoading } = useDataStore();

  if (isLoading) {
    return <Skeleton className="h-9 w-[200px]" />;
  }

  if (!officeAddresses || officeAddresses.length === 0) {
    return null;
  }

  const sortedAddresses = [...officeAddresses].sort((a, b) => a.officeLocation.localeCompare(b.officeLocation));

  return (
    <div className="flex items-center gap-2">
      <Building className="h-4 w-4 text-muted-foreground" />
      <Select
        value={selectedOffice || 'all'}
        onValueChange={(value) => setSelectedOffice(value === 'all' ? null : value)}
      >
        <SelectTrigger className="w-[200px] h-9">
          <SelectValue placeholder="Select Office" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Offices</SelectItem>
          {sortedAddresses.map(office => (
            <SelectItem key={office.id} value={office.officeLocation}>
              {office.officeLocation}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
