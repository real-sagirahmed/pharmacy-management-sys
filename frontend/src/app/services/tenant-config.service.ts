import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';

export interface BranchInfo {
  branchId: number;
  branchName: string;
  branchCode?: string;
  isHeadOffice: boolean;
  isActive: boolean;
  phone?: string;
  address?: string;
}

export interface TenantConfig {
  tenantId: number;
  pharmacyName: string;
  tagline?: string;
  logoPath?: string;
  primaryColor?: string;
  subscriptionPlan?: string;
  currentBranch?: BranchInfo;
  branches?: BranchInfo[];
}

@Injectable({
  providedIn: 'root'
})
export class TenantConfigService {
  // Signals for reactive state
  private configSignal = signal<TenantConfig | null>(null);
  private selectedBranchSignal = signal<BranchInfo | null>(null);

  // Read-only computed signals
  public config = computed(() => this.configSignal());
  public pharmacyName = computed(() => this.configSignal()?.pharmacyName || 'S7 Drug House');
  public tagline = computed(() => this.configSignal()?.tagline || 'Universal Pharmacy System');
  public logoUrl = computed(() => {
    const path = this.configSignal()?.logoPath;
    if (!path) return '/s7-logo-mark.svg';
    const baseUrl = environment.apiUrl.replace('/api', '');
    return `${baseUrl}${path}`;
  });
  public selectedBranch = computed(() => this.selectedBranchSignal());
  public availableBranches = computed(() => this.configSignal()?.branches || []);

  constructor(private http: HttpClient) {
    // Attempt to restore cached config on startup
    const cached = localStorage.getItem('tenant_config');
    if (cached) {
      try {
        const parsed: TenantConfig = JSON.parse(cached);
        this.configSignal.set(parsed);
        if (parsed.currentBranch) {
          this.selectedBranchSignal.set(parsed.currentBranch);
        }
        this.applyBranding(parsed);
      } catch {}
    }
  }

  loadConfig(): Observable<TenantConfig | null> {
    return this.http.get<TenantConfig>(`${environment.apiUrl}/tenants/config`).pipe(
      tap((cfg) => {
        this.configSignal.set(cfg);
        localStorage.setItem('tenant_config', JSON.stringify(cfg));
        
        // Default selected branch
        if (cfg.currentBranch) {
          this.selectedBranchSignal.set(cfg.currentBranch);
        } else if (cfg.branches && cfg.branches.length > 0) {
          const ho = cfg.branches.find(b => b.isHeadOffice) || cfg.branches[0];
          this.selectedBranchSignal.set(ho);
        }

        this.applyBranding(cfg);
      }),
      catchError((err) => {
        console.warn('Could not load tenant config, using defaults:', err);
        return of(null);
      })
    );
  }

  switchBranch(branch: BranchInfo): void {
    this.selectedBranchSignal.set(branch);
    const current = this.configSignal();
    if (current) {
      current.currentBranch = branch;
      this.configSignal.set({ ...current });
      localStorage.setItem('tenant_config', JSON.stringify(current));
    }
  }

  private applyBranding(cfg: TenantConfig): void {
    if (cfg.pharmacyName) {
      document.title = `${cfg.pharmacyName} - Pharmacy Management`;
    }
    if (cfg.primaryColor && cfg.primaryColor.startsWith('#')) {
      document.documentElement.style.setProperty('--brand', cfg.primaryColor);
      document.documentElement.style.setProperty('--primary', cfg.primaryColor);
    }
  }

  clearConfig(): void {
    this.configSignal.set(null);
    this.selectedBranchSignal.set(null);
    localStorage.removeItem('tenant_config');
    document.title = 'S7 Drug House - Pharmacy Management';
  }
}
