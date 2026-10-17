import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import dayjs from 'dayjs';
import { numberToIndianWords, formatReceiptMonths } from './numberToWords';
import { formatDateTime } from '../../../utils/dateUtils';

/**
 * Export Fee Daily Collection to Excel (.xlsx)
 */
export const exportCollectionToExcel = ({
  collectionList = [],
  startDate,
  endDate,
  modeFilter = 'All',
  schoolName = 'Delhi Public School',
  branchName = 'Main Campus',
}) => {
  if (!collectionList || collectionList.length === 0) return;

  const totalCollected = collectionList
    .filter((r) => r.status === 1)
    .reduce((sum, r) => sum + Number(r.totalPaid || 0), 0);

  const activeCount = collectionList.filter((r) => r.status === 1).length;
  const cancelledCount = collectionList.filter((r) => r.status === 2).length;

  // Prepare sheet rows
  const sheetData = [
    [schoolName.toUpperCase()],
    [`${branchName} - Fee Daily Collection Register`],
    [
      `Period: ${dayjs(startDate).format('DD MMM YYYY')} to ${dayjs(endDate).format(
        'DD MMM YYYY'
      )} | Payment Mode: ${modeFilter} | Generated On: ${dayjs().format('DD-MMM-YYYY hh:mm A')}`,
    ],
    [
      `Total Active Receipts: ${activeCount} | Cancelled: ${cancelledCount} | Total Amount Collected: Rs. ${totalCollected.toLocaleString()}`,
    ],
    [], // Blank line
    [
      'S.No',
      'Receipt No',
      'Date & Time',
      'Admission No',
      'Student Name',
      'Class & Section',
      'Payment Mode',
      'Collected By',
      'Status',
      'Amount Paid (INR)',
    ],
    ...collectionList.map((r, index) => [
      index + 1,
      r.receiptNo || '—',
      formatDateTime(r.receiptDate, 'YYYY-MM-DD hh:mm A'),
      r.admissionNo || '—',
      r.studentName || '—',
      r.classSection || '—',
      r.paymentModes || '—',
      r.collectedBy || 'Cashier',
      r.status === 1 ? 'PAID' : 'CANCELLED',
      Number(r.totalPaid) || 0,
    ]),
    [],
    ['', '', '', '', '', '', '', 'Total Active Collection:', '', totalCollected],
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Set explicit column widths
  ws['!cols'] = [
    { wch: 6 },  // S.No
    { wch: 24 }, // Receipt No
    { wch: 20 }, // Date
    { wch: 18 }, // Adm No
    { wch: 28 }, // Student Name
    { wch: 18 }, // Class
    { wch: 18 }, // Modes
    { wch: 22 }, // Collected By
    { wch: 14 }, // Status
    { wch: 20 }, // Amount
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Daily Collection');
  XLSX.writeFile(wb, `Fee_Collection_${startDate}_to_${endDate}.xlsx`);
};

/**
 * Export Fee Daily Collection to PDF (.pdf)
 */
export const exportCollectionToPdf = ({
  collectionList = [],
  startDate,
  endDate,
  modeFilter = 'All',
  schoolName = 'Delhi Public School',
  branchName = 'Main Campus',
}) => {
  if (!collectionList || collectionList.length === 0) return;

  const totalCollected = collectionList
    .filter((r) => r.status === 1)
    .reduce((sum, r) => sum + Number(r.totalPaid || 0), 0);

  const activeCount = collectionList.filter((r) => r.status === 1).length;
  const cancelledCount = collectionList.filter((r) => r.status === 2).length;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  // A4 Landscape = 297mm width x 210mm height
  const pageWidth = doc.internal.pageSize.width;

  // Header Title
  doc.setFontSize(15);
  doc.setTextColor(25, 118, 210); // #1976d2
  doc.text(schoolName.toUpperCase(), 12, 14);

  doc.setFontSize(10.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`${branchName}  •  DAILY FEE COLLECTION REGISTER`, 12, 20.5);

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Report Period: ${dayjs(startDate).format('DD MMM YYYY')} to ${dayjs(endDate).format(
      'DD MMM YYYY'
    )}   |   Payment Mode: ${modeFilter}   |   Generated: ${dayjs().format('DD-MMM-YYYY, hh:mm A')}`,
    12,
    26
  );

  // Summary box line (Note: using 'Rs.' instead of '₹' to prevent jsPDF font substitution glyph errors)
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.setFont(undefined, 'bold');
  doc.text(
    `Total Active Receipts: ${activeCount}   |   Cancelled: ${cancelledCount}   |   Total Net Collection: Rs. ${totalCollected.toLocaleString()}`,
    12,
    31.5
  );
  doc.setFont(undefined, 'normal');

  // Table Data with Collected By
  const tableData = collectionList.map((r, idx) => [
    idx + 1,
    r.receiptNo || '—',
    formatDateTime(r.receiptDate, 'DD/MM/YY hh:mm A'),
    r.admissionNo || '—',
    r.studentName || '—',
    r.classSection || '—',
    r.paymentModes || '—',
    r.collectedBy || 'Cashier',
    r.status === 1 ? 'PAID' : 'CANCELLED',
    `Rs. ${Number(r.totalPaid).toLocaleString()}`,
  ]);

  autoTable(doc, {
    startY: 35,
    margin: { left: 10, right: 10, bottom: 12 },
    tableWidth: 277, // Fits comfortably in 297mm width with 10mm left and 10mm right margin
    head: [
      [
        '#',
        'Receipt No',
        'Date & Time',
        'Adm No',
        'Student Name',
        'Class & Sec',
        'Mode',
        'Collected By',
        'Status',
        'Amount Paid',
      ],
    ],
    body: tableData,
    foot: [
      [
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        'Total Active Collection:',
        '',
        `Rs. ${totalCollected.toLocaleString()}`,
      ],
    ],
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      cellPadding: 1.8,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [25, 118, 210],
      textColor: 255,
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'left',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 38 }, // Receipt No - wide enough so MAIN/RCP/202627/000001 fits on single line
      2: { cellWidth: 28 }, // Date & Time
      3: { cellWidth: 26 }, // Adm No - wide enough so MAIN/202627/0003 fits on single line
      4: { cellWidth: 38 }, // Student Name
      5: { cellWidth: 22 }, // Class
      6: { cellWidth: 24 }, // Payment Mode
      7: { cellWidth: 30 }, // Collected By (Staff who took fee)
      8: { cellWidth: 22, halign: 'center' }, // Status
      9: { cellWidth: 41, halign: 'right', fontStyle: 'bold' }, // Amount Paid (Rs.)
    },
    didDrawPage: () => {
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Page ${doc.internal.getCurrentPageInfo().pageNumber} of ${pageCount}  •  School ERP Financial Module`,
        pageWidth - 75,
        doc.internal.pageSize.height - 6
      );
    },
  });

  doc.save(`Fee_Collection_${startDate}_to_${endDate}.pdf`);
};

