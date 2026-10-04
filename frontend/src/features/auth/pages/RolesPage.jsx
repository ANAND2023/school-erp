import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Chip,
  IconButton,
  Tooltip,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Checkbox,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { DataGrid } from '../../../components/DataGrid';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { roleApi } from '../api';
import { useUiStore } from '../../../store/uiStore';
import { usePermission } from '../../../hooks/usePermission';

const ALL_MENUS = [
  { key: 'Dashboard', label: 'Dashboard' },
  { key: 'Users', label: 'User Management' },
  { key: 'Roles', label: 'Roles & Permissions' },
  { key: 'AuditLogs', label: 'Audit Logs' },
  { key: 'Branch', label: 'School & Branch Master' },
  { key: 'AcademicYears', label: 'Academic Years' },
  { key: 'Classes', label: 'Classes & Sections' },
  { key: 'Subjects', label: 'Subjects' },
  { key: 'ClassSubjects', label: 'Class-Subject Mapping' },
  { key: 'SimpleMasters', label: 'Simple Masters' },
  { key: 'Enquiries', label: 'Enquiry Management' },
  { key: 'Admissions', label: 'Student Admissions' },
  { key: 'Students', label: 'Student Directory' },
  { key: 'RollNumbers', label: 'Roll Number Assignment' },
  { key: 'SectionChange', label: 'Section Change' },
  { key: 'Staff', label: 'Staff Directory' },
  { key: 'TeacherAllocation', label: 'Teacher Allocation' },
  { key: 'FeeStructure', label: 'Fee Structure' },
  { key: 'FeeCollection', label: 'Fee Collection' },
  { key: 'FeeConcessions', label: 'Fee Concessions' },
  { key: 'FeeReports', label: 'Fee Reports' },
  { key: 'StudentAttendance', label: 'Student Attendance' },
  { key: 'StaffAttendance', label: 'Staff Attendance' },
  { key: 'Timetable', label: 'Timetable Management' },
  { key: 'ExamSchedules', label: 'Exam Schedules' },
  { key: 'MarksEntry', label: 'Marks Entry' },
  { key: 'ReportCards', label: 'Report Cards' },
  { key: 'Promotion', label: 'Student Promotion' },
  { key: 'TransferCertificates', label: 'Transfer Certificates (TC)' },
  { key: 'Reports', label: 'General Reports' },
];

const ACTIONS = ['canView', 'canAdd', 'canEdit', 'canDelete', 'canPrint', 'canExport'];
const ACTION_LABELS = {
  canView: 'View',
  canAdd: 'Add',
  canEdit: 'Edit',
  canDelete: 'Delete',
  canPrint: 'Print',
  canExport: 'Export',
};

