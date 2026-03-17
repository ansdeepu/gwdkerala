// src/components/e-tender/pdf/generators/cancelCorrigendumGenerator.ts
import { PDFDocument, PDFTextField, StandardFonts, TextAlignment, rgb } from 'pdf-lib';
import type { E_tender } from '@/hooks/useE_tenders';
import { formatDateSafe } from '../../utils';
import type { Corrigendum, StaffMember } from '@/lib/schemas';
import { getAttachedFilesString } from './utils';
import type { OfficeAddress } from '@/hooks/use-data-store';
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

export async function generateCancelCorrigendum(tender: E_tender, corrigendum: Corrigendum, officeAddress: OfficeAddress | null, allStaffMembers?: StaffMember[], allOfficeAddresses?: OfficeAddress[]): Promise<Uint8Array> {
    const templatePath = '/Corrigendum-Cancel.pdf';
    const existingPdfBytes = await fetch(templatePath).then(res => {
        if (!res.ok) throw new Error(`Template file not found: ${templatePath.split('/').pop()}`);
        return res.arrayBuffer();
    });

    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const form = pdfDoc.getForm();
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
    
    const defaultReason = "the said work has been allotted to the Departmental Rig for execution";
    const reason = corrigendum.reason || defaultReason;

    const reasonText = `     The tender invited for the above work is hereby cancelled, as ${reason}. Hence, further processing of the tender is not required. Any bids received in response to this tender shall be treated as withdrawn, and no further correspondence in this regard will be entertained. It is also noted that the tender for this work was published mistakenly, and the same stands cancelled accordingly.`;

    const addressLines = (targetOfficeAddress?.address || '').split('\n');
    const place_2 = addressLines.slice(2).join(', ').toUpperCase();

    const fieldMappings: Record<string, any> = {
        'file_no_header': `${targetOfficeAddress?.officeCode || 'GKT'}/${tender.fileNo || ''}`,
        'e_tender_no_header': tender.eTenderNo,
        'tender_date_header': `Dated ${formatDateSafe(tender.tenderDate)}`,
        'name_of_work': tender.nameOfWork,
        'cancel': reasonText,
        'date': formatDateSafe(corrigendum.corrigendumDate),
        'office_location_4': (targetOfficeAddress?.officeName || '').toUpperCase(),
        'place_2': place_2,
    };

    const boldFields = ['file_no_header', 'e_tender_no_header', 'tender_date_header', 'name_of_work'];
    const justifyFields = ['name_of_work', 'cancel'];

    Object.entries(fieldMappings).forEach(([fieldName, value]) => {
        try {
            const textField = form.getTextField(fieldName);
            const isBold = boldFields.includes(fieldName);
            textField.setText(String(value || ''));
            if (justifyFields.includes(fieldName)) {
                textField.setAlignment(TextAlignment.Left);
            }
            if (fieldName === 'cancel') {
                textField.setFontSize(10);
            }
            textField.updateAppearances(isBold ? timesRomanBoldFont : timesRomanFont);
        } catch (e) {
            console.warn(`Could not fill field ${fieldName}:`, e);
        }
    });

    form.flatten();
    
    return await pdfDoc.save();
}
