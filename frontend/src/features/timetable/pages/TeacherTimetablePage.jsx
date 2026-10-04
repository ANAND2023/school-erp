import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Print as PrintIcon, Person as TeacherIcon } from '@mui/icons-material';
import api from '../../../api/client';
import { getTeacherTimetable } from '../api';

const DAYS = [
  { id: 1, name: 'Monday' },
  { id: 2, name: 'Tuesday' },
  { id: 3, name: 'Wednesday' },
  { id: 4, name: 'Thursday' },
  { id: 5, name: 'Friday' },
  { id: 6, name: 'Saturday' },
];

const TeacherTimetablePage = () => {
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [timetable, setTimetable] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const res = await api.get('/employees');
      const list = res.data?.data?.items || (Array.isArray(res.data?.data) ? res.data?.data : []);
      setTeachers(list);
      if (list.length > 0) {
        setSelectedTeacherId(list[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (selectedTeacherId) {
      loadTeacherSchedule();
    }
  }, [selectedTeacherId]);

  const loadTeacherSchedule = async () => {
    setLoading(true);
    setAlert(null);
    try {
      const res = await getTeacherTimetable(selectedTeacherId);
      setTimetable(res.data?.data || res.data);
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: 'Failed to load teacher timetable.' });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} color="primary.main">
            Teacher Schedule & Timetable
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Personalized weekly class view for teaching faculty (FR-4.4, FR-6.6)
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<PrintIcon />} onClick={handlePrint} sx={{ px: 2.5 }}>
          Print Schedule
        </Button>
      </Box>

      {alert && (
        <Alert severity={alert.type} sx={{ mb: 3 }} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      {/* Selector */}
      <Card sx={{ mb: 3, boxShadow: 2 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Select Teacher</InputLabel>
                <Select
                  value={selectedTeacherId}
                  label="Select Teacher"
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                >
                  {teachers.map((t) => (
                    <MenuItem key={t.id} value={t.id}>
                      {t.fullName} ({t.employeeCode})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {timetable && (
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Total Allocated Slots This Week:{' '}
                  <strong>{timetable.slots?.length || 0}</strong>
                </Typography>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : !timetable || timetable.periods?.length === 0 ? (
        <Paper sx={{ p: 5, textAlign: 'center' }}>
          <TeacherIcon sx={{ fontSize: 50, color: 'text.secondary', mb: 1 }} />
          <Typography variant="h6" color="text.secondary">
            No schedule found. Ensure periods and timetable slots are configured.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ boxShadow: 2, overflowX: 'auto' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f4f6f8' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, minWidth: 110, bgcolor: '#e8eaf6' }}>
                  Day / Period
                </TableCell>
                {timetable.periods.map((p) => (
                  <TableCell
                    key={p.id}
                    sx={{
                      fontWeight: 700,
                      textAlign: 'center',
                      minWidth: 150,
                      bgcolor: p.isBreak ? '#fff3e0' : 'inherit',
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight={700}>
                      {p.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {p.startTime} - {p.endTime}
                    </Typography>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {DAYS.map((day) => (
                <TableRow key={day.id} hover>
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#fafafa' }}>{day.name}</TableCell>
                  {timetable.periods.map((p) => {
                    if (p.isBreak) {
                      return (
                        <TableCell
                          key={p.id}
                          sx={{
                            textAlign: 'center',
                            bgcolor: '#fff8e1',
                            color: '#e65100',
                            fontWeight: 700,
                          }}
                        >
                          BREAK
                        </TableCell>
                      );
                    }

                    const slot = (timetable.slots || []).find(
                      (s) => s.dayOfWeek === day.id && s.periodId === p.id
                    );

                    return (
                      <TableCell
                        key={p.id}
                        sx={{
                          textAlign: 'center',
                          p: 1.5,
                          border: '1px solid #f0f0f0',
                          bgcolor: slot ? '#eff6ff' : '#fff',
                        }}
                      >
                        {slot ? (
                          <Box>
                            <Typography variant="body2" fontWeight={700} color="primary.main">
                              {slot.className} - {slot.sectionName}
                            </Typography>
                            <Typography variant="caption" display="block" color="text.secondary">
                              {slot.subjectName}
                            </Typography>
                            {slot.roomNo && (
                              <Chip
                                size="small"
                                label={`Room: ${slot.roomNo}`}
                                sx={{ height: 18, fontSize: '0.65rem', mt: 0.5 }}
                              />
                            )}
                          </Box>
                        ) : (
                          <Typography variant="caption" color="#bdbdbd">
                            Free
                          </Typography>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default TeacherTimetablePage;
