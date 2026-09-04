using ECommerceApi.DTOs.Cart;

namespace ECommerceApi.Services.Interfaces;

public interface ICartService
{
    Task<CartResponse> GetCartAsync(Guid userId);
    Task<CartResponse> AddItemAsync(Guid userId, Guid productId, int quantity);
    Task<CartResponse> UpdateItemQuantityAsync(Guid userId, Guid productId, int quantity);
    Task<CartResponse> RemoveItemAsync(Guid userId, Guid productId);
}
