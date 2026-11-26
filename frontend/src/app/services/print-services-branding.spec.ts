import { TestBed } from '@angular/core/testing';
import { DatePipe } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import jsPDF from 'jspdf';
import { SalesInvoicePrintService } from './invoice-print.service';
import { GrnPrintService } from './grn-print.service';
import { MoneyReceiptService } from '../components/due-collection/money-receipt.service';
import { TenantConfigService } from './tenant-config.service';
import { SaleMaster } from './sales.service';

describe('Dynamic White-Label PDF Print Services (GAP-23)', () => {
  let tenantConfig: TenantConfigService;
  let httpMock: HttpTestingController;
  let invoicePrint: SalesInvoicePrintService;
  let grnPrint: GrnPrintService;
  let moneyReceipt: MoneyReceiptService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [DatePipe, provideHttpClient(), provideHttpClientTesting()]
    });
    tenantConfig = TestBed.inject(TenantConfigService);
    httpMock = TestBed.inject(HttpTestingController);
    invoicePrint = TestBed.inject(SalesInvoicePrintService);
    grnPrint = TestBed.inject(GrnPrintService);
    moneyReceipt = TestBed.inject(MoneyReceiptService);

    tenantConfig.loadConfig().subscribe();
    httpMock.expectOne(r => r.url.endsWith('/tenants/config')).flush({
      tenantId: 5,
      pharmacyName: 'Unity Health Mart',
      tagline: 'Care You Can Trust',
      headOfficeAddress: 'Mirpur 10, Dhaka',
      phone: '01811223344',
      drugLicenseNo: 'DL-778899',
      invoiceFooter: 'Wishing you speedy recovery!',
      primaryColor: '#1e40af',
      branches: []
    });

    spyOn(window, 'open').and.returnValue(null);
    spyOn(HTMLAnchorElement.prototype, 'click').and.stub();
    if (typeof (jsPDF as any).API?.save === 'function') {
      spyOn((jsPDF as any).API, 'save').and.stub();
    }
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('SalesInvoicePrintService should pull dynamic tenant branding via getPrintBranding()', () => {
    const spy = spyOn(tenantConfig, 'getPrintBranding').and.callThrough();
    const sale: SaleMaster = {
      invoiceCode: 'INV-101',
      customerName: 'Walk-in',
      saleDate: '2026-11-26',
      subTotal: 100,
      totalDiscount: 0,
      totalTax: 0,
      specialDiscount: 0,
      grandTotal: 100,
      paidAmount: 100,
      changeAmount: 0,
      dueAmount: 0,
      paymentMethod: 'Cash',
      salesDetails: [],
      salesPayments: []
    };

    invoicePrint.generatePDF(sale);
    expect(spy).toHaveBeenCalledTimes(1);
    const brand = spy.calls.mostRecent().returnValue;
    expect(brand.pharmacyName).toBe('Unity Health Mart');
    expect(brand.drugLicenseNo).toBe('DL-778899');
    expect(brand.primaryRgb).toEqual([30, 64, 175]);
  });

  it('GrnPrintService and MoneyReceiptService should pull dynamic tenant branding via getPrintBranding()', () => {
    const spy = spyOn(tenantConfig, 'getPrintBranding').and.callThrough();

    grnPrint.generatePDF({
      grnCode: 'GRN-0001',
      purchaseDate: '2026-11-26',
      subTotal: 200,
      totalDiscount: 0,
      totalTax: 0,
      adjustment: 0,
      grandTotal: 200,
      paidAmount: 200,
      purchaseDetails: []
    });
    expect(spy).toHaveBeenCalledTimes(1);

    moneyReceipt.generateReceipt(
      { saleId: 1, invoiceCode: 'INV-101', customerName: 'Karim' },
      [{ paymentMethod: 'Cash', amount: 50 }],
      'Sales'
    );
    expect(spy).toHaveBeenCalledTimes(2);
  });
});
