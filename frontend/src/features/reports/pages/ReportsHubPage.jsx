import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Stack,
  Divider,
} from '@mui/material';
import {
  Assessment as ReportsIcon,
  People as StudentIcon,
  AccountBalanceWallet as FeesIcon,
  CalendarMonth as AttendanceIcon,
  Assignment as ExamIcon,
  ArrowForward as ArrowIcon,
  FileDownload as DownloadIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

export const ReportsHubPage = () => {
  const navigate = useNavigate();

  const reportCategories = [
    {
      title: 'Fee Management Reports',
      description: 'Daily collection register, head-wise collections, class dues & fee defaulters lists.',
      icon: <FeesIcon sx={{ fontSize: 36, color: '#10b981' }} />,
      link: '/fees/reports',
      buttonText: 'Open Fee Reports',
    },
    {
      title: 'Attendance Reports & Register',
      description: 'Daily absent alerts, monthly student attendance registers & staff attendance sheets.',
      icon: <AttendanceIcon sx={{ fontSize: 36, color: '#3b82f6' }} />,
      link: '/attendance/reports',
      buttonText: 'Open Attendance Reports',
    },
    {
      title: 'Exam Results & Report Cards',
      description: 'Term result processing, class rankings, grade distributions & CBSE student report cards.',
      icon: <ExamIcon sx={{ fontSize: 36, color: '#8b5cf6' }} />,
      link: '/exams/report-cards',
      buttonText: 'Open Exam Results',
    },
    {
      title: 'Student Admissions & Directory',
      description: 'Admission reports, pupil enrollment slips, class-wise strength, sibling records & student master export.',
      icon: <StudentIcon sx={{ fontSize: 36, color: '#f59e0b' }} />,
      link: '/students',
      buttonText: 'Open Admissions & Directory',
    },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" fontWeight={700} color="primary.main">
          School Reports & Analytics Hub
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Access all analytical registers, statements, mark sheets, and audit reports across all ERP modules
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {reportCategories.map((cat, idx) => (
          <Grid item xs={12} sm={6} key={idx}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: 2,
                borderRadius: 3,
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4,
                },
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: '#f8fafc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {cat.icon}
                  </Box>
                  <Typography variant="h6" fontWeight={700}>
                    {cat.title}
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {cat.description}
                </Typography>
              </CardContent>
              <Box sx={{ p: 2.5, pt: 0 }}>
                <Divider sx={{ mb: 2 }} />
                <Button
                  fullWidth
                  variant="outlined"
                  endIcon={<ArrowIcon />}
                  onClick={() => navigate(cat.link)}
                  sx={{ fontWeight: 600 }}
                >
                  {cat.buttonText}
                </Button>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default ReportsHubPage;
