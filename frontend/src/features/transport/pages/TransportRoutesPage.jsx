import React, { useState, useEffect } from 'react';
import { Box, Card, Typography, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, IconButton, Button, TextField, Select, MenuItem, InputLabel, FormControl, Stack } from '@mui/material';
import { Modal } from '../../../components/Modal';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import TableChartIcon from '@mui/icons-material/TableChart';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import apiClient from '../../../api/client';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const TransportRoutesPage = () => {
  const [routes, setRoutes] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [open, setOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewData, setViewData] = useState(null);

  const handleView = (r) => {
    setViewData(r);
    setViewOpen(true);
  };

  const [formData, setFormData] = useState({
    routeName: '',
    description: '',
    vehicleId: '',
    stops: []
  });

  useEffect(() => {
    fetchRoutes();
    fetchVehicles();
  }, []);

  const fetchRoutes = async () => {
    try {
      const res = await apiClient.get('/transport/routes');
      setRoutes(res.data?.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchVehicles = async () => {
    try {
      const res = await apiClient.get('/transport/vehicles');
      setVehicles(res.data?.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpen = (r = null) => {
    if (r) {
      setEditData(r);
      setFormData({
        routeName: r.routeName,
        description: r.description || '',
        vehicleId: r.vehicleId || '',
        stops: r.stops || []
      });
    } else {
      setEditData(null);
      setFormData({
        routeName: '',
        description: '',
        vehicleId: '',
        stops: []
      });
    }
    setOpen(true);
  };

  const handleAddStop = () => {
    setFormData(prev => ({
      ...prev,
      stops: [...prev.stops, { stopName: '', pickUpTime: '', dropTime: '', monthlyFare: 0 }]
    }));
  };

  const handleStopChange = (index, field, value) => {
    const updatedStops = [...formData.stops];
    updatedStops[index][field] = value;
    setFormData(prev => ({ ...prev, stops: updatedStops }));
  };

  const handleRemoveStop = (index) => {
    const updatedStops = formData.stops.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, stops: updatedStops }));
  };

  const handleSave = async () => {
    try {
      const payload = { ...formData };
      if (editData) payload.id = editData.id;
      // Convert empty strings to null for time fields
      payload.stops = payload.stops.map(s => ({
        ...s,
        pickUpTime: s.pickUpTime || null,
        dropTime: s.dropTime || null,
        monthlyFare: parseFloat(s.monthlyFare) || 0
      }));

      await apiClient.post('/transport/routes', payload);
      setOpen(false);
      fetchRoutes();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this route?")) return;
    try {
      await apiClient.delete(`/transport/routes/${id}`);
      fetchRoutes();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadExcel = () => {
    if (!routes || routes.length === 0) return;

    const data = [
      ['Transport Routes Master Report'],
      [`Generated on: ${new Date().toLocaleDateString()}`],
      [],
      ['S.No', 'Route Name', 'Assigned Vehicle', 'Description', 'Total Stops', 'Stops & Fares Breakdown']
    ];

    routes.forEach((r, idx) => {
      const stopsBreakdown = (r.stops || [])
        .map(s => `${s.stopName}${s.pickUpTime ? ` (${s.pickUpTime}` : ''}${s.dropTime ? `-${s.dropTime})` : s.pickUpTime ? ')' : ''} [₹${s.monthlyFare || 0}]`)
        .join('; ');

      data.push([
        idx + 1,
        r.routeName || '',
        r.vehicle?.registrationNo || 'Unassigned',
        r.description || '-',
        r.stops?.length || 0,
        stopsBreakdown || '-'
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 22 },
      { wch: 18 },
      { wch: 25 },
      { wch: 12 },
      { wch: 50 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Routes');
    XLSX.writeFile(wb, `Transport_Routes_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleDownloadPdf = () => {
    if (!routes || routes.length === 0) return;

    const doc = new jsPDF('landscape');
    doc.setFontSize(16);
    doc.setTextColor(30);
    doc.text('Transport Routes Master Report', 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 25);

    const headRow = ['#', 'Route Name', 'Assigned Vehicle', 'Description', 'Stops', 'Key Stops & Fares'];
    const bodyRows = routes.map((r, idx) => {
      const stopsBreakdown = (r.stops || [])
        .map(s => `${s.stopName} (Rs. ${s.monthlyFare || 0})`)
        .join(', ');

      return [
        idx + 1,
        r.routeName || '',
        r.vehicle?.registrationNo || 'Unassigned',
        r.description || '-',
        r.stops?.length || 0,
        stopsBreakdown || '-'
      ];
    });

    autoTable(doc, {
      head: [headRow],
      body: bodyRows,
      startY: 30,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        5: { cellWidth: 90 }
      }
    });

    doc.save(`Transport_Routes_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} flexDirection={{ xs: 'column', sm: 'row' }} gap={1.5} mb={3}>
        <Typography variant="h5" fontWeight="bold">Routes Master</Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Button
            size="small"
            variant="contained"
            startIcon={<TableChartIcon sx={{ fontSize: 16 }} />}
            onClick={handleDownloadExcel}
            disabled={routes.length === 0}
            sx={{
              bgcolor: '#107c41',
              color: '#ffffff',
              height: 34,
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
            startIcon={<PictureAsPdfIcon sx={{ fontSize: 16 }} />}
            onClick={handleDownloadPdf}
            disabled={routes.length === 0}
            sx={{
              bgcolor: '#d32f2f',
              color: '#ffffff',
              height: 34,
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
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpen()}
            sx={{
              height: 34,
              fontSize: '0.78rem',
              fontWeight: 700,
              px: 1.8,
              borderRadius: '8px',
              textTransform: 'none',
            }}
          >
            Add Route
          </Button>
        </Stack>
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ bgcolor: '#f1f5f9' }}>
            <TableRow>
              <TableCell>Route Name</TableCell>
              <TableCell>Vehicle</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Stops Count</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {routes.length === 0 ? (
              <TableRow><TableCell colSpan={5} align="center">No routes found.</TableCell></TableRow>
            ) : routes.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell fontWeight="bold">{r.routeName}</TableCell>
                <TableCell>{r.vehicle?.registrationNo || 'Unassigned'}</TableCell>
                <TableCell>{r.description || '-'}</TableCell>
                <TableCell>{r.stops?.length || 0} stops</TableCell>
                <TableCell align="right">
                  <IconButton color="info" onClick={() => handleView(r)}><VisibilityIcon /></IconButton>
                  <IconButton color="primary" onClick={() => handleOpen(r)}><EditIcon /></IconButton>
                  <IconButton color="error" onClick={() => handleDelete(r.id)}><DeleteIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editData ? 'Edit Route' : 'Add New Route'}
        maxWidth="md"
        onConfirm={handleSave}
        confirmText="Save Route"
        confirmDisabled={!formData.routeName}
      >
        <Grid container spacing={2} mt={1}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Route Name" value={formData.routeName} onChange={e => setFormData({...formData, routeName: e.target.value})} required />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Assigned Vehicle</InputLabel>
              <Select label="Assigned Vehicle" value={formData.vehicleId} onChange={e => setFormData({...formData, vehicleId: e.target.value})}>
                <MenuItem value=""><em>None</em></MenuItem>
                {vehicles.map(v => (
                  <MenuItem key={v.id} value={v.id}>{v.registrationNo} ({v.capacity} Seats)</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="Description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          </Grid>

          {/* Route Stops Section */}
          <Grid item xs={12}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mt={3} mb={1}>
              <Typography variant="subtitle1" fontWeight="bold">Route Stops</Typography>
              <Button size="small" variant="outlined" onClick={handleAddStop}>+ Add Stop</Button>
            </Box>
            {formData.stops.length === 0 && <Typography variant="body2" color="textSecondary">No stops added. Add stops to define this route.</Typography>}
            {formData.stops.map((stop, index) => (
              <Box key={index} display="flex" gap={2} mb={2} alignItems="center" bgcolor="#f8fafc" p={2} borderRadius={2}>
                <TextField size="small" label="Stop Name" value={stop.stopName} onChange={e => handleStopChange(index, 'stopName', e.target.value)} required sx={{ flex: 2 }} />
                <TextField size="small" type="time" label="Pick-up" InputLabelProps={{ shrink: true }} value={stop.pickUpTime || ''} onChange={e => handleStopChange(index, 'pickUpTime', e.target.value)} sx={{ flex: 1 }} />
                <TextField size="small" type="time" label="Drop" InputLabelProps={{ shrink: true }} value={stop.dropTime || ''} onChange={e => handleStopChange(index, 'dropTime', e.target.value)} sx={{ flex: 1 }} />
                <TextField size="small" type="number" label="Monthly Fare" value={stop.monthlyFare} onChange={e => handleStopChange(index, 'monthlyFare', e.target.value)} sx={{ flex: 1 }} />
                <IconButton color="error" onClick={() => handleRemoveStop(index)}><DeleteIcon /></IconButton>
              </Box>
            ))}
          </Grid>
        </Grid>
      </Modal>

      <Modal
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        title={`Route Stops Details - ${viewData?.routeName || ''}`}
        maxWidth="md"
        showConfirm={false}
        cancelText="Close"
      >
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f1f5f9' }}>
              <TableRow>
                <TableCell>Stop Name</TableCell>
                <TableCell>Pick-up Time</TableCell>
                <TableCell>Drop Time</TableCell>
                <TableCell>Monthly Fare</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {viewData?.stops?.length === 0 ? (
                <TableRow><TableCell colSpan={4} align="center">No stops added to this route.</TableCell></TableRow>
              ) : (
                viewData?.stops?.map((stop, index) => (
                  <TableRow key={index} hover>
                    <TableCell>{stop.stopName}</TableCell>
                    <TableCell>{stop.pickUpTime || '-'}</TableCell>
                    <TableCell>{stop.dropTime || '-'}</TableCell>
                    <TableCell>{stop.monthlyFare}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Modal>
    </Box>
  );
};

