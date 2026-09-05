using ECommerceApi.Exceptions;
using ECommerceApi.Models;
using ECommerceApi.Repositories.Interfaces;
using ECommerceApi.Services.Implementations;
using FluentAssertions;
using Moq;
using Xunit;

namespace ECommerceApi.Tests.Unit.Services;

public class CartServiceTests
{
    private static Product MakeProduct(Guid? id = null, decimal price = 9.99m, int stock = 10, string name = "Widget")
    {
        return new Product
        {
            Id = id ?? Guid.NewGuid(),
            Name = name,
            Description = "A widget",
            Price = price,
            StockQuantity = stock,
            IsDeleted = false,
            CreatedAt = DateTime.UtcNow
        };
    }

    private static Cart MakeCart(Guid? id = null, Guid? userId = null, List<CartItem>? items = null)
    {
        return new Cart
        {
            Id = id ?? Guid.NewGuid(),
            UserId = userId ?? Guid.NewGuid(),
            Items = items ?? new List<CartItem>()
        };
    }

    private readonly Mock<ICartRepository> _cartRepository = new();
    private readonly Mock<IProductRepository> _productRepository = new();

    private CartService CreateService() => new(_cartRepository.Object, _productRepository.Object);

    [Fact]
    public async Task AddItem_ToEmptyCart_AddsProduct()
    {
        var userId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var cart = MakeCart(userId: userId);
        var product = MakeProduct(id: productId, stock: 10);

        _cartRepository.Setup(r => r.FindOrCreateByUserAsync(userId)).ReturnsAsync(cart);
        _productRepository.Setup(r => r.FindByIdAsync(productId)).ReturnsAsync(product);
        _cartRepository.Setup(r => r.FindItemAsync(cart.Id, productId)).ReturnsAsync((CartItem?)null);
        _cartRepository
            .Setup(r => r.AddItemAsync(cart.Id, productId, 1))
            .ReturnsAsync(MakeCart(id: cart.Id, userId: userId, items: new List<CartItem>
            {
                new() { Id = Guid.NewGuid(), CartId = cart.Id, ProductId = productId, Quantity = 1, Product = product }
            }));

        var service = CreateService();
        var result = await service.AddItemAsync(userId, productId, 1);

        result.Items.Should().HaveCount(1);
        _cartRepository.Verify(r => r.AddItemAsync(cart.Id, productId, 1), Times.Once);
    }

