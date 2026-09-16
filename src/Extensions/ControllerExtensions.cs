using System.Security.Claims;
using ECommerceApi.Exceptions;
using ECommerceApi.Models;
using Microsoft.AspNetCore.Mvc;

namespace ECommerceApi.Extensions;

/* 
  Small helper shared by every controller to read the authenticated identity that JWT Bearer middleware populated onto HttpContext. Centralized here so no controller repeats the same
  claim-parsing logic, a controller-layer analogue of the Node.js implementation's req.user, without adding a framework.
*/
public static class ControllerExtensions
{
    public static Guid GetUserId(this ControllerBase controller)
    {
        var value = controller.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (value is null || !Guid.TryParse(value, out var id))
        {
            throw new UnauthorizedAppException();
        }
        return id;
    }

    public static Role GetUserRole(this ControllerBase controller)
    {
        var value = controller.User.FindFirstValue(ClaimTypes.Role);
        if (value is null || !Enum.TryParse<Role>(value, ignoreCase: true, out var role))
        {
            throw new UnauthorizedAppException();
        }
        return role;
    }
}
