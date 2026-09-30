using Dapper;
using PharmacyManagemntWebApi.Data;
using PharmacyManagemntWebApi.Models;
using PharmacyManagemntWebApi.Queries;

namespace PharmacyManagemntWebApi.Repository
{
    public class SupplierRepo
    {
        private readonly IDbConnectionFactory _conn;
        private readonly SupplierQuery _q = new();
        public SupplierRepo(IDbConnectionFactory conn) => _conn = conn;

        public async Task<IEnumerable<Supplier>> GetAllAsync()
        {
            using var c = _conn.CreateConnection();
            return await c.QueryAsync<Supplier>(_q.GetAll);
        }
        public async Task<Supplier?> GetByIdAsync(int id)
        {
            using var c = _conn.CreateConnection();
            return await c.QueryFirstOrDefaultAsync<Supplier>(_q.GetById, new { SupplierId = id });
        }
        public async Task<int> CreateAsync(Supplier m)
        {
            using var c = _conn.CreateConnection();
            m.CreatedAt = DateTime.Now;
            return await c.ExecuteScalarAsync<int>(_q.Insert, m);
        }
        public async Task<bool> UpdateAsync(Supplier m)
        {
            using var c = _conn.CreateConnection();
            return await c.ExecuteAsync(_q.Update, m) > 0;
        }
        public async Task<bool> SoftDeleteAsync(int id)
        {
            using var c = _conn.CreateConnection();
            return await c.ExecuteAsync(_q.SoftDelete, new { SupplierId = id }) > 0;
        }
    }
}
