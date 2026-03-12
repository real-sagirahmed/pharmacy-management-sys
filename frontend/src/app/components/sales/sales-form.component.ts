import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { Medicine, MedicineService } from '../../services/medicine.service';
import { SalesService } from '../../services/sales.service';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';

@Component({
  selector: 'app-sales-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonModule, InputTextModule, DropdownModule],
  template: `
    <div class="pos-shell animate-fadein-up">

      <!-- ─── LEFT: POS Entry Form ─── -->
      <div class="pos-form-card">
        <div class="pos-header">
          <div class="pos-icon"><i class="pi pi-desktop"></i></div>
          <div>
            <h2 class="pos-title">Point of Sale</h2>
            <p class="pos-sub">New customer transaction</p>
          </div>
        </div>

        <form [formGroup]="salesForm" (ngSubmit)="onSubmit()">

          <!-- Customer Info -->
          <div class="section-label">CUSTOMER INFO</div>
          <div class="form-grid-2">
            <div class="form-field">
              <label class="field-label">Customer Name</label>
              <input class="field-input" formControlName="customerName" placeholder="Guest Customer">
            </div>
            <div class="form-field">
              <label class="field-label">Phone</label>
              <input class="field-input" formControlName="customerPhone" placeholder="01XXX-XXXXXX">
            </div>
          </div>

          <!-- Medicines Section -->
          <div class="medicines-header">
            <div class="section-label">MEDICINES</div>
            <button type="button" class="btn-add-item" (click)="addItem()">
              <i class="pi pi-plus"></i> Add Item
            </button>
          </div>

          <div formArrayName="salesDetails" class="items-list">
            <div *ngFor="let item of salesDetails.controls; let i=index"
                 [formGroupName]="i" class="item-row">

              <div class="item-med-select">
                <label class="field-label-sm">Medicine</label>
                <p-select [options]="medicines" formControlName="medicineId"
                            optionLabel="name" optionValue="medicineId"
                            placeholder="Select medicine…" [filter]="true"
                            filterPlaceholder="Search…" styleClass="w-full"
                            (onChange)="onMedicineChange(i)"></p-select>
              </div>

              <div class="item-qty">
                <label class="field-label-sm">Qty</label>
                <input class="field-input" type="number" formControlName="quantity"
                       min="1" (input)="itemTotal(i)" style="text-align:center">
              </div>

              <div class="item-price">
                <label class="field-label-sm">Unit Price</label>
                <input class="field-input field-readonly" type="number"
                       formControlName="unitPrice" [readonly]="true">
              </div>

              <div class="item-subtotal">
                <label class="field-label-sm">Subtotal</label>
                <div class="subtotal-value">{{ item.get('subtotal')?.value | currency }}</div>
              </div>

              <button type="button" class="item-remove" (click)="removeItem(i)" title="Remove">
                <i class="pi pi-trash"></i>
              </button>
            </div>

            <!-- Empty items state -->
            <div *ngIf="salesDetails.controls.length === 0" class="items-empty">
              <i class="pi pi-shopping-cart" style="font-size:1.5rem;color:#cbd5e1"></i>
              <span>No items added. Click "Add Item" to start.</span>
            </div>
          </div>

        </form>
      </div>

      <!-- ─── RIGHT: Order Summary ─── -->
      <div class="summary-panel">

        <!-- Totals Card -->
        <div class="summary-card">
          <div class="summary-title">ORDER SUMMARY</div>

          <div class="summary-lines">
            <div class="summary-line">
              <span>Subtotal</span>
              <span>{{ subtotal | currency }}</span>
            </div>
            <div class="summary-line">
              <span>Tax (5%)</span>
              <span>{{ taxTotal | currency }}</span>
            </div>
            <div class="summary-line discount-line">
              <span>Discount</span>
              <input class="discount-input" type="number" [formControl]="salesForm.controls.discount"
                     (input)="updateTotals()" placeholder="0">
            </div>
          </div>

          <div class="total-block">
            <div class="total-label">PAYABLE AMOUNT</div>
            <div class="total-value">{{ grandTotal | currency }}</div>
          </div>
        </div>

        <!-- Payment Method -->
        <div class="payment-card">
          <div class="payment-title">PAYMENT METHOD</div>
          <div class="payment-methods">
            <button type="button" class="pay-btn"
                    [class.pay-active]="salesForm.get('paymentMethod')?.value === 'Cash'"
                    (click)="salesForm.patchValue({paymentMethod:'Cash'})">
              <i class="pi pi-money-bill"></i>
              <span>Cash</span>
            </button>
            <button type="button" class="pay-btn"
                    [class.pay-active]="salesForm.get('paymentMethod')?.value === 'Card'"
                    (click)="salesForm.patchValue({paymentMethod:'Card'})">
              <i class="pi pi-credit-card"></i>
              <span>Card</span>
            </button>
            <button type="button" class="pay-btn"
                    [class.pay-active]="salesForm.get('paymentMethod')?.value === 'Mobile'"
                    (click)="salesForm.patchValue({paymentMethod:'Mobile'})">
              <i class="pi pi-mobile"></i>
              <span>Mobile</span>
            </button>
          </div>
        </div>

        <!-- Checkout Button -->
        <button class="checkout-btn" (click)="onSubmit()"
                [disabled]="salesForm.invalid || isSubmitting">
          <span *ngIf="!isSubmitting">
            <i class="pi pi-check-circle"></i> Complete Sale
          </span>
          <span *ngIf="isSubmitting">
            <i class="pi pi-spin pi-spinner"></i> Processing…
          </span>
        </button>

        <div class="sale-success" *ngIf="lastSuccess">
          <i class="pi pi-check-circle"></i> Sale #{{ lastSuccess }} completed!
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }

    .pos-shell {
      display: flex;
      gap: 20px;
      width: 100%;
      align-items: flex-start;
      flex-wrap: wrap;
    }

    /* ─── Form Card ─── */
    .pos-form-card {
      flex: 1;
      min-width: 340px;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 28px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .pos-header { display: flex; align-items: center; gap: 14px; }
    .pos-icon {
      width: 48px; height: 48px;
      background: #ccfbf1; color: #0d9488;
      border-radius: 14px;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.3rem;
    }
    .pos-title { font-size: 1.3rem; font-weight: 800; color: #0f172a; margin: 0; }
    .pos-sub   { font-size: .8rem; color: #64748b; margin: 0; }

    /* Form fields */
    .section-label {
      font-size: .65rem; font-weight: 700; color: #94a3b8;
      letter-spacing: .1em; margin-bottom: 10px;
    }
    .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .form-field { display: flex; flex-direction: column; gap: 6px; }
    .field-label { font-size: .8rem; font-weight: 600; color: #475569; }
    .field-label-sm { font-size: .72rem; font-weight: 600; color: #94a3b8; }
    .field-input {
      padding: 9px 12px;
      border: 1.5px solid #e2e8f0;
      border-radius: 10px;
      font-size: .875rem;
      font-family: 'Inter', sans-serif;
      color: #0f172a;
      outline: none;
      transition: border-color .15s;
      width: 100%;
    }
    .field-input:focus { border-color: #0d9488; }
    .field-readonly { background: #f8fafc; color: #64748b; }

    /* Medicines Section */
    .medicines-header {
      display: flex; align-items: center; justify-content: space-between;
    }
    .btn-add-item {
      display: flex; align-items: center; gap: 6px;
      background: #eff6ff; color: #3b82f6;
      border: 1px solid #bfdbfe; border-radius: 8px;
      padding: 7px 14px; font-size: .8rem; font-weight: 600;
      cursor: pointer; transition: background .15s;
      font-family: 'Inter', sans-serif;
    }
    .btn-add-item:hover { background: #dbeafe; }

    /* Item rows */
    .items-list { display: flex; flex-direction: column; gap: 10px; }
    .item-row {
      display: grid;
      grid-template-columns: 2fr 80px 100px 100px 36px;
      gap: 10px;
      align-items: end;
      background: #f8fafc;
      padding: 14px;
      border-radius: 12px;
      border: 1px solid #f1f5f9;
    }
    .subtotal-value {
      font-weight: 700; color: #0d9488; font-size: .95rem;
      padding: 8px 0;
    }
    .item-remove {
      width: 36px; height: 36px;
      background: #fff1f2; border: none; border-radius: 8px;
      color: #f87171; cursor: pointer; transition: background .15s;
      display: flex; align-items: center; justify-content: center;
      font-size: .875rem;
    }
    .item-remove:hover { background: #ffe4e6; color: #ef4444; }

    .items-empty {
      display: flex; align-items: center; gap: 10px;
      justify-content: center;
      padding: 24px;
      color: #94a3b8;
      font-size: .875rem;
      background: #f8fafc;
      border-radius: 12px;
      border: 1px dashed #e2e8f0;
    }

    /* ─── Summary Panel ─── */
    .summary-panel {
      width: 300px;
      min-width: 280px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .summary-card {
      background: #0f172a;
      border-radius: 16px;
      padding: 24px;
      color: #fff;
    }
    .summary-title {
      font-size: .65rem; font-weight: 700; color: #4ade80;
      letter-spacing: .1em; margin-bottom: 16px;
    }
    .summary-lines { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
    .summary-line {
      display: flex; justify-content: space-between; align-items: center;
      font-size: .875rem; color: #94a3b8;
    }
    .summary-line span:last-child { color: #f1f5f9; font-weight: 600; }
    .discount-line span:last-child { color: inherit; font-weight: normal; }
    .discount-input {
      width: 90px;
      padding: 6px 10px;
      border: 1px solid #334155;
      border-radius: 8px;
      background: #1e293b;
      color: #f1f5f9;
      font-size: .875rem;
      text-align: right;
      font-family: 'Inter', sans-serif;
      outline: none;
    }
    .total-block {
      border-top: 1px solid #1e293b;
      padding-top: 16px;
    }
    .total-label { font-size: .65rem; font-weight: 700; color: #64748b; letter-spacing: .1em; margin-bottom: 4px; }
    .total-value { font-size: 2rem; font-weight: 900; color: #fff; }

    /* Payment */
    .payment-card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 20px;
    }
    .payment-title { font-size: .65rem; font-weight: 700; color: #94a3b8; letter-spacing: .1em; margin-bottom: 12px; }
    .payment-methods { display: flex; gap: 8px; }
    .pay-btn {
      flex: 1;
      display: flex; flex-direction: column; align-items: center; gap: 6px;
      padding: 12px 8px;
      border: 1.5px solid #e2e8f0;
      border-radius: 10px;
      background: #f8fafc;
      color: #64748b;
      cursor: pointer;
      transition: all .15s;
      font-size: .75rem; font-weight: 600;
      font-family: 'Inter', sans-serif;
    }
    .pay-btn i { font-size: 1.1rem; }
    .pay-btn:hover { border-color: #0d9488; color: #0d9488; background: #f0fdfa; }
    .pay-active {
      border-color: #0d9488 !important;
      background: #ccfbf1 !important;
      color: #0f766e !important;
    }

    /* Checkout */
    .checkout-btn {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, #0d9488, #0f766e);
      color: #fff;
      border: none;
      border-radius: 12px;
      font-size: 1rem; font-weight: 700;
      cursor: pointer;
      transition: opacity .15s;
      font-family: 'Inter', sans-serif;
    }
    .checkout-btn:hover:not(:disabled) { opacity: .9; }
    .checkout-btn:disabled { opacity: .5; cursor: not-allowed; }

    .sale-success {
      display: flex; align-items: center; gap: 8px;
      background: #d1fae5; color: #065f46;
      border-radius: 10px; padding: 12px 16px;
      font-size: .875rem; font-weight: 600;
      animation: fadein .3s ease-out;
    }

    @keyframes fadein { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }

    /* Responsive */
    @media (max-width: 768px) {
      .pos-shell { flex-direction: column; }
      .summary-panel { width: 100%; }
      .item-row { grid-template-columns: 1fr; }
      .form-grid-2 { grid-template-columns: 1fr; }
    }
  `]
})
export class SalesFormComponent implements OnInit {
  salesForm: FormGroup;
  medicines: Medicine[] = [];
  subtotal  = 0;
  taxTotal  = 0;
  grandTotal = 0;
  isSubmitting = false;
  lastSuccess: string | null = null;

