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
            // RESTRICT: order history must survive product deactivation and the reason products use soft delete (IsDeleted) instead of a hard DELETE 
            .OnDelete(DeleteBehavior.Restrict)
            // See the identical comment in CartItemConfiguration
            .IsRequired(false);
    }
}
