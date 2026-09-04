using ECommerceApi.Exceptions;
using ECommerceApi.Models;
using ECommerceApi.Repositories.Interfaces;
using ECommerceApi.Services.Implementations;
using FluentAssertions;
using Moq;
using Xunit;

namespace ECommerceApi.Tests.Unit.Services;

public class OrderServiceTests
{
    private static Product MakeProduct(Guid? id = null, decimal price = 10m, int stock = 5, string name = "Widget")
    {
        return new Product { Id = id ?? Guid.NewGuid(), Name = name, Price = price, StockQuantity = stock, IsDeleted = false };
    }

    private static Cart MakeCart(Guid? id = null, Guid? userId = null, List<CartItem>? items = null)
    {
        return new Cart { Id = id ?? Guid.NewGuid(), UserId = userId ?? Guid.NewGuid(), Items = items ?? new List<CartItem>() };
    }

    private static Order MakeOrder(Guid? id = null, Guid? userId = null, OrderStatus status = OrderStatus.Pending, decimal total = 20m, List<OrderItem>? items = null)
    {
        return new Order
        {
            Id = id ?? Guid.NewGuid(),
            UserId = userId ?? Guid.NewGuid(),
            Status = status,
            TotalAmount = total,
            Items = items ?? new List<OrderItem>()
        };
    }

    private readonly Mock<IOrderRepository> _orderRepository = new();
    private readonly Mock<ICartRepository> _cartRepository = new();
    private readonly Mock<IProductRepository> _productRepository = new();

    private OrderService CreateService() => new(_orderRepository.Object, _cartRepository.Object, _productRepository.Object);

    // ── Checkout ─────────────────────────────────────────────

