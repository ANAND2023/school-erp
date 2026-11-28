import React, { useState, useEffect } from 'react';
import { Box, Card, Typography, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, IconButton, Button, TextField, Select, MenuItem, InputLabel, FormControl, Stack } from '@mui/material';
import { Modal } from '../../../components/Modal';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import TableChartIcon from '@mui/icons-material/TableChart';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import apiClient from '../../../api/client';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const TransportVehiclesPage = () => {
  const [vehicles, setVehicles] = useState([]);
  const [staff, setStaff] = useState([]);
  const [open, setOpen] = useState(false);
  const [editData, setEditData] = useState(null);

  const [formData, setFormData] = useState({
    registrationNo: '',
    vehicleType: 'Bus',
    capacity: '',
    driverId: '',
    status: 'Active'
  });

  useEffect(() => {
    fetchVehicles();
    fetchStaff();
  }, []);

  const fetchVehicles = async () => {
    try {
      const res = await apiClient.get('/transport/vehicles');
      setVehicles(res.data?.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStaff = async () => {
    try {
      const res = await apiClient.get('/transport/drivers');
      setStaff(res.data?.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpen = (v = null) => {
    if (v) {
      setEditData(v);
      setFormData({
        registrationNo: v.registrationNo,
        vehicleType: v.vehicleType,
        capacity: v.capacity,
        driverId: v.driverId || '',
        status: v.status
      });
    } else {
      setEditData(null);
      setFormData({
        registrationNo: '',
        vehicleType: 'Bus',
        capacity: '',
        driverId: '',
        status: 'Active'
      });
    }
    setOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload = { ...formData, capacity: parseInt(formData.capacity) || 0 };
      if (!payload.driverId) payload.driverId = null;
      if (editData) payload.id = editData.id;

      await apiClient.post('/transport/vehicles', payload);
      setOpen(false);
      fetchVehicles();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this vehicle?")) return;
    try {
      await apiClient.delete(`/transport/vehicles/${id}`);
      fetchVehicles();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadExcel = () => {
    if (!vehicles || vehicles.length === 0) return;

    const data = [
      ['Transport Vehicles Master Report'],
      [`Generated on: ${new Date().toLocaleDateString()}`],
      [],
      ['S.No', 'Registration No', 'Vehicle Type', 'Seating Capacity', 'Assigned Driver', 'Status']
    ];

    vehicles.forEach((v, idx) => {
      data.push([
        idx + 1,
        v.registrationNo || '',
        v.vehicleType || '',
        v.capacity ? `${v.capacity} Seats` : '',
        v.driver ? `${v.driver.firstName || ''} ${v.driver.lastName || ''}`.trim() : '-',
        v.status || ''
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 20 },
      { wch: 16 },
      { wch: 18 },
      { wch: 24 },
      { wch: 15 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Vehicles');
    XLSX.writeFile(wb, `Transport_Vehicles_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleDownloadPdf = () => {
    if (!vehicles || vehicles.length === 0) return;

    const doc = new jsPDF('portrait');
    doc.setFontSize(16);
    doc.setTextColor(30);
    doc.text('Transport Vehicles Master Report', 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 25);

    const headRow = ['#', 'Registration No', 'Type', 'Capacity', 'Driver', 'Status'];
    const bodyRows = vehicles.map((v, idx) => [
      idx + 1,
      v.registrationNo || '',
      v.vehicleType || '',
      v.capacity ? `${v.capacity} Seats` : '',
      v.driver ? `${v.driver.firstName || ''} ${v.driver.lastName || ''}`.trim() : '-',
      v.status || ''
    ]);

    autoTable(doc, {
      head: [headRow],
      body: bodyRows,
      startY: 30,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9.5, cellPadding: 3.5 },
    });

    doc.save(`Transport_Vehicles_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} flexDirection={{ xs: 'column', sm: 'row' }} gap={1.5} mb={3}>
        <Typography variant="h5" fontWeight="bold">Vehicles Master</Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Button
            size="small"
            variant="contained"
            startIcon={<TableChartIcon sx={{ fontSize: 16 }} />}
            onClick={handleDownloadExcel}
            disabled={vehicles.length === 0}
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
            disabled={vehicles.length === 0}
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
            Add Vehicle
          </Button>
        </Stack>
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ bgcolor: '#f1f5f9' }}>
            <TableRow>
              <TableCell>Registration No</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Capacity</TableCell>
              <TableCell>Driver</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {vehicles.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center">No vehicles found.</TableCell></TableRow>
            ) : vehicles.map((v) => (
              <TableRow key={v.id} hover>
                <TableCell fontWeight="bold">{v.registrationNo}</TableCell>
                <TableCell>{v.vehicleType}</TableCell>
                <TableCell>{v.capacity} Seats</TableCell>
                <TableCell>{v.driver ? v.driver.firstName + ' ' + v.driver.lastName : '-'}</TableCell>
                <TableCell>
                  <Chip size="small" label={v.status} color={v.status === 'Active' ? 'success' : 'warning'} />
                </TableCell>
                <TableCell align="right">
                  <IconButton color="primary" onClick={() => handleOpen(v)}><EditIcon /></IconButton>
                  <IconButton color="error" onClick={() => handleDelete(v.id)}><DeleteIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editData ? 'Edit Vehicle' : 'Add New Vehicle'}
        maxWidth="sm"
        onConfirm={handleSave}
        confirmText="Save Vehicle"
        confirmDisabled={!formData.registrationNo || !formData.capacity}
      >
        <Grid container spacing={2} mt={1}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Registration No." value={formData.registrationNo} onChange={e => setFormData({...formData, registrationNo: e.target.value})} required />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Vehicle Type</InputLabel>
              <Select label="Vehicle Type" value={formData.vehicleType} onChange={e => setFormData({...formData, vehicleType: e.target.value})}>
                <MenuItem value="Bus">Bus</MenuItem>
                <MenuItem value="Van">Van</MenuItem>
                <MenuItem value="Car">Car</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth type="number" label="Seating Capacity" value={formData.capacity} onChange={e => setFormData({...formData, capacity: e.target.value})} required />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select label="Status" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="UnderMaintenance">Under Maintenance</MenuItem>
                <MenuItem value="Inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Select Driver (Staff)</InputLabel>
              <Select label="Select Driver (Staff)" value={formData.driverId} onChange={e => setFormData({...formData, driverId: e.target.value})}>
                <MenuItem value=""><em>None</em></MenuItem>
                {staff.map(s => (
                  <MenuItem key={s.id} value={s.id}>{s.fullName} ({s.employeeCode})</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Modal>
    </Box>
  );
};
