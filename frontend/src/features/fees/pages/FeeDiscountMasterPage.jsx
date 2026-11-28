import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  MenuItem,
  Chip,
  Grid,
  CircularProgress,
  Switch,
  InputAdornment,
  Card,
  CardContent,
  Stack,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Savings as DiscountIcon,
  Save as SaveIcon,
  Edit as EditIcon,
  TableChart as ExcelIcon,
  PictureAsPdf as PdfIcon,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { userApi, roleApi } from '../../auth/api';
import { useUiStore } from '../../../store/uiStore';
import { usePermission } from '../../../hooks/usePermission';

export const FeeDiscountMasterPage = () => {
  const { showSnackbar } = useUiStore();
  const { isSuperAdmin } = usePermission();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingUserId, setSavingUserId] = useState(null);
  const [roles, setRoles] = useState([]);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'enabled' | 'disabled'

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Local draft state for editing per row:
  // { [userId]: { canGiveDiscount: boolean, limitInput: string } }
  const [rowEdits, setRowEdits] = useState({});

  // Quick Edit Modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUserForModal, setSelectedUserForModal] = useState(null);
  const [modalCanGiveDiscount, setModalCanGiveDiscount] = useState(false);
  const [modalLimitInput, setModalLimitInput] = useState('0');

  const fetchRoles = async () => {
    try {
      const res = await roleApi.getRoles();
      if (res.data.success) {
        // Exclude Student and Parent roles
        const staffRoles = (res.data.data || []).filter((r) => {
          const name = String(r.name || '').toLowerCase();
          return !name.includes('student') && !name.includes('parent');
        });
        setRoles(staffRoles);
      }
    } catch (err) {
      console.error('Failed to load roles', err);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await userApi.getUsers({ pageSize: 200 });
      if (res.data.success) {
        const data = res.data.data;
        const allList = data?.items || (Array.isArray(data) ? data : []);

        // Strict filter: ONLY staff (Exclude Student userType=7 and Parent userType=6)
        const staffOnly = allList.filter((u) => {
          const userTypeNum = Number(u.userType);
          if (userTypeNum === 6 || userTypeNum === 7) return false;
          const userTypeStr = String(u.userType || '').toLowerCase();
          if (userTypeStr === 'parent' || userTypeStr === 'student') return false;
          const roleLower = String(u.roleName || '').toLowerCase();
          if (roleLower.includes('student') || roleLower.includes('parent')) return false;
          return true;
        });

        setUsers(staffOnly);

        // Initialize local edit state with string limitInput
        const initialEdits = {};
        staffOnly.forEach((u) => {
          const val = u.maxDiscountLimit !== undefined && u.maxDiscountLimit !== null ? u.maxDiscountLimit : 0;
          initialEdits[u.id] = {
            canGiveDiscount: Boolean(u.canGiveDiscount),
            limitInput: String(val),
          };
        });
        setRowEdits(initialEdits);
      }
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to load staff list', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
    fetchUsers();
  }, []);

  // Filtered staff list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Role filter
      if (selectedRole && u.roleId !== Number(selectedRole)) {
        return false;
      }

      const editState = rowEdits[u.id] || {
        canGiveDiscount: Boolean(u.canGiveDiscount),
        limitInput: String(u.maxDiscountLimit || 0),
      };

      // Status filter
      if (statusFilter === 'enabled' && !editState.canGiveDiscount) return false;
      if (statusFilter === 'disabled' && editState.canGiveDiscount) return false;

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const nameMatch = u.fullName?.toLowerCase().includes(q);
        const userMatch = u.username?.toLowerCase().includes(q);
        const emailMatch = u.email?.toLowerCase().includes(q);
        const mobileMatch = u.mobile?.includes(q);
        const roleMatch = u.roleName?.toLowerCase().includes(q);
        return nameMatch || userMatch || emailMatch || mobileMatch || roleMatch;
      }

      return true;
    });
  }, [users, rowEdits, selectedRole, statusFilter, search]);

  // Paginated staff
  const paginatedUsers = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredUsers.slice(start, start + rowsPerPage);
  }, [filteredUsers, page, rowsPerPage]);

  // Statistics
  const stats = useMemo(() => {
    const total = users.length;
    let enabledCount = 0;
    let unlimitedCount = 0;
    let disabledCount = 0;

    users.forEach((u) => {
      const editState = rowEdits[u.id] || { canGiveDiscount: Boolean(u.canGiveDiscount), limitInput: String(u.maxDiscountLimit || 0) };
      if (editState.canGiveDiscount) {
        enabledCount++;
        const val = parseFloat(editState.limitInput) || 0;
        if (val === 0 || val >= 100) {
          unlimitedCount++;
        }
      } else {
        disabledCount++;
      }
    });

    return { total, enabledCount, unlimitedCount, disabledCount };
  }, [users, rowEdits]);

  // Handle toggle switch for single user
  const handleToggleDiscount = async (userId, newChecked) => {
    const currentLimitStr = rowEdits[userId]?.limitInput ?? '0';
    const numLimit = Math.min(100, Math.max(0, parseFloat(currentLimitStr) || 0));

    const updatedState = {
      canGiveDiscount: newChecked,
      limitInput: newChecked ? currentLimitStr : '0',
    };

    setRowEdits((prev) => ({
      ...prev,
      [userId]: updatedState,
    }));

    try {
      setSavingUserId(userId);
      await userApi.updateDiscountEligibility(userId, {
        canGiveDiscount: newChecked,
        maxDiscountLimit: newChecked ? numLimit : 0,
      });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, canGiveDiscount: newChecked, maxDiscountLimit: newChecked ? numLimit : 0 }
            : u
        )
      );
      showSnackbar(
        newChecked
          ? 'Discount privilege enabled for this staff member.'
          : 'Discount disabled! This staff member will NOT see the discount input in Fee Collection.',
        newChecked ? 'info' : 'warning'
      );
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to update discount status', 'error');
      // Revert on error
      setRowEdits((prev) => ({
        ...prev,
        [userId]: {
          canGiveDiscount: !newChecked,
          limitInput: currentLimitStr,
        },
      }));
    } finally {
      setSavingUserId(null);
    }
  };

  // Handle direct limit input typing
  const handleLimitInputChange = (userId, rawValue) => {
    setRowEdits((prev) => ({
      ...prev,
      [userId]: {
        ...(prev[userId] || {}),
        limitInput: rawValue,
      },
    }));
  };

  // Quick preset % chip click
  const handleSetQuickLimit = (userId, percent) => {
    setRowEdits((prev) => ({
      ...prev,
      [userId]: {
        ...(prev[userId] || {}),
        canGiveDiscount: true,
        limitInput: String(percent),
      },
    }));
  };

  // Explicit Save / Update button click
  const handleSaveUserLimit = async (userId) => {
    const edit = rowEdits[userId];
    if (!edit) return;

    const parsedPercent = Math.min(100, Math.max(0, parseFloat(edit.limitInput) || 0));

    try {
      setSavingUserId(userId);
      await userApi.updateDiscountEligibility(userId, {
        canGiveDiscount: edit.canGiveDiscount,
        maxDiscountLimit: edit.canGiveDiscount ? parsedPercent : 0,
      });

      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, canGiveDiscount: edit.canGiveDiscount, maxDiscountLimit: edit.canGiveDiscount ? parsedPercent : 0 }
            : u
        )
      );

      // Normalize string in state
      setRowEdits((prev) => ({
        ...prev,
        [userId]: {
          ...prev[userId],
          limitInput: String(parsedPercent),
        },
      }));

      const target = users.find((u) => u.id === userId);
      const limitLabel = parsedPercent === 0 || parsedPercent >= 100 ? 'Unlimited (100%)' : `${parsedPercent}%`;
      showSnackbar(
        edit.canGiveDiscount
          ? `Discount limit for ${target?.fullName || 'Staff'} set to ${limitLabel}.`
          : `Discount disabled for ${target?.fullName || 'Staff'}.`,
        'success'
      );
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to save discount limit', 'error');
    } finally {
      setSavingUserId(null);
    }
  };

  // Open modal for editing
  const handleOpenEditModal = (user) => {
    setSelectedUserForModal(user);
    const edit = rowEdits[user.id] || {
      canGiveDiscount: Boolean(user.canGiveDiscount),
      limitInput: String(user.maxDiscountLimit || 0),
    };
    setModalCanGiveDiscount(edit.canGiveDiscount);
    setModalLimitInput(edit.limitInput);
    setEditModalOpen(true);
  };

  // Save from Modal
  const handleSaveModal = async () => {
    if (!selectedUserForModal) return;
    const userId = selectedUserForModal.id;
    const parsedPercent = Math.min(100, Math.max(0, parseFloat(modalLimitInput) || 0));

    try {
      setSavingUserId(userId);
      await userApi.updateDiscountEligibility(userId, {
        canGiveDiscount: modalCanGiveDiscount,
        maxDiscountLimit: modalCanGiveDiscount ? parsedPercent : 0,
      });

      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, canGiveDiscount: modalCanGiveDiscount, maxDiscountLimit: modalCanGiveDiscount ? parsedPercent : 0 }
            : u
        )
      );

      setRowEdits((prev) => ({
        ...prev,
        [userId]: {
          canGiveDiscount: modalCanGiveDiscount,
          limitInput: String(parsedPercent),
        },
      }));

      setEditModalOpen(false);
      showSnackbar(`Discount configuration saved for ${selectedUserForModal.fullName}!`, 'success');
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to save settings', 'error');
    } finally {
      setSavingUserId(null);
    }
  };

  const handleDownloadExcel = () => {
    if (!filteredUsers || filteredUsers.length === 0) return;

    const data = [
      ['Staff Fee Discount Privileges & Limits'],
      [`Generated on: ${new Date().toLocaleDateString()}`],
      [],
      ['S.No', 'Staff Name', 'Username', 'Email', 'Mobile', 'Role', 'Discount Privilege', 'Max Discount Limit (%)']
    ];

    filteredUsers.forEach((u, idx) => {
      const editState = rowEdits[u.id] || {
        canGiveDiscount: Boolean(u.canGiveDiscount),
        limitInput: String(u.maxDiscountLimit || 0),
      };
      const isEnabled = Boolean(editState.canGiveDiscount);
      const numVal = parseFloat(editState.limitInput) || 0;
      const limitText = !isEnabled ? 'Disabled' : (numVal === 0 || numVal >= 100) ? 'Unlimited (100%)' : `${numVal}%`;

      data.push([
        idx + 1,
        u.fullName || '',
        u.username || '',
        u.email || '',
        u.mobile || '',
        u.roleName || 'Staff',
        isEnabled ? 'Enabled' : 'Disabled',
        limitText
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 22 },
      { wch: 16 },
      { wch: 25 },
      { wch: 15 },
      { wch: 18 },
      { wch: 18 },
      { wch: 22 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Staff Discounts');
    XLSX.writeFile(wb, `Fee_Discount_Master_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleDownloadPdf = () => {
    if (!filteredUsers || filteredUsers.length === 0) return;

    const doc = new jsPDF('landscape');
    doc.setFontSize(16);
    doc.setTextColor(30);
    doc.text('Staff Fee Discount Privileges & Limits Report', 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 25);

    const headRow = ['#', 'Staff Name', 'Username / Contact', 'Role', 'Status', 'Max Discount Limit'];
    const bodyRows = filteredUsers.map((u, idx) => {
      const editState = rowEdits[u.id] || {
        canGiveDiscount: Boolean(u.canGiveDiscount),
        limitInput: String(u.maxDiscountLimit || 0),
      };
      const isEnabled = Boolean(editState.canGiveDiscount);
      const numVal = parseFloat(editState.limitInput) || 0;
      const limitText = !isEnabled ? 'Disabled' : (numVal === 0 || numVal >= 100) ? 'Unlimited (100%)' : `${numVal}%`;

      return [
        idx + 1,
        u.fullName || '',
        `${u.username || ''}${u.mobile ? ' • ' + u.mobile : ''}`,
        u.roleName || 'Staff',
        isEnabled ? 'Enabled' : 'Disabled',
        limitText
      ];
    });

    autoTable(doc, {
      head: [headRow],
      body: bodyRows,
      startY: 30,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
    });

    doc.save(`Fee_Discount_Master_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <Box sx={{ pb: 2 }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 1.5,
          mb: 1.5,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DiscountIcon color="primary" sx={{ fontSize: 22 }} />
            <Typography variant="h6" fontWeight={800} color="text.primary" sx={{ fontSize: { xs: '1.15rem', sm: '1.25rem' }, lineHeight: 1.2 }}>
              Fee Discount Master
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: { xs: '0.72rem', sm: '0.78rem' }, mt: 0.25 }}>
            Staff-wise discount eligibility & percentage (%) limit configuration. (Students & Parents excluded).
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            size="small"
            variant="contained"
            startIcon={<ExcelIcon sx={{ fontSize: 16 }} />}
            onClick={handleDownloadExcel}
            disabled={filteredUsers.length === 0}
            sx={{
              bgcolor: '#107c41',
              color: '#ffffff',
              height: 32,
              fontSize: '0.78rem',
              fontWeight: 700,
              px: 1.8,
              borderRadius: '8px',
              boxShadow: '0 2px 6px rgba(16, 124, 65, 0.25)',
              textTransform: 'none',
              '&:hover': { bgcolor: '#0b5c30', boxShadow: '0 4px 10px rgba(16, 124, 65, 0.4)' },
              '&.Mui-disabled': { bgcolor: '#cbd5e1', color: '#94a3b8' },
            }}
          >
            Download Excel
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={<PdfIcon sx={{ fontSize: 16 }} />}
            onClick={handleDownloadPdf}
            disabled={filteredUsers.length === 0}
            sx={{
              bgcolor: '#d32f2f',
              color: '#ffffff',
              height: 32,
              fontSize: '0.78rem',
              fontWeight: 700,
              px: 1.8,
              borderRadius: '8px',
              boxShadow: '0 2px 6px rgba(211, 47, 47, 0.25)',
              textTransform: 'none',
              '&:hover': { bgcolor: '#b71c1c', boxShadow: '0 4px 10px rgba(211, 47, 47, 0.4)' },
              '&.Mui-disabled': { bgcolor: '#cbd5e1', color: '#94a3b8' },
            }}
          >
            Download PDF
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon sx={{ fontSize: 16 }} />}
            onClick={fetchUsers}
            disabled={loading}
            sx={{
              height: 32,
              fontSize: '0.78rem',
              fontWeight: 700,
              px: 1.5,
              borderRadius: '8px',
              textTransform: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Refresh
          </Button>
        </Stack>
      </Box>

      {/* Info Alert */}
      <Alert
        severity="info"
        sx={{
          mb: 1.5,
          py: 0.5,
          px: 1.25,
          bgcolor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          color: '#166534',
          fontSize: '0.78rem',
          borderRadius: 1.5,
          '& .MuiAlert-icon': { color: '#16a34a', py: 0.25, mr: 1 },
          '& .MuiAlert-message': { py: 0.25 },
        }}
      >
        <strong>Rules & Usage:</strong> <b>Enabled</b> staff can give discounts up to their percentage (%) limit in Fee Collection. <b>Disabled</b> staff will not see any discount option. <b>0% or 100%</b> grants unlimited (100%) waiver authority.
      </Alert>

      {/* Metric Cards */}
      <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              p: 1.25,
              borderRadius: 1.5,
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              background: 'linear-gradient(135deg, rgba(241, 245, 249, 0.6) 0%, rgba(255, 255, 255, 1) 100%)',
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: 0.3, display: 'block' }}>
                  TOTAL STAFF MEMBERS
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary', fontSize: '1.2rem', lineHeight: 1.2, my: 0.25 }}>
                  {stats.total}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.67rem', display: 'block' }}>
                  School staff directory
                </Typography>
              </Box>
              <Box sx={{ width: 34, height: 34, minWidth: 34, bgcolor: '#f1f5f9', color: '#475569', borderRadius: 1.2, display: 'flex', alignItems: 'center', justifyContent: 'center', ml: 1 }}>
                <DiscountIcon sx={{ fontSize: 18 }} />
              </Box>
            </Stack>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              p: 1.25,
              borderRadius: 1.5,
              border: '1px solid #86efac',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(255, 255, 255, 1) 100%)',
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="caption" sx={{ color: '#166534', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: 0.3, display: 'block' }}>
                  DISCOUNT ENABLED
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#15803d', fontSize: '1.2rem', lineHeight: 1.2, my: 0.25 }}>
                  {stats.enabledCount}
                </Typography>
                <Typography variant="caption" sx={{ color: '#166534', fontSize: '0.67rem', display: 'block' }}>
                  Active discount access
                </Typography>
              </Box>
              <Box sx={{ width: 34, height: 34, minWidth: 34, bgcolor: '#dcfce7', color: '#15803d', borderRadius: 1.2, display: 'flex', alignItems: 'center', justifyContent: 'center', ml: 1 }}>
                <CheckCircleIcon sx={{ fontSize: 18 }} />
              </Box>
            </Stack>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              p: 1.25,
              borderRadius: 1.5,
              border: '1px solid #fde68a',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(255, 255, 255, 1) 100%)',
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="caption" sx={{ color: '#854d0e', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: 0.3, display: 'block' }}>
                  UNLIMITED (100%) AUTHORITY
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#a16207', fontSize: '1.2rem', lineHeight: 1.2, my: 0.25 }}>
                  {stats.unlimitedCount}
                </Typography>
                <Typography variant="caption" sx={{ color: '#854d0e', fontSize: '0.67rem', display: 'block' }}>
                  Full waiver privileges
                </Typography>
              </Box>
              <Box sx={{ width: 34, height: 34, minWidth: 34, bgcolor: '#fef3c7', color: '#a16207', borderRadius: 1.2, display: 'flex', alignItems: 'center', justifyContent: 'center', ml: 1 }}>
                <DiscountIcon sx={{ fontSize: 18 }} />
              </Box>
            </Stack>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              p: 1.25,
              borderRadius: 1.5,
              border: '1px solid #fca5a5',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(255, 255, 255, 1) 100%)',
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="caption" sx={{ color: '#991b1b', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: 0.3, display: 'block' }}>
                  DISCOUNT DISABLED (HIDDEN)
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#b91c1c', fontSize: '1.2rem', lineHeight: 1.2, my: 0.25 }}>
                  {stats.disabledCount}
                </Typography>
                <Typography variant="caption" sx={{ color: '#991b1b', fontSize: '0.67rem', display: 'block' }}>
                  Input hidden in collection
                </Typography>
              </Box>
              <Box sx={{ width: 34, height: 34, minWidth: 34, bgcolor: '#fee2e2', color: '#b91c1c', borderRadius: 1.2, display: 'flex', alignItems: 'center', justifyContent: 'center', ml: 1 }}>
                <CancelIcon sx={{ fontSize: 18 }} />
              </Box>
            </Stack>
          </Card>
        </Grid>
      </Grid>

      {/* Filter and Search Bar */}
      <Paper elevation={0} sx={{ p: 1.25, mb: 1.5, border: '1px solid #e2e8f0', borderRadius: 1.5 }}>
        <Grid container spacing={1.5} alignItems="center">
          <Grid item xs={12} sm={5} md={5}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by Staff name, email, mobile, or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={6} sm={3} md={3}>
            <TextField
              select
              fullWidth
              size="small"
              label="Filter by Role"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              <MenuItem value="">All Staff Roles</MenuItem>
              {roles.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  {r.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={6} sm={4} md={4}>
            <TextField
              select
              fullWidth
              size="small"
              label="Discount Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="all">All Staff ({users.length})</MenuItem>
              <MenuItem value="enabled">Discount Enabled Only ({stats.enabledCount})</MenuItem>
              <MenuItem value="disabled">Discount Disabled Only ({stats.disabledCount})</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      {/* Standard Table (Zero focus-trapping or typing bugs) */}
      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 1.5 }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: '#f8fafc' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, py: 1, fontSize: '0.75rem' }}>Staff Member</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 140, py: 1, fontSize: '0.75rem' }}>Role</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 150, py: 1, fontSize: '0.75rem' }}>Discount Access</TableCell>
              <TableCell sx={{ fontWeight: 700, minWidth: 300, py: 1, fontSize: '0.75rem' }}>Discount Limit (%) / Authority</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, width: 150, py: 1, fontSize: '0.75rem' }}>Action</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 5 }}>
                  <CircularProgress size={28} />
                  <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary', fontSize: '0.8rem' }}>
                    Loading staff members...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : paginatedUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 5 }}>
                  <Typography variant="body2" color="text.secondary">
                    No staff members match the selected criteria.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedUsers.map((u) => {
                const currentEdit = rowEdits[u.id] || {
                  canGiveDiscount: Boolean(u.canGiveDiscount),
                  limitInput: String(u.maxDiscountLimit || 0),
                };
                const isEnabled = Boolean(currentEdit.canGiveDiscount);
                const limitStr = currentEdit.limitInput !== undefined ? currentEdit.limitInput : String(u.maxDiscountLimit || 0);
                const numVal = parseFloat(limitStr) || 0;
                const isUnlimited = numVal === 0 || numVal >= 100;
                const isSaving = savingUserId === u.id;

                const hasChanges =
                  currentEdit &&
                  (Boolean(currentEdit.canGiveDiscount) !== Boolean(u.canGiveDiscount) ||
                    numVal !== Number(u.maxDiscountLimit || 0));

                return (
                  <TableRow
                    key={u.id}
                    hover
                    sx={{
                      bgcolor: isEnabled ? '#fafdfc' : 'inherit',
                      '&:hover': { bgcolor: isEnabled ? '#f0fdf4' : '#f8fafc' },
                    }}
                  >
                    {/* Staff Member Info */}
                    <TableCell sx={{ py: 0.75 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            bgcolor: isEnabled ? '#dcfce7' : '#f1f5f9',
                            color: isEnabled ? '#15803d' : '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: 13,
                            border: `1px solid ${isEnabled ? '#86efac' : '#cbd5e1'}`,
                          }}
                        >
                          {u.fullName?.charAt(0)?.toUpperCase() || 'S'}
                        </Box>
                        <Box>
                          <Typography variant="body2" fontWeight={700} sx={{ color: 'text.primary', lineHeight: 1.2, fontSize: '0.82rem' }}>
                            {u.fullName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                            {u.email || u.username} {u.mobile ? `• ${u.mobile}` : ''}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>

                    {/* Role */}
                    <TableCell sx={{ py: 0.75 }}>
                      <Chip
                        label={u.roleName || 'Staff'}
                        size="small"
                        variant="outlined"
                        color="primary"
                        sx={{ fontWeight: 600, fontSize: '0.7rem', height: 22 }}
                      />
                    </TableCell>

                    {/* Discount Access Switch */}
                    <TableCell sx={{ py: 0.75 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Switch
                          size="small"
                          checked={isEnabled}
                          disabled={isSaving}
                          onChange={(e) => handleToggleDiscount(u.id, e.target.checked)}
                          color="success"
                        />
                        {isSaving ? (
                          <CircularProgress size={14} />
                        ) : isEnabled ? (
                          <Chip
                            icon={<CheckCircleIcon sx={{ fontSize: '12px !important' }} />}
                            label="Enabled"
                            size="small"
                            sx={{
                              bgcolor: '#dcfce7',
                              color: '#15803d',
                              fontWeight: 700,
                              fontSize: '0.67rem',
                              height: 20,
                            }}
                          />
                        ) : (
                          <Chip
                            icon={<CancelIcon sx={{ fontSize: '12px !important' }} />}
                            label="Disabled"
                            size="small"
                            sx={{
                              bgcolor: '#fee2e2',
                              color: '#b91c1c',
                              fontWeight: 600,
                              fontSize: '0.67rem',
                              height: 20,
                            }}
                          />
                        )}
                      </Box>
                    </TableCell>

                    {/* Discount Limit (%) / Authority */}
                    <TableCell sx={{ py: 0.75 }}>
                      {!isEnabled ? (
                        <Typography variant="caption" sx={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.72rem' }}>
                          No Access (Discount input hidden in Fee Collection)
                        </Typography>
                      ) : (
                        <Box>
                          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.5 }}>
                            <TextField
                              size="small"
                              type="number"
                              value={limitStr}
                              onChange={(e) => handleLimitInputChange(u.id, e.target.value)}
                              InputProps={{
                                endAdornment: (
                                  <InputAdornment position="end" sx={{ fontWeight: 700, color: '#334155', fontSize: '0.75rem' }}>
                                    %
                                  </InputAdornment>
                                ),
                              }}
                              inputProps={{ min: 0, max: 100, step: 'any' }}
                              sx={{
                                width: 85,
                                bgcolor: '#fff',
                                '& .MuiInputBase-input': {
                                  py: 0.3,
                                  px: 0.75,
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                },
                              }}
                            />

                            {isUnlimited ? (
                              <Chip
                                label="Unlimited (100%)"
                                size="small"
                                sx={{
                                  bgcolor: '#fef3c7',
                                  color: '#92400e',
                                  fontWeight: 700,
                                  fontSize: '0.68rem',
                                  height: 22,
                                }}
                              />
                            ) : (
                              <Chip
                                label={`Max ${numVal}% Discount`}
                                size="small"
                                sx={{
                                  bgcolor: '#eff6ff',
                                  color: '#1d4ed8',
                                  fontWeight: 700,
                                  fontSize: '0.68rem',
                                  height: 22,
                                }}
                              />
                            )}
                          </Stack>

                          {/* Quick % chips */}
                          <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" gap={0.4}>
                            {[5, 10, 15, 20, 25, 50].map((pct) => (
                              <Chip
                                key={pct}
                                label={`${pct}%`}
                                size="small"
                                onClick={() => handleSetQuickLimit(u.id, pct)}
                                sx={{
                                  cursor: 'pointer',
                                  fontSize: '0.65rem',
                                  height: 18,
                                  px: 0.25,
                                  bgcolor: numVal === pct ? '#dbeafe' : '#f1f5f9',
                                  color: numVal === pct ? '#1e40af' : '#475569',
                                  fontWeight: numVal === pct ? 700 : 500,
                                  '&:hover': { bgcolor: '#e2e8f0' },
                                }}
                              />
                            ))}
                            <Chip
                              label="Unlimited"
                              size="small"
                              onClick={() => handleSetQuickLimit(u.id, 100)}
                              sx={{
                                cursor: 'pointer',
                                fontSize: '0.65rem',
                                height: 18,
                                px: 0.25,
                                bgcolor: isUnlimited ? '#fef3c7' : '#f1f5f9',
                                color: isUnlimited ? '#92400e' : '#475569',
                                fontWeight: isUnlimited ? 700 : 500,
                                '&:hover': { bgcolor: '#fde68a' },
                              }}
                            />
                          </Stack>
                        </Box>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell align="right" sx={{ py: 0.75 }}>
                      <Stack direction="row" spacing={0.75} justifyContent="flex-end" alignItems="center">
                        <Tooltip title="Quick Edit in Dialog">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleOpenEditModal(u)}
                            sx={{ border: '1px solid #e2e8f0', p: 0.5 }}
                          >
                            <EditIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>

                        <Button
                          size="small"
                          variant={hasChanges ? 'contained' : 'outlined'}
                          color={hasChanges ? 'primary' : 'inherit'}
                          disabled={isSaving}
                          onClick={() => handleSaveUserLimit(u.id)}
                          startIcon={isSaving ? <CircularProgress size={12} /> : <SaveIcon sx={{ fontSize: 14 }} />}
                          sx={{
                            textTransform: 'none',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            py: 0.3,
                            px: 1,
                            height: 28,
                          }}
                        >
                          {hasChanges ? 'Save' : 'Update'}
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={filteredUsers.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </TableContainer>

      {/* Edit Limit Modal Dialog */}
      <Dialog
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          Configure Fee Discount
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 2 }}>
          {selectedUserForModal && (
            <Stack spacing={2.5}>
              <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 1.5, border: '1px solid #e2e8f0' }}>
                <Typography variant="subtitle2" fontWeight={700}>
                  {selectedUserForModal.fullName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Role: {selectedUserForModal.roleName || 'Staff'} • {selectedUserForModal.email || selectedUserForModal.username}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body2" fontWeight={600}>
                  Allow Fee Discount
                </Typography>
                <Switch
                  checked={modalCanGiveDiscount}
                  onChange={(e) => setModalCanGiveDiscount(e.target.checked)}
                  color="success"
                />
              </Box>

              {modalCanGiveDiscount && (
                <Box>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    MAX DISCOUNT LIMIT (%)
                  </Typography>
                  <TextField
                    fullWidth
                    type="number"
                    value={modalLimitInput}
                    onChange={(e) => setModalLimitInput(e.target.value)}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }}
                    inputProps={{ min: 0, max: 100, step: 'any' }}
                    helperText="Enter 0 or 100 for Unlimited (100%) authorization"
                  />

                  {/* Preset chips in modal */}
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5, mb: 0.5 }}>
                    Quick Presets:
                  </Typography>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                    {[5, 10, 15, 20, 25, 50, 100].map((pct) => (
                      <Chip
                        key={pct}
                        label={pct === 100 ? '100% (Unlimited)' : `${pct}%`}
                        size="small"
                        onClick={() => setModalLimitInput(String(pct))}
                        sx={{ cursor: 'pointer', fontWeight: 600 }}
                      />
                    ))}
                  </Stack>
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditModalOpen(false)} color="inherit" sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveModal}
            variant="contained"
            color="primary"
            disabled={savingUserId !== null}
            startIcon={savingUserId !== null ? <CircularProgress size={16} /> : <SaveIcon />}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Save Configuration
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
