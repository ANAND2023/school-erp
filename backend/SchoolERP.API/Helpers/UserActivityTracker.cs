using System;
using System.Collections.Concurrent;

namespace SchoolERP.API.Helpers
{
    public static class UserActivityTracker
    {
        // Tracks userId -> last active UTC timestamp
        private static readonly ConcurrentDictionary<long, DateTime> _lastActivity = new();

        // Active within the last 2 minutes is considered Online
        private static readonly TimeSpan OnlineThreshold = TimeSpan.FromMinutes(2);

        public static void RecordActivity(long userId)
        {
            if (userId <= 0) return;
            _lastActivity[userId] = DateTime.UtcNow;
        }

        public static void MarkOffline(long userId)
        {
            if (userId <= 0) return;
            _lastActivity.TryRemove(userId, out _);
        }

        public static bool IsOnline(long userId)
        {
            if (_lastActivity.TryGetValue(userId, out var lastUtc))
            {
                return (DateTime.UtcNow - lastUtc) <= OnlineThreshold;
            }
            return false;
        }

        public static DateTime? GetLastSeen(long userId)
        {
            if (_lastActivity.TryGetValue(userId, out var lastUtc))
            {
                return lastUtc;
            }
            return null;
        }
    }
}
