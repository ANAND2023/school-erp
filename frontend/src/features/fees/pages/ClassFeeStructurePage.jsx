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
  Visibility as VisibilityIcon,
  TableChart as ExcelIcon,
  PictureAsPdf as PdfIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
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
      padding: '8mm',
    });
  };

  const handleDownloadExcel = () => {
    if (!summary) return;

    const data = [
      [`Class Fee Structure - ${summary.className}`],
      [`Academic Year: ${activeAcademicYearName || 'Current'} | Category: ${groups.find(g => g.id === selectedGroupId)?.name || 'General'}`],
      [],
      ['--- FEE COMPONENTS & HEADS ---'],
      ['Component Name', 'Code', 'Type', 'Nature', 'Annual Amount (Rs.)']
    ];

    (summary.heads || []).forEach(h => {
      data.push([
        h.feeHeadName || '',
        h.feeHeadCode || '',
        h.feeHeadType === 'OneTime' ? 'One-Time' : 'Recurring',
        h.isOptional ? 'Optional' : 'Mandatory',
        Number(h.totalAnnualAmount || 0)
      ]);
    });

    data.push(['TOTAL ANNUAL FEE', '', '', '', Number(summary.totalAnnualFee || 0)]);
    data.push([]);
    data.push(['--- INSTALLMENT SCHEDULE & DUE DATES ---']);
    data.push(['Installment Name', 'Due Date', 'Amount (Rs.)']);

    (summary.installments || []).filter(i => i.totalAmount > 0).forEach(i => {
      data.push([
        i.installmentName || '',
        i.dueDate ? dayjs(i.dueDate).format('DD MMM YYYY') : '',
        Number(i.totalAmount || 0)
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 28 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 20 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Fee Structure');
    XLSX.writeFile(wb, `FeeStructure_${summary.className || 'Class'}_${activeAcademicYearName || 'Export'}.xlsx`);
  };

  return (
    <Box sx={{ pb: 2 }}>
      {/* On-screen Web Dashboard View (Hidden when printing via .no-print) */}
      <Box className="no-print">
        {/* Header */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          spacing={1.5}
          sx={{ mb: 1.5 }}
        >
          <Box>
            <Typography variant="h6" fontWeight={800} sx={{ fontSize: { xs: '1.15rem', sm: '1.25rem' }, color: '#1e293b', m: 0, lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <ProspectusIcon sx={{ color: '#0284c7', fontSize: 22 }} />
              Class-wise Fee Structure (Admission & Enquiry)
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: { xs: '0.72rem', sm: '0.78rem' }, mt: 0.25 }}>
              Instant fee lookup and printable prospectus for parent/student admission enquiries
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              size="small"
              variant="contained"
              startIcon={<ExcelIcon sx={{ fontSize: 16 }} />}
              onClick={handleDownloadExcel}
              disabled={!summary}
              sx={{
                bgcolor: '#107c41',
                color: '#ffffff',
                height: 32,
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
              variant="outlined"
              startIcon={<VisibilityIcon sx={{ fontSize: 16 }} />}
              onClick={() => setProspectusModalOpen(true)}
              disabled={!summary}
              sx={{
                height: 32,
                fontSize: '0.78rem',
                fontWeight: 700,
                px: 1.5,
                borderRadius: '8px',
                borderColor: '#0284c7',
                color: '#0284c7',
                textTransform: 'none',
                '&:hover': { borderColor: '#0369a1', bgcolor: '#f0f9ff' },
                '&.Mui-disabled': { borderColor: '#cbd5e1', color: '#94a3b8' },
              }}
            >
              Preview Slip
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<PdfIcon sx={{ fontSize: 16 }} />}
              onClick={handlePrint}
              disabled={!summary}
              sx={{
                bgcolor: '#d32f2f',
                color: '#ffffff',
                height: 32,
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
              Print Prospectus Slip
            </Button>
          </Stack>
        </Stack>

        {/* Class & Group Selection Card */}
        <Card sx={{ mb: 1.5, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Grid container spacing={1.5} alignItems="center">
              <Grid item xs={12} sm={6} md={5}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Select Class"
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
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
                  >
                    {groups.map((g) => (
                      <MenuItem key={g.id} value={g.id}>
                        {g.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              )}

              <Grid item xs={12} md={groups.length > 1 ? 3 : 7} textAlign={{ xs: 'left', md: 'right' }}>
                <Chip
                  icon={<SchoolIcon sx={{ fontSize: 16 }} />}
                  label={summary ? `Viewing: ${summary.className}` : 'Select a Class'}
                  color="primary"
                  size="small"
                  sx={{ fontWeight: 700, fontSize: '0.8rem', height: 32, px: 1 }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {isLoading || isFetching ? (
          <Box sx={{ textAlign: 'center', py: 5 }}>
            <CircularProgress size={32} />
            <Typography variant="body2" color="#64748b" sx={{ mt: 1, fontSize: '0.82rem' }}>
              Loading fee structure for selected class...
            </Typography>
          </Box>
        ) : !summary ? (
          <Alert severity="info" sx={{ borderRadius: 1.5, py: 0.75, px: 1.5, fontSize: '0.82rem' }}>
            No fee structure configured for the selected class yet. You can set it up in <strong>Fees Management &gt; Fee Structure</strong>.
          </Alert>
        ) : (
          <>
            {/* KPI Summary Cards */}
            <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card
                  sx={{
                    p: 1.25,
                    borderRadius: 1.5,
                    border: '1px solid #bae6fd',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.08) 0%, rgba(255, 255, 255, 1) 100%)',
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="caption" sx={{ color: '#0369a1', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: 0.3, display: 'block' }}>
                        Total Annual Fee
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: '#0c4a6e', fontSize: '1.2rem', lineHeight: 1.2, my: 0.25 }}>
                        ₹{Number(summary.totalAnnualFee || 0).toLocaleString()}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#0284c7', fontSize: '0.67rem', display: 'block', noWrap: true }}>
                        Mandatory: <b>₹{Number(summary.totalMandatoryFee || 0).toLocaleString()}</b>
                      </Typography>
                    </Box>
                    <Box sx={{ width: 34, height: 34, minWidth: 34, bgcolor: '#e0f2fe', color: '#0284c7', borderRadius: 1.2, display: 'flex', alignItems: 'center', justifyContent: 'center', ml: 1 }}>
                      <WalletIcon sx={{ fontSize: 18 }} />
                    </Box>
                  </Stack>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card
                  sx={{
                    p: 1.25,
                    borderRadius: 1.5,
                    border: '1px solid #e9d5ff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.08) 0%, rgba(255, 255, 255, 1) 100%)',
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="caption" sx={{ color: '#7e22ce', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: 0.3, display: 'block' }}>
                        One-Time / Admission
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: '#581c87', fontSize: '1.2rem', lineHeight: 1.2, my: 0.25 }}>
                        ₹{Number(summary.totalOneTimeFee || 0).toLocaleString()}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#7e22ce', fontSize: '0.67rem', display: 'block', noWrap: true }}>
                        Payable at admission
                      </Typography>
                    </Box>
                    <Box sx={{ width: 34, height: 34, minWidth: 34, bgcolor: '#f3e8ff', color: '#7e22ce', borderRadius: 1.2, display: 'flex', alignItems: 'center', justifyContent: 'center', ml: 1 }}>
                      <SchoolIcon sx={{ fontSize: 18 }} />
                    </Box>
                  </Stack>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card
                  sx={{
                    p: 1.25,
                    borderRadius: 1.5,
                    border: '1px solid #bbf7d0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(255, 255, 255, 1) 100%)',
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="caption" sx={{ color: '#15803d', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: 0.3, display: 'block' }}>
                        Recurring / Tuition
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: '#14532d', fontSize: '1.2rem', lineHeight: 1.2, my: 0.25 }}>
                        ₹{Number(summary.totalRecurringFee || 0).toLocaleString()}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#15803d', fontSize: '0.67rem', display: 'block', noWrap: true }}>
                        Distributed in installments
                      </Typography>
                    </Box>
                    <Box sx={{ width: 34, height: 34, minWidth: 34, bgcolor: '#dcfce7', color: '#15803d', borderRadius: 1.2, display: 'flex', alignItems: 'center', justifyContent: 'center', ml: 1 }}>
                      <EventNoteIcon sx={{ fontSize: 18 }} />
                    </Box>
                  </Stack>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card
                  sx={{
                    p: 1.25,
                    borderRadius: 1.5,
                    border: '1px solid #fde68a',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(255, 255, 255, 1) 100%)',
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="caption" sx={{ color: '#b45309', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: 0.3, display: 'block' }}>
                        Optional Fees
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: '#78350f', fontSize: '1.2rem', lineHeight: 1.2, my: 0.25 }}>
                        ₹{Number(summary.totalOptionalFee || 0).toLocaleString()}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#b45309', fontSize: '0.67rem', display: 'block', noWrap: true }}>
                        If opted by parent
                      </Typography>
                    </Box>
                    <Box sx={{ width: 34, height: 34, minWidth: 34, bgcolor: '#fef3c7', color: '#b45309', borderRadius: 1.2, display: 'flex', alignItems: 'center', justifyContent: 'center', ml: 1 }}>
                      <EnquiryIcon sx={{ fontSize: 18 }} />
                    </Box>
                  </Stack>
                </Card>
              </Grid>
            </Grid>

            {/* Quick Counselor Talking Points Notice */}
            <Box sx={{ mb: 1.5, p: 1.25, bgcolor: '#eff6ff', borderRadius: 1.5, border: '1px solid #bfdbfe' }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <EnquiryIcon sx={{ color: '#2563eb', fontSize: 18 }} />
                <Typography variant="subtitle2" fontWeight={800} color="#1e40af" sx={{ fontSize: '0.8rem' }}>
                  Parent Enquiry Quick Talking Points:
                </Typography>
              </Stack>
              <Typography variant="caption" color="#1e3a8a" sx={{ mt: 0.25, display: 'block', fontSize: '0.74rem', lineHeight: 1.4 }}>
                • For <strong>{summary.className}</strong>, total annual tuition & regular fees amount to <strong>₹{Number(summary.totalMandatoryFee || 0).toLocaleString()}</strong>.
                {summary.totalOneTimeFee > 0 && ` One-time admission/registration fee is ₹${Number(summary.totalOneTimeFee).toLocaleString()}.`}
                {summary.installments && summary.installments.filter(i => i.totalAmount > 0).length > 0 &&
                  ` Fee is split into ${summary.installments.filter(i => i.totalAmount > 0).length} installments (due on 10th of respective months).`
                }
              </Typography>
            </Box>

            <Grid container spacing={1.5}>
              {/* Table 1: Fee Heads Breakdown */}
              <Grid item xs={12} md={7}>
                <Paper sx={{ p: 1.5, borderRadius: 1.5, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                  <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ mb: 1, fontSize: '0.85rem' }}>
                    Fee Components & Heads
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: '#f8fafc' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 800, color: '#334155', py: 0.8, fontSize: '0.75rem' }}>Component</TableCell>
                          <TableCell sx={{ fontWeight: 800, color: '#334155', py: 0.8, fontSize: '0.75rem' }}>Type</TableCell>
                          <TableCell sx={{ fontWeight: 800, color: '#334155', py: 0.8, fontSize: '0.75rem' }}>Nature</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800, color: '#334155', py: 0.8, fontSize: '0.75rem' }}>Annual Amount (₹)</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {summary.heads.map((h) => (
                          <TableRow key={h.feeHeadId} hover>
                            <TableCell sx={{ py: 0.75 }}>
                              <Typography variant="body2" fontWeight={700} color="#0f172a" sx={{ fontSize: '0.8rem', lineHeight: 1.2 }}>
                                {h.feeHeadName}
                              </Typography>
                              {h.feeHeadCode && (
                                <Typography variant="caption" color="#64748b" sx={{ fontSize: '0.7rem' }}>
                                  Code: {h.feeHeadCode}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell sx={{ py: 0.75 }}>
                              <Chip
                                label={h.feeHeadType === 'OneTime' ? 'One-Time' : 'Recurring'}
                                size="small"
                                sx={{ fontSize: '0.68rem', fontWeight: 700, height: 22 }}
                              />
                            </TableCell>
                            <TableCell sx={{ py: 0.75 }}>
                              {h.isOptional ? (
                                <Chip label="Optional" size="small" color="warning" variant="outlined" sx={{ fontSize: '0.68rem', fontWeight: 700, height: 22 }} />
                              ) : (
                                <Chip label="Mandatory" size="small" color="primary" variant="outlined" sx={{ fontSize: '0.68rem', fontWeight: 700, height: 22 }} />
                              )}
                            </TableCell>
                            <TableCell align="right" sx={{ py: 0.75 }}>
                              <Typography variant="body2" fontWeight={800} color="#0f172a" sx={{ fontSize: '0.8rem' }}>
                                ₹{Number(h.totalAnnualAmount || 0).toLocaleString()}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow sx={{ bgcolor: '#f1f5f9' }}>
                          <TableCell colSpan={3} sx={{ fontWeight: 800, color: '#0f172a', py: 0.8, fontSize: '0.78rem' }}>
                            TOTAL ANNUAL FEE
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800, color: '#0284c7', fontSize: '0.88rem', py: 0.8 }}>
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
                <Paper sx={{ p: 1.5, borderRadius: 1.5, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                  <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ mb: 1, fontSize: '0.85rem' }}>
                    Installment Schedule & Due Dates
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: '#f8fafc' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 800, color: '#334155', py: 0.8, fontSize: '0.75rem' }}>Installment</TableCell>
                          <TableCell sx={{ fontWeight: 800, color: '#334155', py: 0.8, fontSize: '0.75rem' }}>Due Date</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800, color: '#334155', py: 0.8, fontSize: '0.75rem' }}>Amount (₹)</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {summary.installments
                          .filter((inst) => inst.totalAmount > 0)
                          .map((inst) => (
                            <TableRow key={inst.installmentId} hover>
                              <TableCell sx={{ py: 0.75 }}>
                                <Typography variant="body2" fontWeight={700} color="#0f172a" sx={{ fontSize: '0.8rem' }}>
                                  {inst.installmentName}
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ py: 0.75 }}>
                                <Typography variant="caption" color="#475569" sx={{ fontSize: '0.72rem' }}>
                                  {dayjs(inst.dueDate).format('DD MMM YYYY')}
                                </Typography>
                              </TableCell>
                              <TableCell align="right" sx={{ py: 0.75 }}>
                                <Typography variant="body2" fontWeight={800} color="#0f172a" sx={{ fontSize: '0.8rem' }}>
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
