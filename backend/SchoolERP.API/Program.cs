using System;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;
using SchoolERP.API.Middleware;
using SchoolERP.Application.Common.Interfaces;
using SchoolERP.Infrastructure.Persistence;
using SchoolERP.Infrastructure.Services;

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog
builder.Host.UseSerilog((ctx, lc) => lc
    .ReadFrom.Configuration(ctx.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console());

// Add Database Context
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    options.UseMySql(
        connectionString,
        ServerVersion.AutoDetect(connectionString),
        mySqlOptions => mySqlOptions.EnableRetryOnFailure(3, TimeSpan.FromSeconds(5), null)
    );
});

// Register Application and Infrastructure Services
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
builder.Services.AddScoped<INumberingSeriesService, NumberingSeriesService>();

// Configure JWT Authentication
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secret = jwtSettings["Secret"] ?? "SuperSecretKeySchoolERPProjectDefault2026!@#$%^&*()_+UniqueKey";
var key = Encoding.UTF8.GetBytes(secret);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = true,
        ValidIssuer = jwtSettings["Issuer"] ?? "SchoolERP",
        ValidateAudience = true,
        ValidAudience = jwtSettings["Audience"] ?? "SchoolERPClient",
        ClockSkew = TimeSpan.Zero
    };
});

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

builder.Services.AddControllers().AddJsonOptions(options => { options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles; });
builder.Services.AddEndpointsApiExplorer();

