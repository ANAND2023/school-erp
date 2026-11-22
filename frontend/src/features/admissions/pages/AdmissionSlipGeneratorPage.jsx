import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Paper,
  Tabs,
  Tab,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  People as BulkIcon,
  Person as SingleIcon,
  Print as PrintIcon,
  Payment as PaymentIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dynamicAdmissionApi } from '../api/dynamicAdmissionApi';
import { useAuthStore } from '../../../store/authStore';
import apiClient from '../../../api/client';

export const AdmissionSlipGeneratorPage = () => {
  const queryClient = useQueryClient();
  const { activeAcademicYearId, activeAcademicYearName } = useAuthStore();
  const [tabIndex, setTabIndex] = useState(0); // 0 = Single, 1 = Bulk

  // Classes list
  const { data: classesRes } = useQuery({
    queryKey: ['classes-list'],
    queryFn: () => apiClient.get('/classes'),
  });
  const classesList = classesRes?.data?.data || [];

  // Form config
  const { data: configRes } = useQuery({
    queryKey: ['admission-form-config', activeAcademicYearId],
    queryFn: () => dynamicAdmissionApi.getFormConfig(activeAcademicYearId),
  });
  const formConfig = configRes?.data?.data || null;

  // Single Form State
  const [singleData, setSingleData] = useState({
    studentName: '',
    classId: '',
    gender: 'Male',
    dob: '',
    fatherName: '',
    motherName: '',
    contactNumber: '',
    alternateNumber: '',
    email: '',
    address: '',
    state: '',
    city: '',
    previousSchool: '',
    initialPaymentAmount: 500,
    paymentMode: 'Cash',
    transactionReference: '',
    paymentNote: 'Initial registration fee',
    customFields: {},
  });

  // Bulk Form State
  const [bulkFeePerSlip, setBulkFeePerSlip] = useState(500);
  const [bulkCollectAmount, setBulkCollectAmount] = useState(500);
  const [bulkPaymentMode, setBulkPaymentMode] = useState('Cash');
  const [bulkTxnRef, setBulkTxnRef] = useState('');
  const [bulkPaymentNote, setBulkPaymentNote] = useState('Bulk admission batch');
  const [bulkRows, setBulkRows] = useState([
    { studentName: '', classId: '', contactNumber: '', fatherName: '', gender: 'Male' },
    { studentName: '', classId: '', contactNumber: '', fatherName: '', gender: 'Male' },
    { studentName: '', classId: '', contactNumber: '', fatherName: '', gender: 'Male' },
  ]);

  // Generated Result Dialog
  const [generatedSlip, setGeneratedSlip] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  const singleMutation = useMutation({
    mutationFn: (data) => dynamicAdmissionApi.createIndividualSlip(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['admission-slips']);
      queryClient.invalidateQueries(['admission-dashboard-stats']);
      setGeneratedSlip(res.data.data);
      setSuccessMsg('Individual admission slip created successfully!');
    },
  });

  const bulkMutation = useMutation({
    mutationFn: (data) => dynamicAdmissionApi.createBulkSlips(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['admission-slips']);
      queryClient.invalidateQueries(['admission-dashboard-stats']);
      setSuccessMsg(res.data.message || 'Bulk slips generated successfully!');
      // Reset rows
      setBulkRows([
        { studentName: '', classId: '', contactNumber: '', fatherName: '', gender: 'Male' },
        { studentName: '', classId: '', contactNumber: '', fatherName: '', gender: 'Male' },
      ]);
    },
  });

  const handleSingleSubmit = (e) => {
    e.preventDefault();
    if (!singleData.studentName || !singleData.classId || !singleData.contactNumber) {
      alert('Please fill mandatory student details (Name, Class, Mobile Number).');
      return;
    }

    singleMutation.mutate({
      ...singleData,
      academicYearId: activeAcademicYearId,
      feeAmount: formConfig?.applicationFee || 500,
      initialPaymentAmount: Number(singleData.initialPaymentAmount) || 0,
      classId: Number(singleData.classId),
    });
  };

  const handleBulkAddRow = () => {
    setBulkRows([...bulkRows, { studentName: '', classId: '', contactNumber: '', fatherName: '', gender: 'Male' }]);
  };

  const handleBulkSubmit = () => {
    const validRows = bulkRows.filter((r) => r.studentName.trim() && r.classId && r.contactNumber.trim());
    if (validRows.length === 0) {
      alert('Please fill at least one student row completely.');
      return;
    }

    bulkMutation.mutate({
      academicYearId: activeAcademicYearId,
      feeAmountPerSlip: Number(bulkFeePerSlip) || 0,
      collectAmountPerSlip: Number(bulkCollectAmount) || 0,
      paymentMode: bulkPaymentMode,
      transactionReference: bulkTxnRef,
      paymentNote: bulkPaymentNote,
      slips: validRows.map((r) => ({
        ...r,
        classId: Number(r.classId),
      })),
    });
  };

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 } }}>
      <Box sx={{ mb: 2.5 }}>
        <Typography variant="h5" fontWeight={900} sx={{ color: '#0f172a' }}>
          Admission Slip Generator & Payment Collection
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748b' }}>
          Issue single or bulk admission slips with integrated payment modes for session <strong>{activeAcademicYearName || 'Current Session'}</strong>.
        </Typography>
      </Box>

      {successMsg && (
        <Paper sx={{ p: 1.5, mb: 2, bgcolor: '#ecfdf5', border: '1px solid #6ee7b7', color: '#065f46', display: 'flex', alignItems: 'center', gap: 1, borderRadius: 2 }}>
          <CheckIcon color="success" />
          <Typography variant="subtitle2" fontWeight={700}>
            {successMsg}
          </Typography>
        </Paper>
      )}

      <Card sx={{ borderRadius: 2, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <Tabs
          value={tabIndex}
          onChange={(e, v) => setTabIndex(v)}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2, pt: 1 }}
        >
          <Tab icon={<SingleIcon />} iconPosition="start" label="Individual Slip Generation" sx={{ fontWeight: 700 }} />
          <Tab icon={<BulkIcon />} iconPosition="start" label="Bulk Slips with Unified Payment" sx={{ fontWeight: 700 }} />
        </Tabs>

        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          {/* ================= TAB 0: INDIVIDUAL SLIP ================= */}
          {tabIndex === 0 && (
            <form onSubmit={handleSingleSubmit}>
              <Typography variant="subtitle1" fontWeight={800} sx={{ color: '#1e293b', mb: 2 }}>
                1. Student & Academic Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Student Full Name *"
                    value={singleData.studentName}
                    onChange={(e) => setSingleData({ ...singleData, studentName: e.target.value })}
                    fullWidth
                    size="small"
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small" required>
                    <InputLabel>Admission Seeking Class *</InputLabel>
                    <Select
                      value={singleData.classId}
                      label="Admission Seeking Class *"
                      onChange={(e) => setSingleData({ ...singleData, classId: e.target.value })}
                    >
                      {classesList.map((c) => (
                        <MenuItem key={c.id} value={c.id}>
                          {c.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Gender</InputLabel>
                    <Select
                      value={singleData.gender}
                      label="Gender"
                      onChange={(e) => setSingleData({ ...singleData, gender: e.target.value })}
                    >
                      <MenuItem value="Male">Male</MenuItem>
                      <MenuItem value="Female">Female</MenuItem>
                      <MenuItem value="Other">Other</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Date of Birth"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={singleData.dob}
                    onChange={(e) => setSingleData({ ...singleData, dob: e.target.value })}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Father's Name"
                    value={singleData.fatherName}
                    onChange={(e) => setSingleData({ ...singleData, fatherName: e.target.value })}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Mother's Name"
                    value={singleData.motherName}
                    onChange={(e) => setSingleData({ ...singleData, motherName: e.target.value })}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Primary Mobile Number *"
                    value={singleData.contactNumber}
                    onChange={(e) => setSingleData({ ...singleData, contactNumber: e.target.value })}
                    fullWidth
                    size="small"
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Alternate Mobile"
                    value={singleData.alternateNumber}
                    onChange={(e) => setSingleData({ ...singleData, alternateNumber: e.target.value })}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Email Address"
                    type="email"
                    value={singleData.email}
                    onChange={(e) => setSingleData({ ...singleData, email: e.target.value })}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Previous School Name"
                    value={singleData.previousSchool}
                    onChange={(e) => setSingleData({ ...singleData, previousSchool: e.target.value })}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Residential Address"
                    value={singleData.address}
                    onChange={(e) => setSingleData({ ...singleData, address: e.target.value })}
                    fullWidth
                    multiline
                    rows={2}
                    size="small"
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              <Typography variant="subtitle1" fontWeight={800} sx={{ color: '#1e293b', mb: 2 }}>
                2. Registration Fee & Payment Collection
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Total Fee Amount (₹)"
                    value={formConfig?.applicationFee || 500}
                    disabled
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Collected Amount (₹)"
                    type="number"
                    value={singleData.initialPaymentAmount}
                    onChange={(e) => setSingleData({ ...singleData, initialPaymentAmount: e.target.value })}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Payment Mode</InputLabel>
                    <Select
                      value={singleData.paymentMode}
                      label="Payment Mode"
                      onChange={(e) => setSingleData({ ...singleData, paymentMode: e.target.value })}
                    >
                      <MenuItem value="Cash">Cash</MenuItem>
                      <MenuItem value="UPI">UPI</MenuItem>
                      <MenuItem value="Online">Online Gateway</MenuItem>
                      <MenuItem value="Card">Card</MenuItem>
                      <MenuItem value="Cheque">Cheque</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Transaction Reference / Cheque No"
                    value={singleData.transactionReference}
                    onChange={(e) => setSingleData({ ...singleData, transactionReference: e.target.value })}
                    placeholder="e.g. UPI Ref / Bank Txn ID"
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Payment Remarks"
                    value={singleData.paymentNote}
                    onChange={(e) => setSingleData({ ...singleData, paymentNote: e.target.value })}
                    fullWidth
                    size="small"
                  />
                </Grid>
              </Grid>

              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  size="large"
                  startIcon={<PrintIcon />}
                  disabled={singleMutation.isPending}
                  sx={{ textTransform: 'none', fontWeight: 800, px: 4 }}
                >
                  {singleMutation.isPending ? 'Generating...' : 'Generate & Print Slip'}
                </Button>
              </Box>
            </form>
          )}

          {/* ================= TAB 1: BULK SLIPS GENERATOR ================= */}
          {tabIndex === 1 && (
            <Box>
              <Typography variant="subtitle1" fontWeight={800} sx={{ color: '#1e293b', mb: 2 }}>
                1. Unified Batch Payment Settings
              </Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={3}>
                  <TextField
                    label="Fee Per Slip (₹)"
                    type="number"
                    value={bulkFeePerSlip}
                    onChange={(e) => setBulkFeePerSlip(e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    label="Collect Amount Per Slip (₹)"
                    type="number"
                    value={bulkCollectAmount}
                    onChange={(e) => setBulkCollectAmount(e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Payment Mode</InputLabel>
                    <Select
                      value={bulkPaymentMode}
                      label="Payment Mode"
                      onChange={(e) => setBulkPaymentMode(e.target.value)}
                    >
                      <MenuItem value="Cash">Cash</MenuItem>
                      <MenuItem value="UPI">UPI</MenuItem>
                      <MenuItem value="Online">Online Gateway</MenuItem>
                      <MenuItem value="Card">Card</MenuItem>
                      <MenuItem value="Cheque">Cheque</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    label="Batch Reference / Txn"
                    value={bulkTxnRef}
                    onChange={(e) => setBulkTxnRef(e.target.value)}
                    placeholder="Batch Receipt / UTR"
                    fullWidth
                    size="small"
                  />
                </Grid>
              </Grid>

              <Divider sx={{ mb: 2 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="subtitle1" fontWeight={800} sx={{ color: '#1e293b' }}>
                  2. Student Entries ({bulkRows.length} Rows)
                </Typography>
                <Button variant="outlined" startIcon={<AddIcon />} size="small" onClick={handleBulkAddRow}>
                  Add Row
                </Button>
              </Box>

              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                      <th style={{ padding: '8px 12px', fontSize: '0.85rem' }}>#</th>
                      <th style={{ padding: '8px 12px', fontSize: '0.85rem' }}>Student Name *</th>
                      <th style={{ padding: '8px 12px', fontSize: '0.85rem' }}>Class *</th>
                      <th style={{ padding: '8px 12px', fontSize: '0.85rem' }}>Mobile Number *</th>
                      <th style={{ padding: '8px 12px', fontSize: '0.85rem' }}>Father Name</th>
                      <th style={{ padding: '8px 12px', fontSize: '0.85rem' }}>Gender</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkRows.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '6px 12px', fontWeight: 700 }}>{idx + 1}</td>
                        <td style={{ padding: '6px' }}>
                          <input
                            type="text"
                            placeholder="Student Name"
                            value={row.studentName}
                            onChange={(e) => {
                              const updated = [...bulkRows];
                              updated[idx].studentName = e.target.value;
                              setBulkRows(updated);
                            }}
                            style={{ width: '100%', padding: '6px 10px', borderRadius: 4, border: '1px solid #cbd5e1' }}
                          />
                        </td>
                        <td style={{ padding: '6px' }}>
                          <select
                            value={row.classId}
                            onChange={(e) => {
                              const updated = [...bulkRows];
                              updated[idx].classId = e.target.value;
                              setBulkRows(updated);
                            }}
                            style={{ width: '100%', padding: '6px 10px', borderRadius: 4, border: '1px solid #cbd5e1' }}
                          >
                            <option value="">Select Class</option>
                            {classesList.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: '6px' }}>
                          <input
                            type="text"
                            placeholder="Mobile"
                            value={row.contactNumber}
                            onChange={(e) => {
                              const updated = [...bulkRows];
                              updated[idx].contactNumber = e.target.value;
                              setBulkRows(updated);
                            }}
                            style={{ width: '100%', padding: '6px 10px', borderRadius: 4, border: '1px solid #cbd5e1' }}
                          />
                        </td>
                        <td style={{ padding: '6px' }}>
                          <input
                            type="text"
                            placeholder="Father Name"
                            value={row.fatherName}
                            onChange={(e) => {
                              const updated = [...bulkRows];
                              updated[idx].fatherName = e.target.value;
                              setBulkRows(updated);
                            }}
                            style={{ width: '100%', padding: '6px 10px', borderRadius: 4, border: '1px solid #cbd5e1' }}
                          />
                        </td>
                        <td style={{ padding: '6px' }}>
                          <select
                            value={row.gender}
                            onChange={(e) => {
                              const updated = [...bulkRows];
                              updated[idx].gender = e.target.value;
                              setBulkRows(updated);
                            }}
                            style={{ width: '100%', padding: '6px 10px', borderRadius: 4, border: '1px solid #cbd5e1' }}
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>

              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  startIcon={<BulkIcon />}
                  onClick={handleBulkSubmit}
                  disabled={bulkMutation.isPending}
                  sx={{ textTransform: 'none', fontWeight: 800, px: 4 }}
                >
                  {bulkMutation.isPending ? 'Processing Batch...' : 'Generate All Batch Slips'}
                </Button>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Generated Slip Modal / Printable View */}
      {generatedSlip && (
        <Dialog open={Boolean(generatedSlip)} onClose={() => setGeneratedSlip(null)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ fontWeight: 900, bgcolor: '#0284c7', color: '#ffffff', display: 'flex', justifyContent: 'space-between' }}>
            <span>Admission Slip Generated</span>
            <Chip label={generatedSlip.slipNumber} sx={{ bgcolor: '#ffffff', color: '#0284c7', fontWeight: 800 }} />
          </DialogTitle>
          <DialogContent dividers sx={{ p: 3 }}>
            <Box sx={{ border: '2px solid #0284c7', p: 3, borderRadius: 2, bgcolor: '#ffffff' }}>
              <Box sx={{ textAlign: 'center', borderBottom: '2px solid #0284c7', pb: 2, mb: 2 }}>
                <Typography variant="h5" fontWeight={900} sx={{ color: '#0f172a' }}>
                  DELHI PUBLIC SCHOOL
                </Typography>
                <Typography variant="subtitle2" sx={{ color: '#0284c7', fontWeight: 700 }}>
                  OFFICIAL ADMISSION REGISTRATION SLIP
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  Session: {activeAcademicYearName || '2026-2027'} &bull; Slip No: <strong>{generatedSlip.slipNumber}</strong>
                </Typography>
              </Box>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="body2"><strong>Student Name:</strong> {generatedSlip.studentName}</Typography>
                  <Typography variant="body2"><strong>Class:</strong> {generatedSlip.className}</Typography>
                  <Typography variant="body2"><strong>Mobile:</strong> {generatedSlip.contactNumber}</Typography>
                  <Typography variant="body2"><strong>Father:</strong> {generatedSlip.fatherName || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={6} sx={{ textAlign: 'right' }}>
                  <Typography variant="body2"><strong>Total Fee:</strong> ₹{generatedSlip.feeAmount}</Typography>
                  <Typography variant="body2" sx={{ color: '#16a34a' }}><strong>Paid Amount:</strong> ₹{generatedSlip.paidAmount}</Typography>
                  <Typography variant="body2" sx={{ color: '#dc2626' }}><strong>Balance:</strong> ₹{generatedSlip.balanceAmount}</Typography>
                  <Typography variant="body2"><strong>Status:</strong> {generatedSlip.paymentStatus}</Typography>
                </Grid>
              </Grid>

              <Box sx={{ mt: 3, pt: 2, borderTop: '1px dashed #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  Generated on: {new Date(generatedSlip.createdOn).toLocaleString()}
                </Typography>
                <Typography variant="caption" fontWeight={700}>
                  Authorized Signatory
                </Typography>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setGeneratedSlip(null)}>Close</Button>
            <Button variant="contained" startIcon={<PrintIcon />} onClick={() => window.print()}>
              Print Slip
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};
