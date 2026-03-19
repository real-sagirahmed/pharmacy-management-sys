using Microsoft.EntityFrameworkCore;
using PharmacyApi.Data;
using PharmacyApi.DTOs;
using PharmacyApi.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace PharmacyApi.Repositories
{
    public class ReportRepository : IReportRepository
    {
        private readonly ApplicationDbContext _context;

        public ReportRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<SalesSummaryReportDto>> GetSalesSummaryAsync(DateTime startDate, DateTime endDate)
        {
            return await _context.SalesMasters
                .Where(s => s.SaleDate >= startDate && s.SaleDate <= endDate)
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

        public async Task<IEnumerable<StockStatusReportDto>> GetStockStatusAsync()
        {
            return await _context.Medicines
                .Select(m => new StockStatusReportDto
                {
                    MedicineId = m.MedicineId,
                    MedicineCode = m.Code,
                    MedicineName = m.Name,
                    Category = m.Category,
                    CurrentStock = m.StockQuantity,
                    PurchasePrice = m.PurchasePrice,
                    SalePrice = m.SalePrice
                })
                .OrderBy(m => m.MedicineName)
                .ToListAsync();
        }

        public async Task<ProfitLossReportDto> GetProfitLossAsync(DateTime startDate, DateTime endDate)
        {
            var sales = await _context.SalesMasters
                .Where(s => s.SaleDate >= startDate && s.SaleDate <= endDate)
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
            return await _context.PurchaseMasters
                .Where(p => p.PurchaseDate >= startDate && p.PurchaseDate <= endDate)
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
        public async Task<IEnumerable<ExpiryReportDto>> GetExpiryReportAsync(int months)
        {
            var thresholdDate = DateTime.Now.AddMonths(months);
            
            return await _context.Medicines
                .Where(m => m.ExpiryDate != null && m.ExpiryDate <= thresholdDate)
                .Select(m => new ExpiryReportDto
                {
                    MedicineId = m.MedicineId,
                    MedicineName = m.Name,
                    BatchNumber = m.Batch ?? "N/A",
                    ExpiryDate = m.ExpiryDate.Value,
                    RemainingStock = m.StockQuantity,
                    DaysUntilExpiry = EF.Functions.DateDiffDay(DateTime.Now, m.ExpiryDate.Value),
                    Status = m.ExpiryDate.Value < DateTime.Now ? "Expired" : "Expiring Soon"
                })
                .OrderBy(m => m.ExpiryDate)
                .ToListAsync();
        }

        public async Task<IEnumerable<TopSellingMedicineDto>> GetTopSellingMedicinesAsync(DateTime startDate, DateTime endDate, int count)
        {
            return await _context.SalesDetails
                .Where(sd => sd.SalesMaster != null && sd.SalesMaster.SaleDate >= startDate && sd.SalesMaster.SaleDate <= endDate)
                .GroupBy(sd => new { sd.MedicineId, sd.Medicine!.Name })
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

        public async Task<IEnumerable<StockStatusReportDto>> GetLowStockReportAsync()
        {
            return await _context.Medicines
                .Where(m => m.StockQuantity <= 10)
                .Select(m => new StockStatusReportDto
                {
                    MedicineId = m.MedicineId,
                    MedicineCode = m.Code,
                    MedicineName = m.Name,
                    Category = m.Category,
                    CurrentStock = m.StockQuantity,
                    PurchasePrice = m.PurchasePrice,
                    SalePrice = m.SalePrice
                })
                .OrderBy(m => m.CurrentStock)
                .ToListAsync();
        }

        public async Task<IEnumerable<LedgerReportDto>> GetLedgerReportAsync(int partyId, DateTime startDate, DateTime endDate)
        {
            var sales = await _context.SalesMasters
                .Where(s => s.PartyId == partyId && s.SaleDate >= startDate && s.SaleDate <= endDate)
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
                .Where(p => p.PartyId == partyId && p.PurchaseDate >= startDate && p.PurchaseDate <= endDate)
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
            var sales = await _context.SalesMasters
                .Where(s => s.SaleDate >= startDate && s.SaleDate <= endDate && !string.IsNullOrEmpty(s.CreatedBy))
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
            return await _context.SalesDetails
                .Where(sd => sd.SalesMaster != null && sd.SalesMaster.SaleDate >= startDate && sd.SalesMaster.SaleDate <= endDate && sd.TaxAmount > 0)
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
