import dayjs from 'dayjs';

/**
 * Formats a date/datetime string into the user's local timezone (IST).
 * If the string represents a UTC timestamp without a timezone indicator (e.g. "2026-10-17T15:37:00"),
 * it appends 'Z' so Day.js correctly interprets it as UTC and converts it to local browser time.
 */
export function formatDateTime(dateVal, format = 'DD MMM YYYY, hh:mm A') {
  if (!dateVal) return '—';
  let str = String(dateVal).trim();
  if (!str) return '—';

  // If it's a date-only string like "YYYY-MM-DD", keep as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return dayjs(str).format(format.includes('hh:mm') || format.includes('HH:mm') ? 'DD MMM YYYY' : format);
  }

  // If it has time component but no timezone indicator ('Z' or [+-]HH:mm), append 'Z' (UTC)
  if (str.includes('T') || str.includes(':')) {
    if (!str.endsWith('Z') && !/[+-]\d{2}(:\d{2})?$/.test(str)) {
      str += 'Z';
    }
  }

  const d = dayjs(str);
  return d.isValid() ? d.format(format) : String(dateVal);
}

export function formatDate(dateVal, format = 'DD MMM YYYY') {
  return formatDateTime(dateVal, format);
}

export default formatDateTime;
