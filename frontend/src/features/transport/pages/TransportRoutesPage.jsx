import React, { useState, useEffect } from 'react';
import { Box, Card, Typography, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, IconButton, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem, InputLabel, FormControl } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import apiClient from '../../../api/client';

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

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">Routes Master</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
          Add Route
        </Button>
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

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editData ? 'Edit Route' : 'Add New Route'}</DialogTitle>
        <DialogContent dividers>
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={!formData.routeName}>Save Route</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Route Stops Details - {viewData?.routeName}</DialogTitle>
        <DialogContent dividers>
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

