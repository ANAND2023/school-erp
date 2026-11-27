import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import dayjs from 'dayjs';

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return dayjs(dateStr).format('DD MMM YYYY');
  } catch {
    return dateStr;
  }
};

const formatCurrency = (val) => {
  const num = Number(val) || 0;
  return 'Rs. ' + num.toLocaleString('en-IN');
};

const defaultSchool = {
  name: 'DELHI PUBLIC SCHOOL',
  branch: 'Main Campus',
  affiliation: 'CBSE/2026/0912',
  address: '123 Knowledge Park, Sector 4, New Delhi - 110001',
  phone: '011-23456789',
  alternatePhone: null,
  email: 'accounts@dps.edu.in',
  logoUrl: null,
};

const getSchoolContactStr = (school) => {
  if (!school) return '';
  const parts = [school.phone, school.alternatePhone].filter(Boolean);
  const uniqueParts = Array.from(new Set(parts.flatMap((p) => String(p).split(',').map((s) => s.trim())).filter(Boolean)));
  return uniqueParts.length > 0 ? `  |  Phone: ${uniqueParts.join(', ')}` : '';
};

// ==========================================
// 1. DAY BOOK & CASH REGISTER
// ==========================================
export const exportDayBookToExcel = ({
  entries = [],
  totals = {},
  startDate,
  endDate,
  academicYearName,
  school = defaultSchool,
}) => {
  if (!entries.length) return;

  const sheetData = [
    [school.name.toUpperCase()],
    [`${school.branch} - Daily Cash Book & Day Book Ledger`],
    [`Period: ${formatDate(startDate)} to ${formatDate(endDate)} | Session: ${academicYearName || 'Current'}`],
    [
      `Total Inflows: ${formatCurrency(totals.totalInflow)} | Total Outflows: ${formatCurrency(
        totals.totalOutflow
      )} | Net Balance: ${formatCurrency(totals.netBalance)} | Generated: ${dayjs().format('DD-MMM-YYYY hh:mm A')}`,
    ],
    [],
    ['S.No', 'Date', 'Ref / Receipt #', 'Category', 'Particulars & Account Head', 'Party / Student', 'Inflow / Credit (Rs.)', 'Outflow / Debit (Rs.)', 'Running Bal (Rs.)', 'Payment Mode', 'Processed By', 'Details'],
    ...entries.map((e, idx) => [
      idx + 1,
      formatDate(e.date),
      e.refNo || '—',
      e.category || '—',
      e.particulars || '—',
      e.partyName || '—',
      Number(e.inflowAmount) || 0,
      Number(e.outflowAmount) || 0,
      Number(e.runningBalance) || 0,
      e.paymentMode || 'Cash',
      e.processedBy || '—',
      e.details || '—',
    ]),
    [],
    ['', '', '', '', 'TOTAL PERIOD TRANSACTIONS:', '', totals.totalInflow || 0, totals.totalOutflow || 0, totals.netBalance || 0],
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws['!cols'] = [
    { wch: 6 }, { wch: 14 }, { wch: 22 }, { wch: 18 }, { wch: 30 }, { wch: 22 },
    { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 20 }, { wch: 28 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Day Book');
  XLSX.writeFile(wb, `DayBook_${startDate}_to_${endDate}.xlsx`);
};

export const exportDayBookToPdf = ({
  entries = [],
  totals = {},
  startDate,
  endDate,
  academicYearName,
  school = defaultSchool,
}) => {
  if (!entries.length) return;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.width;

  let startX = 12;
  if (school.logoUrl) {
    try {
      doc.addImage(school.logoUrl, 'PNG', 12, 8, 14, 14);
      startX = 29;
    } catch (e) {
      startX = 12;
    }
  }

  const contactStr = getSchoolContactStr(school);

  doc.setFontSize(14);
  doc.setTextColor(25, 118, 210);
  doc.text((school.name || 'DELHI PUBLIC SCHOOL').toUpperCase(), startX, 14);

  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  doc.text(`${school.branch || 'Main Campus'}${contactStr} • DAILY CASH BOOK & DAY BOOK LEDGER`, startX, 20);

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Period: ${formatDate(startDate)} to ${formatDate(endDate)} | Session: ${academicYearName || 'Current'} | Generated: ${dayjs().format('DD-MMM-YYYY, hh:mm A')}`,
    startX,
    25.5
  );

  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.setFont(undefined, 'bold');
  doc.text(
    `Total Transactions: ${entries.length} | Inflows: ${formatCurrency(totals.totalInflow)} | Outflows: ${formatCurrency(totals.totalOutflow)} | Net: ${formatCurrency(totals.netBalance)}`,
    12,
    30.5
  );
  doc.setFont(undefined, 'normal');

  const tableData = entries.map((e, idx) => [
    idx + 1,
    formatDate(e.date),
    e.refNo || '—',
    e.category || '—',
    `${e.particulars}${e.details ? ' (' + e.details + ')' : ''}`,
    e.inflowAmount > 0 ? formatCurrency(e.inflowAmount) : '—',
    e.outflowAmount > 0 ? formatCurrency(e.outflowAmount) : '—',
    formatCurrency(e.runningBalance),
    e.paymentMode || 'Cash',
    e.processedBy || '—',
  ]);

  autoTable(doc, {
    startY: 34,
    margin: { left: 10, right: 10, bottom: 12 },
    tableWidth: 277,
    head: [['#', 'Date', 'Ref / Receipt #', 'Category', 'Particulars & Account Head', 'Inflow (Rs.)', 'Outflow (Rs.)', 'Balance', 'Mode', 'Processed By']],
    body: tableData,
    foot: [['', '', '', 'TOTALS:', '', formatCurrency(totals.totalInflow), formatCurrency(totals.totalOutflow), formatCurrency(totals.netBalance), '', '']],
    theme: 'grid',
    styles: { fontSize: 7.5, textColor: [30, 41, 59], cellPadding: 1.8 },
    headStyles: { fillColor: [25, 118, 210], textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 22 },
      2: { cellWidth: 28 },
      3: { cellWidth: 26 },
      4: { cellWidth: 65 },
      5: { cellWidth: 28, halign: 'right' },
      6: { cellWidth: 28, halign: 'right' },
      7: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
      8: { cellWidth: 18 },
      9: { cellWidth: 24 },
    },
    didDrawPage: () => {
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Page ${doc.internal.getCurrentPageInfo().pageNumber} of ${pageCount} • School ERP Accounts Hub`,
        pageWidth - 75,
        doc.internal.pageSize.height - 6
      );
    },
  });

  doc.save(`DayBook_${startDate}_to_${endDate}.pdf`);
};

