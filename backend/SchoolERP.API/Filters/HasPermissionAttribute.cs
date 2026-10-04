using System;
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

            // Check if SuperAdmin
            var userTypeClaim = user.FindFirst("user_type")?.Value;
            if (userTypeClaim == UserType.SuperAdmin.ToString())
            {
                // SuperAdmin has full bypass
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

            var permission = await dbContext.RolePermissions
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.RoleId == roleId && p.Menu.ToLower() == _menu.ToLower());

            if (permission == null)
            {
                context.Result = new ObjectResult(ApiResponse.Fail($"Access denied: No permissions for {_menu}."))
                {
                    StatusCode = 403
                };
                return;
            }

            bool hasAccess = _action.ToLower() switch
            {
                "view" => permission.CanView,
                "add" => permission.CanAdd,
                "edit" => permission.CanEdit,
                "delete" => permission.CanDelete,
                "print" => permission.CanPrint,
                "export" => permission.CanExport,
                _ => false
            };

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
