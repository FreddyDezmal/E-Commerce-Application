using ECommerceApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ECommerceApi.Data.Configurations;

public class CartItemConfiguration : IEntityTypeConfiguration<CartItem>
{
    public void Configure(EntityTypeBuilder<CartItem> builder)
    {
        builder.ToTable("cart_items", t =>
        {
            t.HasCheckConstraint("CK_cart_items_quantity_positive", "\"Quantity\" > 0");
        });

        builder.HasKey(ci => ci.Id);

        builder.Property(ci => ci.Quantity).IsRequired();

        // A given product can appear at most once per cart, quantity is incremented instead of a duplicate row being created
        builder.HasIndex(ci => new { ci.CartId, ci.ProductId }).IsUnique();

        builder.HasOne(ci => ci.Cart)
            .WithMany(c => c.Items)
            .HasForeignKey(ci => ci.CartId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(ci => ci.Product)
            .WithMany(p => p.CartItems)
            .HasForeignKey(ci => ci.ProductId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
