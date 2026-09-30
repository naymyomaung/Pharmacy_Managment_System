using Microsoft.AspNetCore.Mvc;
using PharmacyManagemntWebApi.Models;
using PharmacyManagemntWebApi.Repository;

namespace PharmacyManagemntWebApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DrugsController : ControllerBase
    {
        private readonly DrugRepo _repo;
        public DrugsController(DrugRepo repo) => _repo = repo;

        [HttpGet] public async Task<IActionResult> GetAll() => Ok(await _repo.GetAllAsync());
        [HttpGet("{id}")] public async Task<IActionResult> GetById(int id)
        {
            var d = await _repo.GetByIdAsync(id);
            return d == null ? NotFound() : Ok(d);
        }
        [HttpGet("{id}/batches")] public async Task<IActionResult> GetBatches(int id)
        {
            var batches = await _repo.GetBatchesAsync(id);
            return Ok(batches);
        }
        [HttpPost] public async Task<IActionResult> Create(Drug m)
        {
            var id = await _repo.CreateAsync(m);
            return CreatedAtAction(nameof(GetById), new { id }, new { DrugId = id });
        }
        [HttpPut("{id}")] public async Task<IActionResult> Update(int id, Drug m)
        {
            m.DrugId = id;
            return await _repo.UpdateAsync(m) ? NoContent() : NotFound();
        }
        [HttpDelete("{id}")] public async Task<IActionResult> Delete(int id)
            => await _repo.SoftDeleteAsync(id) ? NoContent() : NotFound();
    }
}
