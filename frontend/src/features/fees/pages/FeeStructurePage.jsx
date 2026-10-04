import React, { useState, useEffect } from 'react';
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
  Snackbar,
  FormControlLabel,
  Checkbox,
  ButtonGroup
} from '@mui/material';
import {
  AccountBalanceWallet as FeeIcon,
  Add as AddIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  Category as HeadIcon,
  GroupWork as GroupIcon,
  Event as InstallmentIcon,
  Gavel as FineIcon,
  CalendarMonth as CalendarMonthIcon,
  CheckCircle as CheckCircleIcon,
  Autorenew as AutorenewIcon,
  Check as CheckIcon,
  Edit as EditIcon,
  Bolt as BoltIcon,
  Folder as FolderIcon,
  ContentCopy as CopyIcon,
  Whatshot as FireIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import AppDatePicker from '../../../components/common/AppDatePicker';

const ACADEMIC_MONTHS = [
  { index: 1, name: 'April', short: 'Apr' },
  { index: 2, name: 'May', short: 'May' },
  { index: 3, name: 'June', short: 'Jun' },
  { index: 4, name: 'July', short: 'Jul' },
  { index: 5, name: 'August', short: 'Aug' },
  { index: 6, name: 'September', short: 'Sep' },
  { index: 7, name: 'October', short: 'Oct' },
  { index: 8, name: 'November', short: 'Nov' },
  { index: 9, name: 'December', short: 'Dec' },
  { index: 10, name: 'January', short: 'Jan' },
  { index: 11, name: 'February', short: 'Feb' },
  { index: 12, name: 'March', short: 'Mar' },
];
import { feesApi } from '../api';
import { classesApi } from '../../masters/api';
import { usePermission } from '../../../hooks/usePermission';

export default function FeeStructurePage() {
  const queryClient = useQueryClient();
  const { can } = usePermission();

  const [activeTab, setActiveTab] = useState(0);

  // Matrix State
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [matrixData, setMatrixData] = useState([]);
  const [matrixDirty, setMatrixDirty] = useState(false);

  // Modals state
  const [isHeadModalOpen, setIsHeadModalOpen] = useState(false);
  const [headForm, setHeadForm] = useState({ id: null, name: '', code: '', type: 2, isOptional: false, description: '' });

  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: '', description: '' });

  const [isInstModalOpen, setIsInstModalOpen] = useState(false);
  const [instForm, setInstForm] = useState({ name: '', dueDate: dayjs().format('YYYY-MM-DD'), displayOrder: 1 });

  // Snackbar
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Queries
  const { data: classesRes } = useQuery({
    queryKey: ['classes-list'],
    queryFn: () => classesApi.getClasses(),
  });
  const classes = classesRes?.data?.data || [];

  const { data: headsRes } = useQuery({
    queryKey: ['fee-heads'],
    queryFn: () => feesApi.getHeads(),
  });
  const heads = headsRes?.data?.data || [];

  const { data: groupsRes } = useQuery({
    queryKey: ['fee-groups'],
    queryFn: () => feesApi.getGroups(),
  });
  const groups = groupsRes?.data?.data || [];

  const { data: installmentsRes } = useQuery({
    queryKey: ['fee-installments'],
    queryFn: () => feesApi.getInstallments(),
  });
  const installments = installmentsRes?.data?.data || [];

  const { data: fineRulesRes } = useQuery({
    queryKey: ['fee-fine-rules'],
    queryFn: () => feesApi.getFineRules(),
  });
  const fineRules = fineRulesRes?.data?.data || [];

  // Late Fine Policy Form State (Controlled)
  const [fineInstallmentId, setFineInstallmentId] = useState('');
  const [fineType, setFineType] = useState(1); // 1 = FixedAmount, 2 = PerDay
  const [fineAmount, setFineAmount] = useState(100);
  const [fineGraceDays, setFineGraceDays] = useState(7);
  const [applyFineToAll, setApplyFineToAll] = useState(false);
  const [isSavingFineRule, setIsSavingFineRule] = useState(false);

  // Auto-select first installment for fine rule
  useEffect(() => {
    if (installments.length > 0 && !fineInstallmentId) {
      setFineInstallmentId(installments[0].id);
    }
  }, [installments, fineInstallmentId]);

  // When fineInstallmentId changes, populate with existing rule if found
  useEffect(() => {
    if (fineInstallmentId && fineRules.length > 0) {
      const existing = fineRules.find((r) => String(r.installmentId) === String(fineInstallmentId));
      if (existing) {
        setFineType(existing.fineType === 2 || existing.fineType === 'PerDay' ? 2 : 1);
        setFineAmount(existing.amount ?? 100);
        setFineGraceDays(existing.graceDays ?? 7);
      } else {
        setFineType(1);
        setFineAmount(100);
        setFineGraceDays(7);
      }
    }
  }, [fineInstallmentId, fineRules]);

  // Auto-select first class & group
  useEffect(() => {
    if (classes.length && !selectedClassId) setSelectedClassId(classes[0].id);
    if (groups.length && !selectedGroupId) setSelectedGroupId(groups[0].id);
  }, [classes, groups]);

  // Monthly Setup & Month Mapping Matrix State
  const [monthlyClassId, setMonthlyClassId] = useState('');
  const [monthlyGroupId, setMonthlyGroupId] = useState('');
  const [applyToAllClasses, setApplyToAllClasses] = useState(false);
  const [monthlyDueDay, setMonthlyDueDay] = useState(10);
  const [monthlyAutoAssign, setMonthlyAutoAssign] = useState(true);

  // Month Mapping Matrix State (matching media_1790830901883.png & media_1791021200788.png)
  // mappingRates: { [headId]: number | string } - Single fee amount per head
  const [mappingRates, setMappingRates] = useState({});
  // monthMapping: { [monthIndex 1..12]: { [headId]: boolean } } - Checkmark per month
  const [monthMapping, setMonthMapping] = useState({});
  // Matrix layout: 'heads-as-rows' (as requested in media_1791021200788.png) or 'months-as-rows'
  const [matrixLayout, setMatrixLayout] = useState('heads-as-rows');

  // Copy to other classes state
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [targetCopyClasses, setTargetCopyClasses] = useState([]);

  // Query Monthly Setup Status
  const {
    data: monthlyStatusRes,
    isLoading: isLoadingMonthlyStatus,
    refetch: refetchMonthlyStatus,
  } = useQuery({
    queryKey: ['monthly-setup-status'],
    queryFn: () => feesApi.getMonthlySetupStatus(),
  });
  const monthlyStatus = monthlyStatusRes?.data?.data;

  // Auto-select monthlyClassId and monthlyGroupId
  useEffect(() => {
    if (classes.length && !monthlyClassId) setMonthlyClassId(classes[0].id);
    if (groups.length && !monthlyGroupId) setMonthlyGroupId(groups[0].id);
  }, [classes, groups]);

  // Update monthlyDueDay when monthlyStatus loads
  useEffect(() => {
    if (monthlyStatus?.dueDay) {
      setMonthlyDueDay(monthlyStatus.dueDay);
    }
  }, [monthlyStatus]);

  // Query Existing Fee Structure for the selected class & group in Month Mapping
  const {
    data: monthMappingRes,
    isLoading: isLoadingMonthMapping,
    refetch: refetchMonthMapping,
  } = useQuery({
    queryKey: ['fee-month-mapping', monthlyClassId, monthlyGroupId],
    queryFn: async () => {
      if (!monthlyClassId || !monthlyGroupId) return [];
      const res = await feesApi.getStructures(monthlyClassId, monthlyGroupId);
      return res?.data?.data || [];
    },
    enabled: !!monthlyClassId && !!monthlyGroupId,
  });

  // Populate mappingRates and monthMapping when monthMappingRes or heads change
  useEffect(() => {
    if (!heads.length) return;

    const structures = monthMappingRes || [];
    const newRates = {};
    const newMapping = {};

    // Initialize all 12 months with empty map
    for (let m = 1; m <= 12; m++) {
      newMapping[m] = {};
      heads.forEach((h) => {
        newMapping[m][h.id] = false;
      });
    }

    const instList = monthlyStatus?.installments?.length ? monthlyStatus.installments : installments;
    const instIdToOrder = {};
    instList.forEach((inst) => {
      if (inst.displayOrder) {
        instIdToOrder[inst.id] = inst.displayOrder;
      }
    });

    heads.forEach((h) => {
      const row = structures.find((s) => s.feeHeadId === h.id);
      let foundRate = 0;
      let hasCheckedMonth = false;

      if (row && row.installmentAmounts) {
        Object.entries(row.installmentAmounts).forEach(([instIdStr, amt]) => {
          const numAmt = Number(amt) || 0;
          const instId = Number(instIdStr);
          const order = instIdToOrder[instId];
          if (numAmt > 0 && order && order >= 1 && order <= 12) {
            newMapping[order][h.id] = true;
            hasCheckedMonth = true;
            if (!foundRate) foundRate = numAmt;
          }
        });
      }

      if (foundRate > 0) {
        newRates[h.id] = foundRate;
      } else {
        newRates[h.id] = mappingRates[h.id] ?? '';
        // If not checked anywhere, set intelligent defaults
        if (!hasCheckedMonth) {
          if (h.isOptional) {
            // Optional fee (e.g. Picnic Fee): unchecked across all months by default so user can simply check whichever month they want (e.g. August)
            for (let m = 1; m <= 12; m++) {
              newMapping[m][h.id] = false;
            }
          } else if (h.type === 1) {
            // One-time: April default
            newMapping[1][h.id] = true;
          } else {
            // Recurring: all 12 months default
            for (let m = 1; m <= 12; m++) {
              newMapping[m][h.id] = true;
            }
          }
        }
      }
    });

    setMappingRates(newRates);
    setMonthMapping(newMapping);
  }, [monthMappingRes, heads, monthlyClassId, monthlyGroupId, monthlyStatus?.installments, installments]);

  // Monthly Schedule Generator Mutation
  const generateScheduleMutation = useMutation({
    mutationFn: (payload) => feesApi.generateMonthlySchedule(payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['fee-installments']);
      queryClient.invalidateQueries(['monthly-setup-status']);
      queryClient.invalidateQueries(['fee-structure-matrix']);
      queryClient.invalidateQueries(['fee-month-mapping']);
      setSnackbarMsg(res?.data?.message || '12-Month academic schedule generated successfully!');
    },
    onError: (err) => setErrorMsg(err?.response?.data?.message || 'Failed to generate monthly schedule.'),
  });

  // Save Monthly Fee Structure Mutation
  const saveMonthlyStructureMutation = useMutation({
    mutationFn: (payload) => feesApi.saveMonthlyStructure(payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['monthly-setup-status']);
      queryClient.invalidateQueries(['fee-structure-matrix']);
      queryClient.invalidateQueries(['fee-month-mapping']);
      queryClient.invalidateQueries(['fee-installments']);
      queryClient.invalidateQueries(['student-fee-dues']);
      setSnackbarMsg(res?.data?.message || 'Month fee mapping saved & student dues synced successfully!');
    },
    onError: (err) => setErrorMsg(err?.response?.data?.message || 'Failed to save monthly structure.'),
  });

  // Matrix Interactive Handlers
  const handleRateChange = (headId, val) => {
    setMappingRates((prev) => ({
      ...prev,
      [headId]: val,
    }));
  };

  const handleToggleCell = (monthIndex, headId) => {
    setMonthMapping((prev) => {
      const currentVal = Boolean(prev[monthIndex]?.[headId]);
      return {
        ...prev,
        [monthIndex]: {
          ...(prev[monthIndex] || {}),
          [headId]: !currentVal,
        },
      };
    });
  };

  const handleToggleCol = (headId) => {
    setMonthMapping((prev) => {
      const allChecked = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].every(
        (m) => prev[m]?.[headId]
      );
      const targetVal = !allChecked;
      const next = { ...prev };
      for (let m = 1; m <= 12; m++) {
        next[m] = {
          ...(next[m] || {}),
          [headId]: targetVal,
        };
      }
      return next;
    });
  };

  const handleToggleRow = (monthIndex) => {
    setMonthMapping((prev) => {
      const allChecked = heads.length > 0 && heads.every((h) => prev[monthIndex]?.[h.id]);
      const targetVal = !allChecked;
      return {
        ...prev,
        [monthIndex]: {
          ...(prev[monthIndex] || {}),
          ...Object.fromEntries(heads.map((h) => [h.id, targetVal])),
        },
      };
    });
  };

  const handleToggleAllMatrix = () => {
    setMonthMapping((prev) => {
      const allChecked = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].every((m) =>
        heads.every((h) => prev[m]?.[h.id])
      );
      const targetVal = !allChecked;
      const next = {};
      for (let m = 1; m <= 12; m++) {
        next[m] = {};
        heads.forEach((h) => {
          next[m][h.id] = targetVal;
        });
      }
      return next;
    });
  };

  // Calculations: Each Fee Head has a single rate in mappingRates[h.id]
  const getMonthTotal = (monthIndex) => {
    return heads.reduce((sum, h) => {
      if (monthMapping[monthIndex]?.[h.id]) {
        const rate = Number(mappingRates[h.id]) || 0;
        return sum + rate;
      }
      return sum;
    }, 0);
  };

  const getHeadAnnualTotal = (headId) => {
    const rate = Number(mappingRates[headId]) || 0;
    let count = 0;
    for (let m = 1; m <= 12; m++) {
      if (monthMapping[m]?.[headId]) count++;
    }
    return rate * count;
  };

  const grandAnnualTotal = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].reduce(
    (sum, m) => sum + getMonthTotal(m),
    0
  );

  // Save Month Mapping
  const handleSaveMonthMapping = () => {
    if (!monthlyClassId) {
      setErrorMsg('Please select a class.');
      return;
    }
    if (!monthlyGroupId) {
      setErrorMsg('Please select a fee group.');
      return;
    }

    const headsToSave = heads
      .filter((h) => Number(mappingRates[h.id]) > 0)
      .map((h) => {
        const applicableMonths = [];
        for (let m = 1; m <= 12; m++) {
          if (monthMapping[m]?.[h.id]) applicableMonths.push(m);
        }
        const rate = Number(mappingRates[h.id]);
        return {
          feeHeadId: h.id,
          monthlyAmount: rate,
          applicableMonths,
          monthAmounts: Object.fromEntries(applicableMonths.map((m) => [m.toString(), rate])),
        };
      })
      .filter((h) => h.applicableMonths.length > 0);

    if (!headsToSave.length) {
      setErrorMsg('Please enter a fee amount and check at least one month.');
      return;
    }

    const classIds = applyToAllClasses ? classes.map((c) => c.id) : [Number(monthlyClassId)];

    saveMonthlyStructureMutation.mutate({
      classIds,
      feeGroupId: Number(monthlyGroupId),
      heads: headsToSave,
      autoAssignToStudents: monthlyAutoAssign,
    });
  };

  // Copy mapping to other classes
  const handleCopyMappingToClasses = () => {
    if (!targetCopyClasses.length) {
      setErrorMsg('Please select at least one target class to copy to.');
      return;
    }

    const headsToSave = heads
      .filter((h) => Number(mappingRates[h.id]) > 0)
      .map((h) => {
        const applicableMonths = [];
        for (let m = 1; m <= 12; m++) {
          if (monthMapping[m]?.[h.id]) applicableMonths.push(m);
        }
        const rate = Number(mappingRates[h.id]);
        return {
          feeHeadId: h.id,
          monthlyAmount: rate,
          applicableMonths,
          monthAmounts: Object.fromEntries(applicableMonths.map((m) => [m.toString(), rate])),
        };
      })
      .filter((h) => h.applicableMonths.length > 0);

    if (!headsToSave.length) {
      setErrorMsg('Please enter rates and select months before copying.');
      return;
    }

    saveMonthlyStructureMutation.mutate({
      classIds: targetCopyClasses,
      feeGroupId: Number(monthlyGroupId),
      heads: headsToSave,
      autoAssignToStudents: monthlyAutoAssign,
    }, {
      onSuccess: () => {
        setCopyDialogOpen(false);
        setTargetCopyClasses([]);
        setSnackbarMsg(`Mapping copied to ${targetCopyClasses.length} class(es) successfully!`);
      }
    });
  };

  // Fetch Matrix for Class & Group
  const {
    data: matrixRes,
    isLoading: isLoadingMatrix,
    refetch: refetchMatrix,
  } = useQuery({
    queryKey: ['fee-structure-matrix', selectedClassId, selectedGroupId],
    queryFn: async () => {
      if (!selectedClassId || !selectedGroupId) return [];
      const res = await feesApi.getStructures(selectedClassId, selectedGroupId);
      const rows = res?.data?.data || [];
      setMatrixData(rows);
      setMatrixDirty(false);
      return rows;
    },
    enabled: !!selectedClassId && !!selectedGroupId,
  });

  // Mutations
  const createHeadMutation = useMutation({
    mutationFn: (data) => feesApi.createHead(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['fee-heads']);
      queryClient.invalidateQueries(['fee-structure-matrix']);
      queryClient.invalidateQueries(['fee-month-mapping']);
      setIsHeadModalOpen(false);
      setHeadForm({ id: null, name: '', code: '', type: 2, isOptional: false, description: '' });
      setSnackbarMsg('Fee head created successfully.');
    },
    onError: (err) => setErrorMsg(err?.response?.data?.message || 'Failed to create fee head.'),
  });

  const updateHeadMutation = useMutation({
    mutationFn: ({ id, data }) => feesApi.updateHead(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['fee-heads']);
      queryClient.invalidateQueries(['fee-structure-matrix']);
      queryClient.invalidateQueries(['fee-month-mapping']);
      setIsHeadModalOpen(false);
      setHeadForm({ id: null, name: '', code: '', type: 2, isOptional: false, description: '' });
      setSnackbarMsg('Fee head updated successfully.');
    },
    onError: (err) => setErrorMsg(err?.response?.data?.message || 'Failed to update fee head.'),
  });

  const deleteHeadMutation = useMutation({
    mutationFn: (id) => feesApi.deleteHead(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['fee-heads']);
      setSnackbarMsg('Fee head deleted.');
    },
    onError: (err) => setErrorMsg(err?.response?.data?.message || 'Cannot delete fee head.'),
  });

  const createGroupMutation = useMutation({
    mutationFn: (data) => feesApi.createGroup(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['fee-groups']);
      setIsGroupModalOpen(false);
      setGroupForm({ name: '', description: '' });
      setSnackbarMsg('Fee group created successfully.');
    },
    onError: (err) => setErrorMsg(err?.response?.data?.message || 'Failed to create fee group.'),
  });

  const createInstMutation = useMutation({
    mutationFn: (data) => feesApi.createInstallment(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['fee-installments']);
      setIsInstModalOpen(false);
      setInstForm({ name: '', dueDate: dayjs().format('YYYY-MM-DD'), displayOrder: 1 });
      setSnackbarMsg('Installment created successfully.');
    },
    onError: (err) => setErrorMsg(err?.response?.data?.message || 'Failed to create installment.'),
  });

  const saveMatrixMutation = useMutation({
    mutationFn: (payload) => feesApi.saveStructures(payload),
    onSuccess: () => {
      setSnackbarMsg('Fee structure matrix saved successfully!');
      setMatrixDirty(false);
      refetchMatrix();
    },
    onError: (err) => setErrorMsg(err?.response?.data?.message || 'Failed to save fee structure.'),
  });

  const saveFineRuleMutation = useMutation({
    mutationFn: (payload) => feesApi.saveFineRule(payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['fee-fine-rules']);
      setSnackbarMsg('Fine rule saved successfully.');
    },
    onError: (err) => {
      setErrorMsg(err?.response?.data?.message || 'Failed to save fine rule.');
    },
  });

  const handleSaveFineRule = async () => {
    setErrorMsg('');
    if (!fineInstallmentId && !applyFineToAll) {
      setErrorMsg('Please select an installment to configure.');
      return;
    }

    const amt = parseFloat(fineAmount);
    const grace = parseInt(fineGraceDays, 10);

    if (isNaN(amt) || amt < 0) {
      setErrorMsg('Please enter a valid fine amount (0 or greater).');
      return;
    }
    if (isNaN(grace) || grace < 0) {
      setErrorMsg('Please enter valid grace days (0 or greater).');
      return;
    }

    setIsSavingFineRule(true);
    try {
      if (applyFineToAll) {
        for (const inst of installments) {
          await feesApi.saveFineRule({
            installmentId: Number(inst.id),
            fineType: Number(fineType),
            amount: amt,
            graceDays: grace,
          });
        }
        queryClient.invalidateQueries(['fee-fine-rules']);
        setSnackbarMsg(`Late fine policy applied to all ${installments.length} installments successfully!`);
      } else {
        await feesApi.saveFineRule({
          installmentId: Number(fineInstallmentId),
          fineType: Number(fineType),
          amount: amt,
          graceDays: grace,
        });
        queryClient.invalidateQueries(['fee-fine-rules']);
        const instName = installments.find((i) => String(i.id) === String(fineInstallmentId))?.name || 'Selected installment';
        setSnackbarMsg(`Fine rule for '${instName}' saved successfully.`);
      }
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'Failed to save fine rule.');
    } finally {
      setIsSavingFineRule(false);
    }
  };

  // Handlers for Matrix editing
  const handleAmountChange = (headIndex, instId, value) => {
    const val = value === '' ? 0 : parseFloat(value);
    const updated = [...matrixData];
    const row = { ...updated[headIndex] };
    const amounts = { ...row.installmentAmounts, [instId]: val };
    row.installmentAmounts = amounts;
    row.totalAmount = Object.values(amounts).reduce((a, b) => a + Number(b || 0), 0);
    updated[headIndex] = row;
    setMatrixData(updated);
    setMatrixDirty(true);
  };

  const handleSaveMatrix = () => {
    const items = [];
    matrixData.forEach((row) => {
      Object.entries(row.installmentAmounts).forEach(([instId, amt]) => {
        if (Number(amt) > 0) {
          items.push({
            feeHeadId: row.feeHeadId,
            installmentId: Number(instId),
            amount: Number(amt),
          });
        }
      });
    });

    saveMatrixMutation.mutate({
      classId: Number(selectedClassId),
      feeGroupId: Number(selectedGroupId),
      items,
    });
  };

  return (
    <Box sx={{ p: 3 }}>


      {/* Tabs */}
      <Card sx={{ mb: 3, boxShadow: 1 }}>
        <Tabs
          value={activeTab}
          onChange={(e, val) => setActiveTab(val)}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<FolderIcon fontSize="small" sx={{ color: '#d97706' }} />} iconPosition="start" label="Month Mapping" />
          <Tab icon={<FireIcon fontSize="small" color="primary" />} iconPosition="start" label="Structure Matrix" />
          <Tab icon={<HeadIcon fontSize="small" />} iconPosition="start" label={`Fee Heads / Items (${heads.length})`} />
          <Tab icon={<GroupIcon fontSize="small" />} iconPosition="start" label={`Fee Groups (${groups.length})`} />
          <Tab icon={<InstallmentIcon fontSize="small" />} iconPosition="start" label={`Month Types & Schedule (${installments.length})`} />
        </Tabs>
      </Card>

      {/* Tab 0: Monthly Fee Setup */}
      {activeTab === 0 && (
        <Stack spacing={3}>
          {/* Card 1: 12-Month Academic Installment Schedule */}
          <Card sx={{ boxShadow: 2, borderLeft: '4px solid #1976d2' }}>
            <CardContent sx={{ pb: 2 }}>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', md: 'center' }}
                spacing={2}
                sx={{ mb: 2 }}
              >
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CalendarMonthIcon color="primary" />
                    <Typography variant="h6" fontWeight={700}>
                      12-Month Academic Schedule
                    </Typography>
                    {monthlyStatus?.isScheduleReady ? (
                      <Chip
                        icon={<CheckCircleIcon />}
                        label="12 Months Configured"
                        color="success"
                        size="small"
                        sx={{ fontWeight: 700 }}
                      />
                    ) : (
                      <Chip
                        label="Needs Schedule Setup"
                        color="warning"
                        size="small"
                        sx={{ fontWeight: 700 }}
                      />
                    )}
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    Academic Year Session (April to March). Configure default monthly due date for student fee collection.
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1.5} alignItems="center">
                  <TextField
                    size="small"
                    type="number"
                    label="Due Day of Month"
                    sx={{ width: 140 }}
                    inputProps={{ min: 1, max: 28 }}
                    value={monthlyDueDay}
                    onChange={(e) => setMonthlyDueDay(Number(e.target.value))}
                    helperText="e.g. 10th of every month"
                  />
                  {can('FeeStructure', 'Add') && (
                    <Button
                      variant="outlined"
                      color="primary"
                      startIcon={<AutorenewIcon />}
                      loading={generateScheduleMutation.isPending}
                      onClick={() =>
                        generateScheduleMutation.mutate({
                          dueDay: Number(monthlyDueDay) || 10,
                          formatWithYear: true,
                        })
                      }
                      sx={{ height: 40 }}
                    >
                      Generate / Sync 12 Months
                    </Button>
                  )}
                </Stack>
              </Stack>

              {/* 12 Months Timeline Preview Chips */}
              <Box
                sx={{
                  display: 'flex',
                  gap: 1,
                  overflowX: 'auto',
                  pb: 1,
                  pt: 0.5,
                  '&::-webkit-scrollbar': { height: 6 },
                  '&::-webkit-scrollbar-thumb': { bgcolor: '#ccc', borderRadius: 3 },
                }}
              >
                {ACADEMIC_MONTHS.map((m) => {
                  const inst = monthlyStatus?.installments?.find((i) => i.displayOrder === m.index);
                  const isPresent = Boolean(inst);
                  return (
                    <Paper
                      key={m.index}
                      variant="outlined"
                      sx={{
                        p: 1.2,
                        minWidth: 95,
                        textAlign: 'center',
                        bgcolor: isPresent ? '#f0f9ff' : '#fafafa',
                        borderColor: isPresent ? '#90caf9' : '#e0e0e0',
                        borderRadius: 2,
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                        Month #{m.index}
                      </Typography>
                      <Typography variant="body2" fontWeight={700} color={isPresent ? 'primary.main' : 'text.primary'}>
                        {m.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Due: {inst ? dayjs(inst.dueDate).format('DD MMM') : `${monthlyDueDay}th`}
                      </Typography>
                    </Paper>
                  );
                })}
              </Box>
            </CardContent>
          </Card>

          {/* Card 2: Month Mapping Matrix (matching media_1790830901883.png) */}
          <Card sx={{ boxShadow: 3, borderRadius: 2 }}>
            <CardContent sx={{ pb: 3 }}>
              {/* Header Title & Subtitle */}
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', md: 'center' }}
                spacing={2}
                sx={{ mb: 2.5 }}
              >
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <FolderIcon sx={{ color: '#0b63ce', fontSize: 28 }} />
                    <Typography variant="h6" fontWeight={800} color="#0f172a">
                      Month Mapping Matrix
                    </Typography>
                    <Chip
                      label="Session 2026-27"
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ fontWeight: 700, ml: 1 }}
                    />
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Select which fee heads are applicable for each month. Unchecked months will not generate dues for students.
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                  <Button
                    variant="outlined"
                    startIcon={<CopyIcon />}
                    onClick={() => {
                      setTargetCopyClasses([]);
                      setCopyDialogOpen(true);
                    }}
                    sx={{
                      fontWeight: 700,
                      height: 40,
                      textTransform: 'none',
                      borderRadius: 1.5,
                      borderColor: '#94a3b8',
                      color: '#334155',
                      '&:hover': { borderColor: '#0b63ce', bgcolor: '#f0f9ff' },
                    }}
                  >
                    Copy to Other Classes
                  </Button>

                  {can('FeeStructure', 'Edit') && (
                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={handleSaveMonthMapping}
                      loading={saveMonthlyStructureMutation.isPending}
                      sx={{
                        bgcolor: '#0b63ce',
                        '&:hover': { bgcolor: '#094fad' },
                        fontWeight: 700,
                        px: 3,
                        py: 1,
                        height: 40,
                        textTransform: 'none',
                        fontSize: 14,
                        borderRadius: 1.5,
                        boxShadow: '0 2px 6px rgba(11, 99, 206, 0.35)',
                      }}
                    >
                      Save Mapping
                    </Button>
                  )}
                </Stack>
              </Stack>

              {/* Top Controls Bar matching Screenshot: SELECT CLASS dropdown + FEE GROUP + Options */}
              <Paper
                elevation={0}
                variant="outlined"
                sx={{
                  p: 2,
                  mb: 2.5,
                  bgcolor: '#f8fafc',
                  borderRadius: 2,
                  borderColor: '#e2e8f0',
                }}
              >
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography
                      variant="caption"
                      fontWeight={800}
                      color="#475569"
                      sx={{ textTransform: 'uppercase', letterSpacing: 0.6, mb: 0.5, display: 'block' }}
                    >
                      SELECT CLASS
                    </Typography>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      value={monthlyClassId}
                      onChange={(e) => setMonthlyClassId(e.target.value)}
                      disabled={applyToAllClasses}
                      sx={{ bgcolor: '#ffffff' }}
                    >
                      {classes.map((c) => (
                        <MenuItem key={c.id} value={c.id}>
                          {c.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Typography
                      variant="caption"
                      fontWeight={800}
                      color="#475569"
                      sx={{ textTransform: 'uppercase', letterSpacing: 0.6, mb: 0.5, display: 'block' }}
                    >
                      FEE GROUP
                    </Typography>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      value={monthlyGroupId}
                      onChange={(e) => setMonthlyGroupId(e.target.value)}
                      sx={{ bgcolor: '#ffffff' }}
                    >
                      {groups.map((g) => (
                        <MenuItem key={g.id} value={g.id}>
                          {g.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  <Grid item xs={12} sm={12} md={6}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }} sx={{ mt: { xs: 0, md: 2.2 } }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={monthlyAutoAssign}
                            onChange={(e) => setMonthlyAutoAssign(e.target.checked)}
                            color="primary"
                            size="small"
                          />
                        }
                        label={
                          <Typography variant="body2" fontWeight={600} color="#1e293b">
                            Auto-assign & sync dues for students
                          </Typography>
                        }
                      />

                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={applyToAllClasses}
                            onChange={(e) => setApplyToAllClasses(e.target.checked)}
                            color="primary"
                            size="small"
                          />
                        }
                        label={
                          <Typography variant="body2" fontWeight={600} color="#1e293b">
                            Apply to all classes
                          </Typography>
                        }
                      />
                    </Stack>
                  </Grid>
                </Grid>
              </Paper>

              {/* Month Mapping Matrix Table (matching media_1790830901883.png) */}
              {isLoadingMonthMapping ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
                  <CircularProgress size={36} />
                  <Typography variant="body2" sx={{ ml: 2, color: 'text.secondary', fontWeight: 600 }}>
                    Loading Month Mapping Matrix...
                  </Typography>
                </Box>
              ) : heads.length === 0 ? (
                <Alert severity="warning">
                  No Fee Heads configured yet. Please create fee heads (Tuition, Admission, Transport, etc.) in Tab 3 first.
                </Alert>
              ) : (
                <Box>
                  {/* Top Matrix Header Bar with Layout Toggle */}
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    justifyContent="space-between"
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                    spacing={1.5}
                    sx={{ mb: 1.5 }}
                  >
                    <Box>
                      <Typography variant="subtitle2" fontWeight={800} color="#1e293b">
                        {matrixLayout === 'heads-as-rows'
                          ? 'Month-wise Fee Matrix (Fee Types in Rows, Months in Columns)'
                          : 'Month Mapping Matrix (Months in Rows, Fee Heads in Columns)'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {matrixLayout === 'heads-as-rows'
                          ? 'Check/uncheck any fee for any month independently (e.g., in December, only select Examination Fee).'
                          : 'Select months in rows and configure fee heads across columns.'}
                      </Typography>
                    </Box>

                    <ButtonGroup size="small" variant="outlined">
                      <Button
                        variant={matrixLayout === 'heads-as-rows' ? 'contained' : 'outlined'}
                        onClick={() => setMatrixLayout('heads-as-rows')}
                        sx={{
                          fontWeight: 700,
                          textTransform: 'none',
                          fontSize: '12px',
                          bgcolor: matrixLayout === 'heads-as-rows' ? '#0b63ce' : 'inherit',
                        }}
                      >
                        Fee Types in Rows (Default)
                      </Button>
                      <Button
                        variant={matrixLayout === 'months-as-rows' ? 'contained' : 'outlined'}
                        onClick={() => setMatrixLayout('months-as-rows')}
                        sx={{
                          fontWeight: 700,
                          textTransform: 'none',
                          fontSize: '12px',
                          bgcolor: matrixLayout === 'months-as-rows' ? '#0b63ce' : 'inherit',
                        }}
                      >
                        Months in Rows
                      </Button>
                    </ButtonGroup>
                  </Stack>

                  {/* LAYOUT 1: Fee Heads as Rows, Months as Columns (Matching user's uploaded screenshot) */}
                  {matrixLayout === 'heads-as-rows' ? (
                    <TableContainer
                      component={Paper}
                      variant="outlined"
                      sx={{
                        borderRadius: 2,
                        borderColor: '#cbd5e1',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                        overflowX: 'auto',
                      }}
                    >
                      <Table size="small" sx={{ minWidth: 950 }}>
                        {/* Table Header: Royal Blue */}
                        <TableHead sx={{ bgcolor: '#0b63ce' }}>
                          <TableRow>
                            {/* Fee Type / Head Header */}
                            <TableCell
                              sx={{
                                color: '#ffffff',
                                fontWeight: 800,
                                py: 1.5,
                                px: 2,
                                minWidth: 220,
                                borderRight: '1px solid rgba(255,255,255,0.2)',
                              }}
                            >
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Checkbox
                                  size="small"
                                  indeterminate={
                                    ACADEMIC_MONTHS.some((m) => heads.some((h) => monthMapping[m.index]?.[h.id])) &&
                                    !ACADEMIC_MONTHS.every((m) => heads.every((h) => monthMapping[m.index]?.[h.id]))
                                  }
                                  checked={
                                    heads.length > 0 &&
                                    ACADEMIC_MONTHS.every((m) => heads.every((h) => monthMapping[m.index]?.[h.id]))
                                  }
                                  onChange={handleToggleAllMatrix}
                                  sx={{
                                    color: 'rgba(255,255,255,0.85)',
                                    p: 0,
                                    '&.Mui-checked': { color: '#ffffff' },
                                    '&.MuiCheckbox-indeterminate': { color: '#ffffff' },
                                  }}
                                />
                                <Typography variant="subtitle2" fontWeight={800} color="#ffffff">
                                  Fee Type
                                </Typography>
                              </Stack>
                            </TableCell>

                            {/* Amount (Rate) Header */}
                            <TableCell
                              align="center"
                              sx={{
                                color: '#ffffff',
                                fontWeight: 800,
                                py: 1.5,
                                px: 1,
                                minWidth: 100,
                                borderRight: '1px solid rgba(255,255,255,0.2)',
                              }}
                            >
                              <Typography variant="subtitle2" fontWeight={800} color="#ffffff">
                                Amount (₹)
                              </Typography>
                            </TableCell>

                            {/* 12 Academic Months Columns (April .. December .. March) */}
                            {ACADEMIC_MONTHS.map((m) => {
                              const allMonthChecked = heads.length > 0 && heads.every((h) => monthMapping[m.index]?.[h.id]);
                              const someMonthChecked = heads.some((h) => monthMapping[m.index]?.[h.id]);

                              return (
                                <TableCell
                                  key={m.index}
                                  align="center"
                                  sx={{
                                    color: '#ffffff',
                                    py: 1,
                                    px: 0.5,
                                    minWidth: 58,
                                    borderRight: '1px solid rgba(255,255,255,0.2)',
                                  }}
                                >
                                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <Checkbox
                                      size="small"
                                      checked={allMonthChecked}
                                      indeterminate={someMonthChecked && !allMonthChecked}
                                      onChange={() => handleToggleRow(m.index)}
                                      title={`Toggle all fees for ${m.name}`}
                                      sx={{
                                        color: 'rgba(255,255,255,0.85)',
                                        p: 0,
                                        mb: 0.3,
                                        '&.Mui-checked': { color: '#ffffff' },
                                        '&.MuiCheckbox-indeterminate': { color: '#ffffff' },
                                      }}
                                    />
                                    <Typography variant="caption" fontWeight={800} color="#ffffff" sx={{ fontSize: '11px' }}>
                                      {m.short}
                                    </Typography>
                                  </Box>
                                </TableCell>
                              );
                            })}

                            {/* Annual Total Column Header */}
                            <TableCell
                              align="right"
                              sx={{
                                color: '#ffffff',
                                fontWeight: 800,
                                py: 1.5,
                                px: 2,
                                minWidth: 120,
                              }}
                            >
                              <Typography variant="subtitle2" fontWeight={800} color="#ffffff">
                                Annual Total
                              </Typography>
                            </TableCell>
                          </TableRow>
                        </TableHead>

                        {/* Table Body: Each Fee Head is a Row */}
                        <TableBody>
                          {heads.map((h, rIdx) => {
                            const isEven = rIdx % 2 === 0;
                            const allMonthsChecked = ACADEMIC_MONTHS.every((m) => monthMapping[m.index]?.[h.id]);
                            const someMonthsChecked = ACADEMIC_MONTHS.some((m) => monthMapping[m.index]?.[h.id]);
                            const headAnnual = getHeadAnnualTotal(h.id);
                            const checkedCount = ACADEMIC_MONTHS.filter((m) => monthMapping[m.index]?.[h.id]).length;

                            return (
                              <TableRow
                                key={h.id}
                                sx={{
                                  bgcolor: isEven ? '#ffffff' : '#f8fafc',
                                  '&:hover': { bgcolor: '#f1f5f9' },
                                  transition: 'background-color 0.15s ease',
                                }}
                              >
                                {/* Fee Head Name + Row Toggle */}
                                <TableCell sx={{ py: 1, px: 2, borderRight: '1px solid #e2e8f0' }}>
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <Checkbox
                                      size="small"
                                      checked={allMonthsChecked}
                                      indeterminate={someMonthsChecked && !allMonthsChecked}
                                      onChange={() => handleToggleCol(h.id)}
                                      title={`Toggle ${h.name} across all 12 months`}
                                      sx={{ p: 0, color: '#94a3b8' }}
                                    />
                                    <Box>
                                      <Typography variant="body2" fontWeight={700} color="#1e293b">
                                        {h.name}
                                      </Typography>
                                      {h.isOptional && (
                                        <Typography variant="caption" sx={{ color: '#d97706', fontWeight: 700, fontSize: 10 }}>
                                          (Optional)
                                        </Typography>
                                      )}
                                    </Box>
                                  </Stack>
                                </TableCell>

                                {/* Fee Amount (Rate Input) */}
                                <TableCell align="center" sx={{ py: 0.8, px: 1, borderRight: '1px solid #e2e8f0' }}>
                                  <Box
                                    sx={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      bgcolor: '#ffffff',
                                      border: '1px solid #cbd5e1',
                                      borderRadius: '4px',
                                      px: 0.6,
                                      py: 0.2,
                                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                                    }}
                                  >
                                    <Typography variant="caption" sx={{ color: '#0b63ce', fontWeight: 800, mr: 0.3, fontSize: '12px' }}>
                                      ₹
                                    </Typography>
                                    <input
                                      type="number"
                                      min="0"
                                      step="50"
                                      placeholder="0"
                                      value={mappingRates[h.id] ?? ''}
                                      onChange={(e) => handleRateChange(h.id, e.target.value)}
                                      title={`Fee amount for ${h.name}`}
                                      style={{
                                        width: '60px',
                                        border: 'none',
                                        outline: 'none',
                                        fontSize: '12px',
                                        fontWeight: '700',
                                        color: '#1e293b',
                                        background: 'transparent',
                                        textAlign: 'center',
                                      }}
                                    />
                                  </Box>
                                </TableCell>

                                {/* 12 Academic Month Checkboxes */}
                                {ACADEMIC_MONTHS.map((m) => {
                                  const isChecked = Boolean(monthMapping[m.index]?.[h.id]);

                                  return (
                                    <TableCell
                                      key={m.index}
                                      align="center"
                                      onClick={() => handleToggleCell(m.index, h.id)}
                                      sx={{
                                        py: 0.8,
                                        px: 0.5,
                                        borderRight: '1px solid #e2e8f0',
                                        cursor: 'pointer',
                                        userSelect: 'none',
                                        bgcolor: isChecked ? 'rgba(11, 99, 206, 0.08)' : 'inherit',
                                        '&:hover': {
                                          bgcolor: isChecked ? 'rgba(11, 99, 206, 0.16)' : 'rgba(0, 0, 0, 0.04)',
                                        },
                                      }}
                                    >
                                      <Checkbox
                                        size="small"
                                        checked={isChecked}
                                        tabIndex={-1}
                                        disableRipple
                                        sx={{
                                          p: 0.4,
                                          pointerEvents: 'none',
                                          color: '#cbd5e1',
                                          '&.Mui-checked': { color: '#0b63ce' },
                                        }}
                                      />
                                    </TableCell>
                                  );
                                })}

                                {/* Annual Total for this Head */}
                                <TableCell align="right" sx={{ py: 1, px: 2 }}>
                                  <Typography variant="body2" fontWeight={800} color={headAnnual > 0 ? '#0b63ce' : '#94a3b8'}>
                                    ₹{headAnnual.toLocaleString()}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                                    ({checkedCount} mo)
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            );
                          })}

                          {/* Footer Row: Monthly Total for Each Month */}
                          <TableRow sx={{ bgcolor: '#f1f5f9', borderTop: '2px solid #94a3b8' }}>
                            <TableCell colSpan={2} sx={{ py: 1.5, px: 2, borderRight: '1px solid #cbd5e1' }}>
                              <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                                Monthly Total
                              </Typography>
                            </TableCell>

                            {/* Monthly Totals for April .. March */}
                            {ACADEMIC_MONTHS.map((m) => {
                              const rowTotal = getMonthTotal(m.index);
                              return (
                                <TableCell
                                  key={m.index}
                                  align="center"
                                  sx={{
                                    py: 1.5,
                                    px: 0.5,
                                    borderRight: '1px solid #cbd5e1',
                                  }}
                                >
                                  <Typography
                                    variant="body2"
                                    fontWeight={800}
                                    sx={{
                                      color: rowTotal > 0 ? '#0b63ce' : '#94a3b8',
                                      fontSize: '11px',
                                    }}
                                  >
                                    ₹{rowTotal.toLocaleString()}
                                  </Typography>
                                </TableCell>
                              );
                            })}

                            {/* Grand Annual Total */}
                            <TableCell align="right" sx={{ py: 1.5, px: 2 }}>
                              <Typography variant="subtitle1" fontWeight={900} sx={{ color: '#0b63ce', fontSize: '15px' }}>
                                ₹{grandAnnualTotal.toLocaleString()}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    /* LAYOUT 2: Months as Rows, Fee Heads as Columns */
                    <TableContainer
                      component={Paper}
                      variant="outlined"
                      sx={{
                        borderRadius: 2,
                        borderColor: '#cbd5e1',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                        overflowX: 'auto',
                      }}
                    >
                      <Table size="small" sx={{ minWidth: 800 }}>
                        <TableHead sx={{ bgcolor: '#0b63ce' }}>
                          <TableRow>
                            <TableCell
                              sx={{
                                color: '#ffffff',
                                fontWeight: 800,
                                py: 1.5,
                                px: 2,
                                width: 170,
                                borderRight: '1px solid rgba(255,255,255,0.2)',
                              }}
                            >
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Checkbox
                                  size="small"
                                  indeterminate={
                                    ACADEMIC_MONTHS.some((m) => heads.some((h) => monthMapping[m.index]?.[h.id])) &&
                                    !ACADEMIC_MONTHS.every((m) => heads.every((h) => monthMapping[m.index]?.[h.id]))
                                  }
                                  checked={
                                    heads.length > 0 &&
                                    ACADEMIC_MONTHS.every((m) => heads.every((h) => monthMapping[m.index]?.[h.id]))
                                  }
                                  onChange={handleToggleAllMatrix}
                                  sx={{
                                    color: 'rgba(255,255,255,0.85)',
                                    p: 0,
                                    '&.Mui-checked': { color: '#ffffff' },
                                    '&.MuiCheckbox-indeterminate': { color: '#ffffff' },
                                  }}
                                />
                                <Typography variant="subtitle2" fontWeight={800} color="#ffffff">
                                  Month
                                </Typography>
                              </Stack>
                            </TableCell>

                            {heads.map((h) => {
                              const allColChecked = ACADEMIC_MONTHS.every((m) => monthMapping[m.index]?.[h.id]);
                              const someColChecked = ACADEMIC_MONTHS.some((m) => monthMapping[m.index]?.[h.id]);

                              return (
                                <TableCell
                                  key={h.id}
                                  align="center"
                                  sx={{
                                    color: '#ffffff',
                                    py: 1.2,
                                    px: 1.5,
                                    minWidth: 130,
                                    borderRight: '1px solid rgba(255,255,255,0.2)',
                                    verticalAlign: 'top',
                                  }}
                                >
                                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <Checkbox
                                      size="small"
                                      checked={allColChecked}
                                      indeterminate={someColChecked && !allColChecked}
                                      onChange={() => handleToggleCol(h.id)}
                                      sx={{
                                        color: 'rgba(255,255,255,0.85)',
                                        p: 0,
                                        mb: 0.5,
                                        '&.Mui-checked': { color: '#ffffff' },
                                        '&.MuiCheckbox-indeterminate': { color: '#ffffff' },
                                      }}
                                    />
                                    <Typography
                                      variant="body2"
                                      fontWeight={700}
                                      sx={{ color: '#ffffff', lineHeight: 1.2, textAlign: 'center', fontSize: '13px' }}
                                    >
                                      {h.name}
                                    </Typography>
                                    {h.isOptional && (
                                      <Typography
                                        variant="caption"
                                        sx={{ color: '#fef08a', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', mt: 0.2 }}
                                      >
                                        (Optional)
                                      </Typography>
                                    )}

                                    <Box
                                      sx={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        bgcolor: '#ffffff',
                                        borderRadius: '5px',
                                        px: 0.8,
                                        py: 0.2,
                                        mt: 0.6,
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                                      }}
                                    >
                                      <Typography variant="caption" sx={{ color: '#0b63ce', fontWeight: 800, mr: 0.3, fontSize: '13px' }}>
                                        ₹
                                      </Typography>
                                      <input
                                        type="number"
                                        min="0"
                                        step="50"
                                        placeholder="0"
                                        value={mappingRates[h.id] ?? ''}
                                        onChange={(e) => handleRateChange(h.id, e.target.value)}
                                        title={`Set rate for ${h.name}`}
                                        style={{
                                          width: '65px',
                                          border: 'none',
                                          outline: 'none',
                                          fontSize: '13px',
                                          fontWeight: '700',
                                          color: '#1e293b',
                                          background: 'transparent',
                                          textAlign: 'center',
                                        }}
                                      />
                                    </Box>
                                  </Box>
                                </TableCell>
                              );
                            })}

                            <TableCell
                              align="right"
                              sx={{
                                color: '#ffffff',
                                fontWeight: 800,
                                py: 1.5,
                                px: 2,
                                width: 140,
                              }}
                            >
                              <Typography variant="subtitle2" fontWeight={800} color="#ffffff">
                                Monthly Total
                              </Typography>
                            </TableCell>
                          </TableRow>
                        </TableHead>

                        <TableBody>
                          {ACADEMIC_MONTHS.map((m, rowIdx) => {
                            const rowTotal = getMonthTotal(m.index);
                            const isEven = rowIdx % 2 === 0;
                            const allRowChecked = heads.length > 0 && heads.every((h) => monthMapping[m.index]?.[h.id]);
                            const someRowChecked = heads.some((h) => monthMapping[m.index]?.[h.id]);

                            return (
                              <TableRow
                                key={m.index}
                                sx={{
                                  bgcolor: isEven ? '#ffffff' : '#f8fafc',
                                  '&:hover': { bgcolor: '#f1f5f9' },
                                  transition: 'background-color 0.15s ease',
                                }}
                              >
                                <TableCell sx={{ py: 1, px: 2, borderRight: '1px solid #e2e8f0' }}>
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <Checkbox
                                      size="small"
                                      checked={allRowChecked}
                                      indeterminate={someRowChecked && !allRowChecked}
                                      onChange={() => handleToggleRow(m.index)}
                                      sx={{ p: 0, color: '#94a3b8' }}
                                    />
                                    <Typography variant="body2" fontWeight={700} color="#1e293b">
                                      {m.name}
                                    </Typography>
                                  </Stack>
                                </TableCell>

                                {heads.map((h) => {
                                  const isChecked = Boolean(monthMapping[m.index]?.[h.id]);

                                  return (
                                    <TableCell
                                      key={h.id}
                                      align="center"
                                      onClick={() => handleToggleCell(m.index, h.id)}
                                      sx={{
                                        py: 0.8,
                                        px: 1,
                                        borderRight: '1px solid #e2e8f0',
                                        cursor: 'pointer',
                                        userSelect: 'none',
                                        bgcolor: isChecked ? 'rgba(11, 99, 206, 0.08)' : 'inherit',
                                        '&:hover': {
                                          bgcolor: isChecked ? 'rgba(11, 99, 206, 0.16)' : 'rgba(0, 0, 0, 0.04)',
                                        },
                                      }}
                                    >
                                      <Checkbox
                                        size="small"
                                        checked={isChecked}
                                        tabIndex={-1}
                                        disableRipple
                                        sx={{
                                          p: 0.5,
                                          pointerEvents: 'none',
                                          color: '#cbd5e1',
                                          '&.Mui-checked': { color: '#0b63ce' },
                                        }}
                                      />
                                    </TableCell>
                                  );
                                })}

                                <TableCell
                                  align="right"
                                  sx={{
                                    py: 1,
                                    px: 2,
                                    fontWeight: 800,
                                  }}
                                >
                                  <Typography
                                    variant="body2"
                                    fontWeight={800}
                                    sx={{
                                      color: rowTotal > 0 ? '#0b63ce' : '#94a3b8',
                                      fontSize: '14px',
                                    }}
                                  >
                                    ₹{rowTotal.toLocaleString()}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            );
                          })}

                          <TableRow
                            sx={{
                              bgcolor: '#f1f5f9',
                              borderTop: '2px solid #94a3b8',
                            }}
                          >
                            <TableCell sx={{ py: 1.5, px: 2, borderRight: '1px solid #cbd5e1' }}>
                              <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                                Annual Total
                              </Typography>
                            </TableCell>

                            {heads.map((h) => {
                              const annualTotal = getHeadAnnualTotal(h.id);
                              return (
                                <TableCell
                                  key={h.id}
                                  align="center"
                                  sx={{
                                    py: 1.5,
                                    px: 1,
                                    borderRight: '1px solid #cbd5e1',
                                  }}
                                >
                                  <Typography variant="body2" fontWeight={800} color="#0b63ce">
                                    ₹{annualTotal.toLocaleString()}
                                  </Typography>
                                </TableCell>
                              );
                            })}

                            <TableCell align="right" sx={{ py: 1.5, px: 2 }}>
                              <Typography
                                variant="subtitle1"
                                fontWeight={900}
                                sx={{ color: '#0b63ce', fontSize: '15px' }}
                              >
                                ₹{grandAnnualTotal.toLocaleString()}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>
              )}

              {/* Bottom Quick Action Bar */}
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                spacing={2}
                sx={{ pt: 2.5 }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <CheckCircleIcon color="success" fontSize="small" />
                  <Typography variant="body2" color="text.secondary">
                    Total annual fee for this class: <b>₹{grandAnnualTotal.toLocaleString()}</b> across 12 academic months.
                  </Typography>
                </Stack>

                {can('FeeStructure', 'Edit') && (
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSaveMonthMapping}
                    loading={saveMonthlyStructureMutation.isPending}
                    sx={{
                      bgcolor: '#0b63ce',
                      '&:hover': { bgcolor: '#094fad' },
                      fontWeight: 700,
                      px: 3,
                      height: 42,
                      textTransform: 'none',
                      fontSize: 14,
                      borderRadius: 1.5,
                      boxShadow: '0 2px 6px rgba(11, 99, 206, 0.35)',
                    }}
                  >
                    Save Mapping & Sync Student Dues
                  </Button>
                )}
              </Stack>
            </CardContent>
          </Card>

          {/* Copy Mapping Dialog */}
          <Dialog
            open={copyDialogOpen}
            onClose={() => setCopyDialogOpen(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle sx={{ fontWeight: 800, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              Copy Month Mapping to Other Classes
            </DialogTitle>
            <DialogContent sx={{ pt: 2.5 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Copy the active fee rates and monthly mapping from <b>{classes.find((c) => c.id === Number(monthlyClassId))?.name || 'Current Class'}</b> to the selected target classes:
              </Typography>

              {/* Select All Checkbox */}
              <FormControlLabel
                control={
                  <Checkbox
                    checked={
                      targetCopyClasses.length > 0 &&
                      targetCopyClasses.length === classes.filter((c) => c.id !== Number(monthlyClassId)).length
                    }
                    indeterminate={
                      targetCopyClasses.length > 0 &&
                      targetCopyClasses.length < classes.filter((c) => c.id !== Number(monthlyClassId)).length
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        setTargetCopyClasses(
                          classes.filter((c) => c.id !== Number(monthlyClassId)).map((c) => c.id)
                        );
                      } else {
                        setTargetCopyClasses([]);
                      }
                    }}
                    color="primary"
                  />
                }
                label={<b>Select All Other Classes</b>}
                sx={{ mb: 1, display: 'block' }}
              />
              <Divider sx={{ mb: 1.5 }} />

              {/* Classes Checkboxes Grid */}
              <Grid container spacing={1}>
                {classes
                  .filter((c) => c.id !== Number(monthlyClassId))
                  .map((c) => {
                    const isChecked = targetCopyClasses.includes(c.id);
                    return (
                      <Grid item xs={12} sm={6} key={c.id}>
                        <Paper
                          variant="outlined"
                          sx={{
                            p: 1,
                            cursor: 'pointer',
                            bgcolor: isChecked ? '#f0f9ff' : '#ffffff',
                            borderColor: isChecked ? '#0b63ce' : '#e2e8f0',
                            borderRadius: 1.5,
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          onClick={() => {
                            setTargetCopyClasses((prev) =>
                              prev.includes(c.id) ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                            );
                          }}
                        >
                          <Checkbox
                            size="small"
                            checked={isChecked}
                            onChange={() => {}}
                            sx={{ p: 0.5, mr: 1, color: '#94a3b8' }}
                          />
                          <Typography variant="body2" fontWeight={600}>
                            {c.name}
                          </Typography>
                        </Paper>
                      </Grid>
                    );
                  })}
              </Grid>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
              <Button
                variant="outlined"
                onClick={() => setCopyDialogOpen(false)}
                sx={{ textTransform: 'none' }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleCopyMappingToClasses}
                loading={saveMonthlyStructureMutation.isPending}
                disabled={targetCopyClasses.length === 0}
                sx={{
                  bgcolor: '#0b63ce',
                  '&:hover': { bgcolor: '#094fad' },
                  fontWeight: 700,
                  textTransform: 'none',
                }}
              >
                Copy & Save to {targetCopyClasses.length} Class(es)
              </Button>
            </DialogActions>
          </Dialog>

          {/* Card 3: Class Monthly Setup Status Overview */}
          <Card sx={{ boxShadow: 1 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Class-wise Monthly Fee Status Overview
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Current fee configuration and student dues status across all classes for this academic year.
              </Typography>

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#f4f6f8' }}>
                    <TableRow>
                      <TableCell><b>Class</b></TableCell>
                      <TableCell><b>Fee Group</b></TableCell>
                      <TableCell align="right"><b>Monthly Fee (₹)</b></TableCell>
                      <TableCell align="right"><b>Annual Total (₹)</b></TableCell>
                      <TableCell align="center"><b>Enrolled Students</b></TableCell>
                      <TableCell align="center"><b>Monthly Dues Status</b></TableCell>
                      <TableCell align="right"><b>Quick Action</b></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {monthlyStatus?.configuredClasses?.map((item) => (
                      <TableRow key={item.classId} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={700}>
                            {item.className}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={item.feeGroupName}
                            size="small"
                            color={item.feeGroupId > 0 ? 'primary' : 'default'}
                            variant={item.feeGroupId > 0 ? 'filled' : 'outlined'}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={700} color="success.main">
                            ₹{item.monthlyTotal.toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={600}>
                            ₹{item.annualTotal.toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip label={`${item.studentCount} Students`} size="small" />
                        </TableCell>
                        <TableCell align="center">
                          {item.studentsAssignedCount > 0 ? (
                            <Chip
                              icon={<CheckIcon />}
                              label={`${item.studentsAssignedCount}/${item.studentCount} Assigned`}
                              color="success"
                              size="small"
                              variant="outlined"
                            />
                          ) : (
                            <Chip
                              label="Not Assigned"
                              color="warning"
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<EditIcon />}
                            onClick={() => {
                              setMonthlyClassId(item.classId);
                              if (item.feeGroupId > 0) setMonthlyGroupId(item.feeGroupId);
                              window.scrollTo({ top: 200, behavior: 'smooth' });
                            }}
                          >
                            Configure
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Stack>
      )}

      {/* Tab 1: Fee Structure Matrix */}
      {activeTab === 1 && (
        <Card sx={{ boxShadow: 2 }}>
          <CardContent sx={{ pb: 2 }}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', md: 'center' }}
              spacing={2}
              sx={{ mb: 2.5 }}
            >
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                <TextField
                  select
                  size="small"
                  label="Class"
                  sx={{ width: 180 }}
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                >
                  {classes.map((c) => (
                    <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  size="small"
                  label="Fee Group"
                  sx={{ width: 220 }}
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                >
                  {groups.map((g) => (
                    <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
                  ))}
                </TextField>

                <Typography variant="caption" color="text.secondary">
                  Rule BR-5.3: Once fee collection begins for a class, its fee structure cannot be modified.
                </Typography>
              </Stack>

              {can('FeeStructure', 'Edit') && (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveMatrix}
                  disabled={!matrixDirty}
                  loading={saveMatrixMutation.isPending}
                >
                  Save Fee Matrix
                </Button>
              )}
            </Stack>

            {isLoadingMatrix ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : matrixData.length > 0 ? (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#f4f6f8' }}>
                    <TableRow>
                      <TableCell width={200}><b>Fee Head</b></TableCell>
                      <TableCell width={110}><b>Type</b></TableCell>
                      {installments.map((inst) => (
                        <TableCell key={inst.id} align="center" width={140}>
                          <b>{inst.name}</b>
                          <Typography variant="caption" display="block" color="text.secondary">
                            Due: {dayjs(inst.dueDate).format('DD MMM')}
                          </Typography>
                        </TableCell>
                      ))}
                      <TableCell align="right" width={140}><b>Total (₹)</b></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {matrixData.map((row, headIdx) => (
                      <TableRow key={row.feeHeadId} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {row.feeHeadName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Code: {row.feeHeadCode}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={row.type === 1 ? 'One-Time' : row.type === 2 ? 'Recurring' : 'Refundable'}
                            size="small"
                            variant="outlined"
                            color={row.type === 1 ? 'secondary' : 'default'}
                          />
                        </TableCell>
                        {installments.map((inst) => {
                          const amt = row.installmentAmounts[inst.id] ?? 0;
                          return (
                            <TableCell key={inst.id} align="center">
                              <TextField
                                type="number"
                                size="small"
                                sx={{ width: 110 }}
                                value={amt === 0 ? '' : amt}
                                placeholder="0"
                                inputProps={{ min: 0, step: '50' }}
                                onChange={(e) => handleAmountChange(headIdx, inst.id, e.target.value)}
                              />
                            </TableCell>
                          );
                        })}
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={700} color="primary.main">
                            ₹{row.totalAmount.toLocaleString()}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Grand Total Row */}
                    <TableRow sx={{ bgcolor: '#fafafa', borderTop: '2px solid #ccc' }}>
                      <TableCell colSpan={2}>
                        <Typography variant="subtitle2" fontWeight={800}>
                          GRAND TOTAL PER STUDENT (₹)
                        </Typography>
                      </TableCell>
                      {installments.map((inst) => {
                        const colTotal = matrixData.reduce((sum, r) => sum + (Number(r.installmentAmounts[inst.id]) || 0), 0);
                        return (
                          <TableCell key={inst.id} align="center">
                            <Typography variant="body2" fontWeight={700}>
                              ₹{colTotal.toLocaleString()}
                            </Typography>
                          </TableCell>
                        );
                      })}
                      <TableCell align="right">
                        <Typography variant="subtitle2" fontWeight={800} color="success.main">
                          ₹{matrixData.reduce((sum, r) => sum + r.totalAmount, 0).toLocaleString()}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="info" variant="outlined">
                No fee heads or installments configured yet. Please configure Fee Heads and Installments in the tabs above first.
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 2: Fee Heads Master */}
      {activeTab === 2 && (
        <Card sx={{ boxShadow: 2 }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h6" fontWeight={700}>
                Fee Heads Master
              </Typography>
              {can('FeeStructure', 'Add') && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setIsHeadModalOpen(true)}
                >
                  Add Fee Head
                </Button>
              )}
            </Stack>

            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead sx={{ bgcolor: '#f4f6f8' }}>
                  <TableRow>
                    <TableCell width={120}><b>Code</b></TableCell>
                    <TableCell><b>Name</b></TableCell>
                    <TableCell width={140}><b>Type</b></TableCell>
                    <TableCell width={140}><b>Nature</b></TableCell>
                    <TableCell><b>Description</b></TableCell>
                    <TableCell width={100} align="right"><b>Actions</b></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {heads.map((h) => (
                    <TableRow key={h.id} hover>
                      <TableCell>
                        <Chip label={h.code} size="small" color="primary" />
                      </TableCell>
                      <TableCell><b>{h.name}</b></TableCell>
                      <TableCell>
                        <Chip
                          label={h.type === 1 ? 'One-Time' : h.type === 2 ? 'Recurring' : 'Refundable'}
                          size="small"
                          color={h.type === 1 ? 'secondary' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        {h.isOptional ? (
                          <Chip
                            label="Optional"
                            size="small"
                            color="secondary"
                            sx={{ fontWeight: 700 }}
                          />
                        ) : (
                          <Chip
                            label="Mandatory"
                            size="small"
                            color="default"
                            variant="outlined"
                            sx={{ fontWeight: 600 }}
                          />
                        )}
                      </TableCell>
                      <TableCell>{h.description || '—'}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          {can('FeeStructure', 'Edit') && (
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => {
                                setHeadForm({
                                  id: h.id,
                                  name: h.name,
                                  code: h.code,
                                  type: h.type,
                                  isOptional: Boolean(h.isOptional),
                                  description: h.description || '',
                                });
                                setIsHeadModalOpen(true);
                              }}
                              title="Edit Fee Head"
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          )}
                          {can('FeeStructure', 'Delete') && (
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => deleteHeadMutation.mutate(h.id)}
                              title="Delete Fee Head"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Fee Groups Master */}
      {activeTab === 3 && (
        <Card sx={{ boxShadow: 2 }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h6" fontWeight={700}>
                Fee Groups (Categories)
              </Typography>
              {can('FeeStructure', 'Add') && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setIsGroupModalOpen(true)}
                >
                  Add Fee Group
                </Button>
              )}
            </Stack>

            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead sx={{ bgcolor: '#f4f6f8' }}>
                  <TableRow>
                    <TableCell width={80}><b>#</b></TableCell>
                    <TableCell width={250}><b>Group Name</b></TableCell>
                    <TableCell><b>Description</b></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {groups.map((g, idx) => (
                    <TableRow key={g.id}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700}>
                          {g.name}
                        </Typography>
                      </TableCell>
                      <TableCell>{g.description || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Tab 4: Installments & Fine Rules */}
      {activeTab === 4 && (
        <Stack spacing={3}>
          {/* Installments */}
          <Card sx={{ boxShadow: 2 }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    Installment Schedules
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Due dates for quarterly, monthly, or customized fee collection
                  </Typography>
                </Box>
                {can('FeeStructure', 'Add') && (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setIsInstModalOpen(true)}
                  >
                    Add Installment
                  </Button>
                )}
              </Stack>

              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead sx={{ bgcolor: '#f4f6f8' }}>
                    <TableRow>
                      <TableCell width={80}><b>Order</b></TableCell>
                      <TableCell width={200}><b>Installment Name</b></TableCell>
                      <TableCell width={160}><b>Due Date</b></TableCell>
                      <TableCell><b>Late Fine Policy</b></TableCell>
                      <TableCell width={110} align="center"><b>Action</b></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {installments.map((inst) => {
                      const rule = fineRules.find((r) => String(r.installmentId) === String(inst.id));
                      return (
                        <TableRow key={inst.id} hover>
                          <TableCell>#{inst.displayOrder}</TableCell>
                          <TableCell><b>{inst.name}</b></TableCell>
                          <TableCell>{dayjs(inst.dueDate).format('DD MMMM YYYY')}</TableCell>
                          <TableCell>
                            {rule ? (
                              <Chip
                                label={`₹${rule.amount} ${rule.fineType === 1 || rule.fineType === 'FixedAmount' ? 'Fixed' : 'Per Day'} (Grace: ${rule.graceDays} days)`}
                                color="warning"
                                size="small"
                                sx={{ fontWeight: 600 }}
                              />
                            ) : (
                              <Typography variant="caption" color="text.secondary">No fine rule</Typography>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => {
                                setFineInstallmentId(inst.id);
                                setApplyFineToAll(false);
                                if (rule) {
                                  setFineType(rule.fineType === 2 || rule.fineType === 'PerDay' ? 2 : 1);
                                  setFineAmount(rule.amount ?? 100);
                                  setFineGraceDays(rule.graceDays ?? 7);
                                }
                              }}
                              sx={{ textTransform: 'none', py: 0.2, px: 1, fontSize: 11 }}
                            >
                              Configure
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          {/* Configure Fine Rule */}
          <Card sx={{ boxShadow: 1, bgcolor: '#fbfcfd', borderRadius: 2, border: '1px solid #e2e8f0' }}>
            <CardContent>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} sx={{ mb: 2 }}>
                <Box>
                  <Typography variant="h6" fontWeight={700} color="primary">
                    Configure Late Fine Policy (FR-5.6)
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Set automatic late fine (fixed amount or per-day rate) applicable after grace period
                  </Typography>
                </Box>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={applyFineToAll}
                      onChange={(e) => setApplyFineToAll(e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Typography variant="body2" fontWeight={700} color="#0f172a">
                      Apply to All {installments.length} Installments
                    </Typography>
                  }
                />
              </Stack>

              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={3}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Installment"
                    value={fineInstallmentId}
                    onChange={(e) => setFineInstallmentId(e.target.value)}
                    disabled={applyFineToAll}
                  >
                    {installments.map((i) => (
                      <MenuItem key={i.id} value={i.id}>{i.name}</MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={3}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Fine Calculation Type"
                    value={fineType}
                    onChange={(e) => setFineType(Number(e.target.value))}
                  >
                    <MenuItem value={1}>Fixed Amount (One-time)</MenuItem>
                    <MenuItem value={2}>Per Day Late (Daily Rate)</MenuItem>
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={2.5}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Fine Amount (₹)"
                    value={fineAmount}
                    onChange={(e) => setFineAmount(e.target.value)}
                    inputProps={{ min: 0 }}
                  />
                </Grid>

                <Grid item xs={12} sm={2}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Grace Days"
                    value={fineGraceDays}
                    onChange={(e) => setFineGraceDays(e.target.value)}
                    inputProps={{ min: 0 }}
                  />
                </Grid>

                <Grid item xs={12} sm={1.5}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="secondary"
                    onClick={handleSaveFineRule}
                    disabled={isSavingFineRule}
                    sx={{ textTransform: 'none', fontWeight: 700, py: 0.9 }}
                  >
                    {isSavingFineRule ? <CircularProgress size={22} color="inherit" /> : 'Save Rule'}
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Stack>
      )}

      {/* Add / Edit Fee Head Modal */}
      <Dialog open={isHeadModalOpen} onClose={() => setIsHeadModalOpen(false)} maxWidth="xs" fullWidth>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (headForm.id) {
              updateHeadMutation.mutate({ id: headForm.id, data: headForm });
            } else {
              createHeadMutation.mutate(headForm);
            }
          }}
        >
          <DialogTitle sx={{ fontWeight: 700 }}>
            {headForm.id ? 'Edit Fee Head' : 'Add New Fee Head'}
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <TextField
                fullWidth
                size="small"
                required
                label="Fee Head Name"
                placeholder="e.g. Tuition Fee, Picnic Fee, Exam Fee"
                value={headForm.name}
                onChange={(e) => setHeadForm({ ...headForm, name: e.target.value })}
              />
              <TextField
                fullWidth
                size="small"
                required
                label="Code"
                placeholder="e.g. TUITION, PICNIC, EXAM"
                value={headForm.code}
                onChange={(e) => setHeadForm({ ...headForm, code: e.target.value })}
              />
              <TextField
                select
                fullWidth
                size="small"
                label="Head Type"
                value={headForm.type}
                onChange={(e) => setHeadForm({ ...headForm, type: Number(e.target.value) })}
              >
                <MenuItem value={1}>One-Time</MenuItem>
                <MenuItem value={2}>Recurring</MenuItem>
                <MenuItem value={3}>Refundable</MenuItem>
              </TextField>

              {/* Is Optional Checkbox Control */}
              <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 1.5 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={Boolean(headForm.isOptional)}
                      onChange={(e) => setHeadForm({ ...headForm, isOptional: e.target.checked })}
                      color="secondary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={700} color={headForm.isOptional ? 'secondary.main' : 'text.primary'}>
                        Optional Fee
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        For non-mandatory items like Picnic, Activity, Tour, etc. (Can be selected or unselected during fee collection)
                      </Typography>
                    </Box>
                  }
                />
              </Paper>

              <TextField
                fullWidth
                size="small"
                label="Description"
                value={headForm.description}
                onChange={(e) => setHeadForm({ ...headForm, description: e.target.value })}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setIsHeadModalOpen(false)}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              loading={createHeadMutation.isPending || updateHeadMutation.isPending}
            >
              {headForm.id ? 'Save Changes' : 'Create Head'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Add Fee Group Modal */}
      <Dialog open={isGroupModalOpen} onClose={() => setIsGroupModalOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={(e) => { e.preventDefault(); createGroupMutation.mutate(groupForm); }}>
          <DialogTitle sx={{ fontWeight: 700 }}>Add Fee Group</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <TextField
                fullWidth
                size="small"
                required
                label="Group Name"
                placeholder="e.g. Regular Student, Staff Ward, RTE"
                value={groupForm.name}
                onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
              />
              <TextField
                fullWidth
                size="small"
                label="Description"
                value={groupForm.description}
                onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setIsGroupModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" loading={createGroupMutation.isPending}>
              Create Group
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Add Installment Modal */}
      <Dialog open={isInstModalOpen} onClose={() => setIsInstModalOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={(e) => { e.preventDefault(); createInstMutation.mutate(instForm); }}>
          <DialogTitle sx={{ fontWeight: 700 }}>Add Installment Schedule</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <TextField
                fullWidth
                size="small"
                required
                label="Installment Name"
                placeholder="e.g. Quarter 1 (April), Term 1..."
                value={instForm.name}
                onChange={(e) => setInstForm({ ...instForm, name: e.target.value })}
              />
              <AppDatePicker
                required
                label="Due Date"
                value={instForm.dueDate}
                onChange={(e) => setInstForm({ ...instForm, dueDate: e.value })}
              />
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Display Order"
                value={instForm.displayOrder}
                onChange={(e) => setInstForm({ ...instForm, displayOrder: Number(e.target.value) })}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setIsInstModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" loading={createInstMutation.isPending}>
              Create Installment
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Snackbar feedback */}
      <Snackbar
        open={Boolean(snackbarMsg)}
        autoHideDuration={3000}
        onClose={() => setSnackbarMsg('')}
        message={snackbarMsg}
      />
      {errorMsg && (
        <Snackbar
          open={Boolean(errorMsg)}
          autoHideDuration={4000}
          onClose={() => setErrorMsg('')}
          message={errorMsg}
        />
      )}
    </Box>
  );
}
