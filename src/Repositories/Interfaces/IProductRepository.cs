using ECommerceApi.Models;

namespace ECommerceApi.Repositories.Interfaces;

public record ProductFilter(string? Search, Guid? CategoryId, int Page = 1, int Limit = 20);
public record PagedProducts(List<Product> Items, int Total);

public interface IProductRepository
{
    Task<PagedProducts> FindManyAsync(ProductFilter filter);

    //Excludes soft-deleted products.
    Task<Product?> FindByIdAsync(Guid id);

    /*
      Bypasses the soft-delete query filter. Used only where a historical/administrative view genuinely needs a deleted product
    */
    Task<Product?> FindByIdIncludingDeletedAsync(Guid id);

    Task<Product> CreateAsync(Product product);
    Task<Product> UpdateAsync(Guid id, Action<Product> apply);
    Task<Product> SoftDeleteAsync(Guid id);
    Task DecrementStockAsync(Guid productId, int quantity);
}
