using System.ComponentModel.DataAnnotations;

namespace PharmacyApi.Models
{
    // Generic Salt Name — e.g., Paracetamol, Amoxicillin
    public class Generic
    {
        [Key]
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
}
