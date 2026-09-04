using ECommerceApi.Data;
using ECommerceApi.Models;
using ECommerceApi.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ECommerceApi.Repositories.Implementations;

// The ONLY layer permitted to query AppDbContext for User persistence
// Contains no business rules
public class UserRepository : IUserRepository
{
    private readonly AppDbContext _context;

    public UserRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<User?> FindByEmailAsync(string email)
    {
        return await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Email == email);
    }

    public async Task<User?> FindByIdAsync(Guid id)
    {
        return await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id);
    }

    public async Task<User> CreateAsync(string email, string passwordHash, string fullName)
    {
        var user = new User
        {
            Email = email,
            PasswordHash = passwordHash,
            FullName = fullName
            // Role intentionally omitted. Defaults to Customer at the  model level. Nothing client-supplied can set role at registration time 
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();
        return user;
    }

    public async Task<User> UpdateProfileAsync(Guid id, string? fullName)
    {
        var user = await _context.Users.FirstAsync(u => u.Id == id);
        if (fullName is not null)
        {
            user.FullName = fullName;
        }
        await _context.SaveChangesAsync();
        return user;
    }
}
