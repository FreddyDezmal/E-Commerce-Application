using System.ComponentModel.DataAnnotations;

namespace ECommerceApi.DTOs.Auth;

public class UpdateProfileRequest
{
    [MaxLength(255)]
    public string? FullName { get; set; }
}
