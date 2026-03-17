// src/components/e-tender/pdf/generators/nitGenerator.ts
import { PDFDocument, PDFTextField, StandardFonts, rgb, TextAlignment } from 'pdf-lib';
import type { E_tender } from '@/hooks/useE_tenders';
import { formatDateSafe, formatTenderNoForFilename } from '../../utils';
import type { StaffMember } from '@/lib/schemas';
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

const capitalize = (s?: string) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "";

export async function generateNIT(
    tender: E_tender, 
    currentOfficeAddress: OfficeAddress | null, 
    allStaffMembers?: StaffMember[], 
    allOfficeAddresses?: OfficeAddress[]
): Promise<Uint8Array> {
    const templatePath = '/NIT.pdf';
    const existingPdfBytes = await fetch(templatePath).then(res => {
        if (!res.ok) throw new Error(`Template file not found: ${templatePath.split('/').pop()}`);
        return res.arrayBuffer();
    });

    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const form = pdfDoc.getForm();
    
    let targetOfficeAddress = currentOfficeAddress;
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

    const isRetender = tender.retenders && tender.retenders.some(
        r => r.lastDateOfReceipt === tender.dateTimeOfReceipt && r.dateOfOpeningTender === tender.dateTimeOfOpening
    );

    const tenderFormFeeValue = tender.tenderFormFee || 0;
    const gst = tenderFormFeeValue * 0.18;
    const displayTenderFormFee = tender.tenderFormFee ? `Rs. ${tenderFormFeeValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} & Rs. ${gst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (GST 18%)` : 'N/A';
    
    const formatCurrency = (amount: number | undefined | null) => {
        if (amount === undefined || amount === null) return '';
        return `Rs. ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    const formattedTenderNo = formatTenderNoForFilename(tender.eTenderNo);
    const fileName = `aNIT${formattedTenderNo}.pdf`;
    
    const addressLines = (targetOfficeAddress?.address || '').split('\n');
    const address_1 = addressLines.slice(0, 3).join(', ').toUpperCase();
    const address_2 = addressLines.slice(3).join(', ').toUpperCase();
    const address_3 = `Email: ${targetOfficeAddress?.email || ''}, Phone: ${targetOfficeAddress?.phoneNo || ''}`;

    const officeLocationName = capitalize(targetOfficeAddress?.officeLocation || (tender as any).officeLocationFromPath);
    const officeCode = targetOfficeAddress?.officeCode || 'GKT';

    const fieldMappings: Record<string, any> = {
        'file_no_header': tender.fileNo ? `${officeCode}/${tender.fileNo}` : '',
        'e_tender_no_header': `${tender.eTenderNo || ''}${isRetender ? ' (Re-Tender)' : ''}`,
        'tender_date_header': formatDateSafe(tender.tenderDate),
        'name_of_work': tender.nameOfWork,
        'pac': tender.estimateAmount ? `Rs. ${tender.estimateAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A',
        'emd': tender.emd ? `Rs. ${tender.emd.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A',
        'last_date_submission': formatDateSafe(tender.dateTimeOfReceipt, true, true, false),
        'opening_date': formatDateSafe(tender.dateTimeOfOpening, true, false, true),
        'bid_submission_fee': displayTenderFormFee,
        'location': tender.location,
        'last_date_receipt': formatDateSafe(tender.dateTimeOfReceipt, true, true, false),
        'period_of_completion': tender.periodOfCompletion,
        'address_1': address_1,
        'address_2': address_2,
        'address_3': address_3,
        'Office_location_1': officeLocationName,
        'Office_location_2': officeLocationName,
    };
    
    const hasRelatedFiles = tender.fileNo2 || tender.fileNo3 || tender.fileNo4;
    if (hasRelatedFiles) {
        fieldMappings['header_1'] = "Related File Numbers:";
        if (tender.fileNo2) fieldMappings['file_no_2'] = `${officeCode}/${tender.fileNo2}`;
        if (tender.fileNo3) fieldMappings['file_no_3'] = `${officeCode}/${tender.fileNo3}`;
        if (tender.fileNo4) fieldMappings['file_no_4'] = `${officeCode}/${tender.fileNo4}`;
    }


    const allFields = form.getFields();
    allFields.forEach(field => {
        const fieldName = field.getName();
        if (fieldName in fieldMappings && fieldMappings[fieldName]) {
            try {
                const textField = form.getTextField(fieldName);
                let font = timesRomanFont;
                if(['file_no_header', 'e_tender_no_header', 'tender_date_header'].includes(fieldName)){
                    font = timesRomanBoldFont;
                }
                
                textField.setText(String(fieldMappings[fieldName] || ''));

                if (['address_1', 'address_2', 'address_3', 'Office_location_1', 'Office_location_2'].includes(fieldName)) {
                    textField.setFontSize(12);
                } else if (fieldName === 'name_of_work') {
                    textField.setFontSize(10);
                }
                
                textField.updateAppearances(font);
            } catch(e) {
                console.warn(`Could not fill field ${fieldName}:`, e);
            }
        }
    });
    
    form.flatten();
    
    return await pdfDoc.save();
}
