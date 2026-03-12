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
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public string? UpdatedBy { get; set; }
    }

    public class MedicineSearchParameters
    {
        public string? SearchText { get; set; }
        public string? Category { get; set; }
        public string? GenericName { get; set; }
        public DateTime? ExpiryFrom { get; set; }
        public DateTime? ExpiryTo { get; set; }
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
        public int SupplierId { get; set; }
        public string? SupplierName { get; set; }
        public string InvoiceNumber { get; set; } = string.Empty;
        public DateTime PurchaseDate { get; set; }
        public decimal TotalAmount { get; set; }
        public List<PurchaseDetailDto> PurchaseDetails { get; set; } = new();
    }

    public class PurchaseDetailDto
    {
        public int PurchaseDetailId { get; set; }
        public int MedicineId { get; set; }
        public string? MedicineName { get; set; }
        public string BatchNumber { get; set; } = string.Empty;
        public DateTime? ExpiryDate { get; set; }
        public int Quantity { get; set; }
        public decimal UnitCost { get; set; }
        public decimal Subtotal { get; set; }
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
        public List<SalesDetailDto> SalesDetails { get; set; } = new();
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
}
