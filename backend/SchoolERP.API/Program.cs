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
          try { context.Database.ExecuteSqlRaw("CREATE TABLE IF NOT EXISTS `fee_discount_schemes` (`id` bigint NOT NULL AUTO_INCREMENT, `branch_id` bigint NOT NULL, `name` varchar(150) NOT NULL, `code` varchar(50) NOT NULL, `type` varchar(50) NOT NULL, `value` decimal(18,2) NOT NULL, `description` longtext NULL, `created_by` bigint NULL, `created_on` datetime(6) NOT NULL, `modified_by` bigint NULL, `modified_on` datetime(6) NULL, `is_active` tinyint(1) NOT NULL DEFAULT 1, PRIMARY KEY (`id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;"); } catch {}
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

app.MapControllers();

app.Run();


