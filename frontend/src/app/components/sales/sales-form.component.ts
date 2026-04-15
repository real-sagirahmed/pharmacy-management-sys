import {
  Component, OnInit, signal, computed, effect, untracked, inject, HostListener
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, forkJoin } from 'rxjs';

// PrimeNG
import { AutoCompleteModule } from 'primeng/autocomplete';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { InputTextModule } from 'primeng/inputtext';
import { DividerModule } from 'primeng/divider';
import { TooltipDirective } from '../../directives/tooltip.directive';

// Services & Models
import { SalesService, SaleMaster, SaleDetail, SalePayment, SaleBatchInfo } from '../../services/sales.service';
import { CustomerService, Customer } from '../../services/customer.service';
import { MedicineService, Medicine } from '../../services/medicine.service';
import { TaxService } from '../../services/tax.service';
import { UomService } from '../../services/uom.service';
import { SalesInvoicePrintService } from '../../services/invoice-print.service';

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface MedRow {
  medicineId: number;
  medicineName: string;
  batchNumber: string;
  expiryDate: Date | null;
  availableQty: number;
  quantity: number;
  uomId: number | null;
  uomName: string;
  unitPrice: number;
  discountType: 'amount' | 'percent';
  discountValue: number;
  discountAmount: number;
  discountPercent: number;
  taxId: number | null;
  taxPercent: number;
  taxAmount: number;
  lineTotal: number;
  isNearExpiry: boolean;
  // Dropdown data
  medicineSuggestions: Medicine[];
  batchOptions: SaleBatchInfo[];
  medicine?: Medicine | null;
}

interface PayRow {
  method: string;
  amount: number;
  accountNumber: string;
  transactionId: string;
  remarks: string;
  showRef: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

@Component({
  selector: 'app-sales-form',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    AutoCompleteModule, InputNumberModule, SelectModule,
    DatePickerModule, ButtonModule, TableModule,
    DialogModule, ConfirmDialogModule, ToastModule,
    InputTextModule, DividerModule, TooltipDirective
  ],
  providers: [ConfirmationService, MessageService, DatePipe],
  templateUrl: './sales-form.component.html',
  styleUrls: ['./sales-form.component.scss']
})
export class SalesFormComponent implements OnInit {

  // ── Sales Header ──────────────────────────────────────────────────────────
  invoiceCode = '';
  saleDate: Date = new Date();
  saleTime = '';
  salesBy = '';

  // ── Customer ──────────────────────────────────────────────────────────────
  customerQuery = '';
  customerSuggestions: Customer[] = [];
  selectedCustomer: Customer | null = null;
  isRegisteredCustomer = false;
  guestName = '';
  guestPhone = '';

  // Quick-add customer dialog
  showQuickCustomer = false;
  quickCustomer = { fullName: '', mobile: '', email: '', address: '', isRegistered: false };
  quickSaving = false;

  // ── Medicine Rows ─────────────────────────────────────────────────────────
  rows = signal<MedRow[]>([]);
  taxes: any[] = [];
  uoms: any[] = [];

  // ── Summary ───────────────────────────────────────────────────────────────
  specialDiscount = signal(0);
  adjustment = signal(0);

  subTotal       = computed(() => this.rows().reduce((s, r) => s + r.quantity * r.unitPrice, 0));
  totalDiscount  = computed(() => this.rows().reduce((s, r) => s + r.discountAmount, 0));
  totalTax       = computed(() => this.rows().reduce((s, r) => s + r.taxAmount, 0));
  grandTotal     = computed(() =>
    parseFloat((this.subTotal() - this.totalDiscount() + this.totalTax() - this.specialDiscount()).toFixed(2)));

  // ── Payment ───────────────────────────────────────────────────────────────
  payments = signal<PayRow[]>([
    { method: 'Cash', amount: 0, accountNumber: '', transactionId: '', remarks: '', showRef: false }
  ]);
  splitEnabled = false;

  totalPaid   = computed(() => this.payments().reduce((s, p) => s + (p.amount || 0), 0));
  changeAmt   = computed(() => parseFloat(Math.max(0, this.totalPaid() - this.grandTotal()).toFixed(2)));
  dueAmount   = computed(() => parseFloat(Math.max(0, this.grandTotal() - this.totalPaid()).toFixed(2)));

