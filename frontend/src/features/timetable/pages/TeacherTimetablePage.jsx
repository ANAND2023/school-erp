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
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
    if (!timetable || timetable.periods?.length === 0) {
      setAlert({ type: 'error', message: 'No schedule available to export.' });
      return;
    }

    const doc = new jsPDF('landscape');
    
    // Add Header
    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text('Teacher Schedule & Timetable', 14, 22);
    
    const teacher = teachers.find(t => t.id === selectedTeacherId);
    if (teacher) {
      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text(`Teacher: ${teacher.fullName} (${teacher.employeeCode})`, 14, 30);
    }

    const headRow = ['Day / Period', ...timetable.periods.map(p => `${p.name}\n${p.startTime} - ${p.endTime}`)];
    
    const bodyRows = DAYS.map(day => {
      const row = [day.name];
      timetable.periods.forEach(p => {
        if (p.isBreak) {
          row.push('BREAK');
        } else {
          const slot = (timetable.slots || []).find(s => s.dayOfWeek === day.id && s.periodId === p.id);
          if (slot) {
            let cellText = `${slot.className} - ${slot.sectionName}\n${slot.subjectName}`;
            if (slot.roomNo) cellText += `\nRoom: ${slot.roomNo}`;
            row.push(cellText);
          } else {
            row.push('Free');
          }
        }
      });
      return row;
    });

    autoTable(doc, {
      head: [headRow],
      body: bodyRows,
      startY: 35,
      theme: 'grid',
      headStyles: { fillColor: [232, 234, 246], textColor: [0, 0, 0], halign: 'center', valign: 'middle' },
      bodyStyles: { halign: 'center', valign: 'middle' },
      columnStyles: {
        0: { halign: 'left', fontStyle: 'bold', fillColor: [250, 250, 250] } // Day column
      },
      didParseCell: function (data) {
        if (data.section === 'body' && data.cell.raw === 'BREAK') {
          data.cell.styles.fillColor = [255, 248, 225];
          data.cell.styles.textColor = [230, 81, 0];
          data.cell.styles.fontStyle = 'bold';
        }
        if (data.section === 'body' && data.cell.raw === 'Free') {
          data.cell.styles.textColor = [150, 150, 150];
        }
        if (data.section === 'body' && data.cell.raw !== 'BREAK' && data.cell.raw !== 'Free' && data.column.index !== 0) {
          data.cell.styles.fillColor = [239, 246, 255];
        }
      }
    });

    doc.save(`Teacher_Timetable_${teacher?.fullName || 'Export'}.pdf`);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} color="primary.main">
            Teacher Schedule & Timetable
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Personalized weekly class view for teaching faculty (FR-4.4, FR-6.6)
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<PrintIcon />} onClick={handlePrint} sx={{ px: 2.5 }}>
          Download PDF
        </Button>
      </Box>

      {alert && (
        <Alert  severity={alert.type} sx={{ mb: 3 }} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}



      {/* Selector */}
      <Card  sx={{ mb: 3, boxShadow: 2 }}>
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
