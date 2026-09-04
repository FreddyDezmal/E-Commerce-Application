using ECommerceApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ECommerceApi.Data.Configurations;

public class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    public void Configure(EntityTypeBuilder<Product> builder)
    {
        builder.ToTable("products", t =>
        {
            // CHECK constraints. Supported directly via the Fluent API
            // table-building overload from EF Core 7+; if the installed
            // Npgsql provider version does not emit these correctly
            t.HasCheckConstraint("CK_products_price_nonnegative", "\"Price\" >= 0");
            t.HasCheckConstraint("CK_products_stock_nonnegative", "\"StockQuantity\" >= 0");
        });

        builder.HasKey(p => p.Id);

        builder.Property(p => p.Name)
            .IsRequired()
            .HasMaxLength(255);

        builder.Property(p => p.Description)
            .HasMaxLength(2000);

        builder.Property(p => p.Price)
            .IsRequired()
            .HasColumnType("decimal(10,2)");

        builder.Property(p => p.StockQuantity)
            .IsRequired();

        builder.Property(p => p.IsDeleted)
            .IsRequired()
            .HasDefaultValue(false);

        builder.Property(p => p.CreatedAt)
            .IsRequired()
            .HasDefaultValueSql("CURRENT_TIMESTAMP");

        // Global query filter: every normal query automatically excludes soft-deleted products. Admin-only "show deleted too" queries use .IgnoreQueryFilters() explicitly at the call site, making that an intentional, visible opt-in rather than the default (see ProductRepository.FindByIdIncludingDeletedAsync).
        builder.HasQueryFilter(p => !p.IsDeleted);
    }
}
