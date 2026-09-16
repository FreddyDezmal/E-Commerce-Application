using ECommerceApi.Data;
using ECommerceApi.Models;
using ECommerceApi.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ECommerceApi.Repositories.Implementations;

public class OrderRepository : IOrderRepository
{
    private readonly AppDbContext _context;

    public OrderRepository(AppDbContext context)
    {
        _context = context;
    }

    /*
      Atomic checkout. Creates the order + order items, decrements stock per item, and clears the cart, all inside
      a single EF Core transaction. If any step fails, the transaction rolls back and no partial order is left behind
    */
    public async Task<Order> CreateFromCartAsync(CreateOrderInput input)
    {
        await using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var order = new Order
            {
                UserId = input.UserId,
                ShippingAddressId = input.ShippingAddressId,
                TotalAmount = input.TotalAmount,
                Status = OrderStatus.Pending,
                Items = input.Items.Select(i => new OrderItem
                {
                    ProductId = i.ProductId,
                    Quantity = i.Quantity,
                    UnitPriceAtPurchase = i.UnitPriceAtPurchase
                }).ToList()
            };

            _context.Orders.Add(order);
            await _context.SaveChangesAsync();

            foreach (var item in input.Items)
            {
                var product = await _context.Products.FirstAsync(p => p.Id == item.ProductId);
                product.StockQuantity -= item.Quantity;
            }

            var cart = await _context.Carts.FirstOrDefaultAsync(c => c.UserId == input.UserId);
            if (cart is not null)
            {
                var cartItems = await _context.CartItems.Where(ci => ci.CartId == cart.Id).ToListAsync();
                _context.CartItems.RemoveRange(cartItems);
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return order;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<Order?> FindByIdAsync(Guid id)
    {
        return await _context.Orders
            .Include(o => o.Items)
                // Order history must resolve even if the referenced product has since been soft-deleted. bypass the Product query filter for this specific navigation
                .ThenInclude(oi => oi.Product!)
            .IgnoreQueryFilters()
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.Id == id);
    }

    public async Task<PagedOrders> FindByUserAsync(Guid userId, int page, int limit)
    {
        var query = _context.Orders.Where(o => o.UserId == userId);
        var total = await query.CountAsync();
        var items = await query
            .Include(o => o.Items).ThenInclude(oi => oi.Product!)
            .IgnoreQueryFilters()
            .AsNoTracking()
            .OrderByDescending(o => o.CreatedAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();
        return new PagedOrders(items, total);
    }

    public async Task<PagedOrders> FindAllAsync(int page, int limit, OrderStatus? status)
    {
        var query = _context.Orders.AsQueryable();
        if (status is { } s)
        {
            query = query.Where(o => o.Status == s);
        }
        var total = await query.CountAsync();
        var items = await query
            .Include(o => o.Items).ThenInclude(oi => oi.Product!)
            .IgnoreQueryFilters()
            .AsNoTracking()
            .OrderByDescending(o => o.CreatedAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();
        return new PagedOrders(items, total);
    }

    public async Task<Order> UpdateStatusAsync(Guid id, OrderStatus status)
    {
        var order = await _context.Orders.Include(o => o.Items).FirstAsync(o => o.Id == id);
        order.Status = status;
        await _context.SaveChangesAsync();
        return order;
    }
}
