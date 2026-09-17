
using System.Net;
using System.Net.Http.Json;
using ECommerceApi.DTOs.Cart;
using ECommerceApi.DTOs.Orders;
using ECommerceApi.DTOs.Products;
using ECommerceApi.Tests.Integration;
using FluentAssertions;
using Xunit;
 
namespace ECommerceApi.Tests.Functional;

/*
  Functional test suite -- end-to-end user journeys.
 
  Each test method is named after its test case ID (FT-xx) so results in Test Explorer
  and in the exported .trx map one-to-one onto the test case table in the report.
 
  NOT COVERED HERE (declare as out of scope in the report, with reasons):
   - Product search: ProductRepository uses EF.Functions.ILike, which is PostgreSQL-only
     and throws on the InMemory provider. Test manually against real PostgreSQL.
   - Checkout rollback/atomicity: the InMemory provider ignores transactions.
   - Frontend UI behaviour: covered separately by the Vitest suite under frontend/src.
 
  Goes in: tests/ECommerceApi.Tests/Functional/ShoppingJourneyTests.cs
*/
public class ShoppingJourneyTests : FunctionalTestBase
{
    public ShoppingJourneyTests(CustomWebApplicationFactory factory) : base(factory) { }

    // Shape of GET /api/orders. Declared locally so the test does not break if the
    // internal paged-response type is renamed.
    private sealed record PagedOrders(List<OrderResponse> Items, int Total);

    // ─────────────────────────────────────────────────────────────
    //  Account journey
    // ─────────────────────────────────────────────────────────────

    [Fact(DisplayName = "FT-01: A newly registered user can retrieve their own profile")]
    public async Task FT01_RegisteredUser_CanFetchOwnProfile()
    {
        var customer = await RegisterCustomerAsync("Thabo Mokoena");

        var response = await customer.Client.GetAsync("/api/users/me");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var profile = await response.Content.ReadFromJsonAsync<ProfilePayload>();
        profile!.Email.Should().Be(customer.Email);
        profile.FullName.Should().Be("Thabo Mokoena");
        profile.Role.Should().Be("customer", "self-registration must never grant admin rights");
    }

    private sealed record ProfilePayload(Guid Id, string Email, string FullName, string Role);

    // ─────────────────────────────────────────────────────────────
    //  Catalogue
    // ─────────────────────────────────────────────────────────────

    [Fact(DisplayName = "FT-02: A product created by an admin appears in the public catalogue")]
    public async Task FT02_AdminCreatedProduct_AppearsInPublicCatalogue()
    {
        var admin = await CreateAdminAsync();
        var created = await CreateProductAsync(admin, "Functional Test Kettle", 349.99m, 10);

        // Anonymous client: no token at all.
        var anonymous = Factory.CreateClient();
        var response = await anonymous.GetAsync("/api/products");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var page = await response.Content.ReadFromJsonAsync<PagedResult<ProductResponse>>();
        page!.Items.Should().Contain(p => p.Id == created.Id);
    }

    [Fact(DisplayName = "FT-03: A soft-deleted product disappears from the public catalogue")]
    public async Task FT03_DeactivatedProduct_IsHiddenFromCatalogue()
    {
        var admin = await CreateAdminAsync();
        var product = await CreateProductAsync(admin, "Discontinued Toaster", 199.00m, 5);

        var delete = await admin.Client.DeleteAsync($"/api/products/{product.Id}");
        delete.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var anonymous = Factory.CreateClient();
        var page = await anonymous.GetFromJsonAsync<PagedResult<ProductResponse>>("/api/products");

        page!.Items.Should().NotContain(p => p.Id == product.Id);
    }

    // ─────────────────────────────────────────────────────────────
    //  Cart
    // ─────────────────────────────────────────────────────────────

