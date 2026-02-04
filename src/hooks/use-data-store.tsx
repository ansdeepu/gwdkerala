// src/hooks/use-data-store.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { getFirestore, collection, onSnapshot, query, Timestamp, DocumentData, orderBy, getDocs, type QuerySnapshot, where, deleteDoc, doc, addDoc, updateDoc, serverTimestamp, writeBatch, collectionGroup } from 'firebase/firestore';
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
import { useOfficeSelection } from './useOfficeSelection';

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
    tenderFee: "For Works:\\n- Up to Rs 1 Lakh: No Fee\\n- Over 1 Lakh up to 10 Lakhs: Rs 500\\n- Over 10 Lakhs up to 50 Lakhs: Rs 2500\\n- Over 50 Lakhs up to 1 Crore: Rs 5000\\n- Above 1 Crore: Rs 10000\\n\\nFor Purchase:\\n- Up to Rs 1 Lakh: No Fee\\n- Over 1 Lakh up to 10 Lakhs: Rs 800\\n- Over 10 Lakhs up to 25 Lakhs: Rs 1600\\n- Above 25 Lakhs: Rs 3000",
    emd: "For Works:\\n- Up to Rs. 2 Crore: 2.5% of the project cost, subject to a maximum of Rs. 50,000\\n- Above Rs. 2 Crore up to Rs. 5 Crore: Rs. 1 Lakh\\n- Above Rs. 5 Crore up to Rs. 10 Crore: Rs. 2 Lakh\\n- Above Rs. 10 Crore: Rs. 5 Lakh\\n\\nFor Purchase:\\n- Up to 2 Crore: 1.00% of the project cost\\n- Above 2 Crore: No EMD",
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
    officeAddresses: OfficeAddress[];
    officeAddress: OfficeAddress | null;
    isLoading: boolean;
    refetchRateDescriptions: () => void;
    deleteArsEntry: (id: string) => Promise<void>;
    addDepartmentVehicle: (data: DepartmentVehicle) => Promise<void>;
    updateDepartmentVehicle: (data: DepartmentVehicle) => Promise<void>;
    deleteDepartmentVehicle: (id: string, name: string) => Promise<void>;
    addHiredVehicle: (data: HiredVehicle) => Promise<void>;
    updateHiredVehicle: (data: HiredVehicle) => Promise<void>;
    deleteHiredVehicle: (id: string, name: string) => Promise<void>;
    addRigCompressor: (data: RigCompressor) => Promise<void>;
    updateRigCompressor: (data: RigCompressor) => Promise<void>;
    deleteRigCompressor: (id: string, name: string) => Promise<void>;
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
    const [officeAddresses, setOfficeAddresses] = useState<OfficeAddress[]>([]);
    const [officeAddress, setOfficeAddress] = useState<OfficeAddress | null>(null);

    const [loadingStates, setLoadingStates] = useState({
        files: true, ars: true, staff: true, agencies: true, lsg: true, rates: true, bidders: true, eTenders: true,
        departmentVehicles: true, hiredVehicles: true, rigCompressors: true, officeAddress: true,
    });
    
    const { selectedOffice } = useOfficeSelection();
    const refetchRateDescriptions = useCallback(() => setLoadingStates(prev => ({...prev, rates: true})), []);

     const deleteArsEntry = useCallback(async (id: string) => {
        if (!user || user.role !== 'editor') {
            toast({ title: "Permission Denied", description: "You don't have permission to delete entries.", variant: "destructive" });
            return;
        }
        await deleteDoc(doc(db, 'arsEntries', id));
    }, [user]);

    // Effect for GLOBAL (non-office-specific) data
    useEffect(() => {
        if (!user) {
            setAllLsgConstituencyMaps([]);
            setAllRateDescriptions(defaultRateDescriptions);
            setAllBidders([]);
            setOfficeAddresses([]);
            setLoadingStates(prev => ({ ...prev, lsg: false, rates: false, bidders: false, officeAddress: false }));
            return;
        }

        const globalCollections: Record<string, { setter: React.Dispatch<React.SetStateAction<any>>, loaderKey: keyof typeof loadingStates, queryFn: () => any }> = {
            localSelfGovernments: { setter: setAllLsgConstituencyMaps, loaderKey: 'lsg', queryFn: () => query(collection(db, 'localSelfGovernments')) },
            rateDescriptions: { setter: setAllRateDescriptions, loaderKey: 'rates', queryFn: () => query(collection(db, 'rateDescriptions')) },
            bidders: { setter: setAllBidders, loaderKey: 'bidders', queryFn: () => query(collection(db, 'bidders'), orderBy("order")) },
            officeAddresses: { setter: setOfficeAddresses, loaderKey: 'officeAddress', queryFn: () => query(collection(db, 'officeAddresses')) }
        };

        const unsubscribes = Object.entries(globalCollections).map(([collectionName, { setter, loaderKey, queryFn }]) => {
            setLoadingStates(prev => ({ ...prev, [loaderKey]: true }));
            
            return onSnapshot(queryFn(), (snapshot: QuerySnapshot<DocumentData>) => {
                if (collectionName === 'rateDescriptions') {
                    const descriptions = snapshot.docs.reduce((acc, doc) => ({...acc, [doc.id]: doc.data().description}), {} as Record<RateDescriptionId, string>);
                    setter((prev: Record<RateDescriptionId, string>) => ({ ...defaultRateDescriptions, ...prev, ...descriptions }));
                } else {
                    const data = snapshot.docs.map(doc => processFirestoreDoc({ id: doc.id, data: () => doc.data() }));
                    setter(data);
                }
                setLoadingStates(prev => ({...prev, [loaderKey]: false}));
            }, (error) => {
                console.error(`Error fetching global collection ${collectionName}:`, error);
                setLoadingStates(prev => ({...prev, [loaderKey]: false}));
            });
        });

        return () => unsubscribes.forEach(unsub => unsub());
    }, [user]);

    // Effect for OFFICE-SCOPED data
    useEffect(() => {
        if (!user) {
            setAllFileEntries([]); setAllArsEntries([]); setAllStaffMembers([]); setAllAgencyApplications([]);
            setAllE_tenders([]); setAllDepartmentVehicles([]); setAllHiredVehicles([]); setAllRigCompressors([]);
            setLoadingStates(prev => ({ ...prev, files: false, ars: false, staff: false, agencies: false, eTenders: false, departmentVehicles: false, hiredVehicles: false, rigCompressors: false }));
            return;
        }
        
        const isSuperAdminUser = user.email === SUPER_ADMIN_EMAIL;
        const officeToQuery = !isSuperAdminUser ? user.officeLocation : selectedOffice;

        const officeScopedCollections: Record<string, { setter: React.Dispatch<React.SetStateAction<any>>, loaderKey: keyof typeof loadingStates, needsSpecialSort?: boolean }> = {
            fileEntries: { setter: setAllFileEntries, loaderKey: 'files' },
            arsEntries: { setter: setAllArsEntries, loaderKey: 'ars' },
            staffMembers: { setter: setAllStaffMembers, loaderKey: 'staff', needsSpecialSort: true },
            agencyApplications: { setter: setAllAgencyApplications, loaderKey: 'agencies' },
            eTenders: { setter: setAllE_tenders, loaderKey: 'eTenders', needsSpecialSort: true },
            departmentVehicles: { setter: setAllDepartmentVehicles, loaderKey: 'departmentVehicles' },
            hiredVehicles: { setter: setAllHiredVehicles, loaderKey: 'hiredVehicles' },
            rigCompressors: { setter: setAllRigCompressors, loaderKey: 'rigCompressors' }
        };

        const unsubscribes = Object.entries(officeScopedCollections).map(([collectionName, { setter, loaderKey, needsSpecialSort }]) => {
            setLoadingStates(prev => ({...prev, [loaderKey]: true}));
            
            let q;
            if (officeToQuery) {
                const path = `offices/${officeToQuery.toLowerCase()}/${collectionName}`;
                q = query(collection(db, path));
            } else if (isSuperAdminUser) {
                q = query(collectionGroup(db, collectionName));
            } else {
                setter([]);
                setLoadingStates(prev => ({...prev, [loaderKey]: false}));
                return () => {};
            }

            if (collectionName === 'eTenders' && !isSuperAdminUser) { 
                q = query(q, orderBy("tenderDate", "desc"));
            }
            
            return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
                const data = snapshot.docs.map(doc => {
                    const docData = doc.data();
                    const processedData = processFirestoreDoc({ id: doc.id, data: () => docData });
                    if(isSuperAdminUser && !officeToQuery) {
                        const pathSegments = doc.ref.path.split('/');
                        const officeIdIndex = pathSegments.indexOf('offices');
                        if (officeIdIndex > -1 && pathSegments.length > officeIdIndex + 1) {
                            (processedData as any).officeLocation = pathSegments[officeIdIndex + 1].charAt(0).toUpperCase() + pathSegments[officeIdIndex + 1].slice(1);
                        }
                    }
                    return processedData;
                });
                
                if (needsSpecialSort && collectionName === 'staffMembers') {
                    const designationSortOrder = designationOptions.reduce((acc, curr, index) => ({ ...acc, [curr]: index }), {} as Record<string, number>);
                    (data as StaffMember[]).sort((a, b) => {
                        const orderA = a.designation ? designationSortOrder[a.designation] ?? designationOptions.length : designationOptions.length;
                        const orderB = b.designation ? designationSortOrder[b.designation] ?? designationOptions.length : designationOptions.length;
                        if (orderA !== orderB) return orderA - orderB;
                        return a.name.localeCompare(b.name);
                    });
                }
                setter(data);
                setLoadingStates(prev => ({...prev, [loaderKey]: false}));
            }, (error) => {
                 if (error.code === 'permission-denied') {
                    errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `offices/.../${collectionName}`, operation: 'list' }));
                } else {
                    console.error(`Error fetching ${collectionName}:`, error);
                    toast({ title: `Error Loading ${collectionName}`, description: error.message, variant: "destructive" });
                }
                setLoadingStates(prev => ({...prev, [loaderKey]: false}));
            });
        });

        return () => unsubscribes.forEach(unsub => unsub());
    }, [user, selectedOffice]);
    
    // Effect to set the single current officeAddress
    useEffect(() => {
        if (!user) return;
        const isSuperAdminUser = user.email === SUPER_ADMIN_EMAIL;
        
        if (isSuperAdminUser) {
            if (selectedOffice) {
                const currentOffice = officeAddresses.find(oa => oa.officeLocation === selectedOffice);
                setOfficeAddress(currentOffice || null);
            } else {
                setOfficeAddress(null);
            }
        } else if (user.officeLocation) {
            const currentOffice = officeAddresses.find(oa => oa.officeLocation === user.officeLocation);
            setOfficeAddress(currentOffice || null);
        }
    }, [officeAddresses, user, selectedOffice]);

    const isLoading = Object.values(loadingStates).some(Boolean);

    const useAddVehicle = <T extends {}>(collectionName: string) => {
      return useCallback(async (data: T) => {
          if (!user) throw new Error("User must be logged in.");
          if (!user.officeLocation) throw new Error("User must have an office location.");
          const collectionPath = `offices/${user.officeLocation.toLowerCase()}/${collectionName}`;
          const payload = { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
          if ('id' in payload) delete (payload as any).id;
          await addDoc(collection(db, collectionPath), payload);
          toast({ title: 'Item Added', description: 'The new item has been saved.' });
      }, [user]);
    };
  
    const useUpdateVehicle = <T extends { id?: string }>(collectionName: string) => {
      return useCallback(async (data: T) => {
          if (!user) throw new Error("User must be logged in.");
          if (!user.officeLocation) throw new Error("User must have an office location.");
          if (!data.id) throw new Error("Document ID is missing for update.");
          const docRef = doc(db, `offices/${user.officeLocation.toLowerCase()}/${collectionName}`, data.id);
          const payload = { ...data, updatedAt: serverTimestamp() };
          if ('id' in payload) delete (payload as any).id;
          await updateDoc(docRef, payload);
          toast({ title: 'Item Updated', description: 'Your changes have been saved.' });
      }, [user]);
    };
  
    const useDeleteVehicle = (collectionName: string) => {
      return useCallback(async (id: string, name: string) => {
          if (!user) throw new Error("User must be logged in.");
           if (!user.officeLocation) throw new Error("User must have an office location.");
          const docRef = doc(db, `offices/${user.officeLocation.toLowerCase()}/${collectionName}`, id);
          deleteDoc(docRef)
              .then(() => {
                  toast({ title: 'Item Deleted', description: `${name} has been removed.` });
              })
              .catch(error => {
                  if (error.code === 'permission-denied') {
                      errorEmitter.emit('permission-error', new FirestorePermissionError({
                          path: docRef.path,
                          operation: 'delete',
                      }));
                  } else {
                      toast({ title: "Error Deleting Item", description: error.message, variant: "destructive" });
                  }
              });
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
            allFileEntries, allArsEntries, allStaffMembers, allAgencyApplications, allLsgConstituencyMaps, allRateDescriptions,
            allBidders, allE_tenders, allDepartmentVehicles, allHiredVehicles, allRigCompressors, officeAddresses, officeAddress, isLoading,
            deleteArsEntry, addDepartmentVehicle,
            updateDepartmentVehicle, deleteDepartmentVehicle, addHiredVehicle, updateHiredVehicle, deleteHiredVehicle,
            addRigCompressor, updateRigCompressor, deleteRigCompressor, refetchRateDescriptions,
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
