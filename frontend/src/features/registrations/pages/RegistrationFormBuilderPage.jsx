import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Paper,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  DragIndicator as DragIcon,
  Save as SaveIcon,
  Visibility as PreviewIcon,
  CheckCircle as CheckIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dynamicRegistrationApi } from '../api/dynamicRegistrationApi';
import { useAuthStore } from '../../../store/authStore';

const FIELD_TYPES = [
  { label: 'Single Line Text', value: 'text' },
  { label: 'Number', value: 'number' },
  { label: 'Email Address', value: 'email' },
  { label: 'Date Picker', value: 'date' },
  { label: 'Dropdown (Select)', value: 'select' },
  { label: 'Radio Buttons', value: 'radio' },
  { label: 'Checkbox', value: 'checkbox' },
  { label: 'Multi-line Text (Textarea)', value: 'textarea' },
  { label: 'File Upload (Photo/Doc)', value: 'file' },
];

export const RegistrationFormBuilderPage = () => {
  const queryClient = useQueryClient();
  const { activeAcademicYearId, activeAcademicYearName } = useAuthStore();

  const [formTitle, setFormTitle] = useState('School Registration Form');
  const [formDescription, setFormDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [applicationFee, setApplicationFee] = useState(500);
  const [fields, setFields] = useState([]);

  // Drag and drop state
  const [draggedIdx, setDraggedIdx] = useState(null);

  // Field Edit/Add Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [optionsInput, setOptionsInput] = useState('');

  // Live Preview Modal
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  const { data: configRes } = useQuery({
    queryKey: ['registration-form-config', activeAcademicYearId],
    queryFn: () => dynamicRegistrationApi.getFormConfig(activeAcademicYearId),
  });

  useEffect(() => {
    if (configRes?.data?.data) {
      const cfg = configRes.data.data;
      setFormTitle(cfg.formTitle || 'School Registration Form');
      setFormDescription(cfg.formDescription || '');
      setInstructions(cfg.instructions || '');
      setApplicationFee(cfg.applicationFee ?? 500);
      setFields(cfg.fields || []);
    }
  }, [configRes]);

  const saveMutation = useMutation({
    mutationFn: (payload) => dynamicRegistrationApi.saveFormConfig(payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['registration-form-config']);
      queryClient.invalidateQueries(['admission-form-config']);
      setSaveSuccessMsg('Registration form configuration saved successfully!');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    },
  });

  const handleDragStart = (e, index) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === index) return;
    const reordered = [...fields];
    const [moved] = reordered.splice(draggedIdx, 1);
    reordered.splice(index, 0, moved);
    setDraggedIdx(index);
    setFields(reordered);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
  };

  const openAddField = () => {
    setEditingField({
      id: 0,
      fieldKey: `custom_${Date.now()}`,
      fieldLabel: '',
      fieldType: 'text',
      placeholder: '',
      helpText: '',
      defaultValue: '',
      options: [],
      validationRules: { required: false },
      isSystemField: false,
      isVisibleOnSlip: true,
      gridSpan: 6,
    });
    setOptionsInput('');
    setEditModalOpen(true);
  };

  const openEditField = (field) => {
    setEditingField({ ...field, validationRules: { ...field.validationRules } });
    setOptionsInput(field.options ? field.options.join(', ') : '');
    setEditModalOpen(true);
  };

  const saveFieldModal = () => {
    if (!editingField.fieldLabel.trim()) return;

    let opts = editingField.options;
    if (['select', 'radio', 'checkbox'].includes(editingField.fieldType)) {
      opts = optionsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }

    const updated = {
      ...editingField,
      options: opts,
    };

    if (fields.some((f) => f.fieldKey === updated.fieldKey)) {
      setFields(fields.map((f) => (f.fieldKey === updated.fieldKey ? updated : f)));
    } else {
      setFields([...fields, updated]);
    }

    setEditModalOpen(false);
  };

  const removeField = (fieldKey) => {
    setFields(fields.filter((f) => f.fieldKey !== fieldKey));
  };

  const handleSaveForm = () => {
    const payload = {
      academicYearId: activeAcademicYearId,
      formTitle,
      formDescription,
      instructions,
      applicationFee: Number(applicationFee) || 0,
      fields: fields.map((f, idx) => ({
        ...f,
        displayOrder: idx + 1,
      })),
    };
    saveMutation.mutate(payload);
  };

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 } }}>
      {/* Header bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
        <Box>
          <Typography variant="h5" fontWeight={900} sx={{ color: '#0f172a' }}>
            Dynamic Registration Form Builder
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            Drag-and-drop to customize student registration fields for session <strong>{activeAcademicYearName || 'Current Session'}</strong>.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<PreviewIcon />}
            onClick={() => setPreviewOpen(true)}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Live Preview
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            onClick={handleSaveForm}
            disabled={saveMutation.isPending}
            sx={{ textTransform: 'none', fontWeight: 800 }}
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Configuration'}
          </Button>
        </Box>
      </Box>

      {saveSuccessMsg && (
        <Paper sx={{ p: 1.5, mb: 2, bgcolor: '#ecfdf5', border: '1px solid #6ee7b7', color: '#065f46', display: 'flex', alignItems: 'center', gap: 1, borderRadius: 2 }}>
          <CheckIcon color="success" />
          <Typography variant="subtitle2" fontWeight={700}>
            {saveSuccessMsg}
          </Typography>
        </Paper>
      )}

      <Grid container spacing={2.5}>
        {/* Left Column: Form Settings & Fee */}
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 2, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5, color: '#1e293b' }}>
                Form Settings & Fee
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Form Title"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  fullWidth
                  size="small"
                />
                <TextField
                  label="Registration / Application Fee (₹)"
                  type="number"
                  value={applicationFee}
                  onChange={(e) => setApplicationFee(e.target.value)}
                  fullWidth
                  size="small"
                />
                <TextField
                  label="Form Subtitle / Description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  fullWidth
                  size="small"
                  multiline
                  rows={2}
                />
                <TextField
                  label="Registration Instructions"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  fullWidth
                  size="small"
                  multiline
                  rows={3}
                />
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={openAddField}
                  sx={{
                    border: '2px dashed #0284c7',
                    color: '#0284c7',
                    fontWeight: 700,
                    textTransform: 'none',
                    py: 1,
                    '&:hover': { bgcolor: '#f0f9ff' },
                  }}
                >
                  Add Custom Field
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column: Interactive Drag & Drop Field Canvas */}
        <Grid item xs={12} md={8}>
          <Card sx={{ borderRadius: 2, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="subtitle1" fontWeight={800} sx={{ color: '#1e293b' }}>
                  Form Fields Canvas ({fields.length} Fields)
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  Drag handle to reorder • Click edit to configure
                </Typography>
              </Box>

              <Divider sx={{ mb: 2 }} />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                {fields.map((field, index) => {
                  const isRequired = field.validationRules?.required;
                  return (
                    <Paper
                      key={field.fieldKey}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      sx={{
                        p: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        border: '1px solid #cbd5e1',
                        borderRadius: 1.5,
                        bgcolor: draggedIdx === index ? '#f8fafc' : '#ffffff',
                        boxShadow: draggedIdx === index ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
                        cursor: 'grab',
                        '&:hover': { borderColor: '#94a3b8', bgcolor: '#fbfcfd' },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <DragIcon sx={{ color: '#94a3b8', cursor: 'grab' }} />
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#0f172a' }}>
                              {field.fieldLabel}
                            </Typography>
                            {isRequired && (
                              <Chip label="Required" size="small" color="error" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                            )}
                            <Chip
                              label={field.fieldType}
                              size="small"
                              sx={{ height: 20, fontSize: '0.65rem', bgcolor: '#e2e8f0', color: '#334155' }}
                            />
                            {field.isSystemField && (
                              <Tooltip title="Core System Field">
                                <LockIcon sx={{ fontSize: 15, color: '#64748b' }} />
                              </Tooltip>
                            )}
                          </Box>
                          <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                            Key: <code>{field.fieldKey}</code> • Span: {field.gridSpan === 12 ? 'Full Width' : 'Half Width'}
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <IconButton size="small" onClick={() => openEditField(field)}>
                          <EditIcon fontSize="small" sx={{ color: '#0284c7' }} />
                        </IconButton>
                        {!field.isSystemField && (
                          <IconButton size="small" onClick={() => removeField(field.fieldKey)}>
                            <DeleteIcon fontSize="small" sx={{ color: '#ef4444' }} />
                          </IconButton>
                        )}
                      </Box>
                    </Paper>
                  );
                })}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Field Editor Dialog */}
      <Dialog open={editModalOpen} onClose={() => setEditModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Configure Field</DialogTitle>
        <DialogContent dividers>
          {editingField && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField
                label="Field Label"
                value={editingField.fieldLabel}
                onChange={(e) => setEditingField({ ...editingField, fieldLabel: e.target.value })}
                fullWidth
                size="small"
                required
              />

              <FormControl fullWidth size="small">
                <InputLabel>Field Type</InputLabel>
                <Select
                  value={editingField.fieldType}
                  label="Field Type"
                  onChange={(e) => setEditingField({ ...editingField, fieldType: e.target.value })}
                >
                  {FIELD_TYPES.map((t) => (
                    <MenuItem key={t.value} value={t.value}>
                      {t.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {['select', 'radio', 'checkbox'].includes(editingField.fieldType) && (
                <TextField
                  label="Options (Comma separated)"
                  value={optionsInput}
                  onChange={(e) => setOptionsInput(e.target.value)}
                  placeholder="e.g. Science, Commerce, Arts"
                  fullWidth
                  size="small"
                  helperText="Enter available choices separated by commas"
                />
              )}

              <TextField
                label="Placeholder / Hint"
                value={editingField.placeholder || ''}
                onChange={(e) => setEditingField({ ...editingField, placeholder: e.target.value })}
                fullWidth
                size="small"
              />

              <FormControl fullWidth size="small">
                <InputLabel>Layout Width</InputLabel>
                <Select
                  value={editingField.gridSpan || 6}
                  label="Layout Width"
                  onChange={(e) => setEditingField({ ...editingField, gridSpan: Number(e.target.value) })}
                >
                  <MenuItem value={6}>Half Width (2 columns)</MenuItem>
                  <MenuItem value={12}>Full Width (1 column)</MenuItem>
                </Select>
              </FormControl>

              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(editingField.validationRules?.required)}
                    onChange={(e) =>
                      setEditingField({
                        ...editingField,
                        validationRules: { ...editingField.validationRules, required: e.target.checked },
                      })
                    }
                  />
                }
                label="Mandatory / Required Field"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={editingField.isVisibleOnSlip !== false}
                    onChange={(e) => setEditingField({ ...editingField, isVisibleOnSlip: e.target.checked })}
                  />
                }
                label="Print on Generated Registration Slip"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditModalOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveFieldModal}>
            Apply Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Live Form Preview Dialog */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 900, bgcolor: '#0284c7', color: '#ffffff' }}>
          Live Form Preview: {formTitle}
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          {formDescription && (
            <Typography variant="body2" sx={{ color: '#475569', mb: 2 }}>
              {formDescription}
            </Typography>
          )}
          <Grid container spacing={2}>
            {fields.map((f) => (
              <Grid item xs={12} sm={f.gridSpan || 6} key={f.fieldKey}>
                <Typography variant="caption" fontWeight={700} sx={{ color: '#334155', mb: 0.5, display: 'block' }}>
                  {f.fieldLabel} {f.validationRules?.required && <span style={{ color: '#ef4444' }}>*</span>}
                </Typography>
                {f.fieldType === 'textarea' ? (
                  <TextField fullWidth multiline rows={3} placeholder={f.placeholder} size="small" disabled />
                ) : f.fieldType === 'select' ? (
                  <FormControl fullWidth size="small" disabled>
                    <Select value="">
                      {(f.options || ['Option 1', 'Option 2']).map((o) => (
                        <MenuItem key={o} value={o}>
                          {o}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : (
                  <TextField fullWidth type={f.fieldType} placeholder={f.placeholder} size="small" disabled />
                )}
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Close Preview</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export const AdmissionFormBuilderPage = RegistrationFormBuilderPage;
export default RegistrationFormBuilderPage;
