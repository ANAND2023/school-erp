import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  MenuItem,
  Button,
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  Stack,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Save as SaveIcon,
  Tag as TagIcon,
  Receipt as ReceiptIcon,
  School as SchoolIcon,
  ContactSupport as EnquiryIcon,
  Badge as StaffIcon,
  AssignmentTurnedIn as TcIcon,
  FormatListNumbered as SequenceIcon,
} from '@mui/icons-material';
import { numberingSeriesApi } from '../api';
import { useUiStore } from '../../../store/uiStore';
import { usePermission } from '../../../hooks/usePermission';

// Helper to compute sample preview on frontend in real-time
const calculatePreview = (item, branchCode = 'MAIN', ayName = '2026-27') => {
  const parts = [];

  // 1. Branch Code
  if (item.includeBranchCode && branchCode) {
    parts.push(branchCode.trim());
  }

  // 2. Prefix
  if (item.prefix && item.prefix.trim()) {
    parts.push(item.prefix.trim());
  }

  // 3. Academic Year
  if (item.includeAcademicYear && ayName) {
    const cleanAy = ayName.trim();
    if (item.yearFormat === 'YYYY-YY') {
      parts.push(cleanAy);
    } else if (item.yearFormat === 'YY-YY') {
      const split = cleanAy.split('-');
      const first = split[0].length >= 2 ? split[0].substring(split[0].length - 2) : split[0];
      const second = split.length > 1 ? split[1] : '';
      parts.push(`${first}-${second}`);
    } else if (item.yearFormat === 'YYYY') {
      const split = cleanAy.split('-');
      parts.push(split[0]);
    } else if (item.yearFormat === 'None') {
      // Omit
    } else {
      // Default YYYYYY (e.g. 202627)
      parts.push(cleanAy.replace('-', ''));
    }
  }

  // 4. Sequence number padding
  const digits = Number(item.digits) > 0 ? Number(item.digits) : 4;
  const startNum = Number(item.startNumber) > 0 ? Number(item.startNumber) : 1;
  const seqStr = String(startNum).padStart(digits, '0');
  parts.push(seqStr);

  // 5. Suffix
  if (item.suffix && item.suffix.trim()) {
    parts.push(item.suffix.trim());
  }

  const sep = item.separator !== undefined ? item.separator : '/';
  return parts.join(sep);
};

const getModuleIcon = (type) => {
  switch (type) {
    case 'Admission':
      return <SchoolIcon color="primary" />;
    case 'FeeReceipt':
      return <ReceiptIcon sx={{ color: '#16a34a' }} />;
    case 'Enquiry':
      return <EnquiryIcon sx={{ color: '#d97706' }} />;
    case 'TransferCertificate':
      return <TcIcon sx={{ color: '#7c3aed' }} />;
    case 'Staff':
      return <StaffIcon sx={{ color: '#0284c7' }} />;
    default:
      return <TagIcon />;
  }
};

