namespace PharmacyManagemntWebApi.Models
{
    public class DrugConversion
    {
        public int ConversionId { get; set; }
        public int DrugId { get; set; }
        public int FromUnitId { get; set; }
        public int ToUnitId { get; set; }
        public decimal ConversionFactor { get; set; }
    }
}
