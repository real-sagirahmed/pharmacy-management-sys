import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Injectable({
  providedIn: 'root'
})
export class MoneyReceiptService {

  constructor() { }

  generateReceipt(record: any, payments: any[], type: 'Sales' | 'Purchase') {
    const doc = new jsPDF();
    const isSales = type === 'Sales';
    const title = isSales ? 'MONEY RECEIPT' : 'PAYMENT VOUCHER';
    const partyLabel = isSales ? 'Customer' : 'Supplier';
    const partyName = isSales ? record.customerName : record.supplierName;
    const refCode = isSales ? `Invoice: ${record.saleId}` : `GRN: ${record.grnCode || record.purchaseId}`;

    // ═══ Header Section ═══
    doc.setFontSize(22);
    doc.setTextColor(13, 148, 136); // Teal color
    doc.text('s7 Drug House', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Your Trusted Pharmacy Partner', 105, 26, { align: 'center' });
    doc.text('Address: Sector 7, Uttara, Dhaka | Phone: 01700-000000', 105, 32, { align: 'center' });

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
      headStyles: { fillColor: [13, 148, 136], textColor: 255, fontSize: 10 },
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
    doc.text('Note: This is a computer generated receipt. No signature is required.', 105, 270, { align: 'center' });
    
    doc.setDrawColor(200);
    doc.line(20, 260, 190, 260);

    // Save PDF
    doc.save(`Receipt_${partyName}_${Date.now()}.pdf`);
  }
}
