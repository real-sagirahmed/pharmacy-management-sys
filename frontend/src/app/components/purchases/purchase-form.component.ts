import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { Medicine, MedicineService } from '../../services/medicine.service';
import { Supplier, SupplierService } from '../../services/supplier.service';
import { PurchaseService } from '../../services/purchase.service';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';

@Component({
  selector: 'app-purchase-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonModule, InputTextModule, SelectModule, DatePickerModule],
  template: `
    <div class="po-shell animate-fadein-up">

      <!-- ─── LEFT: Form ─── -->
      <div class="po-form-card">
        <div class="po-header">
          <div class="po-icon"><i class="pi pi-shopping-bag"></i></div>
          <div>
            <h2 class="po-title">New Purchase Order</h2>
            <p class="po-sub">Order medicines from your supplier</p>
          </div>
        </div>

        <form [formGroup]="purchaseForm" (ngSubmit)="onSubmit()">

          <!-- Supplier / Invoice / Date -->
          <div class="section-label">ORDER DETAILS</div>
          <div class="form-grid-3">
            <div class="form-field">
              <label class="field-label">Supplier</label>
              <p-select [options]="suppliers" formControlName="supplierId"
                          optionLabel="name" optionValue="supplierId"
                          placeholder="Select supplier…" styleClass="w-full"></p-select>
            </div>
            <div class="form-field">
              <label class="field-label">Invoice #</label>
              <div class="invoice-wrap">
                <i class="pi pi-file-invoice invoice-icon"></i>
                <input class="field-input" formControlName="invoiceNumber" placeholder="INV-000" style="padding-left:36px">
              </div>
            </div>
            <div class="form-field">
              <label class="field-label">Date</label>
              <p-datepicker formControlName="purchaseDate" [showIcon]="true" styleClass="w-full"
                          dateFormat="dd/mm/yy"></p-datepicker>
            </div>
          </div>

          <!-- Items -->
          <div class="items-head">
            <div class="section-label">MEDICINE ITEMS</div>
            <button type="button" class="btn-add-item" (click)="addItem()">
              <i class="pi pi-plus"></i> Add Item
            </button>
          </div>

          <div formArrayName="purchaseDetails" class="items-list">
            <div *ngFor="let item of purchaseDetails.controls; let i=index"
                 [formGroupName]="i" class="item-row">

              <div class="item-med">
                <label class="field-label-sm">Medicine</label>
                <p-select [options]="medicines" formControlName="medicineId"
                            optionLabel="name" optionValue="medicineId"
                            placeholder="Select medicine…" [filter]="true"
                            styleClass="w-full" (onChange)="onMedicineChange(i)"></p-select>
              </div>

              <div class="item-qty">
                <label class="field-label-sm">Quantity</label>
                <input class="field-input" type="number" formControlName="quantity"
                       min="1" (input)="calculateSubtotal(i)">
              </div>

              <div class="item-cost">
                <label class="field-label-sm">Unit Cost</label>
                <div class="cost-wrap">
                  <span class="cost-prefix">৳</span>
                  <input class="field-input" type="number" formControlName="unitCost"
                         (input)="calculateSubtotal(i)" style="padding-left:28px">
                </div>
              </div>

              <div class="item-sub">
                <label class="field-label-sm">Subtotal</label>
                <div class="subtotal-val">{{ item.get('subtotal')?.value | currency }}</div>
              </div>

              <button type="button" class="item-remove" (click)="removeItem(i)">
                <i class="pi pi-trash"></i>
              </button>
            </div>

            <div *ngIf="purchaseDetails.controls.length === 0" class="items-empty">
              <i class="pi pi-shopping-bag" style="font-size:1.5rem;color:#cbd5e1"></i>
              <span>No items. Add medicines to this purchase order.</span>
            </div>
          </div>

        </form>
      </div>

      <!-- ─── RIGHT: Summary ─── -->
      <div class="po-summary">
        <div class="summary-card">
          <div class="summary-title">ORDER SUMMARY</div>

          <div class="summary-stat">
            <span class="stat-label">Items</span>
            <span class="stat-val">{{ purchaseDetails.controls.length }}</span>
          </div>
          <div class="summary-stat">
            <span class="stat-label">Grand Total</span>
            <span class="stat-total">{{ purchaseForm.value.totalAmount | currency }}</span>
          </div>
        </div>

        <button class="submit-btn" (click)="onSubmit()"
                [disabled]="purchaseForm.invalid || isSubmitting">
          <span *ngIf="!isSubmitting">
            <i class="pi pi-check"></i> Save Purchase
          </span>
          <span *ngIf="isSubmitting">
            <i class="pi pi-spin pi-spinner"></i> Saving…
          </span>
        </button>

        <div class="save-success" *ngIf="savedSuccess">
          <i class="pi pi-check-circle"></i> Purchase saved successfully!
        </div>

        <div class="tips-card">
          <p class="tip-head"><i class="pi pi-info-circle"></i> Tips</p>
          <ul class="tip-list">
            <li>Select a supplier first</li>
            <li>Add all medicines with correct quantities</li>
            <li>Double-check unit cost before saving</li>
          </ul>
        </div>
      </div>

    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }

    .po-shell { display: flex; gap: 20px; width: 100%; align-items: flex-start; flex-wrap: wrap; }

    /* Form Card */
    .po-form-card {
      flex: 1; min-width: 340px;
      background: #fff; border: 1px solid #e2e8f0;
      border-radius: 16px; padding: 28px;
      display: flex; flex-direction: column; gap: 20px;
    }
    .po-header { display: flex; align-items: center; gap: 14px; }
    .po-icon {
      width: 48px; height: 48px; background: #e0e7ff; color: #4f46e5;
      border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 1.3rem;
    }
    .po-title { font-size: 1.3rem; font-weight: 800; color: #0f172a; margin: 0; }
    .po-sub   { font-size: .8rem; color: #64748b; margin: 0; }

    .section-label { font-size: .65rem; font-weight: 700; color: #94a3b8; letter-spacing: .1em; margin-bottom: 10px; }
    .form-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
    .form-field { display: flex; flex-direction: column; gap: 6px; }
    .field-label { font-size: .8rem; font-weight: 600; color: #475569; }
    .field-label-sm { font-size: .72rem; font-weight: 600; color: #94a3b8; margin-bottom: 4px; }
    .field-input {
      padding: 9px 12px; border: 1.5px solid #e2e8f0; border-radius: 10px;
      font-size: .875rem; font-family: 'Inter', sans-serif; color: #0f172a; outline: none;
      transition: border-color .15s; width: 100%;
    }
    .field-input:focus { border-color: #6366f1; }

    .invoice-wrap, .cost-wrap { position: relative; }
    .invoice-icon {
      position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
      color: #94a3b8; font-size: .875rem; pointer-events: none;
    }
    .cost-prefix {
      position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
      color: #64748b; font-size: .875rem; font-weight: 600;
    }

    /* Items */
    .items-head { display: flex; align-items: center; justify-content: space-between; }
    .btn-add-item {
      display: flex; align-items: center; gap: 6px;
      background: #eff6ff; color: #3b82f6; border: 1px solid #bfdbfe;
      border-radius: 8px; padding: 7px 14px; font-size: .8rem; font-weight: 600;
      cursor: pointer; font-family: 'Inter', sans-serif;
    }
    .btn-add-item:hover { background: #dbeafe; }
    .items-list { display: flex; flex-direction: column; gap: 10px; }
    .item-row {
      display: grid; grid-template-columns: 2fr 80px 100px 110px 36px;
      gap: 10px; align-items: end;
      background: #f8fafc; padding: 14px; border-radius: 12px; border: 1px solid #f1f5f9;
    }
    .subtotal-val { font-weight: 700; color: #4f46e5; font-size: .95rem; padding: 8px 0; }
    .item-remove {
      width: 36px; height: 36px; background: #fff1f2; border: none; border-radius: 8px;
      color: #f87171; cursor: pointer; display: flex; align-items: center; justify-content: center;
    }
    .item-remove:hover { background: #ffe4e6; color: #ef4444; }
    .items-empty {
      display: flex; align-items: center; gap: 10px; justify-content: center; padding: 24px;
      color: #94a3b8; font-size: .875rem; background: #f8fafc; border-radius: 12px; border: 1px dashed #e2e8f0;
    }

    /* Summary */
    .po-summary { width: 260px; min-width: 240px; display: flex; flex-direction: column; gap: 14px; }
    .summary-card {
      background: #4f46e5; color: #fff; border-radius: 16px; padding: 24px;
      display: flex; flex-direction: column; gap: 16px;
    }
    .summary-title { font-size: .65rem; font-weight: 700; color: #a5b4fc; letter-spacing: .1em; }
    .summary-stat { display: flex; justify-content: space-between; align-items: center; }
    .stat-label { font-size: .875rem; color: #c7d2fe; }
    .stat-val   { font-size: 1.2rem; font-weight: 800; }
    .stat-total { font-size: 1.6rem; font-weight: 900; }

    .submit-btn {
      width: 100%; padding: 14px;
      background: linear-gradient(135deg, #6366f1, #4f46e5);
      color: #fff; border: none; border-radius: 12px;
      font-size: 1rem; font-weight: 700; cursor: pointer;
      font-family: 'Inter', sans-serif; transition: opacity .15s;
    }
    .submit-btn:hover:not(:disabled) { opacity: .9; }
    .submit-btn:disabled { opacity: .5; cursor: not-allowed; }

    .save-success {
      display: flex; align-items: center; gap: 8px;
      background: #d1fae5; color: #065f46; border-radius: 10px;
      padding: 12px 16px; font-size: .875rem; font-weight: 600;
    }

    .tips-card {
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px;
    }
    .tip-head { font-size: .8rem; font-weight: 600; color: #475569; margin: 0 0 8px; display: flex; align-items: center; gap: 6px; }
    .tip-list { margin: 0; padding-left: 18px; color: #64748b; font-size: .78rem; display: flex; flex-direction: column; gap: 4px; }

    @media (max-width: 768px) {
      .po-shell { flex-direction: column; }
      .po-summary { width: 100%; }
      .form-grid-3 { grid-template-columns: 1fr; }
      .item-row { grid-template-columns: 1fr; }
    }
  `]
})
export class PurchaseFormComponent implements OnInit {
  purchaseForm: FormGroup;
  medicines:  Medicine[]  = [];
  suppliers:  Supplier[]  = [];
  isSubmitting = false;
  savedSuccess = false;

