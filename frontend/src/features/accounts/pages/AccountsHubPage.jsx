import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Chip,
  InputAdornment,
  IconButton,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Divider,
  Stack,
  Button,
} from '@mui/material';
import {
  AccountBalanceWallet as WalletIcon,
  ReceiptLong as ReceiptIcon,
  TrendingUp as SurplusIcon,
  TrendingDown as DeficitIcon,
  People as EnquiryIcon,
  School as AdmissionIcon,
  MonetizationOn as FeeIcon,
  Print as PrintIcon,
  Download as ExportIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  DateRange as DateRangeIcon,
  ArrowUpward as InflowIcon,
  ArrowDownward as OutflowIcon,
  Assessment as ReportIcon,
  Payment as SalaryIcon,
  MoneyOff as ExpenseIcon,
  Warning as DueIcon,
  CheckCircle as PaidIcon,
  Close as CloseIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
} from '@mui/icons-material';
import { accountsApi } from '../api/accountsApi';
import { useAcademicYear } from '../../../hooks/useAcademicYear';
import { useThemeStore } from '../../../store/themeStore';
import { useUiStore } from '../../../store/uiStore';
import { useAuthStore } from '../../../store/authStore';
import { AppButton } from '../../../components/common/AppButton';
import { printWithTitle } from '../../../utils/printUtils';
import {
  exportDayBookToExcel,
  exportDayBookToPdf,
  exportFeeCollectionToExcel,
  exportFeeCollectionToPdf,
  exportExpensesToExcel,
  exportExpensesToPdf,
  exportSalaryToExcel,
  exportSalaryToPdf,
  exportProfitLossToExcel,
  exportProfitLossToPdf,
  exportEnquiriesToExcel,
  exportEnquiriesToPdf,
  exportAdmissionsToExcel,
  exportAdmissionsToPdf,
  exportDefaultersToExcel,
  exportDefaultersToPdf,
} from '../utils/accountsExportUtils';

