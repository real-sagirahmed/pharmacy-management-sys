import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import {
  TenantConfigService,
  TenantConfig,
  SELECTED_BRANCH_STORAGE_KEY,
  computeBrandTokens
} from './tenant-config.service';

describe('TenantConfigService & Brand Tokens (GAP-08 / GAP-22 / GAP-23)', () => {
  let service: TenantConfigService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(TenantConfigService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should compute canonical and derived CSS tokens for custom hex colors', () => {
    const canonical = computeBrandTokens('#007070');
    expect(canonical.brand).toBe('#007070');
    expect(canonical.brandHover).toBe('#005858');
    expect(canonical.brandGlow).toBe('rgba(0, 112, 112, 0.20)');

    const custom = computeBrandTokens('#1d4ed8');
    expect(custom.brand).toBe('#1D4ED8');
    expect(custom.brandHover).not.toBe('#005858');
    expect(custom.brandGlow).toBe('rgba(29, 78, 216, 0.20)');

    const fallback = computeBrandTokens('invalid-hex');
    expect(fallback.brand).toBe('#007070');
  });

  it('should apply CSS tokens, resolve branch print branding, and reset on clearConfig()', () => {
    const mockConfig: TenantConfig = {
      tenantId: 2,
      pharmacyName: 'Green Care Pharmacy',
      tagline: 'Trusted Multi-Branch Care',
      headOfficeAddress: 'Banani Road 11, Dhaka',
      phone: '01711000222',
      drugLicenseNo: 'DL-9988-T2',
      invoiceFooter: 'Get well soon!',
      primaryColor: '#1d4ed8',
      canAccessAllBranches: true,
      branches: [
        { branchId: 10, branchName: 'Banani HQ', isHeadOffice: true, isActive: true, address: 'Banani HQ Rd', phone: '01700000001' },
        { branchId: 11, branchName: 'Uttara Branch', isHeadOffice: false, isActive: true, address: 'Sector 7, Uttara', phone: '01800000002' }
      ]
    };

    service.loadConfig().subscribe();
    const req = httpMock.expectOne(r => r.url.endsWith('/tenants/config'));
    req.flush(mockConfig);

    expect(service.pharmacyName()).toBe('Green Care Pharmacy');
    expect(document.documentElement.style.getPropertyValue('--brand')).toBe('#1D4ED8');
    expect(document.documentElement.style.getPropertyValue('--brand-glow')).toBe('rgba(29, 78, 216, 0.20)');
    expect(service.availableBranches().length).toBe(3); // All Branches + 2 branches

    // Switch to Uttara Branch -> getPrintBranding prefers branch address/phone & DL
    service.switchBranch(mockConfig.branches![1]);
    expect(localStorage.getItem(SELECTED_BRANCH_STORAGE_KEY)).toBe('11');

    const printMeta = service.getPrintBranding();
    expect(printMeta.pharmacyName).toBe('Green Care Pharmacy');
    expect(printMeta.branchName).toBe('Uttara Branch');
    expect(printMeta.address).toBe('Sector 7, Uttara');
    expect(printMeta.drugLicenseNo).toBe('DL-9988-T2');
    expect(printMeta.primaryRgb).toEqual([29, 78, 216]);

    // Clear resets back to default white-label state & canonical S7 CSS tokens
    service.clearConfig();
    expect(service.pharmacyName()).toBe('Pharmacy Management System');
    expect(localStorage.getItem(SELECTED_BRANCH_STORAGE_KEY)).toBeNull();
    expect(document.documentElement.style.getPropertyValue('--brand')).toBe('#007070');
  });
});