// ==========================================
// 2. FEE COLLECTION REPORT
// ==========================================
export const exportFeeCollectionToExcel = ({
  collections = [],
  startDate,
  endDate,
  academicYearName,
  school = defaultSchool,
}) => {
  if (!collections.length) return;

  const totalCollected = collections.reduce((sum, c) => sum + Number(c.totalPaid ?? c.amountPaid ?? c.amount ?? 0), 0);

  const sheetData = [
    [school.name.toUpperCase()],
    [`${school.branch} - Daily Fee Collection Register`],
    [`Period: ${formatDate(startDate)} to ${formatDate(endDate)} | Session: ${academicYearName || 'Current'}`],
    [`Total Receipts: ${collections.length} | Total Collection: ${formatCurrency(totalCollected)} | Generated: ${dayjs().format('DD-MMM-YYYY hh:mm A')}`],
    [],
    ['S.No', 'Receipt No', 'Receipt Date', 'Admission No', 'Student Name', 'Class / Section', 'Paid Amount (Rs.)', 'Payment Mode', 'Cashier / Collector'],
    ...collections.map((c, idx) => [
      idx + 1,
      c.receiptNo || '—',
      formatDate(c.receiptDate),
      c.admissionNo || '—',
      c.studentName || '—',
      c.classSection || `${c.className || ''} ${c.sectionName || ''}`.trim() || '—',
      Number(c.totalPaid ?? c.amountPaid ?? c.amount ?? 0),
      (c.paymentModes && String(c.paymentModes).trim()) || (c.paymentMode && String(c.paymentMode).trim()) || 'Cash',
      (c.collectedBy && String(c.collectedBy).trim()) || (c.cashierName && String(c.cashierName).trim()) || 'Super Admin',
    ]),
    [],
    ['', '', '', '', '', 'TOTAL PERIOD COLLECTION:', totalCollected, '', ''],
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws['!cols'] = [
    { wch: 6 }, { wch: 24 }, { wch: 14 }, { wch: 18 }, { wch: 28 }, { wch: 18 },
    { wch: 20 }, { wch: 18 }, { wch: 24 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Fee Collections');
  XLSX.writeFile(wb, `Fee_Collections_${startDate}_to_${endDate}.xlsx`);
};

export const exportFeeCollectionToPdf = ({
  collections = [],
  startDate,
  endDate,
  academicYearName,
  school = defaultSchool,
}) => {
  if (!collections.length) return;

  const totalCollected = collections.reduce((sum, c) => sum + Number(c.totalPaid ?? c.amountPaid ?? c.amount ?? 0), 0);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.width;

  let startX = 12;
  if (school.logoUrl) {
    try {
      doc.addImage(school.logoUrl, 'PNG', 12, 8, 14, 14);
      startX = 29;
    } catch (e) {
      startX = 12;
    }
  }

  const contactStr = getSchoolContactStr(school);

  doc.setFontSize(14);
  doc.setTextColor(25, 118, 210);
  doc.text((school.name || 'DELHI PUBLIC SCHOOL').toUpperCase(), startX, 14);

  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  doc.text(`${school.branch || 'Main Campus'}${contactStr} • FEE COLLECTION REGISTER`, startX, 20);

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Period: ${formatDate(startDate)} to ${formatDate(endDate)} | Session: ${academicYearName || 'Current'} | Generated: ${dayjs().format('DD-MMM-YYYY, hh:mm A')}`,
    startX,
    25.5
  );

  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.setFont(undefined, 'bold');
  doc.text(
    `Total Receipts: ${collections.length}   |   Grand Total Collection: ${formatCurrency(totalCollected)}`,
    12,
    30.5
  );
  doc.setFont(undefined, 'normal');

  const tableData = collections.map((c, idx) => [
    idx + 1,
    c.receiptNo || '—',
    formatDate(c.receiptDate),
    c.admissionNo || '—',
    c.studentName || '—',
    c.classSection || `${c.className || ''} ${c.sectionName || ''}`.trim() || '—',
    formatCurrency(c.totalPaid ?? c.amountPaid ?? c.amount ?? 0),
    (c.paymentModes && String(c.paymentModes).trim()) || (c.paymentMode && String(c.paymentMode).trim()) || 'Cash',
    (c.collectedBy && String(c.collectedBy).trim()) || (c.cashierName && String(c.cashierName).trim()) || 'Super Admin',
  ]);

  autoTable(doc, {
    startY: 34,
    margin: { left: 10, right: 10, bottom: 12 },
    tableWidth: 277,
    head: [['#', 'Receipt No', 'Date', 'Adm No', 'Student Name', 'Class / Section', 'Paid Amount', 'Mode', 'Cashier']],
    body: tableData,
    foot: [['', '', '', '', '', 'TOTAL PERIOD COLLECTION:', formatCurrency(totalCollected), '', '']],
    theme: 'grid',
    styles: { fontSize: 8, textColor: [30, 41, 59], cellPadding: 2 },
    headStyles: { fillColor: [25, 118, 210], textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 35 },
      2: { cellWidth: 25 },
      3: { cellWidth: 28 },
      4: { cellWidth: 50 },
      5: { cellWidth: 30 },
      6: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
      7: { cellWidth: 30 },
      8: { cellWidth: 36 },
    },
    didDrawPage: () => {
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Page ${doc.internal.getCurrentPageInfo().pageNumber} of ${pageCount} • School ERP Fee Module`,
        pageWidth - 75,
        doc.internal.pageSize.height - 6
      );
    },
  });

  doc.save(`Fee_Collections_${startDate}_to_${endDate}.pdf`);
};

