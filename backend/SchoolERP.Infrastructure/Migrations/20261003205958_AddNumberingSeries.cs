using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SchoolERP.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddNumberingSeries : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "enquiry_no",
                table: "enquiries",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "numbering_series",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    branch_id = table.Column<long>(type: "bigint", nullable: false),
                    module_type = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    prefix = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    include_branch_code = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    include_academic_year = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    year_format = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    separator = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    digits = table.Column<int>(type: "int", nullable: false),
                    start_number = table.Column<long>(type: "bigint", nullable: false),
                    current_sequence = table.Column<long>(type: "bigint", nullable: false),
                    suffix = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    custom_format = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    created_by = table.Column<long>(type: "bigint", nullable: false),
                    created_on = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    modified_by = table.Column<long>(type: "bigint", nullable: true),
                    modified_on = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_numbering_series", x => x.id);
                    table.ForeignKey(
                        name: "FK_numbering_series_branches_branch_id",
                        column: x => x.branch_id,
                        principalTable: "branches",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_numbering_series_branch_id",
                table: "numbering_series",
                column: "branch_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "numbering_series");

            migrationBuilder.DropColumn(
                name: "initial_admin_password",
                table: "schools");

            migrationBuilder.DropColumn(
                name: "enquiry_no",
                table: "enquiries");
        }
    }
}
