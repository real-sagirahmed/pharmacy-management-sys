using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PharmacyApi.Models
{
    public class RolePermission
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string RoleId { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string ModuleName { get; set; } = string.Empty; // e.g., "Sales", "Medicines", "Purchases"

        public bool CanView { get; set; } = false;
        public bool CanCreate { get; set; } = false;
        public bool CanEdit { get; set; } = false;
        public bool CanDelete { get; set; } = false;

        // Navigation property (Optional, since IdentityRole is managed by Identity)
    }
}
