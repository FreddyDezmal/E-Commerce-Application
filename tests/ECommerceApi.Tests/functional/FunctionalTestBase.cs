using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using ECommerceApi.Authentication;
using ECommerceApi.Data;
using ECommerceApi.DTOs.Products;
using ECommerceApi.Models;
using ECommerceApi.Tests.Integration;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace ECommerceApi.Tests.Functional;


public abstract class FunctionalTestBase : IClassFixture<CustomWebApplicationFactory>
{
    protected const string CustomerPassword = "StrongPass1!";
    protected const string AdminPassword = "AdminPass1!";

    protected readonly CustomWebApplicationFactory Factory;

    protected FunctionalTestBase(CustomWebApplicationFactory factory)
    {
        Factory = factory;
    }

    // A logged-in actor: an HttpClient that already carries the Bearer token.
    protected sealed record Actor(HttpClient Client, Guid UserId, string Email);

    // Shapes of the JSON the API returns for auth. Declared here so the tests do not
    // depend on internal DTO types changing.
    private sealed record AuthPayload(UserPayload User, string Token);
    private sealed record UserPayload(Guid Id, string Email, string FullName, string Role);

    /// Registers a brand new customer and returns a client authenticated as them.
    protected async Task<Actor> RegisterCustomerAsync(string? fullName = null)
    {
        var email = $"cust-{Guid.NewGuid():N}@example.com";
        var client = Factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/register", new
        {
            email,
            password = CustomerPassword,
            fullName = fullName ?? "Test Customer"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created, "test setup requires registration to succeed");

        var payload = await response.Content.ReadFromJsonAsync<AuthPayload>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", payload!.Token);

        return new Actor(client, payload.User.Id, email);
    }

    /*
      Returns a client authenticated as an Admin.

      /api/auth/register always creates a Customer (User.Role defaults to Role.Customer
      and AuthService never sets it), so there is no HTTP route to an admin account.
      The admin row is therefore seeded straight into the test database, then logged in
      through the real /api/auth/login endpoint so the JWT and role claim are genuine.
    */
    protected async Task<Actor> CreateAdminAsync()
    {
        var email = $"admin-{Guid.NewGuid():N}@example.com";
        Guid userId;

        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();

            var admin = new User
            {
                Email = email,
                PasswordHash = hasher.Hash(AdminPassword),
                FullName = "Test Admin",
                Role = Role.Admin
            };

            db.Users.Add(admin);
            await db.SaveChangesAsync();
            userId = admin.Id;
        }

        var client = Factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/auth/login", new { email, password = AdminPassword });
        response.StatusCode.Should().Be(HttpStatusCode.OK, "test setup requires the seeded admin to log in");

        var payload = await response.Content.ReadFromJsonAsync<AuthPayload>();
        payload!.User.Role.Should().Be("admin", "the seeded account must actually carry the Admin role");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", payload.Token);

        return new Actor(client, userId, email);
    }

    /// Creates a product through the real admin endpoint and returns it.
    protected static async Task<ProductResponse> CreateProductAsync(
        Actor admin, string name, decimal price, int stock)
    {
        var response = await admin.Client.PostAsJsonAsync("/api/products", new
        {
            name,
            description = "Created by functional test",
            price,
            stockQuantity = stock
        });

        if (response.StatusCode != HttpStatusCode.Created)
        {
            var body = await response.Content.ReadAsStringAsync();
            throw new Xunit.Sdk.XunitException(
                $"Product creation failed with {response.StatusCode}. Response body: {body}");
        }

        var product = await response.Content.ReadFromJsonAsync<ProductResponse>();
        return product!;
    }

    /// Reads a product back from the public catalogue (used to verify stock changes).
    protected static async Task<ProductResponse> GetProductAsync(HttpClient client, Guid productId)
    {
        var response = await client.GetAsync($"/api/products/{productId}");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        return (await response.Content.ReadFromJsonAsync<ProductResponse>())!;
    }
}