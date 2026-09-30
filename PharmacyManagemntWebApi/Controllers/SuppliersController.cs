using Microsoft.AspNetCore.Mvc;
using PharmacyManagemntWebApi.Models;
using PharmacyManagemntWebApi.Repository;

namespace PharmacyManagemntWebApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SuppliersController : ControllerBase
    {
        private readonly SupplierRepo _repo;
        public SuppliersController(SupplierRepo repo) => _repo = repo;

        [HttpGet] public async Task<IActionResult> GetAll() => Ok(await _repo.GetAllAsync());
        [HttpGet("{id}")] public async Task<IActionResult> GetById(int id)
        {
            var s = await _repo.GetByIdAsync(id);
            return s == null ? NotFound() : Ok(s);
        }
        [HttpPost] public async Task<IActionResult> Create(Supplier m)
        {
            var id = await _repo.CreateAsync(m);
            return CreatedAtAction(nameof(GetById), new { id }, new { SupplierId = id });
        }
        [HttpPut("{id}")] public async Task<IActionResult> Update(int id, Supplier m)
        {
            m.SupplierId = id;
            return await _repo.UpdateAsync(m) ? NoContent() : NotFound();
        }
        [HttpDelete("{id}")] public async Task<IActionResult> Delete(int id)
            => await _repo.SoftDeleteAsync(id) ? NoContent() : NotFound();
    }
}
