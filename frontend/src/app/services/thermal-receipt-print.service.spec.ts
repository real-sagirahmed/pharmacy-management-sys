import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ThermalReceiptPrintService } from './thermal-receipt-print.service';
import { TenantConfigService } from './tenant-config.service';
import { SaleMaster } from './sales.service';

describe('ThermalReceiptPrintService (GAP-24)', () => {
  let service: ThermalReceiptPrintService;
  let tenantConfig: TenantConfigService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    tenantConfig = TestBed.inject(TenantConfigService);
    service = TestBed.inject(ThermalReceiptPrintService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should generate 80mm Bengali print CSS, dynamic DL header, and escape HTML', () => {
    tenantConfig.loadConfig().subscribe();
    httpMock.expectOne(r => r.url.endsWith('/tenants/config')).flush({
      tenantId: 3,
      pharmacyName: 'Bangla Meds <VIP>',
      slogan: 'সেবাই আমাদের লক্ষ্য',
      headOfficeAddress: 'Dhanmondi 27',
      phone: '01712345678',
      drugLicenseNo: 'DL-445566',
      invoiceFooter: 'ধন্যবাদ আবার আসবেন',
      primaryColor: '#0f766e',
      branches: []
    });

    const sale: SaleMaster = {
      invoiceCode: 'INV20261126-1',
      customerName: 'Test <script>alert(1)</script>',
      customerPhone: '01700000000',
      saleDate: '2026-11-26',
      subTotal: 100,
      totalDiscount: 10,
      totalTax: 5,
      specialDiscount: 0,
      grandTotal: 95,
      paidAmount: 100,
      changeAmount: 5,
      dueAmount: 0,
      paymentMethod: 'Cash',
      salesDetails: [
        {
          medicineId: 1,
          medicineName: 'Napa Extra 500mg',
          batchNumber: 'BN-01',
          quantity: 2,
          uomName: 'Strip',
          unitPrice: 50,
          discountPercent: 10,
          discountAmount: 10,
          taxPercent: 5,
          taxAmount: 5,
          lineTotal: 95
        }
      ],
      salesPayments: [{ paymentMethod: 'Cash', amount: 100 }]
    };

    const html = service.buildReceiptHtml(sale);
    expect(html).toContain('size: 80mm auto');
    expect(html).toContain('Noto Sans Bengali');
    expect(html).toContain('DL-445566');
    expect(html).toContain('ধন্যবাদ আবার আসবেন');
    expect(html).toContain('Bangla Meds &lt;VIP&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });
});
