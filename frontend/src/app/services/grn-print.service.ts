import { Injectable, inject } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DatePipe } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class GrnPrintService {
  private datePipe = inject(DatePipe);
  constructor() {}

  generatePDF(data: any) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // --- Header ---
    doc.setFontSize(18);
    doc.setTextColor(13, 148, 136); // Teal color
    doc.text('PHARMACY MANAGEMENT SYSTEM', pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Goods Received Note (GRN)', pageWidth / 2, 22, { align: 'center' });
    
    doc.setDrawColor(200);
    doc.line(14, 25, pageWidth - 14, 25);

    // --- Supplier & GRN Info ---
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text('Supplier Information:', 14, 35);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${data.supplierName || 'N/A'}`, 14, 40);
    doc.text(`Phone: ${data.supplierPhone || 'N/A'}`, 14, 45);

    doc.setFont('helvetica', 'bold');
    doc.text('GRN Details:', 120, 35);
    doc.setFont('helvetica', 'normal');
    doc.text(`GRN Code: ${data.grnCode || 'Draft'}`, 120, 40);
    doc.text(`Invoice No: ${data.invoiceNumber || 'N/A'}`, 120, 45);
    doc.text(`Date: ${this.datePipe.transform(data.purchaseDate, 'dd-MMM-yyyy')}`, 120, 50);

    // --- Items Table ---
    const tableData = data.purchaseDetails.map((item: any, index: number) => [
      index + 1,
      item.medicineName,
      item.batchNumber,
      this.datePipe.transform(item.expiryDate, 'MM/yy') || 'N/A',
      item.quantity,
      item.uomName,
      item.unitCost.toFixed(2),
      item.lineTotal.toFixed(2)
    ]);

    autoTable(doc, {
      startY: 55,
      head: [['#', 'Medicine', 'Batch', 'Expiry', 'Qty', 'Unit', 'Price', 'Total']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [13, 148, 136], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 10 },
        4: { halign: 'center' },
        5: { halign: 'center' },
        6: { halign: 'right' },
        7: { halign: 'right' }
      }
    });

    let currentY = (doc as any).lastAutoTable.finalY + 10;

    // --- Payments Table ---
    if (data.purchasePayments && data.purchasePayments.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0);
      doc.text('Payment Details:', 14, currentY);
      
      const paymentData = data.purchasePayments.map((p: any) => [
        p.paymentMethod,
        p.accountNumber || '-',
        p.transactionId || '-',
        p.amount.toFixed(2)
      ]);

      autoTable(doc, {
        startY: currentY + 4,
        head: [['Method', 'Account No.', 'Transaction ID', 'Amount']],
        body: paymentData,
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' },
        columnStyles: {
          3: { halign: 'right' }
        },
        margin: { left: 14, right: pageWidth / 2 }
      });
      
      currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // --- Summary Section ---
    const summaryX = pageWidth - 65;
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'normal');
    
    let y = finalY;
    const drawSummaryRow = (label: string, value: string, isBold: boolean = false, isTeal: boolean = false) => {
        if (isBold) doc.setFont('helvetica', 'bold');
        if (isTeal) doc.setTextColor(13, 148, 136);
        
        doc.text(label, summaryX, y);
        doc.text(value, pageWidth - 14, y, { align: 'right' });
        
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0);
        y += 6;
    };

    drawSummaryRow('Subtotal:', data.subTotal.toFixed(2));
    drawSummaryRow('Total Discount:', `- ${data.totalDiscount.toFixed(2)}`);
    drawSummaryRow('Total Tax:', `+ ${data.totalTax.toFixed(2)}`);

    if (data.adjustment > 0) {
        drawSummaryRow('Adjustment:', `- ${data.adjustment.toFixed(2)}`);
    }

    y += 2;
    drawSummaryRow('Grand Total:', `${data.grandTotal.toFixed(2)} Tk`, true, true);
    
    doc.setDrawColor(230);
    doc.line(summaryX, y - 4, pageWidth - 14, y - 4);
    y += 2;

    const paid = data.paidAmount || (data.purchasePayments ? data.purchasePayments.reduce((s:any, p:any) => s + p.amount, 0) : 0);
    const due = data.grandTotal - paid;

    drawSummaryRow('Total Paid:', `${paid.toFixed(2)} Tk`, true);
    
    if (due > 0) {
        doc.setTextColor(220, 38, 38); // Red color for due
        drawSummaryRow('Balance Due:', `${due.toFixed(2)} Tk`, true);
    } else {
        doc.setTextColor(22, 163, 74); // Green color for fully paid
        drawSummaryRow('Payment Status:', 'FULLY PAID', true);
    }

    // --- Footer ---
    const footerY = doc.internal.pageSize.height - 20;
    doc.setDrawColor(200);
    doc.line(14, footerY, pageWidth - 14, footerY);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150);
    const printedOn = this.datePipe.transform(new Date(), 'dd-MMM-yyyy HH:mm:ss');
    doc.text(`Printed on: ${printedOn}`, 14, footerY + 5);
    doc.text('Authorized Signature', pageWidth - 45, footerY + 15);
    doc.line(pageWidth - 55, footerY + 12, pageWidth - 14, footerY + 12);

    // Open Print Dialog
    const blob = doc.output('bloburl');
    window.open(blob, '_blank');
  }
}
