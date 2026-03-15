import { Component, OnInit, signal, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PurchaseService, PurchaseMaster } from '../../services/purchase.service';
import { TableModule } from 'primeng/table';
import { GrnPrintService } from '../../services/grn-print.service';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { DialogModule } from 'primeng/dialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-purchase-list',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule,
    TableModule, ToastModule, ConfirmDialogModule,
    PaginatorModule, DialogModule
  ],
  providers: [],
  template: `
    <div class="page-wrap animate-fadein-up">
      <p-toast></p-toast>
      <p-confirmDialog></p-confirmDialog>
      
      <!-- Sticky Header Area -->
      <div id="main-sticky-zone" class="sticky-header">
        <div class="page-head pt-2 pb-1 px-4">
          <div style="margin-left: 12px;">
            <h1 class="page-title">Procurement Records</h1>
            <p class="page-sub text-xs">All GRN purchase orders from suppliers</p>
          </div>
          <button class="btn-primary" (click)="router.navigate(['/dashboard/purchases/new'])" title="Shortcut: Alt + N">
            <i class="pi pi-plus"></i> New GRN
          </button>
        </div>

        <div class="table-toolbar px-4 py-1">
          <div class="search-wrap">
            <i class="pi pi-search search-icon"></i>
            <input #searchInput type="text" [(ngModel)]="searchText" (ngModelChange)="onSearchChange($event)"
                   placeholder="Search GRN, invoice or supplier... (Shortcut: /)" class="search-input">
            <button class="search-clear" *ngIf="searchText" (click)="clearSearch()">
              <i class="pi pi-times"></i>
            </button>
          </div>
          <div class="flex items-center gap-4">
            <span class="result-count font-semibold">{{ totalCount() }} records found</span>
            <div class="summary-row">
              <div class="chip chip-teal"><i class="pi pi-shopping-bag"></i> {{ totalCount() }} Total</div>
            </div>
          </div>
        </div>
      </div>

      <div class="px-4 pb-4">
        <div class="table-card">
          <div class="table-responsive">
            <p-table [value]="purchases()"
                     [scrollable]="true"
                     scrollHeight="calc(100vh - 230px)"
                     styleClass="p-datatable-sm"
                     [rowHover]="true"
                     [loading]="loading"
                     emptyMessage="No purchase records found.">
              <ng-template pTemplate="header">
                <tr>
                  <th style="min-width:120px">GRN Code</th>
                  <th style="min-width:100px">Date</th>
                  <th style="min-width:130px">Invoice No</th>
                  <th style="min-width:180px">Supplier</th>
                  <th style="min-width:100px">Mobile</th>
                  <th class="text-right" style="min-width:110px">Total (Tk)</th>
                  <th class="text-right" style="min-width:100px">Paid (Tk)</th>
                  <th class="text-right" style="min-width:100px">Due (Tk)</th>
                  <th style="min-width:100px">Status</th>
                  <th style="min-width:130px" alignFrozen="right" pFrozenColumn>Actions</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-p>
                <tr>
                  <td><span class="grn-badge">{{ p.grnCode }}</span></td>
                  <td class="text-xs text-muted" style="white-space:nowrap">{{ p.purchaseDate | date:'dd/MM/yyyy' }}</td>
                  <td><span class="inv-badge">{{ p.invoiceNumber || '-' }}</span></td>
                  <td class="font-semibold text-sm" style="white-space:nowrap">{{ p.supplierName }}</td>
                  <td class="text-xs text-muted">{{ p.supplierPhone || '-' }}</td>
                  <td class="text-right font-semibold text-sm">{{ p.grandTotal | number:'1.2-2' }}</td>
                  <td class="text-right text-xs text-green">{{ p.paidAmount | number:'1.2-2' }}</td>
                  <td class="text-right text-xs" [class.text-red]="(p.dueAmount || 0) > 0">{{ p.dueAmount | number:'1.2-2' }}</td>
                  <td>
                    <span class="status-badge"
                      [class.badge-paid]="p.paymentStatus === 'Paid'"
                      [class.badge-partial]="p.paymentStatus === 'Partial'"
                      [class.badge-due]="p.paymentStatus === 'Due'">
                      {{ p.paymentStatus }}
                    </span>
                  </td>
                  <td alignFrozen="right" pFrozenColumn>
                    <div class="action-btns">
                      <button class="act-btn act-view" (click)="viewDetails(p)" title="View Details">
                        <i class="pi pi-eye"></i>
                      </button>
                      <button class="act-btn act-print" (click)="printGrn(p)" title="Print GRN">
                        <i class="pi pi-print"></i>
                      </button>
                      <button class="act-btn act-del" (click)="deletePurchase(p)" title="Delete GRN">
                        <i class="pi pi-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              </ng-template>
            </p-table>
          </div>
          <p-paginator [rows]="pageSize" [totalRecords]="totalCount()"
                       (onPageChange)="onPageChange($event)"
                       [rowsPerPageOptions]="[10, 20, 50]"></p-paginator>
        </div>
      </div>

      <!-- Details Dialog -->
      <p-dialog [(visible)]="showDetails" [modal]="true" header="GRN Details"
        [style]="{width:'95vw', maxWidth:'640px'}" [closable]="true" styleClass="premium-dialog">
        <ng-template pTemplate="header">
          <div class="dialog-header-custom">
            <div class="header-icon-hex">
              <i class="pi pi-file"></i>
            </div>
            <div>
              <h2 class="dialog-title-text">GRN Details</h2>
              <p class="dialog-sub-text">Full breakdown of procurement transaction.</p>
            </div>
          </div>
        </ng-template>

        <div *ngIf="selectedPurchase as p" class="details-wrap">
          <div class="det-grid">
            <div class="det-item"><span>GRN</span><strong>{{ p.grnCode }}</strong></div>
            <div class="det-item"><span>Invoice</span><strong>{{ p.invoiceNumber || '-' }}</strong></div>
            <div class="det-item"><span>Date</span><strong>{{ p.purchaseDate | date:'dd/MM/yyyy' }}</strong></div>
            <div class="det-item"><span>Supplier</span><strong>{{ p.supplierName }}</strong></div>
            <div class="det-item"><span>Subtotal</span><strong>{{ p.subTotal | number:'1.2-2' }} Tk</strong></div>
            <div class="det-item"><span>Discount</span><strong>- {{ p.totalDiscount | number:'1.2-2' }} Tk</strong></div>
            <div class="det-item"><span>Tax</span><strong>+ {{ p.totalTax | number:'1.2-2' }} Tk</strong></div>
            <div class="det-item"><span>Adjustment</span><strong>{{ p.adjustment | number:'1.2-2' }} Tk</strong></div>
            <div class="det-item grand"><span>Grand Total</span><strong>{{ p.grandTotal | number:'1.2-2' }} Tk</strong></div>
            <div class="det-item"><span>Paid</span><strong class="text-green">{{ p.paidAmount | number:'1.2-2' }} Tk</strong></div>
            <div class="det-item"><span>Due</span><strong [class.text-red]="(p.dueAmount || 0) > 0">{{ p.dueAmount | number:'1.2-2' }} Tk</strong></div>
            <div class="det-item"><span>Status</span>
              <span class="status-badge" [class.badge-paid]="p.paymentStatus==='Paid'" [class.badge-partial]="p.paymentStatus==='Partial'" [class.badge-due]="p.paymentStatus==='Due'">
                {{ p.paymentStatus }}
              </span>
            </div>
          </div>

          <!-- Medicine Lines -->
          <div *ngIf="p.purchaseDetails && p.purchaseDetails.length > 0" class="detail-section">
            <div class="det-heading"><i class="pi pi-box"></i> Medicine Items</div>
            <table class="det-table">
              <thead><tr>
                <th>Medicine</th><th>Batch</th><th>Qty</th><th>Unit Price</th><th class="text-right">Total</th>
              </tr></thead>
              <tbody>
                <tr *ngFor="let d of p.purchaseDetails">
                  <td>{{ d.medicineName }}</td>
                  <td><span class="batch-mono">{{ d.batchNumber }}</span></td>
                  <td>{{ d.quantity }} {{ d.uomName }}</td>
                  <td>{{ d.unitCost | number:'1.2-2' }} Tk</td>
                  <td class="text-right font-bold">{{ d.lineTotal | number:'1.2-2' }} Tk</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Payments -->
          <div *ngIf="p.purchasePayments && p.purchasePayments.length > 0" class="detail-section">
            <div class="det-heading"><i class="pi pi-credit-card"></i> Payments</div>
            <table class="det-table">
              <thead><tr><th>Method</th><th>Amount</th><th>Reference</th></tr></thead>
              <tbody>
                <tr *ngFor="let pm of p.purchasePayments">
                  <td><span class="pay-badge">{{ pm.paymentMethod }}</span></td>
                  <td class="font-bold">{{ pm.amount | number:'1.2-2' }} Tk</td>
                  <td class="text-xs text-muted">{{ pm.transactionId || pm.accountNumber || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <ng-template pTemplate="footer">
          <div class="premium-dialog-footer">
            <button class="btn-cancel" (click)="showDetails=false">
              <i class="pi pi-times"></i> Close
            </button>
            <button class="btn-save" (click)="printGrn(selectedPurchase!)">
              <i class="pi pi-print"></i>
              <span>Print GRN</span>
            </button>
          </div>
        </ng-template>
      </p-dialog>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }
    .page-wrap { display: flex; flex-direction: column; gap: 12px; width: 100%; }
    
    /* Sticky & Compact Header */
    .sticky-header {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: #ffffff;
      border-bottom: 2px solid #e2e8f0;
    }
    
    .page-head { 
      border-bottom: 1px solid #f1f5f9; 
      display: flex; 
      justify-content: space-between; 
      align-items: center; 
    }
    
    .page-title { font-size: 1.15rem !important; margin: 0; font-weight: 800; color: #1e293b; }
    .page-sub { margin: 0; color: #64748b; font-size: 0.75rem; }

    .btn-primary {
      display: flex; align-items: center; gap: 8px;
      background: #0d9488; color: #fff;
      border: none; border-radius: 10px;
      padding: 9px 18px;
      font-size: .875rem; font-weight: 600;
      cursor: pointer; transition: background .15s;
      font-family: 'Inter', sans-serif;
      white-space: nowrap;
    }
    .btn-primary:hover { background: #0f766e; }

    .table-toolbar { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; gap: 12px; flex-wrap: wrap; }
    
    .search-wrap { position: relative; display: flex; align-items: center; flex: 1; max-width: 400px; }
    .search-icon { position: absolute; left: 12px; color: #94a3b8; font-size: .875rem; pointer-events: none; }
    .search-input { 
      width: 100%; padding: 9px 36px; border: 1.5px solid #e2e8f0; border-radius: 10px; 
      font-size: 13px !important; font-family: 'Inter', sans-serif; outline: none; 
      transition: border-color .15s; background: #f8fafc; height: 34px;
    }
    .search-input:focus { border-color: #0d9488; background: #fff; }
    .search-clear { position: absolute; right: 10px; background: none; border: none; color: #94a3b8; cursor: pointer; }

    .result-count { font-size: .8rem; color: #94a3b8; }
    .summary-row { display: flex; gap: 10px; }
    .chip { display: flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 99px; font-size: .8rem; font-weight: 600; }
    .chip-teal { background: #ccfbf1; color: #0f766e; }

    .table-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; }
    .table-responsive { overflow-x: auto; width: 100%; }

    /* Table Header Styling */
    ::ng-deep .p-datatable .p-datatable-thead > tr > th {
      background-color: #f8fafc !important;
      color: #0d9488 !important;
      font-weight: 700 !important;
      font-size: 0.75rem !important;
      text-transform: uppercase !important;
      letter-spacing: 0.5px !important;
      padding: 8px 10px !important;
      border-bottom: 2px solid #0d9488 !important;
    }
    
    ::ng-deep .p-datatable .p-datatable-tbody > tr > td {
      padding: 6px 10px !important;
      border-bottom: 1px solid #f1f5f9;
    }

    .text-muted { color: #64748b; }
    .text-xs { font-size: .75rem; }
    .text-sm { font-size: .82rem; }
    .font-semibold { font-weight: 600; }
    .text-right { text-align: right; }
    .text-green { color: #16a34a; }
    .text-red { color: #dc2626; font-weight: 700; }

    .grn-badge { font-family: monospace; background: #eff6ff; color: #3b82f6; padding: 2px 8px; border-radius: 6px; font-size: .75rem; font-weight: 700; }
    .inv-badge { background: #f1f5f9; color: #475569; padding: 2px 8px; border-radius: 6px; font-size: .75rem; font-weight: 600; }
    .status-badge { padding: 3px 10px; border-radius: 99px; font-size: .72rem; font-weight: 700; }
    .badge-paid { background: #dcfce7; color: #15803d; }
    .badge-partial { background: #fef3c7; color: #b45309; }
    .badge-due { background: #fee2e2; color: #b91c1c; }

    .action-btns { display: flex; gap: 4px; }
    .act-btn { width: 32px; height: 32px; border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform .1s; }
    .act-btn:hover { transform: scale(1.1); }
    .act-view { background: #eff6ff; color: #3b82f6; }
    .act-print { background: #f0f9ff; color: #0284c7; }
    .act-del { background: #fff1f2; color: #f43f5e; }

    /* ─── Premium Dialog ─── */
    ::ng-deep .premium-dialog .p-dialog-header { background: #fff; border-bottom: 1px solid #f1f5f9; padding: 14px 20px; border-radius: 16px 16px 0 0; }
    ::ng-deep .dialog-header-custom { display: flex; align-items: center; gap: 12px; }
    ::ng-deep .header-icon-hex {
      width: 36px; height: 36px; background: #0d9488; color: #fff;
      display: flex; align-items: center; justify-content: center;
      border-radius: 10px; font-size: 1rem;
      box-shadow: 0 4px 10px rgba(13, 148, 136, 0.2);
      flex-shrink: 0;
    }
    ::ng-deep .dialog-title-text { font-size: 1rem; font-weight: 800; color: #0f172a; margin: 0; line-height: 1.2; }
    ::ng-deep .dialog-sub-text { font-size: .7rem; color: #64748b; margin: 0; }

    .details-wrap { display: flex; flex-direction: column; gap: 14px; padding: 18px 24px; max-height: 70vh; overflow-y: auto; }
    .det-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .det-item { display: flex; flex-direction: column; gap: 2px; background: #f8fafc; border-radius: 8px; padding: 8px 12px; }
    .det-item span { font-size: .68rem; color: #94a3b8; text-transform: uppercase; letter-spacing: .05em; }
    .det-item strong { font-size: .85rem; color: #0f172a; }
    .det-item.grand { background: #ccfbf1; }
    .det-item.grand strong { color: #0d9488; font-size: 1rem; }

    .detail-section { border-top: 1px solid #e2e8f0; padding-top: 10px; margin-top: 5px; }
    .det-heading { font-size: .7rem; font-weight: 700; color: #0d9488; text-transform: uppercase; letter-spacing: .08em; display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
    .det-table { width: 100%; border-collapse: collapse; font-size: .78rem; }
    .det-table th { background: #f8fafc; color: #64748b; font-weight: 700; padding: 6px 8px; text-align: left; font-size: .68rem; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
    .det-table td { padding: 6px 8px; border-bottom: 1px solid #f8fafc; }
    .batch-mono { font-family: monospace; color: #0d9488; font-size: .75rem; }
    .pay-badge { background: #eff6ff; color: #3b82f6; padding: 2px 8px; border-radius: 6px; font-size: .72rem; font-weight: 700; }
    .font-bold { font-weight: 700; }

    .premium-dialog-footer { display: flex; justify-content: flex-end; gap: 10px; width: 100%; padding: 10px 16px; }
    .btn-cancel {
      display: flex; align-items: center; gap: 6px; padding: 8px 16px;
      background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0;
      border-radius: 10px; font-weight: 600; font-size: .8rem; cursor: pointer; transition: all .2s;
    }
    .btn-cancel:hover { background: #e2e8f0; color: #0f172a; }
    
    .btn-save {
      display: flex; align-items: center; gap: 8px; padding: 8px 20px;
      background: linear-gradient(135deg, #0d9488, #0f766e); color: #fff;
      border: none; border-radius: 10px; font-weight: 700; font-size: .8rem;
      cursor: pointer; transition: all .2s; box-shadow: 0 4px 10px rgba(13, 148, 136, 0.2);
    }
    .btn-save:hover { transform: translateY(-1px); box-shadow: 0 6px 14px rgba(13, 148, 136, 0.25); opacity: 0.95; }

    .animate-fadein-up { animation: fadeIn .5s ease-out; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    /* Centering and Overlay Fix */
    ::ng-deep .p-dialog-mask { 
      background-color: rgba(15, 23, 42, 0.6) !important; 
      backdrop-filter: blur(4px); 
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    }
  `]
})
export class PurchaseListComponent implements OnInit {
  @ViewChild('searchInput') searchInput!: ElementRef;

