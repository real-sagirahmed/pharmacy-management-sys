import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SearchRequest {
  searchText?: string;
  fromDate?: Date | string | null;
  toDate?: Date | string | null;
  modules?: string[];
  statuses?: string[];
}

export interface SearchResult {
  type: string;
  title: string;
  subtitle: string;
  info: string;
  routePath: string;
  timestamp?: Date | string;
}

@Injectable({
  providedIn: 'root'
})
export class GlobalSearchService {
  private apiUrl = `${environment.apiUrl}/Search`;

  constructor(private http: HttpClient) {}

  /**
   * Performs an advanced global search across all integrated ERP modules.
   * Uses POST to securely transmit complex filter objects and date ranges.
   */
  performSearch(request: SearchRequest): Observable<SearchResult[]> {
    return this.http.post<SearchResult[]>(this.apiUrl, request);
  }
}
