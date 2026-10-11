import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff, School as SchoolIcon } from '@mui/icons-material';
import { useAuthStore } from '../../../store/authStore';
import apiClient from '../../../api/client';

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuthStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const from = location.state?.from?.pathname || '/dashboard';

  const [portalType, setPortalType] = useState('staff'); // 'staff', 'student', 'parent'

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!username.trim() || !password) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    try {
      setLoading(true);
      const res = await apiClient.post('/auth/login', { username, password });
      if (res.data.success) {
        const { user, accessToken, refreshToken, permissions } = res.data.data;
        setAuth({ user, accessToken, refreshToken, permissions });

        if (user.mustChangePassword) {
          navigate('/change-password', { replace: true });
        } else if (user.userType === 6 || user.userType === 7) {
          navigate('/portal', { replace: true });
        } else {
          navigate(from, { replace: true });
        }
      } else {
        setErrorMessage(res.data.message || 'Login failed.');
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || 'Invalid credentials. Please verify your login details.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#f0f2f5',
        p: 2,
      }}
    >
      <Container maxWidth="xs">
        <Paper
          elevation={3}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            borderRadius: 3,
          }}
        >
          <Box
            sx={{
              background: portalType === 'student' 
                ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' 
                : portalType === 'parent' 
                ? 'linear-gradient(135deg, #10b981 0%, #047857 100%)' 
                : 'linear-gradient(135deg, #1976d2 0%, #0a387c 100%)',
              color: 'white',
              p: 1.5,
              borderRadius: '50%',
              mb: 1.5,
              boxShadow: '0 4px 14px rgba(0,0,0,0.18)'
            }}
          >
            <SchoolIcon fontSize="large" />
          </Box>
          <Typography component="h1" variant="h5" sx={{ fontWeight: 800, mb: 0.5, letterSpacing: '0.2px' }}>
            DVS ERP
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 700, color: '#f59e0b', mb: 0.5 }}>
            Digital Vidya Sarthi
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
            {portalType === 'student' 
              ? 'Student Portal: View Timetable, Attendance, Results & Notices'
              : portalType === 'parent'
              ? 'Parent Portal: Monitor Child Progress, Dues, Results & Daily Presence'
              : 'School Management & Staff ERP Portal'}
          </Typography>

          {/* Portal Switcher Buttons */}
          <Box sx={{ display: 'flex', width: '100%', mb: 2.5, bgcolor: '#f1f5f9', p: 0.5, borderRadius: 2 }}>
            <Button
              size="small"
              onClick={() => { setPortalType('staff'); setErrorMessage(''); }}
              sx={{
                flex: 1,
                py: 0.8,
                borderRadius: 1.5,
                fontWeight: 800,
                fontSize: '0.75rem',
                textTransform: 'none',
                bgcolor: portalType === 'staff' ? '#ffffff' : 'transparent',
                color: portalType === 'staff' ? '#0a387c' : '#64748b',
                boxShadow: portalType === 'staff' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none'
              }}
            >
              Staff / Admin
            </Button>
            <Button
              size="small"
              onClick={() => { setPortalType('student'); setErrorMessage(''); }}
              sx={{
                flex: 1,
                py: 0.8,
                borderRadius: 1.5,
                fontWeight: 800,
                fontSize: '0.75rem',
                textTransform: 'none',
                bgcolor: portalType === 'student' ? '#0284c7' : 'transparent',
                color: portalType === 'student' ? '#ffffff' : '#64748b',
                boxShadow: portalType === 'student' ? '0 2px 6px rgba(2, 132, 199, 0.3)' : 'none'
              }}
            >
              🎓 Student
            </Button>
            <Button
              size="small"
              onClick={() => { setPortalType('parent'); setErrorMessage(''); }}
              sx={{
                flex: 1,
                py: 0.8,
                borderRadius: 1.5,
                fontWeight: 800,
                fontSize: '0.75rem',
                textTransform: 'none',
                bgcolor: portalType === 'parent' ? '#10b981' : 'transparent',
                color: portalType === 'parent' ? '#ffffff' : '#64748b',
                boxShadow: portalType === 'parent' ? '0 2px 6px rgba(16, 185, 129, 0.3)' : 'none'
              }}
            >
              👨‍👩‍👧 Parent
            </Button>
          </Box>

          {errorMessage && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {errorMessage}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label={
                portalType === 'student'
                  ? 'Admission No. or Student Username'
                  : portalType === 'parent'
                  ? 'Registered Parent Mobile / Email'
                  : 'Username or Email'
              }
              name="username"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              placeholder={
                portalType === 'student'
                  ? 'e.g. ADM2026001'
                  : portalType === 'parent'
                  ? 'e.g. 9873993957'
                  : 'admin'
              }
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ 
                mt: 3, 
                mb: 2, 
                py: 1.2, 
                fontWeight: 800,
                bgcolor: portalType === 'student' 
                  ? '#0284c7' 
                  : portalType === 'parent' 
                  ? '#10b981' 
                  : '#1976d2',
                '&:hover': {
                  bgcolor: portalType === 'student' 
                    ? '#0369a1' 
                    : portalType === 'parent' 
                    ? '#059669' 
                    : '#1565c0',
                }
              }}
              disabled={loading}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                portalType === 'student'
                  ? 'Login to Student Portal'
                  : portalType === 'parent'
                  ? 'Login to Parent Portal'
                  : 'Sign In to Management ERP'
              )}
            </Button>
          </Box>

          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #e2e8f0', width: '100%', textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Powered by <strong>Digital Vidya Sarthi</strong> • DVS ERP
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};
