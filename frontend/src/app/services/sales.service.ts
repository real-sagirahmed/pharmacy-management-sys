import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SalePayment {
  salesPaymentId?: number;
  saleId?: number;
  paymentMethod: string;  // Cash | MobileBanking | Bank | Card
  amount: number;
  accountNumber?: string;
  transactionId?: string;
  remarks?: string;
}

export interface SaleDetail {
  salesDetailId?: number;
  medicineId: number;
  medicineName?: string;
  batchNumber: string;
  expiryDate?: string | Date | null;
  quantity: number;
  uomId?: number | null;
  uomName: string;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  lineTotal: number;
  // legacy
  tax?: number;
  subtotal?: number;
}

export interface SaleMaster {
  saleId?: number;
  invoiceCode?: string;
  partyId?: number | null;
  customerName: string;
  customerPhone?: string;
  customerIsRegistered?: boolean;
  saleDate: string;
  saleTime?: string;
  subTotal: number;
  totalDiscount: number;
  totalTax: number;
  specialDiscount: number;
  grandTotal: number;
  paidAmount: number;
  changeAmount: number;
  dueAmount: number;
  paymentMethod: string;
  paymentStatus?: string;
  saleStatus?: string;
  createdBy?: string;
  salesDetails: SaleDetail[];
  salesPayments: SalePayment[];
}

export interface SaleBatchInfo {
  batchNumber: string;
  expiryDate?: string | null;
  availableQty: number;
  salePrice: number;
  isNearExpiry: boolean;
}

export interface SaleSearchParameters {
  searchText?: string;
  fromDate?: string;
  toDate?: string;
  saleStatus?: string;
  pageNumber: number;
  pageSize: number;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class SalesService {
  private apiUrl = `${environment.apiUrl}/Sales`;

  constructor(private http: HttpClient) {}

  getNextInvoiceCode(): Observable<{ invoiceCode: string }> {
    return this.http.get<{ invoiceCode: string }>(`${this.apiUrl}/next-invoice-code`);
  }

  getMedicineBatches(medicineId: number): Observable<SaleBatchInfo[]> {
    return this.http.get<SaleBatchInfo[]>(`${this.apiUrl}/medicine-batches/${medicineId}`);
  }

  getSalesPaged(params: SaleSearchParameters): Observable<PagedResult<SaleMaster>> {
    return this.http.get<PagedResult<SaleMaster>>(`${this.apiUrl}`, { params: params as any });
  }

  getSaleById(id: number): Observable<SaleMaster> {
    return this.http.get<SaleMaster>(`${this.apiUrl}/${id}`);
  }

  createSale(sale: SaleMaster): Observable<SaleMaster> {
    return this.http.post<SaleMaster>(this.apiUrl, sale);
  }

  holdSale(sale: SaleMaster): Observable<SaleMaster> {
    return this.http.post<SaleMaster>(`${this.apiUrl}/hold`, sale);
  }

  deleteSale(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