  constructor(
    private fb: FormBuilder,
    private medicineService: MedicineService,
    private salesService: SalesService
  ) {
    this.salesForm = this.fb.group({
      customerName:  ['Guest'],
      customerPhone: [''],
      saleDate:      [new Date()],
      grandTotal:    [0],
      discount:      [0],
      paymentMethod: ['Cash', Validators.required],
      salesDetails:  this.fb.array([], Validators.required)
    });
  }

  ngOnInit() {
    this.medicineService.getMedicines({ pageNumber: 1, pageSize: 1000 }).subscribe(res => {
      this.medicines = res.items;
    });
    this.addItem();
  }

  get salesDetails() {
    return this.salesForm.get('salesDetails') as FormArray;
  }

  addItem() {
    const item = this.fb.group({
      medicineId: [null, Validators.required],
      quantity:   [1, [Validators.required, Validators.min(1)]],
      unitPrice:  [0],
      tax:        [0],
      subtotal:   [0]
    });
    this.salesDetails.push(item);
  }

  removeItem(index: number) {
    this.salesDetails.removeAt(index);
    this.updateTotals();
  }

  onMedicineChange(index: number) {
    const item  = this.salesDetails.at(index);
    const medId = item.get('medicineId')?.value;
    const med   = this.medicines.find(m => m.medicineId === medId);
    if (med) {
      item.patchValue({ unitPrice: med.salePrice });
      this.itemTotal(index);
    }
  }