  // Helper for template because spread operator isn't allowed in expressions
  triggerPaymentsUpdate() {
    this.payments.set([...this.payments()]);
  }

  // Pulse effect for grand total
  grandTotalPulse = signal(false);
  activeRowIndex = signal<number | null>(null);
  private lastTotal = 0;

  // ── UI State ──────────────────────────────────────────────────────────────
  saving = false;
  editSaleId: number | null = null;

  // ── Payment Methods ──────────────────────────────────────────────────────
  paymentMethods = [
    { label: 'Cash', icon: 'pi-money-bill' },
    { label: 'Mobile Banking', icon: 'pi-mobile' },
    { label: 'Bank', icon: 'pi-building-columns' },
    { label: 'Card', icon: 'pi-credit-card' }
  ];
  
  private searchSubject = new Subject<string>();

  private salesService = inject(SalesService);
  private customerService = inject(CustomerService);
  private medicineService = inject(MedicineService);
  private taxService = inject(TaxService);
  private uomService = inject(UomService);
  private printService: SalesInvoicePrintService = inject(SalesInvoicePrintService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private datePipe = inject(DatePipe);

  constructor() {
    // Auto-sync grandTotal → first payment amount + pulse effect
    effect(() => {
      const total = this.grandTotal();
      if (total === this.lastTotal) return;
      this.lastTotal = total;
      
      untracked(() => {
        const ps = this.payments();
        if (ps.length === 1 && !this.splitEnabled) {
          ps[0].amount = total;
          this.payments.set([...ps]);
        }
        // Pulse animation
        this.grandTotalPulse.set(true);
        setTimeout(() => this.grandTotalPulse.set(false), 600);
      });
    });
  }

  // ── Keyboard Shortcuts ──────────────────────────────────────────────────────
  @HostListener('window:keydown', ['$event'])
  handleGlobalShortcuts(event: KeyboardEvent) {
    // F2 to focus Amount Paid
    if (event.key === 'F2') {
      event.preventDefault();
      this.focusAmountPaid();
    }
  }

  focusAmountPaid() {
    const input = document.querySelector('.pay-amount-num input') as HTMLInputElement;
    if (input) {
      input.focus();
      input.select();
    }
  }

  isPaymentSufficient() {
    return this.totalPaid() >= this.grandTotal() && this.grandTotal() > 0;
  }

  ngOnInit() {
    this.loadMeta();
    this.loadInvoiceCode();
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      const user = JSON.parse(userStr);
      this.salesBy = user.fullName || user.name || user.username || 'User';
    } else {
      this.salesBy = 'User';
    }
    this.updateTime();
    setInterval(() => this.updateTime(), 60000);

    // Check for edit mode
    this.route.params.subscribe(p => {
      if (p['id']) {
        this.editSaleId = +p['id'];
        this.loadSaleForEdit(this.editSaleId);
      } else {
        this.addRow();
      }
    });

    // Setup debounced customer search
    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(q => {
      if (!q || q.length < 1) {
        this.customerSuggestions = [];
        return;
      }
      this.customerService.search(q).subscribe({
        next: (data) => this.customerSuggestions = data,
        error: (err) => console.error('Customer Search Error', err)
      });
    });
  }

