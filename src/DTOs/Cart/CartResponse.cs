namespace ECommerceApi.DTOs.Cart;

public class CartItemResponse
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }
}

public class CartResponse
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public IReadOnlyList<CartItemResponse> Items { get; set; } = Array.Empty<CartItemResponse>();
    public decimal Subtotal { get; set; }
}