  constructor(
    private fb: FormBuilder,
    private medicineService: MedicineService,
    private supplierService: SupplierService,
    private purchaseService: PurchaseService
  ) {
    this.purchaseForm = this.fb.group({
      supplierId:      [null, Validators.required],
      invoiceNumber:   ['', Validators.required],
      purchaseDate:    [new Date(), Validators.required],
      totalAmount:     [0],
      purchaseDetails: this.fb.array([], Validators.required)
    });
  }

  ngOnInit() {
    this.medicineService.getMedicines({ pageNumber: 1, pageSize: 1000 }).subscribe(res => this.medicines = res.items);
    this.supplierService.getSuppliers().subscribe(data => this.suppliers = data);
    this.addItem();
  }

  get purchaseDetails() {
    return this.purchaseForm.get('purchaseDetails') as FormArray;
  }

  addItem() {
    this.purchaseDetails.push(this.fb.group({
      medicineId:  [null, Validators.required],
      batchNumber: ['BATCH-NEW', Validators.required],
      expiryDate:  [null],
      quantity:    [1, [Validators.required, Validators.min(1)]],
      unitCost:    [0, [Validators.required, Validators.min(0.01)]],
      subtotal:    [0]
    }));
  }

  removeItem(index: number) {
    this.purchaseDetails.removeAt(index);
    this.calculateGrandTotal();
  }

  onMedicineChange(index: number) { /* auto-fill if needed */ }

  calculateSubtotal(index: number) {
    const item = this.purchaseDetails.at(index);
    item.patchValue({ subtotal: (item.get('quantity')?.value || 0) * (item.get('unitCost')?.value || 0) });
    this.calculateGrandTotal();
  }

  calculateGrandTotal() {
    const total = this.purchaseDetails.controls.reduce((a, c) => a + (c.get('subtotal')?.value || 0), 0);
    this.purchaseForm.patchValue({ totalAmount: total });
  }

  onSubmit() {
    if (this.purchaseForm.valid) {
      this.isSubmitting = true;
      this.savedSuccess  = false;
      this.purchaseService.createPurchase(this.purchaseForm.value).subscribe({
        next: () => { this.isSubmitting = false; this.savedSuccess = true; },
        error: ()  => { this.isSubmitting = false; alert('Error saving purchase.'); }
      });
    }
  }
}
