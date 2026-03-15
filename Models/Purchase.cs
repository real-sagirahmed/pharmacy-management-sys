using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PharmacyApi.Models
{
    public class PurchaseMaster
    {
        [Key]
        public int PurchaseId { get; set; }

        // Auto-generated GRN Code (GRN-00001 format)
        [StringLength(20)]
        public string GrnCode { get; set; } = string.Empty;

        [Required]
        public int PartyId { get; set; }

        [ForeignKey("PartyId")]
        public virtual Party? Party { get; set; }

        [StringLength(50)]
        public string InvoiceNumber { get; set; } = string.Empty;

        public DateTime? InvoiceDate { get; set; }

        public DateTime PurchaseDate { get; set; }

        // Financial Summary
        public decimal SubTotal { get; set; }
        public decimal TotalDiscount { get; set; }
        public decimal TotalTax { get; set; }
        public decimal Adjustment { get; set; }
        public decimal GrandTotal { get; set; }

        // Payment Summary
        public decimal PaidAmount { get; set; }
        public decimal DueAmount { get; set; }

        [StringLength(20)]
        public string PaymentStatus { get; set; } = "Due"; // Paid / Partial / Due

        public virtual ICollection<PurchaseDetail> PurchaseDetails { get; set; } = new List<PurchaseDetail>();
        public virtual ICollection<PurchasePayment> PurchasePayments { get; set; } = new List<PurchasePayment>();

        // Audit Fields
        public DateTime CreatedAt { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public string? UpdatedBy { get; set; }

        public PurchaseMaster()
        {
            var bdTime = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow,
                TimeZoneInfo.FindSystemTimeZoneById("Bangladesh Standard Time"));
            PurchaseDate = bdTime;
            CreatedAt = bdTime;
        }
    }

    public class PurchaseDetail
    {
        [Key]
        public int PurchaseDetailId { get; set; }

        [Required]
        public int PurchaseId { get; set; }

        [ForeignKey("PurchaseId")]
        public virtual PurchaseMaster? PurchaseMaster { get; set; }

        [Required]
        public int MedicineId { get; set; }

        [ForeignKey("MedicineId")]
        public virtual Medicine? Medicine { get; set; }

        [StringLength(50)]
        public string BatchNumber { get; set; } = string.Empty;

        public DateTime? ExpiryDate { get; set; }

        public int Quantity { get; set; }

        // UOM — FK to UOM master + snapshot of name for historical accuracy
        public int? UomId { get; set; }

        [ForeignKey("UomId")]
        public virtual Uom? Uom { get; set; }

        [StringLength(50)]
        public string UomName { get; set; } = string.Empty;

        public decimal UnitCost { get; set; }

        // Discount
        public decimal DiscountPercent { get; set; }
        public decimal DiscountAmount { get; set; }

        // Tax
        public decimal TaxPercent { get; set; }
        public decimal TaxAmount { get; set; }

        // Sale Price (retail price, copied from medicine but editable)
        public decimal SalePrice { get; set; }

        // Line Total = (Qty * UnitCost) - DiscountAmount + TaxAmount
        public decimal LineTotal { get; set; }

        public DateTime CreatedAt { get; set; }
    }

    public class PurchasePayment
    {
        [Key]
        public int PurchasePaymentId { get; set; }

        [Required]
        public int PurchaseId { get; set; }

        [ForeignKey("PurchaseId")]
        public virtual PurchaseMaster? PurchaseMaster { get; set; }

        // Cash | MobileBanking | Bank | Card
        [Required]
        [StringLength(30)]
        public string PaymentMethod { get; set; } = string.Empty;

        public decimal Amount { get; set; }

        [StringLength(100)]
        public string? AccountNumber { get; set; }

        [StringLength(100)]
        public string? TransactionId { get; set; }

        [StringLength(250)]
        public string? Remarks { get; set; }

        public DateTime CreatedAt { get; set; }

        public PurchasePayment()
        {
            CreatedAt = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow,
                TimeZoneInfo.FindSystemTimeZoneById("Bangladesh Standard Time"));
        }
    }
}
