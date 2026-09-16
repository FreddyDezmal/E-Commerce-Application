using System.ComponentModel.DataAnnotations;

namespace ECommerceApi.DTOs.Cart;

public class UpdateCartItemRequest
{
    [Range(0, int.MaxValue, ErrorMessage = "Quantity must be zero or a positive integer")]
    public int Quantity { get; set; }
}
