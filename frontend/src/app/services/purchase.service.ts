import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PurchasePayment {
  purchasePaymentId?: number;
  purchaseId?: number;
  paymentMethod: string;   // Cash | MobileBanking | Bank | Card
  amount: number;
  accountNumber?: string;
  transactionId?: string;
  remarks?: string;
}

export interface PurchaseDetail {
  purchaseDetailId?: number;
  medicineId: number;
  medicineName?: string;
  batchNumber: string;
  expiryDate?: string | null;
  quantity: number;
  uomId?: number | null;
  uomName: string;
  unitCost: number;
  discountPercent: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  salePrice: number;
  lineTotal: number;
}

export interface PurchaseMaster {
  purchaseId?: number;
  grnCode?: string;
  supplierId: number;
  supplierName?: string;
  supplierPhone?: string;
  invoiceNumber: string;
  invoiceDate?: string | null;
  purchaseDate: string;
  subTotal: number;
  totalDiscount: number;
  totalTax: number;
  adjustment: number;
  grandTotal: number;
  paidAmount: number;
  dueAmount?: number;
  paymentStatus?: string;
  purchaseDetails: PurchaseDetail[];
  purchasePayments: PurchasePayment[];
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export interface PurchaseSearchParameters {
  searchText?: string;
  fromDate?: string;
  toDate?: string;
  pageNumber: number;
  pageSize: number;
}

@Injectable({ providedIn: 'root' })
export class PurchaseService {
  private apiUrl = `${environment.apiUrl}/Purchases`;

  constructor(private http: HttpClient) {}

  getNextGrnCode(): Observable<{ grnCode: string }> {
    return this.http.get<{ grnCode: string }>(`${this.apiUrl}/next-grn`);
  }

  getPurchasesPaged(params: PurchaseSearchParameters): Observable<PagedResult<PurchaseMaster>> {
    return this.http.get<PagedResult<PurchaseMaster>>(`${this.apiUrl}/paged`, { params: params as any });
  }

  getPurchaseById(id: number): Observable<PurchaseMaster> {
    return this.http.get<PurchaseMaster>(`${this.apiUrl}/${id}`);
  }

  createPurchase(purchase: PurchaseMaster): Observable<PurchaseMaster> {
    return this.http.post<PurchaseMaster>(this.apiUrl, purchase);
  }

  deletePurchase(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
