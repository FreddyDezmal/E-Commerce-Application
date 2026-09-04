using ECommerceApi.DTOs.Auth;
using ECommerceApi.Exceptions;
using ECommerceApi.Repositories.Interfaces;
using ECommerceApi.Services.Interfaces;

namespace ECommerceApi.Services.Implementations;

public class UserService : IUserService
{
    private readonly IUserRepository _userRepository;

    public UserService(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public async Task<UserResponse> GetProfileAsync(Guid userId)
    {
        var user = await _userRepository.FindByIdAsync(userId);
        if (user is null)
        {
            throw new NotFoundAppException("User");
        }
        return Map(user);
    }

    public async Task<UserResponse> UpdateProfileAsync(Guid userId, UpdateProfileRequest request)
    {
        var user = await _userRepository.UpdateProfileAsync(userId, request.FullName);
        return Map(user);
    }

    private static UserResponse Map(Models.User user)
    {
        return new UserResponse
        {
            Id = user.Id,
            Email = user.Email,
            FullName = user.FullName,
            Role = user.Role.ToString().ToLowerInvariant(),
            CreatedAt = user.CreatedAt
        };
    }
}
