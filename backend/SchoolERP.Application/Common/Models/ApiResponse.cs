using System.Collections.Generic;

namespace SchoolERP.Application.Common.Models
{
    public class ApiResponse<T>
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public T? Data { get; set; }
        public List<string>? Errors { get; set; }

        public static ApiResponse<T> Ok(T data, string message = "Success")
        {
            return new ApiResponse<T>
            {
                Success = true,
                Message = message,
                Data = data,
                Errors = null
            };
        }

        public static ApiResponse<T> Fail(string message, List<string>? errors = null)
        {
            return new ApiResponse<T>
            {
                Success = false,
                Message = message,
                Data = default,
                Errors = errors ?? new List<string> { message }
            };
        }
    }

    public class ApiResponse : ApiResponse<object>
    {
        public static ApiResponse Ok(string message = "Success")
        {
            return new ApiResponse
            {
                Success = true,
                Message = message,
                Data = null,
                Errors = null
            };
        }

        public new static ApiResponse Fail(string message, List<string>? errors = null)
        {
            return new ApiResponse
            {
                Success = false,
                Message = message,
                Data = null,
                Errors = errors ?? new List<string> { message }
            };
        }
    }

    public class PagedResult<T>
    {
        public List<T> Items { get; set; } = new List<T>();
        public int TotalCount { get; set; }
        public int PageNo { get; set; }
        public int PageSize { get; set; }

        public PagedResult() { }

        public PagedResult(List<T> items, int totalCount, int pageNo, int pageSize)
        {
            Items = items;
            TotalCount = totalCount;
            PageNo = pageNo;
            PageSize = pageSize;
        }
    }
}
