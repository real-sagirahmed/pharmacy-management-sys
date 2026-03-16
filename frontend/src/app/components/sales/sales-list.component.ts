import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';

import { SalesService, SaleMaster, SaleSearchParameters } from '../../services/sales.service';
import { SalesInvoicePrintService } from '../../services/invoice-print.service';

@Component({
  selector: 'app-sales-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    TableModule, ButtonModule, InputTextModule, TagModule,
    DatePickerModule, SelectModule, ConfirmDialogModule, ToastModule, DialogModule
  ],
  providers: [ConfirmationService, MessageService, DatePipe],
  template: `
<p-toast position="top-right" />
<p-confirmDialog />

<div class="sl-page">

  <!-- Header -->
  <div class="sl-header">
    <div class="sl-header-left">
      <div class="sl-icon"><i class="pi pi-receipt"></i></div>
      <div>
        <h1 class="sl-title">Sales Records</h1>
        <p class="sl-sub">Manage all customer sales transactions</p>
      </div>
    </div>
    <button class="btn-new-sale" (click)="goToNew()">
      <i class="pi pi-plus"></i> New Sale
    </button>
  </div>

  <!-- Filters -->
  <div class="sl-filters">
    <input class="filter-input search-box" [(ngModel)]="params.searchText"
      (ngModelChange)="onSearch()" placeholder="Search invoice, customer, mobile…" />
    <p-datepicker [(ngModel)]="fromDate" (ngModelChange)="onSearch()"
      placeholder="From Date" dateFormat="dd/mm/yy" [showIcon]="true"
      styleClass="filter-cal" inputStyleClass="filter-input" />
    <p-datepicker [(ngModel)]="toDate" (ngModelChange)="onSearch()"
      placeholder="To Date" dateFormat="dd/mm/yy" [showIcon]="true"
      styleClass="filter-cal" inputStyleClass="filter-input" />
    <p-select [options]="statusOpts" [(ngModel)]="params.saleStatus"
      placeholder="All Status" [showClear]="true" (onChange)="onSearch()"
      styleClass="filter-select" optionLabel="label" optionValue="value" />
    <button class="btn-reset" (click)="resetFilters()">
      <i class="pi pi-refresh"></i>
    </button>
  </div>

  <!-- Table -->
  <div class="sl-table-card">
    <p-table [value]="sales()" [loading]="loading"
      [lazy]="true" [paginator]="true" [rows]="params.pageSize"
      [totalRecords]="totalCount" (onPage)="onPage($event)"
      styleClass="p-datatable-gridlines p-datatable-sm sl-table"
      [scrollable]="true" scrollHeight="calc(100vh - 280px)">

      <ng-template pTemplate="header">
        <tr>
          <th style="width:160px">Invoice</th>
          <th style="width:105px">Date</th>
          <th>Customer</th>
          <th style="width:100px">Mobile</th>
          <th style="width:80px; text-align:right">Total</th>
          <th style="width:80px; text-align:right">Paid</th>
          <th style="width:70px; text-align:right">Due</th>
          <th style="width:90px; text-align:center">Pay Status</th>
          <th style="width:90px; text-align:center">Sale Status</th>
          <th style="width:110px">Sales By</th>
          <th style="width:110px; text-align:center">Actions</th>
        </tr>
      </ng-template>

      <ng-template pTemplate="body" let-s>
        <tr>
          <td><span class="inv-code-cell">{{ s.invoiceCode }}</span></td>
          <td>{{ s.saleDate | date:'dd/MM/yy' }}</td>
          <td>{{ s.customerName }}</td>
          <td>{{ s.customerPhone || '—' }}</td>
          <td style="text-align:right; font-weight:700">৳{{ s.grandTotal | number:'1.2-2' }}</td>
          <td style="text-align:right; color:#0d9488; font-weight:600">৳{{ s.paidAmount | number:'1.2-2' }}</td>
          <td style="text-align:right; color:#f59e0b; font-weight:600">৳{{ s.dueAmount | number:'1.2-2' }}</td>
          <td style="text-align:center">
            <p-tag [value]="s.paymentStatus"
              [severity]="s.paymentStatus === 'Paid' ? 'success' : s.paymentStatus === 'Partial' ? 'warn' : 'danger'" />
          </td>
          <td style="text-align:center">
            <p-tag [value]="s.saleStatus"
              [severity]="s.saleStatus === 'Completed' ? 'success' : 'warn'" />
          </td>
          <td><span style="font-size:0.8rem; color:#64748b">{{ s.createdBy }}</span></td>
          <td style="text-align:center">
            <div class="action-btns">
              <button *ngIf="s.saleStatus === 'Hold'" class="act-btn edit" (click)="resumeHold(s.saleId!)" title="Resume/Edit">
                <i class="pi pi-pencil"></i>
              </button>
              <button class="act-btn view" (click)="viewDetail(s)" title="View">
                <i class="pi pi-eye"></i>
              </button>
              <button class="act-btn print" (click)="printInvoice(s.saleId!)" title="Print Invoice">
                <i class="pi pi-print"></i>
              </button>
              <button class="act-btn del" (click)="deleteSale(s.saleId!)" title="Delete">
                <i class="pi pi-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      </ng-template>

      <ng-template pTemplate="emptymessage">
        <tr>
          <td colspan="10" style="text-align:center; padding:40px; color:#94a3b8">
            <i class="pi pi-inbox" style="font-size:2rem; display:block; margin-bottom:10px"></i>
            No sales records found.
          </td>
        </tr>
      </ng-template>
    </p-table>
  </div>

  <!-- View Detail Dialog -->
  <p-dialog [(visible)]="showDetail" [header]="detailSale?.invoiceCode || 'Sale Detail'"
    [modal]="true" [style]="{width:'700px'}" [draggable]="false">
    <div *ngIf="detailSale" class="detail-body">
      <div class="detail-grid">
        <div><label>Customer</label><span>{{ detailSale.customerName }}</span></div>
        <div><label>Mobile</label><span>{{ detailSale.customerPhone || '—' }}</span></div>
        <div><label>Date</label><span>{{ detailSale.saleDate | date:'dd/MM/yyyy' }}</span></div>
        <div><label>Sales By</label><span>{{ detailSale.createdBy || '—' }}</span></div>
        <div><label>Status</label><span>{{ detailSale.paymentStatus }}</span></div>
      </div>
      <table class="detail-table">
        <thead><tr><th>Medicine</th><th>Batch</th><th>Qty</th><th>Price</th><th>Disc</th><th>VAT</th><th>Total</th></tr></thead>
        <tbody>
          <tr *ngFor="let d of detailSale.salesDetails">
            <td>{{ d.medicineName }}</td><td>{{ d.batchNumber }}</td>
            <td>{{ d.quantity }}</td><td>৳{{ d.unitPrice | number:'1.2-2' }}</td>
            <td>৳{{ d.discountAmount | number:'1.2-2' }}</td>
            <td>৳{{ d.taxAmount | number:'1.2-2' }}</td>
            <td>৳{{ d.lineTotal | number:'1.2-2' }}</td>
          </tr>
        </tbody>
      </table>
      <div class="detail-summary">
        <span>Subtotal: ৳{{ detailSale.subTotal | number:'1.2-2' }}</span>
        <span>Discount: ৳{{ detailSale.totalDiscount | number:'1.2-2' }}</span>
        <span>VAT: ৳{{ detailSale.totalTax | number:'1.2-2' }}</span>
        <span>Sp. Disc: ৳{{ detailSale.specialDiscount | number:'1.2-2' }}</span>
        <strong>Total: ৳{{ detailSale.grandTotal | number:'1.2-2' }}</strong>
      </div>
    </div>
    <ng-template pTemplate="footer">
      <button class="btn-dialog-close" (click)="showDetail = false">Close</button>
      <button class="btn-dialog-print" (click)="printInvoice(detailSale!.saleId!)">
        <i class="pi pi-print"></i> Print Invoice
      </button>
    </ng-template>
  </p-dialog>

</div>
  `,
  styles: [`
    :host { display:block; font-family:'Inter',sans-serif; }
    .sl-page { padding:20px 24px; background:#f0f4f8; min-height:100vh; }
    .sl-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:18px; }
    .sl-header-left { display:flex; align-items:center; gap:14px; }
    .sl-icon { width:46px;height:46px;background:linear-gradient(135deg,#0d9488,#0f766e);color:#fff;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:1.2rem; }
    .sl-title { font-size:1.4rem;font-weight:800;color:#0f172a;margin:0; }
    .sl-sub { font-size:.8rem;color:#64748b;margin:0; }
    .btn-new-sale { background:linear-gradient(135deg,#0d9488,#0f766e);color:#fff;border:none;border-radius:10px;padding:10px 20px;font-size:.875rem;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:8px;font-family:'Inter',sans-serif; }
    .sl-filters { display:flex;gap:10px;align-items:center;margin-bottom:14px;flex-wrap:wrap; }
    .filter-input { padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:.875rem;font-family:'Inter',sans-serif;color:#0f172a;outline:none;&:focus{border-color:#0d9488} }
    .search-box { width:260px; }
    .filter-cal, .filter-select { width:140px !important; }
    .btn-reset { width:38px;height:38px;background:#fff;border:1.5px solid #e2e8f0;border-radius:10px;color:#64748b;cursor:pointer;display:flex;align-items:center;justify-content:center;&:hover{background:#f1f5f9} }
    .sl-table-card { background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.04); }
    .inv-code-cell { font-weight:700;color:#0d9488;font-size:.85rem; }
    .action-btns { display:flex;gap:6px;justify-content:center; }
    .act-btn { width:30px;height:30px;border:none;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:.8rem; }
    .act-btn.view { background:#eff6ff;color:#3b82f6;&:hover{background:#dbeafe} }
    .act-btn.edit { background:#fef3c7;color:#d97706;&:hover{background:#fefce8} }
    .act-btn.print { background:#f0fdf4;color:#16a34a;&:hover{background:#dcfce7} }
    .act-btn.del { background:#fff1f2;color:#f87171;&:hover{background:#ffe4e6;color:#ef4444} }
    .detail-body { display:flex;flex-direction:column;gap:14px; }
    .detail-grid { display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;background:#f8fafc;border-radius:10px;padding:12px; div{display:flex;flex-direction:column;gap:4px;label{font-size:.65rem;font-weight:700;color:#94a3b8;text-transform:uppercase;}span{font-size:.875rem;font-weight:600;color:#0f172a;}} }
    .detail-table { width:100%;border-collapse:collapse;font-size:.8rem; th{background:#f8fafc;padding:8px;text-align:left;font-size:.65rem;font-weight:700;color:#64748b;} td{padding:8px;border-bottom:1px solid #f1f5f9;} }
    .detail-summary { display:flex;gap:16px;align-items:center;flex-wrap:wrap;background:#0f172a;border-radius:10px;padding:12px 16px;color:#94a3b8;font-size:.8rem; strong{color:#4ade80;font-size:1rem;margin-left:auto;} }
    .btn-dialog-close { padding:8px 18px;border:1.5px solid #e2e8f0;border-radius:10px;background:#fff;color:#64748b;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif; }
    .btn-dialog-print { padding:8px 18px;border:none;border-radius:10px;background:linear-gradient(135deg,#0d9488,#0f766e);color:#fff;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;display:flex;align-items:center;gap:6px; }
  `]
})
export class SalesListComponent implements OnInit {
  sales = signal<SaleMaster[]>([]);
  totalCount = 0;
  loading = false;