// Date helper functions
const formatDate = (date) => {
  if (!date) return '—';
  const d = new Date(date);
  return isNaN(d) ? '—' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatCurrency = (val) => {
  const num = Number(val || 0);
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

export const AccountsHubPage = () => {
  const { showSnackbar } = useUiStore();
  const { activeAcademicYearId, activeAcademicYearName, academicYears } = useAcademicYear();
  const { currentColorHex } = useThemeStore();
  const themeColor = currentColorHex || '#2563eb';

  // Date Filter State
  const [datePreset, setDatePreset] = useState('month'); // today, yesterday, week, month, session, custom
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Tab State: 0 = Day Book, 1 = Fee Collections, 2 = Expenses, 3 = Salaries, 4 = P&L, 5 = Enquiries, 6 = Admissions, 7 = Defaulters
  const [activeTab, setActiveTab] = useState(0);

  // Loading States
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [tabLoading, setTabLoading] = useState(false);

  // Data States
  const [summary, setSummary] = useState(null);
  const [dayBookEntries, setDayBookEntries] = useState([]);
  const [dayBookTotals, setDayBookTotals] = useState({ totalInflow: 0, totalOutflow: 0, netBalance: 0 });
  const [collections, setCollections] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [enquiryData, setEnquiryData] = useState({ items: [], totalEnquiries: 0, convertedCount: 0, conversionRate: 0 });
  const [admissionData, setAdmissionData] = useState({ students: [], totalAdmissions: 0 });
  const [defaulters, setDefaulters] = useState([]);

  // Search & Filter within Tab
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState('All');
  const [filterType, setFilterType] = useState('All');

  // Print Modal State
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const printComponentRef = useRef(null);

  const { user } = useAuthStore();
  const schoolInfo = useMemo(
    () => ({
      name: user?.schoolName || 'DELHI PUBLIC SCHOOL',
      branch: user?.branchName || 'Main Campus',
      affiliation: user?.affiliationNo || 'CBSE/2026/0912',
      address: user?.address || '123 Knowledge Park, Sector 4, New Delhi - 110001',
      phone: user?.phone || '011-23456789',
      email: user?.email || 'accounts@dps.edu.in',
    }),
    [user]
  );

  const reportNames = [
    'Daily Cash Book & Day Book Ledger',
    'Daily Fee Collection Register',
    'School Operating Expenses Register',
    'Staff Salary Disbursements Register',
    'Profit & Loss (Operating Surplus / Deficit)',
    'Admissions Enquiry & Funnel Report',
    'New Student Admissions Register',
    'Outstanding Fee Dues & Defaulters List',
  ];

  const reportFilePrefixes = [
    'DayBook',
    'Fee_Collections',
    'Expenses',
    'Salary_Disbursements',
    'Profit_and_Loss',
    'Enquiries',
    'Admissions',
    'Fee_Defaulters',
  ];

  // Excel (.xlsx) Download Handler for Active Tab
  const handleDownloadActiveExcel = () => {
    try {
      switch (activeTab) {
        case 0:
          exportDayBookToExcel({
            entries: filteredDayBook,
            totals: dayBookTotals,
            startDate,
            endDate,
            academicYearName: activeAcademicYearName,
            school: schoolInfo,
          });
          break;
        case 1:
          exportFeeCollectionToExcel({
            collections: filteredCollections,
            startDate,
            endDate,
            academicYearName: activeAcademicYearName,
            school: schoolInfo,
          });
          break;
        case 2:
          exportExpensesToExcel({
            expenses,
            startDate,
            endDate,
            academicYearName: activeAcademicYearName,
            school: schoolInfo,
          });
          break;
        case 3:
          exportSalaryToExcel({
            payrolls,
            startDate,
            endDate,
            academicYearName: activeAcademicYearName,
            school: schoolInfo,
          });
          break;
        case 4:
          exportProfitLossToExcel({
            summary,
            startDate,
            endDate,
            academicYearName: activeAcademicYearName,
            school: schoolInfo,
          });
          break;
        case 5:
          exportEnquiriesToExcel({
            enquiries: enquiryData.items || [],
            stats: enquiryData,
            startDate,
            endDate,
            academicYearName: activeAcademicYearName,
            school: schoolInfo,
          });
          break;
        case 6:
          exportAdmissionsToExcel({
            students: admissionData.students || [],
            stats: admissionData,
            startDate,
            endDate,
            academicYearName: activeAcademicYearName,
            school: schoolInfo,
          });
          break;
        case 7:
          exportDefaultersToExcel({
            defaulters: filteredDefaulters,
            startDate,
            endDate,
            academicYearName: activeAcademicYearName,
            school: schoolInfo,
          });
          break;
        default:
          break;
      }
      showSnackbar?.(`${reportNames[activeTab]} Excel exported successfully!`, 'success');
    } catch (err) {
      console.error('Error downloading Excel:', err);
      showSnackbar?.('Failed to download Excel file', 'error');
    }
  };

  // PDF (.pdf) Download Handler for Active Tab
  const handleDownloadActivePdf = () => {
    try {
      switch (activeTab) {
        case 0:
          exportDayBookToPdf({
            entries: filteredDayBook,
            totals: dayBookTotals,
            startDate,
            endDate,
            academicYearName: activeAcademicYearName,
            school: schoolInfo,
          });
          break;
        case 1:
          exportFeeCollectionToPdf({
            collections: filteredCollections,
            startDate,
            endDate,
            academicYearName: activeAcademicYearName,
            school: schoolInfo,
          });
          break;
        case 2:
          exportExpensesToPdf({
            expenses,
            startDate,
            endDate,
            academicYearName: activeAcademicYearName,
            school: schoolInfo,
          });
          break;
        case 3:
          exportSalaryToPdf({
            payrolls,
            startDate,
            endDate,
            academicYearName: activeAcademicYearName,
            school: schoolInfo,
          });
          break;
        case 4:
          exportProfitLossToPdf({
            summary,
            startDate,
            endDate,
            academicYearName: activeAcademicYearName,
            school: schoolInfo,
          });
          break;
        case 5:
          exportEnquiriesToPdf({
            enquiries: enquiryData.items || [],
            stats: enquiryData,
            startDate,
            endDate,
            academicYearName: activeAcademicYearName,
            school: schoolInfo,
          });
          break;
        case 6:
          exportAdmissionsToPdf({
            students: admissionData.students || [],
            stats: admissionData,
            startDate,
            endDate,
            academicYearName: activeAcademicYearName,
            school: schoolInfo,
          });
          break;
        case 7:
          exportDefaultersToPdf({
            defaulters: filteredDefaulters,
            startDate,
            endDate,
            academicYearName: activeAcademicYearName,
            school: schoolInfo,
          });
          break;
        default:
          break;
      }
      showSnackbar?.(`${reportNames[activeTab]} PDF document generated!`, 'success');
    } catch (err) {
      console.error('Error downloading PDF:', err);
      showSnackbar?.('Failed to generate PDF document', 'error');
    }
  };

  // Print Handler
  const handlePrint = () => {
    const reportTitle = `${reportFilePrefixes[activeTab] || 'Accounts_Report'}_${startDate}_to_${endDate}`;
    printWithTitle(reportTitle);
  };

  // Handle Preset Changes
  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split('T')[0];
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === 'week') {
      const w = new Date();
      w.setDate(w.getDate() - 7);
      setStartDate(w.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'month') {
      const mStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      setStartDate(mStart);
      setEndDate(todayStr);
    } else if (preset === 'session') {
      const ay = academicYears?.find((y) => y.id === activeAcademicYearId);
      const sessionStart = ay?.startDate ? ay.startDate.split('T')[0] : (activeAcademicYearName?.includes('2027-28') ? '2027-04-01' : '2026-04-01');
      const sessionEnd = ay?.endDate ? ay.endDate.split('T')[0] : (activeAcademicYearName?.includes('2027-28') ? '2028-03-31' : '2027-03-31');
      setStartDate(sessionStart);
      setEndDate(todayStr > sessionEnd ? sessionEnd : todayStr);
    }
  };

  // Synchronize date range when academic year changes if on session preset
  useEffect(() => {
    if (datePreset === 'session') {
      handlePresetChange('session');
    }
  }, [activeAcademicYearId]);

  // Fetch KPI Summary
  const fetchSummary = async () => {
    setSummaryLoading(true);
    try {
      const res = await accountsApi.getSummary({
        startDate,
        endDate,
        academicYearId: activeAcademicYearId,
      });
      if (res.data?.success) {
        setSummary(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching accounts summary:', err);
      showSnackbar?.('Failed to load accounts summary', 'error');
    } finally {
      setSummaryLoading(false);
    }
  };

  // Fetch Day Book
  const fetchDayBook = async () => {
    setTabLoading(true);
    try {
      const res = await accountsApi.getDayBook({
        startDate,
        endDate,
        academicYearId: activeAcademicYearId,
        transactionType: filterType !== 'All' ? filterType : undefined,
        paymentMode: filterMode !== 'All' ? filterMode : undefined,
      });
      if (res.data?.success) {
        setDayBookEntries(res.data.data.entries || []);
        setDayBookTotals({
          totalInflow: res.data.data.totalInflow || 0,
          totalOutflow: res.data.data.totalOutflow || 0,
          netBalance: res.data.data.netBalance || 0,
        });
      }
    } catch (err) {
      console.error('Error fetching day book:', err);
    } finally {
      setTabLoading(false);
    }
  };

  // Fetch Fee Collections
  const fetchCollections = async () => {
    setTabLoading(true);
    try {
      const res = await accountsApi.getDailyCollection({
        startDate,
        endDate,
        academicYearId: activeAcademicYearId || undefined,
      });
      setCollections(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching daily collections:', err);
    } finally {
      setTabLoading(false);
    }
  };

  // Fetch Expenses
  const fetchExpenses = async () => {
    setTabLoading(true);
    try {
      const res = await accountsApi.getExpenses({
        academicYearId: activeAcademicYearId,
      });
      const allExpenses = res.data?.data || [];
      // Filter within selected dates client-side
      const filtered = allExpenses.filter((e) => {
        const d = (e.expenseDate || '').split('T')[0];
        return (!startDate || d >= startDate) && (!endDate || d <= endDate);
      });
      setExpenses(filtered);
    } catch (err) {
      console.error('Error fetching expenses:', err);
    } finally {
      setTabLoading(false);
    }
  };

  // Fetch Staff Salaries
  const fetchPayrolls = async () => {
    setTabLoading(true);
    try {
      const res = await accountsApi.getPayrolls({
        paymentStatus: 'Paid',
        pageSize: 100,
      });
      const items = res.data?.data?.items || [];
      const filtered = items.filter((p) => {
        if (!p.paymentDate) return false;
        const d = p.paymentDate.split('T')[0];
        return (!startDate || d >= startDate) && (!endDate || d <= endDate);
      });
      setPayrolls(filtered);
    } catch (err) {
      console.error('Error fetching payrolls:', err);
    } finally {
      setTabLoading(false);
    }
  };

  // Fetch Enquiries
  const fetchEnquiries = async () => {
    setTabLoading(true);
    try {
      const res = await accountsApi.getEnquiryReport({
        startDate,
        endDate,
      });
      if (res.data?.success) {
        setEnquiryData(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching enquiries:', err);
    } finally {
      setTabLoading(false);
    }
  };

  // Fetch Admissions
  const fetchAdmissions = async () => {
    setTabLoading(true);
    try {
      const res = await accountsApi.getAdmissionReport({
        startDate,
        endDate,
      });
      if (res.data?.success) {
        setAdmissionData(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching admissions:', err);
    } finally {
      setTabLoading(false);
    }
  };

  // Fetch Defaulters
  const fetchDefaulters = async () => {
    setTabLoading(true);
    try {
      const res = await accountsApi.getDefaulters({
        academicYearId: activeAcademicYearId || undefined,
      });
      setDefaulters(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching defaulters:', err);
    } finally {
      setTabLoading(false);
    }
  };

  // Fetch data on date range or tab change
  useEffect(() => {
    fetchSummary();
  }, [startDate, endDate, activeAcademicYearId]);

  useEffect(() => {
    if (activeTab === 0) fetchDayBook();
    else if (activeTab === 1) fetchCollections();
    else if (activeTab === 2) fetchExpenses();
    else if (activeTab === 3) fetchPayrolls();
    else if (activeTab === 5) fetchEnquiries();
    else if (activeTab === 6) fetchAdmissions();
    else if (activeTab === 7) fetchDefaulters();
  }, [activeTab, startDate, endDate, activeAcademicYearId, filterMode, filterType]);

  // Export current tab to CSV
  const handleExportCSV = () => {
    let rows = [];
    let filename = 'account_report.csv';

    if (activeTab === 0) {
      filename = `DayBook_${startDate}_to_${endDate}.csv`;
      rows = dayBookEntries.map((e) => ({
        Date: formatDate(e.date),
        RefNo: e.refNo,
        Category: e.category,
        Particulars: e.particulars,
        PartyName: e.partyName,
        Type: e.type,
        Inflow: e.inflowAmount,
        Outflow: e.outflowAmount,
        RunningBalance: e.runningBalance,
        PaymentMode: e.paymentMode,
        ProcessedBy: e.processedBy,
        Details: e.details,
      }));
    } else if (activeTab === 1) {
      filename = `FeeCollections_${startDate}_to_${endDate}.csv`;
      rows = collections.map((c) => ({
        ReceiptNo: c.receiptNo,
        Date: formatDate(c.receiptDate),
        Student: c.studentName,
        AdmNo: c.admissionNo,
        Class: c.classSection || `${c.className || ''} ${c.sectionName || ''}`.trim() || '—',
        Amount: c.totalPaid ?? c.amountPaid ?? c.amount ?? 0,
        Mode: (c.paymentModes && String(c.paymentModes).trim()) || (c.paymentMode && String(c.paymentMode).trim()) || 'Cash',
        Cashier: (c.collectedBy && String(c.collectedBy).trim()) || (c.cashierName && String(c.cashierName).trim()) || (c.createdByName && String(c.createdByName).trim()) || 'Super Admin',
      }));
    } else if (activeTab === 2) {
      filename = `Expenses_${startDate}_to_${endDate}.csv`;
      rows = expenses.map((e) => ({
        Voucher: `EXP/${e.id}`,
        Date: formatDate(e.expenseDate),
        Title: e.title,
        Category: e.categoryName,
        Spender: e.spenderName,
        Amount: e.amount,
        Notes: e.description,
      }));
    } else if (activeTab === 3) {
      filename = `SalaryDisbursements_${startDate}_to_${endDate}.csv`;
      rows = payrolls.map((p) => ({
        SlipNo: p.salarySlipNo,
        Staff: p.employeeName,
        Code: p.employeeCode,
        Designation: p.designation,
        Month: `${p.monthName} ${p.payrollYear}`,
        NetPaid: p.netSalary,
        PaymentDate: formatDate(p.paymentDate),
        Mode: p.paymentMode,
        Ref: p.transactionReference,
      }));
    } else if (activeTab === 5) {
      filename = `Enquiries_${startDate}_to_${endDate}.csv`;
      rows = (enquiryData.items || []).map((q) => ({
        EnquiryNo: q.enquiryNo,
        Date: formatDate(q.createdOn),
        Student: q.studentName,
        Class: q.className,
        Guardian: q.guardianName,
        Mobile: q.mobile,
        Source: q.source,
        Status: q.status,
        Converted: q.isConverted ? 'Yes' : 'No',
      }));
    } else if (activeTab === 6) {
      filename = `Admissions_${startDate}_to_${endDate}.csv`;
      rows = (admissionData.students || []).map((s) => ({
        AdmNo: s.admissionNo,
        Date: formatDate(s.admissionDate),
        Student: s.fullName,
        Gender: s.gender,
        Class: `${s.className} ${s.sectionName}`,
        Guardian: s.guardianName,
        Mobile: s.guardianMobile,
        Status: s.status,
      }));
    } else if (activeTab === 7) {
      filename = `Pending_Dues_Defaulters_${new Date().toISOString().split('T')[0]}.csv`;
      rows = filteredDefaulters.map((d) => ({
        AdmNo: d.admissionNo,
        Student: d.studentName,
        Class: `${d.className} ${d.sectionName}`.trim(),
        PendingMonths: d.pendingMonths || 'All Months',
        TotalDue: d.totalDue,
        TotalPaid: d.totalPaid,
        RemainingDue: d.remainingDue,
        Guardian: d.guardianName || '—',
        Contact: d.guardianMobile || d.contactNumber || '—',
      }));
    }

    if (!rows.length) {
      showSnackbar?.('No records to export in current view', 'warning');
      return;
    }

    const headers = Object.keys(rows[0]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => headers.map((h) => `"${(r[h] ?? '').toString().replace(/"/g, '""')}"`).join(','))].join(
        '\n'
      );

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSnackbar?.(`Exported ${rows.length} records successfully!`, 'success');
  };

  // Filtered Day Book Entries by local search
  const filteredDayBook = useMemo(() => {
    if (!searchTerm) return dayBookEntries;
    const term = searchTerm.toLowerCase();
    return dayBookEntries.filter(
      (e) =>
        e.refNo.toLowerCase().includes(term) ||
        e.particulars.toLowerCase().includes(term) ||
        e.partyName.toLowerCase().includes(term) ||
        e.category.toLowerCase().includes(term) ||
        e.paymentMode.toLowerCase().includes(term) ||
        (e.details && e.details.toLowerCase().includes(term))
    );
  }, [dayBookEntries, searchTerm]);

  // Filtered Collections
  const filteredCollections = useMemo(() => {
    if (!searchTerm) return collections;
    const term = searchTerm.toLowerCase();
    return collections.filter(
      (c) =>
        (c.receiptNo && c.receiptNo.toLowerCase().includes(term)) ||
        (c.studentName && c.studentName.toLowerCase().includes(term)) ||
        (c.admissionNo && c.admissionNo.toLowerCase().includes(term)) ||
        (c.className && c.className.toLowerCase().includes(term)) ||
        (c.classSection && c.classSection.toLowerCase().includes(term)) ||
        (c.collectedBy && c.collectedBy.toLowerCase().includes(term)) ||
        (c.paymentModes && c.paymentModes.toLowerCase().includes(term))
    );
  }, [collections, searchTerm]);

  // Filtered Defaulters
  const filteredDefaulters = useMemo(() => {
    if (!searchTerm) return defaulters;
    const term = searchTerm.toLowerCase();
    return defaulters.filter(
      (d) =>
        (d.admissionNo && d.admissionNo.toLowerCase().includes(term)) ||
        (d.studentName && d.studentName.toLowerCase().includes(term)) ||
        (d.className && d.className.toLowerCase().includes(term)) ||
        (d.sectionName && d.sectionName.toLowerCase().includes(term)) ||
        (d.guardianMobile && d.guardianMobile.includes(term)) ||
        (d.guardianName && d.guardianName.toLowerCase().includes(term)) ||
        (d.pendingMonths && d.pendingMonths.toLowerCase().includes(term))
    );
  }, [defaulters, searchTerm]);

  return (
    <Box sx={{ pb: 3 }}>
      {/* 1. Header & Date Range Action Bar */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          mb: 2.5,
          p: 2,
          bgcolor: 'background.paper',
          borderRadius: 2,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
            <WalletIcon sx={{ color: themeColor, fontSize: 28 }} />
            Accounts & Finance Reports Hub
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.2 }}>
            Complete day book, cash register, fee collections, operational expenses, staff payrolls, profit & loss, and student conversions.
          </Typography>
        </Box>

        {/* Date Presets & Custom Range */}
        <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
          <Stack direction="row" spacing={0.5} sx={{ bgcolor: 'action.hover', p: 0.5, borderRadius: 1.5 }}>
            {[
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'week', label: '7 Days' },
              { id: 'month', label: 'This Month' },
              { id: 'session', label: 'Session' },
            ].map((p) => (
              <Button
                key={p.id}
                size="small"
                variant={datePreset === p.id ? 'contained' : 'text'}
                onClick={() => handlePresetChange(p.id)}
                sx={{
                  textTransform: 'none',
                  fontSize: '0.78rem',
                  py: 0.4,
                  px: 1.2,
                  minWidth: 'auto',
                  bgcolor: datePreset === p.id ? themeColor : 'transparent',
                  color: datePreset === p.id ? '#fff' : 'text.primary',
                  fontWeight: datePreset === p.id ? 700 : 500,
                  '&:hover': {
                    bgcolor: datePreset === p.id ? themeColor : 'action.selected',
                  },
                }}
              >
                {p.label}
              </Button>
            ))}
          </Stack>

          <TextField
            type="date"
            size="small"
            label="From"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setDatePreset('custom');
            }}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 140 }}
          />

          <TextField
            type="date"
            size="small"
            label="To"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setDatePreset('custom');
            }}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 140 }}
          />

          <Tooltip title="Refresh Data">
            <IconButton
              onClick={() => {
                fetchSummary();
                if (activeTab === 0) fetchDayBook();
                else if (activeTab === 1) fetchCollections();
                else if (activeTab === 2) fetchExpenses();
                else if (activeTab === 3) fetchPayrolls();
                else if (activeTab === 5) fetchEnquiries();
                else if (activeTab === 6) fetchAdmissions();
                else if (activeTab === 7) fetchDefaulters();
              }}
              sx={{ bgcolor: 'action.hover' }}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <AppButton
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={() => setPrintModalOpen(true)}
            sx={{ borderColor: 'divider', fontWeight: 600 }}
          >
            Print / Preview
          </AppButton>

          <Button
            variant="contained"
            startIcon={<ExcelIcon />}
            onClick={handleDownloadActiveExcel}
            sx={{
              bgcolor: '#107c41',
              color: '#ffffff',
              fontWeight: 700,
              textTransform: 'none',
              px: 1.6,
              '&:hover': { bgcolor: '#0b5c30' },
            }}
          >
            Download Excel
          </Button>

          <Button
            variant="contained"
            startIcon={<PdfIcon />}
            onClick={handleDownloadActivePdf}
            sx={{
              bgcolor: '#d32f2f',
              color: '#ffffff',
              fontWeight: 700,
              textTransform: 'none',
              px: 1.6,
              '&:hover': { bgcolor: '#b71c1c' },
            }}
          >
            Download PDF
          </Button>

          <AppButton
            variant="text"
            startIcon={<ExportIcon />}
            onClick={handleExportCSV}
            sx={{ color: 'text.secondary' }}
          >
            CSV
          </AppButton>
        </Stack>
      </Box>

      {/* 2. Top KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        {/* Total Collections */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              p: 2,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(255, 255, 255, 1) 100%)',
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase' }}>
                  Total Fee Collected
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: 'success.dark', mt: 0.5 }}>
                  {summaryLoading ? <CircularProgress size={20} /> : formatCurrency(summary?.totalFeeCollected)}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>
                  Cash: <b>{formatCurrency(summary?.cashCollections)}</b> | Online: <b>{formatCurrency(summary?.bankOnlineCollections)}</b>
                </Typography>
              </Box>
              <Box sx={{ p: 1, bgcolor: 'success.light', color: 'success.dark', borderRadius: 1.5 }}>
                <InflowIcon />
              </Box>
            </Stack>
          </Card>
        </Grid>

        {/* Operating Expenses */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              p: 2,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(255, 255, 255, 1) 100%)',
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase' }}>
                  School Expenses
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: 'error.main', mt: 0.5 }}>
                  {summaryLoading ? <CircularProgress size={20} /> : formatCurrency(summary?.totalExpenses)}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>
                  Maintenance, supplies, bills & activities
                </Typography>
              </Box>
              <Box sx={{ p: 1, bgcolor: 'error.light', color: 'error.dark', borderRadius: 1.5 }}>
                <ExpenseIcon />
              </Box>
            </Stack>
          </Card>
        </Grid>

        {/* Staff Salaries */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              p: 2,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
              background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.08) 0%, rgba(255, 255, 255, 1) 100%)',
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase' }}>
                  Salaries Disbursed
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: 'warning.dark', mt: 0.5 }}>
                  {summaryLoading ? <CircularProgress size={20} /> : formatCurrency(summary?.totalSalariesPaid)}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>
                  Total Outflow: <b>{formatCurrency(summary?.totalOutflow)}</b>
                </Typography>
              </Box>
              <Box sx={{ p: 1, bgcolor: 'warning.light', color: 'warning.dark', borderRadius: 1.5 }}>
                <SalaryIcon />
              </Box>
            </Stack>
          </Card>
        </Grid>

        {/* Net Surplus / Deficit (Profit & Loss) */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              p: 2,
              borderRadius: 2,
              border: '1px solid',
              borderColor: (summary?.netSurplus ?? 0) >= 0 ? 'success.main' : 'error.main',
              boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
              background:
                (summary?.netSurplus ?? 0) >= 0
                  ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(255, 255, 255, 1) 100%)'
                  : 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(255, 255, 255, 1) 100%)',
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase' }}>
                  Net Surplus (P&L)
                </Typography>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 800,
                    color: (summary?.netSurplus ?? 0) >= 0 ? 'success.dark' : 'error.dark',
                    mt: 0.5,
                  }}
                >
                  {summaryLoading ? <CircularProgress size={20} /> : formatCurrency(summary?.netSurplus)}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>
                  {(summary?.netSurplus ?? 0) >= 0 ? 'Net Operating Profit' : 'Operating Deficit'}
                </Typography>
              </Box>
              <Box
                sx={{
                  p: 1,
                  bgcolor: (summary?.netSurplus ?? 0) >= 0 ? 'success.light' : 'error.light',
                  color: (summary?.netSurplus ?? 0) >= 0 ? 'success.dark' : 'error.dark',
                  borderRadius: 1.5,
                }}
              >
                {(summary?.netSurplus ?? 0) >= 0 ? <SurplusIcon /> : <DeficitIcon />}
              </Box>
            </Stack>
          </Card>
        </Grid>
      </Grid>

      {/* Secondary Operations KPI Banner */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        {/* Total Enquiries */}
        <Grid item xs={12} sm={4}>
          <Paper
            sx={{
              p: 1.5,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                Total Enquiries / Leads
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary' }}>
                {summary?.totalEnquiries ?? 0}{' '}
                <Typography component="span" variant="caption" sx={{ color: 'success.main', fontWeight: 700 }}>
                  ({summary?.conversionRate ?? 0}% converted)
                </Typography>
              </Typography>
            </Box>
            <EnquiryIcon sx={{ color: 'info.main', fontSize: 32 }} />
          </Paper>
        </Grid>

        {/* Total Admissions */}
        <Grid item xs={12} sm={4}>
          <Paper
            sx={{
              p: 1.5,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                New Admissions Enrolled
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary' }}>
                {summary?.totalAdmissions ?? 0} Students
              </Typography>
            </Box>
            <AdmissionIcon sx={{ color: 'primary.main', fontSize: 32 }} />
          </Paper>
        </Grid>

        {/* Outstanding Dues */}
        <Grid item xs={12} sm={4}>
          <Paper
            sx={{
              p: 1.5,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                Pending Fee Dues
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: 'error.main' }}>
                {formatCurrency(summary?.totalPendingDues)}
              </Typography>
            </Box>
            <DueIcon sx={{ color: 'error.main', fontSize: 32 }} />
          </Paper>
        </Grid>
      </Grid>

      {/* 3. Comprehensive Reports Tabs */}
      <Card sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Tabs
            value={activeTab}
            onChange={(e, val) => {
              setActiveTab(val);
              setSearchTerm('');
            }}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.88rem',
                minHeight: 48,
              },
              '& .Mui-selected': {
                color: themeColor,
              },
              '& .MuiTabs-indicator': {
                backgroundColor: themeColor,
              },
            }}
          >
            <Tab icon={<ReceiptIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Day Book & Cash Register" />
            <Tab icon={<FeeIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Fee Collection Report" />
            <Tab icon={<ExpenseIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Expenses Report" />
            <Tab icon={<SalaryIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Salary Disbursements" />
            <Tab icon={<ReportIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Profit & Loss Statement" />
            <Tab icon={<EnquiryIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Total Enquiries Report" />
            <Tab icon={<AdmissionIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Total Admission Report" />
            <Tab icon={<DueIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Pending Dues / Defaulters" />
          </Tabs>
        </Box>

        {/* Tab Filter & Search Bar */}
        <Box
          sx={{
            p: 2,
            bgcolor: 'background.paper',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            flexWrap: 'wrap',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <TextField
            size="small"
            placeholder="Search within report (Party, Slip/Receipt #, Particulars, Mode)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
              endAdornment: searchTerm && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchTerm('')}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 280, flex: { xs: '1 1 100%', sm: '0 1 360px' } }}
          />

          {activeTab === 0 && (
            <Stack direction="row" spacing={1.5} alignItems="center">
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <InputLabel>Type</InputLabel>
                <Select value={filterType} label="Type" onChange={(e) => setFilterType(e.target.value)}>
                  <MenuItem value="All">All Types</MenuItem>
                  <MenuItem value="Inflow">Inflow (Credit)</MenuItem>
                  <MenuItem value="Outflow">Outflow (Debit)</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Payment Mode</InputLabel>
                <Select value={filterMode} label="Payment Mode" onChange={(e) => setFilterMode(e.target.value)}>
                  <MenuItem value="All">All Modes</MenuItem>
                  <MenuItem value="Cash">Cash</MenuItem>
                  <MenuItem value="Online">Online / UPI</MenuItem>
                  <MenuItem value="Bank">Bank Transfer</MenuItem>
                  <MenuItem value="Cheque">Cheque</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          )}

          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              Session: <b>{activeAcademicYearName || 'Current'}</b> | Range: <b>{formatDate(startDate)}</b> to <b>{formatDate(endDate)}</b>
            </Typography>

            <Tooltip title="Print / Save as PDF">
              <Button
                size="small"
                variant="outlined"
                startIcon={<PrintIcon sx={{ fontSize: 16 }} />}
                onClick={() => setPrintModalOpen(true)}
                sx={{ textTransform: 'none', fontSize: '0.78rem', py: 0.3, px: 1, borderColor: 'divider' }}
              >
                Print
              </Button>
            </Tooltip>

            <Tooltip title="Download Excel Spreadsheet (.xlsx)">
              <Button
                size="small"
                variant="contained"
                startIcon={<ExcelIcon sx={{ fontSize: 16 }} />}
                onClick={handleDownloadActiveExcel}
                sx={{
                  bgcolor: '#107c41',
                  color: '#ffffff',
                  textTransform: 'none',
                  fontSize: '0.78rem',
                  py: 0.3,
                  px: 1,
                  fontWeight: 600,
                  '&:hover': { bgcolor: '#0b5c30' },
                }}
              >
                Excel
              </Button>
            </Tooltip>

            <Tooltip title="Download PDF Document (.pdf)">
              <Button
                size="small"
                variant="contained"
                startIcon={<PdfIcon sx={{ fontSize: 16 }} />}
                onClick={handleDownloadActivePdf}
                sx={{
                  bgcolor: '#d32f2f',
                  color: '#ffffff',
                  textTransform: 'none',
                  fontSize: '0.78rem',
                  py: 0.3,
                  px: 1,
                  fontWeight: 600,
                  '&:hover': { bgcolor: '#b71c1c' },
                }}
              >
                PDF
              </Button>
            </Tooltip>
          </Stack>
        </Box>

        {/* Tab Body */}
        <Box sx={{ p: 2 }}>
          {tabLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
              <CircularProgress size={36} sx={{ color: themeColor }} />
            </Box>
          ) : (
            <>
              {/* TAB 0: DAY BOOK / CASH REGISTER */}
              {activeTab === 0 && (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                      Showing {filteredDayBook.length} Transactions (Inflows: {formatCurrency(dayBookTotals.totalInflow)} | Outflows:{' '}
                      {formatCurrency(dayBookTotals.totalOutflow)} | Net: {formatCurrency(dayBookTotals.netBalance)})
                    </Typography>
                  </Box>

                  <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5 }}>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Ref / Receipt #</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Particulars & Party</TableCell>
                          <TableCell sx={{ fontWeight: 700 }} align="right">
                            Inflow (₹)
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700 }} align="right">
                            Outflow (₹)
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700 }} align="right">
                            Running Bal (₹)
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Mode</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Processed By</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredDayBook.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                              No transactions recorded for the selected date range.
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredDayBook.map((row) => (
                            <TableRow key={row.id} hover>
                              <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(row.date)}</TableCell>
                              <TableCell>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {row.refNo}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  size="small"
                                  label={row.category}
                                  color={
                                    row.category.includes('Fee')
                                      ? 'success'
                                      : row.category.includes('Salary')
                                      ? 'warning'
                                      : 'default'
                                  }
                                  variant="outlined"
                                  sx={{ fontSize: '0.72rem', height: 22 }}
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {row.particulars}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                  {row.details}
                                </Typography>
                              </TableCell>
                              <TableCell align="right" sx={{ color: 'success.dark', fontWeight: 700 }}>
                                {row.inflowAmount > 0 ? formatCurrency(row.inflowAmount) : '—'}
                              </TableCell>
                              <TableCell align="right" sx={{ color: 'error.main', fontWeight: 700 }}>
                                {row.outflowAmount > 0 ? formatCurrency(row.outflowAmount) : '—'}
                              </TableCell>
                              <TableCell
                                align="right"
                                sx={{
                                  fontWeight: 800,
                                  color: row.runningBalance >= 0 ? 'text.primary' : 'error.dark',
                                }}
                              >
                                {formatCurrency(row.runningBalance)}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  size="small"
                                  label={row.paymentMode}
                                  sx={{ fontSize: '0.72rem', height: 20, bgcolor: 'action.hover' }}
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                  {row.processedBy}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {/* TAB 1: DAILY FEE COLLECTION REPORT */}
              {activeTab === 1 && (
                <Box>
                  <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5 }}>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Receipt #</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Student Name</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Adm No</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Class / Section</TableCell>
                          <TableCell sx={{ fontWeight: 700 }} align="right">
                            Paid Amount (₹)
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Payment Mode</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Cashier</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredCollections.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                              No fee collections found for selected range.
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredCollections.map((col, idx) => (
                            <TableRow key={idx} hover>
                              <TableCell sx={{ fontWeight: 600 }}>{col.receiptNo}</TableCell>
                              <TableCell>{formatDate(col.receiptDate)}</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>{col.studentName}</TableCell>
                              <TableCell>{col.admissionNo}</TableCell>
                              <TableCell>
                                {col.classSection || `${col.className || ''} ${col.sectionName || ''}`.trim() || '—'}
                              </TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700, color: 'success.dark' }}>
                                {formatCurrency(col.totalPaid ?? col.amountPaid ?? col.amount ?? 0)}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  size="small"
                                  label={(col.paymentModes && String(col.paymentModes).trim()) || (col.paymentMode && String(col.paymentMode).trim()) || 'Cash'}
                                  color="primary"
                                  variant="outlined"
                                  sx={{ height: 22, fontWeight: 600, fontSize: '0.72rem' }}
                                />
                              </TableCell>
                              <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>
                                {(col.collectedBy && String(col.collectedBy).trim()) || (col.cashierName && String(col.cashierName).trim()) || (col.createdByName && String(col.createdByName).trim()) || 'Super Admin'}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                        {filteredCollections.length > 0 && (
                          <TableRow sx={{ bgcolor: 'action.hover', fontWeight: 800 }}>
                            <TableCell colSpan={5} sx={{ textAlign: 'right', fontWeight: 800 }}>
                              TOTAL PERIOD COLLECTION ({filteredCollections.length} Receipts):
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800, color: 'success.dark', fontSize: '0.95rem' }}>
                              {formatCurrency(
                                filteredCollections.reduce((sum, c) => sum + Number(c.totalPaid ?? c.amountPaid ?? 0), 0)
                              )}
                            </TableCell>
                            <TableCell colSpan={2}></TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {/* TAB 2: EXPENSES REPORT */}
              {activeTab === 2 && (
                <Box>
                  <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5 }}>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Voucher #</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Title / Item</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Spender / Vendor</TableCell>
                          <TableCell sx={{ fontWeight: 700 }} align="right">
                            Amount (₹)
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {expenses.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                              No expenses recorded for this date range.
                            </TableCell>
                          </TableRow>
                        ) : (
                          expenses.map((exp) => (
                            <TableRow key={exp.id} hover>
                              <TableCell sx={{ fontWeight: 600 }}>EXP/{String(exp.id).padStart(4, '0')}</TableCell>
                              <TableCell>{formatDate(exp.expenseDate)}</TableCell>
                              <TableCell>
                                <Chip size="small" label={exp.categoryName || 'General'} sx={{ height: 22 }} />
                              </TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>{exp.title}</TableCell>
                              <TableCell>{exp.spenderName || '—'}</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700, color: 'error.main' }}>
                                {formatCurrency(exp.amount)}
                              </TableCell>
                              <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                                {exp.description || '—'}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {/* TAB 3: SALARY DISBURSEMENTS */}
              {activeTab === 3 && (
                <Box>
                  <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5 }}>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Salary Slip #</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Staff Name</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Code</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Designation</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Payroll Month</TableCell>
                          <TableCell sx={{ fontWeight: 700 }} align="right">
                            Net Salary Paid (₹)
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Payment Date</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Mode & UTR</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {payrolls.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                              No staff salary disbursements found for this period.
                            </TableCell>
                          </TableRow>
                        ) : (
                          payrolls.map((p) => (
                            <TableRow key={p.id} hover>
                              <TableCell sx={{ fontWeight: 600 }}>{p.salarySlipNo}</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>{p.employeeName}</TableCell>
                              <TableCell>{p.employeeCode}</TableCell>
                              <TableCell>{p.designation}</TableCell>
                              <TableCell>
                                {p.monthName} {p.payrollYear}
                              </TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700, color: 'warning.dark' }}>
                                {formatCurrency(p.netSalary)}
                              </TableCell>
                              <TableCell>{formatDate(p.paymentDate)}</TableCell>
                              <TableCell>
                                <Typography variant="caption" sx={{ display: 'block', fontWeight: 600 }}>
                                  {p.paymentMode || 'Bank Transfer'}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                  {p.transactionReference || '—'}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {/* TAB 4: PROFIT & LOSS STATEMENT */}
              {activeTab === 4 && (
                <Box>
                  <Grid container spacing={3}>
                    {/* Revenue / Inflow Section */}
                    <Grid item xs={12} md={6}>
                      <Card sx={{ borderRadius: 2, border: '1px solid', borderColor: 'success.light' }}>
                        <Box sx={{ p: 2, bgcolor: 'success.light', color: 'success.dark', fontWeight: 700 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                            Income / Revenue (Inflows)
                          </Typography>
                        </Box>
                        <CardContent>
                          <Stack spacing={1.5}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2">Student Fee Collections (Gross):</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                {formatCurrency(summary?.totalFeeCollected)}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2">Late Fines Collected:</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {formatCurrency(summary?.totalLateFines)}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'text.secondary' }}>
                              <Typography variant="caption">Fee Concessions/Discounts Granted:</Typography>
                              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                {formatCurrency(summary?.totalFeeDiscounts)}
                              </Typography>
                            </Box>
                            <Divider />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                Total Net Revenue:
                              </Typography>
                              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'success.dark' }}>
                                {formatCurrency(summary?.totalFeeCollected)}
                              </Typography>
                            </Box>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Operating Costs & Salaries */}
                    <Grid item xs={12} md={6}>
                      <Card sx={{ borderRadius: 2, border: '1px solid', borderColor: 'error.light' }}>
                        <Box sx={{ p: 2, bgcolor: 'error.light', color: 'error.dark', fontWeight: 700 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                            Expenditure / Outflows
                          </Typography>
                        </Box>
                        <CardContent>
                          <Stack spacing={1.5}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2">School Operating Expenses:</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 700, color: 'error.main' }}>
                                {formatCurrency(summary?.totalExpenses)}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2">Staff Salaries Disbursed:</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 700, color: 'warning.dark' }}>
                                {formatCurrency(summary?.totalSalariesPaid)}
                              </Typography>
                            </Box>
                            <Divider />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                Total Operating Costs:
                              </Typography>
                              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'error.dark' }}>
                                {formatCurrency(summary?.totalOutflow)}
                              </Typography>
                            </Box>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Net Statement Bottom Card */}
                    <Grid item xs={12}>
                      <Paper
                        sx={{
                          p: 3,
                          borderRadius: 2,
                          bgcolor: (summary?.netSurplus ?? 0) >= 0 ? 'success.50' : 'error.50',
                          border: '2px solid',
                          borderColor: (summary?.netSurplus ?? 0) >= 0 ? 'success.main' : 'error.main',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: 2,
                        }}
                      >
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 800 }}>
                            Net Operating {(summary?.netSurplus ?? 0) >= 0 ? 'Surplus (Profit)' : 'Deficit (Loss)'}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            Period: {formatDate(startDate)} to {formatDate(endDate)} ({activeAcademicYearName || 'Current Session'})
                          </Typography>
                        </Box>
                        <Typography
                          variant="h4"
                          sx={{
                            fontWeight: 900,
                            color: (summary?.netSurplus ?? 0) >= 0 ? 'success.dark' : 'error.dark',
                          }}
                        >
                          {formatCurrency(summary?.netSurplus)}
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>
              )}

              {/* TAB 5: TOTAL ENQUIRIES REPORT */}
              {activeTab === 5 && (
                <Box>
                  <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                    <Chip label={`Total Enquiries: ${enquiryData.totalEnquiries}`} sx={{ fontWeight: 600 }} />
                    <Chip
                      label={`Converted to Admissions: ${enquiryData.convertedCount}`}
                      color="success"
                      sx={{ fontWeight: 600 }}
                    />
                    <Chip
                      label={`Conversion Rate: ${enquiryData.conversionRate}%`}
                      color="primary"
                      variant="outlined"
                      sx={{ fontWeight: 700 }}
                    />
                  </Box>

                  <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5 }}>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Enquiry #</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Candidate Name</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Class</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Guardian & Mobile</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Lead Source</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Converted?</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(enquiryData.items || []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                              No enquiries logged during this period.
                            </TableCell>
                          </TableRow>
                        ) : (
                          (enquiryData.items || []).map((enq) => (
                            <TableRow key={enq.id} hover>
                              <TableCell sx={{ fontWeight: 600 }}>{enq.enquiryNo || `ENQ-${enq.id}`}</TableCell>
                              <TableCell>{formatDate(enq.createdOn)}</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>{enq.studentName}</TableCell>
                              <TableCell>{enq.className}</TableCell>
                              <TableCell>
                                <Typography variant="body2">{enq.guardianName}</Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                  {enq.mobile}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip size="small" label={enq.source} sx={{ height: 22 }} />
                              </TableCell>
                              <TableCell>
                                <Chip
                                  size="small"
                                  label={enq.status}
                                  color={
                                    enq.status === 'Converted'
                                      ? 'success'
                                      : enq.status === 'Open'
                                      ? 'info'
                                      : 'default'
                                  }
                                  sx={{ height: 22 }}
                                />
                              </TableCell>
                              <TableCell>
                                {enq.isConverted ? (
                                  <Chip size="small" icon={<PaidIcon />} label="Converted" color="success" sx={{ height: 22 }} />
                                ) : (
                                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                    Follow-up
                                  </Typography>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {/* TAB 6: TOTAL ADMISSIONS REPORT */}
              {activeTab === 6 && (
                <Box>
                  <Box sx={{ mb: 2 }}>
                    <Chip
                      label={`Total Admissions: ${admissionData.totalAdmissions} Students Enrolled`}
                      color="primary"
                      sx={{ fontWeight: 700 }}
                    />
                  </Box>

                  <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5 }}>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Adm No</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Admission Date</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Student Full Name</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Gender</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Class & Section</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Roll #</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Guardian Name & Contact</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(admissionData.students || []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                              No student admissions recorded for this range.
                            </TableCell>
                          </TableRow>
                        ) : (
                          (admissionData.students || []).map((s) => (
                            <TableRow key={s.id} hover>
                              <TableCell sx={{ fontWeight: 700 }}>{s.admissionNo}</TableCell>
                              <TableCell>{formatDate(s.admissionDate)}</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>{s.fullName}</TableCell>
                              <TableCell>{s.gender}</TableCell>
                              <TableCell>
                                {s.className} {s.sectionName}
                              </TableCell>
                              <TableCell>{s.rollNo ?? '—'}</TableCell>
                              <TableCell>
                                <Typography variant="body2">{s.guardianName}</Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                  {s.guardianMobile}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  size="small"
                                  label={s.status}
                                  color={s.status === 'Active' ? 'success' : 'default'}
                                  sx={{ height: 22 }}
                                />
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {/* TAB 7: OUTSTANDING DUES & DEFAULTERS */}
              {activeTab === 7 && (
                <Box>
                  <Box sx={{ mb: 2, p: 1.5, bgcolor: '#eff6ff', borderRadius: 1.5, border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <DueIcon sx={{ color: '#1d4ed8', fontSize: 20 }} />
                      <Typography variant="body2" sx={{ color: '#1e3a8a', fontWeight: 700 }}>
                        Session Defaulters List: <strong>{activeAcademicYearName || 'Current Session'}</strong>
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: '#475569', fontWeight: 500 }}>
                      *Student Admission Numbers reflect their initial year of admission. Classes shown represent their enrolled class in {activeAcademicYearName || 'this session'}.
                    </Typography>
                  </Box>

                  <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5 }}>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Student & Admission #</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Enrolled Class ({activeAcademicYearName || 'Session'})</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Pending Months</TableCell>
                          <TableCell sx={{ fontWeight: 700 }} align="right">
                            Total Due (₹)
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700 }} align="right">
                            Paid So Far (₹)
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700 }} align="right">
                            Pending Balance (₹)
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Guardian Contact</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredDefaulters.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                              No fee dues / defaulters found for this academic session!
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredDefaulters.map((d, idx) => (
                            <TableRow key={idx} hover>
                              <TableCell>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                                  {d.studentName}
                                  {d.rollNo && (
                                    <Chip
                                      size="small"
                                      label={`Roll: #${d.rollNo}`}
                                      sx={{ ml: 1, height: 18, fontSize: '0.68rem', fontWeight: 600, bgcolor: 'action.selected' }}
                                    />
                                  )}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontWeight: 500 }}>
                                  Adm No: <strong>{d.admissionNo}</strong>
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {d.classSection || `${d.className || ''} ${d.sectionName || ''}`.trim() || '—'}
                                  </Typography>
                                  {d.isEnrolledInSession ? (
                                    <Chip
                                      size="small"
                                      label={activeAcademicYearName || '2027-28'}
                                      color="primary"
                                      variant="outlined"
                                      sx={{ height: 20, fontSize: '0.68rem', fontWeight: 600 }}
                                    />
                                  ) : (
                                    <Chip
                                      size="small"
                                      label="Unenrolled in Session"
                                      color="warning"
                                      variant="outlined"
                                      sx={{ height: 20, fontSize: '0.68rem', fontWeight: 600 }}
                                    />
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', maxWidth: 220 }} noWrap title={d.pendingMonths}>
                                  {d.pendingMonths || 'All Months'}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">{formatCurrency(d.totalDue)}</TableCell>
                              <TableCell align="right" sx={{ color: 'success.main', fontWeight: 600 }}>
                                {formatCurrency(d.totalPaid)}
                              </TableCell>
                              <TableCell align="right" sx={{ color: 'error.main', fontWeight: 800 }}>
                                {formatCurrency(d.remainingDue)}
                              </TableCell>
                              <TableCell>
                                {d.guardianName ? `${d.guardianName} (${d.guardianMobile || d.contactNumber || '—'})` : (d.guardianMobile || d.contactNumber || '—')}
                              </TableCell>
                            </TableRow>
                          ))
                        )}

                        {/* Summary Total Row */}
                        {filteredDefaulters.length > 0 && (
                          <TableRow sx={{ bgcolor: 'action.hover', borderTop: '2px solid', borderColor: 'divider' }}>
                            <TableCell colSpan={3} sx={{ fontWeight: 800 }}>
                              TOTAL OUTSTANDING DUES ({filteredDefaulters.length} Students):
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800 }}>
                              {formatCurrency(filteredDefaulters.reduce((sum, d) => sum + (Number(d.totalDue) || 0), 0))}
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800, color: 'success.main' }}>
                              {formatCurrency(filteredDefaulters.reduce((sum, d) => sum + (Number(d.totalPaid) || 0), 0))}
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 900, color: 'error.main', fontSize: 14 }}>
                              {formatCurrency(filteredDefaulters.reduce((sum, d) => sum + (Number(d.remainingDue) || 0), 0))}
                            </TableCell>
                            <TableCell />
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </>
          )}
        </Box>
      </Card>

      {/* 4. Official Printable Accounts & Finance Report Document Dialog */}
      <Dialog open={printModalOpen} onClose={() => setPrintModalOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Official Printable Report & Audit Document
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Preview institutional register with header, financial totals, and verification seal
            </Typography>
          </Box>
          <IconButton onClick={() => setPrintModalOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: { xs: 1.5, sm: 3 }, bgcolor: '#f8fafc' }}>
          <Box
            ref={printComponentRef}
            sx={{
              p: 3,
              bgcolor: '#fff',
              color: '#000',
              borderRadius: 2,
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              overflowX: 'auto',
            }}
          >
            {/* School Header */}
            <Box sx={{ textAlign: 'center', pb: 2, mb: 2, borderBottom: '2px solid #1e293b' }}>
              <Typography variant="h5" sx={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1, color: '#1e3a8a' }}>
                {schoolInfo.name}
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', color: '#475569', fontWeight: 600 }}>
                {schoolInfo.branch} &bull; Affiliated to CBSE, New Delhi | Affiliation No: {schoolInfo.affiliation}
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', color: '#64748b' }}>
                {schoolInfo.address} | Phone: {schoolInfo.phone} | Email: {schoolInfo.email}
              </Typography>
              <Box sx={{ mt: 1.5, p: 0.75, bgcolor: '#f1f5f9', borderRadius: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 900, textTransform: 'uppercase', color: '#0f172a' }}>
                  {reportNames[activeTab] || 'ACCOUNTS REPORT'}
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 600, color: '#334155' }}>
                  Date Period: <b>{formatDate(startDate)}</b> to <b>{formatDate(endDate)}</b> | Session:{' '}
                  <b>{activeAcademicYearName || 'Current Session'}</b> | Generated On:{' '}
                  <b>{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</b>
                </Typography>
              </Box>
            </Box>

            {/* TAB 0: DAY BOOK */}
            {activeTab === 0 && (
              <Table size="small" sx={{ '& td, & th': { border: '1px solid #ccc', py: 0.6, px: 1, fontSize: '0.78rem' } }}>
                <TableHead sx={{ bgcolor: '#e2e8f0' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Ref / Receipt #</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Category</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Particulars & Account Head</TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="right">Inflow (₹)</TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="right">Outflow (₹)</TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="right">Balance (₹)</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Mode</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Processed By</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredDayBook.map((e, idx) => (
                    <TableRow key={e.id}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>{formatDate(e.date)}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{e.refNo}</TableCell>
                      <TableCell>{e.category}</TableCell>
                      <TableCell>
                        {e.particulars}
                        {e.details ? ` (${e.details})` : ''}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {e.inflowAmount > 0 ? formatCurrency(e.inflowAmount) : '—'}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {e.outflowAmount > 0 ? formatCurrency(e.outflowAmount) : '—'}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {formatCurrency(e.runningBalance)}
                      </TableCell>
                      <TableCell>{e.paymentMode}</TableCell>
                      <TableCell>{e.processedBy}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ bgcolor: '#f8fafc', fontWeight: 800 }}>
                    <TableCell colSpan={5} sx={{ textAlign: 'right', fontWeight: 800 }}>
                      TOTAL PERIOD TRANSACTIONS:
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: '#16a34a' }}>
                      {formatCurrency(dayBookTotals.totalInflow)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: '#dc2626' }}>
                      {formatCurrency(dayBookTotals.totalOutflow)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 900 }}>
                      {formatCurrency(dayBookTotals.netBalance)}
                    </TableCell>
                    <TableCell colSpan={2}></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}

            {/* TAB 1: FEE COLLECTION REPORT */}
            {activeTab === 1 && (
              <Table size="small" sx={{ '& td, & th': { border: '1px solid #ccc', py: 0.6, px: 1, fontSize: '0.78rem' } }}>
                <TableHead sx={{ bgcolor: '#e2e8f0' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Receipt #</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Student Name</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Adm No</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Class / Section</TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="right">Paid Amount (₹)</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Mode</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Cashier</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredCollections.map((col, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{col.receiptNo}</TableCell>
                      <TableCell>{formatDate(col.receiptDate)}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{col.studentName}</TableCell>
                      <TableCell>{col.admissionNo}</TableCell>
                      <TableCell>{col.classSection || `${col.className || ''} ${col.sectionName || ''}`.trim() || '—'}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {formatCurrency(col.totalPaid ?? col.amountPaid ?? col.amount ?? 0)}
                      </TableCell>
                      <TableCell>{(col.paymentModes && String(col.paymentModes).trim()) || (col.paymentMode && String(col.paymentMode).trim()) || 'Cash'}</TableCell>
                      <TableCell>{(col.collectedBy && String(col.collectedBy).trim()) || (col.cashierName && String(col.cashierName).trim()) || (col.createdByName && String(col.createdByName).trim()) || 'Super Admin'}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ bgcolor: '#f8fafc', fontWeight: 800 }}>
                    <TableCell colSpan={6} sx={{ textAlign: 'right', fontWeight: 800 }}>
                      TOTAL PERIOD COLLECTION ({filteredCollections.length} Receipts):
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: '#16a34a' }}>
                      {formatCurrency(filteredCollections.reduce((sum, c) => sum + Number(c.totalPaid ?? c.amountPaid ?? c.amount ?? 0), 0))}
                    </TableCell>
                    <TableCell colSpan={2}></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}

            {/* TAB 2: EXPENSES REPORT */}
            {activeTab === 2 && (
              <Table size="small" sx={{ '& td, & th': { border: '1px solid #ccc', py: 0.6, px: 1, fontSize: '0.78rem' } }}>
                <TableHead sx={{ bgcolor: '#fee2e2' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Voucher #</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Expense Title</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Category</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Spender / Vendor</TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="right">Amount (₹)</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Mode</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Notes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {expenses.map((e, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>EXP/{e.id}</TableCell>
                      <TableCell>{formatDate(e.expenseDate)}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{e.title}</TableCell>
                      <TableCell>{e.categoryName}</TableCell>
                      <TableCell>{e.spenderName}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: 'error.main' }}>
                        {formatCurrency(e.amount)}
                      </TableCell>
                      <TableCell>{e.paymentMode || 'Cash'}</TableCell>
                      <TableCell>{e.description || '—'}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ bgcolor: '#f8fafc', fontWeight: 800 }}>
                    <TableCell colSpan={6} sx={{ textAlign: 'right', fontWeight: 800 }}>
                      TOTAL OPERATING EXPENSES ({expenses.length} Vouchers):
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: 'error.dark' }}>
                      {formatCurrency(expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0))}
                    </TableCell>
                    <TableCell colSpan={2}></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}

            {/* TAB 3: SALARY DISBURSEMENTS */}
            {activeTab === 3 && (
              <Table size="small" sx={{ '& td, & th': { border: '1px solid #ccc', py: 0.6, px: 1, fontSize: '0.78rem' } }}>
                <TableHead sx={{ bgcolor: '#ffedd5' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Salary Slip #</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Staff Name</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Code</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Designation</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Month</TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="right">Net Salary (₹)</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Pay Date</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Mode</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Txn Ref</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {payrolls.map((p, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{p.salarySlipNo || `SLIP-${p.id}`}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{p.employeeName}</TableCell>
                      <TableCell>{p.employeeCode}</TableCell>
                      <TableCell>{p.designation}</TableCell>
                      <TableCell>{p.monthName} {p.payrollYear}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: 'warning.dark' }}>
                        {formatCurrency(p.netSalary)}
                      </TableCell>
                      <TableCell>{formatDate(p.paymentDate)}</TableCell>
                      <TableCell>{p.paymentMode || 'Bank Transfer'}</TableCell>
                      <TableCell>{p.transactionReference || '—'}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ bgcolor: '#f8fafc', fontWeight: 800 }}>
                    <TableCell colSpan={6} sx={{ textAlign: 'right', fontWeight: 800 }}>
                      TOTAL SALARY DISBURSED ({payrolls.length} Staff):
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: 'warning.dark' }}>
                      {formatCurrency(payrolls.reduce((sum, p) => sum + Number(p.netSalary || 0), 0))}
                    </TableCell>
                    <TableCell colSpan={3}></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}

            {/* TAB 4: PROFIT & LOSS STATEMENT */}
            {activeTab === 4 && (
              <Box sx={{ maxWidth: 780, mx: 'auto' }}>
                <Table size="small" sx={{ mb: 2, '& td, & th': { border: '1px solid #ccc', py: 0.8, px: 1.5 } }}>
                  <TableHead sx={{ bgcolor: '#1e293b' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800, color: '#fff' }}>Particulars</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#fff' }} align="right">Amount (₹)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow sx={{ bgcolor: '#f0fdf4' }}>
                      <TableCell colSpan={2} sx={{ fontWeight: 800, color: '#166534' }}>
                        A. REVENUE & CASH INFLOWS
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ pl: 3 }}>Student Tuition & Composite Fee Collections (Net)</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(summary?.totalFeeCollected)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ pl: 3 }}>Late Fines & Penalties Collected</TableCell>
                      <TableCell align="right">{formatCurrency(summary?.totalLateFines)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ pl: 3 }}>Fee Concessions & Waivers Granted (Discount)</TableCell>
                      <TableCell align="right" sx={{ color: 'text.secondary' }}>({formatCurrency(summary?.totalFeeDiscounts)})</TableCell>
                    </TableRow>
                    <TableRow sx={{ bgcolor: '#f8fafc', fontWeight: 800 }}>
                      <TableCell sx={{ fontWeight: 800 }}>TOTAL OPERATING REVENUE (A)</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: '#166534' }}>{formatCurrency(summary?.totalFeeCollected)}</TableCell>
                    </TableRow>

                    <TableRow sx={{ bgcolor: '#fef2f2' }}>
                      <TableCell colSpan={2} sx={{ fontWeight: 800, color: '#991b1b' }}>
                        B. OPERATING COSTS & DISBURSEMENTS
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ pl: 3 }}>School Maintenance, Bills & Operational Expenses</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: 'error.main' }}>{formatCurrency(summary?.totalExpenses)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ pl: 3 }}>Staff Payroll & Salaries Disbursed</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: 'warning.dark' }}>{formatCurrency(summary?.totalSalariesPaid)}</TableCell>
                    </TableRow>
                    <TableRow sx={{ bgcolor: '#f8fafc', fontWeight: 800 }}>
                      <TableCell sx={{ fontWeight: 800 }}>TOTAL OPERATING COSTS (B)</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: '#991b1b' }}>{formatCurrency(summary?.totalOutflow)}</TableCell>
                    </TableRow>

                    <TableRow sx={{ bgcolor: (summary?.netSurplus ?? 0) >= 0 ? '#dcfce7' : '#fee2e2', borderTop: '2px solid #000' }}>
                      <TableCell sx={{ fontWeight: 900, fontSize: '0.95rem', color: (summary?.netSurplus ?? 0) >= 0 ? '#14532d' : '#7f1d1d' }}>
                        NET OPERATING {(summary?.netSurplus ?? 0) >= 0 ? 'SURPLUS (PROFIT)' : 'DEFICIT (LOSS)'} (A - B)
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 900, fontSize: '1rem', color: (summary?.netSurplus ?? 0) >= 0 ? '#14532d' : '#7f1d1d' }}>
                        {formatCurrency(summary?.netSurplus)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Box>
            )}

            {/* TAB 5: ENQUIRIES REPORT */}
            {activeTab === 5 && (
              <Table size="small" sx={{ '& td, & th': { border: '1px solid #ccc', py: 0.6, px: 1, fontSize: '0.78rem' } }}>
                <TableHead sx={{ bgcolor: '#e0f2fe' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Enquiry #</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Student Name</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Target Class</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Guardian Name</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Mobile Number</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Lead Source</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Status / Converted</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(enquiryData.items || []).map((q, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{q.enquiryNo}</TableCell>
                      <TableCell>{formatDate(q.createdOn)}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{q.studentName}</TableCell>
                      <TableCell>{q.className}</TableCell>
                      <TableCell>{q.guardianName}</TableCell>
                      <TableCell>{q.mobile}</TableCell>
                      <TableCell>{q.source}</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: q.isConverted ? 'success.dark' : 'text.primary' }}>
                        {q.isConverted ? 'CONVERTED (Enrolled)' : q.status}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ bgcolor: '#f8fafc', fontWeight: 800 }}>
                    <TableCell colSpan={9} sx={{ textAlign: 'center', fontWeight: 800 }}>
                      TOTAL ENQUIRIES: {enquiryData.totalEnquiries} &bull; CONVERTED ADMISSIONS: {enquiryData.convertedCount} &bull; CONVERSION RATE: {enquiryData.conversionRate}%
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}

            {/* TAB 6: ADMISSIONS REPORT */}
            {activeTab === 6 && (
              <Table size="small" sx={{ '& td, & th': { border: '1px solid #ccc', py: 0.6, px: 1, fontSize: '0.78rem' } }}>
                <TableHead sx={{ bgcolor: '#ecfeff' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Admission #</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Adm Date</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Student Full Name</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Gender</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Class & Section</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Guardian Name</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Contact Number</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(admissionData.students || []).map((s, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{s.admissionNo}</TableCell>
                      <TableCell>{formatDate(s.admissionDate)}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{s.fullName}</TableCell>
                      <TableCell>{s.gender}</TableCell>
                      <TableCell>{s.className} {s.sectionName}</TableCell>
                      <TableCell>{s.guardianName}</TableCell>
                      <TableCell>{s.guardianMobile}</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'success.dark' }}>{s.status}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ bgcolor: '#f8fafc', fontWeight: 800 }}>
                    <TableCell colSpan={9} sx={{ textAlign: 'center', fontWeight: 800 }}>
                      TOTAL NEW ADMISSIONS ENROLLED: {(admissionData.students || []).length} STUDENTS
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}

            {/* TAB 7: PENDING DUES / DEFAULTERS */}
            {activeTab === 7 && (
              <Table size="small" sx={{ '& td, & th': { border: '1px solid #ccc', py: 0.6, px: 1, fontSize: '0.78rem' } }}>
                <TableHead sx={{ bgcolor: '#fee2e2' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Adm No</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Student Full Name</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Class & Sec</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Pending Months</TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="right">Total Due (₹)</TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="right">Paid So Far (₹)</TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="right">Pending Balance (₹)</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Guardian & Contact</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredDefaulters.map((d, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{d.admissionNo}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{d.studentName}</TableCell>
                      <TableCell>{d.classSection || `${d.className || ''} ${d.sectionName || ''}`.trim() || '—'}</TableCell>
                      <TableCell sx={{ fontSize: '0.72rem' }}>{d.pendingMonths || 'All Months'}</TableCell>
                      <TableCell align="right">{formatCurrency(d.totalDue)}</TableCell>
                      <TableCell align="right" sx={{ color: 'success.dark' }}>{formatCurrency(d.totalPaid)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: 'error.main' }}>{formatCurrency(d.remainingDue)}</TableCell>
                      <TableCell>{d.guardianName ? `${d.guardianName} (${d.guardianMobile || d.contactNumber || '—'})` : (d.guardianMobile || d.contactNumber || '—')}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ bgcolor: '#f8fafc', fontWeight: 800 }}>
                    <TableCell colSpan={5} sx={{ textAlign: 'right', fontWeight: 800 }}>
                      TOTAL OUTSTANDING DUES ({filteredDefaulters.length} Students):
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>
                      {formatCurrency(filteredDefaulters.reduce((sum, d) => sum + (Number(d.totalDue) || 0), 0))}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: 'success.main' }}>
                      {formatCurrency(filteredDefaulters.reduce((sum, d) => sum + (Number(d.totalPaid) || 0), 0))}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 900, color: 'error.main' }}>
                      {formatCurrency(filteredDefaulters.reduce((sum, d) => sum + (Number(d.remainingDue) || 0), 0))}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}

            {/* Verification Signatures */}
            <Box sx={{ mt: 5, pt: 3, display: 'flex', justifyContent: 'space-between', textAlign: 'center' }}>
              <Box sx={{ width: 180, borderTop: '1px solid #333', pt: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Accountant / Clerk
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  (Prepared By)
                </Typography>
              </Box>
              <Box sx={{ width: 180, borderTop: '1px solid #333', pt: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Accounts Officer
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  (Verified By)
                </Typography>
              </Box>
              <Box sx={{ width: 200, borderTop: '1px solid #333', pt: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Principal / Director
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  (With Official Seal)
                </Typography>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'space-between', bgcolor: '#fff' }}>
          <Button onClick={() => setPrintModalOpen(false)} color="inherit">
            Close
          </Button>
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="contained"
              startIcon={<ExcelIcon />}
              onClick={handleDownloadActiveExcel}
              sx={{ bgcolor: '#107c41', '&:hover': { bgcolor: '#0b5c30' }, textTransform: 'none', fontWeight: 700 }}
            >
              Download Excel
            </Button>
            <Button
              variant="contained"
              startIcon={<PdfIcon />}
              onClick={handleDownloadActivePdf}
              sx={{ bgcolor: '#d32f2f', '&:hover': { bgcolor: '#b71c1c' }, textTransform: 'none', fontWeight: 700 }}
            >
              Download PDF
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<PrintIcon />}
              onClick={handlePrint}
              sx={{ textTransform: 'none', px: 3, fontWeight: 700 }}
            >
              Print / Save as PDF
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AccountsHubPage;
