import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  MenuItem,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  PhoneInTalk as FollowupIcon,
  HowToReg as ConvertIcon,
  Search as SearchIcon,
  ReceiptLong as ReceiptLongIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { DataGrid } from '../../../components/DataGrid';
import { Modal } from '../../../components/Modal';
import { enquiryApi } from '../api';
import { classApi } from '../../masters/api';
import { useUiStore } from '../../../store/uiStore';
import { useAuthStore } from '../../../store/authStore';
import { usePermission } from '../../../hooks/usePermission';
import { EnquirySlipModal } from '../components/EnquirySlipModal';
import { AppDatePicker } from '../../../components/common';

const ENQUIRY_STATUSES = [
  { value: 1, label: 'Open', color: 'info' },
  { value: 2, label: 'Follow-up', color: 'warning' },
  { value: 3, label: 'Converted', color: 'success' },
  { value: 4, label: 'Closed', color: 'default' },
];

export const EnquiriesPage = () => {
  const navigate = useNavigate();
  const { showSnackbar } = useUiStore();
  const { hasPermission } = usePermission();
  const { activeAcademicYearId, activeAcademicYearName, academicYears } = useAuthStore();

  const [enquiries, setEnquiries] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });

  // Add Enquiry Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newEnquiry, setNewEnquiry] = useState({
    academicYearId: activeAcademicYearId || '',
    studentName: '',
    classId: '',
    guardianName: '',
    mobile: '',
    email: '',
    source: 'Walk-in',
    nextFollowupDate: '',
    notes: '',
  });

  // Followup Modal
  const [followupModalOpen, setFollowupModalOpen] = useState(false);
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [followupResponse, setFollowupResponse] = useState('');
  const [followupNotes, setFollowupNotes] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [updateStatus, setUpdateStatus] = useState(2); // Follow-up

  // Enquiry Slip Modal
  const [slipModalOpen, setSlipModalOpen] = useState(false);
  const [slipEnquiry, setSlipEnquiry] = useState(null);
  const [isNewlyCreated, setIsNewlyCreated] = useState(false);

  const loadClasses = async () => {
    try {
      const res = await classApi.getClasses();
      if (res.data.success) setClasses(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEnquiries = async () => {
    try {
      setLoading(true);
      const params = {
        search: search.trim() || undefined,
        classId: selectedClass || undefined,
        status: selectedStatus || undefined,
        academicYearId: activeAcademicYearId || undefined,
        pageNo: paginationModel.page + 1,
        pageSize: paginationModel.pageSize,
      };
      const res = await enquiryApi.getEnquiries(params);
      if (res.data.success) {
        setEnquiries(res.data.data.items || []);
        setTotalCount(res.data.data.totalCount || 0);
      }
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to load enquiries', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    fetchEnquiries();
  }, [paginationModel, selectedClass, selectedStatus, activeAcademicYearId]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
    fetchEnquiries();
  };

  const handleCreateEnquiry = async (e) => {
    e.preventDefault();
    try {
      const selectedYearId = Number(newEnquiry.academicYearId || activeAcademicYearId || 1);
      const payload = {
        ...newEnquiry,
        classId: Number(newEnquiry.classId),
        academicYearId: selectedYearId,
        nextFollowupDate: newEnquiry.nextFollowupDate
          ? new Date(newEnquiry.nextFollowupDate).toISOString()
          : null,
      };
      const res = await enquiryApi.createEnquiry(payload);
      showSnackbar('Enquiry recorded successfully', 'success');
      setAddModalOpen(false);

      const createdData = res.data?.data;
      const matchedClass = classes.find((c) => c.id === Number(newEnquiry.classId));
      const matchedYear = academicYears.find((y) => y.id === selectedYearId);
      const fullEnquiryForSlip = {
        ...(createdData || {}),
        ...payload,
        className: matchedClass?.name || '',
        academicYearName: matchedYear?.rawName || matchedYear?.name || activeAcademicYearName || '',
        createdOn: new Date().toISOString(),
      };

      setNewEnquiry({
        academicYearId: activeAcademicYearId || '',
        studentName: '',
        classId: '',
        guardianName: '',
        mobile: '',
        email: '',
        source: 'Walk-in',
        nextFollowupDate: '',
        notes: '',
      });
      fetchEnquiries();

      // Show Enquiry Slip modal immediately
      setSlipEnquiry(fullEnquiryForSlip);
      setIsNewlyCreated(true);
      setSlipModalOpen(true);
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to save enquiry', 'error');
    }
  };

  const handleOpenSlip = (enquiry) => {
    setSlipEnquiry(enquiry);
    setIsNewlyCreated(false);
    setSlipModalOpen(true);
  };

  const handleOpenFollowup = async (enquiry) => {
    try {
      const res = await enquiryApi.getEnquiry(enquiry.id);
      if (res.data.success) {
        setSelectedEnquiry(res.data.data);
        setFollowupResponse('');
        setFollowupNotes('');
        setNextDate('');
        setUpdateStatus(res.data.data.status);
        setFollowupModalOpen(true);
      }
    } catch (err) {
      showSnackbar('Failed to load enquiry history', 'error');
    }
  };

  const handleSaveFollowup = async (e) => {
    e.preventDefault();
    if (!followupResponse.trim()) {
      showSnackbar('Follow-up response is required', 'warning');
      return;
    }

    try {
      await enquiryApi.addFollowup(selectedEnquiry.id, {
        response: followupResponse,
        notes: followupNotes,
        nextFollowupDate: nextDate ? new Date(nextDate).toISOString() : null,
        updateStatus,
      });
      showSnackbar('Follow-up logged successfully', 'success');
      setFollowupModalOpen(false);
      fetchEnquiries();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Error logging follow-up', 'error');
    }
  };

  const handleConvertToAdmission = (enquiry) => {
    // Pre-fill admission with enquiry data (FR-3.2)
    navigate('/admissions/new', {
      state: {
        enquiryId: enquiry.id,
        studentName: enquiry.studentName,
        classId: enquiry.classId,
        guardianName: enquiry.guardianName,
        mobile: enquiry.mobile,
        email: enquiry.email,
      },
    });
  };

  const getStatusChip = (status) => {
    const s = ENQUIRY_STATUSES.find((item) => item.value === status);
    return <Chip label={s?.label || 'Open'} color={s?.color || 'default'} size="small" />;
  };

  const columns = [
    { field: 'studentName', headerName: 'Student Name', flex: 1.2, minWidth: 160 },
    { field: 'className', headerName: 'Class Sought', width: 120 },
    {
      field: 'academicYearName',
      headerName: 'Session',
      width: 110,
      renderCell: (params) => (
        <Chip
          label={params.value || activeAcademicYearName || 'Current'}
          size="small"
          variant="outlined"
          color="primary"
          sx={{ fontWeight: 600, fontSize: '11px' }}
        />
      ),
    },
    { field: 'guardianName', headerName: 'Parent / Guardian', flex: 1.2, minWidth: 150 },
    { field: 'mobile', headerName: 'Mobile', width: 130 },
    { field: 'source', headerName: 'Source', width: 110 },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => getStatusChip(params.value),
    },
    {
      field: 'nextFollowupDate',
      headerName: 'Next Follow-up',
      width: 140,
      renderCell: (params) => (params.value ? dayjs(params.value).format('DD MMM YYYY') : '-'),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 210,
      sortable: false,
      renderCell: (params) => {
        const enq = params.row;
        const canEdit = hasPermission('Enquiries', 'Edit');
        const canAdmit = hasPermission('Admissions', 'Add');
        const isConverted = enq.status === 3;

        return (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="Print Enquiry Slip">
              <IconButton size="small" color="info" onClick={() => handleOpenSlip(enq)}>
                <ReceiptLongIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Log Follow-up Call / Visit">
              <IconButton size="small" color="primary" onClick={() => handleOpenFollowup(enq)}>
                <FollowupIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {canAdmit && !isConverted && (
              <Tooltip title="Convert to Admission (FR-3.2)">
                <IconButton size="small" color="success" onClick={() => handleConvertToAdmission(enq)}>
                  <ConvertIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        );
      },
    },
  ];

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Student Enquiries & Follow-ups
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Track front-office student admission leads, schedule follow-ups, and convert enquiries to admissions (FR-3.1 & FR-3.2)
        </Typography>
      </Box>

      {/* Filter Toolbar */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <Box component="form" onSubmit={handleSearchSubmit} sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search student, parent, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Button variant="contained" type="submit">
                <SearchIcon />
              </Button>
            </Box>
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              select
              fullWidth
              size="small"
              label="Class Sought"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <MenuItem value="">All Classes</MenuItem>
              {classes.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              select
              fullWidth
              size="small"
              label="Enquiry Status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <MenuItem value="">All Statuses</MenuItem>
              {ENQUIRY_STATUSES.map((s) => (
                <MenuItem key={s.value} value={s.value}>
                  {s.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      {/* DataGrid */}
      <DataGrid
        menuKey="Enquiries"
        columns={columns}
        rows={enquiries}
        rowCount={totalCount}
        loading={loading}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        onAddClick={() => setAddModalOpen(true)}
        addLabel="Record New Enquiry"
      />

      {/* New Enquiry Modal */}
      <Modal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Record New Student Enquiry (FR-3.1)"
        maxWidth="sm"
      >
        <Box component="form" onSubmit={handleCreateEnquiry} sx={{ mt: 1 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                required
                fullWidth
                label="Academic Session"
                value={newEnquiry.academicYearId || activeAcademicYearId || ''}
                onChange={(e) => setNewEnquiry({ ...newEnquiry, academicYearId: e.target.value })}
              >
                {academicYears.map((ay) => (
                  <MenuItem key={ay.id} value={ay.id}>
                    {ay.name || `Session ${ay.rawName}`}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="Student Name"
                value={newEnquiry.studentName}
                onChange={(e) => setNewEnquiry({ ...newEnquiry, studentName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                required
                fullWidth
                label="Class Sought"
                value={newEnquiry.classId}
                onChange={(e) => setNewEnquiry({ ...newEnquiry, classId: e.target.value })}
              >
                {classes.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="Parent / Guardian Name"
                value={newEnquiry.guardianName}
                onChange={(e) => setNewEnquiry({ ...newEnquiry, guardianName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="Contact Mobile"
                value={newEnquiry.mobile}
                inputProps={{ maxLength: 10, inputMode: 'numeric', pattern: '[0-9]*' }}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setNewEnquiry({ ...newEnquiry, mobile: val });
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email Address"
                value={newEnquiry.email}
                onChange={(e) => setNewEnquiry({ ...newEnquiry, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Lead Source"
                value={newEnquiry.source}
                onChange={(e) => setNewEnquiry({ ...newEnquiry, source: e.target.value })}
              >
                <MenuItem value="Walk-in">Walk-in Visit</MenuItem>
                <MenuItem value="Website">Website Form</MenuItem>
                <MenuItem value="Referral">Word of Mouth / Referral</MenuItem>
                <MenuItem value="Social Media">Social Media (FB/IG)</MenuItem>
                <MenuItem value="Newspaper">Newspaper Advertisement</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <AppDatePicker
                label="Next Follow-up Date"
                value={newEnquiry.nextFollowupDate}
                onChange={(e) => {
                  setNewEnquiry({
                    ...newEnquiry,
                    nextFollowupDate: e.value ? dayjs(e.value).format('YYYY-MM-DD') : '',
                  });
                }}
                dateFormat="dd/M/yy"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Initial Discussion Notes"
                value={newEnquiry.notes}
                onChange={(e) => setNewEnquiry({ ...newEnquiry, notes: e.target.value })}
              />
            </Grid>
          </Grid>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
            <Button onClick={() => setAddModalOpen(false)} color="inherit">
              Cancel
            </Button>
            <Button type="submit" variant="contained">
              Save Enquiry
            </Button>
          </Box>
        </Box>
      </Modal>

      {/* Follow-up History & Log Dialog */}
      <Dialog
        open={followupModalOpen}
        onClose={() => setFollowupModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          Follow-up Log: {selectedEnquiry?.studentName}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Parent: {selectedEnquiry?.guardianName} ({selectedEnquiry?.mobile})
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Class Sought: {selectedEnquiry?.className} | Status: {getStatusChip(selectedEnquiry?.status)}
            </Typography>
          </Box>

          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Previous Follow-up History
          </Typography>
          {selectedEnquiry?.followups?.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
              No follow-ups recorded yet.
            </Typography>
          ) : (
            <List dense sx={{ maxHeight: 180, overflow: 'auto', bgcolor: '#fafafa', borderRadius: 1, mb: 2 }}>
              {selectedEnquiry?.followups?.map((f) => (
                <ListItem key={f.id} alignItems="flex-start">
                  <ListItemText
                    primary={`${dayjs(f.followupDate).format('DD/MM/YYYY hh:mm A')} - ${f.response}`}
                    secondary={f.notes ? `Notes: ${f.notes}` : null}
                  />
                </ListItem>
              ))}
            </List>
          )}

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
            Log New Follow-up
          </Typography>
          <Box component="form" id="followup-form" onSubmit={handleSaveFollowup}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  size="small"
                  label="Parent / Caller Response"
                  placeholder="e.g. Visited school, requested syllabus, will decide by Monday"
                  value={followupResponse}
                  onChange={(e) => setFollowupResponse(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <AppDatePicker
                  label="Next Follow-up Date"
                  value={nextDate}
                  onChange={(e) => {
                    setNextDate(e.value ? dayjs(e.value).format('YYYY-MM-DD') : '');
                  }}
                  dateFormat="dd/M/yy"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Update Status"
                  value={updateStatus}
                  onChange={(e) => setUpdateStatus(Number(e.target.value))}
                >
                  <MenuItem value={2}>Follow-up</MenuItem>
                  <MenuItem value={3}>Converted to Admission</MenuItem>
                  <MenuItem value={4}>Closed / Not Interested</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  multiline
                  rows={2}
                  label="Additional Internal Notes"
                  value={followupNotes}
                  onChange={(e) => setFollowupNotes(e.target.value)}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={() => setFollowupModalOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button type="submit" form="followup-form" variant="contained">
            Save Follow-up
          </Button>
        </DialogActions>
      </Dialog>

      {/* Printable Enquiry Slip Modal */}
      <EnquirySlipModal
        open={slipModalOpen}
        onClose={() => setSlipModalOpen(false)}
        enquiryId={slipEnquiry?.id}
        enquiryData={slipEnquiry}
        isNew={isNewlyCreated}
        onConvertToAdmission={(enq) => {
          setSlipModalOpen(false);
          handleConvertToAdmission(enq);
        }}
      />
    </Box>
  );
};
