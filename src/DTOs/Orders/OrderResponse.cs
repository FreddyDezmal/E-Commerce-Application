namespace ECommerceApi.DTOs.Orders;

public class OrderItemResponse
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPriceAtPurchase { get; set; }
}

public class OrderResponse
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Status { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public Guid? ShippingAddressId { get; set; }
    public DateTime CreatedAt { get; set; }
    public IReadOnlyList<OrderItemResponse> Items { get; set; } = Array.Empty<OrderItemResponse>();
}
