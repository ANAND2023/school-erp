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
 * 
 * Supports complete A4 page border framing with identical 4-sided margins and paddings.
 */
export function printElement(elementOrId, options = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const resolvedOptions = typeof options === 'string' ? { title: options } : (options || {});
  const {
    title = 'Document',
    pageSize = 'A4',
    orientation = 'portrait',
    margin = '8mm',
    padding = '8mm',
    customCss = '',
  } = resolvedOptions;

  const element = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
  if (!element) {
    console.error('Element not found for printElement:', elementOrId);
    return;
  }

  // Ensure identical margins on all 4 sides (top, right, bottom, left)
  const marginParts = String(margin).trim().split(/\s+/);
  const cleanMargin = marginParts.length === 1 ? marginParts[0] : (marginParts[0] || '8mm');

  // Ensure identical padding on all 4 sides (top, right, bottom, left)
  const paddingParts = String(padding).trim().split(/\s+/);
  const cleanPadding = paddingParts.length === 1 ? paddingParts[0] : (paddingParts[0] || '8mm');

  const isA4 = String(pageSize).trim().toUpperCase() === 'A4';
  const isLandscape = String(orientation).trim().toLowerCase() === 'landscape';

  // For A4: 297mm height (portrait) or 210mm height (landscape).
  // Deducting 2x 8mm margins: 297 - 16 = 281mm. 280mm provides 1mm safety margin against Chrome multi-page spill.
  const fullA4Height = isLandscape ? '193mm' : '280mm';

  // Check if printing a single-page slip/card/form/certificate
  const isSinglePageSlip = Boolean(
    element.classList?.contains('printable-slip') ||
    element.classList?.contains('slip-card') ||
    element.classList?.contains('bonafide-certificate-print') ||
    element.classList?.contains('awr-folio-print') ||
    element.classList?.contains('a4-full-page') ||
    element.id?.includes('slip') ||
    element.id?.includes('registration') ||
    element.id?.includes('enquiry') ||
    element.id?.includes('admission') ||
    element.id?.includes('prospectus') ||
    element.id?.includes('report') ||
    element.id?.includes('certificate') ||
    element.id?.includes('gate-pass') ||
    resolvedOptions.fullPageFrame
  );

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
            margin: ${cleanMargin};
          }
          * {
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: ${isA4 && isSinglePageSlip ? '100%' : 'auto'} !important;
            background: #ffffff !important;
            color: #000000 !important;
            overflow: ${isA4 && isSinglePageSlip ? 'hidden' : 'visible'} !important;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          ${isA4 && isSinglePageSlip ? `
          body > *:first-child,
          .printable-slip,
          #printable-registration-slip-container,
          #printable-enquiry-slip,
          #printable-admission-slip,
          #class-fee-prospectus-slip,
          #modal-class-fee-prospectus-slip,
          #page-class-fee-prospectus-slip,
          #printable-admission-report,
          #printable-fee-slip,
          #printable-registration-form-preview,
          .slip-card,
          .bonafide-certificate-print,
          .awr-folio-print,
          .a4-full-page {
            box-sizing: border-box !important;
            width: 100% !important;
            max-width: 100% !important;
            min-height: ${fullA4Height} !important;
            height: ${fullA4Height} !important;
            margin: 0 !important;
            padding: ${cleanPadding} !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
            overflow: hidden !important;
          }
          ` : `
          #printable-enquiry-slip,
          #class-fee-prospectus-slip,
          #printable-admission-slip,
          #printable-registration-slip,
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
          `}
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
