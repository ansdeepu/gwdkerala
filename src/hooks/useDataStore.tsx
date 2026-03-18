
// src/hooks/use-data-store.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getFirestore, collection, onSnapshot, query, Timestamp, DocumentData, orderBy, getDocs, type QuerySnapshot, where, deleteDoc, doc, addDoc, updateDoc, serverTimestamp, writeBatch, collectionGroup, setDoc } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { useAuth, type UserProfile } from './useAuth';
import type { DataEntryFormData } from '@/lib/schemas/DataEntrySchema';
import type { ArsEntry } from './useArsEntries';
import type { StaffMember, LsgConstituencyMap, Designation, Bidder as MasterBidder, DepartmentVehicle, HiredVehicle, RigCompressor, OfficeAddress as OfficeAddressType } from '@/lib/schemas';
import { designationOptions } from '@/lib/schemas';
import type { AgencyApplication } from './useAgencyApplications';
import { toast } from './use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { E_tender } from './useE_tenders';
import { SUPER_ADMIN_EMAIL } from '@/lib/config';

const db = getFirestore(app);

/**
 * Robustly converts Firestore documents or data objects to JS objects.
 * Recursively converts Timestamps to Dates while preserving all other properties.
 */
const processFirestoreData = (data: any): any => {
    if (data === null || data === undefined) return data;

    if (data instanceof Timestamp) {
        return data.toDate();
    }

    if (Array.isArray(data)) {
        return data.map(processFirestoreData);
    }

    if (typeof data === 'object' && !(data instanceof Date)) {
        const processed: Record<string, any> = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                processed[key] = processFirestoreData(data[key]);
            }
        }
        return processed;
    }

    return data;
};

const processFirestoreDoc = <T,>(docSnap: any): T => {
    const data = typeof docSnap.data === 'function' ? docSnap.data() : docSnap;
    if (!data) return {} as T;
    const processed = processFirestoreData(data);
    const id = docSnap.id || (processed as any).id || (processed as any).uid;
    return { ...processed, id: id, uid: id } as T;
};

export type RateDescriptionId = 'tenderFee' | 'emd' | 'performanceGuarantee' | 'additionalPerformanceGuarantee' | 'stampPaper';

export const defaultRateDescriptions: Record<RateDescriptionId, string> = {
    tenderFee: "For Works:\n- Up to Rs 1 Lakh: No Fee\n- Over 1 Lakh up to 10 Lakhs: Rs 500\n- Over 10 Lakhs up to 50 Lakhs: Rs 2500\n- Over 50 Lakhs up to 1 Crore: Rs 5000\n- Above 1 Crore: Rs 10000\n\nFor Purchase:\n- Up to Rs 1 Lakh: No Fee\n- Over 1 Lakh up to 10 Lakhs: Rs 800\n- Over 10 Lakhs up to 25 Lakhs: Rs 1600\n- Above 25 Lakhs: Rs 3000",
    emd: "For Works:\n- Up to Rs. 2 Crore: 2.5% of the project cost, subject to a maximum of Rs. 50,000\n- Above Rs. 2 Crore up to Rs. 5 Crore: Rs. 1 Lakh\n- Above Rs. 5 Crore up to Rs. 10 Crore: Rs. 2 Lakh\n- Above Rs. 10 Crore: Rs. 5 Lakh\n\nFor Purchase:\n- Up to 2 Crore: 1.00% of the project cost\n- Above 2 Crore: No EMD",
    performanceGuarantee: "Performance Guarantee, the amount collected at the time of executing contract agreement will be 5% of the contract value (agreed PAC) and the deposit will be retained till the expiry of Defect Liability Period. At least fifty percent (50%) of this deposit shall be collected in the form of Treasury Fixed Deposit and the rest in the form of Bank Guarantee or any other forms prescribed in the revised PWD Manual.",
    additionalPerformanceGuarantee: "Additional Performance Security for abnormally low quoted tenders will be collected at the time of executing contract agreement from the successful tenderer if the tender is below the estimate cost by more than 15%. This deposit is calculated as 25% of the difference between the estimate cost and the tender amount, but it will not exceed 10% of the estimate cost. This deposit will be released after satisfactory completion of the work.",
    stampPaper: "For agreements or memorandums, stamp duty shall be ₹1 for every ₹1,00,000 (or part) of the contract amount, subject to a minimum of ₹200 and a maximum of ₹1,00,000. For supplementary deeds, duty shall be based on the amount in the supplementary agreement.",
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
  stsbAccountNo?: string;
  nameOfTreasury?: string;
  bankAccountNo?: string;
  nameOfBank?: string;
  bankBranch?: string;
  bankIfsc?: string;
}

