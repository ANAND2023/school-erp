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
  Stack,
} from '@mui/material';
import {
  Print as PrintIcon,
  Person as TeacherIcon,
  TableChart as ExcelIcon,
  PictureAsPdf as PdfIcon,
} from '@mui/icons-material';
import api from '../../../api/client';
import * as XLSX from 'xlsx';
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

  const handleDownloadExcel = () => {
    if (!timetable || !timetable.periods || timetable.periods.length === 0) {
      setAlert({ type: 'error', message: 'No schedule available to export.' });
      return;
    }

    const teacher = teachers.find(t => t.id === selectedTeacherId);

    const data = [
      ['Teacher Schedule & Timetable'],
      [`Teacher: ${teacher?.fullName || 'Teacher'} (${teacher?.employeeCode || '-'})`],
      [],
      ['Day / Period', ...timetable.periods.map(p => `${p.name} (${p.startTime} - ${p.endTime})`)]
    ];

    DAYS.forEach(day => {
      const row = [day.name];
      timetable.periods.forEach(p => {
        if (p.isBreak) {
          row.push('BREAK');
        } else {
          const slot = (timetable.slots || []).find(s => s.dayOfWeek === day.id && s.periodId === p.id);
          if (slot) {
            let cellText = `${slot.className || ''} - ${slot.sectionName || ''} | ${slot.subjectName || ''}`;
            if (slot.roomNo) cellText += ` [Room: ${slot.roomNo}]`;
            row.push(cellText);
          } else {
            row.push('Free');
          }
        }
      });
      data.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    const colWidths = [{ wch: 15 }];
    timetable.periods.forEach(() => colWidths.push({ wch: 28 }));
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Teacher Timetable');
    XLSX.writeFile(wb, `Teacher_Timetable_${teacher?.fullName || 'Export'}.xlsx`);
  };

  return (
    <Box sx={{ pb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Box>
          <Typography variant="h6" fontWeight={800} sx={{ fontSize: { xs: '1.15rem', sm: '1.25rem' }, color: '#1e293b', m: 0, lineHeight: 1.2 }}>
            Teacher Schedule & Timetable
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: { xs: '0.72rem', sm: '0.78rem' }, mt: 0.25 }}>
            Personalized weekly class view for teaching faculty
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="contained"
            startIcon={<ExcelIcon sx={{ fontSize: 16 }} />}
            onClick={handleDownloadExcel}
            disabled={!timetable || !timetable.periods || timetable.periods.length === 0}
            sx={{
              bgcolor: '#107c41',
              color: '#ffffff',
              height: 32,
              fontSize: '0.78rem',
              fontWeight: 700,
              px: 1.8,
              borderRadius: '8px',
              boxShadow: '0 2px 6px rgba(16, 124, 65, 0.25)',
              textTransform: 'none',
              '&:hover': { bgcolor: '#0b5c30', boxShadow: '0 4px 10px rgba(16, 124, 65, 0.4)' },
              '&.Mui-disabled': { bgcolor: '#cbd5e1', color: '#94a3b8' },
            }}
          >
            Download Excel
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={<PdfIcon sx={{ fontSize: 16 }} />}
            onClick={handlePrint}
            disabled={!timetable || !timetable.periods || timetable.periods.length === 0}
            sx={{
              bgcolor: '#d32f2f',
              color: '#ffffff',
              height: 32,
              fontSize: '0.78rem',
              fontWeight: 700,
              px: 1.8,
              borderRadius: '8px',
              boxShadow: '0 2px 6px rgba(211, 47, 47, 0.25)',
              textTransform: 'none',
              '&:hover': { bgcolor: '#b71c1c', boxShadow: '0 4px 10px rgba(211, 47, 47, 0.4)' },
              '&.Mui-disabled': { bgcolor: '#cbd5e1', color: '#94a3b8' },
            }}
          >
            Download PDF
          </Button>
        </Stack>
      </Box>

      {alert && (
        <Alert severity={alert.type} sx={{ mb: 1.5 }} onClose={() => setAlert(null)}>
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
