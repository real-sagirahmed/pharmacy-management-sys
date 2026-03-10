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

        public DateTime SaleDate { get; set; } = DateTime.Now;

        public decimal GrandTotal { get; set; }

        public decimal Discount { get; set; }

        public string PaymentMethod { get; set; } = "Cash";

        public virtual ICollection<SalesDetail> SalesDetails { get; set; } = new List<SalesDetail>();
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
    }
}
