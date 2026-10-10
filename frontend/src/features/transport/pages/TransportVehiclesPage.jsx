import React, { useState, useEffect } from 'react';
import { Box, Card, Typography, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, IconButton, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem, InputLabel, FormControl } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import apiClient from '../../../api/client';

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

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">Vehicles Master</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
          Add Vehicle
        </Button>
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

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editData ? 'Edit Vehicle' : 'Add New Vehicle'}</DialogTitle>
        <DialogContent dividers>
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={!formData.registrationNo || !formData.capacity}>Save Vehicle</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
