namespace PharmacyManagemntWebApi.Queries
{
    public class DrugConversionQuery
    {
        public string GetAll => @"SELECT ConversionId, DrugId, FromUnitId, ToUnitId, ConversionFactor FROM dbo.DrugConversions;";
        public string GetById => @"SELECT ConversionId, DrugId, FromUnitId, ToUnitId, ConversionFactor FROM dbo.DrugConversions WHERE ConversionId=@ConversionId;";
        public string GetByDrugId => @"SELECT ConversionId, DrugId, FromUnitId, ToUnitId, ConversionFactor FROM dbo.DrugConversions WHERE DrugId=@DrugId;";
        public string GetFactor => @"SELECT ConversionFactor FROM dbo.DrugConversions WHERE DrugId=@DrugId AND FromUnitId=@FromUnitId AND ToUnitId=@ToUnitId;";
        public string Insert => @"INSERT INTO dbo.DrugConversions (DrugId, FromUnitId, ToUnitId, ConversionFactor) OUTPUT INSERTED.ConversionId VALUES (@DrugId,@FromUnitId,@ToUnitId,@ConversionFactor);";
        public string Update => @"UPDATE dbo.DrugConversions SET DrugId=@DrugId, FromUnitId=@FromUnitId, ToUnitId=@ToUnitId, ConversionFactor=@ConversionFactor WHERE ConversionId=@ConversionId;";
        public string Delete => @"DELETE FROM dbo.DrugConversions WHERE ConversionId=@ConversionId;";
    }
}
