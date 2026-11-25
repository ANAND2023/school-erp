import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  TextField,
  MenuItem,
  Paper,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Tag } from 'primereact/tag';
import api from '../../../api/client';
import { getStudentAttendance, saveStudentAttendanceBulk } from '../api';
import AppDatePicker from '../../../components/common/AppDatePicker';
import { AppButton } from '../../../components/common/AppButton';
import { useUiStore } from '../../../store/uiStore';
import { useThemeStore } from '../../../store/themeStore';
import { WhatsAppDialog } from '../../communication/components/WhatsAppDialog';

const STATUS_CONFIG = {
  1: { code: 'P', label: 'Present', color: '#10b981', lightBg: '#ecfdf5', borderColor: '#a7f3d0' },
  2: { code: 'A', label: 'Absent', color: '#ef4444', lightBg: '#fef2f2', borderColor: '#fecaca' },
  3: { code: 'L', label: 'Leave', color: '#3b82f6', lightBg: '#eff6ff', borderColor: '#bfdbfe' },
  4: { code: 'HD', label: 'Half Day', color: '#f59e0b', lightBg: '#fffbeb', borderColor: '#fde68a' },
  5: { code: 'LT', label: 'Late', color: '#8b5cf6', lightBg: '#f5f3ff', borderColor: '#ddd6fe' },
};

