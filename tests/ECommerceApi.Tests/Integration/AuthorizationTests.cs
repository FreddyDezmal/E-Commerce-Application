using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Xunit;

namespace ECommerceApi.Tests.Integration;

// Security testing per Milestone 2 §34: unauthenticated/unauthorized
// access must be rejected server-side, not just hidden by the frontend.
public class AuthorizationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public AuthorizationTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetCart_WithoutToken_Returns401()
    {
        var response = await _client.GetAsync("/api/cart");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task CreateProduct_WithoutToken_Returns401()
    {
        var response = await _client.PostAsJsonAsync("/api/products", new { name = "Widget", price = 10, stockQuantity = 5 });
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetOrders_WithoutToken_Returns401()
    {
        var response = await _client.GetAsync("/api/orders");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task CreateProduct_AsAuthenticatedCustomer_Returns403()
    {
        var email = $"customer-{Guid.NewGuid():N}@example.com";
        var registerResponse = await _client.PostAsJsonAsync("/api/auth/register",
            new { email, password = "StrongPass1!", fullName = "Customer" });
        var auth = await registerResponse.Content.ReadFromJsonAsync<AuthResponseDto>();

        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/products");
        request.Headers.Add("Authorization", $"Bearer {auth!.Token}");
        request.Content = JsonContent.Create(new { name = "Widget", price = 10, stockQuantity = 5 });

        var response = await _client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    private record AuthResponseDto(string Token);
}
