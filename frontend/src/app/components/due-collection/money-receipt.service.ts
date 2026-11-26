import { Injectable, inject } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TenantConfigService } from '../../services/tenant-config.service';

@Injectable({
  providedIn: 'root'
})
export class MoneyReceiptService {
  private tenantConfig = inject(TenantConfigService);

  constructor() { }

  generateReceipt(record: any, payments: any[], type: 'Sales' | 'Purchase') {
    const brand = this.tenantConfig.getPrintBranding();
    const [pr, pg, pb] = brand.primaryRgb;
    const doc = new jsPDF();
    const isSales = type === 'Sales';
    const title = isSales ? 'MONEY RECEIPT' : 'PAYMENT VOUCHER';
    const partyLabel = isSales ? 'Customer' : 'Supplier';
    const partyName = isSales ? record.customerName : record.supplierName;
    const refCode = isSales
      ? `Invoice: ${record.invoiceCode || record.saleId}`
      : `GRN: ${record.grnCode || record.purchaseId}`;

    // ═══ Header Section ═══
    doc.setFontSize(20);
    doc.setTextColor(pr, pg, pb);
    doc.text(brand.pharmacyName, 105, 19, { align: 'center' });

    doc.setFontSize(9.5);
    doc.setTextColor(100);
    doc.text(brand.tagline, 105, 25, { align: 'center' });

    const contactParts: string[] = [];
    if (brand.branchName) contactParts.push(`Branch: ${brand.branchName}`);
    if (brand.address) contactParts.push(brand.address);
    if (brand.phone) contactParts.push(`Phone: ${brand.phone}`);
    if (brand.drugLicenseNo) contactParts.push(`DL: ${brand.drugLicenseNo}`);
    if (contactParts.length > 0) {
      doc.setFontSize(8.5);
      doc.text(contactParts.join(' | '), 105, 31, { align: 'center', maxWidth: 170 });
    }

    doc.setDrawColor(200);
    doc.line(20, 38, 190, 38);

    // ═══ Title & Basic Info ═══
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text(title, 105, 48, { align: 'center' });

    doc.setFontSize(10);
    doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, 20, 58);
    doc.text(`Receipt No: MR-${Date.now().toString().slice(-6)}`, 190, 58, { align: 'right' });

    // ═══ Party Box ═══
    doc.setFillColor(248, 250, 252);
    doc.rect(20, 65, 170, 25, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(20, 65, 170, 25, 'S');

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`${partyLabel}:`, 25, 75);
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(partyName || 'Walking Customer', 25, 82);

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text('Reference:', 130, 75);
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(refCode, 130, 82);

    // ═══ Payment Details Table ═══
    doc.setFontSize(12);
    doc.text('Payment Summary', 20, 105);

    autoTable(doc, {
      startY: 110,
      head: [['Payment Method', 'Account/Trans ID', 'Remarks', 'Amount (Tk)']],
      body: payments.map(p => [
        p.paymentMethod,
        p.accountNumber || p.transactionId || '-',
        p.remarks || '-',
        { content: (p.amount || 0).toFixed(2), styles: { halign: 'right' } }
      ]),
      theme: 'grid',
      headStyles: { fillColor: [pr, pg, pb], textColor: 255, fontSize: 10 },
      styles: { fontSize: 9 },
      columnStyles: {
        3: { cellWidth: 30 }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Paid: ${totalAmount.toFixed(2)} Tk`, 190, finalY, { align: 'right' });

    // ═══ Footer Section ═══
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(
      `${brand.invoiceFooter} — Computer generated receipt, no signature required.`,
      105,
      270,
      { align: 'center', maxWidth: 170 }
    );
    
    doc.setDrawColor(200);
    doc.line(20, 260, 190, 260);

    // Save PDF
    doc.save(`Receipt_${partyName}_${Date.now()}.pdf`);
  }
}
