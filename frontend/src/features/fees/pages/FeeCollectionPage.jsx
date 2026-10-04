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
  Tooltip
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
  Clear as ClearIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import { feesApi } from '../api';
import { studentApi } from '../../students/api';
import { branchApi } from '../../masters/api';
import { useAuthStore } from '../../../store/authStore';
import { FeeReceiptSlip } from '../components/FeeReceiptSlip';
import { exportDualFeeReceiptPdf } from '../utils/feeExportUtils';
import { printWithTitle } from '../../../utils/printUtils';

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

  // Payment splits state
  const [paymentSplits, setPaymentSplits] = useState([
    { mode: 1, amount: '', transactionRef: '', bankName: '', chequeNo: '', chequeDate: '' },
  ]);
  const [remarks, setRemarks] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [paymentModeError, setPaymentModeError] = useState('');

  // Receipt Modal
  const { activeBranchId } = useAuthStore();
  const [printReceiptData, setPrintReceiptData] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [headerSaveLoading, setHeaderSaveLoading] = useState(false);

  // Search students query
  const { data: searchRes, isLoading: isSearching } = useQuery({
    queryKey: ['fee-search-students', searchTerm],
    queryFn: () => studentApi.getStudents({ search: searchTerm, pageSize: 6 }),
    enabled: searchTerm.length >= 2,
  });
  const searchResults = searchRes?.data?.data?.items || [];

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
      setPaymentSplits([{ mode: 1, amount: '', transactionRef: '', bankName: '', chequeNo: '', chequeDate: '' }]);
      setRemarks('');
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
    setErrorMsg('');
    setInfoNotice('');
    setShowPaidMonths(false);
    hasInitializedStudentRef.current = null;
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

  const isPartPayment = totalPaymentEntered > 0 && totalPaymentEntered < maxTotalPayable;
  const isFullPayment = totalPaymentEntered > 0 && Math.abs(totalPaymentEntered - maxTotalPayable) < 0.01;
  const isOverPayment = totalPaymentEntered > maxTotalPayable;
  const remainingDuesBalance = Math.max(0, maxTotalPayable - totalPaymentEntered);

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
  useEffect(() => {
    setSelectedDues((prev) => {
      const next = {};
      visiblePayMonths.forEach((m) => {
        m.items.forEach((item) => {
          if (item.balanceAmount > 0) {
            if (!item.isOptional) {
              // Mandatory: always included
              next[item.dueId] = {
                amountToPay: prev[item.dueId]?.amountToPay !== undefined
                  ? Math.min(Number(prev[item.dueId].amountToPay), Number(item.balanceAmount))
                  : item.balanceAmount,
                fineToPay: item.fineAmount || 0,
              };
            } else {
              // Optional: retain if cashier previously checked it
              if (prev[item.dueId]) {
                next[item.dueId] = {
                  amountToPay: prev[item.dueId]?.amountToPay !== undefined
                    ? Math.min(Number(prev[item.dueId].amountToPay), Number(item.balanceAmount))
                    : item.balanceAmount,
                  fineToPay: item.fineAmount || 0,
                };
              }
            }
          }
        });
      });
      return next;
    });
  }, [visiblePayMonths]);

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
    const val = value === '' ? '' : parseFloat(value);
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
        setPaymentSplits([{ ...paymentSplits[0], amount: newTotal > 0 ? newTotal : '' }]);
      }
      return next;
    });
  };

  // Payment splits management
  const handleAddPaymentMode = () => {
    setPaymentModeError('');

    if (maxTotalPayable <= 0) {
      setPaymentModeError('Please select at least one fee installment/month first.');
      return;
    }

    const currentTotal = paymentSplits.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    if (currentTotal >= maxTotalPayable) {
      setPaymentModeError(
        `Full payable amount (₹${maxTotalPayable.toLocaleString()}) is already covered. Cannot add more payment modes.`
      );
      return;
    }

    const remainingAmount = Math.max(0, maxTotalPayable - currentTotal);
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

    const enteredTotal = nextSplits.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    if (enteredTotal > 0 && enteredTotal <= maxTotalPayable) {
      const allocated = distributeAmountToDues(enteredTotal, activeDueItems);
      setSelectedDues((prev) => {
        const merged = { ...prev };
        Object.keys(allocated).forEach((dueId) => {
          if (merged[dueId]) {
            merged[dueId] = {
              ...merged[dueId],
              amountToPay: allocated[dueId].amountToPay,
              fineToPay: allocated[dueId].fineToPay,
            };
          }
        });
        return merged;
      });
    }
  };

  const handleRemovePaymentMode = (index) => {
    setPaymentModeError('');
    if (paymentSplits.length <= 1) return;
    const next = paymentSplits.filter((_, idx) => idx !== index);
    setPaymentSplits(next);
    const enteredTotal = next.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    if (enteredTotal > 0 && enteredTotal <= maxTotalPayable) {
      const allocated = distributeAmountToDues(enteredTotal, activeDueItems);
      setSelectedDues((prev) => {
        const merged = { ...prev };
        Object.keys(allocated).forEach((dueId) => {
          if (merged[dueId]) {
            merged[dueId] = {
              ...merged[dueId],
              amountToPay: allocated[dueId].amountToPay,
              fineToPay: allocated[dueId].fineToPay,
            };
          }
        });
        return merged;
      });
    }
  };

  const handlePaymentFieldChange = (index, field, value) => {
    if (paymentModeError) setPaymentModeError('');
    const next = [...paymentSplits];
    next[index][field] = value;
    setPaymentSplits(next);

    if (field === 'amount') {
      const enteredTotal = next.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
      if (enteredTotal > 0 && enteredTotal <= maxTotalPayable) {
        const allocated = distributeAmountToDues(enteredTotal, activeDueItems);
        setSelectedDues((prev) => {
          const merged = { ...prev };
          Object.keys(allocated).forEach((dueId) => {
            if (merged[dueId]) {
              merged[dueId] = {
                ...merged[dueId],
                amountToPay: allocated[dueId].amountToPay,
                fineToPay: allocated[dueId].fineToPay,
              };
            }
          });
          return merged;
        });
      }
    }
  };

  // Auto-fill payment amount if single cash mode
  const handleAutoFillPayment = () => {
    if (paymentModeError) setPaymentModeError('');
    if (maxTotalPayable > 0 && paymentSplits.length === 1) {
      setPaymentSplits([{ ...paymentSplits[0], amount: maxTotalPayable }]);
      const allocated = distributeAmountToDues(maxTotalPayable, activeDueItems);
      setSelectedDues((prev) => {
        const merged = { ...prev };
        Object.keys(allocated).forEach((dueId) => {
          if (merged[dueId]) {
            merged[dueId] = {
              ...merged[dueId],
              amountToPay: allocated[dueId].amountToPay,
              fineToPay: allocated[dueId].fineToPay,
            };
          }
        });
        return merged;
      });
    }
  };

  // Auto-sync payment amount for single mode when month selection changes
  useEffect(() => {
    setPaymentModeError('');
    if (visiblePayMonths.length > 0) {
      let fullAmount = 0;
      visiblePayMonths.forEach((m) => {
        m.items.forEach((item) => {
          if (item.balanceAmount > 0 && (!item.isOptional || selectedDues[item.dueId])) {
            fullAmount += (Number(item.balanceAmount || 0) + Number(item.fineAmount || 0));
          }
        });
      });
      setPaymentSplits([{ mode: 1, amount: fullAmount > 0 ? fullAmount : '', transactionRef: '', bankName: '', chequeNo: '', chequeDate: '' }]);
    } else {
      setPaymentSplits([{ mode: 1, amount: '', transactionRef: '', bankName: '', chequeNo: '', chequeDate: '' }]);
    }
  }, [selectedMonthIds, duesList]);

  const handleConfirmCollection = () => {
    setErrorMsg('');
    if (!visiblePayMonths.length) {
      setErrorMsg('Please select at least one fee installment/month to collect.');
      return;
    }

    if (totalPaymentEntered <= 0) {
      setErrorMsg('Please enter a payment amount greater than ₹0.');
      return;
    }

    if (totalPaymentEntered > maxTotalPayable) {
      setErrorMsg(
        `Total payment entered (₹${totalPaymentEntered.toLocaleString()}) cannot exceed total payable fees (₹${maxTotalPayable.toLocaleString()}).`
      );
      return;
    }

    // Allocate payment across active due items in strict FIFO order
    // Check if table sum already matches totalPaymentEntered (customized by cashier); if not, auto-distribute
    const currentTableSum = Object.values(selectedDues).reduce(
      (sum, item) => sum + (Number(item.amountToPay) || 0) + (Number(item.fineToPay) || 0),
      0
    );

    let finalAllocated = selectedDues;
    if (Math.abs(currentTableSum - totalPaymentEntered) > 0.01) {
      finalAllocated = distributeAmountToDues(totalPaymentEntered, activeDueItems);
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
      .filter((p) => Number(p.amount) > 0)
      .map((p) => ({
        mode: Number(p.mode),
        amount: Number(p.amount),
        transactionRef: p.transactionRef?.trim() || null,
        bankName: p.bankName?.trim() || null,
        chequeNo: p.chequeNo?.trim() || null,
        chequeDate: p.chequeDate ? `${p.chequeDate}T00:00:00Z` : null,
      }));

    collectMutation.mutate({
      studentId: Number(selectedStudentId),
      duesToPay,
      payments,
      remarks: remarks.trim() || null,
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}


      {/* Student Search & Info Card */}
      <Card sx={{ mb: 3, boxShadow: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={5}>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                Search & Select Student
              </Typography>
              <TextField
                fullWidth
                size="small"
                label="Search Student"
                placeholder={duesSummary ? `${duesSummary.studentName} (${duesSummary.admissionNo || 'Selected'})` : "Enter Admission No, Student Name or Mobile..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1, fontSize: 20 }} />,
                  endAdornment: (
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      {(isSearching || isLoadingDues) && <CircularProgress size={16} />}
                      {(selectedStudentId || searchTerm) && (
                        <Tooltip title="Clear selection / search">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedStudentId('');
                              setSearchTerm('');
                              setSelectedMonthIds([]);
                              setSelectedDues({});
                              setErrorMsg('');
                              setInfoNotice('');
                              hasInitializedStudentRef.current = null;
                            }}
                          >
                            <ClearIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  ),
                }}
              />

              {searchResults.length > 0 && (
                <Paper sx={{ mt: 1, maxHeight: 200, overflow: 'auto', border: '1px solid #ccc', position: 'absolute', zIndex: 10, width: { xs: '90%', md: 400 }, boxShadow: 4 }}>
                  {searchResults.map((st) => (
                    <Box
                      key={st.id}
                      sx={{
                        p: 1.5,
                        cursor: 'pointer',
                        borderBottom: '1px solid #eee',
                        bgcolor: '#fff',
                        '&:hover': { bgcolor: '#f0f7ff' },
                      }}
                      onClick={() => handleSelectStudent(st)}
                    >
                      <Typography variant="body2" fontWeight={700}>
                        {st.fullName} ({st.admissionNo})
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Class: {st.className} - {st.sectionName} | Guardian: {st.guardianName} ({st.guardianMobile})
                      </Typography>
                    </Box>
                  ))}
                </Paper>
              )}
            </Grid>

            {/* Selected Student Banner */}
            <Grid item xs={12} md={7}>
              {isLoadingDues ? (
                <Paper sx={{ p: 2, bgcolor: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <CircularProgress size={24} />
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700} color="primary.main">
                      Loading Student Fee Profile...
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Fetching outstanding dues, concessions, and installments
                    </Typography>
                  </Box>
                </Paper>
              ) : duesSummary ? (
                <Paper sx={{ p: 2, bgcolor: '#f7fafc', border: '1px solid #90caf9', borderRadius: 2 }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar sx={{ width: 50, height: 50, bgcolor: 'primary.main', fontSize: 22 }}>
                        {duesSummary.studentName ? duesSummary.studentName[0] : 'S'}
                      </Avatar>
                      <Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="subtitle1" fontWeight={700}>
                            {duesSummary.studentName}
                          </Typography>
                          <Chip label={duesSummary.admissionNo} color="primary" size="small" sx={{ fontWeight: 700 }} />
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          Class: <b>{duesSummary.className} - {duesSummary.sectionName}</b> | Roll: <b>{duesSummary.rollNo ? '#' + duesSummary.rollNo : '—'}</b>
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Guardian: <b>{duesSummary.guardianName}</b> ({duesSummary.guardianMobile})
                        </Typography>
                      </Box>
                    </Stack>

                    <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Total Outstanding Dues
                      </Typography>
                      <Typography variant="h6" fontWeight={800} color={duesSummary.totalOutstanding > 0 ? 'error.main' : 'success.main'}>
                        ₹{duesSummary.totalOutstanding.toLocaleString()}
                      </Typography>
                      {duesSummary.totalFine > 0 && (
                        <Typography variant="caption" color="error.main" fontWeight={600} display="block">
                          + ₹{duesSummary.totalFine} Overdue Fine
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                </Paper>
              ) : (
                <Typography variant="body2" color="text.secondary" fontStyle="italic">
                  Please search and select a student above to review pending fee dues and collect payment.
                </Typography>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Dues Grid & Collection Section */}
      {selectedStudentId && duesSummary && (
        <Grid container spacing={3}>
          {/* Left: Dues Selection Grid */}
          <Grid item xs={12} lg={8}>
            <Card sx={{ boxShadow: 2 }}>
              <CardContent sx={{ pb: 1 }}>
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  justifyContent="space-between"
                  alignItems={{ xs: 'flex-start', md: 'center' }}
                  spacing={2}
                  sx={{ mb: 2, pb: 1, borderBottom: '1px solid #f1f5f9' }}
                >
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Typography
                        variant="h6"
                        fontWeight={800}
                        sx={{
                          whiteSpace: 'nowrap',
                          color: '#0f172a',
                          letterSpacing: '-0.01em',
                        }}
                      >
                        Student Fee Dues & Monthly Collection
                      </Typography>
                      <Chip
                        label={`${visiblePayMonths.length} Month(s) Selected`}
                        color={visiblePayMonths.length > 0 ? 'primary' : 'default'}
                        size="small"
                        sx={{ fontWeight: 700, height: 24, fontSize: 11, flexShrink: 0 }}
                      />
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                      Strict Sequential Dues (FIFO): Earlier pending months are cleared before subsequent months
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
                    {paidMonths.length > 0 && (
                      <Button
                        size="small"
                        variant={showPaidMonths ? "contained" : "outlined"}
                        color="success"
                        onClick={() => setShowPaidMonths(!showPaidMonths)}
                        sx={{
                          textTransform: 'none',
                          fontWeight: 700,
                          fontSize: 12,
                          px: 1.75,
                          py: 0.6,
                          whiteSpace: 'nowrap',
                          minWidth: 'auto',
                          borderRadius: 1.5,
                        }}
                      >
                        {showPaidMonths ? `Hide Paid Months (${paidMonths.length})` : `Show Paid Months (${paidMonths.length})`}
                      </Button>
                    )}
                    <Button
                      size="small"
                      variant="outlined"
                      color="secondary"
                      onClick={handleSelectAllMonths}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 700,
                        fontSize: 12,
                        px: 1.75,
                        py: 0.6,
                        whiteSpace: 'nowrap',
                        minWidth: 'auto',
                        borderRadius: 1.5,
                      }}
                    >
                      {selectedMonthIds.length === unpaidMonths.length
                        ? 'Deselect All'
                        : 'Select All Unpaid'}
                    </Button>
                  </Stack>
                </Stack>

                {/* FIFO Informational Notice */}
                {infoNotice && (
                  <Alert severity="info" variant="outlined" onClose={() => setInfoNotice('')} sx={{ mb: 2, borderRadius: 2 }}>
                    {infoNotice}
                  </Alert>
                )}

                {/* Monthly Quick Presets Bar */}
                {duesList.length > 0 && (
                  <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: '#fbfcfd', borderRadius: 2 }}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                      ⚡ QUICK MONTHLY ACTIONS (FIFO):
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1 }}>
                      <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        startIcon={<BoltIcon />}
                        onClick={handleSelectOneMonth}
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                      >
                        Pay Next Unpaid ({unpaidMonths[0]?.installmentName || 'None'})
                      </Button>

                      <Button
                        size="small"
                        variant="outlined"
                        color="primary"
                        startIcon={<DateRangeIcon />}
                        onClick={handleSelectUpToCurrentMonth}
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                      >
                        Pay Up to Current Month
                      </Button>

                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleSelectNextMonths(3)}
                        sx={{ textTransform: 'none' }}
                      >
                        Pay 3 Months (Quarterly)
                      </Button>

                      <Button
                        size="small"
                        variant="outlined"
                        color="secondary"
                        onClick={handleSelectAllMonths}
                        sx={{ textTransform: 'none' }}
                      >
                        {selectedMonthIds.length === unpaidMonths.length
                          ? 'Deselect All'
                          : 'Select All Unpaid'}
                      </Button>

                      {selectedMonthIds.length > 0 && (
                        <Button
                          size="small"
                          variant="text"
                          color="error"
                          onClick={handleClearMonths}
                          sx={{ textTransform: 'none' }}
                        >
                          Clear Selection
                        </Button>
                      )}
                    </Stack>
                  </Paper>
                )}

                {/* 12 Months Interactive Visual Bar */}
                {monthGroups.length > 0 && (
                  <Box sx={{ mb: 2.5 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                      <Typography variant="caption" fontWeight={700} color="text.secondary">
                        📅 ACADEMIC MONTHS (Click a month to toggle selection; earlier unpaid months automatically included):
                      </Typography>
                      {visiblePayMonths.length > 0 && (
                        <Typography variant="caption" fontWeight={700} color="primary.main">
                          ✓ {visiblePayMonths.length} Month(s) Active
                        </Typography>
                      )}
                    </Stack>
                    <Box
                      sx={{
                        display: 'flex',
                        gap: 1.2,
                        overflowX: 'auto',
                        pb: 1.5,
                        pt: 0.5,
                        '&::-webkit-scrollbar': { height: 6 },
                        '&::-webkit-scrollbar-thumb': { bgcolor: '#ccc', borderRadius: 3 },
                      }}
                    >
                      {monthGroups.map((m) => {
                        const isMonthSelected = selectedMonthIds.includes(m.installmentId);

                        return (
                          <Paper
                            key={m.installmentId}
                            variant="outlined"
                            onClick={() => handleToggleMonth(m.installmentId)}
                            sx={{
                              p: 1.2,
                              minWidth: 115,
                              cursor: 'pointer',
                              textAlign: 'center',
                              bgcolor: isMonthSelected
                                ? '#1565c0'
                                : m.isPaid
                                ? '#f8fafc'
                                : '#ffffff',
                              color: isMonthSelected ? '#ffffff' : 'inherit',
                              borderColor: isMonthSelected
                                ? '#0d47a1'
                                : m.isPaid
                                ? '#86efac'
                                : '#90caf9',
                              borderWidth: isMonthSelected ? 2 : 1,
                              borderRadius: 2,
                              boxShadow: isMonthSelected ? '0 4px 12px rgba(21, 101, 192, 0.35)' : 0,
                              transition: 'all 0.15s ease-in-out',
                              '&:hover': {
                                boxShadow: 3,
                                borderColor: isMonthSelected ? '#0d47a1' : 'primary.main',
                              },
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{
                                color: isMonthSelected ? 'rgba(255,255,255,0.85)' : 'text.secondary',
                                display: 'block',
                                fontSize: 10,
                                fontWeight: 600,
                              }}
                            >
                              {dayjs(m.dueDate).format('DD MMM')}
                            </Typography>
                            <Typography
                              variant="body2"
                              fontWeight={700}
                              sx={{ color: isMonthSelected ? '#ffffff' : 'text.primary' }}
                              noWrap
                            >
                              {m.installmentName}
                            </Typography>

                            <Box sx={{ mt: 0.5 }}>
                              {m.isPaid ? (
                                <Chip
                                  icon={<CheckIcon sx={{ fontSize: '13px !important' }} />}
                                  label="PAID"
                                  color="success"
                                  size="small"
                                  sx={{ height: 20, fontSize: 10, fontWeight: 700 }}
                                />
                              ) : isMonthSelected ? (
                                <Chip
                                  icon={<CheckIcon sx={{ fontSize: '13px !important', color: '#1565c0 !important' }} />}
                                  label={`₹${m.totalPayable.toLocaleString()}`}
                                  size="small"
                                  sx={{
                                    height: 20,
                                    fontSize: 10,
                                    fontWeight: 700,
                                    bgcolor: '#ffffff',
                                    color: '#1565c0',
                                  }}
                                />
                              ) : (
                                <Typography variant="caption" fontWeight={700} color="error.main">
                                  ₹{m.totalPayable.toLocaleString()}
                                </Typography>
                              )}
                            </Box>
                          </Paper>
                        );
                      })}
                    </Box>
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
                                <TableCell colSpan={9} sx={{ py: 0.75, px: 2 }}>
                                  <Paper
                                    elevation={0}
                                    sx={{
                                      p: 1.25,
                                      bgcolor: '#ffffff',
                                      border: '1px solid #e2e8f0',
                                      borderRadius: 1.5,
                                    }}
                                  >
                                    {/* Header Row */}
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1, pb: 0.5, borderBottom: '1px solid #f1f5f9' }}>
                                      <Stack direction="row" spacing={1} alignItems="center">
                                        <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: month.isPaid ? '#16a34a' : '#2563eb' }} />
                                        <Typography variant="body2" fontWeight={700} color="text.primary">
                                          Fee Details — {month.installmentName}
                                        </Typography>
                                      </Stack>
                                      <Chip
                                        label={month.isPaid ? "Paid" : month.totalPaid > 0 ? "Partially Paid" : "Unpaid"}
                                        size="small"
                                        color={month.isPaid ? "success" : month.totalPaid > 0 ? "warning" : "default"}
                                        sx={{ height: 18, fontSize: 10, fontWeight: 700 }}
                                      />
                                    </Stack>

                                    {/* Compact 4-Card Metrics */}
                                    <Grid container spacing={1} sx={{ mb: 0.75 }}>
                                      <Grid item xs={6} sm={3}>
                                        <Box sx={{ p: 0.75, px: 1.25, bgcolor: '#f8fafc', borderRadius: 1, border: '1px solid #e2e8f0' }}>
                                          <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ fontSize: 10.5 }}>
                                            Total Fee
                                          </Typography>
                                          <Typography variant="body2" fontWeight={800} color="text.primary" sx={{ fontSize: 13.5 }}>
                                            ₹{month.totalOriginal.toLocaleString()}
                                          </Typography>
                                          {month.totalConcession > 0 && (
                                            <Typography variant="caption" sx={{ color: '#7e22ce', fontWeight: 700, fontSize: 10 }}>
                                              Concession: -₹{month.totalConcession.toLocaleString()}
                                            </Typography>
                                          )}
                                        </Box>
                                      </Grid>

                                      <Grid item xs={6} sm={3}>
                                        <Box sx={{ p: 0.75, px: 1.25, bgcolor: '#f0fdf4', borderRadius: 1, border: '1px solid #bbf7d0' }}>
                                          <Typography variant="caption" sx={{ color: '#166534', fontWeight: 600, fontSize: 10.5 }} display="block">
                                            Paid Amount
                                          </Typography>
                                          <Typography variant="body2" fontWeight={800} sx={{ color: '#16a34a', fontSize: 13.5 }}>
                                            ₹{month.totalPaid.toLocaleString()}
                                          </Typography>
                                        </Box>
                                      </Grid>

                                      <Grid item xs={6} sm={3}>
                                        <Box sx={{ p: 0.75, px: 1.25, bgcolor: '#fef2f2', borderRadius: 1, border: '1px solid #fecaca' }}>
                                          <Typography variant="caption" sx={{ color: '#991b1b', fontWeight: 600, fontSize: 10.5 }} display="block">
                                            Remaining Dues
                                          </Typography>
                                          <Typography variant="body2" fontWeight={800} sx={{ color: '#dc2626', fontSize: 13.5 }}>
                                            ₹{month.totalBalance.toLocaleString()}
                                          </Typography>
                                          {month.totalFine > 0 && (
                                            <Typography variant="caption" sx={{ color: '#dc2626', fontWeight: 700, fontSize: 10 }}>
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
                                            <Box sx={{ p: 0.75, px: 1.25, bgcolor: '#eff6ff', borderRadius: 1, border: '1px solid #bfdbfe' }}>
                                              <Typography variant="caption" sx={{ color: '#1e40af', fontWeight: 600, fontSize: 10.5 }} display="block">
                                                Paying Now
                                              </Typography>
                                              <Typography variant="body2" fontWeight={800} sx={{ color: '#2563eb', fontSize: 13.5 }}>
                                                ₹{monthPayingNow.toLocaleString()}
                                              </Typography>
                                              <Typography variant="caption" sx={{ color: monthBalAfterPay > 0 ? '#b45309' : '#16a34a', fontWeight: 700, fontSize: 10 }}>
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
                                        py: 0.4,
                                        px: 1,
                                        bgcolor: '#f1f5f9',
                                        borderRadius: 1,
                                        fontSize: 11,
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
            <Card sx={{ boxShadow: 2, height: '100%', bgcolor: '#fbfcfd' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Payment Breakdown (FR-5.4)
                </Typography>
                <Divider sx={{ mb: 2 }} />

                {errorMsg && <Alert severity="error" sx={{ mb: 2 }}>{errorMsg}</Alert>}

                {/* Amount Summary with Dues Breakdown */}
                <Paper sx={{ p: 2, mb: 2.5, bgcolor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 2 }}>
                  <Stack spacing={1.2}>
                    {selectedMonthNames.length > 0 && (
                      <Box sx={{ pb: 1, borderBottom: '1px dashed #e2e8f0' }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">
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
                          <Typography variant="body2" fontWeight={700} color="#b45309">
                            Previous Dues (Arrears):
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {previousDuesMonths.map((m) => m.installmentName).join(', ')}
                          </Typography>
                        </Box>
                        <Typography variant="body2" fontWeight={800} color="#b45309">
                          ₹{previousDuesTotal.toLocaleString()}
                        </Typography>
                      </Stack>
                    )}

                    {currentTargetMonth && (
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="body2" fontWeight={600} color="text.secondary">
                            Current Month Fee ({currentTargetMonth.installmentName}):
                          </Typography>
                        </Box>
                        <Typography variant="body2" fontWeight={700}>
                          ₹{currentMonthDueTotal.toLocaleString()}
                        </Typography>
                      </Stack>
                    )}

                    {visiblePayMonths.reduce((s, m) => s + m.totalConcession, 0) > 0 && (
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" sx={{ color: '#7e22ce', fontWeight: 600 }}>Total Concession:</Typography>
                        <Typography variant="body2" fontWeight={700} sx={{ color: '#7e22ce' }}>
                          - ₹{visiblePayMonths.reduce((s, m) => s + m.totalConcession, 0).toLocaleString()}
                        </Typography>
                      </Stack>
                    )}

                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" color="text.secondary">Selected Late Fine:</Typography>
                      <Typography variant="body2" fontWeight={600} color={totalFineSelected > 0 ? "error.main" : "text.secondary"}>
                        {totalFineSelected > 0 ? `+ ₹${totalFineSelected.toLocaleString()}` : '₹0'}
                      </Typography>
                    </Stack>

                    <Divider />

                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle1" fontWeight={800} color="#0f172a">Total Payable:</Typography>
                      <Typography variant="h6" fontWeight={900} color="primary.main">
                        ₹{maxTotalPayable.toLocaleString()}
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

                {/* Multi Mode Payment Rows */}
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                  Payment Modes (Cash, UPI, Card, Cheque)
                </Typography>

                <Stack spacing={2} sx={{ mb: 2 }}>
                  {paymentSplits.map((item, index) => (
                    <Paper key={index} sx={{ p: 1.5, border: '1px solid #e0e0e0', bgcolor: '#fff' }}>
                      <Stack spacing={1.5}>
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
                            <MenuItem value={4}>Cheque (BR-5.4)</MenuItem>
                            <MenuItem value={5}>Bank Transfer</MenuItem>
                          </TextField>

                          <TextField
                            type="number"
                            size="small"
                            label="Amount (₹)"
                            sx={{ flex: 1, ...noSpinnerSx }}
                            value={item.amount}
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
                        Amount exceeds total payable (₹{maxTotalPayable.toLocaleString()}) by ₹{(totalPaymentEntered - maxTotalPayable).toLocaleString()}
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
                    totalPaymentEntered <= 0 ||
                    isOverPayment
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
                    ? 'Amount Exceeds Payable Dues'
                    : totalPaymentEntered <= 0
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

      {/* Printable Dual Fee Receipt Modal (FR-5.4, BR-5.1) */}
      <Dialog
        open={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle className="no-print" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, fontWeight: 800 }}>
          <Box sx={{ width: 140 }} />
          <Typography variant="h6" fontWeight={800}>
            Fee Payment Receipt Slip (Dual Copy)
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={() => setIsEditingHeader(!isEditingHeader)}
            sx={{ textTransform: 'none', fontSize: 12 }}
          >
            {isEditingHeader ? 'Hide School Settings' : 'Edit School Info'}
          </Button>
        </DialogTitle>
        <DialogContent sx={{ p: { xs: 1, sm: 2 }, bgcolor: '#f8fafc' }}>
          {isEditingHeader && printReceiptData && (
            <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: '#ffffff', borderColor: '#3b82f6' }}>
              <Typography variant="subtitle2" fontWeight={700} color="primary" sx={{ mb: 1 }}>
                Edit School Details on Slip (Updates in Real-Time):
              </Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="School Name"
                    value={printReceiptData.schoolName || ''}
                    onChange={(e) => setPrintReceiptData({ ...printReceiptData, schoolName: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Contact Number"
                    value={printReceiptData.contact || ''}
                    onChange={(e) => setPrintReceiptData({ ...printReceiptData, contact: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={8}>
                  <TextField
                    fullWidth
                    size="small"
                    label="School Address"
                    value={printReceiptData.address || ''}
                    onChange={(e) => setPrintReceiptData({ ...printReceiptData, address: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Logo Image URL (Optional)"
                    placeholder="https://... or data:image/..."
                    value={printReceiptData.logoUrl || ''}
                    onChange={(e) => setPrintReceiptData({ ...printReceiptData, logoUrl: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Cashier Signature URL (Optional)"
                    placeholder="https://... or data:image/..."
                    value={printReceiptData.cashierSignatureUrl || ''}
                    onChange={(e) => setPrintReceiptData({ ...printReceiptData, cashierSignatureUrl: e.target.value })}
                  />
                </Grid>
              </Grid>
              <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Button
                  size="small"
                  variant="contained"
                  disabled={headerSaveLoading}
                  onClick={async () => {
                    try {
                      setHeaderSaveLoading(true);
                      await branchApi.updateBranch(activeBranchId || 1, {
                        name: printReceiptData.branchName || 'Main Campus',
                        code: 'MAIN',
                        printHeader: printReceiptData.schoolName,
                        address: printReceiptData.address,
                        phone: printReceiptData.contact,
                        logoUrl: printReceiptData.logoUrl,
                        cashierSignatureUrl: printReceiptData.cashierSignatureUrl
                      });
                      setIsEditingHeader(false);
                    } catch (e) {
                      console.error(e);
                    } finally {
                      setHeaderSaveLoading(false);
                    }
                  }}
                  sx={{ textTransform: 'none' }}
                >
                  Save as Default for All Receipts
                </Button>
              </Box>
            </Paper>
          )}

          {printReceiptData && (
            <Paper
              elevation={2}
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
        </DialogContent>
        <DialogActions className="no-print" sx={{ p: 2, justifyContent: 'space-between', bgcolor: '#f1f5f9' }}>
          <Button onClick={() => setIsReceiptModalOpen(false)} color="inherit">
            Close
          </Button>
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              color="error"
              startIcon={<PdfIcon />}
              onClick={() => exportDualFeeReceiptPdf(printReceiptData)}
              sx={{ fontWeight: 600, textTransform: 'none' }}
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
              sx={{ fontWeight: 700, textTransform: 'none', px: 3 }}
            >
              Print Slip (2 Copies)
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
