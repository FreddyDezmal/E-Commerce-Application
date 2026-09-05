namespace ECommerceApi.DTOs.Orders;

// No prices, no product names, no totals here. Only the shipping
// address is client-supplied; everything else is derived server-side
// from the authenticated user's cart and the current, trusted product data.
public class CreateOrderRequest
{
    public Guid? ShippingAddressId { get; set; }
}