  purchases = signal<PurchaseMaster[]>([]);
  totalCount = signal(0);
  loading = false;

  searchText = '';
  pageNumber = 1;
  pageSize = 10;
  private searchSubject = new Subject<string>();

  showDetails = false;
  selectedPurchase: PurchaseMaster | null = null;

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.altKey && event.key.toLowerCase() === 'n') {
      event.preventDefault();
      this.router.navigate(['/dashboard/purchases/new']);
    }
    if (event.key === 'Escape') {
      if (this.showDetails) this.showDetails = false;
      else if (this.searchText) this.clearSearch();
    }
    if (event.key === '/' && !this.showDetails) {
      const activeElement = document.activeElement;
      if (activeElement?.tagName !== 'INPUT' && activeElement?.tagName !== 'TEXTAREA') {
        event.preventDefault();
        this.searchInput.nativeElement.focus();
      }
    }
  }

  constructor(
    public router: Router,
    private purchaseService: PurchaseService,
    private grnPrintService: GrnPrintService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.searchSubject.pipe(debounceTime(400), distinctUntilChanged()).subscribe(() => {
      this.pageNumber = 1;
      this.loadData();
    });
    this.loadData();
  }

  loadData() {
    this.loading = true;
    this.purchaseService.getPurchasesPaged({
      searchText: this.searchText,
      pageNumber: this.pageNumber,
      pageSize: this.pageSize
    }).subscribe({
      next: res => {
        this.purchases.set(res.items);
        this.totalCount.set(res.totalCount);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not load purchases.' });
      }
    });
  }

  onSearchChange(val: string) { this.searchSubject.next(val); }
  clearSearch() { this.searchText = ''; this.pageNumber = 1; this.loadData(); }
  onPageChange(event: PaginatorState) {
    this.pageNumber = (event.page ?? 0) + 1;
    this.pageSize = event.rows ?? 10;
    this.loadData();
  }

  viewDetails(p: PurchaseMaster) {
    this.loading = true;
    this.purchaseService.getPurchaseById(p.purchaseId!).subscribe({
      next: full => { this.selectedPurchase = full; this.showDetails = true; this.loading = false; },
      error: () => { this.loading = false; this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not load details.' }); }
    });
  }

  deletePurchase(p: PurchaseMaster) {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete GRN <strong>${p.grnCode}</strong>?<br>This will revert the stock quantities.`,
      header: 'Delete GRN',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.purchaseService.deletePurchase(p.purchaseId!).subscribe({
          next: () => { this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'GRN deleted and stock reversed.' }); this.loadData(); },
          error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not delete GRN.' })
        });
      }
    });
  }

  printGrn(p: PurchaseMaster) {
    if (!p.purchaseId) return;
    
    this.loading = true;
    this.purchaseService.getPurchaseById(p.purchaseId).subscribe({
      next: (fullData) => {
        this.loading = false;
        this.grnPrintService.generatePDF(fullData);
      },
      error: () => {
        this.loading = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not load details for printing.' });
      }
    });
  }
}
