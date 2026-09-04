namespace ECommerceApi.Authentication;

// Bound from configuration ("Jwt" section) 
// ExpiryMinutes all come from appsettings/environment variables, never hard-coded
public class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Key { get; set; } = string.Empty;
    public string Issuer { get; set; } = string.Empty;
    public string Audience { get; set; } = string.Empty;
    public int ExpiryMinutes { get; set; } = 60;
}
