import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { SalePayment } from './sales.service';
import { PurchasePayment } from './purchase.service';

export interface DueRecord {
  saleId?: number;
  purchaseId?: number;
  grnCode?: string;
  customerName?: string;
  supplierName?: string;
  customerPhone?: string;
  saleDate?: string;
  purchaseDate?: string;
  grandTotal: number;
  paidAmount: number;
  dueAmount: number;
  paymentStatus: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private apiUrl = `${environment.apiUrl}/Payments`;

  constructor(private http: HttpClient) { }

  getSalesDues(): Observable<DueRecord[]> {
    return this.http.get<DueRecord[]>(`${this.apiUrl}/SalesDues`);
  }

  getPurchaseDues(): Observable<DueRecord[]> {
    return this.http.get<DueRecord[]>(`${this.apiUrl}/PurchaseDues`);
  }

  collectSalesDue(payment: SalePayment): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/CollectSalesDue`, payment);
  }

  payPurchaseDue(payment: PurchasePayment): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/PayPurchaseDue`, payment);
  }

  getSalesHistory(saleId: number): Observable<SalePayment[]> {
    return this.http.get<SalePayment[]>(`${this.apiUrl}/SalesHistory/${saleId}`);
  }

  getPurchaseHistory(purchaseId: number): Observable<PurchasePayment[]> {
    return this.http.get<PurchasePayment[]>(`${this.apiUrl}/PurchaseHistory/${purchaseId}`);
  }
}
