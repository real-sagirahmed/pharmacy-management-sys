import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';

export const SELECTED_BRANCH_STORAGE_KEY = 'selected_branch_id';

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
  slogan?: string;
  headOfficeAddress?: string;
  phone?: string;
  email?: string;
  drugLicenseNo?: string;
  logoPath?: string;
  invoiceFooter?: string;
  primaryColor?: string;
  subscriptionPlan?: string;
  subscriptionExpiry?: string;
  canAccessAllBranches?: boolean;
  currentBranch?: BranchInfo | null;
  branches?: BranchInfo[];
}

const ALL_BRANCHES_OPTION: BranchInfo = {
  branchId: 0,
  branchName: 'All Branches',
  isHeadOffice: false,
  isActive: true
};

export interface BrandTokens {
  brand: string;
  brandHover: string;
  brandSoft: string;
  brandGlow: string;
  brandBadgeBg: string;
  brandBadgeBorder: string;
}

export interface PrintBranding {
  pharmacyName: string;
  tagline: string;
  branchName: string;
  address: string;
  phone: string;
  drugLicenseNo: string;
  invoiceFooter: string;
  primaryRgb: [number, number, number];
}

const DEFAULT_BRAND_HEX = '#007070';

function parseHexToRgb(hex?: string | null): { hex: string; r: number; g: number; b: number } {
  const cleaned = (hex || '').trim().replace(/^#/, '');
  let full = '';
  if (/^[0-9a-fA-F]{3}$/.test(cleaned)) {
    full = cleaned.split('').map(c => c + c).join('');
  } else if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    full = cleaned;
  } else {
    full = DEFAULT_BRAND_HEX.slice(1);
  }
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return { hex: `#${full.toUpperCase()}`, r, g, b };
}

function toHexChannel(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0').toUpperCase();
}