  private updateTime() {
    this.saleTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  loadMeta() {
    this.taxService.getAll().subscribe(d => this.taxes = d.filter((x: any) => x.isActive));
    this.uomService.getAll().subscribe(d => this.uoms = d);
  }

  loadInvoiceCode() {
    this.salesService.getNextInvoiceCode().subscribe(r => this.invoiceCode = r.invoiceCode);
  }

  // ── Customer Search ───────────────────────────────────────────────────────
  searchCustomer(event: any) {
    this.guestName = event.query; // Sync search query to guest name
    this.searchSubject.next(event.query);
  }

  onCustomerSelect(event: any) {
    const c: Customer = event.value ?? event;
    this.selectedCustomer = c;
    this.isRegisteredCustomer = true; // All parties are registered
    this.customerQuery = c.fullName;
    this.guestName = '';
    this.guestPhone = '';
  }

  clearCustomer() {
    this.selectedCustomer = null;
    this.isRegisteredCustomer = false;
    this.customerQuery = '';
    this.guestName = '';
    this.guestPhone = '';
  }

  openQuickCustomer() {
    this.quickCustomer = { fullName: this.customerQuery, mobile: '', email: '', address: '', isRegistered: true };
    this.showQuickCustomer = true;
  }

  saveQuickCustomer() {
    const bdPhone = /^(?:\+88|88)?01[3-9]\d{8}$/;
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!this.quickCustomer.fullName.trim()) {
      this.messageService.add({ severity: 'warn', summary: 'Required', detail: 'Customer name is required.' });
      return;
    }
    if (!this.quickCustomer.mobile?.trim()) {
      this.messageService.add({ severity: 'warn', summary: 'Required', detail: 'Mobile number is required for registration.' });
      return;
    }
    if (this.quickCustomer.mobile && !bdPhone.test(this.quickCustomer.mobile)) {
      this.messageService.add({ severity: 'error', summary: 'Invalid Mobile', detail: 'Enter valid BD number (e.g. 01XXXXXXXXX).' });
      return;
    }
    if (this.quickCustomer.email && !emailRx.test(this.quickCustomer.email)) {
      this.messageService.add({ severity: 'error', summary: 'Invalid Email', detail: 'Enter a valid email address.' });
      return;
    }

    this.quickSaving = true;
    
    // Prepare payload: send null for empty optional fields to satisfy backend validation
    const payload = {
      fullName: this.quickCustomer.fullName.trim(),
      cell: this.quickCustomer.mobile?.trim() || null,
      email: this.quickCustomer.email?.trim() || null,
      address: this.quickCustomer.address?.trim() || null,
      partyType: 'Customer',
      isActive: true
    };

    console.log('Saving Customer Payload:', payload);

    this.customerService.create(payload).subscribe({
      next: (c) => {
        this.quickSaving = false;
        this.showQuickCustomer = false;
        this.selectedCustomer = c;
        this.isRegisteredCustomer = true;
        this.customerQuery = c.fullName;
        this.messageService.add({ severity: 'success', summary: 'Customer Added', detail: `${c.fullName} added successfully!` });
      },
      error: (err) => {
        this.quickSaving = false;
        console.error('Customer Creation Error:', err);
        
        let detail = 'Failed to add customer.';
        const errorData = err?.error;
        
        if (errorData) {
          if (Array.isArray(errorData.errors)) {
            detail = errorData.errors.join(', ');
          } else if (errorData.errors && typeof errorData.errors === 'object') {
            // Handle ASP.NET Core default validation object (field: [errors])
            const vals = Object.values(errorData.errors).flat();
            if (vals.length > 0) detail = vals.join(', ');
          } else if (errorData.message) {
            detail = errorData.message;
          }
        }
        
        this.messageService.add({ severity: 'error', summary: 'Error', detail, life: 7000 });
      }
    });
  }

