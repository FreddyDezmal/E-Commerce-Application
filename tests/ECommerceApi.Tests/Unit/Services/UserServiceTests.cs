using ECommerceApi.DTOs.Auth;
using ECommerceApi.Exceptions;
using ECommerceApi.Models;
using ECommerceApi.Repositories.Interfaces;
using ECommerceApi.Services.Implementations;
using Moq;
using Xunit;

namespace ECommerceApi.Tests.Unit.Services;

public class UserServiceTests
{
private readonly Mock<IUserRepository> _userRepositoryMock;
private readonly UserService _userService;

public UserServiceTests()
{
    _userRepositoryMock = new Mock<IUserRepository>();
    _userService = new UserService(_userRepositoryMock.Object);
}

[Fact]
public async Task GetProfileAsync_ReturnsUserProfile_WhenUserExists()
{
    var userId = Guid.NewGuid();

    var user = new User
    {
        Id = userId,
        Email = "test@example.com",
        FullName = "Test User",
        Role = Role.Customer,
        CreatedAt = DateTime.UtcNow
    };

    _userRepositoryMock
        .Setup(r => r.FindByIdAsync(userId))
        .ReturnsAsync(user);

    var result = await _userService.GetProfileAsync(userId);

    Assert.Equal(user.Id, result.Id);
    Assert.Equal(user.Email, result.Email);
    Assert.Equal(user.FullName, result.FullName);
    Assert.Equal("customer", result.Role);
    Assert.Equal(user.CreatedAt, result.CreatedAt);

    _userRepositoryMock.Verify(
        r => r.FindByIdAsync(userId),
        Times.Once);
}

[Fact]
public async Task GetProfileAsync_ThrowsNotFoundException_WhenUserDoesNotExist()
{
    var userId = Guid.NewGuid();

    _userRepositoryMock
        .Setup(r => r.FindByIdAsync(userId))
        .ReturnsAsync((User?)null);

    var exception = await Assert.ThrowsAsync<NotFoundAppException>(
        () => _userService.GetProfileAsync(userId));

    Assert.Contains("User", exception.Message);

    _userRepositoryMock.Verify(
        r => r.FindByIdAsync(userId),
        Times.Once);
}

[Fact]
public async Task GetProfileAsync_MapsAdminRoleToLowercase()
{
    var userId = Guid.NewGuid();

    var user = new User
    {
        Id = userId,
        Email = "admin@example.com",
        FullName = "Admin User",
        Role = Role.Admin,
        CreatedAt = DateTime.UtcNow
    };

    _userRepositoryMock
        .Setup(r => r.FindByIdAsync(userId))
        .ReturnsAsync(user);

    var result = await _userService.GetProfileAsync(userId);

    Assert.Equal(userId, result.Id);
    Assert.Equal("admin@example.com", result.Email);
    Assert.Equal("Admin User", result.FullName);
    Assert.Equal("admin", result.Role);
    Assert.Equal(user.CreatedAt, result.CreatedAt);
}

[Fact]
public async Task UpdateProfileAsync_UpdatesUserProfile()
{
    var userId = Guid.NewGuid();

    var request = new UpdateProfileRequest
    {
        FullName = "Updated Name"
    };

    var updatedUser = new User
    {
        Id = userId,
        Email = "test@example.com",
        FullName = "Updated Name",
        Role = Role.Customer,
        CreatedAt = DateTime.UtcNow
    };

    _userRepositoryMock
        .Setup(r => r.UpdateProfileAsync(userId, request.FullName))
        .ReturnsAsync(updatedUser);

    var result = await _userService.UpdateProfileAsync(userId, request);

    Assert.Equal(userId, result.Id);
    Assert.Equal("test@example.com", result.Email);
    Assert.Equal("Updated Name", result.FullName);
    Assert.Equal("customer", result.Role);

    _userRepositoryMock.Verify(
        r => r.UpdateProfileAsync(userId, request.FullName),
        Times.Once);
}

[Fact]
public async Task UpdateProfileAsync_ReturnsMappedUserResponse()
{
    var userId = Guid.NewGuid();

    var request = new UpdateProfileRequest
    {
        FullName = "New Full Name"
    };

    var createdAt = DateTime.UtcNow;

    var updatedUser = new User
    {
        Id = userId,
        Email = "user@example.com",
        FullName = "New Full Name",
        Role = Role.Admin,
        CreatedAt = createdAt
    };

    _userRepositoryMock
        .Setup(r => r.UpdateProfileAsync(userId, request.FullName))
        .ReturnsAsync(updatedUser);

    var result = await _userService.UpdateProfileAsync(userId, request);

    Assert.Equal(updatedUser.Id, result.Id);
    Assert.Equal(updatedUser.Email, result.Email);
    Assert.Equal(updatedUser.FullName, result.FullName);
    Assert.Equal("admin", result.Role);
    Assert.Equal(updatedUser.CreatedAt, result.CreatedAt);

    _userRepositoryMock.Verify(
        r => r.UpdateProfileAsync(userId, request.FullName),
        Times.Once);
}


}
