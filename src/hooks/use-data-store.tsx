// src/hooks/use-data-store.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getFirestore, collection, onSnapshot, query, Timestamp, DocumentData, orderBy, getDocs, type QuerySnapshot, where, deleteDoc, doc, addDoc, updateDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { useAuth, type UserProfile } from './useAuth';
import type { DataEntryFormData } from '@/lib/schemas/DataEntrySchema';
import type { ArsEntry } from './useArsEntries';
import type { StaffMember, LsgConstituencyMap, Designation, Bidder as MasterBidder, DepartmentVehicle, HiredVehicle, RigCompressor } from '@/lib/schemas';
import type { AgencyApplication } from './useAgencyApplications';
import { toast } from './use-toast';
import { designationOptions } from '@/lib/schemas';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { E_tender } from './useE_tenders';
import { SUPER_ADMIN_EMAIL } from '@/lib/config';


const db = getFirestore(app);

// Helper to convert Firestore Timestamps to JS Dates recursively
const processFirestoreDoc = <T,>(doc: DocumentData): T => {
    const data = doc.data();
    const converted: { [key: string]: any } = { id: doc.id };

    for (const key in data) {
        const value = data[key];
        if (value instanceof Timestamp) {
            converted[key] = value.toDate();
        } else if (Array.isArray(value)) {
            converted[key] = value.map(item =>
                typeof item === 'object' && item !== null && !(item instanceof Timestamp)
                    ? processFirestoreDoc({ data: () => item, id: '' })
                    : (item instanceof Timestamp ? item.toDate() : item)
            );
        } else if (typeof value === 'object' && value !== null) {
            converted[key] = processFirestoreDoc({ data: () => value, id: '' });
        } else {
            converted[key] = value;
        }
    }
    return converted as T;
};

export type RateDescriptionId = 'tenderFee' | 'emd' | 'performanceGuarantee' | 'additionalPerformanceGuarantee' | 'stampPaper';

export const defaultRateDescriptions: Record<RateDescriptionId, string> = {
    tenderFee: "For Works:\n- Up to Rs 1 Lakh: No Fee\n- Over 1 Lakh up to 10 Lakhs: Rs 500\n- Over 10 Lakhs up to 50 Lakhs: Rs 2500\n- Over 50 Lakhs up to 1 Crore: Rs 5000\n- Above 1 Crore: Rs 10000\n\nFor Purchase:\n- Up to Rs 1 Lakh: No Fee\n- Over 1 Lakh up to 10 Lakhs: Rs 800\n- Over 10 Lakhs up to 25 Lakhs: Rs 1600\n- Above 25 Lakhs: Rs 3000",
    emd: "For Works:\n- Up to Rs. 2 Crore: 2.5% of the project cost, subject to a maximum of Rs. 50,000\n- Above Rs. 2 Crore up to Rs. 5 Crore: Rs. 1 Lakh\n- Above Rs. 5 Crore up to Rs. 10 Crore: Rs. 2 Lakh\n- Above Rs. 10 Crore: Rs. 5 Lakh\n\nFor Purchase:\n- Up to 2 Crore: 1.00% of the project cost\n- Above 2 Crore: No EMD",
    performanceGuarantee: "Performance Guarantee , the amount collected at the time of executing contract agreement will be 5% of the contract value(agrecd PAC)and the deposit will be retained till the texpiry of Defect Liability Period. At least fifty percent(50%) of this deposit shall be collected in the form of Treasury Fixed Deposit and the rest in the form of Bank Guarantee or any other forms prescribed in the revised PWD Manual.",
    additionalPerformanceGuarantee: "Additional Performance Security for abnormally low quoted tenders will be collected at the time of executing contract agreement from the successful tenderer if the tender is below the estimate cost by more than 15%. This deposit is calculated as 25% of the difference between the estimate cost and the tender amount, but it will not exceed 10% of the estimate cost. This deposit will be released after satisfactory completion of the work.",
    stampPaper: "For agreements or memorandums, stamp duty shall be ₹1 for every ₹1,000 (or part) of the contract amount, subject to a minimum of ₹200 and a maximum of ₹1,00,000. For supplementary deeds, duty shall be based on the amount in the supplementary agreement.",
};

export interface OfficeAddress {
  id: string;
  officeName: string;
  officeLocation: string;
  officeCode: string;
  officeNameMalayalam?: string;
  address?: string;
  addressMalayalam?: string;
  phoneNo?: string;
  email?: string;
  districtOfficerStaffId?: string;
  districtOfficer?: string;
  districtOfficerPhotoUrl?: string;
  gstNo?: string;
  panNo?: string;
  otherDetails?: string;
}

const COLLECTIONS = {
    DEPARTMENT: 'departmentVehicles',
    HIRED: 'hiredVehicles',
    RIG_COMPRESSOR: 'rigCompressors',
};

