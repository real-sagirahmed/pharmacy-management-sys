import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CommonStrength {
  commonStrengthId: number;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class CommonStrengthService {
  private apiUrl = `${environment.apiUrl}/CommonStrengths`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<CommonStrength[]> {
    return this.http.get<CommonStrength[]>(this.apiUrl);
  }

  getById(id: number): Observable<CommonStrength> {
    return this.http.get<CommonStrength>(`${this.apiUrl}/${id}`);
  }

  create(commonStrength: CommonStrength): Observable<CommonStrength> {
    return this.http.post<CommonStrength>(this.apiUrl, commonStrength);
  }

  update(id: number, commonStrength: CommonStrength): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, commonStrength);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getNextCode(prefix: string): Observable<{code: string}> {
    return this.http.get<{code: string}>(`${this.apiUrl}/next-code/${prefix}`);
  }
}
