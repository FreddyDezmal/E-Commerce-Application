using System.ComponentModel.DataAnnotations;

namespace ECommerceApi.DTOs.Products;

// All fields optional. This is a partial-update (PATCH-semantics) DTO
public class UpdateProductRequest
{
    [MaxLength(255)]
    public string? Name { get; set; }

    [MaxLength(2000)]
    public string? Description { get; set; }

    [Range(0, double.MaxValue, ErrorMessage = "Price must be zero or greater")]
    public decimal? Price { get; set; }

    [Range(0, int.MaxValue, ErrorMessage = "Stock quantity must be zero or greater")]
    public int? StockQuantity { get; set; }

    public Guid? CategoryId { get; set; }
}
