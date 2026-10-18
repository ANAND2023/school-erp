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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
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
  // Dashboard
  { key: 'Dashboard', label: 'Dashboard' },
  
  // Auth & Access
  { key: 'Users', label: 'User Management' },
  { key: 'Roles', label: 'Roles & Permissions' },
  
  // Masters
  { key: 'Branch', label: 'School & Branch Master' },
  { key: 'AcademicYears', label: 'Academic Years' },
  { key: 'Classes', label: 'Classes & Sections' },
  { key: 'Subjects', label: 'Subjects' },
  { key: 'ClassSubjects', label: 'Class-Subject Mapping' },
  { key: 'SimpleMasters', label: 'Simple Masters' },
  { key: 'NumberingSeries', label: 'Numbering Series' },
  { key: 'BulkStudentUpload', label: 'Bulk Student Upload' },

  // Students & Admission
  { key: 'Enquiries', label: 'Enquiry Management' },
  { key: 'Admissions', label: 'Student Admissions' },
  { key: 'Students', label: 'Student Directory' },
  { key: 'RollNumbers', label: 'Roll Number Assignment' },
  { key: 'SectionChange', label: 'Section Change' },
  { key: 'IDCardSettings', label: 'ID Card Settings' },
  { key: 'PrintIDCards', label: 'Print ID Cards' },

  // Staff & HR
  { key: 'Staff', label: 'Staff Directory' },
  { key: 'TeacherAllocation', label: 'Teacher Allocation' },

  // Fees Management
  { key: 'FeeStructure', label: 'Fee Structure' },
  { key: 'FeeAssignment', label: 'Fee Assignment' },
  { key: 'FeeCollection', label: 'Fee Collection' },
  { key: 'DemandBill', label: 'Demand Bill' },
  { key: 'FeeConcessions', label: 'Fee Concessions' },
  { key: 'FeeReports', label: 'Fee Reports' },

  // Attendance & Timetable
  { key: 'StudentAttendance', label: 'Student Attendance' },
  { key: 'StaffAttendance', label: 'Staff Attendance' },
  { key: 'LeaveManagement', label: 'Leave Management' },
  { key: 'AttendanceReports', label: 'Attendance Reports' },
  { key: 'HolidayCalendar', label: 'Holiday Calendar' },
  { key: 'ClassTimetable', label: 'Class Timetable' },
  { key: 'TeacherTimetable', label: 'Teacher Timetable' },
  { key: 'Substitutions', label: 'Substitutions' },

  // Examinations
  { key: 'ExamSchedules', label: 'Exam Schedules' },
  { key: 'MarksEntry', label: 'Marks Entry' },
  { key: 'ReportCards', label: 'Report Cards' },

  // Transport
  { key: 'Vehicles', label: 'Vehicles' },
  { key: 'RoutesStops', label: 'Routes & Stops' },
  { key: 'TransportAllocations', label: 'Student Allocations' },

  // Promotion & TC
  { key: 'Promotion', label: 'Student Promotion' },
  { key: 'TransferCertificates', label: 'Transfer Certificates (TC)' },

  // Inventory & Stock
  { key: 'InventoryOverview', label: 'Inventory Overview' },
  { key: 'ItemsMaster', label: 'Items Master' },
  { key: 'ItemCategories', label: 'Item Categories' },
  { key: 'Suppliers', label: 'Suppliers / Vendors' },
  { key: 'Manufactures', label: 'Manufactures' },
  { key: 'StockInward', label: 'Stock Inward (Purchase)' },
  { key: 'StockIssue', label: 'Stock Issue (Outward)' },
  { key: 'StockLedger', label: 'Stock Movement Ledger' },

  // Expenses
  { key: 'Expenses', label: 'Expense Management' },

  // Reports
  { key: 'Reports', label: 'General Reports' },
];

