using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PharmacyApi.Models
{
    public class SalesMaster
    {
        [Key]
        public int SaleId { get; set; }

        // Auto-generated Invoice Code (INV20260315-1 format)
        [StringLength(30)]
        public string InvoiceCode { get; set; } = string.Empty;

        // Party FK (null = Walking Guest)
        public int? PartyId { get; set; }
        [ForeignKey("PartyId")]
        public virtual Party? Party { get; set; }

        // Snapshot fields for historical accuracy
        [StringLength(100)]
        public string CustomerName { get; set; } = "Walking Guest";
        [StringLength(15)]
        public string? CustomerPhone { get; set; }

        public DateTime SaleDate { get; set; }
        public DateTime SaleTime { get; set; }

        // Financial Summary
        public decimal SubTotal { get; set; }
        public decimal TotalDiscount { get; set; }   // sum of item discounts
        public decimal TotalTax { get; set; }         // sum of item taxes
        public decimal SpecialDiscount { get; set; }  // invoice-level discount
        public decimal GrandTotal { get; set; }

        // Payment Summary
        public decimal PaidAmount { get; set; }
        public decimal ChangeAmount { get; set; }     // cash returned
        public decimal DueAmount { get; set; }

        [StringLength(20)]
        public string PaymentMethod { get; set; } = "Cash"; // kept for backward compat
        [StringLength(20)]
        public string PaymentStatus { get; set; } = "Paid"; // Paid / Partial / Due
        
        // Sale Status: Completed / Hold
        [StringLength(20)]
        public string SaleStatus { get; set; } = "Completed";

        public virtual ICollection<SalesDetail> SalesDetails { get; set; } = new List<SalesDetail>();
        public virtual ICollection<SalesPayment> SalesPayments { get; set; } = new List<SalesPayment>();

        // Audit Fields
        public DateTime CreatedAt { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public string? UpdatedBy { get; set; }

        public SalesMaster()
        {
            var bdTime = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow,
                TimeZoneInfo.FindSystemTimeZoneById("Bangladesh Standard Time"));
            SaleDate = bdTime.Date;
            SaleTime = bdTime;
            CreatedAt = bdTime;
            PaymentStatus = "Paid";
            SaleStatus = "Completed";
        }
    }

    public class SalesPayment
    {
        [Key]
        public int SalesPaymentId { get; set; }

        [Required]
        public int SaleId { get; set; }

        [ForeignKey("SaleId")]
        public virtual SalesMaster? SalesMaster { get; set; }

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

        public SalesPayment()
        {
            CreatedAt = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow,
                TimeZoneInfo.FindSystemTimeZoneById("Bangladesh Standard Time"));
        }
    }

    public class SalesDetail
    {
        [Key]
        public int SalesDetailId { get; set; }

        [Required]
        public int SaleId { get; set; }

        [ForeignKey("SaleId")]
        public virtual SalesMaster? SalesMaster { get; set; }

        [Required]
        public int MedicineId { get; set; }

        [ForeignKey("MedicineId")]
        public virtual Medicine? Medicine { get; set; }

        [StringLength(50)]
        public string BatchNumber { get; set; } = string.Empty;

        public DateTime? ExpiryDate { get; set; }

        public int Quantity { get; set; }

        // UOM FK + Snapshot
        public int? UomId { get; set; }
        [ForeignKey("UomId")]
        public virtual Uom? Uom { get; set; }
        [StringLength(50)]
        public string UomName { get; set; } = string.Empty;

        public decimal UnitPrice { get; set; }

        // Discount — Tax after Discount (পারচেজের মতো consistent)
        public decimal DiscountPercent { get; set; }
        public decimal DiscountAmount { get; set; }

        // Tax
        public decimal TaxPercent { get; set; }
        public decimal TaxAmount { get; set; }

        // Line Total = (Qty * Price) - Discount + Tax
        public decimal LineTotal { get; set; }

        // Legacy — kept for backward compat
        public decimal Tax { get; set; }
        public decimal Subtotal { get; set; }

        public DateTime CreatedAt { get; set; }

        public SalesDetail()
        {
            CreatedAt = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow,
                TimeZoneInfo.FindSystemTimeZoneById("Bangladesh Standard Time"));
        }
    }
}
