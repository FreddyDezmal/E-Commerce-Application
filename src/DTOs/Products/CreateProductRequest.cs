using System.ComponentModel.DataAnnotations;

namespace ECommerceApi.DTOs.Products;

public class CreateProductRequest
{
    [Required, MaxLength(255)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(2000)]
    public string? Description { get; set; }

    [Range(0, double.MaxValue, ErrorMessage = "Price must be zero or greater")]
    public decimal Price { get; set; }

    [Range(0, int.MaxValue, ErrorMessage = "Stock quantity must be zero or greater")]
    public int StockQuantity { get; set; }

    public Guid? CategoryId { get; set; }
}
