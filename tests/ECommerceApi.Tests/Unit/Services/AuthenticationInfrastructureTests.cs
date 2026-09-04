using ECommerceApi.Authentication;
using ECommerceApi.Models;
using FluentAssertions;
using Microsoft.Extensions.Options;
using Xunit;

namespace ECommerceApi.Tests.Unit.Services;

// Unit tests for the JWT + password-hashing infrastructure itself
// (Milestone 2 §32 "Authentication: Password verification, JWT
// generation"), mirroring the Node.js implementation's jwt.test.ts /
// password.test.ts.
public class AuthenticationInfrastructureTests
{
    private static ITokenService CreateTokenService(string key = "unit-test-only-secret-key-not-for-real-use-32chars")
    {
        var options = Options.Create(new JwtOptions
        {
            Key = key,
            Issuer = "TestIssuer",
            Audience = "TestAudience",
            ExpiryMinutes = 60
        });
        return new TokenService(options);
    }

    [Fact]
    public void GenerateToken_ProducesNonEmptyJwt()
    {
        var service = CreateTokenService();
        var token = service.GenerateToken(Guid.NewGuid(), Role.Customer);

        token.Should().NotBeNullOrWhiteSpace();
        token.Split('.').Should().HaveCount(3); // header.payload.signature
    }

    [Fact]
    public void BCryptPasswordHasher_HashesToADifferentStringThanTheOriginal()
    {
        var hasher = new BCryptPasswordHasher();
        var hash = hasher.Hash("Sup3rSecret!");

        hash.Should().NotBe("Sup3rSecret!");
        hash.Should().StartWith("$2"); // bcrypt hash prefix
    }

    [Fact]
    public void BCryptPasswordHasher_VerifyReturnsTrueForCorrectPassword()
    {
        var hasher = new BCryptPasswordHasher();
        var hash = hasher.Hash("Correct-Horse-1");

        hasher.Verify("Correct-Horse-1", hash).Should().BeTrue();
    }

    [Fact]
    public void BCryptPasswordHasher_VerifyReturnsFalseForIncorrectPassword()
    {
        var hasher = new BCryptPasswordHasher();
        var hash = hasher.Hash("Correct-Horse-1");

        hasher.Verify("Wrong-Password", hash).Should().BeFalse();
    }

    [Fact]
    public void BCryptPasswordHasher_ProducesDifferentHashForSamePasswordOnRepeatedCalls()
    {
        var hasher = new BCryptPasswordHasher();
        var hashA = hasher.Hash("SamePassword1");
        var hashB = hasher.Hash("SamePassword1");

        hashA.Should().NotBe(hashB); // unique salt per call
    }
}
