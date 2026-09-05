using ECommerceApi.Data;
using ECommerceApi.Models;
using ECommerceApi.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ECommerceApi.Repositories.Implementations;

public class CategoryRepository : ICategoryRepository
{
    private readonly AppDbContext _context;

    public CategoryRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<Category>> FindAllAsync()
    {
        return await _context.Categories.AsNoTracking().OrderBy(c => c.Name).ToListAsync();
    }

    public async Task<Category?> FindByIdAsync(Guid id)
    {
        return await _context.Categories.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id);
    }

    public async Task<Category?> FindByNameAsync(string name)
    {
        return await _context.Categories.AsNoTracking().FirstOrDefaultAsync(c => c.Name == name);
    }

    public async Task<Category> CreateAsync(string name)
    {
        var category = new Category { Name = name };
        _context.Categories.Add(category);
        await _context.SaveChangesAsync();
        return category;
    }

    public async Task<bool> HasActiveProductsAsync(Guid categoryId)
    {
        // Products DbSet already has the soft-delete query filter applied by default, so this naturally counts only active products.
        return await _context.Products.AnyAsync(p => p.CategoryId == categoryId);
    }

    public async Task DeleteAsync(Guid id)
    {
        var category = await _context.Categories.FirstAsync(c => c.Id == id);
        _context.Categories.Remove(category);
        await _context.SaveChangesAsync();
    }
}
