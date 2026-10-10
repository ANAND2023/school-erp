using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SchoolERP.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddManufacturedByToInventoryItems : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Already applied to DB manually.
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "manufactured_by",
                table: "inventory_items");

            migrationBuilder.DropColumn(
                name: "authorized_signature_url",
                table: "branches");

            migrationBuilder.DropColumn(
                name: "cashier_signature_url",
                table: "branches");

            migrationBuilder.DropColumn(
                name: "principal_signature_url",
                table: "branches");
        }
    }
}
