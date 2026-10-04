import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Chip,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Divider,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Class as ClassIcon,
} from '@mui/icons-material';
import { Modal } from '../../../components/Modal';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { classApi } from '../api';
import { useUiStore } from '../../../store/uiStore';
import { usePermission } from '../../../hooks/usePermission';

export const ClassesSectionsPage = () => {
  const { showSnackbar } = useUiStore();
  const { hasPermission } = usePermission();

  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);

  // Class Modal
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [className, setClassName] = useState('');
  const [displayOrder, setDisplayOrder] = useState(1);

  // Section Modal
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [editingSection, setEditingSection] = useState(null);
  const [sectionName, setSectionName] = useState('');
  const [sectionCapacity, setSectionCapacity] = useState(40);

  // Delete Confirm
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'class'|'section', id: number }

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const res = await classApi.getClasses();
      if (res.data.success) {
        setClasses(res.data.data || []);
      }
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to load classes', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleOpenAddClass = () => {
    setEditingClass(null);
    setClassName('');
    setDisplayOrder(classes.length + 1);
    setClassModalOpen(true);
  };

  const handleOpenEditClass = (cls, e) => {
    e.stopPropagation();
    setEditingClass(cls);
    setClassName(cls.name);
    setDisplayOrder(cls.displayOrder);
    setClassModalOpen(true);
  };

  const handleSaveClass = async (e) => {
    e.preventDefault();
    try {
      if (editingClass) {
        await classApi.updateClass(editingClass.id, { name: className, displayOrder });
        showSnackbar('Class updated successfully', 'success');
      } else {
        await classApi.createClass({ name: className, displayOrder });
        showSnackbar('Class created successfully', 'success');
      }
      setClassModalOpen(false);
      fetchClasses();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Error saving class', 'error');
    }
  };

  const handleOpenAddSection = (classId) => {
    setSelectedClassId(classId);
    setEditingSection(null);
    setSectionName('A');
    setSectionCapacity(40);
    setSectionModalOpen(true);
  };

  const handleOpenEditSection = (classId, sec) => {
    setSelectedClassId(classId);
    setEditingSection(sec);
    setSectionName(sec.name);
    setSectionCapacity(sec.capacity);
    setSectionModalOpen(true);
  };

  const handleSaveSection = async (e) => {
    e.preventDefault();
    try {
      if (editingSection) {
        await classApi.updateSection(editingSection.id, {
          name: sectionName,
          capacity: sectionCapacity,
        });
        showSnackbar('Section updated successfully', 'success');
      } else {
        await classApi.addSection(selectedClassId, {
          name: sectionName,
          capacity: sectionCapacity,
        });
        showSnackbar('Section added successfully', 'success');
      }
      setSectionModalOpen(false);
      fetchClasses();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Error saving section', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'class') {
        await classApi.deleteClass(deleteTarget.id);
        showSnackbar('Class deleted successfully', 'success');
      } else {
        await classApi.deleteSection(deleteTarget.id);
        showSnackbar('Section deleted successfully', 'success');
      }
      setDeleteConfirmOpen(false);
      fetchClasses();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Delete operation failed', 'error');
    }
  };

  const canAdd = hasPermission('Classes', 'Add');
  const canEdit = hasPermission('Classes', 'Edit');
  const canDelete = hasPermission('Classes', 'Delete');

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Classes & Sections Master
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Define grade levels with display ordering and classroom sections with maximum capacity (FR-2.4 & BR-2.3)
          </Typography>
        </div>
        {canAdd && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAddClass}>
            Add Class
          </Button>
        )}
      </Box>

      {classes.map((cls) => (
        <Accordion key={cls.id} defaultExpanded sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: '#fafafa', px: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <ClassIcon color="primary" />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {cls.name}
                </Typography>
                <Chip label={`Display Order: ${cls.displayOrder}`} size="small" variant="outlined" />
                <Chip
                  label={`${cls.sections?.length || 0} Sections`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 1, mr: 2 }}>
                {canAdd && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenAddSection(cls.id);
                    }}
                  >
                    Add Section
                  </Button>
                )}
                {canEdit && (
                  <IconButton size="small" onClick={(e) => handleOpenEditClass(cls, e)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                )}
                {canDelete && (
                  <IconButton
                    size="small"
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget({ type: 'class', id: cls.id });
                      setDeleteConfirmOpen(true);
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 3 }}>
            {cls.sections?.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                No sections defined for this class. Click "Add Section" above.
              </Typography>
            ) : (
              <Grid container spacing={2}>
                {cls.sections.map((sec) => (
                  <Grid item xs={12} sm={6} md={4} key={sec.id}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderRadius: 2,
                      }}
                    >
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          Section: {sec.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Capacity: {sec.capacity} Students (BR-3.2)
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {canEdit && (
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleOpenEditSection(cls.id, sec)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        )}
                        {canDelete && (
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              setDeleteTarget({ type: 'section', id: sec.id });
                              setDeleteConfirmOpen(true);
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            )}
          </AccordionDetails>
        </Accordion>
      ))}

      {/* Class Modal */}
      <Modal
        open={classModalOpen}
        onClose={() => setClassModalOpen(false)}
        title={editingClass ? 'Edit Class' : 'Create New Class'}
        maxWidth="xs"
      >
        <Box component="form" onSubmit={handleSaveClass} sx={{ mt: 1 }}>
          <TextField
            required
            fullWidth
            label="Class Name (e.g. Class 1, Grade 1)"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            required
            fullWidth
            type="number"
            label="Display Order"
            value={displayOrder}
            onChange={(e) => setDisplayOrder(Number(e.target.value))}
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
            <Button onClick={() => setClassModalOpen(false)} color="inherit">
              Cancel
            </Button>
            <Button type="submit" variant="contained">
              Save Class
            </Button>
          </Box>
        </Box>
      </Modal>

      {/* Section Modal */}
      <Modal
        open={sectionModalOpen}
        onClose={() => setSectionModalOpen(false)}
        title={editingSection ? 'Edit Section' : 'Add Section to Class'}
        maxWidth="xs"
      >
        <Box component="form" onSubmit={handleSaveSection} sx={{ mt: 1 }}>
          <TextField
            required
            fullWidth
            label="Section Name (e.g. A, B, Green)"
            value={sectionName}
            onChange={(e) => setSectionName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            required
            fullWidth
            type="number"
            label="Student Capacity"
            helperText="Section capacity cannot be exceeded without Principal override (BR-3.2)"
            value={sectionCapacity}
            onChange={(e) => setSectionCapacity(Number(e.target.value))}
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
            <Button onClick={() => setSectionModalOpen(false)} color="inherit">
              Cancel
            </Button>
            <Button type="submit" variant="contained">
              Save Section
            </Button>
          </Box>
        </Box>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        title={deleteTarget?.type === 'class' ? 'Delete Class' : 'Delete Section'}
        message="Are you sure you want to remove this record? This action cannot be undone."
        confirmColor="error"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </Box>
  );
};