export const NumberingSeriesPage = () => {
  const { showSnackbar } = useUiStore();
  const { hasPermission } = usePermission();

  const [seriesList, setSeriesList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchSeries = async () => {
    try {
      setLoading(true);
      const res = await numberingSeriesApi.getSeries();
      if (res.data?.success) {
        setSeriesList(res.data.data || []);
      }
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to load numbering series settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSeries();
  }, []);

  const handleChange = (index, field, value) => {
    setSeriesList((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [field]: value,
      };
      next[index].samplePreview = calculatePreview(next[index]);
      return next;
    });
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      const payload = seriesList.map((s) => ({
        moduleType: s.moduleType,
        prefix: s.prefix || '',
        includeBranchCode: !!s.includeBranchCode,
        includeAcademicYear: !!s.includeAcademicYear,
        yearFormat: s.yearFormat || 'YYYYYY',
        separator: s.separator !== undefined ? s.separator : '/',
        digits: Number(s.digits) || 4,
        startNumber: Number(s.startNumber) || 1,
        suffix: s.suffix || null,
      }));

      await numberingSeriesApi.saveSeries(payload);
      showSnackbar('All numbering series configurations saved successfully!', 'success');
      fetchSeries();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to save numbering series', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <div>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <SequenceIcon color="primary" sx={{ fontSize: 28 }} />
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Numbering Series & Prefix Settings
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Configure auto-increment series, custom prefixes, year format, and starting sequence numbers for all school documents.
          </Typography>
        </div>
        <Button
          variant="contained"
          color="primary"
          startIcon={<SaveIcon />}
          onClick={handleSaveAll}
          disabled={saving || loading}
          sx={{ fontWeight: 700, px: 3, py: 1 }}
        >
          {saving ? 'Saving Settings...' : 'Save All Numbering Formats'}
        </Button>
      </Box>

      {/* Info Alert */}
      <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
        <Typography variant="body2">
          <strong>Auto-Increment Logic:</strong> When a new Admission, Fee Receipt, Enquiry, or TC is generated, the system will automatically format the number according to your custom series and increment the counter safely.
        </Typography>
      </Alert>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {seriesList.map((item, index) => {
            const preview = item.samplePreview || calculatePreview(item);

            return (
              <Grid item xs={12} lg={6} key={item.moduleType || index}>
                <Card
                  elevation={2}
                  sx={{
                    borderRadius: 2,
                    border: '1px solid #e2e8f0',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <CardHeader
                      avatar={getModuleIcon(item.moduleType)}
                      title={
                        <Typography variant="subtitle1" fontWeight={700}>
                          {item.title || item.moduleType}
                        </Typography>
                      }
                      subheader={
                        <Typography variant="caption" color="text.secondary">
                          Module: <code>{item.moduleType}</code>
                        </Typography>
                      }
                      sx={{ pb: 1, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}
                    />
                    <CardContent sx={{ p: 2.5 }}>
                      {/* Live Preview Box */}
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 1.5,
                          mb: 2.5,
                          bgcolor: '#f0fdf4',
                          borderColor: '#86efac',
                          borderRadius: 1.5,
                        }}
                      >
                        <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                          LIVE FORMAT PREVIEW:
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                          <Chip
                            label={preview}
                            color="success"
                            sx={{
                              fontWeight: 800,
                              fontSize: 14,
                              height: 32,
                              px: 1,
                              letterSpacing: 0.5,
                              bgcolor: '#15803d',
                              color: '#ffffff',
                            }}
                          />
                        </Stack>
                      </Paper>

                      {/* Configuration Controls */}
                      <Grid container spacing={2}>
                        {/* Custom Prefix */}
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Prefix (Optional)"
                            placeholder="e.g. ADM, RCP, ENQ"
                            value={item.prefix || ''}
                            onChange={(e) => handleChange(index, 'prefix', e.target.value)}
                            helperText="Appears before serial"
                          />
                        </Grid>

                        {/* Separator */}
                        <Grid item xs={12} sm={6}>
                          <TextField
                            select
                            fullWidth
                            size="small"
                            label="Separator Character"
                            value={item.separator !== undefined ? item.separator : '/'}
                            onChange={(e) => handleChange(index, 'separator', e.target.value)}
                          >
                            <MenuItem value="/">/ (Forward Slash)</MenuItem>
                            <MenuItem value="-">- (Hyphen / Dash)</MenuItem>
                            <MenuItem value="_">_ (Underscore)</MenuItem>
                            <MenuItem value="">None (No separator)</MenuItem>
                          </TextField>
                        </Grid>

                        {/* Year Format */}
                        <Grid item xs={12} sm={6}>
                          <TextField
                            select
                            fullWidth
                            size="small"
                            label="Academic Year Format"
                            disabled={!item.includeAcademicYear}
                            value={item.yearFormat || 'YYYYYY'}
                            onChange={(e) => handleChange(index, 'yearFormat', e.target.value)}
                          >
                            <MenuItem value="YYYYYY">202627 (Continuous 6 digits)</MenuItem>
                            <MenuItem value="YYYY-YY">2026-27 (Full Hyphenated)</MenuItem>
                            <MenuItem value="YY-YY">26-27 (Short Hyphenated)</MenuItem>
                            <MenuItem value="YYYY">2026 (Single Year)</MenuItem>
                            <MenuItem value="None">None (Exclude Year)</MenuItem>
                          </TextField>
                        </Grid>

                        {/* Zero Padding Digits */}
                        <Grid item xs={12} sm={6}>
                          <TextField
                            select
                            fullWidth
                            size="small"
                            label="Serial Digits (Padding)"
                            value={item.digits || 4}
                            onChange={(e) => handleChange(index, 'digits', Number(e.target.value))}
                          >
                            <MenuItem value={3}>3 Digits (e.g. 001)</MenuItem>
                            <MenuItem value={4}>4 Digits (e.g. 0001)</MenuItem>
                            <MenuItem value={5}>5 Digits (e.g. 00001)</MenuItem>
                            <MenuItem value={6}>6 Digits (e.g. 000001)</MenuItem>
                            <MenuItem value={7}>7 Digits (e.g. 0000001)</MenuItem>
                          </TextField>
                        </Grid>

                        {/* Starting / Next Number */}
                        <Grid item xs={12} sm={6}>
                          <TextField
                            type="number"
                            fullWidth
                            size="small"
                            label="Starting / Next Number"
                            value={item.startNumber || 1}
                            inputProps={{ min: 1 }}
                            onChange={(e) => handleChange(index, 'startNumber', Number(e.target.value))}
                            helperText={`Current Counter: ${item.currentSequence || 0}`}
                          />
                        </Grid>

                        {/* Suffix */}
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Suffix (Optional)"
                            placeholder="e.g. A, S1"
                            value={item.suffix || ''}
                            onChange={(e) => handleChange(index, 'suffix', e.target.value)}
                            helperText="Appears at the very end"
                          />
                        </Grid>

                        {/* Toggle Switches */}
                        <Grid item xs={12} sm={6}>
                          <FormControlLabel
                            control={
                              <Switch
                                size="small"
                                checked={!!item.includeBranchCode}
                                onChange={(e) => handleChange(index, 'includeBranchCode', e.target.checked)}
                              />
                            }
                            label={<Typography variant="body2">Include Branch Code (e.g. MAIN)</Typography>}
                          />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                          <FormControlLabel
                            control={
                              <Switch
                                size="small"
                                checked={!!item.includeAcademicYear}
                                onChange={(e) => handleChange(index, 'includeAcademicYear', e.target.checked)}
                              />
                            }
                            label={<Typography variant="body2">Include Academic Year</Typography>}
                          />
                        </Grid>
                      </Grid>
                    </CardContent>
                  </div>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
};

export default NumberingSeriesPage;
