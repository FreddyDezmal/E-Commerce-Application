using ECommerceApi.DTOs.Products;
using ECommerceApi.Exceptions;
using ECommerceApi.Models;
using ECommerceApi.Repositories.Interfaces;
using ECommerceApi.Services.Implementations;
using FluentAssertions;
using Moq;
using Xunit;

namespace ECommerceApi.Tests.Unit.Services;

public class ProductServiceTests
{
    private static Product MakeProduct(Guid? id = null, bool isDeleted = false)
    {
        return new Product
        {
            Id = id ?? Guid.NewGuid(),
            Name = "Widget",
            Description = "A widget",
            Price = 9.99m,
            StockQuantity = 10,
            IsDeleted = isDeleted,
            CreatedAt = DateTime.UtcNow
        };
    }

    private readonly Mock<IProductRepository> _productRepository = new();
    private readonly Mock<ICategoryRepository> _categoryRepository = new();

    private ProductService CreateService() => new(_productRepository.Object, _categoryRepository.Object);

    [Fact]
    public async Task CreateProduct_WithValidFields_Succeeds()
    {
        _productRepository.Setup(r => r.CreateAsync(It.IsAny<Product>())).ReturnsAsync(MakeProduct());

        var service = CreateService();
        var result = await service.CreateProductAsync(new CreateProductRequest
        {
            Name = "Widget",
            Description = "A widget",
            Price = 9.99m,
            StockQuantity = 10,
            CategoryId = null
        });

        result.Name.Should().Be("Widget");
        _productRepository.Verify(r => r.CreateAsync(It.IsAny<Product>()), Times.Once);
    }

    [Fact]
    public async Task CreateProduct_WithNegativePrice_ThrowsValidation()
    {
        var service = CreateService();
        var act = () => service.CreateProductAsync(new CreateProductRequest { Name = "Widget", Price = -5, StockQuantity = 10 });
        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task CreateProduct_WithNegativeStock_ThrowsValidation()
    {
        var service = CreateService();
        var act = () => service.CreateProductAsync(new CreateProductRequest { Name = "Widget", Price = 5, StockQuantity = -1 });
        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task GetProduct_Existing_ReturnsProduct()
    {
        var id = Guid.NewGuid();
        _productRepository.Setup(r => r.FindByIdAsync(id)).ReturnsAsync(MakeProduct(id));

        var service = CreateService();
        var result = await service.GetProductAsync(id);

        result.Id.Should().Be(id);
    }

    [Fact]
    public async Task GetProduct_Missing_ThrowsNotFound()
    {
        _productRepository.Setup(r => r.FindByIdAsync(It.IsAny<Guid>())).ReturnsAsync((Product?)null);
        var service = CreateService();

        var act = () => service.GetProductAsync(Guid.NewGuid());

        await act.Should().ThrowAsync<NotFoundAppException>();
    }

    [Fact]
    public async Task DeactivateProduct_SoftDeletesRatherThanHardDeleting()
    {
        var id = Guid.NewGuid();
        _productRepository.Setup(r => r.FindByIdAsync(id)).ReturnsAsync(MakeProduct(id));
        _productRepository.Setup(r => r.SoftDeleteAsync(id)).ReturnsAsync(MakeProduct(id, isDeleted: true));

        var service = CreateService();
        var result = await service.DeactivateProductAsync(id);

        result.IsDeleted.Should().BeTrue();
        _productRepository.Verify(r => r.SoftDeleteAsync(id), Times.Once);
    }
}
