using Microsoft.AspNetCore.Identity;
using System.ComponentModel.DataAnnotations;

namespace PharmacyApi.Models
{
    public class ApplicationUser : IdentityUser
    {
        [StringLength(100)]
        public string FullName { get; set; } = string.Empty;

        [StringLength(500)]
        public string? Address { get; set; }

        public string? ProfilePicturePath { get; set; }

        public bool IsActive { get; set; } = true;
    }
}
