import { Component, OnInit, signal, computed, HostListener, ViewChild, ViewChildren, QueryList, ElementRef, effect, untracked } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PurchaseService, PurchaseMaster, PurchaseDetail, PurchasePayment } from '../../services/purchase.service';
import { MedicineService, Medicine } from '../../services/medicine.service';
import { PartyService, Party } from '../../services/party.service';
import { UomService, Uom } from '../../services/uom.service';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { DatePickerModule } from 'primeng/datepicker';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { InputNumberModule } from 'primeng/inputnumber';
import { DialogModule } from 'primeng/dialog';
import { SelectButtonModule } from 'primeng/selectbutton';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { GrnPrintService } from '../../services/grn-print.service';
import { CategoryService, Category } from '../../services/category.service';
import { GenericService, Generic } from '../../services/generic.service';
import { DosageFormService, DosageForm } from '../../services/dosage-form.service';
import { ManufacturerService, Manufacturer } from '../../services/manufacturer.service';
import { TaxService, Tax } from '../../services/tax.service';

interface MedicineRow {
  medicineId: number;
  medicineName: string;
  batchNumber: string;
  expiryDate: Date | null;
  quantity: number;
  uomId: number | null;
  uomName: string;
  taxId: number | null;
  unitCost: number;
  salePrice: number;
  // Tracking defaults for UOM Change verification
  defaultUomId?: number | null;
  defaultUomName?: string;
  defaultPurchasePrice?: number;
  defaultSalePrice?: number;
  discountType: 'amount' | 'percent';
  discountValue: number;
  discountAmount: number;
  discountPercent: number;
  taxPercent: number;
  taxAmount: number;
  lineTotal: number;
  medicineSuggestions: Medicine[];
}

interface PaymentRow {
  method: string;
  amount: number;
  accountNumber: string;
  transactionId: string;
  remarks: string;
  showRef: boolean;
}