export function computeBrandTokens(primaryColor?: string | null): BrandTokens {
  const { hex, r, g, b } = parseHexToRgb(primaryColor);
  const hoverR = toHexChannel(r * 0.785);
  const hoverG = toHexChannel(g * 0.785);
  const hoverB = toHexChannel(b * 0.785);
  const softR = toHexChannel(255 * 0.90 + r * 0.10);
  const softG = toHexChannel(255 * 0.90 + g * 0.10);
  const softB = toHexChannel(255 * 0.90 + b * 0.10);
  return {
    brand: hex,
    brandHover: `#${hoverR}${hoverG}${hoverB}`,
    brandSoft: `#${softR}${softG}${softB}`,
    brandGlow: `rgba(${r}, ${g}, ${b}, 0.20)`,
    brandBadgeBg: `rgba(${r}, ${g}, ${b}, 0.35)`,
    brandBadgeBorder: `rgba(${r}, ${g}, ${b}, 0.50)`
  };
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
  public pharmacyName = computed(() => this.configSignal()?.pharmacyName || 'Pharmacy Management System');
  public tagline = computed(() => this.configSignal()?.tagline || this.configSignal()?.slogan || 'Universal Pharmacy System');
  public logoUrl = computed(() => {
    const path = this.configSignal()?.logoPath;
    if (!path) return '/s7-logo-mark.svg';
    const baseUrl = environment.apiUrl.replace('/api', '');
    return `${baseUrl}${path}`;
  });
  public selectedBranch = computed(() => this.selectedBranchSignal());
  public availableBranches = computed(() => {
    const cfg = this.configSignal();
    const raw = cfg?.branches || [];
    if (cfg?.canAccessAllBranches && raw.length > 1) {
      return [ALL_BRANCHES_OPTION, ...raw];
    }
    return raw;
  });

  constructor(private http: HttpClient) {
    // Restore cached config & selected branch safely on startup
    const cached = localStorage.getItem('tenant_config');
    if (cached) {
      try {
        const parsed: TenantConfig = JSON.parse(cached);
        this.configSignal.set(parsed);
        if (parsed.currentBranch) {
          this.selectedBranchSignal.set(parsed.currentBranch);
        } else if (parsed.canAccessAllBranches && (parsed.branches?.length || 0) > 1) {
          this.selectedBranchSignal.set(ALL_BRANCHES_OPTION);
        }
        this.applyBranding(parsed);
      } catch {
        this.applyBranding(null);
      }
    } else {
      this.applyBranding(null);
    }
  }

  loadConfig(): Observable<TenantConfig | null> {
    return this.http.get<TenantConfig>(`${environment.apiUrl}/tenants/config`).pipe(
      tap((cfg) => {
        const prevTenantId = this.configSignal()?.tenantId;
        if (prevTenantId && prevTenantId !== cfg.tenantId) {
          localStorage.removeItem(SELECTED_BRANCH_STORAGE_KEY);
        }

        const rawBranches = cfg.branches || [];
        let activeBranch: BranchInfo | null = null;

        if (cfg.currentBranch) {
          activeBranch = cfg.currentBranch;
        } else if (cfg.canAccessAllBranches && rawBranches.length > 1) {
          activeBranch = ALL_BRANCHES_OPTION;
        } else if (rawBranches.length > 0) {
          activeBranch = rawBranches.find(b => b.isHeadOffice) || rawBranches[0];
        }

        const normalized: TenantConfig = { ...cfg, currentBranch: activeBranch };
        this.configSignal.set(normalized);
        this.selectedBranchSignal.set(activeBranch);
        localStorage.setItem('tenant_config', JSON.stringify(normalized));

        if (activeBranch && activeBranch.branchId > 0) {
          localStorage.setItem(SELECTED_BRANCH_STORAGE_KEY, String(activeBranch.branchId));
        } else {
          localStorage.removeItem(SELECTED_BRANCH_STORAGE_KEY);
        }

        this.applyBranding(normalized);
      }),
      catchError((err) => {
        console.warn('Could not load tenant config, using defaults:', err);
        return of(null);
      })
    );
  }

  switchBranch(branch: BranchInfo): void {
    this.selectedBranchSignal.set(branch);
    if (branch.branchId > 0) {
      localStorage.setItem(SELECTED_BRANCH_STORAGE_KEY, String(branch.branchId));
    } else {
      localStorage.removeItem(SELECTED_BRANCH_STORAGE_KEY);
    }

    const current = this.configSignal();
    if (current) {
      const updated = { ...current, currentBranch: branch };
      this.configSignal.set(updated);
      localStorage.setItem('tenant_config', JSON.stringify(updated));
    }
  }

  private applyBranding(cfg: Partial<TenantConfig> | null): void {
    document.title = cfg?.pharmacyName
      ? `${cfg.pharmacyName} — Pharmacy Management System`
      : 'Pharmacy Management System';

    const tokens = computeBrandTokens(cfg?.primaryColor);
    const root = document.documentElement.style;
    root.setProperty('--brand', tokens.brand);
    root.setProperty('--primary', tokens.brand);
    root.setProperty('--brand-hover', tokens.brandHover);
    root.setProperty('--brand-soft', tokens.brandSoft);
    root.setProperty('--brand-glow', tokens.brandGlow);
    root.setProperty('--brand-badge-bg', tokens.brandBadgeBg);
    root.setProperty('--brand-badge-border', tokens.brandBadgeBorder);
    root.setProperty('--s7-focus-ring', tokens.brand);

    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) {
      themeMeta.setAttribute('content', tokens.brand);
    }
  }

  /**
   * Shared white-label PDF & receipt header/footer metadata resolved from active tenant & branch.
   */
  getPrintBranding(): PrintBranding {
    const cfg = this.configSignal();
    const branch = this.selectedBranchSignal();
    const activeBranch = branch && branch.branchId > 0 ? branch : null;
    const rgb = parseHexToRgb(cfg?.primaryColor);

    return {
      pharmacyName: cfg?.pharmacyName || 'Pharmacy Management System',
      tagline: cfg?.tagline || cfg?.slogan || 'Universal Pharmacy System',
      branchName: activeBranch?.branchName || '',
      address: activeBranch?.address || cfg?.headOfficeAddress || '',
      phone: activeBranch?.phone || cfg?.phone || '',
      drugLicenseNo: cfg?.drugLicenseNo || '',
      invoiceFooter: cfg?.invoiceFooter || 'Thank you for your business!',
      primaryRgb: [rgb.r, rgb.g, rgb.b]
    };
  }

  clearConfig(): void {
    this.configSignal.set(null);
    this.selectedBranchSignal.set(null);
    localStorage.removeItem('tenant_config');
    localStorage.removeItem(SELECTED_BRANCH_STORAGE_KEY);
    this.applyBranding(null);
  }
}