  // ── Medicine Rows ─────────────────────────────────────────────────────────
  private loadSaleForEdit(id: number) {
    this.salesService.getSaleById(id).subscribe({
      next: (s) => {
        this.invoiceCode = s.invoiceCode || '';
        this.saleDate = s.saleDate ? new Date(s.saleDate) : new Date();
        this.specialDiscount.set(s.specialDiscount || 0);

        // Set customer
        if (s.partyId) {
          this.customerService.getById(s.partyId).subscribe(c => {
            this.onCustomerSelect(c);
          });
        } else {
          this.guestName = s.customerName || '';
          this.guestPhone = s.customerPhone || '';
        }

        // Set payments
        if (s.salesPayments && s.salesPayments.length > 0) {
          this.splitEnabled = s.salesPayments.length > 1;
          this.payments.set(s.salesPayments.map(p => ({
            method: p.paymentMethod,
            amount: p.amount,
            accountNumber: p.accountNumber || '',
            transactionId: p.transactionId || '',
            remarks: p.remarks || '',
            showRef: p.paymentMethod !== 'Cash'
          })));
        }

        // Set rows (Load batches for each row)
        const rowTasks = s.salesDetails.map(d => {
          return this.salesService.getMedicineBatches(d.medicineId);
        });

        if (rowTasks.length > 0) {
          forkJoin(rowTasks).subscribe(allBatches => {
            const medRows: MedRow[] = s.salesDetails.map((d, i) => {
              const batches = allBatches[i];
              const selectedBatch = batches.find(b => b.batchNumber === d.batchNumber);
              return {
                medicineId: d.medicineId,
                medicineName: d.medicineName || '',
                batchNumber: d.batchNumber,
                expiryDate: d.expiryDate ? new Date(d.expiryDate) : null,
                availableQty: selectedBatch ? selectedBatch.availableQty + d.quantity : d.quantity,
                quantity: d.quantity,
                uomId: d.uomId || null,
                uomName: d.uomName || '',
                unitPrice: d.unitPrice,
                discountType: d.discountPercent > 0 ? 'percent' : 'amount',
                discountValue: d.discountPercent > 0 ? d.discountPercent : d.discountAmount,
                discountAmount: d.discountAmount,
                discountPercent: d.discountPercent,
                taxId: null,
                taxPercent: d.taxPercent,
                taxAmount: d.taxAmount,
                lineTotal: d.lineTotal,
                isNearExpiry: selectedBatch?.isNearExpiry || false,
                medicineSuggestions: [],
                batchOptions: batches
              };
            });
            this.rows.set(medRows);
          });
        }
      },
      error: (err) => this.messageService.add({ severity: 'error', summary: 'Load Error', detail: 'Failed to load sale for editing.' })
    });
  }

  addRow(): void {
    const row: MedRow = {
      medicineId: 0, medicineName: '',
      batchNumber: '', expiryDate: null, availableQty: 0,
      quantity: 1, uomId: null, uomName: '',
      unitPrice: 0,
      discountType: 'amount', discountValue: 0, discountAmount: 0, discountPercent: 0,
      taxId: null, taxPercent: 0, taxAmount: 0,
      lineTotal: 0, isNearExpiry: false,
      medicineSuggestions: [], batchOptions: [],
      medicine: null
    };
    this.rows.update(r => [...r, row]);
  }

  removeRow(i: number) {
    this.rows.update(r => { const c = [...r]; c.splice(i, 1); return c; });
  }

  searchMedicine(event: any, row: MedRow) {
    if (!event.query) return;
    this.medicineService.getMedicines({ searchText: event.query, pageNumber: 1, pageSize: 20 })
      .subscribe({
        next: res => row.medicineSuggestions = res.items,
        error: err => console.error('Medicine search error', err)
      });
  }

  onMedicineSelect(event: any, row: MedRow) {
    const med: Medicine = event.value ?? event;
    row.medicineId = med.medicineId;
    row.medicineName = med.name;
    row.unitPrice = med.salePrice || 0;
    row.uomId = null; 
    row.uomName = med.uom || '';

    // Reset row details to ensure full dependency on medicine selection
    row.batchOptions = [];
    row.batchNumber = '';
    row.expiryDate = null;
    row.availableQty = 0;
    row.quantity = 1;
    row.discountValue = 0;
    row.discountAmount = 0;
    row.discountPercent = 0;
    row.isNearExpiry = false;

    // Load FEFO batches
    this.salesService.getMedicineBatches(med.medicineId).subscribe(batches => {
      row.batchOptions = batches;
      if (batches.length > 0) {
        // Auto-select the first FEFO batch (nearest expiry)
        this.onBatchSelect(batches[0], row);
      } else {
        this.recalcRow(row);
      }
    });

    this.recalcRow(row);
  }

  onMedicineClear(row: MedRow) {
    row.medicine = null;
    row.medicineId = 0;
    row.medicineName = '';
    row.batchOptions = [];
    row.batchNumber = '';
    row.expiryDate = null;
    row.availableQty = 0;
    row.quantity = 1;
    row.unitPrice = 0;
    row.discountType = 'amount';
    row.discountValue = 0;
    row.discountAmount = 0;
    row.discountPercent = 0;
    row.taxPercent = 0;
    row.taxAmount = 0;
    row.lineTotal = 0;
    row.isNearExpiry = false;
    this.recalcRow(row);
  }

