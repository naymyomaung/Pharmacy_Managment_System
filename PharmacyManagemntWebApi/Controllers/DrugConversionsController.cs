using Microsoft.AspNetCore.Mvc;
using PharmacyManagemntWebApi.Models;
using PharmacyManagemntWebApi.Repository;

namespace PharmacyManagemntWebApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DrugConversionsController : ControllerBase
    {
        private readonly DrugConversionRepo _repo;
        public DrugConversionsController(DrugConversionRepo repo) => _repo = repo;

        [HttpGet] public async Task<IActionResult> GetAll() => Ok(await _repo.GetAllAsync());
        [HttpGet("{id}")] public async Task<IActionResult> GetById(int id)
        {
            var d = await _repo.GetByIdAsync(id);
            return d == null ? NotFound() : Ok(d);
        }
        [HttpGet("by-drug/{drugId}")] public async Task<IActionResult> GetByDrug(int drugId)
            => Ok(await _repo.GetByDrugIdAsync(drugId));
        [HttpPost] public async Task<IActionResult> Create(DrugConversion m)
        {
            var id = await _repo.CreateAsync(m);
            return CreatedAtAction(nameof(GetById), new { id }, new { ConversionId = id });
        }
        [HttpPut("{id}")] public async Task<IActionResult> Update(int id, DrugConversion m)
        {
            m.ConversionId = id;
            return await _repo.UpdateAsync(m) ? NoContent() : NotFound();
        }
        [HttpDelete("{id}")] public async Task<IActionResult> Delete(int id)
            => await _repo.DeleteAsync(id) ? NoContent() : NotFound();
    }
}