/**
 * Export Fee Defaulters to Excel (.xlsx)
 */
export const exportDefaultersToExcel = ({
  defaultersList = [],
  selectedClassName = 'All Classes',
  selectedSectionName = 'All Sections',
  schoolName = 'Delhi Public School',
  branchName = 'Main Campus',
}) => {
  if (!defaultersList || defaultersList.length === 0) return;

  const totalFeeOverdue = defaultersList.reduce((sum, d) => sum + Number(d.overdueAmount || 0), 0);
  const totalFineOverdue = defaultersList.reduce((sum, d) => sum + Number(d.overdueFine || 0), 0);
  const totalGrandOutstanding = defaultersList.reduce((sum, d) => sum + Number(d.totalOverdue || 0), 0);

  const sheetData = [
    [schoolName.toUpperCase()],
    [`${branchName} - Fee Defaulters Register`],
    [
      `Class Filter: ${selectedClassName} | Section: ${selectedSectionName} | Generated: ${dayjs().format(
        'DD-MMM-YYYY hh:mm A'
      )}`,
    ],
    [
      `Total Defaulter Students: ${defaultersList.length} | Overdue Fee: Rs. ${totalFeeOverdue.toLocaleString()} | Late Fine: Rs. ${totalFineOverdue.toLocaleString()} | Grand Outstanding: Rs. ${totalGrandOutstanding.toLocaleString()}`,
    ],
    [], // Blank line
    [
      'S.No',
      'Admission No',
      'Student Name',
      'Class & Section',
      'Guardian Name',
      'Guardian Mobile',
      'Overdue Installments',
      'Fee Overdue (INR)',
      'Late Fine (INR)',
      'Total Outstanding (INR)',
    ],
    ...defaultersList.map((d, index) => [
      index + 1,
      d.admissionNo || '—',
      d.studentName || '—',
      d.className ? `${d.className} ${d.sectionName || ''}`.trim() : '—',
      d.guardianName || '—',
      d.guardianMobile || '—',
      d.overdueInstallments || '—',
      Number(d.overdueAmount) || 0,
      Number(d.overdueFine) || 0,
      Number(d.totalOverdue) || 0,
    ]),
    [],
    [
      '',
      '',
      '',
      '',
      '',
      '',
      'Total Outstanding:',
      totalFeeOverdue,
      totalFineOverdue,
      totalGrandOutstanding,
    ],
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  ws['!cols'] = [
    { wch: 6 },  // S.No
    { wch: 18 }, // Adm No
    { wch: 28 }, // Student Name
    { wch: 18 }, // Class
    { wch: 24 }, // Guardian
    { wch: 16 }, // Mobile
    { wch: 30 }, // Installments
    { wch: 18 }, // Fee
    { wch: 16 }, // Fine
    { wch: 22 }, // Total
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Fee Defaulters');
  XLSX.writeFile(wb, `Fee_Defaulters_${dayjs().format('YYYY-MM-DD')}.xlsx`);
};

/**
 * Export Fee Defaulters to PDF (.pdf)
 */
export const exportDefaultersToPdf = ({
  defaultersList = [],
  selectedClassName = 'All Classes',
  selectedSectionName = 'All Sections',
  schoolName = 'Delhi Public School',
  branchName = 'Main Campus',
}) => {
  if (!defaultersList || defaultersList.length === 0) return;

  const totalFeeOverdue = defaultersList.reduce((sum, d) => sum + Number(d.overdueAmount || 0), 0);
  const totalFineOverdue = defaultersList.reduce((sum, d) => sum + Number(d.overdueFine || 0), 0);
  const totalGrandOutstanding = defaultersList.reduce((sum, d) => sum + Number(d.totalOverdue || 0), 0);

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.width;

  // Header
  doc.setFontSize(15);
  doc.setTextColor(198, 40, 40); // Deep Red
  doc.text(schoolName.toUpperCase(), 12, 14);

  doc.setFontSize(10.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`${branchName}  •  FEE DEFAULTERS & OUTSTANDING DUES REGISTER`, 12, 20.5);

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Filter: ${selectedClassName} (${selectedSectionName})   |   Date: ${dayjs().format(
      'DD-MMM-YYYY, hh:mm A'
    )}`,
    12,
    26
  );

  // Summary box
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.setFont(undefined, 'bold');
  doc.text(
    `Total Defaulters: ${defaultersList.length}   |   Overdue Fee: Rs. ${totalFeeOverdue.toLocaleString()}   |   Late Fine: Rs. ${totalFineOverdue.toLocaleString()}   |   Grand Outstanding: Rs. ${totalGrandOutstanding.toLocaleString()}`,
    12,
    31.5
  );
  doc.setFont(undefined, 'normal');

  const tableData = defaultersList.map((d, idx) => [
    idx + 1,
    d.admissionNo || '—',
    d.studentName || '—',
    d.className ? `${d.className} ${d.sectionName || ''}`.trim() : '—',
    d.guardianName || '—',
    d.guardianMobile || '—',
    d.overdueInstallments || '—',
    `Rs. ${Number(d.overdueAmount || 0).toLocaleString()}`,
    `Rs. ${Number(d.overdueFine || 0).toLocaleString()}`,
    `Rs. ${Number(d.totalOverdue || 0).toLocaleString()}`,
  ]);

  autoTable(doc, {
    startY: 35,
    margin: { left: 10, right: 10, bottom: 12 },
    tableWidth: 277,
    head: [
      [
        '#',
        'Adm No',
        'Student Name',
        'Class & Sec',
        'Guardian',
        'Mobile',
        'Overdue Installments',
        'Fee Overdue',
        'Late Fine',
        'Total Due',
      ],
    ],
    body: tableData,
    foot: [
      [
        '',
        '',
        '',
        '',
        '',
        '',
        'Total Outstanding Dues:',
        `Rs. ${totalFeeOverdue.toLocaleString()}`,
        `Rs. ${totalFineOverdue.toLocaleString()}`,
        `Rs. ${totalGrandOutstanding.toLocaleString()}`,
      ],
    ],
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      cellPadding: 1.8,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [198, 40, 40],
      textColor: 255,
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
    },
    footStyles: {
      fillColor: [254, 242, 242],
      textColor: [153, 27, 27],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'left',
    },
    alternateRowStyles: {
      fillColor: [255, 248, 248],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 26 },
      2: { cellWidth: 40 },
      3: { cellWidth: 24 },
      4: { cellWidth: 32 },
      5: { cellWidth: 24 },
      6: { cellWidth: 42 },
      7: { cellWidth: 26, halign: 'right' },
      8: { cellWidth: 24, halign: 'right' },
      9: { cellWidth: 31, halign: 'right', fontStyle: 'bold' },
    },
    didDrawPage: () => {
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Page ${doc.internal.getCurrentPageInfo().pageNumber} of ${pageCount}  •  School ERP Fee Defaulters Audit`,
        pageWidth - 75,
        doc.internal.pageSize.height - 6
      );
    },
  });

  doc.save(`Fee_Defaulters_${dayjs().format('YYYY-MM-DD')}.pdf`);
};

