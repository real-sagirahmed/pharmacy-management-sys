import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Medicine {
  medicineId: number;
  name: string;
  genericName: string;
  category: string;
  price: number;
  stockQuantity: number;
  expiryDate: string;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class MedicineService {
  private apiUrl = `${environment.apiUrl}/Medicines`;

  constructor(private http: HttpClient) { }

  getMedicines(): Observable<Medicine[]> {
    return this.http.get<Medicine[]>(this.apiUrl);
  }

  getMedicine(id: number): Observable<Medicine> {
    return this.http.get<Medicine>(`${this.apiUrl}/${id}`);
  }

  createMedicine(medicine: Medicine): Observable<Medicine> {
    return this.http.post<Medicine>(this.apiUrl, medicine);
  }

  updateMedicine(id: number, medicine: Medicine): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, medicine);
  }

  deleteMedicine(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
