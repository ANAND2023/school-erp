import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  MenuItem,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  LockOpen as UnlockIcon,
  VpnKey as ResetKeyIcon,
  CheckCircle as ActiveIcon,
  Block as BlockIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { DataGrid } from '../../../components/DataGrid';
import { Modal } from '../../../components/Modal';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { userApi, roleApi } from '../api';
import { useUiStore } from '../../../store/uiStore';
import { usePermission } from '../../../hooks/usePermission';

export const UsersPage = () => {
  const { showSnackbar } = useUiStore();
  const { hasPermission } = usePermission();

  const [users, setUsers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState([]);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });

  // Modal State
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    email: '',
    mobile: '',
    userType: 2, // Default SchoolAdmin or Teacher
    roleId: '',
  });

  // Reset Password Modal
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetUserId, setResetUserId] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  // Status Confirm Dialog
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [targetUser, setTargetUser] = useState(null);

  const fetchRoles = async () => {
    try {
      const res = await roleApi.getRoles();
      if (res.data.success) {
        const list = (res.data.data || []).filter(
          (r) => !r.name.toLowerCase().includes('super admin')
        );
        setRoles(list);
      }
    } catch (err) {
      console.error('Failed to load roles', err);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = {
        search: search.trim() || undefined,
        roleId: selectedRole || undefined,
        pageNo: paginationModel.page + 1,
        pageSize: paginationModel.pageSize,
      };
      const res = await userApi.getUsers(params);
      if (res.data.success) {
        const data = res.data.data;
        setUsers(data?.items || (Array.isArray(data) ? data : []));
        setTotalCount(data?.totalCount || (Array.isArray(data) ? data.length : 0));
      }
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [paginationModel, selectedRole]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
    fetchUsers();
  };

  const handleOpenAdd = () => {
    setEditingUserId(null);
    setFormData({
      username: '',
      password: '',
      fullName: '',
      email: '',
      mobile: '',
      userType: 4, // Teacher
      roleId: roles.length > 0 ? roles[0].id : '',
    });
    setUserModalOpen(true);
  };

  const handleOpenEdit = (user) => {
    setEditingUserId(user.id);
    setFormData({
      username: user.username,
      password: '',
      fullName: user.fullName,
      email: user.email || '',
      mobile: user.mobile || '',
      userType: user.userType,
      roleId: user.roleId,
    });
    setUserModalOpen(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    try {
      if (editingUserId) {
        await userApi.updateUser(editingUserId, {
          fullName: formData.fullName,
          email: formData.email,
          mobile: formData.mobile,
          userType: formData.userType,
          roleId: formData.roleId,
        });
        showSnackbar('User updated successfully', 'success');
      } else {
        await userApi.createUser(formData);
        showSnackbar('User created successfully', 'success');
      }
      setUserModalOpen(false);
      fetchUsers();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Error saving user', 'error');
    }
  };

  const handleToggleStatus = async () => {
    if (!targetUser) return;
    try {
      await userApi.toggleStatus(targetUser.id, !targetUser.isActive);
      showSnackbar(
        `User ${!targetUser.isActive ? 'activated' : 'deactivated'} successfully`,
        'success'
      );
      setStatusConfirmOpen(false);
      fetchUsers();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to change status', 'error');
    }
  };

  const handleUnlock = async (id) => {
    try {
      await userApi.unlockUser(id);
      showSnackbar('Account unlocked successfully', 'success');
      fetchUsers();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to unlock account', 'error');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      showSnackbar('Password must be at least 8 characters long', 'warning');
      return;
    }
    try {
      await userApi.resetPassword(resetUserId, newPassword);
      showSnackbar('Password reset successfully! User must change it on first login.', 'success');
      setResetModalOpen(false);
      setNewPassword('');
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to reset password', 'error');
    }
  };

  const columns = [
    { field: 'username', headerName: 'Username', flex: 1, minWidth: 120 },
    { field: 'fullName', headerName: 'Full Name', flex: 1.2, minWidth: 150 },
    { field: 'email', headerName: 'Email', flex: 1.2, minWidth: 160 },
    { field: 'mobile', headerName: 'Mobile', width: 130 },
    { field: 'roleName', headerName: 'Role', width: 140 },
    {
      field: 'isActive',
      headerName: 'Status',
      width: 110,
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Active' : 'Inactive'}
          color={params.value ? 'success' : 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'isLocked',
      headerName: 'Lock Status',
      width: 120,
      renderCell: (params) =>
        params.value ? (
          <Chip label="Locked" color="error" size="small" />
        ) : (
          <Chip label="Normal" color="default" variant="outlined" size="small" />
        ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 170,
      sortable: false,
      renderCell: (params) => {
        const u = params.row;
        const canEdit = hasPermission('Users', 'Edit');
        return (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {canEdit && (
              <Tooltip title="Edit User">
                <IconButton size="small" color="primary" onClick={() => handleOpenEdit(u)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {canEdit && u.isLocked && (
              <Tooltip title="Unlock Account">
                <IconButton size="small" color="warning" onClick={() => handleUnlock(u.id)}>
                  <UnlockIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {canEdit && (
              <Tooltip title={u.isActive ? 'Deactivate User' : 'Activate User'}>
                <IconButton
                  size="small"
                  color={u.isActive ? 'error' : 'success'}
                  onClick={() => {
                    setTargetUser(u);
                    setStatusConfirmOpen(true);
                  }}
                >
                  {u.isActive ? <BlockIcon fontSize="small" /> : <ActiveIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
            )}
            {canEdit && (
              <Tooltip title="Reset Password">
                <IconButton
                  size="small"
                  color="secondary"
                  onClick={() => {
                    setResetUserId(u.id);
                    setNewPassword('Welcome@123');
                    setResetModalOpen(true);
                  }}
                >
                  <ResetKeyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        );
      },
    },
  ];

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            User Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage system users, branch access, account unlock, and password resets
          </Typography>
        </div>
      </Box>

      {/* Filter Toolbar */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={5}>
            <Box component="form" onSubmit={handleSearchSubmit} sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search username, name, email or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Button variant="contained" type="submit" startIcon={<SearchIcon />}>
                Search
              </Button>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              select
              fullWidth
              size="small"
              label="Filter by Role"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              <MenuItem value="">All Roles</MenuItem>
              {roles.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  {r.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      {/* DataGrid */}
      <DataGrid
        menuKey="Users"
        columns={columns}
        rows={users}
        rowCount={totalCount}
        loading={loading}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        onAddClick={handleOpenAdd}
        addLabel="Add User"
      />

      {/* Add / Edit User Modal */}
      <Modal
        open={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        title={editingUserId ? 'Edit User' : 'Create New User'}
        maxWidth="sm"
        formId="user-form"
        submitLabel={editingUserId ? 'Save Changes' : 'Create User'}
      >
        <Box component="form" id="user-form" onSubmit={handleSaveUser} sx={{ mt: 1 }}>
          <Grid container spacing={2}>
            {!editingUserId && (
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  label="Username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                />
              </Grid>
            )}
            {!editingUserId && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Password"
                  placeholder="Defaults to Admin@123"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </Grid>
            )}
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                label="Full Name"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email Address"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Mobile Number"
                value={formData.mobile}
                inputProps={{ maxLength: 10, inputMode: 'numeric', pattern: '[0-9]*' }}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setFormData({ ...formData, mobile: val });
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                required
                fullWidth
                label="User Type"
                value={formData.userType}
                onChange={(e) => setFormData({ ...formData, userType: Number(e.target.value) })}
              >
                <MenuItem value={2}>School Admin</MenuItem>
                <MenuItem value={3}>Principal</MenuItem>
                <MenuItem value={4}>Teacher</MenuItem>
                <MenuItem value={5}>Accountant</MenuItem>
                <MenuItem value={6}>Parent</MenuItem>
                <MenuItem value={7}>Student</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                required
                fullWidth
                label="Assigned Role"
                value={formData.roleId}
                onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
              >
                {roles.map((r) => (
                  <MenuItem key={r.id} value={r.id}>
                    {r.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
        </Box>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        open={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="Reset Password"
        maxWidth="xs"
        formId="reset-password-form"
        submitLabel="Reset Password"
        confirmColor="secondary"
      >
        <Box component="form" id="reset-password-form" onSubmit={handleResetPassword}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter a temporary password. The user will be required to change it on their next login.
          </Typography>
          <TextField
            required
            fullWidth
            label="New Temporary Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </Box>
      </Modal>

      {/* Status Toggle Confirm */}
      <ConfirmDialog
        open={statusConfirmOpen}
        title={targetUser?.isActive ? 'Deactivate User' : 'Activate User'}
        message={`Are you sure you want to ${
          targetUser?.isActive ? 'deactivate' : 'activate'
        } user "${targetUser?.username}"? ${
          targetUser?.isActive ? 'All current active sessions will be terminated immediately.' : ''
        }`}
        confirmColor={targetUser?.isActive ? 'error' : 'success'}
        onConfirm={handleToggleStatus}
        onCancel={() => setStatusConfirmOpen(false)}
      />
    </Box>
  );
};
