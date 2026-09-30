using Dapper;
using PharmacyManagemntWebApi.Data;
using PharmacyManagemntWebApi.Models;
using PharmacyManagemntWebApi.Queries;

namespace PharmacyManagemntWebApi.Repository
{
    public class DrugRepo
    {
        private readonly IDbConnectionFactory _conn;
        private readonly DrugQuery _q = new();
        private readonly DrugBatchQuery _bq = new();
        public DrugRepo(IDbConnectionFactory conn) => _conn = conn;

        public async Task<IEnumerable<Drug>> GetAllAsync()
        {
            using var c = _conn.CreateConnection();
            return await c.QueryAsync<Drug>(_q.GetAll);
        }
        public async Task<Drug?> GetByIdAsync(int id)
        {
            using var c = _conn.CreateConnection();
            return await c.QueryFirstOrDefaultAsync<Drug>(_q.GetById, new { DrugId = id });
        }
        public async Task<IEnumerable<DrugBatch>> GetBatchesAsync(int drugId)
        {
            using var c = _conn.CreateConnection();
            return await c.QueryAsync<DrugBatch>(_bq.GetBatchesByDrugId, new { DrugId = drugId });
        }
        public async Task<int> CreateAsync(Drug m)
        {
            using var c = _conn.CreateConnection();
            m.CreatedAt = DateTime.Now;
            return await c.ExecuteScalarAsync<int>(_q.Insert, m);
        }
        public async Task<bool> UpdateAsync(Drug m)
        {
            using var c = _conn.CreateConnection();
            return await c.ExecuteAsync(_q.Update, m) > 0;
        }
        public async Task<bool> SoftDeleteAsync(int id)
        {
            using var c = _conn.CreateConnection();
            return await c.ExecuteAsync(_q.SoftDelete, new { DrugId = id }) > 0;
        }
    }
}
