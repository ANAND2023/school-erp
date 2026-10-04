import React from 'react';
import { Box, Typography, Button, Container, Paper } from '@mui/material';
import { GppBad as GppBadIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

export const UnauthorizedPage = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 3 }}>
        <GppBadIcon color="error" sx={{ fontSize: 72, mb: 2 }} />
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Access Denied
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          You do not have permission to view or access this module. Please contact your
          administrator if you believe this is in error.
        </Typography>
        <Button variant="contained" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
      </Paper>
    </Container>
  );
};
