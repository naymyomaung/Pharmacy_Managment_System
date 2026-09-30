namespace PharmacyManagemntWebApi.Models
{
    public class Drug
    {
        public int DrugId { get; set; }
        public string DrugName { get; set; } = string.Empty;
        public string GenericName { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public int BaseUnitId { get; set; }
        public decimal SellingPrice { get; set; }
        public int StockQuantity { get; set; } = 0;
        public DateTime? ExpiryDate { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public bool IsDeleted { get; set; } = false;
    }
}
