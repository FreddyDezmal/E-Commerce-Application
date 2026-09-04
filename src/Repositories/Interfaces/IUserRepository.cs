using ECommerceApi.Models;

namespace ECommerceApi.Repositories.Interfaces;

public interface IUserRepository
{
    Task<User?> FindByEmailAsync(string email);
    Task<User?> FindByIdAsync(Guid id);
    Task<User> CreateAsync(string email, string passwordHash, string fullName);
    Task<User> UpdateProfileAsync(Guid id, string? fullName);
}