  fromDate: Date | null = null;
  toDate: Date | null = null;

  params: SaleSearchParameters = { pageNumber: 1, pageSize: 15 };

  statusOpts = [
    { label: 'Completed', value: 'Completed' },
    { label: 'Hold', value: 'Hold' }
  ];

  showDetail = false;
  detailSale: SaleMaster | null = null;

  private searchTimer: any;

  constructor(
    private salesService: SalesService,
    private printService: SalesInvoicePrintService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private router: Router,
    private datePipe: DatePipe
  ) {}

  ngOnInit() { this.loadSales(); }

  loadSales() {
    this.loading = true;
    this.salesService.getSalesPaged(this.params).subscribe({
      next: (res) => { this.sales.set(res.items); this.totalCount = res.totalCount; this.loading = false; },
      error: () => this.loading = false
    });
  }

  onSearch() {
    clearTimeout(this.searchTimer);
    this.params.fromDate = this.fromDate ? this.datePipe.transform(this.fromDate, 'yyyy-MM-dd')! : undefined;
    this.params.toDate = this.toDate ? this.datePipe.transform(this.toDate, 'yyyy-MM-dd')! : undefined;
    this.params.pageNumber = 1;
    this.searchTimer = setTimeout(() => this.loadSales(), 350);
  }

  onPage(event: any) {
    this.params.pageNumber = event.first / event.rows + 1;
    this.params.pageSize = event.rows;
    this.loadSales();
  }

  resetFilters() { this.fromDate = null; this.toDate = null; this.params = { pageNumber: 1, pageSize: 15 }; this.loadSales(); }

  goToNew() { this.router.navigate(['/dashboard/sales/new']); }

  resumeHold(saleId: number) { this.router.navigate(['/dashboard/sales/edit', saleId]); }

  viewDetail(s: SaleMaster) {
    this.salesService.getSaleById(s.saleId!).subscribe(full => { this.detailSale = full; this.showDetail = true; });
  }

  printInvoice(saleId: number) {
    this.salesService.getSaleById(saleId).subscribe(s => this.printService.generatePDF(s));
  }

  deleteSale(id: number) {
    this.confirmationService.confirm({
      message: 'Delete this sale? Stock will be restored if sale was Completed.',
      header: 'Confirm Delete', icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.salesService.deleteSale(id).subscribe({
          next: () => { this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Sale deleted and stock restored.' }); this.loadSales(); },
          error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete sale.' })
        });
      }
    });
  }
}
