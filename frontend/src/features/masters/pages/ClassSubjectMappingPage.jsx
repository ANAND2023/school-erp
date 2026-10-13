import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Checkbox,
  Switch,
  FormControlLabel,
  IconButton,
  Tooltip,
  CircularProgress,
  InputAdornment,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { Tag } from 'primereact/tag';
import { classApi, subjectApi, classSubjectApi, academicYearApi } from '../api';
import { Modal } from '../../../components/Modal';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { AppButton } from '../../../components/common/AppButton';
import { useUiStore } from '../../../store/uiStore';
import { usePermission } from '../../../hooks/usePermission';
import { useAcademicYear } from '../../../hooks/useAcademicYear';
import { useThemeStore, shadeColor } from '../../../store/themeStore';

export const ClassSubjectMappingPage = () => {
  const { showSnackbar } = useUiStore();
  const { hasPermission } = usePermission();
  const { activeAcademicYearId, activeAcademicYearName } = useAcademicYear();
  const { currentColorHex } = useThemeStore();
  const themeColor = currentColorHex || '#14b8a6';
  const themeDarker = shadeColor(themeColor, -20);

  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');

  // Mapping state: { [subjectId]: { mapped: boolean, isOptional: boolean } }
  const [mappingState, setMappingState] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'mapped' | 'unmapped' | 'scholastic' | 'coscholastic'

  // Copy from previous year modal
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [sourceYearId, setSourceYearId] = useState('');
  const [copying, setCopying] = useState(false);

  // Subject Edit / Create Modal state
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [subjectName, setSubjectName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [subjectType, setSubjectType] = useState(1);
  const [savingSubject, setSavingSubject] = useState(false);

  // Subject Delete Confirm state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [targetSubject, setTargetSubject] = useState(null);
  const [deletingSubject, setDeletingSubject] = useState(false);

  const loadInitData = async () => {
    try {
      const [cRes, sRes, ayRes] = await Promise.all([
        classApi.getClasses(),
        subjectApi.getSubjects(),
        academicYearApi.getAcademicYears(),
      ]);

      if (cRes.data.success) {
        const clsList = cRes.data.data || [];
        setClasses(clsList);
        if (clsList.length > 0 && !selectedClassId) {
          setSelectedClassId(clsList[0].id);
        }
      }
      if (sRes.data.success) setSubjects(sRes.data.data || []);
      if (ayRes.data.success) setAcademicYears(ayRes.data.data || []);
    } catch (err) {
      showSnackbar('Error loading classes or subjects', 'error');
    }
  };

  const loadCurrentMapping = async (classId, subjectsList = subjects) => {
    if (!classId) return;
    try {
      setLoading(true);
      const res = await classSubjectApi.getClassSubjects(classId, activeAcademicYearId);
      if (res.data.success) {
        const mappedList = res.data.data || [];
        const state = {};
        subjectsList.forEach((s) => {
          const match = mappedList.find((m) => m.subjectId === s.id);
          state[s.id] = {
            mapped: !!match,
            isOptional: match ? !!match.isOptional : false,
          };
        });
        setMappingState(state);
      }
    } catch (err) {
      showSnackbar('Failed to fetch class subject mappings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitData();
  }, []);

  useEffect(() => {
    if (selectedClassId && subjects.length > 0) {
      loadCurrentMapping(selectedClassId, subjects);
    }
  }, [selectedClassId, subjects, activeAcademicYearId]);

  const handleToggleMapped = (subjectId, mapped) => {
    setMappingState((prev) => ({
      ...prev,
      [subjectId]: {
        ...prev[subjectId],
        mapped,
      },
    }));
  };

  const handleToggleOptional = (subjectId, isOptional) => {
    setMappingState((prev) => ({
      ...prev,
      [subjectId]: {
        ...prev[subjectId],
        isOptional,
      },
    }));
  };

  // Bulk operations
  const handleBulkMapFiltered = (shouldMap) => {
    setMappingState((prev) => {
      const next = { ...prev };
      filteredSubjects.forEach((sub) => {
        next[sub.id] = {
          ...next[sub.id],
          mapped: shouldMap,
        };
      });
      return next;
    });
  };

  const handleBulkSetOptional = (isOpt) => {
    setMappingState((prev) => {
      const next = { ...prev };
      filteredSubjects.forEach((sub) => {
        if (next[sub.id]?.mapped) {
          next[sub.id] = {
            ...next[sub.id],
            isOptional: isOpt,
          };
        }
      });
      return next;
    });
  };

  const handleSave = async () => {
    const payloadSubjects = [];
    Object.keys(mappingState).forEach((subId) => {
      if (mappingState[subId]?.mapped) {
        payloadSubjects.push({
          subjectId: Number(subId),
          isOptional: !!mappingState[subId]?.isOptional,
        });
      }
    });

    try {
      setSaving(true);
      await classSubjectApi.saveMapping({
        classId: Number(selectedClassId),
        academicYearId: activeAcademicYearId,
        subjects: payloadSubjects,
      });
      showSnackbar('Subject mappings saved successfully', 'success');
      loadCurrentMapping(selectedClassId);
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to save mappings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    if (!sourceYearId) return;
    try {
      setCopying(true);
      await classSubjectApi.copyFromPreviousYear({
        fromAcademicYearId: Number(sourceYearId),
        toAcademicYearId: activeAcademicYearId,
      });
      showSnackbar('Copied all class-subject mappings from previous year successfully', 'success');
      setCopyModalOpen(false);
      loadCurrentMapping(selectedClassId);
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to copy mappings', 'error');
    } finally {
      setCopying(false);
    }
  };

  // Subject Add/Edit/Delete Handlers
  const handleOpenAddSubject = () => {
    setEditingSubject(null);
    setSubjectName('');
    setSubjectCode('');
    setSubjectType(1);
    setSubjectModalOpen(true);
  };

  const handleOpenEditSubject = (sub) => {
    setEditingSubject(sub);
    setSubjectName(sub.name);
    setSubjectCode(sub.code);
    setSubjectType(sub.type);
    setSubjectModalOpen(true);
  };

  const handleSaveSubject = async (e) => {
    e.preventDefault();
    try {
      setSavingSubject(true);
      if (editingSubject) {
        await subjectApi.updateSubject(editingSubject.id, {
          name: subjectName,
          code: subjectCode,
          type: subjectType,
        });
        showSnackbar('Subject updated successfully', 'success');
      } else {
        await subjectApi.createSubject({
          name: subjectName,
          code: subjectCode,
          type: subjectType,
        });
        showSnackbar('Subject created successfully', 'success');
      }
      setSubjectModalOpen(false);
      const sRes = await subjectApi.getSubjects();
      if (sRes.data.success) {
        const fresh = sRes.data.data || [];
        setSubjects(fresh);
        loadCurrentMapping(selectedClassId, fresh);
      }
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Error saving subject', 'error');
    } finally {
      setSavingSubject(false);
    }
  };

  const handleOpenDeleteSubject = (sub) => {
    setTargetSubject(sub);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteSubject = async () => {
    if (!targetSubject) return;
    try {
      setDeletingSubject(true);
      await subjectApi.deleteSubject(targetSubject.id);
      showSnackbar(`Subject "${targetSubject.name}" deleted successfully`, 'success');
      setDeleteConfirmOpen(false);
      setTargetSubject(null);
      const sRes = await subjectApi.getSubjects();
      if (sRes.data.success) {
        const fresh = sRes.data.data || [];
        setSubjects(fresh);
        loadCurrentMapping(selectedClassId, fresh);
      }
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to delete subject', 'error');
    } finally {
      setDeletingSubject(false);
    }
  };

  const canEdit = hasPermission('ClassSubjects', 'Edit');
  const canAdd = hasPermission('ClassSubjects', 'Add');

  // KPI Calculations
  const totalSubjectsCount = subjects.length;
  const mappedCount = useMemo(() => {
    return subjects.filter((s) => mappingState[s.id]?.mapped).length;
  }, [subjects, mappingState]);
  const compulsoryCount = useMemo(() => {
    return subjects.filter((s) => mappingState[s.id]?.mapped && !mappingState[s.id]?.isOptional).length;
  }, [subjects, mappingState]);
  const optionalCount = useMemo(() => {
    return subjects.filter((s) => mappingState[s.id]?.mapped && mappingState[s.id]?.isOptional).length;
  }, [subjects, mappingState]);

  // Filtered subjects
  const filteredSubjects = useMemo(() => {
    return subjects.filter((sub) => {
      // Search filter
      const term = searchTerm.trim().toLowerCase();
      const matchSearch =
        !term ||
        sub.name?.toLowerCase().includes(term) ||
        sub.code?.toLowerCase().includes(term);

      if (!matchSearch) return false;

      // Status / Type Filter
      const isMapped = !!mappingState[sub.id]?.mapped;
      if (filterType === 'mapped') return isMapped;
      if (filterType === 'unmapped') return !isMapped;
      if (filterType === 'scholastic') return sub.type === 1;
      if (filterType === 'coscholastic') return sub.type === 2;
      return true;
    });
  }, [subjects, searchTerm, filterType, mappingState]);

  // Header checkbox state
  const isAllFilteredMapped =
    filteredSubjects.length > 0 &&
    filteredSubjects.every((s) => mappingState[s.id]?.mapped);

  const isSomeFilteredMapped =
    filteredSubjects.some((s) => mappingState[s.id]?.mapped) && !isAllFilteredMapped;

  const handleHeaderCheckboxToggle = () => {
    handleBulkMapFiltered(!isAllFilteredMapped);
  };

  const selectedClass = classes.find((c) => c.id === Number(selectedClassId));

  return (
    <Box>
      {/* Top Header Card */}
      <div className="flex flex-column sm:flex-row align-items-start sm:align-items-center justify-content-between gap-3 bg-white p-4 border-round-lg shadow-1 border-1 surface-border mb-3">
        <div>
          <div className="flex align-items-center gap-2">
            <h2 className="text-xl font-bold text-slate-800 m-0">Class-Subject Mapping</h2>
            {activeAcademicYearName && (
              <Tag
                value={`Session: ${activeAcademicYearName}`}
                severity="info"
                style={{ fontSize: '11px', fontWeight: 600 }}
              />
            )}
          </div>
          <p className="text-xs text-slate-500 m-0 mt-1">
            Map mandatory core and elective subjects to grade levels for the active academic session
          </p>
        </div>
        <div className="flex align-items-center gap-2 flex-wrap">
          <AppButton
            variant="outlined"
            label="Add Subject"
            icon="pi pi-plus"
            size="small"
            onClick={handleOpenAddSubject}
          />
          {canAdd && (
            <AppButton
              variant="outlined"
              label="Copy From Previous Year"
              icon="pi pi-copy"
              size="small"
              onClick={() => setCopyModalOpen(true)}
            />
          )}
          {canEdit && (
            <AppButton
              label="Save Mapping"
              icon="pi pi-save"
              size="small"
              loading={saving}
              onClick={handleSave}
            />
          )}
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid mb-3">
        <div className="col-12 sm:col-6 lg:col-3">
          <div className="flex align-items-center justify-content-between p-3 bg-white border-round-lg shadow-1 border-1 surface-border">
            <div>
              <span className="text-xs text-slate-500 block mb-1">Total Subjects</span>
              <span className="text-2xl font-bold text-slate-800">{totalSubjectsCount}</span>
            </div>
            <div
              className="flex align-items-center justify-content-center border-round p-2"
              style={{ width: '42px', height: '42px', backgroundColor: `${themeColor}15`, color: themeColor }}
            >
              <i className="pi pi-book text-xl" />
            </div>
          </div>
        </div>
        <div className="col-12 sm:col-6 lg:col-3">
          <div className="flex align-items-center justify-content-between p-3 bg-white border-round-lg shadow-1 border-1 surface-border">
            <div>
              <span className="text-xs text-slate-500 block mb-1">Mapped to Selected Class</span>
              <span className="text-2xl font-bold" style={{ color: themeColor }}>{mappedCount}</span>
            </div>
            <div
              className="flex align-items-center justify-content-center border-round p-2"
              style={{ width: '42px', height: '42px', backgroundColor: `${themeColor}15`, color: themeColor }}
            >
              <i className="pi pi-check-circle text-xl" />
            </div>
          </div>
        </div>
        <div className="col-12 sm:col-6 lg:col-3">
          <div className="flex align-items-center justify-content-between p-3 bg-white border-round-lg shadow-1 border-1 surface-border">
            <div>
              <span className="text-xs text-slate-500 block mb-1">Compulsory (Core)</span>
              <span className="text-2xl font-bold text-blue-600">{compulsoryCount}</span>
            </div>
            <div className="flex align-items-center justify-content-center bg-blue-50 text-blue-600 border-round p-2" style={{ width: '42px', height: '42px' }}>
              <i className="pi pi-star text-xl" />
            </div>
          </div>
        </div>
        <div className="col-12 sm:col-6 lg:col-3">
          <div className="flex align-items-center justify-content-between p-3 bg-white border-round-lg shadow-1 border-1 surface-border">
            <div>
              <span className="text-xs text-slate-500 block mb-1">Optional (Elective)</span>
              <span className="text-2xl font-bold text-purple-600">{optionalCount}</span>
            </div>
            <div className="flex align-items-center justify-content-center bg-purple-50 text-purple-600 border-round p-2" style={{ width: '42px', height: '42px' }}>
              <i className="pi pi-bookmark text-xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Class Selector & Search / Filter Bar */}
      <div className="bg-white border-round-lg shadow-1 border-1 surface-border p-3 mb-3">
        <div className="flex flex-column lg:flex-row align-items-start lg:align-items-center justify-content-between gap-3">
          <div className="flex flex-column sm:flex-row align-items-stretch sm:align-items-center gap-3 w-full lg:w-auto">
            {/* Grade Selector */}
            <div style={{ minWidth: '240px' }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Select Grade / Class"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    fontWeight: 600,
                  },
                }}
              >
                {classes.map((cls) => (
                  <MenuItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </MenuItem>
                ))}
              </TextField>
            </div>

            {/* Quick Context Pill */}
            {selectedClass && (
              <div className="flex align-items-center gap-2 px-3 py-2 surface-50 border-round border-1 surface-border">
                <span className="text-xs text-slate-500">Configuring:</span>
                <span className="text-xs font-bold text-slate-800">{selectedClass.name}</span>
                <Tag
                  value={`${mappedCount} Mapped`}
                  severity={mappedCount > 0 ? 'success' : 'warning'}
                  style={{ fontSize: '10px', padding: '1px 6px' }}
                />
              </div>
            )}
          </div>

          {/* Search Box */}
          <div className="flex align-items-center gap-2 w-full lg:w-auto">
            <TextField
              size="small"
              placeholder="Search by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{
                width: { xs: '100%', sm: 260 },
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  bgcolor: '#ffffff',
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                endAdornment: searchTerm ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchTerm('')}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
            />
          </div>
        </div>

        {/* Filter Pills & Bulk Operations */}
        <div className="flex flex-column sm:flex-row align-items-start sm:align-items-center justify-content-between gap-2 mt-3 pt-3 border-top-1 surface-border">
          <div className="flex align-items-center gap-1 flex-wrap">
            <span className="text-xs text-slate-400 mr-2 font-medium">Filter:</span>
            {[
              { id: 'all', label: `All (${totalSubjectsCount})` },
              { id: 'mapped', label: `Mapped (${mappedCount})` },
              { id: 'unmapped', label: `Unmapped (${totalSubjectsCount - mappedCount})` },
              { id: 'scholastic', label: 'Scholastic' },
              { id: 'coscholastic', label: 'Co-Scholastic' },
            ].map((tab) => {
              const active = filterType === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterType(tab.id)}
                  className={`text-xs px-2 py-1 border-round font-medium cursor-pointer transition-colors transition-duration-150 border-1 ${
                    active
                      ? 'text-white border-transparent'
                      : 'bg-white text-slate-600 surface-border hover:surface-100'
                  }`}
                  style={{
                    backgroundColor: active ? themeColor : undefined,
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {canEdit && (
            <div className="flex align-items-center gap-1 flex-wrap">
              <span className="text-xs text-slate-400 mr-1 font-medium">Bulk:</span>
              <button
                type="button"
                onClick={() => handleBulkMapFiltered(true)}
                className="text-xs px-2 py-1 bg-white text-slate-700 surface-border border-1 border-round hover:surface-100 cursor-pointer font-medium"
                title="Map all visible filtered subjects"
              >
                Map All
              </button>
              <button
                type="button"
                onClick={() => handleBulkMapFiltered(false)}
                className="text-xs px-2 py-1 bg-white text-slate-700 surface-border border-1 border-round hover:surface-100 cursor-pointer font-medium"
                title="Unmap all visible filtered subjects"
              >
                Unmap All
              </button>
              <button
                type="button"
                onClick={() => handleBulkSetOptional(false)}
                className="text-xs px-2 py-1 bg-white text-blue-700 surface-border border-1 border-round hover:blue-50 cursor-pointer font-medium"
                title="Make all mapped subjects compulsory"
              >
                All Compulsory
              </button>
              <button
                type="button"
                onClick={() => handleBulkSetOptional(true)}
                className="text-xs px-2 py-1 bg-white text-purple-700 surface-border border-1 border-round hover:purple-50 cursor-pointer font-medium"
                title="Make all mapped subjects optional"
              >
                All Optional
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Mapping Table Card */}
      <div className="bg-white border-round-lg shadow-1 border-1 surface-border overflow-hidden">
        {loading ? (
          <div className="flex flex-column align-items-center justify-content-center p-6 gap-2">
            <CircularProgress size={32} />
            <span className="text-xs text-slate-500 font-medium">Loading subject mappings...</span>
          </div>
        ) : (
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <TableRow>
                <TableCell sx={{ width: 64, py: 1.5, textAlign: 'center' }}>
                  <Tooltip title={isAllFilteredMapped ? 'Unmap all visible' : 'Map all visible'}>
                    <Checkbox
                      size="small"
                      checked={isAllFilteredMapped}
                      indeterminate={isSomeFilteredMapped}
                      onChange={handleHeaderCheckboxToggle}
                      disabled={!canEdit || filteredSubjects.length === 0}
                      sx={{ p: 0.5 }}
                    />
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.8125rem', color: '#334155', py: 1.5 }}>
                  Subject Name
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.8125rem', color: '#334155', width: 130, py: 1.5 }}>
                  Code
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.8125rem', color: '#334155', width: 150, py: 1.5 }}>
                  Type
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.8125rem', color: '#334155', width: 220, py: 1.5 }}>
                  Curriculum Requirement
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.8125rem', color: '#334155', width: 110, textAlign: 'center', py: 1.5 }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredSubjects.map((sub) => {
                const isMapped = !!mappingState[sub.id]?.mapped;
                const isOpt = !!mappingState[sub.id]?.isOptional;

                return (
                  <TableRow
                    key={sub.id}
                    hover
                    sx={{
                      transition: 'background-color 0.15s ease',
                      bgcolor: isMapped ? `${themeColor}08` : 'inherit',
                      '&:hover': {
                        bgcolor: isMapped ? `${themeColor}12 !important` : '#f8fafc !important',
                      },
                    }}
                  >
                    {/* Checkbox */}
                    <TableCell sx={{ textAlign: 'center', py: 1.5 }}>
                      <Checkbox
                        size="small"
                        checked={isMapped}
                        onChange={(e) => handleToggleMapped(sub.id, e.target.checked)}
                        disabled={!canEdit}
                        sx={{
                          p: 0.5,
                          color: isMapped ? themeColor : undefined,
                          '&.Mui-checked': {
                            color: themeColor,
                          },
                        }}
                      />
                    </TableCell>

                    {/* Subject Name */}
                    <TableCell sx={{ py: 1.5 }}>
                      <div className="flex align-items-center gap-2">
                        <div
                          className="flex align-items-center justify-content-center border-round font-bold flex-shrink-0"
                          style={{
                            width: '32px',
                            height: '32px',
                            backgroundColor: isMapped ? `${themeColor}18` : '#f1f5f9',
                            color: isMapped ? themeColor : '#64748b',
                            fontSize: '13px',
                          }}
                        >
                          <i className="pi pi-book" />
                        </div>
                        <div>
                          <span className="font-bold text-sm text-slate-800 block">
                            {sub.name}
                          </span>
                          <span className="text-xs text-slate-400">
                            {isMapped
                              ? isOpt
                                ? 'Elective / Optional Subject'
                                : 'Compulsory Core Subject'
                              : 'Not mapped to this class'}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Code */}
                    <TableCell sx={{ py: 1.5 }}>
                      <span className="inline-block px-2 py-1 border-round font-mono font-bold text-xs bg-slate-100 text-slate-700 border-1 surface-border">
                        {sub.code || '—'}
                      </span>
                    </TableCell>

                    {/* Type */}
                    <TableCell sx={{ py: 1.5 }}>
                      {sub.type === 1 ? (
                        <Tag
                          value="Scholastic"
                          severity="info"
                          style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px' }}
                        />
                      ) : (
                        <Tag
                          value="Co-Scholastic"
                          severity="warning"
                          style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px' }}
                        />
                      )}
                    </TableCell>

                    {/* Curriculum Requirement Toggle */}
                    <TableCell sx={{ py: 1.5 }}>
                      <div className="flex align-items-center gap-2">
                        <Switch
                          size="small"
                          checked={isOpt}
                          disabled={!isMapped || !canEdit}
                          onChange={(e) => handleToggleOptional(sub.id, e.target.checked)}
                          sx={{
                            '& .MuiSwitch-switchBase.Mui-checked': {
                              color: '#8b5cf6',
                            },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                              backgroundColor: '#8b5cf6',
                            },
                          }}
                        />
                        {isMapped ? (
                          isOpt ? (
                            <Tag
                              value="Optional"
                              severity="help"
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                backgroundColor: '#f3e8ff',
                                color: '#7e22ce',
                              }}
                            />
                          ) : (
                            <Tag
                              value="Compulsory"
                              severity="success"
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                backgroundColor: '#ecfdf5',
                                color: '#047857',
                              }}
                            />
                          )
                        ) : (
                          <span className="text-xs text-slate-400 italic">Unmapped</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell sx={{ textAlign: 'center', py: 1.5 }}>
                      <div className="flex align-items-center justify-content-center gap-1">
                        <Tooltip title="Edit Subject">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenEditSubject(sub)}
                            sx={{
                              color: '#3b82f6',
                              '&:hover': { bgcolor: '#eff6ff' },
                              width: 30,
                              height: 30,
                            }}
                          >
                            <i className="pi pi-pencil" style={{ fontSize: '13px' }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Subject">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDeleteSubject(sub)}
                            sx={{
                              color: '#ef4444',
                              '&:hover': { bgcolor: '#fef2f2' },
                              width: 30,
                              height: 30,
                            }}
                          >
                            <i className="pi pi-trash" style={{ fontSize: '13px' }} />
                          </IconButton>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}

              {filteredSubjects.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} sx={{ textAlign: 'center', py: 5 }}>
                    <div className="flex flex-column align-items-center justify-content-center gap-2">
                      <div
                        className="flex align-items-center justify-content-center border-round-circle surface-100 text-slate-400"
                        style={{ width: '48px', height: '48px' }}
                      >
                        <i className="pi pi-inbox text-2xl" />
                      </div>
                      <span className="text-sm font-semibold text-slate-700">
                        No subjects match your criteria
                      </span>
                      <span className="text-xs text-slate-400">
                        {searchTerm
                          ? 'Try clearing your search query or changing filters'
                          : 'Click "+ Add Subject" above to create subjects in your school catalog'}
                      </span>
                      {searchTerm && (
                        <button
                          type="button"
                          onClick={() => setSearchTerm('')}
                          className="mt-2 text-xs text-primary font-semibold border-none bg-transparent cursor-pointer underline"
                        >
                          Clear Search
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create / Edit Subject Modal */}
      <Modal
        open={subjectModalOpen}
        onClose={() => setSubjectModalOpen(false)}
        title={editingSubject ? 'Edit Subject' : 'Create Subject'}
        icon="pi pi-book"
        maxWidth="xs"
        formId="subject-modal-form"
        submitLabel={editingSubject ? 'Save Changes' : 'Save Subject'}
        confirmLoading={savingSubject}
      >
        <Box component="form" id="subject-modal-form" onSubmit={handleSaveSubject} sx={{ mt: 1 }}>
          <TextField
            required
            fullWidth
            label="Subject Name"
            placeholder="e.g. Mathematics, English, Physics"
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            required
            fullWidth
            label="Subject Code"
            placeholder="e.g. MATH, ENG, PHY"
            value={subjectCode}
            onChange={(e) => setSubjectCode(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            select
            required
            fullWidth
            label="Subject Type"
            value={subjectType}
            onChange={(e) => setSubjectType(Number(e.target.value))}
            sx={{ mb: 1 }}
          >
            <MenuItem value={1}>Scholastic (Academic / Core)</MenuItem>
            <MenuItem value={2}>Co-Scholastic (Activities / Sports / Arts)</MenuItem>
          </TextField>
        </Box>
      </Modal>

      {/* Copy From Previous Year Modal */}
      <Modal
        open={copyModalOpen}
        onClose={() => setCopyModalOpen(false)}
        title="Copy Mappings From Previous Year"
        icon="pi pi-copy"
        maxWidth="xs"
        submitLabel="Copy Mappings"
        confirmLoading={copying}
        confirmDisabled={!sourceYearId || copying}
        onConfirm={handleCopy}
      >
        <Box sx={{ mt: 1 }}>
          <div className="p-3 surface-50 border-round border-1 surface-border mb-3">
            <div className="flex align-items-center gap-2 mb-1">
              <i className="pi pi-info-circle text-primary text-sm" />
              <span className="text-xs font-bold text-slate-800">Duplicate Curriculum Allocations</span>
            </div>
            <p className="text-xs text-slate-500 m-0 line-height-3">
              This action will copy all class-subject mappings from the selected previous academic session into the current session (<b>{activeAcademicYearName || 'Active Session'}</b>).
            </p>
          </div>

          <TextField
            select
            fullWidth
            required
            label="Source Academic Year"
            value={sourceYearId}
            onChange={(e) => setSourceYearId(e.target.value)}
            helperText="Choose the academic session whose subject mappings you want to duplicate"
          >
            {academicYears
              .filter((ay) => ay.id !== activeAcademicYearId)
              .map((ay) => (
                <MenuItem key={ay.id} value={ay.id}>
                  {ay.name}
                </MenuItem>
              ))}
          </TextField>
        </Box>
      </Modal>

      {/* Delete Subject Confirm Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete Subject"
        message={`Are you sure you want to delete "${targetSubject?.name || 'this subject'}"? It will be permanently removed and unmapped from all classes.`}
        confirmColor="error"
        confirmLabel="Delete Subject"
        loading={deletingSubject}
        onConfirm={handleDeleteSubject}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setTargetSubject(null);
        }}
      />
    </Box>
  );
};

export default ClassSubjectMappingPage;
