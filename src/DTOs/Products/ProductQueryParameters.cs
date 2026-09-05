namespace ECommerceApi.DTOs.Products;

public class ProductQueryParameters
{
    public string? Search { get; set; }
    public Guid? Category { get; set; }
    public int Page { get; set; } = 1;
    public int Limit { get; set; } = 20;
}
