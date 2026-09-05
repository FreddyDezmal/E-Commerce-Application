using System.Net;
using FluentAssertions;
using Xunit;

namespace ECommerceApi.Tests.Integration;

public class PublicEndpointsTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public PublicEndpointsTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetProducts_WithoutAuthentication_ReturnsOk()
    {
        var response = await _client.GetAsync("/api/products");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetCategories_WithoutAuthentication_ReturnsOk()
    {
        var response = await _client.GetAsync("/api/categories");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetProducts_WithInvalidQueryShape_Returns400()
    {
        // Non-numeric page value should fail model binding/validation.
        var response = await _client.GetAsync("/api/products?page=not-a-number");
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
