import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Modal,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { feesApi, studentApi, classApi } from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  generateFeeReceiptHtml,
  numberToIndianWords,
  executePrint,
  executeSharePdf,
} from '../utils/printTemplates';
import WhatsAppModal from '../components/WhatsAppModal';

// Helper date formatters
const formatDateYMD = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getPresetDates = (presetKey) => {
  const now = new Date();
  const todayStr = formatDateYMD(now);
  if (presetKey === 'today') {
    return { startDate: todayStr, endDate: todayStr };
  } else if (presetKey === 'yesterday') {
    const yest = new Date(now);
    yest.setDate(yest.getDate() - 1);
    const yestStr = formatDateYMD(yest);
    return { startDate: yestStr, endDate: yestStr };
  } else if (presetKey === 'last7') {
    const d7 = new Date(now);
    d7.setDate(d7.getDate() - 7);
    return { startDate: formatDateYMD(d7), endDate: todayStr };
  } else if (presetKey === 'thisMonth') {
    const startM = new Date(now.getFullYear(), now.getMonth(), 1);
    return { startDate: formatDateYMD(startM), endDate: todayStr };
  }
  return { startDate: todayStr, endDate: todayStr };
};

export default function FeesScreen({ route, navigation }) {
  const { user, activeAcademicYearName } = useContext(AuthContext);
  const { isDark, colors } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' or 'dues'

  // Branch Info
  const [branchInfo, setBranchInfo] = useState(null);

  // ----------------------------------------------------
  // TAB 1: SUMMARY & RECEIPTS REGISTER STATE
  // ----------------------------------------------------
  const [datePreset, setDatePreset] = useState('last7'); // 'today', 'yesterday', 'last7', 'thisMonth'
  const [dateRange, setDateRange] = useState(() => getPresetDates('last7'));
  const [paymentModeFilter, setPaymentModeFilter] = useState('ALL'); // 'ALL', 'Cash', 'UPI', 'Cheque', 'Bank', 'Card'
  const [receiptSearchQuery, setReceiptSearchQuery] = useState('');
  const [rawReceipts, setRawReceipts] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [refreshingSummary, setRefreshingSummary] = useState(false);

  // Receipt Cancel Modal State
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [receiptToCancel, setReceiptToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancellingReceipt, setCancellingReceipt] = useState(false);

  // ----------------------------------------------------
  // TAB 2: COLLECT FEE / DUES STATE
  // ----------------------------------------------------
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [studentResults, setStudentResults] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [duesData, setDuesData] = useState(null);
  const [loadingDues, setLoadingDues] = useState(false);
  const [selectedMonthIds, setSelectedMonthIds] = useState([]);
  const [showPaidMonths, setShowPaidMonths] = useState(false);
  const [fifoNotice, setFifoNotice] = useState('');
  const [deselectedOptionalDueIds, setDeselectedOptionalDueIds] = useState({});
  const [headAllocatedAmounts, setHeadAllocatedAmounts] = useState({});

  // Discount eligibility & state
  const [discountEligibility, setDiscountEligibility] = useState({
    canGiveDiscount: true,
    maxDiscountLimit: 100,
    isUnlimited: true,
    roleName: 'Admin',
  });
  const [discountPercent, setDiscountPercent] = useState('');
  const [overallDiscount, setOverallDiscount] = useState('');
  const [discountRemarks, setDiscountRemarks] = useState('');

  // Payment details
  const [amountToPay, setAmountToPay] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash'); // 'Cash', 'UPI', 'Card', 'Cheque', 'BankTransfer'
  const [transactionRef, setTransactionRef] = useState('');
  const [bankName, setBankName] = useState('');
  const [chequeNo, setChequeNo] = useState('');
  const [cashierRemarks, setCashierRemarks] = useState('');
  const [submittingFee, setSubmittingFee] = useState(false);

  // ----------------------------------------------------
  // RECEIPT PREVIEW / PRINT / WHATSAPP STATE
  // ----------------------------------------------------
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [printReceiptData, setPrintReceiptData] = useState(null);
  const [isNewReceipt, setIsNewReceipt] = useState(false);
  const [printing, setPrinting] = useState(false);

  const [whatsAppModal, setWhatsAppModal] = useState({
    visible: false,
    recipientName: '',
    recipientPhone: '',
    recipientRole: '',
    moduleKey: 'feeReceipt',
    moduleTitle: 'Fee Receipt Notification (WhatsApp)',
    templateData: {},
  });

  // ----------------------------------------------------
  // INITIAL DATA LOADING
  // ----------------------------------------------------
  useEffect(() => {
    loadBranchInfo();
    loadDiscountEligibility();
    loadCollectionReport(dateRange.startDate, dateRange.endDate);
  }, []);

  const loadBranchInfo = async () => {
    try {
      const res = await classApi.getBranch();
      if (res.data?.success && res.data?.data) {
        setBranchInfo(res.data.data);
      }
    } catch (e) {
      console.warn('Error loading branch info in fees:', e);
    }
  };

  const loadDiscountEligibility = async () => {
    try {
      const res = await feesApi.getDiscountEligibility();
      if (res.data?.success && res.data?.data) {
        const d = res.data.data;
        const isUserAdmin =
          !user?.roleName ||
          user?.roleName?.toLowerCase().includes('admin') ||
          user?.roleName?.toLowerCase().includes('principal') ||
          user?.userType === 1 ||
          user?.userType === 2 ||
          user?.userType === 3;
        setDiscountEligibility({
          canGiveDiscount: isUserAdmin ? true : (d.canGiveDiscount ?? true),
          maxDiscountLimit: isUserAdmin ? 100 : (Number(d.maxDiscountLimit) > 0 ? Number(d.maxDiscountLimit) : 100),
          isUnlimited: isUserAdmin ? true : (d.isUnlimited ?? (Number(d.maxDiscountLimit) >= 100 || !d.maxDiscountLimit)),
          roleName: d.roleName || user?.roleName || 'Admin',
        });
      } else {
        setDiscountEligibility({
          canGiveDiscount: true,
          maxDiscountLimit: 100,
          isUnlimited: true,
          roleName: user?.roleName || 'Admin',
        });
      }
    } catch (e) {
      console.warn('Error loading discount eligibility:', e);
      setDiscountEligibility({
        canGiveDiscount: true,
        maxDiscountLimit: 100,
        isUnlimited: true,
        roleName: user?.roleName || 'Admin',
      });
    }
  };

  const loadCollectionReport = async (startDate, endDate) => {
    try {
      setLoadingSummary(true);
      const res = await feesApi.getDailyCollection({ startDate, endDate });
      if (res.data?.success && Array.isArray(res.data?.data)) {
        setRawReceipts(res.data.data);
      } else {
        setRawReceipts([]);
      }
    } catch (e) {
      console.warn('Error loading daily collection:', e);
      setRawReceipts([]);
    } finally {
      setLoadingSummary(false);
      setRefreshingSummary(false);
    }
  };

  const handleSelectPreset = (preset) => {
    setDatePreset(preset);
    const range = getPresetDates(preset);
    setDateRange(range);
    loadCollectionReport(range.startDate, range.endDate);
  };

  const handleRefreshSummary = () => {
    setRefreshingSummary(true);
    loadCollectionReport(dateRange.startDate, dateRange.endDate);
  };

  // ----------------------------------------------------
  // COMPUTED SUMMARY METRICS (TAB 1)
  // ----------------------------------------------------
  const collectionStats = useMemo(() => {
    if (!rawReceipts || !Array.isArray(rawReceipts)) {
      return { totalPaid: 0, activeCount: 0, cancelledCount: 0, cash: 0, upi: 0, cheque: 0, bank: 0, card: 0 };
    }
    let totalPaid = 0;
    let activeCount = 0;
    let cancelledCount = 0;
    let cash = 0;
    let upi = 0;
    let cheque = 0;
    let bank = 0;
    let card = 0;

    rawReceipts.forEach((r) => {
      const isCancelled = r.status === 2 || String(r.status).toLowerCase() === 'cancelled';
      if (isCancelled) {
        cancelledCount++;
        return;
      }
      activeCount++;
      const paid = Number(r.totalPaid || r.amount || 0);
      totalPaid += paid;

      if (r.payments && Array.isArray(r.payments) && r.payments.length > 0) {
        r.payments.forEach((p) => {
          const mode = (p.mode || '').toLowerCase();
          const amt = Number(p.amount || 0);
          if (mode.includes('cash') || mode === '1') cash += amt;
          else if (mode.includes('upi') || mode === '2') upi += amt;
          else if (mode.includes('card') || mode === '3') card += amt;
          else if (mode.includes('cheque') || mode === '4') cheque += amt;
          else if (mode.includes('bank') || mode === '5') bank += amt;
          else cash += amt;
        });
      } else {
        const m = (r.paymentModes || '').toLowerCase();
        if (m.includes('upi')) upi += paid;
        else if (m.includes('cheque')) cheque += paid;
        else if (m.includes('bank')) bank += paid;
        else if (m.includes('card')) card += paid;
        else cash += paid;
      }
    });

    return { totalPaid, activeCount, cancelledCount, cash, upi, cheque, bank, card };
  }, [rawReceipts]);

  // Filtered Receipts List (Client-side fast search & mode filter)
  const filteredReceipts = useMemo(() => {
    if (!rawReceipts || !Array.isArray(rawReceipts)) return [];
    return rawReceipts.filter((r) => {
      // Payment mode filter
      if (paymentModeFilter !== 'ALL') {
        const modeStr = (r.paymentModes || '').toLowerCase();
        if (!modeStr.includes(paymentModeFilter.toLowerCase())) {
          return false;
        }
      }
      // Search query
      if (receiptSearchQuery.trim()) {
        const q = receiptSearchQuery.trim().toLowerCase();
        const matchNo = (r.receiptNo || '').toLowerCase().includes(q);
        const matchName = (r.studentName || '').toLowerCase().includes(q);
        const matchAdm = (r.admissionNo || '').toLowerCase().includes(q);
        const matchClass = (r.classSection || '').toLowerCase().includes(q);
        return matchNo || matchName || matchAdm || matchClass;
      }
      return true;
    });
  }, [rawReceipts, paymentModeFilter, receiptSearchQuery]);

  // ----------------------------------------------------
  // RECEIPT ACTIONS (TAB 1)
  // ----------------------------------------------------
  const handleOpenReceipt = async (rec) => {
    try {
      setPrinting(true);
      const rId = rec.receiptId || rec.id;
      if (rId) {
        try {
          const res = await feesApi.getReceiptPrint(rId);
          if (res.data?.success && res.data?.data) {
            setPrintReceiptData(res.data.data);
            setIsNewReceipt(false);
            setReceiptModalVisible(true);
            return;
          }
        } catch (e) {
          console.warn('getReceiptPrint error, falling back:', e);
        }
      }
      setPrintReceiptData({
        ...rec,
        totalPaid: rec.amount || rec.totalPaid || 0,
        paymentModeName: rec.paymentModes || rec.paymentMode || 'Cash',
      });
      setIsNewReceipt(false);
      setReceiptModalVisible(true);
    } finally {
      setPrinting(false);
    }
  };

  const handleOpenWhatsAppReceipt = (rec) => {
    if (!rec) return;
    const phone = rec.mobile || rec.guardianMobile || selectedStudent?.guardianMobile || selectedStudent?.mobile || '';
    setWhatsAppModal({
      visible: true,
      recipientName: rec.guardianName || selectedStudent?.guardianName || rec.studentName || selectedStudent?.fullName || 'Parent',
      recipientPhone: phone,
      recipientRole: `Parent of ${rec.studentName || selectedStudent?.fullName || 'Student'}`,
      moduleKey: 'feeReceipt',
      moduleTitle: 'Fee Receipt Notification (WhatsApp)',
      templateData: {
        ParentName: rec.guardianName || selectedStudent?.guardianName || 'Parent',
        StudentName: rec.studentName || selectedStudent?.fullName || 'Student',
        ReceiptNo: rec.receiptNo || `REC-${rec.id}`,
        PaidAmount: rec.amount || rec.totalPaid || 0,
        Date: rec.receiptDate ? new Date(rec.receiptDate).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN'),
        Balance: rec.remainingBalance != null ? rec.remainingBalance : 0,
        SchoolName: branchInfo?.schoolName || user?.schoolName || 'School',
      },
    });
  };

  const handleOpenCancelReceiptModal = (rec) => {
    setReceiptToCancel(rec);
    setCancelReason('');
    setCancelModalVisible(true);
  };

  const handleConfirmCancelReceipt = async () => {
    if (!receiptToCancel) return;
    if (!cancelReason.trim()) {
      Alert.alert('Required', 'Please enter a valid reason for cancellation.');
      return;
    }
    const rId = receiptToCancel.receiptId || receiptToCancel.id;
    try {
      setCancellingReceipt(true);
      const res = await feesApi.cancelReceipt(rId, { reason: cancelReason.trim() });
      if (res.data?.success) {
        Alert.alert('Cancelled', 'Receipt has been cancelled successfully.');
        setCancelModalVisible(false);
        setReceiptToCancel(null);
        setCancelReason('');
        loadCollectionReport(dateRange.startDate, dateRange.endDate);
      } else {
        Alert.alert('Failed', res.data?.message || 'Server rejected cancellation.');
      }
    } catch (e) {
      console.warn('Cancel receipt error:', e);
      Alert.alert('Error', e.response?.data?.message || 'Failed to cancel receipt.');
    } finally {
      setCancellingReceipt(false);
    }
  };

  // ----------------------------------------------------
  // TAB 2: STUDENT SEARCH & DUES HANDLING
  // ----------------------------------------------------
  useEffect(() => {
    if (!searchQuery.trim()) {
      setStudentResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await studentApi.getStudents({ search: searchQuery.trim(), pageSize: 10 });
        const list = res.data?.data?.items || res.data?.items || [];
        setStudentResults(list);
      } catch (e) {
        console.warn('Student search error:', e);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle route params
  useEffect(() => {
    if (route?.params?.student) {
      setActiveTab('dues');
      handleSelectStudent(route.params.student);
    } else if (route?.params?.studentId) {
      setActiveTab('dues');
      studentApi.getStudentDetail(route.params.studentId).then((res) => {
        if (res.data?.success && res.data?.data) {
          handleSelectStudent(res.data.data);
        }
      }).catch((e) => console.warn('Route student fetch error:', e));
    }
  }, [route?.params]);

  // Group dues strictly chronologically (matching FeeCollectionPage.jsx)
  const monthGroups = useMemo(() => {
    const dues = duesData?.dues || [];
    if (!dues.length) return [];
    const groupsMap = new Map();

    dues.forEach((d) => {
      const instId = d.installmentId || 0;
      if (!groupsMap.has(instId)) {
        groupsMap.set(instId, {
          installmentId: instId,
          installmentName: d.installmentName || 'General Installment',
          displayOrder: Number(d.displayOrder || 0),
          dueDate: d.dueDate,
          items: [],
          totalOriginal: 0,
          totalConcession: 0,
          totalPaid: 0,
          totalBalance: 0,
          totalFine: 0,
          totalPayable: 0,
          isPaid: true,
          hasUnpaid: false,
        });
      }
      const g = groupsMap.get(instId);
      g.items.push(d);
      g.totalOriginal += Number(d.originalAmount || 0);
      g.totalConcession += Number(d.concessionAmount || 0);
      g.totalPaid += Number(d.paidAmount || 0);
      g.totalBalance += Number(d.balanceAmount || 0);
      g.totalFine += Number(d.fineAmount || 0);
      g.totalPayable += (Number(d.balanceAmount || 0) + Number(d.fineAmount || 0));

      if (Number(d.balanceAmount || 0) > 0) {
        g.isPaid = false;
        g.hasUnpaid = true;
      }
    });

    const groups = Array.from(groupsMap.values());
    groups.sort((a, b) => {
      if (a.displayOrder && b.displayOrder && a.displayOrder !== b.displayOrder) {
        return a.displayOrder - b.displayOrder;
      }
      return new Date(a.dueDate) - new Date(b.dueDate);
    });
    return groups;
  }, [duesData]);

  const unpaidMonths = useMemo(() => {
    return monthGroups.filter((g) => g.hasUnpaid);
  }, [monthGroups]);

  const paidMonths = useMemo(() => {
    return monthGroups.filter((g) => g.isPaid);
  }, [monthGroups]);

  const visiblePayMonths = useMemo(() => {
    return unpaidMonths.filter((m) => selectedMonthIds.includes(m.installmentId));
  }, [unpaidMonths, selectedMonthIds]);

  const visibleMonthsInTable = useMemo(() => {
    if (showPaidMonths) {
      return monthGroups.filter((m) => selectedMonthIds.includes(m.installmentId) || m.isPaid);
    }
    return visiblePayMonths;
  }, [monthGroups, selectedMonthIds, showPaidMonths, visiblePayMonths]);

  // Active payable heads across selected unpaid months
  const activeDueItems = useMemo(() => {
    const list = [];
    visiblePayMonths.forEach((m) => {
      m.items.forEach((item) => {
        if (Number(item.balanceAmount || 0) > 0) {
          if (!item.isOptional || !deselectedOptionalDueIds[item.dueId]) {
            list.push(item);
          }
        }
      });
    });
    return list;
  }, [visiblePayMonths, deselectedOptionalDueIds]);

  const maxTotalPayable = useMemo(() => {
    return activeDueItems.reduce(
      (sum, item) => sum + Number(item.balanceAmount || 0) + Number(item.fineAmount || 0),
      0
    );
  }, [activeDueItems]);

  const numericDiscount = Number(overallDiscount) || 0;
  const netPayable = Math.max(0, maxTotalPayable - numericDiscount);

  // Discount limit check
  const discountError = useMemo(() => {
    if (!discountEligibility.canGiveDiscount) return '';
    const disc = Number(overallDiscount) || 0;
    const pct = Number(discountPercent) || 0;
    if (disc <= 0 && pct <= 0) return '';
    const maxPercent = Number(discountEligibility.maxDiscountLimit || 0);
    if (!discountEligibility.isUnlimited && maxPercent > 0 && maxPercent < 100) {
      if (pct > maxPercent) {
        return `Discount (${pct}%) exceeds authorized limit of ${maxPercent}%`;
      }
      const maxAllowed = Math.round((maxTotalPayable * maxPercent) / 100);
      if (disc > maxAllowed) {
        return `Discount exceeds authorized limit of ${maxPercent}% (Max ₹${maxAllowed.toLocaleString('en-IN')})`;
      }
    }
    if (pct > 100) return 'Discount cannot exceed 100%';
    if (disc > maxTotalPayable && maxTotalPayable > 0) {
      return `Discount cannot exceed total fee of ₹${maxTotalPayable.toLocaleString('en-IN')}`;
    }
    return '';
  }, [overallDiscount, discountPercent, discountEligibility, maxTotalPayable]);

  // Sync amountToPay whenever selection or discount changes
  useEffect(() => {
    if (visiblePayMonths.length > 0) {
      setAmountToPay(netPayable > 0 ? String(netPayable) : (maxTotalPayable > 0 && netPayable === 0 ? '0' : ''));
    } else {
      setAmountToPay('');
    }
  }, [selectedMonthIds, deselectedOptionalDueIds, overallDiscount]);

  const handleSelectStudent = async (student) => {
    setSelectedStudent(student);
    setSearchQuery('');
    setStudentResults([]);
    setSelectedMonthIds([]);
    setDeselectedOptionalDueIds({});
    setHeadAllocatedAmounts({});
    setOverallDiscount('');
    setDiscountPercent('');
    setDiscountRemarks('');
    setFifoNotice('');
    setShowPaidMonths(false);

    try {
      setLoadingDues(true);
      const res = await feesApi.getStudentDues(student.id);
      if (res.data?.success && res.data?.data) {
        const summary = res.data.data;
        setDuesData(summary);

        const list = summary.dues || [];
        const groups = [];
        const map = new Map();
        list.forEach((d) => {
          const instId = d.installmentId || 0;
          if (!map.has(instId)) {
            map.set(instId, { ...d, hasUnpaid: Number(d.balanceAmount || 0) > 0 });
          }
        });
        const unpaid = Array.from(map.values()).filter((g) => g.hasUnpaid);
        if (unpaid.length > 0) {
          setSelectedMonthIds([unpaid[0].installmentId]);
        }
      }
    } catch (e) {
      console.warn('Student dues error:', e);
      Alert.alert('Notice', 'Unable to fetch dues for this student.');
    } finally {
      setLoadingDues(false);
    }
  };

  const handleClearStudent = () => {
    setSelectedStudent(null);
    setDuesData(null);
    setSelectedMonthIds([]);
    setDeselectedOptionalDueIds({});
    setHeadAllocatedAmounts({});
    setOverallDiscount('');
    setDiscountPercent('');
    setDiscountRemarks('');
    setFifoNotice('');
    setAmountToPay('');
  };

  // Strict Chronological FIFO month toggle (matching FeeCollectionPage.jsx)
  const handleToggleMonth = (instId) => {
    const targetMonth = monthGroups.find((m) => m.installmentId === instId);
    if (!targetMonth) return;

    if (targetMonth.isPaid) {
      setFifoNotice(`${targetMonth.installmentName} is already PAID. Toggle 'Show Paid' to see details.`);
      return;
    }

    const targetIdx = unpaidMonths.findIndex((m) => m.installmentId === instId);
    if (targetIdx === -1) return;

    const isAlreadySelected = selectedMonthIds.includes(instId);

    if (isAlreadySelected) {
      // FIFO Deselect: deselect target and all subsequent months
      const newSelection = unpaidMonths.slice(0, targetIdx).map((m) => m.installmentId);
      setSelectedMonthIds(newSelection);
      setFifoNotice('');
    } else {
      // FIFO Select: select all unpaid months from start up to targetIdx
      const newSelection = unpaidMonths.slice(0, targetIdx + 1).map((m) => m.installmentId);
      setSelectedMonthIds(newSelection);
      if (targetIdx > 0) {
        const priorNames = unpaidMonths.slice(0, targetIdx).map((m) => m.installmentName).join(', ');
        setFifoNotice(`Strict FIFO Rule: Earlier unpaid month(s) [${priorNames}] automatically included.`);
      } else {
        setFifoNotice('');
      }
    }
  };

  // Quick Action Buttons
  const handleSelectOneMonth = () => {
    if (unpaidMonths.length > 0) {
      setSelectedMonthIds([unpaidMonths[0].installmentId]);
      setFifoNotice('');
    }
  };

  const handleSelectNextMonths = (count = 2) => {
    const target = unpaidMonths.slice(0, count);
    setSelectedMonthIds(target.map((m) => m.installmentId));
    if (target.length > 1) {
      const priorNames = target.slice(0, target.length - 1).map((m) => m.installmentName).join(', ');
      setFifoNotice(`Selected ${target.length} consecutive months including Previous Dues [${priorNames}].`);
    } else {
      setFifoNotice('');
    }
  };

  const handleSelectUpToCurrentMonth = () => {
    const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    const curMonthName = monthNames[new Date().getMonth()];
    const currentMonthIdx = unpaidMonths.findIndex((m) =>
      m.installmentName.toLowerCase().includes(curMonthName)
    );

    if (currentMonthIdx !== -1) {
      const target = unpaidMonths.slice(0, currentMonthIdx + 1);
      setSelectedMonthIds(target.map((m) => m.installmentId));
      if (currentMonthIdx > 0) {
        const priorNames = target.slice(0, currentMonthIdx).map((m) => m.installmentName).join(', ');
        setFifoNotice(`Paying up to ${curMonthName.toUpperCase()}: Earlier months [${priorNames}] included.`);
      }
    } else {
      handleSelectOneMonth();
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedMonthIds.length === unpaidMonths.length) {
      setSelectedMonthIds([]);
      setFifoNotice('');
    } else {
      setSelectedMonthIds(unpaidMonths.map((m) => m.installmentId));
      setFifoNotice(`Selected all ${unpaidMonths.length} pending months.`);
    }
  };

  // Toggle optional due item (e.g. Transport or Computer Fee)
  const handleToggleOptionalDue = (dueId) => {
    setDeselectedOptionalDueIds((prev) => {
      const next = { ...prev };
      if (next[dueId]) {
        delete next[dueId];
      } else {
        next[dueId] = true;
      }
      return next;
    });
  };

  // Discount percentage / rupees sync
  const handleDiscountPercentChange = (val) => {
    if (val === '' || val === null || val === undefined) {
      setDiscountPercent('');
      setOverallDiscount('');
      return;
    }
    let num = parseFloat(val);
    if (isNaN(num) || num < 0) num = 0;
    if (num > 100) num = 100;
    setDiscountPercent(String(num));

    const calcRupees = maxTotalPayable > 0 ? Math.min(maxTotalPayable, Math.round((maxTotalPayable * num) / 100)) : 0;
    setOverallDiscount(calcRupees > 0 ? String(calcRupees) : (num === 0 ? '0' : ''));
  };

  const handleDiscountRupeesChange = (val) => {
    if (val === '' || val === null || val === undefined) {
      setOverallDiscount('');
      setDiscountPercent('');
      return;
    }
    let num = parseFloat(val);
    if (isNaN(num) || num < 0) num = 0;
    if (maxTotalPayable > 0 && num > maxTotalPayable) num = maxTotalPayable;
    setOverallDiscount(String(num));

    if (maxTotalPayable > 0) {
      const pct = Math.min(100, (num / maxTotalPayable) * 100);
      setDiscountPercent(Number.isInteger(pct) ? String(pct) : pct.toFixed(2));
    } else {
      setDiscountPercent('');
    }
  };

  // Strict FIFO distribution of payment cash
  const distributeAmountToDues = (paymentAmount, items) => {
    let remaining = Number(paymentAmount) || 0;
    const result = {};

    // 1. Allocate late fines first
    items.forEach((item) => {
      const fine = Number(item.fineAmount || 0);
      const fineToPay = Math.min(remaining, fine);
      remaining -= fineToPay;
      result[item.dueId] = {
        dueId: item.dueId,
        amountToPay: 0,
        fineToPay,
        balanceAmount: Number(item.balanceAmount || 0),
      };
    });

    // 2. Allocate remaining to principal balance
    items.forEach((item) => {
      const bal = Number(item.balanceAmount || 0);
      const amountToPay = Math.min(remaining, bal);
      remaining -= amountToPay;
      if (result[item.dueId]) {
        result[item.dueId].amountToPay = amountToPay;
      }
    });

    return result;
  };

  // Fee Collection Submission
  const handleCollectFee = async () => {
    if (!selectedStudent?.id) {
      Alert.alert('Validation Error', 'Please select a student.');
      return;
    }
    if (visiblePayMonths.length === 0) {
      Alert.alert('Validation Error', 'Please select at least one fee month/installment.');
      return;
    }
    if (discountError) {
      Alert.alert('Validation Error', discountError);
      return;
    }

    const amt = parseFloat(amountToPay);
    if (netPayable > 0 && (!amt || amt <= 0)) {
      Alert.alert('Validation Error', 'Please enter a payment amount greater than 0.');
      return;
    }
    if (amt > netPayable) {
      Alert.alert('Validation Error', `Amount cannot exceed net payable of ₹${netPayable.toLocaleString('en-IN')}`);
      return;
    }

    // Allocate payment
    const totalToSettle = (amt || 0) + numericDiscount;
    const allocation = distributeAmountToDues(totalToSettle, activeDueItems);

    const duesToPay = Object.values(allocation).map((d) => ({
      dueId: Number(d.dueId),
      amountToPay: Number(d.amountToPay) || 0,
      fineToPay: Number(d.fineToPay) || 0,
    }));

    // Map payment mode string to backend enum:
    // 1=Cash, 2=UPI, 3=Card, 4=Cheque, 5=BankTransfer
    let modeId = 1;
    if (paymentMode === 'UPI') modeId = 2;
    else if (paymentMode === 'Card') modeId = 3;
    else if (paymentMode === 'Cheque') modeId = 4;
    else if (paymentMode === 'BankTransfer' || paymentMode === 'Bank') modeId = 5;

    const payload = {
      studentId: Number(selectedStudent.id),
      duesToPay,
      payments: [
        {
          mode: modeId,
          amount: amt || 0,
          transactionRef: transactionRef.trim() || null,
          bankName: bankName.trim() || null,
          chequeNo: chequeNo.trim() || null,
          chequeDate: null,
        },
      ],
      overallDiscount: numericDiscount > 0 ? numericDiscount : 0,
      discountRemarks: discountRemarks.trim() || null,
      remarks: cashierRemarks.trim() || 'Collected via School ERP Mobile App',
    };

    try {
      setSubmittingFee(true);
      const res = await feesApi.collectFee(payload);
      if (res.data?.success) {
        const returned = res.data.data || {};
        Alert.alert(
          'Success',
          `Fee collected successfully!\nReceipt No: ${returned.receiptNo || 'Generated'}`
        );

        // Build full receipt object for dual-copy modal
        const receiptObj = {
          ...returned,
          studentName: returned.studentName || selectedStudent.fullName || selectedStudent.firstName || 'Student',
          admissionNo: returned.admissionNo || selectedStudent.admissionNo || '',
          className: returned.className || selectedStudent.className || '',
          fatherName: returned.fatherName || selectedStudent.fatherName || selectedStudent.guardianName || '',
          paymentModeName: paymentMode,
          totalPaid: amt,
          amount: amt,
          totalDiscount: numericDiscount > 0 ? numericDiscount : (returned.totalDiscount || 0),
          receiptDate: returned.receiptDate || new Date().toISOString(),
          items:
            returned.items ||
            duesToPay.map((d) => {
              const matched = activeDueItems.find((x) => x.dueId === d.dueId);
              return {
                feeHeadName: matched?.feeHeadName || 'School Fee',
                installmentName: matched?.installmentName || '',
                amountPaid: d.amountToPay,
                finePaid: d.fineToPay,
                balanceCarried: Math.max(0, (matched?.balanceAmount || 0) - d.amountToPay),
              };
            }),
        };

        // Reset form & reload reports
        handleClearStudent();
        loadCollectionReport(dateRange.startDate, dateRange.endDate);

        // Open Dual-Copy Modal immediately
        setPrintReceiptData(receiptObj);
        setIsNewReceipt(true);
        setReceiptModalVisible(true);
      } else {
        Alert.alert('Fee Collection Failed', res.data?.message || 'Server rejected fee collection.');
      }
    } catch (e) {
      console.warn('Fee collection error:', e);
      Alert.alert('Error', e.response?.data?.message || 'Unable to record fee collection.');
    } finally {
      setSubmittingFee(false);
    }
  };

  // Print & Share
  const handlePrintReceipt = async () => {
    if (!printReceiptData) return;
    try {
      setPrinting(true);
      const html = generateFeeReceiptHtml(printReceiptData, {
        user,
        branch: branchInfo,
        activeAcademicYearName,
      });
      await executePrint(html);
    } finally {
      setPrinting(false);
    }
  };

  const handleShareReceiptPdf = async () => {
    if (!printReceiptData) return;
    try {
      setPrinting(true);
      const html = generateFeeReceiptHtml(printReceiptData, {
        user,
        branch: branchInfo,
        activeAcademicYearName,
      });
      const fileName = `Fee_Receipt_${printReceiptData.studentName || 'Student'}_${printReceiptData.receiptNo || 'REC'}.pdf`;
      await executeSharePdf(html, fileName);
    } finally {
      setPrinting(false);
    }
  };

  const isPartPayment = parseFloat(amountToPay) > 0 && parseFloat(amountToPay) < netPayable;
  const isFullPayment = parseFloat(amountToPay) > 0 && Math.abs(parseFloat(amountToPay) - netPayable) < 0.01;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Tab Switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'summary' && styles.tabItemActive]}
          onPress={() => setActiveTab('summary')}
          activeOpacity={0.8}
        >
          <MaterialIcons
            name="receipt-long"
            size={18}
            color={activeTab === 'summary' ? '#0284c7' : '#64748b'}
          />
          <Text style={[styles.tabItemText, activeTab === 'summary' && styles.tabItemTextActive]}>
            Today's Summary
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'dues' && styles.tabItemActive]}
          onPress={() => setActiveTab('dues')}
          activeOpacity={0.8}
        >
          <MaterialIcons
            name="payment"
            size={18}
            color={activeTab === 'dues' ? '#0284c7' : '#64748b'}
          />
          <Text style={[styles.tabItemText, activeTab === 'dues' && styles.tabItemTextActive]}>
            Collect Fee / Dues
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          activeTab === 'summary' ? (
            <RefreshControl refreshing={refreshingSummary} onRefresh={handleRefreshSummary} colors={['#0284c7']} />
          ) : undefined
        }
      >
        {activeTab === 'summary' ? (
          // ==========================================
          // TAB 1: COLLECTION SUMMARY & RECEIPTS
          // ==========================================
          <View>
            {/* Quick Date Presets Bar */}
            <View style={styles.datePresetRow}>
              {[
                { key: 'today', label: 'Today' },
                { key: 'yesterday', label: 'Yesterday' },
                { key: 'last7', label: 'Last 7 Days' },
                { key: 'thisMonth', label: 'This Month' },
              ].map((p) => {
                const isSelected = datePreset === p.key;
                return (
                  <TouchableOpacity
                    key={p.key}
                    style={[styles.presetChip, isSelected && styles.presetChipSelected]}
                    onPress={() => handleSelectPreset(p.key)}
                  >
                    <Text style={[styles.presetChipText, isSelected && styles.presetChipTextSelected]}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Hero Card: Total Net Collection */}
            <View style={styles.heroCard}>
              <Text style={styles.heroLabel}>Net Active Collection</Text>
              <Text style={styles.heroAmount}>
                ₹{Number(collectionStats.totalPaid).toLocaleString('en-IN')}
              </Text>
              <Text style={styles.heroSubText}>
                {collectionStats.activeCount} Active Receipts
                {collectionStats.cancelledCount > 0 ? ` • ${collectionStats.cancelledCount} Cancelled` : ''}
                {' '}({dateRange.startDate} to {dateRange.endDate})
              </Text>
            </View>

            {/* Mode Breakdown 4-Card Grid */}
            <Text style={styles.sectionTitle}>Collection by Payment Mode</Text>
            <View style={styles.modeGrid}>
              <View style={[styles.modeCard, { borderLeftColor: '#10b981', borderLeftWidth: 4 }]}>
                <Text style={styles.modeLabel}>Cash</Text>
                <Text style={styles.modeAmount}>₹{Number(collectionStats.cash).toLocaleString('en-IN')}</Text>
              </View>

              <View style={[styles.modeCard, { borderLeftColor: '#0284c7', borderLeftWidth: 4 }]}>
                <Text style={styles.modeLabel}>UPI / QR</Text>
                <Text style={styles.modeAmount}>₹{Number(collectionStats.upi).toLocaleString('en-IN')}</Text>
              </View>

              <View style={[styles.modeCard, { borderLeftColor: '#6366f1', borderLeftWidth: 4 }]}>
                <Text style={styles.modeLabel}>Cheque / DD</Text>
                <Text style={styles.modeAmount}>₹{Number(collectionStats.cheque).toLocaleString('en-IN')}</Text>
              </View>

              <View style={[styles.modeCard, { borderLeftColor: '#f59e0b', borderLeftWidth: 4 }]}>
                <Text style={styles.modeLabel}>Bank / Card</Text>
                <Text style={styles.modeAmount}>
                  ₹{Number(collectionStats.bank + collectionStats.card).toLocaleString('en-IN')}
                </Text>
              </View>
            </View>

            {/* Mode Filter Chips */}
            <View style={styles.filterChipRow}>
              <Text style={styles.filterChipRowLabel}>Filter Mode:</Text>
              {['ALL', 'Cash', 'UPI', 'Cheque', 'BankTransfer', 'Card'].map((m) => {
                const isSel = paymentModeFilter === m;
                return (
                  <TouchableOpacity
                    key={m}
                    style={[styles.filterMiniChip, isSel && styles.filterMiniChipSelected]}
                    onPress={() => setPaymentModeFilter(m)}
                  >
                    <Text style={[styles.filterMiniChipText, isSel && styles.filterMiniChipTextSelected]}>
                      {m === 'BankTransfer' ? 'Bank' : m}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Receipt Search Input */}
            <View style={styles.receiptSearchBox}>
              <MaterialIcons name="search" size={20} color="#94a3b8" />
              <TextInput
                style={styles.receiptSearchInput}
                placeholder="Search receipt no, student, class, admission no..."
                placeholderTextColor="#94a3b8"
                value={receiptSearchQuery}
                onChangeText={setReceiptSearchQuery}
              />
              {receiptSearchQuery ? (
                <TouchableOpacity onPress={() => setReceiptSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color="#94a3b8" />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Receipts List */}
            <View style={styles.receiptListHeader}>
              <Text style={styles.sectionTitle}>
                Fee Receipts Register ({filteredReceipts.length})
              </Text>
              {loadingSummary && <ActivityIndicator size="small" color="#0284c7" />}
            </View>

            {filteredReceipts.length > 0 ? (
              filteredReceipts.map((rec, i) => {
                const isCancelled = rec.status === 2 || String(rec.status).toLowerCase() === 'cancelled';
                return (
                  <View
                    key={rec.receiptId || rec.id || i}
                    style={[styles.receiptCard, isCancelled && styles.receiptCardCancelled]}
                  >
                    <View style={styles.receiptTop}>
                      <View style={{ flex: 1 }}>
                        <View style={styles.receiptNoRow}>
                          <Text style={styles.receiptNo}>{rec.receiptNo}</Text>
                          <View
                            style={[
                              styles.statusBadge,
                              isCancelled ? styles.statusBadgeCancelled : styles.statusBadgePaid,
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusBadgeText,
                                isCancelled ? styles.statusBadgeTextCancelled : styles.statusBadgeTextPaid,
                              ]}
                            >
                              {isCancelled ? 'CANCELLED' : 'PAID'}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.receiptStudent}>{rec.studentName}</Text>
                        <Text style={styles.receiptMeta}>
                          {rec.classSection || 'N/A'} • Adm: {rec.admissionNo || '—'}
                        </Text>
                        <Text style={styles.receiptMode}>
                          Mode: <Text style={{ fontWeight: '700', color: '#334155' }}>{rec.paymentModes || 'Cash'}</Text>
                          {' '}• Cashier: {rec.collectedBy || 'Staff'}
                        </Text>
                        <Text style={styles.receiptTime}>
                          {rec.receiptDate ? new Date(rec.receiptDate).toLocaleString('en-IN') : 'Today'}
                        </Text>
                      </View>

                      <View style={{ alignItems: 'flex-end', justifyContent: 'space-between' }}>
                        <Text style={[styles.receiptAmount, isCancelled && { color: '#94a3b8', textDecorationLine: 'line-through' }]}>
                          ₹{Number(rec.totalPaid || rec.amount || 0).toLocaleString('en-IN')}
                        </Text>

                        {/* Card Actions: Print Slip, WhatsApp, Cancel */}
                        <View style={styles.receiptCardActions}>
                          <TouchableOpacity
                            style={styles.printSlipMiniBtn}
                            onPress={() => handleOpenReceipt(rec)}
                          >
                            <Ionicons name="print-outline" size={13} color="#0284c7" />
                            <Text style={styles.printSlipMiniBtnText}>Print</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.waMiniBtn}
                            onPress={() => handleOpenWhatsAppReceipt(rec)}
                          >
                            <Ionicons name="logo-whatsapp" size={13} color="#16a34a" />
                          </TouchableOpacity>

                          {!isCancelled && (
                            <TouchableOpacity
                              style={styles.cancelMiniBtn}
                              onPress={() => handleOpenCancelReceiptModal(rec)}
                            >
                              <MaterialIcons name="cancel" size={14} color="#dc2626" />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyCard}>
                <MaterialIcons name="receipt" size={40} color="#cbd5e1" />
                <Text style={styles.emptyText}>
                  {loadingSummary ? 'Loading fee receipts...' : 'No fee receipts found for the selected filters.'}
                </Text>
              </View>
            )}
          </View>
        ) : (
          // ==========================================
          // TAB 2: COLLECT FEE / DUES
          // ==========================================
          <View>
            {/* Student Search & Selection Card */}
            <View style={styles.searchCard}>
              <Text style={styles.cardHeaderTitle}>Select Student to Collect Fee</Text>

              {selectedStudent ? (
                <View style={styles.selectedBox}>
                  <View style={styles.selectedAvatar}>
                    <Text style={styles.selectedAvatarText}>
                      {(selectedStudent.fullName || selectedStudent.studentName || 'S')[0].toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.selectedCol}>
                    <Text style={styles.selectedName}>
                      {selectedStudent.fullName || selectedStudent.studentName || selectedStudent.firstName}
                    </Text>
                    <Text style={styles.selectedMeta}>
                      Class: {selectedStudent.className || 'N/A'} {selectedStudent.sectionName ? `(${selectedStudent.sectionName})` : ''} • Adm No: {selectedStudent.admissionNo}
                    </Text>
                    <Text style={styles.selectedFather}>
                      Father: {selectedStudent.fatherName || selectedStudent.guardianName || '—'} • Mobile: {selectedStudent.guardianMobile || selectedStudent.mobile || '—'}
                    </Text>
                  </View>

                  <TouchableOpacity style={styles.changeBtn} onPress={handleClearStudent}>
                    <MaterialIcons name="close" size={18} color="#0284c7" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <View style={styles.searchBox}>
                    <MaterialIcons name="search" size={20} color="#94a3b8" />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search student name, roll no or admission no..."
                      placeholderTextColor="#94a3b8"
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                    {searching ? <ActivityIndicator size="small" color="#0284c7" /> : null}
                  </View>

                  {studentResults.length > 0 && (
                    <View style={styles.resultsBox}>
                      {studentResults.map((s) => (
                        <TouchableOpacity
                          key={s.id}
                          style={styles.resultItem}
                          onPress={() => handleSelectStudent(s)}
                        >
                          <View style={styles.resultCol}>
                            <Text style={styles.resultName}>
                              {s.fullName || `${s.firstName || ''} ${s.lastName || ''}`.trim()}
                            </Text>
                            <Text style={styles.resultMeta}>
                              Adm: {s.admissionNo} • Class: {s.className || 'N/A'}
                            </Text>
                            <Text style={styles.resultFather}>Father: {s.fatherName || s.guardianName || '—'}</Text>
                          </View>
                          <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>

            {loadingDues ? (
              <View style={styles.centerLoading}>
                <ActivityIndicator size="large" color="#0284c7" />
                <Text style={styles.loadingText}>Fetching student dues & fee heads...</Text>
              </View>
            ) : selectedStudent && duesData ? (
              <View>
                {/* Dues Summary Top Banner */}
                <View style={styles.duesBanner}>
                  <View style={styles.duesBannerCol}>
                    <Text style={styles.duesBannerLabel}>TOTAL OUTSTANDING DUES</Text>
                    <Text style={styles.duesBannerVal}>
                      ₹{Number(duesData.totalOutstanding || 0).toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={styles.duesBannerDivider} />
                  <View style={styles.duesBannerCol}>
                    <Text style={styles.duesBannerLabel}>LATE FINES</Text>
                    <Text style={[styles.duesBannerVal, { color: '#e11d48' }]}>
                      +₹{Number(duesData.totalFine || 0).toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={styles.duesBannerDivider} />
                  <View style={styles.duesBannerCol}>
                    <Text style={styles.duesBannerLabel}>TOTAL PAID</Text>
                    <Text style={[styles.duesBannerVal, { color: '#16a34a' }]}>
                      ₹{Number(duesData.totalPaid || 0).toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>

                {/* Strict FIFO Informational Notice */}
                {fifoNotice ? (
                  <View style={styles.noticeBox}>
                    <Ionicons name="information-circle" size={16} color="#0284c7" />
                    <Text style={styles.noticeText}>{fifoNotice}</Text>
                  </View>
                ) : null}

                {/* Quick Actions Bar */}
                <View style={styles.quickActionsRow}>
                  <TouchableOpacity style={styles.quickBtn} onPress={handleSelectOneMonth}>
                    <Text style={styles.quickBtnText}>Pay 1 Month</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.quickBtn} onPress={() => handleSelectNextMonths(2)}>
                    <Text style={styles.quickBtnText}>Next 2 Months</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.quickBtn} onPress={handleSelectUpToCurrentMonth}>
                    <Text style={styles.quickBtnText}>Up to Current Month</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.quickBtn, selectedMonthIds.length === unpaidMonths.length && styles.quickBtnActive]}
                    onPress={handleToggleSelectAll}
                  >
                    <Text style={[styles.quickBtnText, selectedMonthIds.length === unpaidMonths.length && styles.quickBtnTextActive]}>
                      {selectedMonthIds.length === unpaidMonths.length ? 'Deselect All' : 'Select All'}
                    </Text>
                  </TouchableOpacity>

                  {paidMonths.length > 0 && (
                    <TouchableOpacity
                      style={[styles.quickBtn, showPaidMonths && styles.quickBtnPaidActive]}
                      onPress={() => setShowPaidMonths(!showPaidMonths)}
                    >
                      <Text style={[styles.quickBtnText, showPaidMonths && styles.quickBtnTextPaidActive]}>
                        {showPaidMonths ? 'Hide Paid' : `Show Paid (${paidMonths.length})`}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Horizontal Month Chips (Strict FIFO sequence) */}
                <View style={styles.monthChipsCard}>
                  <Text style={styles.monthChipsTitle}>
                    SELECT FEE MONTHS / INSTALLMENTS (STRICT FIFO):
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthScrollRow}>
                    {monthGroups.map((mg) => {
                      const isSelected = selectedMonthIds.includes(mg.installmentId);
                      const isPaid = mg.isPaid;
                      return (
                        <TouchableOpacity
                          key={mg.installmentId}
                          style={[
                            styles.monthChip,
                            isSelected && styles.monthChipSelected,
                            isPaid && styles.monthChipPaid,
                          ]}
                          onPress={() => handleToggleMonth(mg.installmentId)}
                          activeOpacity={0.75}
                        >
                          <View style={styles.monthChipHeader}>
                            <Ionicons
                              name={isPaid ? 'checkmark-circle' : isSelected ? 'checkbox' : 'square-outline'}
                              size={14}
                              color={isPaid ? '#16a34a' : isSelected ? '#ffffff' : '#64748b'}
                            />
                            <Text
                              style={[
                                styles.monthChipName,
                                isSelected && styles.monthChipTextSelected,
                                isPaid && styles.monthChipTextPaid,
                              ]}
                              numberOfLines={1}
                            >
                              {mg.installmentName}
                            </Text>
                          </View>

                          <Text
                            style={[
                              styles.monthChipAmt,
                              isSelected && styles.monthChipAmtSelected,
                              isPaid && styles.monthChipAmtPaid,
                            ]}
                          >
                            {isPaid ? 'PAID' : `₹${Number(mg.totalPayable).toLocaleString('en-IN')}`}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Fee Heads Breakdown Table / List (Matching Web App) */}
                <View style={styles.breakdownCard}>
                  <Text style={styles.cardHeaderTitle}>
                    Fee Heads Breakdown ({visiblePayMonths.length} Months Selected)
                  </Text>

                  {visibleMonthsInTable.length === 0 ? (
                    <View style={styles.emptyTableBox}>
                      <Ionicons name="calendar-outline" size={32} color="#94a3b8" />
                      <Text style={styles.emptyTableText}>
                        No months selected. Pick a month from the chips above.
                      </Text>
                    </View>
                  ) : (
                    visibleMonthsInTable.map((month) => {
                      const unpaidItems = month.items.filter((d) => Number(d.balanceAmount || 0) > 0);
                      const monthItems = unpaidItems.length > 0 ? unpaidItems : month.items;

                      return (
                        <View key={month.installmentId} style={styles.monthGroupContainer}>
                          {/* Month Group Header */}
                          <View style={styles.monthGroupHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <MaterialIcons name="calendar-today" size={16} color="#0284c7" />
                              <Text style={styles.monthGroupTitle}>{month.installmentName}</Text>
                              {month.isPaid ? (
                                <View style={styles.paidMiniBadge}>
                                  <Text style={styles.paidMiniBadgeText}>PAID</Text>
                                </View>
                              ) : null}
                            </View>
                            <Text style={styles.monthGroupDue}>
                              Due: ₹{Number(month.totalBalance).toLocaleString('en-IN')}
                              {month.totalFine > 0 ? ` (+₹${month.totalFine} Fine)` : ''}
                            </Text>
                          </View>

                          {/* Fee Head Rows */}
                          {monthItems.map((head) => {
                            const isOptional = Boolean(head.isOptional);
                            const isDeselected = Boolean(deselectedOptionalDueIds[head.dueId]);
                            const isIncluded = !isDeselected;

                            return (
                              <View
                                key={head.dueId}
                                style={[styles.headRow, !isIncluded && { opacity: 0.5 }]}
                              >
                                <View style={styles.headLeft}>
                                  <TouchableOpacity
                                    disabled={!isOptional || month.isPaid}
                                    onPress={() => isOptional && handleToggleOptionalDue(head.dueId)}
                                    style={styles.headCheckbox}
                                  >
                                    <Ionicons
                                      name={
                                        month.isPaid
                                          ? 'checkmark-circle'
                                          : isIncluded
                                          ? 'checkbox'
                                          : 'square-outline'
                                      }
                                      size={18}
                                      color={month.isPaid ? '#16a34a' : isIncluded ? '#0284c7' : '#94a3b8'}
                                    />
                                  </TouchableOpacity>

                                  <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                      <Text style={styles.headName}>{head.feeHeadName}</Text>
                                      {isOptional && (
                                        <View style={styles.optionalBadge}>
                                          <Text style={styles.optionalBadgeText}>Optional</Text>
                                        </View>
                                      )}
                                    </View>
                                    <Text style={styles.headMeta}>
                                      Fee: ₹{Number(head.originalAmount || 0).toLocaleString('en-IN')}
                                      {Number(head.concessionAmount || 0) > 0 ? ` • Concession: -₹${head.concessionAmount}` : ''}
                                      {Number(head.paidAmount || 0) > 0 ? ` • Paid: ₹${head.paidAmount}` : ''}
                                    </Text>
                                  </View>
                                </View>

                                <View style={styles.headRight}>
                                  <Text style={styles.headBalLabel}>Remaining</Text>
                                  <Text
                                    style={[
                                      styles.headBalAmount,
                                      Number(head.balanceAmount || 0) > 0 ? { color: '#dc2626' } : { color: '#16a34a' },
                                    ]}
                                  >
                                    ₹{Number(head.balanceAmount || 0).toLocaleString('en-IN')}
                                  </Text>
                                </View>
                              </View>
                            );
                          })}

                          {/* Late Fine Row if fine exists */}
                          {month.totalFine > 0 && (
                            <View style={styles.fineRow}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Ionicons name="flash" size={14} color="#e11d48" />
                                <Text style={styles.fineTitle}>Late Fine Penalty ({month.installmentName})</Text>
                              </View>
                              <Text style={styles.fineAmount}>+₹{Number(month.totalFine).toLocaleString('en-IN')}</Text>
                            </View>
                          )}
                        </View>
                      );
                    })
                  )}
                </View>

                {/* Authorized Fee Discount Section - Always Available */}
                <View style={styles.discountCard}>
                  <View style={styles.discountHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="pricetag" size={15} color={isDark ? '#4ade80' : '#166534'} />
                      <Text style={styles.discountTitle}>Authorized Fee Discount</Text>
                    </View>
                    <View style={styles.discountAuthorityBadge}>
                      <Text style={styles.discountAuthorityBadgeText}>
                        {discountEligibility.isUnlimited || !discountEligibility.maxDiscountLimit || Number(discountEligibility.maxDiscountLimit) >= 100
                          ? 'Authority: 100% (Unlimited)'
                          : `Max Limit: ${discountEligibility.maxDiscountLimit}%`}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.discountInputsRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputMiniLabel}>Discount (%)</Text>
                      <TextInput
                        style={styles.discountInput}
                        placeholder="0"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="numeric"
                        value={discountPercent}
                        onChangeText={handleDiscountPercentChange}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputMiniLabel}>Discount (₹ Amount)</Text>
                      <TextInput
                        style={styles.discountInput}
                        placeholder="0"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="numeric"
                        value={overallDiscount}
                        onChangeText={handleDiscountRupeesChange}
                      />
                    </View>
                  </View>

                  <Text style={[styles.inputMiniLabel, { marginTop: 8 }]}>Discount Remarks / Reason</Text>
                  <TextInput
                    style={styles.discountRemarksInput}
                    placeholder="e.g. Special management discount / sibling concession"
                    placeholderTextColor={colors.textSecondary}
                    value={discountRemarks}
                    onChangeText={setDiscountRemarks}
                  />

                  {/* Quick % chips */}
                  {maxTotalPayable > 0 && (
                    <View style={styles.quickPctRow}>
                      <Text style={styles.quickPctLabel}>Quick %:</Text>
                      {[5, 10, 15, 20, 25, 50, 100]
                        .filter((p) => discountEligibility.isUnlimited || p <= Number(discountEligibility.maxDiscountLimit || 100))
                        .map((p) => (
                          <TouchableOpacity
                            key={p}
                            style={[styles.quickPctChip, String(discountPercent) === String(p) && styles.quickPctChipActive]}
                            onPress={() => handleDiscountPercentChange(String(p))}
                          >
                            <Text style={[styles.quickPctChipText, String(discountPercent) === String(p) && styles.quickPctChipTextActive]}>
                              {p}%
                            </Text>
                          </TouchableOpacity>
                        ))}
                    </View>
                  )}

                  {discountError ? (
                    <Text style={styles.discountErrorText}>⚠️ {discountError}</Text>
                  ) : null}
                </View>

                {/* Payment Breakdown & Entry Card */}
                <View style={styles.paymentCard}>
                  <Text style={styles.cardHeaderTitle}>Payment Details</Text>

                  {/* Live Calculation Strip */}
                  <View style={styles.calcSummaryBox}>
                    <View style={styles.calcRow}>
                      <Text style={styles.calcLabel}>Gross Fee (Selected Heads):</Text>
                      <Text style={styles.calcVal}>₹{Number(maxTotalPayable).toLocaleString('en-IN')}</Text>
                    </View>
                    {numericDiscount > 0 && (
                      <View style={styles.calcRow}>
                        <Text style={[styles.calcLabel, { color: '#16a34a' }]}>Authorized Discount:</Text>
                        <Text style={[styles.calcVal, { color: '#16a34a' }]}>
                          -₹{Number(numericDiscount).toLocaleString('en-IN')}
                        </Text>
                      </View>
                    )}
                    <View style={[styles.calcRow, styles.calcRowTotal]}>
                      <Text style={styles.calcLabelTotal}>Net Payable Amount:</Text>
                      <Text style={styles.calcValTotal}>₹{Number(netPayable).toLocaleString('en-IN')}</Text>
                    </View>
                  </View>

                  {/* Amount to Pay Input */}
                  <Text style={styles.inputLabel}>Amount to Collect (₹) *</Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="Enter payment amount"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    value={amountToPay}
                    onChangeText={setAmountToPay}
                  />

                  {/* Payment Status Pill */}
                  {isFullPayment && (
                    <View style={styles.fullPaymentBadge}>
                      <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                      <Text style={styles.fullPaymentText}>✓ Full Payment: Paying entire net fee</Text>
                    </View>
                  )}
                  {isPartPayment && (
                    <View style={styles.partPaymentBadge}>
                      <Ionicons name="warning" size={16} color="#b45309" />
                      <Text style={styles.partPaymentText}>
                        ⚡ Part Payment: Remaining ₹{(netPayable - parseFloat(amountToPay)).toLocaleString('en-IN')} will carry forward
                      </Text>
                    </View>
                  )}

                  {/* Mode Selector Chips */}
                  <Text style={[styles.inputLabel, { marginTop: 12 }]}>Payment Mode *</Text>
                  <View style={styles.modesRow}>
                    {['Cash', 'UPI', 'Card', 'Cheque', 'BankTransfer'].map((m) => {
                      const sel = paymentMode === m;
                      return (
                        <TouchableOpacity
                          key={m}
                          style={[styles.modeChip, sel && styles.modeChipSelected]}
                          onPress={() => setPaymentMode(m)}
                        >
                          <Text style={[styles.modeChipText, sel && styles.modeChipTextSelected]}>
                            {m === 'BankTransfer' ? 'Bank' : m}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Reference ID / Cheque No / Bank Name */}
                  {paymentMode !== 'Cash' && (
                    <View style={{ gap: 10, marginTop: 8 }}>
                      <View>
                        <Text style={styles.inputMiniLabel}>
                          {paymentMode === 'Cheque' ? 'Cheque Number *' : 'Transaction Ref / UTR No.'}
                        </Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder={paymentMode === 'Cheque' ? 'e.g. CHQ-928173' : 'e.g. UPI Ref / Bank UTR'}
                          placeholderTextColor="#94a3b8"
                          value={paymentMode === 'Cheque' ? chequeNo : transactionRef}
                          onChangeText={paymentMode === 'Cheque' ? setChequeNo : setTransactionRef}
                        />
                      </View>

                      <View>
                        <Text style={styles.inputMiniLabel}>Bank Name</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="e.g. State Bank of India, HDFC"
                          placeholderTextColor="#94a3b8"
                          value={bankName}
                          onChangeText={setBankName}
                        />
                      </View>
                    </View>
                  )}

                  {/* Cashier Remarks */}
                  <Text style={[styles.inputMiniLabel, { marginTop: 10 }]}>Remarks</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Paid in full by father"
                    placeholderTextColor="#94a3b8"
                    value={cashierRemarks}
                    onChangeText={setCashierRemarks}
                  />

                  {/* Collect Fee Button */}
                  <TouchableOpacity
                    style={[styles.collectBtn, (submittingFee || Boolean(discountError)) && styles.collectBtnDisabled]}
                    onPress={handleCollectFee}
                    disabled={submittingFee || Boolean(discountError)}
                    activeOpacity={0.8}
                  >
                    {submittingFee ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <View style={styles.collectBtnRow}>
                        <MaterialIcons name="receipt" size={20} color="#ffffff" />
                        <Text style={styles.collectBtnText}>
                          {isPartPayment
                            ? `Collect Part Payment (₹${Number(amountToPay || 0).toLocaleString('en-IN')})`
                            : `Collect Fee & Generate Receipt (₹${Number(amountToPay || 0).toLocaleString('en-IN')})`}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>

      {/* ======================================================== */}
      {/* CANCEL RECEIPT CONFIRMATION MODAL                        */}
      {/* ======================================================== */}
      <Modal
        visible={cancelModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.cancelOverlay}>
          <View style={styles.cancelBox}>
            <View style={styles.cancelHeader}>
              <MaterialIcons name="cancel" size={24} color="#dc2626" />
              <Text style={styles.cancelTitle}>Cancel Fee Receipt</Text>
            </View>

            <Text style={styles.cancelWarningText}>
              Are you sure you want to cancel Receipt No{' '}
              <Text style={{ fontWeight: '800', color: '#dc2626' }}>{receiptToCancel?.receiptNo}</Text>?
              Student dues will be restored.
            </Text>

            <Text style={styles.inputMiniLabel}>Cancellation Reason *</Text>
            <TextInput
              style={styles.cancelReasonInput}
              placeholder="e.g. Cheque bounced / Wrong student selected / Double entry"
              placeholderTextColor="#94a3b8"
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
            />

            <View style={styles.cancelActionsRow}>
              <TouchableOpacity
                style={styles.cancelDismissBtn}
                onPress={() => setCancelModalVisible(false)}
                disabled={cancellingReceipt}
              >
                <Text style={styles.cancelDismissBtnText}>Keep Receipt</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.cancelConfirmBtn, cancellingReceipt && { opacity: 0.7 }]}
                onPress={handleConfirmCancelReceipt}
                disabled={cancellingReceipt}
              >
                {cancellingReceipt ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.cancelConfirmBtnText}>Confirm Cancel</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* DUAL COPY FEE RECEIPT MODAL (School Copy + Student Copy) */}
      {/* ======================================================== */}
      <Modal
        visible={receiptModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setReceiptModalVisible(false)}
      >
        <View style={styles.slipModalOverlay}>
          <View style={styles.slipModalContent}>
            {/* Modal Header */}
            <View style={styles.slipModalHeader}>
              <View style={styles.slipModalTitleRow}>
                <Ionicons name="receipt" size={22} color="#1e3a8a" />
                <View>
                  <Text style={styles.slipModalTitle}>Official Fee Receipt Slip</Text>
                  <Text style={styles.slipModalSubTitle}>Dual Copy Layout (Office Copy + Student Copy)</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.slipCloseBtn} onPress={() => setReceiptModalVisible(false)}>
                <Ionicons name="close" size={22} color="#475569" />
              </TouchableOpacity>
            </View>

            {/* Scrollable Receipt Preview */}
            <ScrollView contentContainerStyle={styles.slipScrollContainer}>
              {isNewReceipt && (
                <View style={styles.newSuccessBanner}>
                  <Ionicons name="checkmark-circle" size={20} color="#15803d" />
                  <Text style={styles.newSuccessBannerText}>
                    Fee collection recorded successfully! Print or share receipt below.
                  </Text>
                </View>
              )}

              {printReceiptData && (
                <View style={styles.paperPreview}>
                  <View style={styles.receiptPaperHeader}>
                    <Text style={styles.receiptSchoolName}>
                      {branchInfo?.schoolName || user?.schoolName || 'DELHI PUBLIC SCHOOL'}
                    </Text>
                    <Text style={styles.receiptAffiliation}>
                      Affiliated to CBSE, New Delhi • Affiliation No: {branchInfo?.affiliationNumber || branchInfo?.affiliationNo || '2130892'}
                    </Text>
                    <View style={styles.receiptBadgeRow}>
                      <View style={styles.receiptBadge}>
                        <Text style={styles.receiptBadgeText}>FEE RECEIPT (DUAL COPY)</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.previewMetaBox}>
                    <View style={styles.previewMetaRow}>
                      <Text style={styles.previewMetaLabel}>Receipt No:</Text>
                      <Text style={styles.previewMetaValBold}>{printReceiptData.receiptNo}</Text>
                    </View>
                    <View style={styles.previewMetaRow}>
                      <Text style={styles.previewMetaLabel}>Student Name:</Text>
                      <Text style={styles.previewMetaValBold}>
                        {(printReceiptData.studentName || 'Student').toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.previewMetaRow}>
                      <Text style={styles.previewMetaLabel}>Class & Adm No:</Text>
                      <Text style={styles.previewMetaVal}>
                        {printReceiptData.className || 'N/A'} • Adm: {printReceiptData.admissionNo || 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.previewMetaRow}>
                      <Text style={styles.previewMetaLabel}>Total Paid:</Text>
                      <Text style={[styles.previewMetaValBold, { color: '#15803d', fontSize: 16 }]}>
                        ₹{Number(printReceiptData.totalPaid || printReceiptData.amount || 0).toLocaleString('en-IN')}
                      </Text>
                    </View>
                    {Number(printReceiptData.totalDiscount || printReceiptData.discount || 0) > 0 && (
                      <View style={styles.previewMetaRow}>
                        <Text style={styles.previewMetaLabel}>Discount Granted:</Text>
                        <Text style={[styles.previewMetaValBold, { color: '#16a34a' }]}>
                          -₹{Number(printReceiptData.totalDiscount || printReceiptData.discount || 0).toLocaleString('en-IN')}
                        </Text>
                      </View>
                    )}
                    <View style={styles.previewWordsBox}>
                      <Text style={styles.previewMetaLabel}>Amount in Words:</Text>
                      <Text style={styles.previewWordsText}>
                        {numberToIndianWords(printReceiptData.totalPaid || printReceiptData.amount || 0)}
                      </Text>
                    </View>
                    <View style={styles.previewMetaRow}>
                      <Text style={styles.previewMetaLabel}>Payment Mode:</Text>
                      <Text style={styles.previewMetaValBold}>{printReceiptData.paymentModeName || 'Cash'}</Text>
                    </View>
                  </View>

                  {/* Fee Heads Breakdown Table in Preview */}
                  {Array.isArray(printReceiptData.items) && printReceiptData.items.length > 0 ? (
                    <View style={styles.previewItemsBox}>
                      <View style={styles.previewItemsHeader}>
                        <Text style={styles.previewItemHeadText}>FEE HEAD / DESCRIPTION</Text>
                        <Text style={styles.previewItemAmtText}>PAID (₹)</Text>
                      </View>
                      {printReceiptData.items.map((it, idx) => (
                        <View key={idx} style={styles.previewItemRow}>
                          <Text style={styles.previewItemName}>{it.feeHeadName || it.installmentName || 'Fee Head'}</Text>
                          <Text style={styles.previewItemAmount}>
                            ₹{Number(it.amountPaid || it.paidAmount || it.amount || 0).toLocaleString('en-IN')}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  <View style={styles.cutNoticeBox}>
                    <Text style={styles.cutNoticeText}>
                      ✂ Printout generates 2 copies on A4 paper with scissor cutting line (1 for School Office records, 1 for Student/Parent)
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Modal Bottom Actions - Spacious Two-Tier Layout */}
            <View style={styles.slipActionsBar}>
              <TouchableOpacity
                style={[styles.printPrimaryBtn, printing && { opacity: 0.7 }]}
                onPress={handlePrintReceipt}
                disabled={printing}
                activeOpacity={0.8}
              >
                {printing ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <Ionicons name="print" size={20} color="#ffffff" />
                    <Text style={styles.printPrimaryBtnText}>Print Receipt (2 Copies)</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.secondaryActionsRow}>
                <TouchableOpacity
                  style={[styles.sharePdfBtn, printing && { opacity: 0.7 }]}
                  onPress={handleShareReceiptPdf}
                  disabled={printing}
                  activeOpacity={0.8}
                >
                  <Ionicons name="share-social-outline" size={17} color="#1e3a8a" />
                  <Text style={styles.sharePdfBtnText}>Share PDF</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.receiptWaBtn, printing && { opacity: 0.7 }]}
                  onPress={() => handleOpenWhatsAppReceipt(printReceiptData)}
                  disabled={printing}
                  activeOpacity={0.8}
                >
                  <Ionicons name="logo-whatsapp" size={17} color="#ffffff" />
                  <Text style={styles.receiptWaBtnText}>WhatsApp</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* WhatsApp Dialog Modal */}
      <WhatsAppModal
        visible={whatsAppModal.visible}
        onClose={() => setWhatsAppModal((prev) => ({ ...prev, visible: false }))}
        recipientName={whatsAppModal.recipientName}
        recipientPhone={whatsAppModal.recipientPhone}
        recipientRole={whatsAppModal.recipientRole}
        moduleKey={whatsAppModal.moduleKey}
        moduleTitle={whatsAppModal.moduleTitle}
        templateData={whatsAppModal.templateData}
      />
    </SafeAreaView>
  );
}

const getStyles = (colors, isDark) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: colors.primary,
  },
  tabItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabItemTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // Date Presets Row
  datePresetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
  },
  presetChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  presetChipTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },

  // Hero Card
  heroCard: {
    backgroundColor: isDark ? '#1e293b' : '#0284c7',
    borderColor: isDark ? '#334155' : '#0284c7',
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.3 : 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  heroLabel: {
    fontSize: 12,
    color: isDark ? '#38bdf8' : '#e0f2fe',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    marginVertical: 4,
  },
  heroSubText: {
    fontSize: 11.5,
    color: isDark ? '#94a3b8' : '#bae6fd',
    textAlign: 'center',
  },

  // Section Title
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },

  // Mode Grid
  modeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  modeCard: {
    flexBasis: '48%',
    backgroundColor: colors.cardBg,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modeLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  modeAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
  },

  // Mode Filter Chips
  filterChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  filterChipRowLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginRight: 2,
  },
  filterMiniChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  filterMiniChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterMiniChipText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filterMiniChipTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },

  // Receipt Search Box
  receiptSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    paddingHorizontal: 10,
    height: 42,
    gap: 6,
    marginBottom: 14,
  },
  receiptSearchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
  },

  receiptListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  // Receipt Cards
  receiptCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  receiptCardCancelled: {
    backgroundColor: isDark ? '#450a0a' : '#fef2f2',
    borderColor: isDark ? '#991b1b' : '#fecaca',
    opacity: 0.85,
  },
  receiptTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  receiptNoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  receiptNo: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgePaid: {
    backgroundColor: isDark ? '#052e16' : '#dcfce7',
  },
  statusBadgeCancelled: {
    backgroundColor: isDark ? '#450a0a' : '#fee2e2',
  },
  statusBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  statusBadgeTextPaid: {
    color: isDark ? '#4ade80' : '#15803d',
  },
  statusBadgeTextCancelled: {
    color: isDark ? '#f87171' : '#dc2626',
  },
  receiptStudent: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 4,
  },
  receiptMeta: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 1,
  },
  receiptMode: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 3,
  },
  receiptTime: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  receiptAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.success,
  },
  receiptCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  printSlipMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: isDark ? '#082f49' : '#f0f9ff',
    borderWidth: 1,
    borderColor: isDark ? '#0369a1' : '#bae6fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  printSlipMiniBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  waMiniBtn: {
    backgroundColor: isDark ? '#052e16' : '#f0fdf4',
    borderWidth: 1,
    borderColor: isDark ? '#166534' : '#bbf7d0',
    padding: 5,
    borderRadius: 6,
  },
  cancelMiniBtn: {
    backgroundColor: isDark ? '#450a0a' : '#fef2f2',
    borderWidth: 1,
    borderColor: isDark ? '#991b1b' : '#fecaca',
    padding: 5,
    borderRadius: 6,
  },
  emptyCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },

  // Student Search Card (Tab 2)
  searchCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 12,
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: colors.textPrimary,
  },
  resultsBox: {
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.cardBg,
    overflow: 'hidden',
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  resultCol: {
    flex: 1,
  },
  resultName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  resultMeta: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 1,
  },
  resultFather: {
    fontSize: 10.5,
    color: colors.textMuted,
  },

  // Selected Student Profile
  selectedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#082f49' : '#f0f9ff',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: isDark ? '#0369a1' : '#bae6fd',
    gap: 10,
  },
  selectedAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedAvatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  selectedCol: {
    flex: 1,
  },
  selectedName: {
    fontSize: 14,
    fontWeight: '800',
    color: isDark ? '#38bdf8' : '#0369a1',
  },
  selectedMeta: {
    fontSize: 11.5,
    color: isDark ? '#7dd3fc' : '#0284c7',
    fontWeight: '600',
    marginTop: 1,
  },
  selectedFather: {
    fontSize: 10.5,
    color: colors.textSecondary,
    marginTop: 1,
  },
  changeBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },

  centerLoading: {
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
  },

  // Dues Banner
  duesBanner: {
    flexDirection: 'row',
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  duesBannerCol: {
    flex: 1,
    alignItems: 'center',
  },
  duesBannerLabel: {
    fontSize: 9.5,
    color: colors.textSecondary,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  duesBannerVal: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.danger,
    marginTop: 2,
  },
  duesBannerDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.cardBorder,
  },

  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: isDark ? '#172554' : '#eff6ff',
    borderWidth: 1,
    borderColor: isDark ? '#1e40af' : '#bfdbfe',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  noticeText: {
    flex: 1,
    fontSize: 11,
    color: isDark ? '#93c5fd' : '#1e40af',
    fontWeight: '600',
  },

  // Quick Action Buttons
  quickActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  quickBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  quickBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  quickBtnPaidActive: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  quickBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  quickBtnTextActive: {
    color: '#ffffff',
  },
  quickBtnTextPaidActive: {
    color: '#ffffff',
  },

  // Month Chips
  monthChipsCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 10,
    marginBottom: 10,
  },
  monthChipsTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  monthScrollRow: {
    gap: 6,
  },
  monthChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    minWidth: 85,
  },
  monthChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  monthChipPaid: {
    backgroundColor: isDark ? '#052e16' : '#f0fdf4',
    borderColor: isDark ? '#166534' : '#bbf7d0',
    opacity: 0.85,
  },
  monthChipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  monthChipName: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  monthChipTextSelected: {
    color: '#ffffff',
  },
  monthChipTextPaid: {
    color: colors.success,
  },
  monthChipAmt: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  monthChipAmtSelected: {
    color: '#ffffff',
  },
  monthChipAmtPaid: {
    color: colors.success,
    fontSize: 10,
  },

  // Fee Heads Breakdown
  breakdownCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 12,
    marginBottom: 10,
  },
  emptyTableBox: {
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  emptyTableText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
  monthGroupContainer: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    overflow: 'hidden',
  },
  monthGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: isDark ? '#172554' : '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#1e40af' : '#bfdbfe',
  },
  monthGroupTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: isDark ? '#93c5fd' : '#1e40af',
  },
  monthGroupDue: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.danger,
  },
  paidMiniBadge: {
    backgroundColor: colors.success,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  paidMiniBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
  headRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    backgroundColor: colors.cardBg,
  },
  headLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  headCheckbox: {
    padding: 2,
  },
  headName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  optionalBadge: {
    backgroundColor: isDark ? '#451a03' : '#fef3c7',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  optionalBadgeText: {
    color: isDark ? '#fbbf24' : '#92400e',
    fontSize: 9,
    fontWeight: '700',
  },
  headMeta: {
    fontSize: 10.5,
    color: colors.textSecondary,
    marginTop: 1,
  },
  headRight: {
    alignItems: 'flex-end',
  },
  headBalLabel: {
    fontSize: 9,
    color: colors.textMuted,
    fontWeight: '600',
  },
  headBalAmount: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  fineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: isDark ? '#450a0a' : '#fff1f2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: isDark ? '#991b1b' : '#fecdd3',
  },
  fineTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: isDark ? '#f87171' : '#be123c',
  },
  fineAmount: {
    fontSize: 12,
    fontWeight: '800',
    color: isDark ? '#f87171' : '#be123c',
  },

  // Discount Card
  discountCard: {
    backgroundColor: isDark ? '#052e16' : '#f0fdf4',
    borderWidth: 1,
    borderColor: isDark ? '#166534' : '#86efac',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  discountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  discountTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: isDark ? '#4ade80' : '#166534',
  },
  discountAuthorityBadge: {
    backgroundColor: isDark ? '#14532d' : '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountAuthorityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: isDark ? '#86efac' : '#15803d',
  },
  discountInputsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  inputMiniLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  discountInput: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 38,
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  discountRemarksInput: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 38,
    fontSize: 12,
    color: colors.textPrimary,
  },
  quickPctRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  quickPctLabel: {
    fontSize: 10.5,
    color: isDark ? '#4ade80' : '#166534',
    fontWeight: '600',
  },
  quickPctChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: isDark ? '#1e3a8a' : '#e0f2fe',
  },
  quickPctChipActive: {
    backgroundColor: colors.primary,
  },
  quickPctChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: isDark ? '#93c5fd' : '#0369a1',
  },
  quickPctChipTextActive: {
    color: '#ffffff',
  },
  discountErrorText: {
    fontSize: 11,
    color: colors.danger,
    fontWeight: '600',
    marginTop: 6,
  },

  // Payment Details Card
  paymentCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 12,
    marginBottom: 20,
  },
  calcSummaryBox: {
    backgroundColor: isDark ? '#0f172a' : '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 10,
    gap: 6,
    marginBottom: 12,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calcRowTotal: {
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingTop: 6,
    marginTop: 2,
  },
  calcLabel: {
    fontSize: 11.5,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  calcVal: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  calcLabelTotal: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  calcValTotal: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.primary,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  amountInput: {
    backgroundColor: colors.inputBg,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 46,
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  fullPaymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: isDark ? '#052e16' : '#f0fdf4',
    borderWidth: 1,
    borderColor: isDark ? '#166534' : '#bbf7d0',
    padding: 6,
    borderRadius: 6,
    marginTop: 6,
  },
  fullPaymentText: {
    fontSize: 11,
    fontWeight: '700',
    color: isDark ? '#4ade80' : '#15803d',
  },
  partPaymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: isDark ? '#451a03' : '#fffbeb',
    borderWidth: 1,
    borderColor: isDark ? '#92400e' : '#fde68a',
    padding: 6,
    borderRadius: 6,
    marginTop: 6,
  },
  partPaymentText: {
    fontSize: 11,
    fontWeight: '700',
    color: isDark ? '#fbbf24' : '#b45309',
    flex: 1,
  },
  modesRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  modeChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
  },
  modeChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modeChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modeChipTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  textInput: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    fontSize: 12.5,
    color: colors.textPrimary,
  },
  collectBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
  },
  collectBtnDisabled: {
    opacity: 0.6,
  },
  collectBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  collectBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },

  // Cancel Modal
  cancelOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cancelBox: {
    width: '100%',
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 18,
  },
  cancelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  cancelTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.danger,
  },
  cancelWarningText: {
    fontSize: 12.5,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  cancelReasonInput: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    padding: 10,
    height: 70,
    fontSize: 12.5,
    color: colors.textPrimary,
    textAlignVertical: 'top',
    marginBottom: 14,
  },
  cancelActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelDismissBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.surfaceVariant,
  },
  cancelDismissBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  cancelConfirmBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.danger,
  },
  cancelConfirmBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#ffffff',
  },

  // Dual Copy Receipt Modal
  slipModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
  },
  slipModalContent: {
    width: '100%',
    maxHeight: '92%',
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  slipModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    backgroundColor: isDark ? '#1e293b' : '#eff6ff',
  },
  slipModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  slipModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: isDark ? '#38bdf8' : '#1e3a8a',
  },
  slipModalSubTitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  slipCloseBtn: {
    padding: 4,
  },
  slipScrollContainer: {
    padding: 16,
  },
  newSuccessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: isDark ? '#052e16' : '#dcfce7',
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: isDark ? '#166534' : '#86efac',
  },
  newSuccessBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: isDark ? '#4ade80' : '#15803d',
    flex: 1,
  },
  paperPreview: {
    backgroundColor: colors.cardBg,
    borderWidth: 1.5,
    borderColor: isDark ? '#38bdf8' : '#1e3a8a',
    borderRadius: 10,
    padding: 16,
  },
  receiptPaperHeader: {
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: isDark ? '#38bdf8' : '#1e3a8a',
    paddingBottom: 10,
    marginBottom: 12,
  },
  receiptSchoolName: {
    fontSize: 18,
    fontWeight: '900',
    color: isDark ? '#38bdf8' : '#1e3a8a',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  receiptAffiliation: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  receiptBadgeRow: {
    marginTop: 6,
  },
  receiptBadge: {
    backgroundColor: isDark ? '#0284c7' : '#1e3a8a',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 4,
  },
  receiptBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  previewMetaBox: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    padding: 10,
    backgroundColor: isDark ? '#0f172a' : '#f8fafc',
    gap: 6,
  },
  previewMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewMetaLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  previewMetaVal: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  previewMetaValBold: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '800',
  },
  previewWordsBox: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  previewWordsText: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '700',
    fontStyle: 'italic',
    textTransform: 'capitalize',
    marginTop: 2,
    lineHeight: 17,
  },
  previewItemsBox: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    overflow: 'hidden',
  },
  previewItemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: isDark ? '#1e293b' : '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  previewItemHeadText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: isDark ? '#38bdf8' : '#1e40af',
  },
  previewItemAmtText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: isDark ? '#38bdf8' : '#1e40af',
  },
  previewItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    backgroundColor: colors.cardBg,
  },
  previewItemName: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  previewItemAmount: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.success,
  },
  cutNoticeBox: {
    marginTop: 10,
    backgroundColor: isDark ? '#082f49' : '#eff6ff',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: isDark ? '#0284c7' : '#3b82f6',
    borderRadius: 6,
    padding: 8,
  },
  cutNoticeText: {
    fontSize: 11,
    color: isDark ? '#7dd3fc' : '#1e40af',
    textAlign: 'center',
    lineHeight: 15,
  },
  slipActionsBar: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    gap: 8,
    backgroundColor: colors.cardBg,
  },
  printPrimaryBtn: {
    backgroundColor: isDark ? '#0284c7' : '#1e3a8a',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 10,
    width: '100%',
  },
  printPrimaryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  sharePdfBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: isDark ? '#0284c7' : '#1e3a8a',
    backgroundColor: isDark ? '#082f49' : '#eff6ff',
  },
  sharePdfBtnText: {
    color: isDark ? '#38bdf8' : '#1e3a8a',
    fontSize: 13,
    fontWeight: '700',
  },
  receiptWaBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#16a34a',
  },
  receiptWaBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
