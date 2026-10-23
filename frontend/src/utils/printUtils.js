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

/**
 * Isolated print utility that prints ONLY the targeted DOM element.
 * Perfect for vouchers, slips, fee receipts, and certificates where
 * sidebars, navigation headers, and control panels must NEVER appear in print.
 */
export function printElement(elementOrId, options = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const {
    title = 'Document',
    pageSize = 'A4',
    orientation = 'portrait',
    margin = '8mm',
    customCss = '',
  } = options;

  const element = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
  if (!element) {
    console.error('Element not found for printElement:', elementOrId);
    return;
  }

  // Remove existing print iframe if any
  const existingIframe = document.getElementById('erp-print-isolated-frame');
  if (existingIframe) {
    existingIframe.remove();
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'erp-print-isolated-frame';
  iframe.style.position = 'fixed';
  iframe.style.top = '-9999px';
  iframe.style.left = '-9999px';
  iframe.style.width = '0px';
  iframe.style.height = '0px';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const headStyles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((node) => node.outerHTML)
    .join('\n');

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${sanitizeFileName(title)}</title>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Poppins:wght@400;500;600;700;800;900&family=Roboto:wght@400;500;700;900&family=Montserrat:wght@400;500;600;700;800;900&family=Playfair+Display:wght@600;700;800;900&display=swap" />
        <link rel="stylesheet" href="https://unpkg.com/primeicons@6.0.1/primeicons.css" />
        ${headStyles}
        <style>
          @page {
            size: ${pageSize} ${orientation};
            margin: ${margin};
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: #ffffff !important;
            color: #000000 !important;
            overflow: visible !important;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          #printable-enquiry-slip,
          #class-fee-prospectus-slip,
          .printable-slip,
          #gate-pass-print-area {
            display: block !important;
            visibility: visible !important;
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          ${customCss}
        </style>
      </head>
      <body>
        ${element.outerHTML}
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (e) {
      console.error('Error invoking print from iframe:', e);
    } finally {
      setTimeout(() => {
        iframe.remove();
      }, 2000);
    }
  }, 350);
}

export default printWithTitle;
