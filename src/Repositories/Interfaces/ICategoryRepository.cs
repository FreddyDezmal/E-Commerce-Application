using ECommerceApi.Models;

namespace ECommerceApi.Repositories.Interfaces;

public interface ICategoryRepository
{
    Task<List<Category>> FindAllAsync();
    Task<Category?> FindByIdAsync(Guid id);
    Task<Category?> FindByNameAsync(string name);
    Task<Category> CreateAsync(string name);
    Task<bool> HasActiveProductsAsync(Guid categoryId);
    Task DeleteAsync(Guid id);
}