interface DataStoreContextType {
    allFileEntries: DataEntryFormData[];
    allArsEntries: ArsEntry[];
    allStaffMembers: StaffMember[];
    allAgencyApplications: AgencyApplication[];
    allLsgConstituencyMaps: LsgConstituencyMap[];
    allRateDescriptions: Record<RateDescriptionId, string>;
    allBidders: MasterBidder[];
    allE_tenders: E_tender[];
    allDepartmentVehicles: DepartmentVehicle[];
    allHiredVehicles: HiredVehicle[];
    allRigCompressors: RigCompressor[];
    officeAddress: OfficeAddress | null;
    isLoading: boolean;
    refetchFileEntries: () => void;
    refetchArsEntries: () => void;
    deleteArsEntry: (id: string) => Promise<void>;
    refetchStaffMembers: () => void;
    refetchAgencyApplications: () => void;
    refetchLsgConstituencyMaps: () => void;
    refetchRateDescriptions: () => void;
    refetchBidders: () => void;
    refetchE_tenders: () => void;
    addDepartmentVehicle: (data: DepartmentVehicle) => Promise<void>;
    updateDepartmentVehicle: (data: DepartmentVehicle) => Promise<void>;
    deleteDepartmentVehicle: (id: string, name: string) => Promise<void>;
    addHiredVehicle: (data: HiredVehicle) => Promise<void>;
    updateHiredVehicle: (data: HiredVehicle) => Promise<void>;
    deleteHiredVehicle: (id: string, name: string) => Promise<void>;
    addRigCompressor: (data: RigCompressor) => Promise<void>;
    updateRigCompressor: (data: RigCompressor) => Promise<void>;
    deleteRigCompressor: (id: string, name: string) => Promise<void>;
    refetchOfficeAddress: () => void;
}

const DataStoreContext = createContext<DataStoreContextType | undefined>(undefined);

