import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ReportService } from '../../services/report.service';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { SkeletonModule } from 'primeng/skeleton';
import { PartyService } from '../../services/party.service';

@Component({
  selector: 'app-report-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, ButtonModule, CalendarModule, CardModule, TagModule, DropdownModule, InputNumberModule, MenuModule, SkeletonModule],
  template: `
    <div class="report-container animate-fadein-up">
      <div class="report-header">
        <div class="header-main">
          <div class="title-wrap">
            <h1 class="report-title">{{ reportTitle() }}</h1>
            <p class="report-subtitle">Generated on {{ today | date:'medium' }}</p>
          </div>
          <div class="header-actions">
            <!-- Modern Export Dropdown -->
            <button pButton label="Export" icon="pi pi-download" class="p-button-outlined p-button-sm" (click)="exportMenu.toggle($event)"></button>
            <p-menu #exportMenu [model]="exportItems" [popup]="true" appendTo="body"></p-menu>
          </div>
        </div>

        <div class="filter-bar" *ngIf="showDateFilter()">
          
          <!-- Quick Filters -->
          <div class="quick-filters flex gap-1 mr-4 border-r border-slate-200 pr-4">
            <button pButton label="Today" class="p-button-text p-button-sm quick-btn" (click)="setQuickDate('today')"></button>
            <button pButton label="Week" class="p-button-text p-button-sm quick-btn" (click)="setQuickDate('week')"></button>
            <button pButton label="Month" class="p-button-text p-button-sm quick-btn" (click)="setQuickDate('month')"></button>
          </div>

          <div class="filter-item">
            <label>Start Date</label>
            <p-calendar [(ngModel)]="startDate" dateFormat="yy-mm-dd" [showIcon]="true" appendTo="body" class="p-inputtext-sm"></p-calendar>
          </div>
          <div class="filter-item">
            <label>End Date</label>
            <p-calendar [(ngModel)]="endDate" dateFormat="yy-mm-dd" [showIcon]="true" appendTo="body" class="p-inputtext-sm"></p-calendar>
          </div>
          <div class="filter-item" *ngIf="reportType === 'ledger'">
            <label>Party</label>
            <p-dropdown [options]="parties" [(ngModel)]="selectedPartyId" optionLabel="fullName" optionValue="partyId" [filter]="true" filterBy="fullName" [showClear]="true" placeholder="Select a Party" class="p-inputtext-sm" appendTo="body" styleClass="w-full md:w-56"></p-dropdown>
          </div>
          <div class="filter-item" *ngIf="reportType === 'top-selling'">
            <label>Count</label>
            <p-inputNumber [(ngModel)]="topSellingCount" [min]="5" [max]="100" class="p-inputtext-sm"></p-inputNumber>
          </div>
          <button pButton label="Generate" icon="pi pi-refresh" class="p-button-sm mt-auto shadow-sm" (click)="loadData()" [loading]="loading()"></button>
        </div>
        
        <div class="filter-bar" *ngIf="reportType === 'expiry'">
          <div class="filter-item">
            <label>Months to Expiry</label>
            <p-inputNumber [(ngModel)]="expiryMonths" [min]="1" [max]="60" class="p-inputtext-sm"></p-inputNumber>
          </div>
          <button pButton label="Generate" icon="pi pi-refresh" class="p-button-sm mt-auto shadow-sm" (click)="loadData()" [loading]="loading()"></button>
        </div>
      </div>

      <div class="report-content card mt-4 shadow-sm border-0">
        
        <!-- Skeleton Loader for all tables -->
        <div *ngIf="loading() && data().length === 0" class="p-4">
           <p-skeleton height="3rem" styleClass="mb-2"></p-skeleton>
           <p-skeleton height="3rem" styleClass="mb-2"></p-skeleton>
           <p-skeleton height="3rem" styleClass="mb-2"></p-skeleton>
           <p-skeleton height="3rem"></p-skeleton>
        </div>

        <!-- ── Sales Report ── -->
        <p-table *ngIf="reportType === 'sales-summary' && !loading()" [value]="data()" [scrollable]="true" scrollHeight="600px" styleClass="p-datatable-sm p-datatable-gridlines smart-table">
          <ng-template pTemplate="header">
            <tr>
              <th style="min-width: 100px" pFrozenColumn>Date</th>
              <th style="min-width: 120px" pFrozenColumn>Invoice</th>
              <th style="min-width: 150px">Customer</th>
              <th class="text-right" style="min-width: 120px">Subtotal</th>
              <th class="text-right" style="min-width: 100px">Discount</th>
              <th class="text-right" style="min-width: 100px">Tax</th>
              <th class="text-right font-bold text-teal-700" style="min-width: 130px">Grand Total</th>
              <th class="text-right" *ngIf="isAdmin()" style="min-width: 120px">Profit</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-s>
            <tr class="smart-row">
              <td pFrozenColumn>{{ s.date | date:'yyyy-MM-dd' }}</td>
              <td class="font-mono font-bold text-indigo-600" pFrozenColumn>{{ s.invoiceCode }}</td>
              <td>{{ s.customerName }}</td>
              <td class="text-right">{{ s.subTotal | number:'1.2-2' }}</td>
              <td class="text-right text-red-500">{{ s.totalDiscount | number:'1.2-2' }}</td>
              <td class="text-right">{{ s.totalTax | number:'1.2-2' }}</td>
              <td class="text-right font-bold text-teal-700">{{ s.grandTotal | number:'1.2-2' }}</td>
              <td class="text-right text-emerald-600 font-bold" *ngIf="isAdmin()">{{ s.profit | number:'1.2-2' }}</td>
            </tr>
          </ng-template>
          <ng-template pTemplate="footer">
            <tr>
              <td colspan="3" class="text-right font-bold bg-slate-50">Totals:</td>
              <td class="text-right font-bold bg-slate-50">{{ sum(data(), 'subTotal') | number:'1.2-2' }}</td>
              <td class="text-right font-bold text-red-500 bg-slate-50">{{ sum(data(), 'totalDiscount') | number:'1.2-2' }}</td>
              <td class="text-right font-bold bg-slate-50">{{ sum(data(), 'totalTax') | number:'1.2-2' }}</td>
              <td class="text-right font-bold text-teal-800 bg-teal-50">{{ sum(data(), 'grandTotal') | number:'1.2-2' }}</td>
              <td class="text-right font-bold text-emerald-800 bg-emerald-50" *ngIf="isAdmin()">{{ sum(data(), 'profit') | number:'1.2-2' }}</td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td [attr.colspan]="isAdmin() ? 8 : 7" class="text-center p-8 empty-state">
                <i class="pi pi-box empty-icon"></i>
                <h3>No Data Found</h3>
                <p>Try adjusting your date filters.</p>
              </td>
            </tr>
          </ng-template>
        </p-table>

        <!-- ── Stock Report ── -->
        <p-table *ngIf="reportType === 'stock-status' && !loading()" [value]="data()" [paginator]="true" [rows]="20" [scrollable]="true" scrollHeight="500px" styleClass="p-datatable-sm p-datatable-gridlines smart-table">
          <ng-template pTemplate="header">
            <tr>
              <th style="min-width: 120px" pFrozenColumn>Code</th>
              <th style="min-width: 200px" pFrozenColumn>Medicine</th>
              <th style="min-width: 150px">Category</th>
              <th class="text-center" style="min-width: 100px">Stock</th>
              <th class="text-right" style="min-width: 150px">Purchase Price</th>
              <th class="text-right" style="min-width: 150px">Sale Price</th>
              <th class="text-right" style="min-width: 180px">Stock Value (Pur.)</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-m>
            <tr class="smart-row">
              <td class="text-xs uppercase font-bold text-slate-500" pFrozenColumn>{{ m.medicineCode }}</td>
              <td class="font-bold text-indigo-700" pFrozenColumn>{{ m.medicineName }}</td>
              <td><p-tag [value]="m.category" severity="info" class="text-[10px]"></p-tag></td>
              <td class="text-center">
                <span [class.text-red-600]="m.currentStock < 10" [class.font-bold]="m.currentStock < 10">
                  {{ m.currentStock }}
                </span>
              </td>
              <td class="text-right">{{ m.purchasePrice | number:'1.2-2' }}</td>
              <td class="text-right">{{ m.salePrice | number:'1.2-2' }}</td>
              <td class="text-right font-mono">{{ m.totalPurchaseValue | number:'1.2-2' }}</td>
            </tr>
          </ng-template>
          <ng-template pTemplate="footer">
            <tr>
              <td colspan="3" class="text-right font-bold bg-slate-50">Total Inventory Value:</td>
              <td class="text-center font-bold bg-slate-50">{{ sum(data(), 'currentStock') }}</td>
              <td class="bg-slate-50"></td>
              <td class="bg-slate-50"></td>
              <td class="text-right font-bold text-indigo-700 bg-indigo-50">{{ sum(data(), 'totalPurchaseValue') | number:'1.2-2' }}</td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="7" class="text-center p-8 empty-state">
                <i class="pi pi-box empty-icon"></i>
                <h3>No Data Found</h3>
              </td>
            </tr>
          </ng-template>
        </p-table>

        <!-- ── Low Stock Report ── -->
        <p-table *ngIf="reportType === 'low-stock' && !loading()" [value]="data()" [paginator]="true" [rows]="20" [scrollable]="true" scrollHeight="500px" styleClass="p-datatable-sm p-datatable-gridlines smart-table">
          <ng-template pTemplate="header">
            <tr>
              <th style="min-width: 120px" pFrozenColumn>Code</th>
              <th style="min-width: 200px" pFrozenColumn>Medicine</th>
              <th style="min-width: 150px">Category</th>
              <th class="text-center text-red-600 font-bold" style="min-width: 130px">Current Stock</th>
              <th class="text-right" style="min-width: 150px">Purchase Price</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-m>
            <tr class="smart-row">
              <td class="text-xs uppercase font-bold text-slate-500" pFrozenColumn>{{ m.medicineCode }}</td>
              <td class="font-bold text-indigo-700" pFrozenColumn>{{ m.medicineName }}</td>
              <td><p-tag [value]="m.category" severity="info" class="text-[10px]"></p-tag></td>
              <td class="text-center text-red-600 font-black">{{ m.currentStock }}</td>
              <td class="text-right">{{ m.purchasePrice | number:'1.2-2' }}</td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="5" class="text-center p-8 empty-state">
                <i class="pi pi-check-circle text-emerald-500 text-5xl mb-4"></i>
                <h3 class="text-emerald-700 font-bold">Stock Levels Good</h3>
                <p>There are no items currently running out of stock.</p>
              </td>
            </tr>
          </ng-template>
        </p-table>

        <!-- ── Expiry Report ── -->
        <p-table *ngIf="reportType === 'expiry' && !loading()" [value]="data()" [paginator]="true" [rows]="20" [scrollable]="true" scrollHeight="500px" styleClass="p-datatable-sm p-datatable-gridlines smart-table">
          <ng-template pTemplate="header">
            <tr>
              <th style="min-width: 200px" pFrozenColumn>Medicine</th>
              <th style="min-width: 120px" pFrozenColumn>Batch</th>
              <th style="min-width: 130px">Expiry Date</th>
              <th class="text-center" style="min-width: 100px">Days left</th>
              <th class="text-center" style="min-width: 130px">Remaining Stock</th>
              <th style="min-width: 120px">Status</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-e>
            <tr class="smart-row" [ngClass]="{'bg-red-50': e.status === 'Expired', 'opacity-70': e.remainingStock === 0}">
              <td class="font-bold text-indigo-700" pFrozenColumn>{{ e.medicineName }}</td>
              <td class="font-mono text-slate-500" pFrozenColumn>{{ e.batchNumber }}</td>
              <td>{{ e.expiryDate | date:'yyyy-MM-dd' }}</td>
              <td class="text-center font-bold" [class.text-red-600]="e.daysUntilExpiry < 0">{{ e.daysUntilExpiry }}</td>
              <td class="text-center font-bold">{{ e.remainingStock }}</td>
              <td>
                <p-tag [value]="e.status" [severity]="e.status === 'Expired' ? 'danger' : 'warning'"></p-tag>
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="6" class="text-center p-8 empty-state">
                <i class="pi pi-check-circle text-emerald-500 text-5xl mb-4"></i>
                <h3 class="text-emerald-700 font-bold">All Good</h3>
                <p>No medicines are expiring within the selected period.</p>
              </td>
            </tr>
          </ng-template>
        </p-table>

        <!-- ── Top Selling Report ── -->
        <p-table *ngIf="reportType === 'top-selling' && !loading()" [value]="data()" [scrollable]="true" scrollHeight="500px" styleClass="p-datatable-sm p-datatable-gridlines smart-table">
          <ng-template pTemplate="header">
            <tr>
              <th style="width: 60px">#</th>
              <th style="min-width: 250px" pFrozenColumn>Medicine</th>
              <th class="text-center" style="min-width: 150px">Total Quantity Sold</th>
              <th class="text-center" style="min-width: 120px">Transactions</th>
              <th class="text-right" style="min-width: 180px">Total Revenue</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-t let-i="rowIndex">
            <tr class="smart-row">
              <td class="font-bold text-slate-400">{{ i + 1 }}</td>
              <td class="font-bold text-teal-700" pFrozenColumn>{{ t.medicineName }}</td>
              <td class="text-center font-black text-lg">{{ t.totalQuantitySold }}</td>
              <td class="text-center">{{ t.transactionCount }}</td>
              <td class="text-right font-mono text-emerald-700 font-bold">{{ t.totalRevenue | number:'1.2-2' }}</td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="5" class="text-center p-8 empty-state">
                <i class="pi pi-box empty-icon"></i>
                <h3>No Data Found</h3>
              </td>
            </tr>
          </ng-template>
        </p-table>

        <!-- ── Ledger Report ── -->
        <div *ngIf="reportType === 'ledger' && !selectedPartyId" class="p-8 text-center text-slate-500">
           <i class="pi pi-users text-4xl mb-4 text-slate-300"></i>
           <p class="text-lg">Please select a party and generate to view the ledger.</p>
        </div>
        <p-table *ngIf="reportType === 'ledger' && selectedPartyId && !loading()" [value]="data()" [scrollable]="true" scrollHeight="500px" styleClass="p-datatable-sm p-datatable-gridlines smart-table">
          <ng-template pTemplate="header">
            <tr>
              <th style="min-width: 120px" pFrozenColumn>Date</th>
              <th style="min-width: 150px" pFrozenColumn>Reference</th>
              <th style="min-width: 100px">Type</th>
              <th class="text-right" style="min-width: 130px">Debit</th>
              <th class="text-right" style="min-width: 130px">Credit</th>
              <th class="text-right" style="min-width: 160px">Running Balance</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-l>
            <tr class="smart-row">
              <td pFrozenColumn>{{ l.date | date:'yyyy-MM-dd' }}</td>
              <td class="font-mono font-bold text-indigo-600" pFrozenColumn>{{ l.reference }}</td>
              <td><p-tag [value]="l.type" [severity]="l.type === 'Sale' ? 'success' : (l.type === 'Purchase' ? 'danger' : 'info')"></p-tag></td>
              <td class="text-right text-red-600 font-bold">{{ l.debit > 0 ? (l.debit | number:'1.2-2') : '-' }}</td>
              <td class="text-right text-emerald-600 font-bold">{{ l.credit > 0 ? (l.credit | number:'1.2-2') : '-' }}</td>
              <td class="text-right font-black" [ngClass]="{'text-red-700': l.balance > 0, 'text-emerald-700': l.balance < 0, 'bg-slate-50': true}">
                 {{ (l.balance < 0 ? -l.balance : l.balance) | number:'1.2-2' }} <span class="text-[10px] ml-1">{{ l.balance > 0 ? 'Dr' : (l.balance < 0 ? 'Cr' : '') }}</span>
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="6" class="text-center p-8 empty-state">
                <i class="pi pi-box empty-icon"></i>
                <h3>No Ledger Entries</h3>
                <p>No transactions found for the selected party in this period.</p>
              </td>
            </tr>
          </ng-template>
        </p-table>

        <!-- ── User Performance Report ── -->
        <p-table *ngIf="reportType === 'user-performance' && !loading()" [value]="data()" [scrollable]="true" scrollHeight="500px" styleClass="p-datatable-sm p-datatable-gridlines smart-table">
          <ng-template pTemplate="header">
            <tr>
              <th style="min-width: 200px" pFrozenColumn>User Name</th>
              <th class="text-center" style="min-width: 150px">Total Invoices</th>
              <th class="text-right" style="min-width: 180px">Total Sales Amount</th>
              <th class="text-right" *ngIf="isAdmin()" style="min-width: 180px">Generated Profit</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-u>
            <tr class="smart-row">
              <td class="font-bold text-slate-700" pFrozenColumn><i class="pi pi-user mr-2 text-indigo-500"></i>{{ u.fullName }}</td>
              <td class="text-center font-bold">{{ u.totalSalesCount }}</td>
              <td class="text-right font-mono text-indigo-700 font-bold bg-indigo-50">{{ u.totalSalesAmount | number:'1.2-2' }}</td>
              <td class="text-right text-emerald-600 font-bold bg-emerald-50" *ngIf="isAdmin()">{{ u.totalProfitGenerated | number:'1.2-2' }}</td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td [attr.colspan]="isAdmin() ? 4 : 3" class="text-center p-8 empty-state">
                <i class="pi pi-box empty-icon"></i>
                <h3>No Data Found</h3>
              </td>
            </tr>
          </ng-template>
        </p-table>

        <!-- ── VAT/Tax Report ── -->
        <p-table *ngIf="reportType === 'vat' && !loading()" [value]="data()" [scrollable]="true" scrollHeight="500px" styleClass="p-datatable-sm p-datatable-gridlines smart-table">
          <ng-template pTemplate="header">
            <tr>
              <th style="min-width: 200px" pFrozenColumn>Tax Source</th>
              <th class="text-center" style="min-width: 120px">Tax Rate (%)</th>
              <th class="text-right" style="min-width: 180px">Taxable Amount</th>
              <th class="text-right text-red-700 font-bold" style="min-width: 180px">Tax Collected</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-v>
            <tr class="smart-row">
              <td class="font-bold" pFrozenColumn>{{ v.taxName }}</td>
              <td class="text-center"><p-tag [value]="v.taxRate + '%'" severity="warning"></p-tag></td>
              <td class="text-right text-slate-600">{{ v.totalTaxableAmount | number:'1.2-2' }}</td>
              <td class="text-right text-red-700 font-bold">{{ v.totalTaxCollected | number:'1.2-2' }}</td>
            </tr>
          </ng-template>
          <ng-template pTemplate="footer">
            <tr>
              <td colspan="2" class="text-right font-bold bg-slate-50">Total VAT Collected:</td>
              <td class="text-right font-bold bg-slate-50">{{ sum(data(), 'totalTaxableAmount') | number:'1.2-2' }}</td>
              <td class="text-right text-red-800 font-black text-lg bg-red-50">{{ sum(data(), 'totalTaxCollected') | number:'1.2-2' }}</td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="4" class="text-center p-8 empty-state">
                <i class="pi pi-box empty-icon"></i>
                <h3>No Data Found</h3>
              </td>
            </tr>
          </ng-template>
        </p-table>

         <!-- ── Purchase Report ── -->
         <p-table *ngIf="reportType === 'purchase-summary' && !loading()" [value]="data()" [scrollable]="true" scrollHeight="500px" styleClass="p-datatable-sm p-datatable-gridlines smart-table">
          <ng-template pTemplate="header">
            <tr>
              <th style="min-width: 120px" pFrozenColumn>Date</th>
              <th style="min-width: 150px" pFrozenColumn>GRN Code</th>
              <th style="min-width: 200px">Supplier</th>
              <th class="text-right" style="min-width: 120px">Grand Total</th>
              <th class="text-right" style="min-width: 120px">Paid</th>
              <th class="text-right" style="min-width: 120px">Due</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-p>
            <tr class="smart-row">
              <td pFrozenColumn>{{ p.date | date:'yyyy-MM-dd' }}</td>
              <td class="font-mono text-indigo-600 font-bold" pFrozenColumn>{{ p.grnCode }}</td>
              <td class="font-bold text-slate-700">{{ p.supplierName }}</td>
              <td class="text-right font-bold text-indigo-700">{{ p.grandTotal | number:'1.2-2' }}</td>
              <td class="text-right text-emerald-600">{{ p.paidAmount | number:'1.2-2' }}</td>
              <td class="text-right text-red-600 font-bold bg-red-50">{{ p.dueAmount | number:'1.2-2' }}</td>
            </tr>
          </ng-template>
          <ng-template pTemplate="footer">
            <tr>
              <td colspan="3" class="text-right font-bold bg-slate-50">Totals:</td>
              <td class="text-right font-bold text-indigo-800 bg-indigo-50">{{ sum(data(), 'grandTotal') | number:'1.2-2' }}</td>
              <td class="text-right font-bold text-emerald-800 bg-emerald-50">{{ sum(data(), 'paidAmount') | number:'1.2-2' }}</td>
              <td class="text-right font-bold text-red-800 bg-red-50">{{ sum(data(), 'dueAmount') | number:'1.2-2' }}</td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="6" class="text-center p-8 empty-state">
                <i class="pi pi-box empty-icon"></i>
                <h3>No Data Found</h3>
              </td>
            </tr>
          </ng-template>
        </p-table>

        <!-- ── Profit & Loss ── -->
        <div *ngIf="reportType === 'profit-loss' && data()" class="pl-container py-4 flex justify-center">
            <div class="pl-statement-card w-full max-w-2xl bg-white border rounded-xl overflow-hidden shadow-sm">
                <div class="pl-header bg-slate-800 text-white p-6 text-center">
                    <h2 class="text-xl font-black uppercase tracking-widest">Profit & Loss Statement</h2>
                    <p class="text-slate-400 text-sm mt-1">{{ startDate | date:'MMM dd, yyyy' }} - {{ endDate | date:'MMM dd, yyyy' }}</p>
                </div>
                <div class="pl-body p-8 flex flex-col gap-6">
                    <div class="pl-row flex justify-between items-center py-3 border-b border-slate-100">
                        <span class="text-slate-600 font-semibold">Total Revenue (Sales)</span>
                        <span class="text-2xl font-black text-slate-800">{{ data().totalSales | number:'1.2-2' }}</span>
                    </div>
                    <div class="pl-row flex justify-between items-center py-3 border-b border-slate-100">
                        <span class="text-slate-600 font-semibold">Cost of Goods Sold (COGS)</span>
                        <span class="text-2xl font-black text-red-600">({{ data().totalCostOfGoodsSold | number:'1.2-2' }})</span>
                    </div>
                    <div class="pl-row flex justify-between items-center py-6 mt-4 bg-teal-50 px-6 rounded-xl border border-teal-100">
                        <span class="text-teal-800 font-extrabold text-lg uppercase tracking-wider">Gross Profit</span>
                        <span class="text-4xl font-black text-teal-700">{{ data().grossProfit | number:'1.2-2' }}</span>
                    </div>
                    <div class="text-center mt-4">
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">Note: Expenses are not yet included in this calculation.</p>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .report-container { padding: 2rem 2.5rem; background: #ffffff; min-height: 100%; border-radius: 16px; box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.03); }
    .report-header { display: flex; flex-direction: column; gap: 1.5rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 1.5rem; margin-bottom: 2rem; }
    .header-main { display: flex; justify-content: space-between; align-items: flex-start; }
    .report-title { font-size: 1.875rem; font-weight: 800; color: #1e293b; margin: 0; letter-spacing: -0.03em; font-family: 'Inter', system-ui, sans-serif; }
    .report-subtitle { color: #64748b; font-size: 0.95rem; margin-top: 0.35rem; font-weight: 500; }
    .header-actions { display: flex; gap: 1rem; align-items: center; }
    
    .filter-bar { 
      display: flex; gap: 1.5rem; align-items: center; background: #f8fafc; padding: 1rem 1.75rem; border-radius: 12px; border: 1px solid #e2e8f0;
      width: fit-content; box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.01);
    }
    .filter-item { display: flex; flex-direction: column; gap: 0.5rem; }
    .filter-item label { font-size: 0.75rem; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.1rem;}
    
    .quick-filters { align-items: center; display: flex; gap: 0.5rem; margin-left: 0.5rem; border-left: 1px solid #e2e8f0; padding-left: 1.5rem;}
    .quick-btn { color: #64748b; font-weight: 600; font-size: 0.85rem; padding: 0.35rem 0.75rem; border-radius: 6px; transition: all 0.2s ease; border: 1px solid transparent; }
    .quick-btn:hover { background: #ffffff; color: #0f172a; border-color: #cbd5e1; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }

    ::ng-deep .p-calendar .p-inputtext, ::ng-deep .p-dropdown .p-dropdown-label { min-width: 140px; border-radius: 8px; font-family: 'Inter', sans-serif; font-size: 0.9rem;}
    ::ng-deep .p-calendar .p-inputtext { padding: 0.5rem 0.75rem; }
    ::ng-deep .p-datatable { border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; font-family: 'Inter', sans-serif;}
    
    /* Custom Scrollbar for the table wrapper */
    ::ng-deep .p-datatable-wrapper::-webkit-scrollbar { width: 8px; height: 8px; }
    ::ng-deep .p-datatable-wrapper::-webkit-scrollbar-track { background: #f8fafc; border-radius: 4px; }
    ::ng-deep .p-datatable-wrapper::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; border: 2px solid #f8fafc; }
    ::ng-deep .p-datatable-wrapper::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

    /* Smart Table Styles */
    ::ng-deep .smart-table .p-datatable-wrapper { max-height: 550px; }
    ::ng-deep .smart-table .p-datatable-thead > tr > th {
      position: sticky; top: 0; z-index: 10; background: #f1f5f9 !important; 
      box-shadow: inset 0 -2px 0 #cbd5e1;
      padding: 0.875rem 1rem; font-size: 0.8rem; text-transform: uppercase; font-weight: 700; color: #334155;
      letter-spacing: 0.02em; border: none; white-space: nowrap;
    }
    ::ng-deep .smart-table .p-datatable-tbody > tr > td {
        padding: 0.875rem 1rem; border-bottom: 1px solid #f1f5f9; color: #334155; font-size: 0.9rem;
    }
    ::ng-deep .smart-table .p-datatable-tfoot > tr > td {
        padding: 1rem; border-top: 2px solid #e2e8f0; font-size: 0.95rem;
    }
    ::ng-deep .smart-table .p-datatable-frozen-tbody > tr > td { background: #ffffff; }
    
    /* Ensure the frozen column in header has slightly more shadow so text doesn't overlap on scroll */
    ::ng-deep .smart-table .p-datatable-thead > tr > th.p-frozen-column { z-index: 11; }
    
    .smart-row { transition: background-color 0.15s ease; }
    .smart-row:hover { background-color: #f8fafc !important; }
    .smart-row:hover td { background-color: #f8fafc !important; }
    
    /* Alignment adjustments */
    ::ng-deep .p-tag { font-family: 'Inter', sans-serif; font-weight: 600; padding: 0.2rem 0.5rem; }
    
    .empty-state { display: flex; flex-direction: column; align-items: center; padding: 4rem 2rem; color: #64748b; background: #fafafa; border-radius: 8px;}
    .empty-icon { font-size: 3.5rem; color: #cbd5e1; margin-bottom: 1rem; }
    .empty-state h3 { font-size: 1.25rem; color: #334155; font-weight: 700; margin-bottom: 0.25rem; }
    .empty-state p { font-size: 0.95rem; }
    
    @media print {
      .filter-bar, .header-actions { display: none !important; }
      .app-sidebar, .app-header { display: none !important; }
      .report-container { padding: 0; border: none; }
      .report-content { box-shadow: none !important; margin-top: 2rem !important; }
    }
  `]
})
export class ReportViewerComponent implements OnInit {
  reportType: string = '';
  reportTitle = signal('');
  data = signal<any>([]);
  loading = signal(false);
  today = new Date();

  startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1); // 1st of current month
  endDate = new Date();

  expiryMonths: number = 6;
  parties: any[] = [];
  selectedPartyId: number | null = null;
  topSellingCount: number = 10;

  exportItems: MenuItem[] = [
    { label: 'Print (PDF)', icon: 'pi pi-print', command: () => this.printReport() },
    { label: 'Export to Excel/CSV', icon: 'pi pi-file-excel', command: () => this.exportExcel() }
  ];

  constructor(private route: ActivatedRoute, private reportService: ReportService, private partyService: PartyService) {}

  ngOnInit() {
    this.route.url.subscribe(url => {
      const path = url[url.length - 1].path;
      this.reportType = path;
      this.updateTitle();
      
      if (this.reportType === 'ledger') {
        this.partyService.getAll().subscribe(res => this.parties = res);
      }

      this.setQuickDate('month'); // Auto-load data for this month
    });
  }

  setQuickDate(range: 'today' | 'week' | 'month') {
    const today = new Date();
    this.endDate = new Date();
    
    if (range === 'today') {
      this.startDate = new Date();
    } else if (range === 'week') {
      const first = today.getDate() - today.getDay(); // First day is Sunday
      this.startDate = new Date(today.setDate(first));
    } else if (range === 'month') {
      this.startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    }
    this.loadData();
  }

  updateTitle() {
    switch (this.reportType) {
      case 'sales-summary': this.reportTitle.set('Sales Summary Report'); break;
      case 'stock-status': this.reportTitle.set('Medicine Stock Status'); break;
      case 'profit-loss': this.reportTitle.set('Profit & Loss Statement'); break;
      case 'purchase-summary': this.reportTitle.set('Purchase Summary Report'); break;
      case 'expiry': this.reportTitle.set('Medicine Expiry Report'); break;
      case 'top-selling': this.reportTitle.set('Top Selling Medicines'); break;
      case 'low-stock': this.reportTitle.set('Low Stock Alert'); break;
      case 'ledger': this.reportTitle.set('Party Ledger Report'); break;
      case 'user-performance': this.reportTitle.set('User Performance Analytics'); break;
      case 'vat': this.reportTitle.set('VAT/Tax Collection Report'); break;
    }
  }

  showDateFilter() {
    return !['stock-status', 'expiry', 'low-stock'].includes(this.reportType);
  }

  loadData() {
    this.loading.set(true);
    const start = this.startDate.toISOString().split('T')[0];
    const end = this.endDate.toISOString().split('T')[0];

    let obs;
    if (this.reportType === 'sales-summary') obs = this.reportService.getSalesSummary(start, end);
    else if (this.reportType === 'purchase-summary') obs = this.reportService.getPurchaseSummary(start, end);
    else if (this.reportType === 'stock-status') obs = this.reportService.getStockStatus();
    else if (this.reportType === 'profit-loss') obs = this.reportService.getProfitLoss(start, end);
    else if (this.reportType === 'expiry') obs = this.reportService.getExpiryReport(this.expiryMonths);
    else if (this.reportType === 'top-selling') obs = this.reportService.getTopSellingMedicines(start, end, this.topSellingCount);
    else if (this.reportType === 'low-stock') obs = this.reportService.getLowStockReport();
    else if (this.reportType === 'ledger' && this.selectedPartyId) obs = this.reportService.getLedgerReport(this.selectedPartyId, start, end);
    else if (this.reportType === 'user-performance') obs = this.reportService.getUserPerformanceReport(start, end);
    else if (this.reportType === 'vat') obs = this.reportService.getVatReport(start, end);

    obs?.subscribe({
      next: (res) => {
        this.data.set(res);
        this.loading.set(false);
      },
      error: () => {
         this.data.set([]); 
         this.loading.set(false);
      }
    });
  }

  sum(items: any[], prop: string): number {
    if (!items || !Array.isArray(items)) return 0;
    return items.reduce((acc, curr) => acc + (curr[prop] || 0), 0);
  }

  isAdmin() {
     const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
     return user.roles?.includes('Admin');
  }

  printReport() {
    window.print();
  }

  exportExcel() {
    // Basic CSV export for demonstration
    const rows = this.data();
    if (!rows || rows.length === 0) return;
    
    const headers = Object.keys(rows[0]).join(',');
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" +
      rows.map((row: any) => Object.values(row).join(',')).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${this.reportType}_${new Date().toISOString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
