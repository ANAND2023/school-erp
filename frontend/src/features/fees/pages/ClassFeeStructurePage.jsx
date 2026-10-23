import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  MenuItem,
  Button,
  Stack,
  Divider,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  AccountBalanceWallet as WalletIcon,
  Print as PrintIcon,
  School as SchoolIcon,
  EventNote as EventNoteIcon,
  ContactSupport as EnquiryIcon,
  MenuBook as ProspectusIcon,
  Info as InfoIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { feesApi } from '../api';
import { classesApi } from '../../masters/api';
import { useAuthStore } from '../../../store/authStore';
import { printWithTitle, printElement } from '../../../utils/printUtils';
import ClassFeeProspectusModal from '../components/ClassFeeProspectusModal';
import ClassFeeProspectusSlip from '../components/ClassFeeProspectusSlip';

export default function ClassFeeStructurePage() {
  const { user, activeAcademicYearName } = useAuthStore();
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [prospectusModalOpen, setProspectusModalOpen] = useState(false);

  // Fetch classes
  const { data: classesRes } = useQuery({
    queryKey: ['classes-list'],
    queryFn: () => classesApi.getClasses(),
  });
  const classes = classesRes?.data?.data || [];

  // Fetch groups
  const { data: groupsRes } = useQuery({
    queryKey: ['fee-groups'],
    queryFn: () => feesApi.getGroups(),
  });
  const groups = groupsRes?.data?.data || [];

  // Auto-select first class & group
  useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id);
    }
    if (groups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(groups[0].id);
    }
  }, [classes, groups, selectedClassId, selectedGroupId]);

  // Query Class Fee Summary
  const {
    data: summaryRes,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['class-fee-summary', selectedClassId, selectedGroupId],
    queryFn: () => feesApi.getClassFeeSummary(selectedClassId || undefined, selectedGroupId || undefined),
    enabled: !!selectedClassId,
  });

  const summary = summaryRes?.data?.data;

  const schoolName = user?.schoolName || 'Modern Public School';
  const branchName = user?.branchName || '';

  const handlePrint = () => {
    if (!summary) return;
    printElement('page-class-fee-prospectus-slip', {
      title: `FeeProspectus_${summary?.className || 'Class'}_${activeAcademicYearName || 'Prospectus'}`,
      pageSize: 'A4',
      orientation: 'portrait',
      margin: '8mm',
    });
  };

  return (
    <Box sx={{ p: { xs: 1.5, sm: 3 }, maxWidth: 1400, mx: 'auto' }}>
      {/* On-screen Web Dashboard View (Hidden when printing via .no-print) */}
      <Box className="no-print">
        {/* Header */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          spacing={2}
          sx={{ mb: 3 }}
        >
          <Box>
            <Typography variant="h5" fontWeight={800} color="#0f172a" sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <ProspectusIcon sx={{ color: '#0284c7', fontSize: 32 }} />
              Class-wise Fee Structure (Admission & Enquiry)
            </Typography>
            <Typography variant="body2" color="#64748b" sx={{ mt: 0.5 }}>
              Instant fee lookup and printable prospectus for parent/student admission enquiries
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.5} alignItems="center">
            <Button
              variant="outlined"
              color="primary"
              startIcon={<VisibilityIcon />}
              onClick={() => setProspectusModalOpen(true)}
              disabled={!summary}
              sx={{
                fontWeight: 700,
                px: 2,
                py: 1,
                borderRadius: 2,
                borderColor: '#0284c7',
                color: '#0284c7',
                '&:hover': {
                  borderColor: '#0369a1',
                  bgcolor: '#f0f9ff',
                },
              }}
            >
              Preview Slip
            </Button>

            <Button
              variant="contained"
              color="primary"
              startIcon={<PrintIcon />}
              onClick={handlePrint}
              disabled={!summary}
              sx={{
                fontWeight: 700,
                px: 2.5,
                py: 1,
                borderRadius: 2,
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
              }}
            >
              Print Fee Prospectus Slip
            </Button>
          </Stack>
        </Stack>

      {/* Class & Group Selection Card */}
      <Card sx={{ mb: 3, borderRadius: 2, border: '1px solid #e2e8f0' }}>
        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
          <Grid container spacing={2.5} alignItems="center">
            <Grid item xs={12} sm={6} md={5}>
              <TextField
                select
                fullWidth
                size="small"
                label="Select Class"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                helperText="Choose standard/grade to view fee breakup"
              >
                {classes.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {groups.length > 1 && (
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Fee Category / Group"
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  helperText="Default: General/Regular"
                >
                  {groups.map((g) => (
                    <MenuItem key={g.id} value={g.id}>
                      {g.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            )}

            <Grid item xs={12} md={3} textAlign={{ xs: 'left', md: 'right' }}>
              <Chip
                icon={<SchoolIcon />}
                label={summary ? `Viewing: ${summary.className}` : 'Select a Class'}
                color="primary"
                sx={{ fontWeight: 800, fontSize: '0.9rem', py: 2, px: 1 }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {isLoading || isFetching ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <CircularProgress size={40} />
          <Typography variant="body2" color="#64748b" sx={{ mt: 1.5 }}>
            Loading fee structure for selected class...
          </Typography>
        </Box>
      ) : !summary ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          No fee structure configured for the selected class yet. You can set it up in <strong>Fees Management &gt; Fee Structure</strong>.
        </Alert>
      ) : (
        <>
          {/* KPI Summary Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <Card sx={{ bgcolor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 2 }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Typography variant="caption" fontWeight={700} color="#0369a1" textTransform="uppercase">
                    Total Annual Fee
                  </Typography>
                  <Typography variant="h4" fontWeight={800} color="#0c4a6e" sx={{ mt: 0.5 }}>
                    ₹{Number(summary.totalAnnualFee || 0).toLocaleString()}
                  </Typography>
                  <Typography variant="caption" color="#0284c7">
                    Mandatory: ₹{Number(summary.totalMandatoryFee || 0).toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={6} sm={3}>
              <Card sx={{ bgcolor: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 2 }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Typography variant="caption" fontWeight={700} color="#7e22ce" textTransform="uppercase">
                    One-Time / Admission
                  </Typography>
                  <Typography variant="h4" fontWeight={800} color="#581c87" sx={{ mt: 0.5 }}>
                    ₹{Number(summary.totalOneTimeFee || 0).toLocaleString()}
                  </Typography>
                  <Typography variant="caption" color="#7e22ce">
                    Payable at admission
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={6} sm={3}>
              <Card sx={{ bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 2 }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Typography variant="caption" fontWeight={700} color="#15803d" textTransform="uppercase">
                    Recurring / Tuition
                  </Typography>
                  <Typography variant="h4" fontWeight={800} color="#14532d" sx={{ mt: 0.5 }}>
                    ₹{Number(summary.totalRecurringFee || 0).toLocaleString()}
                  </Typography>
                  <Typography variant="caption" color="#15803d">
                    Distributed across sessions
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={6} sm={3}>
              <Card sx={{ bgcolor: '#fffbeb', border: '1px solid #fde68a', borderRadius: 2 }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Typography variant="caption" fontWeight={700} color="#b45309" textTransform="uppercase">
                    Optional Fees
                  </Typography>
                  <Typography variant="h4" fontWeight={800} color="#78350f" sx={{ mt: 0.5 }}>
                    ₹{Number(summary.totalOptionalFee || 0).toLocaleString()}
                  </Typography>
                  <Typography variant="caption" color="#b45309">
                    If opted by parent
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Quick Counselor Talking Points Notice */}
          <Box sx={{ mb: 3, p: 2, bgcolor: '#eff6ff', borderRadius: 2, border: '1px solid #bfdbfe' }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <EnquiryIcon sx={{ color: '#2563eb' }} />
              <Typography variant="subtitle2" fontWeight={800} color="#1e40af">
                Parent Enquiry Quick Talking Points:
              </Typography>
            </Stack>
            <Typography variant="body2" color="#1e3a8a" sx={{ mt: 0.5 }}>
              • For <strong>{summary.className}</strong>, the total annual tuition & regular fees amount to <strong>₹{Number(summary.totalMandatoryFee || 0).toLocaleString()}</strong>.
              {summary.totalOneTimeFee > 0 && ` One-time admission/registration fee is ₹${Number(summary.totalOneTimeFee).toLocaleString()}.`}
              {summary.installments && summary.installments.filter(i => i.totalAmount > 0).length > 0 &&
                ` Fee is split into ${summary.installments.filter(i => i.totalAmount > 0).length} installments (due on 10th of respective months).`
              }
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {/* Table 1: Fee Heads Breakdown */}
            <Grid item xs={12} md={7}>
              <Paper sx={{ p: 2.5, borderRadius: 2, border: '1px solid #e2e8f0' }}>
                <Typography variant="subtitle1" fontWeight={800} color="#0f172a" sx={{ mb: 2 }}>
                  Fee Components & Heads
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800, color: '#334155' }}>Component</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: '#334155' }}>Type</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: '#334155' }}>Nature</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, color: '#334155' }}>Annual Amount (₹)</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {summary.heads.map((h) => (
                        <TableRow key={h.feeHeadId} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={700} color="#0f172a">
                              {h.feeHeadName}
                            </Typography>
                            {h.feeHeadCode && (
                              <Typography variant="caption" color="#64748b">
                                Code: {h.feeHeadCode}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={h.feeHeadType === 'OneTime' ? 'One-Time' : 'Recurring'}
                              size="small"
                              sx={{ fontSize: '0.72rem', fontWeight: 700 }}
                            />
                          </TableCell>
                          <TableCell>
                            {h.isOptional ? (
                              <Chip label="Optional" size="small" color="warning" variant="outlined" sx={{ fontSize: '0.72rem', fontWeight: 700 }} />
                            ) : (
                              <Chip label="Mandatory" size="small" color="primary" variant="outlined" sx={{ fontSize: '0.72rem', fontWeight: 700 }} />
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={800} color="#0f172a">
                              ₹{Number(h.totalAnnualAmount || 0).toLocaleString()}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow sx={{ bgcolor: '#f1f5f9' }}>
                        <TableCell colSpan={3} sx={{ fontWeight: 800, color: '#0f172a' }}>
                          TOTAL ANNUAL FEE
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, color: '#0284c7', fontSize: '1rem' }}>
                          ₹{Number(summary.totalAnnualFee || 0).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>

            {/* Table 2: Installments & Due Dates */}
            <Grid item xs={12} md={5}>
              <Paper sx={{ p: 2.5, borderRadius: 2, border: '1px solid #e2e8f0' }}>
                <Typography variant="subtitle1" fontWeight={800} color="#0f172a" sx={{ mb: 2 }}>
                  Installment Schedule & Due Dates
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800, color: '#334155' }}>Installment</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: '#334155' }}>Due Date</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, color: '#334155' }}>Amount (₹)</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {summary.installments
                        .filter((inst) => inst.totalAmount > 0)
                        .map((inst) => (
                          <TableRow key={inst.installmentId} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight={700} color="#0f172a">
                                {inst.installmentName}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption" color="#475569">
                                {dayjs(inst.dueDate).format('DD MMM YYYY')}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight={800} color="#0f172a">
                                ₹{Number(inst.totalAmount || 0).toLocaleString()}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
      </Box>

      {/* Dedicated Clean Printable Slip (Positioned offscreen on web, captured by printElement & @media print) */}
      {summary && (
        <Box
          sx={{
            position: 'absolute',
            left: '-9999px',
            top: '-9999px',
            width: '210mm',
            '@media print': {
              position: 'static !important',
              left: 'auto !important',
              top: 'auto !important',
              display: 'block !important',
              width: '100% !important',
            },
          }}
        >
          <div id="page-class-fee-prospectus-slip">
            <ClassFeeProspectusSlip summary={summary} />
          </div>
        </Box>
      )}

      {/* Printable Modal */}
      <ClassFeeProspectusModal
        open={prospectusModalOpen}
        onClose={() => setProspectusModalOpen(false)}
        initialClassId={selectedClassId}
      />
    </Box>
  );
}
