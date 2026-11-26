import { Injectable, inject } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SaleMaster } from './sales.service';
import { TenantConfigService } from './tenant-config.service';

@Injectable({ providedIn: 'root' })
export class SalesInvoicePrintService {
  private tenantConfig = inject(TenantConfigService);
  constructor() {}

  private formatDate(date: string | Date | undefined): string {
    if (!date) return '—';
    const d = new Date(date);
    return d.toLocaleDateString('en-GB'); // dd/MM/yyyy
  }

  private formatTime(time: string | undefined): string {
    if (!time) return '—';
    try {
      // If ISO string, extract time. If raw time (HH:mm:ss), parse it.
      let d: Date;
      if (time.includes('T')) {
        d = new Date(time);
      } else {
        d = new Date(`2000-01-01T${time}`);
      }
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return time;
    }
  }

  generatePDF(sale: SaleMaster): void {
    const brand = this.tenantConfig.getPrintBranding();
    const [pr, pg, pb] = brand.primaryRgb;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.setTextColor(pr, pg, pb);
    doc.text(brand.pharmacyName.toUpperCase(), 105, 16, { align: 'center' });

    const metaParts: string[] = [];
    if (brand.branchName) metaParts.push(`Branch: ${brand.branchName}`);
    if (brand.address) metaParts.push(brand.address);
    if (brand.phone) metaParts.push(`Tel: ${brand.phone}`);
    if (brand.drugLicenseNo) metaParts.push(`DL: ${brand.drugLicenseNo}`);

    doc.setFontSize(8.5);
    doc.setTextColor(95);
    doc.setFont('helvetica', 'normal');
    if (metaParts.length > 0) {
      doc.text(metaParts.join('  |  '), 105, 22, { align: 'center', maxWidth: 180 });
    } else {
      doc.text(brand.tagline, 105, 22, { align: 'center' });
    }

    doc.setFontSize(10);
    doc.setTextColor(60);
    doc.setFont('helvetica', 'bold');
    doc.text('Sales Invoice', 105, 28, { align: 'center' });

    // Invoice Info Box
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 32, 182, 30, 3, 3, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(50);
    doc.text(`Invoice No : ${sale.invoiceCode || '—'}`, 18, 39);
    doc.text(`Date       : ${this.formatDate(sale.saleDate)}`, 18, 45);
    doc.text(`Time       : ${this.formatTime(sale.saleTime)}`, 18, 51);

    doc.text(`Customer : ${sale.customerName}`, 110, 39);
    doc.text(`Mobile   : ${sale.customerPhone || '—'}`, 110, 45);
    doc.text(`Status   : ${sale.paymentStatus || 'Paid'}`, 110, 51);
    doc.text(`Sales By : ${sale.createdBy || '—'}`, 110, 57);

    // Items Table
    const head = [['Product', 'Batch', 'Qty', 'Unit', 'Price', 'Disc', 'VAT', 'Total']];
    const body = (sale.salesDetails || []).map(d => [
      d.medicineName || '—',
      d.batchNumber || '—',
      d.quantity.toString(),
      d.uomName || '—',
      `${d.unitPrice.toFixed(2)}`,
      `${d.discountAmount.toFixed(2)}`,
      `${d.taxAmount.toFixed(2)}`,
      `${d.lineTotal.toFixed(2)}`
    ]);

    autoTable(doc, {
      head,
      body,
      startY: 66,
      theme: 'striped',
      headStyles: { fillColor: [pr, pg, pb], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: 50 },
      columnStyles: {
        2: { halign: 'center' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' },
        7: { halign: 'right', fontStyle: 'bold' }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 6;

    // Summary
    doc.setFontSize(9);
    const summaryX = 130;
    const valX = 190;

    const lines = [
      [`Subtotal:`, `${sale.subTotal?.toFixed(2)}`],
      [`Item Discounts:`, `- ${sale.totalDiscount?.toFixed(2)}`],
      [`VAT/Tax:`, `+ ${sale.totalTax?.toFixed(2)}`],
      [`Special Discount:`, `- ${sale.specialDiscount?.toFixed(2)}`],
    ];

    lines.forEach(([label, val], i) => {
      doc.setTextColor(100);
      doc.text(label, summaryX, finalY + i * 6);
      doc.text(val, valX, finalY + i * 6, { align: 'right' });
    });

    const gtY = finalY + lines.length * 6 + 2;
    doc.setFillColor(pr, pg, pb);
    doc.roundedRect(summaryX - 4, gtY - 4, 68, 10, 2, 2, 'F');
    doc.setTextColor(255);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL PAYABLE:', summaryX, gtY + 2);
    doc.text(`Tk ${sale.grandTotal?.toFixed(2)}`, valX, gtY + 2, { align: 'right' });

    // Payment summary
    const pmY = gtY + 14;
    doc.setFontSize(8); doc.setTextColor(80); doc.setFont('helvetica', 'normal');
    const totPaidStr = sale.paidAmount?.toFixed(2) || '0.00';
    const changeStr = sale.changeAmount?.toFixed(2) || '0.00';
    const dueStr = sale.dueAmount?.toFixed(2) || '0.00';
    doc.text(`Paid: ${totPaidStr}   Change: ${changeStr}   Due: ${dueStr}`, 105, pmY, { align: 'center' });

    // Footer
    doc.setFontSize(8); doc.setTextColor(150);
    doc.text(brand.invoiceFooter, 105, pmY + 10, { align: 'center', maxWidth: 180 });
    doc.text(`Printed by ${brand.pharmacyName}`, 105, pmY + 15, { align: 'center' });

    // Use bloburl for preview/new tab instead of immediate download
    const blob = doc.output('bloburl');
    window.open(blob, '_blank');
  }
}
