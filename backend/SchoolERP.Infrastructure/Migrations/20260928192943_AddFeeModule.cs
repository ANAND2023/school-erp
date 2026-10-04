using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SchoolERP.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddFeeModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<decimal>(
                name: "annual_income",
                table: "student_guardians",
                type: "decimal(12,2)",
                precision: 12,
                scale: 2,
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "decimal(65,30)",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "salary_basic",
                table: "employees",
                type: "decimal(12,2)",
                precision: 12,
                scale: 2,
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "decimal(65,30)",
                oldNullable: true);

            migrationBuilder.CreateTable(
                name: "fee_groups",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    branch_id = table.Column<long>(type: "bigint", nullable: false),
                    name = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    description = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    created_by = table.Column<long>(type: "bigint", nullable: false),
                    created_on = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    modified_by = table.Column<long>(type: "bigint", nullable: true),
                    modified_on = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_fee_groups", x => x.id);
                    table.ForeignKey(
                        name: "FK_fee_groups_branches_branch_id",
                        column: x => x.branch_id,
                        principalTable: "branches",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "fee_heads",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    branch_id = table.Column<long>(type: "bigint", nullable: false),
                    name = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    code = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    type = table.Column<int>(type: "int", nullable: false),
                    description = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    created_by = table.Column<long>(type: "bigint", nullable: false),
                    created_on = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    modified_by = table.Column<long>(type: "bigint", nullable: true),
                    modified_on = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_fee_heads", x => x.id);
                    table.ForeignKey(
                        name: "FK_fee_heads_branches_branch_id",
                        column: x => x.branch_id,
                        principalTable: "branches",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "fee_installments",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    branch_id = table.Column<long>(type: "bigint", nullable: false),
                    academic_year_id = table.Column<long>(type: "bigint", nullable: false),
                    name = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    due_date = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    display_order = table.Column<int>(type: "int", nullable: false),
                    created_by = table.Column<long>(type: "bigint", nullable: false),
                    created_on = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    modified_by = table.Column<long>(type: "bigint", nullable: true),
                    modified_on = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_fee_installments", x => x.id);
                    table.ForeignKey(
                        name: "FK_fee_installments_academic_years_academic_year_id",
                        column: x => x.academic_year_id,
                        principalTable: "academic_years",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_fee_installments_branches_branch_id",
                        column: x => x.branch_id,
                        principalTable: "branches",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "fee_receipts",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    branch_id = table.Column<long>(type: "bigint", nullable: false),
                    academic_year_id = table.Column<long>(type: "bigint", nullable: false),
                    receipt_no = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    receipt_date = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    student_id = table.Column<long>(type: "bigint", nullable: false),
                    class_id = table.Column<long>(type: "bigint", nullable: false),
                    section_id = table.Column<long>(type: "bigint", nullable: false),
                    total_due = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    total_concession = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    total_fine = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    total_paid = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    status = table.Column<int>(type: "int", nullable: false),
                    cancel_reason = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    cancelled_by = table.Column<long>(type: "bigint", nullable: true),
                    cancelled_on = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    remarks = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    created_by = table.Column<long>(type: "bigint", nullable: false),
                    created_on = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    modified_by = table.Column<long>(type: "bigint", nullable: true),
                    modified_on = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_fee_receipts", x => x.id);
                    table.ForeignKey(
                        name: "FK_fee_receipts_academic_years_academic_year_id",
                        column: x => x.academic_year_id,
                        principalTable: "academic_years",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_fee_receipts_branches_branch_id",
                        column: x => x.branch_id,
                        principalTable: "branches",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_fee_receipts_classes_class_id",
                        column: x => x.class_id,
                        principalTable: "classes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_fee_receipts_sections_section_id",
                        column: x => x.section_id,
                        principalTable: "sections",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_fee_receipts_students_student_id",
                        column: x => x.student_id,
                        principalTable: "students",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "fee_concessions",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    branch_id = table.Column<long>(type: "bigint", nullable: false),
                    academic_year_id = table.Column<long>(type: "bigint", nullable: false),
                    student_id = table.Column<long>(type: "bigint", nullable: false),
                    fee_head_id = table.Column<long>(type: "bigint", nullable: false),
                    type = table.Column<int>(type: "int", nullable: false),
                    value = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    calculated_amount = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    reason = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    approved_by = table.Column<long>(type: "bigint", nullable: true),
                    is_approved = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    created_by = table.Column<long>(type: "bigint", nullable: false),
                    created_on = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    modified_by = table.Column<long>(type: "bigint", nullable: true),
                    modified_on = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_fee_concessions", x => x.id);
                    table.ForeignKey(
                        name: "FK_fee_concessions_academic_years_academic_year_id",
                        column: x => x.academic_year_id,
                        principalTable: "academic_years",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_fee_concessions_branches_branch_id",
                        column: x => x.branch_id,
                        principalTable: "branches",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_fee_concessions_fee_heads_fee_head_id",
                        column: x => x.fee_head_id,
                        principalTable: "fee_heads",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_fee_concessions_students_student_id",
                        column: x => x.student_id,
                        principalTable: "students",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "fee_structures",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    branch_id = table.Column<long>(type: "bigint", nullable: false),
                    academic_year_id = table.Column<long>(type: "bigint", nullable: false),
                    class_id = table.Column<long>(type: "bigint", nullable: false),
                    fee_group_id = table.Column<long>(type: "bigint", nullable: false),
                    fee_head_id = table.Column<long>(type: "bigint", nullable: false),
                    installment_id = table.Column<long>(type: "bigint", nullable: false),
                    amount = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    created_by = table.Column<long>(type: "bigint", nullable: false),
                    created_on = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    modified_by = table.Column<long>(type: "bigint", nullable: true),
                    modified_on = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_fee_structures", x => x.id);
                    table.ForeignKey(
                        name: "FK_fee_structures_academic_years_academic_year_id",
                        column: x => x.academic_year_id,
                        principalTable: "academic_years",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_fee_structures_branches_branch_id",
                        column: x => x.branch_id,
                        principalTable: "branches",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_fee_structures_classes_class_id",
                        column: x => x.class_id,
                        principalTable: "classes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_fee_structures_fee_groups_fee_group_id",
                        column: x => x.fee_group_id,
                        principalTable: "fee_groups",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_fee_structures_fee_heads_fee_head_id",
                        column: x => x.fee_head_id,
                        principalTable: "fee_heads",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_fee_structures_fee_installments_installment_id",
                        column: x => x.installment_id,
                        principalTable: "fee_installments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "fine_rules",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    branch_id = table.Column<long>(type: "bigint", nullable: false),
                    academic_year_id = table.Column<long>(type: "bigint", nullable: false),
                    installment_id = table.Column<long>(type: "bigint", nullable: false),
                    fine_type = table.Column<int>(type: "int", nullable: false),
                    amount = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    grace_days = table.Column<int>(type: "int", nullable: false),
                    created_by = table.Column<long>(type: "bigint", nullable: false),
                    created_on = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    modified_by = table.Column<long>(type: "bigint", nullable: true),
                    modified_on = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_fine_rules", x => x.id);
                    table.ForeignKey(
                        name: "FK_fine_rules_academic_years_academic_year_id",
                        column: x => x.academic_year_id,
                        principalTable: "academic_years",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_fine_rules_branches_branch_id",
                        column: x => x.branch_id,
                        principalTable: "branches",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_fine_rules_fee_installments_installment_id",
                        column: x => x.installment_id,
                        principalTable: "fee_installments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "student_fee_dues",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    branch_id = table.Column<long>(type: "bigint", nullable: false),
                    academic_year_id = table.Column<long>(type: "bigint", nullable: false),
                    student_id = table.Column<long>(type: "bigint", nullable: false),
                    class_id = table.Column<long>(type: "bigint", nullable: false),
                    fee_head_id = table.Column<long>(type: "bigint", nullable: false),
                    installment_id = table.Column<long>(type: "bigint", nullable: false),
                    original_amount = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    concession_amount = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    paid_amount = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    balance_amount = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    status = table.Column<int>(type: "int", nullable: false),
                    created_by = table.Column<long>(type: "bigint", nullable: false),
                    created_on = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    modified_by = table.Column<long>(type: "bigint", nullable: true),
                    modified_on = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_student_fee_dues", x => x.id);
                    table.ForeignKey(
                        name: "FK_student_fee_dues_academic_years_academic_year_id",
                        column: x => x.academic_year_id,
                        principalTable: "academic_years",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_student_fee_dues_branches_branch_id",
                        column: x => x.branch_id,
                        principalTable: "branches",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_student_fee_dues_classes_class_id",
                        column: x => x.class_id,
                        principalTable: "classes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_student_fee_dues_fee_heads_fee_head_id",
                        column: x => x.fee_head_id,
                        principalTable: "fee_heads",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_student_fee_dues_fee_installments_installment_id",
                        column: x => x.installment_id,
                        principalTable: "fee_installments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_student_fee_dues_students_student_id",
                        column: x => x.student_id,
                        principalTable: "students",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "fee_payments",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    fee_receipt_id = table.Column<long>(type: "bigint", nullable: false),
                    payment_mode = table.Column<int>(type: "int", nullable: false),
                    amount = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    transaction_ref = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    bank_name = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    cheque_no = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    cheque_date = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    cheque_status = table.Column<int>(type: "int", nullable: false),
                    cleared_on = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    created_by = table.Column<long>(type: "bigint", nullable: false),
                    created_on = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    modified_by = table.Column<long>(type: "bigint", nullable: true),
                    modified_on = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_fee_payments", x => x.id);
                    table.ForeignKey(
                        name: "FK_fee_payments_fee_receipts_fee_receipt_id",
                        column: x => x.fee_receipt_id,
                        principalTable: "fee_receipts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "fee_receipt_details",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    fee_receipt_id = table.Column<long>(type: "bigint", nullable: false),
                    student_fee_due_id = table.Column<long>(type: "bigint", nullable: true),
                    fee_head_id = table.Column<long>(type: "bigint", nullable: false),
                    installment_id = table.Column<long>(type: "bigint", nullable: false),
                    amount_paid = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    fine_paid = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    balance_carried = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    created_by = table.Column<long>(type: "bigint", nullable: false),
                    created_on = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    modified_by = table.Column<long>(type: "bigint", nullable: true),
                    modified_on = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_fee_receipt_details", x => x.id);
                    table.ForeignKey(
                        name: "FK_fee_receipt_details_fee_heads_fee_head_id",
                        column: x => x.fee_head_id,
                        principalTable: "fee_heads",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_fee_receipt_details_fee_installments_installment_id",
                        column: x => x.installment_id,
                        principalTable: "fee_installments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_fee_receipt_details_fee_receipts_fee_receipt_id",
                        column: x => x.fee_receipt_id,
                        principalTable: "fee_receipts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_fee_receipt_details_student_fee_dues_student_fee_due_id",
                        column: x => x.student_fee_due_id,
                        principalTable: "student_fee_dues",
                        principalColumn: "id");
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_fee_concessions_academic_year_id",
                table: "fee_concessions",
                column: "academic_year_id");

            migrationBuilder.CreateIndex(
                name: "IX_fee_concessions_branch_id",
                table: "fee_concessions",
                column: "branch_id");

            migrationBuilder.CreateIndex(
                name: "IX_fee_concessions_fee_head_id",
                table: "fee_concessions",
                column: "fee_head_id");

            migrationBuilder.CreateIndex(
                name: "IX_fee_concessions_student_id",
                table: "fee_concessions",
                column: "student_id");

            migrationBuilder.CreateIndex(
                name: "IX_fee_groups_branch_id_name",
                table: "fee_groups",
                columns: new[] { "branch_id", "name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_fee_heads_branch_id_code",
                table: "fee_heads",
                columns: new[] { "branch_id", "code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_fee_installments_academic_year_id",
                table: "fee_installments",
                column: "academic_year_id");

            migrationBuilder.CreateIndex(
                name: "IX_fee_installments_branch_id",
                table: "fee_installments",
                column: "branch_id");

            migrationBuilder.CreateIndex(
                name: "IX_fee_payments_fee_receipt_id",
                table: "fee_payments",
                column: "fee_receipt_id");

            migrationBuilder.CreateIndex(
                name: "IX_fee_receipt_details_fee_head_id",
                table: "fee_receipt_details",
                column: "fee_head_id");

            migrationBuilder.CreateIndex(
                name: "IX_fee_receipt_details_fee_receipt_id",
                table: "fee_receipt_details",
                column: "fee_receipt_id");

            migrationBuilder.CreateIndex(
                name: "IX_fee_receipt_details_installment_id",
                table: "fee_receipt_details",
                column: "installment_id");

            migrationBuilder.CreateIndex(
                name: "IX_fee_receipt_details_student_fee_due_id",
                table: "fee_receipt_details",
                column: "student_fee_due_id");

            migrationBuilder.CreateIndex(
                name: "IX_fee_receipts_academic_year_id",
                table: "fee_receipts",
                column: "academic_year_id");

            migrationBuilder.CreateIndex(
                name: "IX_fee_receipts_branch_id_academic_year_id_receipt_no",
                table: "fee_receipts",
                columns: new[] { "branch_id", "academic_year_id", "receipt_no" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_fee_receipts_class_id",
                table: "fee_receipts",
                column: "class_id");

            migrationBuilder.CreateIndex(
                name: "IX_fee_receipts_section_id",
                table: "fee_receipts",
                column: "section_id");

            migrationBuilder.CreateIndex(
                name: "IX_fee_receipts_student_id",
                table: "fee_receipts",
                column: "student_id");

            migrationBuilder.CreateIndex(
                name: "IX_fee_structures_academic_year_id",
                table: "fee_structures",
                column: "academic_year_id");

            migrationBuilder.CreateIndex(
                name: "IX_fee_structures_branch_id",
                table: "fee_structures",
                column: "branch_id");

            migrationBuilder.CreateIndex(
                name: "IX_fee_structures_class_id",
                table: "fee_structures",
                column: "class_id");

            migrationBuilder.CreateIndex(
                name: "IX_fee_structures_fee_group_id",
                table: "fee_structures",
                column: "fee_group_id");

            migrationBuilder.CreateIndex(
                name: "IX_fee_structures_fee_head_id",
                table: "fee_structures",
                column: "fee_head_id");

            migrationBuilder.CreateIndex(
                name: "IX_fee_structures_installment_id",
                table: "fee_structures",
                column: "installment_id");

            migrationBuilder.CreateIndex(
                name: "IX_fine_rules_academic_year_id",
                table: "fine_rules",
                column: "academic_year_id");

            migrationBuilder.CreateIndex(
                name: "IX_fine_rules_branch_id",
                table: "fine_rules",
                column: "branch_id");

            migrationBuilder.CreateIndex(
                name: "IX_fine_rules_installment_id",
                table: "fine_rules",
                column: "installment_id");

            migrationBuilder.CreateIndex(
                name: "IX_student_fee_dues_academic_year_id",
                table: "student_fee_dues",
                column: "academic_year_id");

            migrationBuilder.CreateIndex(
                name: "IX_student_fee_dues_branch_id",
                table: "student_fee_dues",
                column: "branch_id");

            migrationBuilder.CreateIndex(
                name: "IX_student_fee_dues_class_id",
                table: "student_fee_dues",
                column: "class_id");

            migrationBuilder.CreateIndex(
                name: "IX_student_fee_dues_fee_head_id",
                table: "student_fee_dues",
                column: "fee_head_id");

            migrationBuilder.CreateIndex(
                name: "IX_student_fee_dues_installment_id",
                table: "student_fee_dues",
                column: "installment_id");

            migrationBuilder.CreateIndex(
                name: "IX_student_fee_dues_student_id",
                table: "student_fee_dues",
                column: "student_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "fee_concessions");

            migrationBuilder.DropTable(
                name: "fee_payments");

            migrationBuilder.DropTable(
                name: "fee_receipt_details");

            migrationBuilder.DropTable(
                name: "fee_structures");

            migrationBuilder.DropTable(
                name: "fine_rules");

            migrationBuilder.DropTable(
                name: "fee_receipts");

            migrationBuilder.DropTable(
                name: "student_fee_dues");

            migrationBuilder.DropTable(
                name: "fee_groups");

            migrationBuilder.DropTable(
                name: "fee_heads");

            migrationBuilder.DropTable(
                name: "fee_installments");

            migrationBuilder.AlterColumn<decimal>(
                name: "annual_income",
                table: "student_guardians",
                type: "decimal(65,30)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "decimal(12,2)",
                oldPrecision: 12,
                oldScale: 2,
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "salary_basic",
                table: "employees",
                type: "decimal(65,30)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "decimal(12,2)",
                oldPrecision: 12,
                oldScale: 2,
                oldNullable: true);
        }
    }
}
