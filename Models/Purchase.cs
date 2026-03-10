using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PharmacyApi.Models
{
    public class PurchaseMaster
    {
        [Key]
        public int PurchaseId { get; set; }

        [Required]
        public int SupplierId { get; set; }

        [ForeignKey("SupplierId")]
        public virtual Supplier? Supplier { get; set; }

        [StringLength(50)]
        public string InvoiceNumber { get; set; } = string.Empty;

        public DateTime PurchaseDate { get; set; } = DateTime.Now;

        public decimal TotalAmount { get; set; }

        public virtual ICollection<PurchaseDetail> PurchaseDetails { get; set; } = new List<PurchaseDetail>();
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

        public decimal UnitCost { get; set; }

        public decimal Subtotal { get; set; }
    }
}
