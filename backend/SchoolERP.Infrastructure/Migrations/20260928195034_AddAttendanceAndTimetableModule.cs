using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SchoolERP.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAttendanceAndTimetableModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "holidays",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    branch_id = table.Column<long>(type: "bigint", nullable: false),
                    academic_year_id = table.Column<long>(type: "bigint", nullable: false),
                    holiday_date = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    name = table.Column<string>(type: "varchar(150)", maxLength: 150, nullable: false)
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
                    table.PrimaryKey("PK_holidays", x => x.id);
                    table.ForeignKey(
                        name: "FK_holidays_academic_years_academic_year_id",
                        column: x => x.academic_year_id,
                        principalTable: "academic_years",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_holidays_branches_branch_id",
                        column: x => x.branch_id,
                        principalTable: "branches",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "leave_requests",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    branch_id = table.Column<long>(type: "bigint", nullable: false),
                    academic_year_id = table.Column<long>(type: "bigint", nullable: false),
                    applicant_type = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    employee_id = table.Column<long>(type: "bigint", nullable: true),
                    student_id = table.Column<long>(type: "bigint", nullable: true),
                    leave_type = table.Column<int>(type: "int", nullable: false),
                    from_date = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    to_date = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    total_days = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    reason = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    status = table.Column<int>(type: "int", nullable: false),
                    action_by_user_id = table.Column<long>(type: "bigint", nullable: true),
                    action_date = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    action_remarks = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    created_by = table.Column<long>(type: "bigint", nullable: false),
                    created_on = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    modified_by = table.Column<long>(type: "bigint", nullable: true),
                    modified_on = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_leave_requests", x => x.id);
                    table.ForeignKey(
                        name: "FK_leave_requests_academic_years_academic_year_id",
                        column: x => x.academic_year_id,
                        principalTable: "academic_years",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_leave_requests_branches_branch_id",
                        column: x => x.branch_id,
                        principalTable: "branches",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_leave_requests_employees_employee_id",
                        column: x => x.employee_id,
                        principalTable: "employees",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_leave_requests_students_student_id",
                        column: x => x.student_id,
                        principalTable: "students",
                        principalColumn: "id");
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "periods",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    branch_id = table.Column<long>(type: "bigint", nullable: false),
                    academic_year_id = table.Column<long>(type: "bigint", nullable: false),
                    period_number = table.Column<int>(type: "int", nullable: false),
                    name = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    start_time = table.Column<TimeSpan>(type: "time(6)", nullable: false),
                    end_time = table.Column<TimeSpan>(type: "time(6)", nullable: false),
                    is_break = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    display_order = table.Column<int>(type: "int", nullable: false),
                    created_by = table.Column<long>(type: "bigint", nullable: false),
                    created_on = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    modified_by = table.Column<long>(type: "bigint", nullable: true),
                    modified_on = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_periods", x => x.id);
                    table.ForeignKey(
                        name: "FK_periods_academic_years_academic_year_id",
                        column: x => x.academic_year_id,
                        principalTable: "academic_years",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_periods_branches_branch_id",
                        column: x => x.branch_id,
                        principalTable: "branches",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "staff_attendances",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    branch_id = table.Column<long>(type: "bigint", nullable: false),
                    employee_id = table.Column<long>(type: "bigint", nullable: false),
                    attendance_date = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    status = table.Column<int>(type: "int", nullable: false),
                    in_time = table.Column<TimeSpan>(type: "time(6)", nullable: true),
                    out_time = table.Column<TimeSpan>(type: "time(6)", nullable: true),
                    remarks = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    marked_by = table.Column<long>(type: "bigint", nullable: true),
                    created_by = table.Column<long>(type: "bigint", nullable: false),
                    created_on = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    modified_by = table.Column<long>(type: "bigint", nullable: true),
                    modified_on = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_staff_attendances", x => x.id);
                    table.ForeignKey(
                        name: "FK_staff_attendances_branches_branch_id",
                        column: x => x.branch_id,
                        principalTable: "branches",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_staff_attendances_employees_employee_id",
                        column: x => x.employee_id,
                        principalTable: "employees",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "student_attendances",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    branch_id = table.Column<long>(type: "bigint", nullable: false),
                    academic_year_id = table.Column<long>(type: "bigint", nullable: false),
                    class_id = table.Column<long>(type: "bigint", nullable: false),
                    section_id = table.Column<long>(type: "bigint", nullable: false),
                    student_id = table.Column<long>(type: "bigint", nullable: false),
                    enrollment_id = table.Column<long>(type: "bigint", nullable: false),
                    attendance_date = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    status = table.Column<int>(type: "int", nullable: false),
                    remarks = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    marked_by = table.Column<long>(type: "bigint", nullable: true),
                    created_by = table.Column<long>(type: "bigint", nullable: false),
                    created_on = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    modified_by = table.Column<long>(type: "bigint", nullable: true),
                    modified_on = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_student_attendances", x => x.id);
                    table.ForeignKey(
                        name: "FK_student_attendances_academic_years_academic_year_id",
                        column: x => x.academic_year_id,
                        principalTable: "academic_years",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_student_attendances_branches_branch_id",
                        column: x => x.branch_id,
                        principalTable: "branches",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_student_attendances_classes_class_id",
                        column: x => x.class_id,
                        principalTable: "classes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_student_attendances_sections_section_id",
                        column: x => x.section_id,
                        principalTable: "sections",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_student_attendances_student_enrollments_enrollment_id",
                        column: x => x.enrollment_id,
                        principalTable: "student_enrollments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_student_attendances_students_student_id",
                        column: x => x.student_id,
                        principalTable: "students",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "substitutions",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    branch_id = table.Column<long>(type: "bigint", nullable: false),
                    academic_year_id = table.Column<long>(type: "bigint", nullable: false),
                    substitution_date = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    period_id = table.Column<long>(type: "bigint", nullable: false),
                    class_id = table.Column<long>(type: "bigint", nullable: false),
                    section_id = table.Column<long>(type: "bigint", nullable: false),
                    subject_id = table.Column<long>(type: "bigint", nullable: true),
                    original_employee_id = table.Column<long>(type: "bigint", nullable: false),
                    substitute_employee_id = table.Column<long>(type: "bigint", nullable: false),
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
                    table.PrimaryKey("PK_substitutions", x => x.id);
                    table.ForeignKey(
                        name: "FK_substitutions_academic_years_academic_year_id",
                        column: x => x.academic_year_id,
                        principalTable: "academic_years",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_substitutions_branches_branch_id",
                        column: x => x.branch_id,
                        principalTable: "branches",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_substitutions_classes_class_id",
                        column: x => x.class_id,
                        principalTable: "classes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_substitutions_employees_original_employee_id",
                        column: x => x.original_employee_id,
                        principalTable: "employees",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_substitutions_employees_substitute_employee_id",
                        column: x => x.substitute_employee_id,
                        principalTable: "employees",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_substitutions_periods_period_id",
                        column: x => x.period_id,
                        principalTable: "periods",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_substitutions_sections_section_id",
                        column: x => x.section_id,
                        principalTable: "sections",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_substitutions_subjects_subject_id",
                        column: x => x.subject_id,
                        principalTable: "subjects",
                        principalColumn: "id");
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "timetables",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    branch_id = table.Column<long>(type: "bigint", nullable: false),
                    academic_year_id = table.Column<long>(type: "bigint", nullable: false),
                    class_id = table.Column<long>(type: "bigint", nullable: false),
                    section_id = table.Column<long>(type: "bigint", nullable: false),
                    day_of_week = table.Column<int>(type: "int", nullable: false),
                    period_id = table.Column<long>(type: "bigint", nullable: false),
                    subject_id = table.Column<long>(type: "bigint", nullable: true),
                    employee_id = table.Column<long>(type: "bigint", nullable: true),
                    room_no = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    created_by = table.Column<long>(type: "bigint", nullable: false),
                    created_on = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    modified_by = table.Column<long>(type: "bigint", nullable: true),
                    modified_on = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_timetables", x => x.id);
                    table.ForeignKey(
                        name: "FK_timetables_academic_years_academic_year_id",
                        column: x => x.academic_year_id,
                        principalTable: "academic_years",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_timetables_branches_branch_id",
                        column: x => x.branch_id,
                        principalTable: "branches",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_timetables_classes_class_id",
                        column: x => x.class_id,
                        principalTable: "classes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_timetables_employees_employee_id",
                        column: x => x.employee_id,
                        principalTable: "employees",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_timetables_periods_period_id",
                        column: x => x.period_id,
                        principalTable: "periods",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_timetables_sections_section_id",
                        column: x => x.section_id,
                        principalTable: "sections",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_timetables_subjects_subject_id",
                        column: x => x.subject_id,
                        principalTable: "subjects",
                        principalColumn: "id");
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_holidays_academic_year_id",
                table: "holidays",
                column: "academic_year_id");

            migrationBuilder.CreateIndex(
                name: "IX_holidays_branch_id_academic_year_id_holiday_date",
                table: "holidays",
                columns: new[] { "branch_id", "academic_year_id", "holiday_date" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_leave_requests_academic_year_id",
                table: "leave_requests",
                column: "academic_year_id");

            migrationBuilder.CreateIndex(
                name: "IX_leave_requests_branch_id",
                table: "leave_requests",
                column: "branch_id");

            migrationBuilder.CreateIndex(
                name: "IX_leave_requests_employee_id",
                table: "leave_requests",
                column: "employee_id");

            migrationBuilder.CreateIndex(
                name: "IX_leave_requests_student_id",
                table: "leave_requests",
                column: "student_id");

            migrationBuilder.CreateIndex(
                name: "IX_periods_academic_year_id",
                table: "periods",
                column: "academic_year_id");

            migrationBuilder.CreateIndex(
                name: "IX_periods_branch_id_academic_year_id_period_number",
                table: "periods",
                columns: new[] { "branch_id", "academic_year_id", "period_number" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_staff_attendances_branch_id_employee_id_attendance_date",
                table: "staff_attendances",
                columns: new[] { "branch_id", "employee_id", "attendance_date" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_staff_attendances_employee_id",
                table: "staff_attendances",
                column: "employee_id");

            migrationBuilder.CreateIndex(
                name: "IX_student_attendances_academic_year_id",
                table: "student_attendances",
                column: "academic_year_id");

            migrationBuilder.CreateIndex(
                name: "IX_student_attendances_branch_id_academic_year_id_student_id_at~",
                table: "student_attendances",
                columns: new[] { "branch_id", "academic_year_id", "student_id", "attendance_date" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_student_attendances_class_id",
                table: "student_attendances",
                column: "class_id");

            migrationBuilder.CreateIndex(
                name: "IX_student_attendances_enrollment_id",
                table: "student_attendances",
                column: "enrollment_id");

            migrationBuilder.CreateIndex(
                name: "IX_student_attendances_section_id",
                table: "student_attendances",
                column: "section_id");

            migrationBuilder.CreateIndex(
                name: "IX_student_attendances_student_id",
                table: "student_attendances",
                column: "student_id");

            migrationBuilder.CreateIndex(
                name: "IX_substitutions_academic_year_id",
                table: "substitutions",
                column: "academic_year_id");

            migrationBuilder.CreateIndex(
                name: "IX_substitutions_branch_id_academic_year_id_substitution_date_p~",
                table: "substitutions",
                columns: new[] { "branch_id", "academic_year_id", "substitution_date", "period_id", "section_id" });

            migrationBuilder.CreateIndex(
                name: "IX_substitutions_class_id",
                table: "substitutions",
                column: "class_id");

            migrationBuilder.CreateIndex(
                name: "IX_substitutions_original_employee_id",
                table: "substitutions",
                column: "original_employee_id");

            migrationBuilder.CreateIndex(
                name: "IX_substitutions_period_id",
                table: "substitutions",
                column: "period_id");

            migrationBuilder.CreateIndex(
                name: "IX_substitutions_section_id",
                table: "substitutions",
                column: "section_id");

            migrationBuilder.CreateIndex(
                name: "IX_substitutions_subject_id",
                table: "substitutions",
                column: "subject_id");

            migrationBuilder.CreateIndex(
                name: "IX_substitutions_substitute_employee_id",
                table: "substitutions",
                column: "substitute_employee_id");

            migrationBuilder.CreateIndex(
                name: "IX_timetables_academic_year_id",
                table: "timetables",
                column: "academic_year_id");

            migrationBuilder.CreateIndex(
                name: "IX_timetables_branch_id_academic_year_id_section_id_day_of_week~",
                table: "timetables",
                columns: new[] { "branch_id", "academic_year_id", "section_id", "day_of_week", "period_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_timetables_class_id",
                table: "timetables",
                column: "class_id");

            migrationBuilder.CreateIndex(
                name: "IX_timetables_employee_id",
                table: "timetables",
                column: "employee_id");

            migrationBuilder.CreateIndex(
                name: "IX_timetables_period_id",
                table: "timetables",
                column: "period_id");

            migrationBuilder.CreateIndex(
                name: "IX_timetables_section_id",
                table: "timetables",
                column: "section_id");

            migrationBuilder.CreateIndex(
                name: "IX_timetables_subject_id",
                table: "timetables",
                column: "subject_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "holidays");

            migrationBuilder.DropTable(
                name: "leave_requests");

            migrationBuilder.DropTable(
                name: "staff_attendances");

            migrationBuilder.DropTable(
                name: "student_attendances");

            migrationBuilder.DropTable(
                name: "substitutions");

            migrationBuilder.DropTable(
                name: "timetables");

            migrationBuilder.DropTable(
                name: "periods");
        }
    }
}
