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
} from '@mui/icons-material';
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

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <DiscountIcon color="primary" sx={{ fontSize: 28 }} />
            <Typography variant="h5" fontWeight={700} color="text.primary">
              Fee Discount Master
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Staff-wise discount eligibility & percentage (%) limit configuration. (Students & Parents excluded).
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchUsers}
          disabled={loading}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          Refresh
        </Button>
      </Box>

      {/* Info Alert */}
      <Alert
        severity="info"
        sx={{
          mb: 2.5,
          bgcolor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          color: '#166534',
          '& .MuiAlert-icon': { color: '#16a34a' },
        }}
      >
        <strong>Rules & Usage:</strong>
        <Box component="span" sx={{ display: 'block', mt: 0.5, fontSize: 13 }}>
          • <strong>Enable/Disable Switch:</strong> Agar switch <strong>Disable</strong> hoga, toh us staff ko <strong>Fee Collection screen par discount ka input field show hi nahi hoga</strong>.
          <br />
          • <strong>Discount Limit (%):</strong> Yahan staff ke liye <strong>Percentage (%)</strong> limit enter karein (e.g. 5%, 10%, 20%). Staff bill collection karte samay is percentage se zyada discount nahi de sakega. <strong>Unlimited (100%) discount ke liye 0 ya 100 enter karein</strong>.
          <br />
          • <strong>Staff Only:</strong> Yahan sirf school staff members (Accountant, Teacher, Principal, Admin) listed hain. Students aur parents ko filter kar diya gaya hai.
        </Box>
      </Alert>

      {/* Metric Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" fontWeight={600} color="text.secondary">
                TOTAL STAFF MEMBERS
              </Typography>
              <Typography variant="h4" fontWeight={700} color="text.primary" sx={{ mt: 0.5 }}>
                {stats.total}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: '1px solid #86efac', bgcolor: '#f0fdf4', borderRadius: 2 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" fontWeight={700} sx={{ color: '#166534' }}>
                DISCOUNT ENABLED
              </Typography>
              <Typography variant="h4" fontWeight={700} sx={{ color: '#15803d', mt: 0.5 }}>
                {stats.enabledCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: '1px solid #fde68a', bgcolor: '#fefce8', borderRadius: 2 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" fontWeight={700} sx={{ color: '#854d0e' }}>
                UNLIMITED (100%) AUTHORITY
              </Typography>
              <Typography variant="h4" fontWeight={700} sx={{ color: '#a16207', mt: 0.5 }}>
                {stats.unlimitedCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: '1px solid #fca5a5', bgcolor: '#fef2f2', borderRadius: 2 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" fontWeight={700} sx={{ color: '#991b1b' }}>
                DISCOUNT DISABLED (HIDDEN)
              </Typography>
              <Typography variant="h4" fontWeight={700} sx={{ color: '#b91c1c', mt: 0.5 }}>
                {stats.disabledCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter and Search Bar */}
      <Paper elevation={0} sx={{ p: 2, mb: 2.5, border: '1px solid #e2e8f0', borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
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
      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ bgcolor: '#f8fafc' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Staff Member</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 140 }}>Role</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 170 }}>Discount Access</TableCell>
              <TableCell sx={{ fontWeight: 700, minWidth: 320 }}>Discount Limit (%) / Authority</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, width: 160 }}>Action</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={32} />
                  <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                    Loading staff members...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : paginatedUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                  <Typography variant="body1" color="text.secondary">
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
                    <TableCell sx={{ py: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            bgcolor: isEnabled ? '#dcfce7' : '#f1f5f9',
                            color: isEnabled ? '#15803d' : '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: 14,
                            border: `1px solid ${isEnabled ? '#86efac' : '#cbd5e1'}`,
                          }}
                        >
                          {u.fullName?.charAt(0)?.toUpperCase() || 'S'}
                        </Box>
                        <Box>
                          <Typography variant="body2" fontWeight={700} sx={{ color: 'text.primary', lineHeight: 1.2 }}>
                            {u.fullName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {u.email || u.username} {u.mobile ? `• ${u.mobile}` : ''}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>

                    {/* Role */}
                    <TableCell sx={{ py: 1.5 }}>
                      <Chip
                        label={u.roleName || 'Staff'}
                        size="small"
                        variant="outlined"
                        color="primary"
                        sx={{ fontWeight: 600, fontSize: 11.5 }}
                      />
                    </TableCell>

                    {/* Discount Access Switch */}
                    <TableCell sx={{ py: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Switch
                          size="small"
                          checked={isEnabled}
                          disabled={isSaving}
                          onChange={(e) => handleToggleDiscount(u.id, e.target.checked)}
                          color="success"
                        />
                        {isSaving ? (
                          <CircularProgress size={16} />
                        ) : isEnabled ? (
                          <Chip
                            icon={<CheckCircleIcon sx={{ fontSize: '13px !important' }} />}
                            label="Enabled"
                            size="small"
                            sx={{
                              bgcolor: '#dcfce7',
                              color: '#15803d',
                              fontWeight: 700,
                              fontSize: 10.5,
                              height: 22,
                            }}
                          />
                        ) : (
                          <Chip
                            icon={<CancelIcon sx={{ fontSize: '13px !important' }} />}
                            label="Disabled"
                            size="small"
                            sx={{
                              bgcolor: '#fee2e2',
                              color: '#b91c1c',
                              fontWeight: 600,
                              fontSize: 10.5,
                              height: 22,
                            }}
                          />
                        )}
                      </Box>
                    </TableCell>

                    {/* Discount Limit (%) / Authority */}
                    <TableCell sx={{ py: 1.5 }}>
                      {!isEnabled ? (
                        <Typography variant="caption" sx={{ color: '#94a3b8', fontStyle: 'italic' }}>
                          No Access (Discount input hidden in Fee Collection)
                        </Typography>
                      ) : (
                        <Box>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
                            <TextField
                              size="small"
                              type="number"
                              value={limitStr}
                              onChange={(e) => handleLimitInputChange(u.id, e.target.value)}
                              InputProps={{
                                endAdornment: (
                                  <InputAdornment position="end" sx={{ fontWeight: 700, color: '#334155' }}>
                                    %
                                  </InputAdornment>
                                ),
                              }}
                              inputProps={{ min: 0, max: 100, step: 'any' }}
                              sx={{
                                width: 110,
                                bgcolor: '#fff',
                                '& .MuiInputBase-input': {
                                  py: 0.5,
                                  px: 1,
                                  fontSize: 13,
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
                                  fontSize: 11,
                                  height: 24,
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
                                  fontSize: 11,
                                  height: 24,
                                }}
                              />
                            )}
                          </Stack>

                          {/* Quick % chips */}
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            {[5, 10, 15, 20, 25, 50].map((pct) => (
                              <Chip
                                key={pct}
                                label={`${pct}%`}
                                size="small"
                                onClick={() => handleSetQuickLimit(u.id, pct)}
                                sx={{
                                  cursor: 'pointer',
                                  fontSize: 10,
                                  height: 20,
                                  bgcolor: numVal === pct ? '#dbeafe' : '#f1f5f9',
                                  color: numVal === pct ? '#1e40af' : '#475569',
                                  fontWeight: numVal === pct ? 700 : 500,
                                  '&:hover': { bgcolor: '#e2e8f0' },
                                }}
                              />
                            ))}
                            <Chip
                              label="Unlimited (100%)"
                              size="small"
                              onClick={() => handleSetQuickLimit(u.id, 100)}
                              sx={{
                                cursor: 'pointer',
                                fontSize: 10,
                                height: 20,
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
                    <TableCell align="right" sx={{ py: 1.5 }}>
                      <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
                        <Tooltip title="Quick Edit in Dialog">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleOpenEditModal(u)}
                            sx={{ border: '1px solid #e2e8f0' }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Button
                          size="small"
                          variant={hasChanges ? 'contained' : 'outlined'}
                          color={hasChanges ? 'primary' : 'inherit'}
                          disabled={isSaving}
                          onClick={() => handleSaveUserLimit(u.id)}
                          startIcon={isSaving ? <CircularProgress size={14} /> : <SaveIcon fontSize="small" />}
                          sx={{
                            textTransform: 'none',
                            fontSize: 11.5,
                            fontWeight: 700,
                            py: 0.4,
                            px: 1.2,
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
