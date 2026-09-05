using ECommerceApi.DTOs.Auth;
using ECommerceApi.Extensions;
using ECommerceApi.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECommerceApi.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetMe()
    {
        var profile = await _userService.GetProfileAsync(this.GetUserId());
        return Ok(profile);
    }

    [HttpPut("me")]
    public async Task<IActionResult> UpdateMe([FromBody] UpdateProfileRequest request)
    {
        var profile = await _userService.UpdateProfileAsync(this.GetUserId(), request);
        return Ok(profile);
    }
}
