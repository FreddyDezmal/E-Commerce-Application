using ECommerceApi.Data;
using ECommerceApi.Models;
using ECommerceApi.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ECommerceApi.Repositories.Implementations;

public class CartRepository : ICartRepository
{
    private readonly AppDbContext _context;

    public CartRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Cart> FindOrCreateByUserAsync(Guid userId)
    {
        var cart = await _context.Carts
            .Include(c => c.Items)
            .FirstOrDefaultAsync(c => c.UserId == userId);

        if (cart is not null)
        {
            return cart;
        }

        cart = new Cart { UserId = userId };
        _context.Carts.Add(cart);
        await _context.SaveChangesAsync();
        return cart;
    }

    public async Task<CartItem?> FindItemAsync(Guid cartId, Guid productId)
    {
        return await _context.CartItems
            .FirstOrDefaultAsync(ci => ci.CartId == cartId && ci.ProductId == productId);
    }

    public async Task<Cart> AddItemAsync(Guid cartId, Guid productId, int quantity)
    {
        _context.CartItems.Add(new CartItem { CartId = cartId, ProductId = productId, Quantity = quantity });
        await _context.SaveChangesAsync();
        return await GetCartAsync(cartId);
    }

    public async Task<Cart> UpdateItemQuantityAsync(Guid cartId, Guid itemId, int quantity)
    {
        var item = await _context.CartItems.FirstAsync(ci => ci.Id == itemId);
        item.Quantity = quantity;
        await _context.SaveChangesAsync();
        return await GetCartAsync(cartId);
    }

    public async Task<Cart> RemoveItemAsync(Guid cartId, Guid itemId)
    {
        var item = await _context.CartItems.FirstAsync(ci => ci.Id == itemId);
        _context.CartItems.Remove(item);
        await _context.SaveChangesAsync();
        return await GetCartAsync(cartId);
    }

    public async Task ClearAsync(Guid cartId)
    {
        var items = await _context.CartItems.Where(ci => ci.CartId == cartId).ToListAsync();
        _context.CartItems.RemoveRange(items);
        await _context.SaveChangesAsync();
    }

    private async Task<Cart> GetCartAsync(Guid cartId)
    {
        return await _context.Carts
            .Include(c => c.Items)
            .FirstAsync(c => c.Id == cartId);
    }
}
