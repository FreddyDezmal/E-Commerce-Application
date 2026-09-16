using ECommerceApi.DTOs.Auth;

namespace ECommerceApi.Services.Interfaces;

public interface IUserService
{
    Task<UserResponse> GetProfileAsync(Guid userId);
    Task<UserResponse> UpdateProfileAsync(Guid userId, UpdateProfileRequest request);
}
