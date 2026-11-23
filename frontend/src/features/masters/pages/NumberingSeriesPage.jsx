import React, { useState, useEffect, useMemo } from 'react';
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
  InputAdornment,
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
  Verified as VerifiedIcon,
  CalendarMonth as CalendarIcon,
  AccessTime as TimeIcon,
  WorkspacePremium as AwardIcon,
  Description as DocumentIcon,
  DirectionsWalk as GatePassIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { numberingSeriesApi } from '../api';
import { useUiStore } from '../../../store/uiStore';
import { usePermission } from '../../../hooks/usePermission';
import { useThemeStore, shadeColor } from '../../../store/themeStore';

// Helper to compute sample preview on frontend in real-time
const calculatePreview = (item, branchCode = '', ayName = '2026-27') => {
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
    case 'BonafideCertificate':
      return <VerifiedIcon sx={{ color: '#0284c7' }} />;
    case 'BirthCertificate':
      return <CalendarIcon sx={{ color: '#0f766e' }} />;
    case 'AgeCertificate':
      return <TimeIcon sx={{ color: '#b45309' }} />;
    case 'CharacterCertificate':
      return <AwardIcon sx={{ color: '#831843' }} />;
    case 'RetCertificate':
      return <DocumentIcon sx={{ color: '#581c87' }} />;
    case 'GatePass':
      return <GatePassIcon sx={{ color: '#0369a1' }} />;
    default:
      return <TagIcon />;
  }
};

const getCategory = (moduleType) => {
  if (
    [
      'BonafideCertificate',
      'BirthCertificate',
      'AgeCertificate',
      'CharacterCertificate',
      'RetCertificate',
    ].includes(moduleType)
  ) {
    return 'Certificates';
  }
  if (moduleType === 'GatePass') {
    return 'GatePass';
  }
  return 'Core';
};

export const NumberingSeriesPage = () => {
  const { showSnackbar } = useUiStore();
  const { hasPermission } = usePermission();
  const { currentColorHex, isDarkMode } = useThemeStore();
  const themeColor = currentColorHex || '#3b82f6';
  const themeDarker = shadeColor(themeColor, -20);

  const [seriesList, setSeriesList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

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

  const handleChange = (realIndex, field, value) => {
    setSeriesList((prev) => {
      const next = [...prev];
      next[realIndex] = {
        ...next[realIndex],
        [field]: value,
      };
      next[realIndex].samplePreview = calculatePreview(next[realIndex]);
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

  // Filtered series list
  const filteredList = useMemo(() => {
    return seriesList
      .map((item, originalIndex) => ({ ...item, originalIndex }))
      .filter((item) => {
        const matchesCategory =
          activeCategory === 'All' || getCategory(item.moduleType) === activeCategory;
        const matchesSearch =
          !searchTerm.trim() ||
          item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.moduleType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.prefix?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
      });
  }, [seriesList, activeCategory, searchTerm]);

  const certCount = seriesList.filter((s) => getCategory(s.moduleType) === 'Certificates').length;
  const coreCount = seriesList.filter((s) => getCategory(s.moduleType) === 'Core').length;
  const gateCount = seriesList.filter((s) => getCategory(s.moduleType) === 'GatePass').length;

  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <div>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <SequenceIcon sx={{ color: themeColor, fontSize: 32 }} />
            <Typography variant="h5" sx={{ fontWeight: 800, color: isDarkMode ? '#f8fafc' : '#0f172a' }}>
              Numbering Series & Prefix Settings
            </Typography>
          </Stack>
          <Typography variant="body2" color={isDarkMode ? '#94a3b8' : '#64748b'} sx={{ mt: 0.5 }}>
            Configure auto-increment series, custom prefixes, year format, and starting sequence numbers for all school documents & certificates.
          </Typography>
        </div>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSaveAll}
          disabled={saving || loading}
          sx={{
            fontWeight: 700,
            px: 3,
            py: 1,
            borderRadius: 2,
            bgcolor: themeColor,
            boxShadow: `0 4px 12px ${themeColor}40`,
            '&:hover': {
              bgcolor: themeDarker,
            },
          }}
        >
          {saving ? 'Saving Settings...' : 'Save All Numbering Formats'}
        </Button>
      </Box>

      {/* Info Alert */}
      <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2 }}>
        <Typography variant="body2">
          <strong>Auto-Increment Logic:</strong> When a new <strong>Bonafide, DOB, Age, Character, or RET Certificate</strong> (as well as Admissions, Receipts, Enquiries, TCs, and Gate Passes) is issued, the system automatically formats the reference number according to your custom prefix, year format, and digits, and increments the counter safely.
        </Typography>
      </Alert>

      {/* Filter Tabs & Search Bar */}
      <Paper sx={{ p: 1.5, mb: 3, borderRadius: 2, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
        <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', py: 0.5 }}>
          {[
            { id: 'All', label: 'All Documents', count: seriesList.length },
            { id: 'Certificates', label: 'Student Certificates', count: certCount },
            { id: 'Core', label: 'Core Institutional', count: coreCount },
            { id: 'GatePass', label: 'Gate Passes', count: gateCount },
          ].map((cat) => {
            const isSelected = activeCategory === cat.id;
            return (
              <Button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                variant={isSelected ? 'contained' : 'outlined'}
                size="small"
                sx={{
                  borderRadius: 1.5,
                  px: 1.5,
                  py: 0.5,
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  bgcolor: isSelected ? themeColor : 'transparent',
                  borderColor: isSelected ? themeColor : '#cbd5e1',
                  color: isSelected ? '#ffffff' : '#475569',
                  boxShadow: isSelected ? `0 2px 8px ${themeColor}35` : 'none',
                  '&:hover': {
                    bgcolor: isSelected ? themeDarker : '#f1f5f9',
                    borderColor: isSelected ? themeDarker : themeColor,
                  },
                }}
              >
                {cat.label} ({cat.count})
              </Button>
            );
          })}
        </Stack>

        <TextField
          size="small"
          placeholder="Filter format or prefix..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#94a3b8', fontSize: 18 }} />
              </InputAdornment>
            ),
          }}
          sx={{ width: { xs: '100%', sm: 260 } }}
        />
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : filteredList.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 2 }}>
          <Typography variant="subtitle1" fontWeight={700} color="text.secondary">
            No numbering series match your filter criteria
          </Typography>
          <Button
            size="small"
            sx={{ mt: 1.5, color: themeColor }}
            onClick={() => {
              setActiveCategory('All');
              setSearchTerm('');
            }}
          >
            Clear Filters
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {filteredList.map((item) => {
            const index = item.originalIndex;
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
                            label={<Typography variant="body2">Include Branch Code</Typography>}
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
