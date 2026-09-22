using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECommerceApi.Migrations
{
    /// <inheritdoc />
    public partial class UseXminConcurrencyToken : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RowVersion",
                table: "products");

            // No AddColumn for "xmin". It is a PostgreSQL system column that
            // already exists on every table; the scaffolded
            // AddColumn<uint>("xmin") fails on a real database with
            // "column name "xmin" conflicts with a system column name"
            // (verified on PostgreSQL 16). The model snapshot still maps the
            // concurrency token to xmin, so EF uses it at runtime and future
            // migrations will not try to add it again.
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // xmin is a system column and cannot be dropped; only restore RowVersion.
            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                table: "products",
                type: "bytea",
                rowVersion: true,
                nullable: false,
                defaultValue: new byte[0]);
        }
    }
}
