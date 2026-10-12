using System;
using System.Collections.Generic;
using System.Net;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using SchoolERP.Application.Common.Models;
using SchoolERP.Domain.Entities;
using SchoolERP.Infrastructure.Persistence;

namespace SchoolERP.API.Middleware
{
    public class GlobalExceptionMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<GlobalExceptionMiddleware> _logger;
        private readonly IServiceScopeFactory _scopeFactory;

        public GlobalExceptionMiddleware(
            RequestDelegate next,
            ILogger<GlobalExceptionMiddleware> logger,
            IServiceScopeFactory scopeFactory)
        {
            _next = next;
            _logger = logger;
            _scopeFactory = scopeFactory;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An unhandled exception occurred: {Message}", ex.Message);
                var errorId = await LogErrorToDatabaseAsync(context, ex);
                await HandleExceptionAsync(context, ex, errorId);
            }
        }

        private async Task<string> LogErrorToDatabaseAsync(HttpContext context, Exception exception)
        {
            var errorId = $"ERR-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..6].ToUpper()}";
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

                // Find root cause
                var root = exception;
                while (root.InnerException != null)
                {
                    root = root.InnerException;
                }

                long? userId = null;
                string? username = null;
                string? userRole = null;
                long? branchId = null;
                long? schoolId = null;

                var user = context.User;
                if (user?.Identity?.IsAuthenticated == true)
                {
                    var userIdClaim = user.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? user.FindFirst("sub")?.Value;
                    if (long.TryParse(userIdClaim, out var uid)) userId = uid;
                    username = user.FindFirst(ClaimTypes.Name)?.Value ?? user.FindFirst("unique_name")?.Value;
                    userRole = user.FindFirst(ClaimTypes.Role)?.Value;

                    var branchClaim = user.FindFirst("branchId")?.Value;
                    if (long.TryParse(branchClaim, out var bid)) branchId = bid;

                    var schoolClaim = user.FindFirst("schoolId")?.Value;
                    if (long.TryParse(schoolClaim, out var sid)) schoolId = sid;
                }

                var statusCode = exception switch
                {
                    UnauthorizedAccessException => (int)HttpStatusCode.Unauthorized,
                    KeyNotFoundException => (int)HttpStatusCode.NotFound,
                    ArgumentException or InvalidOperationException => (int)HttpStatusCode.BadRequest,
                    _ => (int)HttpStatusCode.InternalServerError
                };

                var log = new SystemErrorLog
                {
                    ErrorId = errorId,
                    Timestamp = DateTime.UtcNow,
                    StatusCode = statusCode,
                    HttpMethod = context.Request.Method,
                    RequestPath = context.Request.Path.Value ?? string.Empty,
                    QueryString = context.Request.QueryString.HasValue ? context.Request.QueryString.Value : null,
                    Message = exception.Message,
                    ExceptionType = exception.GetType().FullName ?? exception.GetType().Name,
                    RootCause = root != exception ? root.Message : null,
                    StackTrace = exception.StackTrace,
                    UserId = userId,
                    Username = username,
                    UserRole = userRole,
                    BranchId = branchId,
                    SchoolId = schoolId,
                    IpAddress = context.Connection.RemoteIpAddress?.ToString(),
                    UserAgent = context.Request.Headers["User-Agent"].ToString(),
                    IsResolved = false
                };

                db.SystemErrorLogs.Add(log);
                await db.SaveChangesAsync();
            }
            catch (Exception dbEx)
            {
                _logger.LogError(dbEx, "Failed to persist system error log to database");
            }

            return errorId;
        }

        private static async Task HandleExceptionAsync(HttpContext context, Exception exception, string errorId)
        {
            context.Response.ContentType = "application/json";

            var response = new ApiResponse
            {
                Success = false,
                Message = "An error occurred while processing your request.",
                Errors = new List<string>()
            };

            switch (exception)
            {
                case UnauthorizedAccessException:
                    context.Response.StatusCode = (int)HttpStatusCode.Unauthorized;
                    response.Message = "Unauthorized access.";
                    response.Errors.Add(exception.Message);
                    break;

                case KeyNotFoundException:
                    context.Response.StatusCode = (int)HttpStatusCode.NotFound;
                    response.Message = "The requested resource was not found.";
                    response.Errors.Add(exception.Message);
                    break;

                case ArgumentException or InvalidOperationException:
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    response.Message = exception.Message;
                    response.Errors.Add(exception.Message);
                    break;

                default:
                    context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
                    response.Message = $"Internal server error. Please try again later or contact support. (Ref: {errorId})";
                    response.Errors.Add($"Error ID: {errorId}");
                    break;
            }

            var jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
            var result = JsonSerializer.Serialize(response, jsonOptions);
            await context.Response.WriteAsync(result);
        }
    }
}