// ==========================================
// 3. EXPENSES REPORT
// ==========================================
export const exportExpensesToExcel = ({
  expenses = [],
  startDate,
  endDate,
  academicYearName,
  school = defaultSchool,
}) => {
  if (!expenses.length) return;

  const totalExp = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const sheetData = [
    [school.name.toUpperCase()],
    [`${school.branch} - School Operational Expenses Register`],
    [`Period: ${formatDate(startDate)} to ${formatDate(endDate)} | Session: ${academicYearName || 'Current'}`],
    [`Total Vouchers: ${expenses.length} | Total Expenses: ${formatCurrency(totalExp)} | Generated: ${dayjs().format('DD-MMM-YYYY hh:mm A')}`],
    [],
    ['S.No', 'Voucher #', 'Expense Date', 'Title & Particulars', 'Expense Category', 'Spender / Beneficiary', 'Amount (Rs.)', 'Payment Mode', 'Notes'],
    ...expenses.map((e, idx) => [
      idx + 1,
      `EXP/${e.id}`,
      formatDate(e.expenseDate),
      e.title || '—',
      e.categoryName || '—',
      e.spenderName || '—',
      Number(e.amount) || 0,
      e.paymentMode || 'Cash',
      e.description || '—',
    ]),
    [],
    ['', '', '', '', '', 'TOTAL OPERATING EXPENSES:', totalExp, '', ''],
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws['!cols'] = [
    { wch: 6 }, { wch: 16 }, { wch: 14 }, { wch: 30 }, { wch: 22 }, { wch: 24 },
    { wch: 18 }, { wch: 16 }, { wch: 32 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
  XLSX.writeFile(wb, `Expenses_${startDate}_to_${endDate}.xlsx`);
};

export const exportExpensesToPdf = ({
  expenses = [],
  startDate,
  endDate,
  academicYearName,
  school = defaultSchool,
}) => {
  if (!expenses.length) return;

  const totalExp = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.width;

  let startX = 12;
  if (school.logoUrl) {
    try {
      doc.addImage(school.logoUrl, 'PNG', 12, 8, 14, 14);
      startX = 29;
    } catch (e) {
      startX = 12;
    }
  }

  const contactStr = getSchoolContactStr(school);

  doc.setFontSize(14);
  doc.setTextColor(211, 47, 47);
  doc.text((school.name || 'DELHI PUBLIC SCHOOL').toUpperCase(), startX, 14);

  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  doc.text(`${school.branch || 'Main Campus'}${contactStr} • SCHOOL OPERATING EXPENSES REGISTER`, startX, 20);

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Period: ${formatDate(startDate)} to ${formatDate(endDate)} | Session: ${academicYearName || 'Current'} | Generated: ${dayjs().format('DD-MMM-YYYY, hh:mm A')}`,
    startX,
    25.5
  );

  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.setFont(undefined, 'bold');
  doc.text(`Total Expense Vouchers: ${expenses.length}   |   Grand Total Outflow: ${formatCurrency(totalExp)}`, 12, 30.5);
  doc.setFont(undefined, 'normal');

  const tableData = expenses.map((e, idx) => [
    idx + 1,
    `EXP/${e.id}`,
    formatDate(e.expenseDate),
    e.title || '—',
    e.categoryName || '—',
    e.spenderName || '—',
    formatCurrency(e.amount),
    e.paymentMode || 'Cash',
    e.description || '—',
  ]);

  autoTable(doc, {
    startY: 34,
    margin: { left: 10, right: 10, bottom: 12 },
    tableWidth: 277,
    head: [['#', 'Voucher #', 'Date', 'Title', 'Category', 'Spender / Vendor', 'Amount (Rs.)', 'Mode', 'Notes']],
    body: tableData,
    foot: [['', '', '', '', '', 'TOTAL EXPENSES:', formatCurrency(totalExp), '', '']],
    theme: 'grid',
    styles: { fontSize: 8, textColor: [30, 41, 59], cellPadding: 2 },
    headStyles: { fillColor: [211, 47, 47], textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 24 },
      2: { cellWidth: 24 },
      3: { cellWidth: 50 },
      4: { cellWidth: 32 },
      5: { cellWidth: 35 },
      6: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
      7: { cellWidth: 22 },
      8: { cellWidth: 52 },
    },
    didDrawPage: () => {
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Page ${doc.internal.getCurrentPageInfo().pageNumber} of ${pageCount} • School ERP Accounts Hub`,
        pageWidth - 75,
        doc.internal.pageSize.height - 6
      );
    },
  });

  doc.save(`Expenses_${startDate}_to_${endDate}.pdf`);
};

