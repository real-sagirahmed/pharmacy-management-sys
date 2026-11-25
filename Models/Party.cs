using System.ComponentModel.DataAnnotations;

namespace PharmacyApi.Models
{
    public class Party
    {
        [Key]
        public int PartyId { get; set; }

        [Required]
        [StringLength(20)]
        public string Code { get; set; } = string.Empty;

        // "Customer" | "Supplier"
        [Required]
        [StringLength(20)]
        public string PartyType { get; set; } = string.Empty;

        [Required]
        [StringLength(150)]
        public string FullName { get; set; } = string.Empty;

        [Required]
        [StringLength(15)]
        [Phone]
        public string Cell { get; set; } = string.Empty;

        [StringLength(100)]
        [EmailAddress]
        public string? Email { get; set; }

        [StringLength(250)]
        public string? Address { get; set; }

        public bool IsActive { get; set; } = true;

        // ─── SaaS: Tenant-level (Supplier/Customer shared across branches of same Tenant)
        // ARCHITECTURAL INTENT: Parties are Tenant-scoped, not Branch-scoped.
        // A supplier serves the entire pharmacy group, not just one branch.
        public int TenantId { get; set; }
    }
}
