using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using PharmacyApi.DTOs;

namespace PharmacyApi.Repositories
{
    public interface IReportRepository
    {
        Task<IEnumerable<SalesSummaryReportDto>> GetSalesSummaryAsync(DateTime startDate, DateTime endDate);
        Task<IEnumerable<StockStatusReportDto>> GetStockStatusAsync();
        Task<ProfitLossReportDto> GetProfitLossAsync(DateTime startDate, DateTime endDate);
        Task<IEnumerable<PurchaseSummaryReportDto>> GetPurchaseSummaryAsync(DateTime startDate, DateTime endDate);
        Task<IEnumerable<ExpiryReportDto>> GetExpiryReportAsync(int months);
        Task<IEnumerable<TopSellingMedicineDto>> GetTopSellingMedicinesAsync(DateTime startDate, DateTime endDate, int count);
        Task<IEnumerable<StockStatusReportDto>> GetLowStockReportAsync();
        Task<IEnumerable<LedgerReportDto>> GetLedgerReportAsync(int partyId, DateTime startDate, DateTime endDate);
        Task<IEnumerable<UserPerformanceDto>> GetUserPerformanceReportAsync(DateTime startDate, DateTime endDate);
        Task<IEnumerable<TaxReportDto>> GetTaxReportAsync(DateTime startDate, DateTime endDate);
    }
}
