import React, { useState, useEffect } from 'react';
import { Switch, Box, Card, Typography, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, IconButton, Button, TextField, Select, MenuItem, InputLabel, FormControl, Tooltip, Stack } from '@mui/material';
import { Modal } from '../../../components/Modal';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import HistoryIcon from '@mui/icons-material/History';
import PaymentIcon from '@mui/icons-material/Payment';
import TableChartIcon from '@mui/icons-material/TableChart';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import apiClient from '../../../api/client';
import { MultiSelect } from 'primereact/multiselect';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const TransportAllocationsPage = () => {
  const [allocations, setAllocations] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [sections, setSections] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [filterClassId, setFilterClassId] = useState('');
  const [filterSectionId, setFilterSectionId] = useState('');
  const [open, setOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [feesOpen, setFeesOpen] = useState(false);
  const [currentLogs, setCurrentLogs] = useState([]);
  const [currentFees, setCurrentFees] = useState([]);
  const [selectedStudentName, setSelectedStudentName] = useState('');

  const [formData, setFormData] = useState({
    studentIds: [],
    routeId: '',
    routeStopId: '',
    startDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchAllocations();
    fetchRoutes();
    fetchStudents();
    fetchClasses();
  }, []);

  const fetchAllocations = async () => {
    try {
      const res = await apiClient.get('/transport/allocations');
      setAllocations(res.data?.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRoutes = async () => {
    try {
      const res = await apiClient.get('/transport/routes');
      setRoutes(res.data?.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await apiClient.get('/classes');
      setClasses(res.data?.data || res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await apiClient.get('/students?pageSize=5000');
      setStudents(res.data?.data?.items || res.data?.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClassChange = (e) => {
    const cid = e.target.value;
    setSelectedClassId(cid);
    const cls = classes.find(c => c.id === cid);
    setSections(cls?.sections || []);
    setSelectedSectionId('');
    setFormData(prev => ({...prev, studentIds: []}));
  };

  const handleSectionChange = (e) => {
    setSelectedSectionId(e.target.value);
    setFormData(prev => ({...prev, studentIds: []}));
  };

  const filteredStudents = students.filter(s => s.classSectionId == selectedSectionId || s.sectionId == selectedSectionId);

  const handleOpen = () => {
    setSelectedClassId('');
    setSections([]);
    setSelectedSectionId('');
    setFormData({
      studentIds: [],
      routeId: '',
      routeStopId: '',
      startDate: new Date().toISOString().split('T')[0]
    });
    setOpen(true);
  };

  
  const handleToggleStatus = async (id) => {
    try {
      await apiClient.put(`/transport/allocations/${id}/toggle-status`);
      fetchAllocations();
    } catch (err) {
      console.error(err);
    }
  };

  const handleViewHistory = async (id, studentName) => {
    try {
      const res = await apiClient.get(`/transport/allocations/${id}/history`);
      setCurrentLogs(res.data?.data || []);
      setSelectedStudentName(studentName);
      setHistoryOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleViewFees = async (id, studentName) => {
    try {
      const res = await apiClient.get(`/transport/allocations/${id}/fees`);
      setCurrentFees(res.data?.data || []);
      setSelectedStudentName(studentName);
      setFeesOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredAllocations = allocations.filter(a => {
    if (filterClassId && a.classId !== filterClassId) return false;
    if (filterSectionId && a.sectionId !== filterSectionId) return false;
    return true;
  });

  const handleSave = async () => {
    try {
      const promises = formData.studentIds.map(id => {
        const payload = {
          studentId: id,
          routeId: formData.routeId,
          routeStopId: formData.routeStopId,
          startDate: formData.startDate
        };
        return apiClient.post('/transport/allocations', payload);
      });
      await Promise.all(promises);
      setOpen(false);
      fetchAllocations();
    } catch (err) {
      console.error(err);
    }
  };

  // Helper to find stops for selected route
  const selectedRouteStops = routes.find(r => r.id === formData.routeId)?.stops || [];

  const handleDownloadExcel = () => {
    if (!filteredAllocations || filteredAllocations.length === 0) return;

    const data = [
      ['Student Transport Allocation Report'],
      [`Generated on: ${new Date().toLocaleDateString()}`],
      [],
      ['S.No', 'Student Name', 'Admission No', 'Class / Section', 'Route Name', 'Stop Name', 'Monthly Fare (Rs.)', 'Start Date', 'Status']
    ];

    filteredAllocations.forEach((a, idx) => {
      data.push([
        idx + 1,
        a.studentName || '',
        a.admissionNo || '',
        `${a.className || ''} ${a.sectionName ? '/ ' + a.sectionName : ''}`.trim(),
        a.routeName || '',
        a.stopName || '',
        a.monthlyFare || 0,
        a.startDate ? new Date(a.startDate).toLocaleDateString() : '',
        a.status || ''
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 22 },
      { wch: 15 },
      { wch: 16 },
      { wch: 20 },
      { wch: 20 },
      { wch: 18 },
      { wch: 14 },
      { wch: 12 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Allocations');
    XLSX.writeFile(wb, `Student_Transport_Allocations_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleDownloadPdf = () => {
    if (!filteredAllocations || filteredAllocations.length === 0) return;

    const doc = new jsPDF('landscape');
    doc.setFontSize(16);
    doc.setTextColor(30);
    doc.text('Student Transport Allocation Report', 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 25);

    const headRow = ['#', 'Student Name', 'Adm No', 'Class/Sec', 'Route', 'Stop Name', 'Fare', 'Start Date', 'Status'];
    const bodyRows = filteredAllocations.map((a, idx) => [
      idx + 1,
      a.studentName || '',
      a.admissionNo || '',
      `${a.className || ''} / ${a.sectionName || ''}`,
      a.routeName || '',
      a.stopName || '',
      `Rs. ${a.monthlyFare || 0}`,
      a.startDate ? new Date(a.startDate).toLocaleDateString() : '',
      a.status || ''
    ]);

    autoTable(doc, {
      head: [headRow],
      body: bodyRows,
      startY: 30,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
    });

    doc.save(`Student_Transport_Allocations_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">Student Transport Allocation</Typography>
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="contained"
            startIcon={<TableChartIcon sx={{ fontSize: 16 }} />}
            onClick={handleDownloadExcel}
            disabled={filteredAllocations.length === 0}
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
            disabled={filteredAllocations.length === 0}
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
            onClick={handleOpen}
            sx={{
              height: 34,
              fontSize: '0.78rem',
              fontWeight: 700,
              px: 1.8,
              borderRadius: '8px',
              textTransform: 'none',
            }}
          >
            Assign Route
          </Button>
        </Stack>
      </Box>

      
      <Box display="flex" gap={2} mb={3}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Filter by Class</InputLabel>
          <Select label="Filter by Class" value={filterClassId} onChange={e => { setFilterClassId(e.target.value); setFilterSectionId(''); }}>
            <MenuItem value="">All Classes</MenuItem>
            {classes.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 200 }} disabled={!filterClassId}>
          <InputLabel>Filter by Section</InputLabel>
          <Select label="Filter by Section" value={filterSectionId} onChange={e => setFilterSectionId(e.target.value)}>
            <MenuItem value="">All Sections</MenuItem>
            {classes.find(c => c.id === filterClassId)?.sections?.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ bgcolor: '#f1f5f9' }}>
            <TableRow>
              <TableCell>Student</TableCell>
              <TableCell>Class/Section</TableCell>
              <TableCell>Route</TableCell>
              <TableCell>Stop & Fare</TableCell>
              <TableCell>Start Date</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAllocations.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center">No student allocations found.</TableCell></TableRow>
            ) : filteredAllocations.map((a) => (
              <TableRow key={a.id} hover>
                <TableCell fontWeight="bold">
                  {a.studentName}
                  <Typography variant="caption" display="block">Adm: {a.admissionNo}</Typography>
                </TableCell>
                <TableCell>{a.className} / {a.sectionName}</TableCell>
                <TableCell>{a.routeName}</TableCell>
                <TableCell>
                  {a.stopName}
                  <Typography variant="caption" display="block">Fare: ₹{a.monthlyFare}</Typography>
                </TableCell>
                <TableCell>{new Date(a.startDate).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center">
                    <Switch size="small" checked={a.status === 'Active'} onChange={() => handleToggleStatus(a.id)} color="success" />
                    <Typography variant="body2" sx={{ ml: 1, color: a.status === 'Active' ? 'success.main' : 'text.secondary' }}>{a.status}</Typography>
                    <Tooltip title="View History">
                      <IconButton size="small" onClick={() => handleViewHistory(a.id, a.studentName)} sx={{ ml: 1 }}>
                        <HistoryIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="View Fees">
                      <IconButton size="small" onClick={() => handleViewFees(a.id, a.studentName)} sx={{ ml: 0.5 }}>
                        <PaymentIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Assign Transport to Student"
        maxWidth="sm"
        onConfirm={handleSave}
        confirmText="Save Allocation"
        confirmDisabled={(!formData.studentIds || formData.studentIds.length === 0) || !formData.routeStopId}
      >
        <Grid container spacing={3} mt={1}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Select Class</InputLabel>
              <Select label="Select Class" value={selectedClassId} onChange={handleClassChange}>
                {classes.map(c => (
                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth disabled={!selectedClassId}>
              <InputLabel>Select Section</InputLabel>
              <Select label="Select Section" value={selectedSectionId} onChange={handleSectionChange}>
                {sections.map(s => (
                  <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <Box>
              <Typography variant="caption" color="textSecondary" display="block" mb={0.5}>Select Student(s)</Typography>
              <MultiSelect 
                value={formData.studentIds || []} 
                onChange={(e) => setFormData({...formData, studentIds: e.value})} 
                options={filteredStudents} 
                optionLabel="fullName" 
                optionValue="id"
                display="chip" 
                placeholder="Select Students" 
                disabled={!selectedSectionId}
                filter
                className="w-full mui-custom-multiselect" appendTo="self" 
                style={{ width: '100%' }}
              />
            </Box>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Select Route</InputLabel>
              <Select label="Select Route" value={formData.routeId} onChange={e => setFormData({...formData, routeId: e.target.value, routeStopId: ''})}>
                {routes.map(r => (
                  <MenuItem key={r.id} value={r.id}>{r.routeName}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth disabled={!formData.routeId}>
              <InputLabel>Select Stop</InputLabel>
              <Select label="Select Stop" value={formData.routeStopId} onChange={e => setFormData({...formData, routeStopId: e.target.value})}>
                {selectedRouteStops.map(rs => (
                  <MenuItem key={rs.id} value={rs.id}>{rs.stopName} (₹{rs.monthlyFare})</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth type="date" label="Start Date" InputLabelProps={{ shrink: true }} value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
          </Grid>
        </Grid>
      </Modal>

      {/* History Modal */}
      <Modal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title={`Status History - ${selectedStudentName}`}
        maxWidth="sm"
        showConfirm={false}
        cancelText="Close"
      >
        {currentLogs.length === 0 ? (
          <Typography variant="body2" color="textSecondary">No status changes recorded.</Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date & Time</TableCell>
                <TableCell>Changed By</TableCell>
                <TableCell>Old Status</TableCell>
                <TableCell>New Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {currentLogs.map(log => (
                <TableRow key={log.id}>
                  <TableCell>{new Date(log.changedOn + (!log.changedOn.endsWith('Z') ? 'Z' : '')).toLocaleString()}</TableCell>
                  <TableCell>{log.changedBy}</TableCell>
                  <TableCell>{log.oldStatus}</TableCell>
                  <TableCell>{log.newStatus}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Modal>

      {/* Fees Modal */}
      <Modal
        open={feesOpen}
        onClose={() => setFeesOpen(false)}
        title={`Transport Fees - ${selectedStudentName}`}
        maxWidth="md"
        showConfirm={false}
        cancelText="Close"
      >
        {currentFees.length === 0 ? (
          <Typography variant="body2" color="textSecondary">No transport fees found for this student.</Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Month</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Paid Amount</TableCell>
                <TableCell>Balance Amount</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {currentFees.map(fee => (
                <TableRow key={fee.id}>
                  <TableCell>{fee.month}</TableCell>
                  <TableCell>{new Date(fee.dueDate).toLocaleDateString()}</TableCell>
                  <TableCell>₹{fee.amount}</TableCell>
                  <TableCell>₹{fee.paidAmount}</TableCell>
                  <TableCell>₹{fee.balanceAmount}</TableCell>
                  <TableCell>
                    <Chip 
                      label={fee.status} 
                      size="small" 
                      color={fee.status === 'Paid' ? 'success' : fee.status === 'Partial' ? 'warning' : 'error'} 
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Modal>
    </Box>
  );
};