    [Fact(DisplayName = "FT-04: Adding an item to the cart sets the correct quantity and subtotal")]
    public async Task FT04_AddItemToCart_CalculatesSubtotal()
    {
        var admin = await CreateAdminAsync();
        var product = await CreateProductAsync(admin, "Cart Test Mug", 120.50m, 20);
        var customer = await RegisterCustomerAsync();

        var response = await customer.Client.PostAsJsonAsync("/api/cart/items",
            new { productId = product.Id, quantity = 3 });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var cart = await response.Content.ReadFromJsonAsync<CartResponse>();

        cart!.Items.Should().HaveCount(1);
        cart.Items[0].Quantity.Should().Be(3);
        cart.Items[0].UnitPrice.Should().Be(120.50m);
        cart.Subtotal.Should().Be(361.50m, "3 x 120.50 = 361.50");
    }

    [Fact(DisplayName = "FT-05: Adding the same product twice aggregates the quantity")]
    public async Task FT05_AddSameProductTwice_AggregatesQuantity()
    {
        var admin = await CreateAdminAsync();
        var product = await CreateProductAsync(admin, "Aggregate Test Pen", 25.00m, 20);
        var customer = await RegisterCustomerAsync();

        await customer.Client.PostAsJsonAsync("/api/cart/items", new { productId = product.Id, quantity = 2 });
        var second = await customer.Client.PostAsJsonAsync("/api/cart/items", new { productId = product.Id, quantity = 3 });

        var cart = await second.Content.ReadFromJsonAsync<CartResponse>();
        cart!.Items.Should().HaveCount(1, "the same product must not be duplicated as two cart lines");
        cart.Items[0].Quantity.Should().Be(5);
        cart.Subtotal.Should().Be(125.00m);
    }

    [Fact(DisplayName = "FT-06 (boundary): Requesting more units than are in stock is rejected")]
    public async Task FT06_AddMoreThanStock_IsRejected()
    {
        var admin = await CreateAdminAsync();
        var product = await CreateProductAsync(admin, "Scarce Item", 50.00m, 5);
        var customer = await RegisterCustomerAsync();

        // Boundary value analysis: stock is 5, so 5 must pass and 6 must fail.
        var atLimit = await customer.Client.PostAsJsonAsync("/api/cart/items",
            new { productId = product.Id, quantity = 5 });
        atLimit.StatusCode.Should().Be(HttpStatusCode.Created, "the exact stock level must be purchasable");

        var overLimit = await customer.Client.PostAsJsonAsync("/api/cart/items",
            new { productId = product.Id, quantity = 1 });
        overLimit.StatusCode.Should().Be(HttpStatusCode.BadRequest, "5 + 1 exceeds the 5 units available");
    }