/**
 * Export Dual Fee Receipt to PDF (A4 Portrait side-by-side matching school sample)
 */
export const exportDualFeeReceiptPdf = (receiptData) => {
  if (!receiptData) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const schoolName = receiptData.schoolName || 'Kush Public School';
  const address = (receiptData.address || 'Plot No 999, Main road Surya Vihar, Part 3 Sec 91').replace(/\n/g, ', ');
  const contact = receiptData.contact || receiptData.guardianMobile || '9911360909';
  const receiptNo = receiptData.receiptNo || 'KU7304';
  const dateStr = receiptData.receiptDate ? dayjs(receiptData.receiptDate).format('DD-MM-YYYY') : dayjs().format('DD-MM-YYYY');
  const studentName = (receiptData.studentName || '').toUpperCase();
  const admNo = receiptData.admissionNo || '';
  const className = receiptData.className || (receiptData.classSection ? receiptData.classSection.split('-')[0].trim() : '');
  const mode = receiptData.paymentModeName || 'Cash';
  const fatherName = (receiptData.fatherName || receiptData.guardianName || '').toUpperCase();
  const items = Array.isArray(receiptData.items) && receiptData.items.length > 0 ? receiptData.items : [];
  const month = formatReceiptMonths(receiptData.month, items);

  const totalPaid = Number(receiptData.totalPaid || 0);
  const totalConcession = Number(receiptData.totalConcession || 0);
  const totalFine = Number(receiptData.totalFine || 0) || items.reduce((sum, item) => sum + Number(item.finePaid || 0), 0);
  const totalDiscount = Number(receiptData.totalDiscount || 0);
  const discountRemarks = receiptData.discountRemarks || '';

  // Month-scoped dues: only for the month(s) on this receipt (not the entire year)
  const itemsDuesSum = items.reduce((sum, item) => sum + Number(item.balanceCarried || 0), 0);
  const remainingDues = items.length > 0 ? itemsDuesSum : Number(receiptData.remainingTotalDues || 0);

  const totalActualAmount = items.length > 0
    ? items.reduce(
        (sum, item) =>
          sum +
          Number(
            item.originalAmount !== undefined && item.originalAmount !== null && Number(item.originalAmount) > 0
              ? item.originalAmount
              : Number(item.amountPaid || 0) + Number(item.balanceCarried || 0) + Number(item.concessionAmount || 0)
          ),
        0
      )
    : Number(receiptData.totalDue || 0) || (totalPaid + remainingDues + totalConcession);

  const totalPayableAmount = Math.max(0, totalActualAmount + totalFine - totalConcession - totalDiscount);

  const amountInWords = numberToIndianWords(totalPaid);

  const drawPdfEmblem = (cx, cy, r = 6) => {
    // Outer Forest Green Circle
    doc.setDrawColor(22, 101, 52);
    doc.setFillColor(240, 253, 244);
    doc.setLineWidth(0.4);
    doc.circle(cx, cy, r, 'FD');

    // Inner Gold Dotted Ring
    doc.setDrawColor(180, 83, 9);
    doc.setLineWidth(0.2);
    doc.setLineDashPattern([0.5, 0.5], 0);
    doc.circle(cx, cy, r - 0.7, 'D');
    doc.setLineDashPattern([], 0); // reset

    // Center Green Shield
    doc.setFillColor(22, 101, 52);
    doc.circle(cx, cy - 0.4, 2.8, 'F');

    // Gold star in center
    doc.setTextColor(254, 240, 138);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.text('★', cx, cy + 0.3, { align: 'center' });

    // Laurel branches left & right
    doc.setDrawColor(22, 101, 52);
    doc.setLineWidth(0.3);
    doc.line(cx - 4.5, cy + 1, cx - 3.5, cy - 2);
    doc.line(cx + 4.5, cy + 1, cx + 3.5, cy - 2);

    // Bottom gold ribbon banner
    doc.setFillColor(180, 83, 9);
    doc.rect(cx - 4.2, cy + 2.5, 8.4, 1.8, 'FD');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(3.2);
    doc.text('EDUCATION', cx, cy + 3.8, { align: 'center' });
  };

  const drawSingleSlip = (startX, copyTitle = '') => {
    const slipW = 92;
    let y = 10;

    // School Emblem or Custom Logo
    let logoDrawn = false;
    if (receiptData.logoUrl) {
      try {
        doc.addImage(receiptData.logoUrl, 'PNG', startX + 1, y, 12, 12);
        logoDrawn = true;
      } catch (err) {
        logoDrawn = false;
      }
    }
    if (!logoDrawn) {
      drawPdfEmblem(startX + 7, y + 6, 6);
    }

    // School Header Text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(schoolName, startX + slipW / 2 + 3, y + 3, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(30, 41, 59);
    doc.text(`Address : ${address}`, startX + slipW / 2 + 3, y + 7, { align: 'center', maxWidth: slipW - 14 });
    doc.setFont('helvetica', 'bold');
    doc.text(`Contact : ${contact}`, startX + slipW / 2 + 3, y + 11, { align: 'center' });

    y += 15;

    // Shaded bar "Fee receipt :"
    doc.setFillColor(229, 231, 235);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.rect(startX, y, slipW, 5.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 0);
    doc.text('Fee receipt :', startX + 2, y + 4);
    if (copyTitle) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.text(`(${copyTitle})`, startX + slipW - 2, y + 3.8, { align: 'right' });
    }

    y += 5.5;

    // Metadata 4 rows x 2 cols
    const metaH = 4.8;
    const splitX = startX + 52;

    const metaRows = [
      [`Rec.No.:  ${receiptNo}`, `Date: ${dateStr}`],
      [`Name:  ${studentName}`, `Adm No: ${admNo}`],
      [`Class:  ${className}`, `Mode: ${mode}`],
      [`S/D. of:  ${fatherName}`, `Month: ${month}`],
    ];

    metaRows.forEach((row) => {
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.2);
      doc.rect(startX, y, slipW, metaH);
      doc.line(splitX, y, splitX, y + metaH);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(0, 0, 0);

      // Left cell text truncated to single line
      const leftText = doc.splitTextToSize(row[0], 50)[0] || '';
      doc.text(leftText, startX + 1.5, y + 3.4);

      // Right cell text strictly truncated to single line to prevent overlap into table
      const rightText = doc.splitTextToSize(row[1], 38)[0] || '';
      doc.text(rightText, splitX + 1.5, y + 3.4);

      y += metaH;
    });

    // Fee Head Table - 2 columns: FEE HEAD and AMOUNT (grouped by fee head for multiple months)
    const itemMap = new Map();
    items.forEach((item) => {
      const name = (item.feeHeadName || 'FEE').toUpperCase().trim();
      const itemActual = Number(
        item.originalAmount !== undefined && item.originalAmount !== null && Number(item.originalAmount) > 0
          ? item.originalAmount
          : Number(item.amountPaid || 0) + Number(item.balanceCarried || 0) + Number(item.concessionAmount || 0)
      );

      if (!itemMap.has(name)) {
        itemMap.set(name, {
          name,
          totalAmount: itemActual,
          count: 1,
          rates: [itemActual],
        });
      } else {
        const existing = itemMap.get(name);
        existing.totalAmount += itemActual;
        existing.count += 1;
        existing.rates.push(itemActual);
      }
    });

    const tableBody = Array.from(itemMap.values()).map((g) => {
      const allSameRate = g.rates.every((r) => Math.abs(r - g.rates[0]) < 0.01);
      let displayName = g.name;
      if (g.count > 1) {
        if (allSameRate) {
          displayName = `${g.name} (${g.count} MONTHS × RS. ${g.rates[0].toFixed(0)})`;
        } else {
          displayName = `${g.name} (${g.count} MONTHS)`;
        }
      }
      return [displayName, g.totalAmount.toFixed(2)];
    });

    if (tableBody.length === 0) {
      tableBody.push(['FEE INSTALLMENT', totalActualAmount.toFixed(2)]);
    }

    // Totals rows matching requested financial breakdown:
    // Total Amount, Fine, Concession, Discount, Total Payable Amount, Total Paid Amt, Remaining Due
    tableBody.push([
      { content: 'Total Amount', styles: { fontStyle: 'bold' } },
      { content: `Rs. ${totalActualAmount.toFixed(2)}`, styles: { halign: 'right', fontStyle: 'bold' } },
    ]);
    tableBody.push([
      { content: 'Fine', styles: { fontStyle: 'bold' } },
      { content: totalFine > 0 ? `+ Rs. ${totalFine.toFixed(2)}` : 'Rs. 0.00', styles: { halign: 'right', fontStyle: 'bold', textColor: totalFine > 0 ? [185, 28, 28] : [0, 0, 0] } },
    ]);
    tableBody.push([
      { content: 'Concession', styles: { fontStyle: 'bold' } },
      { content: totalConcession > 0 ? `- Rs. ${totalConcession.toFixed(2)}` : 'Rs. 0.00', styles: { halign: 'right', fontStyle: 'bold', textColor: totalConcession > 0 ? [126, 34, 206] : [0, 0, 0] } },
    ]);
    tableBody.push([
      { content: discountRemarks ? `Discount (${discountRemarks})` : 'Discount', styles: { fontStyle: 'bold' } },
      { content: totalDiscount > 0 ? `- Rs. ${totalDiscount.toFixed(2)}` : 'Rs. 0.00', styles: { halign: 'right', fontStyle: 'bold', textColor: totalDiscount > 0 ? [21, 128, 61] : [0, 0, 0] } },
    ]);
    tableBody.push([
      { content: 'Total Payable Amount', styles: { fontStyle: 'bold', fillColor: [243, 244, 246] } },
      { content: `Rs. ${totalPayableAmount.toFixed(2)}`, styles: { halign: 'right', fontStyle: 'bold', fillColor: [243, 244, 246] } },
    ]);
    tableBody.push([
      { content: 'Total Paid Amt', styles: { fontStyle: 'bold', fillColor: [240, 253, 244] } },
      { content: `Rs. ${totalPaid.toFixed(2)}`, styles: { halign: 'right', fontStyle: 'bold', textColor: [21, 128, 61], fillColor: [240, 253, 244] } },
    ]);
    tableBody.push([
      { content: 'Remaining Due', styles: { fontStyle: 'bold' } },
      { content: remainingDues > 0 ? `Rs. ${remainingDues.toFixed(2)}` : 'Cleared', styles: { halign: 'right', fontStyle: 'bold', textColor: remainingDues > 0 ? [185, 28, 28] : [21, 128, 61] } },
    ]);

    autoTable(doc, {
      startY: y,
      margin: { left: startX },
      tableWidth: slipW,
      head: [['FEE HEAD', 'AMOUNT (Rs.)']],
      body: tableBody,
      theme: 'plain',
      styles: {
        fontSize: 6.8,
        cellPadding: 1,
        lineColor: [0, 0, 0],
        lineWidth: 0.15,
        textColor: [0, 0, 0],
      },
      headStyles: {
        fontStyle: 'bold',
        fillColor: [255, 255, 255],
        lineColor: [0, 0, 0],
        lineWidth: 0.15,
        fontSize: 7,
      },
      columnStyles: {
        0: { cellWidth: 64, fontStyle: 'bold' },
        1: { cellWidth: 28, halign: 'right' },
      },
    });

    y = doc.lastAutoTable.finalY + 3;

    // Amount in words
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.text(amountInWords, startX, y, { maxWidth: slipW });
    y += 5;

    // Remarks
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`Remarks: ${receiptData.remarks || ''}`, startX, y, { maxWidth: slipW });
    y += 6;

    // Signatures
    doc.setFontSize(7.5);
    doc.text(`Fee Collected: ${receiptData.collectedBy || '................'}`, startX, y);
    doc.text('Authorised sign', startX + slipW, y, { align: 'right' });
    y += 5;

    // Notes
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text('Note:', startX, y);
    y += 3;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.text('1. Cheque is subject to the realization. Rs.500/- Extra will be charged in case of cheque dishonour.', startX + 1, y, { maxWidth: slipW - 2 });
    y += 3.5;
    doc.text('2. Fee receipt and Fee card both should be kept in safe place for future.', startX + 1, y, { maxWidth: slipW - 2 });
    y += 3.5;
    doc.text('3. Please check the entry made by fee clerk in fee Card and fee Receipt', startX + 1, y, { maxWidth: slipW - 2 });
  };

  // Draw Left Slip (Office Copy)
  drawSingleSlip(10, '');

  // Draw Center Cut Line (dashed vertical line)
  doc.setDrawColor(156, 163, 175);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(105, 10, 105, 180);
  doc.setLineDashPattern([], 0); // reset
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text('✂', 103.8, 14);

  // Draw Right Slip (Student Copy)
  drawSingleSlip(108, '');

  const cleanStudent = (studentName || 'Student').replace(/[^a-zA-Z0-9]/g, '_').replace(/__+/g, '_');
  const cleanReceiptNo = (receiptNo || 'RCP').replace(/[^a-zA-Z0-9]/g, '_').replace(/__+/g, '_');
  const cleanAdm = admNo ? `_${admNo.replace(/[^a-zA-Z0-9]/g, '_')}` : '';

  doc.save(`Fee_Receipt_${cleanStudent}${cleanAdm}_${cleanReceiptNo}.pdf`);
};

