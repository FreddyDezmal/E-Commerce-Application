using ECommerceApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ECommerceApi.Data.Configurations;

public class AddressConfiguration : IEntityTypeConfiguration<Address>
{
    public void Configure(EntityTypeBuilder<Address> builder)
    {
        builder.ToTable("addresses");
        builder.HasKey(a => a.Id);

        builder.Property(a => a.Line1).IsRequired();
        builder.Property(a => a.City).IsRequired();
        builder.Property(a => a.Region).IsRequired();
        builder.Property(a => a.PostalCode).IsRequired();
        builder.Property(a => a.Country).IsRequired();
        builder.Property(a => a.IsDefault).HasDefaultValue(false);
    }
}