const COLLECTIONS = {
    DEPARTMENT: 'departmentVehicles',
    HIRED: 'hiredVehicles',
    RIG_COMPRESSOR: 'rigCompressors',
};

interface DataStoreContextType {
    selectedOffice: string | null;
    setSelectedOffice: (office: string | null) => void;
    allUsers: UserProfile[];
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
    allOfficeAddresses: OfficeAddress[];
    allSanctionedStrength: Record<string, number>;
    updateSanctionedStrength: (designation: string, count: number) => Promise<void>;
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
    const [selectedOffice, setSelectedOffice] = useState<string | null>(null);
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
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
    const [globalOfficeAddresses, setGlobalOfficeAddresses] = useState<OfficeAddress[]>([]);
    const [officeAddress, setOfficeAddress] = useState<OfficeAddress | null>(null);
    const [allSanctionedStrength, setAllSanctionedStrength] = useState<Record<string, number>>({});

    const [loadingStates, setLoadingStates] = useState({
        users: true, files: true, ars: true, staff: true, agencies: true, lsg: true, rates: true, bidders: true, eTenders: true,
        departmentVehicles: true, hiredVehicles: true, rigCompressors: true, officeAddress: true, sanctionedStrength: true,
    });
    
    const refetchRateDescriptions = useCallback(() => setLoadingStates(prev => ({...prev, rates: true})), []);

     const deleteArsEntry = useCallback(async (id: string) => {
        if (!user || (user.role !== 'admin' && user.role !== 'superAdmin')) {
            toast({ title: "Permission Denied", description: "You don't have permission to delete entries.", variant: "destructive" });
            return;
        }
        const officeLoc = user.role === 'superAdmin' ? selectedOffice : user.officeLocation;
        if (!officeLoc) throw new Error("An office location must be selected.");
        const collectionPath = `offices/${officeLoc.toLowerCase()}/arsEntries`;
        await deleteDoc(doc(db, collectionPath, id));
    }, [user, selectedOffice]);

    const updateSanctionedStrength = useCallback(async (designation: string, count: number) => {
        if (!user) throw new Error("User must be logged in.");
        const officeLoc = user.role === 'superAdmin' ? selectedOffice : user.officeLocation;
        if (!officeLoc) throw new Error("An office location must be selected.");
        
        const docRef = doc(db, `offices/${officeLoc.toLowerCase()}/sanctionedStrength`, designation);
        await setDoc(docRef, { count, updatedAt: serverTimestamp() });
    }, [user, selectedOffice]);

