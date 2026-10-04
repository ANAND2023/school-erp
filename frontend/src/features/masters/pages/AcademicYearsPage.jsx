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
  FormControlLabel,
  Checkbox,
  Grid,
} from '@mui/material';
import { Add as AddIcon, CheckCircle as CurrentIcon, RadioButtonUnchecked as NotCurrentIcon } from '@mui/icons-material';
import dayjs from 'dayjs';
import { DataGrid } from '../../../components/DataGrid';
import { Modal } from '../../../components/Modal';
import { academicYearApi } from '../api';
import { useUiStore } from '../../../store/uiStore';
import { usePermission } from '../../../hooks/usePermission';
import { useAcademicYear } from '../../../hooks/useAcademicYear';
import AppDatePicker from '../../../components/common/AppDatePicker';

export const AcademicYearsPage = () => {
  const { showSnackbar } = useUiStore();
  const { hasPermission } = usePermission();
  const { switchAcademicYear } = useAcademicYear();

  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('2027-28');
  const [startDate, setStartDate] = useState('2027-04-01');
  const [endDate, setEndDate] = useState('2028-03-31');
  const [isCurrent, setIsCurrent] = useState(false);

  const fetchAcademicYears = async () => {
    try {
      setLoading(true);
      const res = await academicYearApi.getAcademicYears();
      if (res.data.success) {
        setYears(res.data.data || []);
      }
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to load academic years', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAcademicYears();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await academicYearApi.createAcademicYear({
        name,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        isCurrent,
      });
      showSnackbar('Academic year created successfully', 'success');
      setModalOpen(false);
      fetchAcademicYears();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to create academic year', 'error');
    }
  };

  const handleSetCurrent = async (id) => {
    try {
      await academicYearApi.setCurrent(id);
      showSnackbar('Active academic session updated', 'success');
      switchAcademicYear(id);
      fetchAcademicYears();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to change current session', 'error');
    }
  };

  const columns = [
    { field: 'name', headerName: 'Academic Session', flex: 1, minWidth: 150 },
    {
      field: 'startDate',
      headerName: 'Start Date',
      flex: 1,
      minWidth: 130,
      renderCell: (params) => (params.value ? dayjs(params.value).format('DD MMM YYYY') : '-'),
    },
    {
      field: 'endDate',
      headerName: 'End Date',
      flex: 1,
      minWidth: 130,
      renderCell: (params) => (params.value ? dayjs(params.value).format('DD MMM YYYY') : '-'),
    },
    {
      field: 'isCurrent',
      headerName: 'Current Session',
      width: 160,
      renderCell: (params) =>
        params.value ? (
          <Chip label="Active Current Session" color="success" size="small" />
        ) : (
          <Chip label="Inactive" color="default" size="small" variant="outlined" />
        ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 170,
      sortable: false,
      renderCell: (params) => {
        const y = params.row;
        const canEdit = hasPermission('AcademicYears', 'Edit');
        if (y.isCurrent) return null;

        return (
          canEdit && (
            <Button
              size="small"
              variant="outlined"
              color="primary"
              onClick={() => handleSetCurrent(y.id)}
            >
              Set as Current
            </Button>
          )
        );
      },
    },
  ];

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Academic Years & Sessions
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure school sessions with date ranges and manage current active session (FR-2.2 & BR-2.1)
        </Typography>
      </Box>

      <DataGrid
        menuKey="AcademicYears"
        columns={columns}
        rows={years}
        loading={loading}
        onAddClick={() => setModalOpen(true)}
        addLabel="Add Academic Year"
      />

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create New Academic Session"
        maxWidth="xs"
      >
        <Box component="form" onSubmit={handleCreate} sx={{ mt: 1 }}>
          <TextField
            required
            fullWidth
            label="Session Name (e.g. 2027-28)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Box sx={{ mb: 2 }}>
            <AppDatePicker
              required
              label="Session Start Date"
              value={startDate}
              onChange={(e) => setStartDate(e.value)}
            />
          </Box>
          <Box sx={{ mb: 2 }}>
            <AppDatePicker
              required
              label="Session End Date"
              value={endDate}
              onChange={(e) => setEndDate(e.value)}
            />
          </Box>
          <FormControlLabel
            control={
              <Checkbox
                checked={isCurrent}
                onChange={(e) => setIsCurrent(e.target.checked)}
              />
            }
            label="Mark as current active session (BR-2.1)"
          />

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
            <Button onClick={() => setModalOpen(false)} color="inherit">
              Cancel
            </Button>
            <Button type="submit" variant="contained">
              Save Academic Year
            </Button>
          </Box>
        </Box>
      </Modal>
    </Box>
  );
};
