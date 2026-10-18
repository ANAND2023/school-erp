import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  MenuItem,
  Button,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Stack,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Tooltip,
  InputAdornment,
  Avatar,
  LinearProgress,
  ClickAwayListener,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  Checkbox,
  ListItemText,
  Collapse,
  Badge,
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  Warning as DefaulterIcon,
  Print as PrintIcon,
  Cancel as CancelIcon,
  FileDownload as FileDownloadIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  PointOfSale as CollectIcon,
  School as SchoolIcon,
  Close as CloseIcon,
  FilterList as FilterIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  CalendarMonth as CalendarMonthIcon,
  History as HistoryIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  CheckCircle as CheckCircleIcon,
  AccountBalanceWallet as WalletIcon,
  Clear as ClearIcon,
  ReceiptLong as ReceiptLongIcon,
  Check as CheckIcon,
  Payment as PaymentIcon,
  WhatsApp as WhatsAppIcon,
  Assessment as AssessmentIcon,
  KeyboardArrowDown as ArrowDownIcon,
  KeyboardArrowUp as ArrowUpIcon,
  Group as GroupIcon,
  AccountCircle as AccountCircleIcon,
  AttachMoney as AttachMoneyIcon,
  DateRange as DateRangeIcon,
  FilterAltOff as FilterAltOffIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import WhatsAppDialog from '../../communication/components/WhatsAppDialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { feesApi } from '../api';
import { studentApi } from '../../students/api';
import { branchApi, classesApi } from '../../masters/api';
import { usePermission } from '../../../hooks/usePermission';
import { useAuthStore } from '../../../store/authStore';
import {
  exportCollectionToExcel,
  exportCollectionToPdf,
  exportDefaultersToExcel,
  exportDefaultersToPdf,
  exportDualFeeReceiptPdf,
  exportClassMonthStatusToExcel,
  exportDateWiseCollectionToExcel,
  exportDateWiseCollectionToPdf,
} from '../utils/feeExportUtils';
import { FeeReceiptSlip } from '../components/FeeReceiptSlip';
import { StudentFeeHistoryModal } from '../components/StudentFeeHistoryModal';
import { AppDatePicker, AppSelect, AppModal } from '../../../components/common';
import { printWithTitle } from '../../../utils/printUtils';
import { formatDateTime } from '../../../utils/dateUtils';

const PAYMENT_MODES = [
  { label: 'All Payment Modes', value: 'ALL' },
  { label: 'Cash', value: 'Cash' },
  { label: 'UPI (GPay / PhonePe / Paytm)', value: 'UPI' },
  { label: 'Cheque', value: 'Cheque' },
  { label: 'Bank Transfer / NEFT / IMPS', value: 'BankTransfer' },
  { label: 'Debit / Credit Card', value: 'Card' },
  { label: 'Online Gateway', value: 'Online' },
];

const DATEWISE_PAYMENT_MODES = [
  { label: 'Cash', value: 'Cash', color: '#16a34a' },
  { label: 'UPI (GPay / PhonePe / Paytm)', value: 'UPI', color: '#2563eb' },
  { label: 'Cheque', value: 'Cheque', color: '#9333ea' },
  { label: 'Bank Transfer / NEFT / IMPS', value: 'BankTransfer', color: '#d97706' },
  { label: 'Debit / Credit Card', value: 'Card', color: '#0891b2' },
  { label: 'Online Gateway', value: 'Online', color: '#4f46e5' },
];

