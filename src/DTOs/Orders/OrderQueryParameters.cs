namespace ECommerceApi.DTOs.Orders;

public class OrderQueryParameters
{
    public int Page { get; set; } = 1;
    public int Limit { get; set; } = 20;
    public string? Status { get; set; }
}
