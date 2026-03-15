using System.ComponentModel.DataAnnotations;

namespace PharmacyApi.DTOs
{
    public class MedicineDto
    {
        public int MedicineId { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string GenericName { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string UOM { get; set; } = string.Empty;
        public decimal PurchasePrice { get; set; }
        public decimal SalePrice { get; set; }
        public int StockQuantity { get; set; }
        public string? Batch { get; set; }
        public DateTime? ExpiryDate { get; set; }
        public string? Manufacturer { get; set; }
        public string? DosageForm { get; set; }
        public string? Strength { get; set; }
        public string? UseFor { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public string? UpdatedBy { get; set; }
        public List<MedicineBatchDto> Batches { get; set; } = new();
    }

    public class MedicineBatchDto
    {
        public string BatchNumber { get; set; } = string.Empty;
        public DateTime? ExpiryDate { get; set; }
        public int RemainingQuantity { get; set; }
        public decimal PurchasePrice { get; set; }
    }

    public class MedicineSearchParameters
    {
        public string? SearchText { get; set; }
        public string? Category { get; set; }
        public string? GenericName { get; set; }
        public DateTime? ExpiryFrom { get; set; }
        public DateTime? ExpiryTo { get; set; }
        public string? Manufacturer { get; set; }
        public string? DosageForm { get; set; }
        public string? Strength { get; set; }
        public string? UseFor { get; set; }
        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }

    public class PurchaseSearchParameters
    {
        public string? SearchText { get; set; } // Supplier name or invoice number
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }

    public class PagedResult<T>
    {
        public List<T> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
    }

    public class SupplierDto
    {
        public int SupplierId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string ContactPerson { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public bool IsActive { get; set; }
    }

    public class PurchaseMasterDto
    {
        public int PurchaseId { get; set; }
        public string GrnCode { get; set; } = string.Empty;

        [Required]
        public int SupplierId { get; set; }
        public string? SupplierName { get; set; }
        public string? SupplierPhone { get; set; }

        [StringLength(50)]
        public string InvoiceNumber { get; set; } = string.Empty;
        public DateTime? InvoiceDate { get; set; }

        [Required]
        public DateTime PurchaseDate { get; set; }

        // Financial summary
        public decimal SubTotal { get; set; }
        public decimal TotalDiscount { get; set; }
        public decimal TotalTax { get; set; }
        public decimal Adjustment { get; set; }
        public decimal GrandTotal { get; set; }

        // Payment summary
        public decimal PaidAmount { get; set; }
        public decimal DueAmount { get; set; }
        public string PaymentStatus { get; set; } = "Due";

        public List<PurchaseDetailDto> PurchaseDetails { get; set; } = new();
        public List<PurchasePaymentDto> PurchasePayments { get; set; } = new();
    }

    public class PurchaseDetailDto
    {
        public int PurchaseDetailId { get; set; }

        [Required]
        public int MedicineId { get; set; }
        public string? MedicineName { get; set; }

        [Required]
        [StringLength(50)]
        public string BatchNumber { get; set; } = string.Empty;

        public DateTime? ExpiryDate { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "Quantity must be at least 1.")]
        public int Quantity { get; set; }

        // UOM — FK + snapshot
        public int? UomId { get; set; }
        public string UomName { get; set; } = string.Empty;

        [Range(0, double.MaxValue, ErrorMessage = "Unit cost must be at least 0.")]
        public decimal UnitCost { get; set; }

        public decimal DiscountPercent { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal TaxPercent { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal SalePrice { get; set; }
        public decimal LineTotal { get; set; }
    }

    public class PurchasePaymentDto
    {
        public int PurchasePaymentId { get; set; }
        public int PurchaseId { get; set; }

        [Required]
        [StringLength(30)]
        public string PaymentMethod { get; set; } = string.Empty; // Cash | MobileBanking | Bank | Card

        [Range(0, double.MaxValue)]
        public decimal Amount { get; set; }

        [StringLength(100)]
        public string? AccountNumber { get; set; }

        [StringLength(100)]
        public string? TransactionId { get; set; }

        [StringLength(250)]
        public string? Remarks { get; set; }
    }

    public class SalesMasterDto
    {
        public int SaleId { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerPhone { get; set; } = string.Empty;
        public DateTime SaleDate { get; set; }
        public decimal GrandTotal { get; set; }
        public decimal Discount { get; set; }
        public string PaymentMethod { get; set; } = "Cash";
        public decimal PaidAmount { get; set; }
        public decimal DueAmount { get; set; }
        public string PaymentStatus { get; set; } = "Paid";
        public List<SalesDetailDto> SalesDetails { get; set; } = new();
        public List<SalesPaymentDto> SalesPayments { get; set; } = new();
    }

    public class SalesPaymentDto
    {
        public int SalesPaymentId { get; set; }
        public int SaleId { get; set; }
        public string PaymentMethod { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string? AccountNumber { get; set; }
        public string? TransactionId { get; set; }
        public string? Remarks { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class SalesDetailDto
    {
        public int SalesDetailId { get; set; }
        public int MedicineId { get; set; }
        public string? MedicineName { get; set; }
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal Tax { get; set; }
        public decimal Subtotal { get; set; }
    }

    // ─── Master Data DTOs ───────────────────────────────────────────────────

    public class PartyDto
    {
        public int PartyId { get; set; }

        [Required]
        [StringLength(20)]
        public string Code { get; set; } = string.Empty;

        // "Customer" | "Supplier"
        [Required]
        [StringLength(20)]
        public string PartyType { get; set; } = string.Empty;

        [Required]
        [StringLength(150)]
        public string FullName { get; set; } = string.Empty;

        [StringLength(15)]
        [Phone]
        public string? Cell { get; set; }

        [StringLength(100)]
        [EmailAddress]
        public string? Email { get; set; }

        [StringLength(250)]
        public string? Address { get; set; }

        public bool IsActive { get; set; } = true;
    }

    public class TaxDto
    {
        public int TaxId { get; set; }

        [Required]
        [StringLength(20)]
        public string Code { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [Range(0, 100, ErrorMessage = "TaxRate must be between 0 and 100.")]
        public decimal TaxRate { get; set; }

        [StringLength(250)]
        public string? Remarks { get; set; }

        public bool IsActive { get; set; } = true;
    }

    public class UomDto
    {
        public int UomId { get; set; }

        [Required]
        [StringLength(20)]
        public string Code { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        [StringLength(250)]
        public string? Description { get; set; }

        public bool IsActive { get; set; } = true;
    }

    public class GenericDto
    {
        public int GenericId { get; set; }

        [Required]
        [StringLength(20)]
        public string Code { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        [StringLength(250)]
        public string? Description { get; set; }

        public bool IsActive { get; set; } = true;
    }

    public class CategoryDto
    {
        public int CategoryId { get; set; }

        [Required]
        [StringLength(20)]
        public string Code { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        [StringLength(250)]
        public string? Description { get; set; }

        public bool IsActive { get; set; } = true;
    }

    public class ManufacturerDto
    {
        public int ManufacturerId { get; set; }

        [Required]
        [StringLength(20)]
        public string Code { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        [StringLength(250)]
        public string? Description { get; set; }

        public bool IsActive { get; set; } = true;
    }

    public class DosageFormDto
    {
        public int DosageFormId { get; set; }

        [Required]
        [StringLength(20)]
        public string Code { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        [StringLength(250)]
        public string? Description { get; set; }

        public bool IsActive { get; set; } = true;
    }

    public class CommonStrengthDto
    {
        public int CommonStrengthId { get; set; }

        [Required]
        [StringLength(20)]
        public string Code { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        [StringLength(250)]
        public string? Description { get; set; }

        public bool IsActive { get; set; } = true;
    }

    public class UseForDto
    {
        public int UseForId { get; set; }

        [Required]
        [StringLength(20)]
        public string Code { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        [StringLength(250)]
        public string? Remarks { get; set; }

        public bool IsActive { get; set; } = true;
    }
}