export default function FeeReportsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { can } = usePermission();
  const { user } = useAuthStore();

  const schoolName = user?.schoolName || 'DELHI PUBLIC SCHOOL';
  const branchName = user?.branchName ? `${user.branchName} Branch` : 'Main Campus';

  const [activeTab, setActiveTab] = useState(0);

  // Tab 1: Collection filters
  const [startDate, setStartDate] = useState(dayjs().subtract(7, 'day').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [paymentModeFilter, setPaymentModeFilter] = useState('ALL');

  // Tab 2: Defaulters filters
  const [defaulterClassId, setDefaulterClassId] = useState('');
  const [defaulterSectionId, setDefaulterSectionId] = useState('');

  // Tab 5: Date-wise Collection & Summary Report filters
  const [dateWiseStartDate, setDateWiseStartDate] = useState(
    dayjs().startOf('month').format('YYYY-MM-DD')
  );
  const [dateWiseEndDate, setDateWiseEndDate] = useState(
    dayjs().format('YYYY-MM-DD')
  );
  const [selectedDateWiseClasses, setSelectedDateWiseClasses] = useState([]);
  const [selectedDateWiseModes, setSelectedDateWiseModes] = useState([]);
  const [selectedDateWiseUsers, setSelectedDateWiseUsers] = useState([]);
  const [expandedDateRows, setExpandedDateRows] = useState({});

  // Modals
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedReceiptForCancel, setSelectedReceiptForCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');

  // WhatsApp Dialog State
  const [whatsAppModal, setWhatsAppModal] = useState({
    open: false,
    recipientName: '',
    recipientMobile: '',
    moduleKey: 'feeDemand',
    variables: {},
  });

  // Single Receipt Print
  const { activeBranchId } = useAuthStore();
  const [printReceiptData, setPrintReceiptData] = useState(null);
  const [isPrintOpen, setIsPrintOpen] = useState(false);

  // Full Register Print Previews
  const [isCollectionPrintOpen, setIsCollectionPrintOpen] = useState(false);
  const [isDefaultersPrintOpen, setIsDefaultersPrintOpen] = useState(false);
  const [isDateWisePrintOpen, setIsDateWisePrintOpen] = useState(false);

  // Classes query
  const { data: classesRes } = useQuery({
    queryKey: ['classes-list'],
    queryFn: () => classesApi.getClasses(),
  });
  const classes = classesRes?.data?.data || [];

  const selectedDefaulterClass = classes.find((c) => String(c.id) === String(defaulterClassId));
  const defaulterSections = selectedDefaulterClass ? selectedDefaulterClass.sections : [];

  // 1. Daily Collection Query
  const {
    data: collectionRes,
    isLoading: isLoadingCollection,
  } = useQuery({
    queryKey: ['fee-daily-collection', startDate, endDate],
    queryFn: () => feesApi.getDailyCollection({ startDate, endDate }),
  });
  const rawCollectionList = collectionRes?.data?.data || [];

  // Client-side Instant Filter by Payment Mode ("mode bhi lgao")
  const collectionList = rawCollectionList.filter((r) => {
    if (!paymentModeFilter || paymentModeFilter === 'ALL') return true;
    return (r.paymentModes || '').toLowerCase().includes(paymentModeFilter.toLowerCase());
  });

  // 2. Defaulters Query
  const defaulterParams = {
    classId: defaulterClassId || undefined,
    sectionId: defaulterSectionId || undefined,
  };
  const {
    data: defaultersRes,
    isLoading: isLoadingDefaulters,
  } = useQuery({
    queryKey: ['fee-defaulters', defaulterParams],
    queryFn: () => feesApi.getDefaulters(defaulterParams),
  });
  const defaultersList = defaultersRes?.data?.data || [];

  // Cancel Receipt Mutation
  const cancelMutation = useMutation({
    mutationFn: ({ id, data }) => feesApi.cancelReceipt(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['fee-daily-collection']);
      setCancelModalOpen(false);
      setSelectedReceiptForCancel(null);
      setCancelReason('');
      setCancelError('');
    },
    onError: (err) => {
      setCancelError(err?.response?.data?.message || 'Failed to cancel receipt.');
    },
  });

  const handleOpenPrint = async (receiptId) => {
    try {
      const res = await feesApi.getReceiptPrint(receiptId);
      setPrintReceiptData(res?.data?.data);
      setIsPrintOpen(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenCancel = (receipt) => {
    setSelectedReceiptForCancel(receipt);
    setCancelReason('');
    setCancelError('');
    setCancelModalOpen(true);
  };

  const handleConfirmCancel = (e) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      setCancelError('Please specify the cancellation reason.');
      return;
    }
    cancelMutation.mutate({
      id: selectedReceiptForCancel.receiptId,
      data: { reason: cancelReason.trim() },
    });
  };

  // Metrics for Daily Collection
  const activeReceipts = collectionList.filter((r) => r.status === 1);
  const cancelledReceiptsCount = collectionList.filter((r) => r.status === 2).length;
  const totalCollectedPeriod = activeReceipts.reduce((sum, r) => sum + Number(r.totalPaid || 0), 0);

  // Metrics for Defaulters
  const totalFeeOverdue = defaultersList.reduce((sum, d) => sum + Number(d.overdueAmount || 0), 0);
  const totalFineOverdue = defaultersList.reduce((sum, d) => sum + Number(d.overdueFine || 0), 0);
  const totalOverduePeriod = defaultersList.reduce((sum, d) => sum + Number(d.totalOverdue || 0), 0);

  // EXPORT HANDLERS - DAILY COLLECTION
  const handleDownloadCollectionExcel = () => {
    exportCollectionToExcel({
      collectionList,
      startDate,
      endDate,
      modeFilter: paymentModeFilter === 'ALL' ? 'All Modes' : paymentModeFilter,
      schoolName,
      branchName,
    });
  };

  const handleDownloadCollectionPdf = () => {
    exportCollectionToPdf({
      collectionList,
      startDate,
      endDate,
      modeFilter: paymentModeFilter === 'ALL' ? 'All Modes' : paymentModeFilter,
      schoolName,
      branchName,
    });
  };

  const handleExportCollectionCSV = () => {
    if (!collectionList.length) return;
    const headers = [
      'Receipt No',
      'Date & Time',
      'Admission No',
      'Student Name',
      'Class & Sec',
      'Payment Mode',
      'Collected By',
      'Status',
      'Amount Paid (INR)',
    ];
    const rows = collectionList.map((r) => [
      `"${r.receiptNo}"`,
      `"${formatDateTime(r.receiptDate, 'YYYY-MM-DD HH:mm')}"`,
      `"${r.admissionNo}"`,
      `"${r.studentName}"`,
      `"${r.classSection}"`,
      `"${r.paymentModes}"`,
      `"${r.collectedBy || 'Cashier'}"`,
      r.status === 1 ? 'Paid' : 'Cancelled',
      r.totalPaid,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute(
      'download',
      `Fee_Collection_${startDate}_to_${endDate}_${paymentModeFilter}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // EXPORT HANDLERS - DEFAULTERS
  const handleDownloadDefaultersExcel = () => {
    const selectedClass = classes.find((c) => String(c.id) === String(defaulterClassId));
    const selectedSection = defaulterSections.find((s) => String(s.id) === String(defaulterSectionId));
    exportDefaultersToExcel({
      defaultersList,
      selectedClassName: selectedClass ? selectedClass.name : 'All Classes',
      selectedSectionName: selectedSection ? selectedSection.name : 'All Sections',
      schoolName,
      branchName,
    });
  };

  const handleDownloadDefaultersPdf = () => {
    const selectedClass = classes.find((c) => String(c.id) === String(defaulterClassId));
    const selectedSection = defaulterSections.find((s) => String(s.id) === String(defaulterSectionId));
    exportDefaultersToPdf({
      defaultersList,
      selectedClassName: selectedClass ? selectedClass.name : 'All Classes',
      selectedSectionName: selectedSection ? selectedSection.name : 'All Sections',
      schoolName,
      branchName,
    });
  };

  const handleExportDefaultersCSV = () => {
    if (!defaultersList.length) return;
    const headers = [
      'Adm No',
      'Student Name',
      'Class',
      'Guardian',
      'Mobile',
      'Overdue Amount',
      'Overdue Fine',
      'Total Overdue',
      'Installments',
    ];
    const rows = defaultersList.map((d) => [
      `"${d.admissionNo}"`,
      `"${d.studentName}"`,
      `"${d.className}"`,
      `"${d.guardianName}"`,
      `"${d.guardianMobile}"`,
      d.overdueAmount,
      d.overdueFine,
      d.totalOverdue,
      `"${d.overdueInstallments}"`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `Fee_Defaulters_${dayjs().format('YYYY-MM-DD')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // -------------------------------------------------------------
  // TAB 3 (Index 2): Class & Month-wise Fee Status Report
  // -------------------------------------------------------------
  const [statusClassId, setStatusClassId] = useState('');
  const [statusSectionId, setStatusSectionId] = useState('');
  const [statusInstallmentId, setStatusInstallmentId] = useState('');
  const [statusDuesFilter, setStatusDuesFilter] = useState('all'); // 'all', 'dues', 'paid', 'partial'
  const [statusSearchText, setStatusSearchText] = useState('');

  // Selected student for history modal (from Tab 0, 1, or 2)
  const [selectedHistoryStudentId, setSelectedHistoryStudentId] = useState(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Installments query (12 academic months)
  const { data: installmentsRes } = useQuery({
    queryKey: ['fee-installments'],
    queryFn: () => feesApi.getInstallments(),
  });
  const installmentsList = installmentsRes?.data?.data || [];

  const selectedStatusClass = classes.find((c) => String(c.id) === String(statusClassId));
  const statusSections = selectedStatusClass ? selectedStatusClass.sections || [] : [];

  const statusQueryParams = {
    classId: statusClassId || undefined,
    sectionId: statusSectionId || undefined,
    installmentId: statusInstallmentId || undefined,
    feeInstallmentId: statusInstallmentId || undefined,
    status: statusDuesFilter !== 'all' ? statusDuesFilter : undefined,
    search: statusSearchText.trim() || undefined,
  };

  const {
    data: classMonthRes,
    isLoading: isLoadingClassMonth,
  } = useQuery({
    queryKey: ['fee-class-month-status', statusQueryParams],
    queryFn: () => feesApi.getClassMonthStatus(statusQueryParams),
    enabled: activeTab === 2,
  });

  const classMonthData = classMonthRes?.data?.data;
  const classMonthSummary = classMonthData?.summary || {
    totalStudents: 0,
    paidCount: 0,
    partialCount: 0,
    unpaidCount: 0,
    totalGrossFee: 0,
    totalConcession: 0,
    totalNetPayable: 0,
    totalPaid: 0,
    totalRemainingDues: 0,
    totalFine: 0,
    collectionPercentage: 0,
  };
  const classMonthStudents = classMonthData?.students || [];

  const handleDownloadClassMonthExcel = () => {
    const className = selectedStatusClass ? selectedStatusClass.name : 'All Classes';
    const sectionName = statusSections.find((s) => String(s.id) === String(statusSectionId))?.name || 'All Sections';
    const inst = installmentsList.find((i) => String(i.id) === String(statusInstallmentId));
    const instName = inst ? inst.name : 'All Months';

    exportClassMonthStatusToExcel({
      studentsList: classMonthStudents,
      summary: classMonthSummary,
      className,
      sectionName,
      installmentName: instName,
      schoolName,
      branchName,
    });
  };

  const handleOpenStudentHistory = (studentId) => {
    setSelectedHistoryStudentId(studentId);
    setIsHistoryModalOpen(true);
  };

  // -------------------------------------------------------------
  // TAB 4 (Index 3): Direct Student Fee History & Ledger Search
  // -------------------------------------------------------------
  const [directSearchTerm, setDirectSearchTerm] = useState('');
  const [isDirectDropdownOpen, setIsDirectDropdownOpen] = useState(false);
  const [selectedDirectStudentId, setSelectedDirectStudentId] = useState(null);
  const [directHistorySubTab, setDirectHistorySubTab] = useState(0);

  const { data: directSearchRes, isLoading: isSearchingDirect } = useQuery({
    queryKey: ['direct-student-search', directSearchTerm],
    queryFn: () => studentApi.getStudents({ search: directSearchTerm, pageSize: 8 }),
    enabled: directSearchTerm.length >= 2,
  });
  const directSearchResults = directSearchRes?.data?.data?.items || [];

  const {
    data: directHistoryRes,
    isLoading: isLoadingDirectHistory,
  } = useQuery({
    queryKey: ['student-fee-history-direct', selectedDirectStudentId],
    queryFn: () => feesApi.getStudentFullHistory(selectedDirectStudentId),
    enabled: Boolean(selectedDirectStudentId && activeTab === 3),
  });
  const directStudentHistory = directHistoryRes?.data?.data || null;

  // -------------------------------------------------------------
  // TAB 5 (Index 4): Date-wise Collection & Multi-dimensional Summary
  // -------------------------------------------------------------
  // 5. Date-wise Collection Query
  const {
    data: dateWiseRes,
    isLoading: isLoadingDateWise,
  } = useQuery({
    queryKey: ['fee-datewise-collection', dateWiseStartDate, dateWiseEndDate],
    queryFn: () =>
      feesApi.getDailyCollection({
        startDate: dateWiseStartDate,
        endDate: dateWiseEndDate,
      }),
  });
  const rawDateWiseList = dateWiseRes?.data?.data || [];

  // Available Cashiers from collection data
  const availableDateWiseCashiers = useMemo(() => {
    const userSet = new Set();
    rawDateWiseList.forEach((r) => {
      if (r.collectedBy) userSet.add(r.collectedBy.trim());
    });
    return Array.from(userSet).sort();
  }, [rawDateWiseList]);

  // Filtered Date-wise list based on Multiselect Class, Multiselect Mode, and Cashier User
  const filteredDateWiseList = useMemo(() => {
    return rawDateWiseList.filter((r) => {
      // 1. Class multiselect
      if (selectedDateWiseClasses.length > 0) {
        const matchesClass = selectedDateWiseClasses.some(
          (cId) =>
            String(r.classId) === String(cId) ||
            (r.className && String(r.className).toLowerCase() === String(cId).toLowerCase()) ||
            (r.classSection && String(r.classSection).toLowerCase().includes(String(cId).toLowerCase()))
        );
        if (!matchesClass) return false;
      }

      // 2. Mode multiselect
      if (selectedDateWiseModes.length > 0) {
        let modesInReceipt = [];
        if (r.payments && r.payments.length > 0) {
          modesInReceipt = r.payments.map((p) => (p.mode || '').toLowerCase());
        } else if (r.paymentModes) {
          modesInReceipt = r.paymentModes.toLowerCase().split(',').map((s) => s.trim());
        }
        const matchesMode = selectedDateWiseModes.some((m) =>
          modesInReceipt.some((rm) => rm.includes(m.toLowerCase()))
        );
        if (!matchesMode) return false;
      }

      // 3. User / Cashier multiselect ("kisne fee liya hai")
      if (selectedDateWiseUsers.length > 0) {
        const cashier = (r.collectedBy || 'Cashier').trim();
        const matchesUser = selectedDateWiseUsers.some(
          (u) => u.trim().toLowerCase() === cashier.toLowerCase()
        );
        if (!matchesUser) return false;
      }

      return true;
    });
  }, [rawDateWiseList, selectedDateWiseClasses, selectedDateWiseModes, selectedDateWiseUsers]);

  // Group receipts Date-wise: Date, Receipt No Range (From - To), Gross Fee, Discount, Net Collection, Mode Breakdown
  const dateWiseGroups = useMemo(() => {
    const groups = {};
    filteredDateWiseList.forEach((r) => {
      const dateKey = dayjs(r.receiptDate).format('YYYY-MM-DD');
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(r);
    });

    const sortedDates = Object.keys(groups).sort((a, b) => (a < b ? 1 : -1));

    return sortedDates.map((dateStr) => {
      const items = groups[dateStr];
      const sortedReceipts = [...items].sort((a, b) => {
        if (a.receiptId && b.receiptId) return a.receiptId - b.receiptId;
        return (a.receiptNo || '').localeCompare(b.receiptNo || '');
      });

      const firstReceiptNo = sortedReceipts[0]?.receiptNo || '—';
      const lastReceiptNo = sortedReceipts[sortedReceipts.length - 1]?.receiptNo || '—';
      const receiptRange =
        firstReceiptNo === lastReceiptNo
          ? firstReceiptNo
          : `${firstReceiptNo} – ${lastReceiptNo}`;

      const activeItems = items.filter((r) => r.status === 1);
      const cancelledCount = items.filter((r) => r.status === 2).length;

      const totalPaid = activeItems.reduce((sum, r) => sum + Number(r.totalPaid || 0), 0);
      const totalDiscount = activeItems.reduce((sum, r) => sum + Number(r.totalDiscount || 0), 0);
      const grossFeeAmount = activeItems.reduce(
        (sum, r) => sum + Number(r.grossAmount ?? (r.totalPaid + (r.totalDiscount || 0))),
        0
      );

      // Mode breakdown for this date: "kis mode me kitna"
      const modeBreakdown = {};
      activeItems.forEach((r) => {
        if (r.payments && r.payments.length > 0) {
          r.payments.forEach((p) => {
            const m = p.mode || 'Cash';
            modeBreakdown[m] = (modeBreakdown[m] || 0) + Number(p.amount || 0);
          });
        } else {
          const m = r.paymentModes || 'Cash';
          modeBreakdown[m] = (modeBreakdown[m] || 0) + Number(r.totalPaid || 0);
        }
      });

      return {
        date: dateStr,
        displayDate: dayjs(dateStr).format('DD MMM YYYY, dddd'),
        receiptCount: items.length,
        activeCount: activeItems.length,
        cancelledCount,
        firstReceiptNo,
        lastReceiptNo,
        receiptRange,
        grossFeeAmount,
        totalDiscount,
        totalCollection: totalPaid,
        modeBreakdown,
        receipts: sortedReceipts,
      };
    });
  }, [filteredDateWiseList]);

  // Multi-dimensional Bottom Summaries (Payment Mode, Class, and User / Cashier)
  const dateWiseSummary = useMemo(() => {
    const activeReceipts = filteredDateWiseList.filter((r) => r.status === 1);
    const totalCollected = activeReceipts.reduce((sum, r) => sum + Number(r.totalPaid || 0), 0);
    const totalDiscount = activeReceipts.reduce((sum, r) => sum + Number(r.totalDiscount || 0), 0);
    const totalGross = activeReceipts.reduce(
      (sum, r) => sum + Number(r.grossAmount ?? (r.totalPaid + (r.totalDiscount || 0))),
      0
    );

    // 1. Payment Mode Breakdown
    const modeMap = {};
    activeReceipts.forEach((r) => {
      if (r.payments && r.payments.length > 0) {
        r.payments.forEach((p) => {
          const m = p.mode || 'Cash';
          if (!modeMap[m]) modeMap[m] = { mode: m, count: 0, amount: 0 };
          modeMap[m].count += 1;
          modeMap[m].amount += Number(p.amount || 0);
        });
      } else {
        const m = r.paymentModes || 'Cash';
        if (!modeMap[m]) modeMap[m] = { mode: m, count: 0, amount: 0 };
        modeMap[m].count += 1;
        modeMap[m].amount += Number(r.totalPaid || 0);
      }
    });
    const modeSummaryList = Object.values(modeMap).sort((a, b) => b.amount - a.amount);

    // 2. Class-wise Breakdown
    const classMap = {};
    activeReceipts.forEach((r) => {
      const cName = r.className || (r.classSection ? r.classSection.split('-')[0].trim() : 'Unassigned');
      if (!classMap[cName]) {
        classMap[cName] = { className: cName, count: 0, gross: 0, discount: 0, net: 0 };
      }
      classMap[cName].count += 1;
      classMap[cName].gross += Number(r.grossAmount ?? (r.totalPaid + (r.totalDiscount || 0)));
      classMap[cName].discount += Number(r.totalDiscount || 0);
      classMap[cName].net += Number(r.totalPaid || 0);
    });
    const classSummaryList = Object.values(classMap).sort((a, b) => b.net - a.net);

    // 3. User / Cashier Breakdown ("kisne fee liya hai")
    const userMap = {};
    activeReceipts.forEach((r) => {
      const uName = (r.collectedBy || 'Cashier').trim();
      if (!userMap[uName]) {
        userMap[uName] = { userName: uName, count: 0, gross: 0, discount: 0, net: 0 };
      }
      userMap[uName].count += 1;
      userMap[uName].gross += Number(r.grossAmount ?? (r.totalPaid + (r.totalDiscount || 0)));
      userMap[uName].discount += Number(r.totalDiscount || 0);
      userMap[uName].net += Number(r.totalPaid || 0);
    });
    const userSummaryList = Object.values(userMap).sort((a, b) => b.net - a.net);

    return {
      totalReceipts: filteredDateWiseList.length,
      activeReceiptsCount: activeReceipts.length,
      cancelledReceiptsCount: filteredDateWiseList.length - activeReceipts.length,
      totalGross,
      totalDiscount,
      totalCollected,
      modeSummaryList,
      classSummaryList,
      userSummaryList,
    };
  }, [filteredDateWiseList]);

  // Date Presets Handler
  const handleDatePreset = (preset) => {
    const today = dayjs();
    if (preset === 'today') {
      setDateWiseStartDate(today.format('YYYY-MM-DD'));
      setDateWiseEndDate(today.format('YYYY-MM-DD'));
    } else if (preset === 'yesterday') {
      const yest = today.subtract(1, 'day');
      setDateWiseStartDate(yest.format('YYYY-MM-DD'));
      setDateWiseEndDate(yest.format('YYYY-MM-DD'));
    } else if (preset === 'week') {
      setDateWiseStartDate(today.startOf('week').format('YYYY-MM-DD'));
      setDateWiseEndDate(today.format('YYYY-MM-DD'));
    } else if (preset === 'month') {
      setDateWiseStartDate(today.startOf('month').format('YYYY-MM-DD'));
      setDateWiseEndDate(today.format('YYYY-MM-DD'));
    } else if (preset === 'lastMonth') {
      const lastMonth = today.subtract(1, 'month');
      setDateWiseStartDate(lastMonth.startOf('month').format('YYYY-MM-DD'));
      setDateWiseEndDate(lastMonth.endOf('month').format('YYYY-MM-DD'));
    }
  };

  const handleResetDateWiseFilters = () => {
    setDateWiseStartDate(dayjs().startOf('month').format('YYYY-MM-DD'));
    setDateWiseEndDate(dayjs().format('YYYY-MM-DD'));
    setSelectedDateWiseClasses([]);
    setSelectedDateWiseModes([]);
    setSelectedDateWiseUsers([]);
  };

  // 1. Class Multi-select Change Handler (with Select All toggle)
  const handleClassesChange = (event) => {
    const value = event.target.value;
    const valueArray = typeof value === 'string' ? value.split(',') : value;

    if (valueArray.includes('ALL')) {
      if (selectedDateWiseClasses.length === classes.length) {
        setSelectedDateWiseClasses([]);
      } else {
        setSelectedDateWiseClasses(classes.map((c) => c.id));
      }
      return;
    }

    setSelectedDateWiseClasses(valueArray);
  };

  // 2. Payment Mode Multi-select Change Handler (with Select All toggle)
  const handleModesChange = (event) => {
    const value = event.target.value;
    const valueArray = typeof value === 'string' ? value.split(',') : value;

    if (valueArray.includes('ALL')) {
      if (selectedDateWiseModes.length === DATEWISE_PAYMENT_MODES.length) {
        setSelectedDateWiseModes([]);
      } else {
        setSelectedDateWiseModes(DATEWISE_PAYMENT_MODES.map((m) => m.value));
      }
      return;
    }

    setSelectedDateWiseModes(valueArray);
  };

  // 3. User / Cashier Multi-select Change Handler (with Select All toggle)
  const handleUsersChange = (event) => {
    const value = event.target.value;
    const valueArray = typeof value === 'string' ? value.split(',') : value;

    if (valueArray.includes('ALL')) {
      if (selectedDateWiseUsers.length === availableDateWiseCashiers.length) {
        setSelectedDateWiseUsers([]);
      } else {
        setSelectedDateWiseUsers([...availableDateWiseCashiers]);
      }
      return;
    }

    setSelectedDateWiseUsers(valueArray);
  };

  const toggleDateRowExpand = (dateStr) => {
    setExpandedDateRows((prev) => ({
      ...prev,
      [dateStr]: !prev[dateStr],
    }));
  };

  const handleDownloadDateWiseExcel = () => {
    const classNames =
      selectedDateWiseClasses.length === 0
        ? 'All Classes'
        : selectedDateWiseClasses
            .map((cId) => classes.find((c) => c.id === cId)?.name || cId)
            .join(', ');
    const modeNames =
      selectedDateWiseModes.length === 0 ? 'All Modes' : selectedDateWiseModes.join(', ');
    const userNames =
      selectedDateWiseUsers.length === 0 ? 'All Users' : selectedDateWiseUsers.join(', ');
    exportDateWiseCollectionToExcel({
      dateWiseGroups,
      dateWiseSummary,
      startDate: dateWiseStartDate,
      endDate: dateWiseEndDate,
      selectedClassNames: classNames,
      selectedModes: modeNames,
      selectedUser: userNames,
      schoolName,
      branchName,
    });
  };

  const handleDownloadDateWisePdf = () => {
    const classNames =
      selectedDateWiseClasses.length === 0
        ? 'All Classes'
        : selectedDateWiseClasses
            .map((cId) => classes.find((c) => c.id === cId)?.name || cId)
            .join(', ');
    const modeNames =
      selectedDateWiseModes.length === 0 ? 'All Modes' : selectedDateWiseModes.join(', ');
    const userNames =
      selectedDateWiseUsers.length === 0 ? 'All Users' : selectedDateWiseUsers.join(', ');
    exportDateWiseCollectionToPdf({
      dateWiseGroups,
      dateWiseSummary,
      startDate: dateWiseStartDate,
      endDate: dateWiseEndDate,
      selectedClassNames: classNames,
      selectedModes: modeNames,
      selectedUser: userNames,
      schoolName,
      branchName,
    });
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      {/* Print CSS styling with zero-clipping margins */}
      <style>
        {`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-collection-report,
          #printable-collection-report *,
          #printable-defaulters-report,
          #printable-defaulters-report *,
          #printable-datewise-report,
          #printable-datewise-report *,
          #printable-receipt,
          #printable-receipt * {
            visibility: visible !important;
          }
          #printable-collection-report,
          #printable-defaulters-report,
          #printable-datewise-report,
          #printable-receipt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 8mm !important;
            box-sizing: border-box !important;
            background: #ffffff !important;
            overflow: visible !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: landscape;
            margin: 8mm;
          }
        }
        `}
      </style>



      {/* Tabs */}
      <Card sx={{ mb: 1.5, boxShadow: 1, borderRadius: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(e, val) => setActiveTab(val)}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            px: 1,
            minHeight: 40,
            '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0' },
          }}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab
            icon={<ReceiptIcon sx={{ fontSize: 17 }} />}
            iconPosition="start"
            label={`1. Daily Collection Register (${collectionList.length})`}
            sx={{
              minHeight: 40,
              py: 0.75,
              px: 1.75,
              fontSize: '0.8125rem',
              fontWeight: 700,
              textTransform: 'none',
              letterSpacing: 0,
            }}
          />
          <Tab
            icon={<DefaulterIcon sx={{ fontSize: 17 }} />}
            iconPosition="start"
            label={`2. Fee Defaulters List (${defaultersList.length})`}
            sx={{
              minHeight: 40,
              py: 0.75,
              px: 1.75,
              fontSize: '0.8125rem',
              fontWeight: 700,
              textTransform: 'none',
              letterSpacing: 0,
            }}
          />
          <Tab
            icon={<CalendarMonthIcon sx={{ fontSize: 17 }} />}
            iconPosition="start"
            label="3. Class & Month-wise Status"
            sx={{
              minHeight: 40,
              py: 0.75,
              px: 1.75,
              fontSize: '0.8125rem',
              fontWeight: 700,
              textTransform: 'none',
              letterSpacing: 0,
            }}
          />
          <Tab
            icon={<HistoryIcon sx={{ fontSize: 17 }} />}
            iconPosition="start"
            label="4. Student Fee History"
            sx={{
              minHeight: 40,
              py: 0.75,
              px: 1.75,
              fontSize: '0.8125rem',
              fontWeight: 700,
              textTransform: 'none',
              letterSpacing: 0,
            }}
          />
          <Tab
            icon={<AssessmentIcon sx={{ fontSize: 17 }} />}
            iconPosition="start"
            label={`5. Date-wise Collection & Summary (${dateWiseGroups.length})`}
            sx={{
              minHeight: 40,
              py: 0.75,
              px: 1.75,
              fontSize: '0.8125rem',
              fontWeight: 700,
              textTransform: 'none',
              letterSpacing: 0,
            }}
          />
        </Tabs>
      </Card>

      {/* Tab 0: Daily Collection Register */}
      {activeTab === 0 && (
        <Stack spacing={1.5}>
          {/* Filters & Export Toolbar Card */}
          <Card sx={{ boxShadow: 1, borderRadius: 2 }}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Grid container spacing={1.5} alignItems="center">
                <Grid item xs={12} sm={3}>
                  <AppDatePicker
                    label="From Date"
                    value={startDate}
                    onChange={(e) => {
                      if (e.value) {
                        setStartDate(dayjs(e.value).format('YYYY-MM-DD'));
                      }
                    }}
                    dateFormat="dd/M/yy"
                  />
                </Grid>

                <Grid item xs={12} sm={3}>
                  <AppDatePicker
                    label="To Date"
                    value={endDate}
                    onChange={(e) => {
                      if (e.value) {
                        setEndDate(dayjs(e.value).format('YYYY-MM-DD'));
                      }
                    }}
                    dateFormat="dd/M/yy"
                  />
                </Grid>

                {/* Payment Mode Filter Dropdown */}
                <Grid item xs={12} sm={3}>
                  <AppSelect
                    label="Payment Mode"
                    value={paymentModeFilter}
                    onChange={(e) => setPaymentModeFilter(e.target.value)}
                    options={PAYMENT_MODES}
                    optionLabel="label"
                    optionValue="value"
                    showClear
                    addon="H"
                  />
                </Grid>

                {/* Total Stats Mini Card */}
                <Grid item xs={12} sm={3}>
                  <Paper
                    variant="outlined"
                    sx={{
                      py: 0.6,
                      px: 1.5,
                      bgcolor: '#f0fdf4',
                      borderColor: '#86efac',
                      borderRadius: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      minHeight: 40,
                      boxSizing: 'border-box',
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#166534', lineHeight: 1.2 }}>
                        Net Active Collection
                      </Typography>
                      <Typography sx={{ fontSize: '0.68rem', color: '#15803d', lineHeight: 1.1 }}>
                        {activeReceipts.length} Active {cancelledReceiptsCount > 0 && `(${cancelledReceiptsCount} Can.)`}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: '1.05rem', fontWeight: 800, color: '#166534', lineHeight: 1, ml: 1 }}>
                      ₹{totalCollectedPeriod.toLocaleString()}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              <Divider sx={{ my: 1.25 }} />

              {/* Action Buttons: Excel, PDF, Print, CSV */}
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                alignItems="center"
                justifyContent="space-between"
              >
                <Typography variant="body2" color="text.secondary" fontWeight={500} sx={{ fontSize: '0.8125rem' }}>
                  Showing <b>{collectionList.length}</b> receipt(s)
                  {paymentModeFilter !== 'ALL' && (
                    <span>
                      {' '}for Mode: <b>{paymentModeFilter}</b>
                    </span>
                  )}
                  {' '}({dayjs(startDate).format('DD MMM YYYY')} – {dayjs(endDate).format('DD MMM YYYY')})
                </Typography>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {/* Excel (.xlsx) Download Button */}
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<ExcelIcon sx={{ fontSize: 16 }} />}
                    onClick={handleDownloadCollectionExcel}
                    disabled={!collectionList.length}
                    sx={{
                      bgcolor: '#107c41',
                      '&:hover': { bgcolor: '#0b5c30' },
                      fontWeight: 700,
                      textTransform: 'none',
                      borderRadius: 1.5,
                      fontSize: '0.8125rem',
                      py: 0.4,
                      px: 1.5,
                    }}
                  >
                    Export Excel (.xlsx)
                  </Button>

                  {/* PDF (.pdf) Direct Download Button */}
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<PdfIcon sx={{ fontSize: 16 }} />}
                    onClick={handleDownloadCollectionPdf}
                    disabled={!collectionList.length}
                    sx={{
                      bgcolor: '#d32f2f',
                      '&:hover': { bgcolor: '#b71c1c' },
                      fontWeight: 700,
                      textTransform: 'none',
                      borderRadius: 1.5,
                      fontSize: '0.8125rem',
                      py: 0.4,
                      px: 1.5,
                    }}
                  >
                    Export PDF (.pdf)
                  </Button>

                  {/* Print / Preview Register Button */}
                  <Button
                    size="small"
                    variant="outlined"
                    color="primary"
                    startIcon={<PrintIcon sx={{ fontSize: 16 }} />}
                    onClick={() => setIsCollectionPrintOpen(true)}
                    disabled={!collectionList.length}
                    sx={{
                      fontWeight: 600,
                      textTransform: 'none',
                      borderRadius: 1.5,
                      fontSize: '0.8125rem',
                      py: 0.4,
                      px: 1.5,
                    }}
                  >
                    Print Register
                  </Button>

                  {/* CSV Export Button */}
                  <Button
                    size="small"
                    variant="outlined"
                    color="inherit"
                    startIcon={<FileDownloadIcon sx={{ fontSize: 16 }} />}
                    onClick={handleExportCollectionCSV}
                    disabled={!collectionList.length}
                    sx={{
                      fontWeight: 600,
                      textTransform: 'none',
                      borderRadius: 1.5,
                      fontSize: '0.8125rem',
                      py: 0.4,
                      px: 1.5,
                    }}
                  >
                    CSV
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          {/* Collection Table */}
          <Card sx={{ boxShadow: 2, borderRadius: 2 }}>
            <CardContent sx={{ pb: 1 }}>
              {isLoadingCollection ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : collectionList.length > 0 ? (
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5, overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#f4f6f8' }}>
                      <TableRow>
                        <TableCell width={160}>
                          <b>Receipt No</b>
                        </TableCell>
                        <TableCell width={150}>
                          <b>Date & Time</b>
                        </TableCell>
                        <TableCell>
                          <b>Student Name</b>
                        </TableCell>
                        <TableCell width={120}>
                          <b>Class & Sec</b>
                        </TableCell>
                        <TableCell width={120}>
                          <b>Payment Mode</b>
                        </TableCell>
                        {/* Who collected the payment ("kisne payment liya wo chahiye") */}
                        <TableCell width={140}>
                          <b>Collected By</b>
                        </TableCell>
                        <TableCell align="right" width={110}>
                          <b>Total Paid</b>
                        </TableCell>
                        <TableCell width={95} align="center">
                          <b>Status</b>
                        </TableCell>
                        <TableCell width={90} align="right">
                          <b>Actions</b>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {collectionList.map((r) => (
                        <TableRow key={r.receiptId} hover sx={{ opacity: r.status === 2 ? 0.6 : 1 }}>
                          <TableCell>
                            <Typography variant="body2" fontWeight={700} color="primary.main" noWrap>
                              {r.receiptNo}
                            </Typography>
                          </TableCell>
                          <TableCell>{formatDateTime(r.receiptDate)}</TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {r.studentName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {r.admissionNo}
                            </Typography>
                          </TableCell>
                          <TableCell>{r.classSection}</TableCell>
                          <TableCell>
                            <Chip label={r.paymentModes} size="small" variant="outlined" />
                          </TableCell>
                          {/* Collected By Value */}
                          <TableCell>
                            <Stack direction="row" spacing={0.8} alignItems="center">
                              <PersonIcon sx={{ fontSize: 16, color: '#64748b' }} />
                              <Typography variant="body2" fontWeight={600} color="#334155">
                                {r.collectedBy || 'Cashier'}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={800} color="#0f172a">
                              ₹{Number(r.totalPaid).toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={r.status === 1 ? 'Paid' : 'Cancelled'}
                              color={r.status === 1 ? 'success' : 'error'}
                              size="small"
                              sx={{ fontWeight: 600, height: 22, fontSize: '0.72rem' }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                              <Tooltip title="Print Receipt">
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => handleOpenPrint(r.receiptId)}
                                >
                                  <PrintIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>

                              {can('FeeCollection', 'Delete') && r.status === 1 && (
                                <Tooltip title="Cancel Receipt (FR-5.7)">
                                  <IconButton size="small" color="error" onClick={() => handleOpenCancel(r)}>
                                    <CancelIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Summary Row */}
                      <TableRow sx={{ bgcolor: '#f8fafc', borderTop: '2px solid #cbd5e1' }}>
                        <TableCell colSpan={6}>
                          <Typography variant="subtitle2" fontWeight={800}>
                            Total Net Active Collection
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="subtitle2" fontWeight={800} color="success.main">
                            ₹{totalCollectedPeriod.toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell colSpan={2} />
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="info" variant="outlined">
                  No fee collection records found for the selected criteria.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Stack>
      )}

      {/* Tab 1: Defaulters List */}
      {activeTab === 1 && (
        <Stack spacing={1.5}>
          {/* Filter Bar & Export Toolbar Card */}
          <Card sx={{ boxShadow: 1, borderRadius: 2 }}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Grid container spacing={1.5} alignItems="center">
                <Grid item xs={12} sm={3}>
                  <AppSelect
                    label="Filter Class"
                    value={defaulterClassId}
                    onChange={(e) => {
                      setDefaulterClassId(e.target.value);
                      setDefaulterSectionId('');
                    }}
                    options={classes}
                    placeholder="All Classes"
                    showClear
                    addon="H"
                  />
                </Grid>

                <Grid item xs={12} sm={3}>
                  <AppSelect
                    label="Filter Section"
                    value={defaulterSectionId}
                    disabled={!defaulterClassId}
                    onChange={(e) => setDefaulterSectionId(e.target.value)}
                    options={defaulterSections}
                    placeholder="All Sections"
                    showClear
                    addon="H"
                  />
                </Grid>

                {/* Total Stats Mini Card */}
                <Grid item xs={12} sm={6}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1.5}
                    justifyContent="flex-end"
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                  >
                    <Paper
                      variant="outlined"
                      sx={{
                        py: 0.6,
                        px: 1.5,
                        bgcolor: '#fef2f2',
                        borderColor: '#fca5a5',
                        borderRadius: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        minHeight: 40,
                        boxSizing: 'border-box',
                        minWidth: 230,
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#991b1b', lineHeight: 1.2 }}>
                          Total Overdue
                        </Typography>
                        <Typography sx={{ fontSize: '0.68rem', color: '#b91c1c', lineHeight: 1.1 }}>
                          {defaultersList.length} Defaulter Student(s)
                        </Typography>
                      </Box>
                      <Typography sx={{ fontSize: '1.05rem', fontWeight: 800, color: '#b91c1c', lineHeight: 1, ml: 1.5 }}>
                        ₹{totalOverduePeriod.toLocaleString()}
                      </Typography>
                    </Paper>
                  </Stack>
                </Grid>
              </Grid>

              <Divider sx={{ my: 1.25 }} />

              {/* Action Buttons: Excel, PDF, Print, CSV */}
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                alignItems="center"
                justifyContent="space-between"
              >
                <Typography variant="body2" color="text.secondary" fontWeight={500} sx={{ fontSize: '0.8125rem' }}>
                  Showing <b>{defaultersList.length}</b> defaulter student(s){' '}
                  {defaulterClassId ? `in Class ${selectedDefaulterClass?.name}` : 'across all classes'}
                </Typography>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {/* Excel (.xlsx) Download Button */}
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<ExcelIcon sx={{ fontSize: 16 }} />}
                    onClick={handleDownloadDefaultersExcel}
                    disabled={!defaultersList.length}
                    sx={{
                      bgcolor: '#107c41',
                      '&:hover': { bgcolor: '#0b5c30' },
                      fontWeight: 700,
                      textTransform: 'none',
                      borderRadius: 1.5,
                      fontSize: '0.8125rem',
                      py: 0.4,
                      px: 1.5,
                    }}
                  >
                    Export Excel (.xlsx)
                  </Button>

                  {/* PDF (.pdf) Direct Download Button */}
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<PdfIcon sx={{ fontSize: 16 }} />}
                    onClick={handleDownloadDefaultersPdf}
                    disabled={!defaultersList.length}
                    sx={{
                      bgcolor: '#d32f2f',
                      '&:hover': { bgcolor: '#b71c1c' },
                      fontWeight: 700,
                      textTransform: 'none',
                      borderRadius: 1.5,
                      fontSize: '0.8125rem',
                      py: 0.4,
                      px: 1.5,
                    }}
                  >
                    Export PDF (.pdf)
                  </Button>

                  {/* Print / Preview Defaulters Button */}
                  <Button
                    size="small"
                    variant="outlined"
                    color="primary"
                    startIcon={<PrintIcon sx={{ fontSize: 16 }} />}
                    onClick={() => setIsDefaultersPrintOpen(true)}
                    disabled={!defaultersList.length}
                    sx={{
                      fontWeight: 600,
                      textTransform: 'none',
                      borderRadius: 1.5,
                      fontSize: '0.8125rem',
                      py: 0.4,
                      px: 1.5,
                    }}
                  >
                    Print Defaulters
                  </Button>

                  {/* CSV Export Button */}
                  <Button
                    size="small"
                    variant="outlined"
                    color="inherit"
                    startIcon={<FileDownloadIcon sx={{ fontSize: 16 }} />}
                    onClick={handleExportDefaultersCSV}
                    disabled={!defaultersList.length}
                    sx={{
                      fontWeight: 600,
                      textTransform: 'none',
                      borderRadius: 1.5,
                      fontSize: '0.8125rem',
                      py: 0.4,
                      px: 1.5,
                    }}
                  >
                    CSV
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          {/* Defaulters Table */}
          <Card sx={{ boxShadow: 2, borderRadius: 2 }}>
            <CardContent sx={{ pb: 1 }}>
              {isLoadingDefaulters ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : defaultersList.length > 0 ? (
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5, overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#f4f6f8' }}>
                      <TableRow>
                        <TableCell width={120}>
                          <b>Adm No</b>
                        </TableCell>
                        <TableCell>
                          <b>Student Name</b>
                        </TableCell>
                        <TableCell width={110}>
                          <b>Class</b>
                        </TableCell>
                        <TableCell width={170}>
                          <b>Guardian / Mobile</b>
                        </TableCell>
                        <TableCell width={180}>
                          <b>Overdue Installments</b>
                        </TableCell>
                        <TableCell align="right" width={110}>
                          <b>Fee Overdue</b>
                        </TableCell>
                        <TableCell align="right" width={100}>
                          <b>Late Fine</b>
                        </TableCell>
                        <TableCell align="right" width={120}>
                          <b>Total Due</b>
                        </TableCell>
                        <TableCell align="right" width={180}>
                          <b>Action</b>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {defaultersList.map((d) => (
                        <TableRow key={d.studentId} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={700} color="primary.main">
                              {d.admissionNo}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {d.studentName}
                            </Typography>
                          </TableCell>
                          <TableCell>{d.className} {d.sectionName}</TableCell>
                          <TableCell>
                            <Typography variant="body2">{d.guardianName || '—'}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {d.guardianMobile || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              {d.overdueInstallments || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            ₹{Number(d.overdueAmount).toLocaleString()}
                          </TableCell>
                          <TableCell align="right" sx={{ color: 'error.main', fontWeight: 600 }}>
                            ₹{Number(d.overdueFine).toLocaleString()}
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={800} color="error.dark">
                              ₹{Number(d.totalOverdue).toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <Button
                                size="small"
                                variant="outlined"
                                color="primary"
                                startIcon={<HistoryIcon fontSize="small" />}
                                onClick={() => handleOpenStudentHistory(d.studentId)}
                                sx={{ textTransform: 'none', py: 0.3 }}
                              >
                                History
                              </Button>
                              <Button
                                size="small"
                                variant="contained"
                                color="primary"
                                startIcon={<CollectIcon fontSize="small" />}
                                onClick={() => navigate(`/fees/collection?studentId=${d.studentId}`)}
                                sx={{ textTransform: 'none', py: 0.3 }}
                              >
                                Collect
                              </Button>
                              <Tooltip title="Send Fee Dues WhatsApp Reminder">
                                <Button
                                  size="small"
                                  variant="contained"
                                  startIcon={<WhatsAppIcon sx={{ fontSize: 15 }} />}
                                  onClick={() =>
                                    setWhatsAppModal({
                                      open: true,
                                      recipientName: d.guardianName || d.studentName,
                                      recipientMobile: d.guardianMobile || '',
                                      moduleKey: 'feeDemand',
                                      variables: {
                                        StudentName: d.studentName,
                                        AdmissionNo: d.admissionNo,
                                        TotalFee: String(d.totalOverdue),
                                        DueDate: dayjs().add(7, 'day').format('DD/MM/YYYY'),
                                        SchoolName: schoolName,
                                        GuardianName: d.guardianName || '',
                                      },
                                    })
                                  }
                                  sx={{
                                    textTransform: 'none',
                                    py: 0.3,
                                    bgcolor: '#16a34a',
                                    '&:hover': { bgcolor: '#15803d' },
                                    fontWeight: 600,
                                    color: '#ffffff',
                                  }}
                                >
                                  WhatsApp
                                </Button>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Summary Row */}
                      <TableRow sx={{ bgcolor: '#fef2f2', borderTop: '2px solid #fca5a5' }}>
                        <TableCell colSpan={5}>
                          <Typography variant="subtitle2" fontWeight={800} color="#991b1b">
                            Total Outstanding Dues
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="subtitle2" fontWeight={800}>
                            ₹{totalFeeOverdue.toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="subtitle2" fontWeight={800} color="error.main">
                            ₹{totalFineOverdue.toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="subtitle2" fontWeight={800} color="error.dark">
                            ₹{totalOverduePeriod.toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="success" variant="outlined">
                  No fee defaulters found! All dues are currently settled.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Stack>
      )}

      {/* Tab 2: Class & Month-wise Status Report */}
      {activeTab === 2 && (
        <Stack spacing={3}>
          {/* Filters & Export Toolbar */}
          <Card sx={{ boxShadow: 1, borderRadius: 2 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Grid container spacing={2} alignItems="center">
                {/* Class Filter */}
                <Grid item xs={12} sm={6} md={2.5}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Select Class"
                    value={statusClassId}
                    onChange={(e) => {
                      setStatusClassId(e.target.value);
                      setStatusSectionId('');
                    }}
                  >
                    <MenuItem value="">
                      <em>All Classes</em>
                    </MenuItem>
                    {classes.map((c) => (
                      <MenuItem key={c.id} value={c.id}>
                        {c.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                {/* Section Filter */}
                <Grid item xs={12} sm={6} md={2}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Select Section"
                    value={statusSectionId}
                    disabled={!statusClassId}
                    onChange={(e) => setStatusSectionId(e.target.value)}
                  >
                    <MenuItem value="">
                      <em>All Sections</em>
                    </MenuItem>
                    {statusSections.map((s) => (
                      <MenuItem key={s.id} value={s.id}>
                        {s.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                {/* Month / Installment Filter */}
                <Grid item xs={12} sm={6} md={2.5}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Month / Installment"
                    value={statusInstallmentId}
                    onChange={(e) => setStatusInstallmentId(e.target.value)}
                  >
                    <MenuItem value="">
                      <em>All Months / Full Year</em>
                    </MenuItem>
                    {installmentsList.map((inst) => (
                      <MenuItem key={inst.id} value={inst.id}>
                        {inst.name} ({dayjs(inst.dueDate).format('DD MMM')})
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                {/* Status Filter */}
                <Grid item xs={12} sm={6} md={2}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Payment Status"
                    value={statusDuesFilter}
                    onChange={(e) => setStatusDuesFilter(e.target.value)}
                  >
                    <MenuItem value="all">All Students</MenuItem>
                    <MenuItem value="dues">Pending Dues Only</MenuItem>
                    <MenuItem value="paid">Fully Paid</MenuItem>
                    <MenuItem value="partial">Partially Paid</MenuItem>
                  </TextField>
                </Grid>

                {/* Search Text */}
                <Grid item xs={12} sm={12} md={3}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search Name, Adm No, Roll..."
                    value={statusSearchText}
                    onChange={(e) => setStatusSearchText(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" color="action" />
                        </InputAdornment>
                      ),
                      endAdornment: statusSearchText ? (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setStatusSearchText('')}>
                            <ClearIcon fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      ) : null,
                    }}
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              {/* Sub-toolbar with student counts and Excel Export */}
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                alignItems="center"
                justifyContent="space-between"
              >
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  Showing <b>{classMonthStudents.length}</b> student record(s){' '}
                  {statusClassId ? `in ${selectedStatusClass?.name}` : 'across all classes'}
                  {statusInstallmentId && (
                    <>
                      {' '}
                      &bull; Month:{' '}
                      <b>{installmentsList.find((i) => String(i.id) === String(statusInstallmentId))?.name}</b>
                    </>
                  )}
                </Typography>

                <Stack direction="row" spacing={1} alignItems="center">
                  {(statusClassId || statusSectionId || statusInstallmentId || statusDuesFilter !== 'all' || statusSearchText) && (
                    <Button
                      size="small"
                      variant="text"
                      color="inherit"
                      onClick={() => {
                        setStatusClassId('');
                        setStatusSectionId('');
                        setStatusInstallmentId('');
                        setStatusDuesFilter('all');
                        setStatusSearchText('');
                      }}
                      sx={{ textTransform: 'none' }}
                    >
                      Clear Filters
                    </Button>
                  )}

                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<ExcelIcon />}
                    onClick={handleDownloadClassMonthExcel}
                    disabled={!classMonthStudents.length}
                    sx={{
                      bgcolor: '#16a34a',
                      '&:hover': { bgcolor: '#15803d' },
                      textTransform: 'none',
                      fontWeight: 700,
                    }}
                  >
                    Export to Excel (.xlsx)
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          {/* KPI Summary Cards Grid */}
          <Grid container spacing={2}>
            {/* Total Students */}
            <Grid item xs={12} sm={6} md={2}>
              <Card sx={{ p: 2, borderRadius: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', boxShadow: 0 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">
                  TOTAL STUDENTS
                </Typography>
                <Typography variant="h5" fontWeight={800} color="#0f172a" sx={{ my: 0.5 }}>
                  {classMonthSummary.totalStudents}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Paid: <strong style={{ color: '#16a34a' }}>{classMonthSummary.paidCount}</strong> | Due: <strong style={{ color: '#dc2626' }}>{classMonthSummary.unpaidCount + classMonthSummary.partialCount}</strong>
                </Typography>
              </Card>
            </Grid>

            {/* Gross Fee */}
            <Grid item xs={12} sm={6} md={2}>
              <Card sx={{ p: 2, borderRadius: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', boxShadow: 0 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">
                  GROSS FEE
                </Typography>
                <Typography variant="h5" fontWeight={800} color="#334155" sx={{ my: 0.5 }}>
                  ₹{Number(classMonthSummary.totalGrossFee || 0).toLocaleString()}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Full Catalog Fees
                </Typography>
              </Card>
            </Grid>

            {/* Total Concession */}
            <Grid item xs={12} sm={6} md={2}>
              <Card sx={{ p: 2, borderRadius: 2, bgcolor: '#fffbeb', border: '1px solid #fde68a', boxShadow: 0 }}>
                <Typography variant="caption" color="#b45309" fontWeight={700} display="block">
                  CONCESSION GIVEN
                </Typography>
                <Typography variant="h5" fontWeight={800} color="#b45309" sx={{ my: 0.5 }}>
                  ₹{Number(classMonthSummary.totalConcession || 0).toLocaleString()}
                </Typography>
                <Typography variant="caption" color="#92400e">
                  Scholarships & Siblings
                </Typography>
              </Card>
            </Grid>

            {/* Net Payable */}
            <Grid item xs={12} sm={6} md={2}>
              <Card sx={{ p: 2, borderRadius: 2, bgcolor: '#eff6ff', border: '1px solid #bfdbfe', boxShadow: 0 }}>
                <Typography variant="caption" color="#1d4ed8" fontWeight={700} display="block">
                  NET PAYABLE
                </Typography>
                <Typography variant="h5" fontWeight={800} color="#1d4ed8" sx={{ my: 0.5 }}>
                  ₹{Number(classMonthSummary.totalNetPayable || 0).toLocaleString()}
                </Typography>
                <Typography variant="caption" color="#1e40af">
                  After All Concessions
                </Typography>
              </Card>
            </Grid>

            {/* Collected Amount */}
            <Grid item xs={12} sm={6} md={2}>
              <Card sx={{ p: 2, borderRadius: 2, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', boxShadow: 0 }}>
                <Typography variant="caption" color="#15803d" fontWeight={700} display="block">
                  COLLECTED AMOUNT
                </Typography>
                <Typography variant="h5" fontWeight={800} color="#15803d" sx={{ my: 0.5 }}>
                  ₹{Number(classMonthSummary.totalPaid || 0).toLocaleString()}
                </Typography>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Chip
                    size="small"
                    label={`${classMonthSummary.collectionPercentage || 0}% Collected`}
                    sx={{
                      height: 18,
                      fontSize: 10,
                      fontWeight: 700,
                      bgcolor: '#dcfce7',
                      color: '#166534',
                    }}
                  />
                </Stack>
              </Card>
            </Grid>

            {/* Remaining Dues */}
            <Grid item xs={12} sm={6} md={2}>
              <Card sx={{ p: 2, borderRadius: 2, bgcolor: '#fef2f2', border: '1px solid #fecaca', boxShadow: 0 }}>
                <Typography variant="caption" color="#b91c1c" fontWeight={700} display="block">
                  REMAINING DUES
                </Typography>
                <Typography variant="h5" fontWeight={800} color="#b91c1c" sx={{ my: 0.5 }}>
                  ₹{Number(classMonthSummary.totalRemainingDues || 0).toLocaleString()}
                </Typography>
                <Typography variant="caption" color="#991b1b">
                  Outstanding Balance
                </Typography>
              </Card>
            </Grid>
          </Grid>

          {/* Students Status Data Table Card */}
          <Card sx={{ boxShadow: 1, borderRadius: 2 }}>
            <CardContent sx={{ p: 0 }}>
              {isLoadingClassMonth ? (
                <Box sx={{ p: 6, textAlign: 'center' }}>
                  <CircularProgress size={36} />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                    Loading class-wise fee status...
                  </Typography>
                </Box>
              ) : classMonthStudents.length > 0 ? (
                <TableContainer sx={{ maxHeight: 600 }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow sx={{ '& th': { bgcolor: '#f8fafc', fontWeight: 800, color: '#334155', py: 1.2 } }}>
                        <TableCell width={50}>#</TableCell>
                        <TableCell width={120}>Adm No</TableCell>
                        <TableCell width={70}>Roll</TableCell>
                        <TableCell width={200}>Student Name</TableCell>
                        <TableCell width={130}>Class & Sec</TableCell>
                        <TableCell align="right" width={110}>Gross Fee</TableCell>
                        <TableCell align="right" width={100}>Concession</TableCell>
                        <TableCell align="right" width={110}>Net Payable</TableCell>
                        <TableCell align="right" width={110}>Amount Paid</TableCell>
                        <TableCell align="right" width={130}>Remaining Due</TableCell>
                        <TableCell align="center" width={110}>Status</TableCell>
                        <TableCell width={150}>Last Payment</TableCell>
                        <TableCell align="right" width={180}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {classMonthStudents.map((s, idx) => (
                        <TableRow key={s.studentId} hover sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                          <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>
                            {idx + 1}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={700} color="primary.main">
                              {s.admissionNo}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {s.rollNo || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={1.2} alignItems="center">
                              <Avatar
                                src={s.photoUrl}
                                sx={{ width: 28, height: 28, fontSize: 12, bgcolor: '#e0e7ff', color: '#3730a3', fontWeight: 700 }}
                              >
                                {s.studentName ? s.studentName.charAt(0).toUpperCase() : 'S'}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" fontWeight={700} color="#0f172a">
                                  {s.studentName}
                                </Typography>
                                {s.guardianMobile && (
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    {s.guardianMobile}
                                  </Typography>
                                )}
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={`${s.className} ${s.sectionName || ''}`.trim()}
                              size="small"
                              sx={{ fontWeight: 600, fontSize: 11, height: 22, bgcolor: '#f1f5f9' }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            ₹{Number(s.grossFee || 0).toLocaleString()}
                          </TableCell>
                          <TableCell align="right" sx={{ color: s.concessionAmount > 0 ? '#b45309' : 'text.secondary', fontWeight: s.concessionAmount > 0 ? 700 : 400 }}>
                            {s.concessionAmount > 0 ? `₹${Number(s.concessionAmount).toLocaleString()}` : '—'}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>
                            ₹{Number(s.netPayable || 0).toLocaleString()}
                          </TableCell>
                          <TableCell align="right" sx={{ color: '#16a34a', fontWeight: 700 }}>
                            ₹{Number(s.paidAmount || 0).toLocaleString()}
                          </TableCell>
                          <TableCell align="right">
                            {s.remainingDue > 0 ? (
                              <Typography variant="body2" fontWeight={800} color="#dc2626">
                                ₹{Number(s.remainingDue).toLocaleString()}
                              </Typography>
                            ) : (
                              <Chip
                                label="₹0 (Cleared)"
                                size="small"
                                color="success"
                                variant="outlined"
                                sx={{ height: 22, fontSize: 11, fontWeight: 700 }}
                              />
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              size="small"
                              label={s.status}
                              color={
                                s.status === 'Paid'
                                  ? 'success'
                                  : s.status === 'Partial'
                                  ? 'warning'
                                  : 'error'
                              }
                              sx={{ fontWeight: 700, height: 22, fontSize: 11 }}
                            />
                          </TableCell>
                          <TableCell>
                            {s.lastPaymentDate ? (
                              <Box>
                                <Typography variant="caption" fontWeight={600} display="block">
                                  {dayjs(s.lastPaymentDate).format('DD MMM YYYY')}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {s.lastReceiptNo}
                                </Typography>
                              </Box>
                            ) : (
                              <Typography variant="caption" color="text.secondary">
                                No Payments
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <Tooltip title="View Complete Fee Breakdown & Payment History">
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="primary"
                                  startIcon={<HistoryIcon fontSize="small" />}
                                  onClick={() => handleOpenStudentHistory(s.studentId)}
                                  sx={{ textTransform: 'none', py: 0.3, px: 1, fontSize: 12 }}
                                >
                                  History
                                </Button>
                              </Tooltip>
                              <Button
                                size="small"
                                variant="contained"
                                color="primary"
                                startIcon={<CollectIcon fontSize="small" />}
                                onClick={() => navigate(`/fees/collection?studentId=${s.studentId}`)}
                                sx={{ textTransform: 'none', py: 0.3, px: 1, fontSize: 12 }}
                              >
                                Collect
                              </Button>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}

                      {/* Summary Grand Totals Row */}
                      <TableRow sx={{ bgcolor: '#f8fafc', borderTop: '2px solid #cbd5e1' }}>
                        <TableCell colSpan={5}>
                          <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                            Grand Totals ({classMonthStudents.length} Students)
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="subtitle2" fontWeight={800}>
                            ₹{Number(classMonthSummary.totalGrossFee || 0).toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="subtitle2" fontWeight={800} color="#b45309">
                            ₹{Number(classMonthSummary.totalConcession || 0).toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="subtitle2" fontWeight={800} color="#1d4ed8">
                            ₹{Number(classMonthSummary.totalNetPayable || 0).toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="subtitle2" fontWeight={800} color="#16a34a">
                            ₹{Number(classMonthSummary.totalPaid || 0).toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="subtitle2" fontWeight={800} color="#dc2626">
                            ₹{Number(classMonthSummary.totalRemainingDues || 0).toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell colSpan={3} />
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box sx={{ p: 4 }}>
                  <Alert severity="info" variant="outlined">
                    No students found matching your filters. Try selecting a different class, section, or clear search text.
                  </Alert>
                </Box>
              )}
            </CardContent>
          </Card>
        </Stack>
      )}

      {/* Tab 3: Direct Student Fee History & Ledger */}
      {activeTab === 3 && (
        <Stack spacing={3}>
          {/* Student Search Box Card */}
          <Card sx={{ boxShadow: 1, borderRadius: 2, overflow: 'visible', position: 'relative', zIndex: 100 }}>
            <CardContent sx={{ p: 2.5, overflow: 'visible' }}>
              <Typography variant="subtitle1" fontWeight={800} color="#0f172a" sx={{ mb: 0.5 }}>
                Search Student Fee History & Ledger
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Search any student by Admission Number, Student Name, Roll Number, or Guardian Mobile to view their complete 12-month fee breakdown, head-wise dues, concessions, and printable payment receipts.
              </Typography>

              <ClickAwayListener onClickAway={() => setIsDirectDropdownOpen(false)}>
                <Box sx={{ position: 'relative', maxWidth: 600, zIndex: 110 }}>
                  <TextField
                    fullWidth
                    placeholder="Type student name, admission no, roll no..."
                    value={directSearchTerm}
                    onFocus={() => setIsDirectDropdownOpen(true)}
                    onClick={() => setIsDirectDropdownOpen(true)}
                    onChange={(e) => {
                      setDirectSearchTerm(e.target.value);
                      setIsDirectDropdownOpen(true);
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon color="primary" />
                        </InputAdornment>
                      ),
                      endAdornment: directSearchTerm ? (
                        <InputAdornment position="end">
                          {isSearchingDirect ? (
                            <CircularProgress size={20} />
                          ) : (
                            <IconButton
                              size="small"
                              onClick={() => {
                                setDirectSearchTerm('');
                                setIsDirectDropdownOpen(false);
                              }}
                            >
                              <ClearIcon fontSize="small" />
                            </IconButton>
                          )}
                        </InputAdornment>
                      ) : null,
                    }}
                  />

                  {/* Instant Search Dropdown Results */}
                  {isDirectDropdownOpen && directSearchTerm.trim().length >= 2 && directSearchResults.length > 0 && (
                    <Paper
                      elevation={8}
                      sx={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        zIndex: 1500,
                        mt: 0.5,
                        boxShadow: '0 12px 30px rgba(15, 23, 42, 0.25)',
                        border: '1px solid #7ea8f8',
                        borderRadius: 1.5,
                        maxHeight: 320,
                        overflowY: 'auto',
                        bgcolor: '#ffffff',
                      }}
                    >
                      {directSearchResults.map((st) => (
                        <Box
                          key={st.id}
                          onClick={() => {
                            setSelectedDirectStudentId(st.id);
                            setDirectSearchTerm('');
                            setIsDirectDropdownOpen(false);
                          }}
                          sx={{
                            p: 1.5,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderBottom: '1px solid #f1f5f9',
                            '&:hover': { bgcolor: '#eff6ff' },
                          }}
                        >
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Avatar sx={{ width: 34, height: 34, bgcolor: '#eff6ff', color: '#2563eb', fontWeight: 700, fontSize: 13 }}>
                              {st.fullName ? st.fullName.charAt(0).toUpperCase() : 'S'}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight={700}>
                                {st.fullName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Adm No: <b>{st.admissionNo}</b> &bull; Class: <b>{st.className || '—'} {st.sectionName || ''}</b>
                                {st.guardianMobile && ` • Mobile: ${st.guardianMobile}`}
                              </Typography>
                            </Box>
                          </Stack>
                          <Button size="small" variant="outlined" sx={{ textTransform: 'none', py: 0.2 }}>
                            View History
                          </Button>
                        </Box>
                      ))}
                    </Paper>
                  )}
                </Box>
              </ClickAwayListener>
            </CardContent>
          </Card>

          {/* Selected Student Ledger View */}
          {selectedDirectStudentId && (
            <>
              {isLoadingDirectHistory ? (
                <Box sx={{ p: 6, textAlign: 'center' }}>
                  <CircularProgress size={36} />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                    Loading student fee history & ledger...
                  </Typography>
                </Box>
              ) : directStudentHistory ? (
                <Stack spacing={3}>
                  {/* Student Profile Card */}
                  <Card sx={{ p: 2.5, borderRadius: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', boxShadow: 1 }}>
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={2}
                      justifyContent="space-between"
                      alignItems={{ xs: 'flex-start', sm: 'center' }}
                    >
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar
                          src={directStudentHistory.photoUrl}
                          sx={{
                            width: 56,
                            height: 56,
                            bgcolor: '#eff6ff',
                            color: '#2563eb',
                            fontWeight: 800,
                            fontSize: 20,
                            border: '2px solid #bfdbfe',
                          }}
                        >
                          {directStudentHistory.studentName?.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="h6" fontWeight={800} color="#0f172a">
                              {directStudentHistory.studentName}
                            </Typography>
                            <Chip label={directStudentHistory.admissionNo} size="small" color="primary" sx={{ fontWeight: 700 }} />
                            {directStudentHistory.rollNo && (
                              <Chip label={`Roll: ${directStudentHistory.rollNo}`} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                            )}
                          </Stack>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
                            Class: <b>{directStudentHistory.className} {directStudentHistory.sectionName}</b> &bull; Guardian:{' '}
                            <b>{directStudentHistory.guardianName || '—'}</b> ({directStudentHistory.guardianMobile || '—'})
                          </Typography>
                        </Box>
                      </Stack>

                      <Stack direction="row" spacing={1.5}>
                        <Button
                          variant="outlined"
                          color="inherit"
                          onClick={() => setSelectedDirectStudentId(null)}
                          sx={{ textTransform: 'none' }}
                        >
                          Change Student
                        </Button>
                        <Button
                          variant="contained"
                          color="primary"
                          startIcon={<CollectIcon />}
                          onClick={() => navigate(`/fees/collection?studentId=${directStudentHistory.studentId || selectedDirectStudentId}`)}
                          sx={{ textTransform: 'none', fontWeight: 700 }}
                        >
                          Collect Fee
                        </Button>
                      </Stack>
                    </Stack>
                  </Card>

                  {/* 5 Financial Overview Metric Cards */}
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={2.4}>
                      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#f8fafc', borderColor: '#e2e8f0' }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">
                          TOTAL ANNUAL FEE
                        </Typography>
                        <Typography variant="h5" fontWeight={800} color="#334155" sx={{ my: 0.5 }}>
                          ₹{Number(directStudentHistory.totalAnnualFee ?? directStudentHistory.totalGrossFee ?? 0).toLocaleString()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">Gross Structure</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6} md={2.4}>
                      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#fffbeb', borderColor: '#fde68a' }}>
                        <Typography variant="caption" color="#b45309" fontWeight={700} display="block">
                          CONCESSION GRANTED
                        </Typography>
                        <Typography variant="h5" fontWeight={800} color="#b45309" sx={{ my: 0.5 }}>
                          ₹{Number(directStudentHistory.totalAnnualConcession ?? directStudentHistory.totalConcession ?? 0).toLocaleString()}
                        </Typography>
                        <Typography variant="caption" color="#92400e">Discount / Scholarship</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6} md={2.4}>
                      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#eff6ff', borderColor: '#bfdbfe' }}>
                        <Typography variant="caption" color="#1d4ed8" fontWeight={700} display="block">
                          NET PAYABLE
                        </Typography>
                        <Typography variant="h5" fontWeight={800} color="#1d4ed8" sx={{ my: 0.5 }}>
                          ₹{Number(directStudentHistory.netAnnualPayable ?? directStudentHistory.totalNetPayable ?? 0).toLocaleString()}
                        </Typography>
                        <Typography variant="caption" color="#1e40af">Applicable Total</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6} md={2.4}>
                      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#f0fdf4', borderColor: '#bbf7d0' }}>
                        <Typography variant="caption" color="#15803d" fontWeight={700} display="block">
                          TOTAL PAID
                        </Typography>
                        <Typography variant="h5" fontWeight={800} color="#15803d" sx={{ my: 0.5 }}>
                          ₹{Number(directStudentHistory.totalAnnualPaid ?? directStudentHistory.totalPaid ?? 0).toLocaleString()}
                        </Typography>
                        <Typography variant="caption" color="#166534">Collected so far</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6} md={2.4}>
                      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#fef2f2', borderColor: '#fecaca' }}>
                        <Typography variant="caption" color="#b91c1c" fontWeight={700} display="block">
                          BALANCE DUE
                        </Typography>
                        <Typography variant="h5" fontWeight={800} color="#b91c1c" sx={{ my: 0.5 }}>
                          ₹{Number(directStudentHistory.totalOutstandingDues ?? directStudentHistory.totalBalanceDue ?? 0).toLocaleString()}
                        </Typography>
                        <Typography variant="caption" color="#991b1b">
                          {Number(directStudentHistory.totalFine || 0) > 0
                            ? `+ ₹${Number(directStudentHistory.totalFine).toLocaleString()} Fine`
                            : 'Remaining Outstanding'}
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>

                  {/* Sub-tabs for Installment Breakdown vs Receipts Log */}
                  <Card sx={{ boxShadow: 1, borderRadius: 2 }}>
                    <Tabs
                      value={directHistorySubTab}
                      onChange={(e, v) => setDirectHistorySubTab(v)}
                      sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
                    >
                      <Tab
                        icon={<CalendarMonthIcon fontSize="small" />}
                        iconPosition="start"
                        label={`Academic Installments (${directStudentHistory.installments?.length || 0})`}
                      />
                      <Tab
                        icon={<ReceiptLongIcon fontSize="small" />}
                        iconPosition="start"
                        label={`Payment Receipts (${directStudentHistory.receipts?.length || 0})`}
                      />
                    </Tabs>

                    {/* Sub-tab 0: Installments Table */}
                    {directHistorySubTab === 0 && (
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ '& th': { bgcolor: '#f8fafc', fontWeight: 800, color: '#334155' } }}>
                              <TableCell width={160}>Installment / Month</TableCell>
                              <TableCell width={110}>Due Date</TableCell>
                              <TableCell>Fee Heads Breakdown</TableCell>
                              <TableCell align="right" width={110}>Gross Fee</TableCell>
                              <TableCell align="right" width={110}>Concession</TableCell>
                              <TableCell align="right" width={110}>Net Payable</TableCell>
                              <TableCell align="right" width={110}>Paid</TableCell>
                              <TableCell align="right" width={120}>Balance Due</TableCell>
                              <TableCell align="center" width={100}>Status</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {directStudentHistory.installments?.map((inst) => (
                              <TableRow key={inst.installmentId} hover>
                                <TableCell>
                                  <Typography variant="body2" fontWeight={700}>
                                    {inst.installmentName}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="caption" color="text.secondary">
                                    {dayjs(inst.dueDate).format('DD MMM YYYY')}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
                                    {(inst.feeHeads || inst.heads || [])?.map((h) => {
                                      const isPaidHead = Number(h.balanceAmount || 0) <= 0;
                                      const origAmount = Number(h.originalAmount || 0).toLocaleString();
                                      const paidAmount = Number(h.paidAmount || 0).toLocaleString();
                                      return (
                                        <Chip
                                          key={h.dueId || h.feeHeadId || h.headId}
                                          label={`${h.feeHeadName || h.headName}: ₹${
                                            isPaidHead ? `${origAmount} (Paid)` : `${paidAmount}/${origAmount}`
                                          }`}
                                          size="small"
                                          variant={isPaidHead ? 'outlined' : 'filled'}
                                          color={isPaidHead ? 'success' : 'default'}
                                          sx={{ height: 22, fontSize: 11 }}
                                        />
                                      );
                                    })}
                                  </Stack>
                                </TableCell>
                                <TableCell align="right">
                                  ₹{Number(inst.totalOriginal ?? inst.grossFee ?? 0).toLocaleString()}
                                </TableCell>
                                <TableCell
                                  align="right"
                                  sx={{
                                    color:
                                      Number(inst.totalConcession ?? inst.concessionAmount ?? 0) > 0
                                        ? '#b45309'
                                        : 'text.secondary',
                                  }}
                                >
                                  {Number(inst.totalConcession ?? inst.concessionAmount ?? 0) > 0
                                    ? `₹${Number(inst.totalConcession ?? inst.concessionAmount).toLocaleString()}`
                                    : '—'}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600 }}>
                                  ₹{Number(inst.netPayable ?? 0).toLocaleString()}
                                </TableCell>
                                <TableCell align="right" sx={{ color: '#16a34a', fontWeight: 700 }}>
                                  ₹{Number(inst.totalPaid ?? inst.paidAmount ?? 0).toLocaleString()}
                                </TableCell>
                                <TableCell align="right">
                                  {Number(inst.balanceDue ?? 0) > 0 ? (
                                    <Typography variant="body2" fontWeight={800} color="#dc2626">
                                      ₹{Number(inst.balanceDue).toLocaleString()}
                                    </Typography>
                                  ) : (
                                    <Chip label="Cleared" size="small" color="success" variant="outlined" sx={{ height: 20, fontSize: 10, fontWeight: 700 }} />
                                  )}
                                </TableCell>
                                <TableCell align="center">
                                  <Chip
                                    size="small"
                                    label={inst.status}
                                    color={inst.status === 'Paid' ? 'success' : inst.status === 'Partial' ? 'warning' : 'error'}
                                    sx={{ fontWeight: 700, height: 22, fontSize: 11 }}
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}

                    {/* Sub-tab 1: Receipts Log */}
                    {directHistorySubTab === 1 && (
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ '& th': { bgcolor: '#f8fafc', fontWeight: 800, color: '#334155' } }}>
                              <TableCell width={150}>Receipt No</TableCell>
                              <TableCell width={160}>Date & Time</TableCell>
                              <TableCell width={180}>Payment Mode(s)</TableCell>
                              <TableCell width={160}>Collected By</TableCell>
                              <TableCell align="center" width={110}>Status</TableCell>
                              <TableCell align="right" width={140}>Total Paid</TableCell>
                              <TableCell align="right" width={140}>Action</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {directStudentHistory.receipts?.length > 0 ? (
                              directStudentHistory.receipts.map((r) => {
                                const isValid = r.status === 'Paid' || r.status === 1 || r.status === 'Valid';
                                return (
                                  <TableRow key={r.receiptId} hover>
                                    <TableCell>
                                      <Typography variant="body2" fontWeight={700} color="primary.main">
                                        {r.receiptNo}
                                      </Typography>
                                    </TableCell>
                                    <TableCell>
                                      <Typography variant="caption" color="text.secondary">
                                        {formatDateTime(r.receiptDate)}
                                      </Typography>
                                    </TableCell>
                                    <TableCell>
                                      <Chip label={r.paymentModes || 'Cash'} size="small" sx={{ fontWeight: 600, height: 22, fontSize: 11 }} />
                                    </TableCell>
                                    <TableCell>
                                      <Typography variant="body2">{r.collectedBy || 'Cashier'}</Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                      <Chip
                                        size="small"
                                        label={isValid ? 'Paid' : 'Cancelled'}
                                        color={isValid ? 'success' : 'error'}
                                        sx={{ fontWeight: 700, height: 22, fontSize: 11 }}
                                      />
                                    </TableCell>
                                    <TableCell align="right">
                                      <Typography variant="body2" fontWeight={800} color={isValid ? '#15803d' : '#94a3b8'}>
                                        ₹{Number(r.totalPaid || 0).toLocaleString()}
                                      </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={<PrintIcon fontSize="small" />}
                                        onClick={() => handleOpenPrint(r.receiptId)}
                                        sx={{ textTransform: 'none', py: 0.3 }}
                                      >
                                        Print Slip
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                );
                              })
                            ) : (
                              <TableRow>
                                <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                                  <Typography variant="body2" color="text.secondary">
                                    No payment receipts recorded for this student yet.
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </Card>
                </Stack>
              ) : null}
            </>
          )}

          {!selectedDirectStudentId && (
            <Card sx={{ p: 4, textAlign: 'center', bgcolor: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 2 }}>
              <SchoolIcon color="disabled" sx={{ fontSize: 48, mb: 1 }} />
              <Typography variant="h6" fontWeight={700} color="text.secondary">
                No Student Selected
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 450, mx: 'auto', mt: 0.5 }}>
                Please use the search box above to find any student and see their full fee history, individual monthly fee heads, concessions, and printable payment receipts.
              </Typography>
            </Card>
          )}
        </Stack>
      )}

      {/* Tab 4 (Report 5): Date-wise Collection & Summary Report */}
      {activeTab === 4 && (
        <Stack spacing={2}>
          {/* Filters & Export Toolbar Card */}
          <Card sx={{ boxShadow: 1, borderRadius: 2 }}>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: 2 } }}>
              {/* Header Title */}
              <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                    <AssessmentIcon sx={{ fontSize: 18 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                      Date-wise Fee Collection & Multi-dimensional Summary
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Date-wise audit trail with receipt number ranges (from – to), discount, net collection & mode-wise breakdowns.
                    </Typography>
                  </Box>
                </Box>
                {/* Date Presets */}
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                  <Button size="small" variant="outlined" onClick={() => handleDatePreset('today')} sx={{ py: 0.2, px: 1, fontSize: '0.75rem', textTransform: 'none', borderRadius: 1.5 }}>
                    Today
                  </Button>
                  <Button size="small" variant="outlined" onClick={() => handleDatePreset('yesterday')} sx={{ py: 0.2, px: 1, fontSize: '0.75rem', textTransform: 'none', borderRadius: 1.5 }}>
                    Yesterday
                  </Button>
                  <Button size="small" variant="outlined" onClick={() => handleDatePreset('week')} sx={{ py: 0.2, px: 1, fontSize: '0.75rem', textTransform: 'none', borderRadius: 1.5 }}>
                    This Week
                  </Button>
                  <Button size="small" variant="outlined" onClick={() => handleDatePreset('month')} sx={{ py: 0.2, px: 1, fontSize: '0.75rem', textTransform: 'none', borderRadius: 1.5 }}>
                    This Month
                  </Button>
                  <Button size="small" variant="outlined" onClick={() => handleDatePreset('lastMonth')} sx={{ py: 0.2, px: 1, fontSize: '0.75rem', textTransform: 'none', borderRadius: 1.5 }}>
                    Last Month
                  </Button>
                  <Button size="small" variant="text" color="error" startIcon={<FilterAltOffIcon sx={{ fontSize: 14 }} />} onClick={handleResetDateWiseFilters} sx={{ py: 0.2, px: 1, fontSize: '0.75rem', textTransform: 'none' }}>
                    Reset
                  </Button>
                </Stack>
              </Box>

              <Divider sx={{ my: 1.5 }} />

              {/* Filters Row */}
              <Grid container spacing={1.5} alignItems="center">
                {/* 1. From Date */}
                <Grid item xs={12} sm={6} md={2.4}>
                  <AppDatePicker
                    label="From Date"
                    value={dateWiseStartDate}
                    onChange={(e) => {
                      if (e.value) {
                        setDateWiseStartDate(dayjs(e.value).format('YYYY-MM-DD'));
                      }
                    }}
                    dateFormat="dd/M/yy"
                    maxDate={dateWiseEndDate ? new Date(dateWiseEndDate) : undefined}
                  />
                </Grid>

                {/* 2. To Date */}
                <Grid item xs={12} sm={6} md={2.4}>
                  <AppDatePicker
                    label="To Date"
                    value={dateWiseEndDate}
                    onChange={(e) => {
                      if (e.value) {
                        setDateWiseEndDate(dayjs(e.value).format('YYYY-MM-DD'));
                      }
                    }}
                    dateFormat="dd/M/yy"
                    minDate={dateWiseStartDate ? new Date(dateWiseStartDate) : undefined}
                  />
                </Grid>

                {/* 3. Class Multi-select */}
                <Grid item xs={12} sm={6} md={2.4}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="dw-class-select-label">Class (Multi-select)</InputLabel>
                    <Select
                      labelId="dw-class-select-label"
                      multiple
                      value={selectedDateWiseClasses}
                      onChange={handleClassesChange}
                      input={<OutlinedInput label="Class (Multi-select)" />}
                      renderValue={(selected) => {
                        if (selected.length === 0) {
                          return <Typography variant="body2" color="text.secondary">All Classes</Typography>;
                        }
                        if (selected.length === classes.length && classes.length > 0) {
                          return <Chip size="small" label="All Classes" color="primary" sx={{ height: 22, fontSize: '0.75rem', fontWeight: 700 }} />;
                        }
                        if (selected.length <= 2) {
                          return (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {selected.map((val) => {
                                const cls = classes.find((c) => c.id === val);
                                return <Chip key={val} size="small" label={cls?.name || val} sx={{ height: 22, fontSize: '0.75rem' }} />;
                              })}
                            </Box>
                          );
                        }
                        return <Chip size="small" label={`${selected.length} Classes`} color="primary" sx={{ height: 22, fontSize: '0.75rem', fontWeight: 700 }} />;
                      }}
                    >
                      <MenuItem value="ALL" sx={{ bgcolor: classes.length > 0 && selectedDateWiseClasses.length === classes.length ? '#eff6ff' : 'inherit' }}>
                        <Checkbox
                          checked={classes.length > 0 && selectedDateWiseClasses.length === classes.length}
                          indeterminate={selectedDateWiseClasses.length > 0 && selectedDateWiseClasses.length < classes.length}
                          size="small"
                        />
                        <ListItemText primary={<Typography variant="body2" fontWeight={700}>Select All Classes</Typography>} />
                      </MenuItem>
                      <Divider />
                      {classes.map((cls) => (
                        <MenuItem key={cls.id} value={cls.id}>
                          <Checkbox checked={selectedDateWiseClasses.includes(cls.id)} size="small" />
                          <ListItemText primary={cls.name} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* 4. Payment Mode Multi-select */}
                <Grid item xs={12} sm={6} md={2.4}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="dw-mode-select-label">Payment Mode (Multi-select)</InputLabel>
                    <Select
                      labelId="dw-mode-select-label"
                      multiple
                      value={selectedDateWiseModes}
                      onChange={handleModesChange}
                      input={<OutlinedInput label="Payment Mode (Multi-select)" />}
                      renderValue={(selected) => {
                        if (selected.length === 0) {
                          return <Typography variant="body2" color="text.secondary">All Payment Modes</Typography>;
                        }
                        if (selected.length === DATEWISE_PAYMENT_MODES.length) {
                          return <Chip size="small" label="All Modes" color="secondary" sx={{ height: 22, fontSize: '0.75rem', fontWeight: 700 }} />;
                        }
                        if (selected.length <= 2) {
                          return (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {selected.map((val) => (
                                <Chip key={val} size="small" label={val} sx={{ height: 22, fontSize: '0.75rem' }} />
                              ))}
                            </Box>
                          );
                        }
                        return <Chip size="small" label={`${selected.length} Modes`} color="secondary" sx={{ height: 22, fontSize: '0.75rem', fontWeight: 700 }} />;
                      }}
                    >
                      <MenuItem value="ALL" sx={{ bgcolor: selectedDateWiseModes.length === DATEWISE_PAYMENT_MODES.length ? '#fdf4ff' : 'inherit' }}>
                        <Checkbox
                          checked={selectedDateWiseModes.length === DATEWISE_PAYMENT_MODES.length}
                          indeterminate={selectedDateWiseModes.length > 0 && selectedDateWiseModes.length < DATEWISE_PAYMENT_MODES.length}
                          size="small"
                        />
                        <ListItemText primary={<Typography variant="body2" fontWeight={700}>Select All Modes</Typography>} />
                      </MenuItem>
                      <Divider />
                      {DATEWISE_PAYMENT_MODES.map((mode) => (
                        <MenuItem key={mode.value} value={mode.value}>
                          <Checkbox checked={selectedDateWiseModes.includes(mode.value)} size="small" />
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: mode.color, mr: 1 }} />
                          <ListItemText primary={mode.label} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* 5. User / Cashier Multi-select ("kisne fee liya hai") */}
                <Grid item xs={12} sm={6} md={2.4}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="dw-user-select-label">Cashier / User (Multi-select)</InputLabel>
                    <Select
                      labelId="dw-user-select-label"
                      multiple
                      value={selectedDateWiseUsers}
                      onChange={handleUsersChange}
                      input={<OutlinedInput label="Cashier / User (Multi-select)" />}
                      renderValue={(selected) => {
                        if (selected.length === 0) {
                          return <Typography variant="body2" color="text.secondary">All Cashiers / Users</Typography>;
                        }
                        if (selected.length === availableDateWiseCashiers.length && availableDateWiseCashiers.length > 0) {
                          return <Chip size="small" label="All Cashiers" color="info" sx={{ height: 22, fontSize: '0.75rem', fontWeight: 700 }} />;
                        }
                        if (selected.length <= 2) {
                          return (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {selected.map((val) => (
                                <Chip key={val} size="small" label={val} sx={{ height: 22, fontSize: '0.75rem' }} />
                              ))}
                            </Box>
                          );
                        }
                        return <Chip size="small" label={`${selected.length} Cashiers`} color="info" sx={{ height: 22, fontSize: '0.75rem', fontWeight: 700 }} />;
                      }}
                    >
                      <MenuItem value="ALL" sx={{ bgcolor: availableDateWiseCashiers.length > 0 && selectedDateWiseUsers.length === availableDateWiseCashiers.length ? '#f5f3ff' : 'inherit' }}>
                        <Checkbox
                          checked={availableDateWiseCashiers.length > 0 && selectedDateWiseUsers.length === availableDateWiseCashiers.length}
                          indeterminate={selectedDateWiseUsers.length > 0 && selectedDateWiseUsers.length < availableDateWiseCashiers.length}
                          size="small"
                        />
                        <ListItemText primary={<Typography variant="body2" fontWeight={700}>Select All Cashiers / Users</Typography>} />
                      </MenuItem>
                      <Divider />
                      {availableDateWiseCashiers.map((cashier) => (
                        <MenuItem key={cashier} value={cashier}>
                          <Checkbox checked={selectedDateWiseUsers.includes(cashier)} size="small" />
                          <ListItemText primary={cashier} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <Divider sx={{ my: 1.5 }} />

              {/* Action Toolbar: Counts, Excel, PDF, Print Register */}
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                alignItems="center"
                justifyContent="space-between"
              >
                <Typography variant="body2" color="text.secondary" fontWeight={500} sx={{ fontSize: '0.8125rem' }}>
                  Showing <b>{dateWiseGroups.length}</b> day(s) / <b>{dateWiseSummary.totalReceipts}</b> receipt(s)
                  {selectedDateWiseClasses.length > 0 && (
                    <span> &bull; <b>{selectedDateWiseClasses.length}</b> class(es)</span>
                  )}
                  {selectedDateWiseModes.length > 0 && (
                    <span> &bull; <b>{selectedDateWiseModes.length}</b> mode(s)</span>
                  )}
                  {selectedDateWiseUsers.length > 0 && (
                    <span> &bull; <b>{selectedDateWiseUsers.length}</b> cashier(s)</span>
                  )}
                  {' '}({dayjs(dateWiseStartDate).format('DD MMM YYYY')} – {dayjs(dateWiseEndDate).format('DD MMM YYYY')})
                </Typography>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {/* Export Excel */}
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<ExcelIcon sx={{ fontSize: 16 }} />}
                    onClick={handleDownloadDateWiseExcel}
                    disabled={!dateWiseGroups.length}
                    sx={{
                      bgcolor: '#107c41',
                      '&:hover': { bgcolor: '#0b5c30' },
                      fontWeight: 700,
                      textTransform: 'none',
                      borderRadius: 1.5,
                      fontSize: '0.8125rem',
                      py: 0.4,
                      px: 1.5,
                    }}
                  >
                    Export Excel (.xlsx)
                  </Button>

                  {/* Export PDF */}
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<PdfIcon sx={{ fontSize: 16 }} />}
                    onClick={handleDownloadDateWisePdf}
                    disabled={!dateWiseGroups.length}
                    sx={{
                      bgcolor: '#d32f2f',
                      '&:hover': { bgcolor: '#b71c1c' },
                      fontWeight: 700,
                      textTransform: 'none',
                      borderRadius: 1.5,
                      fontSize: '0.8125rem',
                      py: 0.4,
                      px: 1.5,
                    }}
                  >
                    Export PDF (.pdf)
                  </Button>

                  {/* Print Register */}
                  <Button
                    size="small"
                    variant="outlined"
                    color="primary"
                    startIcon={<PrintIcon sx={{ fontSize: 16 }} />}
                    onClick={() => setIsDateWisePrintOpen(true)}
                    disabled={!dateWiseGroups.length}
                    sx={{
                      fontWeight: 600,
                      textTransform: 'none',
                      borderRadius: 1.5,
                      fontSize: '0.8125rem',
                      py: 0.4,
                      px: 1.5,
                    }}
                  >
                    Print Register
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          {/* Top KPI Summary Highlights Strip */}
          <Grid container spacing={1.5}>
            <Grid item xs={6} sm={2.4}>
              <Paper variant="outlined" sx={{ p: 1.25, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Collection Days
                </Typography>
                <Typography variant="h6" fontWeight={800} color="primary.main">
                  {dateWiseGroups.length} <Typography component="span" variant="caption">Days</Typography>
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={2.4}>
              <Paper variant="outlined" sx={{ p: 1.25, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Total Receipts
                </Typography>
                <Typography variant="h6" fontWeight={800}>
                  {dateWiseSummary.totalReceipts}{' '}
                  <Typography component="span" variant="caption" color="text.secondary">
                    ({dateWiseSummary.activeReceiptsCount} Active{dateWiseSummary.cancelledReceiptsCount > 0 ? `, ${dateWiseSummary.cancelledReceiptsCount} Can.` : ''})
                  </Typography>
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={2.4}>
              <Paper variant="outlined" sx={{ p: 1.25, textAlign: 'center', bgcolor: '#eff6ff', borderColor: '#bfdbfe', borderRadius: 2 }}>
                <Typography variant="caption" color="#1e40af" display="block">
                  Total Gross Fee
                </Typography>
                <Typography variant="h6" fontWeight={800} color="#1e40af">
                  ₹{dateWiseSummary.totalGross.toLocaleString()}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={2.4}>
              <Paper variant="outlined" sx={{ p: 1.25, textAlign: 'center', bgcolor: '#fef2f2', borderColor: '#fecaca', borderRadius: 2 }}>
                <Typography variant="caption" color="#991b1b" display="block">
                  Total Concession / Discount
                </Typography>
                <Typography variant="h6" fontWeight={800} color="#b91c1c">
                  ₹{dateWiseSummary.totalDiscount.toLocaleString()}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={2.4}>
              <Paper variant="outlined" sx={{ p: 1.25, textAlign: 'center', bgcolor: '#f0fdf4', borderColor: '#86efac', borderRadius: 2 }}>
                <Typography variant="caption" color="#166534" display="block" fontWeight={600}>
                  Net Active Collection
                </Typography>
                <Typography variant="h6" fontWeight={800} color="#15803d">
                  ₹{dateWiseSummary.totalCollected.toLocaleString()}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Main Date-wise Collection Table */}
          <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 1, overflowX: 'auto' }}>
            {isLoadingDateWise ? (
              <Box sx={{ p: 6, textAlign: 'center' }}>
                <CircularProgress size={36} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                  Loading date-wise collection data...
                </Typography>
              </Box>
            ) : dateWiseGroups.length === 0 ? (
              <Box sx={{ p: 6, textAlign: 'center' }}>
                <ReceiptIcon color="disabled" sx={{ fontSize: 48, mb: 1 }} />
                <Typography variant="subtitle1" fontWeight={700} color="text.secondary">
                  No fee collection receipts found for this filter criteria
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Try adjusting the date range, selecting all classes or modes, or resetting filters.
                </Typography>
              </Box>
            ) : (
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                  <TableRow>
                    <TableCell width={40} align="center" />
                    <TableCell width={40}><b>#</b></TableCell>
                    <TableCell width={140}><b>Collection Date</b></TableCell>
                    <TableCell width={230}><b>Receipt No Range (From – To)</b></TableCell>
                    <TableCell width={90} align="center"><b>Receipts</b></TableCell>
                    <TableCell width={130} align="right"><b>Fee Amount (Gross)</b></TableCell>
                    <TableCell width={110} align="right"><b>Discount</b></TableCell>
                    <TableCell width={140} align="right"><b>Net Collection</b></TableCell>
                    <TableCell><b>Mode-wise Breakdown (Kis Mode Me Kitna)</b></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dateWiseGroups.map((group, idx) => {
                    const isExpanded = Boolean(expandedDateRows[group.date]);

                    return (
                      <React.Fragment key={group.date}>
                        <TableRow
                          hover
                          sx={{
                            cursor: 'pointer',
                            bgcolor: isExpanded ? '#f0f9ff' : 'inherit',
                            '&:hover': { bgcolor: '#f8fafc' },
                          }}
                          onClick={() => toggleDateRowExpand(group.date)}
                        >
                          <TableCell align="center" sx={{ py: 1 }}>
                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); toggleDateRowExpand(group.date); }}>
                              {isExpanded ? <ArrowUpIcon fontSize="small" /> : <ArrowDownIcon fontSize="small" />}
                            </IconButton>
                          </TableCell>
                          <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>{idx + 1}</TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={700} color="primary.main">
                              {dayjs(group.date).format('DD MMM YYYY')}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {dayjs(group.date).format('dddd')}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip
                                size="small"
                                label={group.receiptRange}
                                variant="outlined"
                                color="primary"
                                sx={{
                                  fontFamily: 'monospace',
                                  fontWeight: 700,
                                  fontSize: '0.75rem',
                                  bgcolor: '#eff6ff',
                                  borderColor: '#bfdbfe',
                                }}
                              />
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Badge
                              badgeContent={group.receiptCount}
                              color={group.cancelledCount > 0 ? 'warning' : 'primary'}
                              sx={{ '& .MuiBadge-badge': { fontWeight: 700 } }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={600} color="#1e3a8a">
                              ₹{Number(group.grossFeeAmount).toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={600} color={group.totalDiscount > 0 ? '#dc2626' : 'text.secondary'}>
                              {group.totalDiscount > 0 ? `₹${Number(group.totalDiscount).toLocaleString()}` : '—'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={800} color="#15803d">
                              ₹{Number(group.totalCollection).toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center">
                              {Object.entries(group.modeBreakdown).map(([modeName, amount]) => {
                                const modeMeta = DATEWISE_PAYMENT_MODES.find((m) => m.value.toLowerCase() === modeName.toLowerCase());
                                const color = modeMeta?.color || '#475569';

                                return (
                                  <Chip
                                    key={modeName}
                                    size="small"
                                    label={`${modeName}: ₹${Number(amount).toLocaleString()}`}
                                    sx={{
                                      fontSize: '0.7125rem',
                                      fontWeight: 700,
                                      bgcolor: `${color}15`,
                                      color: color,
                                      border: `1px solid ${color}40`,
                                      height: 22,
                                    }}
                                  />
                                );
                              })}
                            </Stack>
                          </TableCell>
                        </TableRow>

                        {/* Collapsible Details: Receipts on this date */}
                        <TableRow>
                          <TableCell colSpan={9} sx={{ p: 0, bgcolor: '#f8fafc' }}>
                            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                              <Box sx={{ py: 1.5, px: { xs: 1.5, sm: 3 } }}>
                                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <ReceiptIcon fontSize="small" color="primary" />
                                  Individual Receipts on {dayjs(group.date).format('DD MMM YYYY')} ({group.receipts.length} Transactions)
                                </Typography>

                                <TableContainer component={Paper} variant="outlined" sx={{ bgcolor: '#ffffff', borderRadius: 1.5 }}>
                                  <Table size="small">
                                    <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                                      <TableRow>
                                        <TableCell width={35}>#</TableCell>
                                        <TableCell width={140}>Receipt No</TableCell>
                                        <TableCell width={100}>Adm No</TableCell>
                                        <TableCell>Student Name</TableCell>
                                        <TableCell width={120}>Class & Sec</TableCell>
                                        <TableCell width={110}>Mode</TableCell>
                                        <TableCell width={120}>Collected By</TableCell>
                                        <TableCell width={80} align="center">Status</TableCell>
                                        <TableCell align="right" width={100}>Gross (₹)</TableCell>
                                        <TableCell align="right" width={90}>Discount (₹)</TableCell>
                                        <TableCell align="right" width={110}>Paid Amount</TableCell>
                                        <TableCell align="center" width={90}>Action</TableCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {group.receipts.map((r, rIdx) => {
                                        const isPaid = r.status === 1;
                                        return (
                                          <TableRow key={r.receiptId} hover>
                                            <TableCell sx={{ color: 'text.secondary' }}>{rIdx + 1}</TableCell>
                                            <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.receiptNo}</TableCell>
                                            <TableCell>{r.admissionNo || '—'}</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>{r.studentName}</TableCell>
                                            <TableCell>{r.classSection || '—'}</TableCell>
                                            <TableCell>
                                              <Chip
                                                size="small"
                                                label={r.paymentModes || 'Cash'}
                                                sx={{ height: 20, fontSize: 10, fontWeight: 600 }}
                                              />
                                            </TableCell>
                                            <TableCell sx={{ color: '#334155', fontWeight: 600 }}>
                                              {r.collectedBy || 'Cashier'}
                                            </TableCell>
                                            <TableCell align="center">
                                              <Chip
                                                size="small"
                                                label={isPaid ? 'PAID' : 'CANCELLED'}
                                                color={isPaid ? 'success' : 'error'}
                                                sx={{ height: 20, fontSize: 10, fontWeight: 700 }}
                                              />
                                            </TableCell>
                                            <TableCell align="right">
                                              ₹{Number(r.grossAmount ?? (r.totalPaid + (r.totalDiscount || 0))).toLocaleString()}
                                            </TableCell>
                                            <TableCell align="right" sx={{ color: r.totalDiscount > 0 ? '#dc2626' : 'text.secondary' }}>
                                              {r.totalDiscount > 0 ? `₹${Number(r.totalDiscount).toLocaleString()}` : '0'}
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 800, color: isPaid ? '#15803d' : '#94a3b8' }}>
                                              ₹{Number(r.totalPaid).toLocaleString()}
                                            </TableCell>
                                            <TableCell align="center">
                                              <IconButton
                                                size="small"
                                                color="primary"
                                                title="Print Receipt Slip"
                                                onClick={() => handleOpenPrint(r.receiptId)}
                                                sx={{ p: 0.5 }}
                                              >
                                                <PrintIcon sx={{ fontSize: 16 }} />
                                              </IconButton>
                                            </TableCell>
                                          </TableRow>
                                        );
                                      })}
                                    </TableBody>
                                  </Table>
                                </TableContainer>
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    );
                  })}

                  {/* Grand Total Row */}
                  <TableRow sx={{ bgcolor: '#f1f5f9', borderTop: '2px solid #cbd5e1' }}>
                    <TableCell colSpan={4} sx={{ fontWeight: 800 }}>
                      GRAND TOTAL ({dateWiseGroups.length} Days)
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800 }}>
                      {dateWiseSummary.totalReceipts}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: '#1e3a8a' }}>
                      ₹{dateWiseSummary.totalGross.toLocaleString()}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: '#b91c1c' }}>
                      ₹{dateWiseSummary.totalDiscount.toLocaleString()}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.95rem', color: '#15803d' }}>
                      ₹{dateWiseSummary.totalCollected.toLocaleString()}
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                      Active Collection Total across all selected modes
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </TableContainer>

          {/* Bottom Summaries Section ("niche summary me rhgea payment mode ,class, aur user kisne fee liya hai") */}
          <Box sx={{ mt: 1 }}>
            <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <AssessmentIcon color="primary" />
              Financial Summaries & Multi-Dimensional Breakdowns
            </Typography>

            <Grid container spacing={2}>
              {/* 1. Payment Mode Summary */}
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%', borderRadius: 2, border: '1px solid #e2e8f0', boxShadow: 1 }}>
                  <Box sx={{ p: 1.5, bgcolor: '#f0fdf4', borderBottom: '1px solid #dcfce7', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WalletIcon sx={{ color: '#16a34a', fontSize: 20 }} />
                    <Typography variant="subtitle2" fontWeight={800} color="#166534">
                      1. Payment Mode Summary
                    </Typography>
                  </Box>
                  <TableContainer>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: '#f8fafc' }}>
                        <TableRow>
                          <TableCell><b>Mode</b></TableCell>
                          <TableCell align="center"><b>Txns</b></TableCell>
                          <TableCell align="right"><b>Total (₹)</b></TableCell>
                          <TableCell align="right" width={80}><b>Share</b></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {dateWiseSummary.modeSummaryList.map((m) => {
                          const pct = dateWiseSummary.totalCollected > 0
                            ? Math.round((m.amount / dateWiseSummary.totalCollected) * 100)
                            : 0;

                          return (
                            <TableRow key={m.mode} hover>
                              <TableCell sx={{ fontWeight: 600 }}>{m.mode}</TableCell>
                              <TableCell align="center">{m.count}</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700, color: '#15803d' }}>
                                ₹{m.amount.toLocaleString()}
                              </TableCell>
                              <TableCell align="right">
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end' }}>
                                  <Typography variant="caption" fontWeight={600}>{pct}%</Typography>
                                  <LinearProgress
                                    variant="determinate"
                                    value={pct}
                                    sx={{ width: 30, height: 5, borderRadius: 3, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: '#16a34a' } }}
                                  />
                                </Box>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {dateWiseSummary.modeSummaryList.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} align="center" sx={{ py: 2, color: 'text.secondary' }}>
                              No transactions recorded
                            </TableCell>
                          </TableRow>
                        )}
                        <TableRow sx={{ bgcolor: '#f8fafc', borderTop: '2px solid #cbd5e1' }}>
                          <TableCell sx={{ fontWeight: 800 }}>Total</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 800 }}>{dateWiseSummary.totalReceipts}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800, color: '#15803d' }}>
                            ₹{dateWiseSummary.totalCollected.toLocaleString()}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800 }}>100%</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Card>
              </Grid>

              {/* 2. Class-wise Summary */}
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%', borderRadius: 2, border: '1px solid #e2e8f0', boxShadow: 1 }}>
                  <Box sx={{ p: 1.5, bgcolor: '#eff6ff', borderBottom: '1px solid #dbeafe', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SchoolIcon sx={{ color: '#2563eb', fontSize: 20 }} />
                    <Typography variant="subtitle2" fontWeight={800} color="#1e40af">
                      2. Class-wise Summary
                    </Typography>
                  </Box>
                  <TableContainer>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: '#f8fafc' }}>
                        <TableRow>
                          <TableCell><b>Class</b></TableCell>
                          <TableCell align="center"><b>Rcpt</b></TableCell>
                          <TableCell align="right"><b>Net Amount (₹)</b></TableCell>
                          <TableCell align="right" width={80}><b>Share</b></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {dateWiseSummary.classSummaryList.map((c) => {
                          const pct = dateWiseSummary.totalCollected > 0
                            ? Math.round((c.net / dateWiseSummary.totalCollected) * 100)
                            : 0;

                          return (
                            <TableRow key={c.className} hover>
                              <TableCell sx={{ fontWeight: 600 }}>{c.className}</TableCell>
                              <TableCell align="center">{c.count}</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700, color: '#2563eb' }}>
                                ₹{c.net.toLocaleString()}
                              </TableCell>
                              <TableCell align="right">
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end' }}>
                                  <Typography variant="caption" fontWeight={600}>{pct}%</Typography>
                                  <LinearProgress
                                    variant="determinate"
                                    value={pct}
                                    sx={{ width: 30, height: 5, borderRadius: 3, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: '#2563eb' } }}
                                  />
                                </Box>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {dateWiseSummary.classSummaryList.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} align="center" sx={{ py: 2, color: 'text.secondary' }}>
                              No class collection recorded
                            </TableCell>
                          </TableRow>
                        )}
                        <TableRow sx={{ bgcolor: '#f8fafc', borderTop: '2px solid #cbd5e1' }}>
                          <TableCell sx={{ fontWeight: 800 }}>Total</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 800 }}>{dateWiseSummary.totalReceipts}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800, color: '#2563eb' }}>
                            ₹{dateWiseSummary.totalCollected.toLocaleString()}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800 }}>100%</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Card>
              </Grid>

              {/* 3. User / Cashier Summary ("kisne fee liya hai") */}
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%', borderRadius: 2, border: '1px solid #e2e8f0', boxShadow: 1 }}>
                  <Box sx={{ p: 1.5, bgcolor: '#faf5ff', borderBottom: '1px solid #f3e8ff', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonIcon sx={{ color: '#9333ea', fontSize: 20 }} />
                    <Typography variant="subtitle2" fontWeight={800} color="#6b21a8">
                      3. User Summary (Kisne Fee Liya Hai)
                    </Typography>
                  </Box>
                  <TableContainer>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: '#f8fafc' }}>
                        <TableRow>
                          <TableCell><b>User / Cashier</b></TableCell>
                          <TableCell align="center"><b>Rcpt</b></TableCell>
                          <TableCell align="right"><b>Net Amount (₹)</b></TableCell>
                          <TableCell align="right" width={80}><b>Share</b></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {dateWiseSummary.userSummaryList.map((u) => {
                          const pct = dateWiseSummary.totalCollected > 0
                            ? Math.round((u.net / dateWiseSummary.totalCollected) * 100)
                            : 0;

                          return (
                            <TableRow key={u.userName} hover>
                              <TableCell sx={{ fontWeight: 600 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                  <Avatar sx={{ width: 22, height: 22, fontSize: 10, bgcolor: '#9333ea' }}>
                                    {u.userName.charAt(0).toUpperCase()}
                                  </Avatar>
                                  <Typography variant="body2" fontWeight={600}>
                                    {u.userName}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell align="center">{u.count}</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700, color: '#9333ea' }}>
                                ₹{u.net.toLocaleString()}
                              </TableCell>
                              <TableCell align="right">
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end' }}>
                                  <Typography variant="caption" fontWeight={600}>{pct}%</Typography>
                                  <LinearProgress
                                    variant="determinate"
                                    value={pct}
                                    sx={{ width: 30, height: 5, borderRadius: 3, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: '#9333ea' } }}
                                  />
                                </Box>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {dateWiseSummary.userSummaryList.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} align="center" sx={{ py: 2, color: 'text.secondary' }}>
                              No cashier collection recorded
                            </TableCell>
                          </TableRow>
                        )}
                        <TableRow sx={{ bgcolor: '#f8fafc', borderTop: '2px solid #cbd5e1' }}>
                          <TableCell sx={{ fontWeight: 800 }}>Total</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 800 }}>{dateWiseSummary.totalReceipts}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800, color: '#9333ea' }}>
                            ₹{dateWiseSummary.totalCollected.toLocaleString()}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800 }}>100%</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </Stack>
      )}

      {/* Cancel Receipt Modal (FR-5.7) */}
      <Dialog open={cancelModalOpen} onClose={() => setCancelModalOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleConfirmCancel}>
          <DialogTitle sx={{ fontWeight: 700, color: 'error.main' }}>
            Cancel Fee Receipt (FR-5.7)
          </DialogTitle>
          <DialogContent dividers>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Are you sure you want to cancel Receipt <b>{selectedReceiptForCancel?.receiptNo}</b> (Amount: ₹
              {selectedReceiptForCancel?.totalPaid})? This action will automatically{' '}
              <b>reverse student balances</b> and preserve the cancelled receipt in audit logs.
            </Typography>

            {cancelError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {cancelError}
              </Alert>
            )}

            <TextField
              fullWidth
              size="small"
              required
              multiline
              rows={3}
              label="Cancellation Reason / Notes"
              placeholder="e.g. Cheque bounced, entered incorrect payment mode..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setCancelModalOpen(false)}>Close</Button>
            <Button type="submit" variant="contained" color="error" loading={cancelMutation.isPending}>
              Confirm Cancellation
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* 1. Daily Collection Print Preview Dialog */}
      <Dialog
        open={isCollectionPrintOpen}
        onClose={() => setIsCollectionPrintOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={800}>
            Daily Fee Collection Register Preview
          </Typography>
          <IconButton onClick={() => setIsCollectionPrintOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: { xs: 1.5, sm: 3 }, bgcolor: '#f8fafc' }}>
          <Box
            id="printable-collection-report"
            sx={{
              p: 3,
              bgcolor: '#ffffff',
              borderRadius: 2,
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              overflowX: 'auto',
            }}
          >
            {/* School Header */}
            <Stack direction="row" spacing={2} alignItems="center" justifyContent="center" sx={{ mb: 1.5 }}>
              <SchoolIcon color="primary" sx={{ fontSize: 36 }} />
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" fontWeight={800} color="primary.main">
                  {schoolName.toUpperCase()}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  {branchName} &bull; Affiliated & Accredited Institution
                </Typography>
              </Box>
            </Stack>

            <Divider sx={{ my: 1.5 }} />

            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <Typography variant="subtitle1" fontWeight={800} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                DAILY FEE COLLECTION REGISTER & AUDIT TRAIL
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Period: <strong>{dayjs(startDate).format('DD MMM YYYY')}</strong> to{' '}
                <strong>{dayjs(endDate).format('DD MMM YYYY')}</strong> &bull; Mode:{' '}
                <strong>{paymentModeFilter === 'ALL' ? 'All Payment Modes' : paymentModeFilter}</strong> &bull; Generated:{' '}
                {dayjs().format('DD-MMM-YYYY, hh:mm A')}
              </Typography>
            </Box>

            {/* Summary Highlights */}
            <Grid container spacing={2} sx={{ mb: 2.5 }}>
              <Grid item xs={4}>
                <Paper variant="outlined" sx={{ p: 1, textAlign: 'center', bgcolor: '#f8fafc' }}>
                  <Typography variant="caption" color="text.secondary">Total Receipts</Typography>
                  <Typography variant="h6" fontWeight={800}>
                    {collectionList.length} <Typography variant="caption">({activeReceipts.length} Active)</Typography>
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={4}>
                <Paper variant="outlined" sx={{ p: 1, textAlign: 'center', bgcolor: '#f0fdf4', borderColor: '#86efac' }}>
                  <Typography variant="caption" color="text.secondary">Net Active Collection</Typography>
                  <Typography variant="h6" fontWeight={800} color="#166534">
                    Rs. {totalCollectedPeriod.toLocaleString()}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={4}>
                <Paper variant="outlined" sx={{ p: 1, textAlign: 'center', bgcolor: '#fef2f2', borderColor: '#fca5a5' }}>
                  <Typography variant="caption" color="text.secondary">Cancelled Receipts</Typography>
                  <Typography variant="h6" fontWeight={800} color="#991b1b">
                    {cancelledReceiptsCount}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* Table with Collected By column */}
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 3, width: '100%' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                  <TableRow>
                    <TableCell width={35}><b>#</b></TableCell>
                    <TableCell width={160}><b>Receipt No</b></TableCell>
                    <TableCell width={140}><b>Date & Time</b></TableCell>
                    <TableCell width={110}><b>Adm No</b></TableCell>
                    <TableCell><b>Student Name</b></TableCell>
                    <TableCell width={100}><b>Class</b></TableCell>
                    <TableCell width={100}><b>Mode</b></TableCell>
                    {/* Collected By in Print */}
                    <TableCell width={120}><b>Collected By</b></TableCell>
                    <TableCell width={80} align="center"><b>Status</b></TableCell>
                    <TableCell align="right" width={110}><b>Amount (Rs.)</b></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {collectionList.map((r, idx) => (
                    <TableRow key={r.receiptId}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{r.receiptNo}</TableCell>
                      <TableCell>{formatDateTime(r.receiptDate, 'DD/MM/YY hh:mm A')}</TableCell>
                      <TableCell>{r.admissionNo}</TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{r.studentName}</TableCell>
                      <TableCell>{r.classSection}</TableCell>
                      <TableCell>{r.paymentModes}</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#334155' }}>
                        {r.collectedBy || 'Cashier'}
                      </TableCell>
                      <TableCell align="center">
                        <span style={{ color: r.status === 1 ? '#166534' : '#b91c1c', fontWeight: 700, fontSize: '0.78rem' }}>
                          {r.status === 1 ? 'PAID' : 'CANCELLED'}
                        </span>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        Rs. {Number(r.totalPaid).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ bgcolor: '#f8fafc', borderTop: '2px solid #000' }}>
                    <TableCell colSpan={9}>
                      <b>GRAND TOTAL NET COLLECTION (ACTIVE RECEIPTS)</b>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.95rem', color: '#166534' }}>
                      Rs. {totalCollectedPeriod.toLocaleString()}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            {/* Verification Signatures */}
            <Grid container spacing={3} sx={{ mt: 4, pt: 2, borderTop: '1px solid #cbd5e1' }}>
              <Grid item xs={4} sx={{ textAlign: 'center' }}>
                <Typography variant="body2" fontWeight={700} sx={{ pt: 3, borderTop: '1px dashed #64748b' }}>
                  Accountant / Cashier
                </Typography>
                <Typography variant="caption" color="text.secondary">(Prepared By)</Typography>
              </Grid>
              <Grid item xs={4} sx={{ textAlign: 'center' }}>
                <Typography variant="body2" fontWeight={700} sx={{ pt: 3, borderTop: '1px dashed #64748b' }}>
                  Accounts Officer / Auditor
                </Typography>
                <Typography variant="caption" color="text.secondary">(Verified By)</Typography>
              </Grid>
              <Grid item xs={4} sx={{ textAlign: 'center' }}>
                <Typography variant="body2" fontWeight={700} sx={{ pt: 3, borderTop: '1px dashed #64748b' }}>
                  Principal / Director
                </Typography>
                <Typography variant="caption" color="text.secondary">(With Official Seal)</Typography>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions className="no-print" sx={{ p: 2, justifyContent: 'space-between' }}>
          <Button onClick={() => setIsCollectionPrintOpen(false)} color="inherit">
            Close
          </Button>
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="contained"
              startIcon={<ExcelIcon />}
              onClick={handleDownloadCollectionExcel}
              sx={{ bgcolor: '#107c41', '&:hover': { bgcolor: '#0b5c30' }, textTransform: 'none' }}
            >
              Download Excel
            </Button>
            <Button
              variant="contained"
              startIcon={<PdfIcon />}
              onClick={handleDownloadCollectionPdf}
              sx={{ bgcolor: '#d32f2f', '&:hover': { bgcolor: '#b71c1c' }, textTransform: 'none' }}
            >
              Download PDF
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<PrintIcon />}
              onClick={() => printWithTitle(`Fee_Collection_Report_${selectedDate || dayjs().format('YYYY-MM-DD')}`)}
              sx={{ textTransform: 'none', px: 3, fontWeight: 700 }}
            >
              Print / Save as PDF
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      {/* 2. Fee Defaulters Print Preview Dialog */}
      <Dialog
        open={isDefaultersPrintOpen}
        onClose={() => setIsDefaultersPrintOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={800}>
            Fee Defaulters Register Preview
          </Typography>
          <IconButton onClick={() => setIsDefaultersPrintOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: { xs: 1.5, sm: 3 }, bgcolor: '#f8fafc' }}>
          <Box
            id="printable-defaulters-report"
            sx={{
              p: 3,
              bgcolor: '#ffffff',
              borderRadius: 2,
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              overflowX: 'auto',
            }}
          >
            {/* School Header */}
            <Stack direction="row" spacing={2} alignItems="center" justifyContent="center" sx={{ mb: 1.5 }}>
              <SchoolIcon color="primary" sx={{ fontSize: 36 }} />
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" fontWeight={800} color="primary.main">
                  {schoolName.toUpperCase()}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  {branchName} &bull; Affiliated & Accredited Institution
                </Typography>
              </Box>
            </Stack>

            <Divider sx={{ my: 1.5 }} />

            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <Typography variant="subtitle1" fontWeight={800} sx={{ textTransform: 'uppercase', letterSpacing: 0.5, color: '#b91c1c' }}>
                STUDENT FEE DEFAULTERS & OUTSTANDING DUES AUDIT REGISTER
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Filter: <strong>{defaulterClassId ? selectedDefaulterClass?.name : 'All Classes'}</strong> &bull; Generated: {dayjs().format('DD-MMM-YYYY, hh:mm A')}
              </Typography>
            </Box>

            {/* Summary Highlights */}
            <Grid container spacing={2} sx={{ mb: 2.5 }}>
              <Grid item xs={3}>
                <Paper variant="outlined" sx={{ p: 1, textAlign: 'center', bgcolor: '#f8fafc' }}>
                  <Typography variant="caption" color="text.secondary">Total Defaulters</Typography>
                  <Typography variant="h6" fontWeight={800} color="#b91c1c">
                    {defaultersList.length} Students
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={3}>
                <Paper variant="outlined" sx={{ p: 1, textAlign: 'center', bgcolor: '#fffbeb' }}>
                  <Typography variant="caption" color="text.secondary">Total Overdue Fee</Typography>
                  <Typography variant="h6" fontWeight={800} color="#b45309">
                    Rs. {totalFeeOverdue.toLocaleString()}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={3}>
                <Paper variant="outlined" sx={{ p: 1, textAlign: 'center', bgcolor: '#fef2f2' }}>
                  <Typography variant="caption" color="text.secondary">Total Late Fine</Typography>
                  <Typography variant="h6" fontWeight={800} color="#dc2626">
                    Rs. {totalFineOverdue.toLocaleString()}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={3}>
                <Paper variant="outlined" sx={{ p: 1, textAlign: 'center', bgcolor: '#fef2f2', borderColor: '#f87171' }}>
                  <Typography variant="caption" color="text.secondary">Grand Total Due</Typography>
                  <Typography variant="h6" fontWeight={800} color="#991b1c">
                    Rs. {totalOverduePeriod.toLocaleString()}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* Table */}
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 3, width: '100%' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#fef2f2' }}>
                  <TableRow>
                    <TableCell width={30}><b>#</b></TableCell>
                    <TableCell width={110}><b>Adm No</b></TableCell>
                    <TableCell><b>Student Name</b></TableCell>
                    <TableCell width={100}><b>Class</b></TableCell>
                    <TableCell width={140}><b>Guardian</b></TableCell>
                    <TableCell width={110}><b>Mobile</b></TableCell>
                    <TableCell><b>Overdue Installments</b></TableCell>
                    <TableCell align="right" width={110}><b>Fee Overdue</b></TableCell>
                    <TableCell align="right" width={90}><b>Late Fine</b></TableCell>
                    <TableCell align="right" width={115}><b>Total Due (Rs.)</b></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {defaultersList.map((d, idx) => (
                    <TableRow key={d.studentId}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{d.admissionNo}</TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{d.studentName}</TableCell>
                      <TableCell>{d.className} {d.sectionName}</TableCell>
                      <TableCell>{d.guardianName || '—'}</TableCell>
                      <TableCell>{d.guardianMobile || '—'}</TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {d.overdueInstallments || '—'}
                      </TableCell>
                      <TableCell align="right">Rs. {Number(d.overdueAmount).toLocaleString()}</TableCell>
                      <TableCell align="right" sx={{ color: '#dc2626' }}>
                        Rs. {Number(d.overdueFine).toLocaleString()}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: '#991b1c' }}>
                        Rs. {Number(d.totalOverdue).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ bgcolor: '#fef2f2', borderTop: '2px solid #000' }}>
                    <TableCell colSpan={7}>
                      <b>GRAND TOTAL OUTSTANDING OVERDUE</b>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>
                      Rs. {totalFeeOverdue.toLocaleString()}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: '#dc2626' }}>
                      Rs. {totalFineOverdue.toLocaleString()}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.95rem', color: '#991b1c' }}>
                      Rs. {totalOverduePeriod.toLocaleString()}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            {/* Verification Signatures */}
            <Grid container spacing={3} sx={{ mt: 4, pt: 2, borderTop: '1px solid #cbd5e1' }}>
              <Grid item xs={4} sx={{ textAlign: 'center' }}>
                <Typography variant="body2" fontWeight={700} sx={{ pt: 3, borderTop: '1px dashed #64748b' }}>
                  Fee In-charge
                </Typography>
                <Typography variant="caption" color="text.secondary">(Prepared By)</Typography>
              </Grid>
              <Grid item xs={4} sx={{ textAlign: 'center' }}>
                <Typography variant="body2" fontWeight={700} sx={{ pt: 3, borderTop: '1px dashed #64748b' }}>
                  Administrative Officer
                </Typography>
                <Typography variant="caption" color="text.secondary">(Verified By)</Typography>
              </Grid>
              <Grid item xs={4} sx={{ textAlign: 'center' }}>
                <Typography variant="body2" fontWeight={700} sx={{ pt: 3, borderTop: '1px dashed #64748b' }}>
                  Principal / Director
                </Typography>
                <Typography variant="caption" color="text.secondary">(With Official Seal)</Typography>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions className="no-print" sx={{ p: 2, justifyContent: 'space-between' }}>
          <Button onClick={() => setIsDefaultersPrintOpen(false)} color="inherit">
            Close
          </Button>
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="contained"
              startIcon={<ExcelIcon />}
              onClick={handleDownloadDefaultersExcel}
              sx={{ bgcolor: '#107c41', '&:hover': { bgcolor: '#0b5c30' }, textTransform: 'none' }}
            >
              Download Excel
            </Button>
            <Button
              variant="contained"
              startIcon={<PdfIcon />}
              onClick={handleDownloadDefaultersPdf}
              sx={{ bgcolor: '#d32f2f', '&:hover': { bgcolor: '#b71c1c' }, textTransform: 'none' }}
            >
              Download PDF
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<PrintIcon />}
              onClick={() => printWithTitle(`Fee_Defaulters_Report_${selectedClass ? `Class_${selectedClass}` : 'All_Classes'}`)}
              sx={{ textTransform: 'none', px: 3, fontWeight: 700 }}
            >
              Print / Save as PDF
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      {/* Date-wise Collection Print Preview Dialog */}
      <Dialog
        open={isDateWisePrintOpen}
        onClose={() => setIsDateWisePrintOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={800}>
            Date-wise Fee Collection & Summary Register Preview
          </Typography>
          <IconButton onClick={() => setIsDateWisePrintOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: { xs: 1.5, sm: 3 }, bgcolor: '#f8fafc' }}>
          <Box
            id="printable-datewise-report"
            sx={{
              p: 3,
              bgcolor: '#ffffff',
              borderRadius: 2,
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              overflowX: 'auto',
            }}
          >
            {/* School Header */}
            <Stack direction="row" spacing={2} alignItems="center" justifyContent="center" sx={{ mb: 1.5 }}>
              <SchoolIcon color="primary" sx={{ fontSize: 36 }} />
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" fontWeight={800} color="primary.main">
                  {schoolName.toUpperCase()}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  {branchName} &bull; Affiliated & Accredited Institution
                </Typography>
              </Box>
            </Stack>

            <Divider sx={{ my: 1.5 }} />

            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <Typography variant="subtitle1" fontWeight={800} sx={{ textTransform: 'uppercase', letterSpacing: 0.5, color: '#1e3a8a' }}>
                DATE-WISE FEE COLLECTION & AUDIT TRAIL REGISTER
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Period: <strong>{dayjs(dateWiseStartDate).format('DD MMM YYYY')}</strong> to{' '}
                <strong>{dayjs(dateWiseEndDate).format('DD MMM YYYY')}</strong> &bull; Classes:{' '}
                <strong>{selectedDateWiseClasses.length ? `${selectedDateWiseClasses.length} Selected` : 'All Classes'}</strong> &bull; Modes:{' '}
                <strong>{selectedDateWiseModes.length ? selectedDateWiseModes.join(', ') : 'All Modes'}</strong> &bull; Cashier:{' '}
                <strong>{selectedDateWiseUsers.length ? selectedDateWiseUsers.join(', ') : 'All Cashiers'}</strong> &bull; Generated:{' '}
                {dayjs().format('DD-MMM-YYYY, hh:mm A')}
              </Typography>
            </Box>

            {/* Summary Highlights */}
            <Grid container spacing={2} sx={{ mb: 2.5 }}>
              <Grid item xs={3}>
                <Paper variant="outlined" sx={{ p: 1, textAlign: 'center', bgcolor: '#f8fafc' }}>
                  <Typography variant="caption" color="text.secondary">Total Days</Typography>
                  <Typography variant="h6" fontWeight={800} color="primary.main">
                    {dateWiseGroups.length} Days
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={3}>
                <Paper variant="outlined" sx={{ p: 1, textAlign: 'center', bgcolor: '#f8fafc' }}>
                  <Typography variant="caption" color="text.secondary">Total Receipts</Typography>
                  <Typography variant="h6" fontWeight={800}>
                    {dateWiseSummary.totalReceipts} ({dateWiseSummary.activeReceiptsCount} Active)
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={3}>
                <Paper variant="outlined" sx={{ p: 1, textAlign: 'center', bgcolor: '#fef2f2' }}>
                  <Typography variant="caption" color="text.secondary">Total Discount</Typography>
                  <Typography variant="h6" fontWeight={800} color="#b91c1c">
                    Rs. {dateWiseSummary.totalDiscount.toLocaleString()}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={3}>
                <Paper variant="outlined" sx={{ p: 1, textAlign: 'center', bgcolor: '#f0fdf4', borderColor: '#86efac' }}>
                  <Typography variant="caption" color="text.secondary">Net Collection</Typography>
                  <Typography variant="h6" fontWeight={800} color="#15803d">
                    Rs. {dateWiseSummary.totalCollected.toLocaleString()}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* Date-wise Table */}
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 3, width: '100%' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                  <TableRow>
                    <TableCell width={30}><b>#</b></TableCell>
                    <TableCell width={110}><b>Date</b></TableCell>
                    <TableCell width={180}><b>Receipt No Range</b></TableCell>
                    <TableCell width={70} align="center"><b>Count</b></TableCell>
                    <TableCell align="right" width={110}><b>Gross Fee (Rs.)</b></TableCell>
                    <TableCell align="right" width={100}><b>Discount (Rs.)</b></TableCell>
                    <TableCell align="right" width={120}><b>Net Collection (Rs.)</b></TableCell>
                    <TableCell><b>Mode-wise Breakdown</b></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dateWiseGroups.map((g, idx) => (
                    <TableRow key={g.date}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{dayjs(g.date).format('DD/MM/YYYY')}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{g.receiptRange}</TableCell>
                      <TableCell align="center">{g.receiptCount}</TableCell>
                      <TableCell align="right">Rs. {Number(g.grossFeeAmount).toLocaleString()}</TableCell>
                      <TableCell align="right" sx={{ color: g.totalDiscount > 0 ? '#b91c1c' : 'inherit' }}>
                        Rs. {Number(g.totalDiscount).toLocaleString()}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: '#15803d' }}>
                        Rs. {Number(g.totalCollection).toLocaleString()}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.75rem' }}>
                        {Object.entries(g.modeBreakdown)
                          .map(([m, amt]) => `${m}: Rs.${Number(amt).toLocaleString()}`)
                          .join(' | ')}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ bgcolor: '#f8fafc', borderTop: '2px solid #000' }}>
                    <TableCell colSpan={3}><b>GRAND TOTAL</b></TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800 }}>{dateWiseSummary.totalReceipts}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>Rs. {dateWiseSummary.totalGross.toLocaleString()}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: '#b91c1c' }}>Rs. {dateWiseSummary.totalDiscount.toLocaleString()}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.95rem', color: '#15803d' }}>
                      Rs. {dateWiseSummary.totalCollected.toLocaleString()}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            {/* Summaries: 3 Columns in Print */}
            <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1, textTransform: 'uppercase', color: '#334155' }}>
              Financial Summary Breakdowns (Mode, Class & Cashier)
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {/* Mode Summary */}
              <Grid item xs={4}>
                <Paper variant="outlined" sx={{ p: 1.5 }}>
                  <Typography variant="caption" fontWeight={800} sx={{ textTransform: 'uppercase', display: 'block', mb: 1, color: '#166534' }}>
                    1. Payment Mode Summary
                  </Typography>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                      <TableRow>
                        <TableCell sx={{ py: 0.5 }}><b>Mode</b></TableCell>
                        <TableCell align="center" sx={{ py: 0.5 }}><b>Txn</b></TableCell>
                        <TableCell align="right" sx={{ py: 0.5 }}><b>Amount</b></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dateWiseSummary.modeSummaryList.map((m) => (
                        <TableRow key={m.mode}>
                          <TableCell sx={{ py: 0.5 }}>{m.mode}</TableCell>
                          <TableCell align="center" sx={{ py: 0.5 }}>{m.count}</TableCell>
                          <TableCell align="right" sx={{ py: 0.5, fontWeight: 700 }}>Rs. {m.amount.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Paper>
              </Grid>

              {/* Class Summary */}
              <Grid item xs={4}>
                <Paper variant="outlined" sx={{ p: 1.5 }}>
                  <Typography variant="caption" fontWeight={800} sx={{ textTransform: 'uppercase', display: 'block', mb: 1, color: '#1e40af' }}>
                    2. Class-wise Summary
                  </Typography>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                      <TableRow>
                        <TableCell sx={{ py: 0.5 }}><b>Class</b></TableCell>
                        <TableCell align="center" sx={{ py: 0.5 }}><b>Rcpt</b></TableCell>
                        <TableCell align="right" sx={{ py: 0.5 }}><b>Net (Rs.)</b></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dateWiseSummary.classSummaryList.map((c) => (
                        <TableRow key={c.className}>
                          <TableCell sx={{ py: 0.5 }}>{c.className}</TableCell>
                          <TableCell align="center" sx={{ py: 0.5 }}>{c.count}</TableCell>
                          <TableCell align="right" sx={{ py: 0.5, fontWeight: 700 }}>Rs. {c.net.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Paper>
              </Grid>

              {/* User Summary */}
              <Grid item xs={4}>
                <Paper variant="outlined" sx={{ p: 1.5 }}>
                  <Typography variant="caption" fontWeight={800} sx={{ textTransform: 'uppercase', display: 'block', mb: 1, color: '#6b21a8' }}>
                    3. User / Cashier Summary
                  </Typography>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                      <TableRow>
                        <TableCell sx={{ py: 0.5 }}><b>Cashier</b></TableCell>
                        <TableCell align="center" sx={{ py: 0.5 }}><b>Rcpt</b></TableCell>
                        <TableCell align="right" sx={{ py: 0.5 }}><b>Net (Rs.)</b></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dateWiseSummary.userSummaryList.map((u) => (
                        <TableRow key={u.userName}>
                          <TableCell sx={{ py: 0.5 }}>{u.userName}</TableCell>
                          <TableCell align="center" sx={{ py: 0.5 }}>{u.count}</TableCell>
                          <TableCell align="right" sx={{ py: 0.5, fontWeight: 700 }}>Rs. {u.net.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Paper>
              </Grid>
            </Grid>

            {/* Verification Signatures */}
            <Grid container spacing={3} sx={{ mt: 4, pt: 2, borderTop: '1px solid #cbd5e1' }}>
              <Grid item xs={4} sx={{ textAlign: 'center' }}>
                <Typography variant="body2" fontWeight={700} sx={{ pt: 3, borderTop: '1px dashed #64748b' }}>
                  Cashier / Fee In-charge
                </Typography>
                <Typography variant="caption" color="text.secondary">(Prepared By)</Typography>
              </Grid>
              <Grid item xs={4} sx={{ textAlign: 'center' }}>
                <Typography variant="body2" fontWeight={700} sx={{ pt: 3, borderTop: '1px dashed #64748b' }}>
                  Accounts Officer
                </Typography>
                <Typography variant="caption" color="text.secondary">(Verified By)</Typography>
              </Grid>
              <Grid item xs={4} sx={{ textAlign: 'center' }}>
                <Typography variant="body2" fontWeight={700} sx={{ pt: 3, borderTop: '1px dashed #64748b' }}>
                  Principal / Director
                </Typography>
                <Typography variant="caption" color="text.secondary">(With Official Seal)</Typography>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions className="no-print" sx={{ p: 2, justifyContent: 'space-between' }}>
          <Button onClick={() => setIsDateWisePrintOpen(false)} color="inherit">
            Close
          </Button>
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="contained"
              startIcon={<ExcelIcon />}
              onClick={handleDownloadDateWiseExcel}
              sx={{ bgcolor: '#107c41', '&:hover': { bgcolor: '#0b5c30' }, textTransform: 'none' }}
            >
              Download Excel
            </Button>
            <Button
              variant="contained"
              startIcon={<PdfIcon />}
              onClick={handleDownloadDateWisePdf}
              sx={{ bgcolor: '#d32f2f', '&:hover': { bgcolor: '#b71c1c' }, textTransform: 'none' }}
            >
              Download PDF
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<PrintIcon />}
              onClick={() => printWithTitle(`DateWise_Fee_Collection_${dateWiseStartDate}_to_${dateWiseEndDate}`)}
              sx={{ textTransform: 'none', px: 3, fontWeight: 700 }}
            >
              Print / Save as PDF
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      {/* 3. Reprint Single Receipt Dynamic Modal */}
      <AppModal
        open={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        title="Fee Payment Receipt Slip (Dual Copy)"
        subtitle={
          printReceiptData?.studentName
            ? `${printReceiptData.studentName} • Adm No: ${printReceiptData.admissionNumber || printReceiptData.admissionNo || 'N/A'} • Receipt: ${printReceiptData.receiptNo || 'N/A'}`
            : 'Official two-copy fee receipt for school records & student'
        }
        icon={<ReceiptLongIcon />}
        maxWidth="lg"
        fullWidth
        contentSx={{ p: { xs: 1, sm: 2 }, bgcolor: '#f8fafc' }}
        actions={
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: 1.5 }}>
            <Button
              variant="outlined"
              color="inherit"
              onClick={() => setIsPrintOpen(false)}
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '6px' }}
            >
              Close
            </Button>
            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
              <Button
                variant="outlined"
                color="error"
                startIcon={<PdfIcon />}
                onClick={() => exportDualFeeReceiptPdf(printReceiptData)}
                sx={{ fontWeight: 600, textTransform: 'none', borderRadius: '6px' }}
              >
                Download PDF
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<PrintIcon />}
                onClick={() => {
                  const sName = printReceiptData?.studentName ? `_${printReceiptData.studentName}` : '';
                  const aNo = printReceiptData?.admissionNumber ? `_${printReceiptData.admissionNumber}` : (printReceiptData?.admissionNo ? `_${printReceiptData.admissionNo}` : '');
                  const rNo = printReceiptData?.receiptNo ? `_${printReceiptData.receiptNo}` : '';
                  printWithTitle(`Fee_Receipt${sName}${aNo}${rNo}`);
                }}
                sx={{ fontWeight: 700, textTransform: 'none', px: 3, borderRadius: '6px' }}
              >
                Print Slip (2 Copies)
              </Button>
              <Button
                variant="contained"
                startIcon={<WhatsAppIcon />}
                onClick={() => {
                  if (!printReceiptData) return;
                  setWhatsAppModal({
                    open: true,
                    recipientName: printReceiptData.guardianName || printReceiptData.studentName,
                    recipientMobile: printReceiptData.guardianMobile || printReceiptData.contact || '',
                    moduleKey: 'feeReceipt',
                    variables: {
                      StudentName: printReceiptData.studentName || '',
                      ReceiptNo: printReceiptData.receiptNo || '',
                      Amount: String(printReceiptData.totalPaid ?? printReceiptData.amount ?? ''),
                      Date: printReceiptData.receiptDate ? dayjs(printReceiptData.receiptDate).format('DD/MM/YYYY') : dayjs().format('DD/MM/YYYY'),
                      PaymentMode: printReceiptData.paymentMode || 'Cash',
                      SchoolName: printReceiptData.schoolName || schoolName,
                    },
                  });
                }}
                sx={{
                  fontWeight: 700,
                  textTransform: 'none',
                  bgcolor: '#16a34a',
                  '&:hover': { bgcolor: '#15803d' },
                  color: '#ffffff',
                  borderRadius: '6px',
                }}
              >
                WhatsApp
              </Button>
            </Stack>
          </Box>
        }
      >
        {printReceiptData && (
          <Paper
            elevation={0}
            sx={{
              p: { xs: 1, sm: 2 },
              bgcolor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: 2,
              overflowX: 'auto',
            }}
          >
            <FeeReceiptSlip data={printReceiptData} showCuttingLine={true} />
          </Paper>
        )}
      </AppModal>

      {/* Student Complete Fee History Modal (accessible from any row in Tab 0, 1, 2) */}
      <StudentFeeHistoryModal
        open={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setSelectedHistoryStudentId(null);
        }}
        studentId={selectedHistoryStudentId}
        onPrintReceipt={(receiptId) => handleOpenPrint(receiptId)}
      />

      {/* WhatsApp Dialog */}
      <WhatsAppDialog
        open={whatsAppModal.open}
        onClose={() => setWhatsAppModal((prev) => ({ ...prev, open: false }))}
        moduleKey={whatsAppModal.moduleKey}
        recipientName={whatsAppModal.recipientName}
        recipientMobile={whatsAppModal.recipientMobile}
        variables={whatsAppModal.variables}
      />
    </Box>
  );
}