export function DataStoreProvider({ children, user }: { children: ReactNode, user: UserProfile | null }) {
    const [allFileEntries, setAllFileEntries] = useState<DataEntryFormData[]>([]);
    const [allArsEntries, setAllArsEntries] = useState<ArsEntry[]>([]);
    const [allStaffMembers, setAllStaffMembers] = useState<StaffMember[]>([]);
    const [allAgencyApplications, setAllAgencyApplications] = useState<AgencyApplication[]>([]);
    const [allLsgConstituencyMaps, setAllLsgConstituencyMaps] = useState<LsgConstituencyMap[]>([]);
    const [allRateDescriptions, setAllRateDescriptions] = useState<Record<RateDescriptionId, string>>(defaultRateDescriptions);
    const [allBidders, setAllBidders] = useState<MasterBidder[]>([]);
    const [allE_tenders, setAllE_tenders] = useState<E_tender[]>([]);
    const [allDepartmentVehicles, setAllDepartmentVehicles] = useState<DepartmentVehicle[]>([]);
    const [allHiredVehicles, setAllHiredVehicles] = useState<HiredVehicle[]>([]);
    const [allRigCompressors, setAllRigCompressors] = useState<RigCompressor[]>([]);
    const [officeAddress, setOfficeAddress] = useState<OfficeAddress | null>(null);

    const [loadingStates, setLoadingStates] = useState({
        files: true,
        ars: true,
        staff: true,
        agencies: true,
        lsg: true,
        rates: true,
        bidders: true,
        eTenders: true,
        departmentVehicles: true,
        hiredVehicles: true,
        rigCompressors: true,
        officeAddress: true,
    });
    
    // The manual refetch functions are now no-ops because onSnapshot handles real-time updates.
    // This prevents the cascading re-renders that were causing errors.
    const refetchFileEntries = useCallback(() => {}, []);
    const refetchArsEntries = useCallback(() => {}, []);
    const refetchStaffMembers = useCallback(() => {}, []);
    const refetchAgencyApplications = useCallback(() => {}, []);
    const refetchLsgConstituencyMaps = useCallback(() => {}, []);
    const refetchRateDescriptions = useCallback(() => {}, []);
    const refetchBidders = useCallback(() => {}, []);
    const refetchE_tenders = useCallback(() => {}, []);
    const refetchDepartmentVehicles = useCallback(() => {}, []);
    const refetchHiredVehicles = useCallback(() => {}, []);
    const refetchRigCompressors = useCallback(() => {}, []);
    const refetchOfficeAddress = useCallback(() => {}, []);


     const deleteArsEntry = useCallback(async (id: string) => {
        if (!user || user.role !== 'editor') {
            toast({ title: "Permission Denied", description: "You don't have permission to delete entries.", variant: "destructive" });
            return;
        }
        await deleteDoc(doc(db, 'arsEntries', id));
        // No manual refetch needed, onSnapshot will handle it.
    }, [user]);

    useEffect(() => {
        if (!user) {
            setAllFileEntries([]);
            setAllArsEntries([]);
            setAllStaffMembers([]);
            setAllAgencyApplications([]);
            setAllLsgConstituencyMaps([]);
            setAllRateDescriptions(defaultRateDescriptions);
            setAllBidders([]);
            setAllE_tenders([]);
            setAllDepartmentVehicles([]);
            setAllHiredVehicles([]);
            setAllRigCompressors([]);
            setOfficeAddress(null);
            setLoadingStates({ files: false, ars: false, staff: false, agencies: false, lsg: false, rates: false, bidders: false, eTenders: false, officeAddress: false, departmentVehicles: false, hiredVehicles: false, rigCompressors: false });
            return;
        }
        
        setLoadingStates({ files: true, ars: true, staff: true, agencies: true, lsg: true, rates: true, bidders: true, eTenders: true, departmentVehicles: true, hiredVehicles: true, rigCompressors: true, officeAddress: true });

        const collectionsToSubscribe = [
            { name: 'fileEntries', setter: setAllFileEntries, loaderKey: 'files' },
            { name: 'arsEntries', setter: setAllArsEntries, loaderKey: 'ars' },
            { name: 'staffMembers', setter: setAllStaffMembers, loaderKey: 'staff' },
            { name: 'agencyApplications', setter: setAllAgencyApplications, loaderKey: 'agencies' },
            { name: 'localSelfGovernments', setter: setAllLsgConstituencyMaps, loaderKey: 'lsg' },
            { name: 'rateDescriptions', setter: setAllRateDescriptions, loaderKey: 'rates' },
            { name: 'bidders', setter: setAllBidders, loaderKey: 'bidders' },
            { name: 'eTenders', setter: setAllE_tenders, loaderKey: 'eTenders' },
            { name: 'departmentVehicles', setter: setAllDepartmentVehicles, loaderKey: 'departmentVehicles' },
            { name: 'hiredVehicles', setter: setAllHiredVehicles, loaderKey: 'hiredVehicles' },
            { name: 'rigCompressors', setter: setAllRigCompressors, loaderKey: 'rigCompressors' },
            { name: 'officeAddresses', setter: setOfficeAddress, loaderKey: 'officeAddress' },
        ];

        const unsubscribes = collectionsToSubscribe.map(({ name, setter, loaderKey }) => {
            const isSuperAdminUser = user.email === SUPER_ADMIN_EMAIL;
            const baseQuery = collection(db, name);
            let q;

            const officeScopedCollections = [
                'fileEntries', 'arsEntries', 'staffMembers', 'agencyApplications', 'eTenders',
                'departmentVehicles', 'hiredVehicles', 'rigCompressors', 'officeAddresses'
            ];

            if (officeScopedCollections.includes(name)) {
                if (isSuperAdminUser) {
                    q = query(baseQuery); // Super admin gets all data
                } else if (user.officeLocation) {
                    q = query(baseQuery, where('officeLocation', '==', user.officeLocation));
                } else {
                    // Safety fallback: if a non-super-admin user has no office, they see nothing.
                    q = query(baseQuery, where('officeLocation', '==', '__invalid_location__'));
                }
            } else {
                // Global collections like bidders, lsg, rateDescriptions
                q = query(baseQuery);
            }
            
            // Apply specific ordering if needed
            if (name === 'bidders') {
                q = query(q, orderBy("order"));
            } else if (name === 'eTenders' && isSuperAdminUser) { // Only sort for super admin to avoid composite index
                q = query(q, orderBy("tenderDate", "desc"));
            }

            return onSnapshot(q, (snapshot) => {
                if (name === 'rateDescriptions') {
                     if (snapshot.empty) {
                        setter(defaultRateDescriptions);
                    } else {
                        const descriptions: Partial<Record<RateDescriptionId, string>> = {};
                        snapshot.forEach(doc => {
                            descriptions[doc.id as RateDescriptionId] = doc.data().description;
                        });
                        setter((prev: Record<RateDescriptionId, string>) => ({ ...defaultRateDescriptions, ...prev, ...descriptions }));
                    }
                } else if (name === 'officeAddresses') {
                    if (snapshot.empty) {
                        setter(null);
                    } else {
                        const doc = snapshot.docs[0];
                        setter({ id: doc.id, ...doc.data() } as OfficeAddress);
                    }
                } else {
                    const data = snapshot.docs.map(doc => {
                        const docData = doc.data();
                        const processed = processFirestoreDoc<any>({ id: doc.id, data: () => docData });
                        processed.id = doc.id;
                        return processed;
                    });

                    if (name === 'staffMembers') {
                        const designationSortOrder = designationOptions.reduce((acc, curr, index) => ({ ...acc, [curr]: index }), {} as Record<string, number>);
                        data.sort((a: StaffMember, b: StaffMember) => {
                            const orderA = a.designation ? designationSortOrder[a.designation] ?? designationOptions.length : designationOptions.length;
                            const orderB = b.designation ? designationSortOrder[b.designation] ?? designationOptions.length : designationOptions.length;
                            if (orderA !== orderB) return orderA - orderB;
                            return a.name.localeCompare(b.name);
                        });
                    }
                    setter(data);
                }
                setLoadingStates(prev => ({...prev, [loaderKey]: false}));
            }, (error) => {
                if (error.code === 'permission-denied') {
                    const permissionError = new FirestorePermissionError({
                        path: `/${name}`,
                        operation: 'list',
                    });
                    errorEmitter.emit('permission-error', permissionError);
                } else {
                    console.error(`Error fetching ${name}:`, error);
                    toast({ title: `Error Loading ${name}`, description: error.message, variant: "destructive" });
                }
                setLoadingStates(prev => ({...prev, [loaderKey]: false}));
            });
        });

        return () => {
            unsubscribes.forEach(unsub => unsub());
        };
    }, [user]);


    const isLoading = Object.values(loadingStates).some(Boolean);

    const useAddVehicle = <T extends {}>(collectionName: string) => {
      return useCallback(async (data: T) => {
          if (!user) throw new Error("User must be logged in.");
          const payload = { ...data, officeLocation: user.officeLocation, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
          if ('id' in payload) delete (payload as any).id;
          await addDoc(collection(db, collectionName), payload);
          toast({ title: 'Item Added', description: 'The new item has been saved.' });
      }, [user]);
    };
  
    const useUpdateVehicle = <T extends { id?: string }>(collectionName: string) => {
      return useCallback(async (data: T) => {
          if (!user) throw new Error("User must be logged in.");
          if (!data.id) throw new Error("Document ID is missing for update.");
          const docRef = doc(db, collectionName, data.id);
          const payload = { ...data, updatedAt: serverTimestamp() };
          if ('id' in payload) delete (payload as any).id;
          await updateDoc(docRef, payload);
          toast({ title: 'Item Updated', description: 'Your changes have been saved.' });
      }, [user]);
    };
  
    const useDeleteVehicle = (collectionName: string) => {
      return useCallback(async (id: string, name: string) => {
          if (!user) throw new Error("User must be logged in.");
          const docRef = doc(db, collectionName, id);
          await deleteDoc(docRef);
          toast({ title: 'Item Deleted', description: `${name} has been removed.` });
      }, [user]);
    };

    const addDepartmentVehicle = useAddVehicle<DepartmentVehicle>(COLLECTIONS.DEPARTMENT);
    const updateDepartmentVehicle = useUpdateVehicle<DepartmentVehicle>(COLLECTIONS.DEPARTMENT);
    const deleteDepartmentVehicle = useDeleteVehicle(COLLECTIONS.DEPARTMENT);

    const addHiredVehicle = useAddVehicle<HiredVehicle>(COLLECTIONS.HIRED);
    const updateHiredVehicle = useUpdateVehicle<HiredVehicle>(COLLECTIONS.HIRED);
    const deleteHiredVehicle = useDeleteVehicle(COLLECTIONS.HIRED);

    const addRigCompressor = useAddVehicle<RigCompressor>(COLLECTIONS.RIG_COMPRESSOR);
    const updateRigCompressor = useUpdateVehicle<RigCompressor>(COLLECTIONS.RIG_COMPRESSOR);
    const deleteRigCompressor = useDeleteVehicle(COLLECTIONS.RIG_COMPRESSOR);


    return (
        <DataStoreContext.Provider value={{
            allFileEntries,
            allArsEntries,
            allStaffMembers,
            allAgencyApplications,
            allLsgConstituencyMaps,
            allRateDescriptions,
            allBidders,
            allE_tenders,
            allDepartmentVehicles,
            allHiredVehicles,
            allRigCompressors,
            officeAddress,
            isLoading,
            refetchFileEntries,
            refetchArsEntries,
            deleteArsEntry,
            refetchStaffMembers,
            refetchAgencyApplications,
            refetchLsgConstituencyMaps,
            refetchRateDescriptions,
            refetchBidders,
            refetchE_tenders,
            addDepartmentVehicle,
            updateDepartmentVehicle,
            deleteDepartmentVehicle,
            addHiredVehicle,
            updateHiredVehicle,
            deleteHiredVehicle,
            addRigCompressor,
            updateRigCompressor,
            deleteRigCompressor,
            refetchOfficeAddress,
        }}>
            {children}
        </DataStoreContext.Provider>
    );
}

export function useDataStore() {
    const context = useContext(DataStoreContext);
    if (!context) {
        throw new Error('useDataStore must be used within a DataStoreProvider');
    }
    return context;
}
