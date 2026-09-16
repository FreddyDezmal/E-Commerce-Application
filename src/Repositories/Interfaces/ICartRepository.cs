using ECommerceApi.Models;

namespace ECommerceApi.Repositories.Interfaces;

public interface ICartRepository
{
    Task<Cart> FindOrCreateByUserAsync(Guid userId);
    Task<CartItem?> FindItemAsync(Guid cartId, Guid productId);
    Task<Cart> AddItemAsync(Guid cartId, Guid productId, int quantity);
    Task<Cart> UpdateItemQuantityAsync(Guid cartId, Guid itemId, int quantity);
    Task<Cart> RemoveItemAsync(Guid cartId, Guid itemId);
    Task ClearAsync(Guid cartId);
}
