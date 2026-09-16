using ECommerceApi.Models;

namespace ECommerceApi.Repositories.Interfaces;

public record CreateOrderItemInput(Guid ProductId, int Quantity, decimal UnitPriceAtPurchase);
public record CreateOrderInput(Guid UserId, Guid? ShippingAddressId, decimal TotalAmount, List<CreateOrderItemInput> Items);
public record PagedOrders(List<Order> Items, int Total);

public interface IOrderRepository
{
    /*
      Atomic checkout: creates the order + order items, decrements stock for each product, and clears the cart, all
      inside a single database transaction. See OrderRepository for the EF Core transaction implementation.
    */
    Task<Order> CreateFromCartAsync(CreateOrderInput input);

    Task<Order?> FindByIdAsync(Guid id);
    Task<PagedOrders> FindByUserAsync(Guid userId, int page, int limit);
    Task<PagedOrders> FindAllAsync(int page, int limit, OrderStatus? status);
    Task<Order> UpdateStatusAsync(Guid id, OrderStatus status);
}
