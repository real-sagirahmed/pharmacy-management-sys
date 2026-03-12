using System.ComponentModel.DataAnnotations;

namespace PharmacyApi.Models
{
    // Unit of Measurement — e.g., Pcs, Box, Strip, Bottle
    public class Uom
    {
        [Key]
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
}
