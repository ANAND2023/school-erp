import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Divider,
  Card,
  CardContent,
  CardActions,
  Chip,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  InputAdornment,
  CircularProgress,
  FormControlLabel,
  Switch,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Avatar,
  Stack,
  Alert,
} from '@mui/material';
import {
  Save as SaveIcon,
  School as SchoolIcon,
  Domain as DomainIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Language as WebsiteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Business as BusinessIcon,
  ArrowForward as ArrowForwardIcon,
  Badge as BadgeIcon,
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  Draw as DrawIcon,
  PhotoCamera as PhotoCameraIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import { schoolApi, branchApi } from '../api';
import { useUiStore } from '../../../store/uiStore';
import { usePermission } from '../../../hooks/usePermission';
import { Modal } from '../../../components/Modal';

export const BranchMasterPage = ({ initialTab = 0 }) => {
  const location = useLocation();
  const { showSnackbar } = useUiStore();
  const { hasPermission, isSuperAdmin } = usePermission();

  // Tab State: 0 = Schools Master, 1 = Branches Master
  const isBranchPath = location.pathname.includes('/masters/branch') && !location.pathname.includes('/masters/schools');
  const [tabValue, setTabValue] = useState(initialTab !== undefined ? initialTab : (isBranchPath ? 0 : 0));

  // ===================== SCHOOLS STATE =====================
  const [schools, setSchools] = useState([]);
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [schoolSearch, setSchoolSearch] = useState('');
  const [showInactiveSchools, setShowInactiveSchools] = useState(false);

  // Dialogs for School
  const [createSchoolOpen, setCreateSchoolOpen] = useState(false);
  const [editSchoolOpen, setEditSchoolOpen] = useState(false);
  const [editingSchoolId, setEditingSchoolId] = useState(null);
  const [savingSchool, setSavingSchool] = useState(false);

  const initialNewSchoolForm = {
    name: '',
    code: '',
    affiliationNumber: '',
    logoUrl: '',
    address: '',
    contactNumber: '',
    alternateContactNumber: '',
    email: '',
    website: '',
    createDefaultBranch: true,
    branchName: 'Main Campus',
    branchCode: 'MAIN',
    academicYearName: '2026-27',
  };

  const [newSchoolForm, setNewSchoolForm] = useState(initialNewSchoolForm);
  const [editSchoolForm, setEditSchoolForm] = useState({
    name: '',
    code: '',
    affiliationNumber: '',
    logoUrl: '',
    address: '',
    contactNumber: '',
    alternateContactNumber: '',
    email: '',
    website: '',
    isActive: true,
  });

  // ===================== BRANCHES STATE =====================
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState('all');

  // Dialog for Add Branch
  const [createBranchOpen, setCreateBranchOpen] = useState(false);
  const [savingBranch, setSavingBranch] = useState(false);
  const [newBranchForm, setNewBranchForm] = useState({
    schoolId: '',
    name: '',
    code: '',
    printHeader: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    alternatePhone: '',
    email: '',
    logoUrl: '',
    principalSignatureUrl: '',
    cashierSignatureUrl: '',
    authorizedSignatureUrl: '',
  });

  const [branchFormData, setBranchFormData] = useState({
    name: '',
    code: '',
    printHeader: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    alternatePhone: '',
    email: '',
    logoUrl: '',
    principalSignatureUrl: '',
    cashierSignatureUrl: '',
    authorizedSignatureUrl: '',
  });

  // Client-side image / signature reader with compression
  const handleSignatureUpload = (file, fieldName) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 600;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/png', 0.9);
        setBranchFormData((prev) => ({ ...prev, [fieldName]: dataUrl }));
        showSnackbar('Signature / Image uploaded successfully!', 'success');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  // ===================== FETCH DATA =====================
  const fetchSchools = async () => {
    try {
      setLoadingSchools(true);
      const res = await schoolApi.getSchools({ includeInactive: showInactiveSchools });
      if (res.data?.success) {
        setSchools(res.data.data || []);
      }
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to load schools', 'error');
    } finally {
      setLoadingSchools(false);
    }
  };

  const fetchBranches = async (schoolIdFilter = selectedSchoolFilter) => {
    try {
      setLoadingBranches(true);
      const params = {};
      if (schoolIdFilter && schoolIdFilter !== 'all') {
        params.schoolId = schoolIdFilter;
      }
      const res = await branchApi.getBranches(params);
      if (res.data?.success) {
        const branchList = res.data.data || [];
        setBranches(branchList);
        if (branchList.length > 0) {
          // If current selectedBranch is still in list, keep it; otherwise select first
          const stillSelected = branchList.find((b) => b.id === selectedBranch?.id);
          const active = stillSelected || branchList[0];
          setSelectedBranch(active);
          setBranchFormData({
            name: active.name || '',
            code: active.code || '',
            printHeader: active.printHeader || '',
            address: active.address || '',
            city: active.city || '',
            state: active.state || '',
            pincode: active.pincode || '',
            phone: active.phone || '',
            alternatePhone: active.alternatePhone || '',
            email: active.email || '',
            logoUrl: active.logoUrl || '',
            principalSignatureUrl: active.principalSignatureUrl || '',
            cashierSignatureUrl: active.cashierSignatureUrl || '',
            authorizedSignatureUrl: active.authorizedSignatureUrl || '',
          });
        } else {
          setSelectedBranch(null);
        }
      }
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to load branches', 'error');
    } finally {
      setLoadingBranches(false);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, [showInactiveSchools]);

  useEffect(() => {
    fetchBranches(selectedSchoolFilter);
  }, [selectedSchoolFilter]);

  // ===================== SCHOOL ACTIONS =====================
  const handleOpenCreateSchool = () => {
    setNewSchoolForm(initialNewSchoolForm);
    setCreateSchoolOpen(true);
  };

  const handleCreateSchoolSubmit = async (e) => {
    e.preventDefault();
    if (!newSchoolForm.name.trim() || !newSchoolForm.code.trim()) {
      showSnackbar('School Name and Code are required', 'warning');
      return;
    }

    try {
      setSavingSchool(true);
      const res = await schoolApi.createSchool(newSchoolForm);
      if (res.data?.success) {
        showSnackbar(res.data.message || 'School registered successfully!', 'success');
        setCreateSchoolOpen(false);
        setNewSchoolForm(initialNewSchoolForm);
        await fetchSchools();
        await fetchBranches();
      }
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to create school', 'error');
    } finally {
      setSavingSchool(false);
    }
  };

  const handleOpenEditSchool = (sch) => {
    setEditingSchoolId(sch.id);
    setEditSchoolForm({
      name: sch.name || '',
      code: sch.code || '',
      affiliationNumber: sch.affiliationNumber || '',
      logoUrl: sch.logoUrl || '',
      address: sch.address || '',
      contactNumber: sch.contactNumber || '',
      alternateContactNumber: sch.alternateContactNumber || '',
      email: sch.email || '',
      website: sch.website || '',
      isActive: sch.isActive !== false,
    });
    setEditSchoolOpen(true);
  };

  const handleEditSchoolSubmit = async (e) => {
    e.preventDefault();
    if (!editingSchoolId) return;
    try {
      setSavingSchool(true);
      const res = await schoolApi.updateSchool(editingSchoolId, editSchoolForm);
      if (res.data?.success) {
        showSnackbar(res.data.message || 'School updated successfully', 'success');
        setEditSchoolOpen(false);
        fetchSchools();
      }
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to update school', 'error');
    } finally {
      setSavingSchool(false);
    }
  };

  const handleToggleSchoolStatus = async (sch) => {
    const actionName = sch.isActive ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${actionName} "${sch.name}"?`)) return;

    try {
      if (sch.isActive) {
        await schoolApi.deleteSchool(sch.id);
        showSnackbar(`School "${sch.name}" deactivated`, 'success');
      } else {
        await schoolApi.updateSchool(sch.id, {
          name: sch.name,
          code: sch.code,
          affiliationNumber: sch.affiliationNumber,
          logoUrl: sch.logoUrl,
          address: sch.address,
          contactNumber: sch.contactNumber,
          email: sch.email,
          website: sch.website,
          isActive: true,
        });
        showSnackbar(`School "${sch.name}" activated`, 'success');
      }
      fetchSchools();
    } catch (err) {
      showSnackbar(err.response?.data?.message || `Failed to ${actionName} school`, 'error');
    }
  };

  const handleJumpToBranches = (schId) => {
    setSelectedSchoolFilter(schId);
    setTabValue(1);
  };

  // Filtered Schools
  const filteredSchools = schools.filter((s) => {
    const query = schoolSearch.trim().toLowerCase();
    if (!query) return true;
    return (
      s.name?.toLowerCase().includes(query) ||
      s.code?.toLowerCase().includes(query) ||
      s.affiliationNumber?.toLowerCase().includes(query) ||
      s.email?.toLowerCase().includes(query) ||
      s.address?.toLowerCase().includes(query)
    );
  });

  // ===================== BRANCH ACTIONS =====================
  const handleBranchSelect = (b) => {
    setSelectedBranch(b);
    setBranchFormData({
      name: b.name || '',
      code: b.code || '',
      printHeader: b.printHeader || '',
      address: b.address || '',
      city: b.city || '',
      state: b.state || '',
      pincode: b.pincode || '',
      phone: b.phone || '',
      alternatePhone: b.alternatePhone || '',
      email: b.email || '',
      logoUrl: b.logoUrl || '',
      principalSignatureUrl: b.principalSignatureUrl || '',
      cashierSignatureUrl: b.cashierSignatureUrl || '',
      authorizedSignatureUrl: b.authorizedSignatureUrl || '',
    });
  };

  const handleSaveBranch = async (e) => {
    e.preventDefault();
    if (!selectedBranch) return;

    try {
      await branchApi.updateBranch(selectedBranch.id, branchFormData);
      showSnackbar('Branch details, logo & signatures updated successfully', 'success');
      fetchBranches();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Error updating branch', 'error');
    }
  };

  const handleOpenCreateBranch = () => {
    const defaultSchoolId = selectedSchoolFilter !== 'all' ? selectedSchoolFilter : (schools[0]?.id || '');
    setNewBranchForm({
      schoolId: defaultSchoolId,
      name: '',
      code: '',
      printHeader: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      phone: '',
      alternatePhone: '',
      email: '',
      logoUrl: '',
      principalSignatureUrl: '',
      cashierSignatureUrl: '',
      authorizedSignatureUrl: '',
    });
    setCreateBranchOpen(true);
  };

  const handleCreateBranchSubmit = async (e) => {
    e.preventDefault();
    if (!newBranchForm.name.trim() || !newBranchForm.code.trim()) {
      showSnackbar('Branch Name and Code are required', 'warning');
      return;
    }

    try {
      setSavingBranch(true);
      const res = await branchApi.createBranch({
        ...newBranchForm,
        schoolId: Number(newBranchForm.schoolId) || (schools[0]?.id || 1),
      });
      if (res.data?.success) {
        showSnackbar('Branch created successfully!', 'success');
        setCreateBranchOpen(false);
        fetchBranches();
        fetchSchools();
      }
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to create branch', 'error');
    } finally {
      setSavingBranch(false);
    }
  };

  const canEdit = hasPermission('Branch', 'Edit') || isSuperAdmin;
  const canAdd = hasPermission('Branch', 'Add') || isSuperAdmin;

  return (
    <Box sx={{ pb: 6 }}>
      {/* Header Banner */}
      {/* Header Banner */}
      <Box sx={{ mb: { xs: 1.5, sm: 2.5 }, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: { xs: 1, sm: 2 } }}>
        <Box>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 800,
              color: 'text.primary',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              fontSize: { xs: '1.05rem', sm: '1.35rem' },
              lineHeight: 1.25,
            }}
          >
            <SchoolIcon color="primary" sx={{ fontSize: { xs: 22, sm: 28 } }} />
            School & Campus Branch Master
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              fontSize: { xs: '0.72rem', sm: '0.85rem' },
              mt: 0.25,
              lineHeight: 1.35,
            }}
          >
            Manage educational institutions, multi-school setups, campus branches, and receipt print credentials
          </Typography>
        </Box>

        {isSuperAdmin && (
          <Stack direction="row" spacing={1.5}>
            {tabValue === 0 ? (
              <Button
                variant="contained"
                startIcon={<AddIcon sx={{ fontSize: 18 }} />}
                onClick={handleOpenCreateSchool}
                sx={{
                  bgcolor: 'primary.main',
                  px: { xs: 1.5, sm: 2.5 },
                  py: { xs: 0.6, sm: 1 },
                  fontWeight: 700,
                  boxShadow: 2,
                  textTransform: 'none',
                  fontSize: { xs: '0.78rem', sm: '0.875rem' },
                }}
              >
                + Register New School
              </Button>
            ) : (
              <Button
                variant="contained"
                startIcon={<AddIcon sx={{ fontSize: 18 }} />}
                onClick={handleOpenCreateBranch}
                disabled={!canAdd}
                sx={{
                  bgcolor: 'primary.main',
                  px: { xs: 1.5, sm: 2.5 },
                  py: { xs: 0.6, sm: 1 },
                  fontWeight: 700,
                  boxShadow: 2,
                  textTransform: 'none',
                  fontSize: { xs: '0.78rem', sm: '0.875rem' },
                }}
              >
                + Add Campus Branch
              </Button>
            )}
          </Stack>
        )}
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: { xs: 1.5, sm: 2.5 }, borderRadius: 2, bgcolor: 'background.paper', overflow: 'hidden' }}>
        <Tabs
          value={tabValue}
          onChange={(_, val) => setTabValue(val)}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            px: { xs: 1, sm: 2 },
            borderBottom: 1,
            borderColor: 'divider',
            minHeight: { xs: 38, sm: 46 },
            '& .MuiTab-root': {
              fontWeight: 700,
              textTransform: 'none',
              fontSize: { xs: '0.78rem', sm: '0.92rem' },
              py: { xs: 0.8, sm: 1.4 },
              minHeight: { xs: 38, sm: 46 },
              minWidth: { xs: 'auto', sm: 140 },
            },
          }}
        >
          <Tab
            icon={<SchoolIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />}
            iconPosition="start"
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <span>Registered Schools</span>
                <Chip label={schools.length} size="small" color="primary" sx={{ height: 18, fontSize: '0.68rem', fontWeight: 700 }} />
              </Box>
            }
          />
          <Tab
            icon={<DomainIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />}
            iconPosition="start"
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <span>Campus Branches</span>
                <Chip label={branches.length} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.68rem', fontWeight: 600 }} />
              </Box>
            }
          />
        </Tabs>
      </Paper>

      {/* ===================== TAB 0: SCHOOLS MASTER ===================== */}
      {tabValue === 0 && (
        <Box>
          {/* Action & Filter Bar */}
          <Paper sx={{ p: { xs: 1.25, sm: 2 }, mb: { xs: 1.5, sm: 2.5 }, borderRadius: 2 }}>
            <Grid container spacing={1.5} alignItems="center">
              <Grid item xs={12} sm={6} md={5}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search by school, code, affiliation, city..."
                  value={schoolSearch}
                  onChange={(e) => setSchoolSearch(e.target.value)}
                  InputProps={{
                    sx: { fontSize: { xs: '0.78rem', sm: '0.875rem' } },
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ fontSize: 18 }} color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={showInactiveSchools}
                      onChange={(e) => setShowInactiveSchools(e.target.checked)}
                    />
                  }
                  label={<Typography variant="body2" sx={{ fontWeight: 500, fontSize: { xs: '0.75rem', sm: '0.85rem' } }}>Show Inactive Institutions</Typography>}
                />
              </Grid>

              <Grid item xs={12} md={3} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
                <Button
                  size="small"
                  startIcon={<RefreshIcon sx={{ fontSize: 16 }} />}
                  onClick={fetchSchools}
                  disabled={loadingSchools}
                  sx={{ fontSize: { xs: '0.75rem', sm: '0.85rem' } }}
                >
                  Refresh List
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {/* Schools List / Grid */}
          {loadingSchools ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : filteredSchools.length === 0 ? (
            <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 2 }}>
              <SchoolIcon sx={{ fontSize: 56, color: 'text.secondary', mb: 1, opacity: 0.5 }} />
              <Typography variant="h6" color="text.secondary">
                No Schools Found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
                {schoolSearch ? 'Try clearing your search query' : 'Register your first school to begin'}
              </Typography>
              {isSuperAdmin && (
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreateSchool}>
                  Register New School
                </Button>
              )}
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {filteredSchools.map((sch) => {
                const initialLetter = sch.name ? sch.name.charAt(0).toUpperCase() : 'S';
                return (
                  <Grid item xs={12} md={6} lg={4} key={sch.id}>
                    <Card
                      variant="outlined"
                      sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: 2.5,
                        borderColor: sch.isActive ? 'divider' : '#ffcdd2',
                        bgcolor: sch.isActive ? 'background.paper' : '#fffbfa',
                        transition: 'box-shadow 0.2s ease-in-out, transform 0.2s',
                        '&:hover': {
                          boxShadow: 4,
                          transform: 'translateY(-2px)',
                        },
                      }}
                    >
                      <CardContent sx={{ p: { xs: 1.5, sm: 2.2 }, flexGrow: 1 }}>
                        {/* Top: Avatar, Name, Status */}
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.2, mb: 1 }}>
                          <Avatar
                            src={sch.logoUrl || undefined}
                            alt={sch.name}
                            sx={{
                              width: { xs: 40, sm: 48 },
                              height: { xs: 40, sm: 48 },
                              bgcolor: 'primary.main',
                              color: '#fff',
                              fontWeight: 800,
                              fontSize: { xs: '1.1rem', sm: '1.3rem' },
                              boxShadow: 1,
                            }}
                          >
                            {initialLetter}
                          </Avatar>
                          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                            <Typography
                              variant="subtitle1"
                              sx={{
                                fontWeight: 700,
                                lineHeight: 1.25,
                                color: 'text.primary',
                                fontSize: { xs: '0.92rem', sm: '1rem' },
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                              title={sch.name}
                            >
                              {sch.name}
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6, mt: 0.4 }}>
                              <Chip
                                label={sch.code}
                                size="small"
                                sx={{
                                  fontWeight: 700,
                                  fontSize: '0.68rem',
                                  bgcolor: '#e3f2fd',
                                  color: '#0d47a1',
                                  height: 20,
                                }}
                              />
                              <Chip
                                label={sch.isActive ? 'Active' : 'Inactive'}
                                size="small"
                                color={sch.isActive ? 'success' : 'default'}
                                sx={{ height: 20, fontSize: '0.68rem', fontWeight: 600 }}
                              />
                            </Box>
                          </Box>
                        </Box>

                        <Divider sx={{ my: 1 }} />

                        {/* Details Stack */}
                        <Stack spacing={0.6} sx={{ fontSize: { xs: '0.75rem', sm: '0.82rem' }, color: 'text.secondary' }}>
                          {sch.affiliationNumber && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                              <BadgeIcon fontSize="small" sx={{ color: 'action.active', fontSize: 16 }} />
                              <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.82rem' }, fontWeight: 500 }}>
                                Affiliation: <strong>{sch.affiliationNumber}</strong>
                              </Typography>
                            </Box>
                          )}

                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                            <DomainIcon fontSize="small" sx={{ color: 'action.active', fontSize: 16 }} />
                            <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.82rem' } }}>
                              Branches: <strong>{sch.branchCount || sch.branches?.length || 0} Campus(es)</strong>
                            </Typography>
                          </Box>

                          {sch.contactNumber && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                              <PhoneIcon fontSize="small" sx={{ color: 'action.active', fontSize: 16 }} />
                              <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.82rem' } }}>
                                {sch.contactNumber}
                              </Typography>
                            </Box>
                          )}

                          {sch.email && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                              <EmailIcon fontSize="small" sx={{ color: 'action.active', fontSize: 16 }} />
                              <Typography
                                variant="body2"
                                sx={{
                                  fontSize: { xs: '0.75rem', sm: '0.82rem' },
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {sch.email}
                              </Typography>
                            </Box>
                          )}

                          {sch.address && (
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.8 }}>
                              <LocationIcon fontSize="small" sx={{ color: 'action.active', fontSize: 16, mt: 0.2 }} />
                              <Typography
                                variant="body2"
                                sx={{
                                  fontSize: { xs: '0.74rem', sm: '0.8rem' },
                                  lineHeight: 1.3,
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                }}
                              >
                                {sch.address}
                              </Typography>
                            </Box>
                          )}

                          {sch.website && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                              <WebsiteIcon fontSize="small" sx={{ color: 'action.active', fontSize: 16 }} />
                              <Typography
                                variant="body2"
                                component="a"
                                href={sch.website.startsWith('http') ? sch.website : `https://${sch.website}`}
                                target="_blank"
                                rel="noreferrer"
                                sx={{
                                  fontSize: { xs: '0.75rem', sm: '0.8rem' },
                                  color: 'primary.main',
                                  textDecoration: 'none',
                                  '&:hover': { textDecoration: 'underline' },
                                }}
                              >
                                {sch.website}
                              </Typography>
                            </Box>
                          )}
                        </Stack>
                      </CardContent>

                      <Divider />

                      {/* Card Footer Actions */}
                      <CardActions sx={{ px: { xs: 1.5, sm: 2 }, py: 0.8, justifyContent: 'space-between', bgcolor: 'rgba(0,0,0,0.01)' }}>
                        <Button
                          size="small"
                          variant="text"
                          endIcon={<ArrowForwardIcon sx={{ fontSize: 15 }} />}
                          onClick={() => handleJumpToBranches(sch.id)}
                          sx={{ textTransform: 'none', fontWeight: 700, fontSize: { xs: '0.75rem', sm: '0.82rem' } }}
                        >
                          View Branches
                        </Button>

                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          {isSuperAdmin && (
                            <Tooltip title="Edit School Details">
                              <IconButton size="small" onClick={() => handleOpenEditSchool(sch)} color="primary">
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}

                          {isSuperAdmin && (
                            <Tooltip title={sch.isActive ? 'Deactivate School' : 'Activate School'}>
                              <IconButton
                                size="small"
                                onClick={() => handleToggleSchoolStatus(sch)}
                                color={sch.isActive ? 'default' : 'success'}
                              >
                                {sch.isActive ? <CancelIcon fontSize="small" color="action" /> : <CheckCircleIcon fontSize="small" color="success" />}
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </CardActions>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Box>
      )}

      {/* ===================== TAB 1: BRANCHES MASTER ===================== */}
      {tabValue === 1 && (
        <Box>
          {/* School Selector Filter */}
          <Paper sx={{ p: { xs: 1.25, sm: 2 }, mb: { xs: 1.5, sm: 2.5 }, borderRadius: 2 }}>
            <Grid container spacing={{ xs: 1.25, sm: 2 }} alignItems="center">
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ fontSize: { xs: '0.78rem', sm: '0.875rem' } }}>Filter by School</InputLabel>
                  <Select
                    value={selectedSchoolFilter}
                    label="Filter by School"
                    onChange={(e) => setSelectedSchoolFilter(e.target.value)}
                    sx={{ fontSize: { xs: '0.78rem', sm: '0.875rem' } }}
                  >
                    <MenuItem value="all" sx={{ fontSize: { xs: '0.78rem', sm: '0.875rem' } }}>
                      <em>All Registered Schools ({schools.length})</em>
                    </MenuItem>
                    {schools.map((s) => (
                      <MenuItem key={s.id} value={s.id} sx={{ fontSize: { xs: '0.78rem', sm: '0.875rem' } }}>
                        {s.name} ({s.code})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={5}>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.85rem' } }}>
                  Showing <strong>{branches.length}</strong> branch(es){' '}
                  {selectedSchoolFilter !== 'all' && (
                    <span>for {schools.find((s) => s.id === selectedSchoolFilter)?.name}</span>
                  )}
                </Typography>
              </Grid>

              {isSuperAdmin && (
                <Grid item xs={12} md={3} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                    size="small"
                    onClick={handleOpenCreateBranch}
                    sx={{ textTransform: 'none', fontWeight: 600, fontSize: { xs: '0.75rem', sm: '0.85rem' } }}
                  >
                    + Add Branch
                  </Button>
                </Grid>
              )}
            </Grid>
          </Paper>

          {/* Branches Master Layout */}
          <Grid container spacing={{ xs: 1.5, sm: 3 }}>
            {/* Branch Selector List */}
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2, minHeight: { xs: 'auto', md: 400 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: { xs: '0.82rem', sm: '0.875rem' } }}>
                    Campus Branches ({branches.length})
                  </Typography>
                  <IconButton size="small" onClick={() => fetchBranches(selectedSchoolFilter)}>
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </Box>

                {loadingBranches ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress size={28} />
                  </Box>
                ) : branches.length === 0 ? (
                  <Alert severity="info" sx={{ mt: 1 }}>
                    No branches found for the selected school filter.
                  </Alert>
                ) : (
                  <Stack spacing={1}>
                    {branches.map((b) => {
                      const isSel = selectedBranch?.id === b.id;
                      return (
                        <Card
                          key={b.id}
                          variant="outlined"
                          sx={{
                            cursor: 'pointer',
                            bgcolor: isSel ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
                            borderColor: isSel ? 'primary.main' : 'divider',
                            borderWidth: isSel ? 2 : 1,
                            transition: 'all 0.15s ease-in-out',
                            '&:hover': {
                              borderColor: 'primary.light',
                              bgcolor: isSel ? 'rgba(25, 118, 210, 0.12)' : 'rgba(0,0,0,0.02)',
                            },
                          }}
                          onClick={() => handleBranchSelect(b)}
                        >
                          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: isSel ? 'primary.main' : 'text.primary' }}>
                                {b.name}
                              </Typography>
                              <Chip label={b.code} size="small" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }} />
                            </Box>
                            {b.schoolName && (
                              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.3, fontWeight: 500 }}>
                                🏛️ {b.schoolName}
                              </Typography>
                            )}
                            {b.city && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                📍 {b.city} {b.state ? `, ${b.state}` : ''}
                              </Typography>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Stack>
                )}
              </Paper>
            </Grid>

            {/* Branch Edit Form */}
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: { xs: 1.5, sm: 3 }, borderRadius: 2 }} component="form" onSubmit={handleSaveBranch}>
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', mb: 2, gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <DomainIcon color="primary" sx={{ fontSize: { xs: 20, sm: 24 } }} />
                    <Typography variant="h6" sx={{ fontWeight: 700, fontSize: { xs: '0.92rem', sm: '1.15rem' } }}>
                      {selectedBranch ? `${selectedBranch.name} Configuration` : 'Branch Details'}
                    </Typography>
                    {selectedBranch && (
                      <Chip label={`Code: ${selectedBranch.code}`} size="small" color="primary" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
                    )}
                  </Box>
                  {selectedBranch?.schoolName && (
                    <Chip
                      icon={<SchoolIcon sx={{ fontSize: 16 }} />}
                      label={selectedBranch.schoolName}
                      size="small"
                      sx={{ bgcolor: '#ede7f6', color: '#4527a0', fontWeight: 600, height: 22, fontSize: '0.72rem' }}
                    />
                  )}
                </Box>
                <Divider sx={{ mb: { xs: 1.5, sm: 3 } }} />

                {!selectedBranch ? (
                  <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
                    Select a branch from the left list to view or edit details.
                  </Box>
                ) : (
                  <>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          required
                          fullWidth
                          label="Branch Name"
                          value={branchFormData.name}
                          onChange={(e) => setBranchFormData({ ...branchFormData, name: e.target.value })}
                          disabled={!canEdit}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          required
                          fullWidth
                          label="Branch Code"
                          value={branchFormData.code}
                          onChange={(e) => setBranchFormData({ ...branchFormData, code: e.target.value })}
                          disabled={!canEdit}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Receipt & Report Print Header"
                          helperText="Appears prominently at the top of fee receipts, report cards, and transfer certificates"
                          value={branchFormData.printHeader}
                          onChange={(e) => setBranchFormData({ ...branchFormData, printHeader: e.target.value })}
                          disabled={!canEdit}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Campus Address"
                          value={branchFormData.address}
                          onChange={(e) => setBranchFormData({ ...branchFormData, address: e.target.value })}
                          disabled={!canEdit}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          label="City"
                          value={branchFormData.city}
                          onChange={(e) => setBranchFormData({ ...branchFormData, city: e.target.value })}
                          disabled={!canEdit}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          label="State"
                          value={branchFormData.state}
                          onChange={(e) => setBranchFormData({ ...branchFormData, state: e.target.value })}
                          disabled={!canEdit}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          label="Pincode"
                          value={branchFormData.pincode}
                          onChange={(e) => setBranchFormData({ ...branchFormData, pincode: e.target.value })}
                          disabled={!canEdit}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          label="Contact Phone"
                          value={branchFormData.phone}
                          inputProps={{ maxLength: 10, inputMode: 'numeric', pattern: '[0-9]*' }}
                          onChange={(e) => setBranchFormData({ ...branchFormData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                          disabled={!canEdit}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          label="Alternate Phone (Optional)"
                          placeholder="e.g. 9876543210"
                          value={branchFormData.alternatePhone || ''}
                          inputProps={{ maxLength: 10, inputMode: 'numeric', pattern: '[0-9]*' }}
                          helperText="Appears on all slips & reports"
                          onChange={(e) => setBranchFormData({ ...branchFormData, alternatePhone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                          disabled={!canEdit}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          label="Official Email"
                          value={branchFormData.email}
                          onChange={(e) => setBranchFormData({ ...branchFormData, email: e.target.value })}
                          disabled={!canEdit}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Divider sx={{ my: 1.5 }}>
                          <Chip label="School Branding & Official Signatures" size="small" sx={{ fontWeight: 700, bgcolor: '#f1f5f9', color: '#1e293b' }} />
                        </Divider>
                      </Grid>

                      {/* 1. School / Branch Logo */}
                      <Grid item xs={12} md={6}>
                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#f8fafc', borderColor: '#cbd5e1' }}>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                            <ImageIcon color="primary" sx={{ fontSize: 20 }} />
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                              School / Branch Logo
                            </Typography>
                          </Stack>
                          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 1.5 }}>
                            {branchFormData.logoUrl ? (
                              <Box
                                component="img"
                                src={branchFormData.logoUrl}
                                alt="Logo"
                                sx={{
                                  width: 64,
                                  height: 64,
                                  objectFit: 'contain',
                                  borderRadius: 1.5,
                                  bgcolor: '#fff',
                                  p: 0.5,
                                  border: '1px solid #94a3b8',
                                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                                }}
                              />
                            ) : (
                              <Avatar sx={{ width: 64, height: 64, bgcolor: '#e2e8f0', color: '#64748b' }}>
                                <SchoolIcon sx={{ fontSize: 32 }} />
                              </Avatar>
                            )}
                            <Box sx={{ flex: 1 }}>
                              <Button
                                component="label"
                                variant="outlined"
                                size="small"
                                startIcon={<CloudUploadIcon />}
                                disabled={!canEdit}
                                sx={{ textTransform: 'none', fontSize: 12, mb: 0.5 }}
                              >
                                Upload Logo Image
                                <input
                                  type="file"
                                  hidden
                                  accept="image/*"
                                  onChange={(e) => {
                                    if (e.target.files?.[0]) handleSignatureUpload(e.target.files[0], 'logoUrl');
                                  }}
                                />
                              </Button>
                              {branchFormData.logoUrl && canEdit && (
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => setBranchFormData({ ...branchFormData, logoUrl: '' })}
                                  sx={{ ml: 1 }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              )}
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                Appears on all Enquiry slips, Admission reports, and Fee receipts.
                              </Typography>
                            </Box>
                          </Box>
                          <TextField
                            fullWidth
                            size="small"
                            label="Or paste Logo Image URL"
                            placeholder="https://... or data:image/..."
                            value={branchFormData.logoUrl}
                            onChange={(e) => setBranchFormData({ ...branchFormData, logoUrl: e.target.value })}
                            disabled={!canEdit}
                          />
                        </Paper>
                      </Grid>

                      {/* 2. Principal Signature */}
                      <Grid item xs={12} md={6}>
                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#f8fafc', borderColor: '#cbd5e1' }}>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                            <DrawIcon sx={{ color: '#0369a1', fontSize: 20 }} />
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                              Principal Signature
                            </Typography>
                          </Stack>
                          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 1.5 }}>
                            {branchFormData.principalSignatureUrl ? (
                              <Box
                                component="img"
                                src={branchFormData.principalSignatureUrl}
                                alt="Principal Sign"
                                sx={{
                                  width: 100,
                                  height: 52,
                                  objectFit: 'contain',
                                  borderRadius: 1.5,
                                  bgcolor: '#fff',
                                  p: 0.5,
                                  border: '1px solid #94a3b8',
                                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                                }}
                              />
                            ) : (
                              <Box
                                sx={{
                                  width: 100,
                                  height: 52,
                                  borderRadius: 1.5,
                                  bgcolor: '#fff',
                                  border: '1px dashed #cbd5e1',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px' }}>
                                  No Signature
                                </Typography>
                              </Box>
                            )}
                            <Box sx={{ flex: 1 }}>
                              <Button
                                component="label"
                                variant="outlined"
                                size="small"
                                startIcon={<CloudUploadIcon />}
                                disabled={!canEdit}
                                sx={{ textTransform: 'none', fontSize: 12, mb: 0.5 }}
                              >
                                Upload Sign
                                <input
                                  type="file"
                                  hidden
                                  accept="image/*"
                                  onChange={(e) => {
                                    if (e.target.files?.[0]) handleSignatureUpload(e.target.files[0], 'principalSignatureUrl');
                                  }}
                                />
                              </Button>
                              {branchFormData.principalSignatureUrl && canEdit && (
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => setBranchFormData({ ...branchFormData, principalSignatureUrl: '' })}
                                  sx={{ ml: 1 }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              )}
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                Appears on Enquiry Slips & Admission Reports.
                              </Typography>
                            </Box>
                          </Box>
                          <TextField
                            fullWidth
                            size="small"
                            label="Or paste Principal Signature URL"
                            placeholder="https://... or data:image/..."
                            value={branchFormData.principalSignatureUrl}
                            onChange={(e) => setBranchFormData({ ...branchFormData, principalSignatureUrl: e.target.value })}
                            disabled={!canEdit}
                          />
                        </Paper>
                      </Grid>

                      {/* 3. Cashier Signature */}
                      <Grid item xs={12} md={6}>
                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#f8fafc', borderColor: '#cbd5e1' }}>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                            <DrawIcon sx={{ color: '#16a34a', fontSize: 20 }} />
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                              Cashier / Accounts Signature
                            </Typography>
                          </Stack>
                          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 1.5 }}>
                            {branchFormData.cashierSignatureUrl ? (
                              <Box
                                component="img"
                                src={branchFormData.cashierSignatureUrl}
                                alt="Cashier Sign"
                                sx={{
                                  width: 100,
                                  height: 52,
                                  objectFit: 'contain',
                                  borderRadius: 1.5,
                                  bgcolor: '#fff',
                                  p: 0.5,
                                  border: '1px solid #94a3b8',
                                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                                }}
                              />
                            ) : (
                              <Box
                                sx={{
                                  width: 100,
                                  height: 52,
                                  borderRadius: 1.5,
                                  bgcolor: '#fff',
                                  border: '1px dashed #cbd5e1',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px' }}>
                                  No Signature
                                </Typography>
                              </Box>
                            )}
                            <Box sx={{ flex: 1 }}>
                              <Button
                                component="label"
                                variant="outlined"
                                size="small"
                                startIcon={<CloudUploadIcon />}
                                disabled={!canEdit}
                                sx={{ textTransform: 'none', fontSize: 12, mb: 0.5 }}
                              >
                                Upload Sign
                                <input
                                  type="file"
                                  hidden
                                  accept="image/*"
                                  onChange={(e) => {
                                    if (e.target.files?.[0]) handleSignatureUpload(e.target.files[0], 'cashierSignatureUrl');
                                  }}
                                />
                              </Button>
                              {branchFormData.cashierSignatureUrl && canEdit && (
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => setBranchFormData({ ...branchFormData, cashierSignatureUrl: '' })}
                                  sx={{ ml: 1 }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              )}
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                Appears automatically on Fee Payment Receipt Slips.
                              </Typography>
                            </Box>
                          </Box>
                          <TextField
                            fullWidth
                            size="small"
                            label="Or paste Cashier Signature URL"
                            placeholder="https://... or data:image/..."
                            value={branchFormData.cashierSignatureUrl}
                            onChange={(e) => setBranchFormData({ ...branchFormData, cashierSignatureUrl: e.target.value })}
                            disabled={!canEdit}
                          />
                        </Paper>
                      </Grid>

                      {/* 4. Authorized Signatory */}
                      <Grid item xs={12} md={6}>
                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#f8fafc', borderColor: '#cbd5e1' }}>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                            <DrawIcon sx={{ color: '#9333ea', fontSize: 20 }} />
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                              Authorized Signatory (Optional)
                            </Typography>
                          </Stack>
                          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 1.5 }}>
                            {branchFormData.authorizedSignatureUrl ? (
                              <Box
                                component="img"
                                src={branchFormData.authorizedSignatureUrl}
                                alt="Authorized Sign"
                                sx={{
                                  width: 100,
                                  height: 52,
                                  objectFit: 'contain',
                                  borderRadius: 1.5,
                                  bgcolor: '#fff',
                                  p: 0.5,
                                  border: '1px solid #94a3b8',
                                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                                }}
                              />
                            ) : (
                              <Box
                                sx={{
                                  width: 100,
                                  height: 52,
                                  borderRadius: 1.5,
                                  bgcolor: '#fff',
                                  border: '1px dashed #cbd5e1',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px' }}>
                                  No Signature
                                </Typography>
                              </Box>
                            )}
                            <Box sx={{ flex: 1 }}>
                              <Button
                                component="label"
                                variant="outlined"
                                size="small"
                                startIcon={<CloudUploadIcon />}
                                disabled={!canEdit}
                                sx={{ textTransform: 'none', fontSize: 12, mb: 0.5 }}
                              >
                                Upload Sign
                                <input
                                  type="file"
                                  hidden
                                  accept="image/*"
                                  onChange={(e) => {
                                    if (e.target.files?.[0]) handleSignatureUpload(e.target.files[0], 'authorizedSignatureUrl');
                                  }}
                                />
                              </Button>
                              {branchFormData.authorizedSignatureUrl && canEdit && (
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => setBranchFormData({ ...branchFormData, authorizedSignatureUrl: '' })}
                                  sx={{ ml: 1 }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              )}
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                For Certificates, TC, and Official Letters.
                              </Typography>
                            </Box>
                          </Box>
                          <TextField
                            fullWidth
                            size="small"
                            label="Or paste Authorized Signatory URL"
                            placeholder="https://... or data:image/..."
                            value={branchFormData.authorizedSignatureUrl}
                            onChange={(e) => setBranchFormData({ ...branchFormData, authorizedSignatureUrl: e.target.value })}
                            disabled={!canEdit}
                          />
                        </Paper>
                      </Grid>
                    </Grid>

                    {canEdit && (
                      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button type="submit" variant="contained" startIcon={<SaveIcon />} sx={{ px: 3, fontWeight: 700 }}>
                          Save Branch Details, Logo & Signatures
                        </Button>
                      </Box>
                    )}
                  </>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* ===================== MODAL: REGISTER NEW SCHOOL ===================== */}
      <Modal
        open={createSchoolOpen}
        onClose={() => !savingSchool && setCreateSchoolOpen(false)}
        title="Register New School / Institution"
        subtitle="Add a new educational entity to the multi-school ERP"
        icon={<SchoolIcon sx={{ fontSize: 26 }} />}
        maxWidth="md"
        formId="create-school-form"
        submitLabel="Register School"
        confirmLoadingText="Creating School..."
        loading={savingSchool}
      >
        <Box component="form" id="create-school-form" onSubmit={handleCreateSchoolSubmit} sx={{ pt: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main', mb: 1.5 }}>
            1. School / Institution Identity
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={8}>
              <TextField
                required
                fullWidth
                label="School / Institution Name"
                placeholder="e.g. St. Xavier's International Academy"
                value={newSchoolForm.name}
                onChange={(e) => setNewSchoolForm({ ...newSchoolForm, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                required
                fullWidth
                label="School Code (Short Code)"
                placeholder="e.g. SXIA"
                value={newSchoolForm.code}
                onChange={(e) => setNewSchoolForm({ ...newSchoolForm, code: e.target.value.toUpperCase() })}
                helperText="Unique uppercase identifier"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Affiliation / Board Registration No."
                placeholder="e.g. CBSE/AFF/2026/84291 or State Board"
                value={newSchoolForm.affiliationNumber}
                onChange={(e) => setNewSchoolForm({ ...newSchoolForm, affiliationNumber: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Logo Image URL (Optional)"
                placeholder="https://example.com/logo.png"
                value={newSchoolForm.logoUrl}
                onChange={(e) => setNewSchoolForm({ ...newSchoolForm, logoUrl: e.target.value })}
              />
            </Grid>
          </Grid>

          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main', mb: 1.5 }}>
            2. Contact & Address Details
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Official Contact Number"
                placeholder="+91 98765 43210"
                value={newSchoolForm.contactNumber}
                onChange={(e) => setNewSchoolForm({ ...newSchoolForm, contactNumber: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Official Email Address"
                placeholder="contact@school.edu.in"
                value={newSchoolForm.email}
                onChange={(e) => setNewSchoolForm({ ...newSchoolForm, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Official Website"
                placeholder="https://www.myschool.edu.in"
                value={newSchoolForm.website}
                onChange={(e) => setNewSchoolForm({ ...newSchoolForm, website: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Campus / Registered Address"
                placeholder="Plot No. 12, Knowledge Park, City, State - PIN"
                value={newSchoolForm.address}
                onChange={(e) => setNewSchoolForm({ ...newSchoolForm, address: e.target.value })}
              />
            </Grid>
          </Grid>

          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main', mb: 1.5 }}>
            3. Automatic Initial Campus & Academic Session Setup
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: '#fbfbfb', borderRadius: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={newSchoolForm.createDefaultBranch}
                  onChange={(e) => setNewSchoolForm({ ...newSchoolForm, createDefaultBranch: e.target.checked })}
                  color="primary"
                />
              }
              label={
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Automatically create default campus branch and current academic session
                </Typography>
              }
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
              Recommended. Enables fee collection, student enrollment, and class setup immediately after creation.
            </Typography>

            {newSchoolForm.createDefaultBranch && (
              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Initial Branch Name"
                    value={newSchoolForm.branchName}
                    onChange={(e) => setNewSchoolForm({ ...newSchoolForm, branchName: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Initial Branch Code"
                    value={newSchoolForm.branchCode}
                    onChange={(e) => setNewSchoolForm({ ...newSchoolForm, branchCode: e.target.value.toUpperCase() })}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Initial Academic Session"
                    value={newSchoolForm.academicYearName}
                    onChange={(e) => setNewSchoolForm({ ...newSchoolForm, academicYearName: e.target.value })}
                  />
                </Grid>
              </Grid>
            )}
          </Paper>
        </Box>
      </Modal>

      {/* ===================== MODAL: EDIT SCHOOL ===================== */}
      <Modal
        open={editSchoolOpen}
        onClose={() => !savingSchool && setEditSchoolOpen(false)}
        title="Edit School Details"
        icon={<EditIcon sx={{ fontSize: 24 }} />}
        maxWidth="sm"
        formId="edit-school-form"
        submitLabel="Save Changes"
        confirmLoadingText="Updating..."
        loading={savingSchool}
      >
        <Box component="form" id="edit-school-form" onSubmit={handleEditSchoolSubmit} sx={{ pt: 1 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={8}>
              <TextField
                required
                fullWidth
                label="School Name"
                value={editSchoolForm.name}
                onChange={(e) => setEditSchoolForm({ ...editSchoolForm, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                required
                fullWidth
                label="School Code"
                value={editSchoolForm.code}
                onChange={(e) => setEditSchoolForm({ ...editSchoolForm, code: e.target.value.toUpperCase() })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Affiliation Number"
                value={editSchoolForm.affiliationNumber}
                onChange={(e) => setEditSchoolForm({ ...editSchoolForm, affiliationNumber: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Logo URL"
                value={editSchoolForm.logoUrl}
                onChange={(e) => setEditSchoolForm({ ...editSchoolForm, logoUrl: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Contact Phone"
                value={editSchoolForm.contactNumber}
                inputProps={{ maxLength: 10, inputMode: 'numeric', pattern: '[0-9]*' }}
                onChange={(e) => setEditSchoolForm({ ...editSchoolForm, contactNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Alternate Phone"
                value={editSchoolForm.alternateContactNumber || ''}
                inputProps={{ maxLength: 10, inputMode: 'numeric', pattern: '[0-9]*' }}
                helperText="Optional second number"
                onChange={(e) => setEditSchoolForm({ ...editSchoolForm, alternateContactNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Official Email"
                value={editSchoolForm.email}
                onChange={(e) => setEditSchoolForm({ ...editSchoolForm, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Website URL"
                value={editSchoolForm.website}
                onChange={(e) => setEditSchoolForm({ ...editSchoolForm, website: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Address"
                value={editSchoolForm.address}
                onChange={(e) => setEditSchoolForm({ ...editSchoolForm, address: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={editSchoolForm.isActive}
                    onChange={(e) => setEditSchoolForm({ ...editSchoolForm, isActive: e.target.checked })}
                    color="primary"
                  />
                }
                label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Active School Status</Typography>}
              />
            </Grid>
          </Grid>
        </Box>
      </Modal>

      {/* ===================== MODAL: ADD NEW BRANCH ===================== */}
      <Modal
        open={createBranchOpen}
        onClose={() => !savingBranch && setCreateBranchOpen(false)}
        title="Add Campus Branch"
        icon={<DomainIcon sx={{ fontSize: 24 }} />}
        maxWidth="sm"
        formId="create-branch-form"
        submitLabel="Add Branch"
        confirmLoadingText="Adding..."
        loading={savingBranch}
      >
        <Box component="form" id="create-branch-form" onSubmit={handleCreateBranchSubmit} sx={{ pt: 1 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth required size="small">
                <InputLabel>Parent School</InputLabel>
                <Select
                  value={newBranchForm.schoolId}
                  label="Parent School"
                  onChange={(e) => setNewBranchForm({ ...newBranchForm, schoolId: e.target.value })}
                >
                  {schools.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={8}>
              <TextField
                required
                fullWidth
                size="small"
                label="Branch Name"
                placeholder="e.g. South Extension Campus"
                value={newBranchForm.name}
                onChange={(e) => setNewBranchForm({ ...newBranchForm, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                required
                fullWidth
                size="small"
                label="Branch Code"
                placeholder="e.g. SOUTH"
                value={newBranchForm.code}
                onChange={(e) => setNewBranchForm({ ...newBranchForm, code: e.target.value.toUpperCase() })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Receipt & Report Print Header"
                placeholder="Appears on fee slips and reports"
                value={newBranchForm.printHeader}
                onChange={(e) => setNewBranchForm({ ...newBranchForm, printHeader: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Branch Address"
                value={newBranchForm.address}
                onChange={(e) => setNewBranchForm({ ...newBranchForm, address: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="City"
                value={newBranchForm.city}
                onChange={(e) => setNewBranchForm({ ...newBranchForm, city: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="State"
                value={newBranchForm.state}
                onChange={(e) => setNewBranchForm({ ...newBranchForm, state: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="Pincode"
                value={newBranchForm.pincode}
                onChange={(e) => setNewBranchForm({ ...newBranchForm, pincode: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="Phone Number"
                value={newBranchForm.phone}
                inputProps={{ maxLength: 10, inputMode: 'numeric', pattern: '[0-9]*' }}
                onChange={(e) => setNewBranchForm({ ...newBranchForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="Alternate Phone"
                value={newBranchForm.alternatePhone || ''}
                inputProps={{ maxLength: 10, inputMode: 'numeric', pattern: '[0-9]*' }}
                onChange={(e) => setNewBranchForm({ ...newBranchForm, alternatePhone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="Email Address"
                value={newBranchForm.email}
                onChange={(e) => setNewBranchForm({ ...newBranchForm, email: e.target.value })}
              />
            </Grid>
          </Grid>
        </Box>
      </Modal>
    </Box>
  );
};
