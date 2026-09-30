namespace PharmacyManagemntWebApi.Queries
{
    public class SupplierQuery
    {
        public string GetAll => @"SELECT SupplierId, SupplierName, ContactPerson, Phone, Address, CreatedAt, IsDeleted FROM dbo.Suppliers WHERE IsDeleted=0 ORDER BY SupplierId DESC;";
        public string GetById => @"SELECT SupplierId, SupplierName, ContactPerson, Phone, Address, CreatedAt, IsDeleted FROM dbo.Suppliers WHERE SupplierId=@SupplierId AND IsDeleted=0;";
        public string Insert => @"INSERT INTO dbo.Suppliers (SupplierName, ContactPerson, Phone, Address, CreatedAt, IsDeleted) OUTPUT INSERTED.SupplierId VALUES (@SupplierName,@ContactPerson,@Phone,@Address,@CreatedAt,0);";
        public string Update => @"UPDATE dbo.Suppliers SET SupplierName=@SupplierName, ContactPerson=@ContactPerson, Phone=@Phone, Address=@Address WHERE SupplierId=@SupplierId;";
        public string SoftDelete => @"UPDATE dbo.Suppliers SET IsDeleted=1 WHERE SupplierId=@SupplierId;";
    }
}
