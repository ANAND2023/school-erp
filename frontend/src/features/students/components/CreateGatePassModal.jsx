import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stack,
  Divider,
  Grid,
  TextField,
  MenuItem,
  CircularProgress,
  Avatar,
  IconButton,
  Alert,
  Autocomplete
} from '@mui/material';
import {
  Close as CloseIcon,
  Badge as BadgeIcon,
  Person as PersonIcon,
  AccessTime as AccessTimeIcon,
  DirectionsWalk as WalkIcon,
  Search as SearchIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { gatePassApi } from '../api';
import { classesApi } from '../../masters/api';
import { useAuthStore } from '../../../store/authStore';
import { PhotoCaptureUpload } from './PhotoCaptureUpload';

const REASON_OPTIONS = [
  'Illness / Medical Issue',
  'Doctor / Hospital Appointment',
  'Family Emergency',
  'Parent Picked Up Early',
  'External Competition / Sports / Olympiad',
  'Special Leave Approved',
  'Personal / Domestic Work',
  'Other'
];

const RELATION_OPTIONS = [
  'Father',
  'Mother',
  'Guardian',
  'Brother / Sister',
  'Self (Walker / Cyclist)',
  'Driver / Van Incharge',
  'Other Authorized Escort'
];

export default function CreateGatePassModal({ open, onClose, onSuccess }) {
  const { user } = useAuthStore();

  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [studentSearchText, setStudentSearchText] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Form states
  const [outTime, setOutTime] = useState(dayjs().format('hh:mm A'));
  const [expectedReturnTime, setExpectedReturnTime] = useState('');
  const [reason, setReason] = useState('Illness / Medical Issue');
  const [reasonDetail, setReasonDetail] = useState('');
  const [receiverRelation, setReceiverRelation] = useState('Father');
  const [receiverName, setReceiverName] = useState('');
  const [receiverContact, setReceiverContact] = useState('');
  const [receiverPhotoUrl, setReceiverPhotoUrl] = useState('');
  const [approvedBy, setApprovedBy] = useState(user?.fullName || 'Principal / Incharge');
  const [remarks, setRemarks] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch classes
  const { data: classesRes } = useQuery({
    queryKey: ['classes-list'],
    queryFn: () => classesApi.getClasses(),
    enabled: open,
  });
  const classes = classesRes?.data?.data || [];
  const currentClass = classes.find((c) => String(c.id) === String(selectedClassId));
  const sections = currentClass?.sections || [];

  // Search students query
  const { data: studentsRes, isLoading: searchingStudents } = useQuery({
    queryKey: ['gate-pass-search-students', studentSearchText, selectedClassId, selectedSectionId],
    queryFn: () =>
      gatePassApi.searchStudents({
        query: studentSearchText,
        classId: selectedClassId || undefined,
        sectionId: selectedSectionId || undefined,
        limit: 30,
      }),
    enabled: open,
  });
  const studentList = studentsRes?.data?.data || [];

  // Reset modal when reopened
  useEffect(() => {
    if (open) {
      setOutTime(dayjs().format('hh:mm A'));
      setExpectedReturnTime('');
      setReason('Illness / Medical Issue');
      setReasonDetail('');
      setReceiverRelation('Father');
      setReceiverName('');
      setReceiverContact('');
      setReceiverPhotoUrl('');
      setApprovedBy(user?.fullName || 'Principal / Incharge');
      setRemarks('');
      setSelectedStudent(null);
      setErrorMsg('');
      setStudentSearchText('');
    }
  }, [open, user]);

  // When student is selected, auto-fill receiver info if Father/Mother/Guardian
  const handleStudentSelect = (student) => {
    setSelectedStudent(student);
    if (student) {
      if (receiverRelation === 'Father' && student.fatherName) {
        setReceiverName(student.fatherName);
        setReceiverContact(student.fatherMobile || student.emergencyContact || '');
      } else if (receiverRelation === 'Self (Walker / Cyclist)') {
        setReceiverName(student.fullName);
        setReceiverContact(student.emergencyContact || student.fatherMobile || '');
      } else {
        if (student.fatherName) setReceiverName(student.fatherName);
        if (student.fatherMobile) setReceiverContact(student.fatherMobile);
      }
    }
  };

  // When relation changes, update auto-filled receiver name
  const handleRelationChange = (newRel) => {
    setReceiverRelation(newRel);
    if (selectedStudent) {
      if (newRel === 'Father' && selectedStudent.fatherName) {
        setReceiverName(selectedStudent.fatherName);
        setReceiverContact(selectedStudent.fatherMobile || '');
      } else if (newRel === 'Self (Walker / Cyclist)') {
        setReceiverName(selectedStudent.fullName);
        setReceiverContact(selectedStudent.emergencyContact || selectedStudent.fatherMobile || '');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudent) {
      setErrorMsg('Please select a student.');
      return;
    }
    if (!receiverName.trim()) {
      setErrorMsg('Please enter the accompanying / receiver person name.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');

      const payload = {
        studentId: selectedStudent.studentId,
        passDate: dayjs().toISOString(),
        outTime: outTime.trim(),
        expectedReturnTime: expectedReturnTime.trim() || null,
        reason: reason.trim(),
        reasonDetail: reasonDetail.trim() || null,
        receiverName: receiverName.trim(),
        receiverRelation: receiverRelation.trim(),
        receiverContact: receiverContact.trim() || null,
        receiverPhotoUrl: receiverPhotoUrl?.trim() || null,
        approvedBy: approvedBy.trim() || 'Principal / Admin',
        remarks: remarks.trim() || null,
        status: 'Issued',
      };

      const res = await gatePassApi.createGatePass(payload);
      if (res.data?.success) {
        onSuccess(res.data.data);
      } else {
        setErrorMsg(res.data?.message || 'Failed to issue gate pass.');
      }
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || err.message || 'Error creating gate pass.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
      PaperProps={{
        component: 'form',
        onSubmit: handleSubmit,
        sx: {
          borderRadius: 2,
          maxHeight: 'calc(100vh - 48px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        },
      }}
    >
      <DialogTitle
        sx={{
          m: 0,
          p: 2,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: '#0f172a',
          color: '#ffffff',
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <BadgeIcon sx={{ color: '#38bdf8' }} />
          <Typography variant="h6" fontWeight={700}>
            Issue Student Gate Pass / Outpass
          </Typography>
        </Stack>
        <IconButton onClick={onClose} sx={{ color: '#94a3b8', '&:hover': { color: '#ffffff' } }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent
        dividers
        sx={{
          p: { xs: 2, sm: 3 },
          flex: '1 1 auto',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {errorMsg && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMsg('')}>
            {errorMsg}
          </Alert>
        )}

        {/* Section 1: Student Selection */}
          <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonIcon sx={{ color: '#0284c7', fontSize: 20 }} /> 1. Select Student
          </Typography>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={3}>
              <TextField
                select
                fullWidth
                size="small"
                label="Filter Class"
                value={selectedClassId}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  setSelectedSectionId('');
                }}
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
                label="Filter Section"
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                disabled={!selectedClassId}
              >
                <MenuItem value="">All Sections</MenuItem>
                {sections.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Autocomplete
                size="small"
                options={studentList}
                getOptionLabel={(option) =>
                  `${option.fullName} (${option.admissionNo || 'No Adm'}) - ${option.className || ''} ${option.sectionName || ''}`
                }
                value={selectedStudent}
                onChange={(_, newValue) => handleStudentSelect(newValue)}
                loading={searchingStudents}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Search Student (Name / Adm No / Phone)"
                    placeholder="Type name or admission number..."
                    onChange={(e) => setStudentSearchText(e.target.value)}
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {searchingStudents ? <CircularProgress color="inherit" size={18} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            </Grid>
          </Grid>

          {/* Student Selected Badge Card */}
          {selectedStudent && (
            <Box
              sx={{
                mb: 3,
                p: 1.5,
                borderRadius: 1.5,
                bgcolor: '#f0f9ff',
                border: '1px solid #bae6fd',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 2,
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar
                  src={selectedStudent.photoUrl}
                  sx={{ width: 44, height: 44, bgcolor: '#0284c7', fontWeight: 700 }}
                >
                  {selectedStudent.fullName?.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="subtitle2" fontWeight={800} color="#0369a1">
                    {selectedStudent.fullName}
                  </Typography>
                  <Typography variant="caption" color="#475569">
                    Adm: <strong>{selectedStudent.admissionNo}</strong> | Class: <strong>{selectedStudent.className} ({selectedStudent.sectionName})</strong>
                    {selectedStudent.rollNo ? ` | Roll: ${selectedStudent.rollNo}` : ''}
                  </Typography>
                </Box>
              </Stack>

              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="caption" color="#475569" display="block">
                  Father: <strong>{selectedStudent.fatherName || 'N/A'}</strong>
                </Typography>
                <Typography variant="caption" color="#475569" display="block">
                  Contact: <strong>{selectedStudent.fatherMobile || selectedStudent.emergencyContact || 'N/A'}</strong>
                </Typography>
              </Box>
            </Box>
          )}

          <Divider sx={{ my: 2 }} />

          {/* Section 2: Gate Pass Timings & Reason */}
          <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccessTimeIcon sx={{ color: '#0284c7', fontSize: 20 }} /> 2. Exit Schedule & Reason
          </Typography>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Exit / Out Time"
                value={outTime}
                onChange={(e) => setOutTime(e.target.value)}
                placeholder="e.g. 11:30 AM"
                helperText="Current departure time"
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Expected Return Time (Optional)"
                value={expectedReturnTime}
                onChange={(e) => setExpectedReturnTime(e.target.value)}
                placeholder="e.g. 02:00 PM (Leave empty if not returning today)"
                helperText="Leave blank if leaving for remainder of the day"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                size="small"
                label="Reason Category"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              >
                {REASON_OPTIONS.map((r) => (
                  <MenuItem key={r} value={r}>
                    {r}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Specific Reason / Medical Notes"
                value={reasonDetail}
                onChange={(e) => setReasonDetail(e.target.value)}
                placeholder="e.g. High fever / Dental checkup"
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          {/* Section 3: Escort / Accompanying Person & Photo */}
          <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <WalkIcon sx={{ color: '#0284c7', fontSize: 20 }} /> 3. Picked Up By / Escort Details & Photo
          </Typography>

          <Grid container spacing={2.5} alignItems="center" sx={{ mb: 3 }}>
            {/* Receiver / Escort Photo Upload with Live Camera & File Upload */}
            <Grid item xs={12} sm={3.5} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <PhotoCaptureUpload
                label="Receiver Photo"
                value={receiverPhotoUrl}
                onChange={(photo) => setReceiverPhotoUrl(photo)}
              />
              <Typography variant="caption" color="#64748b" sx={{ mt: 1, fontSize: '0.7rem', display: 'block' }}>
                Capture webcam photo or upload escort ID photo
              </Typography>
            </Grid>

            {/* Escort Info Fields */}
            <Grid item xs={12} sm={8.5}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Relationship to Student"
                    value={receiverRelation}
                    onChange={(e) => handleRelationChange(e.target.value)}
                    required
                  >
                    {RELATION_OPTIONS.map((rel) => (
                      <MenuItem key={rel} value={rel}>
                        {rel}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Receiver / Escort Name"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    placeholder="e.g. Rajesh Sharma"
                    required
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Escort Contact Number"
                    value={receiverContact}
                    onChange={(e) => setReceiverContact(e.target.value)}
                    placeholder="e.g. 9876543210"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Approved / Authorized By"
                    value={approvedBy}
                    onChange={(e) => setApprovedBy(e.target.value)}
                    placeholder="e.g. Principal / Class Teacher"
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>

          {/* Section 4: Security Remarks */}
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Security Remarks / Special Instructions (Optional)"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Additional instructions for security gate..."
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 2, flexShrink: 0, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
          <Button variant="outlined" onClick={onClose} disabled={submitting} color="inherit">
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={submitting || !selectedStudent}
            startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <CheckCircleIcon />}
            sx={{ fontWeight: 700 }}
          >
            {submitting ? 'Issuing Pass...' : 'Issue Gate Pass'}
          </Button>
        </DialogActions>
    </Dialog>
  );
}
