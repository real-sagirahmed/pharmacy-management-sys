namespace PharmacyApi.DTOs
{
    public class SearchRequestDto
    {
        public string? SearchText { get; set; }
        
        // Date Range Filters
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        
        // Advanced Filters (Tree/MultiSelect values from Frontend)
        public List<string>? Modules { get; set; }  // e.g., "Sales", "Purchases", "Medicines", "Parties"
        public List<string>? Statuses { get; set; } // e.g., "Active", "Completed", "Due", "Hold"
    }
}
