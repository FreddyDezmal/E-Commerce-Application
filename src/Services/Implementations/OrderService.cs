using ECommerceApi.DTOs.Orders;
using ECommerceApi.Exceptions;
using ECommerceApi.Models;
using ECommerceApi.Repositories.Interfaces;
using ECommerceApi.Services.Interfaces;

namespace ECommerceApi.Services.Implementations;

public class OrderService : IOrderService
{
    
    // Allowed order status transitions
    
    private static readonly Dictionary<OrderStatus, OrderStatus[]> AllowedTransitions = new()
    {
        [OrderStatus.Pending] = new[] { OrderStatus.Paid, OrderStatus.Cancelled },
        [OrderStatus.Paid] = new[] { OrderStatus.Shipped, OrderStatus.Cancelled },
        [OrderStatus.Shipped] = new[] { OrderStatus.Delivered },
        [OrderStatus.Delivered] = Array.Empty<OrderStatus>(),
        [OrderStatus.Cancelled] = Array.Empty<OrderStatus>()
    };

    private readonly IOrderRepository _orderRepository;
    private readonly ICartRepository _cartRepository;
    private readonly IProductRepository _productRepository;

    public OrderService(IOrderRepository orderRepository, ICartRepository cartRepository, IProductRepository productRepository)
    {
        _orderRepository = orderRepository;
        _cartRepository = cartRepository;
        _productRepository = productRepository;
    }

    /// <summary>
    /// Checkout: cart -> order. Re-validates cart contents and CURRENT
    /// stock/price before delegating the atomic write to the repository's
    /// transaction (Milestone 2 §23/§25). Never trusts a client-supplied
    /// price — totals are always derived from Product.Price read here.
    /// </summary>
    public async Task<OrderResponse> CheckoutAsync(Guid userId, Guid? shippingAddressId)
    {
        var cart = await _cartRepository.FindOrCreateByUserAsync(userId);

        if (cart.Items.Count == 0)
        {
            throw new ValidationException("Cannot checkout with an empty cart");
        }

        decimal totalAmount = 0m;
        var orderItems = new List<CreateOrderItemInput>();

        foreach (var cartItem in cart.Items)
        {
            var product = await _productRepository.FindByIdAsync(cartItem.ProductId);
            if (product is null)
            {
                // Covers both "never existed" and "since soft-deleted"
                throw new NotFoundAppException($"Product {cartItem.ProductId}");
            }
            if (cartItem.Quantity > product.StockQuantity)
            {
                throw new ValidationException($"\"{product.Name}\" only has {product.StockQuantity} unit(s) in stock");
            }

            totalAmount += product.Price * cartItem.Quantity;
            orderItems.Add(new CreateOrderItemInput(product.Id, cartItem.Quantity, product.Price));
        }

        var order = await _orderRepository.CreateFromCartAsync(
            new CreateOrderInput(userId, shippingAddressId, Math.Round(totalAmount, 2), orderItems));

        return Map(order);
    }

    public async Task<OrderResponse> GetOrderForUserAsync(Guid orderId, Guid requesterId, Role requesterRole)
    {
        var order = await _orderRepository.FindByIdAsync(orderId);
        if (order is null)
        {
            throw new NotFoundAppException("Order");
        }

        // Ownership check: role alone is insufficient
        if (requesterRole != Role.Admin && order.UserId != requesterId)
        {
            throw new ForbiddenAppException("You do not have access to this order");
        }

        return Map(order);
    }

    public async Task<PagedOrdersResponse> ListOrdersForUserAsync(Guid userId, int page, int limit)
    {
        var result = await _orderRepository.FindByUserAsync(userId, page, limit);
        return new PagedOrdersResponse { Items = result.Items.Select(Map).ToList(), Total = result.Total };
    }

    public async Task<PagedOrdersResponse> ListAllOrdersAsync(int page, int limit, OrderStatus? status)
    {
        var result = await _orderRepository.FindAllAsync(page, limit, status);
        return new PagedOrdersResponse { Items = result.Items.Select(Map).ToList(), Total = result.Total };
    }

    public async Task<OrderResponse> UpdateStatusAsync(Guid orderId, OrderStatus nextStatus)
    {
        var order = await _orderRepository.FindByIdAsync(orderId);
        if (order is null)
        {
            throw new NotFoundAppException("Order");
        }

        var allowed = AllowedTransitions[order.Status];
        if (!allowed.Contains(nextStatus))
        {
            throw new ValidationException($"Cannot transition order from '{order.Status}' to '{nextStatus}'");
        }

        var updated = await _orderRepository.UpdateStatusAsync(orderId, nextStatus);
        return Map(updated);
    }

    private static OrderResponse Map(Order order)
    {
        return new OrderResponse
        {
            Id = order.Id,
            UserId = order.UserId,
            Status = order.Status.ToString().ToLowerInvariant(),
            TotalAmount = order.TotalAmount,
            ShippingAddressId = order.ShippingAddressId,
            CreatedAt = order.CreatedAt,
            Items = order.Items.Select(i => new OrderItemResponse
            {
                Id = i.Id,
                ProductId = i.ProductId,
                ProductName = i.Product?.Name ?? "Unknown product",
                Quantity = i.Quantity,
                UnitPriceAtPurchase = i.UnitPriceAtPurchase
            }).ToList()
        };
    }
}