const MENU_GROUPS = [
  { group: 'All Modules', keys: ALL_MENUS.map(m => m.key) },
  { group: 'Dashboard', keys: ['Dashboard'] },
  { group: 'Auth & Access', keys: ['Users', 'Roles', 'AuditLogs'] },
  { group: 'Masters', keys: ['Branch', 'AcademicYears', 'Classes', 'Subjects', 'ClassSubjects', 'SimpleMasters', 'NumberingSeries', 'BulkStudentUpload'] },
  { group: 'Students & Admission', keys: ['Enquiries', 'Admissions', 'Students', 'RollNumbers', 'SectionChange', 'IDCardSettings', 'PrintIDCards'] },
  { group: 'Staff & HR', keys: ['Staff', 'TeacherAllocation'] },
  { group: 'Fees Management', keys: ['FeeStructure', 'FeeAssignment', 'FeeCollection', 'DemandBill', 'FeeConcessions', 'FeeReports'] },
  { group: 'Attendance & Timetable', keys: ['StudentAttendance', 'StaffAttendance', 'LeaveManagement', 'AttendanceReports', 'HolidayCalendar', 'ClassTimetable', 'TeacherTimetable', 'Substitutions'] },
  { group: 'Examinations', keys: ['ExamSchedules', 'MarksEntry', 'ReportCards'] },
  { group: 'Transport', keys: ['Vehicles', 'RoutesStops', 'TransportAllocations'] },
  { group: 'Promotion & TC', keys: ['Promotion', 'TransferCertificates'] },
  { group: 'Inventory & Stock', keys: ['InventoryOverview', 'ItemsMaster', 'ItemCategories', 'Suppliers', 'Manufactures', 'StockInward', 'StockIssue', 'StockLedger'] },
  { group: 'Expenses', keys: ['Expenses'] },
  { group: 'Reports', keys: ['Reports'] }
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
  const [selectedGroup, setSelectedGroup] = useState('All Modules');
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
      visibleMenus.forEach((menu) => {
        updated[menu.key] = {
          ...updated[menu.key],
          [actionKey]: checked,
        };
      });
      return updated;
    });
  };

  const visibleMenus = selectedGroup === 'All Modules'
    ? ALL_MENUS
    : ALL_MENUS.filter(m => MENU_GROUPS.find(g => g.group === selectedGroup)?.keys.includes(m.key));

  // Global Select All (Acts on visible menus only)
  const handleGlobalSelectAll = (checked) => {
    const updated = { ...permissionsMap };
    visibleMenus.forEach((menu) => {
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
    <Box sx={{ pb: 4 }}>
      <Box sx={{ mb: { xs: 2, sm: 3 } }}>
        <Typography variant="h5" sx={{ fontWeight: 800, fontSize: { xs: '1.15rem', sm: '1.45rem' } }}>
          Role & Permission Matrix
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.74rem', sm: '0.85rem' }, mt: 0.25 }}>
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
        <DialogTitle sx={{ fontWeight: 700, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          {editingRoleId ? 'Edit Role & Permissions Matrix' : 'Create Role & Permissions Matrix'}
        </DialogTitle>
        <Box component="form" onSubmit={handleSaveRole} sx={{ display: 'flex', flexDirection: 'column', height: { xs: '90vh', sm: '80vh' } }}>
          <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', p: { xs: 1.5, sm: 2 } }}>
            <Grid container spacing={{ xs: 1.25, sm: 2 }} sx={{ mb: 2, flexShrink: 0 }}>
              <Grid item xs={12} sm={4}>
                <TextField
                  required
                  fullWidth
                  label="Role Name"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={5}>
                <TextField
                  fullWidth
                  label="Description"
                  value={roleDesc}
                  onChange={(e) => setRoleDesc(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth>
                  <InputLabel>Module Group</InputLabel>
                  <Select
                    value={selectedGroup}
                    label="Module Group"
                    onChange={(e) => setSelectedGroup(e.target.value)}
                  >
                    {MENU_GROUPS.map((g) => (
                      <MenuItem key={g.group} value={g.group}>{g.group}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {/* Matrix Header Controls */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 1,
                p: 1.5,
                bgcolor: '#f5f5f5',
                borderRadius: 1,
                flexShrink: 0
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
            <Paper variant="outlined" sx={{ flex: 1, overflow: 'auto', borderRadius: 1.5, position: 'relative' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, bgcolor: '#f1f5f9 !important', zIndex: 11, borderBottom: '2px solid #cbd5e1' }}>
                      Menu / Screen
                    </TableCell>
                    {ACTIONS.map((action) => {
                      const allChecked = visibleMenus.length > 0 && visibleMenus.every((m) => !!permissionsMap[m.key]?.[action]);
                      const someChecked = visibleMenus.some((m) => !!permissionsMap[m.key]?.[action]);
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
                  {visibleMenus.map((menu) => {
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
