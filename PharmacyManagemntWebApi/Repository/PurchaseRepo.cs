using Dapper;
using Microsoft.Data.SqlClient;
using PharmacyManagemntWebApi.Data;
using PharmacyManagemntWebApi.Models;
using PharmacyManagemntWebApi.Queries;
using System.Data;

namespace PharmacyManagemntWebApi.Repository
{
    public class PurchaseRepo
    {
        private readonly IDbConnectionFactory _conn;
        private readonly PurchaseQuery _q = new();
        private readonly DrugConversionQuery _cq = new();
        private readonly DrugBatchQuery _bq = new();
        public PurchaseRepo(IDbConnectionFactory conn) => _conn = conn;

        public async Task<IEnumerable<Purchase>> GetAllAsync()
        {
            using var c = _conn.CreateConnection();
            return await c.QueryAsync<Purchase>(_q.GetAll);
        }

        public async Task<Purchase?> GetByIdWithItemsAsync(int id)
        {
            using var c = _conn.CreateConnection();
            var master = await c.QueryFirstOrDefaultAsync<Purchase>(_q.GetById, new { PurchaseId = id });
            if (master == null) return null;
            var items = await c.QueryAsync<PurchaseItem>(_q.GetItemsByPurchaseId, new { PurchaseId = id });
            master.Items = items.ToList();
            return master;
        }

        // Master + items in one transaction, auto-stock IN (converted to base unit) + create batches for FEFO
        public async Task<int> CreateAsync(Purchase purchase)
        {
            using var c = _conn.CreateConnection();
            if (c.State != ConnectionState.Open) c.Open();
            using var tx = ((SqlConnection)c).BeginTransaction();
            try
            {
                purchase.PurchaseDate = purchase.PurchaseDate == default ? DateTime.Now : purchase.PurchaseDate;
                purchase.TotalAmount = purchase.Items.Sum(i => i.Quantity * i.UnitPrice);
                foreach (var i in purchase.Items) i.Subtotal = i.Quantity * i.UnitPrice;

                var purchaseId = await c.ExecuteScalarAsync<int>(_q.Insert, purchase, tx);

                foreach (var item in purchase.Items)
                {
                    item.PurchaseId = purchaseId;
                    item.Subtotal = item.Quantity * item.UnitPrice;
                    if (item.ExpiryDate == default) item.ExpiryDate = null;
                    var purchaseItemId = await c.ExecuteScalarAsync<int>(_q.InsertItem, item, tx);
                    item.PurchaseItemId = purchaseItemId;

                    var drug = await c.QueryFirstOrDefaultAsync<Drug>(
                        "SELECT DrugId, BaseUnitId FROM dbo.Drugs WHERE DrugId=@DrugId;",
                        new { DrugId = item.DrugId }, tx);
                    int baseQty = item.Quantity;
                    int baseUnitId = drug?.BaseUnitId ?? item.UnitId;
                    if (drug != null && item.UnitId != drug.BaseUnitId)
                    {
                        var factor = await c.ExecuteScalarAsync<decimal?>(_cq.GetFactor,
                            new { DrugId = item.DrugId, FromUnitId = item.UnitId, ToUnitId = drug.BaseUnitId }, tx);
                        if (factor == null)
                        {
                            // Fallback: inverted reverse conversion (e.g. only base->purchase-unit defined)
                            var rev = await c.ExecuteScalarAsync<decimal?>(_cq.GetFactor,
                                new { DrugId = item.DrugId, FromUnitId = drug.BaseUnitId, ToUnitId = item.UnitId }, tx);
                            if (rev != null && rev != 0) factor = 1 / rev;
                        }
                        baseQty = (int)(item.Quantity * (factor ?? 1));
                    }
                    await c.ExecuteAsync("UPDATE dbo.Drugs SET StockQuantity = StockQuantity + @Q WHERE DrugId=@D;",
                        new { Q = baseQty, D = item.DrugId }, tx);

                    // Create batch for FEFO tracking (skip if DrugBatches table not yet migrated -> stock still updates)
                    try
                    {
                        var batch = new DrugBatch
                        {
                            DrugId = item.DrugId,
                            PurchaseItemId = item.PurchaseItemId,
                            ExpiryDate = item.ExpiryDate,
                            Quantity = baseQty,
                            UnitId = baseUnitId,
                            CreatedAt = DateTime.Now
                        };
                        await c.ExecuteAsync(_bq.InsertBatch, batch, tx);
                    }
                    catch (Exception ex) when (ex.Message.Contains("Invalid object name") || ex.Message.Contains("Invalid column"))
                    {
                        // Migration not run yet - purchase + stock still saved, FEFO batch skipped
                    }
                }
                tx.Commit();
                return purchaseId;
            }
            catch { tx.Rollback(); throw; }
        }

        public async Task<bool> DeleteAsync(int id)
        {
            using var c = _conn.CreateConnection();
            if (c.State != ConnectionState.Open) c.Open();
            using var tx = ((SqlConnection)c).BeginTransaction();
            try
            {
                var items = (await c.QueryAsync<PurchaseItem>(_q.GetItemsByPurchaseId, new { PurchaseId = id }, tx)).ToList();
                foreach (var item in items)
                {
                    // Also delete associated batches
                    await c.ExecuteAsync("DELETE FROM dbo.DrugBatches WHERE PurchaseItemId=@PII;",
                        new { PII = item.PurchaseItemId }, tx);
                    // Reverse the stock IN using the same unit->base conversion as Create
                    var drug = await c.QueryFirstOrDefaultAsync<Drug>(
                        "SELECT DrugId, BaseUnitId FROM dbo.Drugs WHERE DrugId=@DrugId;",
                        new { DrugId = item.DrugId }, tx);
                    int baseQty = item.Quantity;
                    if (drug != null && item.UnitId != drug.BaseUnitId)
                    {
                        var factor = await c.ExecuteScalarAsync<decimal?>(_cq.GetFactor,
                            new { DrugId = item.DrugId, FromUnitId = item.UnitId, ToUnitId = drug.BaseUnitId }, tx);
                        if (factor == null)
                        {
                            var rev = await c.ExecuteScalarAsync<decimal?>(_cq.GetFactor,
                                new { DrugId = item.DrugId, FromUnitId = drug.BaseUnitId, ToUnitId = item.UnitId }, tx);
                            if (rev != null && rev != 0) factor = 1 / rev;
                        }
                        baseQty = (int)(item.Quantity * (factor ?? 1));
                    }
                    await c.ExecuteAsync("UPDATE dbo.Drugs SET StockQuantity = StockQuantity - @Q WHERE DrugId=@D;",
                        new { Q = baseQty, D = item.DrugId }, tx);
                }
                await c.ExecuteAsync(_q.DeleteItemsByPurchaseId, new { PurchaseId = id }, tx);
                var rows = await c.ExecuteAsync(_q.Delete, new { PurchaseId = id }, tx);
                tx.Commit();
                return rows > 0;
            }
            catch { tx.Rollback(); throw; }
        }
    }
}
