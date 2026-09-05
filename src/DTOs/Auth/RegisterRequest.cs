using System.ComponentModel.DataAnnotations;

namespace ECommerceApi.DTOs.Auth;

public class RegisterRequest
{
    [Required, EmailAddress, MaxLength(255)]
    public string Email { get; set; } = string.Empty;

    // Complexity (letter + digit) is enforced in AuthService, not here stack becomes unreadable; keeping the actual rule in the Service
    // layer also keeps it unit-testable without a live HTTP pipeline.
    [Required, MinLength(8), MaxLength(100)]
    public string Password { get; set; } = string.Empty;

    [Required, MaxLength(255)]
    public string FullName { get; set; } = string.Empty;
}
