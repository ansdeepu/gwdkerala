// src/app/dashboard/e-tender/[id]/layout.tsx
"use client";

import { useEffect, useState, ReactNode, useCallback } from "react";
import { useParams } from "next/navigation";
import { useE_tenders, type E_tender } from "@/hooks/useE_tenders";
import { TenderDataProvider } from "@/components/e-tender/TenderDataContext";
import { toast } from "@/hooks/use-toast";

const Loader2 = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);

export default function TenderLayout({ children }: { children: ReactNode }) {
    const params = useParams();
    const id = params?.id as string;
    const { getTender } = useE_tenders();
    const [tender, setTender] = useState<E_tender | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        
        const loadTender = async () => {
            setIsLoading(true);
            setTender(null);

            if (!id) {
                if(isMounted) setIsLoading(false);
                return;
            }

            if (id === 'new') {
                const newTenderData: E_tender = {
                    id: 'new',
                    eTenderNo: '', tenderDate: null, fileNo: '', nameOfWork: '', nameOfWorkMalayalam: '', location: '', estimateAmount: undefined,
                    tenderFormFee: undefined, emd: undefined, periodOfCompletion: undefined, lastDateOfReceipt: null, timeOfReceipt: '',
                    dateOfOpeningTender: null, timeOfOpeningTender: '', presentStatus: 'Tender Process', bidders: [], corrigendums: [],
                    dateTimeOfReceipt: undefined, dateTimeOfOpening: undefined, noOfBids: undefined, noOfTenderers: undefined,
                    noOfSuccessfulTenderers: undefined, quotedPercentage: undefined, aboveBelow: undefined, dateOfOpeningBid: undefined,
                    dateOfTechnicalAndFinancialBidOpening: undefined, technicalCommitteeMember1: undefined, technicalCommitteeMember2: undefined,
                    technicalCommitteeMember3: undefined, agreementDate: undefined, dateWorkOrder: undefined, nameOfAssistantEngineer: undefined,
                    supervisor1Id: undefined, supervisor1Name: undefined, supervisor1Phone: undefined,
                    supervisor2Id: undefined, supervisor2Name: undefined, supervisor2Phone: undefined,
                    supervisor3Id: undefined, supervisor3Name: undefined, supervisor3Phone: undefined,
                    nameOfSupervisor: undefined, supervisorPhoneNo: undefined, remarks: '',
                };
                 if (isMounted) {
                    setTender(newTenderData);
                    setIsLoading(false);
                }
            } else {
                const fetchedTender = await getTender(id);
                if (isMounted) {
                    if (fetchedTender) {
                        setTender(fetchedTender);
                    } else {
                        toast({ title: "Tender Not Found", description: "The requested tender could not be found.", variant: "destructive" });
                    }
                    setIsLoading(false);
                }
            }
        };

        loadTender();

        return () => {
            isMounted = false;
        };
    }, [id, getTender]);

    if (isLoading || !tender) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2">Loading Tender...</p>
            </div>
        );
    }

    return <TenderDataProvider key={id} initialTender={tender}>{children}</TenderDataProvider>;
}
