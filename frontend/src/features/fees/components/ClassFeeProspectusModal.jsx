import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stack,
  Grid,
  CircularProgress,
  IconButton,
  TextField,
  MenuItem,
  Paper,
} from '@mui/material';
import {
  Print as PrintIcon,
  Close as CloseIcon,
  MenuBook as ProspectusIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { feesApi } from '../api';
import { classesApi } from '../../masters/api';
import { useAuthStore } from '../../../store/authStore';
import { printElement } from '../../../utils/printUtils';
import ClassFeeProspectusSlip from './ClassFeeProspectusSlip';

export default function ClassFeeProspectusModal({ open, onClose, initialClassId = '' }) {
  const { activeAcademicYearName, activeBranchId } = useAuthStore();

  const [selectedClassId, setSelectedClassId] = useState(initialClassId);
  const [selectedGroupId, setSelectedGroupId] = useState('');

  // Fetch classes
  const { data: classesRes } = useQuery({
    queryKey: ['classes-list', activeBranchId],
    queryFn: () => classesApi.getClasses(),
    enabled: open,
  });
  const classes = classesRes?.data?.data || [];

  // Fetch groups
  const { data: groupsRes } = useQuery({
    queryKey: ['fee-groups', activeBranchId],
    queryFn: () => feesApi.getGroups(),
    enabled: open,
  });
  const groups = groupsRes?.data?.data || [];

  // Auto-select initial class & group safely validate against current school data
  useEffect(() => {
    if (open) {
      if (classes.length > 0) {
        const found = classes.find((c) => String(c.id) === String(initialClassId));
        if (found) {
          setSelectedClassId(found.id);
        } else if (!selectedClassId || !classes.some((c) => String(c.id) === String(selectedClassId))) {
          setSelectedClassId(classes[0].id);
        }
      }
      if (groups.length > 0) {
        if (!selectedGroupId || !groups.some((g) => String(g.id) === String(selectedGroupId))) {
          setSelectedGroupId(groups[0].id);
        }
      }
    }
  }, [open, initialClassId, classes, groups, selectedClassId, selectedGroupId]);

  // Query Class Fee Summary
  const {
    data: summaryRes,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ['class-fee-summary', activeBranchId, selectedClassId, selectedGroupId],
    queryFn: () => feesApi.getClassFeeSummary(selectedClassId || undefined, selectedGroupId || undefined),
    enabled: open && !!selectedClassId,
  });

  const summary = summaryRes?.data?.data;

  const handlePrint = () => {
    if (!summary) return;
    printElement('modal-class-fee-prospectus-slip', {
      title: `FeeProspectus_${summary?.className || 'Class'}_${activeAcademicYearName || 'Prospectus'}`,
      pageSize: 'A4',
      orientation: 'portrait',
      margin: '8mm',
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: 'calc(100vh - 48px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        },
      }}
    >
      <DialogTitle
        sx={{
          m: 0,
          p: 2,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: '#0f172a',
          color: '#ffffff',
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <ProspectusIcon sx={{ color: '#38bdf8' }} />
          <Typography variant="h6" fontWeight={700}>
            Class Fee Structure & Prospectus Slip
          </Typography>
        </Stack>
        <IconButton onClick={onClose} sx={{ color: '#94a3b8', '&:hover': { color: '#ffffff' } }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent
        dividers
        sx={{
          p: { xs: 2, sm: 2.5 },
          bgcolor: '#f8fafc',
          flex: '1 1 auto',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Top Class Selector Filter Bar */}
        <Paper sx={{ p: 1.5, mb: 2, borderRadius: 2, border: '1px solid #e2e8f0' }} className="no-print">
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                size="small"
                label="Select Class for Enquiry / Fee Structure"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
              >
                {classes.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {groups.length > 1 && (
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Fee Category / Group"
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                >
                  {groups.map((g) => (
                    <MenuItem key={g.id} value={g.id}>
                      {g.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            )}
          </Grid>
        </Paper>

        {isLoading || isFetching ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <CircularProgress size={40} />
            <Typography variant="body2" color="#64748b" sx={{ mt: 1.5 }}>
              Loading fee structure for selected class...
            </Typography>
          </Box>
        ) : !summary ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <InfoIcon sx={{ fontSize: 48, color: '#94a3b8', mb: 1 }} />
            <Typography variant="h6" color="#475569">
              No Fee Structure Configured
            </Typography>
            <Typography variant="body2" color="#94a3b8">
              Fee structure has not been set up for this class yet.
            </Typography>
          </Box>
        ) : (
          /* Printable Document Container */
          <Box id="modal-class-fee-prospectus-slip">
            <ClassFeeProspectusSlip summary={summary} />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, flexShrink: 0, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0', justifyContent: 'space-between' }} className="no-print">
        <Button variant="outlined" onClick={onClose} color="inherit">
          Close
        </Button>
        <Button
          variant="contained"
          color="primary"
          startIcon={<PrintIcon />}
          onClick={handlePrint}
          disabled={!summary}
          sx={{ fontWeight: 700 }}
        >
          Print Fee Prospectus Slip
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export { ClassFeeProspectusModal };
