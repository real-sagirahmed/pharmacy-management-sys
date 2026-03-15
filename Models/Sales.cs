using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PharmacyApi.Models
{
    public class SalesMaster
    {
        [Key]
        public int SaleId { get; set; }

        [StringLength(100)]
        public string CustomerName { get; set; } = "Walking Customer";

        [StringLength(20)]
        public string CustomerPhone { get; set; } = string.Empty;

        public DateTime SaleDate { get; set; }

        public decimal GrandTotal { get; set; }

        public decimal Discount { get; set; }

        public string PaymentMethod { get; set; } = "Cash";

        // Payment Summary
        public decimal PaidAmount { get; set; }
        public decimal DueAmount { get; set; }

        [StringLength(20)]
        public string PaymentStatus { get; set; } = "Paid"; // Paid / Partial / Due

        public virtual ICollection<SalesDetail> SalesDetails { get; set; } = new List<SalesDetail>();
        public virtual ICollection<SalesPayment> SalesPayments { get; set; } = new List<SalesPayment>();

        // Audit Fields
        public DateTime CreatedAt { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public string? UpdatedBy { get; set; }

        public SalesMaster()
        {
            var bdTime = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, TimeZoneInfo.FindSystemTimeZoneById("Bangladesh Standard Time"));
            SaleDate = bdTime;
            CreatedAt = bdTime;
            PaymentStatus = "Paid";
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

        public int Quantity { get; set; }

        public decimal UnitPrice { get; set; }

        public decimal Tax { get; set; }

        public decimal Subtotal { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
