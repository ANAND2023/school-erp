using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SchoolERP.Application.Common.Models;
using SchoolERP.Domain.Enums;
using SchoolERP.Infrastructure.Persistence;

namespace SchoolERP.API.Filters
{
    [AttributeUsage(AttributeTargets.Method | AttributeTargets.Class, AllowMultiple = true)]
    public class HasPermissionAttribute : TypeFilterAttribute
    {
        public HasPermissionAttribute(string menu, string action) : base(typeof(HasPermissionFilter))
        {
            Arguments = new object[] { menu, action };
        }
    }

    public class HasPermissionFilter : IAsyncAuthorizationFilter
    {
        private readonly string _menu;
        private readonly string _action;

        public HasPermissionFilter(string menu, string action)
        {
            _menu = menu;
            _action = action;
        }

        public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
        {
            var user = context.HttpContext.User;

            if (user.Identity == null || !user.Identity.IsAuthenticated)
            {
                context.Result = new ObjectResult(ApiResponse.Fail("Authentication required."))
                {
                    StatusCode = 401
                };
                return;
            }

            // Check if SuperAdmin or SchoolAdmin (Admin has full bypass)
            var userTypeClaim = user.FindFirst("user_type")?.Value;
            if (userTypeClaim == UserType.SuperAdmin.ToString() || userTypeClaim == UserType.SchoolAdmin.ToString())
            {
                return;
            }

            // Extract role id
            var roleIdClaim = user.FindFirst("role_id")?.Value;
            if (!long.TryParse(roleIdClaim, out var roleId))
            {
                context.Result = new ObjectResult(ApiResponse.Fail("Access denied: Invalid role."))
                {
                    StatusCode = 403
                };
                return;
            }

            var dbContext = context.HttpContext.RequestServices.GetRequiredService<ApplicationDbContext>();

            // Support comma-separated menus
            var allowedMenus = _menu.Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(m => m.ToLower())
                .ToList();

            // Cross-module fallback for viewing students:
            // Any staff with FeeCollection, FeeAssignment, DemandBill, Admissions, StudentAttendance, MarksEntry, Transport, Promotion, TC can search/view students
            if (allowedMenus.Contains("students") && _action.Equals("view", StringComparison.OrdinalIgnoreCase))
            {
                allowedMenus.AddRange(new[]
                {
                    "feecollection",
                    "feeassignment",
                    "demandbill",
                    "feereports",
                    "admissions",
                    "studentattendance",
                    "marksentry",
                    "transportallocations",
                    "promotion",
                    "transfercertificates"
                });
            }

            // Cross-module fallback for SimpleMasters (e.g. fee payment modes, categories)
            if (allowedMenus.Contains("simplemasters") && _action.Equals("view", StringComparison.OrdinalIgnoreCase))
            {
                allowedMenus.AddRange(new[] { "feestructure", "feecollection", "feeassignment", "masters" });
            }

            var permissions = await dbContext.RolePermissions
                .AsNoTracking()
                .Where(p => p.RoleId == roleId)
                .ToListAsync();

            bool hasAccess = permissions.Any(p =>
                allowedMenus.Contains(p.Menu.ToLower()) &&
                _action.ToLower() switch
                {
                    "view" => p.CanView,
                    "add" => p.CanAdd,
                    "edit" => p.CanEdit,
                    "delete" => p.CanDelete,
                    "print" => p.CanPrint,
                    "export" => p.CanExport,
                    _ => false
                }
            );

            if (!hasAccess)
            {
                context.Result = new ObjectResult(ApiResponse.Fail($"Access denied: You do not have '{_action}' permission for '{_menu}'."))
                {
                    StatusCode = 403
                };
            }
        }
    }
}