    // Effect for GLOBAL (non-office-specific) data
    useEffect(() => {
        if (!user) {
            setAllRateDescriptions(defaultRateDescriptions);
            setAllBidders([]);
            setGlobalOfficeAddresses([]);
            setLoadingStates(prev => ({ ...prev, rates: false, bidders: false, officeAddress: false }));
            return;
        }
        
        const globalCollections: Record<string, { setter: React.Dispatch<React.SetStateAction<any>>, loaderKey: keyof typeof loadingStates, queryFn: () => any }> = {
            rateDescriptions: { setter: setAllRateDescriptions, loaderKey: 'rates', queryFn: () => query(collection(db, 'rateDescriptions')) },
            officeAddresses: { setter: setGlobalOfficeAddresses, loaderKey: 'officeAddress', queryFn: () => query(collection(db, 'officeAddresses')) },
        };

        const unsubscribes = Object.entries(globalCollections).map(([collectionName, { setter, loaderKey, queryFn }]) => {
            setLoadingStates(prev => ({ ...prev, [loaderKey]: true }));
            
            return onSnapshot(queryFn(), (snapshot: QuerySnapshot<DocumentData>) => {
                if (collectionName === 'rateDescriptions') {
                    const descriptions = snapshot.docs.reduce((acc, doc) => ({...acc, [doc.id]: doc.data().description}), {} as Record<RateDescriptionId, string>);
                    setter((prev: Record<RateDescriptionId, string>) => ({ ...defaultRateDescriptions, ...prev, ...descriptions }));
                } else {
                    const data = snapshot.docs.map(doc => processFirestoreDoc(doc));
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

    // Effect to set the single active office address
    useEffect(() => {
      if (!user) {
          setOfficeAddress(null);
          return;
      }
      const isSuperAdminUser = user.email === SUPER_ADMIN_EMAIL;
      const officeLocation = isSuperAdminUser ? selectedOffice : user.officeLocation;
  
      if (!officeLocation) {
          setOfficeAddress(null);
          return;
      }
  
      const globalOffice = globalOfficeAddresses.find(oa => (oa.officeLocation || '').toLowerCase() === officeLocation.toLowerCase());
      
      const subOfficeCollectionPath = `offices/${officeLocation.toLowerCase()}/officeAddresses`;
      const q = query(collection(db, subOfficeCollectionPath));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
          if (!snapshot.empty) {
              // Find the document with the most fields to ensure we pick the correct one
              const bestDocSnap = snapshot.docs.reduce((prev, curr) => {
                  return Object.keys(curr.data()).length > Object.keys(prev.data()).length ? curr : prev;
              }, snapshot.docs[0]);

              const subOfficeDoc = processFirestoreDoc<OfficeAddressType>(bestDocSnap);
              setOfficeAddress({
                  ...subOfficeDoc,
                  officeLocation: officeLocation, // Standardise case from auth/selection
                  officeCode: globalOffice?.officeCode || subOfficeDoc.officeCode || '',
              });
          } else {
              if (globalOffice) {
                  setOfficeAddress({ ...globalOffice, officeName: '', id: globalOffice.id });
              } else {
                  setOfficeAddress(null);
              }
          }
      }, (error) => {
          console.error("Error fetching sub-collection officeAddress:", error);
          setOfficeAddress(null);
      });
  
      return () => unsubscribe();
    }, [user, selectedOffice, globalOfficeAddresses]);

    // Dedicated effect for ALL users when super admin is logged in. This is NOT dependent on selectedOffice.
    useEffect(() => {
        if (user?.email !== SUPER_ADMIN_EMAIL) return;
    
        setLoadingStates(prev => ({ ...prev, users: true }));
        const q = query(collection(db, 'users'));
    
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const usersList = snapshot.docs.map(doc => processFirestoreDoc<UserProfile>(doc));
            setAllUsers(usersList);
            setLoadingStates(prev => ({ ...prev, users: false }));
        }, (error) => {
            console.error("Error fetching all users for super admin:", error);
            setLoadingStates(prev => ({ ...prev, users: false }));
        });
    
        return () => unsubscribe();
    }, [user]);
    

    // Effect for OFFICE-SCOPED data
    useEffect(() => {
        if (!user) {
            // Clear all data if no user
            setAllFileEntries([]); setAllArsEntries([]); setAllStaffMembers([]);
            setAllAgencyApplications([]); setAllE_tenders([]); setAllDepartmentVehicles([]);
            setAllHiredVehicles([]); setAllRigCompressors([]); setAllLsgConstituencyMaps([]);
            setAllSanctionedStrength({}); setAllBidders([]);
            if(user?.email !== SUPER_ADMIN_EMAIL) setAllUsers([]);
            setLoadingStates(prev => ({ ...prev, users: false, files: false, ars: false, staff: false, agencies: false, eTenders: false, departmentVehicles: false, hiredVehicles: false, rigCompressors: false, lsg: false, sanctionedStrength: false, bidders: false }));
            return;
        }
        
        const isSuperAdminUser = user.email === SUPER_ADMIN_EMAIL;
        const officeToQuery = isSuperAdminUser ? selectedOffice : user.officeLocation;

        const officeScopedCollections: Record<string, { setter: React.Dispatch<React.SetStateAction<any>>, loaderKey: keyof typeof loadingStates, needsSpecialSort?: boolean }> = {
            fileEntries: { setter: setAllFileEntries, loaderKey: 'files' },
            arsEntries: { setter: setAllArsEntries, loaderKey: 'ars' },
            staffMembers: { setter: setAllStaffMembers, loaderKey: 'staff', needsSpecialSort: true },
            agencyApplications: { setter: setAllAgencyApplications, loaderKey: 'agencies' },
            eTenders: { setter: setAllE_tenders, loaderKey: 'eTenders', needsSpecialSort: true },
            departmentVehicles: { setter: setAllDepartmentVehicles, loaderKey: 'departmentVehicles' },
            hiredVehicles: { setter: setAllHiredVehicles, loaderKey: 'hiredVehicles' },
            rigCompressors: { setter: setAllRigCompressors, loaderKey: 'rigCompressors' },
            localSelfGovernments: { setter: setAllLsgConstituencyMaps, loaderKey: 'lsg' },
            bidders: { setter: setAllBidders, loaderKey: 'bidders' },
        };
        
        // For sub-office users, also fetch their office-specific user list.
        if (!isSuperAdminUser) {
            officeScopedCollections.users = { setter: setAllUsers, loaderKey: 'users' };
        }

        const unsubscribes = Object.entries(officeScopedCollections).map(([collectionName, { setter, loaderKey, needsSpecialSort }]) => {
            setLoadingStates(prev => ({...prev, [loaderKey]: true}));
            
            let q;
            if (officeToQuery) {
                const path = `offices/${officeToQuery.toLowerCase()}/${collectionName}`;
                if (collectionName === 'bidders') {
                    q = query(collection(db, path), orderBy("order"));
                } else {
                    q = query(collection(db, path));
                }
            } else if (isSuperAdminUser && !officeToQuery) {
                if (collectionName === 'users') {
                    q = query(collection(db, 'users'));
                } else {
                    q = query(collectionGroup(db, collectionName));
                }
            } else {
                setter([]);
                setLoadingStates(prev => ({...prev, [loaderKey]: false}));
                return () => {};
            }
            
            return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
                const dataRaw = snapshot.docs.map(docSnap => {
                    const processedData = processFirestoreDoc({ id: docSnap.id, data: () => docSnap.data() }) as any;
                    const path = docSnap.ref.path || '';
                    const pathSegments = (path || '').split('/');
                    if (Array.isArray(pathSegments)) {
                        const officeIdIndex = pathSegments.indexOf('offices');
                        if (officeIdIndex > -1 && pathSegments.length > officeIdIndex + 1) {
                            processedData.officeLocationFromPath = pathSegments[officeIdIndex + 1];
                        }
                    }
                    return processedData;
                });

                let data = dataRaw;
                
                if (collectionName === 'users') {
                    const mergedMap = new Map<string, any>();
                    dataRaw.forEach((item: any) => {
                        // Ensure uid is standardized for the UserManagement module
                        const uid = item.uid || item.id;
                        const existing = mergedMap.get(uid);
                        if (!existing) {
                            mergedMap.set(uid, { ...item, uid });
                        } else {
                            const merged = { ...existing };
                            Object.entries(item).forEach(([k, v]) => {
                                if (v !== null && v !== undefined && v !== "") {
                                    (merged as any)[k] = v;
                                }
                            });
                            mergedMap.set(uid, merged);
                        }
                    });
                    data = Array.from(mergedMap.values());
                }
                
                if (needsSpecialSort && collectionName === 'staffMembers' && designationOptions) {
                    const dOptions = Array.isArray(designationOptions) ? [...designationOptions] : [];
                    const designationSortOrder = dOptions.reduce((acc, curr, index) => ({ ...acc, [curr]: index }), {} as Record<string, number>);
                    (data as StaffMember[]).sort((a, b) => {
                        const orderA = a.designation ? (designationSortOrder[a.designation] ?? dOptions.length) : dOptions.length;
                        const orderB = b.designation ? (designationSortOrder[b.designation] ?? dOptions.length) : dOptions.length;
                        if (orderA !== orderB) return orderA - orderB;
                        return (a.name || '').localeCompare(b.name || '');
                    });
                } else if (needsSpecialSort && collectionName === 'eTenders') {
                    (data as E_tender[]).sort((a, b) => {
                         const dateA = a.tenderDate instanceof Date ? a.tenderDate.getTime() : 0;
                         const dateB = b.tenderDate instanceof Date ? b.tenderDate.getTime() : 0;
                         return dateB - dateA;
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

        // Dedicated listener for sanctioned strength
        let sanctionedUnsub = () => {};
        if (officeToQuery) {
            setLoadingStates(prev => ({...prev, sanctionedStrength: true}));
            const sanctionedRef = collection(db, `offices/${officeToQuery.toLowerCase()}/sanctionedStrength`);
            sanctionedUnsub = onSnapshot(query(sanctionedRef), (snapshot) => {
                const strength: Record<string, number> = {};
                snapshot.docs.forEach(doc => {
                    strength[doc.id] = doc.data().count || 0;
                });
                setAllSanctionedStrength(strength);
                setLoadingStates(prev => ({...prev, sanctionedStrength: false}));
            }, (error) => {
                console.error("Error fetching sanctionedStrength:", error);
                setLoadingStates(prev => ({...prev, sanctionedStrength: false}));
            });
        } else {
            setAllSanctionedStrength({});
            setLoadingStates(prev => ({...prev, sanctionedStrength: false}));
        }

        return () => {
            unsubscribes.forEach(unsub => unsub());
            sanctionedUnsub();
        };
    }, [user, selectedOffice]);
    

    const isLoading = Object.values(loadingStates).some(Boolean);

    const useAddVehicle = <T extends {}>(collectionName: string) => {
      return useCallback(async (data: T) => {
          if (!user) throw new Error("User must be logged in.");
          const officeLoc = user.role === 'superAdmin' ? selectedOffice : user.officeLocation;
          if (!officeLoc) throw new Error("An office location must be selected to add staff.");
          const collectionPath = `offices/${officeLoc.toLowerCase()}/${collectionName}`;
          const payload = { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
          if ('id' in payload) delete (payload as any).id;
          await addDoc(collection(db, collectionPath), payload);
          toast({ title: 'Item Added', description: 'The new item has been saved.' });
      }, [user, selectedOffice]);
    };
  
    const useUpdateVehicle = <T extends { id?: string }>(collectionName: string) => {
      return useCallback(async (data: T) => {
          if (!user) throw new Error("User must be logged in.");
          const officeLoc = user.role === 'superAdmin' ? selectedOffice : user.officeLocation;
          if (!officeLoc) throw new Error("User must have an office location.");
          if (!data.id) throw new Error("Document ID is missing for update.");
          const docRef = doc(db, `offices/${officeLoc.toLowerCase()}/${collectionName}`, data.id);
          const payload = { ...data, updatedAt: serverTimestamp() };
          if ('id' in payload) delete (payload as any).id;
          await updateDoc(docRef, payload);
          toast({ title: 'Item Updated', description: 'Your changes have been saved.' });
      }, [user, selectedOffice]);
    };
  
    const useDeleteVehicle = (collectionName: string) => {
      return useCallback(async (id: string, name: string) => {
          if (!user) throw new Error("User must be logged in.");
          const officeLoc = user.role === 'superAdmin' ? selectedOffice : user.officeLocation;
          if (!officeLoc) throw new Error("User must have an office location.");
          const docRef = doc(db, `offices/${officeLoc.toLowerCase()}/${collectionName}`, id);
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
      }, [user, selectedOffice]);
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
            selectedOffice, setSelectedOffice,
            allUsers,
            allFileEntries, allArsEntries, allStaffMembers, allAgencyApplications, allLsgConstituencyMaps, allRateDescriptions,
            allBidders, allE_tenders, allDepartmentVehicles, allHiredVehicles, allRigCompressors, 
            allSanctionedStrength, updateSanctionedStrength,
            allOfficeAddresses: globalOfficeAddresses,
            officeAddress, 
            isLoading,
            refetchRateDescriptions,
            deleteArsEntry, addDepartmentVehicle,
            updateDepartmentVehicle, deleteDepartmentVehicle, addHiredVehicle, updateHiredVehicle, deleteHiredVehicle,
            addRigCompressor, updateRigCompressor, deleteRigCompressor,
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
