using ECommerceApi.Data;
using ECommerceApi.Models;
using ECommerceApi.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ECommerceApi.Repositories.Implementations;

public class ProductRepository : IProductRepository
{
    private const int MaxLimit = 100;

    private readonly AppDbContext _context;

    public ProductRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<PagedProducts> FindManyAsync(ProductFilter filter)
    {
        var page = Math.Max(filter.Page, 1);
        var limit = Math.Min(Math.Max(filter.Limit, 1), MaxLimit);

        // The Product query filter (IsDeleted == false) is applied automatically here
        var query = _context.Products.AsNoTracking().AsQueryable();

        if (filter.CategoryId is { } categoryId)
        {
            query = query.Where(p => p.CategoryId == categoryId);
        }

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var search = filter.Search.Trim();
            query = query.Where(p => EF.Functions.ILike(p.Name, $"%{search}%"));
        }

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        return new PagedProducts(items, total);
    }

    public async Task<Product?> FindByIdAsync(Guid id)
    {
        return await _context.Products.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id);
    }

    public async Task<Product?> FindByIdIncludingDeletedAsync(Guid id)
    {
        return await _context.Products
            .IgnoreQueryFilters()
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == id);
    }

    public async Task<Product> CreateAsync(Product product)
    {
        _context.Products.Add(product);
        await _context.SaveChangesAsync();
        return product;
    }

    public async Task<Product> UpdateAsync(Guid id, Action<Product> apply)
    {
        var product = await _context.Products.FirstAsync(p => p.Id == id);
        apply(product);
        await _context.SaveChangesAsync();
        return product;
    }

    public async Task<Product> SoftDeleteAsync(Guid id)
    {
        var product = await _context.Products.FirstAsync(p => p.Id == id);
        product.IsDeleted = true;
        await _context.SaveChangesAsync();
        return product;
    }

    public async Task DecrementStockAsync(Guid productId, int quantity)
    {
        // Loaded and tracked so the decrement is actually persisted on SaveChangesAsync.
        var product = await _context.Products.FirstAsync(p => p.Id == productId);
        product.StockQuantity -= quantity;
        await _context.SaveChangesAsync();
    }
}
