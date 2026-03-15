import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SalesDetail {
  salesDetailId?: number;
  medicineId: number;
  medicineName?: string;
  quantity: number;
  unitPrice: number;
  tax: number;
  subtotal: number;
}

export interface SalesPayment {
  salesPaymentId?: number;
  saleId: number;
  paymentMethod: string;
  amount: number;
  accountNumber?: string;
  transactionId?: string;
  remarks?: string;
  createdAt?: string;
}

export interface SalesMaster {
  saleId?: number;
  customerName: string;
  customerPhone: string;
  saleDate: string;
  grandTotal: number;
  discount: number;
  paymentMethod: string;
  paidAmount: number;
  dueAmount: number;
  paymentStatus: string;
  salesDetails: SalesDetail[];
  salesPayments?: SalesPayment[];
}

@Injectable({
  providedIn: 'root'
})
export class SalesService {
  private apiUrl = `${environment.apiUrl}/Sales`;

  constructor(private http: HttpClient) { }

  getSales(): Observable<SalesMaster[]> {
    return this.http.get<SalesMaster[]>(this.apiUrl);
  }

  createSale(sale: SalesMaster): Observable<SalesMaster> {
    return this.http.post<SalesMaster>(this.apiUrl, sale);
  }
}
