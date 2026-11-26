import { Injectable, inject } from '@angular/core';
import { SaleMaster } from './sales.service';
import { TenantConfigService } from './tenant-config.service';

@Injectable({
  providedIn: 'root'
})
export class ThermalReceiptPrintService {
  private tenantConfig = inject(TenantConfigService);

  private escapeHtml(value: unknown): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private formatDate(date: string | Date | undefined): string {
    if (!date) return '—';
    const d = new Date(date);
    return isNaN(d.getTime()) ? String(date) : d.toLocaleDateString('en-GB');
  }

  private formatTime(time: string | undefined): string {
    if (!time) return '—';
    const d = time.includes('T') ? new Date(time) : new Date(`2000-01-01T${time}`);
    return isNaN(d.getTime())
      ? time
      : d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  buildReceiptHtml(sale: SaleMaster): string {
    const brand = this.tenantConfig.getPrintBranding();
    const esc = (v: unknown) => this.escapeHtml(v);

    const itemsRows = (sale.salesDetails || []).map((d, idx) => `
      <tr>
        <td class="col-item">
          <div class="item-name">${idx + 1}. ${esc(d.medicineName || 'Medicine')}</div>
          <div class="item-meta">ব্যাচ: ${esc(d.batchNumber || '-')} | ${Number(d.unitPrice || 0).toFixed(2)}</div>
        </td>
        <td class="col-qty">${Number(d.quantity || 0)}</td>
        <td class="col-amt">${Number(d.lineTotal || 0).toFixed(2)}</td>
      </tr>
    `).join('');

    const dlLine = brand.drugLicenseNo
      ? `<div class="sub">ড্রাগ লাইসেন্স (DL): ${esc(brand.drugLicenseNo)}</div>`
      : '';
    const branchLine = brand.branchName
      ? `<div class="sub">শাখা (Branch): ${esc(brand.branchName)}</div>`
      : '';
    const addrPhone = [brand.address, brand.phone ? `মোবাইল: ${brand.phone}` : '']
      .filter(Boolean)
      .join(' | ');

    return `<!doctype html>
<html lang="bn">
<head>
  <meta charset="utf-8">
  <title>Receipt ${esc(sale.invoiceCode || '')}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    @page { size: 80mm auto; margin: 2mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 6px;
      width: 76mm;
      font-family: 'Noto Sans Bengali', 'SolaimanLipi', 'Kalpurush', 'Segoe UI', sans-serif;
      font-size: 11px;
      line-height: 1.35;
      color: #000;
      background: #fff;
    }
    .center { text-align: center; }
    .pharmacy { font-size: 15px; font-weight: 700; margin: 0 0 2px; }
    .sub { font-size: 10px; color: #222; }
    .divider { border-top: 1px dashed #000; margin: 6px 0; }
    .meta { width: 100%; font-size: 10.5px; border-collapse: collapse; }
    .meta td { padding: 1px 0; vertical-align: top; }
    .meta td.val { text-align: right; font-weight: 600; }
    table.items { width: 100%; border-collapse: collapse; font-size: 10.5px; }
    table.items th {
      text-align: left;
      border-bottom: 1px solid #000;
      padding: 3px 0;
      font-size: 10px;
    }
    table.items th.col-qty, table.items td.col-qty { text-align: center; width: 16%; }
    table.items th.col-amt, table.items td.col-amt { text-align: right; width: 26%; font-weight: 600; }
    table.items td { padding: 3px 0; border-bottom: 1px dotted #999; vertical-align: top; }
    .item-name { font-weight: 600; }
    .item-meta { font-size: 9.5px; color: #333; }
    .totals { width: 100%; font-size: 11px; border-collapse: collapse; }
    .totals td { padding: 1.5px 0; }
    .totals td.val { text-align: right; }
    .totals tr.grand td {
      font-size: 13px;
      font-weight: 700;
      border-top: 1px solid #000;
      border-bottom: 1px solid #000;
      padding: 4px 0;
    }
    .footer { text-align: center; font-size: 10px; margin-top: 8px; }
    .print-actions { text-align: center; margin-top: 10px; }
    .print-btn {
      background: #0f766e; color: #fff; border: none; border-radius: 6px;
      padding: 6px 14px; font-size: 12px; font-weight: 600; cursor: pointer;
    }
    @media print {
      .no-print { display: none !important; }
      body { width: 76mm; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="center">
    <div class="pharmacy">${esc(brand.pharmacyName)}</div>
    <div class="sub">${esc(brand.tagline)}</div>
    ${branchLine}
    ${addrPhone ? `<div class="sub">${esc(addrPhone)}</div>` : ''}
    ${dlLine}
  </div>

  <div class="divider"></div>

  <table class="meta">
    <tr><td>ইনভয়েস / Invoice:</td><td class="val">${esc(sale.invoiceCode || '—')}</td></tr>
    <tr><td>তারিখ / Date:</td><td class="val">${esc(this.formatDate(sale.saleDate))} ${esc(this.formatTime(sale.saleTime))}</td></tr>
    <tr><td>গ্রাহক / Customer:</td><td class="val">${esc(sale.customerName || 'Walking Guest')}</td></tr>
    ${sale.customerPhone ? `<tr><td>মোবাইল / Mobile:</td><td class="val">${esc(sale.customerPhone)}</td></tr>` : ''}
    <tr><td>বিক্রেতা / Sales By:</td><td class="val">${esc(sale.createdBy || '—')}</td></tr>
  </table>

  <div class="divider"></div>

  <table class="items">
    <thead>
      <tr>
        <th class="col-item">ওষুধ / Item</th>
        <th class="col-qty">পরিমাণ</th>
        <th class="col-amt">টাকা</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
  </table>

  <div class="divider"></div>

  <table class="totals">
    <tr><td>মোট মূল্য (Subtotal):</td><td class="val">৳${Number(sale.subTotal || 0).toFixed(2)}</td></tr>
    <tr><td>ছাড় (Discount):</td><td class="val">- ৳${(Number(sale.totalDiscount || 0) + Number(sale.specialDiscount || 0)).toFixed(2)}</td></tr>
    <tr><td>ভ্যাট/ট্যাক্স (VAT/Tax):</td><td class="val">+ ৳${Number(sale.totalTax || 0).toFixed(2)}</td></tr>
    <tr class="grand"><td>সর্বমোট (Payable):</td><td class="val">৳${Number(sale.grandTotal || 0).toFixed(2)}</td></tr>
    <tr><td>পরিশোধ (Paid - ${esc(sale.paymentMethod || 'Cash')}):</td><td class="val">৳${Number(sale.paidAmount || 0).toFixed(2)}</td></tr>
    ${Number(sale.changeAmount || 0) > 0 ? `<tr><td>ফেরত (Change):</td><td class="val">৳${Number(sale.changeAmount || 0).toFixed(2)}</td></tr>` : ''}
    ${Number(sale.dueAmount || 0) > 0 ? `<tr><td>বকেয়া (Due):</td><td class="val">৳${Number(sale.dueAmount || 0).toFixed(2)}</td></tr>` : ''}
  </table>

  <div class="divider"></div>

  <div class="footer">
    <div>${esc(brand.invoiceFooter)}</div>
    <div style="margin-top:3px; color:#555;">সফটওয়্যার: ${esc(brand.pharmacyName)}</div>
  </div>

  <div class="print-actions no-print">
    <button class="print-btn" onclick="window.print()">প্রিন্ট করুন / Print 80mm</button>
  </div>
</body>
</html>`;
  }

  print80mmReceipt(sale: SaleMaster): boolean {
    const html = this.buildReceiptHtml(sale);
    const win = window.open('', '_blank', 'width=390,height=680');
    if (!win) return false;

    win.document.open();
    win.document.write(html);
    win.document.close();
    setTimeout(() => {
      try { win.focus(); win.print(); } catch {}
    }, 350);
    return true;
  }
}
