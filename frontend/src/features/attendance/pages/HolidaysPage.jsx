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
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  EventAvailable as HolidayIcon,
  FileDownload as ExportIcon,
} from '@mui/icons-material';
import { getHolidays, createHoliday, updateHoliday, deleteHoliday } from '../api';
import AppDatePicker from '../../../components/common/AppDatePicker';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const HolidaysPage = () => {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    id: null,
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
      id: null,
      name: '',
      holidayDate: new Date().toISOString().split('T')[0],
      description: '',
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (holiday) => {
    setForm({
      id: holiday.id,
      name: holiday.name,
      holidayDate: holiday.holidayDate.split('T')[0],
      description: holiday.description || '',
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
      if (form.id) {
        await updateHoliday(form.id, form);
        setAlert({ type: 'success', message: 'Holiday updated successfully!' });
      } else {
        await createHoliday(form);
        setAlert({ type: 'success', message: 'Holiday added successfully!' });
      }
      setDialogOpen(false);
      loadHolidays();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Failed to save holiday.';
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

  const exportExcel = () => {
    if (holidays.length === 0) return;
    const wsData = [['#', 'Holiday Name', 'Date', 'Day of Week', 'Description']];
    holidays.forEach((h, idx) => {
      const dateObj = new Date(h.holidayDate);
      wsData.push([
        idx + 1,
        h.name,
        dateObj.toLocaleDateString(),
        dateObj.toLocaleDateString('en-US', { weekday: 'long' }),
        h.description || '-'
      ]);
    });
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Holidays');
    XLSX.writeFile(wb, 'Academic_Holiday_Calendar.xlsx');
  };

  const exportPdf = () => {
    if (holidays.length === 0) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Academic Holiday Calendar', 14, 15);
    
    const headRow = ['#', 'Holiday Name', 'Date', 'Day of Week', 'Description'];
    const bodyRows = holidays.map((h, idx) => {
      const dateObj = new Date(h.holidayDate);
      return [
        idx + 1,
        h.name,
        dateObj.toLocaleDateString(),
        dateObj.toLocaleDateString('en-US', { weekday: 'long' }),
        h.description || '-'
      ];
    });

    autoTable(doc, {
      head: [headRow],
      body: bodyRows,
      startY: 20,
    });
    doc.save('Academic_Holiday_Calendar.pdf');
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
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<ExportIcon />} onClick={exportExcel} disabled={holidays.length === 0}>
            Excel
          </Button>
          <Button variant="outlined" startIcon={<ExportIcon />} onClick={exportPdf} disabled={holidays.length === 0}>
            PDF
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAdd}>
            Add Holiday
          </Button>
        </Stack>
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
                <TableCell sx={{ fontWeight: 700, textAlign: 'center', width: 120 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {holidays.map((h, idx) => {
                const dateObj = new Date(h.holidayDate);
                const today = new Date();
                today.setHours(0,0,0,0);
                const isPassed = dateObj < today;
                
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
                      {!isPassed && (
                        <>
                          <Tooltip title="Edit Holiday">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleOpenEdit(h)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Holiday">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDelete(h.id, h.name)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add/Edit Holiday Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{form.id ? 'Edit School Holiday' : 'Add School Holiday'}</DialogTitle>
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
            {submitting ? 'Saving...' : 'Save Holiday'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HolidaysPage;