/**
 * Export Class & Month-wise Fee Status Report to Excel (.xlsx)
 */
export const exportClassMonthStatusToExcel = ({
  studentsList = [],
  summary = {},
  className = 'All Classes',
  sectionName = 'All Sections',
  installmentName = 'All Months',
  schoolName = 'Delhi Public School',
  branchName = 'Main Campus',
}) => {
  if (!studentsList || studentsList.length === 0) return;

  const sheetData = [
    [schoolName.toUpperCase()],
    [`${branchName} - Class & Month-wise Fee Status Report`],
    [
      `Class: ${className} | Section: ${sectionName} | Month/Installment: ${installmentName} | Generated: ${dayjs().format(
        'DD-MMM-YYYY hh:mm A'
      )}`,
    ],
    [
      `Total Students: ${summary.totalStudents || studentsList.length} | Paid: ${summary.paidCount || 0} | Partial: ${
        summary.partialCount || 0
      } | Unpaid: ${summary.unpaidCount || 0} | Remaining Dues: Rs. ${(summary.totalRemainingDues || 0).toLocaleString()}`,
    ],
    [], // Blank line
    [
      'S.No',
      'Admission No',
      'Roll No',
      'Student Name',
      'Class & Section',
      'Guardian Name',
      'Mobile No',
      'Gross Fee (INR)',
      'Concession (INR)',
      'Net Payable (INR)',
      'Amount Paid (INR)',
      'Remaining Due (INR)',
      'Late Fine (INR)',
      'Status',
      'Last Payment Date',
      'Last Receipt No',
    ],
    ...studentsList.map((s, index) => [
      index + 1,
      s.admissionNo || '—',
      s.rollNo || '—',
      s.studentName || '—',
      `${s.className || ''} - ${s.sectionName || ''}`.trim() || '—',
      s.guardianName || '—',
      s.guardianMobile || '—',
      Number(s.grossFee || 0),
      Number(s.concessionAmount || 0),
      Number(s.netPayable || 0),
      Number(s.paidAmount || 0),
      Number(s.remainingDue || 0),
      Number(s.fineAmount || 0),
      s.status || 'Unpaid',
      s.lastPaymentDate ? dayjs(s.lastPaymentDate).format('YYYY-MM-DD') : '—',
      s.lastReceiptNo || '—',
    ]),
    [],
    [
      '',
      '',
      '',
      '',
      '',
      '',
      'TOTAL:',
      summary.totalGrossFee || 0,
      summary.totalConcession || 0,
      summary.totalNetPayable || 0,
      summary.totalPaid || 0,
      summary.totalRemainingDues || 0,
      summary.totalFine || 0,
      '',
      '',
      '',
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  ws['!cols'] = [
    { wch: 6 },  // S.No
    { wch: 15 }, // Admission No
    { wch: 10 }, // Roll No
    { wch: 22 }, // Student Name
    { wch: 14 }, // Class & Section
    { wch: 20 }, // Guardian Name
    { wch: 14 }, // Mobile No
    { wch: 15 }, // Gross Fee
    { wch: 15 }, // Concession
    { wch: 15 }, // Net Payable
    { wch: 16 }, // Paid Amount
    { wch: 18 }, // Remaining Due
    { wch: 14 }, // Late Fine
    { wch: 12 }, // Status
    { wch: 16 }, // Last Payment Date
    { wch: 18 }, // Last Receipt No
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Fee Status');

  const filename = `FeeStatus_${className.replace(/\s+/g, '_')}_${installmentName.replace(/\s+/g, '_')}_${dayjs().format(
    'YYYYMMDD'
  )}.xlsx`;
  XLSX.writeFile(wb, filename);
};

