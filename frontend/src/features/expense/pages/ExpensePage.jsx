import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  Typography,
  Grid,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  CircularProgress,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Tag } from 'primereact/tag';
import { Modal } from '../../../components/Modal';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { AppButton } from '../../../components/common/AppButton';
import apiClient from '../../../api/client';
import { useAcademicYear } from '../../../hooks/useAcademicYear';
import { useThemeStore, shadeColor } from '../../../store/themeStore';
import { useUiStore } from '../../../store/uiStore';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, ChartTooltip, Legend, ArcElement);

export const ExpensePage = () => {
  const { showSnackbar } = useUiStore();
  const { activeAcademicYearId, activeAcademicYearName } = useAcademicYear();
  const { currentColorHex } = useThemeStore();
  const themeColor = currentColorHex || '#14b8a6';
  const themeDarker = shadeColor(themeColor, -20);

  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');

  // Modals
  const [open, setOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);

  // Delete Confirm
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [targetDelete, setTargetDelete] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    categoryId: '',
    amount: '',
    expenseDate: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
    spenderName: '',
    description: '',
  });

  const [catData, setCatData] = useState({ name: '', description: '' });

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/expense', {
        params: { academicYearId: activeAcademicYearId },
      });
      setExpenses(res.data?.data || []);
    } catch (err) {
      console.error(err);
      showSnackbar?.('Error loading expenses for session', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await apiClient.get('/expense/categories');
      setCategories(res.data?.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDashboard = async () => {
    try {
      const res = await apiClient.get('/expense/dashboard', {
        params: { academicYearId: activeAcademicYearId },
      });
      setDashboardData(res.data?.data || null);
    } catch (err) {
      console.error(err);
    }
  };

  // Re-fetch whenever academic session changes!
  useEffect(() => {
    fetchExpenses();
    fetchCategories();
    fetchDashboard();
  }, [activeAcademicYearId]);

  useEffect(() => {
    const handleYearChange = () => {
      fetchExpenses();
      fetchCategories();
      fetchDashboard();
    };
    window.addEventListener('academicYearChanged', handleYearChange);
    return () => window.removeEventListener('academicYearChanged', handleYearChange);
  }, [activeAcademicYearId]);

  const handleSaveExpense = async () => {
    try {
      setSavingExpense(true);
      await apiClient.post('/expense', {
        ...formData,
        academicYearId: activeAcademicYearId,
      });
      setOpen(false);
      showSnackbar?.('Expense saved successfully', 'success');
      fetchExpenses();
      fetchDashboard();
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving expense');
      console.error(err);
    } finally {
      setSavingExpense(false);
    }
  };

  const handleSaveCategory = async () => {
    try {
      setSavingCategory(true);
      await apiClient.post('/expense/categories', catData);
      setCatOpen(false);
      showSnackbar?.('Category saved successfully', 'success');
      fetchCategories();
    } catch (err) {
      console.error(err);
      alert('Error saving category');
    } finally {
      setSavingCategory(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!targetDelete) return;
    try {
      await apiClient.delete(`/expense/${targetDelete.id}`);
      showSnackbar?.('Expense deleted successfully', 'success');
      setDeleteConfirmOpen(false);
      setTargetDelete(null);
      fetchExpenses();
      fetchDashboard();
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting expense');
      console.error(err);
    }
  };

  const handleDeleteExpense = (id, createdOn) => {
    const hoursElapsed = (new Date() - new Date(createdOn + (!createdOn.endsWith('Z') ? 'Z' : ''))) / (1000 * 60 * 60);
    if (hoursElapsed > 10) {
      alert('Expenses cannot be deleted after 10 hours of creation.');
      return;
    }
    setTargetDelete({ id, createdOn });
    setDeleteConfirmOpen(true);
  };

  const handleEditExpense = (expense) => {
    const hoursElapsed = (new Date() - new Date(expense.createdOn + (!expense.createdOn.endsWith('Z') ? 'Z' : ''))) / (1000 * 60 * 60);
    if (hoursElapsed > 10) {
      alert('Expenses cannot be updated after 10 hours of creation.');
      return;
    }
    setFormData({
      id: expense.id,
      title: expense.title,
      categoryId: expense.categoryId,
      amount: expense.amount,
      expenseDate: new Date(new Date(expense.expenseDate + (!expense.expenseDate.endsWith('Z') ? 'Z' : '')).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
      spenderName: expense.spenderName || '',
      description: expense.description || '',
    });
    setOpen(true);
  };

  // Filtered Expenses
  const filteredExpenses = expenses.filter((e) => {
    const term = search.trim().toLowerCase();
    const matchSearch =
      !term ||
      e.title?.toLowerCase().includes(term) ||
      e.spenderName?.toLowerCase().includes(term) ||
      e.category?.name?.toLowerCase().includes(term) ||
      String(e.amount).includes(term);

    const matchCategory =
      !selectedCategoryFilter || String(e.categoryId) === String(selectedCategoryFilter);

    return matchSearch && matchCategory;
  });

  // Chart Data
  const monthlyLabels = dashboardData?.monthlyTrend?.map((d) => d.month) || [];
  const monthlyData = dashboardData?.monthlyTrend?.map((d) => d.amount) || [];

  const categoryLabels = dashboardData?.categoryBreakdown?.map((d) => d.category) || [];
  const categoryData = dashboardData?.categoryBreakdown?.map((d) => d.amount) || [];

  const barChartData = {
    labels: monthlyLabels,
    datasets: [
      {
        label: 'Monthly Expenses',
        data: monthlyData,
        backgroundColor: `${themeColor}99`,
        borderColor: themeColor,
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const doughnutData = {
    labels: categoryLabels,
    datasets: [
      {
        data: categoryData,
        backgroundColor: ['#f43f5e', '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#06b6d4', '#ec4899'],
      },
    ],
  };

  const totalSessionAmount = dashboardData?.totalSessionExpenses || 0;
  const totalCurrentMonthAmount = dashboardData?.totalCurrentMonth || 0;

  return (
    <Box>
      {/* Top Header Card */}
      <div className="flex flex-column sm:flex-row align-items-start sm:align-items-center justify-content-between gap-3 bg-white p-4 border-round-lg shadow-1 border-1 surface-border mb-3">
        <div>
          <div className="flex align-items-center gap-2">
            <h2 className="text-xl font-bold text-slate-800 m-0">Expense Management</h2>
            {activeAcademicYearName && (
              <Tag
                value={`Session: ${activeAcademicYearName}`}
                severity="info"
                style={{ fontSize: '11px', fontWeight: 600 }}
              />
            )}
          </div>
          <p className="text-xs text-slate-500 m-0 mt-1">
            Track operational school expenses, category allocations, and financial outflow for academic session {activeAcademicYearName || 'Current'}
          </p>
        </div>
        <div className="flex align-items-center gap-2 flex-wrap">
          <AppButton
            variant="outlined"
            label="Manage Categories"
            icon="pi pi-tags"
            size="small"
            onClick={() => {
              setCatData({ name: '', description: '' });
              setCatOpen(true);
            }}
          />
          <AppButton
            label="Add Expense"
            icon="pi pi-plus"
            size="small"
            onClick={() => {
              setFormData({
                title: '',
                categoryId: '',
                amount: '',
                expenseDate: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
                spenderName: '',
                description: '',
              });
              setOpen(true);
            }}
          />
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid mb-3">
        <div className="col-12 sm:col-6 lg:col-3">
          <div className="flex align-items-center justify-content-between p-3 bg-white border-round-lg shadow-1 border-1 surface-border">
            <div>
              <span className="text-xs text-slate-500 block mb-1">Session Total Expenses</span>
              <span className="text-2xl font-bold" style={{ color: themeColor }}>
                ₹{Number(totalSessionAmount).toLocaleString()}
              </span>
            </div>
            <div
              className="flex align-items-center justify-content-center border-round p-2"
              style={{ width: '42px', height: '42px', backgroundColor: `${themeColor}15`, color: themeColor }}
            >
              <i className="pi pi-wallet text-xl" />
            </div>
          </div>
        </div>

        <div className="col-12 sm:col-6 lg:col-3">
          <div className="flex align-items-center justify-content-between p-3 bg-white border-round-lg shadow-1 border-1 surface-border">
            <div>
              <span className="text-xs text-slate-500 block mb-1">Current Month Outflow</span>
              <span className="text-2xl font-bold text-rose-600">
                ₹{Number(totalCurrentMonthAmount).toLocaleString()}
              </span>
            </div>
            <div className="flex align-items-center justify-content-center bg-rose-50 text-rose-600 border-round p-2" style={{ width: '42px', height: '42px' }}>
              <i className="pi pi-chart-line text-xl" />
            </div>
          </div>
        </div>

        <div className="col-12 sm:col-6 lg:col-3">
          <div className="flex align-items-center justify-content-between p-3 bg-white border-round-lg shadow-1 border-1 surface-border">
            <div>
              <span className="text-xs text-slate-500 block mb-1">Recorded Expenses</span>
              <span className="text-2xl font-bold text-slate-800">{expenses.length} Entries</span>
            </div>
            <div className="flex align-items-center justify-content-center bg-blue-50 text-blue-600 border-round p-2" style={{ width: '42px', height: '42px' }}>
              <i className="pi pi-receipt text-xl" />
            </div>
          </div>
        </div>

        <div className="col-12 sm:col-6 lg:col-3">
          <div className="flex align-items-center justify-content-between p-3 bg-white border-round-lg shadow-1 border-1 surface-border">
            <div>
              <span className="text-xs text-slate-500 block mb-1">Active Categories</span>
              <span className="text-2xl font-bold text-emerald-600">{categories.length}</span>
            </div>
            <div className="flex align-items-center justify-content-center bg-emerald-50 text-emerald-600 border-round p-2" style={{ width: '42px', height: '42px' }}>
              <i className="pi pi-tags text-xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Graphs */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ p: 2.5, height: 360, borderRadius: 2 }}>
            <div className="flex align-items-center justify-content-between mb-2">
              <Typography variant="subtitle1" fontWeight="bold">
                Session Monthly Outflow Trend ({activeAcademicYearName || 'Current'})
              </Typography>
              <Tag
                value={monthlyLabels.length > 0 ? `${monthlyLabels.length} Active Months` : 'No Data'}
                severity={monthlyLabels.length > 0 ? 'info' : 'secondary'}
                style={{ fontSize: '10px' }}
              />
            </div>
            <Box height={280}>
              {monthlyLabels.length > 0 ? (
                <Bar data={barChartData} options={{ maintainAspectRatio: false }} />
              ) : (
                <div className="flex flex-column align-items-center justify-content-center h-full gap-2 text-slate-400">
                  <i className="pi pi-chart-bar text-4xl" />
                  <span className="text-sm">No expenses recorded for session {activeAcademicYearName || ''}</span>
                </div>
              )}
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ p: 2.5, height: 360, borderRadius: 2 }}>
            <div className="flex align-items-center justify-content-between mb-2">
              <Typography variant="subtitle1" fontWeight="bold">
                {dashboardData?.breakdownTitle || 'Category Breakdown'}
              </Typography>
              <span className="text-xs font-bold" style={{ color: themeColor }}>
                ₹{Number(totalCurrentMonthAmount || totalSessionAmount).toLocaleString()}
              </span>
            </div>
            <Box height={280} display="flex" justifyContent="center" alignItems="center">
              {categoryData.length > 0 ? (
                <Doughnut data={doughnutData} options={{ maintainAspectRatio: false }} />
              ) : (
                <div className="flex flex-column align-items-center justify-content-center h-full gap-2 text-slate-400">
                  <i className="pi pi-pie-chart text-4xl" />
                  <span className="text-sm">No category distribution data</span>
                </div>
              )}
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* Expense List & Search Bar Card */}
      <div className="bg-white border-round-lg shadow-1 border-1 surface-border p-3 mb-3">
        <div className="flex flex-column sm:flex-row align-items-start sm:align-items-center justify-content-between gap-3 mb-3">
          <div className="flex align-items-center gap-2">
            <h3 className="text-base font-bold text-slate-800 m-0">Expenses for Session:</h3>
            <Tag
              value={activeAcademicYearName || 'Current'}
              severity="success"
              style={{ fontSize: '11px' }}
            />
            <span className="text-xs text-slate-400 font-semibold">
              ({filteredExpenses.length} of {expenses.length} entries)
            </span>
          </div>

          <div className="flex align-items-center gap-2 w-full sm:w-auto">
            {/* Category Filter */}
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Category</InputLabel>
              <Select
                label="Category"
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              >
                <MenuItem value="">All Categories</MenuItem>
                {categories.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Search Input */}
            <TextField
              size="small"
              placeholder="Search title, spender..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ minWidth: 200 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                endAdornment: search ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearch('')}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
            />
          </div>
        </div>

        {/* Expenses Table */}
        <TableContainer sx={{ border: '1px solid #f1f5f9', borderRadius: 2 }}>
          {loading ? (
            <div className="flex flex-column align-items-center justify-content-center p-6 gap-2">
              <CircularProgress size={30} />
              <span className="text-xs text-slate-500">Loading session expenses...</span>
            </div>
          ) : (
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, width: 160, py: 1.5 }}>Date & Time</TableCell>
                  <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Title</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 160, py: 1.5 }}>Spender Name</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 160, py: 1.5 }}>Category</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 140, py: 1.5 }}>Amount</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 100, textAlign: 'center', py: 1.5 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      <div className="flex flex-column align-items-center justify-content-center gap-2 text-slate-400">
                        <i className="pi pi-receipt text-3xl" />
                        <span className="text-sm font-semibold text-slate-700">
                          No expenses recorded for academic session {activeAcademicYearName || ''}
                        </span>
                        <span className="text-xs text-slate-400">
                          {search || selectedCategoryFilter
                            ? 'Try clearing your search or category filter.'
                            : 'Click "+ Add Expense" above to record a new expense in this session.'}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExpenses.map((e) => (
                    <TableRow key={e.id} hover>
                      <TableCell sx={{ py: 1.5, fontSize: '13px' }}>
                        {new Date(e.expenseDate + (!e.expenseDate.endsWith('Z') ? 'Z' : '')).toLocaleString()}
                      </TableCell>
                      <TableCell sx={{ py: 1.5, fontWeight: 600, color: '#1e293b' }}>
                        {e.title}
                        {e.description && (
                          <span className="block text-xs text-slate-400 font-normal">
                            {e.description}
                          </span>
                        )}
                      </TableCell>
                      <TableCell sx={{ py: 1.5, fontSize: '13px' }}>
                        {e.spenderName || <span className="text-slate-400">—</span>}
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Tag
                          value={e.category?.name || 'Uncategorized'}
                          severity="info"
                          style={{ fontSize: '10px', padding: '1px 6px' }}
                        />
                      </TableCell>
                      <TableCell sx={{ py: 1.5, fontWeight: 700, color: '#047857', fontSize: '13px' }}>
                        ₹{Number(e.amount).toLocaleString()}
                      </TableCell>
                      <TableCell sx={{ py: 1.5, textAlign: 'center' }}>
                        <div className="flex align-items-center justify-content-center gap-1">
                          <Tooltip title="Edit Expense (Within 10h)">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleEditExpense(e)}
                              sx={{ width: 28, height: 28 }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Expense (Within 10h)">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteExpense(e.id, e.createdOn)}
                              sx={{ width: 28, height: 28 }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </TableContainer>
      </div>

      {/* Add / Edit Expense Modal */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={formData.id ? 'Edit Expense' : 'Add Expense'}
        icon="pi pi-receipt"
        maxWidth="sm"
        onConfirm={handleSaveExpense}
        confirmText="Save Expense"
        confirmLoading={savingExpense}
        confirmDisabled={!formData.title || !formData.categoryId || !formData.amount || savingExpense}
      >
        <Box sx={{ mt: 1 }}>
          <div className="p-2 mb-3 surface-50 border-round border-1 surface-border flex align-items-center justify-content-between">
            <span className="text-xs text-slate-500">Academic Session:</span>
            <Tag value={activeAcademicYearName || 'Current Session'} severity="info" style={{ fontSize: '10px' }} />
          </div>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                label="Expense Title"
                placeholder="e.g. Science Lab Equipment, Annual Day Banners"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Category</InputLabel>
                <Select
                  label="Category"
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                >
                  {categories.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="Amount (₹)"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                type="datetime-local"
                label="Date & Time"
                InputLabelProps={{ shrink: true }}
                value={formData.expenseDate}
                onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Spender Name / Department"
                placeholder="e.g. John Doe / Sports Dept"
                value={formData.spenderName}
                onChange={(e) => setFormData({ ...formData, spenderName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description & Remarks"
                multiline
                rows={3}
                placeholder="Optional expense description, receipt notes, vendor details..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>
          </Grid>
        </Box>
      </Modal>

      {/* Add Category Modal */}
      <Modal
        open={catOpen}
        onClose={() => setCatOpen(false)}
        title="Manage / Add Category"
        icon="pi pi-tags"
        maxWidth="xs"
        onConfirm={handleSaveCategory}
        confirmText="Save Category"
        confirmLoading={savingCategory}
        confirmDisabled={!catData.name || savingCategory}
      >
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12}>
            <TextField
              required
              fullWidth
              label="Category Name"
              placeholder="e.g. Laboratory, Sports, Maintenance"
              value={catData.name}
              onChange={(e) => setCatData({ ...catData, name: e.target.value })}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              placeholder="Brief description of this expense category"
              multiline
              rows={2}
              value={catData.description}
              onChange={(e) => setCatData({ ...catData, description: e.target.value })}
            />
          </Grid>
        </Grid>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete Expense"
        message="Are you sure you want to delete this expense record? This action cannot be undone."
        confirmColor="error"
        confirmLabel="Delete Expense"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setTargetDelete(null);
        }}
      />
    </Box>
  );
};

export default ExpensePage;
