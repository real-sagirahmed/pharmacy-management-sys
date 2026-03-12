using System.ComponentModel.DataAnnotations;

namespace PharmacyApi.Models
{
    public class Tax
    {
        [Key]
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
}
