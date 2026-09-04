namespace ECommerceApi.Exceptions;

/*
  Base class for all known, expected application errors. The C# equivalent of the Node.js implementation's AppError hierarchy.
  Controllers never need to catch these individually; the global exception-handling middleware (Middleware/ExceptionHandlingMiddleware.cs)
  maps each subtype to its declared HTTP status code and a consistent ProblemDetails response.
*/
public abstract class AppException : Exception
{
    public abstract int StatusCode { get; }
    public abstract string Code { get; }
    public object? Details { get; init; }

    protected AppException(string message) : base(message)
    {
    }
}

public class ValidationException : AppException
{
    public override int StatusCode => 400;
    public override string Code => "VALIDATION_ERROR";

    public ValidationException(string message, object? details = null) : base(message)
    {
        Details = details;
    }
}

public class UnauthorizedAppException : AppException
{
    public override int StatusCode => 401;
    public override string Code => "UNAUTHORIZED";

    public UnauthorizedAppException(string message = "Authentication required") : base(message)
    {
    }
}

public class ForbiddenAppException : AppException
{
    public override int StatusCode => 403;
    public override string Code => "FORBIDDEN";

    public ForbiddenAppException(string message = "You do not have permission to perform this action") : base(message)
    {
    }
}

public class NotFoundAppException : AppException
{
    public override int StatusCode => 404;
    public override string Code => "NOT_FOUND";

    public NotFoundAppException(string resource = "Resource") : base($"{resource} not found")
    {
    }
}

public class ConflictAppException : AppException
{
    public override int StatusCode => 409;
    public override string Code => "CONFLICT";

    public ConflictAppException(string message) : base(message)
    {
    }
}
