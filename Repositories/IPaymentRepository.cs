using PharmacyApi.DTOs;

namespace PharmacyApi.Repositories
{
    public interface IPaymentRepository
    {
        // ─── Dues (Outstanding) ──────────────────────────────────────────────
        Task<IEnumerable<object>> GetSalesDuesAsync();
        Task<IEnumerable<object>> GetPurchaseDuesAsync();

        // ─── Payment History ─────────────────────────────────────────────────
        Task<IEnumerable<SalesPaymentDto>> GetSalesPaymentHistoryAsync(int saleId);
        Task<IEnumerable<PurchasePaymentDto>> GetPurchasePaymentHistoryAsync(int purchaseId);

        // ─── Single Collect / Pay ────────────────────────────────────────────
        Task<(bool Success, string Message, decimal NewDue)> CollectSalesDueAsync(SalesPaymentDto dto);
        Task<(bool Success, string Message, decimal NewDue)> PayPurchaseDueAsync(PurchasePaymentDto dto);

        // ─── Bulk Collect / Pay (atomic — all rows or none) ──────────────────
        Task<(bool Success, string Message, decimal NewDue)> BulkCollectSalesDueAsync(BulkSalesPaymentDto dto);
        Task<(bool Success, string Message, decimal NewDue)> BulkPayPurchaseDueAsync(BulkPurchasePaymentDto dto);
    }
}
