import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  TextField,
  MenuItem,
  CircularProgress,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Tag } from 'primereact/tag';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { classesApi } from '../../masters/api';
import { staffApi } from '../api';
import { useUiStore } from '../../../store/uiStore';
import { useThemeStore } from '../../../store/themeStore';
import { useAcademicYear } from '../../../hooks/useAcademicYear';
import { AppButton } from '../../../components/common/AppButton';

const formatName = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function TeacherAllocationPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { currentColorHex } = useThemeStore();
  const themeColor = currentColorHex || '#ec4899';
  const { showSnackbar } = useUiStore();
  const { activeAcademicYearName } = useAcademicYear();

  const [activeTab, setActiveTab] = useState(0); // 0: Class Teachers, 1: Subject Teachers

  // Tab 1 filters
  const [classFilter, setClassFilter] = useState('');
  const [classTeacherSearch, setClassTeacherSearch] = useState('');
  const [classTeacherOnlyUnassigned, setClassTeacherOnlyUnassigned] = useState(false);

  // Tab 2 filters
  const [subjectClassFilter, setSubjectClassFilter] = useState('');
  const [subjectSectionFilter, setSubjectSectionFilter] = useState('');
  const [subjectTypeFilter, setSubjectTypeFilter] = useState('all'); // 'all' | 1 | 2
  const [subjectTeacherSearch, setSubjectTeacherSearch] = useState('');
  const [subjectTeacherOnlyUnassigned, setSubjectTeacherOnlyUnassigned] = useState(false);

  // Fetch classes
  const { data: classesRes } = useQuery({
    queryKey: ['classes-list'],
    queryFn: () => classesApi.getClasses(),
  });
  const classes = classesRes?.data?.data || [];

  const selectedSubjectClassObj = classes.find((c) => String(c.id) === String(subjectClassFilter));
  const subjectSections = selectedSubjectClassObj ? selectedSubjectClassObj.sections || [] : [];

  // Fetch staff list for teacher dropdown
  const { data: staffRes } = useQuery({
    queryKey: ['teachers-dropdown-list'],
    queryFn: () => staffApi.getEmployees({ status: 1, pageSize: 250 }),
  });
  const allStaff = staffRes?.data?.data?.items || [];
  const teachers = useMemo(() => {
    if (!allStaff || !allStaff.length) return [];
    return [...allStaff].sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
  }, [allStaff]);

  // Fetch Class Teachers
  const {
    data: classTeachersRes,
    isLoading: isLoadingClassTeachers,
  } = useQuery({
    queryKey: ['class-teachers-allocations', classFilter],
    queryFn: () => staffApi.getClassTeachers(classFilter || undefined),
  });
  const classTeachers = classTeachersRes?.data?.data || [];

  // Fetch Subject Teachers
  const subjectQueryParams = {
    classId: subjectClassFilter || undefined,
    sectionId: subjectSectionFilter || undefined,
  };
  const {
    data: subjectTeachersRes,
    isLoading: isLoadingSubjectTeachers,
  } = useQuery({
    queryKey: ['subject-teachers-allocations', subjectQueryParams],
    queryFn: () => staffApi.getSubjectTeachers(subjectQueryParams),
  });
  const subjectTeachers = subjectTeachersRes?.data?.data || [];

  // Mutations
  const saveClassTeacherMutation = useMutation({
    mutationFn: (data) => staffApi.saveClassTeacher(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['class-teachers-allocations']);
      showSnackbar(res?.data?.message || 'Class teacher allocation saved successfully.', 'success');
    },
    onError: (err) => {
      showSnackbar(err?.response?.data?.message || 'Failed to allocate class teacher.', 'error');
    },
  });

  const saveSubjectTeacherMutation = useMutation({
    mutationFn: (data) => staffApi.saveSubjectTeacher(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['subject-teachers-allocations']);
      showSnackbar(res?.data?.message || 'Subject teacher allocation saved successfully.', 'success');
    },
    onError: (err) => {
      showSnackbar(err?.response?.data?.message || 'Failed to allocate subject teacher.', 'error');
    },
  });

  const handleClassTeacherChange = (row, newEmployeeId) => {
    saveClassTeacherMutation.mutate({
      classId: row.classId,
      sectionId: row.sectionId,
      employeeId: newEmployeeId ? Number(newEmployeeId) : null,
    });
  };

  const handleSubjectTeacherChange = (row, newEmployeeId) => {
    saveSubjectTeacherMutation.mutate({
      classId: row.classId,
      sectionId: row.sectionId,
      subjectId: row.subjectId,
      employeeId: newEmployeeId ? Number(newEmployeeId) : null,
    });
  };

  // KPI Calculations
  const classTeacherKpis = useMemo(() => {
    const total = classTeachers.length;
    const assigned = classTeachers.filter((ct) => Boolean(ct.employeeId)).length;
    const unassigned = total - assigned;
    return { total, assigned, unassigned };
  }, [classTeachers]);

  const subjectTeacherKpis = useMemo(() => {
    const total = subjectTeachers.length;
    const assigned = subjectTeachers.filter((st) => Boolean(st.employeeId)).length;
    const unassigned = total - assigned;
    return { total, assigned, unassigned };
  }, [subjectTeachers]);

  // Filtered Class Teachers
  const filteredClassTeachers = useMemo(() => {
    return classTeachers.filter((row) => {
      if (classTeacherOnlyUnassigned && row.employeeId) return false;
      if (!classTeacherSearch.trim()) return true;
      const term = classTeacherSearch.toLowerCase().trim();
      const matchClass = row.className?.toLowerCase().includes(term);
      const matchSection = row.sectionName?.toLowerCase().includes(term);
      const matchTeacher = (row.teacherName || row.employeeName)?.toLowerCase().includes(term) || (row.teacherCode || row.employeeCode)?.toLowerCase().includes(term);
      return matchClass || matchSection || matchTeacher;
    });
  }, [classTeachers, classTeacherOnlyUnassigned, classTeacherSearch]);

  // Filtered Subject Teachers
  const filteredSubjectTeachers = useMemo(() => {
    return subjectTeachers.filter((row) => {
      if (subjectTeacherOnlyUnassigned && row.employeeId) return false;
      if (subjectTypeFilter !== 'all' && row.subjectType !== Number(subjectTypeFilter)) return false;
      if (!subjectTeacherSearch.trim()) return true;
      const term = subjectTeacherSearch.toLowerCase().trim();
      const matchClass = row.className?.toLowerCase().includes(term);
      const matchSection = row.sectionName?.toLowerCase().includes(term);
      const matchSub = row.subjectName?.toLowerCase().includes(term) || row.subjectCode?.toLowerCase().includes(term);
      const matchTeacher = (row.teacherName || row.employeeName)?.toLowerCase().includes(term) || (row.teacherCode || row.employeeCode)?.toLowerCase().includes(term);
      return matchClass || matchSection || matchSub || matchTeacher;
    });
  }, [subjectTeachers, subjectTeacherOnlyUnassigned, subjectTypeFilter, subjectTeacherSearch]);

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      {/* 1. TOP HEADER CARD */}
      <div className="flex flex-column sm:flex-row align-items-start sm:align-items-center justify-content-between gap-3 bg-white p-3 border-round-lg shadow-1 border-1 surface-border mb-3">
        <div className="flex align-items-center gap-3">
          <AppButton
            icon="pi pi-arrow-left"
            label="Back"
            variant="outlined"
            size="small"
            onClick={() => navigate('/staff')}
            className="p-button-sm"
          />
          <div>
            <div className="flex align-items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-slate-800 m-0">Teacher Class Allocation</h2>
              {activeAcademicYearName && (
                <Tag
                  value={`Session: ${activeAcademicYearName}`}
                  severity="info"
                  style={{ fontSize: '11px', fontWeight: 600 }}
                />
              )}
            </div>
            <p className="text-xs text-slate-500 m-0 mt-1">
              Designate class teachers per section and subject teachers per class curriculum
            </p>
          </div>
        </div>

        <div className="flex align-items-center gap-2">
          <Tag
            value={`${teachers.length} Active Teachers`}
            severity="success"
            style={{ fontSize: '11px', fontWeight: 600 }}
          />
        </div>
      </div>

      {/* 2. TAB NAVIGATION SWITCHER */}
      <div className="bg-white border-round-lg shadow-1 border-1 surface-border p-1 mb-3 flex gap-1">
        <button
          type="button"
          onClick={() => setActiveTab(0)}
          style={{
            flex: 1,
            height: '38px',
            borderRadius: '6px',
            backgroundColor: activeTab === 0 ? themeColor : 'transparent',
            color: activeTab === 0 ? '#ffffff' : '#64748b',
            fontWeight: activeTab === 0 ? 700 : 500,
            border: 'none',
            fontSize: '12px',
          }}
          className="flex align-items-center justify-content-center gap-2 cursor-pointer transition-all"
        >
          <i className="pi pi-id-card text-sm" />
          <span>Class Teachers (Section In-Charge)</span>
          <span
            className="inline-flex align-items-center justify-content-center border-round px-2 py-0.5 text-xs font-bold"
            style={{
              backgroundColor: activeTab === 0 ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
              color: activeTab === 0 ? '#ffffff' : '#475569',
            }}
          >
            {classTeachers.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab(1)}
          style={{
            flex: 1,
            height: '38px',
            borderRadius: '6px',
            backgroundColor: activeTab === 1 ? themeColor : 'transparent',
            color: activeTab === 1 ? '#ffffff' : '#64748b',
            fontWeight: activeTab === 1 ? 700 : 500,
            border: 'none',
            fontSize: '12px',
          }}
          className="flex align-items-center justify-content-center gap-2 cursor-pointer transition-all"
        >
          <i className="pi pi-book text-sm" />
          <span>Subject Teachers (Curriculum Allocation)</span>
          <span
            className="inline-flex align-items-center justify-content-center border-round px-2 py-0.5 text-xs font-bold"
            style={{
              backgroundColor: activeTab === 1 ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
              color: activeTab === 1 ? '#ffffff' : '#475569',
            }}
          >
            {subjectTeachers.length}
          </span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: CLASS TEACHER ALLOCATION (ONE PER SECTION)
         ========================================================================= */}
      {activeTab === 0 && (
        <>
          {/* KPI Summary Cards */}
          <div className="grid mb-3">
            <div className="col-12 sm:col-4">
              <div className="flex align-items-center justify-content-between p-3 bg-white border-round-lg shadow-1 border-1 surface-border">
                <div>
                  <span className="text-xs text-slate-500 block mb-1">Total Sections</span>
                  <span className="text-2xl font-bold text-slate-800">{classTeacherKpis.total}</span>
                </div>
                <div
                  className="flex align-items-center justify-content-center border-round p-2"
                  style={{ width: '40px', height: '40px', backgroundColor: `${themeColor}15`, color: themeColor }}
                >
                  <i className="pi pi-building text-xl" />
                </div>
              </div>
            </div>

            <div className="col-12 sm:col-4">
              <div
                onClick={() => setClassTeacherOnlyUnassigned(false)}
                className="flex align-items-center justify-content-between p-3 bg-white border-round-lg shadow-1 border-1 surface-border cursor-pointer hover:shadow-2 transition-all"
              >
                <div>
                  <span className="text-xs text-slate-500 block mb-1">Assigned Class Teachers</span>
                  <span className="text-2xl font-bold text-emerald-600">{classTeacherKpis.assigned}</span>
                </div>
                <div className="flex align-items-center justify-content-center bg-emerald-50 text-emerald-600 border-round p-2" style={{ width: '40px', height: '40px' }}>
                  <i className="pi pi-check-circle text-xl" />
                </div>
              </div>
            </div>

            <div className="col-12 sm:col-4">
              <div
                onClick={() => setClassTeacherOnlyUnassigned((prev) => !prev)}
                className={`flex align-items-center justify-content-between p-3 bg-white border-round-lg shadow-1 border-1 cursor-pointer transition-all ${
                  classTeacherOnlyUnassigned ? 'border-amber-500 bg-amber-50 shadow-2' : 'surface-border'
                }`}
              >
                <div>
                  <span className="text-xs text-slate-500 block mb-1">Unassigned Sections</span>
                  <span className="text-2xl font-bold text-amber-600">{classTeacherKpis.unassigned}</span>
                </div>
                <div className="flex align-items-center justify-content-center bg-amber-50 text-amber-600 border-round p-2" style={{ width: '40px', height: '40px' }}>
                  <i className="pi pi-exclamation-triangle text-xl" />
                </div>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white border-round-lg shadow-1 border-1 surface-border p-3 mb-3">
            <div className="flex flex-column sm:flex-row align-items-stretch sm:align-items-center justify-content-between gap-2">
              <div className="flex flex-column sm:flex-row align-items-stretch sm:align-items-center gap-2 flex-1">
                <TextField
                  select
                  size="small"
                  label="Filter Class"
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  sx={{
                    minWidth: { xs: '100%', sm: 180 },
                    '& .MuiInputBase-root': { height: 32, fontSize: '12px' },
                    '& .MuiInputLabel-root': { fontSize: '12px' },
                  }}
                >
                  <MenuItem value="" sx={{ fontSize: '12px' }}>All Classes</MenuItem>
                  {classes.map((c) => (
                    <MenuItem key={c.id} value={c.id} sx={{ fontSize: '12px' }}>{c.name}</MenuItem>
                  ))}
                </TextField>

                <div className="p-input-icon-left flex-1" style={{ minWidth: '180px' }}>
                  <i className="pi pi-search text-xs" style={{ left: '10px' }} />
                  <input
                    type="text"
                    value={classTeacherSearch}
                    onChange={(e) => setClassTeacherSearch(e.target.value)}
                    placeholder="Search by class, section, or teacher..."
                    className="p-inputtext p-inputtext-sm w-full text-xs pl-5"
                    style={{ height: '32px' }}
                  />
                </div>
              </div>

              <div className="flex align-items-center justify-content-between sm:justify-content-end gap-2">
                <button
                  type="button"
                  onClick={() => setClassTeacherOnlyUnassigned((prev) => !prev)}
                  style={{
                    height: '32px',
                    borderRadius: '6px',
                    border: classTeacherOnlyUnassigned ? '1.5px solid #f59e0b' : '1px solid #cbd5e1',
                    backgroundColor: classTeacherOnlyUnassigned ? '#fffbeb' : '#ffffff',
                    color: classTeacherOnlyUnassigned ? '#d97706' : '#64748b',
                    fontSize: '11px',
                    fontWeight: 600,
                  }}
                  className="px-2.5 flex align-items-center gap-1 cursor-pointer transition-all"
                >
                  <i className="pi pi-filter text-xs" />
                  <span>{classTeacherOnlyUnassigned ? 'Showing Unassigned' : 'Show Unassigned'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Tab 1 Content: Loading / Empty / Data */}
          {isLoadingClassTeachers ? (
            <div className="flex align-items-center justify-content-center p-6 bg-white border-round-lg border-1 surface-border">
              <CircularProgress size={32} />
            </div>
          ) : filteredClassTeachers.length === 0 ? (
            <div className="bg-white border-round-lg p-5 text-center text-slate-400 text-xs border-1 surface-border">
              <i className="pi pi-users text-4xl text-slate-300 mb-2 block" />
              No class sections match the selected filter.
            </div>
          ) : (
            <>
              {/* Desktop Table View (>= 768px) */}
              <div className="hidden md:block bg-white border-round-lg shadow-1 border-1 surface-border overflow-hidden">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="surface-100 text-slate-700 text-xs font-bold border-bottom-1 surface-border text-left">
                      <th style={{ width: '180px', padding: '10px 14px' }}>Class</th>
                      <th style={{ width: '140px', padding: '10px 14px' }}>Section</th>
                      <th style={{ width: '130px', padding: '10px 14px' }}>Capacity</th>
                      <th style={{ padding: '10px 14px' }}>Assigned Class Teacher</th>
                      <th style={{ width: '120px', padding: '10px 14px', textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClassTeachers.map((row, index) => {
                      const isAssigned = Boolean(row.employeeId);
                      return (
                        <tr
                          key={`${row.classId}-${row.sectionId}`}
                          className="border-bottom-1 surface-border transition-colors hover:surface-50"
                          style={{
                            backgroundColor: !isAssigned
                              ? '#fffdfa'
                              : index % 2 === 0
                              ? '#ffffff'
                              : '#fafafa',
                          }}
                        >
                          <td style={{ padding: '8px 14px' }}>
                            <span className="font-bold text-xs text-slate-800">{row.className}</span>
                          </td>
                          <td style={{ padding: '8px 14px' }}>
                            <span
                              className="inline-flex align-items-center px-2 py-0.5 border-round text-xs font-semibold"
                              style={{ backgroundColor: `${themeColor}15`, color: themeColor }}
                            >
                              Section {row.sectionName}
                            </span>
                          </td>
                          <td style={{ padding: '8px 14px' }}>
                            <span className="text-xs text-slate-500">{row.capacity} Seats</span>
                          </td>
                          <td style={{ padding: '8px 14px' }}>
                            <TextField
                              select
                              fullWidth
                              size="small"
                              value={row.employeeId || ''}
                              onChange={(e) => handleClassTeacherChange(row, e.target.value)}
                              sx={{
                                maxWidth: 360,
                                '& .MuiInputBase-root': { height: 32, fontSize: '12px' },
                              }}
                            >
                              <MenuItem value="" sx={{ fontSize: '12px', fontStyle: 'italic', color: '#94a3b8' }}>
                                -- Unassigned (Select Class Teacher) --
                              </MenuItem>
                              {teachers.map((t) => (
                                <MenuItem key={t.id} value={t.id} sx={{ fontSize: '12px' }}>
                                  {formatName(t.fullName)} ({t.employeeCode})
                                </MenuItem>
                              ))}
                            </TextField>
                          </td>
                          <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                            {isAssigned ? (
                              <Tag value="Assigned" severity="success" style={{ fontSize: '10px' }} />
                            ) : (
                              <Tag value="Unassigned" severity="warning" style={{ fontSize: '10px' }} />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View (< 768px) */}
              <div className="block md:hidden flex flex-column gap-2">
                {filteredClassTeachers.map((row) => {
                  const isAssigned = Boolean(row.employeeId);
                  return (
                    <div
                      key={`${row.classId}-${row.sectionId}`}
                      className="bg-white border-round-lg shadow-1 border-1 surface-border p-3"
                      style={{
                        borderLeft: `4px solid ${isAssigned ? '#10b981' : '#f59e0b'}`,
                      }}
                    >
                      <div className="flex align-items-center justify-content-between mb-2">
                        <div className="flex align-items-center gap-2">
                          <span className="font-bold text-sm text-slate-800">{row.className}</span>
                          <span
                            className="inline-flex align-items-center px-2 py-0.5 border-round text-xs font-semibold"
                            style={{ backgroundColor: `${themeColor}15`, color: themeColor }}
                          >
                            Section {row.sectionName}
                          </span>
                        </div>
                        <Tag
                          value={isAssigned ? 'Assigned' : 'Unassigned'}
                          severity={isAssigned ? 'success' : 'warning'}
                          style={{ fontSize: '10px' }}
                        />
                      </div>

                      <div className="text-xs text-slate-400 mb-2">
                        Capacity: {row.capacity} Seats
                      </div>

                      <TextField
                        select
                        fullWidth
                        size="small"
                        value={row.employeeId || ''}
                        onChange={(e) => handleClassTeacherChange(row, e.target.value)}
                        label="Assign Class Teacher"
                        sx={{
                          '& .MuiInputBase-root': { height: 34, fontSize: '12px' },
                          '& .MuiInputLabel-root': { fontSize: '12px' },
                        }}
                      >
                        <MenuItem value="" sx={{ fontSize: '12px', fontStyle: 'italic', color: '#94a3b8' }}>
                          -- Unassigned --
                        </MenuItem>
                        {teachers.map((t) => (
                          <MenuItem key={t.id} value={t.id} sx={{ fontSize: '12px' }}>
                            {formatName(t.fullName)} ({t.employeeCode})
                          </MenuItem>
                        ))}
                      </TextField>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* =========================================================================
          TAB 2: SUBJECT TEACHER ALLOCATION (CURRICULUM PER SECTION)
         ========================================================================= */}
      {activeTab === 1 && (
        <>
          {/* KPI Summary Cards */}
          <div className="grid mb-3">
            <div className="col-12 sm:col-4">
              <div className="flex align-items-center justify-content-between p-3 bg-white border-round-lg shadow-1 border-1 surface-border">
                <div>
                  <span className="text-xs text-slate-500 block mb-1">Total Subject Mappings</span>
                  <span className="text-2xl font-bold text-slate-800">{subjectTeacherKpis.total}</span>
                </div>
                <div
                  className="flex align-items-center justify-content-center border-round p-2"
                  style={{ width: '40px', height: '40px', backgroundColor: `${themeColor}15`, color: themeColor }}
                >
                  <i className="pi pi-book text-xl" />
                </div>
              </div>
            </div>

            <div className="col-12 sm:col-4">
              <div
                onClick={() => setSubjectTeacherOnlyUnassigned(false)}
                className="flex align-items-center justify-content-between p-3 bg-white border-round-lg shadow-1 border-1 surface-border cursor-pointer hover:shadow-2 transition-all"
              >
                <div>
                  <span className="text-xs text-slate-500 block mb-1">Allocated Subjects</span>
                  <span className="text-2xl font-bold text-emerald-600">{subjectTeacherKpis.assigned}</span>
                </div>
                <div className="flex align-items-center justify-content-center bg-emerald-50 text-emerald-600 border-round p-2" style={{ width: '40px', height: '40px' }}>
                  <i className="pi pi-check-circle text-xl" />
                </div>
              </div>
            </div>

            <div className="col-12 sm:col-4">
              <div
                onClick={() => setSubjectTeacherOnlyUnassigned((prev) => !prev)}
                className={`flex align-items-center justify-content-between p-3 bg-white border-round-lg shadow-1 border-1 cursor-pointer transition-all ${
                  subjectTeacherOnlyUnassigned ? 'border-amber-500 bg-amber-50 shadow-2' : 'surface-border'
                }`}
              >
                <div>
                  <span className="text-xs text-slate-500 block mb-1">Unassigned Subjects</span>
                  <span className="text-2xl font-bold text-amber-600">{subjectTeacherKpis.unassigned}</span>
                </div>
                <div className="flex align-items-center justify-content-center bg-amber-50 text-amber-600 border-round p-2" style={{ width: '40px', height: '40px' }}>
                  <i className="pi pi-exclamation-triangle text-xl" />
                </div>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white border-round-lg shadow-1 border-1 surface-border p-3 mb-3">
            <Grid container spacing={1.5} alignItems="center">
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Filter Class"
                  value={subjectClassFilter}
                  onChange={(e) => {
                    setSubjectClassFilter(e.target.value);
                    setSubjectSectionFilter('');
                  }}
                  sx={{
                    '& .MuiInputBase-root': { height: 32, fontSize: '12px' },
                    '& .MuiInputLabel-root': { fontSize: '12px' },
                  }}
                >
                  <MenuItem value="" sx={{ fontSize: '12px' }}>All Classes</MenuItem>
                  {classes.map((c) => (
                    <MenuItem key={c.id} value={c.id} sx={{ fontSize: '12px' }}>{c.name}</MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6} md={2.5}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Filter Section"
                  value={subjectSectionFilter}
                  disabled={!subjectClassFilter}
                  onChange={(e) => setSubjectSectionFilter(e.target.value)}
                  sx={{
                    '& .MuiInputBase-root': { height: 32, fontSize: '12px' },
                    '& .MuiInputLabel-root': { fontSize: '12px' },
                  }}
                >
                  <MenuItem value="" sx={{ fontSize: '12px' }}>All Sections</MenuItem>
                  {subjectSections.map((s) => (
                    <MenuItem key={s.id} value={s.id} sx={{ fontSize: '12px' }}>Section {s.name}</MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6} md={2.5}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Subject Type"
                  value={subjectTypeFilter}
                  onChange={(e) => setSubjectTypeFilter(e.target.value)}
                  sx={{
                    '& .MuiInputBase-root': { height: 32, fontSize: '12px' },
                    '& .MuiInputLabel-root': { fontSize: '12px' },
                  }}
                >
                  <MenuItem value="all" sx={{ fontSize: '12px' }}>All Types</MenuItem>
                  <MenuItem value={1} sx={{ fontSize: '12px' }}>Scholastic (Academic)</MenuItem>
                  <MenuItem value={2} sx={{ fontSize: '12px' }}>Co-Scholastic (Activities)</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <div className="flex align-items-center gap-1.5">
                  <div className="p-input-icon-left flex-1">
                    <i className="pi pi-search text-xs" style={{ left: '10px' }} />
                    <input
                      type="text"
                      value={subjectTeacherSearch}
                      onChange={(e) => setSubjectTeacherSearch(e.target.value)}
                      placeholder="Search subject or teacher..."
                      className="p-inputtext p-inputtext-sm w-full text-xs pl-5"
                      style={{ height: '32px' }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setSubjectTeacherOnlyUnassigned((prev) => !prev)}
                    style={{
                      height: '32px',
                      borderRadius: '6px',
                      border: subjectTeacherOnlyUnassigned ? '1.5px solid #f59e0b' : '1px solid #cbd5e1',
                      backgroundColor: subjectTeacherOnlyUnassigned ? '#fffbeb' : '#ffffff',
                      color: subjectTeacherOnlyUnassigned ? '#d97706' : '#64748b',
                      fontSize: '11px',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                    className="px-2 flex align-items-center gap-1 cursor-pointer transition-all"
                    title="Toggle unassigned subjects"
                  >
                    <i className="pi pi-filter text-xs" />
                    <span>{subjectTeacherOnlyUnassigned ? 'Unassigned' : 'Filter'}</span>
                  </button>
                </div>
              </Grid>
            </Grid>
          </div>

          {/* Tab 2 Content: Loading / Empty / Data */}
          {isLoadingSubjectTeachers ? (
            <div className="flex align-items-center justify-content-center p-6 bg-white border-round-lg border-1 surface-border">
              <CircularProgress size={32} />
            </div>
          ) : filteredSubjectTeachers.length === 0 ? (
            <div className="bg-white border-round-lg p-5 text-center text-slate-400 text-xs border-1 surface-border">
              <i className="pi pi-book text-4xl text-slate-300 mb-2 block" />
              No subject allocations match the selected filter.
            </div>
          ) : (
            <>
              {/* Desktop Table View (>= 768px) */}
              <div className="hidden md:block bg-white border-round-lg shadow-1 border-1 surface-border overflow-hidden">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="surface-100 text-slate-700 text-xs font-bold border-bottom-1 surface-border text-left">
                      <th style={{ width: '150px', padding: '10px 14px' }}>Class</th>
                      <th style={{ width: '130px', padding: '10px 14px' }}>Section</th>
                      <th style={{ width: '220px', padding: '10px 14px' }}>Subject</th>
                      <th style={{ width: '130px', padding: '10px 14px' }}>Type</th>
                      <th style={{ padding: '10px 14px' }}>Assigned Subject Teacher</th>
                      <th style={{ width: '120px', padding: '10px 14px', textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubjectTeachers.map((row, index) => {
                      const isAssigned = Boolean(row.employeeId);
                      return (
                        <tr
                          key={`${row.classId}-${row.sectionId}-${row.subjectId}`}
                          className="border-bottom-1 surface-border transition-colors hover:surface-50"
                          style={{
                            backgroundColor: !isAssigned
                              ? '#fffdfa'
                              : index % 2 === 0
                              ? '#ffffff'
                              : '#fafafa',
                          }}
                        >
                          <td style={{ padding: '8px 14px' }}>
                            <span className="font-bold text-xs text-slate-800">{row.className}</span>
                          </td>
                          <td style={{ padding: '8px 14px' }}>
                            <span
                              className="inline-flex align-items-center px-2 py-0.5 border-round text-xs font-semibold"
                              style={{ backgroundColor: `${themeColor}15`, color: themeColor }}
                            >
                              Section {row.sectionName}
                            </span>
                          </td>
                          <td style={{ padding: '8px 14px' }}>
                            <div className="font-bold text-xs" style={{ color: themeColor }}>
                              {row.subjectName}
                            </div>
                            <span className="text-xs text-slate-400 font-mono" style={{ fontSize: '10px' }}>
                              Code: {row.subjectCode}
                            </span>
                          </td>
                          <td style={{ padding: '8px 14px' }}>
                            <Tag
                              value={row.subjectType === 1 ? 'Scholastic' : 'Co-Scholastic'}
                              severity={row.subjectType === 1 ? 'info' : 'secondary'}
                              style={{ fontSize: '10px' }}
                            />
                          </td>
                          <td style={{ padding: '8px 14px' }}>
                            <TextField
                              select
                              fullWidth
                              size="small"
                              value={row.employeeId || ''}
                              onChange={(e) => handleSubjectTeacherChange(row, e.target.value)}
                              sx={{
                                maxWidth: 360,
                                '& .MuiInputBase-root': { height: 32, fontSize: '12px' },
                              }}
                            >
                              <MenuItem value="" sx={{ fontSize: '12px', fontStyle: 'italic', color: '#94a3b8' }}>
                                -- Unassigned (Select Subject Teacher) --
                              </MenuItem>
                              {teachers.map((t) => (
                                <MenuItem key={t.id} value={t.id} sx={{ fontSize: '12px' }}>
                                  {formatName(t.fullName)} ({t.employeeCode})
                                </MenuItem>
                              ))}
                            </TextField>
                          </td>
                          <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                            {isAssigned ? (
                              <Tag value="Assigned" severity="success" style={{ fontSize: '10px' }} />
                            ) : (
                              <Tag value="Unassigned" severity="warning" style={{ fontSize: '10px' }} />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View (< 768px) */}
              <div className="block md:hidden flex flex-column gap-2">
                {filteredSubjectTeachers.map((row) => {
                  const isAssigned = Boolean(row.employeeId);
                  return (
                    <div
                      key={`${row.classId}-${row.sectionId}-${row.subjectId}`}
                      className="bg-white border-round-lg shadow-1 border-1 surface-border p-3"
                      style={{
                        borderLeft: `4px solid ${isAssigned ? '#10b981' : '#f59e0b'}`,
                      }}
                    >
                      <div className="flex align-items-center justify-content-between mb-2">
                        <div className="flex align-items-center gap-2">
                          <span className="font-bold text-sm text-slate-800">{row.className}</span>
                          <span
                            className="inline-flex align-items-center px-2 py-0.5 border-round text-xs font-semibold"
                            style={{ backgroundColor: `${themeColor}15`, color: themeColor }}
                          >
                            Section {row.sectionName}
                          </span>
                        </div>
                        <Tag
                          value={isAssigned ? 'Assigned' : 'Unassigned'}
                          severity={isAssigned ? 'success' : 'warning'}
                          style={{ fontSize: '10px' }}
                        />
                      </div>

                      <div className="flex align-items-center justify-content-between mb-2">
                        <div>
                          <div className="font-bold text-xs" style={{ color: themeColor }}>
                            {row.subjectName}
                          </div>
                          <span className="text-xs text-slate-400 font-mono" style={{ fontSize: '10px' }}>
                            Code: {row.subjectCode}
                          </span>
                        </div>
                        <Tag
                          value={row.subjectType === 1 ? 'Scholastic' : 'Co-Scholastic'}
                          severity={row.subjectType === 1 ? 'info' : 'secondary'}
                          style={{ fontSize: '10px' }}
                        />
                      </div>

                      <TextField
                        select
                        fullWidth
                        size="small"
                        value={row.employeeId || ''}
                        onChange={(e) => handleSubjectTeacherChange(row, e.target.value)}
                        label="Assign Subject Teacher"
                        sx={{
                          '& .MuiInputBase-root': { height: 34, fontSize: '12px' },
                          '& .MuiInputLabel-root': { fontSize: '12px' },
                        }}
                      >
                        <MenuItem value="" sx={{ fontSize: '12px', fontStyle: 'italic', color: '#94a3b8' }}>
                          -- Unassigned --
                        </MenuItem>
                        {teachers.map((t) => (
                          <MenuItem key={t.id} value={t.id} sx={{ fontSize: '12px' }}>
                            {formatName(t.fullName)} ({t.employeeCode})
                          </MenuItem>
                        ))}
                      </TextField>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </Box>
  );
}
