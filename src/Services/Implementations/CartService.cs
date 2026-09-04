using ECommerceApi.DTOs.Cart;
using ECommerceApi.Exceptions;
using ECommerceApi.Models;
using ECommerceApi.Repositories.Interfaces;
using ECommerceApi.Services.Interfaces;

namespace ECommerceApi.Services.Implementations;

public class CartService : ICartService
{
    private readonly ICartRepository _cartRepository;
    private readonly IProductRepository _productRepository;

    public CartService(ICartRepository cartRepository, IProductRepository productRepository)
    {
        _cartRepository = cartRepository;
        _productRepository = productRepository;
    }

    public async Task<CartResponse> GetCartAsync(Guid userId)
    {
        var cart = await _cartRepository.FindOrCreateByUserAsync(userId);
        return await MapAsync(cart);
    }

    public async Task<CartResponse> AddItemAsync(Guid userId, Guid productId, int quantity)
    {
        if (quantity <= 0)
        {
            throw new ValidationException("Quantity must be a positive integer");
        }

        var cart = await _cartRepository.FindOrCreateByUserAsync(userId);

        var product = await _productRepository.FindByIdAsync(productId);
        if (product is null)
        {
            throw new NotFoundAppException("Product");
        }

        var existing = await _cartRepository.FindItemAsync(cart.Id, productId);
        var desiredQuantity = (existing?.Quantity ?? 0) + quantity;

        if (desiredQuantity > product.StockQuantity)
        {
            throw new ValidationException($"Only {product.StockQuantity} unit(s) of \"{product.Name}\" are available");
        }

        var updated = existing is not null
            ? await _cartRepository.UpdateItemQuantityAsync(cart.Id, existing.Id, desiredQuantity)
            : await _cartRepository.AddItemAsync(cart.Id, productId, quantity);

        return await MapAsync(updated);
    }

    /*
      Updates the quantity of a product already in the user's cart.
      Addressed by <paramref name="productId"/>, not the CartItem's own id
    */
    public async Task<CartResponse> UpdateItemQuantityAsync(Guid userId, Guid productId, int quantity)
    {
        if (quantity < 0)
        {
            throw new ValidationException("Quantity must be zero or a positive integer");
        }

        var cart = await _cartRepository.FindOrCreateByUserAsync(userId);
        var item = cart.Items.FirstOrDefault(i => i.ProductId == productId);
        if (item is null)
        {
            throw new NotFoundAppException("Cart item");
        }

        if (quantity == 0)
        {
            var cleared = await _cartRepository.RemoveItemAsync(cart.Id, item.Id);
            return await MapAsync(cleared);
        }

        var product = await _productRepository.FindByIdAsync(productId);
        if (product is null)
        {
            throw new NotFoundAppException("Product");
        }
        if (quantity > product.StockQuantity)
        {
            throw new ValidationException($"Only {product.StockQuantity} unit(s) of \"{product.Name}\" are available");
        }

        var updated = await _cartRepository.UpdateItemQuantityAsync(cart.Id, item.Id, quantity);
        return await MapAsync(updated);
    }

    public async Task<CartResponse> RemoveItemAsync(Guid userId, Guid productId)
    {
        var cart = await _cartRepository.FindOrCreateByUserAsync(userId);
        var item = cart.Items.FirstOrDefault(i => i.ProductId == productId);
        if (item is null)
        {
            throw new NotFoundAppException("Cart item");
        }

        var updated = await _cartRepository.RemoveItemAsync(cart.Id, item.Id);
        return await MapAsync(updated);
    }

    private async Task<CartResponse> MapAsync(Cart cart)
    {
        var items = new List<CartItemResponse>();
        decimal subtotal = 0m;

        foreach (var item in cart.Items)
        {
            var product = item.Product ?? await _productRepository.FindByIdIncludingDeletedAsync(item.ProductId);
            var unitPrice = product?.Price ?? 0m;
            subtotal += unitPrice * item.Quantity;

            items.Add(new CartItemResponse
            {
                Id = item.Id,
                ProductId = item.ProductId,
                ProductName = product?.Name ?? "Unknown product",
                UnitPrice = unitPrice,
                Quantity = item.Quantity
            });
        }

        return new CartResponse
        {
            Id = cart.Id,
            UserId = cart.UserId,
            Items = items,
            Subtotal = subtotal
        };
    }
}
