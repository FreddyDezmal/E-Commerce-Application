using System.ComponentModel.DataAnnotations;

namespace ECommerceApi.DTOs.Cart;

public class AddCartItemRequest
{
    [Required]
    public Guid ProductId { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "Quantity must be a positive integer")]
    public int Quantity { get; set; }
}
