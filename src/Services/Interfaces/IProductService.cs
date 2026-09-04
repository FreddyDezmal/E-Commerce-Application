using ECommerceApi.DTOs.Products;

namespace ECommerceApi.Services.Interfaces;

public interface IProductService
{
    Task<PagedResult<ProductResponse>> ListProductsAsync(ProductQueryParameters query);
    Task<ProductResponse> GetProductAsync(Guid id);
    Task<ProductResponse> CreateProductAsync(CreateProductRequest request);
    Task<ProductResponse> UpdateProductAsync(Guid id, UpdateProductRequest request);
    Task<ProductResponse> DeactivateProductAsync(Guid id);
}
