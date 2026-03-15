using System.ComponentModel.DataAnnotations;

namespace PharmacyApi.Models
{
    public class UseFor
    {
        [Key]
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