@Component({
  selector: 'app-purchase-form',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    ToastModule, DatePickerModule, AutoCompleteModule,
    InputNumberModule, DialogModule, SelectButtonModule,
    InputTextModule, TextareaModule, SelectModule
  ],
  providers: [MessageService],
  template: `
    <div class="page-wrap animate-fadein-up">
      <p-toast></p-toast>

      <!-- ═══ STICKY HEADER ═══ -->
      <div class="sticky-header">
        <div class="page-head pt-2 pb-1 px-4">
          <div style="margin-left:12px;">
            <h1 class="page-title">New Purchase (GRN)</h1>
            <p class="page-sub text-xs">Goods Received Note — stock & payment entry</p>
          </div>
          <div class="flex items-center gap-2">
            <button class="btn-secondary" (click)="goBack()">
              <i class="pi pi-arrow-left"></i> Back
            </button>
            <button class="btn-primary" (click)="savePurchase()" [disabled]="saving || rows().length === 0 || !selectedSupplier">
              <i class="pi" [class.pi-spin]="saving" [class.pi-spinner]="saving" [class.pi-save]="!saving"></i>
              {{ saving ? 'Saving...' : 'Save' }}
            </button>
            <button class="btn-save-print" (click)="savePurchase(true)" [disabled]="saving || rows().length === 0 || !selectedSupplier">
              <i class="pi" [class.pi-spin]="saving" [class.pi-spinner]="saving" [class.pi-print]="!saving"></i>
              {{ saving ? 'Saving...' : 'Save & Print' }}
            </button>
          </div>
        </div>
      </div>

      <div class="form-body px-4 pb-6">

        <!-- ═══ ROW 1: GRN + SUPPLIER + INVOICE ═══ -->
        <div class="top-cards-grid">

          <!-- GRN Card -->
          <div class="info-card">
            <div class="card-label"><i class="pi pi-file-text"></i> GRN INFORMATION</div>
            <div class="field-row">
              <span class="fl">GRN Code</span>
              <input class="fi readonly-fi" [value]="grnCode" readonly>
            </div>
            <div class="field-row">
              <span class="fl">Entry Date</span>
              <p-datepicker [(ngModel)]="entryDate" [showIcon]="true" appendTo="body"
                dateFormat="dd/mm/yy" styleClass="fi-cal"></p-datepicker>
            </div>
          </div>

          <!-- Supplier Card -->
          <div class="info-card">
            <div class="card-label"><i class="pi pi-building"></i> SUPPLIER</div>
            <div class="field-row">
              <span class="fl">Search</span>
              <div class="search-supplier-wrap">
                <p-autoComplete
                  [(ngModel)]="supplierQuery"
                  [suggestions]="supplierSuggestions"
                  (completeMethod)="searchSupplier($event)"
                  (onSelect)="onSupplierSelect($event)"
                  field="fullName"
                  placeholder="Name or mobile..."
                  [minLength]="1"
                  appendTo="body"
                  styleClass="w-full fi-auto">
                  <ng-template let-s pTemplate="item">
                    <div class="sup-item">
                      <span class="sup-name">{{ s.fullName }}</span>
                      <span class="sup-phone">{{ s.cell }}</span>
                    </div>
                  </ng-template>
                </p-autoComplete>
                <a class="quick-link" (click)="openQuickSupplier()">+ Add Quick</a>
              </div>
            </div>
            <div class="field-row" *ngIf="selectedSupplier">
              <span class="fl">Name</span>
              <span class="fv">{{ selectedSupplier.fullName }}</span>
            </div>
            <div class="field-row" *ngIf="selectedSupplier">
              <span class="fl">Mobile</span>
              <span class="fv">{{ selectedSupplier.cell || '-' }}</span>
            </div>
          </div>

          <!-- Invoice Card -->
          <div class="info-card">
            <div class="card-label"><i class="pi pi-receipt"></i> INVOICE DETAILS</div>
            <div class="field-row">
              <span class="fl">Invoice No</span>
              <input class="fi" [(ngModel)]="invoiceNumber" placeholder="Supplier invoice no.">
            </div>
            <div class="field-row">
              <span class="fl">Invoice Date</span>
              <p-datepicker [(ngModel)]="invoiceDate" [showIcon]="true" appendTo="body"
                dateFormat="dd/mm/yy" styleClass="fi-cal" [showClear]="true"></p-datepicker>
            </div>
          </div>

        </div>

        <!-- ═══ MEDICINE ROWS ═══ -->
        <div class="section-card">
          <div class="section-head">
            <div class="card-label"><i class="pi pi-box"></i> MEDICINE PURCHASE DETAILS</div>
          </div>

          <!-- Table -->
          <div class="med-table-wrap">
            <table class="med-table adaptive-table">
              <thead>
                <tr>
                  <th style="min-width:200px">Product</th>
                  <th style="min-width:130px">Batch</th>
                   <th style="min-width:120px">Expiry</th>
                  <th style="min-width:80px">Qty</th>
                  <th style="min-width:125px">Unit (UOM)</th>
                  <th style="min-width:110px">Unit Price</th>
                  <th style="min-width:120px">Discount</th>
                  <th style="min-width:120px">Tax %</th>
                  <th style="min-width:110px">Sale Price</th>
                  <th style="min-width:100px" class="text-right">Total</th>
                  <th style="width:40px"></th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let row of rows(); let i = index">
                  <!-- Product -->
                  <td data-label="Product">
                    <div class="med-search-cell">
                      <p-autoComplete
                        [(ngModel)]="row.medicineName"
                        [suggestions]="row.medicineSuggestions"
                        (completeMethod)="searchMedicine($event, row)"
                        (onSelect)="onMedicineSelect($event, row)"
                        placeholder="Search medicine..."
                        [minLength]="1"
                        #medAuto
                        appendTo="body"
                        styleClass="w-full med-auto">
                        <ng-template let-m pTemplate="item">
                          <div class="med-item">
                            <span class="med-n">{{ m.name }}</span>
                            <span class="med-g">{{ m.genericName }}</span>
                          </div>
                        </ng-template>
                      </p-autoComplete>
                      <a class="quick-link-sm" (click)="openQuickMedicine(row)">+ Quick</a>
                    </div>
                  </td>
                  <!-- Batch -->
                  <td data-label="Batch"><input class="cell-input" [(ngModel)]="row.batchNumber" 
                             (blur)="onBatchChange(row)" placeholder="Batch No"></td>
                  <!-- Expiry -->
                  <td data-label="Expiry">
                    <div class="expiry-cell">
                      <p-datepicker #expiryPicker [(ngModel)]="row.expiryDate" [showIcon]="false"
                        dateFormat="dd/mm/yy" appendTo="body"
                        placeholder="DD/MM/YY" styleClass="cell-cal"></p-datepicker>
                      <button *ngIf="i > 0" class="clone-btn" (click)="clonePreviousExpiry(i)" title="Clone from above">
                        <i class="pi pi-copy"></i>
                      </button>
                    </div>
                  </td>
                  <!-- Qty -->
                  <td data-label="Qty">
                    <p-inputNumber #qtyInput [(ngModel)]="row.quantity" [min]="1" [showButtons]="false"
                      (ngModelChange)="recalcRow(row)" (onFocus)="$event.target.select()"
                      styleClass="cell-num" inputStyleClass="cell-input-n"></p-inputNumber>
                  </td>
                   <!-- UOM -->
                  <td data-label="Unit (UOM)">
                    <div class="uom-cell">
                      <p-select class="cell-select-wrap" [(ngModel)]="row.uomId" (ngModelChange)="onUomChange(row)"
                        [options]="uoms" optionLabel="name" optionValue="uomId"
                        placeholder="Unit" [showClear]="true" appendTo="body" styleClass="w-full">
                      </p-select>
                      <a class="quick-link-sm" (click)="openQuickUom(row)">+</a>
                    </div>
                  </td>
                  <!-- Unit Price -->
                  <td data-label="Unit Price">
                    <p-inputNumber [(ngModel)]="row.unitCost" [minFractionDigits]="2" [showButtons]="false"
                      (ngModelChange)="recalcRow(row)"
                      styleClass="cell-num" inputStyleClass="cell-input-n">
                    </p-inputNumber>
                  </td>
                  <!-- Discount -->
                  <td data-label="Discount">
                    <div class="disc-cell">
                      <button class="disc-toggle" [class.active]="row.discountType==='percent'"
                        (click)="toggleDiscountType(row)" title="Toggle Tk/%">
                        {{ row.discountType === 'percent' ? '%' : 'Tk' }}
                      </button>
                      <p-inputNumber [(ngModel)]="row.discountValue" [minFractionDigits]="2" [showButtons]="false"
                        (ngModelChange)="recalcRow(row)"
                        styleClass="cell-num" inputStyleClass="cell-input-disc">
                      </p-inputNumber>
                    </div>
                  </td>
                  <!-- Tax -->
                  <td data-label="Tax %">
                    <div class="uom-cell">
                      <p-select class="cell-select-wrap" [(ngModel)]="row.taxId" (ngModelChange)="onTaxChange(row)"
                        [options]="taxes" optionLabel="name" optionValue="taxId"
                        placeholder="0%" [showClear]="true" appendTo="body" styleClass="w-full">
                      </p-select>
                      <a class="quick-link-sm" (click)="openQuickTax(row)">+</a>
                    </div>
                  </td>
                  <!-- Sale Price -->
                  <td data-label="Sale Price">
                    <p-inputNumber [(ngModel)]="row.salePrice" [minFractionDigits]="2" [showButtons]="false"
                      (onKeyDown)="$event.keyCode === 13 && handleSalePriceEnter(i)"
                      styleClass="cell-num" inputStyleClass="cell-input-n">
                    </p-inputNumber>
                  </td>
                  <!-- Total -->
                  <td data-label="Total" class="text-right total-cell">
                    <span>{{ row.lineTotal | number:'1.2-2' }}</span>
                  </td>
                  <!-- Remove -->
                  <td>
                    <button class="remove-btn" (click)="removeRow(i)" title="Remove">
                      <i class="pi pi-times"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <button class="add-row-btn" (click)="addRow()">
            <i class="pi pi-plus-circle"></i> Add Another Medicine
          </button>
        </div>

        <!-- ═══ SUMMARY + PAYMENT ═══ -->
        <div class="bottom-grid">

          <!-- Summary -->
          <div class="section-card summary-card">
            <div class="card-label"><i class="pi pi-chart-bar"></i> PURCHASE SUMMARY</div>
            <div class="summary-row-item">
              <span>Subtotal</span><span>{{ subTotal() | number:'1.2-2' }} Tk</span>
            </div>
            <div class="summary-row-item">
              <span>Line Discounts</span><span class="text-orange">- {{ totalDiscount() | number:'1.2-2' }} Tk</span>
            </div>
            <div class="summary-row-item">
              <span>Total Tax</span><span class="text-blue">+ {{ totalTax() | number:'1.2-2' }} Tk</span>
            </div>
            <div class="summary-row-item adj-row">
              <span>Adjustment (-)</span>
              <div class="adj-input">
                <div class="adj-f">
                  <p-inputNumber [ngModel]="adjustment()" (ngModelChange)="adjustment.set($event || 0)" [minFractionDigits]="2" [showButtons]="false"
                    placeholder="0.00" styleClass="adj-num" inputStyleClass="adj-input-el">
                  </p-inputNumber>
                </div>
              </div>
            </div>
            <div class="summary-divider"></div>
            <div class="summary-row-item grand">
              <span>Total Payable</span>
              <span class="grand-value">{{ grandTotal() | number:'1.2-2' }} Tk</span>
            </div>
          </div>

          <!-- Payment -->
          <div class="section-card payment-card">
            <div class="card-label"><i class="pi pi-credit-card"></i> PAYMENT</div>

            <div *ngFor="let pm of payments(); let pi = index" class="payment-row-wrap">
              <div class="payment-method-btns">
                <button *ngFor="let m of paymentMethods"
                  class="method-btn" [class.active]="pm.method === m.value"
                  (click)="setMethod(pm, m.value)">
                  <i class="pi {{ m.icon }}"></i> {{ m.label }}
                </button>
                <button *ngIf="payments().length > 1" class="remove-pm-btn" (click)="removePayment(pi)">
                  <i class="pi pi-times"></i>
                </button>
              </div>
              <div class="payment-fields">
                <div class="pf">
                  <label>Amount (Tk)</label>
                  <p-inputNumber [(ngModel)]="pm.amount" [minFractionDigits]="2" [showButtons]="false"
                    (ngModelChange)="onPaymentChange()"
                    placeholder="0.00" styleClass="pf-num" inputStyleClass="pf-input">
                  </p-inputNumber>
                </div>
                <ng-container *ngIf="pm.showRef">
                  <div class="pf">
                    <label>Account No.</label>
                    <input class="pf-text" [(ngModel)]="pm.accountNumber" placeholder="Account number">
                  </div>
                  <div class="pf">
                    <label>Transaction ID</label>
                    <input class="pf-text" [(ngModel)]="pm.transactionId" placeholder="Txn reference">
                  </div>
                  <div class="pf full">
                    <label>Remarks</label>
                    <input class="pf-text" [(ngModel)]="pm.remarks" placeholder="Optional note">
                  </div>
                </ng-container>
              </div>
            </div>

            <button class="add-pm-btn" (click)="addPayment()">
              <i class="pi pi-plus"></i> Add Another Payment Method
            </button>

            <div class="py-divider"></div>
            <div class="py-calc">
              <div class="py-row"><span>Total Payable</span><span>{{ grandTotal() | number:'1.2-2' }} Tk</span></div>
              <div class="py-row"><span>Total Paid</span><span class="text-green">{{ totalPaid() | number:'1.2-2' }} Tk</span></div>
              <div class="py-row due" [class.has-due]="dueAmount() > 0">
                <span>Due</span><span>{{ dueAmount() | number:'1.2-2' }} Tk</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      <!-- Quick Add Supplier -->
      <p-dialog [(visible)]="showQuickSupplier" header="Quick Add Supplier" [modal]="true"
        [style]="{width:'400px'}" [closable]="true" appendTo="body" styleClass="quick-dialog">
        <div class="quick-form p-4">
          <div class="qf"><label>Full Name *</label><input class="fi" [(ngModel)]="quickSupplier.name" placeholder="Supplier name"></div>
          <div class="qf"><label>Mobile</label><input class="fi" [(ngModel)]="quickSupplier.phone" placeholder="01XXXXXXXXX"></div>
          <div class="qf"><label>Address</label><input class="fi" [(ngModel)]="quickSupplier.address" placeholder="Address"></div>
        </div>
        <ng-template pTemplate="footer">
          <button class="btn-cancel" (click)="showQuickSupplier=false">Cancel</button>
          <button class="btn-save" (click)="saveQuickSupplier()" [disabled]="!quickSupplier.name || quickSaving">
            <i class="pi" [class.pi-spin]="quickSaving" [class.pi-spinner]="quickSaving" [class.pi-check]="!quickSaving"></i>
            Save
          </button>
        </ng-template>
      </p-dialog>
 
      <!-- Quick Add Medicine -->
      <p-dialog [(visible)]="showQuickMedicine" header="Quick Add Medicine" [modal]="true"
        [style]="{width:'550px'}" [closable]="true" appendTo="body" styleClass="quick-dialog">
        <div class="quick-form p-4">
          <div class="grid grid-cols-2 gap-4">
            <div class="qf col-span-2">
              <label>Medicine Name *</label>
              <input class="fi" [(ngModel)]="quickMedicine.name" placeholder="Brand Name">
            </div>
            <div class="qf">
              <div class="flex justify-between items-center mb-1">
                <label class="m-0">Generic Name *</label>
                <a class="quick-link-sm" (click)="openQuickGeneric()">+ Quick</a>
              </div>
              <p-select [options]="generics" [(ngModel)]="quickMedicine.genericName" 
                optionLabel="name" optionValue="name" [filter]="true" filterBy="name"
                placeholder="Select Generic" styleClass="w-full qf-select" appendTo="body">
              </p-select>
            </div>
            <div class="qf">
              <label>Category</label>
              <p-select [options]="categories" [(ngModel)]="quickMedicine.category" 
                optionLabel="name" optionValue="name"
                placeholder="Select Category" styleClass="w-full qf-select" appendTo="body">
              </p-select>
            </div>
            <div class="qf">
              <label>UOM</label>
              <p-select [options]="uoms" [(ngModel)]="quickMedicine.uom" 
                optionLabel="name" optionValue="name"
                placeholder="Select UOM" styleClass="w-full qf-select" appendTo="body">
              </p-select>
            </div>
            <div class="qf">
              <label>Manufacturer</label>
              <p-select [options]="manufacturers" [(ngModel)]="quickMedicine.manufacturer" 
                optionLabel="name" optionValue="name" [filter]="true" filterBy="name"
                placeholder="Select Manufacturer" styleClass="w-full qf-select" appendTo="body">
              </p-select>
            </div>
          </div>
        </div>
        <ng-template pTemplate="footer">
          <button class="btn-cancel" (click)="showQuickMedicine=false">Cancel</button>
          <button class="btn-save" (click)="saveQuickMedicine()" [disabled]="!quickMedicine.name || !quickMedicine.genericName || quickSaving">
            <i class="pi" [class.pi-spin]="quickSaving" [class.pi-spinner]="quickSaving" [class.pi-check]="!quickSaving"></i>
            Save
          </button>
        </ng-template>
      </p-dialog>
 
      <!-- Quick Add UOM -->
      <p-dialog [(visible)]="showQuickUom" header="Quick Add UOM" [modal]="true"
        [style]="{width:'400px'}" [closable]="true" appendTo="body" styleClass="quick-dialog">
        <div class="quick-form p-4">
          <div class="qf">
            <label>UOM Name *</label>
            <input class="fi" [(ngModel)]="quickUom.name" placeholder="e.g. Box, Strip, Pcs">
          </div>
          <div class="qf">
            <label>Description</label>
            <input class="fi" [(ngModel)]="quickUom.description" placeholder="Optional">
          </div>
        </div>
        <ng-template pTemplate="footer">
          <button class="btn-cancel" (click)="showQuickUom=false">Cancel</button>
          <button class="btn-save" (click)="saveQuickUom()" [disabled]="!quickUom.name || quickSaving">
            <i class="pi" [class.pi-spin]="quickSaving" [class.pi-spinner]="quickSaving" [class.pi-check]="!quickSaving"></i>
            Save
          </button>
        </ng-template>
      </p-dialog>
 
      <!-- Quick Add Generic -->
      <p-dialog [(visible)]="showQuickGeneric" header="Quick Add Generic" [modal]="true"
        [style]="{width:'400px'}" [closable]="true" appendTo="body" styleClass="quick-dialog">
        <div class="quick-form p-4">
          <div class="qf">
            <label>Generic Name *</label>
            <input class="fi" [(ngModel)]="quickGeneric.name" placeholder="e.g. Paracetamol">
          </div>
          <div class="qf">
            <label>Indication</label>
            <input class="fi" [(ngModel)]="quickGeneric.indication" placeholder="Optional">
          </div>
        </div>
        <ng-template pTemplate="footer">
          <button class="btn-cancel" (click)="showQuickGeneric=false">Cancel</button>
          <button class="btn-save" (click)="saveQuickGeneric()" [disabled]="!quickGeneric.name || quickSaving">
            <i class="pi" [class.pi-spin]="quickSaving" [class.pi-spinner]="quickSaving" [class.pi-check]="!quickSaving"></i>
            Save
          </button>
        </ng-template>
      </p-dialog>
 
      <!-- Quick Add Tax -->
      <p-dialog [(visible)]="showQuickTax" header="Quick Add Tax" [modal]="true"
        [style]="{width:'400px'}" [closable]="true" appendTo="body" styleClass="quick-dialog">
        <div class="quick-form p-4">
          <div class="qf">
            <label>Tax Name *</label>
            <input class="fi" [(ngModel)]="quickTax.name" placeholder="e.g. VAT 5%, Service Tax">
          </div>
          <div class="qf">
            <label>Tax Rate (%) *</label>
            <p-inputNumber [(ngModel)]="quickTax.taxRate" [min]="0" [max]="100" 
              [minFractionDigits]="2" [maxFractionDigits]="2"
              suffix="%" styleClass="w-full" inputStyleClass="fi">
            </p-inputNumber>
          </div>
        </div>
        <ng-template pTemplate="footer">
          <button class="btn-cancel" (click)="showQuickTax=false">Cancel</button>
          <button class="btn-save" (click)="saveQuickTax()" [disabled]="!quickTax.name || quickSaving">
            <i class="pi" [class.pi-spin]="quickSaving" [class.pi-spinner]="quickSaving" [class.pi-check]="!quickSaving"></i>
            Save
          </button>
        </ng-template>
      </p-dialog>

    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }
    .page-wrap { display: flex; flex-direction: column; gap: 12px; width: 100%; }

    /* ── Sticky Header ── */
    .sticky-header { position: sticky; top: 0; z-index: 1000; background: #fff; border-bottom: 2px solid #e2e8f0; }
    .page-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .page-title { font-size: 1.15rem; font-weight: 800; color: #1e293b; margin: 0; }
    .page-sub { font-size: .8rem; color: #334155; font-weight: 500; margin: 0; }

    .btn-primary {
      display: flex; align-items: center; gap: 8px;
      background: #0d9488; color: #fff; border: none; border-radius: 10px;
      padding: 9px 18px; font-size: .875rem; font-weight: 600;
      cursor: pointer; font-family: 'Inter', sans-serif; white-space: nowrap; transition: background .15s;
    }
    .btn-primary:hover:not(:disabled) { background: #0f766e; }
    .btn-primary:disabled { opacity: .6; cursor: not-allowed; }
    .btn-secondary {
      display: flex; align-items: center; gap: 6px;
      background: #f1f5f9; color: #334155; border: 1px solid #e2e8f0; border-radius: 10px;
      padding: 9px 16px; font-size: .875rem; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif;
    }

    .form-body { display: flex; flex-direction: column; gap: 16px; }

    /* ── Top Cards Grid ── */
    .top-cards-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
    @media (max-width: 900px) { .top-cards-grid { grid-template-columns: 1fr; } }

    .info-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; }
    .card-label { font-size: .65rem; font-weight: 800; color: #475569; letter-spacing: .1em; display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
    .field-row { display: flex; align-items: center; gap: 8px; }
    .fl { font-size: .75rem; color: #1e293b; font-weight: 700; white-space: nowrap; width: 80px; flex-shrink: 0; }
    .fv { font-size: .8rem; color: #0f172a; font-weight: 600; }

    .fi { flex: 1; height: 34px; padding: 6px 10px; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: .8rem; font-family: 'Inter', sans-serif; outline: none; transition: border-color .15s; background: #fff; }
    .fi:focus { border-color: #0d9488; }
    .readonly-fi { background: #f8fafc; color: #64748b; cursor: not-allowed; }
    ::ng-deep .fi-cal { flex: 1; }
    ::ng-deep .fi-cal .p-datepicker-input { height: 34px; padding: 6px 10px; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: .8rem; width: 100%; }
    ::ng-deep .fi-auto { flex: 1; }
    ::ng-deep .fi-auto .p-autocomplete-input { height: 34px; padding: 6px 10px; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: .8rem; width: 100%; }

    .search-supplier-wrap { flex: 1; display: flex; flex-direction: column; gap: 4px; }
    .quick-link { font-size: .65rem; color: #0d9488; font-weight: 600; cursor: pointer; align-self: flex-start; transition: color .15s; }
    .quick-link:hover { text-decoration: underline; color: #0f766e; }
    .sup-item { display: flex; flex-direction: column; }
    .sup-name { font-weight: 600; font-size: .8rem; color: #0f172a; }
    .sup-phone { font-size: .7rem; color: #64748b; }

    /* ── Section Cards ── */
    .section-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px 16px; }
    .section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }

    /* ── Medicine Table ── */
    .med-table-wrap { overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 10px; }
    .med-table { width: 100%; border-collapse: collapse; font-size: .78rem; }
    .med-table th { background: #f1f5f9; color: #0d9488; font-weight: 800; padding: 10px 10px; text-align: left; font-size: .7rem; text-transform: uppercase; letter-spacing: .7px; border-bottom: 2.5px solid #0d9488; white-space: nowrap; }
    .med-table td { padding: 6px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    .med-table tr:last-child td { border-bottom: none; }
    .med-table tr:hover td { background: #f8fafc; }

    .cell-input { width: 100%; height: 30px; padding: 4px 8px; border: 1.5px solid #e2e8f0; border-radius: 6px; font-size: .78rem; font-family: 'Inter', sans-serif; outline: none; }
    .cell-input:focus { border-color: #0d9488; }
    ::ng-deep .cell-num { width: 100%; }
    ::ng-deep .cell-input-n { height: 30px !important; padding: 4px 8px !important; border: 1.5px solid #e2e8f0 !important; border-radius: 6px !important; font-size: .78rem !important; width: 100% !important; }

    /* ── Adaptive Table (Mobile) ── */
    @media (max-width: 768px) {
      .page-head { flex-direction: column; align-items: flex-start; gap: 10px; }
      .top-cards-grid { grid-template-columns: 1fr !important; }
      .bottom-grid { grid-template-columns: 1fr !important; }
      
      .adaptive-table thead { display: none; }
      .adaptive-table tbody tr {
        display: block; border: 1.5px solid #e2e8f0; border-radius: 12px;
        margin-bottom: 1rem; padding: 8px; background: #fff;
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
      }
      .adaptive-table tbody td {
        display: flex; justify-content: space-between; align-items: center;
        border-bottom: 1px dashed #f1f5f9 !important; padding: 10px 8px !important;
        text-align: right; width: 100% !important;
      }
      .adaptive-table tbody td:last-child { border-bottom: none !important; }
      .adaptive-table tbody td:before {
        content: attr(data-label); font-weight: 800; color: #475569;
        text-transform: uppercase; font-size: 0.65rem; flex-shrink: 0;
        margin-right: 1rem; text-align: left;
      }
      .cell-input, ::ng-deep .cell-input-n, ::ng-deep .cell-select-wrap { max-width: 200px; }
      .total-cell { font-weight: 800; color: #0d9488; }
    }
    ::ng-deep .cell-cal { width: 100%; }
    ::ng-deep .cell-cal .p-datepicker-input { height: 30px; padding: 4px 8px; border: 1.5px solid #e2e8f0; border-radius: 6px; font-size: .78rem; width: 100%; }
    ::ng-deep .med-auto { width: 100%; }
    ::ng-deep .med-auto .p-autocomplete-input { height: 30px; padding: 4px 8px; border: 1.5px solid #e2e8f0; border-radius: 6px; font-size: .78rem; width: 100%; }
    .med-search-cell { display: flex; flex-direction: column; gap: 2px; }
    .quick-link-sm { font-size: .6rem; color: #0d9488; cursor: pointer; white-space: nowrap; }
    .med-item { display: flex; flex-direction: column; }
    .med-n { font-weight: 600; font-size: .78rem; }
    .med-g { font-size: .68rem; color: #64748b; }

    .disc-cell { display: flex; align-items: center; gap: 4px; }
    .disc-toggle { width: 28px; height: 28px; border: 1.5px solid #0d9488; border-radius: 6px; background: #fff; color: #0d9488; font-size: .7rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all .15s; }
    .disc-toggle.active { background: #0d9488; color: #fff; }
    ::ng-deep .cell-input-disc { height: 30px !important; padding: 4px 6px !important; border: 1.5px solid #e2e8f0 !important; border-radius: 6px !important; font-size: .78rem !important; width: 80px !important; }

    .uom-cell { display: flex; align-items: center; gap: 4px; }
    .cell-select-wrap { flex: 1; min-width: 0; }
    
    /* ── p-select Customization for Tables ── */
    ::ng-deep .cell-select-wrap .p-select {
      height: 30px; border: 1.5px solid #e2e8f0; border-radius: 6px; background: #fff;
      display: flex; align-items: center; transition: border-color .15s; width: 100%;
    }
    ::ng-deep .cell-select-wrap .p-select:not(.p-disabled).p-focus { border-color: #0d9488; }
    ::ng-deep .cell-select-wrap .p-select .p-select-label {
      padding: 0 8px; font-size: .78rem; font-family: 'Inter', sans-serif;
      height: 100%; display: flex; align-items: center; color: #0f172a; font-weight: 500;
    }
    ::ng-deep .cell-select-wrap .p-select .p-select-dropdown { width: 24px; }
    ::ng-deep .cell-select-wrap .p-select .p-select-clear-icon { right: 28px; font-size: .7rem; }
    ::ng-deep .cell-select-wrap .p-select .p-select-dropdown-icon { font-size: .7rem; }

    .total-cell { font-weight: 700; color: #0f172a; font-size: .82rem; padding-right: 12px !important; white-space: nowrap; }
    .remove-btn { width: 26px; height: 26px; border: none; background: #fff1f2; color: #f43f5e; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: .7rem; transition: all .15s; }
    .remove-btn:hover { background: #fecdd3; }

    .add-row-btn { margin-top: 12px; display: flex; align-items: center; gap: 8px; background: #f0fdf4; color: #16a34a; border: 1.5px dashed #86efac; border-radius: 10px; padding: 9px 18px; font-size: .82rem; font-weight: 600; cursor: pointer; transition: all .15s; width: 100%; justify-content: center; font-family: 'Inter', sans-serif; }
    .add-row-btn:hover { background: #dcfce7; border-color: #4ade80; }

    .btn-save-print { display: flex; align-items: center; gap: 8px; background: #0d9488; color: #fff; border: none; border-radius: 10px; padding: 10px 20px; font-size: .88rem; font-weight: 700; cursor: pointer; transition: all .15s; font-family: 'Inter', sans-serif; box-shadow: 0 4px 12px rgba(13, 148, 136, 0.25); }
    .btn-save-print:hover { background: #0f766e; transform: translateY(-1px); box-shadow: 0 6px 15px rgba(13, 148, 136, 0.3); }
    .btn-save-print:active { transform: translateY(0); }
    .btn-save-print:disabled { opacity: .6; cursor: not-allowed; transform: none; }

    /* ── Bottom Grid ── */
    .bottom-grid { display: grid; grid-template-columns: 1fr 1.4fr; gap: 14px; }
    @media (max-width: 900px) { .bottom-grid { grid-template-columns: 1fr; } }

    /* ── Summary ── */
    .summary-card { display: flex; flex-direction: column; gap: 8px; }
    .summary-row-item { display: flex; justify-content: space-between; align-items: center; font-size: .82rem; padding: 4px 0; border-bottom: 1px solid #f8fafc; }
    .summary-divider { border-top: 2px solid #e2e8f0; margin: 4px 0; }
    .summary-row-item.grand { font-size: .95rem; font-weight: 700; color: #0f172a; border-bottom: none; }
    .grand-value { font-size: 1.1rem; color: #0d9488; }
    .text-orange { color: #ea580c; }
    .text-blue { color: #3b82f6; }
    .text-green { color: #16a34a; }
    .adj-row { flex-direction: column; align-items: flex-start; gap: 4px; border-bottom: none !important; }
    .adj-input { display: flex; align-items: center; gap: 10px; width: 100%; }
    .adj-f { display: flex; align-items: center; gap: 4px; }
    .adj-hint { font-size: .65rem; color: #94a3b8; font-weight: 500; }
    ::ng-deep .adj-num { width: 120px; }
    ::ng-deep .adj-input-el { height: 30px !important; padding: 4px 8px !important; border: 1.5px solid #e2e8f0 !important; border-radius: 6px !important; font-size: .78rem !important; }

    /* ── Payment ── */
    .payment-card { display: flex; flex-direction: column; gap: 10px; }
    .payment-row-wrap { border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px 12px; display: flex; flex-direction: column; gap: 8px; background: #f8fafc; }
    .payment-method-btns { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
    .method-btn { display: flex; align-items: center; gap: 6px; padding: 6px 12px; border: 1.5px solid #e2e8f0; border-radius: 8px; background: #fff; color: #64748b; font-size: .75rem; font-weight: 600; cursor: pointer; transition: all .15s; font-family: 'Inter', sans-serif; }
    .method-btn.active { background: #0d9488; border-color: #0d9488; color: #fff; }
    .method-btn:hover:not(.active) { border-color: #0d9488; color: #0d9488; }
    .remove-pm-btn { margin-left: auto; width: 28px; height: 28px; background: #fff1f2; border: none; border-radius: 6px; color: #f43f5e; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: .75rem; }

    .payment-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .pf { display: flex; flex-direction: column; gap: 3px; }
    .pf.full { grid-column: 1 / -1; }
    .pf label { font-size: .68rem; color: #64748b; font-weight: 600; }
    .pf-text { height: 32px; padding: 5px 10px; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: .78rem; font-family: 'Inter', sans-serif; outline: none; }
    .pf-text:focus { border-color: #0d9488; }
    ::ng-deep .pf-num { width: 100%; }
    ::ng-deep .pf-input { height: 32px !important; padding: 5px 10px !important; border: 1.5px solid #e2e8f0 !important; border-radius: 8px !important; font-size: .78rem !important; width: 100% !important; }

    .add-pm-btn { display: flex; align-items: center; gap: 6px; background: #f8fafc; color: #0d9488; border: 1.5px dashed #94a3b8; border-radius: 10px; padding: 7px 14px; font-size: .78rem; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; align-self: flex-start; transition: all .15s; }
    .add-pm-btn:hover { border-color: #0d9488; background: #ccfbf1; }
    .py-divider { border-top: 2px solid #e2e8f0; }
    .py-calc { display: flex; flex-direction: column; gap: 6px; }
    .py-row { display: flex; justify-content: space-between; font-size: .82rem; font-weight: 600; color: #334155; }
    .py-row.due { font-size: .95rem; font-weight: 700; color: #94a3b8; }
    .py-row.due.has-due { color: #dc2626; }

    /* ── Quick dialog ── */
    ::ng-deep .quick-dialog .p-dialog-header { padding: 10px 16px; border-bottom: 1px solid #f1f5f9; }
    ::ng-deep .quick-dialog .p-dialog-content { padding: 0 !important; }
    ::ng-deep .quick-dialog .p-dialog-footer { padding: 10px 16px; border-top: 1px solid #f1f5f9; display: flex; justify-content: flex-end; gap: 8px; }
    .quick-form { display: flex; flex-direction: column; gap: 10px; }
    .qf { display: flex; flex-direction: column; gap: 4px; }
    .qf label { font-size: .72rem; font-weight: 600; color: #475569; }
    .btn-cancel { display: flex; align-items: center; gap: 6px; padding: 7px 14px; background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; border-radius: 8px; font-weight: 600; font-size: .78rem; cursor: pointer; }
    .btn-save { display: flex; align-items: center; gap: 6px; padding: 7px 16px; background: #0d9488; color: #fff; border: none; border-radius: 8px; font-weight: 700; font-size: .78rem; cursor: pointer; }
    .btn-save:disabled { opacity: .6; cursor: not-allowed; }
    
    ::ng-deep .qf-select.p-select { 
      height: 34px; border: 1.5px solid #e2e8f0; border-radius: 8px; 
      font-size: .8rem; font-family: 'Inter', sans-serif;
    }
    ::ng-deep .qf-select .p-select-label { padding: 4px 10px; display: flex; align-items: center; height: 100%; }
    
    .text-right { text-align: right; }
    .grid { display: grid; }
    .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .gap-4 { gap: 1rem; }
    .col-span-2 { grid-column: span 2 / span 2; }
    .flex { display: flex; }
    .justify-between { justify-content: space-between; }
    .items-center { align-items: center; }
    .mb-1 { margin-bottom: 0.25rem; }
    .m-0 { margin: 0; }
    
    .expiry-cell { display: flex; align-items: center; gap: 4px; }
    .clone-btn { width: 24px; height: 30px; border: 1px solid #e2e8f0; background: #f8fafc; color: #64748b; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: .7rem; transition: all .15s; }
    .clone-btn:hover { background: #f1f5f9; color: #0d9488; border-color: #0d9488; }
  `]
})
export class PurchaseFormComponent implements OnInit {
  @ViewChild('supplierAuto') supplierAuto!: any;
  @ViewChildren('qtyInput') qtyInputs!: QueryList<any>;
  @ViewChildren('expiryPicker') expiryPickers!: QueryList<any>;
  @ViewChildren('medAuto') medAutos!: QueryList<any>;

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.altKey && event.key.toLowerCase() === 's') {
      event.preventDefault();
      this.savePurchase();
    }
    if (event.altKey && event.key.toLowerCase() === 'p') {
      event.preventDefault();
      this.savePurchase(true);
    }
  }

  // GRN metadata
  grnCode = '';
  entryDate = new Date();
  invoiceNumber = '';
  invoiceDate: Date | null = null;

  // Supplier
  supplierQuery = '';
  supplierSuggestions: Party[] = [];
  selectedSupplier: Party | null = null;
  allSuppliers: Party[] = [];

  // UOM list
  uoms: Uom[] = [];

  // Medicine rows
  rows = signal<MedicineRow[]>([]);

  // Adjustment
  adjustment = signal<number>(0);

  // Payments
  paymentMethods = [
    { label: 'Cash', value: 'Cash', icon: 'pi-money-bill' },
    { label: 'Mobile', value: 'MobileBanking', icon: 'pi-mobile' },
    { label: 'Bank', value: 'Bank', icon: 'pi-building-columns' },
    { label: 'Card', value: 'Card', icon: 'pi-credit-card' }
  ];
  payments = signal<PaymentRow[]>([{ method: 'Cash', amount: 0, accountNumber: '', transactionId: '', remarks: '', showRef: false }]);

  // Quick Add
  showQuickSupplier = false;
  quickSupplier = { name: '', phone: '', address: '' };
  
  showQuickMedicine = false;
  quickMedicine: any = { name: '', genericName: '', category: '', uom: '', purchasePrice: 0, salePrice: 0 };
  activeRowForMed: MedicineRow | null = null;

  showQuickUom = false;
  quickUom = { name: '', description: '' };
  activeRowForUom: MedicineRow | null = null;
  
  showQuickGeneric = false;
  quickGeneric = { name: '', description: '', indication: '' };

  showQuickTax = false;
  quickTax = { name: '', taxRate: 0, remarks: '' };
  activeRowForTax: MedicineRow | null = null;

  // Master Data lists
  categories: Category[] = [];
  generics: Generic[] = [];
  dosageForms: DosageForm[] = [];
  manufacturers: Manufacturer[] = [];
  taxes: Tax[] = [];

  quickSaving = false;
  saving = false;

  constructor(
    private purchaseService: PurchaseService,
    private medicineService: MedicineService,
    private partyService: PartyService,
    private uomService: UomService,
    private categoryService: CategoryService,
    private genericService: GenericService,
    private dosageFormService: DosageFormService,
    private manufacturerService: ManufacturerService,
    private taxService: TaxService,
    private grnPrintService: GrnPrintService,
    private messageService: MessageService,
    private router: Router,
    private datePipe: DatePipe
  ) {
    // Auto-sync grandTotal to payment amount if only one payment exists
    effect(() => {
      const total = this.grandTotal(); // Watch only grandTotal
      
      untracked(() => {
        const currentPayments = this.payments();
        if (currentPayments.length === 1) {
          if (currentPayments[0].amount !== total) {
            currentPayments[0].amount = total;
            this.payments.set([...currentPayments]);
          }
        }
      });
    });
  }

  ngOnInit() {
    this.loadGrnCode();
    this.loadSuppliers();
    this.loadUoms();
    this.loadMasterData();
    this.addRow(); // start with one empty row
    
    // Autofocus Supplier on load
    setTimeout(() => {
      this.supplierAuto?.focusInput();
    }, 600);
  }

  loadMasterData() {
    this.categoryService.getAll().subscribe(d => this.categories = d.filter(x => x.isActive));
    this.genericService.getAll().subscribe(d => this.generics = d.filter(x => x.isActive));
    this.dosageFormService.getAll().subscribe(d => this.dosageForms = d.filter(x => x.isActive));
    this.manufacturerService.getAll().subscribe(d => this.manufacturers = d.filter(x => x.isActive));
    this.taxService.getAll().subscribe(d => this.taxes = d.filter(x => x.isActive));
  }

  loadGrnCode() {
    this.purchaseService.getNextGrnCode().subscribe(r => {
      this.grnCode = r.grnCode;
      // Extract number from GRN-00001 -> 1
      const numMatch = r.grnCode.match(/\d+/);
      const numPart = numMatch ? parseInt(numMatch[0], 10) : '';
      const today = this.datePipe.transform(new Date(), 'ddMMyyyy');
      
      // Set default invoice number if empty
      if (!this.invoiceNumber) {
        this.invoiceNumber = `G${numPart}-${today}`;
      }
    });
  }

  loadSuppliers() {
    this.partyService.getAll().subscribe(parties => {
      this.allSuppliers = parties.filter(p => p.partyType === 'Supplier' && p.isActive);
    });
  }

  loadUoms() {
    this.uomService.getAll().subscribe(u => this.uoms = u);
  }

  // ── Supplier ──
  searchSupplier(event: any) {
    const q = event.query.toLowerCase();
    this.supplierSuggestions = this.allSuppliers.filter(s =>
      s.fullName.toLowerCase().includes(q) || (s.cell || '').includes(q)
    );
  }

  onSupplierSelect(event: any) {
    this.selectedSupplier = event.value ?? event;
  }

  // ── Medicine Search ──
  searchMedicine(event: any, row: MedicineRow) {
    this.medicineService.getMedicines({ searchText: event.query, pageNumber: 1, pageSize: 20 })
      .subscribe(res => row.medicineSuggestions = res.items);
  }

  onMedicineSelect(event: any, row: MedicineRow) {
    const med: Medicine = event.value ?? event;
    row.medicineId = med.medicineId;
    row.medicineName = med.name;
    row.unitCost = med.purchasePrice || 0;
    row.salePrice = med.salePrice || 0;
    
    // Store defaults for future UOM changes
    row.defaultPurchasePrice = med.purchasePrice || 0;
    row.defaultSalePrice = med.salePrice || 0;
    row.defaultUomName = med.uom;

    // Auto-set UOM if medicine has a UOM matching the list
    const matchedUom = this.uoms.find(u => u.name === med.uom);
    if (matchedUom) {
      row.uomId = matchedUom.uomId;
      row.uomName = matchedUom.name;
      row.defaultUomId = matchedUom.uomId;
    } else {
      row.defaultUomId = null;
    }

    // Auto-generate unique batch
    const prefix = med.name.substring(0, 2).toUpperCase();
    const today = this.datePipe.transform(new Date(), 'ddMMyyyy') || '';
    row.batchNumber = this.generateUniqueBatch(`${prefix}${today}`, row);

    this.recalcRow(row);
    
    // Auto focus quantity
    setTimeout(() => {
      const idx = this.rows().indexOf(row);
      if (idx !== -1) {
        const input = this.qtyInputs.toArray()[idx];
        if (input) {
          const el = input.el.nativeElement.querySelector('input');
          if (el) el.focus();
        }
      }
    }, 100);
  }

  onUomChange(row: MedicineRow) {
    const u = this.uoms.find(x => x.uomId === row.uomId);
    row.uomName = u ? u.name : '';

    // Check if the new UOM is different from the default
    if (row.uomId !== row.defaultUomId) {
      // Different Unit: Clear prices and batch to force re-check
      row.unitCost = 0;
      row.salePrice = 0;
      row.batchNumber = ''; // User should define batch for different unit if necessary
      
      this.messageService.add({ 
        severity: 'info', 
        summary: 'Unit Changed', 
        detail: 'Unit changed. Please verify Batch, Purchase Price, and Sale Price for the new unit.',
        life: 5000 
      });
    } else {
      // Restored Default Unit: Restore original prices and regenerate batch
      row.unitCost = row.defaultPurchasePrice || 0;
      row.salePrice = row.defaultSalePrice || 0;
      
      const prefix = row.medicineName.substring(0, 2).toUpperCase();
      const today = this.datePipe.transform(new Date(), 'ddMMyyyy') || '';
      row.batchNumber = this.generateUniqueBatch(`${prefix}${today}`, row);
      
      this.messageService.add({ 
        severity: 'success', 
        summary: 'Unit Restored', 
        detail: 'Default unit restored. Original prices have been applied.',
        life: 3000 
      });
    }

    this.recalcRow(row);
  }

  onBatchChange(row: MedicineRow) {
    if (!row.medicineId || !row.batchNumber) return;

    const b = row.batchNumber.trim().toUpperCase();
    row.batchNumber = b;

    // 1. Check local rows
    const otherRow = this.rows().find(r => r !== row && r.medicineId === row.medicineId && r.batchNumber === b);
    if (otherRow) {
      this.messageService.add({ 
        severity: 'error', 
        summary: 'Duplicate Batch', 
        detail: `Batch "${b}" is already entered in another row for this medicine.` 
      });
      // Append increment to make it unique as per user's "keep auto-increment" preference
      const prefix = row.medicineName.substring(0, 2).toUpperCase();
      const today = this.datePipe.transform(new Date(), 'ddMMyyyy') || '';
      row.batchNumber = this.generateUniqueBatch(`${prefix}${today}`, row);
      return;
    }

    // 2. Check Database
    this.medicineService.checkBatchExists(row.medicineId, b).subscribe(exists => {
      if (exists) {
        this.messageService.add({ 
          severity: 'error', 
          summary: 'Batch Exists', 
          detail: `Batch "${b}" already exists in stock for ${row.medicineName}. Please use a different batch number.` 
        });
        // Auto-increment to suggest next unique one
        const prefix = row.medicineName.substring(0, 2).toUpperCase();
        const today = this.datePipe.transform(new Date(), 'ddMMyyyy') || '';
        row.batchNumber = this.generateUniqueBatch(`${prefix}${today}`, row);
      }
    });
  }

  private generateUniqueBatch(base: string, currentRow: MedicineRow): string {
    const rows = this.rows();
    let batch = base;
    let counter = 1;

    // 1. Check local rows
    const existsLocally = (b: string) => rows.some(r => r !== currentRow && r.medicineId === currentRow.medicineId && r.batchNumber === b);
    
    while (existsLocally(batch)) {
      batch = `${base}-${counter}`;
      counter++;
    }
    return batch;
  }

  onTaxChange(row: MedicineRow) {
    const t = this.taxes.find(x => x.taxId === row.taxId);
    row.taxPercent = t ? t.taxRate : 0;
    this.recalcRow(row);
  }

  // ── Row Management ──
  addRow(): void {
    const newRow: MedicineRow = {
      medicineId: 0,
      medicineName: '',
      batchNumber: '',
      expiryDate: null,
      quantity: 1,
      uomId: null,
      uomName: '',
      taxId: null,
      unitCost: 0,
      discountType: 'amount',
      discountValue: 0,
      discountAmount: 0,
      discountPercent: 0,
      taxPercent: 0,
      taxAmount: 0,
      salePrice: 0,
      lineTotal: 0,
      medicineSuggestions: []
    };
    this.rows.update(r => [...r, newRow]);
    
    // Focus new row's medicine search
    setTimeout(() => {
      const lastIdx = this.rows().length - 1;
      const autos = this.medAutos.toArray();
      const lastAuto = autos[lastIdx];
      if (lastAuto) {
        const el = lastAuto.el.nativeElement.querySelector('input');
        if (el) el.focus();
      }
    }, 100);
  }

  handleSalePriceEnter(index: number) {
    if (index === this.rows().length - 1) {
      this.addRow();
    } else {
      // Focus next row's medicine search
      setTimeout(() => {
        const autos = this.medAutos.toArray();
        const nextAuto = autos[index + 1];
        if (nextAuto) {
          const el = nextAuto.el.nativeElement.querySelector('input');
          if (el) el.focus();
        }
      }, 100);
    }
  }

  clonePreviousExpiry(index: number) {
    if (index > 0) {
      const prevRow = this.rows()[index - 1];
      if (prevRow.expiryDate) {
        this.rows()[index].expiryDate = new Date(prevRow.expiryDate);
        this.rows.set([...this.rows()]);
        this.messageService.add({ severity: 'info', summary: 'Cloned', detail: 'Expiry date cloned from above.' });
      }
    }
  }

  removeRow(i: number) { 
    this.rows.update(r => {
      const copy = [...r];
      copy.splice(i, 1);
      return copy;
    });
  }

  toggleDiscountType(row: MedicineRow) {
    row.discountType = row.discountType === 'amount' ? 'percent' : 'amount';
    row.discountValue = 0;
    this.recalcRow(row);
  }

  recalcRow(row: MedicineRow) {
    const gross = row.quantity * row.unitCost;
    if (row.discountType === 'percent') {
      row.discountPercent = row.discountValue;
      row.discountAmount = parseFloat(((gross * row.discountValue) / 100).toFixed(2));
    } else {
      row.discountAmount = row.discountValue;
      row.discountPercent = gross > 0 ? parseFloat(((row.discountValue / gross) * 100).toFixed(2)) : 0;
    }
    const afterDiscount = gross - row.discountAmount;
    row.taxAmount = parseFloat(((afterDiscount * row.taxPercent) / 100).toFixed(2));
    row.lineTotal = parseFloat((afterDiscount + row.taxAmount).toFixed(2));
    
    // Trigger signal update for reactivity
    this.rows.set([...this.rows()]);
  }

  // ── Computed totals ──
  subTotal = computed(() => this.rows().reduce((s, r) => s + (r.quantity * r.unitCost), 0));
  totalDiscount = computed(() => this.rows().reduce((s, r) => s + r.discountAmount, 0));
  totalTax = computed(() => this.rows().reduce((s, r) => s + r.taxAmount, 0));
  grandTotal = computed(() => {
    const base = this.rows().reduce((s, r) => s + r.lineTotal, 0);
    return parseFloat((base - this.adjustment()).toFixed(2));
  });
  totalPaid = computed(() => this.payments().reduce((s, p) => s + (p.amount || 0), 0));
  dueAmount = computed(() => parseFloat((this.grandTotal() - this.totalPaid()).toFixed(2)));

  onPaymentChange() {
    this.payments.set([...this.payments()]);
  }

  // ── Payments ──
  setMethod(pm: PaymentRow, method: string) {
    pm.method = method;
    pm.showRef = method !== 'Cash';
  }

  addPayment() {
    this.payments.update(p => [...p, { method: 'Cash', amount: 0, accountNumber: '', transactionId: '', remarks: '', showRef: false }]);
  }

  removePayment(i: number) { 
    if (this.payments().length > 1) {
      this.payments.update(p => {
        const copy = [...p];
        copy.splice(i, 1);
        return copy;
      });
    }
  }

  // ── Quick Add Handlers ──
  openQuickSupplier() { this.quickSupplier = { name: '', phone: '', address: '' }; this.showQuickSupplier = true; }
  
  openQuickMedicine(row: MedicineRow) { 
    this.activeRowForMed = row;
    this.quickMedicine = { 
      name: '', genericName: '', category: '', uom: '', 
      purchasePrice: 0, salePrice: 0, isActive: true 
    }; 
    this.showQuickMedicine = true; 
  }

  openQuickUom(row: MedicineRow) { 
    this.activeRowForUom = row;
    this.quickUom = { name: '', description: '' }; 
    this.showQuickUom = true; 
  }

  openQuickGeneric() {
    this.quickGeneric = { name: '', description: '', indication: '' };
    this.showQuickGeneric = true;
  }

  openQuickTax(row: MedicineRow) {
    this.activeRowForTax = row;
    this.quickTax = { name: '', taxRate: 0, remarks: '' };
    this.showQuickTax = true;
  }

  saveQuickSupplier() {
    if (!this.quickSupplier.name) {
      this.messageService.add({ severity: 'warn', summary: 'Required', detail: 'Full Name is required.' });
      return;
    }
    this.quickSaving = true;
    
    // Send data matching PartyDto exactly. Use null for empty strings to avoid validation errors.
    const newParty = {
      partyId: 0,
      code: 'SUP-TEMP', 
      partyType: 'Supplier',
      fullName: this.quickSupplier.name,
      cell: this.quickSupplier.phone || null,
      address: this.quickSupplier.address || null,
      email: null,
      isActive: true
    };

    console.log('Sending supplier data:', newParty);

    this.partyService.create(newParty as any).subscribe({
      next: (p: any) => {
        const normalizedParty: Party = {
          partyId: p.partyId ?? p.PartyId,
          code: p.code ?? p.Code,
          partyType: p.partyType ?? p.PartyType,
          fullName: p.fullName ?? p.FullName,
          cell: p.cell ?? p.Cell,
          email: p.email ?? p.Email,
          address: p.address ?? p.Address,
          isActive: p.isActive ?? p.IsActive
        };

        this.allSuppliers.push(normalizedParty);
        this.selectedSupplier = normalizedParty;
        this.supplierQuery = normalizedParty.fullName; 
        
        this.showQuickSupplier = false;
        this.quickSaving = false;
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Supplier added successfully!' });
        this.supplierSuggestions = [...this.allSuppliers];
      },
      error: (err) => {
        console.error('Quick Add Error Details:', err);
        this.quickSaving = false;
        // Extract validation errors if present
        let errorDetail = 'Failed to add supplier.';
        if (err.error?.errors) {
          const errors = err.error.errors;
          errorDetail = Object.keys(errors).map(k => `${k}: ${errors[k].join(', ')}`).join(' | ');
        } else if (err.error?.message) {
          errorDetail = err.error.message;
        }
        this.messageService.add({ severity: 'error', summary: 'Validation Error', detail: errorDetail, life: 5000 });
      }
    });
  }

  saveQuickMedicine() {
    if (!this.quickMedicine.name || !this.quickMedicine.genericName) {
      this.messageService.add({ severity: 'warn', summary: 'Required', detail: 'Name and Generic are required.' });
      return;
    }
    this.quickSaving = true;
    
    // Include required fields for backend validation
    const payload = {
      ...this.quickMedicine,
      code: 'MED-TEMP',
      isActive: true
    };

    this.medicineService.createMedicine(payload).subscribe({
      next: (med) => {
        this.quickSaving = false;
        this.showQuickMedicine = false;
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Medicine added successfully!' });
        
        if (this.activeRowForMed) {
          this.onMedicineSelect(med, this.activeRowForMed);
        }
      },
      error: (err) => {
        console.error('Quick Med Error:', err);
        this.quickSaving = false;
        let errorDetail = err?.error?.message || 'Failed to add medicine.';
        if (err.error?.errors) {
          const errors = err.error.errors;
          errorDetail = Object.keys(errors).map(k => `${k}: ${errors[k].join(', ')}`).join(' | ');
        }
        this.messageService.add({ severity: 'error', summary: 'Validation Error', detail: errorDetail, life: 5000 });
      }
    });
  }

  saveQuickUom() {
    if (!this.quickUom.name) {
      this.messageService.add({ severity: 'warn', summary: 'Required', detail: 'UOM Name is required.' });
      return;
    }
    this.quickSaving = true;

    const payload = {
      ...this.quickUom,
      code: 'UOM-TEMP',
      isActive: true
    };

    this.uomService.create(payload as any).subscribe({
      next: (u) => {
        this.quickSaving = false;
        this.showQuickUom = false;
        this.uoms.push(u);
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'UOM added successfully!' });
        
        if (this.activeRowForUom) {
          this.activeRowForUom.uomId = u.uomId;
          this.activeRowForUom.uomName = u.name;
        }
      },
      error: (err) => {
        console.error('Quick UOM Error:', err);
        this.quickSaving = false;
        let errorDetail = err?.error?.message || 'Failed to add UOM.';
        if (err.error?.errors) {
          const errors = err.error.errors;
          errorDetail = Object.keys(errors).map(k => `${k}: ${errors[k].join(', ')}`).join(' | ');
        }
        this.messageService.add({ severity: 'error', summary: 'Validation Error', detail: errorDetail, life: 5000 });
      }
    });
  }

  saveQuickGeneric() {
    if (!this.quickGeneric.name) {
      this.messageService.add({ severity: 'warn', summary: 'Required', detail: 'Generic Name is required.' });
      return;
    }
    this.quickSaving = true;

    const payload = {
      name: this.quickGeneric.name,
      description: this.quickGeneric.indication, // Map indication to Description
      code: 'GEN-TEMP',
      isActive: true
    };

    this.genericService.create(payload as any).subscribe({
      next: (gen) => {
        this.quickSaving = false;
        this.showQuickGeneric = false;
        this.generics.push(gen);
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Generic added successfully!' });
        
        // Auto-select in the medicine form
        this.quickMedicine.genericName = gen.name;
      },
      error: (err) => {
        console.error('Quick Generic Error:', err);
        this.quickSaving = false;
        let errorDetail = err?.error?.message || 'Failed to add generic.';
        if (err.error?.errors) {
          const errors = err.error.errors;
          errorDetail = Object.keys(errors).map(k => `${k}: ${errors[k].join(', ')}`).join(' | ');
        }
        this.messageService.add({ severity: 'error', summary: 'Validation Error', detail: errorDetail, life: 5000 });
      }
    });
  }

  saveQuickTax() {
    if (!this.quickTax.name) {
      this.messageService.add({ severity: 'warn', summary: 'Required', detail: 'Tax Name is required.' });
      return;
    }
    this.quickSaving = true;

    const payload = {
      ...this.quickTax,
      code: 'TAX-TEMP',
      isActive: true
    };

    this.taxService.create(payload as any).subscribe({
      next: (t) => {
        this.quickSaving = false;
        this.showQuickTax = false;
        this.taxes.push(t);
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Tax added successfully!' });
        
        if (this.activeRowForTax) {
          this.activeRowForTax.taxId = t.taxId;
          this.onTaxChange(this.activeRowForTax);
        }
      },
      error: (err) => {
        console.error('Quick Tax Error:', err);
        this.quickSaving = false;
        let errorDetail = err?.error?.message || 'Failed to add tax.';
        if (err.error?.errors) {
          const errors = err.error.errors;
          errorDetail = Object.keys(errors).map(k => `${k}: ${errors[k].join(', ')}`).join(' | ');
        }
        this.messageService.add({ severity: 'error', summary: 'Validation Error', detail: errorDetail, life: 5000 });
      }
    });
  }

  // ── Save GRN ──
  savePurchase(shouldPrint: boolean = false) {
    if (!this.selectedSupplier) {
      this.messageService.add({ severity: 'warn', summary: 'Required', detail: 'Please select a supplier.' });
      return;
    }
    if (!this.invoiceNumber) {
      this.messageService.add({ severity: 'warn', summary: 'Required', detail: 'Please enter Invoice Number.' });
      return;
    }

    const rows = this.rows();
    const invalidRow = rows.find(r => !r.medicineId);
    if (invalidRow) {
      this.messageService.add({ severity: 'warn', summary: 'Required', detail: 'Please select a medicine for each row.' });
      return;
    }

    const emptyBatch = rows.find(r => !r.batchNumber || r.batchNumber.trim() === '');
    if (emptyBatch) {
      this.messageService.add({ severity: 'warn', summary: 'Required', detail: 'Please enter Batch Number for all medicines.' });
      return;
    }

    // Check for duplicate batches for the SAME medicine in the same form
    const batchMap = new Set<string>();
    for (const r of rows) {
      const key = `${r.medicineId}-${r.batchNumber.trim()}`;
      if (batchMap.has(key)) {
        this.messageService.add({ severity: 'error', summary: 'Duplicate Entry', detail: `Duplicate Batch Number '${r.batchNumber}' for the same medicine.` });
        return;
      }
      batchMap.add(key);
    }

    this.saving = true;
    const payload: PurchaseMaster = {
      supplierId: this.selectedSupplier.partyId,
      invoiceNumber: this.invoiceNumber,
      invoiceDate: this.invoiceDate ? this.datePipe.transform(this.invoiceDate, 'yyyy-MM-dd') : null,
      purchaseDate: this.datePipe.transform(this.entryDate, 'yyyy-MM-dd') || '',
      subTotal: this.subTotal(),
      totalDiscount: this.totalDiscount(),
      totalTax: this.totalTax(),
      adjustment: this.adjustment(),
      grandTotal: this.grandTotal(),
      paidAmount: this.totalPaid(),
      purchaseDetails: rows.map(r => ({
        medicineId: r.medicineId,
        batchNumber: r.batchNumber.trim(),
        expiryDate: r.expiryDate ? this.datePipe.transform(r.expiryDate, 'yyyy-MM-dd') : null,
        quantity: r.quantity,
        uomId: r.uomId,
        uomName: r.uomName,
        unitCost: r.unitCost,
        discountPercent: r.discountPercent,
        discountAmount: r.discountAmount,
        taxPercent: r.taxPercent,
        taxAmount: r.taxAmount,
        salePrice: r.salePrice,
        lineTotal: r.lineTotal
      })),
      purchasePayments: this.payments()
        .filter(p => p.amount > 0)
        .map(p => ({
          paymentMethod: p.method,
          amount: p.amount,
          accountNumber: p.accountNumber || undefined,
          transactionId: p.transactionId || undefined,
          remarks: p.remarks || undefined
        }))
    };

    this.purchaseService.createPurchase(payload).subscribe({
      next: (res) => {
        this.saving = false;
        this.messageService.add({ severity: 'success', summary: 'GRN Saved!', detail: `${res.grnCode} saved successfully.` });
        
        if (shouldPrint) {
          // Pass the rich res object to the print service
          // res usually contains supplier info and details if the backend returns it
          // Otherwise, we use the payload + generated GRN code
          const printData = { ...res, ...payload, 
            supplierName: this.selectedSupplier?.fullName,
            supplierPhone: this.selectedSupplier?.cell
          };
          this.grnPrintService.generatePDF(printData);
        }

        setTimeout(() => this.router.navigate(['/dashboard/purchases']), 1500);
      },
      error: (err) => {
        this.saving = false;
        const detail = err?.error?.message || err?.error || 'Failed to save GRN.';
        this.messageService.add({ severity: 'error', summary: 'Error', detail: detail, life: 5000 });
      }
    });
  }

  goBack() { this.router.navigate(['/dashboard/purchases']); }
}
