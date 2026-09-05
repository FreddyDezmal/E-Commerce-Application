using ECommerceApi.DTOs.Categories;

namespace ECommerceApi.Services.Interfaces;

public interface ICategoryService
{
    Task<List<CategoryResponse>> ListCategoriesAsync();
    Task<CategoryResponse> CreateCategoryAsync(CreateCategoryRequest request);
    Task DeleteCategoryAsync(Guid id);
}
