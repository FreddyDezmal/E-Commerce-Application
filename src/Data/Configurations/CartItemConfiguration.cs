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

        // A given product can appear at most once per cart — quantity is
        // incremented instead of a duplicate row being created
        // (Milestone 1 §10 — UNIQUE(cart_id, product_id)).
        builder.HasIndex(ci => new { ci.CartId, ci.ProductId }).IsUnique();

        builder.HasOne(ci => ci.Cart)
            .WithMany(c => c.Items)
            .HasForeignKey(ci => ci.CartId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(ci => ci.Product)
            .WithMany(p => p.CartItems)
            .HasForeignKey(ci => ci.ProductId)
            // IsRequired(false): tells EF Core's metadata model this
            // navigation may legitimately resolve to null once Product's
            // soft-delete query filter excludes the referenced row — the
            // FK column itself stays NOT NULL at the database level
            // (ProductId is a non-nullable Guid), this only stops EF's
            // "required navigation + filtered target" warning, which is
            // otherwise correctly flagging exactly the soft-delete
            // scenario this project relies on (Milestone 2 §6).
            .IsRequired(false)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
