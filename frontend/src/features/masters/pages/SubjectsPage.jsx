import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  MenuItem,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { DataGrid } from '../../../components/DataGrid';
import { Modal } from '../../../components/Modal';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { subjectApi } from '../api';
import { useUiStore } from '../../../store/uiStore';
import { usePermission } from '../../../hooks/usePermission';

export const SubjectsPage = () => {
  const { showSnackbar } = useUiStore();
  const { hasPermission } = usePermission();

  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [subjectName, setSubjectName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [subjectType, setSubjectType] = useState(1); // 1 = Scholastic, 2 = CoScholastic

  // Delete State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [targetSubjectId, setTargetSubjectId] = useState(null);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const res = await subjectApi.getSubjects();
      if (res.data.success) {
        setSubjects(res.data.data || []);
      }
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to load subjects', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const handleOpenAdd = () => {
    setEditingSubject(null);
    setSubjectName('');
    setSubjectCode('');
    setSubjectType(1);
    setModalOpen(true);
  };

  const handleOpenEdit = (s) => {
    setEditingSubject(s);
    setSubjectName(s.name);
    setSubjectCode(s.code);
    setSubjectType(s.type);
    setModalOpen(true);
  };

  const handleSave = async (e) => {
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
      setModalOpen(false);
      fetchSubjects();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Error saving subject', 'error');
    }
  };

  const handleDelete = async () => {
    if (!targetSubjectId) return;
    try {
      await subjectApi.deleteSubject(targetSubjectId);
      showSnackbar('Subject deleted successfully', 'success');
      setDeleteConfirmOpen(false);
      fetchSubjects();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to delete subject', 'error');
    }
  };

  const columns = [
    { field: 'code', headerName: 'Subject Code', width: 150 },
    { field: 'name', headerName: 'Subject Name', flex: 1, minWidth: 200 },
    {
      field: 'type',
      headerName: 'Category Type',
      width: 160,
      renderCell: (params) =>
        params.value === 1 ? (
          <Chip label="Scholastic" color="primary" size="small" />
        ) : (
          <Chip label="Co-Scholastic" color="secondary" size="small" />
        ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params) => {
        const s = params.row;
        const canEdit = hasPermission('Subjects', 'Edit');
        const canDelete = hasPermission('Subjects', 'Delete');

        return (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {canEdit && (
              <Tooltip title="Edit Subject">
                <IconButton size="small" color="primary" onClick={() => handleOpenEdit(s)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {canDelete && (
              <Tooltip title="Delete Subject">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => {
                    setTargetSubjectId(s.id);
                    setDeleteConfirmOpen(true);
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        );
      },
    },
  ];

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Subjects Master
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Define scholastic and co-scholastic course subjects (FR-2.5)
        </Typography>
      </Box>

      <DataGrid
        menuKey="Subjects"
        columns={columns}
        rows={subjects}
        loading={loading}
        onAddClick={handleOpenAdd}
        addLabel="Add Subject"
      />

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingSubject ? 'Edit Subject' : 'Create Subject'}
        maxWidth="xs"
      >
        <Box component="form" onSubmit={handleSave} sx={{ mt: 1 }}>
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
            label="Subject Code (e.g. MATH101, ENG01)"
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
            <Button onClick={() => setModalOpen(false)} color="inherit">
              Cancel
            </Button>
            <Button type="submit" variant="contained">
              Save Subject
            </Button>
          </Box>
        </Box>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete Subject"
        message="Are you sure you want to delete this subject? It cannot be removed if mapped to any class."
        confirmColor="error"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </Box>
  );
};
