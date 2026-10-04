using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SchoolERP.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddExamAndPromotionModules : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "exam_terms",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    branch_id = table.Column<long>(type: "bigint", nullable: false),
                    academic_year_id = table.Column<long>(type: "bigint", nullable: false),
                    name = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    term_code = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    weightage = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
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
                    table.PrimaryKey("PK_exam_terms", x => x.id);
                    table.ForeignKey(
                        name: "FK_exam_terms_academic_years_academic_year_id",
                        column: x => x.academic_year_id,
                        principalTable: "academic_years",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_exam_terms_branches_branch_id",
                        column: x => x.branch_id,
                        principalTable: "branches",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "grade_scales",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    branch_id = table.Column<long>(type: "bigint", nullable: false),
                    name = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    min_percentage = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    max_percentage = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    grade = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    grade_point = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
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
                    table.PrimaryKey("PK_grade_scales", x => x.id);
                    table.ForeignKey(
                        name: "FK_grade_scales_branches_branch_id",
                        column: x => x.branch_id,
                        principalTable: "branches",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "student_promotions",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    branch_id = table.Column<long>(type: "bigint", nullable: false),
                    from_academic_year_id = table.Column<long>(type: "bigint", nullable: false),
                    to_academic_year_id = table.Column<long>(type: "bigint", nullable: false),
                    student_id = table.Column<long>(type: "bigint", nullable: false),
                    from_class_id = table.Column<long>(type: "bigint", nullable: false),
                    from_section_id = table.Column<long>(type: "bigint", nullable: false),
                    to_class_id = table.Column<long>(type: "bigint", nullable: false),
                    to_section_id = table.Column<long>(type: "bigint", nullable: false),
                    result = table.Column<int>(type: "int", nullable: false),
                    promotion_date = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    dues_carried_forward = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    is_rolled_back = table.Column<bool>(type: "tinyint(1)", nullable: false),
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
                    table.PrimaryKey("PK_student_promotions", x => x.id);
                    table.ForeignKey(
                        name: "FK_student_promotions_academic_years_from_academic_year_id",
                        column: x => x.from_academic_year_id,
                        principalTable: "academic_years",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_student_promotions_academic_years_to_academic_year_id",
                        column: x => x.to_academic_year_id,
                        principalTable: "academic_years",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_student_promotions_branches_branch_id",
                        column: x => x.branch_id,
                        principalTable: "branches",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_student_promotions_classes_from_class_id",
                        column: x => x.from_class_id,
                        principalTable: "classes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_student_promotions_classes_to_class_id",
                        column: x => x.to_class_id,
                        principalTable: "classes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_student_promotions_sections_from_section_id",
                        column: x => x.from_section_id,
                        principalTable: "sections",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_student_promotions_sections_to_section_id",
                        column: x => x.to_section_id,
                        principalTable: "sections",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_student_promotions_students_student_id",
                        column: x => x.student_id,
                        principalTable: "students",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "transfer_certificates",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    branch_id = table.Column<long>(type: "bigint", nullable: false),
                    academic_year_id = table.Column<long>(type: "bigint", nullable: false),
                    student_id = table.Column<long>(type: "bigint", nullable: false),
                    tc_number = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    application_date = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    issue_date = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    last_class_studied = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    qualified_for_promotion = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    reason_for_leaving = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    conduct = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    fee_cleared = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    library_cleared = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    pending_dues_amount = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    remarks = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    status = table.Column<int>(type: "int", nullable: false),
                    created_by = table.Column<long>(type: "bigint", nullable: false),
                    created_on = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    modified_by = table.Column<long>(type: "bigint", nullable: true),
                    modified_on = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_transfer_certificates", x => x.id);
                    table.ForeignKey(
                        name: "FK_transfer_certificates_academic_years_academic_year_id",
                        column: x => x.academic_year_id,
                        principalTable: "academic_years",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_transfer_certificates_branches_branch_id",
                        column: x => x.branch_id,
                        principalTable: "branches",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_transfer_certificates_students_student_id",
                        column: x => x.student_id,
                        principalTable: "students",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "exams",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    branch_id = table.Column<long>(type: "bigint", nullable: false),
                    academic_year_id = table.Column<long>(type: "bigint", nullable: false),
                    term_id = table.Column<long>(type: "bigint", nullable: false),
                    class_id = table.Column<long>(type: "bigint", nullable: false),
                    name = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    description = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    is_published = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    is_locked = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    created_by = table.Column<long>(type: "bigint", nullable: false),
                    created_on = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    modified_by = table.Column<long>(type: "bigint", nullable: true),
                    modified_on = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_exams", x => x.id);
                    table.ForeignKey(
                        name: "FK_exams_academic_years_academic_year_id",
                        column: x => x.academic_year_id,
                        principalTable: "academic_years",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_exams_branches_branch_id",
                        column: x => x.branch_id,
                        principalTable: "branches",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_exams_classes_class_id",
                        column: x => x.class_id,
                        principalTable: "classes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_exams_exam_terms_term_id",
                        column: x => x.term_id,
                        principalTable: "exam_terms",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "co_scholastic_grades",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    exam_id = table.Column<long>(type: "bigint", nullable: false),
                    student_id = table.Column<long>(type: "bigint", nullable: false),
                    activity_name = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    grade = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
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
                    table.PrimaryKey("PK_co_scholastic_grades", x => x.id);
                    table.ForeignKey(
                        name: "FK_co_scholastic_grades_exams_exam_id",
                        column: x => x.exam_id,
                        principalTable: "exams",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_co_scholastic_grades_students_student_id",
                        column: x => x.student_id,
                        principalTable: "students",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "exam_schedules",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    exam_id = table.Column<long>(type: "bigint", nullable: false),
                    subject_id = table.Column<long>(type: "bigint", nullable: false),
                    exam_date = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    start_time = table.Column<TimeSpan>(type: "time(6)", nullable: true),
                    end_time = table.Column<TimeSpan>(type: "time(6)", nullable: true),
                    max_marks = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    pass_marks = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
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
                    table.PrimaryKey("PK_exam_schedules", x => x.id);
                    table.ForeignKey(
                        name: "FK_exam_schedules_exams_exam_id",
                        column: x => x.exam_id,
                        principalTable: "exams",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_exam_schedules_subjects_subject_id",
                        column: x => x.subject_id,
                        principalTable: "subjects",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "report_remarks",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    exam_id = table.Column<long>(type: "bigint", nullable: false),
                    student_id = table.Column<long>(type: "bigint", nullable: false),
                    attendance_total = table.Column<int>(type: "int", nullable: false),
                    attendance_present = table.Column<int>(type: "int", nullable: false),
                    teacher_remarks = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    principal_remarks = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    created_by = table.Column<long>(type: "bigint", nullable: false),
                    created_on = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    modified_by = table.Column<long>(type: "bigint", nullable: true),
                    modified_on = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_report_remarks", x => x.id);
                    table.ForeignKey(
                        name: "FK_report_remarks_exams_exam_id",
                        column: x => x.exam_id,
                        principalTable: "exams",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_report_remarks_students_student_id",
                        column: x => x.student_id,
                        principalTable: "students",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "marks_entries",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    schedule_id = table.Column<long>(type: "bigint", nullable: false),
                    student_id = table.Column<long>(type: "bigint", nullable: false),
                    marks_obtained = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: true),
                    is_absent = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    is_medical_leave = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    remarks = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    is_locked = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    created_by = table.Column<long>(type: "bigint", nullable: false),
                    created_on = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    modified_by = table.Column<long>(type: "bigint", nullable: true),
                    modified_on = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_marks_entries", x => x.id);
                    table.ForeignKey(
                        name: "FK_marks_entries_exam_schedules_schedule_id",
                        column: x => x.schedule_id,
                        principalTable: "exam_schedules",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_marks_entries_students_student_id",
                        column: x => x.student_id,
                        principalTable: "students",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_co_scholastic_grades_exam_id",
                table: "co_scholastic_grades",
                column: "exam_id");

            migrationBuilder.CreateIndex(
                name: "IX_co_scholastic_grades_student_id",
                table: "co_scholastic_grades",
                column: "student_id");

            migrationBuilder.CreateIndex(
                name: "IX_exam_schedules_exam_id",
                table: "exam_schedules",
                column: "exam_id");

            migrationBuilder.CreateIndex(
                name: "IX_exam_schedules_subject_id",
                table: "exam_schedules",
                column: "subject_id");

            migrationBuilder.CreateIndex(
                name: "IX_exam_terms_academic_year_id",
                table: "exam_terms",
                column: "academic_year_id");

            migrationBuilder.CreateIndex(
                name: "IX_exam_terms_branch_id",
                table: "exam_terms",
                column: "branch_id");

            migrationBuilder.CreateIndex(
                name: "IX_exams_academic_year_id",
                table: "exams",
                column: "academic_year_id");

            migrationBuilder.CreateIndex(
                name: "IX_exams_branch_id",
                table: "exams",
                column: "branch_id");

            migrationBuilder.CreateIndex(
                name: "IX_exams_class_id",
                table: "exams",
                column: "class_id");

            migrationBuilder.CreateIndex(
                name: "IX_exams_term_id",
                table: "exams",
                column: "term_id");

            migrationBuilder.CreateIndex(
                name: "IX_grade_scales_branch_id",
                table: "grade_scales",
                column: "branch_id");

            migrationBuilder.CreateIndex(
                name: "IX_marks_entries_schedule_id",
                table: "marks_entries",
                column: "schedule_id");

            migrationBuilder.CreateIndex(
                name: "IX_marks_entries_student_id",
                table: "marks_entries",
                column: "student_id");

            migrationBuilder.CreateIndex(
                name: "IX_report_remarks_exam_id",
                table: "report_remarks",
                column: "exam_id");

            migrationBuilder.CreateIndex(
                name: "IX_report_remarks_student_id",
                table: "report_remarks",
                column: "student_id");

            migrationBuilder.CreateIndex(
                name: "IX_student_promotions_branch_id",
                table: "student_promotions",
                column: "branch_id");

            migrationBuilder.CreateIndex(
                name: "IX_student_promotions_from_academic_year_id",
                table: "student_promotions",
                column: "from_academic_year_id");

            migrationBuilder.CreateIndex(
                name: "IX_student_promotions_from_class_id",
                table: "student_promotions",
                column: "from_class_id");

            migrationBuilder.CreateIndex(
                name: "IX_student_promotions_from_section_id",
                table: "student_promotions",
                column: "from_section_id");

            migrationBuilder.CreateIndex(
                name: "IX_student_promotions_student_id",
                table: "student_promotions",
                column: "student_id");

            migrationBuilder.CreateIndex(
                name: "IX_student_promotions_to_academic_year_id",
                table: "student_promotions",
                column: "to_academic_year_id");

            migrationBuilder.CreateIndex(
                name: "IX_student_promotions_to_class_id",
                table: "student_promotions",
                column: "to_class_id");

            migrationBuilder.CreateIndex(
                name: "IX_student_promotions_to_section_id",
                table: "student_promotions",
                column: "to_section_id");

            migrationBuilder.CreateIndex(
                name: "IX_transfer_certificates_academic_year_id",
                table: "transfer_certificates",
                column: "academic_year_id");

            migrationBuilder.CreateIndex(
                name: "IX_transfer_certificates_branch_id",
                table: "transfer_certificates",
                column: "branch_id");

            migrationBuilder.CreateIndex(
                name: "IX_transfer_certificates_student_id",
                table: "transfer_certificates",
                column: "student_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "co_scholastic_grades");

            migrationBuilder.DropTable(
                name: "grade_scales");

            migrationBuilder.DropTable(
                name: "marks_entries");

            migrationBuilder.DropTable(
                name: "report_remarks");

            migrationBuilder.DropTable(
                name: "student_promotions");

            migrationBuilder.DropTable(
                name: "transfer_certificates");

            migrationBuilder.DropTable(
                name: "exam_schedules");

            migrationBuilder.DropTable(
                name: "exams");

            migrationBuilder.DropTable(
                name: "exam_terms");
        }
    }
}
