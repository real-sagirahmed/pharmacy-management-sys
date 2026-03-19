import { Component, OnInit, signal, computed } from '@angular/core';
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
  searchText = signal<string>('');
  loading = false;
  activeTab = 0; // 0: Sales, 1: Purchase

  // ─── Filtered Computeds ──────────────────────────────────────────────
  filteredSalesDues = computed(() => {
    const search = this.searchText().toLowerCase().trim();
    const data = this.salesDues();
    if (!search) return data;
    return data.filter(d => 
      d.customerName?.toLowerCase().includes(search) || 
      d.customerPhone?.toLowerCase().includes(search) ||
      (d as any).invoiceCode?.toLowerCase().includes(search)
    );
  });

  filteredPurchaseDues = computed(() => {
    const search = this.searchText().toLowerCase().trim();
    const data = this.purchaseDues();
    if (!search) return data;
    return data.filter(d => 
      d.supplierName?.toLowerCase().includes(search) || 
      d.grnCode?.toLowerCase().includes(search)
    );
  });

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
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load payment history' });
          this.loadingHistory = false;
        }
      });
    } else {
      this.paymentService.getPurchaseHistory(record.purchaseId).subscribe({
        next: (res) => {
          this.paymentHistory.set(res);
          this.loadingHistory = false;
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load payment history' });
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

  getTotalSalesDue(): number {
    return this.filteredSalesDues().reduce((sum, d) => sum + (d.dueAmount || 0), 0);
  }

  getTotalPurchaseDue(): number {
    return this.filteredPurchaseDues().reduce((sum, d) => sum + (d.dueAmount || 0), 0);
  }

  savePayment() {
    if (!this.selectedDue) return;

    const totalAmount = this.getTotalPaymentAmount();
    if (totalAmount <= 0) {
      this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Total payment amount must be greater than 0' });
      return;
    }

    if (totalAmount > this.selectedDue.dueAmount + 0.01) { 
      this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Payment amount cannot exceed due amount' });
      return;
    }

    this.saving = true;
    
    // Prepare bulk data
    const validPayments = this.paymentRows().filter(r => r.amount > 0);
    
    if (this.activeTab === 0) {
      const bulkData = {
        saleId: this.selectedDue.saleId!,
        payments: validPayments
      };
      this.paymentService.bulkCollectSalesDue(bulkData).subscribe({
        next: () => this.handleSuccess(),
        error: (err) => this.handleError(err)
      });
    } else {
      const bulkData = {
        purchaseId: this.selectedDue.purchaseId!,
        payments: validPayments
      };
      this.paymentService.bulkPayPurchaseDue(bulkData).subscribe({
        next: () => this.handleSuccess(),
        error: (err) => this.handleError(err)
      });
    }
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
    console.error('Payment Error:', err);
    this.messageService.add({ 
      severity: 'error', 
      summary: 'Error', 
      detail: err.error?.message || err.error || 'Failed to record payment' 
    });
    this.saving = false;
    // CRITICAL FIX: refresh dues even on error to ensure frontend state is in sync with backend partially applied states (though bulk should prevent that)
    this.loadDues(); 
  }
}
