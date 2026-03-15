import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DosageForm {
  dosageFormId: number;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class DosageFormService {
  private apiUrl = `${environment.apiUrl}/DosageForms`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<DosageForm[]> {
    return this.http.get<DosageForm[]>(this.apiUrl);
  }

  getById(id: number): Observable<DosageForm> {
    return this.http.get<DosageForm>(`${this.apiUrl}/${id}`);
  }

  create(dosageForm: DosageForm): Observable<DosageForm> {
    return this.http.post<DosageForm>(this.apiUrl, dosageForm);
  }

  update(id: number, dosageForm: DosageForm): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, dosageForm);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getNextCode(prefix: string): Observable<{code: string}> {
    return this.http.get<{code: string}>(`${this.apiUrl}/next-code/${prefix}`);
  }
}
