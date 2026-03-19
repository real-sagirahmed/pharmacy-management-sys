import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private apiUrl = `${environment.apiUrl}/Reports`;

  constructor(private http: HttpClient) {}

  getSalesSummary(startDate: string, endDate: string): Observable<any[]> {
    const params = new HttpParams().set('startDate', startDate).set('endDate', endDate);
    return this.http.get<any[]>(`${this.apiUrl}/sales-summary`, { params });
  }

  getPurchaseSummary(startDate: string, endDate: string): Observable<any[]> {
    const params = new HttpParams().set('startDate', startDate).set('endDate', endDate);
    return this.http.get<any[]>(`${this.apiUrl}/purchase-summary`, { params });
  }

  getStockStatus(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/stock-status`);
  }

  getProfitLoss(startDate: string, endDate: string): Observable<any> {
    const params = new HttpParams().set('startDate', startDate).set('endDate', endDate);
    return this.http.get<any>(`${this.apiUrl}/profit-loss`, { params });
  }

  getExpiryReport(months: number = 6): Observable<any[]> {
    const params = new HttpParams().set('months', months.toString());
    return this.http.get<any[]>(`${this.apiUrl}/expiry`, { params });
  }

  getTopSellingMedicines(startDate: string, endDate: string, count: number = 20): Observable<any[]> {
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate)
      .set('count', count.toString());
    return this.http.get<any[]>(`${this.apiUrl}/top-selling`, { params });
  }

  getLowStockReport(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/low-stock`);
  }

  getLedgerReport(partyId: number, startDate: string, endDate: string): Observable<any[]> {
    const params = new HttpParams()
      .set('partyId', partyId.toString())
      .set('startDate', startDate)
      .set('endDate', endDate);
    return this.http.get<any[]>(`${this.apiUrl}/ledger`, { params });
  }

  getUserPerformanceReport(startDate: string, endDate: string): Observable<any[]> {
    const params = new HttpParams().set('startDate', startDate).set('endDate', endDate);
    return this.http.get<any[]>(`${this.apiUrl}/user-performance`, { params });
  }

  getVatReport(startDate: string, endDate: string): Observable<any[]> {
    const params = new HttpParams().set('startDate', startDate).set('endDate', endDate);
    return this.http.get<any[]>(`${this.apiUrl}/vat-report`, { params });
  }
}
