import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  MenuItem,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Checkbox,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Save as SaveIcon,
  ContentCopy as CopyIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { classApi, subjectApi, classSubjectApi, academicYearApi } from '../api';
import { Modal } from '../../../components/Modal';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { useUiStore } from '../../../store/uiStore';
import { usePermission } from '../../../hooks/usePermission';
import { useAcademicYear } from '../../../hooks/useAcademicYear';

export const ClassSubjectMappingPage = () => {
  const { showSnackbar } = useUiStore();
  const { hasPermission } = usePermission();
  const { activeAcademicYearId } = useAcademicYear();

  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');

  // Mapping state: { [subjectId]: { mapped: boolean, isOptional: boolean } }
  const [mappingState, setMappingState] = useState({});
  const [loading, setLoading] = useState(false);

  // Copy from previous year modal
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [sourceYearId, setSourceYearId] = useState('');

  // Subject Edit / Create Modal state
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [subjectName, setSubjectName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [subjectType, setSubjectType] = useState(1);

  // Subject Delete Confirm state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [targetSubject, setTargetSubject] = useState(null);

  const loadInitData = async () => {
    try {
      const [cRes, sRes, ayRes] = await Promise.all([
        classApi.getClasses(),
        subjectApi.getSubjects(),
        academicYearApi.getAcademicYears(),
      ]);

      if (cRes.data.success) {
        setClasses(cRes.data.data || []);
        if (cRes.data.data?.length > 0 && !selectedClassId) {
          setSelectedClassId(cRes.data.data[0].id);
        }
      }
      if (sRes.data.success) setSubjects(sRes.data.data || []);
      if (ayRes.data.success) setAcademicYears(ayRes.data.data || []);
    } catch (err) {
      showSnackbar('Error loading classes or subjects', 'error');
    }
  };

  const loadCurrentMapping = async (classId) => {
    if (!classId) return;
    try {
      setLoading(true);
      const res = await classSubjectApi.getClassSubjects(classId, activeAcademicYearId);
      if (res.data.success) {
        const mappedList = res.data.data || [];
        const state = {};
        subjects.forEach((s) => {
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
      loadCurrentMapping(selectedClassId);
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
      await classSubjectApi.saveMapping({
        classId: Number(selectedClassId),
        academicYearId: activeAcademicYearId,
        subjects: payloadSubjects,
      });
      showSnackbar('Subject mappings saved successfully', 'success');
      loadCurrentMapping(selectedClassId);
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to save mappings', 'error');
    }
  };

  const handleCopy = async () => {
    if (!sourceYearId) return;
    try {
      await classSubjectApi.copyFromPreviousYear({
        fromAcademicYearId: Number(sourceYearId),
        toAcademicYearId: activeAcademicYearId,
      });
      showSnackbar('Copied all class-subject mappings from previous year successfully', 'success');
      setCopyModalOpen(false);
      loadCurrentMapping(selectedClassId);
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to copy mappings', 'error');
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
        setSubjects(sRes.data.data || []);
      }
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Error saving subject', 'error');
    }
  };

  const handleOpenDeleteSubject = (sub) => {
    setTargetSubject(sub);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteSubject = async () => {
    if (!targetSubject) return;
    try {
      await subjectApi.deleteSubject(targetSubject.id);
      showSnackbar(`Subject "${targetSubject.name}" deleted successfully`, 'success');
      setDeleteConfirmOpen(false);
      setTargetSubject(null);
      const sRes = await subjectApi.getSubjects();
      if (sRes.data.success) {
        setSubjects(sRes.data.data || []);
      }
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to delete subject', 'error');
    }
  };

  const canEdit = hasPermission('ClassSubjects', 'Edit');

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Class-Subject Mapping
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Map mandatory and optional subjects to grade levels per academic session (FR-2.5 & FR-2.7)
          </Typography>
        </div>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleOpenAddSubject}
          >
            Add Subject
          </Button>
          {canEdit && (
            <Button
              variant="outlined"
              startIcon={<CopyIcon />}
              onClick={() => setCopyModalOpen(true)}
            >
              Copy From Previous Year
            </Button>
          )}
          {canEdit && (
            <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave}>
              Save Mapping
            </Button>
          )}
        </Box>
      </Box>

      {/* Class Selector Bar */}
      <Paper sx={{ p: 2.5, mb: 3, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              select
              fullWidth
              size="small"
              label="Select Grade / Class"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
            >
              {classes.map((cls) => (
                <MenuItem key={cls.id} value={cls.id}>
                  {cls.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Configure curriculum subjects for the selected class in the active academic session.
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Mapping Table */}
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#fafafa' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, width: 70 }}>Map</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Subject Name</TableCell>
              <TableCell sx={{ fontWeight: 600, width: 120 }}>Code</TableCell>
              <TableCell sx={{ fontWeight: 600, width: 140 }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 600, width: 180 }}>Optional Subject?</TableCell>
              <TableCell sx={{ fontWeight: 600, width: 110, textAlign: 'center' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {subjects.map((sub) => {
              const isMapped = !!mappingState[sub.id]?.mapped;
              const isOpt = !!mappingState[sub.id]?.isOptional;

              return (
                <TableRow key={sub.id} hover selected={isMapped}>
                  <TableCell>
                    <Checkbox
                      checked={isMapped}
                      onChange={(e) => handleToggleMapped(sub.id, e.target.checked)}
                      disabled={!canEdit}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{sub.name}</TableCell>
                  <TableCell>{sub.code}</TableCell>
                  <TableCell>
                    {sub.type === 1 ? (
                      <Chip label="Scholastic" size="small" color="primary" variant="outlined" />
                    ) : (
                      <Chip label="Co-Scholastic" size="small" color="secondary" variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell>
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={isOpt}
                          disabled={!isMapped || !canEdit}
                          onChange={(e) => handleToggleOptional(sub.id, e.target.checked)}
                        />
                      }
                      label={isOpt ? 'Optional' : 'Compulsory'}
                    />
                  </TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                      <Tooltip title="Edit Subject">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleOpenEditSubject(sub)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Subject">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleOpenDeleteSubject(sub)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
            {subjects.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>
                  No subjects found. Click "+ Add Subject" to create one.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* Create / Edit Subject Modal */}
      <Modal
        open={subjectModalOpen}
        onClose={() => setSubjectModalOpen(false)}
        title={editingSubject ? 'Edit Subject' : 'Create Subject'}
        maxWidth="xs"
      >
        <Box component="form" onSubmit={handleSaveSubject} sx={{ mt: 1 }}>
          <TextField
            required
            fullWidth
            label="Subject Name (e.g. Mathematics, English)"
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            required
            fullWidth
            label="Subject Code (e.g. MATH, ENG)"
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
            sx={{ mb: 2 }}
          >
            <MenuItem value={1}>Scholastic (Academic / Core)</MenuItem>
            <MenuItem value={2}>Co-Scholastic (Activities / Sports / Arts)</MenuItem>
          </TextField>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
            <Button onClick={() => setSubjectModalOpen(false)} color="inherit">
              Cancel
            </Button>
            <Button type="submit" variant="contained">
              Save Subject
            </Button>
          </Box>
        </Box>
      </Modal>

      {/* Delete Subject Confirm Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete Subject"
        message={`Are you sure you want to delete "${targetSubject?.name || 'this subject'}"? It will be permanently removed and unmapped from all classes.`}
        confirmColor="error"
        onConfirm={handleDeleteSubject}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setTargetSubject(null);
        }}
      />

      {/* Copy From Previous Year Dialog (FR-2.7) */}
      <Dialog open={copyModalOpen} onClose={() => setCopyModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Copy Mappings From Previous Year</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Duplicate all class-subject mappings from a previous session into the current academic year.
          </Typography>
          <TextField
            select
            fullWidth
            label="Source Academic Year"
            value={sourceYearId}
            onChange={(e) => setSourceYearId(e.target.value)}
          >
            {academicYears
              .filter((ay) => ay.id !== activeAcademicYearId)
              .map((ay) => (
                <MenuItem key={ay.id} value={ay.id}>
                  {ay.name}
                </MenuItem>
              ))}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCopyModalOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleCopy} variant="contained" disabled={!sourceYearId}>
            Copy Mappings
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
