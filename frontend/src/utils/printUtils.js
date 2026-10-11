import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

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

export async function downloadElementAsPdf(elementOrId, fileName = 'document.pdf') {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const element = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
  if (!element) {
    console.error('Element not found for PDF export:', elementOrId);
    return;
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: element.scrollWidth,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, '', 'FAST');
    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, '', 'FAST');
      heightLeft -= pdfHeight;
    }

    const cleanName = sanitizeFileName(fileName) || 'document';
    pdf.save(cleanName.toLowerCase().endsWith('.pdf') ? cleanName : `${cleanName}.pdf`);
  } catch (error) {
    console.error('Failed to generate PDF download:', error);
    // Fallback to print dialog if canvas rendering fails
    printWithTitle(fileName);
  }
}

export default printWithTitle;
