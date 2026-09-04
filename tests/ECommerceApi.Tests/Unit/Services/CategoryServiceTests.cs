using ECommerceApi.DTOs.Categories;
using ECommerceApi.Exceptions;
using ECommerceApi.Models;
using ECommerceApi.Repositories.Interfaces;
using ECommerceApi.Services.Implementations;
using FluentAssertions;
using Moq;
using Xunit;

namespace ECommerceApi.Tests.Unit.Services;

public class CategoryServiceTests
{
    private readonly Mock<ICategoryRepository> _categoryRepository = new();
    private CategoryService CreateService() => new(_categoryRepository.Object);

    [Fact]
    public async Task CreateCategory_WithUniqueName_Succeeds()
    {
        _categoryRepository.Setup(r => r.FindByNameAsync("Electronics")).ReturnsAsync((Category?)null);
        _categoryRepository.Setup(r => r.CreateAsync("Electronics")).ReturnsAsync(new Category { Name = "Electronics" });

        var service = CreateService();
        var result = await service.CreateCategoryAsync(new CreateCategoryRequest { Name = "Electronics" });

        result.Name.Should().Be("Electronics");
    }

    [Fact]
    public async Task CreateCategory_WithDuplicateName_ThrowsConflict()
    {
        _categoryRepository.Setup(r => r.FindByNameAsync("Electronics")).ReturnsAsync(new Category { Name = "Electronics" });
        var service = CreateService();

        var act = () => service.CreateCategoryAsync(new CreateCategoryRequest { Name = "Electronics" });

        await act.Should().ThrowAsync<ConflictAppException>();
    }

    [Fact]
    public async Task DeleteCategory_WithActiveProducts_ThrowsConflict()
    {
        var id = Guid.NewGuid();
        _categoryRepository.Setup(r => r.FindByIdAsync(id)).ReturnsAsync(new Category { Id = id, Name = "Electronics" });
        _categoryRepository.Setup(r => r.HasActiveProductsAsync(id)).ReturnsAsync(true);

        var service = CreateService();
        var act = () => service.DeleteCategoryAsync(id);

        await act.Should().ThrowAsync<ConflictAppException>();
        _categoryRepository.Verify(r => r.DeleteAsync(It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task DeleteCategory_WithNoActiveProducts_Succeeds()
    {
        var id = Guid.NewGuid();
        _categoryRepository.Setup(r => r.FindByIdAsync(id)).ReturnsAsync(new Category { Id = id, Name = "Electronics" });
        _categoryRepository.Setup(r => r.HasActiveProductsAsync(id)).ReturnsAsync(false);

        var service = CreateService();
        await service.DeleteCategoryAsync(id);

        _categoryRepository.Verify(r => r.DeleteAsync(id), Times.Once);
    }

    [Fact]
    public async Task DeleteCategory_NonExistent_ThrowsNotFound()
    {
        _categoryRepository.Setup(r => r.FindByIdAsync(It.IsAny<Guid>())).ReturnsAsync((Category?)null);
        var service = CreateService();

        var act = () => service.DeleteCategoryAsync(Guid.NewGuid());

        await act.Should().ThrowAsync<NotFoundAppException>();
    }
}
