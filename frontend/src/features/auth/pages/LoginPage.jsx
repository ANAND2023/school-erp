import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Checkbox,
  FormControlLabel,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Stack,
  Container,
  MenuItem,
  Chip,
} from '@mui/material';
import {
  VisibilityOutlined,
  VisibilityOffOutlined,
  PersonOutlineOutlined,
  LockOutlined,
  Login as LoginIcon,
  SupportAgentOutlined,
  SchoolOutlined,
  GroupsOutlined,
  ReceiptLongOutlined,
  EventAvailableOutlined,
  AssessmentOutlined,
  BarChartOutlined,
  LocalLibraryOutlined,
  ForumOutlined,
  Close as CloseIcon,
  PhoneInTalk as PhoneIcon,
  EmailOutlined as EmailIcon,
  ScheduleOutlined as ClockIcon
} from '@mui/icons-material';
import { useAuthStore } from '../../../store/authStore';
import apiClient from '../../../api/client';

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth, isAuthenticated, user } = useAuthStore();

  // If already authenticated, redirect immediately so user never sees login form
  useEffect(() => {
    if (isAuthenticated && user) {
      const target = (user.userType === 6 || user.userType === 7) ? '/portal' : '/dashboard';
      navigate(target, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [portalType, setPortalType] = useState('staff'); // 'staff', 'student', 'parent'
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [forgotDialogOpen, setForgotDialogOpen] = useState(false);

  // Multi-School Single Domain Support
  const [schools, setSchools] = useState([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [schoolInput, setSchoolInput] = useState(() => localStorage.getItem('dvs_school_code_input') || '');
  const [schoolsLoading, setSchoolsLoading] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';

  // Load remembered username if exists
  useEffect(() => {
    const savedUser = localStorage.getItem('dvs_remembered_user');
    if (savedUser) {
      setUsername(savedUser);
    }
  }, []);

  // Fetch active schools for single-domain login & check URL parameter ?school= / ?code=
  useEffect(() => {
    const fetchSchools = async () => {
      try {
        setSchoolsLoading(true);
        const res = await apiClient.get('/auth/schools');
        if (res.data?.success && res.data.data) {
          const schoolList = res.data.data;
          setSchools(schoolList);

          // 1. Check URL query params for ?school= or ?code= or ?slug=
          const searchParams = new URLSearchParams(location.search);
          const schoolParam = searchParams.get('school') || searchParams.get('code') || searchParams.get('slug');

          if (schoolParam) {
            const matched = schoolList.find(
              (s) =>
                s.code?.toLowerCase() === schoolParam.toLowerCase() ||
                s.slug?.toLowerCase() === schoolParam.toLowerCase() ||
                String(s.id) === schoolParam
            );
            if (matched) {
              setSelectedSchoolId(matched.id);
              setSchoolInput(matched.code || matched.name);
              localStorage.setItem('dvs_selected_school_id', String(matched.id));
              localStorage.setItem('dvs_school_code_input', matched.code || matched.name);
              return;
            }
          }

          // 2. Check localStorage saved school
          const savedSchoolId = localStorage.getItem('dvs_selected_school_id');
          const savedSchoolInput = localStorage.getItem('dvs_school_code_input');
          if (savedSchoolId && schoolList.some((s) => String(s.id) === savedSchoolId)) {
            const found = schoolList.find((s) => String(s.id) === savedSchoolId);
            setSelectedSchoolId(Number(savedSchoolId));
            if (found && !savedSchoolInput) {
              setSchoolInput(found.code || found.name);
            } else if (savedSchoolInput) {
              setSchoolInput(savedSchoolInput);
            }
          } else if (savedSchoolInput) {
            setSchoolInput(savedSchoolInput);
            const found = schoolList.find(
              (s) =>
                s.code?.toLowerCase() === savedSchoolInput.trim().toLowerCase() ||
                s.slug?.toLowerCase() === savedSchoolInput.trim().toLowerCase() ||
                s.name?.toLowerCase() === savedSchoolInput.trim().toLowerCase()
            );
            if (found) setSelectedSchoolId(found.id);
          } else if (schoolList.length === 1) {
            setSelectedSchoolId(schoolList[0].id);
            setSchoolInput(schoolList[0].code || schoolList[0].name);
          }
        }
      } catch (err) {
        console.warn('Failed to load schools list:', err);
      } finally {
        setSchoolsLoading(false);
      }
    };

    fetchSchools();
  }, [location.search]);

  const handleSchoolInputChange = (val) => {
    setSchoolInput(val);
    const trimmed = (val || '').trim().toLowerCase();
    localStorage.setItem('dvs_school_code_input', val);

    if (!trimmed) {
      setSelectedSchoolId('');
      localStorage.removeItem('dvs_selected_school_id');
      return;
    }

    const matched = schools.find(
      (s) =>
        s.code?.toLowerCase() === trimmed ||
        s.slug?.toLowerCase() === trimmed ||
        s.name?.toLowerCase() === trimmed ||
        String(s.id) === trimmed
    );

    if (matched) {
      setSelectedSchoolId(matched.id);
      localStorage.setItem('dvs_selected_school_id', String(matched.id));
    } else {
      setSelectedSchoolId('');
      localStorage.removeItem('dvs_selected_school_id');
    }
  };

  const matchedSchool = useMemo(() => {
    if (selectedSchoolId) {
      return schools.find((s) => s.id === selectedSchoolId);
    }
    const trimmed = (schoolInput || '').trim().toLowerCase();
    if (!trimmed) return null;
    return schools.find(
      (s) =>
        s.code?.toLowerCase() === trimmed ||
        s.slug?.toLowerCase() === trimmed ||
        s.name?.toLowerCase() === trimmed
    );
  }, [schools, selectedSchoolId, schoolInput]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!username.trim() || !password) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    if ((portalType === 'student' || portalType === 'parent') && !selectedSchoolId && !matchedSchool && !schoolInput.trim() && schools.length > 1) {
      setErrorMessage('Please enter your school code or name to proceed.');
      return;
    }

    try {
      setLoading(true);

      if (rememberMe) {
        localStorage.setItem('dvs_remembered_user', username.trim());
      } else {
        localStorage.removeItem('dvs_remembered_user');
      }

      const payload = {
        username: username.trim(),
        password,
        schoolId: selectedSchoolId ? Number(selectedSchoolId) : (matchedSchool ? matchedSchool.id : null),
        schoolCode: schoolInput.trim() || (matchedSchool ? matchedSchool.code : undefined),
      };

      const res = await apiClient.post('/auth/login', payload);
      if (res.data.success) {
        const { user, accessToken, refreshToken, permissions } = res.data.data;
        setAuth({ user, accessToken, refreshToken, permissions });

        const safeDestination = (from && from !== '/login' && from !== '/') ? from : '/dashboard';

        if (user.mustChangePassword) {
          navigate('/change-password', { replace: true });
        } else if (user.userType === 6 || user.userType === 7) {
          navigate('/portal', { replace: true });
        } else {
          navigate(safeDestination, { replace: true });
        }
      } else {
        setErrorMessage(res.data.message || 'Login failed. Please verify credentials.');
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || 'Invalid credentials. Please verify your username and password.'
      );
    } finally {
      setLoading(false);
    }
  };

  // 8 Highlights matching the exact reference UI mockup
  const features = [
    {
      title: 'Student\nManagement',
      icon: <SchoolOutlined sx={{ fontSize: 32, color: '#0284c7' }} />
    },
    {
      title: 'Faculty &\nStaff',
      icon: <GroupsOutlined sx={{ fontSize: 32, color: '#0284c7' }} />
    },
    {
      title: 'Fees &\nAccounts',
      icon: <ReceiptLongOutlined sx={{ fontSize: 32, color: '#0284c7' }} />
    },
    {
      title: 'Attendance\n& Leaves',
      icon: <EventAvailableOutlined sx={{ fontSize: 32, color: '#0284c7' }} />
    },
    {
      title: 'Exams &\nResults',
      icon: <AssessmentOutlined sx={{ fontSize: 32, color: '#0284c7' }} />
    },
    {
      title: 'Reports &\nAnalytics',
      icon: <BarChartOutlined sx={{ fontSize: 32, color: '#0284c7' }} />
    },
    {
      title: 'Library\nManagement',
      icon: <LocalLibraryOutlined sx={{ fontSize: 32, color: '#0284c7' }} />
    },
    {
      title: 'Communication\n& Circulars',
      icon: <ForumOutlined sx={{ fontSize: 32, color: '#0284c7' }} />
    }
  ];

  return (
    <Box
      sx={{
        height: '100vh',
        maxHeight: '100vh',
        width: '100%',
        maxWidth: '100vw',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at 85% 15%, #083c79 0%, #041c3e 40%, #021124 100%)',
        overflow: 'hidden', // Completely eliminate scrollbars
        fontFamily: '"Inter", "Segoe UI", -apple-system, sans-serif',
        p: { xs: 1.5, sm: 2, md: 3 },
        boxSizing: 'border-box',
        // Ambient background glow effects
        '&::before': {
          content: '""',
          position: 'absolute',
          top: '-10%',
          right: '-5%',
          width: '550px',
          height: '550px',
          background: 'radial-gradient(circle, rgba(2, 132, 199, 0.25) 0%, transparent 70%)',
          pointerEvents: 'none'
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: '-15%',
          left: '-10%',
          width: '650px',
          height: '650px',
          backgroundImage: 'url(/dvslogo1.jpeg)',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          opacity: 0.12,
          filter: 'brightness(1.4) blur(1px)',
          pointerEvents: 'none'
        }
      }}
    >
      <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 5, py: 1, px: { xs: 1.5, md: 3 } }}>
        <Grid container spacing={{ xs: 2, lg: 4 }} alignItems="center" justifyContent="center">
          
          {/* ========================================================================= */}
          {/* LEFT COLUMN: FROSTED GLASS / CYBER DARK LOGIN CARD (NO WHITE BG) */}
          {/* ========================================================================= */}
          <Grid item xs={12} md={5.5} lg={5} xl={4.2} sx={{ display: 'flex', justifyContent: 'center' }}>
            <Paper
              elevation={16}
              sx={{
                width: '100%',
                maxWidth: '430px',
                p: { xs: 2.5, sm: 3.5 },
                borderRadius: '22px',
                // Glassmorphism - No white background
                bgcolor: 'rgba(6, 26, 56, 0.72)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1.5px solid rgba(56, 189, 248, 0.28)',
                boxShadow: '0 25px 60px -10px rgba(0, 0, 0, 0.75), 0 0 25px rgba(2, 132, 199, 0.2)',
                position: 'relative',
                color: '#ffffff'
              }}
            >
              {/* Card Header with Brand Logo */}
              <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  component="img"
                  src="/dvslogo1.jpeg"
                  alt="Digital Vidya Saarthi"
                  sx={{
                    width: { xs: 58, sm: 68 },
                    height: { xs: 58, sm: 68 },
                    objectFit: 'contain',
                    borderRadius: '50%',
                    flexShrink: 0,
                    boxShadow: '0 4px 15px rgba(2, 132, 199, 0.35)',
                    border: '2px solid rgba(56, 189, 248, 0.4)',
                    background: '#ffffff',
                    p: 0.3
                  }}
                />
                <Box>
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: '#94a3b8',
                      letterSpacing: 0.2
                    }}
                  >
                    Welcome to
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{
                      fontSize: { xs: '1.4rem', sm: '1.65rem' },
                      fontWeight: 900,
                      color: '#38bdf8', // Glowing cyan blue
                      textShadow: '0 2px 12px rgba(56, 189, 248, 0.3)',
                      lineHeight: 1.15,
                      letterSpacing: -0.5
                    }}
                  >
                    Digital Vidya
                    <Box component="span" sx={{ display: 'block', color: '#ffffff' }}>
                      Saarthi ERP
                    </Box>
                  </Typography>
                </Box>
              </Box>
              <Typography
                variant="body2"
                sx={{
                  color: '#cbd5e1',
                  fontSize: '0.82rem',
                  fontWeight: 500,
                  lineHeight: 1.35,
                  mb: 2,
                }}
              >
                Smart Workflow, Zero Chaos &bull; Manage your institution with one connected platform
              </Typography>

              {/* Role Switcher Pill Tabs (Staff / Admin, Student, Parent) */}
              <Box
                sx={{
                  display: 'flex',
                  bgcolor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  p: 0.5,
                  borderRadius: '12px',
                  mb: 2,
                  gap: 0.5
                }}
              >
                {[
                  { id: 'staff', label: 'Staff / Admin' },
                  { id: 'student', label: '🎓 Student' },
                  { id: 'parent', label: '👨‍👩‍👧 Parent' }
                ].map((tab) => {
                  const active = portalType === tab.id;
                  return (
                    <Button
                      key={tab.id}
                      size="small"
                      onClick={() => {
                        setPortalType(tab.id);
                        setErrorMessage('');
                      }}
                      sx={{
                        flex: 1,
                        py: 0.6,
                        fontSize: '0.78rem',
                        fontWeight: active ? 800 : 600,
                        borderRadius: '10px',
                        textTransform: 'none',
                        bgcolor: active ? '#0284c7' : 'transparent',
                        color: active ? '#ffffff' : '#94a3b8',
                        boxShadow: active ? '0 2px 10px rgba(2, 132, 199, 0.45)' : 'none',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: active ? '#0369a1' : 'rgba(255, 255, 255, 0.1)',
                          color: '#ffffff'
                        }
                      }}
                    >
                      {tab.label}
                    </Button>
                  );
                })}
              </Box>

              {errorMessage && (
                <Alert
                  severity="error"
                  sx={{
                    mb: 1.5,
                    borderRadius: '10px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    bgcolor: 'rgba(239, 68, 68, 0.15)',
                    color: '#fca5a5',
                    border: '1px solid rgba(239, 68, 68, 0.3)'
                  }}
                >
                  {errorMessage}
                </Alert>
              )}

              {/* Form */}
              <Box component="form" onSubmit={handleSubmit} noValidate>
                {/* School Input (replacing the dropdown as requested) */}
                {(portalType === 'student' || portalType === 'parent' || schools.length > 1) && (
                  <Box sx={{ mb: 1.8 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        color: '#38bdf8',
                        fontWeight: 700,
                        fontSize: '0.73rem',
                        letterSpacing: 0.5,
                        textTransform: 'uppercase',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        mb: 0.6,
                      }}
                    >
                      <span>🏫 School Code / School Name</span>
                      {matchedSchool && (
                        <span style={{ color: '#10b981', fontSize: '0.7rem' }}>
                          ✓ {matchedSchool.name}
                        </span>
                      )}
                    </Typography>
                    <TextField
                      fullWidth
                      id="school-input"
                      name="schoolInput"
                      placeholder="Enter School Code or Name (e.g. DPS)"
                      value={schoolInput}
                      onChange={(e) => handleSchoolInputChange(e.target.value)}
                      disabled={loading || schoolsLoading}
                      inputProps={{
                        list: 'dvs-school-options',
                      }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SchoolOutlined sx={{ color: '#38bdf8', fontSize: 22 }} />
                          </InputAdornment>
                        ),
                        endAdornment: matchedSchool ? (
                          <InputAdornment position="end">
                            <Chip
                              label={matchedSchool.code || 'MATCHED'}
                              size="small"
                              sx={{
                                fontSize: '0.7rem',
                                fontWeight: 800,
                                height: 22,
                                bgcolor: 'rgba(16, 185, 129, 0.2)',
                                color: '#10b981',
                                border: '1px solid rgba(16, 185, 129, 0.4)',
                              }}
                            />
                          </InputAdornment>
                        ) : null,
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '12px',
                          bgcolor: 'rgba(255, 255, 255, 0.07)',
                          color: '#ffffff',
                          fontSize: '0.9rem',
                          '& fieldset': {
                            borderColor: matchedSchool ? 'rgba(16, 185, 129, 0.6)' : 'rgba(255, 255, 255, 0.18)',
                          },
                          '&:hover fieldset': {
                            borderColor: '#38bdf8',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#38bdf8',
                            borderWidth: '2px',
                            boxShadow: '0 0 14px rgba(56, 189, 248, 0.35)',
                          },
                          '& input::placeholder': {
                            color: 'rgba(255, 255, 255, 0.5)',
                            opacity: 1,
                          },
                        },
                      }}
                    />
                    <datalist id="dvs-school-options">
                      {schools.map((s) => (
                        <option key={s.id} value={s.code || s.name}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </datalist>
                  </Box>
                )}

                {/* Input 1: Email or Username */}
                <Box sx={{ mb: 1.8 }}>
                  <TextField
                    required
                    fullWidth
                    id="username"
                    name="username"
                    placeholder={
                      portalType === 'student'
                        ? 'Student Admission No. (e.g. DPS/2024/0604)'
                        : portalType === 'parent'
                        ? 'Parent Mobile Number'
                        : 'Email or Username'
                    }
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                    autoFocus
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonOutlineOutlined sx={{ color: '#38bdf8', fontSize: 22 }} />
                        </InputAdornment>
                      )
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '12px',
                        bgcolor: 'rgba(255, 255, 255, 0.07)',
                        color: '#ffffff',
                        fontSize: '0.9rem',
                        '& fieldset': {
                          borderColor: 'rgba(255, 255, 255, 0.18)'
                        },
                        '&:hover fieldset': {
                          borderColor: 'rgba(56, 189, 248, 0.5)'
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#38bdf8',
                          borderWidth: '2px'
                        },
                        '& input::placeholder': {
                          color: 'rgba(255, 255, 255, 0.5)',
                          opacity: 1
                        }
                      }
                    }}
                  />
                </Box>

                {/* Input 2: Password */}
                <Box sx={{ mb: 2.5 }}>
                  <TextField
                    required
                    fullWidth
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    placeholder="Password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockOutlined sx={{ color: '#38bdf8', fontSize: 22 }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                            size="small"
                            sx={{ color: '#94a3b8' }}
                          >
                            {showPassword ? <VisibilityOffOutlined fontSize="small" /> : <VisibilityOutlined fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '12px',
                        bgcolor: 'rgba(255, 255, 255, 0.07)',
                        color: '#ffffff',
                        fontSize: '0.9rem',
                        '& fieldset': {
                          borderColor: 'rgba(255, 255, 255, 0.18)'
                        },
                        '&:hover fieldset': {
                          borderColor: 'rgba(56, 189, 248, 0.5)'
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#38bdf8',
                          borderWidth: '2px'
                        },
                        '& input::placeholder': {
                          color: 'rgba(255, 255, 255, 0.5)',
                          opacity: 1
                        }
                      }
                    }}
                  />
                </Box>

                {/* Blue Main Login Button */}
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={loading}
                  startIcon={!loading && <LoginIcon sx={{ fontSize: 20 }} />}
                  sx={{
                    py: 1.15,
                    borderRadius: '12px',
                    fontSize: '0.92rem',
                    fontWeight: 800,
                    textTransform: 'none',
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    boxShadow: '0 8px 24px -4px rgba(2, 132, 199, 0.55)',
                    transition: 'all 0.25s ease',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #0369a1 0%, #0284c7 100%)',
                      boxShadow: '0 12px 28px -4px rgba(2, 132, 199, 0.75)',
                      transform: 'translateY(-1px)'
                    }
                  }}
                >
                  {loading ? (
                    <CircularProgress size={22} color="inherit" />
                  ) : portalType === 'student' ? (
                    'Login to Student Portal'
                  ) : portalType === 'parent' ? (
                    'Login to Parent Portal'
                  ) : (
                    'Login'
                  )}
                </Button>

                {/* Divider with 'or' */}
                <Divider
                  sx={{
                    my: 1.8,
                    color: '#64748b',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    '&::before, &::after': { borderColor: 'rgba(255, 255, 255, 0.12)' }
                  }}
                >
                  or
                </Divider>

                {/* Contact Admin Action Button */}
                <Button
                  fullWidth
                  variant="text"
                  startIcon={<SupportAgentOutlined sx={{ color: '#38bdf8', fontSize: 20 }} />}
                  onClick={() => setContactDialogOpen(true)}
                  sx={{
                    py: 0.8,
                    borderRadius: '12px',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    color: '#38bdf8',
                    textTransform: 'none',
                    bgcolor: 'rgba(56, 189, 248, 0.08)',
                    border: '1px solid rgba(56, 189, 248, 0.22)',
                    '&:hover': {
                      bgcolor: 'rgba(56, 189, 248, 0.16)',
                      borderColor: 'rgba(56, 189, 248, 0.4)'
                    }
                  }}
                >
                  Contact Admin
                </Button>
              </Box>
            </Paper>
          </Grid>

          {/* ========================================================================= */}
          {/* RIGHT COLUMN: BRAND LOGO + 8 FEATURE CARDS */}
          {/* ========================================================================= */}
          <Grid
            item
            xs={12}
            md={6.5}
            lg={7}
            xl={7.5}
            sx={{
              display: { xs: 'none', md: 'flex' },
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Box sx={{ width: '100%', maxWidth: '680px' }}>
              {/* Official Brand Logo Banner (dvslogo2) */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: { xs: 2.5, lg: 3.5 },
                  width: '100%'
                }}
              >
                <Box
                  component="img"
                  src="/dvslogo2.jpeg"
                  alt="Digital Vidya Saarthi ERP"
                  sx={{
                    width: '100%',
                    maxWidth: { xs: '340px', sm: '420px', md: '500px', lg: '560px' },
                    height: 'auto',
                    objectFit: 'contain',
                    borderRadius: '18px',
                    boxShadow: '0 12px 35px rgba(2, 132, 199, 0.4)',
                    border: '2px solid rgba(56, 189, 248, 0.5)',
                    background: '#ffffff',
                    p: 1.2
                  }}
                />
              </Box>

              {/* 8 Feature Cards Grid (2 rows x 4 columns) */}
              <Grid container spacing={1.8}>
                {features.map((item, idx) => (
                  <Grid item xs={6} sm={3} key={idx}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 1.8,
                        height: '115px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        borderRadius: '16px',
                        bgcolor: 'rgba(255, 255, 255, 0.96)',
                        border: '1px solid rgba(255, 255, 255, 0.6)',
                        boxShadow: '0 8px 25px rgba(0, 8, 25, 0.25)',
                        transition: 'all 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
                        cursor: 'default',
                        '&:hover': {
                          transform: 'translateY(-5px)',
                          bgcolor: '#ffffff',
                          boxShadow: '0 16px 35px rgba(2, 132, 199, 0.45)',
                          border: '1.5px solid #38bdf8',
                          '& .feature-icon': {
                            transform: 'scale(1.15)'
                          }
                        }
                      }}
                    >
                      <Box
                        className="feature-icon"
                        sx={{
                          mb: 0.8,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'transform 0.25s ease'
                        }}
                      >
                        {item.icon}
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 800,
                          color: '#0f172a',
                          fontSize: '0.78rem',
                          lineHeight: 1.25,
                          whiteSpace: 'pre-line'
                        }}
                      >
                        {item.title}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>

              {/* Bottom Subtle Trustline */}
              <Box sx={{ mt: 2.8, textAlign: 'center' }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: '#93c5fd',
                    fontWeight: 600,
                    letterSpacing: 0.5,
                    textShadow: '0 2px 8px rgba(0,0,0,0.4)'
                  }}
                >
                  ⚡ Enterprise Cloud Education Management System • Trusted by Leading Institutions
                </Typography>
              </Box>
            </Box>
          </Grid>

        </Grid>
      </Container>

      {/* ========================================================================= */}
      {/* DIALOG 1: CONTACT ADMIN MODAL */}
      {/* ========================================================================= */}
      <Dialog
        open={contactDialogOpen}
        onClose={() => setContactDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '20px', p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SupportAgentOutlined sx={{ color: '#0284c7', fontSize: 26 }} />
            <Typography variant="h6" fontWeight={800} color="#0f172a">
              Contact School Admin
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setContactDialogOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ py: 2.5 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            Agar aapko login karne mein koi samasya aa rahi hai ya credentials bhool gaye hain, toh kripya school office ya IT desk se contact karein:
          </Typography>

          <Stack spacing={2}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, bgcolor: '#f8fafc', borderRadius: '12px' }}>
              <PhoneIcon sx={{ color: '#0284c7' }} />
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  Helpdesk Helpline
                </Typography>
                <Typography variant="body2" fontWeight={800} color="#0f172a">
                  +91 98765 43210 / +91 11 2345 6789
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, bgcolor: '#f8fafc', borderRadius: '12px' }}>
              <EmailIcon sx={{ color: '#0284c7' }} />
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  Official Support Email
                </Typography>
                <Typography variant="body2" fontWeight={800} color="#0f172a">
                  support@digitalvidyasaarthi.in
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, bgcolor: '#f8fafc', borderRadius: '12px' }}>
              <ClockIcon sx={{ color: '#0284c7' }} />
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  Office Hours
                </Typography>
                <Typography variant="body2" fontWeight={800} color="#0f172a">
                  Monday to Saturday: 8:00 AM – 4:00 PM
                </Typography>
              </Box>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            fullWidth
            variant="contained"
            onClick={() => setContactDialogOpen(false)}
            sx={{
              borderRadius: '12px',
              fontWeight: 800,
              bgcolor: '#0284c7',
              '&:hover': { bgcolor: '#0369a1' }
            }}
          >
            Got it, Thank You
          </Button>
        </DialogActions>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG 2: FORGOT PASSWORD MODAL */}
      {/* ========================================================================= */}
      <Dialog
        open={forgotDialogOpen}
        onClose={() => setForgotDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '20px', p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Typography variant="h6" fontWeight={800} color="#0f172a">
            Password Recovery
          </Typography>
          <IconButton size="small" onClick={() => setForgotDialogOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ py: 2.5 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Security policy ke tehat passwords Central School Administrator dwara reset kiye jaate hain:
          </Typography>

          <Stack spacing={1.5}>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: '12px', bgcolor: '#f8fafc' }}>
              <Typography variant="subtitle2" fontWeight={800} color="#0284c7">
                🎓 Students & Parents:
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Aapka default password <strong>Admin@123</strong> hai. Yadi aapne change kiya tha aur bhool gaye hain, toh class teacher ya school office se reset karwayen.
              </Typography>
            </Paper>

            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: '12px', bgcolor: '#f8fafc' }}>
              <Typography variant="subtitle2" fontWeight={800} color="#0284c7">
                👨‍🏫 Faculty & Staff:
              </Typography>
              <Typography variant="caption" color="text.secondary">
                School Principal ya IT Admin apne dashboard (Users & Roles) se aapka password instant reset kar sakte hain.
              </Typography>
            </Paper>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            fullWidth
            variant="contained"
            onClick={() => setForgotDialogOpen(false)}
            sx={{
              borderRadius: '12px',
              fontWeight: 800,
              bgcolor: '#0284c7',
              '&:hover': { bgcolor: '#0369a1' }
            }}
          >
            Understood
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LoginPage;
