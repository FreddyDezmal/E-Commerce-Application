using ECommerceApi.DTOs.Categories;
using ECommerceApi.Exceptions;
using ECommerceApi.Repositories.Interfaces;
using ECommerceApi.Services.Interfaces;

namespace ECommerceApi.Services.Implementations;

public class CategoryService : ICategoryService
{
    private readonly ICategoryRepository _categoryRepository;

    public CategoryService(ICategoryRepository categoryRepository)
    {
        _categoryRepository = categoryRepository;
    }

    public async Task<List<CategoryResponse>> ListCategoriesAsync()
    {
        var categories = await _categoryRepository.FindAllAsync();
        return categories.Select(c => new CategoryResponse { Id = c.Id, Name = c.Name }).ToList();
    }

    public async Task<CategoryResponse> CreateCategoryAsync(CreateCategoryRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new ValidationException("Category name is required");
        }

        var existing = await _categoryRepository.FindByNameAsync(request.Name);
        if (existing is not null)
        {
            throw new ConflictAppException("A category with this name already exists");
        }

        var category = await _categoryRepository.CreateAsync(request.Name);
        return new CategoryResponse { Id = category.Id, Name = category.Name };
    }

    
    // Category deletion is blocked if any active product still references it
  
    public async Task DeleteCategoryAsync(Guid id)
    {
        var category = await _categoryRepository.FindByIdAsync(id);
        if (category is null)
        {
            throw new NotFoundAppException("Category");
        }

        var hasProducts = await _categoryRepository.HasActiveProductsAsync(id);
        if (hasProducts)
        {
            throw new ConflictAppException("Cannot delete a category that still has active products");
        }

        await _categoryRepository.DeleteAsync(id);
    }
}
