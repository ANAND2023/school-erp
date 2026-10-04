import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress,
} from '@mui/material';
import apiClient from '../../../api/client';
import { useAuthStore } from '../../../store/authStore';

export const ChangePasswordPage = () => {
  const navigate = useNavigate();
  const { user, setAuth, accessToken, refreshToken, permissions } = useAuthStore();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }

    // BR-1.1: Password min 8 chars with at least 1 uppercase, 1 number, 1 special character
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      setError(
        'Password must be at least 8 characters long and contain at least 1 uppercase letter, 1 number, and 1 special character.'
      );
      return;
    }

    try {
      setLoading(true);
      const res = await apiClient.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      if (res.data.success) {
        setSuccess('Password changed successfully! Redirecting...');
        if (user && accessToken && refreshToken) {
          setAuth({
            user: { ...user, mustChangePassword: false },
            accessToken,
            refreshToken,
            permissions,
          });
        }
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      } else {
        setError(res.data.message || 'Failed to change password.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error occurred while changing password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 6 }}>
      <Paper sx={{ p: 4, borderRadius: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
          Change Password
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {user?.mustChangePassword
            ? 'You are required to change your temporary password before proceeding.'
            : 'Update your account password.'}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            margin="normal"
            required
            fullWidth
            type="password"
            label="Current Password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            disabled={loading}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            type="password"
            label="New Password"
            helperText="Min 8 chars, 1 uppercase, 1 number, 1 special character"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={loading}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            type="password"
            label="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
          />

          <Button
            type="submit"
            variant="contained"
            sx={{ mt: 3, py: 1.2, px: 4, fontWeight: 600 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Update Password'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};
