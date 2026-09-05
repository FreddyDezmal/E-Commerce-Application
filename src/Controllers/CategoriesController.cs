using ECommerceApi.DTOs.Categories;
using ECommerceApi.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECommerceApi.Controllers;

[ApiController]
[Route("api/categories")]
public class CategoriesController : ControllerBase
{
    private readonly ICategoryService _categoryService;

    public CategoriesController(ICategoryService categoryService)
    {
        _categoryService = categoryService;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> List()
    {
        var categories = await _categoryService.ListCategoriesAsync();
        return Ok(categories);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(CategoryResponse), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] CreateCategoryRequest request)
    {
        var category = await _categoryService.CreateCategoryAsync(request);
        return StatusCode(StatusCodes.Status201Created, category);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _categoryService.DeleteCategoryAsync(id);
        return NoContent();
    }
}