  onBatchSelect(batchOrNum: any, row: MedRow) {
    const batch = typeof batchOrNum === 'string'
      ? row.batchOptions.find(b => b.batchNumber === batchOrNum)
      : batchOrNum;

    if (!batch) return;

    row.batchNumber = batch.batchNumber;
    row.expiryDate = batch.expiryDate ? new Date(batch.expiryDate) : null;
    row.availableQty = batch.availableQty;
    row.unitPrice = batch.salePrice || row.unitPrice;
    row.isNearExpiry = batch.isNearExpiry;
    this.recalcRow(row);
    this.focusQty(row);
  }

  focusQty(row: MedRow) {
    const idx = this.rows().indexOf(row);
    if (idx === -1) return;
    setTimeout(() => {
      const inputs = document.querySelectorAll('.qty-num input');
      if (inputs[idx]) (inputs[idx] as HTMLElement).focus();
    }, 50);
  }

  adjustQty(row: MedRow, delta: number) {
    const newQty = (row.quantity || 0) + delta;
    if (newQty >= 1 && newQty <= row.availableQty) {
      row.quantity = newQty;
      this.recalcRow(row);
    }
  }

  onTaxChange(row: MedRow) {
    const t = this.taxes.find((x: any) => x.taxId === row.taxId);
    row.taxPercent = t ? t.taxRate : 0;
    this.recalcRow(row);
  }

  toggleDiscountType(row: MedRow) {
    row.discountType = row.discountType === 'amount' ? 'percent' : 'amount';
    row.discountValue = 0;
    this.recalcRow(row);
  }

