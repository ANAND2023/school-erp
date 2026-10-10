import React, { useState, useEffect } from 'react';
import { Box, Card, Typography, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, IconButton, MenuItem, Select, TextField, Button, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditIcon from '@mui/icons-material/Edit';
import dayjs from 'dayjs';
import apiClient from '../../../api/client';

export const LandingEnquiriesPage = () => {
  const [enquiries, setEnquiries] = useState([]);
  const [filteredEnquiries, setFilteredEnquiries] = useState([]);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Edit Dialog
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [editStatus, setEditStatus] = useState('New');
  const [editRemarks, setEditRemarks] = useState('');

  useEffect(() => {
    fetchEnquiries();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [enquiries, searchQuery, statusFilter]);

  const fetchEnquiries = async () => {
    try {
      const res = await apiClient.get('/superadmin/enquiries');
      setEnquiries(res.data?.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const applyFilters = () => {
    let filtered = enquiries;
    
    if (statusFilter !== 'All') {
      filtered = filtered.filter(e => e.status === statusFilter);
    }
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(e => 
        e.name?.toLowerCase().includes(q) || 
        e.schoolName?.toLowerCase().includes(q) ||
        e.phone?.includes(q)
      );
    }
    
    setFilteredEnquiries(filtered);
  };

  const handleMarkAsRead = async (id) => {
    try {
      await apiClient.post(`/superadmin/enquiries/${id}/read`);
      fetchEnquiries();
    } catch (err) {
      console.error(err);
    }
  };

  const openEdit = (enq) => {
    setSelectedEnquiry(enq);
    setEditStatus(enq.status || 'New');
    setEditRemarks(enq.remarks || '');
    setOpenDialog(true);
  };

  const saveEdit = async () => {
    if (!selectedEnquiry) return;
    try {
      await apiClient.put(`/superadmin/enquiries/${selectedEnquiry.id}/status`, {
        status: editStatus,
        remarks: editRemarks
      });
      setOpenDialog(false);
      fetchEnquiries();
    } catch (err) {
      console.error(err);
    }
  };

  const getRowStyle = (status) => {
    switch(status) {
      case 'Converted': return { bgcolor: '#dcfce7' }; // light green
      case 'FollowUp': return { bgcolor: '#fef08a' }; // light yellow
      case 'Rejected': return { bgcolor: '#fee2e2' }; // light red
      default: return { bgcolor: 'inherit' };
    }
  };

  const getStatusChip = (status) => {
    switch(status) {
      case 'Converted': return <Chip label="Converted" size="small" color="success" />;
      case 'FollowUp': return <Chip label="FollowUp" size="small" color="warning" />;
      case 'Rejected': return <Chip label="Rejected" size="small" color="error" />;
      default: return <Chip label="New" size="small" color="primary" />;
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">Website Enquiries / SaaS Leads</Typography>
        <Box display="flex" gap={2}>
          <TextField 
            size="small" 
            label="Search name, school, phone..." 
            variant="outlined" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Select
            size="small"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="All">All Status</MenuItem>
            <MenuItem value="New">New</MenuItem>
            <MenuItem value="FollowUp">FollowUp</MenuItem>
            <MenuItem value="Converted">Converted</MenuItem>
            <MenuItem value="Rejected">Rejected</MenuItem>
          </Select>
        </Box>
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#f1f5f9' }}>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>School</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>Message / Remarks</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredEnquiries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>No enquiries found.</TableCell>
              </TableRow>
            ) : filteredEnquiries.map((enq) => (
              <TableRow key={enq.id} hover sx={getRowStyle(enq.status)}>
                <TableCell>{dayjs(enq.submittedAt + (enq.submittedAt.endsWith('Z') ? '' : 'Z')).format('DD MMM YYYY, hh:mm A')}</TableCell>
                <TableCell fontWeight="bold">{enq.name}</TableCell>
                <TableCell>{enq.schoolName}</TableCell>
                <TableCell>
                  {enq.phone}<br/>
                  <Typography variant="caption" color="textSecondary">{enq.email}</Typography>
                </TableCell>
                <TableCell sx={{ maxWidth: 300 }}>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 1 }}>{enq.message}</Typography>
                  {enq.remarks && (
                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block', fontStyle: 'italic', bgcolor: 'rgba(255,255,255,0.5)', p: 1, borderRadius: 1 }}>
                      Notes: {enq.remarks}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  {getStatusChip(enq.status)}
                  {!enq.isRead && enq.status === 'New' && <Chip label="Unread" size="small" color="secondary" sx={{ ml: 1, height: 20, fontSize: '0.65rem' }} />}
                </TableCell>
                <TableCell>
                  <IconButton color="primary" onClick={() => openEdit(enq)} title="Update Status">
                    <EditIcon />
                  </IconButton>
                  {!enq.isRead && (
                    <IconButton color="success" onClick={() => handleMarkAsRead(enq.id)} title="Mark as Read">
                      <CheckCircleIcon />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>Update Lead Status</DialogTitle>
        <DialogContent dividers>
          <Box display="flex" flexDirection="column" gap={3} sx={{ mt: 1 }}>
            <Select
              fullWidth
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
              label="Status"
            >
              <MenuItem value="New">New</MenuItem>
              <MenuItem value="FollowUp">FollowUp</MenuItem>
              <MenuItem value="Converted">Converted (ERP Sold)</MenuItem>
              <MenuItem value="Rejected">Rejected</MenuItem>
            </Select>

            <TextField
              fullWidth
              multiline
              rows={4}
              label="Follow-up Remarks / Notes"
              variant="outlined"
              value={editRemarks}
              onChange={(e) => setEditRemarks(e.target.value)}
              placeholder="e.g. Talked to Principal, agreed for meeting on next Monday."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={saveEdit} variant="contained" color="primary">Save Changes</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
