// src/components/reports/pdf/progressReportPdfGenerator.ts
import { PDFDocument, PDFFont, PageSizes, StandardFonts, rgb, cmyk } from 'pdf-lib';
import { format } from 'date-fns';
import type { OfficeAddress } from '@/hooks/use-data-store';
import { REPORTING_PURPOSE_ORDER, type SitePurpose } from '@/lib/schemas';

const FONT_SIZE = 8;
const HEADER_FONT_SIZE = 9;
const TITLE_FONT_SIZE = 12;
const MARGIN = 40;
const ROW_HEIGHT = 15;
const HEADER_ROW_HEIGHT = 18;

let font: PDFFont;
let boldFont: PDFFont;
let page: any;
let currentY: number;

async function drawHeader(pdfDoc: PDFDocument, officeAddress: OfficeAddress | null, startDate?: Date, endDate?: Date) {
    const pages = pdfDoc.getPages();
    for (let i = 0; i < pages.length; i++) {
        const currentPage = pages[i];
        const { width, height } = currentPage.getSize();
        
        const title = `Monthly Progress Report`;
        currentPage.drawText(title, {
            x: MARGIN,
            y: height - MARGIN + 20,
            font: boldFont,
            size: TITLE_FONT_SIZE,
            color: rgb(0, 0, 0),
        });

        const officeName = `Ground Water Department, ${officeAddress?.officeLocation || 'N/A'}`;
        const dateRange = (startDate && endDate) ? `for the period ${format(startDate, 'dd/MM/yyyy')} to ${format(endDate, 'dd/MM/yyyy')}` : '';
        const subtitle = `${officeName} ${dateRange}`;
        currentPage.drawText(subtitle, {
            x: MARGIN,
            y: height - MARGIN + 5,
            font: font,
            size: HEADER_FONT_SIZE,
            color: rgb(0.3, 0.3, 0.3),
        });

        const pageNumberText = `Page ${i + 1} of ${pages.length}`;
        const pageNumberWidth = font.widthOfTextAtSize(pageNumberText, FONT_SIZE - 1);
        currentPage.drawText(pageNumberText, {
            x: width - MARGIN - pageNumberWidth,
            y: height - MARGIN + 5,
            font: font,
            size: FONT_SIZE - 1,
            color: rgb(0.5, 0.5, 0.5),
        });

        currentPage.drawLine({
            start: { x: MARGIN, y: height - MARGIN },
            end: { x: width - MARGIN, y: height - MARGIN },
            thickness: 1,
            color: rgb(0.8, 0.8, 0.8),
        });
    }
}

async function drawTable(pdfDoc: PDFDocument, headers: string[], data: (string|number)[][], title: string) {
    if (currentY < MARGIN + HEADER_ROW_HEIGHT + data.length * ROW_HEIGHT) {
        page = pdfDoc.addPage(PageSizes.A4);
        currentY = page.getHeight() - MARGIN - 40;
    }

    currentY -= 25;
    page.drawText(title, {
        x: MARGIN,
        y: currentY,
        font: boldFont,
        size: HEADER_FONT_SIZE,
    });
    currentY -= HEADER_ROW_HEIGHT;

    const columnWidths = headers.map(() => (page.getWidth() - 2 * MARGIN) / headers.length);
    let x = MARGIN;

    headers.forEach((header, i) => {
        page.drawRectangle({
            x,
            y: currentY,
            width: columnWidths[i],
            height: HEADER_ROW_HEIGHT,
            color: rgb(0.9, 0.9, 0.9),
            borderColor: rgb(0.7, 0.7, 0.7),
            borderWidth: 0.5,
        });
        page.drawText(header, {
            x: x + 5,
            y: currentY + 5,
            font: boldFont,
            size: FONT_SIZE,
        });
        x += columnWidths[i];
    });
    currentY -= ROW_HEIGHT;

    data.forEach((row, rowIndex) => {
        x = MARGIN;
        row.forEach((cell, i) => {
             page.drawRectangle({
                x,
                y: currentY,
                width: columnWidths[i],
                height: ROW_HEIGHT,
                borderColor: rgb(0.7, 0.7, 0.7),
                borderWidth: 0.5,
                color: rowIndex % 2 === 0 ? rgb(1, 1, 1) : rgb(0.95, 0.95, 0.95),
            });
            page.drawText(String(cell), {
                x: x + 5,
                y: currentY + 4,
                font: font,
                size: FONT_SIZE,
            });
            x += columnWidths[i];
        });
        currentY -= ROW_HEIGHT;
    });
}


export async function generateProgressReportPdf(
    reportData: any,
    officeAddress: OfficeAddress | null,
    startDate?: Date,
    endDate?: Date
): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    page = pdfDoc.addPage(PageSizes.A4);
    currentY = page.getHeight() - MARGIN - 40;

    // --- Main Progress Summary Table ---
    const summaryHeaders = ['Service Type', 'Prev Balance', 'Current App', 'To be Refunded', 'Total App', 'Completed', 'Balance'];
    const summaryTableData = REPORTING_PURPOSE_ORDER.map(purpose => {
        const stats = reportData.progressSummaryData[purpose as SitePurpose];
        if (!stats || (stats.totalApplications === 0 && stats.previousBalance === 0)) return null;
        return [
            purpose,
            stats.previousBalance,
            stats.currentApplications,
            stats.toBeRefunded,
            stats.totalApplications,
            stats.completed,
            stats.balance,
        ];
    }).filter((row): row is (string|number)[] => row !== null);

    await drawTable(pdfDoc, summaryHeaders, summaryTableData, 'Progress Summary (Aggregate)');

    // Finalize: Draw headers on all pages
    await drawHeader(pdfDoc, officeAddress, startDate, endDate);

    return await pdfDoc.save();
}
