using System.ComponentModel.DataAnnotations;

namespace ECommerceApi.Models;

public class Product
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal Price { get; set; }
    public int StockQuantity { get; set; }
    public Guid? CategoryId { get; set; }

    public bool IsDeleted { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Concurrency token: protects against two simultaneous requests both decrementing stock based on stale reads.
    [Timestamp]
    public byte[] RowVersion { get; set; } = default!;

    public Category? Category { get; set; }
    public ICollection<CartItem> CartItems { get; set; } = new List<CartItem>();
    public ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
}