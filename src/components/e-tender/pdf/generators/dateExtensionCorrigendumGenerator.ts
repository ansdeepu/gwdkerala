// src/components/e-tender/pdf/generators/dateExtensionCorrigendumGenerator.ts
import { PDFDocument, StandardFonts, TextAlignment, rgb } from "pdf-lib";
import type { E_tender } from "@/hooks/useE_tenders";
import type { Corrigendum, StaffMember } from "@/lib/schemas";
import { formatDateSafe } from "../../utils";
import { getAttachedFilesString } from "./utils";
import type { OfficeAddress } from "@/hooks/use-data-store";
import { getFirestore, collection, query, getDocs, Timestamp } from 'firebase/firestore';
import { app } from '@/lib/firebase';

const db = getFirestore(app);

const processFirestoreData = (data: any): any => {
    if (data === null || data === undefined) return data;
    if (data instanceof Timestamp) return data.toDate();
    if (Array.isArray(data)) return data.map(processFirestoreData);
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

export async function generateDateExtensionCorrigendum(
    tender: E_tender,
    corrigendum: Corrigendum,
    officeAddress: OfficeAddress | null,
    staff?: StaffMember[],
    allOfficeAddresses?: OfficeAddress[]
): Promise<Uint8Array> {
    
    const templatePath = "/Corrigendum-DateExt.pdf";

    const existingPdfBytes = await fetch(templatePath).then((res) => {
        if (!res.ok)
            throw new Error(
                `Template file not found: ${templatePath.split("/").pop()}`
            );
        return res.arrayBuffer();
    });

    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const form = pdfDoc.getForm();
    const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const page = pdfDoc.getPages()[0];
    const { width, height } = page.getSize();

    let targetOfficeAddress = officeAddress;
    const tenderOfficeLocation = (tender as any).officeLocationFromPath;

    if (!targetOfficeAddress && tenderOfficeLocation && allOfficeAddresses) {
        const globalOffice = allOfficeAddresses.find(oa => oa.officeLocation.toLowerCase() === tenderOfficeLocation.toLowerCase()) || null;
        const subOfficeCollectionPath = `offices/${tenderOfficeLocation.toLowerCase()}/officeAddresses`;
        const q = query(collection(db, subOfficeCollectionPath));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            const bestDocSnap = snapshot.docs.reduce((prev, curr) => 
                Object.keys(curr.data()).length > Object.keys(prev.data()).length ? curr : prev, 
            snapshot.docs[0]);
            
            const subOfficeDocData = processFirestoreDoc<OfficeAddress>(bestDocSnap);
            
            targetOfficeAddress = {
                ...subOfficeDocData,
                officeLocation: tenderOfficeLocation,
                officeCode: globalOffice?.officeCode || subOfficeDocData.officeCode || '',
            };
        } else if (globalOffice) {
            targetOfficeAddress = { ...globalOffice, officeName: '', id: globalOffice.id };
        }
    }


    // Format dates
    const lastDate = formatDateSafe(tender.dateTimeOfReceipt, true, true, false);
    const newLastDate = formatDateSafe(corrigendum.lastDateOfReceipt, true, true, false);
    const newOpeningDate = formatDateSafe(corrigendum.dateOfOpeningTender, true, false, true);

    // Auto-generate reason only if not provided
    const reasonText =
        corrigendum.reason ||
        `No bid was received for the above work`;

    const fullParagraph = `     The time period for submitting e-tenders expired on ${lastDate}, and ${reasonText}. Consequently, the deadline for submitting e-tenders has been extended to ${newLastDate}, and the opening of the tender has been rescheduled to ${newOpeningDate}.`;

    const addressLines = (targetOfficeAddress?.address || '').split('\n');
    const place_2 = addressLines.slice(2).join(', ').toUpperCase();

    const fieldMappings: Record<string, string> = {
        file_no_header: `${targetOfficeAddress?.officeCode || 'GKT'}/${tender.fileNo || ""}`,
        e_tender_no_header: tender.eTenderNo || "",
        tender_date_header: `Dated ${formatDateSafe(tender.tenderDate)}`,
        name_of_work: tender.nameOfWork || "",
        date_ext: fullParagraph, // multiline box (4096 flag)
        date: formatDateSafe(corrigendum.corrigendumDate),
        'office_location_5': (targetOfficeAddress?.officeName || '').toUpperCase(),
        'place_2': place_2,
    };
    
    const boldFields = ['file_no_header', 'e_tender_no_header', 'tender_date_header', 'name_of_work'];
    const justifyFields = ['name_of_work', 'date_ext'];

    // Fill fields safely
    for (const [fieldName, value] of Object.entries(fieldMappings)) {
        try {
            const field = form.getTextField(fieldName);
            const selectedFont = boldFields.includes(fieldName) ? boldFont : font;
            
            if (justifyFields.includes(fieldName)) {
                field.setAlignment(TextAlignment.Left); // Use Left since Justify is not supported
            }

            field.setText(value);
            field.updateAppearances(selectedFont);
        } catch (err) {
            console.warn(`⚠️ Could not fill field '${fieldName}':`, err);
        }
    }
    
    form.flatten();
    
    return await pdfDoc.save();
}
