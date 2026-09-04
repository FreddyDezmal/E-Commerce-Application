using System.Text.Json;
using ECommerceApi.Exceptions;
using Microsoft.AspNetCore.Mvc;

namespace ECommerceApi.Middleware;

/*
  Centralized exception handling. Known AppExceptions are mapped to their declared status code and a consistent ProblemDetails response. 
  Anything else is treated as an unexpected 500 and NEVER exposes internal details outside Development
*/
public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;
    private readonly IHostEnvironment _environment;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger, IHostEnvironment environment)
    {
        _next = next;
        _logger = logger;
        _environment = environment;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (AppException ex)
        {
            await WriteProblemDetailsAsync(context, ex.StatusCode, ex.Code, ex.Message, ex.Details);
        }
        catch (Exception ex)
        {
            // Unexpected error. Log full detail server-side (never including passwords/tokens, return a safe generic message to the client.
            _logger.LogError(ex, "Unhandled exception processing {Method} {Path}", context.Request.Method, context.Request.Path);

            var message = _environment.IsDevelopment()
                ? ex.Message
                : "An unexpected error occurred";

            await WriteProblemDetailsAsync(context, StatusCodes.Status500InternalServerError, "INTERNAL_SERVER_ERROR", message, null);
        }
    }

    private static async Task WriteProblemDetailsAsync(HttpContext context, int statusCode, string code, string message, object? details)
    {
        context.Response.ContentType = "application/problem+json";
        context.Response.StatusCode = statusCode;

        var problemDetails = new ProblemDetails
        {
            Status = statusCode,
            Title = code,
            Detail = message
        };
        problemDetails.Extensions["code"] = code;
        if (details is not null)
        {
            problemDetails.Extensions["details"] = details;
        }

        await context.Response.WriteAsync(JsonSerializer.Serialize(problemDetails));
    }
}
