using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using PharmacyManagemntWebApi.Models;
using PharmacyManagemntWebApi.Repository;

namespace PharmacyManagemntWebApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UnitsController : ControllerBase
    {
        private readonly UnitRepo _unitRepo;

        public UnitsController(UnitRepo unitRepo)
        {
            _unitRepo = unitRepo;
        }

        // Get All Units
        [HttpGet]
        public async Task<IActionResult> GetAllUnits()
        {
            var units = await _unitRepo.GellAllUnits();

            if(units == null || !units.Any())
            {
                return NotFound("No units found.");
            }
            return Ok(units);
        }

        // Get By Id 

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var unit = await _unitRepo.GetByUnitID(id);
            if (unit == null)
            {
                return NotFound();
            }
            return Ok(unit);
        }

        [HttpPost]
        public async Task<IActionResult> Create(UnitModles m)
        {
            var id = await _unitRepo.CreateUnit(m);
            return CreatedAtAction(nameof(GetById), new { id }, new { UnitId = id });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, UnitModles m)
        {
            m.UnitId = id;
            return await _unitRepo.UpdateUnit(m) ? NoContent() : NotFound();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
            => await _unitRepo.SoftDeleteUnit(id) ? NoContent() : NotFound();

    }
}
