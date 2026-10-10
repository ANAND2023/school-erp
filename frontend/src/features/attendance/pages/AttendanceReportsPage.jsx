import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
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
  FileDownload as ExportIcon,
  Search as SearchIcon,
  NotificationsActive as AlertIcon,
  CalendarMonth as RegisterIcon,
} from '@mui/icons-material';
import api from '../../../api/client';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  getAbsenteesToday,
  getStudentMonthlyRegister,
  getStaffMonthlyRegister,
} from '../api';
import AppDatePicker from '../../../components/common/AppDatePicker';

const AttendanceReportsPage = () => {
  const [tabValue, setTabValue] = useState(0); // 0 = Absentees, 1 = Student Monthly, 2 = Staff Monthly

  // Common filters
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [sections, setSections] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState('');

  // Date filters
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  // Data states
  const [absentees, setAbsentees] = useState([]);
  const [studentRegister, setStudentRegister] = useState(null);
  const [staffRegister, setStaffRegister] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [classRes, deptRes] = await Promise.all([
        api.get('/classes'),
        api.get('/simplemasters?type=Department'),
      ]);
      const classList = classRes.data?.data || classRes.data || [];
      setClasses(classList);
      if (classList.length > 0) {
        setSelectedClassId(classList[0].id);
        const secs = classList[0].sections || [];
        setSections(secs);
        if (secs.length > 0) setSelectedSectionId(secs[0].id);
      }
      setDepartments(deptRes.data?.data || deptRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClassChange = (classId) => {
    setSelectedClassId(classId);
    const found = classes.find((c) => c.id === classId);
    const secs = found?.sections || [];
    setSections(secs);
    if (secs.length > 0) {
      setSelectedSectionId(secs[0].id);
    } else {
      setSelectedSectionId('');
    }
  };

  useEffect(() => {
    if (tabValue === 0) {
      loadAbsentees();
    } else if (tabValue === 1 && selectedSectionId) {
      loadStudentRegister();
    } else if (tabValue === 2) {
      loadStaffRegister();
    }
  }, [tabValue, date, selectedSectionId, selectedDeptId, month, year]);

  const loadAbsentees = async () => {
    setLoading(true);
    setAlert(null);
    try {
      const params = { date };
      if (selectedClassId) params.classId = selectedClassId;
      if (selectedSectionId) params.sectionId = selectedSectionId;

      const res = await getAbsenteesToday(params);
      setAbsentees(res.data?.data || res.data || []);
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: 'Failed to load absentees list.' });
    } finally {
      setLoading(false);
    }
  };

  const loadStudentRegister = async () => {
    if (!selectedSectionId) return;
    setLoading(true);
    setAlert(null);
    try {
      const res = await getStudentMonthlyRegister(selectedSectionId, month, year);
      setStudentRegister(res.data?.data || res.data);
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: 'Failed to load student monthly register.' });
    } finally {
      setLoading(false);
    }
  };

  const loadStaffRegister = async () => {
    setLoading(true);
    setAlert(null);
    try {
      const res = await getStaffMonthlyRegister(month, year, selectedDeptId || null);
      setStaffRegister(res.data?.data || res.data);
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: 'Failed to load staff monthly register.' });
    } finally {
      setLoading(false);
    }
  };

  // Export Absentees to CSV
  const exportAbsenteesCsv = () => {
    if (absentees.length === 0) return;
    const headers = 'Admission No,Student Name,Class,Section,Roll No,Guardian Name,Guardian Mobile,Status,Remarks\n';
    const rows = absentees
      .map(
        (a) =>
          `"${a.admissionNo}","${a.studentName}","${a.className}","${a.sectionName}","${a.rollNo || ''}","${a.guardianName}","${a.guardianMobile}","${a.status === 2 ? 'Absent' : 'Leave'}","${a.remarks || ''}"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `absentees_${date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportStudentExcel = () => {
    if (!studentRegister || !studentRegister.rows) return;
    const wsData = [];
    
    // Header
    const headerRow = ['Roll', 'Student Name', 'Work', '% (BR-6.2)'];
    for (let i = 1; i <= studentRegister.daysInMonth; i++) headerRow.push(i.toString());
    headerRow.push('P', 'A');
    wsData.push(headerRow);

    // Rows
    studentRegister.rows.forEach(row => {
      const dataRow = [row.rollNo || '-', row.fullName, row.totalWorkingDays, row.attendancePercentage + '%'];
      for (let i = 1; i <= studentRegister.daysInMonth; i++) {
        dataRow.push(row.dailyStatus[i] || '-');
      }
      dataRow.push(row.totalPresent, row.totalAbsent);
      wsData.push(dataRow);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Student_Register');
    XLSX.writeFile(wb, `Student_Monthly_Register_${month}_${year}.xlsx`);
  };

  const exportStudentPdf = () => {
    if (!studentRegister || !studentRegister.rows) return;
    const doc = new jsPDF({ orientation: 'landscape' });
    
    doc.setFontSize(16);
    doc.text(`Student Monthly Register - ${month} ${year}`, 14, 15);
    
    const headRow = ['Roll', 'Name', 'Work', '%'];
    for (let i = 1; i <= studentRegister.daysInMonth; i++) headRow.push(i.toString());
    headRow.push('P', 'A');

    const bodyRows = studentRegister.rows.map(row => {
      const dataRow = [row.rollNo || '-', row.fullName, row.totalWorkingDays, row.attendancePercentage + '%'];
      for (let i = 1; i <= studentRegister.daysInMonth; i++) {
        dataRow.push(row.dailyStatus[i] || '-');
      }
      dataRow.push(row.totalPresent, row.totalAbsent);
      return dataRow;
    });

    autoTable(doc, {
      head: [headRow],
      body: bodyRows,
      startY: 20,
      styles: { fontSize: 7, cellPadding: 1, halign: 'center' },
      columnStyles: {
        0: { halign: 'left' },
        1: { halign: 'left' }
      }
    });

    doc.save(`Student_Monthly_Register_${month}_${year}.pdf`);
  };

  const exportAbsenteesExcel = () => {
    if (absentees.length === 0) return;
    const wsData = [
      ['Admission No', 'Student Name', 'Class', 'Section', 'Roll No', 'Guardian Name', 'Guardian Mobile', 'Status', 'Remarks']
    ];
    absentees.forEach(a => {
      wsData.push([
        a.admissionNo, a.studentName, a.className, a.sectionName, a.rollNo || '-',
        a.guardianName, a.guardianMobile, a.status === 2 ? 'Absent' : 'Leave', a.remarks || ''
      ]);
    });
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Absentees');
    XLSX.writeFile(wb, `absentees_${date}.xlsx`);
  };

  const exportAbsenteesPdf = () => {
    if (absentees.length === 0) return;
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text(`Absentees Alert List - ${date}`, 14, 15);
    
    const headRow = ['Adm No', 'Student Name', 'Class', 'Sec', 'Roll', 'Guardian', 'Mobile', 'Status', 'Remarks'];
    const bodyRows = absentees.map(a => [
      a.admissionNo, a.studentName, a.className, a.sectionName, a.rollNo || '-',
      a.guardianName || '-', a.guardianMobile || '-', a.status === 2 ? 'Absent' : 'Leave', a.remarks || '-'
    ]);

    autoTable(doc, {
      head: [headRow],
      body: bodyRows,
      startY: 20,
      styles: { fontSize: 9 }
    });
    doc.save(`absentees_${date}.pdf`);
  };

  const exportStaffExcel = () => {
    if (!staffRegister || !staffRegister.rows) return;
    const wsData = [];
    const headerRow = ['Emp Code', 'Employee Name', 'Department', 'Work'];
    for (let i = 1; i <= staffRegister.daysInMonth; i++) headerRow.push(i.toString());
    headerRow.push('P', 'A');
    wsData.push(headerRow);

    staffRegister.rows.forEach(row => {
      const dataRow = [row.employeeCode, row.fullName, row.departmentName || '-', row.totalWorkingDays];
      for (let i = 1; i <= staffRegister.daysInMonth; i++) {
        dataRow.push(row.dailyStatus[i] || '-');
      }
      dataRow.push(row.totalPresent, row.totalAbsent);
      wsData.push(dataRow);
    });
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Staff_Register');
    XLSX.writeFile(wb, `Staff_Monthly_Register_${month}_${year}.xlsx`);
  };

  const exportStaffPdf = () => {
    if (!staffRegister || !staffRegister.rows) return;
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text(`Staff Monthly Register - ${month} ${year}`, 14, 15);
    
    const headRow = ['Emp Code', 'Name', 'Dept', 'Work'];
    for (let i = 1; i <= staffRegister.daysInMonth; i++) headRow.push(i.toString());
    headRow.push('P', 'A');

    const bodyRows = staffRegister.rows.map(row => {
      const dataRow = [row.employeeCode, row.fullName, row.departmentName || '-', row.totalWorkingDays];
      for (let i = 1; i <= staffRegister.daysInMonth; i++) {
        dataRow.push(row.dailyStatus[i] || '-');
      }
      dataRow.push(row.totalPresent, row.totalAbsent);
      return dataRow;
    });

    autoTable(doc, {
      head: [headRow],
      body: bodyRows,
      startY: 20,
      styles: { fontSize: 7, cellPadding: 1, halign: 'center' },
      columnStyles: {
        0: { halign: 'left' },
        1: { halign: 'left' },
        2: { halign: 'left' }
      }
    });
    doc.save(`Staff_Monthly_Register_${month}_${year}.pdf`);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} color="primary.main">
            Attendance Reports & Registers
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Daily absence alert list with guardian contacts and monthly attendance percentage registers (FR-6.3, BR-6.2)
          </Typography>
        </Box>
        {tabValue === 0 && absentees.length > 0 && (
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<ExportIcon />} onClick={exportAbsenteesCsv} sx={{ px: 2.5 }}>
              CSV
            </Button>
            <Button variant="outlined" startIcon={<ExportIcon />} onClick={exportAbsenteesExcel} sx={{ px: 2.5 }}>
              Excel
            </Button>
            <Button variant="outlined" startIcon={<ExportIcon />} onClick={exportAbsenteesPdf} sx={{ px: 2.5 }}>
              PDF
            </Button>
          </Stack>
        )}
        {tabValue === 1 && studentRegister?.rows?.length > 0 && (
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<ExportIcon />} onClick={exportStudentExcel} sx={{ px: 2.5 }}>
              Excel
            </Button>
            <Button variant="outlined" startIcon={<ExportIcon />} onClick={exportStudentPdf} sx={{ px: 2.5 }}>
              PDF
            </Button>
          </Stack>
        )}
        {tabValue === 2 && staffRegister?.rows?.length > 0 && (
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<ExportIcon />} onClick={exportStaffExcel} sx={{ px: 2.5 }}>
              Excel
            </Button>
            <Button variant="outlined" startIcon={<ExportIcon />} onClick={exportStaffPdf} sx={{ px: 2.5 }}>
              PDF
            </Button>
          </Stack>
        )}
      </Box>

      {alert && (
        <Alert severity={alert.type} sx={{ mb: 3 }} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      {/* Tabs Bar */}
      <Card sx={{ mb: 3, boxShadow: 2 }}>
        <CardContent sx={{ p: 2 }}>
          <Tabs
            value={tabValue}
            onChange={(e, val) => setTabValue(val)}
            textColor="primary"
            indicatorColor="primary"
            sx={{ mb: 2 }}
          >
            <Tab icon={<AlertIcon />} iconPosition="start" label="Today's Absentees (Alert List)" />
            <Tab icon={<RegisterIcon />} iconPosition="start" label="Student Monthly Register" />
            <Tab icon={<RegisterIcon />} iconPosition="start" label="Staff Monthly Register" />
          </Tabs>

          {/* Tab 0 Filters: Absentees */}
          {tabValue === 0 && (
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={3}>
                <AppDatePicker
                  label="Date"
                  value={date}
                  onChange={(e) => setDate(e.value)}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Class</InputLabel>
                  <Select
                    value={selectedClassId}
                    label="Class"
                    onChange={(e) => handleClassChange(e.target.value)}
                  >
                    <MenuItem value="">All Classes</MenuItem>
                    {classes.map((c) => (
                      <MenuItem key={c.id} value={c.id}>
                        {c.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Section</InputLabel>
                  <Select
                    value={selectedSectionId}
                    label="Section"
                    onChange={(e) => setSelectedSectionId(e.target.value)}
                  >
                    <MenuItem value="">All Sections</MenuItem>
                    {sections.map((s) => (
                      <MenuItem key={s.id} value={s.id}>
                        {s.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Button fullWidth variant="contained" onClick={loadAbsentees}>
                  Search Absentees
                </Button>
              </Grid>
            </Grid>
          )}

          {/* Tab 1 Filters: Student Monthly Register */}
          {tabValue === 1 && (
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Class</InputLabel>
                  <Select
                    value={selectedClassId}
                    label="Class"
                    onChange={(e) => handleClassChange(e.target.value)}
                  >
                    {classes.map((c) => (
                      <MenuItem key={c.id} value={c.id}>
                        {c.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Section</InputLabel>
                  <Select
                    value={selectedSectionId}
                    label="Section"
                    onChange={(e) => setSelectedSectionId(e.target.value)}
                  >
                    {sections.map((s) => (
                      <MenuItem key={s.id} value={s.id}>
                        {s.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Month</InputLabel>
                  <Select value={month} label="Month" onChange={(e) => setMonth(Number(e.target.value))}>
                    {[
                      'January',
                      'February',
                      'March',
                      'April',
                      'May',
                      'June',
                      'July',
                      'August',
                      'September',
                      'October',
                      'November',
                      'December',
                    ].map((mName, idx) => (
                      <MenuItem key={idx + 1} value={idx + 1}>
                        {mName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Year"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                />
              </Grid>
            </Grid>
          )}

          {/* Tab 2 Filters: Staff Monthly Register */}
          {tabValue === 2 && (
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Department</InputLabel>
                  <Select
                    value={selectedDeptId}
                    label="Department"
                    onChange={(e) => setSelectedDeptId(e.target.value)}
                  >
                    <MenuItem value="">All Departments</MenuItem>
                    {departments.map((d) => (
                      <MenuItem key={d.id} value={d.id}>
                        {d.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Month</InputLabel>
                  <Select value={month} label="Month" onChange={(e) => setMonth(Number(e.target.value))}>
                    {[
                      'January',
                      'February',
                      'March',
                      'April',
                      'May',
                      'June',
                      'July',
                      'August',
                      'September',
                      'October',
                      'November',
                      'December',
                    ].map((mName, idx) => (
                      <MenuItem key={idx + 1} value={idx + 1}>
                        {mName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Year"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                />
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* Content Area */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : tabValue === 0 ? (
        /* TAB 0: Absentees Today Table */
        absentees.length === 0 ? (
          <Paper sx={{ p: 5, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              No absent students found for the selected criteria.
            </Typography>
          </Paper>
        ) : (
          <TableContainer component={Paper} sx={{ boxShadow: 2 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f4f6f8' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Roll No</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Admission No</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Student Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Class & Section</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Guardian Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Guardian Mobile (Alert SMS)</TableCell>
                  <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Remarks</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {absentees.map((row) => (
                  <TableRow key={row.studentId} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{row.rollNo ?? '-'}</TableCell>
                    <TableCell>{row.admissionNo}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{row.studentName}</TableCell>
                    <TableCell>{row.className} - {row.sectionName}</TableCell>
                    <TableCell>{row.guardianName || '-'}</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>
                      {row.guardianMobile || '-'}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Chip
                        size="small"
                        label={row.status === 2 ? 'Absent' : 'Leave'}
                        color={row.status === 2 ? 'error' : 'info'}
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell>{row.remarks || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )
      ) : tabValue === 1 ? (
        /* TAB 1: Student Monthly Register */
        !studentRegister || studentRegister.rows.length === 0 ? (
          <Paper sx={{ p: 5, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              No monthly attendance data found for this class section.
            </Typography>
          </Paper>
        ) : (
          <TableContainer component={Paper} sx={{ boxShadow: 2, overflowX: 'auto' }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f4f6f8' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, minWidth: 60 }}>Roll</TableCell>
                  <TableCell sx={{ fontWeight: 700, minWidth: 150 }}>Student Name</TableCell>
                  <TableCell sx={{ fontWeight: 700, textAlign: 'center', minWidth: 50 }}>Work</TableCell>
                  <TableCell sx={{ fontWeight: 700, textAlign: 'center', minWidth: 70 }}>% (BR-6.2)</TableCell>
                  {Array.from({ length: studentRegister.daysInMonth }, (_, i) => i + 1).map((d) => {
                    const isSun = studentRegister.sundayDays.includes(d);
                    const isHol = studentRegister.holidayDays.includes(d);
                    return (
                      <TableCell
                        key={d}
                        sx={{
                          fontWeight: 700,
                          textAlign: 'center',
                          p: 0.5,
                          minWidth: 28,
                          bgcolor: isSun ? '#ffebee' : isHol ? '#fff3e0' : 'inherit',
                        }}
                      >
                        {d}
                      </TableCell>
                    );
                  })}
                  <TableCell sx={{ fontWeight: 700, textAlign: 'center', minWidth: 50 }}>P</TableCell>
                  <TableCell sx={{ fontWeight: 700, textAlign: 'center', minWidth: 50 }}>A</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {studentRegister.rows.map((row) => (
                  <TableRow key={row.studentId} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{row.rollNo ?? '-'}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{row.fullName}</TableCell>
                    <TableCell sx={{ textAlign: 'center', fontWeight: 600 }}>
                      {row.totalWorkingDays}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Chip
                        size="small"
                        label={`${row.attendancePercentage}%`}
                        color={
                          row.attendancePercentage >= 75
                            ? 'success'
                            : row.attendancePercentage >= 50
                            ? 'warning'
                            : 'error'
                        }
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>
                    {Array.from({ length: studentRegister.daysInMonth }, (_, i) => i + 1).map((d) => {
                      const st = row.dailyStatus[d] || '-';
                      const isSun = st === 'SUN';
                      const isHol = st === 'HOL';
                      const isP = st === 'P' || st === 'LT';
                      const isA = st === 'A';
                      const isL = st === 'L';
                      const isHD = st === 'HD';

                      return (
                        <TableCell
                          key={d}
                          sx={{
                            textAlign: 'center',
                            p: 0.5,
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            color: isSun || isHol
                              ? '#9e9e9e'
                              : isP
                              ? 'success.main'
                              : isA
                              ? 'error.main'
                              : isL
                              ? 'info.main'
                              : isHD
                              ? 'warning.main'
                              : '#bdbdbd',
                            bgcolor: isSun ? '#fff5f5' : isHol ? '#fffaf0' : 'inherit',
                          }}
                        >
                          {st}
                        </TableCell>
                      );
                    })}
                    <TableCell sx={{ textAlign: 'center', fontWeight: 700, color: 'success.main' }}>
                      {row.totalPresent}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center', fontWeight: 700, color: 'error.main' }}>
                      {row.totalAbsent}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )
      ) : (
        /* TAB 2: Staff Monthly Register */
        !staffRegister || staffRegister.rows.length === 0 ? (
          <Paper sx={{ p: 5, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              No staff attendance data found for this period.
            </Typography>
          </Paper>
        ) : (
          <TableContainer component={Paper} sx={{ boxShadow: 2, overflowX: 'auto' }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f4f6f8' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, minWidth: 100 }}>Emp Code</TableCell>
                  <TableCell sx={{ fontWeight: 700, minWidth: 160 }}>Employee Name</TableCell>
                  <TableCell sx={{ fontWeight: 700, minWidth: 120 }}>Department</TableCell>
                  {Array.from({ length: staffRegister.daysInMonth }, (_, i) => i + 1).map((d) => (
                    <TableCell
                      key={d}
                      sx={{
                        fontWeight: 700,
                        textAlign: 'center',
                        p: 0.5,
                        minWidth: 28,
                        bgcolor: staffRegister.sundayDays.includes(d) ? '#ffebee' : 'inherit',
                      }}
                    >
                      {d}
                    </TableCell>
                  ))}
                  <TableCell sx={{ fontWeight: 700, textAlign: 'center', minWidth: 50 }}>P</TableCell>
                  <TableCell sx={{ fontWeight: 700, textAlign: 'center', minWidth: 50 }}>A</TableCell>
                  <TableCell sx={{ fontWeight: 700, textAlign: 'center', minWidth: 50 }}>Work</TableCell>
                  <TableCell sx={{ fontWeight: 700, textAlign: 'center', minWidth: 70 }}>%</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {staffRegister.rows.map((row) => (
                  <TableRow key={row.employeeId} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{row.employeeCode}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{row.fullName}</TableCell>
                    <TableCell>{row.departmentName || '-'}</TableCell>
                    {Array.from({ length: staffRegister.daysInMonth }, (_, i) => i + 1).map((d) => {
                      const st = row.dailyStatus[d] || '-';
                      const isSun = st === 'SUN';
                      const isP = st === 'P';
                      const isA = st === 'A';
                      const isL = st === 'L';
                      return (
                        <TableCell
                          key={d}
                          sx={{
                            textAlign: 'center',
                            p: 0.5,
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            color: isSun
                              ? '#9e9e9e'
                              : isP
                              ? 'success.main'
                              : isA
                              ? 'error.main'
                              : isL
                              ? 'info.main'
                              : '#bdbdbd',
                            bgcolor: isSun ? '#fff5f5' : 'inherit',
                          }}
                        >
                          {st}
                        </TableCell>
                      );
                    })}
                    <TableCell sx={{ textAlign: 'center', fontWeight: 700, color: 'success.main' }}>
                      {row.totalPresent}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center', fontWeight: 700, color: 'error.main' }}>
                      {row.totalAbsent}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center', fontWeight: 600 }}>
                      {row.totalWorkingDays}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Chip
                        size="small"
                        label={`${row.attendancePercentage}%`}
                        color={row.attendancePercentage >= 75 ? 'success' : 'warning'}
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )
      )}
    </Box>
  );
};

export default AttendanceReportsPage;