    [Fact]
    public async Task Checkout_WithEmptyCart_ThrowsValidation()
    {
        var userId = Guid.NewGuid();
        _cartRepository.Setup(r => r.FindOrCreateByUserAsync(userId)).ReturnsAsync(MakeCart(userId: userId));

        var service = CreateService();
        var act = () => service.CheckoutAsync(userId, null);

        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task Checkout_CalculatesCorrectTotalFromCurrentProductPrices()
    {
        var userId = Guid.NewGuid();
        var productAId = Guid.NewGuid();
        var productBId = Guid.NewGuid();

        var cart = MakeCart(userId: userId, items: new List<CartItem>
        {
            new() { Id = Guid.NewGuid(), ProductId = productAId, Quantity = 2 },
            new() { Id = Guid.NewGuid(), ProductId = productBId, Quantity = 1 }
        });

        _cartRepository.Setup(r => r.FindOrCreateByUserAsync(userId)).ReturnsAsync(cart);
        _productRepository.Setup(r => r.FindByIdAsync(productAId)).ReturnsAsync(MakeProduct(id: productAId, price: 10m, stock: 5));
        _productRepository.Setup(r => r.FindByIdAsync(productBId)).ReturnsAsync(MakeProduct(id: productBId, price: 25m, stock: 5));

        CreateOrderInput? captured = null;
        _orderRepository
            .Setup(r => r.CreateFromCartAsync(It.IsAny<CreateOrderInput>()))
            .Callback<CreateOrderInput>(input => captured = input)
            .ReturnsAsync(MakeOrder(userId: userId, total: 45m));

        var service = CreateService();
        var order = await service.CheckoutAsync(userId, null);

        order.TotalAmount.Should().Be(45m);
        captured.Should().NotBeNull();
        captured!.TotalAmount.Should().Be(45m); // 2*10 + 1*25
        captured.Items.Should().ContainSingle(i => i.ProductId == productAId && i.Quantity == 2 && i.UnitPriceAtPurchase == 10m);
        captured.Items.Should().ContainSingle(i => i.ProductId == productBId && i.Quantity == 1 && i.UnitPriceAtPurchase == 25m);
    }

    [Fact]
    public async Task Checkout_ExceedingStock_ThrowsValidation_AndDoesNotCreateOrder()
    {
        var userId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var cart = MakeCart(userId: userId, items: new List<CartItem>
        {
            new() { Id = Guid.NewGuid(), ProductId = productId, Quantity = 10 }
        });

        _cartRepository.Setup(r => r.FindOrCreateByUserAsync(userId)).ReturnsAsync(cart);
        _productRepository.Setup(r => r.FindByIdAsync(productId)).ReturnsAsync(MakeProduct(id: productId, stock: 2));

        var service = CreateService();
        var act = () => service.CheckoutAsync(userId, null);

        await act.Should().ThrowAsync<ValidationException>();
        _orderRepository.Verify(r => r.CreateFromCartAsync(It.IsAny<CreateOrderInput>()), Times.Never);
    }

    // ── Ownership ────────────────────────────────────────────

    [Fact]
    public async Task GetOrderForUser_OwnOrder_ReturnsOrder()
    {
        var userId = Guid.NewGuid();
        var order = MakeOrder(userId: userId);
        _orderRepository.Setup(r => r.FindByIdAsync(order.Id)).ReturnsAsync(order);

        var service = CreateService();
        var result = await service.GetOrderForUserAsync(order.Id, userId, Role.Customer);

        result.Id.Should().Be(order.Id);
    }

    [Fact]
    public async Task GetOrderForUser_DifferentCustomer_ThrowsForbidden()
    {
        var ownerId = Guid.NewGuid();
        var requesterId = Guid.NewGuid();
        var order = MakeOrder(userId: ownerId);
        _orderRepository.Setup(r => r.FindByIdAsync(order.Id)).ReturnsAsync(order);

        var service = CreateService();
        var act = () => service.GetOrderForUserAsync(order.Id, requesterId, Role.Customer);

        await act.Should().ThrowAsync<ForbiddenAppException>();
    }

    [Fact]
    public async Task GetOrderForUser_Admin_CanViewAnyOrder()
    {
        var ownerId = Guid.NewGuid();
        var order = MakeOrder(userId: ownerId);
        _orderRepository.Setup(r => r.FindByIdAsync(order.Id)).ReturnsAsync(order);

        var service = CreateService();
        var result = await service.GetOrderForUserAsync(order.Id, Guid.NewGuid(), Role.Admin);

        result.Id.Should().Be(order.Id);
    }

    [Fact]
    public async Task GetOrderForUser_NonExistentOrder_ThrowsNotFound()
    {
        _orderRepository.Setup(r => r.FindByIdAsync(It.IsAny<Guid>())).ReturnsAsync((Order?)null);
        var service = CreateService();

        var act = () => service.GetOrderForUserAsync(Guid.NewGuid(), Guid.NewGuid(), Role.Customer);

        await act.Should().ThrowAsync<NotFoundAppException>();
    }

    // ── State machine ────────────────────────────────────────

    [Theory]
    [InlineData(OrderStatus.Pending, OrderStatus.Paid)]
    [InlineData(OrderStatus.Paid, OrderStatus.Shipped)]
    [InlineData(OrderStatus.Shipped, OrderStatus.Delivered)]
    [InlineData(OrderStatus.Pending, OrderStatus.Cancelled)]
    public async Task UpdateStatus_ValidTransition_Succeeds(OrderStatus from, OrderStatus to)
    {
        var order = MakeOrder(status: from);
        _orderRepository.Setup(r => r.FindByIdAsync(order.Id)).ReturnsAsync(order);
        _orderRepository.Setup(r => r.UpdateStatusAsync(order.Id, to)).ReturnsAsync(MakeOrder(id: order.Id, status: to));

        var service = CreateService();
        var result = await service.UpdateStatusAsync(order.Id, to);

        result.Status.Should().Be(to.ToString().ToLowerInvariant());
    }

    [Theory]
    [InlineData(OrderStatus.Delivered, OrderStatus.Pending)]
    [InlineData(OrderStatus.Shipped, OrderStatus.Pending)]
    [InlineData(OrderStatus.Cancelled, OrderStatus.Paid)]
    [InlineData(OrderStatus.Delivered, OrderStatus.Cancelled)]
    public async Task UpdateStatus_InvalidTransition_ThrowsValidation_AndDoesNotPersist(OrderStatus from, OrderStatus to)
    {
        var order = MakeOrder(status: from);
        _orderRepository.Setup(r => r.FindByIdAsync(order.Id)).ReturnsAsync(order);

        var service = CreateService();
        var act = () => service.UpdateStatusAsync(order.Id, to);

        await act.Should().ThrowAsync<ValidationException>();
        _orderRepository.Verify(r => r.UpdateStatusAsync(It.IsAny<Guid>(), It.IsAny<OrderStatus>()), Times.Never);
    }
}
