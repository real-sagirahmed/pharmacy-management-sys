using Microsoft.EntityFrameworkCore;
using PharmacyApi.Data;
using PharmacyApi.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace PharmacyApi.Repositories
{
    public class ReportRepository : IReportRepository
    {
        private readonly ApplicationDbContext _context;
        private static readonly string _tz = "Bangladesh Standard Time";

        public ReportRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        private static DateTime BdNow() =>
            TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, TimeZoneInfo.FindSystemTimeZoneById(_tz));

        public async Task<IEnumerable<SalesSummaryReportDto>> GetSalesSummaryAsync(DateTime startDate, DateTime endDate)
        {
            var from = startDate.Date;
            var toExclusive = endDate.Date.AddDays(1);

            return await _context.SalesMasters
                .AsNoTracking()
                .Where(s => s.SaleDate >= from && s.SaleDate < toExclusive)
                .Select(s => new SalesSummaryReportDto
                {
                    Date = s.SaleDate,
                    InvoiceCode = s.InvoiceCode,
                    CustomerName = s.CustomerName,
                    SubTotal = s.SubTotal,
                    TotalDiscount = s.TotalDiscount + s.SpecialDiscount,
                    TotalTax = s.TotalTax,
                    GrandTotal = s.GrandTotal,
                    Profit = s.SalesDetails.Sum(sd => sd.LineTotal - (sd.Quantity * (sd.Medicine != null ? sd.Medicine.PurchasePrice : 0)))
                })
                .OrderByDescending(s => s.Date)
                .ToListAsync();
        }

        // Branch-aware via Tier-2 MedicineBatches query filter
        public async Task<IEnumerable<StockStatusReportDto>> GetStockStatusAsync()
        {
            return await _context.Medicines
                .AsNoTracking()
                .Where(m => m.IsActive)
                .Select(m => new StockStatusReportDto
                {
                    MedicineId = m.MedicineId,
                    MedicineCode = m.Code,
                    MedicineName = m.Name,
                    Category = m.Category,
                    CurrentStock = _context.MedicineBatches
                        .Where(b => b.MedicineId == m.MedicineId && b.Status == "Active")
                        .Sum(b => (int?)b.CurrentStock) ?? 0,
                    PurchasePrice = m.PurchasePrice,
                    SalePrice = m.SalePrice
                })
                .OrderBy(m => m.MedicineName)
                .ToListAsync();
        }

        public async Task<ProfitLossReportDto> GetProfitLossAsync(DateTime startDate, DateTime endDate)
        {
            var from = startDate.Date;
            var toExclusive = endDate.Date.AddDays(1);

            var sales = await _context.SalesMasters
                .AsNoTracking()
                .Where(s => s.SaleDate >= from && s.SaleDate < toExclusive)
                .Include(s => s.SalesDetails)
                .ThenInclude(sd => sd.Medicine)
                .ToListAsync();

            var totalSales = sales.Sum(s => s.GrandTotal);
            var totalCostOfGoodsSold = sales.Sum(s => s.SalesDetails.Sum(sd => sd.Quantity * (sd.Medicine != null ? sd.Medicine.PurchasePrice : 0)));

            return new ProfitLossReportDto
            {
                StartDate = startDate,
                EndDate = endDate,
                TotalSales = totalSales,
                TotalCostOfGoodsSold = totalCostOfGoodsSold,
                TotalExpenses = 0 // Future: add specialized expense table joins
            };
        }

        public async Task<IEnumerable<PurchaseSummaryReportDto>> GetPurchaseSummaryAsync(DateTime startDate, DateTime endDate)
        {
            var from = startDate.Date;
            var toExclusive = endDate.Date.AddDays(1);

            return await _context.PurchaseMasters
                .AsNoTracking()
                .Where(p => p.PurchaseDate >= from && p.PurchaseDate < toExclusive)
                .Select(p => new PurchaseSummaryReportDto
                {
                    Date = p.PurchaseDate,
                    GrnCode = p.GrnCode,
                    SupplierName = p.Party != null ? p.Party.FullName : "N/A",
                    GrandTotal = p.GrandTotal,
                    PaidAmount = p.PaidAmount,
                    DueAmount = p.DueAmount
                })
                .OrderByDescending(p => p.Date)
                .ToListAsync();
        }

        // Branch & batch-aware expiry report using Bangladesh Standard Time (BdNow)
        public async Task<IEnumerable<ExpiryReportDto>> GetExpiryReportAsync(int months)
        {
            var today = BdNow().Date;
            var thresholdDate = today.AddMonths(months);

            var rows = await _context.MedicineBatches
                .AsNoTracking()
                .Where(b => b.CurrentStock > 0 && b.Status == "Active" && b.ExpiryDate <= thresholdDate)
                .OrderBy(b => b.ExpiryDate)
                .Select(b => new
                {
                    b.MedicineId,
                    MedicineName = b.Medicine != null ? b.Medicine.Name : "Unknown",
                    b.BatchNumber,
                    b.ExpiryDate,
                    RemainingStock = b.CurrentStock
                })
                .ToListAsync();

            return rows.Select(b => new ExpiryReportDto
            {
                MedicineId = b.MedicineId,
                MedicineName = b.MedicineName,
                BatchNumber = string.IsNullOrWhiteSpace(b.BatchNumber) ? "N/A" : b.BatchNumber,
                ExpiryDate = b.ExpiryDate,
                RemainingStock = b.RemainingStock,
                DaysUntilExpiry = (b.ExpiryDate.Date - today).Days,
                Status = b.ExpiryDate.Date < today ? "Expired" : "Expiring Soon"
            }).ToList();
        }

        public async Task<IEnumerable<TopSellingMedicineDto>> GetTopSellingMedicinesAsync(DateTime startDate, DateTime endDate, int count)
        {
            var from = startDate.Date;
            var toExclusive = endDate.Date.AddDays(1);

            return await _context.SalesDetails
                .AsNoTracking()
                .Where(sd => sd.SalesMaster != null && sd.SalesMaster.SaleDate >= from && sd.SalesMaster.SaleDate < toExclusive)
                .GroupBy(sd => new { sd.MedicineId, Name = sd.Medicine != null ? sd.Medicine.Name : "Unknown" })
                .Select(g => new TopSellingMedicineDto
                {
                    MedicineId = g.Key.MedicineId,
                    MedicineName = g.Key.Name,
                    TotalQuantitySold = g.Sum(x => x.Quantity),
                    TotalRevenue = g.Sum(x => x.LineTotal),
                    TransactionCount = g.Count()
                })
                .OrderByDescending(x => x.TotalQuantitySold)
                .Take(count)
                .ToListAsync();
        }

        // Branch-aware low-stock report (sum of active MedicineBatches <= 10)
        public async Task<IEnumerable<StockStatusReportDto>> GetLowStockReportAsync()
        {
            return await _context.Medicines
                .AsNoTracking()
                .Where(m => m.IsActive)
                .Select(m => new StockStatusReportDto
                {
                    MedicineId = m.MedicineId,
                    MedicineCode = m.Code,
                    MedicineName = m.Name,
                    Category = m.Category,
                    CurrentStock = _context.MedicineBatches
                        .Where(b => b.MedicineId == m.MedicineId && b.Status == "Active")
                        .Sum(b => (int?)b.CurrentStock) ?? 0,
                    PurchasePrice = m.PurchasePrice,
                    SalePrice = m.SalePrice
                })
                .Where(x => x.CurrentStock <= 10)
                .OrderBy(x => x.CurrentStock)
                .ThenBy(x => x.MedicineName)
                .ToListAsync();
        }

        public async Task<IEnumerable<LedgerReportDto>> GetLedgerReportAsync(int partyId, DateTime startDate, DateTime endDate)
        {
            var from = startDate.Date;
            var toExclusive = endDate.Date.AddDays(1);

            var sales = await _context.SalesMasters
                .AsNoTracking()
                .Where(s => s.PartyId == partyId && s.SaleDate >= from && s.SaleDate < toExclusive)
                .Select(s => new LedgerReportDto
                {
                    Date = s.SaleDate,
                    Reference = s.InvoiceCode,
                    Type = "Sale",
                    Debit = s.GrandTotal,
                    Credit = s.PaidAmount,
                    Balance = 0
                }).ToListAsync();

            var purchases = await _context.PurchaseMasters
                .AsNoTracking()
                .Where(p => p.PartyId == partyId && p.PurchaseDate >= from && p.PurchaseDate < toExclusive)
                .Select(p => new LedgerReportDto
                {
                    Date = p.PurchaseDate,
                    Reference = p.GrnCode,
                    Type = "Purchase",
                    Credit = p.GrandTotal,
                    Debit = p.PaidAmount,
                    Balance = 0
                }).ToListAsync();

            var combined = sales.Concat(purchases).OrderBy(x => x.Date).ToList();

            decimal runningBalance = 0;
            foreach (var item in combined)
            {
                runningBalance += (item.Debit - item.Credit);
                item.Balance = runningBalance;
            }

            return combined;
        }

        public async Task<IEnumerable<UserPerformanceDto>> GetUserPerformanceReportAsync(DateTime startDate, DateTime endDate)
        {
            var from = startDate.Date;
            var toExclusive = endDate.Date.AddDays(1);

            var sales = await _context.SalesMasters
                .AsNoTracking()
                .Where(s => s.SaleDate >= from && s.SaleDate < toExclusive && !string.IsNullOrEmpty(s.CreatedBy))
                .Include(s => s.SalesDetails)
                .ThenInclude(sd => sd.Medicine)
                .ToListAsync();

            return sales
                .GroupBy(s => s.CreatedBy)
                .Select(g => new UserPerformanceDto
                {
                    UserId = g.Key ?? "Unknown",
                    FullName = g.Key ?? "Unknown",
                    TotalSalesCount = g.Count(),
                    TotalSalesAmount = g.Sum(x => x.GrandTotal),
                    TotalProfitGenerated = g.Sum(s => s.SalesDetails.Sum(sd => sd.LineTotal - (sd.Quantity * (sd.Medicine != null ? sd.Medicine.PurchasePrice : 0))))
                })
                .OrderByDescending(x => x.TotalSalesAmount)
                .ToList();
        }

        public async Task<IEnumerable<TaxReportDto>> GetTaxReportAsync(DateTime startDate, DateTime endDate)
        {
            var from = startDate.Date;
            var toExclusive = endDate.Date.AddDays(1);

            return await _context.SalesDetails
                .AsNoTracking()
                .Where(sd => sd.SalesMaster != null && sd.SalesMaster.SaleDate >= from && sd.SalesMaster.SaleDate < toExclusive && sd.TaxAmount > 0)
                .GroupBy(sd => sd.TaxPercent)
                .Select(g => new TaxReportDto
                {
                    TaxName = "VAT " + g.Key + "%",
                    TaxRate = g.Key,
                    TotalTaxableAmount = g.Sum(x => x.LineTotal - x.TaxAmount),
                    TotalTaxCollected = g.Sum(x => x.TaxAmount)
                })
                .ToListAsync();
        }
    }
}
