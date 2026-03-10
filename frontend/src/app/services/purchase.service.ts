import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PurchaseDetail {
  medicineId: number;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  unitCost: number;
  subtotal: number;
}

export interface PurchaseMaster {
  purchaseId?: number;
  supplierId: number;
  invoiceNumber: string;
  purchaseDate: string;
  totalAmount: number;
  purchaseDetails: PurchaseDetail[];
}

@Injectable({
  providedIn: 'root'
})
export class PurchaseService {
  private apiUrl = `${environment.apiUrl}/Purchases`;

  constructor(private http: HttpClient) { }

  getPurchases(): Observable<PurchaseMaster[]> {
    return this.http.get<PurchaseMaster[]>(this.apiUrl);
  }

  createPurchase(purchase: PurchaseMaster): Observable<PurchaseMaster> {
    return this.http.post<PurchaseMaster>(this.apiUrl, purchase);
  }
}