  itemTotal(index: number) {
    const item  = this.salesDetails.at(index);
    const qty   = item.get('quantity')?.value || 0;
    const price = item.get('unitPrice')?.value || 0;
    const total = qty * price;
    item.patchValue({ tax: total * 0.05, subtotal: total });
    this.updateTotals();
  }

  updateTotals() {
    this.subtotal  = this.salesDetails.controls.reduce((a, c) => a + (c.get('subtotal')?.value || 0), 0);
    this.taxTotal  = this.salesDetails.controls.reduce((a, c) => a + (c.get('tax')?.value || 0), 0);
    const disc     = this.salesForm.get('discount')?.value || 0;
    this.grandTotal = this.subtotal + this.taxTotal - disc;
    this.salesForm.patchValue({ grandTotal: this.grandTotal });
  }

  onSubmit() {
    if (this.salesForm.valid) {
      this.isSubmitting = true;
      this.lastSuccess = null;
      this.salesService.createSale(this.salesForm.value).subscribe({
        next: (res: any) => {
          this.isSubmitting = false;
          this.lastSuccess  = res?.saleId || 'NEW';
          // Reset form
          while (this.salesDetails.length) this.salesDetails.removeAt(0);
          this.salesForm.patchValue({ customerName: 'Guest', customerPhone: '', discount: 0, paymentMethod: 'Cash' });
          this.subtotal = this.taxTotal = this.grandTotal = 0;
          this.addItem();
        },
        error: (err) => {
          this.isSubmitting = false;
          alert(err.error || 'Error completing sale');
        }
      });
    }
  }
}