const formatName = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const StudentAttendancePage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { currentColorHex } = useThemeStore();
  const themeColor = currentColorHex || '#14b8a6';
  const { showSnackbar } = useUiStore();

  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [sections, setSections] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [date, setDate] = useState(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attendanceSheet, setAttendanceSheet] = useState(null);
  const [studentRows, setStudentRows] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 1 | 2 | 3 | 4 | 5

  // WhatsApp Dialog State
  const [whatsAppModal, setWhatsAppModal] = useState({
    open: false,
    recipientName: '',
    recipientPhone: '',
    recipientRole: '',
    moduleKey: 'attendance',
    moduleTitle: '',
    templateData: {},
  });

  // 1. Fetch Classes on mount
  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const res = await api.get('/classes');
      const list = res.data?.data || res.data || [];
      setClasses(list);
      if (list.length > 0) {
        setSelectedClassId(list[0].id);
        const secs = list[0].sections || [];
        setSections(secs);
        if (secs.length > 0) {
          setSelectedSectionId(secs[0].id);
        }
      }
    } catch (err) {
      console.error(err);
      showSnackbar('Failed to load classes.', 'error');
    }
  };

  const handleClassChange = (classId) => {
    setSelectedClassId(classId);
    const found = classes.find((c) => c.id === Number(classId));
    const secs = found?.sections || [];
    setSections(secs);
    if (secs.length > 0) {
      setSelectedSectionId(secs[0].id);
    } else {
      setSelectedSectionId('');
      setAttendanceSheet(null);
      setStudentRows([]);
    }
  };

  // 2. Fetch Attendance when section or date changes
  useEffect(() => {
    if (selectedSectionId && date) {
      loadAttendance();
    }
  }, [selectedSectionId, date]);

  const loadAttendance = async () => {
    setLoading(true);
    try {
      const res = await getStudentAttendance(selectedSectionId, date);
      const data = res.data?.data || res.data;
      setAttendanceSheet(data);
      setStudentRows(
        (data.students || []).map((s) => ({
          studentId: s.studentId,
          enrollmentId: s.enrollmentId,
          admissionNo: s.admissionNo,
          rollNo: s.rollNo,
          fullName: s.fullName,
          gender: s.gender,
          status: s.status || 1, // Default to Present
          remarks: s.remarks || '',
          mobile: s.mobile || '',
          guardianName: s.guardianName || '',
        }))
      );
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Failed to load attendance sheet.';
      showSnackbar(msg, 'error');
      setAttendanceSheet(null);
      setStudentRows([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle row status change
  const handleStatusChange = (studentId, status) => {
    setStudentRows((prev) =>
      prev.map((row) => (row.studentId === studentId ? { ...row, status } : row))
    );
  };

  // Handle remarks change
  const handleRemarksChange = (studentId, remarks) => {
    setStudentRows((prev) =>
      prev.map((row) => (row.studentId === studentId ? { ...row, remarks } : row))
    );
  };

  // Bulk mark all
  const markAll = (status) => {
    setStudentRows((prev) => prev.map((row) => ({ ...row, status })));
  };

  // Date change handler
  const handleDateChange = (val) => {
    if (!val) return;
    if (val instanceof Date) {
      const y = val.getFullYear();
      const m = String(val.getMonth() + 1).padStart(2, '0');
      const d = String(val.getDate()).padStart(2, '0');
      setDate(`${y}-${m}-${d}`);
    } else if (typeof val === 'string') {
      setDate(val);
    }
  };

  // Save Attendance
  const handleSave = async () => {
    if (!selectedSectionId) return;
    setSaving(true);
    try {
      const payload = {
        sectionId: selectedSectionId,
        date: date,
        attendances: studentRows.map((r) => ({
          studentId: r.studentId,
          enrollmentId: r.enrollmentId,
          status: r.status,
          remarks: r.remarks,
        })),
      };
      await saveStudentAttendanceBulk(payload);
      showSnackbar('Attendance recorded successfully!', 'success');
      loadAttendance();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Failed to save attendance.';
      showSnackbar(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenAbsentAlert = (student) => {
    const currentClass = classes.find((c) => c.id === Number(selectedClassId));
    const currentSection = sections.find((s) => s.id === Number(selectedSectionId));
    const classLabel = `${currentClass?.name || ''} ${currentSection?.name ? '- ' + currentSection.name : ''}`.trim();

    setWhatsAppModal({
      open: true,
      recipientName: student.guardianName || student.fullName,
      recipientPhone: student.mobile,
      recipientRole: `Parent of ${student.fullName}`,
      moduleKey: 'attendance',
      moduleTitle: 'Student Absence Alert (WhatsApp)',
      templateData: {
        StudentName: student.fullName,
        ClassName: classLabel || 'Class',
        Date: date,
      },
    });
  };

  // Compute live counts
  const counts = useMemo(() => {
    return studentRows.reduce(
      (acc, row) => {
        acc[row.status] = (acc[row.status] || 0) + 1;
        return acc;
      },
      { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    );
  }, [studentRows]);

  // Filtered rows by search and status tab
  const filteredStudents = useMemo(() => {
    return studentRows.filter((student) => {
      // 1. Status Filter
      if (statusFilter !== 'all' && student.status !== Number(statusFilter)) {
        return false;
      }
      // 2. Search Query
      if (!searchQuery.trim()) return true;
      const term = searchQuery.toLowerCase().trim();
      const nameMatch = student.fullName?.toLowerCase().includes(term);
      const rollMatch = String(student.rollNo ?? '').toLowerCase().includes(term);
      const admMatch = student.admissionNo?.toLowerCase().includes(term);
      return nameMatch || rollMatch || admMatch;
    });
  }, [studentRows, statusFilter, searchQuery]);

  const isBlocked = attendanceSheet?.isSunday || attendanceSheet?.isHoliday;
  const isReadOnly = isBlocked || (attendanceSheet && !attendanceSheet.isEditable);

  return (
    <Box sx={{ pb: { xs: 10, md: 3 } }}>
      {/* 1. TOP HEADER CARD */}
      <div className="flex flex-column sm:flex-row align-items-start sm:align-items-center justify-content-between gap-2 bg-white px-3 py-2 border-round-lg shadow-1 border-1 surface-border mb-2">
        <div>
          <div className="flex align-items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-slate-800 m-0">Daily Student Attendance</h2>
            {attendanceSheet?.alreadyMarked && (
              <Tag
                value="Already Marked"
                severity="success"
                style={{ fontSize: '10px', fontWeight: 600 }}
              />
            )}
          </div>
          <p className="text-xs text-slate-500 m-0 mt-1">
            Mark daily class attendance with real-time status counts and instant absence reporting
          </p>
        </div>

        {attendanceSheet && !isReadOnly && (
          <div className="flex align-items-center gap-2 w-full sm:w-auto justify-content-end">
            <AppButton
              label={saving ? 'Saving...' : 'Save Attendance'}
              icon="pi pi-check"
              size="small"
              loading={saving}
              disabled={saving || studentRows.length === 0}
              onClick={handleSave}
              className="w-full sm:w-auto"
            />
          </div>
        )}
      </div>

      {/* 2. FILTER & SELECTION BAR */}
      <div className="bg-white border-round-lg shadow-1 border-1 surface-border p-3 mb-3">
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              fullWidth
              size="small"
              label="Class"
              value={selectedClassId}
              onChange={(e) => handleClassChange(e.target.value)}
              sx={{
                '& .MuiInputBase-root': { height: 32, fontSize: '12px' },
                '& .MuiInputLabel-root': { fontSize: '12px' },
              }}
            >
              {classes.map((c) => (
                <MenuItem key={c.id} value={c.id} sx={{ fontSize: '12px' }}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              fullWidth
              size="small"
              label="Section"
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              sx={{
                '& .MuiInputBase-root': { height: 32, fontSize: '12px' },
                '& .MuiInputLabel-root': { fontSize: '12px' },
              }}
            >
              {sections.map((s) => (
                <MenuItem key={s.id} value={s.id} sx={{ fontSize: '12px' }}>
                  Section {s.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <AppDatePicker
              label="Attendance Date"
              value={date}
              onChange={(e) => handleDateChange(e.value)}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <div className="flex align-items-center gap-2">
              <button
                type="button"
                onClick={() => markAll(1)}
                disabled={isReadOnly || studentRows.length === 0}
                style={{
                  height: '30px',
                  borderRadius: '6px',
                  border: '1px solid #10b981',
                  backgroundColor: '#ecfdf5',
                  color: '#059669',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: isReadOnly || studentRows.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: isReadOnly || studentRows.length === 0 ? 0.6 : 1,
                }}
                className="flex-1 flex align-items-center justify-content-center gap-1 hover:shadow-1 transition-all"
              >
                <i className="pi pi-check text-xs" />
                <span>All Present</span>
              </button>

              <button
                type="button"
                onClick={() => markAll(2)}
                disabled={isReadOnly || studentRows.length === 0}
                style={{
                  height: '30px',
                  borderRadius: '6px',
                  border: '1px solid #ef4444',
                  backgroundColor: '#fef2f2',
                  color: '#dc2626',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: isReadOnly || studentRows.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: isReadOnly || studentRows.length === 0 ? 0.6 : 1,
                }}
                className="flex-1 flex align-items-center justify-content-center gap-1 hover:shadow-1 transition-all"
              >
                <i className="pi pi-times text-xs" />
                <span>All Absent</span>
              </button>
            </div>
          </Grid>
        </Grid>
      </div>

      {/* 3. ALERTS (Sunday / Holiday / Past Date) */}
      {attendanceSheet?.isSunday && (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
          <strong>Sunday:</strong> Attendance marking is blocked on Sundays.
        </Alert>
      )}

      {attendanceSheet?.isHoliday && (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
          <strong>Holiday:</strong> Attendance marking is blocked for{' '}
          <strong>{attendanceSheet.holidayName || 'Scheduled Holiday'}</strong>.
        </Alert>
      )}

      {attendanceSheet && !attendanceSheet.isEditable && !isBlocked && (
        <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
          <strong>Past Date:</strong> Teachers can only mark attendance for the current day. Editing past attendance requires Admin authorization.
        </Alert>
      )}

      {/* 4. KPI COUNTERS & FILTER TABS */}
      {studentRows.length > 0 && (
        <div className="grid mb-3">
          <div className="col-4 sm:col-4 md:col-2">
            <div
              onClick={() => setStatusFilter('all')}
              className={`p-2 bg-white border-round-lg shadow-1 border-1 cursor-pointer transition-all ${
                statusFilter === 'all' ? 'border-primary surface-100 shadow-2' : 'surface-border'
              }`}
              style={{ borderLeft: '4px solid #64748b' }}
            >
              <span className="text-xs text-slate-500 block">Total</span>
              <span className="text-base sm:text-xl font-bold text-slate-800">
                {studentRows.length}
              </span>
            </div>
          </div>

          <div className="col-4 sm:col-4 md:col-2">
            <div
              onClick={() => setStatusFilter(statusFilter === 1 ? 'all' : 1)}
              className={`p-2 bg-white border-round-lg shadow-1 border-1 cursor-pointer transition-all ${
                statusFilter === 1 ? 'border-emerald-500 bg-emerald-50 shadow-2' : 'surface-border'
              }`}
              style={{ borderLeft: '4px solid #10b981' }}
            >
              <span className="text-xs text-slate-500 block">Present</span>
              <span className="text-base sm:text-xl font-bold text-emerald-600">
                {counts[1]}
              </span>
            </div>
          </div>

          <div className="col-4 sm:col-4 md:col-2">
            <div
              onClick={() => setStatusFilter(statusFilter === 2 ? 'all' : 2)}
              className={`p-2 bg-white border-round-lg shadow-1 border-1 cursor-pointer transition-all ${
                statusFilter === 2 ? 'border-red-500 bg-red-50 shadow-2' : 'surface-border'
              }`}
              style={{ borderLeft: '4px solid #ef4444' }}
            >
              <span className="text-xs text-slate-500 block">Absent</span>
              <span className="text-base sm:text-xl font-bold text-red-600">
                {counts[2]}
              </span>
            </div>
          </div>

          <div className="col-4 sm:col-4 md:col-2">
            <div
              onClick={() => setStatusFilter(statusFilter === 3 ? 'all' : 3)}
              className={`p-2 bg-white border-round-lg shadow-1 border-1 cursor-pointer transition-all ${
                statusFilter === 3 ? 'border-blue-500 bg-blue-50 shadow-2' : 'surface-border'
              }`}
              style={{ borderLeft: '4px solid #3b82f6' }}
            >
              <span className="text-xs text-slate-500 block">Leave</span>
              <span className="text-base sm:text-xl font-bold text-blue-600">
                {counts[3]}
              </span>
            </div>
          </div>

          <div className="col-4 sm:col-4 md:col-2">
            <div
              onClick={() => setStatusFilter(statusFilter === 4 ? 'all' : 4)}
              className={`p-2 bg-white border-round-lg shadow-1 border-1 cursor-pointer transition-all ${
                statusFilter === 4 ? 'border-amber-500 bg-amber-50 shadow-2' : 'surface-border'
              }`}
              style={{ borderLeft: '4px solid #f59e0b' }}
            >
              <span className="text-xs text-slate-500 block">Half Day</span>
              <span className="text-base sm:text-xl font-bold text-amber-600">
                {counts[4]}
              </span>
            </div>
          </div>

          <div className="col-4 sm:col-4 md:col-2">
            <div
              onClick={() => setStatusFilter(statusFilter === 5 ? 'all' : 5)}
              className={`p-2 bg-white border-round-lg shadow-1 border-1 cursor-pointer transition-all ${
                statusFilter === 5 ? 'border-purple-500 bg-purple-50 shadow-2' : 'surface-border'
              }`}
              style={{ borderLeft: '4px solid #8b5cf6' }}
            >
              <span className="text-xs text-slate-500 block">Late</span>
              <span className="text-base sm:text-xl font-bold text-purple-600">
                {counts[5]}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 5. SEARCH & ACTIVE FILTER BAR */}
      {studentRows.length > 0 && (
        <div className="flex flex-column sm:flex-row align-items-center justify-content-between gap-2 bg-white p-2 border-round-lg shadow-1 border-1 surface-border mb-3">
          <div className="w-full sm:w-20rem position-relative">
            <div className="p-input-icon-left w-full">
              <i className="pi pi-search text-xs" style={{ left: '10px' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by student name or roll no..."
                className="p-inputtext p-inputtext-sm w-full text-xs pl-5"
                style={{ height: '30px' }}
              />
            </div>
          </div>

          <div className="flex align-items-center gap-2 w-full sm:w-auto justify-content-between sm:justify-content-end">
            <span className="text-xs text-slate-500">
              Showing <b>{filteredStudents.length}</b> of {studentRows.length} students
            </span>

            {statusFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className="text-xs text-primary font-bold bg-transparent border-none cursor-pointer underline p-0"
              >
                Clear Filter
              </button>
            )}
          </div>
        </div>
      )}

      {/* 6. CONTENT: LOADING / EMPTY / DATA */}
      {loading ? (
        <div className="flex align-items-center justify-content-center p-6 bg-white border-round-lg border-1 surface-border">
          <CircularProgress size={32} />
        </div>
      ) : studentRows.length === 0 ? (
        <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 2 }}>
          <i className="pi pi-users text-4xl text-slate-400 mb-2 block" />
          <Typography variant="h6" color="text.secondary" sx={{ fontSize: '15px' }}>
            No active students enrolled in this section.
          </Typography>
        </Paper>
      ) : (
        <>
          {/* ========================================================
              DESKTOP VIEW: Sleek Compact Enterprise Table (>= 768px)
             ======================================================== */}
          <div className="hidden md:block bg-white border-round-lg shadow-1 border-1 surface-border overflow-hidden">
            <div style={{ overflowX: 'auto' }}>
              <table className="w-full border-collapse" style={{ minWidth: '760px' }}>
                <thead>
                  <tr className="surface-100 text-slate-700 text-xs font-bold border-bottom-1 surface-border text-left">
                    <th style={{ width: '60px', padding: '10px 12px' }}>Roll</th>
                    <th style={{ width: '130px', padding: '10px 12px' }}>Admission No</th>
                    <th style={{ padding: '10px 12px' }}>Student Name</th>
                    <th style={{ width: '80px', padding: '10px 12px' }}>Gender</th>
                    <th style={{ width: '370px', padding: '10px 12px', textAlign: 'center' }}>
                      Attendance Status
                    </th>
                    <th style={{ width: '220px', padding: '10px 12px' }}>Remarks / Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((row, index) => {
                    const isAbsent = row.status === 2;
                    const isLeave = row.status === 3;
                    return (
                      <tr
                        key={row.studentId}
                        className="border-bottom-1 surface-border transition-colors"
                        style={{
                          backgroundColor: isAbsent
                            ? '#fff5f5'
                            : isLeave
                            ? '#f0f9ff'
                            : index % 2 === 0
                            ? '#ffffff'
                            : '#fafafa',
                        }}
                      >
                        {/* Roll No */}
                        <td style={{ padding: '8px 12px' }}>
                          <span className="font-bold text-xs text-slate-700">
                            #{row.rollNo ?? index + 1}
                          </span>
                        </td>

                        {/* Admission No */}
                        <td style={{ padding: '8px 12px' }}>
                          <span className="text-xs font-mono text-slate-600">
                            {row.admissionNo}
                          </span>
                        </td>

                        {/* Student Name */}
                        <td style={{ padding: '8px 12px' }}>
                          <div className="font-bold text-xs text-slate-800">
                            {formatName(row.fullName)}
                          </div>
                        </td>

                        {/* Gender */}
                        <td style={{ padding: '8px 12px' }}>
                          <span className="text-xs text-slate-500">
                            {row.gender}
                          </span>
                        </td>

                        {/* Attendance Status - Compact Segmented Button Group (Single Line) */}
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          <div className="inline-flex align-items-center justify-content-center gap-1">
                            {[1, 2, 3, 4, 5].map((stId) => {
                              const isSelected = row.status === stId;
                              const cfg = STATUS_CONFIG[stId];
                              return (
                                <button
                                  key={stId}
                                  type="button"
                                  disabled={isReadOnly}
                                  onClick={() => handleStatusChange(row.studentId, stId)}
                                  style={{
                                    height: '28px',
                                    padding: '0 9px',
                                    borderRadius: '6px',
                                    border: isSelected
                                      ? `1.5px solid ${cfg.color}`
                                      : '1px solid #cbd5e1',
                                    backgroundColor: isSelected ? cfg.color : '#ffffff',
                                    color: isSelected ? '#ffffff' : '#475569',
                                    fontSize: '11px',
                                    fontWeight: isSelected ? 700 : 500,
                                    cursor: isReadOnly ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.15s ease',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    whiteSpace: 'nowrap',
                                  }}
                                  className="hover:shadow-1"
                                >
                                  <span style={{ fontSize: '10px', fontWeight: 800 }}>
                                    {cfg.code}
                                  </span>
                                  <span>{cfg.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </td>

                        {/* Remarks Input & WhatsApp Absent Alert */}
                        <td style={{ padding: '8px 12px' }}>
                          <div className="flex align-items-center gap-1">
                            <input
                              type="text"
                              placeholder="Optional remarks"
                              value={row.remarks || ''}
                              onChange={(e) => handleRemarksChange(row.studentId, e.target.value)}
                              disabled={isReadOnly}
                              className="p-inputtext p-inputtext-sm w-full text-xs"
                              style={{ height: '28px', padding: '2px 8px' }}
                            />
                            {isAbsent && (
                              <button
                                type="button"
                                onClick={() => handleOpenAbsentAlert(row)}
                                title="Send WhatsApp Absent Alert to Parent"
                                style={{
                                  height: '28px',
                                  padding: '0 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #10b981',
                                  backgroundColor: '#ecfdf5',
                                  color: '#059669',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  whiteSpace: 'nowrap',
                                }}
                                className="hover:shadow-1"
                              >
                                <i className="pi pi-whatsapp" style={{ fontSize: '12px' }} />
                                <span>Alert</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center p-4 text-slate-400 text-xs">
                        No students match the selected filter or search query.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ========================================================
              MOBILE VIEW: Touch-Friendly Student Card List (< 768px)
             ======================================================== */}
          <div className="block md:hidden">
            <div className="flex flex-column gap-2">
              {filteredStudents.map((row, index) => {
                const isAbsent = row.status === 2;
                const isLeave = row.status === 3;
                const currentCfg = STATUS_CONFIG[row.status] || STATUS_CONFIG[1];

                return (
                  <div
                    key={row.studentId}
                    className="bg-white border-round-lg shadow-1 border-1 surface-border p-3"
                    style={{
                      borderLeft: `4px solid ${currentCfg.color}`,
                      backgroundColor: isAbsent ? '#fff8f8' : isLeave ? '#f0f9ff' : '#ffffff',
                    }}
                  >
                    {/* Top Row: Roll + Name + Badge */}
                    <div className="flex align-items-center justify-content-between mb-2">
                      <div className="flex align-items-center gap-2">
                        <span
                          className="inline-flex align-items-center justify-content-center border-round-circle font-bold text-xs bg-slate-100 text-slate-700"
                          style={{ width: '28px', height: '28px' }}
                        >
                          #{row.rollNo ?? index + 1}
                        </span>
                        <div>
                          <div className="font-bold text-xs text-slate-800 line-clamp-1">
                            {formatName(row.fullName)}
                          </div>
                          <div className="text-xs text-slate-400" style={{ fontSize: '10px' }}>
                            {row.admissionNo} • {row.gender}
                          </div>
                        </div>
                      </div>

                      <span
                        style={{
                          backgroundColor: currentCfg.lightBg,
                          color: currentCfg.color,
                          border: `1px solid ${currentCfg.borderColor}`,
                          borderRadius: '12px',
                          padding: '2px 8px',
                          fontSize: '10px',
                          fontWeight: 700,
                        }}
                      >
                        {currentCfg.label}
                      </span>
                    </div>

                    {/* Middle Row: 5 Large Touch Buttons */}
                    <div className="grid grid-nogutter gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map((stId) => {
                        const isSelected = row.status === stId;
                        const cfg = STATUS_CONFIG[stId];
                        return (
                          <button
                            key={stId}
                            type="button"
                            disabled={isReadOnly}
                            onClick={() => handleStatusChange(row.studentId, stId)}
                            style={{
                              flex: 1,
                              height: '42px',
                              borderRadius: '6px',
                              backgroundColor: isSelected ? cfg.color : '#f8fafc',
                              color: isSelected ? '#ffffff' : '#64748b',
                              border: isSelected ? `2px solid ${cfg.color}` : '1px solid #e2e8f0',
                              cursor: isReadOnly ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '2px 0',
                            }}
                            className="transition-all"
                          >
                            <span style={{ fontSize: '13px', fontWeight: 800, lineHeight: 1 }}>
                              {cfg.code}
                            </span>
                            <span
                              style={{
                                fontSize: '8.5px',
                                fontWeight: isSelected ? 700 : 500,
                                opacity: 0.9,
                                lineHeight: 1.2,
                                marginTop: '2px',
                              }}
                            >
                              {cfg.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Bottom Row: Optional Remarks */}
                    <input
                      type="text"
                      placeholder="Remarks / reason (optional)"
                      value={row.remarks || ''}
                      onChange={(e) => handleRemarksChange(row.studentId, e.target.value)}
                      disabled={isReadOnly}
                      className="p-inputtext p-inputtext-sm w-full text-xs"
                      style={{ height: '30px', fontSize: '11px' }}
                    />
                  </div>
                );
              })}

              {filteredStudents.length === 0 && (
                <div className="bg-white border-round-lg p-4 text-center text-slate-400 text-xs border-1 surface-border">
                  No students match the search query or status filter.
                </div>
              )}
            </div>
          </div>

          {/* ========================================================
              MOBILE STICKY BOTTOM ACTION BAR (< 768px)
             ======================================================== */}
          {attendanceSheet && !isReadOnly && studentRows.length > 0 && (
            <div
              className="block md:hidden fixed bottom-0 left-0 right-0 p-2.5 bg-white border-top-1 surface-border shadow-4 z-5"
              style={{
                boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.12)',
              }}
            >
              <div className="flex align-items-center justify-content-between gap-2 max-w-28rem mx-auto">
                <div className="flex align-items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-700">
                    <span className="text-emerald-600 font-bold">{counts[1]}</span>/
                    {studentRows.length} Present
                  </span>
                  {counts[2] > 0 && (
                    <span className="text-xs font-bold text-red-600">
                      • {counts[2]} Absent
                    </span>
                  )}
                </div>

                <AppButton
                  label={saving ? 'Saving...' : 'Save Attendance'}
                  icon="pi pi-check"
                  size="small"
                  loading={saving}
                  disabled={saving}
                  onClick={handleSave}
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* WhatsApp Absence Alert Dialog */}
      <WhatsAppDialog
        open={whatsAppModal.open}
        onClose={() => setWhatsAppModal((prev) => ({ ...prev, open: false }))}
        recipientName={whatsAppModal.recipientName}
        recipientPhone={whatsAppModal.recipientPhone}
        recipientRole={whatsAppModal.recipientRole}
        moduleKey="attendance"
        moduleTitle="Absence Alert (WhatsApp)"
        templateData={whatsAppModal.templateData}
      />
    </Box>
  );
};

export default StudentAttendancePage;
