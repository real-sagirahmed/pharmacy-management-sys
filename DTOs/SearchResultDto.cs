namespace PharmacyApi.DTOs
{
    public class SearchResultDto
    {
        public string Type { get; set; } = string.Empty;       // Module Name (Medicine, Sale, Purchase, Party)
        public string Title { get; set; } = string.Empty;      // Main Header (Invoice No, Medicine Name)
        public string Subtitle { get; set; } = string.Empty;   // Secondary details (Customer Name, Generic Name)
        public string Info { get; set; } = string.Empty;       // Status or Key value (e.g., "Stock: 50", "Due: $500")
        public string RoutePath { get; set; } = string.Empty;  // Strict Frontend Route (e.g., "/dashboard/sales/edit/105")
        public DateTime? Timestamp { get; set; }               // For chronological sorting if needed
    }
}