// ==========================================
// 4. SALARY DISBURSEMENTS
// ==========================================
export const exportSalaryToExcel = ({
  payrolls = [],
  startDate,
  endDate,
  academicYearName,
  school = defaultSchool,
}) => {
  if (!payrolls.length) return;

  const totalSal = payrolls.reduce((sum, p) => sum + Number(p.netSalary || 0), 0);

  const sheetData = [
    [school.name.toUpperCase()],
    [`${school.branch} - Staff Salary Disbursements Register`],
    [`Period: ${formatDate(startDate)} to ${formatDate(endDate)} | Session: ${academicYearName || 'Current'}`],
    [`Total Slips: ${payrolls.length} | Net Salary Disbursed: ${formatCurrency(totalSal)} | Generated: ${dayjs().format('DD-MMM-YYYY hh:mm A')}`],
    [],
    ['S.No', 'Salary Slip #', 'Staff Name', 'Employee Code', 'Designation', 'Salary Month', 'Net Paid (Rs.)', 'Payment Date', 'Payment Mode', 'Txn Ref'],
    ...payrolls.map((p, idx) => [
      idx + 1,
      p.salarySlipNo || `SLIP-${p.id}`,
      p.employeeName || '—',
      p.employeeCode || '—',
      p.designation || '—',
      `${p.monthName || ''} ${p.payrollYear || ''}`.trim() || '—',
      Number(p.netSalary) || 0,
      formatDate(p.paymentDate),
      p.paymentMode || 'Bank Transfer',
      p.transactionReference || '—',
    ]),
    [],
    ['', '', '', '', '', 'TOTAL SALARY DISBURSED:', totalSal, '', '', ''],
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws['!cols'] = [
    { wch: 6 }, { wch: 18 }, { wch: 26 }, { wch: 16 }, { wch: 22 }, { wch: 18 },
    { wch: 18 }, { wch: 16 }, { wch: 18 }, { wch: 24 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Salaries');
  XLSX.writeFile(wb, `Salary_Disbursements_${startDate}_to_${endDate}.xlsx`);
};

export const exportSalaryToPdf = ({
  payrolls = [],
  startDate,
  endDate,
  academicYearName,
  school = defaultSchool,
}) => {
  if (!payrolls.length) return;

  const totalSal = payrolls.reduce((sum, p) => sum + Number(p.netSalary || 0), 0);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.width;

  let startX = 12;
  if (school.logoUrl) {
    try {
      doc.addImage(school.logoUrl, 'PNG', 12, 8, 14, 14);
      startX = 29;
    } catch (e) {
      startX = 12;
    }
  }

  const contactStr = getSchoolContactStr(school);

  doc.setFontSize(14);
  doc.setTextColor(234, 88, 12);
  doc.text((school.name || 'DELHI PUBLIC SCHOOL').toUpperCase(), startX, 14);

  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  doc.text(`${school.branch || 'Main Campus'}${contactStr} • STAFF SALARY DISBURSEMENTS REGISTER`, startX, 20);

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Period: ${formatDate(startDate)} to ${formatDate(endDate)} | Session: ${academicYearName || 'Current'} | Generated: ${dayjs().format('DD-MMM-YYYY, hh:mm A')}`,
    startX,
    25.5
  );

  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.setFont(undefined, 'bold');
  doc.text(`Total Staff Records: ${payrolls.length}   |   Grand Total Outflow: ${formatCurrency(totalSal)}`, 12, 30.5);
  doc.setFont(undefined, 'normal');

  const tableData = payrolls.map((p, idx) => [
    idx + 1,
    p.salarySlipNo || `SLIP-${p.id}`,
    p.employeeName || '—',
    p.employeeCode || '—',
    p.designation || '—',
    `${p.monthName || ''} ${p.payrollYear || ''}`.trim() || '—',
    formatCurrency(p.netSalary),
    formatDate(p.paymentDate),
    p.paymentMode || 'Bank Transfer',
    p.transactionReference || '—',
  ]);

  autoTable(doc, {
    startY: 34,
    margin: { left: 10, right: 10, bottom: 12 },
    tableWidth: 277,
    head: [['#', 'Slip #', 'Staff Name', 'Code', 'Designation', 'Month', 'Net Paid', 'Pay Date', 'Mode', 'Ref #']],
    body: tableData,
    foot: [['', '', '', '', '', 'TOTAL SALARY PAID:', formatCurrency(totalSal), '', '', '']],
    theme: 'grid',
    styles: { fontSize: 8, textColor: [30, 41, 59], cellPadding: 2 },
    headStyles: { fillColor: [234, 88, 12], textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 26 },
      2: { cellWidth: 46 },
      3: { cellWidth: 22 },
      4: { cellWidth: 32 },
      5: { cellWidth: 26 },
      6: { cellWidth: 32, halign: 'right', fontStyle: 'bold' },
      7: { cellWidth: 25 },
      8: { cellWidth: 28 },
      9: { cellWidth: 32 },
    },
    didDrawPage: () => {
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Page ${doc.internal.getCurrentPageInfo().pageNumber} of ${pageCount} • School ERP Accounts Hub`,
        pageWidth - 75,
        doc.internal.pageSize.height - 6
      );
    },
  });

  doc.save(`Salary_Disbursements_${startDate}_to_${endDate}.pdf`);
};

