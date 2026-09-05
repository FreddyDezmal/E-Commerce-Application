using ECommerceApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ECommerceApi.Data.Configurations;

public class OrderItemConfiguration : IEntityTypeConfiguration<OrderItem>
{
    public void Configure(EntityTypeBuilder<OrderItem> builder)
    {
        builder.ToTable("order_items", t =>
        {
            t.HasCheckConstraint("CK_order_items_quantity_positive", "\"Quantity\" > 0");
        });

        builder.HasKey(oi => oi.Id);

        builder.Property(oi => oi.Quantity).IsRequired();

        builder.Property(oi => oi.UnitPriceAtPurchase)
            .IsRequired()
            .HasColumnType("decimal(10,2)");

        builder.HasOne(oi => oi.Product)
            .WithMany(p => p.OrderItems)
            .HasForeignKey(oi => oi.ProductId)
            // RESTRICT: order history must survive product deactivation —
            // the same rule as the Node.js/Prisma implementation, and the
            // reason products use soft delete (IsDeleted) instead of a
            // hard DELETE (Milestone 1 §10.2 / Milestone 2 §7).
            .OnDelete(DeleteBehavior.Restrict)
            // See the identical comment in CartItemConfiguration — this
            // relationship is exactly the "soft-deleted required end"
            // case EF Core's model-validation warning flags. Marking it
            // optional at the metadata level (not the DB schema) is the
            // correct fix, not a workaround: OrderRepository already
            // handles this by using IgnoreQueryFilters() when loading
            // order history, precisely so a soft-deleted product's name
            // still resolves instead of silently coming back null.
            .IsRequired(false);
    }
}
