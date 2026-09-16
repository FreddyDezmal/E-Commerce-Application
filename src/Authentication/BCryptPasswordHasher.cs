namespace ECommerceApi.Authentication;

public class BCryptPasswordHasher : IPasswordHasher
{
    // Cost factor 12
    private const int WorkFactor = 12;

    public string Hash(string plaintext) => BCrypt.Net.BCrypt.HashPassword(plaintext, WorkFactor);

    public bool Verify(string plaintext, string hash) => BCrypt.Net.BCrypt.Verify(plaintext, hash);
}
