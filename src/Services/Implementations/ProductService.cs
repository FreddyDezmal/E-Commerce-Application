using ECommerceApi.DTOs.Products;
using ECommerceApi.Exceptions;
using ECommerceApi.Models;
using ECommerceApi.Repositories.Interfaces;
using ECommerceApi.Services.Interfaces;

namespace ECommerceApi.Services.Implementations;

public class ProductService : IProductService
{
    private readonly IProductRepository _productRepository;
    private readonly ICategoryRepository _categoryRepository;

    public ProductService(IProductRepository productRepository, ICategoryRepository categoryRepository)
    {
        _productRepository = productRepository;
        _categoryRepository = categoryRepository;
    }

    public async Task<PagedResult<ProductResponse>> ListProductsAsync(ProductQueryParameters query)
    {
        var result = await _productRepository.FindManyAsync(
            new ProductFilter(query.Search, query.Category, query.Page, query.Limit));

        return new PagedResult<ProductResponse>
        {
            Items = result.Items.Select(Map).ToList(),
            Total = result.Total,
            Page = query.Page,
            Limit = query.Limit
        };
    }

    public async Task<ProductResponse> GetProductAsync(Guid id)
    {
        var product = await _productRepository.FindByIdAsync(id);
        if (product is null)
        {
            throw new NotFoundAppException("Product");
        }
        return Map(product);
    }

    public async Task<ProductResponse> CreateProductAsync(CreateProductRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new ValidationException("Product name is required");
        }
        if (request.Price < 0)
        {
            throw new ValidationException("Price must be zero or greater");
        }
        if (request.StockQuantity < 0)
        {
            throw new ValidationException("Stock quantity must be zero or greater");
        }

        if (request.CategoryId is { } categoryId)
        {
            var category = await _categoryRepository.FindByIdAsync(categoryId);
            if (category is null)
            {
                throw new NotFoundAppException("Category");
            }
        }

        var product = await _productRepository.CreateAsync(new Product
        {
            Name = request.Name,
            Description = request.Description,
            Price = request.Price,
            StockQuantity = request.StockQuantity,
            CategoryId = request.CategoryId
        });

        return Map(product);
    }

    public async Task<ProductResponse> UpdateProductAsync(Guid id, UpdateProductRequest request)
    {
        var existing = await _productRepository.FindByIdAsync(id);
        if (existing is null)
        {
            throw new NotFoundAppException("Product");
        }

        if (request.Price is { } price && price < 0)
        {
            throw new ValidationException("Price must be zero or greater");
        }
        if (request.StockQuantity is { } stock && stock < 0)
        {
            throw new ValidationException("Stock quantity must be zero or greater");
        }

        var updated = await _productRepository.UpdateAsync(id, product =>
        {
            if (request.Name is not null) product.Name = request.Name;
            if (request.Description is not null) product.Description = request.Description;
            if (request.Price is { } p) product.Price = p;
            if (request.StockQuantity is { } s) product.StockQuantity = s;
            if (request.CategoryId is { } c) product.CategoryId = c;
        });

        return Map(updated);
    }

    public async Task<ProductResponse> DeactivateProductAsync(Guid id)
    {
        var existing = await _productRepository.FindByIdAsync(id);
        if (existing is null)
        {
            throw new NotFoundAppException("Product");
        }
        var deactivated = await _productRepository.SoftDeleteAsync(id);
        return Map(deactivated);
    }

    private static ProductResponse Map(Product product)
    {
        return new ProductResponse
        {
            Id = product.Id,
            Name = product.Name,
            Description = product.Description,
            Price = product.Price,
            StockQuantity = product.StockQuantity,
            CategoryId = product.CategoryId,
            IsDeleted = product.IsDeleted,
            CreatedAt = product.CreatedAt
        };
    }
}