export const RolesPage = () => {
  const { showSnackbar } = useUiStore();
  const { hasPermission } = usePermission();

  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [roleName, setRoleName] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  const [permissionsMap, setPermissionsMap] = useState({});

  // Delete State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [targetRoleId, setTargetRoleId] = useState(null);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const res = await roleApi.getRoles();
      if (res.data.success) {
        setRoles(res.data.data || []);
      }
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to load roles', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const initPermissionsMap = (existing = []) => {
    const map = {};
    ALL_MENUS.forEach((menu) => {
      const match = existing.find((p) => p.menu.toLowerCase() === menu.key.toLowerCase());
      map[menu.key] = {
        canView: match ? !!match.canView : false,
        canAdd: match ? !!match.canAdd : false,
        canEdit: match ? !!match.canEdit : false,
        canDelete: match ? !!match.canDelete : false,
        canPrint: match ? !!match.canPrint : false,
        canExport: match ? !!match.canExport : false,
      };
    });
    return map;
  };

  const handleOpenAdd = () => {
    setEditingRoleId(null);
    setRoleName('');
    setRoleDesc('');
    setPermissionsMap(initPermissionsMap([]));
    setModalOpen(true);
  };

  const handleOpenEdit = async (role) => {
    try {
      const res = await roleApi.getRole(role.id);
      if (res.data.success) {
        const fullRole = res.data.data;
        setEditingRoleId(fullRole.id);
        setRoleName(fullRole.name);
        setRoleDesc(fullRole.description || '');
        setPermissionsMap(initPermissionsMap(fullRole.permissions || []));
        setModalOpen(true);
      }
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to load role details', 'error');
    }
  };

  // Matrix Checkbox Change
  const handlePermissionChange = (menuKey, actionKey, checked) => {
    setPermissionsMap((prev) => ({
      ...prev,
      [menuKey]: {
        ...prev[menuKey],
        [actionKey]: checked,
      },
    }));
  };

  // Row Select All
  const handleRowSelectAll = (menuKey, checked) => {
    setPermissionsMap((prev) => ({
      ...prev,
      [menuKey]: ACTIONS.reduce((acc, act) => ({ ...acc, [act]: checked }), {}),
    }));
  };

  // Column Select All
  const handleColumnSelectAll = (actionKey, checked) => {
    setPermissionsMap((prev) => {
      const updated = { ...prev };
      ALL_MENUS.forEach((menu) => {
        updated[menu.key] = {
          ...updated[menu.key],
          [actionKey]: checked,
        };
      });
      return updated;
    });
  };

  // Global Select All
  const handleGlobalSelectAll = (checked) => {
    const updated = {};
    ALL_MENUS.forEach((menu) => {
      updated[menu.key] = ACTIONS.reduce((acc, act) => ({ ...acc, [act]: checked }), {});
    });
    setPermissionsMap(updated);
  };

  const handleSaveRole = async (e) => {
    e.preventDefault();
    if (!roleName.trim()) {
      showSnackbar('Role name is required', 'warning');
      return;
    }

    const permissions = ALL_MENUS.map((m) => ({
      menu: m.key,
      canView: !!permissionsMap[m.key]?.canView,
      canAdd: !!permissionsMap[m.key]?.canAdd,
      canEdit: !!permissionsMap[m.key]?.canEdit,
      canDelete: !!permissionsMap[m.key]?.canDelete,
      canPrint: !!permissionsMap[m.key]?.canPrint,
      canExport: !!permissionsMap[m.key]?.canExport,
    }));

    try {
      if (editingRoleId) {
        await roleApi.updateRole(editingRoleId, {
          name: roleName.trim(),
          description: roleDesc,
          permissions,
        });
        showSnackbar('Role and permissions updated successfully', 'success');
      } else {
        await roleApi.createRole({
          name: roleName.trim(),
          description: roleDesc,
          permissions,
        });
        showSnackbar('Role created successfully', 'success');
      }
      setModalOpen(false);
      fetchRoles();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Error saving role', 'error');
    }
  };

  const handleDeleteRole = async () => {
    if (!targetRoleId) return;
    try {
      await roleApi.deleteRole(targetRoleId);
      showSnackbar('Role deleted successfully', 'success');
      setDeleteConfirmOpen(false);
      fetchRoles();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Cannot delete role', 'error');
    }
  };

  const columns = [
    { field: 'name', headerName: 'Role Name', flex: 1, minWidth: 150 },
    { field: 'description', headerName: 'Description', flex: 2, minWidth: 200 },
    {
      field: 'isSystemRole',
      headerName: 'Type',
      width: 140,
      renderCell: (params) =>
        params.value ? (
          <Chip label="System Role" color="primary" size="small" variant="outlined" />
        ) : (
          <Chip label="Custom Role" color="default" size="small" />
        ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 130,
      sortable: false,
      renderCell: (params) => {
        const r = params.row;
        const canEdit = hasPermission('Roles', 'Edit');
        const canDelete = hasPermission('Roles', 'Delete');

        return (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {canEdit && (
              <Tooltip title="Edit Permissions">
                <IconButton size="small" color="primary" onClick={() => handleOpenEdit(r)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {canDelete && !r.isSystemRole && (
              <Tooltip title="Delete Role">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => {
                    setTargetRoleId(r.id);
                    setDeleteConfirmOpen(true);
                  }}
                >
                  <DeleteIcon fontSize="small" />
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
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Role & Permission Matrix
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure roles and menu-level actions (View, Add, Edit, Delete, Print, Export)
        </Typography>
      </Box>

      <DataGrid
        menuKey="Roles"
        columns={columns}
        rows={roles}
        loading={loading}
        onAddClick={handleOpenAdd}
        addLabel="Create New Role"
      />

      {/* Role & Matrix Dialog */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>
          {editingRoleId ? 'Edit Role & Permissions Matrix' : 'Create Role & Permissions Matrix'}
        </DialogTitle>
        <Box component="form" onSubmit={handleSaveRole}>
          <DialogContent dividers sx={{ maxHeight: '75vh' }}>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  label="Role Name"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Description"
                  value={roleDesc}
                  onChange={(e) => setRoleDesc(e.target.value)}
                />
              </Grid>
            </Grid>

            {/* Matrix Header Controls */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 1.5,
                p: 1.5,
                bgcolor: '#f5f5f5',
                borderRadius: 1,
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                <SecurityIcon fontSize="small" sx={{ mr: 1 }} />
                Menu Permissions Matrix (FR-1.6)
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button size="small" variant="outlined" onClick={() => handleGlobalSelectAll(true)}>
                  Select All
                </Button>
                <Button size="small" variant="outlined" color="inherit" onClick={() => handleGlobalSelectAll(false)}>
                  Clear All
                </Button>
              </Box>
            </Box>

            {/* Matrix Table */}
            <Paper variant="outlined" sx={{ maxHeight: '58vh', overflow: 'auto', borderRadius: 1.5, position: 'relative' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, bgcolor: '#f1f5f9 !important', zIndex: 11, borderBottom: '2px solid #cbd5e1' }}>
                      Menu / Screen
                    </TableCell>
                    {ACTIONS.map((action) => {
                      const allChecked = ALL_MENUS.length > 0 && ALL_MENUS.every((m) => !!permissionsMap[m.key]?.[action]);
                      const someChecked = ALL_MENUS.some((m) => !!permissionsMap[m.key]?.[action]);
                      const indeterminate = someChecked && !allChecked;

                      return (
                        <TableCell
                          key={action}
                          align="center"
                          sx={{ fontWeight: 700, bgcolor: '#f1f5f9 !important', zIndex: 11, borderBottom: '2px solid #cbd5e1', minWidth: 70 }}
                        >
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.25, color: '#1e293b' }}>
                              {ACTION_LABELS[action]}
                            </Typography>
                            <Checkbox
                              size="small"
                              checked={allChecked}
                              indeterminate={indeterminate}
                              onChange={(e) => handleColumnSelectAll(action, e.target.checked)}
                              sx={{ p: 0.25 }}
                            />
                          </Box>
                        </TableCell>
                      );
                    })}
                    <TableCell
                      align="center"
                      sx={{ fontWeight: 700, bgcolor: '#f1f5f9 !important', zIndex: 11, borderBottom: '2px solid #cbd5e1', minWidth: 70 }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#1e293b' }}>
                        Row All
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ALL_MENUS.map((menu) => {
                    const rowPerms = permissionsMap[menu.key] || {};
                    const isRowAll = ACTIONS.every((act) => rowPerms[act]);

                    return (
                      <TableRow key={menu.key} hover>
                        <TableCell sx={{ fontWeight: 500, py: 0.75 }}>{menu.label}</TableCell>
                        {ACTIONS.map((action) => (
                          <TableCell key={action} align="center" sx={{ py: 0.5 }}>
                            <Checkbox
                              size="small"
                              checked={!!rowPerms[action]}
                              onChange={(e) =>
                                handlePermissionChange(menu.key, action, e.target.checked)
                              }
                            />
                          </TableCell>
                        ))}
                        <TableCell align="center" sx={{ py: 0.5 }}>
                          <Checkbox
                            size="small"
                            checked={isRowAll}
                            onChange={(e) => handleRowSelectAll(menu.key, e.target.checked)}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Paper>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setModalOpen(false)} color="inherit">
              Cancel
            </Button>
            <Button type="submit" variant="contained">
              Save Role & Permissions
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Delete Role Confirm */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete Role"
        message="Are you sure you want to delete this custom role? This action cannot be undone."
        confirmColor="error"
        onConfirm={handleDeleteRole}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </Box>
  );
};
