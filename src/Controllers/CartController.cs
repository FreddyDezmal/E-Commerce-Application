using ECommerceApi.DTOs.Cart;
using ECommerceApi.Extensions;
using ECommerceApi.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECommerceApi.Controllers;

// Every action requires authentication
[ApiController]
[Route("api/cart")]
[Authorize]
public class CartController : ControllerBase
{
    private readonly ICartService _cartService;

    public CartController(ICartService cartService)
    {
        _cartService = cartService;
    }

    [HttpGet]
    public async Task<IActionResult> GetCart()
    {
        var cart = await _cartService.GetCartAsync(this.GetUserId());
        return Ok(cart);
    }

    [HttpPost("items")]
    [ProducesResponseType(typeof(CartResponse), StatusCodes.Status201Created)]
    public async Task<IActionResult> AddItem([FromBody] AddCartItemRequest request)
    {
        var cart = await _cartService.AddItemAsync(this.GetUserId(), request.ProductId, request.Quantity);
        return StatusCode(StatusCodes.Status201Created, cart);
    }

    [HttpPut("items/{productId:guid}")]
    public async Task<IActionResult> UpdateItem(Guid productId, [FromBody] UpdateCartItemRequest request)
    {
        var cart = await _cartService.UpdateItemQuantityAsync(this.GetUserId(), productId, request.Quantity);
        return Ok(cart);
    }

    [HttpDelete("items/{productId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> RemoveItem(Guid productId)
    {
        await _cartService.RemoveItemAsync(this.GetUserId(), productId);
        return NoContent();
    }
}
