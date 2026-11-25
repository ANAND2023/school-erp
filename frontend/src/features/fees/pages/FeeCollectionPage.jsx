import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  MenuItem,
  Button,
  Stack,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Tooltip,
  InputAdornment
} from '@mui/material';
import {
  Search as SearchIcon,
  PointOfSale as CollectIcon,
  Print as PrintIcon,
  Payment as PaymentIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  School as SchoolIcon,
  Receipt as ReceiptIcon,
  CalendarMonth as CalendarMonthIcon,
  Bolt as BoltIcon,
  DateRange as DateRangeIcon,
  Check as CheckIcon,
  PictureAsPdf as PdfIcon,
  Settings as SettingsIcon,
  Clear as ClearIcon,
  WhatsApp as WhatsAppIcon,
  ReceiptLong as ReceiptLongIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import { feesApi } from '../api';
import { studentApi } from '../../students/api';
import { branchApi } from '../../masters/api';
import { useAuthStore } from '../../../store/authStore';
import { FeeReceiptSlip } from '../components/FeeReceiptSlip';
import { StudentLookupDropdown } from '../components/StudentLookupDropdown';
import { exportDualFeeReceiptPdf } from '../utils/feeExportUtils';
import { printWithTitle } from '../../../utils/printUtils';
import { WhatsAppDialog } from '../../communication/components/WhatsAppDialog';
import { AppModal } from '../../../components/common';

const noSpinnerSx = {
  '& input[type=number]': {
    MozAppearance: 'textfield',
  },
  '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': {
    WebkitAppearance: 'none',
    margin: 0,
  },
};

export default function FeeCollectionPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const urlStudentId = searchParams.get('studentId') || location.state?.studentId || '';

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState(urlStudentId);
  const hasInitializedStudentRef = useRef(null);

  useEffect(() => {
    const sid = searchParams.get('studentId') || location.state?.studentId;
    if (sid && String(sid) !== String(selectedStudentId)) {
      setSelectedStudentId(sid);
      setSelectedMonthIds([]);
      setSelectedDues({});
      setDeselectedOptionalDueIds({});
      setErrorMsg('');
      setInfoNotice('');
      setShowPaidMonths(false);
      hasInitializedStudentRef.current = null;
    }
  }, [searchParams, location.state]);

  // Selected months state: array of installmentId's to bind & show
  const [selectedMonthIds, setSelectedMonthIds] = useState([]);
  const [showPaidMonths, setShowPaidMonths] = useState(false);
  const [infoNotice, setInfoNotice] = useState('');

  // Selected dues to pay state: dueId -> { amountToPay, fineToPay }
  const [selectedDues, setSelectedDues] = useState({});
  // Track optional dues explicitly deselected by cashier (by default, optional dues are checked)
  const [deselectedOptionalDueIds, setDeselectedOptionalDueIds] = useState({});

  // Payment splits state
  const [paymentSplits, setPaymentSplits] = useState([
    { mode: 1, amount: '', transactionRef: '', bankName: '', chequeNo: '', chequeDate: '' },
  ]);
  const [remarks, setRemarks] = useState('');
  const [overallDiscount, setOverallDiscount] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [lastDiscountEdited, setLastDiscountEdited] = useState('percent');
  const [discountRemarks, setDiscountRemarks] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [paymentModeError, setPaymentModeError] = useState('');

  // Discount eligibility query for current user
  const { data: eligibilityRes } = useQuery({
    queryKey: ['fee-discount-eligibility'],
    queryFn: () => feesApi.getDiscountEligibility(),
    staleTime: 0,
    refetchOnMount: 'always',
  });
  const discountEligibility = eligibilityRes?.data?.data || {
    canGiveDiscount: false,
    maxDiscountLimit: 0,
    isUnlimited: false,
    roleName: '',
  };

  // Receipt Modal
  const { activeBranchId } = useAuthStore();
  const [printReceiptData, setPrintReceiptData] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);


  // Fetch dues for selected student
  const {
    data: duesRes,
    isLoading: isLoadingDues,
    refetch: refetchDues,
  } = useQuery({
    queryKey: ['student-fee-dues', selectedStudentId],
    queryFn: () => feesApi.getStudentDues(selectedStudentId),
    enabled: !!selectedStudentId,
  });
  const duesSummary = duesRes?.data?.data;
  const duesList = duesSummary?.dues || [];

  // Fee Collect Mutation
  const collectMutation = useMutation({
    mutationFn: (payload) => feesApi.collectFee(payload),
    onSuccess: (res) => {
      setPrintReceiptData(res?.data?.data);
      setIsReceiptModalOpen(true);
      setSelectedDues({});
      setDeselectedOptionalDueIds({});
      setPaymentSplits([{ mode: 1, amount: '', transactionRef: '', bankName: '', chequeNo: '', chequeDate: '' }]);
      setRemarks('');
      setOverallDiscount('');
      setDiscountPercent('');
      setDiscountRemarks('');
      setErrorMsg('');
      refetchDues();
    },
    onError: (err) => {
      setErrorMsg(err?.response?.data?.message || 'Fee collection failed.');
    },
  });

  const handleSelectStudent = (st) => {
    setSelectedStudentId(st.id);
    setSearchTerm('');
    setSelectedMonthIds([]);
    setSelectedDues({});
    setDeselectedOptionalDueIds({});
    setOverallDiscount('');
    setDiscountPercent('');
    setDiscountRemarks('');
    setErrorMsg('');
    setInfoNotice('');
    setShowPaidMonths(false);
    hasInitializedStudentRef.current = null;
  };

  const handleClearSelection = () => {
    setSelectedStudentId('');
    setSearchTerm('');
    setSelectedMonthIds([]);
    setSelectedDues({});
    setDeselectedOptionalDueIds({});
    setOverallDiscount('');
    setDiscountPercent('');
    setDiscountRemarks('');
    setErrorMsg('');
    setInfoNotice('');
    setShowPaidMonths(false);
    hasInitializedStudentRef.current = null;
  };

  // Month horizontal scroll and mouse-drag state/handlers
  const monthScrollRef = useRef(null);
  const isMouseDownRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);

  const handleMonthMouseDown = (e) => {
    isMouseDownRef.current = true;
    hasDraggedRef.current = false;
    startXRef.current = e.pageX - (monthScrollRef.current?.offsetLeft || 0);
    scrollLeftRef.current = monthScrollRef.current?.scrollLeft || 0;
  };

  const handleMonthMouseMove = (e) => {
    if (!isMouseDownRef.current || !monthScrollRef.current) return;
    const x = e.pageX - (monthScrollRef.current?.offsetLeft || 0);
    const walk = (x - startXRef.current) * 1.5;
    if (Math.abs(walk) > 4) {
      hasDraggedRef.current = true;
      e.preventDefault();
    }
    monthScrollRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  const handleMonthMouseUp = () => {
    isMouseDownRef.current = false;
  };

  const handleMonthWheel = (e) => {
    if (e.deltaY !== 0 && monthScrollRef.current) {
      e.preventDefault();
      monthScrollRef.current.scrollLeft += e.deltaY;
    }
  };

  const handleScrollMonths = (direction) => {
    if (monthScrollRef.current) {
      monthScrollRef.current.scrollBy({
        left: direction === 'left' ? -160 : 160,
        behavior: 'smooth',
      });
    }
  };

  // Group dues by Installment / Month (strictly ordered chronologically)
  const monthGroups = React.useMemo(() => {
    if (!duesList || !duesList.length) return [];
    const map = {};
    duesList.forEach((d) => {
      const key = d.installmentId;
      if (!map[key]) {
        map[key] = {
          installmentId: d.installmentId,
          installmentName: d.installmentName,
          displayOrder: d.displayOrder || 0,
          dueDate: d.dueDate,
          items: [],
          totalBalance: 0,
          totalFine: 0,
          totalOriginal: 0,
          totalConcession: 0,
          totalPaid: 0,
          totalPayable: 0,
          isPaid: true,
          hasUnpaid: false,
        };
      }
      map[key].items.push(d);
      map[key].totalBalance += Number(d.balanceAmount || 0);
      map[key].totalFine += Number(d.fineAmount || 0);
      map[key].totalOriginal += Number(d.originalAmount || 0);
      map[key].totalConcession += Number(d.concessionAmount || 0);
      map[key].totalPaid += Number(d.paidAmount || 0);
      map[key].totalPayable += (Number(d.balanceAmount || 0) + Number(d.fineAmount || 0));
      if (d.balanceAmount > 0) {
        map[key].isPaid = false;
        map[key].hasUnpaid = true;
      }
    });

    // Sort chronologically by displayOrder and dueDate
    return Object.values(map).sort((a, b) => {
      if (a.displayOrder && b.displayOrder && a.displayOrder !== b.displayOrder) {
        return a.displayOrder - b.displayOrder;
      }
      return new Date(a.dueDate) - new Date(b.dueDate);
    });
  }, [duesList]);

  // Unpaid months in strict chronological order (FIFO sequence)
  const unpaidMonths = React.useMemo(() => {
    return monthGroups.filter((m) => m.hasUnpaid);
  }, [monthGroups]);

  // Paid months (for historical reference)
  const paidMonths = React.useMemo(() => {
    return monthGroups.filter((m) => m.isPaid);
  }, [monthGroups]);

  // Auto-select initial unpaid month on student select / dues load
  // Strictly selects the FIRST unpaid month (e.g. April) - never skips earlier dues!
  useEffect(() => {
    if (selectedStudentId && monthGroups.length > 0 && hasInitializedStudentRef.current !== selectedStudentId) {
      hasInitializedStudentRef.current = selectedStudentId;
      const firstUnpaid = unpaidMonths[0];
      if (firstUnpaid) {
        setSelectedMonthIds([firstUnpaid.installmentId]);
      } else {
        setSelectedMonthIds([]);
      }
    }
  }, [selectedStudentId, monthGroups, unpaidMonths]);

  // Selected unpaid months being collected (filtered against unpaidMonths in chronological order)
  const visiblePayMonths = React.useMemo(() => {
    return unpaidMonths.filter((m) => selectedMonthIds.includes(m.installmentId));
  }, [unpaidMonths, selectedMonthIds]);

  // Visible months in table: includes paid months if showPaidMonths is enabled
  const visibleMonths = React.useMemo(() => {
    if (showPaidMonths) {
      return monthGroups.filter((m) => selectedMonthIds.includes(m.installmentId) || m.isPaid);
    }
    return visiblePayMonths;
  }, [monthGroups, selectedMonthIds, showPaidMonths, visiblePayMonths]);

  // Selected month names for summary
  const selectedMonthNames = React.useMemo(() => {
    return visiblePayMonths.map((m) => m.installmentName);
  }, [visiblePayMonths]);

  // Dues Breakdown: Previous Dues (Arrears) vs Current Target Month
  const previousDuesMonths = React.useMemo(() => {
    if (visiblePayMonths.length <= 1) return [];
    return visiblePayMonths.slice(0, visiblePayMonths.length - 1);
  }, [visiblePayMonths]);

  const previousDuesTotal = React.useMemo(() => {
    return previousDuesMonths.reduce((sum, m) => sum + m.totalBalance, 0);
  }, [previousDuesMonths]);

  const currentTargetMonth = React.useMemo(() => {
    if (visiblePayMonths.length === 0) return null;
    return visiblePayMonths[visiblePayMonths.length - 1];
  }, [visiblePayMonths]);

  const currentMonthDueTotal = React.useMemo(() => {
    return currentTargetMonth ? currentTargetMonth.totalBalance : 0;
  }, [currentTargetMonth]);

  const totalFineSelected = React.useMemo(() => {
    return Object.values(selectedDues).reduce((sum, item) => sum + (Number(item.fineToPay) || 0), 0);
  }, [selectedDues]);

  // Active payable due items across selected months (mandatory dues + opted-in optional dues)
  const activeDueItems = React.useMemo(() => {
    const list = [];
    visiblePayMonths.forEach((m) => {
      m.items.forEach((item) => {
        if (item.balanceAmount > 0) {
          if (!item.isOptional || selectedDues[item.dueId]) {
            list.push(item);
          }
        }
      });
    });
    return list;
  }, [visiblePayMonths, selectedDues]);

  // Maximum total payable amount for all active items across selected months (Full Balance + Fines)
  const maxTotalPayable = React.useMemo(() => {
    return activeDueItems.reduce(
      (sum, item) => sum + Number(item.balanceAmount || 0) + Number(item.fineAmount || 0),
      0
    );
  }, [activeDueItems]);

  const numericDiscount = Number(overallDiscount) || 0;
  const netPayable = Math.max(0, maxTotalPayable - numericDiscount);

  const discountError = React.useMemo(() => {
    if (!discountEligibility.canGiveDiscount) return '';
    const disc = Number(overallDiscount) || 0;
    const pct = Number(discountPercent) || 0;
    if (disc <= 0 && pct <= 0) return '';
    const maxPercent = Number(discountEligibility.maxDiscountLimit || 0);
    if (!discountEligibility.isUnlimited && maxPercent > 0 && maxPercent < 100) {
      if (pct > maxPercent) {
        return `Discount (${pct}%) exceeds your authorized limit of ${maxPercent}%`;
      }
      const maxAllowedRupees = Math.round((maxTotalPayable * maxPercent) / 100);
      if (disc > maxAllowedRupees) {
        return `Discount exceeds your authorized limit of ${maxPercent}% (Max ₹${maxAllowedRupees.toLocaleString('en-IN')} for this receipt)`;
      }
    }
    if (pct > 100) {
      return 'Discount cannot exceed 100%';
    }
    if (disc > maxTotalPayable && maxTotalPayable > 0) {
      return `Discount cannot exceed total payable fee of ₹${maxTotalPayable.toLocaleString('en-IN')}`;
    }
    return '';
  }, [overallDiscount, discountPercent, discountEligibility, maxTotalPayable]);

  const totalPaymentEntered = React.useMemo(() => {
    return paymentSplits.reduce(
      (sum, item) => sum + (Number(item.amount) || 0),
      0
    );
  }, [paymentSplits]);

  // Currently allocated total across table rows
  const totalDuesSelected = React.useMemo(() => {
    return Object.values(selectedDues).reduce(
      (sum, item) => sum + (Number(item.amountToPay) || 0) + (Number(item.fineToPay) || 0),
      0
    );
  }, [selectedDues]);

  const isPartPayment = totalPaymentEntered > 0 && totalPaymentEntered < netPayable;
  const isFullPayment = (totalPaymentEntered > 0 || (netPayable === 0 && maxTotalPayable > 0)) && Math.abs(totalPaymentEntered - netPayable) < 0.01;
  const isOverPayment = totalPaymentEntered > netPayable;
  const remainingDuesBalance = Math.max(0, netPayable - totalPaymentEntered);

  // Strict FIFO distribution of payment amount to active dues (Fine first, then principal heads sequentially)
  const distributeAmountToDues = (paymentAmount, items) => {
    let remaining = Number(paymentAmount) || 0;
    const result = {};

    // 1. Allocate late fines first (fines cleared first)
    items.forEach((item) => {
      const fine = Number(item.fineAmount || 0);
      const fineToPay = Math.min(remaining, fine);
      remaining -= fineToPay;
      result[item.dueId] = {
        amountToPay: 0,
        fineToPay,
        balanceAmount: item.balanceAmount,
      };
    });

    // 2. Allocate remaining cash to principal dues in strict FIFO order
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

  // Synchronize selectedDues ONLY for visiblePayMonths (unpaid months selected for payment):
  // Paid months are NEVER added to selectedDues
  // NOTE: Optional dues are CHECKED BY DEFAULT unless explicitly unchecked by cashier
  useEffect(() => {
    setSelectedDues(() => {
      const next = {};
      visiblePayMonths.forEach((m) => {
        m.items.forEach((item) => {
          if (item.balanceAmount > 0) {
            const isExplicitlyDeselected = item.isOptional && Boolean(deselectedOptionalDueIds[item.dueId]);
            if (!isExplicitlyDeselected) {
              next[item.dueId] = {
                amountToPay: item.balanceAmount,
                fineToPay: item.fineAmount || 0,
              };
            }
          }
        });
      });
      return next;
    });
  }, [visiblePayMonths, deselectedOptionalDueIds]);

  // Strict Sequential Dues (FIFO) Toggle Month Handler:
  // - Clicking an unpaid month selects it AND all prior unpaid months.
  // - Deselecting an unpaid month deselects it AND all subsequent months.
  // - Clicking a paid month displays a friendly notice and doesn't add it to dues.
  const handleToggleMonth = (targetInstallmentId) => {
    const targetMonth = monthGroups.find((m) => m.installmentId === targetInstallmentId);
    if (!targetMonth) return;

    if (targetMonth.isPaid) {
      setInfoNotice(`${targetMonth.installmentName} is already fully PAID (₹0 balance). You can view it below using 'Show Paid Months'.`);
      return;
    }

    const targetIdx = unpaidMonths.findIndex((m) => m.installmentId === targetInstallmentId);
    if (targetIdx === -1) return;

    const isAlreadySelected = selectedMonthIds.includes(targetInstallmentId);

    if (isAlreadySelected) {
      // FIFO Deselect: deselect target and all subsequent months
      const newSelection = unpaidMonths.slice(0, targetIdx).map((m) => m.installmentId);
      setSelectedMonthIds(newSelection);
      setInfoNotice('');
    } else {
      // FIFO Select: select all unpaid months from start up to targetIdx
      const newSelection = unpaidMonths.slice(0, targetIdx + 1).map((m) => m.installmentId);
      setSelectedMonthIds(newSelection);
      if (targetIdx > 0) {
        const priorNames = unpaidMonths.slice(0, targetIdx).map((m) => m.installmentName).join(', ');
        setInfoNotice(`Strict Sequential Dues Rule: Earlier unpaid month(s) [${priorNames}] automatically included as Previous Dues.`);
      } else {
        setInfoNotice('');
      }
    }
  };

  // Toggle optional due item (checked or unchecked by cashier)
  const handleToggleOptionalDue = (item) => {
    const isCurrentlySelected = Boolean(selectedDues[item.dueId]);

    if (isCurrentlySelected) {
      // User is explicitly unchecking it
      setDeselectedOptionalDueIds((prev) => ({ ...prev, [item.dueId]: true }));
    } else {
      // User is checking it back
      setDeselectedOptionalDueIds((prev) => {
        const next = { ...prev };
        delete next[item.dueId];
        return next;
      });
    }

    setSelectedDues((prev) => {
      const next = { ...prev };
      if (next[item.dueId]) {
        delete next[item.dueId];
      } else {
        next[item.dueId] = {
          amountToPay: item.balanceAmount,
          fineToPay: item.fineAmount || 0,
        };
      }
      if (paymentSplits.length === 1) {
        const newTotal = Object.values(next).reduce(
          (sum, d) => sum + (Number(d.amountToPay) || 0) + (Number(d.fineToPay) || 0),
          0
        );
        const disc = Number(overallDiscount) || 0;
        const newNet = Math.max(0, newTotal - disc);
        setPaymentSplits([{ ...paymentSplits[0], amount: newNet > 0 ? newNet : (newTotal > 0 && newNet === 0 ? 0 : '') }]);
      }
      return next;
    });
  };

  // Quick Action: Pay 1 Month (Earliest Unpaid)
  const handleSelectOneMonth = () => {
    if (unpaidMonths.length > 0) {
      setSelectedMonthIds([unpaidMonths[0].installmentId]);
      setInfoNotice('');
    }
  };

  // Quick Action: Pay Next N Months (Consecutive FIFO)
  const handleSelectNextMonths = (count = 1) => {
    const target = unpaidMonths.slice(0, count);
    setSelectedMonthIds(target.map((m) => m.installmentId));
    if (target.length > 1) {
      const priorNames = target.slice(0, target.length - 1).map((m) => m.installmentName).join(', ');
      setInfoNotice(`Selected ${target.length} consecutive months including Previous Dues [${priorNames}].`);
    } else {
      setInfoNotice('');
    }
  };

  // Quick Action: Pay Up to Current Academic Month
  const handleSelectUpToCurrentMonth = () => {
    const currentMonthName = dayjs().format('MMMM').toLowerCase();
    const currentMonthIdx = unpaidMonths.findIndex((m) =>
      m.installmentName.toLowerCase().includes(currentMonthName)
    );

    if (currentMonthIdx !== -1) {
      const target = unpaidMonths.slice(0, currentMonthIdx + 1);
      setSelectedMonthIds(target.map((m) => m.installmentId));
      if (currentMonthIdx > 0) {
        const priorNames = target.slice(0, target.length - 1).map((m) => m.installmentName).join(', ');
        setInfoNotice(`Paying up to ${dayjs().format('MMMM')}: Earlier unpaid months [${priorNames}] included as Previous Dues.`);
      }
    } else {
      const today = dayjs().endOf('month');
      const overdue = unpaidMonths.filter((m) => dayjs(m.dueDate).isBefore(today));
      if (overdue.length > 0) {
        setSelectedMonthIds(overdue.map((m) => m.installmentId));
        setInfoNotice(`Selected all ${overdue.length} overdue months up to current date.`);
      } else {
        handleSelectOneMonth();
      }
    }
  };

  // Quick Action: Select All Unpaid Months
  const handleSelectAllMonths = () => {
    if (selectedMonthIds.length === unpaidMonths.length) {
      setSelectedMonthIds([]);
      setInfoNotice('');
    } else {
      setSelectedMonthIds(unpaidMonths.map((m) => m.installmentId));
      setInfoNotice(`Selected all ${unpaidMonths.length} pending months (Total Outstanding: ₹${duesSummary?.totalOutstanding?.toLocaleString() || 0}).`);
    }
  };

  // Clear all month selections
  const handleClearMonths = () => {
    setSelectedMonthIds([]);
    setInfoNotice('');
  };

  const handlePartialAmountChange = (dueId, value) => {
    if (paymentModeError) setPaymentModeError('');
    const targetItem = activeDueItems.find((d) => d.dueId === dueId);
    const maxBalance = targetItem ? Number(targetItem.balanceAmount || 0) : 0;

    let val = value;
    if (val !== '' && val !== null && val !== undefined) {
      let num = parseFloat(val);
      if (isNaN(num) || num < 0) {
        num = 0;
        val = 0;
      }
      if (maxBalance > 0 && num > maxBalance) {
        num = maxBalance;
        val = maxBalance;
      }
    }

    setSelectedDues((prev) => {
      if (!prev[dueId]) return prev;
      const next = {
        ...prev,
        [dueId]: {
          ...prev[dueId],
          amountToPay: val,
        },
      };
      if (paymentSplits.length === 1) {
        const newTotal = Object.values(next).reduce(
          (sum, d) => sum + (Number(d.amountToPay) || 0) + (Number(d.fineToPay) || 0),
          0
        );
        const disc = Number(overallDiscount) || 0;
        const newNet = Math.max(0, newTotal - disc);
        setPaymentSplits([{ ...paymentSplits[0], amount: newNet > 0 ? newNet : (newTotal > 0 && newNet === 0 ? 0 : '') }]);
      }
      return next;
    });
  };

  // Payment splits management
  const handleAddPaymentMode = () => {
    setPaymentModeError('');

    if (netPayable <= 0) {
      setPaymentModeError('Payable amount is ₹0 or no months selected.');
      return;
    }

    const currentTotal = paymentSplits.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    if (currentTotal >= netPayable) {
      setPaymentModeError(
        `Full payable amount (₹${netPayable.toLocaleString()}) is already covered. Cannot add more payment modes.`
      );
      return;
    }

    const remainingAmount = Math.max(0, netPayable - currentTotal);
    // Find next unused mode or default to 2 (UPI)
    const usedModes = paymentSplits.map((p) => Number(p.mode));
    let nextMode = 2; // Default UPI
    if (usedModes.includes(2) && !usedModes.includes(1)) nextMode = 1;
    else if (usedModes.includes(2) && !usedModes.includes(3)) nextMode = 3;
    else if (usedModes.includes(2) && usedModes.includes(3) && !usedModes.includes(5)) nextMode = 5;

    const nextSplits = [
      ...paymentSplits,
      {
        mode: nextMode,
        amount: remainingAmount > 0 ? remainingAmount : '',
        transactionRef: '',
        bankName: '',
        chequeNo: '',
        chequeDate: '',
      },
    ];
    setPaymentSplits(nextSplits);
  };

  const handleRemovePaymentMode = (index) => {
    setPaymentModeError('');
    if (paymentSplits.length <= 1) return;
    const next = paymentSplits.filter((_, idx) => idx !== index);
    setPaymentSplits(next);
  };

  const handlePaymentFieldChange = (index, field, value) => {
    if (paymentModeError) setPaymentModeError('');
    let val = value;

    if (field === 'amount') {
      if (val !== '' && val !== null && val !== undefined) {
        let numVal = parseFloat(val);
        if (isNaN(numVal) || numVal < 0) {
          numVal = 0;
          val = '0';
        }

        // In multi-mode payments, calculate remaining capacity
        const otherSplitsTotal = paymentSplits.reduce(
          (sum, item, idx) => (idx !== index ? sum + (Number(item.amount) || 0) : sum),
          0
        );
        const maxAllowedForThisSplit = Math.max(0, netPayable - otherSplitsTotal);

        // Strict restriction: cannot exceed total net payable amount
        if (netPayable > 0 && numVal > maxAllowedForThisSplit) {
          numVal = maxAllowedForThisSplit;
          val = String(maxAllowedForThisSplit);
          setPaymentModeError(
            `Payment amount cannot exceed total payable amount (₹${netPayable.toLocaleString('en-IN')}). Capped to maximum payable.`
          );
        }
      }
    }

    const next = [...paymentSplits];
    next[index][field] = val;
    setPaymentSplits(next);

    if (field === 'amount') {
      const newTotal = next.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
      const disc = Number(overallDiscount) || 0;
      const amountToSettle = newTotal + disc;
      if (activeDueItems.length > 0) {
        setSelectedDues(distributeAmountToDues(amountToSettle, activeDueItems));
      }
    }
  };

  // Auto-fill payment amount if single cash mode
  const handleAutoFillPayment = () => {
    if (paymentModeError) setPaymentModeError('');
    if (netPayable >= 0 && paymentSplits.length === 1) {
      setPaymentSplits([{ ...paymentSplits[0], amount: netPayable }]);
      if (activeDueItems.length > 0) {
        const disc = Number(overallDiscount) || 0;
        const amountToSettle = netPayable + disc;
        setSelectedDues(distributeAmountToDues(amountToSettle, activeDueItems));
      }
    }
  };

  // Discount input change handlers (Percentage & Rupees bidirectional sync with strict clamping)
  const handleDiscountPercentChange = (val) => {
    setLastDiscountEdited('percent');
    if (val === '' || val === null || val === undefined) {
      setDiscountPercent('');
      setOverallDiscount('');
      if (paymentSplits.length === 1) {
        setPaymentSplits([{ ...paymentSplits[0], amount: maxTotalPayable > 0 ? maxTotalPayable : '' }]);
        if (activeDueItems.length > 0) {
          setSelectedDues(distributeAmountToDues(maxTotalPayable, activeDueItems));
        }
      }
      return;
    }
    let num = parseFloat(val);
    if (isNaN(num) || num < 0) {
      num = 0;
      val = '0';
    }
    // Strictly clamp percent so it can never exceed 100%
    if (num > 100) {
      num = 100;
      val = '100';
    }
    setDiscountPercent(val);
    const calculatedRupees = maxTotalPayable > 0 ? Math.min(maxTotalPayable, Math.round((maxTotalPayable * num) / 100)) : 0;
    setOverallDiscount(calculatedRupees > 0 ? calculatedRupees : (num === 0 ? 0 : ''));

    if (paymentSplits.length === 1) {
      const newNet = Math.max(0, maxTotalPayable - calculatedRupees);
      setPaymentSplits([{ ...paymentSplits[0], amount: newNet > 0 ? newNet : (maxTotalPayable > 0 && newNet === 0 ? 0 : '') }]);
      if (activeDueItems.length > 0) {
        setSelectedDues(distributeAmountToDues(newNet + calculatedRupees, activeDueItems));
      }
    }
  };

  const handleDiscountRupeesChange = (val) => {
    setLastDiscountEdited('rupees');
    if (val === '' || val === null || val === undefined) {
      setOverallDiscount('');
      setDiscountPercent('');
      if (paymentSplits.length === 1) {
        setPaymentSplits([{ ...paymentSplits[0], amount: maxTotalPayable > 0 ? maxTotalPayable : '' }]);
        if (activeDueItems.length > 0) {
          setSelectedDues(distributeAmountToDues(maxTotalPayable, activeDueItems));
        }
      }
      return;
    }
    let num = parseFloat(val);
    if (isNaN(num) || num < 0) {
      num = 0;
      val = '0';
    }
    // Strictly clamp rupees so it can never exceed max total payable fee
    if (maxTotalPayable > 0 && num > maxTotalPayable) {
      num = maxTotalPayable;
      val = String(maxTotalPayable);
    } else if (maxTotalPayable === 0 && num > 0) {
      num = 0;
      val = '0';
    }
    setOverallDiscount(val);
    if (maxTotalPayable > 0) {
      const pct = Math.min(100, (num / maxTotalPayable) * 100);
      const formattedPct = Number.isInteger(pct) ? pct.toString() : parseFloat(pct.toFixed(2)).toString();
      setDiscountPercent(formattedPct);
    } else {
      setDiscountPercent('');
    }

    if (paymentSplits.length === 1) {
      const disc = Number(num) || 0;
      const newNet = Math.max(0, maxTotalPayable - disc);
      setPaymentSplits([{ ...paymentSplits[0], amount: newNet > 0 ? newNet : (maxTotalPayable > 0 && newNet === 0 ? 0 : '') }]);
      if (activeDueItems.length > 0) {
        setSelectedDues(distributeAmountToDues(newNet + disc, activeDueItems));
      }
    }
  };

  const handleDiscountChange = handleDiscountRupeesChange;

  // Auto-sync payment amount for single mode when month selection changes
  useEffect(() => {
    setPaymentModeError('');
    if (visiblePayMonths.length > 0) {
      let fullAmount = 0;
      visiblePayMonths.forEach((m) => {
        m.items.forEach((item) => {
          const isDeselected = item.isOptional && Boolean(deselectedOptionalDueIds[item.dueId]);
          if (item.balanceAmount > 0 && !isDeselected) {
            fullAmount += (Number(item.balanceAmount || 0) + Number(item.fineAmount || 0));
          }
        });
      });
      let disc = Number(overallDiscount) || 0;
      if (lastDiscountEdited === 'percent' && discountPercent !== '' && fullAmount > 0) {
        let pct = Math.max(0, parseFloat(discountPercent) || 0);
        if (pct > 100) {
          pct = 100;
          setDiscountPercent('100');
        }
        disc = Math.min(fullAmount, Math.round((fullAmount * pct) / 100));
        setOverallDiscount(disc > 0 ? disc : (pct === 0 ? 0 : ''));
      } else if (lastDiscountEdited === 'rupees' && overallDiscount !== '' && fullAmount > 0) {
        if (disc > fullAmount) {
          disc = fullAmount;
          setOverallDiscount(String(fullAmount));
        }
        const pct = Math.min(100, (disc / fullAmount) * 100);
        setDiscountPercent(Number.isInteger(pct) ? pct.toString() : parseFloat(pct.toFixed(2)).toString());
      }
      const net = Math.max(0, fullAmount - disc);
      setPaymentSplits([{ mode: 1, amount: net > 0 ? net : (fullAmount > 0 && net === 0 ? 0 : ''), transactionRef: '', bankName: '', chequeNo: '', chequeDate: '' }]);
    } else {
      setPaymentSplits([{ mode: 1, amount: '', transactionRef: '', bankName: '', chequeNo: '', chequeDate: '' }]);
    }
  }, [selectedMonthIds, duesList, deselectedOptionalDueIds]);

  const handleConfirmCollection = () => {
    setErrorMsg('');
    if (!visiblePayMonths.length) {
      setErrorMsg('Please select at least one fee installment/month to collect.');
      return;
    }

    if (discountError) {
      setErrorMsg(discountError);
      return;
    }

    if (netPayable > 0 && totalPaymentEntered <= 0) {
      setErrorMsg('Please enter a payment amount greater than ₹0.');
      return;
    }

    if (totalPaymentEntered > netPayable) {
      setErrorMsg(
        `Total payment entered (₹${totalPaymentEntered.toLocaleString()}) cannot exceed net payable fees (₹${netPayable.toLocaleString()}).`
      );
      return;
    }

    // Allocate payment across active due items in strict FIFO order
    // Dues settlement clears the active due items up to amountToSettle (payment + discount)
    const disc = Number(numericDiscount) || 0;
    const amountToSettle = totalPaymentEntered + disc;
    const currentTableSum = Object.values(selectedDues).reduce(
      (sum, item) => sum + (Number(item.amountToPay) || 0) + (Number(item.fineToPay) || 0),
      0
    );

    let finalAllocated = selectedDues;
    if (Math.abs(currentTableSum - amountToSettle) > 0.01) {
      finalAllocated = distributeAmountToDues(amountToSettle, activeDueItems);
    }

    // Include all heads of the selected months being paid (even if amountToPay is 0 in part payment)
    // so the receipt slip displays every head of that month with its paid amount and remaining balance carried
    const duesToPay = Object.entries(finalAllocated)
      .map(([dueId, item]) => ({
        dueId: Number(dueId),
        amountToPay: Number(item.amountToPay) || 0,
        fineToPay: Number(item.fineToPay) || 0,
      }));

    if (!duesToPay.length) {
      setErrorMsg('No dues or fines are allocated for payment.');
      return;
    }

    const payments = paymentSplits
      .filter((p) => Number(p.amount) > 0 || (netPayable === 0 && p.mode === 1))
      .map((p) => ({
        mode: Number(p.mode),
        amount: Number(p.amount) || 0,
        transactionRef: p.transactionRef?.trim() || null,
        bankName: p.bankName?.trim() || null,
        chequeNo: p.chequeNo?.trim() || null,
        chequeDate: p.chequeDate ? `${p.chequeDate}T00:00:00Z` : null,
      }));

    collectMutation.mutate({
      studentId: Number(selectedStudentId),
      duesToPay,
      payments,
      overallDiscount: numericDiscount > 0 ? numericDiscount : 0,
      discountRemarks: discountRemarks.trim() || null,
      remarks: remarks.trim() || null,
    });
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      {/* Header */}


      {/* Student Search Card (Only shown when NO student is selected) */}
      {!selectedStudentId && (
        <Card sx={{ mb: 2.5, boxShadow: 1, borderRadius: 2, overflow: 'visible', position: 'relative', zIndex: 10 }}>
          <CardContent sx={{ p: { xs: 1.5, sm: 3 } }}>
            <Box sx={{ maxWidth: 640, mx: 'auto' }}>
              <StudentLookupDropdown
                selectedStudentId={selectedStudentId}
                duesSummary={duesSummary}
                isLoadingDues={isLoadingDues}
                onSelectStudent={handleSelectStudent}
                onClearSelection={handleClearSelection}
              />
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Loading Student Profile Skeleton */}
      {selectedStudentId && isLoadingDues && (
        <Card sx={{ mb: 2.5, boxShadow: 1, borderRadius: 2 }}>
          <CardContent sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <CircularProgress size={24} />
            <Box>
              <Typography variant="subtitle2" fontWeight={700} color="primary.main">
                Loading Student Fee Profile...
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Fetching outstanding dues, concessions, and installments
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Dues Grid & Collection Section */}
      {selectedStudentId && duesSummary && (
        <Grid container spacing={3}>
          {/* Left: Dues Selection Grid */}
          <Grid item xs={12} lg={8}>
            <Card sx={{ boxShadow: 1, borderRadius: 2 }}>
              <CardContent sx={{ p: { xs: 1.75, sm: 2.25 }, pb: 1 }}>
                {/* Replaced 'Student Fee Dues & Monthly Collection' with Student Details and Cross Button */}
                <Box sx={{ mb: 2, pb: 1.5, borderBottom: '1px solid #e2e8f0' }}>
                  <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    justifyContent="space-between"
                    alignItems={{ xs: 'flex-start', md: 'center' }}
                    spacing={1.5}
                  >
                    {/* Student Info */}
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
                      <Avatar
                        sx={{
                          width: 42,
                          height: 42,
                          bgcolor: 'primary.main',
                          fontSize: 18,
                          fontWeight: 700,
                          flexShrink: 0,
                          boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
                        }}
                      >
                        {duesSummary?.studentName ? duesSummary.studentName[0] : 'S'}
                      </Avatar>

                      <Box sx={{ minWidth: 0 }}>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                          <Typography variant="subtitle2" fontWeight={800} sx={{ fontSize: 15, color: '#0f172a' }} noWrap>
                            {duesSummary?.studentName}
                          </Typography>
                          <Chip
                            label={duesSummary?.admissionNo}
                            color="primary"
                            size="small"
                            sx={{ fontWeight: 700, height: 20, fontSize: 10.5 }}
                          />
                          <Chip
                            label={`${visiblePayMonths.length} Selected`}
                            color={visiblePayMonths.length > 0 ? 'primary' : 'default'}
                            size="small"
                            variant="outlined"
                            sx={{ fontWeight: 700, height: 20, fontSize: 10.5 }}
                          />
                        </Stack>

                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, fontSize: 11.5 }}>
                          Class: <b style={{ color: '#0f172a' }}>{duesSummary?.className} - {duesSummary?.sectionName}</b>
                          {' • '}Roll: <b style={{ color: '#0f172a' }}>{duesSummary?.rollNo ? '#' + duesSummary.rollNo : '—'}</b>
                          {' • '}Guardian: <b style={{ color: '#0f172a' }}>{duesSummary?.guardianName}</b> ({duesSummary?.guardianMobile})
                        </Typography>
                      </Box>
                    </Stack>

                    {/* Actions, Outstanding Dues & Cross Button */}
                    <Stack
                      direction="row"
                      spacing={0.75}
                      alignItems="center"
                      flexWrap="nowrap"
                      sx={{ flexShrink: 0, mt: { xs: 1, md: 0 } }}
                    >
                      <Box sx={{ textAlign: 'right', pr: 0.5 }}>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: 10, fontWeight: 600 }}>
                          Due Balance
                        </Typography>
                        <Typography
                          variant="subtitle2"
                          fontWeight={800}
                          color={duesSummary?.totalOutstanding > 0 ? 'error.main' : 'success.main'}
                          sx={{ fontSize: 13, lineHeight: 1.1 }}
                        >
                          ₹{duesSummary?.totalOutstanding?.toLocaleString()}
                        </Typography>
                      </Box>

                      {selectedMonthIds.length > 0 && (
                        <Button
                          size="small"
                          variant="text"
                          color="error"
                          onClick={handleClearMonths}
                          sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: 11,
                            height: 28,
                            px: 0.75,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Clear
                        </Button>
                      )}

                      {paidMonths.length > 0 && (
                        <Button
                          size="small"
                          variant={showPaidMonths ? "contained" : "outlined"}
                          color="success"
                          onClick={() => setShowPaidMonths(!showPaidMonths)}
                          sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: 11,
                            height: 28,
                            px: 1,
                            whiteSpace: 'nowrap',
                            borderRadius: 1.5,
                          }}
                        >
                          {showPaidMonths ? `Hide Paid (${paidMonths.length})` : `Show Paid (${paidMonths.length})`}
                        </Button>
                      )}

                      <Button
                        size="small"
                        variant="outlined"
                        color="secondary"
                        onClick={handleSelectAllMonths}
                        sx={{
                          textTransform: 'none',
                          fontWeight: 600,
                          fontSize: 11,
                          height: 28,
                          px: 1,
                          whiteSpace: 'nowrap',
                          borderRadius: 1.5,
                        }}
                      >
                        {selectedMonthIds.length === unpaidMonths.length
                          ? 'Deselect All'
                          : 'Select All Unpaid'}
                      </Button>

                      {/* Cross Button to Deselect Student & Reopen Search */}
                      <Tooltip title="Deselect Student (Back to Search)">
                        <IconButton
                          size="small"
                          onClick={handleClearSelection}
                          sx={{
                            bgcolor: '#f8fafc',
                            color: '#64748b',
                            border: '1px solid #cbd5e1',
                            width: 28,
                            height: 28,
                            ml: 0.5,
                            '&:hover': {
                              bgcolor: '#fee2e2',
                              color: '#dc2626',
                              borderColor: '#fca5a5',
                            },
                          }}
                        >
                          <ClearIcon sx={{ fontSize: 17 }} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>
                </Box>

                {/* FIFO Informational Notice */}
                {infoNotice && (
                  <Alert severity="info" variant="outlined" onClose={() => setInfoNotice('')} sx={{ mb: 2, borderRadius: 2, py: 0.5, fontSize: 12 }}>
                    {infoNotice}
                  </Alert>
                )}

                {/* Compact Interactive Month Scroll Bar */}
                {monthGroups.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <IconButton
                        size="small"
                        onClick={() => handleScrollMonths('left')}
                        sx={{
                          p: 0.25,
                          width: 24,
                          height: 24,
                          bgcolor: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          borderRadius: 1,
                          flexShrink: 0,
                          '&:hover': { bgcolor: '#e2e8f0' },
                        }}
                        title="Scroll Left"
                      >
                        <ChevronLeftIcon sx={{ fontSize: 16 }} />
                      </IconButton>

                      <Box
                        ref={monthScrollRef}
                        onMouseDown={handleMonthMouseDown}
                        onMouseMove={handleMonthMouseMove}
                        onMouseUp={handleMonthMouseUp}
                        onMouseLeave={handleMonthMouseUp}
                        onWheel={handleMonthWheel}
                        sx={{
                          display: 'flex',
                          gap: 0.75,
                          overflowX: 'auto',
                          py: 0.5,
                          px: 0.25,
                          flex: 1,
                          cursor: 'grab',
                          userSelect: 'none',
                          scrollBehavior: 'smooth',
                          '&:active': { cursor: 'grabbing' },
                          '&::-webkit-scrollbar': { height: 4 },
                          '&::-webkit-scrollbar-thumb': { bgcolor: '#cbd5e1', borderRadius: 2 },
                        }}
                      >
                        {monthGroups.map((m) => {
                          const isMonthSelected = selectedMonthIds.includes(m.installmentId);

                          return (
                            <Paper
                              key={m.installmentId}
                              variant="outlined"
                              onClick={() => {
                                if (!hasDraggedRef.current) {
                                  handleToggleMonth(m.installmentId);
                                }
                              }}
                              sx={{
                                py: 0.4,
                                px: 0.6,
                                minWidth: 72,
                                maxWidth: 86,
                                flexShrink: 0,
                                cursor: 'pointer',
                                textAlign: 'center',
                                bgcolor: isMonthSelected
                                  ? '#1e40af'
                                  : m.isPaid
                                  ? '#f8fafc'
                                  : '#ffffff',
                                color: isMonthSelected ? '#ffffff' : 'inherit',
                                borderColor: isMonthSelected
                                  ? '#1d4ed8'
                                  : m.isPaid
                                  ? '#86efac'
                                  : '#bfdbfe',
                                borderWidth: isMonthSelected ? 2 : 1,
                                borderRadius: 1.25,
                                boxShadow: isMonthSelected ? '0 2px 6px rgba(30, 64, 175, 0.2)' : 0,
                                transition: 'all 0.15s ease-in-out',
                                '&:hover': {
                                  boxShadow: 1,
                                  borderColor: isMonthSelected ? '#1d4ed8' : 'primary.main',
                                },
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{
                                  color: isMonthSelected ? 'rgba(255,255,255,0.85)' : 'text.secondary',
                                  display: 'block',
                                  fontSize: 8.5,
                                  fontWeight: 600,
                                  lineHeight: 1.1,
                                }}
                              >
                                {dayjs(m.dueDate).format('DD MMM')}
                              </Typography>
                              <Typography
                                variant="body2"
                                fontWeight={700}
                                sx={{
                                  color: isMonthSelected ? '#ffffff' : 'text.primary',
                                  fontSize: 11,
                                  mt: 0.1,
                                  lineHeight: 1.2,
                                }}
                                noWrap
                              >
                                {m.installmentName}
                              </Typography>

                              <Box sx={{ mt: 0.3 }}>
                                {m.isPaid ? (
                                  <Chip
                                    icon={<CheckIcon sx={{ fontSize: '10px !important' }} />}
                                    label="PAID"
                                    color="success"
                                    size="small"
                                    sx={{ height: 16, fontSize: 8.5, fontWeight: 700, px: 0.25 }}
                                  />
                                ) : isMonthSelected ? (
                                  <Chip
                                    icon={<CheckIcon sx={{ fontSize: '10px !important', color: '#1e40af !important' }} />}
                                    label={`₹${m.totalPayable.toLocaleString()}`}
                                    size="small"
                                    sx={{
                                      height: 16,
                                      fontSize: 8.5,
                                      fontWeight: 700,
                                      bgcolor: '#ffffff',
                                      color: '#1e40af',
                                      px: 0.25,
                                    }}
                                  />
                                ) : (
                                  <Typography variant="caption" fontWeight={700} color="error.main" sx={{ fontSize: 9.5 }}>
                                    ₹{m.totalPayable.toLocaleString()}
                                  </Typography>
                                )}
                              </Box>
                            </Paper>
                          );
                        })}
                      </Box>

                      <IconButton
                        size="small"
                        onClick={() => handleScrollMonths('right')}
                        sx={{
                          p: 0.25,
                          width: 24,
                          height: 24,
                          bgcolor: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          borderRadius: 1,
                          flexShrink: 0,
                          '&:hover': { bgcolor: '#e2e8f0' },
                        }}
                        title="Scroll Right"
                      >
                        <ChevronRightIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Stack>
                  </Box>
                )}

                {isLoadingDues ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : duesList.length === 0 ? (
                  <Alert severity="info" variant="outlined">
                    No fee dues generated for this student. Assign fee structure in Fee Assignment tab.
                  </Alert>
                ) : visibleMonths.length === 0 ? (
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 4,
                      textAlign: 'center',
                      bgcolor: '#fafbfc',
                      border: '2px dashed #90caf9',
                      borderRadius: 2,
                      my: 2,
                    }}
                  >
                    <CalendarMonthIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1, opacity: 0.8 }} />
                    <Typography variant="h6" fontWeight={700} gutterBottom>
                      No Month Selected for Collection
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 460, mx: 'auto', mb: 2.5 }}>
                      Please select an academic month from the visual bar above to view and collect dues. Due to the <b>Strict Sequential Dues Rule</b>, earlier unpaid months are cleared first.
                    </Typography>
                    <Stack direction="row" spacing={1.5} justifyContent="center">
                      <Button variant="contained" size="small" onClick={handleSelectOneMonth} startIcon={<BoltIcon />}>
                        Pay Next Unpaid Month ({unpaidMonths[0]?.installmentName || 'None'})
                      </Button>
                      {unpaidMonths.length > 1 && (
                        <Button variant="outlined" size="small" onClick={handleSelectAllMonths}>
                          Pay All Dues ({unpaidMonths.length} Months)
                        </Button>
                      )}
                    </Stack>
                  </Paper>
                ) : (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                        <TableRow>
                          <TableCell width={50} align="center"><b>Select</b></TableCell>
                          <TableCell><b>Installment / Fee Head</b></TableCell>
                          <TableCell width={110}><b>Nature</b></TableCell>
                          <TableCell align="right" width={100}><b>Fee Amount</b></TableCell>
                          <TableCell align="right" width={105}><b>Concession</b></TableCell>
                          <TableCell align="right" width={110}><b>Paid Amount</b></TableCell>
                          <TableCell align="right" width={115}><b>Remaining Dues</b></TableCell>
                          <TableCell align="right" width={85}><b>Late Fine</b></TableCell>
                          <TableCell align="right" width={135}><b>Pay Amount (₹)</b></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {visibleMonths.map((month) => {
                          const unpaidItems = month.items.filter((d) => d.balanceAmount > 0);
                          const monthItems = unpaidItems.length > 0 ? unpaidItems : month.items;

                          return (
                            <React.Fragment key={month.installmentId}>
                              {/* Clean Month Group Header */}
                              <TableRow sx={{ bgcolor: '#eef4fd', borderTop: '2px solid #1976d2' }}>
                                <TableCell colSpan={9} sx={{ py: 1, px: 2 }}>
                                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Stack direction="row" spacing={1.5} alignItems="center">
                                      <CalendarMonthIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                                      <Typography variant="subtitle2" fontWeight={800} color="primary.dark">
                                        📅 {month.installmentName}
                                      </Typography>
                                      <Chip
                                        label={`Due: ${dayjs(month.dueDate).format('DD MMM YYYY')}`}
                                        size="small"
                                        sx={{ height: 20, fontSize: 11, bgcolor: '#ffffff', color: 'text.secondary' }}
                                      />
                                      {month.isPaid ? (
                                        <Chip label="PAID" size="small" color="success" sx={{ height: 20, fontSize: 10, fontWeight: 700 }} />
                                      ) : month.totalPaid > 0 ? (
                                        <Chip label="PARTIAL" size="small" color="warning" sx={{ height: 20, fontSize: 10, fontWeight: 700 }} />
                                      ) : null}
                                    </Stack>
                                    <Typography variant="caption" fontWeight={700} color="text.secondary">
                                      Total Fee: ₹{month.totalOriginal.toLocaleString()} | Paid: ₹{month.totalPaid.toLocaleString()} | Due: ₹{month.totalBalance.toLocaleString()} {month.totalFine > 0 && `(+₹${month.totalFine} Fine)`}
                                    </Typography>
                                  </Stack>
                                </TableCell>
                              </TableRow>

                              {/* Rows for each fee head in this selected month */}
                              {monthItems.map((d) => {
                                const isItemOptional = Boolean(d.isOptional);
                                const isItemSelected = isItemOptional ? Boolean(selectedDues[d.dueId]) : true;

                                return (
                                  <TableRow
                                    key={d.dueId}
                                    hover
                                    sx={{
                                      bgcolor: isItemSelected ? '#ffffff' : '#fafafa',
                                      opacity: isItemSelected ? 1 : 0.6,
                                      borderBottom: '1px solid #f0f0f0',
                                    }}
                                  >
                                    {/* Checkbox */}
                                    <TableCell align="center" padding="checkbox">
                                      {month.isPaid ? (
                                        <Tooltip title="Already Paid">
                                          <span>
                                            <Checkbox
                                              size="small"
                                              checked={true}
                                              disabled={true}
                                              sx={{
                                                color: '#16a34a !important',
                                                '&.Mui-disabled': { color: '#16a34a !important' },
                                              }}
                                            />
                                          </span>
                                        </Tooltip>
                                      ) : isItemOptional ? (
                                        <Tooltip title="Optional Fee - Click to include or exclude">
                                          <Checkbox
                                            size="small"
                                            checked={isItemSelected}
                                            disabled={month.isPaid}
                                            onChange={() => handleToggleOptionalDue(d)}
                                            color="secondary"
                                          />
                                        </Tooltip>
                                      ) : (
                                        <Tooltip title="Mandatory Fee - Required for payment">
                                          <span>
                                            <Checkbox
                                              size="small"
                                              checked={true}
                                              disabled={true}
                                              sx={{
                                                color: 'primary.main',
                                                '&.Mui-disabled': { color: 'primary.main' },
                                              }}
                                            />
                                          </span>
                                        </Tooltip>
                                      )}
                                    </TableCell>

                                    {/* Fee Head Name */}
                                    <TableCell>
                                      <Typography variant="body2" fontWeight={700} color="text.primary">
                                        {d.feeHeadName}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {month.installmentName}
                                      </Typography>
                                    </TableCell>

                                    {/* Nature */}
                                    <TableCell>
                                      {isItemOptional ? (
                                        <Chip
                                          label="Optional"
                                          size="small"
                                          color="warning"
                                          sx={{
                                            fontWeight: 600,
                                            height: 22,
                                            fontSize: 11,
                                            bgcolor: '#fff3e0',
                                            color: '#e65100',
                                            border: '1px solid #ffe0b2',
                                          }}
                                        />
                                      ) : (
                                        <Chip
                                          label="Mandatory"
                                          size="small"
                                          color="primary"
                                          variant="outlined"
                                          sx={{ fontWeight: 600, height: 22, fontSize: 11 }}
                                        />
                                      )}
                                    </TableCell>

                                    {/* Fee Amount (Original) */}
                                    <TableCell align="right">
                                      <Typography variant="body2" fontWeight={600}>
                                        ₹{Number(d.originalAmount || 0).toLocaleString()}
                                      </Typography>
                                    </TableCell>

                                    {/* Concession */}
                                    <TableCell align="right">
                                      {Number(d.concessionAmount || 0) > 0 ? (
                                        <Tooltip title={`Concession applied: ₹${d.concessionAmount}`}>
                                          <Chip
                                            label={`-₹${Number(d.concessionAmount).toLocaleString()}`}
                                            size="small"
                                            sx={{
                                              height: 20,
                                              fontSize: 11,
                                              fontWeight: 700,
                                              bgcolor: '#f3e8ff',
                                              color: '#7e22ce',
                                              border: '1px solid #d8b4fe',
                                            }}
                                          />
                                        </Tooltip>
                                      ) : (
                                        <Typography variant="body2" color="text.disabled">—</Typography>
                                      )}
                                    </TableCell>

                                    {/* Paid Amount (Previously Paid) */}
                                    <TableCell align="right">
                                      {Number(d.paidAmount || 0) > 0 ? (
                                        <Typography variant="body2" fontWeight={700} sx={{ color: '#16a34a' }}>
                                          ₹{Number(d.paidAmount).toLocaleString()}
                                        </Typography>
                                      ) : (
                                        <Typography variant="body2" color="text.disabled">₹0</Typography>
                                      )}
                                    </TableCell>

                                    {/* Remaining Dues (Balance) */}
                                    <TableCell align="right">
                                      <Typography
                                        variant="body2"
                                        fontWeight={700}
                                        sx={{ color: d.balanceAmount > 0 ? '#dc2626' : 'text.primary' }}
                                      >
                                        ₹{Number(d.balanceAmount || 0).toLocaleString()}
                                      </Typography>
                                    </TableCell>

                                    {/* Late Fine */}
                                    <TableCell align="right">
                                      <Typography variant="body2" color="text.disabled">—</Typography>
                                    </TableCell>

                                    {/* Pay Amount TextField */}
                                    <TableCell align="right">
                                      {month.isPaid ? (
                                        <Chip label="PAID" color="success" size="small" sx={{ height: 22, fontSize: 11, fontWeight: 700 }} />
                                      ) : isItemSelected ? (
                                        <Box sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                          <TextField
                                            type="number"
                                            size="small"
                                            sx={{ width: 110, ...noSpinnerSx }}
                                            value={selectedDues[d.dueId]?.amountToPay ?? ''}
                                            inputProps={{ min: 0, max: d.balanceAmount }}
                                            onChange={(e) => handlePartialAmountChange(d.dueId, e.target.value)}
                                          />
                                          {selectedDues[d.dueId]?.amountToPay !== undefined && selectedDues[d.dueId]?.amountToPay !== '' && (
                                            <Typography
                                              variant="caption"
                                              sx={{
                                                fontSize: 10,
                                                mt: 0.25,
                                                fontWeight: 600,
                                                color:
                                                  Number(selectedDues[d.dueId].amountToPay) >= d.balanceAmount
                                                    ? 'success.main'
                                                    : Number(selectedDues[d.dueId].amountToPay) > 0
                                                    ? '#b45309'
                                                    : 'text.secondary',
                                              }}
                                            >
                                              {Number(selectedDues[d.dueId].amountToPay) >= d.balanceAmount
                                                ? '✓ Full'
                                                : Number(selectedDues[d.dueId].amountToPay) > 0
                                                ? `Bal: ₹${(d.balanceAmount - Number(selectedDues[d.dueId].amountToPay)).toLocaleString()}`
                                                : `Pending: ₹${d.balanceAmount.toLocaleString()}`}
                                            </Typography>
                                          )}
                                        </Box>
                                      ) : (
                                        <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                                          — Not Opted —
                                        </Typography>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}

                              {/* Dedicated Monthly Late Fine Penalty Row (Rendered once per overdue month) */}
                              {month.totalFine > 0 && (
                                <TableRow sx={{ bgcolor: '#fff1f2', '&:hover': { bgcolor: '#ffe4e6' }, borderLeft: '4px solid #e11d48' }}>
                                  <TableCell align="center">
                                    <Chip label="Fine" size="small" color="error" sx={{ height: 20, fontSize: 10, fontWeight: 700 }} />
                                  </TableCell>
                                  <TableCell colSpan={5}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                      <Typography variant="body2" fontWeight={700} sx={{ color: '#be123c' }}>
                                        ⚡ Late Fine Penalty ({month.installmentName})
                                      </Typography>
                                      <Chip label="Monthly Fine (1x per month)" size="small" variant="outlined" color="error" sx={{ height: 18, fontSize: 10 }} />
                                    </Stack>
                                  </TableCell>
                                  <TableCell align="right">
                                    <Typography variant="body2" fontWeight={700} sx={{ color: '#be123c' }}>
                                      ₹{month.totalFine.toLocaleString()}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="right">
                                    <Chip label={`+₹${month.totalFine.toLocaleString()}`} size="small" color="error" sx={{ height: 20, fontSize: 10, fontWeight: 700 }} />
                                  </TableCell>
                                  <TableCell align="right">
                                    <Typography variant="body2" fontWeight={700} sx={{ color: '#be123c' }}>
                                      ₹{month.totalFine.toLocaleString()}
                                    </Typography>
                                  </TableCell>
                                </TableRow>
                              )}

                              {/* Dedicated Monthly Fee Structure Card (Compact & Clean) */}
                              <TableRow sx={{ bgcolor: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                                <TableCell colSpan={9} sx={{ py: 0.5, px: 1.5 }}>
                                  <Paper
                                    elevation={0}
                                    sx={{
                                      p: 1,
                                      bgcolor: '#ffffff',
                                      border: '1px solid #e2e8f0',
                                      borderRadius: 1.5,
                                    }}
                                  >
                                    {/* Header Row */}
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75, pb: 0.4, borderBottom: '1px solid #f1f5f9' }}>
                                      <Stack direction="row" spacing={1} alignItems="center">
                                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: month.isPaid ? '#16a34a' : '#2563eb' }} />
                                        <Typography variant="caption" fontWeight={700} color="text.primary" sx={{ fontSize: 12 }}>
                                          Fee Details — {month.installmentName}
                                        </Typography>
                                      </Stack>
                                      <Chip
                                        label={month.isPaid ? "Paid" : month.totalPaid > 0 ? "Partially Paid" : "Unpaid"}
                                        size="small"
                                        color={month.isPaid ? "success" : month.totalPaid > 0 ? "warning" : "default"}
                                        sx={{ height: 18, fontSize: 9.5, fontWeight: 700 }}
                                      />
                                    </Stack>

                                    {/* Compact 4-Card Metrics */}
                                    <Grid container spacing={0.75} sx={{ mb: 0.5 }}>
                                      <Grid item xs={6} sm={3}>
                                        <Box sx={{ p: 0.5, px: 1, bgcolor: '#f8fafc', borderRadius: 1, border: '1px solid #e2e8f0' }}>
                                          <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ fontSize: 10 }}>
                                            Total Fee
                                          </Typography>
                                          <Typography variant="body2" fontWeight={800} color="text.primary" sx={{ fontSize: 12.5 }}>
                                            ₹{month.totalOriginal.toLocaleString()}
                                          </Typography>
                                          {month.totalConcession > 0 && (
                                            <Typography variant="caption" sx={{ color: '#7e22ce', fontWeight: 700, fontSize: 9.5 }}>
                                              Concession: -₹{month.totalConcession.toLocaleString()}
                                            </Typography>
                                          )}
                                        </Box>
                                      </Grid>

                                      <Grid item xs={6} sm={3}>
                                        <Box sx={{ p: 0.5, px: 1, bgcolor: '#f0fdf4', borderRadius: 1, border: '1px solid #bbf7d0' }}>
                                          <Typography variant="caption" sx={{ color: '#166534', fontWeight: 600, fontSize: 10 }} display="block">
                                            Paid Amount
                                          </Typography>
                                          <Typography variant="body2" fontWeight={800} sx={{ color: '#16a34a', fontSize: 12.5 }}>
                                            ₹{month.totalPaid.toLocaleString()}
                                          </Typography>
                                        </Box>
                                      </Grid>

                                      <Grid item xs={6} sm={3}>
                                        <Box sx={{ p: 0.5, px: 1, bgcolor: '#fef2f2', borderRadius: 1, border: '1px solid #fecaca' }}>
                                          <Typography variant="caption" sx={{ color: '#991b1b', fontWeight: 600, fontSize: 10 }} display="block">
                                            Remaining Dues
                                          </Typography>
                                          <Typography variant="body2" fontWeight={800} sx={{ color: '#dc2626', fontSize: 12.5 }}>
                                            ₹{month.totalBalance.toLocaleString()}
                                          </Typography>
                                          {month.totalFine > 0 && (
                                            <Typography variant="caption" sx={{ color: '#dc2626', fontWeight: 700, fontSize: 9.5 }}>
                                              +₹{month.totalFine.toLocaleString()} Fine
                                            </Typography>
                                          )}
                                        </Box>
                                      </Grid>

                                      <Grid item xs={6} sm={3}>
                                        {(() => {
                                          const monthPayingNow = monthItems.reduce(
                                            (s, item) => s + (Number(selectedDues[item.dueId]?.amountToPay) || 0) + (Number(selectedDues[item.dueId]?.fineToPay) || 0),
                                            0
                                          );
                                          const monthBalAfterPay = Math.max(0, (month.totalBalance + month.totalFine) - monthPayingNow);

                                          return (
                                            <Box sx={{ p: 0.5, px: 1, bgcolor: '#eff6ff', borderRadius: 1, border: '1px solid #bfdbfe' }}>
                                              <Typography variant="caption" sx={{ color: '#1e40af', fontWeight: 600, fontSize: 10 }} display="block">
                                                Paying Now
                                              </Typography>
                                              <Typography variant="body2" fontWeight={800} sx={{ color: '#2563eb', fontSize: 12.5 }}>
                                                ₹{monthPayingNow.toLocaleString()}
                                              </Typography>
                                              <Typography variant="caption" sx={{ color: monthBalAfterPay > 0 ? '#b45309' : '#16a34a', fontWeight: 700, fontSize: 9.5 }}>
                                                {monthBalAfterPay > 0 ? `Carry Due: ₹${monthBalAfterPay.toLocaleString()}` : monthPayingNow > 0 ? 'Cleared' : 'No Allocation'}
                                              </Typography>
                                            </Box>
                                          );
                                        })()}
                                      </Grid>
                                    </Grid>

                                    {/* Slim Calculation Strip */}
                                    <Box
                                      sx={{
                                        py: 0.3,
                                        px: 0.75,
                                        bgcolor: '#f1f5f9',
                                        borderRadius: 0.75,
                                        fontSize: 10.5,
                                        color: '#334155',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        flexWrap: 'wrap',
                                        gap: 0.5,
                                      }}
                                    >
                                      <span>
                                        <b>Calculation:</b> ₹{(month.totalOriginal - month.totalConcession).toLocaleString()} (Net Fee) − ₹{month.totalPaid.toLocaleString()} (Paid) = <b style={{ color: '#dc2626' }}>₹{month.totalBalance.toLocaleString()}</b> (Remaining Dues)
                                      </span>
                                      {(() => {
                                        const monthPayingNow = monthItems.reduce(
                                          (s, item) => s + (Number(selectedDues[item.dueId]?.amountToPay) || 0) + (Number(selectedDues[item.dueId]?.fineToPay) || 0),
                                          0
                                        );
                                        const monthBalAfterPay = Math.max(0, (month.totalBalance + month.totalFine) - monthPayingNow);
                                        return monthPayingNow > 0 && monthBalAfterPay > 0 ? (
                                          <span style={{ color: '#b45309', fontWeight: 600 }}>
                                            Balance After Payment: <b style={{ color: '#dc2626' }}>₹{monthBalAfterPay.toLocaleString()}</b>
                                          </span>
                                        ) : null;
                                      })()}
                                    </Box>
                                  </Paper>
                                </TableCell>
                              </TableRow>
                            </React.Fragment>
                          );
                        })}

                        {/* Summary Footer Row */}
                        <TableRow sx={{ bgcolor: '#f4f6f8', borderTop: '2px solid #ccc' }}>
                          <TableCell colSpan={3}>
                            <Typography variant="subtitle2" fontWeight={700}>
                              Total ({activeDueItems.length} Fee Heads across {visiblePayMonths.length} Months)
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="subtitle2" fontWeight={700}>
                              ₹{visiblePayMonths.reduce((s, m) => s + m.totalOriginal, 0).toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#7e22ce' }}>
                              {visiblePayMonths.reduce((s, m) => s + m.totalConcession, 0) > 0
                                ? `-₹${visiblePayMonths.reduce((s, m) => s + m.totalConcession, 0).toLocaleString()}`
                                : '—'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#16a34a' }}>
                              ₹{visiblePayMonths.reduce((s, m) => s + m.totalPaid, 0).toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#dc2626' }}>
                              ₹{visiblePayMonths.reduce((s, m) => s + m.totalBalance, 0).toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="subtitle2" fontWeight={700} color="error.main">
                              +₹{Object.values(selectedDues).reduce((s, i) => s + (Number(i.fineToPay) || 0), 0).toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="subtitle1" fontWeight={800} color="primary.main">
                              ₹{totalDuesSelected.toLocaleString()}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Right: Payment Modes Split & Finalize Collection */}
          <Grid item xs={12} lg={4}>
            <Card sx={{ boxShadow: 1, borderRadius: 2, height: '100%', bgcolor: '#fbfcfd' }}>
              <CardContent sx={{ p: { xs: 2, sm: 2.25 } }}>
                {errorMsg && <Alert severity="error" sx={{ mb: 2, py: 0.5, fontSize: 12 }}>{errorMsg}</Alert>}

                {/* Amount Summary with Dues Breakdown */}
                <Paper sx={{ p: 1.75, mb: 2, bgcolor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 2 }}>
                  <Stack spacing={1.2}>
                    {selectedMonthNames.length > 0 && (
                      <Box sx={{ pb: 1, borderBottom: '1px dashed #e2e8f0' }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" sx={{ fontSize: 11 }}>
                          Selected Months ({selectedMonthNames.length}):
                        </Typography>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ gap: 0.5, mt: 0.5 }}>
                          {visiblePayMonths.map((m, i) => {
                            const isArrear = i < visiblePayMonths.length - 1;
                            return (
                              <Chip
                                key={m.installmentId}
                                label={isArrear ? `${m.installmentName} (Arrears)` : m.installmentName}
                                size="small"
                                color={isArrear ? "warning" : "primary"}
                                sx={{ fontWeight: 700, height: 22, fontSize: 11 }}
                              />
                            );
                          })}
                        </Stack>
                      </Box>
                    )}

                    {previousDuesTotal > 0 && (
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="body2" fontWeight={700} color="#b45309" sx={{ fontSize: 12.5 }}>
                            Previous Dues (Arrears):
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: 10.5 }}>
                            {previousDuesMonths.map((m) => m.installmentName).join(', ')}
                          </Typography>
                        </Box>
                        <Typography variant="body2" fontWeight={800} color="#b45309" sx={{ fontSize: 13 }}>
                          ₹{previousDuesTotal.toLocaleString()}
                        </Typography>
                      </Stack>
                    )}

                    {currentTargetMonth && (
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ fontSize: 12.5 }}>
                            Current Month Fee ({currentTargetMonth.installmentName}):
                          </Typography>
                        </Box>
                        <Typography variant="body2" fontWeight={700} sx={{ fontSize: 13 }}>
                          ₹{currentMonthDueTotal.toLocaleString()}
                        </Typography>
                      </Stack>
                    )}

                    {visiblePayMonths.reduce((s, m) => s + m.totalConcession, 0) > 0 && (
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" sx={{ color: '#7e22ce', fontWeight: 600, fontSize: 12.5 }}>Total Concession:</Typography>
                        <Typography variant="body2" fontWeight={700} sx={{ color: '#7e22ce', fontSize: 13 }}>
                          - ₹{visiblePayMonths.reduce((s, m) => s + m.totalConcession, 0).toLocaleString()}
                        </Typography>
                      </Stack>
                    )}

                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12.5 }}>Selected Late Fine:</Typography>
                      <Typography variant="body2" fontWeight={600} color={totalFineSelected > 0 ? "error.main" : "text.secondary"} sx={{ fontSize: 13 }}>
                        {totalFineSelected > 0 ? `+ ₹${totalFineSelected.toLocaleString()}` : '₹0'}
                      </Typography>
                    </Stack>

                    {numericDiscount > 0 && (
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="body2" sx={{ color: '#15803d', fontWeight: 700, fontSize: 12.5 }}>
                            Overall Discount:
                          </Typography>
                          {discountRemarks && (
                            <Typography variant="caption" sx={{ color: '#166534', display: 'block', fontSize: 10.5, fontStyle: 'italic' }}>
                              ({discountRemarks})
                            </Typography>
                          )}
                        </Box>
                        <Typography variant="body2" fontWeight={800} sx={{ color: '#15803d', fontSize: 13 }}>
                          - ₹{numericDiscount.toLocaleString()}
                        </Typography>
                      </Stack>
                    )}

                    <Divider />

                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                        {numericDiscount > 0 ? 'Net Payable:' : 'Total Payable:'}
                      </Typography>
                      <Typography variant="h6" fontWeight={900} color="primary.main">
                        ₹{netPayable.toLocaleString()}
                      </Typography>
                    </Stack>

                    {isPartPayment && (
                      <Stack spacing={0.5} sx={{ mt: 1, pt: 1, borderTop: '1px dashed #e2e8f0' }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" fontWeight={700} color="#b45309">Paying Now:</Typography>
                          <Typography variant="subtitle2" fontWeight={800} color="#b45309">
                            ₹{totalPaymentEntered.toLocaleString()}
                          </Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" fontWeight={700} color="error.main">Remaining Due:</Typography>
                          <Typography variant="subtitle2" fontWeight={800} color="error.main">
                            ₹{remainingDuesBalance.toLocaleString()}
                          </Typography>
                        </Stack>
                      </Stack>
                    )}
                  </Stack>
                </Paper>

                {/* Special Overall Fee Discount (Authorized Users Only) */}
                {discountEligibility.canGiveDiscount && (
                  <Paper
                    sx={{
                      p: 1.5,
                      mb: 2,
                      bgcolor: '#f0fdf4',
                      border: '1px solid #86efac',
                      borderRadius: 2,
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
                      <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#166534', fontSize: 13 }}>
                        Authorized Fee Discount
                      </Typography>
                      <Chip
                        label={
                          discountEligibility.isUnlimited
                            ? 'Authority: Unlimited (100%)'
                            : `Max Limit: ${Number(discountEligibility.maxDiscountLimit || 0)}% (Max ₹${Math.round((maxTotalPayable * Number(discountEligibility.maxDiscountLimit || 0)) / 100).toLocaleString('en-IN')})`
                        }
                        size="small"
                        sx={{
                          bgcolor: '#dcfce7',
                          color: '#15803d',
                          fontWeight: 700,
                          fontSize: 10.5,
                          height: 22,
                        }}
                      />
                    </Stack>
                    <Grid container spacing={1.25}>
                      <Grid item xs={12} sm={3.5}>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          label="Discount (%)"
                          placeholder="0"
                          value={discountPercent}
                          onChange={(e) => handleDiscountPercentChange(e.target.value)}
                          onKeyDown={(e) => {
                            if (['-', '+', 'e', 'E'].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          InputProps={{
                            endAdornment: <InputAdornment position="end">%</InputAdornment>,
                          }}
                          error={Boolean(discountError)}
                          sx={{ bgcolor: '#fff', ...noSpinnerSx }}
                          inputProps={{ min: 0, max: 100, step: 'any' }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={3.5}>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          label="Discount (₹)"
                          placeholder="0"
                          value={overallDiscount}
                          onChange={(e) => handleDiscountRupeesChange(e.target.value)}
                          onKeyDown={(e) => {
                            if (['-', '+', 'e', 'E'].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          InputProps={{
                            startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                          }}
                          error={Boolean(discountError)}
                          sx={{ bgcolor: '#fff', ...noSpinnerSx }}
                          inputProps={{ min: 0, max: maxTotalPayable, step: 'any' }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={5}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Discount Remarks"
                          placeholder="e.g. Special concession"
                          value={discountRemarks}
                          onChange={(e) => setDiscountRemarks(e.target.value)}
                          sx={{ bgcolor: '#fff' }}
                        />
                      </Grid>
                    </Grid>

                    {discountError && (
                      <Typography variant="caption" color="error.main" sx={{ mt: 0.75, display: 'block', fontWeight: 600, fontSize: 11.5 }}>
                        ⚠️ {discountError}
                      </Typography>
                    )}

                    {/* Quick % Chips */}
                    {maxTotalPayable > 0 && (
                      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: 11 }}>
                          Quick %:
                        </Typography>
                        {[5, 10, 15, 20, 25, 50]
                          .filter((p) => discountEligibility.isUnlimited || p <= Number(discountEligibility.maxDiscountLimit))
                          .map((p) => (
                            <Chip
                              key={p}
                              label={`${p}%`}
                              size="small"
                              onClick={() => handleDiscountPercentChange(String(p))}
                              sx={{
                                cursor: 'pointer',
                                fontSize: 10,
                                height: 20,
                                bgcolor: String(discountPercent) === String(p) ? '#0284c7' : '#e0f2fe',
                                color: String(discountPercent) === String(p) ? '#fff' : '#0369a1',
                                fontWeight: 600,
                              }}
                            />
                          ))}
                        {!discountEligibility.isUnlimited && Number(discountEligibility.maxDiscountLimit) > 0 && (
                          <Chip
                            label={`Max ${discountEligibility.maxDiscountLimit}%`}
                            size="small"
                            onClick={() => handleDiscountPercentChange(String(discountEligibility.maxDiscountLimit))}
                            sx={{
                              cursor: 'pointer',
                              fontSize: 10,
                              height: 20,
                              bgcolor: String(discountPercent) === String(discountEligibility.maxDiscountLimit) ? '#d97706' : '#fef3c7',
                              color: String(discountPercent) === String(discountEligibility.maxDiscountLimit) ? '#fff' : '#92400e',
                              fontWeight: 700,
                            }}
                          />
                        )}
                      </Stack>
                    )}
                  </Paper>
                )}

                {/* Multi Mode Payment Rows */}
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, fontSize: 13 }}>
                  Payment Modes (Cash, UPI, Card, Cheque)
                </Typography>

                <Stack spacing={1.5} sx={{ mb: 2 }}>
                  {paymentSplits.map((item, index) => (
                    <Paper key={index} sx={{ p: 1.25, border: '1px solid #e2e8f0', bgcolor: '#fff', borderRadius: 1.5 }}>
                      <Stack spacing={1.25}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <TextField
                            select
                            size="small"
                            label="Mode"
                            sx={{ width: 140 }}
                            value={item.mode}
                            onChange={(e) => handlePaymentFieldChange(index, 'mode', Number(e.target.value))}
                          >
                            <MenuItem value={1}>Cash</MenuItem>
                            <MenuItem value={2}>UPI / QR</MenuItem>
                            <MenuItem value={3}>Card (POS)</MenuItem>
                            <MenuItem value={4}>Cheque</MenuItem>
                            <MenuItem value={5}>Bank Transfer</MenuItem>
                          </TextField>

                          <TextField
                            type="number"
                            size="small"
                            label="Amount (₹)"
                            sx={{ flex: 1, ...noSpinnerSx }}
                            value={item.amount}
                            inputProps={{ min: 0, max: netPayable }}
                            onChange={(e) => handlePaymentFieldChange(index, 'amount', e.target.value)}
                          />

                          {paymentSplits.length > 1 && (
                            <IconButton size="small" color="error" onClick={() => handleRemovePaymentMode(index)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          )}
                        </Stack>

                        {/* Extra fields if not cash */}
                        {item.mode !== 1 && (
                          <Grid container spacing={1}>
                            <Grid item xs={6}>
                              <TextField
                                fullWidth
                                size="small"
                                label={item.mode === 4 ? 'Cheque No' : 'Ref / Txn No'}
                                value={item.mode === 4 ? item.chequeNo : item.transactionRef}
                                onChange={(e) =>
                                  handlePaymentFieldChange(
                                    index,
                                    item.mode === 4 ? 'chequeNo' : 'transactionRef',
                                    e.target.value
                                  )
                                }
                              />
                            </Grid>
                            <Grid item xs={6}>
                              <TextField
                                fullWidth
                                size="small"
                                label="Bank Name"
                                value={item.bankName}
                                onChange={(e) => handlePaymentFieldChange(index, 'bankName', e.target.value)}
                              />
                            </Grid>
                          </Grid>
                        )}
                      </Stack>
                    </Paper>
                  ))}
                </Stack>

                <Stack direction="row" spacing={1} sx={{ mb: paymentModeError ? 1 : 2 }}>
                  <Button size="small" startIcon={<AddIcon />} onClick={handleAddPaymentMode}>
                    Add Payment Mode
                  </Button>
                  {paymentSplits.length === 1 && (
                    <Button size="small" color="secondary" onClick={handleAutoFillPayment}>
                      Auto-fill Full Amount
                    </Button>
                  )}
                </Stack>

                {paymentModeError && (
                  <Alert
                    severity="error"
                    onClose={() => setPaymentModeError('')}
                    sx={{ mb: 2, py: 0.5, fontSize: 12, borderRadius: 1.5 }}
                  >
                    {paymentModeError}
                  </Alert>
                )}

                <TextField
                  fullWidth
                  size="small"
                  label="Cashier Remarks"
                  placeholder="e.g. Paid in full by father"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  sx={{ mb: 3 }}
                />

                {/* Match indicator & Payment Status */}
                <Box sx={{ mb: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary">Total Entered Modes:</Typography>
                    <Typography
                      variant="body2"
                      fontWeight={800}
                      color={isOverPayment ? 'error.main' : isPartPayment ? '#b45309' : 'success.main'}
                    >
                      ₹{totalPaymentEntered.toLocaleString()}
                    </Typography>
                  </Stack>

                  {/* Full Payment Badge */}
                  {isFullPayment && (
                    <Alert severity="success" sx={{ mt: 1, py: 0.5, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                      <Typography variant="caption" fontWeight={700} color="#166534">
                        ✓ Full Payment: ₹{totalPaymentEntered.toLocaleString()} paid in full.
                      </Typography>
                    </Alert>
                  )}

                  {/* Part Payment Badge */}
                  {isPartPayment && (
                    <Paper sx={{ mt: 1, p: 1.25, bgcolor: '#fffbeb', border: '1px solid #fde68a', borderRadius: 1.5 }}>
                      <Typography variant="caption" fontWeight={700} color="#b45309" display="block">
                        ⚡ Part Payment (Partial):
                      </Typography>
                      <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
                        <Typography variant="caption" color="#78350f">Paying Now:</Typography>
                        <Typography variant="caption" fontWeight={700} color="#78350f">₹{totalPaymentEntered.toLocaleString()}</Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="caption" color="#b45309" fontWeight={700}>Remaining Due:</Typography>
                        <Typography variant="caption" fontWeight={800} color="#b45309">₹{remainingDuesBalance.toLocaleString()}</Typography>
                      </Stack>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5, fontSize: 10 }}>
                        Note: Remaining balance of ₹{remainingDuesBalance.toLocaleString()} will carry forward as student dues.
                      </Typography>
                    </Paper>
                  )}

                  {/* Overpayment Error */}
                  {isOverPayment && (
                    <Alert severity="error" sx={{ mt: 1, py: 0.5 }}>
                      <Typography variant="caption" fontWeight={700} display="block">
                        Amount exceeds net payable (₹{netPayable.toLocaleString()}) by ₹{(totalPaymentEntered - netPayable).toLocaleString()}
                      </Typography>
                    </Alert>
                  )}
                </Box>

                <Button
                  fullWidth
                  variant="contained"
                  color={isPartPayment ? "warning" : "success"}
                  size="large"
                  startIcon={<CollectIcon />}
                  disabled={
                    collectMutation.isPending ||
                    visiblePayMonths.length === 0 ||
                    (netPayable > 0 && totalPaymentEntered <= 0) ||
                    isOverPayment ||
                    Boolean(discountError)
                  }
                  loading={collectMutation.isPending}
                  onClick={handleConfirmCollection}
                  sx={{
                    py: 1.2,
                    fontWeight: 700,
                    ...(isPartPayment && {
                      bgcolor: '#d97706',
                      '&:hover': { bgcolor: '#b45309' },
                    }),
                  }}
                >
                  {isOverPayment
                    ? 'Amount Exceeds Payable Amount'
                    : Boolean(discountError)
                    ? discountError
                    : totalPaymentEntered <= 0 && netPayable > 0
                    ? 'Enter Payment Amount'
                    : isPartPayment
                    ? `Collect Part Payment & Generate Receipt (₹${totalPaymentEntered.toLocaleString()})`
                    : `Collect Fee & Generate Receipt (₹${totalPaymentEntered.toLocaleString()})`}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Printable Dual Fee Receipt Dynamic Modal (FR-5.4, BR-5.1) */}
      <AppModal
        open={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        title="Fee Payment Receipt Slip (Dual Copy)"
        subtitle={
          printReceiptData?.studentName
            ? `${printReceiptData.studentName} • Adm No: ${printReceiptData.admissionNo || printReceiptData.admissionNumber || 'N/A'} • Receipt: ${printReceiptData.receiptNo || 'N/A'}`
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
              onClick={() => setIsReceiptModalOpen(false)}
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '6px' }}
            >
              Close
            </Button>
            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
              <Button
                variant="contained"
                startIcon={<WhatsAppIcon />}
                onClick={() => setIsWhatsAppModalOpen(true)}
                sx={{
                  bgcolor: '#25D366',
                  '&:hover': { bgcolor: '#128C7E' },
                  fontWeight: 700,
                  textTransform: 'none',
                  borderRadius: '6px',
                }}
              >
                Send WhatsApp Receipt
              </Button>
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
                  const sName = printReceiptData?.studentName || 'Student';
                  const rNo = printReceiptData?.receiptNo || 'RCP';
                  const aNo = printReceiptData?.admissionNo ? `_${printReceiptData.admissionNo}` : '';
                  printWithTitle(`Fee_Receipt_${sName}${aNo}_${rNo}`);
                }}
                sx={{ fontWeight: 700, textTransform: 'none', px: 3, borderRadius: '6px' }}
              >
                Print Slip (2 Copies)
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

      {/* WhatsApp Receipt Dialog */}
      <WhatsAppDialog
        open={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        recipientName={printReceiptData?.fatherName || printReceiptData?.guardianName || printReceiptData?.studentName}
        recipientPhone={printReceiptData?.guardianMobile || printReceiptData?.contact || printReceiptData?.mobile}
        recipientRole={`Parent of ${printReceiptData?.studentName}`}
        moduleKey="feeReceipt"
        moduleTitle="Fee Payment Receipt (WhatsApp)"
        templateData={{
          ParentName: printReceiptData?.fatherName || printReceiptData?.guardianName || 'Parent',
          StudentName: printReceiptData?.studentName || '',
          ReceiptNo: printReceiptData?.receiptNo || '',
          PaidAmount: Number(printReceiptData?.totalPaid || 0).toLocaleString('en-IN'),
          PaymentMode: printReceiptData?.paymentModeName || 'Cash',
          Balance: Number(printReceiptData?.remainingTotalDues || 0).toLocaleString('en-IN'),
          Date: printReceiptData?.receiptDate
            ? dayjs(printReceiptData.receiptDate).format('DD-MM-YYYY')
            : dayjs().format('DD-MM-YYYY'),
        }}
      />
    </Box>
  );
}
