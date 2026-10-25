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
  WhatsApp as WhatsAppIcon,
  AccountBalanceWallet as FeeStructureIcon,
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
import { WhatsAppDialog } from '../../communication/components/WhatsAppDialog';
import { ClassFeeProspectusModal } from '../../fees/components/ClassFeeProspectusModal';
import { AppDatePicker, AppInput, AppSelect } from '../../../components/common';

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

  // WhatsApp Dialog State
  const [whatsAppModal, setWhatsAppModal] = useState({
    open: false,
    recipientName: '',
    recipientPhone: '',
    recipientRole: '',
    moduleKey: 'enquiry',
    moduleTitle: '',
    templateData: {},
  });

  // Class Fee Prospectus Modal
  const [feeProspectusOpen, setFeeProspectusOpen] = useState(false);
  const [feeProspectusClassId, setFeeProspectusClassId] = useState('');

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
    if (enquiry.status === 3) {
      showSnackbar('This enquiry has already been converted to an admission. Follow-ups are closed.', 'info');
      return;
    }
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

  const handleOpenWhatsApp = (enquiry) => {
    setWhatsAppModal({
      open: true,
      recipientName: enquiry.guardianName || enquiry.studentName,
      recipientPhone: enquiry.mobile,
      recipientRole: `Parent of ${enquiry.studentName}`,
      moduleKey: 'enquiry',
      moduleTitle: 'Enquiry Acknowledgement (WhatsApp)',
      templateData: {
        ParentName: enquiry.guardianName || 'Parent',
        StudentName: enquiry.studentName,
        ClassName: enquiry.className || 'Class Seeking Admission',
        EnquiryNo: enquiry.enquiryNo || `ENQ-${enquiry.id}`,
      },
    });
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
      width: 275,
      sortable: false,
      renderCell: (params) => {
        const enq = params.row;
        const canEdit = hasPermission('Enquiries', 'Edit');
        const canAdmit = hasPermission('Admissions', 'Add');
        const isConverted = enq.status === 3;

        return (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title={`Class Fee Structure (${enq.className || 'Class'})`}>
              <IconButton
                size="small"
                sx={{
                  color: '#0284c7',
                  bgcolor: '#f0f9ff',
                  '&:hover': { bgcolor: '#e0f2fe' },
                }}
                onClick={() => {
                  setFeeProspectusClassId(enq.classId || '');
                  setFeeProspectusOpen(true);
                }}
              >
                <FeeStructureIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Send WhatsApp Message">
              <IconButton
                size="small"
                sx={{
                  color: '#25D366',
                  bgcolor: '#f0fdf4',
                  '&:hover': { bgcolor: '#dcfce7' },
                }}
                onClick={() => handleOpenWhatsApp(enq)}
              >
                <WhatsAppIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Print Enquiry Slip">
              <IconButton size="small" color="info" onClick={() => handleOpenSlip(enq)}>
                <ReceiptLongIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={isConverted ? "Enquiry is already converted to admission" : "Log Follow-up Call / Visit"}>
              <span>
                <IconButton
                  size="small"
                  color="primary"
                  disabled={isConverted}
                  onClick={() => handleOpenFollowup(enq)}
                >
                  <FollowupIcon fontSize="small" />
                </IconButton>
              </span>
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
    <Box sx={{ pb: 4 }}>
      <Box sx={{ mb: { xs: 2, sm: 3 }, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 1.5 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, fontSize: { xs: '1.15rem', sm: '1.45rem' } }}>
            Student Enquiries & Leads
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.74rem', sm: '0.85rem' }, mt: 0.25 }}>
            Manage admission leads, follow-up calls, and lead conversions
          </Typography>
        </Box>
        <Button
          variant="outlined"
          color="primary"
          startIcon={<FeeStructureIcon />}
          onClick={() => {
            setFeeProspectusClassId(selectedClass || '');
            setFeeProspectusOpen(true);
          }}
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            borderRadius: 2,
            px: 2,
            py: 0.8,
            alignSelf: { xs: 'flex-start', sm: 'center' }
          }}
        >
          Class Fee Structure
        </Button>
      </Box>

      {/* Filter Toolbar */}
      <Paper sx={{ p: { xs: 1.25, sm: 2 }, mb: { xs: 1.5, sm: 2.5 }, borderRadius: 2 }}>
        <Grid container spacing={{ xs: 1.25, sm: 2 }} alignItems="flex-end">
          <Grid item xs={12} sm={6} md={4}>
            <Box component="form" onSubmit={handleSearchSubmit} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <Box sx={{ flex: 1 }}>
                <AppInput
                  label="Search Enquiries"
                  placeholder="Student, parent, phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </Box>
              <Button
                variant="contained"
                type="submit"
                startIcon={<SearchIcon />}
                sx={{
                  height: 30,
                  minHeight: 30,
                  minWidth: 90,
                  px: 1.5,
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '12px',
                  flexShrink: 0,
                  borderRadius: 1,
                  mt: '1px',
                }}
              >
                Search
              </Button>
            </Box>
          </Grid>
          <Grid item xs={12} sm={3} md={4}>
            <AppSelect
              label="Class Sought"
              placeholder="All Classes"
              value={selectedClass}
              options={classes.map((c) => ({ label: c.name, value: c.id }))}
              onChange={(e) => setSelectedClass(e.target.value)}
              showClear
            />
          </Grid>
          <Grid item xs={12} sm={3} md={4}>
            <AppSelect
              label="Enquiry Status"
              placeholder="All Statuses"
              value={selectedStatus}
              options={ENQUIRY_STATUSES.map((s) => ({ label: s.label, value: s.value }))}
              onChange={(e) => setSelectedStatus(e.target.value)}
              showClear
            />
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
        formId="enquiry-form"
        submitLabel="Save Enquiry"
      >
        <Box component="form" id="enquiry-form" onSubmit={handleCreateEnquiry} sx={{ mt: 1 }}>
          <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <AppSelect
                required
                label="Academic Session"
                value={newEnquiry.academicYearId || activeAcademicYearId || ''}
                options={academicYears.map((ay) => ({ label: ay.name || `Session ${ay.rawName}`, value: ay.id }))}
                onChange={(e) => setNewEnquiry({ ...newEnquiry, academicYearId: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <AppInput
                required
                label="Student Name"
                placeholder="Enter candidate name"
                value={newEnquiry.studentName}
                onChange={(e) => setNewEnquiry({ ...newEnquiry, studentName: e.target.value.toUpperCase() })}
                inputProps={{ style: { textTransform: 'uppercase' } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
                <Box sx={{ flex: 1 }}>
                  <AppSelect
                    required
                    label="Class Sought"
                    placeholder="Select Class"
                    value={newEnquiry.classId}
                    options={classes.map((c) => ({ label: c.name, value: c.id }))}
                    onChange={(e) => setNewEnquiry({ ...newEnquiry, classId: e.target.value })}
                  />
                </Box>
                {newEnquiry.classId && (
                  <Tooltip title="View fee details for this class">
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        setFeeProspectusClassId(newEnquiry.classId);
                        setFeeProspectusOpen(true);
                      }}
                      sx={{
                        height: 30,
                        minWidth: 70,
                        px: 1,
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '11px',
                        flexShrink: 0,
                        mb: '2px',
                        borderRadius: 1,
                      }}
                    >
                      Fee Info
                    </Button>
                  </Tooltip>
                )}
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <AppInput
                required
                label="Parent / Guardian Name"
                placeholder="Father or mother name"
                value={newEnquiry.guardianName}
                onChange={(e) => setNewEnquiry({ ...newEnquiry, guardianName: e.target.value.toUpperCase() })}
                inputProps={{ style: { textTransform: 'uppercase' } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <AppInput
                required
                label="Contact Mobile"
                placeholder="10 digit mobile"
                value={newEnquiry.mobile}
                maxLength={10}
                onChange={(e) => setNewEnquiry({ ...newEnquiry, mobile: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <AppInput
                label="Email Address"
                placeholder="parent@example.com"
                value={newEnquiry.email}
                onChange={(e) => setNewEnquiry({ ...newEnquiry, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <AppSelect
                label="Lead Source"
                placeholder="Select source"
                value={newEnquiry.source}
                options={[
                  { label: 'Walk-in Visit', value: 'Walk-in' },
                  { label: 'Website Form', value: 'Website' },
                  { label: 'Word of Mouth / Referral', value: 'Referral' },
                  { label: 'Social Media (FB/IG)', value: 'Social Media' },
                  { label: 'Newspaper Advertisement', value: 'Newspaper' },
                ]}
                onChange={(e) => setNewEnquiry({ ...newEnquiry, source: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
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
              <AppInput
                type="textarea"
                rows={2}
                label="Initial Discussion Notes"
                placeholder="Inquiries raised, discussion summary..."
                value={newEnquiry.notes}
                onChange={(e) => setNewEnquiry({ ...newEnquiry, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </Box>
      </Modal>

      {/* Follow-up History & Log Modal */}
      <Modal
        open={followupModalOpen}
        onClose={() => setFollowupModalOpen(false)}
        title={`Follow-up Log: ${selectedEnquiry?.studentName || ''}`}
        maxWidth="sm"
        formId="followup-form"
        submitLabel="Save Follow-up"
      >
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
            <Grid container spacing={1.5}>
              <Grid item xs={12}>
                <AppInput
                  required
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
                <AppSelect
                  label="Update Status"
                  value={updateStatus}
                  options={[
                    { label: 'Follow-up', value: 2 },
                    { label: 'Converted to Admission', value: 3 },
                    { label: 'Closed / Not Interested', value: 4 },
                  ]}
                  onChange={(e) => setUpdateStatus(Number(e.target.value))}
                />
              </Grid>
              <Grid item xs={12}>
                <AppInput
                  type="textarea"
                  rows={2}
                  label="Additional Internal Notes"
                  placeholder="Internal counselor remarks..."
                  value={followupNotes}
                  onChange={(e) => setFollowupNotes(e.target.value)}
                />
              </Grid>
            </Grid>
          </Box>
        </Modal>

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

      {/* WhatsApp Dialog */}
      <WhatsAppDialog
        open={whatsAppModal.open}
        onClose={() => setWhatsAppModal((prev) => ({ ...prev, open: false }))}
        recipientName={whatsAppModal.recipientName}
        recipientPhone={whatsAppModal.recipientPhone}
        recipientRole={whatsAppModal.recipientRole}
        moduleKey={whatsAppModal.moduleKey}
        moduleTitle={whatsAppModal.moduleTitle}
        templateData={whatsAppModal.templateData}
      />

      {/* Class Fee Structure / Prospectus Modal */}
      <ClassFeeProspectusModal
        open={feeProspectusOpen}
        onClose={() => setFeeProspectusOpen(false)}
        initialClassId={feeProspectusClassId}
      />
    </Box>
  );
};
