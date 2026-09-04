using System.Text.RegularExpressions;
using ECommerceApi.Authentication;
using ECommerceApi.DTOs.Auth;
using ECommerceApi.Exceptions;
using ECommerceApi.Models;
using ECommerceApi.Repositories.Interfaces;
using ECommerceApi.Services.Interfaces;

namespace ECommerceApi.Services.Implementations;

/*
  Business logic for registration/login. Deliberately has no dependency on HttpContext/ControllerBase and depends only on 
  IUserRepository (an interface, not a concrete EF Core-backed class) 
*/
public class AuthService : IAuthService
{
    private static readonly Regex EmailRegex = new(@"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.Compiled);

    private readonly IUserRepository _userRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ITokenService _tokenService;

    public AuthService(IUserRepository userRepository, IPasswordHasher passwordHasher, ITokenService tokenService)
    {
        _userRepository = userRepository;
        _passwordHasher = passwordHasher;
        _tokenService = tokenService;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        ValidateRegistration(request);

        var existing = await _userRepository.FindByEmailAsync(request.Email);
        if (existing is not null)
        {
            throw new ConflictAppException("An account with this email already exists");
        }

        var passwordHash = _passwordHasher.Hash(request.Password);
        var user = await _userRepository.CreateAsync(request.Email, passwordHash, request.FullName);

        return BuildResult(user);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            throw new ValidationException("Email and password are required");
        }

        var user = await _userRepository.FindByEmailAsync(request.Email);

        // Deliberately identical error for "no such user" and "wrong
        // password". Doesn't let a client enumerate emails.
        if (user is null || !_passwordHasher.Verify(request.Password, user.PasswordHash))
        {
            throw new UnauthorizedAppException("Invalid email or password");
        }

        return BuildResult(user);
    }

    private static void ValidateRegistration(RegisterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || !EmailRegex.IsMatch(request.Email))
        {
            throw new ValidationException("A valid email address is required");
        }

        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            throw new ValidationException("Full name is required");
        }

        var password = request.Password ?? string.Empty;
        if (password.Length < 8)
        {
            throw new ValidationException("Password must be at least 8 characters");
        }
        if (!password.Any(char.IsLetter))
        {
            throw new ValidationException("Password must contain at least one letter");
        }
        if (!password.Any(char.IsDigit))
        {
            throw new ValidationException("Password must contain at least one number");
        }
    }

    private AuthResponse BuildResult(User user)
    {
        var token = _tokenService.GenerateToken(user.Id, user.Role);
        return new AuthResponse
        {
            Token = token,
            User = new UserResponse
            {
                Id = user.Id,
                Email = user.Email,
                FullName = user.FullName,
                Role = user.Role.ToString().ToLowerInvariant(),
                CreatedAt = user.CreatedAt
            }
        };
    }
}
