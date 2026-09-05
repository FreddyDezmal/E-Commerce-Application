using ECommerceApi.Authentication;
using ECommerceApi.DTOs.Auth;
using ECommerceApi.Exceptions;
using ECommerceApi.Models;
using ECommerceApi.Repositories.Interfaces;
using ECommerceApi.Services.Implementations;
using FluentAssertions;
using Moq;
using Xunit;

namespace ECommerceApi.Tests.Unit.Services;

public class AuthServiceTests
{
    private static User MakeUser(
        Guid? id = null,
        string email = "jane@example.com",
        string passwordHash = "hashed-password",
        string fullName = "Jane Doe",
        Role role = Role.Customer)
    {
        return new User
        {
            Id = id ?? Guid.NewGuid(),
            Email = email,
            PasswordHash = passwordHash,
            FullName = fullName,
            Role = role,
            CreatedAt = DateTime.UtcNow
        };
    }

    private readonly Mock<IUserRepository> _userRepository = new();
    private readonly Mock<IPasswordHasher> _passwordHasher = new();
    private readonly Mock<ITokenService> _tokenService = new();

    private AuthService CreateService() =>
        new(_userRepository.Object, _passwordHasher.Object, _tokenService.Object);

    // ── Register ─────────────────────────────────────────────

    [Fact]
    public async Task Register_WithValidInput_HashesPasswordAndReturnsSafeUserPlusToken()
    {
        _userRepository.Setup(r => r.FindByEmailAsync("jane@example.com")).ReturnsAsync((User?)null);
        _passwordHasher.Setup(h => h.Hash("StrongPass1!")).Returns("hashed-password");
        _tokenService.Setup(t => t.GenerateToken(It.IsAny<Guid>(), Role.Customer)).Returns("fake-jwt");
        _userRepository
            .Setup(r => r.CreateAsync("jane@example.com", "hashed-password", "Jane Doe"))
            .ReturnsAsync(MakeUser());

        var service = CreateService();
        var result = await service.RegisterAsync(new RegisterRequest
        {
            Email = "jane@example.com",
            Password = "StrongPass1!",
            FullName = "Jane Doe"
        });

        result.User.Email.Should().Be("jane@example.com");
        result.Token.Should().Be("fake-jwt");
        _userRepository.Verify(r => r.CreateAsync("jane@example.com", "hashed-password", "Jane Doe"), Times.Once);
    }

    [Fact]
    public async Task Register_WithDuplicateEmail_ThrowsConflict()
    {
        _userRepository.Setup(r => r.FindByEmailAsync("jane@example.com")).ReturnsAsync(MakeUser());
        var service = CreateService();

        var act = () => service.RegisterAsync(new RegisterRequest
        {
            Email = "jane@example.com",
            Password = "StrongPass1!",
            FullName = "Jane Doe"
        });

        await act.Should().ThrowAsync<ConflictAppException>();
        _userRepository.Verify(r => r.CreateAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task Register_WithInvalidEmail_ThrowsValidation()
    {
        var service = CreateService();

        var act = () => service.RegisterAsync(new RegisterRequest
        {
            Email = "not-an-email",
            Password = "StrongPass1!",
            FullName = "Jane Doe"
        });

        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task Register_WithWeakPassword_ThrowsValidation()
    {
        var service = CreateService();

        var act = () => service.RegisterAsync(new RegisterRequest
        {
            Email = "jane@example.com",
            Password = "123",
            FullName = "Jane Doe"
        });

        await act.Should().ThrowAsync<ValidationException>();
    }

    // ── Login ────────────────────────────────────────────────

    [Fact]
    public async Task Login_WithValidCredentials_ReturnsSafeUserPlusToken()
    {
        var user = MakeUser(passwordHash: "hashed-password");
        _userRepository.Setup(r => r.FindByEmailAsync("jane@example.com")).ReturnsAsync(user);
        _passwordHasher.Setup(h => h.Verify("StrongPass1!", "hashed-password")).Returns(true);
        _tokenService.Setup(t => t.GenerateToken(user.Id, Role.Customer)).Returns("fake-jwt");

        var service = CreateService();
        var result = await service.LoginAsync(new LoginRequest { Email = "jane@example.com", Password = "StrongPass1!" });

        result.User.Email.Should().Be("jane@example.com");
        result.Token.Should().Be("fake-jwt");
    }

    [Fact]
    public async Task Login_WithUnknownEmail_ThrowsUnauthorized_WithoutRevealingEmailDoesNotExist()
    {
        _userRepository.Setup(r => r.FindByEmailAsync("ghost@example.com")).ReturnsAsync((User?)null);
        var service = CreateService();

        var act = () => service.LoginAsync(new LoginRequest { Email = "ghost@example.com", Password = "whatever1" });

        await act.Should().ThrowAsync<UnauthorizedAppException>();
    }

    [Fact]
    public async Task Login_WithWrongPassword_ThrowsSameUnauthorizedAsUnknownEmail()
    {
        var user = MakeUser(passwordHash: "hashed-password");
        _userRepository.Setup(r => r.FindByEmailAsync("jane@example.com")).ReturnsAsync(user);
        _passwordHasher.Setup(h => h.Verify("WrongPassword1", "hashed-password")).Returns(false);

        var service = CreateService();
        var act = () => service.LoginAsync(new LoginRequest { Email = "jane@example.com", Password = "WrongPassword1" });

        var exception = await act.Should().ThrowAsync<UnauthorizedAppException>();
        exception.Which.Message.Should().Be("Invalid email or password");
    }
}
