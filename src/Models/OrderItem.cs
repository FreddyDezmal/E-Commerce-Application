namespace ECommerceApi.Models;

public class OrderItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OrderId { get; set; }
    public Guid ProductId { get; set; }
    public int Quantity { get; set; }

    // Snapshot of Product.Price at the moment of purchase (Milestone 2 §7).
    // MUST NEVER be recalculated from the product's current price.
    public decimal UnitPriceAtPurchase { get; set; }

    public Order? Order { get; set; }
    public Product? Product { get; set; }
}
