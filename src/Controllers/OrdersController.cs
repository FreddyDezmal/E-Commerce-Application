using ECommerceApi.DTOs.Orders;
using ECommerceApi.Exceptions;
using ECommerceApi.Extensions;
using ECommerceApi.Models;
using ECommerceApi.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECommerceApi.Controllers;

[ApiController]
[Route("api/orders")]
[Authorize]
public class OrdersController : ControllerBase
{
    private readonly IOrderService _orderService;

    public OrdersController(IOrderService orderService)
    {
        _orderService = orderService;
    }

    [HttpPost]
    [ProducesResponseType(typeof(OrderResponse), StatusCodes.Status201Created)]
    public async Task<IActionResult> Checkout([FromBody] CreateOrderRequest request)
    {
        var order = await _orderService.CheckoutAsync(this.GetUserId(), request.ShippingAddressId);
        return StatusCode(StatusCodes.Status201Created, order);
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] OrderQueryParameters query)
    {
        var userId = this.GetUserId();
        var role = this.GetUserRole();

        OrderStatus? status = null;
        if (!string.IsNullOrWhiteSpace(query.Status))
        {
            if (!Enum.TryParse<OrderStatus>(query.Status, ignoreCase: true, out var parsed))
            {
                throw new ValidationException("Invalid order status filter");
            }
            status = parsed;
        }

        var result = role == Role.Admin
            ? await _orderService.ListAllOrdersAsync(query.Page, query.Limit, status)
            : await _orderService.ListOrdersForUserAsync(userId, query.Page, query.Limit);

        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var order = await _orderService.GetOrderForUserAsync(id, this.GetUserId(), this.GetUserRole());
        return Ok(order);
    }

    [HttpPut("{id:guid}/status")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateOrderStatusRequest request)
    {
        if (!Enum.TryParse<OrderStatus>(request.Status, ignoreCase: true, out var status))
        {
            throw new ValidationException("Invalid order status");
        }

        var order = await _orderService.UpdateStatusAsync(id, status);
        return Ok(order);
    }
}