  recalcRow(row: MedRow) {
    const gross = row.quantity * row.unitPrice;
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
    this.rows.set([...this.rows()]);
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      const target = event.target as HTMLElement;
      // Only add row if we are in the last medicine row and it's a numeric field or similar
      const lastRow = this.rows()[this.rows().length - 1];
      if (lastRow.medicineId) {
        this.addRow();
        // Prevent default to avoid form submission if any
        event.preventDefault();
      }
    }
  }

  // ── Payment ───────────────────────────────────────────────────────────────
  setMethod(pm: PayRow, method: string) {
    pm.method = method;
    pm.showRef = method !== 'Cash';
    this.payments.set([...this.payments()]);
  }

  addPayment() {
    this.payments.update(p => [...p, { method: 'Cash', amount: 0, accountNumber: '', transactionId: '', remarks: '', showRef: false }]);
  }

  removePayment(i: number) {
    if (this.payments().length > 1)
      this.payments.update(p => { const c = [...p]; c.splice(i, 1); return c; });
  }

  // ── Build Payload ─────────────────────────────────────────────────────────
  private buildPayload(): SaleMaster {
    return {
      saleId: this.editSaleId ?? undefined,
      partyId: this.selectedCustomer?.partyId ?? null,
      customerName: this.selectedCustomer?.fullName || this.guestName || 'Walking Guest',
      customerPhone: this.selectedCustomer?.cell || this.guestPhone,
      customerIsRegistered: this.isRegisteredCustomer,
      saleDate: this.datePipe.transform(this.saleDate, 'yyyy-MM-dd') || '',
      subTotal: this.subTotal(),
      totalDiscount: this.totalDiscount(),
      totalTax: this.totalTax(),
      specialDiscount: this.specialDiscount(),
      grandTotal: this.grandTotal(),
      paidAmount: this.totalPaid(),
      changeAmount: this.changeAmt(),
      dueAmount: this.dueAmount(),
      paymentMethod: this.payments()[0]?.method || 'Cash',
      salesDetails: this.rows().map(r => ({
        medicineId: r.medicineId,
        medicineName: r.medicineName,
        batchNumber: r.batchNumber,
        expiryDate: r.expiryDate ? this.datePipe.transform(r.expiryDate, 'yyyy-MM-dd') : null,
        quantity: r.quantity,
        uomId: r.uomId,
        uomName: r.uomName,
        unitPrice: r.unitPrice,
        discountPercent: r.discountPercent,
        discountAmount: r.discountAmount,
        taxPercent: r.taxPercent,
        taxAmount: r.taxAmount,
        lineTotal: r.lineTotal
      })),
      salesPayments: this.payments()
        .filter(p => p.amount > 0)
        .map(p => ({
          paymentMethod: p.method,
          amount: p.amount,
          accountNumber: p.accountNumber || undefined,
          transactionId: p.transactionId || undefined,
          remarks: p.remarks || undefined
        }))
    };
  }

  // ── Validation ────────────────────────────────────────────────────────────
  private validate(): boolean {
    const rows = this.rows();
    if (rows.length === 0 || !rows[0].medicineId) {
      this.messageService.add({ severity: 'warn', summary: 'Required', detail: 'Please add at least one medicine.' });
      return false;
    }
    for (const r of rows) {
      if (!r.medicineId) {
        this.messageService.add({ severity: 'warn', summary: 'Required', detail: 'Please select a medicine for each row.' });
        return false;
      }
      if (!r.batchNumber) {
        this.messageService.add({ severity: 'warn', summary: 'Required', detail: `Please select a batch for ${r.medicineName || 'a medicine'}.` });
        return false;
      }
      if (r.quantity > r.availableQty) {
        this.messageService.add({ severity: 'error', summary: 'Stock Error', detail: `Qty (${r.quantity}) exceeds available stock (${r.availableQty}) for ${r.medicineName}.`, life: 5000 });
        return false;
      }
    }
    if (this.dueAmount() > 0 && !this.isRegisteredCustomer) {
      this.messageService.add({ severity: 'error', summary: 'Due Not Allowed', detail: 'Cannot leave Due for a Walking Guest. Please collect full payment or register the customer.', life: 6000 });
      return false;
    }
    return true;
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  completeSale(shouldPrint = false) {
    if (!this.validate()) return;

    this.saving = true;
    this.salesService.createSale(this.buildPayload()).subscribe({
      next: (res) => {
        this.saving = false;
        this.messageService.add({ severity: 'success', summary: 'Sale Completed!', detail: `Invoice ${res.invoiceCode} saved.` });
        
        const payloadWithUser = { ...res, createdBy: this.salesBy };

        if (shouldPrint) {
          this.confirmationService.confirm({
            message: 'Sale saved successfully! Would you like to view the Invoice Preview?',
            header: 'Print Confirmation',
            icon: 'pi pi-print',
            acceptLabel: 'View & Print',
            rejectLabel: 'Skip',
            accept: () => {
              this.printService.generatePDF(payloadWithUser);
              setTimeout(() => this.router.navigate(['/dashboard/sales']), 1000);
            },
            reject: () => {
              this.router.navigate(['/dashboard/sales']);
            }
          });
        } else {
          setTimeout(() => this.router.navigate(['/dashboard/sales']), 1200);
        }
      },
      error: (err) => {
        this.saving = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'Failed to save sale.', life: 5000 });
      }
    });
  }

  holdSale() {
    if (!this.validate()) return;
    this.confirmationService.confirm({
      message: 'Do you want to save this sale as Hold? Stock will NOT be deducted.',
      header: 'Hold Sale',
      icon: 'pi pi-pause-circle',
      accept: () => {
        this.saving = true;
        this.salesService.holdSale(this.buildPayload()).subscribe({
          next: (res) => {
            this.saving = false;
            this.messageService.add({ severity: 'info', summary: 'Sale Held', detail: `Invoice ${res.invoiceCode} held. Resume from Sales List.` });
            setTimeout(() => this.router.navigate(['/dashboard/sales']), 1500);
          },
          error: (err) => {
            this.saving = false;
            this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'Failed to hold sale.', life: 5000 });
          }
        });
      }
    });
  }

  cancelSale() {
    this.confirmationService.confirm({
      message: 'Are you sure you want to cancel? All unsaved data will be lost.',
      header: 'Cancel Sale',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.router.navigate(['/dashboard/sales'])
    });
  }

  goBack() { this.router.navigate(['/dashboard/sales']); }

  expiryLabel(date: Date | null): string {
    if (!date) return '—';
    return this.datePipe.transform(date, 'MMM-yy') || '—';
  }
}