    [Fact]
    public async Task AddItem_WhenAlreadyInCart_IncrementsInsteadOfDuplicating()
    {
        var userId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var cart = MakeCart(userId: userId);
        var product = MakeProduct(id: productId, stock: 10);
        var existingItem = new CartItem { Id = Guid.NewGuid(), CartId = cart.Id, ProductId = productId, Quantity = 1 };

        _cartRepository.Setup(r => r.FindOrCreateByUserAsync(userId)).ReturnsAsync(cart);
        _productRepository.Setup(r => r.FindByIdAsync(productId)).ReturnsAsync(product);
        _cartRepository.Setup(r => r.FindItemAsync(cart.Id, productId)).ReturnsAsync(existingItem);
        _cartRepository
            .Setup(r => r.UpdateItemQuantityAsync(cart.Id, existingItem.Id, 2))
            .ReturnsAsync(MakeCart(id: cart.Id, userId: userId));

        var service = CreateService();
        await service.AddItemAsync(userId, productId, 1);

        _cartRepository.Verify(r => r.UpdateItemQuantityAsync(cart.Id, existingItem.Id, 2), Times.Once);
        _cartRepository.Verify(r => r.AddItemAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<int>()), Times.Never);
    }

    [Fact]
    public async Task AddItem_WithZeroQuantity_ThrowsValidation()
    {
        var service = CreateService();
        var act = () => service.AddItemAsync(Guid.NewGuid(), Guid.NewGuid(), 0);
        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task AddItem_WithNegativeQuantity_ThrowsValidation()
    {
        var service = CreateService();
        var act = () => service.AddItemAsync(Guid.NewGuid(), Guid.NewGuid(), -1);
        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task AddItem_WithNonExistentProduct_ThrowsNotFound()
    {
        var userId = Guid.NewGuid();
        var cart = MakeCart(userId: userId);
        _cartRepository.Setup(r => r.FindOrCreateByUserAsync(userId)).ReturnsAsync(cart);
        _productRepository.Setup(r => r.FindByIdAsync(It.IsAny<Guid>())).ReturnsAsync((Product?)null);

        var service = CreateService();
        var act = () => service.AddItemAsync(userId, Guid.NewGuid(), 1);

        await act.Should().ThrowAsync<NotFoundAppException>();
    }

    [Fact]
    public async Task AddItem_ExceedingStock_ThrowsValidation()
    {
        var userId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var cart = MakeCart(userId: userId);
        var product = MakeProduct(id: productId, stock: 2);

        _cartRepository.Setup(r => r.FindOrCreateByUserAsync(userId)).ReturnsAsync(cart);
        _productRepository.Setup(r => r.FindByIdAsync(productId)).ReturnsAsync(product);
        _cartRepository.Setup(r => r.FindItemAsync(cart.Id, productId)).ReturnsAsync((CartItem?)null);

        var service = CreateService();
        var act = () => service.AddItemAsync(userId, productId, 5);

        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task UpdateItemQuantity_ToZero_RemovesItem()
    {
        var userId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var itemId = Guid.NewGuid();
        var cart = MakeCart(userId: userId, items: new List<CartItem>
        {
            new() { Id = itemId, CartId = Guid.NewGuid(), ProductId = productId, Quantity = 1 }
        });

        _cartRepository.Setup(r => r.FindOrCreateByUserAsync(userId)).ReturnsAsync(cart);
        _cartRepository.Setup(r => r.RemoveItemAsync(cart.Id, itemId)).ReturnsAsync(MakeCart(id: cart.Id, userId: userId));

        var service = CreateService();
        await service.UpdateItemQuantityAsync(userId, productId, 0);

        _cartRepository.Verify(r => r.RemoveItemAsync(cart.Id, itemId), Times.Once);
    }

    [Fact]
    public async Task UpdateItemQuantity_AboveStock_ThrowsValidation()
    {
        var userId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var itemId = Guid.NewGuid();
        var cart = MakeCart(userId: userId, items: new List<CartItem>
        {
            new() { Id = itemId, CartId = Guid.NewGuid(), ProductId = productId, Quantity = 1 }
        });
        var product = MakeProduct(id: productId, stock: 3);

        _cartRepository.Setup(r => r.FindOrCreateByUserAsync(userId)).ReturnsAsync(cart);
        _productRepository.Setup(r => r.FindByIdAsync(productId)).ReturnsAsync(product);

        var service = CreateService();
        var act = () => service.UpdateItemQuantityAsync(userId, productId, 5);

        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task UpdateItemQuantity_ForProductNotInCart_ThrowsNotFound()
    {
        var userId = Guid.NewGuid();
        var cart = MakeCart(userId: userId, items: new List<CartItem>());
        _cartRepository.Setup(r => r.FindOrCreateByUserAsync(userId)).ReturnsAsync(cart);

        var service = CreateService();
        var act = () => service.UpdateItemQuantityAsync(userId, Guid.NewGuid(), 1);

        await act.Should().ThrowAsync<NotFoundAppException>();
    }

    [Fact]
    public async Task RemoveItem_Existing_RemovesFromCart()
    {
        var userId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var itemId = Guid.NewGuid();
        var cart = MakeCart(userId: userId, items: new List<CartItem>
        {
            new() { Id = itemId, CartId = Guid.NewGuid(), ProductId = productId, Quantity = 1 }
        });

        _cartRepository.Setup(r => r.FindOrCreateByUserAsync(userId)).ReturnsAsync(cart);
        _cartRepository.Setup(r => r.RemoveItemAsync(cart.Id, itemId)).ReturnsAsync(MakeCart(id: cart.Id, userId: userId));

        var service = CreateService();
        await service.RemoveItemAsync(userId, productId);

        _cartRepository.Verify(r => r.RemoveItemAsync(cart.Id, itemId), Times.Once);
    }
}
