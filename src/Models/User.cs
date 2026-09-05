namespace ECommerceApi.Models;

public enum Role
{
    Customer,
    Admin
}

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public Role Role { get; set; } = Role.Customer;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Address> Addresses { get; set; } = new List<Address>();
    public Cart? Cart { get; set; }
    public ICollection<Order> Orders { get; set; } = new List<Order>();
}
