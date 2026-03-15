using System.ComponentModel.DataAnnotations;

namespace PharmacyApi.Models
{
    public class Medicine
    {
        [Key]
        public int MedicineId { get; set; }

        [Required]
        [StringLength(20)]
        public string Code { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        [StringLength(250)]
        public string GenericName { get; set; } = string.Empty;

        [StringLength(250)]
        public string Category { get; set; } = string.Empty;

        [StringLength(100)]
        public string UOM { get; set; } = string.Empty;

        [Range(0, double.MaxValue)]
        public decimal PurchasePrice { get; set; }

        [Required]
        [Range(0, double.MaxValue, ErrorMessage = "Price must be a positive value.")]
        public decimal SalePrice { get; set; }

        [Range(0, int.MaxValue, ErrorMessage = "Stock cannot be negative.")]
        public int StockQuantity { get; set; }

        [StringLength(50)]
        public string? Batch { get; set; }

        public DateTime? ExpiryDate { get; set; }

        [StringLength(250)]
        public string? Manufacturer { get; set; }

        [StringLength(100)]
        public string? DosageForm { get; set; }

        [StringLength(100)]
        public string? Strength { get; set; }

        [StringLength(250)]
        public string? UseFor { get; set; }

        public bool IsActive { get; set; } = true;

        // Audit Fields
        public DateTime CreatedAt { get; set; }
        [StringLength(100)]
        public string? CreatedBy { get; set; }
        public DateTime? UpdatedAt { get; set; }
        [StringLength(100)]
        public string? UpdatedBy { get; set; }

        public Medicine()
        {
            CreatedAt = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, TimeZoneInfo.FindSystemTimeZoneById("Bangladesh Standard Time"));
        }
    }
}
