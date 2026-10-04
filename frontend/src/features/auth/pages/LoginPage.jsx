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
        } else {
          navigate(from, { replace: true });
        }
      } else {
        setErrorMessage(res.data.message || 'Login failed.');
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || 'Invalid username or password. Please try again.'
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
              bgcolor: '#1976d2',
              color: 'white',
              p: 1.5,
              borderRadius: '50%',
              mb: 2,
            }}
          >
            <SchoolIcon fontSize="large" />
          </Box>
          <Typography component="h1" variant="h5" sx={{ fontWeight: 700, mb: 0.5, letterSpacing: '0.5px' }}>
            DVS ERP
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600, color: '#f59e0b', mb: 1 }}>
            Digital Vidya Sarthi
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Sign in to access your educational management portal
          </Typography>

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
              label="Username or Email"
              name="username"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
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
              sx={{ mt: 3, mb: 2, py: 1.2, fontWeight: 600 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
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
