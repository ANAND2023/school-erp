using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SchoolERP.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddStudentAndEnquiry : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "enquiries",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    branch_id = table.Column<long>(type: "bigint", nullable: false),
                    academic_year_id = table.Column<long>(type: "bigint", nullable: false),
                    student_name = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    class_id = table.Column<long>(type: "bigint", nullable: false),
                    guardian_name = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    mobile = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    email = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    source = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    status = table.Column<int>(type: "int", nullable: false),
                    next_followup_date = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    notes = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    converted_student_id = table.Column<long>(type: "bigint", nullable: true),
                    created_by = table.Column<long>(type: "bigint", nullable: false),
                    created_on = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    modified_by = table.Column<long>(type: "bigint", nullable: true),
                    modified_on = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_enquiries", x => x.id);
                    table.ForeignKey(
                        name: "FK_enquiries_classes_class_id",
                        column: x => x.class_id,
                        principalTable: "classes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "students",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    branch_id = table.Column<long>(type: "bigint", nullable: false),
                    admission_no = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    first_name = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    last_name = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    date_of_birth = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    gender = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    category_id = table.Column<long>(type: "bigint", nullable: true),
                    religion_id = table.Column<long>(type: "bigint", nullable: true),
                    blood_group = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    aadhaar_no = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    photo_url = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    status = table.Column<int>(type: "int", nullable: false),
                    address = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    city = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    state = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    pincode = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    emergency_contact = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    admission_date = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    created_by = table.Column<long>(type: "bigint", nullable: false),
                    created_on = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    modified_by = table.Column<long>(type: "bigint", nullable: true),
                    modified_on = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_students", x => x.id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "enquiry_followups",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    enquiry_id = table.Column<long>(type: "bigint", nullable: false),
                    followup_date = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    response = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    notes = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    next_followup_date = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    created_by = table.Column<long>(type: "bigint", nullable: false),
                    created_on = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    modified_by = table.Column<long>(type: "bigint", nullable: true),
                    modified_on = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_enquiry_followups", x => x.id);
                    table.ForeignKey(
                        name: "FK_enquiry_followups_enquiries_enquiry_id",
                        column: x => x.enquiry_id,
                        principalTable: "enquiries",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "student_documents",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    student_id = table.Column<long>(type: "bigint", nullable: false),
                    document_type_id = table.Column<long>(type: "bigint", nullable: true),
                    title = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    file_path = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    created_by = table.Column<long>(type: "bigint", nullable: false),
                    created_on = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    modified_by = table.Column<long>(type: "bigint", nullable: true),
                    modified_on = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_student_documents", x => x.id);
                    table.ForeignKey(
                        name: "FK_student_documents_students_student_id",
                        column: x => x.student_id,
                        principalTable: "students",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "student_enrollments",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    student_id = table.Column<long>(type: "bigint", nullable: false),
                    academic_year_id = table.Column<long>(type: "bigint", nullable: false),
                    class_id = table.Column<long>(type: "bigint", nullable: false),
                    section_id = table.Column<long>(type: "bigint", nullable: false),
                    roll_no = table.Column<int>(type: "int", nullable: true),
                    fee_group_id = table.Column<long>(type: "bigint", nullable: true),
                    status = table.Column<int>(type: "int", nullable: false),
                    created_by = table.Column<long>(type: "bigint", nullable: false),
                    created_on = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    modified_by = table.Column<long>(type: "bigint", nullable: true),
                    modified_on = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_student_enrollments", x => x.id);
                    table.ForeignKey(
                        name: "FK_student_enrollments_academic_years_academic_year_id",
                        column: x => x.academic_year_id,
                        principalTable: "academic_years",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_student_enrollments_classes_class_id",
                        column: x => x.class_id,
                        principalTable: "classes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_student_enrollments_sections_section_id",
                        column: x => x.section_id,
                        principalTable: "sections",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_student_enrollments_students_student_id",
                        column: x => x.student_id,
                        principalTable: "students",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "student_guardians",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    student_id = table.Column<long>(type: "bigint", nullable: false),
                    relation = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    name = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    mobile = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    email = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    occupation = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    annual_income = table.Column<decimal>(type: "decimal(65,30)", nullable: true),
                    is_primary = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    created_by = table.Column<long>(type: "bigint", nullable: false),
                    created_on = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    modified_by = table.Column<long>(type: "bigint", nullable: true),
                    modified_on = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_student_guardians", x => x.id);
                    table.ForeignKey(
                        name: "FK_student_guardians_students_student_id",
                        column: x => x.student_id,
                        principalTable: "students",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "student_section_histories",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    student_id = table.Column<long>(type: "bigint", nullable: false),
                    academic_year_id = table.Column<long>(type: "bigint", nullable: false),
                    class_id = table.Column<long>(type: "bigint", nullable: false),
                    from_section_id = table.Column<long>(type: "bigint", nullable: false),
                    to_section_id = table.Column<long>(type: "bigint", nullable: false),
                    reason = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    changed_on = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    changed_by = table.Column<long>(type: "bigint", nullable: false),
                    created_by = table.Column<long>(type: "bigint", nullable: false),
                    created_on = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    modified_by = table.Column<long>(type: "bigint", nullable: true),
                    modified_on = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_student_section_histories", x => x.id);
                    table.ForeignKey(
                        name: "FK_student_section_histories_sections_from_section_id",
                        column: x => x.from_section_id,
                        principalTable: "sections",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_student_section_histories_sections_to_section_id",
                        column: x => x.to_section_id,
                        principalTable: "sections",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_student_section_histories_students_student_id",
                        column: x => x.student_id,
                        principalTable: "students",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_enquiries_class_id",
                table: "enquiries",
                column: "class_id");

            migrationBuilder.CreateIndex(
                name: "IX_enquiry_followups_enquiry_id",
                table: "enquiry_followups",
                column: "enquiry_id");

            migrationBuilder.CreateIndex(
                name: "IX_student_documents_student_id",
                table: "student_documents",
                column: "student_id");

            migrationBuilder.CreateIndex(
                name: "IX_student_enrollments_academic_year_id",
                table: "student_enrollments",
                column: "academic_year_id");

            migrationBuilder.CreateIndex(
                name: "IX_student_enrollments_class_id",
                table: "student_enrollments",
                column: "class_id");

            migrationBuilder.CreateIndex(
                name: "IX_student_enrollments_section_id",
                table: "student_enrollments",
                column: "section_id");

            migrationBuilder.CreateIndex(
                name: "IX_student_enrollments_student_id",
                table: "student_enrollments",
                column: "student_id");

            migrationBuilder.CreateIndex(
                name: "IX_student_guardians_student_id",
                table: "student_guardians",
                column: "student_id");

            migrationBuilder.CreateIndex(
                name: "IX_student_section_histories_from_section_id",
                table: "student_section_histories",
                column: "from_section_id");

            migrationBuilder.CreateIndex(
                name: "IX_student_section_histories_student_id",
                table: "student_section_histories",
                column: "student_id");

            migrationBuilder.CreateIndex(
                name: "IX_student_section_histories_to_section_id",
                table: "student_section_histories",
                column: "to_section_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "enquiry_followups");

            migrationBuilder.DropTable(
                name: "student_documents");

            migrationBuilder.DropTable(
                name: "student_enrollments");

            migrationBuilder.DropTable(
                name: "student_guardians");

            migrationBuilder.DropTable(
                name: "student_section_histories");

            migrationBuilder.DropTable(
                name: "enquiries");

            migrationBuilder.DropTable(
                name: "students");
        }
    }
}
