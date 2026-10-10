import React, { useState, useEffect } from 'react';
import { Box, Card, Typography, Grid, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem, InputLabel, FormControl, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip as ChartTooltip, Legend, ArcElement } from 'chart.js';
import apiClient from '../../../api/client';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, ChartTooltip, Legend, ArcElement);

export const ExpensePage = () => {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  
  const [open, setOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    categoryId: '',
    amount: '',
    expenseDate: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16), spenderName: '',
    description: ''
  });
  
  const [catData, setCatData] = useState({ name: '', description: '' });

  useEffect(() => {
    fetchExpenses();
    fetchCategories();
    fetchDashboard();
  }, []);

  const fetchExpenses = async () => {
    try {
      const res = await apiClient.get('/expense');
      setExpenses(res.data?.data || []);
    } catch (err) {
      console.error(err);
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
      const res = await apiClient.get('/expense/dashboard');
      setDashboardData(res.data?.data || null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveExpense = async () => {
    try {
      await apiClient.post('/expense', formData);
      setOpen(false);
      fetchExpenses();
      fetchDashboard();
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving expense');
      console.error(err);
    }
  };

  const handleSaveCategory = async () => {
    try {
      await apiClient.post('/expense/categories', catData);
      setCatOpen(false);
      fetchCategories();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteExpense = async (id, createdOn) => {
    const hoursElapsed = (new Date() - new Date(createdOn + (!createdOn.endsWith('Z') ? 'Z' : ''))) / (1000 * 60 * 60);
    if (hoursElapsed > 10) {
      alert("Expenses cannot be deleted after 10 hours of creation.");
      return;
    }
    if (window.confirm("Are you sure?")) {
      try {
        await apiClient.delete(`/expense/${id}`);
        fetchExpenses();
        fetchDashboard();
      } catch (err) {
        alert(err.response?.data?.message || 'Error deleting expense');
        console.error(err);
      }
    }
  };

  const handleEditExpense = (expense) => {
    const hoursElapsed = (new Date() - new Date(expense.createdOn + (!expense.createdOn.endsWith('Z') ? 'Z' : ''))) / (1000 * 60 * 60);
    if (hoursElapsed > 10) {
      alert("Expenses cannot be updated after 10 hours of creation.");
      return;
    }
    setFormData({
      id: expense.id,
      title: expense.title,
      categoryId: expense.categoryId,
      amount: expense.amount,
      expenseDate: new Date(new Date(expense.expenseDate + (!expense.expenseDate.endsWith('Z') ? 'Z' : '')).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
      spenderName: expense.spenderName || '',
      description: expense.description || ''
    });
    setOpen(true);
  };

  // Chart Data
  const monthlyLabels = dashboardData?.monthlyTrend?.map(d => d.month) || [];
  const monthlyData = dashboardData?.monthlyTrend?.map(d => d.amount) || [];
  
  const categoryLabels = dashboardData?.categoryBreakdown?.map(d => d.category) || [];
  const categoryData = dashboardData?.categoryBreakdown?.map(d => d.amount) || [];

  const barChartData = {
    labels: monthlyLabels,
    datasets: [{
      label: 'Monthly Expenses',
      data: monthlyData,
      backgroundColor: 'rgba(54, 162, 235, 0.6)',
    }]
  };

  const doughnutData = {
    labels: categoryLabels,
    datasets: [{
      data: categoryData,
      backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'],
    }]
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">Expense Management</Typography>
        <Box>
          <Button variant="outlined" onClick={() => { setCatData({name:'', description:''}); setCatOpen(true); }} sx={{ mr: 2 }}>
            Manage Categories
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { 
            setFormData({ title: '', categoryId: '', amount: '', expenseDate: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16), spenderName: '', description: ''});
            setOpen(true);
          }}>
            Add Expense
          </Button>
        </Box>
      </Box>

      {/* Dashboard Graphs */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={8}>
          <Card sx={{ p: 2, height: 350 }}>
            <Typography variant="h6" mb={2}>6-Month Trend</Typography>
            <Box height={280}>
              <Bar data={barChartData} options={{ maintainAspectRatio: false }} />
            </Box>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 2, height: 350 }}>
            <Typography variant="h6" mb={2}>Current Month Breakdown (₹{dashboardData?.totalCurrentMonth || 0})</Typography>
            <Box height={280} display="flex" justifyContent="center">
              {categoryData.length > 0 ? (
                <Doughnut data={doughnutData} options={{ maintainAspectRatio: false }} />
              ) : (
                <Typography color="textSecondary" alignSelf="center">No expenses this month</Typography>
              )}
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* Expense List */}
      <Card sx={{ p: 2 }}>
        <Typography variant="h6" mb={2}>Recent Expenses</Typography>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: '#f1f5f9' }}>
              <TableRow>
                <TableCell>Date &amp; Time</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Spender Name</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {expenses.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center">No expenses recorded.</TableCell></TableRow>
              ) : expenses.map(e => (
                <TableRow key={e.id}>
                  <TableCell>{new Date(e.expenseDate + (!e.expenseDate.endsWith('Z') ? 'Z' : '')).toLocaleString()}</TableCell>
                  <TableCell>{e.title}</TableCell>
                  <TableCell>{e.spenderName || '-'}</TableCell>
                  <TableCell>{e.category?.name || 'Unknown'}</TableCell>
                  <TableCell>₹{e.amount}</TableCell>
                  <TableCell>
                    <IconButton size="small" color="primary" onClick={() => handleEditExpense(e)} sx={{ mr: 1 }}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDeleteExpense(e.id, e.createdOn)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Add Expense Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Expense</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField fullWidth label="Title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select label="Category" value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})}>
                  {categories.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Amount" type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth type="datetime-local" label="Date & Time" InputLabelProps={{ shrink: true }} value={formData.expenseDate} onChange={e => setFormData({...formData, expenseDate: e.target.value})} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Spender Name / ID" value={formData.spenderName} onChange={e => setFormData({...formData, spenderName: e.target.value})} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Description" multiline rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveExpense} disabled={!formData.title || !formData.categoryId || !formData.amount}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog open={catOpen} onClose={() => setCatOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Category</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField fullWidth label="Category Name" value={catData.name} onChange={e => setCatData({...catData, name: e.target.value})} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Description" value={catData.description} onChange={e => setCatData({...catData, description: e.target.value})} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCatOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveCategory} disabled={!catData.name}>Save</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};


