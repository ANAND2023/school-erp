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
  WhatsApp as WhatsAppIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dynamicAdmissionApi } from '../api/dynamicAdmissionApi';
import { useAuthStore } from '../../../store/authStore';
import { AdmissionSlipModal } from '../components/AdmissionSlipModal';
import apiClient from '../../../api/client';

const initialSingleState = {
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
};

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
  const [singleData, setSingleData] = useState(initialSingleState);

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

  // Generated Result Dialog / Slip Modal
  const [generatedSlip, setGeneratedSlip] = useState(null);
  const [slipModalOpen, setSlipModalOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const singleMutation = useMutation({
    mutationFn: (data) => dynamicAdmissionApi.createIndividualSlip(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['admission-slips']);
      queryClient.invalidateQueries(['admission-dashboard-stats']);
      const slip = res.data.data;
      setGeneratedSlip(slip);
      setSlipModalOpen(true);
      setSuccessMsg(`Admission Slip #${slip.slipNumber} generated successfully for ${slip.studentName}!`);

      // WhatsApp trigger: prompt or open
      if (slip.contactNumber) {
        const rawNum = String(slip.contactNumber).replace(/\D/g, '');
        const phone = rawNum.length === 10 ? `91${rawNum}` : rawNum;
        const msg = `*ADMISSION REGISTRATION SLIP*\n\nDear Parent/Student,\nAdmission registration has been successfully generated!\n\n*Slip No:* ${slip.slipNumber}\n*Student Name:* ${slip.studentName}\n*Class:* ${slip.className}\n*Registration Fee:* Rs. ${slip.feeAmount}\n*Paid Amount:* Rs. ${slip.paidAmount}\n*Balance Due:* Rs. ${slip.balanceAmount}\n*Payment Status:* ${slip.paymentStatus}`;
        const waUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`;
        window.open(waUrl, '_blank');
      }

      // Empty the form
      setSingleData(initialSingleState);
    },
  });

  const bulkMutation = useMutation({
    mutationFn: (data) => dynamicAdmissionApi.createBulkSlips(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['admission-slips']);
      queryClient.invalidateQueries(['admission-dashboard-stats']);
      setSuccessMsg(res.data.message || 'Bulk slips generated successfully!');
      setBulkRows([
        { studentName: '', classId: '', contactNumber: '', fatherName: '', gender: 'Male' },
        { studentName: '', classId: '', contactNumber: '', fatherName: '', gender: 'Male' },
        { studentName: '', classId: '', contactNumber: '', fatherName: '', gender: 'Male' },
      ]);
    },
  });

  const handleSingleSubmit = (e) => {
    e.preventDefault();
    if (!singleData.studentName || !singleData.classId || !singleData.contactNumber) {
      alert('Please fill mandatory fields: Student Name, Class, and Mobile Number.');
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
    <Box sx={{ p: { xs: 1.5, md: 2.5 } }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={900} sx={{ color: '#0f172a' }}>
          Admission Slip Generator & Payment Collection
        </Typography>
        <Typography variant="caption" sx={{ color: '#64748b' }}>
          Quick admission slip issuance (A4 1/3 compact layout) & WhatsApp receipt dispatch for <strong>{activeAcademicYearName || 'Current Session'}</strong>.
        </Typography>
      </Box>

      {successMsg && (
        <Paper sx={{ p: 1.2, mb: 2, bgcolor: '#ecfdf5', border: '1px solid #6ee7b7', color: '#065f46', display: 'flex', alignItems: 'center', gap: 1, borderRadius: 1.5 }}>
          <CheckIcon color="success" sx={{ fontSize: 20 }} />
          <Typography variant="subtitle2" fontWeight={700}>
            {successMsg}
          </Typography>
        </Paper>
      )}

      <Card sx={{ borderRadius: 2, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <Tabs
          value={tabIndex}
          onChange={(e, v) => setTabIndex(v)}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2, pt: 0.5, minHeight: 40 }}
        >
          <Tab icon={<SingleIcon />} iconPosition="start" label="Individual Slip Generation" sx={{ fontWeight: 700, minHeight: 40, py: 1 }} />
          <Tab icon={<BulkIcon />} iconPosition="start" label="Bulk Slips with Unified Payment" sx={{ fontWeight: 700, minHeight: 40, py: 1 }} />
        </Tabs>

        <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
          {/* ================= TAB 0: COMPACT INDIVIDUAL SLIP (3-4 FIELDS PER ROW) ================= */}
          {tabIndex === 0 && (
            <form onSubmit={handleSingleSubmit}>
              {/* Row 1: Student Core Info (4 fields) */}
              <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    label="Student Full Name *"
                    value={singleData.studentName}
                    onChange={(e) => setSingleData({ ...singleData, studentName: e.target.value })}
                    fullWidth
                    size="small"
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small" required>
                    <InputLabel>Seeking Class *</InputLabel>
                    <Select
                      value={singleData.classId}
                      label="Seeking Class *"
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
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    label="Primary Mobile No *"
                    value={singleData.contactNumber}
                    onChange={(e) => setSingleData({ ...singleData, contactNumber: e.target.value })}
                    fullWidth
                    size="small"
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
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
              </Grid>

              {/* Row 2: Parents & Alternate Details (4 fields - DOB optional) */}
              <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    label="Father's Name"
                    value={singleData.fatherName}
                    onChange={(e) => setSingleData({ ...singleData, fatherName: e.target.value })}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    label="Mother's Name"
                    value={singleData.motherName}
                    onChange={(e) => setSingleData({ ...singleData, motherName: e.target.value })}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    label="Date of Birth (Optional)"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={singleData.dob}
                    onChange={(e) => setSingleData({ ...singleData, dob: e.target.value })}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    label="Alternate Phone"
                    value={singleData.alternateNumber}
                    onChange={(e) => setSingleData({ ...singleData, alternateNumber: e.target.value })}
                    fullWidth
                    size="small"
                  />
                </Grid>
              </Grid>

              {/* Row 3: Address, Email & School (3 fields) */}
              <Grid container spacing={1.5} sx={{ mb: 2 }}>
                <Grid item xs={12} md={5}>
                  <TextField
                    label="Residential Address"
                    value={singleData.address}
                    onChange={(e) => setSingleData({ ...singleData, address: e.target.value })}
                    fullWidth
                    size="small"
                    placeholder="Locality / City / PIN"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3.5}>
                  <TextField
                    label="Email Address"
                    type="email"
                    value={singleData.email}
                    onChange={(e) => setSingleData({ ...singleData, email: e.target.value })}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3.5}>
                  <TextField
                    label="Previous School"
                    value={singleData.previousSchool}
                    onChange={(e) => setSingleData({ ...singleData, previousSchool: e.target.value })}
                    fullWidth
                    size="small"
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 1.5 }} />

              {/* Row 4: Fee & Payment Collection (4 fields) */}
              <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#0284c7', mb: 1, textTransform: 'uppercase' }}>
                Fee & Payment Collection
              </Typography>
              <Grid container spacing={1.5} alignItems="center">
                <Grid item xs={12} sm={6} md={2.5}>
                  <TextField
                    label="Registration Fee (₹)"
                    value={formConfig?.applicationFee || 500}
                    disabled
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={2.5}>
                  <TextField
                    label="Collected Amount (₹)"
                    type="number"
                    value={singleData.initialPaymentAmount}
                    onChange={(e) => setSingleData({ ...singleData, initialPaymentAmount: e.target.value })}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={2.5}>
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
                <Grid item xs={12} sm={6} md={4.5}>
                  <TextField
                    label="Txn Reference / Notes"
                    value={singleData.transactionReference}
                    onChange={(e) => setSingleData({ ...singleData, transactionReference: e.target.value })}
                    placeholder="UTR / UPI Ref / Cheque No"
                    fullWidth
                    size="small"
                  />
                </Grid>
              </Grid>

              {/* Submit Buttons */}
              <Box sx={{ mt: 2.5, display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  startIcon={<PrintIcon />}
                  disabled={singleMutation.isPending}
                  sx={{ textTransform: 'none', fontWeight: 800, px: 3, py: 1 }}
                >
                  {singleMutation.isPending ? 'Generating...' : 'Generate & Print Admission Registration Slip'}
                </Button>
              </Box>
            </form>
          )}

          {/* ================= TAB 1: BULK SLIPS GENERATOR ================= */}
          {tabIndex === 1 && (
            <Box>
              <Grid container spacing={1.5} sx={{ mb: 2 }}>
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

              <Divider sx={{ mb: 1.5 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#1e293b' }}>
                  Student Entries ({bulkRows.length} Rows)
                </Typography>
                <Button variant="outlined" startIcon={<AddIcon />} size="small" onClick={handleBulkAddRow}>
                  Add Row
                </Button>
              </Box>

              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                      <th style={{ padding: '6px 10px', fontSize: '0.8rem' }}>#</th>
                      <th style={{ padding: '6px 10px', fontSize: '0.8rem' }}>Student Name *</th>
                      <th style={{ padding: '6px 10px', fontSize: '0.8rem' }}>Class *</th>
                      <th style={{ padding: '6px 10px', fontSize: '0.8rem' }}>Mobile Number *</th>
                      <th style={{ padding: '6px 10px', fontSize: '0.8rem' }}>Father Name</th>
                      <th style={{ padding: '6px 10px', fontSize: '0.8rem' }}>Gender</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkRows.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '6px 10px', fontWeight: 700 }}>{idx + 1}</td>
                        <td style={{ padding: '4px' }}>
                          <input
                            type="text"
                            placeholder="Student Name"
                            value={row.studentName}
                            onChange={(e) => {
                              const updated = [...bulkRows];
                              updated[idx].studentName = e.target.value;
                              setBulkRows(updated);
                            }}
                            style={{ width: '100%', padding: '5px 8px', borderRadius: 4, border: '1px solid #cbd5e1' }}
                          />
                        </td>
                        <td style={{ padding: '4px' }}>
                          <select
                            value={row.classId}
                            onChange={(e) => {
                              const updated = [...bulkRows];
                              updated[idx].classId = e.target.value;
                              setBulkRows(updated);
                            }}
                            style={{ width: '100%', padding: '5px 8px', borderRadius: 4, border: '1px solid #cbd5e1' }}
                          >
                            <option value="">Select Class</option>
                            {classesList.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: '4px' }}>
                          <input
                            type="text"
                            placeholder="Mobile"
                            value={row.contactNumber}
                            onChange={(e) => {
                              const updated = [...bulkRows];
                              updated[idx].contactNumber = e.target.value;
                              setBulkRows(updated);
                            }}
                            style={{ width: '100%', padding: '5px 8px', borderRadius: 4, border: '1px solid #cbd5e1' }}
                          />
                        </td>
                        <td style={{ padding: '4px' }}>
                          <input
                            type="text"
                            placeholder="Father Name"
                            value={row.fatherName}
                            onChange={(e) => {
                              const updated = [...bulkRows];
                              updated[idx].fatherName = e.target.value;
                              setBulkRows(updated);
                            }}
                            style={{ width: '100%', padding: '5px 8px', borderRadius: 4, border: '1px solid #cbd5e1' }}
                          />
                        </td>
                        <td style={{ padding: '4px' }}>
                          <select
                            value={row.gender}
                            onChange={(e) => {
                              const updated = [...bulkRows];
                              updated[idx].gender = e.target.value;
                              setBulkRows(updated);
                            }}
                            style={{ width: '100%', padding: '5px 8px', borderRadius: 4, border: '1px solid #cbd5e1' }}
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

              <Box sx={{ mt: 2.5, display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
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

      {/* Official Admission Registration Slip Modal */}
      <AdmissionSlipModal
        open={slipModalOpen}
        onClose={() => setSlipModalOpen(false)}
        slip={generatedSlip}
      />
    </Box>
  );
};
