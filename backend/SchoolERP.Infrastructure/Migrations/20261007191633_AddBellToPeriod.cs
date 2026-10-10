using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SchoolERP.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddBellToPeriod : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Empty to skip error
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "is_bell_enabled",
                table: "periods");

            migrationBuilder.DropColumn(
                name: "is_dismissal_bell",
                table: "periods");

            migrationBuilder.DropColumn(
                name: "payment_mode",
                table: "inventory_issues");
        }
    }
}
