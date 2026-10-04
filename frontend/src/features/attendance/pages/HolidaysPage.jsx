import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  EventAvailable as HolidayIcon,
} from '@mui/icons-material';
import { getHolidays, createHoliday, deleteHoliday } from '../api';
import AppDatePicker from '../../../components/common/AppDatePicker';

const HolidaysPage = () => {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    holidayDate: new Date().toISOString().split('T')[0],
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadHolidays();
  }, []);

  const loadHolidays = async () => {
    setLoading(true);
    setAlert(null);
    try {
      const res = await getHolidays();
      setHolidays(res.data?.data || res.data || []);
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: 'Failed to load holidays.' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setForm({
      name: '',
      holidayDate: new Date().toISOString().split('T')[0],
      description: '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setAlert({ type: 'error', message: 'Holiday name is required.' });
      return;
    }
    setSubmitting(true);
    try {
      await createHoliday(form);
      setAlert({ type: 'success', message: 'Holiday added successfully!' });
      setDialogOpen(false);
      loadHolidays();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Failed to add holiday.';
      setAlert({ type: 'error', message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete holiday "${name}"?`)) return;
    try {
      await deleteHoliday(id);
      setAlert({ type: 'success', message: 'Holiday deleted successfully.' });
      loadHolidays();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Failed to delete holiday.';
      setAlert({ type: 'error', message: msg });
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} color="primary.main">
            Academic Holiday Calendar
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage school holidays and vacations. Dates marked here block attendance marking (FR-6.2).
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAdd} sx={{ px: 3 }}>
          Add Holiday
        </Button>
      </Box>

      {alert && (
        <Alert severity={alert.type} sx={{ mb: 3 }} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : holidays.length === 0 ? (
        <Paper sx={{ p: 5, textAlign: 'center' }}>
          <HolidayIcon sx={{ fontSize: 50, color: 'text.secondary', mb: 1 }} />
          <Typography variant="h6" color="text.secondary">
            No holidays registered for this academic year.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ boxShadow: 2 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f4f6f8' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, width: 60 }}>#</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Holiday Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Day of Week</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                <TableCell sx={{ fontWeight: 700, textAlign: 'center', width: 100 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {holidays.map((h, idx) => {
                const dateObj = new Date(h.holidayDate);
                return (
                  <TableRow key={h.id} hover>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{h.name}</TableCell>
                    <TableCell>{dateObj.toLocaleDateString()}</TableCell>
                    <TableCell>
                      {dateObj.toLocaleDateString('en-US', { weekday: 'long' })}
                    </TableCell>
                    <TableCell>{h.description || '-'}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Tooltip title="Delete Holiday">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(h.id, h.name)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add Holiday Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add School Holiday</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Holiday Name *"
                placeholder="e.g. Republic Day, Diwali"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <AppDatePicker
                label="Holiday Date *"
                value={form.holidayDate}
                onChange={(e) => setForm({ ...form, holidayDate: e.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                label="Description"
                placeholder="Optional notes or details"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Adding...' : 'Save Holiday'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HolidaysPage;
