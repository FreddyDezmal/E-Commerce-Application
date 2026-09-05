using System.ComponentModel.DataAnnotations;

namespace ECommerceApi.DTOs.Orders;

public class UpdateOrderStatusRequest
{
    [Required]
    public string Status { get; set; } = string.Empty;
}
