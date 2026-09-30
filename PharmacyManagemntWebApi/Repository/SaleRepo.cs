using Dapper;
using Microsoft.Data.SqlClient;
using PharmacyManagemntWebApi.Data;
using PharmacyManagemntWebApi.Models;
using PharmacyManagemntWebApi.Queries;
using System.Data;

namespace PharmacyManagemntWebApi.Repository
{
    public class SaleRepo
    {
        private readonly IDbConnectionFactory _conn;
        private readonly SaleQuery _q = new();
        private readonly DrugConversionQuery _cq = new();
        private readonly DrugBatchQuery _bq = new();
        public SaleRepo(IDbConnectionFactory conn) => _conn = conn;

        public async Task<IEnumerable<Sale>> GetAllAsync()
        {
            using var c = _conn.CreateConnection();
            return await c.QueryAsync<Sale>(_q.GetAll);
        }

        public async Task<Sale?> GetByIdWithItemsAsync(int id)
        {
            using var c = _conn.CreateConnection();
            var master = await c.QueryFirstOrDefaultAsync<Sale>(_q.GetById, new { SaleId = id });
            if (master == null) return null;
            var items = await c.QueryAsync<SaleItem>(_q.GetItemsBySaleId, new { SaleId = id });
            master.Items = items.ToList();
            return master;
        }

        // Master + items in one transaction, FEFO stock check + stock OUT
        public async Task<int> CreateAsync(Sale sale)
        {
            using var c = _conn.CreateConnection();
            if (c.State != ConnectionState.Open) c.Open();
            using var tx = ((SqlConnection)c).BeginTransaction();
            try
            {
                sale.SaleDate = sale.SaleDate == default ? DateTime.Now : sale.SaleDate;
                foreach (var i in sale.Items) i.Subtotal = i.Quantity * i.UnitPrice;
                sale.TotalAmount = sale.Items.Sum(i => i.Subtotal);
                sale.NetAmount = sale.TotalAmount - sale.Discount;

                // FEFO: Validate stock availability across batches for each item
                foreach (var item in sale.Items)
                {
                    var drug = await c.QueryFirstOrDefaultAsync<Drug>(
                        "SELECT DrugId, BaseUnitId, StockQuantity FROM dbo.Drugs WHERE DrugId=@DrugId AND IsDeleted=0;",
                        new { DrugId = item.DrugId }, tx)
                        ?? throw new Exception($"Drug {item.DrugId} not found.");

                    int baseQty = item.Quantity;
                    if (item.UnitId != drug.BaseUnitId)
                    {
                        var factor = await c.ExecuteScalarAsync<decimal?>(_cq.GetFactor,
                            new { DrugId = item.DrugId, FromUnitId = item.UnitId, ToUnitId = drug.BaseUnitId }, tx);
                        if (factor == null)
                        {
                            // Fallback: inverted reverse conversion (e.g. only base->sale defined)
                            var rev = await c.ExecuteScalarAsync<decimal?>(_cq.GetFactor,
                                new { DrugId = item.DrugId, FromUnitId = drug.BaseUnitId, ToUnitId = item.UnitId }, tx);
                            if (rev != null && rev != 0) factor = 1 / rev;
                        }
                        baseQty = (int)(item.Quantity * (factor ?? 1));
                    }

                    // Check total available stock in batches (FEFO), fallback to Drugs.StockQuantity for old stock without batches
                    int totalBatchQty = 0;
                    try
                    {
                        var batches = await c.QueryAsync<DrugBatch>(_bq.GetBatchesByDrugId, new { DrugId = item.DrugId }, tx);
                        totalBatchQty = batches.Sum(b => b.Quantity);
                    }
                    catch { totalBatchQty = 0; }
                    int available = totalBatchQty > 0 ? totalBatchQty : drug.StockQuantity;
                    if (item.Quantity > 0 && baseQty <= 0)
                        throw new Exception($"Conversion for Drug {item.DrugId} results in zero base units. Check the conversion factor.");
                    if (available < baseQty)
                        throw new Exception($"Insufficient stock for Drug {item.DrugId}. Available={available}, Required={baseQty}.");
                }

                var saleId = await c.ExecuteScalarAsync<int>(_q.Insert, sale, tx);
                foreach (var item in sale.Items)
                {
                    item.SaleId = saleId;
                    item.Subtotal = item.Quantity * item.UnitPrice;
                    await c.ExecuteAsync(_q.InsertItem, item, tx);

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
                            // Fallback: inverted reverse conversion (e.g. only base->sale defined)
                            var rev = await c.ExecuteScalarAsync<decimal?>(_cq.GetFactor,
                                new { DrugId = item.DrugId, FromUnitId = drug.BaseUnitId, ToUnitId = item.UnitId }, tx);
                            if (rev != null && rev != 0) factor = 1 / rev;
                        }
                        baseQty = (int)(item.Quantity * (factor ?? 1));
                    }

                    // FEFO: Deduct from batches in order of earliest expiry first (skip if no batch table/rows = old stock)
                    try
                    {
                        var batches = await c.QueryAsync<DrugBatch>(_bq.GetBatchesByDrugId, new { DrugId = item.DrugId }, tx);
                        int remainingQty = baseQty;
                        foreach (var batch in batches)
                        {
                            if (remainingQty <= 0) break;
                            int deductQty = Math.Min(batch.Quantity, remainingQty);
                            await c.ExecuteAsync(_bq.UpdateBatchQuantity, new { BatchId = batch.BatchId, Qty = deductQty }, tx);
                            remainingQty -= deductQty;
                        }
                    }
                    catch { /* DrugBatches table missing -> only update Drugs stock */ }

                    // Also update the main Drug stock quantity for backward compatibility
                    await c.ExecuteAsync("UPDATE dbo.Drugs SET StockQuantity = StockQuantity - @Q WHERE DrugId=@D;",
                        new { Q = baseQty, D = item.DrugId }, tx);
                }

                // Clean up empty batches (ignore if table missing)
                try { await c.ExecuteAsync(_bq.DeleteEmptyBatches, transaction: tx); } catch { }

                tx.Commit();
                return saleId;
            }
            catch { tx.Rollback(); throw; }
        }

        public async Task<bool> DeleteAsync(int id)
        {
            using var c = _conn.CreateConnection();
            await c.ExecuteAsync(_q.DeleteItemsBySaleId, new { SaleId = id });
            return await c.ExecuteAsync(_q.Delete, new { SaleId = id }) > 0;
        }
    }
}
