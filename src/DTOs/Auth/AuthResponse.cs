namespace ECommerceApi.DTOs.Auth;

// Never includes PasswordHash — this is the "safe user" shape returned to the client
public class AuthResponse
{
    public UserResponse User { get; set; } = null!;
    public string Token { get; set; } = string.Empty;
}

public class UserResponse
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
