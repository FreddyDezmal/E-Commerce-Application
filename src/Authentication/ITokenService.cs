using ECommerceApi.Models;

namespace ECommerceApi.Authentication;

public interface ITokenService
{
    string GenerateToken(Guid userId, Role role);
}
