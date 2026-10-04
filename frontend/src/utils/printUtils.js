/**
 * Utility for intelligent, student-specific document print naming.
 * When a user uses window.print() (e.g. Save as PDF or Print to physical printer),
 * the browser uses `document.title` as the default PDF file name.
 * 
 * This helper dynamically sets document.title to a clean, sanitized, student-specific
 * title before printing, and restores the original title right after.
 */

export function sanitizeFileName(name = '') {
  return String(name)
    .replace(/[/\\?%*:|"<>]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/__+/g, '_')
    .trim();
}

export function printWithTitle(customTitle) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const originalTitle = document.title || 'School ERP';
  const cleanTitle = sanitizeFileName(customTitle) || 'Document';

  document.title = cleanTitle;

  const restore = () => {
    document.title = originalTitle;
    window.removeEventListener('afterprint', restore);
  };

  window.addEventListener('afterprint', restore);

  // Small timeout to allow DOM title update before browser capture
  setTimeout(() => {
    window.print();
    setTimeout(restore, 2000);
  }, 60);
}

export default printWithTitle;
