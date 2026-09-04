using ECommerceApi.DTOs.Orders;
using ECommerceApi.Models;

namespace ECommerceApi.Services.Interfaces;

public interface IOrderService
{
    Task<OrderResponse> CheckoutAsync(Guid userId, Guid? shippingAddressId);
    Task<OrderResponse> GetOrderForUserAsync(Guid orderId, Guid requesterId, Role requesterRole);
    Task<PagedOrdersResponse> ListOrdersForUserAsync(Guid userId, int page, int limit);
    Task<PagedOrdersResponse> ListAllOrdersAsync(int page, int limit, OrderStatus? status);
    Task<OrderResponse> UpdateStatusAsync(Guid orderId, OrderStatus nextStatus);
}

public class PagedOrdersResponse
{
    public IReadOnlyList<OrderResponse> Items { get; set; } = Array.Empty<OrderResponse>();
    public int Total { get; set; }
}