    [Theory(DisplayName = "FT-07 (boundary): Non-positive quantities are rejected")]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(-999)]
    public async Task FT07_NonPositiveQuantity_IsRejected(int quantity)
    {
        var admin = await CreateAdminAsync();
        var product = await CreateProductAsync(admin, "Quantity Validation Item", 10.00m, 10);
        var customer = await RegisterCustomerAsync();

        var response = await customer.Client.PostAsJsonAsync("/api/cart/items",
            new { productId = product.Id, quantity });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest,
            "quantity {0} should fail the Range(1, int.MaxValue) rule", quantity);
    }

    [Fact(DisplayName = "FT-08: Setting a cart item's quantity to zero removes it from the cart")]
    public async Task FT08_UpdateQuantityToZero_RemovesItem()
    {
        var admin = await CreateAdminAsync();
        var product = await CreateProductAsync(admin, "Removable Item", 75.00m, 10);
        var customer = await RegisterCustomerAsync();

        await customer.Client.PostAsJsonAsync("/api/cart/items", new { productId = product.Id, quantity = 2 });

        var response = await customer.Client.PutAsJsonAsync($"/api/cart/items/{product.Id}", new { quantity = 0 });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var cart = await response.Content.ReadFromJsonAsync<CartResponse>();
        cart!.Items.Should().BeEmpty();
        cart.Subtotal.Should().Be(0m);
    }

    [Fact(DisplayName = "FT-09: Each user's cart is isolated from other users")]
    public async Task FT09_CartsAreIsolatedPerUser()
    {
        var admin = await CreateAdminAsync();
        var product = await CreateProductAsync(admin, "Isolation Test Item", 40.00m, 50);

        var alice = await RegisterCustomerAsync("Alice");
        var bob = await RegisterCustomerAsync("Bob");

        await alice.Client.PostAsJsonAsync("/api/cart/items", new { productId = product.Id, quantity = 4 });

        var bobsCart = await bob.Client.GetFromJsonAsync<CartResponse>("/api/cart");

        bobsCart!.Items.Should().BeEmpty("Bob must not see items Alice added");
        bobsCart.Subtotal.Should().Be(0m);
    }

    // ─────────────────────────────────────────────────────────────
    //  Checkout -- the main end-to-end journey
    // ─────────────────────────────────────────────────────────────

    [Fact(DisplayName = "FT-10: Full journey -- register, browse, add to cart, checkout, view order")]
    public async Task FT10_FullShoppingJourney_Succeeds()
    {
        // ── Arrange: admin stocks the catalogue
        var admin = await CreateAdminAsync();
        var headphones = await CreateProductAsync(admin, "Journey Headphones", 899.00m, 10);
        var cable = await CreateProductAsync(admin, "Journey Cable", 149.50m, 10);

        // ── Act: a customer shops
        var customer = await RegisterCustomerAsync();
        await customer.Client.PostAsJsonAsync("/api/cart/items", new { productId = headphones.Id, quantity = 2 });
        await customer.Client.PostAsJsonAsync("/api/cart/items", new { productId = cable.Id, quantity = 1 });

        var checkout = await customer.Client.PostAsJsonAsync("/api/orders", new { shippingAddressId = (Guid?)null });

        // ── Assert 1: the order itself
        checkout.StatusCode.Should().Be(HttpStatusCode.Created);
        var order = await checkout.Content.ReadFromJsonAsync<OrderResponse>();

        order!.Status.Should().Be("pending", "a new order starts in the Pending state");
        order.TotalAmount.Should().Be(1947.50m, "(2 x 899.00) + (1 x 149.50) = 1947.50");
        order.Items.Should().HaveCount(2);
        order.Items.Should().Contain(i => i.ProductId == headphones.Id && i.Quantity == 2
                                          && i.UnitPriceAtPurchase == 899.00m);

        // ── Assert 2: stock was decremented
        var headphonesAfter = await GetProductAsync(customer.Client, headphones.Id);
        var cableAfter = await GetProductAsync(customer.Client, cable.Id);
        headphonesAfter.StockQuantity.Should().Be(8, "10 - 2 = 8");
        cableAfter.StockQuantity.Should().Be(9, "10 - 1 = 9");

        // ── Assert 3: the cart was emptied
        var cartAfter = await customer.Client.GetFromJsonAsync<CartResponse>("/api/cart");
        cartAfter!.Items.Should().BeEmpty("checkout must clear the cart");

        // ── Assert 4: the order appears in the customer's order history
        var history = await customer.Client.GetFromJsonAsync<PagedOrders>("/api/orders");
        history!.Items.Should().ContainSingle(o => o.Id == order.Id);
    }

    [Fact(DisplayName = "FT-11 (negative): Checking out with an empty cart is rejected")]
    public async Task FT11_CheckoutWithEmptyCart_IsRejected()
    {
        var customer = await RegisterCustomerAsync();

        var response = await customer.Client.PostAsJsonAsync("/api/orders", new { shippingAddressId = (Guid?)null });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact(DisplayName = "FT-12: Prices are captured at purchase time and do not change afterwards")]
    public async Task FT12_OrderPrice_IsFrozenAtPurchaseTime()
    {
        var admin = await CreateAdminAsync();
        var product = await CreateProductAsync(admin, "Price Change Item", 100.00m, 10);
        var customer = await RegisterCustomerAsync();

        await customer.Client.PostAsJsonAsync("/api/cart/items", new { productId = product.Id, quantity = 1 });
        var checkout = await customer.Client.PostAsJsonAsync("/api/orders", new { shippingAddressId = (Guid?)null });
        var order = await checkout.Content.ReadFromJsonAsync<OrderResponse>();

        // Admin raises the price after the order was placed.
        var priceChange = await admin.Client.PutAsJsonAsync($"/api/products/{product.Id}", new { price = 500.00m });
        priceChange.StatusCode.Should().Be(HttpStatusCode.OK);

        var reloaded = await customer.Client.GetFromJsonAsync<OrderResponse>($"/api/orders/{order!.Id}");

        reloaded!.TotalAmount.Should().Be(100.00m, "an existing order must not be repriced");
        reloaded.Items[0].UnitPriceAtPurchase.Should().Be(100.00m);
    }

    // ─────────────────────────────────────────────────────────────
    //  Order access control and lifecycle
    // ─────────────────────────────────────────────────────────────

    [Fact(DisplayName = "FT-13 (security): A customer cannot view another customer's order")]
    public async Task FT13_CustomerCannotViewAnotherUsersOrder()
    {
        var admin = await CreateAdminAsync();
        var product = await CreateProductAsync(admin, "Privacy Test Item", 60.00m, 10);

        var alice = await RegisterCustomerAsync("Alice");
        await alice.Client.PostAsJsonAsync("/api/cart/items", new { productId = product.Id, quantity = 1 });
        var checkout = await alice.Client.PostAsJsonAsync("/api/orders", new { shippingAddressId = (Guid?)null });
        var aliceOrder = await checkout.Content.ReadFromJsonAsync<OrderResponse>();

        var mallory = await RegisterCustomerAsync("Mallory");
        var response = await mallory.Client.GetAsync($"/api/orders/{aliceOrder!.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden,
            "ownership must be checked server-side, not just hidden in the UI");
    }

    [Fact(DisplayName = "FT-14: An admin can advance an order from Pending to Paid")]
    public async Task FT14_AdminCanAdvanceOrderStatus()
    {
        var admin = await CreateAdminAsync();
        var product = await CreateProductAsync(admin, "Status Test Item", 80.00m, 10);
        var customer = await RegisterCustomerAsync();

        await customer.Client.PostAsJsonAsync("/api/cart/items", new { productId = product.Id, quantity = 1 });
        var checkout = await customer.Client.PostAsJsonAsync("/api/orders", new { shippingAddressId = (Guid?)null });
        var order = await checkout.Content.ReadFromJsonAsync<OrderResponse>();

        var response = await admin.Client.PutAsJsonAsync($"/api/orders/{order!.Id}/status", new { status = "Paid" });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await response.Content.ReadFromJsonAsync<OrderResponse>();
        updated!.Status.Should().Be("paid");
    }

    [Fact(DisplayName = "FT-15 (negative): An illegal status transition is rejected")]
    public async Task FT15_IllegalStatusTransition_IsRejected()
    {
        var admin = await CreateAdminAsync();
        var product = await CreateProductAsync(admin, "Transition Test Item", 80.00m, 10);
        var customer = await RegisterCustomerAsync();

        await customer.Client.PostAsJsonAsync("/api/cart/items", new { productId = product.Id, quantity = 1 });
        var checkout = await customer.Client.PostAsJsonAsync("/api/orders", new { shippingAddressId = (Guid?)null });
        var order = await checkout.Content.ReadFromJsonAsync<OrderResponse>();

        // Pending may only go to Paid or Cancelled -- never straight to Delivered.
        var response = await admin.Client.PutAsJsonAsync($"/api/orders/{order!.Id}/status", new { status = "Delivered" });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact(DisplayName = "FT-16 (security): A customer cannot change an order's status")]
    public async Task FT16_CustomerCannotChangeOrderStatus()
    {
        var admin = await CreateAdminAsync();
        var product = await CreateProductAsync(admin, "Escalation Test Item", 80.00m, 10);
        var customer = await RegisterCustomerAsync();

        await customer.Client.PostAsJsonAsync("/api/cart/items", new { productId = product.Id, quantity = 1 });
        var checkout = await customer.Client.PostAsJsonAsync("/api/orders", new { shippingAddressId = (Guid?)null });
        var order = await checkout.Content.ReadFromJsonAsync<OrderResponse>();

        var response = await customer.Client.PutAsJsonAsync($"/api/orders/{order!.Id}/status", new { status = "Paid" });

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden,
            "a customer must not be able to mark their own order as Paid");
    }
}