// ==========================================
// 5. PROFIT & LOSS STATEMENT
// ==========================================
export const exportProfitLossToExcel = ({
  summary = {},
  startDate,
  endDate,
  academicYearName,
  school = defaultSchool,
}) => {
  const isSurplus = (summary.netSurplus ?? 0) >= 0;

  const sheetData = [
    [school.name.toUpperCase()],
    [`${school.branch} - Profit & Loss (Operating Surplus/Deficit) Statement`],
    [`Period: ${formatDate(startDate)} to ${formatDate(endDate)} | Session: ${academicYearName || 'Current'}`],
    [`Generated: ${dayjs().format('DD-MMM-YYYY hh:mm A')}`],
    [],
    ['CATEGORY / HEAD', 'DETAILS / PARTICULARS', 'AMOUNT (INR)'],
    ['INCOME & REVENUES', 'Student Tuition & Composite Fee Collections', Number(summary.totalFeeCollected || 0)],
    ['INCOME & REVENUES', 'Late Fines & Penalties Collected', Number(summary.totalLateFines || 0)],
    ['INCOME & REVENUES', 'Fee Concessions & Waivers Granted (Discount)', -Math.abs(Number(summary.totalFeeDiscounts || 0))],
    ['TOTAL OPERATING REVENUE', '', Number(summary.totalFeeCollected || 0)],
    [],
    ['EXPENDITURES & OUTFLOWS', 'School Maintenance, Utilities & Operating Expenses', Number(summary.totalExpenses || 0)],
    ['EXPENDITURES & OUTFLOWS', 'Staff Salaries & Teaching Payroll Disbursements', Number(summary.totalSalariesPaid || 0)],
    ['TOTAL OPERATING OUTFLOWS', '', Number(summary.totalOutflow || 0)],
    [],
    [
      isSurplus ? 'NET OPERATING SURPLUS (PROFIT)' : 'NET OPERATING DEFICIT (LOSS)',
      `Revenue (${formatCurrency(summary.totalFeeCollected)}) - Costs (${formatCurrency(summary.totalOutflow)})`,
      Number(summary.netSurplus || 0),
    ],
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws['!cols'] = [{ wch: 35 }, { wch: 55 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Profit & Loss');
  XLSX.writeFile(wb, `Profit_and_Loss_${startDate}_to_${endDate}.xlsx`);
};

export const exportProfitLossToPdf = ({
  summary = {},
  startDate,
  endDate,
  academicYearName,
  school = defaultSchool,
}) => {
  const isSurplus = (summary.netSurplus ?? 0) >= 0;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.width;

  let startX = 14;
  if (school.logoUrl) {
    try {
      doc.addImage(school.logoUrl, 'PNG', 14, 10, 14, 14);
      startX = 31;
    } catch (e) {
      startX = 14;
    }
  }

  const contactStr = getSchoolContactStr(school);

  doc.setFontSize(15);
  doc.setTextColor(isSurplus ? 22 : 185, isSurplus ? 101 : 28, isSurplus ? 52 : 28);
  doc.text((school.name || 'DELHI PUBLIC SCHOOL').toUpperCase(), startX, 16);

  doc.setFontSize(11);
  doc.setTextColor(51, 65, 85);
  doc.text(`${school.branch || 'Main Campus'}${contactStr} • PROFIT & LOSS STATEMENT`, startX, 23);

  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Accounting Period: ${formatDate(startDate)} to ${formatDate(endDate)}  |  Session: ${academicYearName || 'Current'}`,
    startX,
    29
  );
  doc.text(`Generated On: ${dayjs().format('DD-MMM-YYYY, hh:mm A')}`, startX, 34);

  const tableData = [
    ['REVENUE', 'Student Fee Collections (Net)', formatCurrency(summary.totalFeeCollected)],
    ['REVENUE', 'Late Fines & Penalties Collected', formatCurrency(summary.totalLateFines)],
    ['REVENUE', 'Fee Concessions & Waivers Granted', formatCurrency(summary.totalFeeDiscounts)],
    ['REVENUE', 'TOTAL OPERATING REVENUE (INFLOW)', formatCurrency(summary.totalFeeCollected)],
    ['EXPENSES', 'School Operational Expenses', formatCurrency(summary.totalExpenses)],
    ['EXPENSES', 'Staff Salaries Disbursed', formatCurrency(summary.totalSalariesPaid)],
    ['EXPENSES', 'TOTAL OPERATING COSTS (OUTFLOW)', formatCurrency(summary.totalOutflow)],
    [
      isSurplus ? 'NET RESULT' : 'NET RESULT',
      isSurplus ? 'NET OPERATING SURPLUS (PROFIT)' : 'NET OPERATING DEFICIT (LOSS)',
      formatCurrency(summary.netSurplus),
    ],
  ];

  autoTable(doc, {
    startY: 40,
    margin: { left: 14, right: 14 },
    head: [['Section', 'Particulars & Accounting Breakdown', 'Amount (Rs.)']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3, textColor: [30, 41, 59] },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 35, fontStyle: 'bold' },
      1: { cellWidth: 95 },
      2: { cellWidth: 52, halign: 'right', fontStyle: 'bold' },
    },
    didDrawCell: (data) => {
      if (data.row.index === 3 || data.row.index === 6) {
        data.cell.styles.fillColor = [241, 245, 249];
        data.cell.styles.fontStyle = 'bold';
      } else if (data.row.index === 7) {
        data.cell.styles.fillColor = isSurplus ? [240, 253, 244] : [254, 242, 242];
        data.cell.styles.textColor = isSurplus ? [22, 101, 52] : [153, 27, 27];
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fontSize = 10;
      }
    },
  });

  const finalY = doc.lastAutoTable.finalY + 18;
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Prepared By: Accountant', 14, finalY);
  doc.text('Verified By: Accounts Officer / Auditor', pageWidth / 2 - 25, finalY);
  doc.text('Approved By: Principal / Director', pageWidth - 65, finalY);

  doc.save(`Profit_and_Loss_${startDate}_to_${endDate}.pdf`);
};

// ==========================================
// 6. TOTAL ENQUIRIES REPORT
// ==========================================
export const exportEnquiriesToExcel = ({
  enquiries = [],
  stats = {},
  startDate,
  endDate,
  academicYearName,
  school = defaultSchool,
}) => {
  if (!enquiries.length) return;

  const sheetData = [
    [school.name.toUpperCase()],
    [`${school.branch} - Admissions Enquiry & Conversion Funnel Report`],
    [`Period: ${formatDate(startDate)} to ${formatDate(endDate)} | Session: ${academicYearName || 'Current'}`],
    [
      `Total Enquiries: ${stats.totalEnquiries || enquiries.length} | Converted: ${stats.convertedCount || 0} | Conversion Rate: ${stats.conversionRate || 0}% | Generated: ${dayjs().format('DD-MMM-YYYY hh:mm A')}`,
    ],
    [],
    ['S.No', 'Enquiry #', 'Date', 'Student Name', 'Target Class', 'Guardian Name', 'Mobile Number', 'Lead Source', 'Status', 'Converted?'],
    ...enquiries.map((q, idx) => [
      idx + 1,
      q.enquiryNo || `ENQ-${q.id}`,
      formatDate(q.createdOn),
      q.studentName || '—',
      q.className || '—',
      q.guardianName || '—',
      q.mobile || '—',
      q.source || '—',
      q.status || '—',
      q.isConverted ? 'YES (Enrolled)' : 'Pending',
    ]),
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws['!cols'] = [
    { wch: 6 }, { wch: 18 }, { wch: 14 }, { wch: 28 }, { wch: 18 }, { wch: 24 },
    { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Enquiries');
  XLSX.writeFile(wb, `Enquiries_Report_${startDate}_to_${endDate}.xlsx`);
};

export const exportEnquiriesToPdf = ({
  enquiries = [],
  stats = {},
  startDate,
  endDate,
  academicYearName,
  school = defaultSchool,
}) => {
  if (!enquiries.length) return;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.width;

  let startX = 12;
  if (school.logoUrl) {
    try {
      doc.addImage(school.logoUrl, 'PNG', 12, 8, 14, 14);
      startX = 29;
    } catch (e) {
      startX = 12;
    }
  }

  const contactStr = getSchoolContactStr(school);

  doc.setFontSize(14);
  doc.setTextColor(2, 132, 199);
  doc.text((school.name || 'DELHI PUBLIC SCHOOL').toUpperCase(), startX, 14);

  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  doc.text(`${school.branch || 'Main Campus'}${contactStr} • ADMISSION ENQUIRY & CONVERSION REPORT`, startX, 20);

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Period: ${formatDate(startDate)} to ${formatDate(endDate)} | Session: ${academicYearName || 'Current'} | Generated: ${dayjs().format('DD-MMM-YYYY, hh:mm A')}`,
    startX,
    25.5
  );

  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.setFont(undefined, 'bold');
  doc.text(
    `Total Leads: ${stats.totalEnquiries || enquiries.length}   |   Converted Admissions: ${stats.convertedCount || 0}   |   Conversion Rate: ${stats.conversionRate || 0}%`,
    12,
    30.5
  );
  doc.setFont(undefined, 'normal');

  const tableData = enquiries.map((q, idx) => [
    idx + 1,
    q.enquiryNo || `ENQ-${q.id}`,
    formatDate(q.createdOn),
    q.studentName || '—',
    q.className || '—',
    q.guardianName || '—',
    q.mobile || '—',
    q.source || '—',
    q.isConverted ? 'CONVERTED' : (q.status || 'Open'),
  ]);

  autoTable(doc, {
    startY: 34,
    margin: { left: 10, right: 10, bottom: 12 },
    tableWidth: 277,
    head: [['#', 'Enquiry #', 'Date', 'Student Name', 'Target Class', 'Guardian Name', 'Mobile Number', 'Lead Source', 'Status']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 8, textColor: [30, 41, 59], cellPadding: 2 },
    headStyles: { fillColor: [2, 132, 199], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 28 },
      2: { cellWidth: 25 },
      3: { cellWidth: 48 },
      4: { cellWidth: 28 },
      5: { cellWidth: 44 },
      6: { cellWidth: 32 },
      7: { cellWidth: 32 },
      8: { cellWidth: 32, fontStyle: 'bold' },
    },
    didDrawPage: () => {
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Page ${doc.internal.getCurrentPageInfo().pageNumber} of ${pageCount} • School ERP Accounts Hub`,
        pageWidth - 75,
        doc.internal.pageSize.height - 6
      );
    },
  });

  doc.save(`Enquiries_Report_${startDate}_to_${endDate}.pdf`);
};

// ==========================================
// 7. TOTAL ADMISSIONS REPORT
// ==========================================
export const exportAdmissionsToExcel = ({
  students = [],
  stats = {},
  startDate,
  endDate,
  academicYearName,
  school = defaultSchool,
}) => {
  if (!students.length) return;

  const sheetData = [
    [school.name.toUpperCase()],
    [`${school.branch} - New Student Admissions Register`],
    [`Period: ${formatDate(startDate)} to ${formatDate(endDate)} | Session: ${academicYearName || 'Current'}`],
    [`Total Admissions Enrolled: ${students.length} | Generated: ${dayjs().format('DD-MMM-YYYY hh:mm A')}`],
    [],
    ['S.No', 'Admission No', 'Admission Date', 'Student Full Name', 'Gender', 'Class & Section', 'Father / Guardian', 'Contact Number', 'Status'],
    ...students.map((s, idx) => [
      idx + 1,
      s.admissionNo || '—',
      formatDate(s.admissionDate),
      s.fullName || '—',
      s.gender || '—',
      `${s.className || ''} ${s.sectionName || ''}`.trim() || '—',
      s.guardianName || '—',
      s.guardianMobile || s.mobile || '—',
      s.status || 'Active',
    ]),
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws['!cols'] = [
    { wch: 6 }, { wch: 20 }, { wch: 14 }, { wch: 30 }, { wch: 12 }, { wch: 18 },
    { wch: 26 }, { wch: 18 }, { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Admissions');
  XLSX.writeFile(wb, `Admissions_Report_${startDate}_to_${endDate}.xlsx`);
};

export const exportAdmissionsToPdf = ({
  students = [],
  stats = {},
  startDate,
  endDate,
  academicYearName,
  school = defaultSchool,
}) => {
  if (!students.length) return;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.width;

  let startX = 12;
  if (school.logoUrl) {
    try {
      doc.addImage(school.logoUrl, 'PNG', 12, 8, 14, 14);
      startX = 29;
    } catch (e) {
      startX = 12;
    }
  }

  const contactStr = getSchoolContactStr(school);

  doc.setFontSize(14);
  doc.setTextColor(16, 149, 193);
  doc.text((school.name || 'DELHI PUBLIC SCHOOL').toUpperCase(), startX, 14);

  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  doc.text(`${school.branch || 'Main Campus'}${contactStr} • NEW ADMISSIONS REGISTER & ROLL`, startX, 20);

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Period: ${formatDate(startDate)} to ${formatDate(endDate)} | Session: ${academicYearName || 'Current'} | Generated: ${dayjs().format('DD-MMM-YYYY, hh:mm A')}`,
    startX,
    25.5
  );

  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.setFont(undefined, 'bold');
  doc.text(`Total Enrolled Admissions: ${students.length}`, 12, 30.5);
  doc.setFont(undefined, 'normal');

  const tableData = students.map((s, idx) => [
    idx + 1,
    s.admissionNo || '—',
    formatDate(s.admissionDate),
    s.fullName || '—',
    s.gender || '—',
    `${s.className || ''} ${s.sectionName || ''}`.trim() || '—',
    s.guardianName || '—',
    s.guardianMobile || s.mobile || '—',
    s.status || 'Active',
  ]);

  autoTable(doc, {
    startY: 34,
    margin: { left: 10, right: 10, bottom: 12 },
    tableWidth: 277,
    head: [['#', 'Adm No', 'Adm Date', 'Student Full Name', 'Gender', 'Class & Sec', 'Guardian Name', 'Mobile Number', 'Status']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 8, textColor: [30, 41, 59], cellPadding: 2 },
    headStyles: { fillColor: [16, 149, 193], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 30 },
      2: { cellWidth: 25 },
      3: { cellWidth: 50 },
      4: { cellWidth: 20 },
      5: { cellWidth: 30 },
      6: { cellWidth: 45 },
      7: { cellWidth: 34 },
      8: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
    },
    didDrawPage: () => {
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Page ${doc.internal.getCurrentPageInfo().pageNumber} of ${pageCount} • School ERP Accounts Hub`,
        pageWidth - 75,
        doc.internal.pageSize.height - 6
      );
    },
  });

  doc.save(`Admissions_Report_${startDate}_to_${endDate}.pdf`);
};

// ==========================================
// 8. PENDING DUES / DEFAULTERS
// ==========================================
export const exportDefaultersToExcel = ({
  defaulters = [],
  startDate,
  endDate,
  academicYearName,
  school = defaultSchool,
}) => {
  if (!defaulters.length) return;

  const totalDue = defaulters.reduce((sum, d) => sum + Number(d.totalDue || 0), 0);
  const totalPaid = defaulters.reduce((sum, d) => sum + Number(d.totalPaid || 0), 0);
  const remainingDue = defaulters.reduce((sum, d) => sum + Number(d.remainingDue || 0), 0);

  const sheetData = [
    [school.name.toUpperCase()],
    [`${school.branch} - Outstanding Fee Dues & Defaulters List`],
    [`Academic Session: ${academicYearName || 'Current Session'}`],
    [
      `Total Defaulter Students: ${defaulters.length} | Total Outstanding Balance: ${formatCurrency(
        remainingDue
      )} | Generated: ${dayjs().format('DD-MMM-YYYY hh:mm A')}`,
    ],
    [],
    ['S.No', 'Admission No', 'Student Full Name', 'Enrolled Class', 'Roll No', 'Pending Fee Months', 'Total Assigned (Rs.)', 'Paid Amount (Rs.)', 'Remaining Dues (Rs.)', 'Guardian / Father', 'Contact Number'],
    ...defaulters.map((d, idx) => [
      idx + 1,
      d.admissionNo || '—',
      d.studentName || '—',
      d.classSection || `${d.className || ''} ${d.sectionName || ''}`.trim() || '—',
      d.rollNo || '—',
      d.pendingMonths || 'All Months',
      Number(d.totalDue) || 0,
      Number(d.totalPaid) || 0,
      Number(d.remainingDue) || 0,
      d.guardianName || '—',
      d.guardianMobile || d.contactNumber || '—',
    ]),
    [],
    ['', '', '', '', '', 'TOTAL OUTSTANDING DUES:', totalDue, totalPaid, remainingDue, '', ''],
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws['!cols'] = [
    { wch: 6 }, { wch: 20 }, { wch: 28 }, { wch: 20 }, { wch: 10 }, { wch: 32 },
    { wch: 20 }, { wch: 18 }, { wch: 22 }, { wch: 24 }, { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Defaulters');
  XLSX.writeFile(wb, `Fee_Defaulters_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const exportDefaultersToPdf = ({
  defaulters = [],
  startDate,
  endDate,
  academicYearName,
  school = defaultSchool,
}) => {
  if (!defaulters.length) return;

  const totalDue = defaulters.reduce((sum, d) => sum + Number(d.totalDue || 0), 0);
  const totalPaid = defaulters.reduce((sum, d) => sum + Number(d.totalPaid || 0), 0);
  const remainingDue = defaulters.reduce((sum, d) => sum + Number(d.remainingDue || 0), 0);

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.width;

  let startX = 12;
  if (school.logoUrl) {
    try {
      doc.addImage(school.logoUrl, 'PNG', 12, 8, 14, 14);
      startX = 29;
    } catch (e) {
      startX = 12;
    }
  }

  const contactStr = getSchoolContactStr(school);

  doc.setFontSize(14);
  doc.setTextColor(220, 38, 38);
  doc.text((school.name || 'DELHI PUBLIC SCHOOL').toUpperCase(), startX, 14);

  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  doc.text(`${school.branch || 'Main Campus'}${contactStr} • OUTSTANDING FEE DUES & DEFAULTERS LIST`, startX, 20);

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Session: ${academicYearName || 'Current Session'} | Generated On: ${dayjs().format('DD-MMM-YYYY, hh:mm A')}`,
    startX,
    25.5
  );

  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.setFont(undefined, 'bold');
  doc.text(
    `Defaulter Count: ${defaulters.length} Students   |   Total Dues: ${formatCurrency(totalDue)}   |   Remaining Outstanding: ${formatCurrency(remainingDue)}`,
    12,
    30.5
  );
  doc.setFont(undefined, 'normal');

  const tableData = defaulters.map((d, idx) => [
    idx + 1,
    d.admissionNo || '—',
    d.studentName || '—',
    d.classSection || `${d.className || ''} ${d.sectionName || ''}`.trim() || '—',
    d.pendingMonths || 'All Months',
    formatCurrency(d.totalDue),
    formatCurrency(d.totalPaid),
    formatCurrency(d.remainingDue),
    d.guardianName ? `${d.guardianName} (${d.guardianMobile || d.contactNumber || '—'})` : (d.guardianMobile || d.contactNumber || '—'),
  ]);

  autoTable(doc, {
    startY: 34,
    margin: { left: 10, right: 10, bottom: 12 },
    tableWidth: 277,
    head: [['#', 'Adm No', 'Student Name', 'Enrolled Class', 'Pending Months', 'Total Due', 'Paid So Far', 'Pending Balance', 'Guardian & Contact']],
    body: tableData,
    foot: [['', '', '', '', 'TOTAL OUTSTANDING:', formatCurrency(totalDue), formatCurrency(totalPaid), formatCurrency(remainingDue), '']],
    theme: 'grid',
    styles: { fontSize: 7.8, textColor: [30, 41, 59], cellPadding: 2 },
    headStyles: { fillColor: [220, 38, 38], textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 26 },
      2: { cellWidth: 40 },
      3: { cellWidth: 28 },
      4: { cellWidth: 44 },
      5: { cellWidth: 26, halign: 'right' },
      6: { cellWidth: 26, halign: 'right' },
      7: { cellWidth: 32, halign: 'right', fontStyle: 'bold', textColor: [220, 38, 38] },
      8: { cellWidth: 47 },
    },
    didDrawPage: () => {
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Page ${doc.internal.getCurrentPageInfo().pageNumber} of ${pageCount} • School ERP Accounts Hub`,
        pageWidth - 75,
        doc.internal.pageSize.height - 6
      );
    },
  });

  doc.save(`Fee_Defaulters_${new Date().toISOString().split('T')[0]}.pdf`);
};
