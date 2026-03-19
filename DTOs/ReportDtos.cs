using System.Collections.Generic;

namespace PharmacyApi.DTOs
{
    public class SalesSummaryReportDto
    {
        public DateTime Date { get; set; }
        public string InvoiceCode { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public decimal SubTotal { get; set; }
        public decimal TotalDiscount { get; set; }
        public decimal TotalTax { get; set; }
        public decimal GrandTotal { get; set; }
        public decimal Profit { get; set; }
    }

    public class StockStatusReportDto
    {
        public int MedicineId { get; set; }
        public string MedicineCode { get; set; } = string.Empty;
        public string MedicineName { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public int CurrentStock { get; set; }
        public decimal PurchasePrice { get; set; }
        public decimal SalePrice { get; set; }
        public decimal TotalPurchaseValue => CurrentStock * PurchasePrice;
        public decimal TotalSaleValue => CurrentStock * SalePrice;
    }

    public class ProfitLossReportDto
    {
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public decimal TotalSales { get; set; }
        public decimal TotalCostOfGoodsSold { get; set; }
        public decimal GrossProfit => TotalSales - TotalCostOfGoodsSold;
        public decimal TotalExpenses { get; set; } // Future expansion
        public decimal NetProfit => GrossProfit - TotalExpenses;
    }

    public class PurchaseSummaryReportDto
    {
        public DateTime Date { get; set; }
        public string GrnCode { get; set; } = string.Empty;
        public string SupplierName { get; set; } = string.Empty;
        public decimal GrandTotal { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal DueAmount { get; set; }
    }

    public class ExpiryReportDto
    {
        public int MedicineId { get; set; }
        public string MedicineName { get; set; } = string.Empty;
        public string BatchNumber { get; set; } = string.Empty;
        public DateTime ExpiryDate { get; set; }
        public int RemainingStock { get; set; }
        public int DaysUntilExpiry { get; set; }
        public string Status { get; set; } = string.Empty; // "Expired" or "Expiring Soon"
    }

    public class TopSellingMedicineDto
    {
        public int MedicineId { get; set; }
        public string MedicineName { get; set; } = string.Empty;
        public int TotalQuantitySold { get; set; }
        public decimal TotalRevenue { get; set; }
        public int TransactionCount { get; set; }
    }

    public class LedgerReportDto
    {
        public DateTime Date { get; set; }
        public string Reference { get; set; } = string.Empty; // Invoice or GRN Code
        public string Type { get; set; } = string.Empty; // Sale or Purchase
        public decimal Debit { get; set; }
        public decimal Credit { get; set; }
        public decimal Balance { get; set; }
    }

    public class UserPerformanceDto
    {
        public string UserId { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public int TotalSalesCount { get; set; }
        public decimal TotalSalesAmount { get; set; }
        public decimal TotalProfitGenerated { get; set; }
    }

    public class TaxReportDto
    {
        public string TaxName { get; set; } = string.Empty;
        public decimal TaxRate { get; set; }
        public decimal TotalTaxableAmount { get; set; }
        public decimal TotalTaxCollected { get; set; }
    }
}
