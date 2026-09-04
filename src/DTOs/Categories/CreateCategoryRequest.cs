using System.ComponentModel.DataAnnotations;

namespace ECommerceApi.DTOs.Categories;

public class CreateCategoryRequest
{
    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;
}
