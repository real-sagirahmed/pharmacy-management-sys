import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentService, DueRecord } from '../../services/payment.service';
import { MessageService } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { TabsModule } from 'primeng/tabs';
import { MoneyReceiptService } from './money-receipt.service';

@Component({
  selector: 'app-due-collection',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, 
    InputTextModule, InputNumberModule, DialogModule, SelectModule, 
    ToastModule, TabsModule
  ],
  templateUrl: './due-collection.component.html',
  styleUrl: './due-collection.component.css'
})
export class DueCollectionComponent implements OnInit {
  salesDues = signal<DueRecord[]>([]);
  purchaseDues = signal<DueRecord[]>([]);
  loading = false;
  activeTab = 0; // 0: Sales, 1: Purchase

  // History state
  expandedRows: any = {};
  paymentHistory = signal<any[]>([]);
  loadingHistory = false;

  showPayDialog = false;
  selectedDue: DueRecord | null = null;
  
  // Split Payment State
  paymentRows = signal<any[]>([
    { paymentMethod: 'Cash', amount: 0, accountNumber: '', transactionId: '', remarks: '' }
  ]);
  
  saving = false;

  paymentMethods = [
    { label: 'Cash', value: 'Cash', icon: 'pi pi-money-bill' },
    { label: 'Mobile Banking', value: 'MobileBanking', icon: 'pi pi-phone' },
    { label: 'Bank', value: 'Bank', icon: 'pi pi-building' },
    { label: 'Card', value: 'Card', icon: 'pi pi-credit-card' }
  ];

  constructor(
    private paymentService: PaymentService,
    private moneyReceiptService: MoneyReceiptService,
    private messageService: MessageService
  ) { }

  ngOnInit() {
    this.loadDues();
  }

  printReceipt(record: any, payments: any[]) {
    this.moneyReceiptService.generateReceipt(record, payments, this.activeTab === 0 ? 'Sales' : 'Purchase');
  }

  printHistory(record: any) {
    if (this.paymentHistory().length > 0) {
      this.printReceipt(record, this.paymentHistory());
    } else {
      this.messageService.add({ severity: 'info', summary: 'Info', detail: 'No history to print' });
    }
  }

  loadDues() {
    this.loading = true;
    this.expandedRows = {}; // Reset expansion
    if (this.activeTab === 0) {
      this.paymentService.getSalesDues().subscribe({
        next: (res) => {
          this.salesDues.set(res);
          this.loading = false;
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load sales dues' });
          this.loading = false;
        }
      });
    } else {
      this.paymentService.getPurchaseDues().subscribe({
        next: (res) => {
          this.purchaseDues.set(res);
          this.loading = false;
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load purchase dues' });
          this.loading = false;
        }
      });
    }
  }

  onRowExpand(event: any) {
    const record = event.data;
    this.loadingHistory = true;
    this.paymentHistory.set([]);
    
    if (this.activeTab === 0) {
      this.paymentService.getSalesHistory(record.saleId).subscribe({
        next: (res) => {
          this.paymentHistory.set(res);
          this.loadingHistory = false;
        }
      });
    } else {
      this.paymentService.getPurchaseHistory(record.purchaseId).subscribe({
        next: (res) => {
          this.paymentHistory.set(res);
          this.loadingHistory = false;
        }
      });
    }
  }

  onTabChange(tabIdx: number) {
    this.activeTab = tabIdx;
    this.loadDues();
  }

  openPayDialog(due: DueRecord) {
    this.selectedDue = due;
    // Initial split payment row
    this.paymentRows.set([
      { paymentMethod: 'Cash', amount: due.dueAmount, accountNumber: '', transactionId: '', remarks: '' }
    ]);
    this.showPayDialog = true;
  }

  addPaymentRow() {
    this.paymentRows.update(rows => [...rows, { paymentMethod: 'Cash', amount: 0, accountNumber: '', transactionId: '', remarks: '' }]);
  }

  removePaymentRow(index: number) {
    if (this.paymentRows().length > 1) {
      this.paymentRows.update(rows => rows.filter((_, i) => i !== index));
    }
  }

  getTotalPaymentAmount(): number {
    return this.paymentRows().reduce((sum, row) => sum + (row.amount || 0), 0);
  }

  savePayment() {
    if (!this.selectedDue) return;

    const totalAmount = this.getTotalPaymentAmount();
    if (totalAmount <= 0) {
      this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Total payment amount must be greater than 0' });
      return;
    }

    if (totalAmount > this.selectedDue.dueAmount + 0.01) { // 0.01 for rounding
      this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Payment amount cannot exceed due amount' });
      return;
    }

    this.saving = true;
    
    // Process each payment row
    // In a real scenario, we'd want a bulk API, but for now we'll call sequentially or update backend.
    // Let's call sequentially for simplicity in this step, but in the next tool call I might update backend to handle bulk if needed.
    // Actually, let's just process them one by one for now to avoid major backend breaking changes.
    
    const observables = this.paymentRows()
      .filter(row => row.amount > 0)
      .map(row => {
        const paymentData: any = { ...row };
        if (this.activeTab === 0) {
          paymentData.saleId = this.selectedDue?.saleId;
          return this.paymentService.collectSalesDue(paymentData);
        } else {
          paymentData.purchaseId = this.selectedDue?.purchaseId;
          return this.paymentService.payPurchaseDue(paymentData);
        }
      });

    // We use forkJoin or similar to wait for all.
    // But since these affect the SAME record, sequential is safer to avoid concurrency issues with DueAmount calculation.
    this.processSequential(observables);
  }

  private processSequential(obs: any[]) {
    if (obs.length === 0) {
      this.handleSuccess();
      return;
    }

    const current = obs.shift();
    current.subscribe({
      next: () => this.processSequential(obs),
      error: (err: any) => this.handleError(err)
    });
  }

  handleSuccess() {
    this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Payment recorded successfully' });
    
    // Auto print receipt for the current collection
    if (this.selectedDue) {
      this.printReceipt(this.selectedDue, this.paymentRows().filter(r => r.amount > 0));
    }

    this.saving = false;
    this.showPayDialog = false;
    this.loadDues();
  }

  handleError(err: any) {
    this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error || 'Failed to record payment' });
    this.saving = false;
  }
}