// Configure Swagger with JWT Authorize
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "School ERP Web API",
        Version = "v1",
        Description = "ASP.NET Core .NET 8 Web API for School ERP (Clean Architecture)"
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Enter 'Bearer' [space] and then your token.",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// Seed initial database schema and default roles/users
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<ApplicationDbContext>();
        await DbInitializer.SeedAsync(context);
          try { context.Database.ExecuteSqlRaw("INSERT INTO `roles` (`name`, `description`, `is_system_role`, `created_by`, `created_on`, `is_active`) SELECT 'Driver', 'Transport vehicle driver', 1, 1, UTC_TIMESTAMP(), 1 WHERE NOT EXISTS (SELECT 1 FROM `roles` WHERE `name` = 'Driver');"); } catch {}
          try { context.Database.ExecuteSqlRaw("ALTER TABLE `vehicles` ADD COLUMN `driver_id` bigint NULL;"); } catch {}
          try { context.Database.ExecuteSqlRaw("CREATE TABLE IF NOT EXISTS `landing_enquiries` (`id` bigint NOT NULL AUTO_INCREMENT, `name` longtext NOT NULL, `school_name` longtext NOT NULL, `phone` longtext NOT NULL, `email` longtext NULL, `message` longtext NULL, `is_read` tinyint(1) NOT NULL, `submitted_at` datetime(6) NOT NULL, `created_by` bigint NULL, `created_on` datetime(6) NOT NULL, `modified_by` bigint NULL, `modified_on` datetime(6) NULL, `is_active` tinyint(1) NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;"); } catch {}
          try { context.Database.ExecuteSqlRaw("ALTER TABLE `landing_enquiries` ADD COLUMN `status` longtext NULL;"); } catch {}
          try { context.Database.ExecuteSqlRaw("ALTER TABLE `landing_enquiries` ADD COLUMN `remarks` longtext NULL;"); } catch {}
          try { context.Database.ExecuteSqlRaw("UPDATE `landing_enquiries` SET `status` = 'New' WHERE `status` IS NULL;"); } catch {}
          try { context.Database.ExecuteSqlRaw("CREATE TABLE IF NOT EXISTS `vehicles` (`id` bigint NOT NULL AUTO_INCREMENT, `branch_id` bigint NOT NULL, `registration_no` longtext NOT NULL, `vehicle_type` longtext NOT NULL, `capacity` int NOT NULL, `make_and_model` longtext NULL, `driver_name` longtext NULL, `driver_phone` longtext NULL, `status` longtext NOT NULL, `created_by` bigint NULL, `created_on` datetime(6) NOT NULL, `modified_by` bigint NULL, `modified_on` datetime(6) NULL, `is_active` tinyint(1) NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;"); } catch {}
          try { context.Database.ExecuteSqlRaw("CREATE TABLE IF NOT EXISTS `transport_routes` (`id` bigint NOT NULL AUTO_INCREMENT, `branch_id` bigint NOT NULL, `route_name` longtext NOT NULL, `description` longtext NULL, `vehicle_id` bigint NULL, `created_by` bigint NULL, `created_on` datetime(6) NOT NULL, `modified_by` bigint NULL, `modified_on` datetime(6) NULL, `is_active` tinyint(1) NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;"); } catch {}
          try { context.Database.ExecuteSqlRaw("CREATE TABLE IF NOT EXISTS `route_stops` (`id` bigint NOT NULL AUTO_INCREMENT, `route_id` bigint NOT NULL, `stop_name` longtext NOT NULL, `pick_up_time` time(6) NULL, `drop_time` time(6) NULL, `monthly_fare` decimal(18,2) NOT NULL, `created_by` bigint NULL, `created_on` datetime(6) NOT NULL, `modified_by` bigint NULL, `modified_on` datetime(6) NULL, `is_active` tinyint(1) NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;"); } catch {}
          try { context.Database.ExecuteSqlRaw("CREATE TABLE IF NOT EXISTS `transport_allocations` (`id` bigint NOT NULL AUTO_INCREMENT, `branch_id` bigint NOT NULL, `academic_year_id` bigint NOT NULL, `student_id` bigint NOT NULL, `route_stop_id` bigint NOT NULL, `start_date` datetime(6) NOT NULL, `end_date` datetime(6) NULL, `status` longtext NOT NULL, `created_by` bigint NULL, `created_on` datetime(6) NOT NULL, `modified_by` bigint NULL, `modified_on` datetime(6) NULL, `is_active` tinyint(1) NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;"); } catch {}
          try { context.Database.ExecuteSqlRaw("CREATE TABLE IF NOT EXISTS `student_gate_passes` (`id` bigint NOT NULL AUTO_INCREMENT, `branch_id` bigint NOT NULL, `academic_year_id` bigint NOT NULL, `student_id` bigint NOT NULL, `gate_pass_no` varchar(50) NOT NULL, `pass_date` datetime(6) NOT NULL, `out_time` varchar(20) NOT NULL, `expected_return_time` varchar(20) NULL, `actual_return_time` varchar(20) NULL, `reason` varchar(150) NOT NULL, `reason_detail` longtext NULL, `receiver_name` varchar(150) NOT NULL, `receiver_relation` varchar(50) NOT NULL, `receiver_contact` varchar(50) NULL, `receiver_photo_url` longtext NULL, `approved_by` varchar(150) NULL, `status` varchar(50) NOT NULL, `remarks` longtext NULL, `created_by` bigint NOT NULL, `created_on` datetime(6) NOT NULL, `modified_by` bigint NULL, `modified_on` datetime(6) NULL, `is_active` tinyint(1) NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;"); } catch {}
          try { context.Database.ExecuteSqlRaw("CREATE TABLE IF NOT EXISTS `student_certificates` (`id` bigint NOT NULL AUTO_INCREMENT, `branch_id` bigint NOT NULL, `academic_year_id` bigint NOT NULL, `student_id` bigint NOT NULL, `certificate_type` varchar(50) NOT NULL, `certificate_no` varchar(100) NOT NULL, `issue_date` datetime(6) NOT NULL, `purpose` varchar(255) NULL, `issued_by` varchar(150) NULL, `status` varchar(50) NOT NULL DEFAULT 'Issued', `remarks` longtext NULL, `options_json` longtext NULL, `created_by` bigint NOT NULL, `created_on` datetime(6) NOT NULL, `modified_by` bigint NULL, `modified_on` datetime(6) NULL, `is_active` tinyint(1) NOT NULL DEFAULT 1, PRIMARY KEY (`id`), KEY `idx_cert_branch_type` (`branch_id`, `certificate_type`), KEY `idx_cert_student` (`student_id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;"); } catch {}
          try { context.Database.ExecuteSqlRaw("CREATE TABLE IF NOT EXISTS `fee_discount_schemes` (`id` bigint NOT NULL AUTO_INCREMENT, `branch_id` bigint NOT NULL, `name` varchar(150) NOT NULL, `code` varchar(50) NOT NULL, `type` varchar(50) NOT NULL, `value` decimal(18,2) NOT NULL, `description` longtext NULL, `created_by` bigint NULL, `created_on` datetime(6) NOT NULL, `modified_by` bigint NULL, `modified_on` datetime(6) NULL, `is_active` tinyint(1) NOT NULL DEFAULT 1, PRIMARY KEY (`id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;"); } catch {}
          try { context.Database.ExecuteSqlRaw("CREATE TABLE IF NOT EXISTS `student_audit_logs` (`id` bigint NOT NULL AUTO_INCREMENT, `student_id` bigint NOT NULL, `branch_id` bigint NOT NULL, `changed_by_user_id` bigint NOT NULL, `changed_by_user_name` varchar(255) NOT NULL, `changed_on` datetime(6) NOT NULL, `remarks` longtext NOT NULL, `changes_json` longtext NOT NULL, `created_by` bigint NULL, `created_on` datetime(6) NOT NULL, `modified_by` bigint NULL, `modified_on` datetime(6) NULL, `is_active` tinyint(1) NOT NULL DEFAULT 1, PRIMARY KEY (`id`), KEY `idx_student_audit_logs_student` (`student_id`), KEY `idx_student_audit_logs_branch` (`branch_id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;"); } catch {}

          // Dynamic Admission Builder & Slip Tables
          try { context.Database.ExecuteSqlRaw("CREATE TABLE IF NOT EXISTS `admission_form_configs` (`id` bigint NOT NULL AUTO_INCREMENT, `branch_id` bigint NOT NULL, `academic_year_id` bigint NOT NULL, `form_title` varchar(255) NOT NULL, `form_description` longtext NULL, `instructions` longtext NULL, `application_fee` decimal(18,2) NOT NULL DEFAULT 0.00, `version` int NOT NULL DEFAULT 1, `created_by` bigint NOT NULL, `created_on` datetime(6) NOT NULL, `modified_by` bigint NULL, `modified_on` datetime(6) NULL, `is_active` tinyint(1) NOT NULL DEFAULT 1, PRIMARY KEY (`id`), UNIQUE KEY `uk_branch_academic_year` (`branch_id`, `academic_year_id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;"); } catch {}
          try { context.Database.ExecuteSqlRaw("CREATE TABLE IF NOT EXISTS `admission_form_fields` (`id` bigint NOT NULL AUTO_INCREMENT, `form_config_id` bigint NOT NULL, `field_key` varchar(100) NOT NULL, `field_label` varchar(255) NOT NULL, `field_type` varchar(50) NOT NULL, `placeholder` varchar(255) NULL, `help_text` varchar(500) NULL, `default_value` longtext NULL, `options_json` json NULL, `validation_rules_json` json NULL, `display_order` int NOT NULL DEFAULT 0, `is_system_field` tinyint(1) NOT NULL DEFAULT 0, `is_visible_on_slip` tinyint(1) NOT NULL DEFAULT 1, `grid_span` int NOT NULL DEFAULT 6, `created_by` bigint NOT NULL, `created_on` datetime(6) NOT NULL, `modified_by` bigint NULL, `modified_on` datetime(6) NULL, `is_active` tinyint(1) NOT NULL DEFAULT 1, PRIMARY KEY (`id`), UNIQUE KEY `uk_config_field_key` (`form_config_id`, `field_key`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;"); } catch {}
          try { context.Database.ExecuteSqlRaw("CREATE TABLE IF NOT EXISTS `admission_slips` (`id` bigint NOT NULL AUTO_INCREMENT, `branch_id` bigint NOT NULL, `academic_year_id` bigint NOT NULL, `form_config_id` bigint NOT NULL, `slip_number` varchar(60) NOT NULL, `batch_id` varchar(100) NULL, `student_name` varchar(150) NOT NULL, `class_id` bigint NOT NULL, `gender` varchar(20) NULL, `dob` datetime(6) NULL, `father_name` varchar(150) NULL, `mother_name` varchar(150) NULL, `contact_number` varchar(30) NOT NULL, `alternate_number` varchar(30) NULL, `email` varchar(150) NULL, `address` longtext NULL, `state` varchar(100) NULL, `city` varchar(100) NULL, `previous_school` varchar(255) NULL, `student_photo_url` longtext NULL, `custom_field_values_json` json NOT NULL, `admission_status` varchar(50) NOT NULL DEFAULT 'Issued', `fee_amount` decimal(18,2) NOT NULL DEFAULT 0.00, `paid_amount` decimal(18,2) NOT NULL DEFAULT 0.00, `balance_amount` decimal(18,2) NOT NULL DEFAULT 0.00, `payment_status` varchar(30) NOT NULL DEFAULT 'Unpaid', `created_by` bigint NOT NULL, `created_on` datetime(6) NOT NULL, `modified_by` bigint NULL, `modified_on` datetime(6) NULL, `is_active` tinyint(1) NOT NULL DEFAULT 1, PRIMARY KEY (`id`), UNIQUE KEY `uk_branch_slip_number` (`branch_id`, `slip_number`), KEY `idx_admission_slips_lookup` (`branch_id`, `academic_year_id`, `class_id`, `payment_status`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;"); } catch {}
          try { context.Database.ExecuteSqlRaw("CREATE TABLE IF NOT EXISTS `admission_payments` (`id` bigint NOT NULL AUTO_INCREMENT, `branch_id` bigint NOT NULL, `admission_slip_id` bigint NOT NULL, `receipt_number` varchar(60) NOT NULL, `payment_date` datetime(6) NOT NULL, `amount` decimal(18,2) NOT NULL, `payment_mode` varchar(30) NOT NULL, `transaction_reference` varchar(150) NULL, `payment_note` varchar(500) NULL, `collected_by` bigint NOT NULL, `is_reconciled` tinyint(1) NOT NULL DEFAULT 1, `created_by` bigint NOT NULL, `created_on` datetime(6) NOT NULL, `modified_by` bigint NULL, `modified_on` datetime(6) NULL, `is_active` tinyint(1) NOT NULL DEFAULT 1, PRIMARY KEY (`id`), UNIQUE KEY `uk_branch_receipt_number` (`branch_id`, `receipt_number`), KEY `idx_slip_payments` (`admission_slip_id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;"); } catch {}

          // Staff Payroll & Salary Slips
          try { context.Database.ExecuteSqlRaw("CREATE TABLE IF NOT EXISTS `staff_payrolls` (`id` bigint NOT NULL AUTO_INCREMENT, `branch_id` bigint NOT NULL, `academic_year_id` bigint NOT NULL, `employee_id` bigint NOT NULL, `salary_slip_no` varchar(60) NOT NULL, `payroll_month` int NOT NULL, `payroll_year` int NOT NULL, `month_name` varchar(50) NOT NULL, `total_working_days` int NOT NULL DEFAULT 30, `present_days` decimal(5,2) NOT NULL DEFAULT 30.00, `paid_leaves` decimal(5,2) NOT NULL DEFAULT 0.00, `unpaid_leaves` decimal(5,2) NOT NULL DEFAULT 0.00, `basic_salary` decimal(18,2) NOT NULL DEFAULT 0.00, `da` decimal(18,2) NOT NULL DEFAULT 0.00, `hra` decimal(18,2) NOT NULL DEFAULT 0.00, `conveyance` decimal(18,2) NOT NULL DEFAULT 0.00, `medical_allowance` decimal(18,2) NOT NULL DEFAULT 0.00, `special_allowance` decimal(18,2) NOT NULL DEFAULT 0.00, `gross_salary` decimal(18,2) NOT NULL DEFAULT 0.00, `pf_deduction` decimal(18,2) NOT NULL DEFAULT 0.00, `esi_deduction` decimal(18,2) NOT NULL DEFAULT 0.00, `professional_tax` decimal(18,2) NOT NULL DEFAULT 0.00, `tds_deduction` decimal(18,2) NOT NULL DEFAULT 0.00, `loan_deduction` decimal(18,2) NOT NULL DEFAULT 0.00, `leave_deduction` decimal(18,2) NOT NULL DEFAULT 0.00, `total_deductions` decimal(18,2) NOT NULL DEFAULT 0.00, `net_salary` decimal(18,2) NOT NULL DEFAULT 0.00, `payment_status` varchar(30) NOT NULL DEFAULT 'Pending', `payment_date` datetime(6) NULL, `payment_mode` varchar(50) NULL, `transaction_reference` varchar(150) NULL, `remarks` longtext NULL, `created_by` bigint NOT NULL, `created_on` datetime(6) NOT NULL, `modified_by` bigint NULL, `modified_on` datetime(6) NULL, `is_active` tinyint(1) NOT NULL DEFAULT 1, PRIMARY KEY (`id`), UNIQUE KEY `uk_payroll_emp_period` (`branch_id`, `employee_id`, `payroll_month`, `payroll_year`), UNIQUE KEY `uk_payroll_slip_no` (`branch_id`, `salary_slip_no`), KEY `idx_payroll_lookup` (`branch_id`, `payroll_year`, `payroll_month`, `payment_status`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;"); } catch {}
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred while seeding the database.");
    }
}

// Global Exception Middleware (SRS 3.4)
app.UseMiddleware<GlobalExceptionMiddleware>();

// Configure HTTP request pipeline
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "School ERP API v1");
    c.RoutePrefix = "swagger";
});

app.UseSerilogRequestLogging();
app.UseHttpsRedirection();
app.UseCors("AllowAll");

app.UseAuthentication();
app.UseAuthorization();

// Automatically track active logged-in users across all authenticated API requests
app.Use(async (context, next) =>
{
    var userIdClaim = context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
    if (long.TryParse(userIdClaim, out var uid))
    {
        SchoolERP.API.Helpers.UserActivityTracker.RecordActivity(uid);
    }
    await next();
});

app.MapControllers();
app.MapGet("/", () => Results.Redirect("/swagger"));

app.Run();


