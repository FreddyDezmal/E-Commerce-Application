namespace ECommerceApi.Models;

public class Order
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public OrderStatus Status { get; set; } = OrderStatus.Pending;
    public decimal TotalAmount { get; set; }
    public Guid? ShippingAddressId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User? User { get; set; }
    public Address? ShippingAddress { get; set; }
    public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
}
