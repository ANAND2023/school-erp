import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  MenuItem,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Tooltip,
  Alert,
  InputAdornment,
  Divider,
  Stack
} from '@mui/material';
import {
  MenuBook as HomeworkIcon,
  Add as AddIcon,
  Search as SearchIcon,
  CloudUpload as UploadIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  OpenInNew as OpenInNewIcon,
  Clear as ClearIcon,
  EventNote as CalendarIcon,
  AssignmentTurnedIn as CompleteIcon,
  School as ClassIcon,
  Person as TeacherIcon,
  Close as CloseIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';
import { homeworkApi } from '../api';
import { useAcademicYear } from '../../../hooks/useAcademicYear';
import { useThemeStore } from '../../../store/themeStore';
import { useUiStore } from '../../../store/uiStore';

export const HomeworkPage = () => {
  const { activeAcademicYearId, activeAcademicYearName } = useAcademicYear();
  const { currentColorHex } = useThemeStore();
  const primaryColor = currentColorHex || '#1e3a8a';
  const { showSnackbar } = useUiStore();

  const [loading, setLoading] = useState(false);
  const [homeworkList, setHomeworkList] = useState([]);
  const [meta, setMeta] = useState({ classes: [], subjects: [], teachers: [] });

  // Filters
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog State: Create / Edit
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    classId: '',
    sectionId: '',
    subjectId: '',
    teacherId: '',
    title: '',
    description: '',
    homeworkDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    instructions: '',
    status: 'Active'
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const fileInputRef = useRef(null);

  // Detail & Attachment Viewer Dialog
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedHomework, setSelectedHomework] = useState(null);
  const [viewerDialogOpen, setViewerDialogOpen] = useState(false);
  const [viewerFile, setViewerFile] = useState({ url: '', name: '', isPdf: false });

  // Delete Confirmation Dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  useEffect(() => {
    loadMeta();
  }, [activeAcademicYearId]);

  useEffect(() => {
    loadHomework();
  }, [activeAcademicYearId, selectedClassId, selectedSectionId, selectedSubjectId, statusFilter]);

  const loadMeta = async () => {
    try {
      const res = await homeworkApi.getHomeworkMeta();
      if (res.data?.success) {
        setMeta(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load homework metadata', err);
    }
  };

  const loadHomework = async () => {
    setLoading(true);
    try {
      const params = {
        academicYearId: activeAcademicYearId || undefined,
        classId: selectedClassId || undefined,
        sectionId: selectedSectionId || undefined,
        subjectId: selectedSubjectId || undefined,
        status: statusFilter !== 'All' ? statusFilter : undefined
      };
      const res = await homeworkApi.getHomeworkList(params);
      if (res.data?.success) {
        setHomeworkList(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load homework list', err);
      showSnackbar('Failed to load homework list.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateDialog = () => {
    setEditingId(null);
    setFormData({
      classId: selectedClassId || (meta.classes[0]?.id || ''),
      sectionId: '',
      subjectId: '',
      teacherId: '',
      title: '',
      description: '',
      homeworkDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      instructions: '',
      status: 'Active'
    });
    setSelectedFile(null);
    setFilePreview(null);
    setDialogOpen(true);
  };

  const handleOpenEditDialog = (hw) => {
    setEditingId(hw.id);
    setFormData({
      classId: hw.classId,
      sectionId: hw.sectionId || '',
      subjectId: hw.subjectId || '',
      teacherId: hw.teacherId || '',
      title: hw.title,
      description: hw.description || '',
      homeworkDate: hw.homeworkDate,
      dueDate: hw.dueDate,
      instructions: hw.instructions || '',
      status: hw.status
    });
    setSelectedFile(null);
    if (hw.attachmentUrl) {
      setFilePreview({
        url: hw.attachmentUrl,
        name: hw.attachmentFileName,
        isPdf: hw.isPdf,
        existing: true
      });
    } else {
      setFilePreview(null);
    }
    setDialogOpen(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      showSnackbar('File size exceeds 15 MB limit.', 'warning');
      return;
    }

    setSelectedFile(file);
    const isPdf = file.type.includes('pdf') || file.name.endsWith('.pdf');
    if (!isPdf && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (rev) => {
        setFilePreview({
          url: rev.target.result,
          name: file.name,
          isPdf: false,
          size: file.size
        });
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview({
        url: '',
        name: file.name,
        isPdf: true,
        size: file.size
      });
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.classId) {
      showSnackbar('Please select a class.', 'warning');
      return;
    }
    if (!formData.title.trim()) {
      showSnackbar('Homework title is required.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const formPayload = new FormData();
      formPayload.append('classId', formData.classId);
      if (formData.sectionId) formPayload.append('sectionId', formData.sectionId);
      if (formData.subjectId) formPayload.append('subjectId', formData.subjectId);
      if (formData.teacherId) formPayload.append('teacherId', formData.teacherId);
      formPayload.append('title', formData.title.trim());
      formPayload.append('description', formData.description || '');
      formPayload.append('homeworkDate', formData.homeworkDate);
      formPayload.append('dueDate', formData.dueDate);
      formPayload.append('instructions', formData.instructions || '');
      formPayload.append('status', formData.status);

      if (selectedFile) {
        formPayload.append('file', selectedFile);
      } else if (!filePreview && editingId) {
        formPayload.append('removeAttachment', 'true');
      }

      if (editingId) {
        await homeworkApi.updateHomework(editingId, formPayload);
        showSnackbar('Homework updated successfully!', 'success');
      } else {
        await homeworkApi.createHomework(formPayload);
        showSnackbar('Homework assigned successfully!', 'success');
      }

      setDialogOpen(false);
      loadHomework();
    } catch (err) {
      console.error('Error saving homework', err);
      const msg = err.response?.data?.message || 'Failed to save homework.';
      showSnackbar(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    try {
      await homeworkApi.deleteHomework(deleteTargetId);
      showSnackbar('Homework assignment deleted.', 'success');
      setDeleteDialogOpen(false);
      setDeleteTargetId(null);
      loadHomework();
    } catch (err) {
      console.error('Error deleting homework', err);
      showSnackbar('Failed to delete homework.', 'error');
    }
  };

  const handleOpenViewer = (url, name, isPdf) => {
    const fullUrl = url.startsWith('http') ? url : `http://localhost:5171${url}`;
    setViewerFile({ url: fullUrl, name, isPdf });
    setViewerDialogOpen(true);
  };

  const handleOpenDetail = async (hw) => {
    try {
      const res = await homeworkApi.getHomeworkById(hw.id);
      if (res.data?.success) {
        setSelectedHomework(res.data.data);
        setDetailDialogOpen(true);
      }
    } catch (err) {
      setSelectedHomework(hw);
      setDetailDialogOpen(true);
    }
  };

  // Selected Class sections
  const currentClassObj = meta.classes.find((c) => String(c.id) === String(formData.classId));
  const availableSections = currentClassObj?.sections || [];

  // Filtered list
  const filteredList = homeworkList.filter((hw) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      hw.title?.toLowerCase().includes(q) ||
      hw.className?.toLowerCase().includes(q) ||
      hw.subjectName?.toLowerCase().includes(q) ||
      hw.teacherName?.toLowerCase().includes(q)
    );
  });

  // Calculate statistics
  const todayStr = new Date().toISOString().split('T')[0];
  const totalCount = homeworkList.length;
  const activeCount = homeworkList.filter((h) => h.status === 'Active').length;
  const withAttachmentsCount = homeworkList.filter((h) => !!h.attachmentUrl).length;
  const dueTodayCount = homeworkList.filter((h) => h.dueDate === todayStr).length;

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
      {/* HEADER SECTION */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HomeworkIcon sx={{ fontSize: 32, color: primaryColor }} />
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.02em' }}>
              Class Homework & Assignments
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Assign daily class homework with PDF or photo attachments for students and parents.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Chip
            icon={<CalendarIcon sx={{ fontSize: 16 }} />}
            label={`Session: ${activeAcademicYearName || 'Current'}`}
            variant="outlined"
            color="primary"
            sx={{ fontWeight: 600, height: 32 }}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreateDialog}
            sx={{
              bgcolor: primaryColor,
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: 2,
              px: 2.5,
              '&:hover': { bgcolor: primaryColor, opacity: 0.9 }
            }}
          >
            Assign New Homework
          </Button>
        </Box>
      </Box>

      {/* KPI STATS CARDS */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card variant="outlined" sx={{ borderRadius: 2, borderLeft: `4px solid ${primaryColor}` }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase' }}>
                Total Homework
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: 'text.primary' }}>
                {totalCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card variant="outlined" sx={{ borderRadius: 2, borderLeft: '4px solid #10b981' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase' }}>
                Active Assignments
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: '#10b981' }}>
                {activeCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card variant="outlined" sx={{ borderRadius: 2, borderLeft: '4px solid #f59e0b' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase' }}>
                Due Today
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: '#f59e0b' }}>
                {dueTodayCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card variant="outlined" sx={{ borderRadius: 2, borderLeft: '4px solid #8b5cf6' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase' }}>
                With Attachments (PDF/Photo)
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: '#8b5cf6' }}>
                {withAttachmentsCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* FILTER TOOLBAR */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Grid container spacing={1.5} alignItems="center">
          <Grid item xs={12} sm={3}>
            <TextField
              size="small"
              fullWidth
              placeholder="Search homework, subject, teacher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                endAdornment: searchQuery ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchQuery('')}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null
              }}
            />
          </Grid>
          <Grid item xs={6} sm={2}>
            <TextField
              select
              size="small"
              fullWidth
              label="Class"
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setSelectedSectionId('');
              }}
            >
              <MenuItem value="">All Classes</MenuItem>
              {meta.classes.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={6} sm={2}>
            <TextField
              select
              size="small"
              fullWidth
              label="Section"
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              disabled={!selectedClassId}
            >
              <MenuItem value="">All Sections</MenuItem>
              {meta.classes
                .find((c) => String(c.id) === String(selectedClassId))
                ?.sections?.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name}
                  </MenuItem>
                ))}
            </TextField>
          </Grid>
          <Grid item xs={6} sm={2.5}>
            <TextField
              select
              size="small"
              fullWidth
              label="Subject"
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
            >
              <MenuItem value="">All Subjects</MenuItem>
              {meta.subjects.map((sub) => (
                <MenuItem key={sub.id} value={sub.id}>
                  {sub.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={6} sm={2.5}>
            <TextField
              select
              size="small"
              fullWidth
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="All">All Status</MenuItem>
              <MenuItem value="Active">Active</MenuItem>
              <MenuItem value="Evaluated">Evaluated</MenuItem>
              <MenuItem value="Archived">Archived</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      {/* TABLE / LIST OF HOMEWORK */}
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer>
          <Table size="medium">
            <TableHead sx={{ bgcolor: 'action.hover' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Class & Subject</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Title & Description</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Assigned Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Due Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Attachment</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Teacher</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                    <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                      Loading class homework...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : filteredList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    <HomeworkIcon sx={{ fontSize: 48, color: 'action.disabled', mb: 1, display: 'block', mx: 'auto' }} />
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      No homework assignments found
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                      Click "+ Assign New Homework" to post assignments for students and parents.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredList.map((hw) => {
                  const isDueToday = hw.dueDate === todayStr;
                  const isOverdue = hw.dueDate < todayStr && hw.status === 'Active';

                  return (
                    <TableRow key={hw.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ p: 0.75, bgcolor: '#eff6ff', borderRadius: 1.5, color: primaryColor }}>
                            <ClassIcon fontSize="small" />
                          </Box>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                              {hw.className} {hw.sectionName !== 'All Sections' ? `(${hw.sectionName})` : ''}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                              {hw.subjectName}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>

                      <TableCell sx={{ maxWidth: 320 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                          {hw.title}
                        </Typography>
                        {hw.description && (
                          <Typography
                            variant="caption"
                            sx={{
                              color: 'text.secondary',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              lineHeight: 1.3
                            }}
                          >
                            {hw.description}
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {hw.homeworkDate}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {hw.dueDate}
                          </Typography>
                          {isDueToday && (
                            <Chip size="small" label="Today" color="warning" sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }} />
                          )}
                          {isOverdue && (
                            <Chip size="small" label="Overdue" color="error" sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }} />
                          )}
                        </Box>
                      </TableCell>

                      <TableCell>
                        {hw.attachmentUrl ? (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={hw.isPdf ? <PdfIcon sx={{ color: '#ef4444' }} /> : <ImageIcon sx={{ color: '#3b82f6' }} />}
                            onClick={() => handleOpenViewer(hw.attachmentUrl, hw.attachmentFileName, hw.isPdf)}
                            sx={{
                              textTransform: 'none',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              py: 0.25,
                              px: 1,
                              borderRadius: 1.5
                            }}
                          >
                            {hw.isPdf ? 'View PDF' : 'View Photo'}
                          </Button>
                        ) : (
                          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                            No file
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                          {hw.teacherName || '—'}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Chip
                          size="small"
                          label={hw.status}
                          color={hw.status === 'Active' ? 'success' : 'default'}
                          variant="outlined"
                          sx={{ height: 22, fontWeight: 700, fontSize: '0.72rem' }}
                        />
                      </TableCell>

                      <TableCell align="center">
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          <Tooltip title="View Details">
                            <IconButton size="small" color="primary" onClick={() => handleOpenDetail(hw)}>
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit Homework">
                            <IconButton size="small" color="info" onClick={() => handleOpenEditDialog(hw)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => {
                                setDeleteTargetId(hw.id);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* CREATE / EDIT HOMEWORK DIALOG */}
      <Dialog open={dialogOpen} onClose={() => !submitting && setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ pb: 1, fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HomeworkIcon sx={{ color: primaryColor }} />
            <span>{editingId ? 'Edit Homework Assignment' : 'Assign New Class Homework'}</span>
          </Box>
          <IconButton size="small" onClick={() => setDialogOpen(false)} disabled={submitting}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <Divider />

        <form onSubmit={handleSubmit}>
          <DialogContent sx={{ pt: 2.5 }}>
            <Grid container spacing={2}>
              {/* Class & Section Selection */}
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  required
                  fullWidth
                  size="small"
                  label="Select Class"
                  value={formData.classId}
                  onChange={(e) => {
                    setFormData({ ...formData, classId: e.target.value, sectionId: '' });
                  }}
                >
                  {meta.classes.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Section (Optional)"
                  value={formData.sectionId}
                  onChange={(e) => setFormData({ ...formData, sectionId: e.target.value })}
                  helperText="Leave empty to assign to All Sections of the class"
                >
                  <MenuItem value="">All Sections</MenuItem>
                  {availableSections.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* Subject & Teacher Selection */}
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Subject"
                  value={formData.subjectId}
                  onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                >
                  <MenuItem value="">General / Class Work</MenuItem>
                  {meta.subjects.map((sub) => (
                    <MenuItem key={sub.id} value={sub.id}>
                      {sub.name} {sub.code ? `(${sub.code})` : ''}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Assigning Teacher"
                  value={formData.teacherId}
                  onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                >
                  <MenuItem value="">Current Logged-in Teacher / Admin</MenuItem>
                  {meta.teachers.map((t) => (
                    <MenuItem key={t.id} value={t.id}>
                      {t.name} {t.employeeCode ? `[${t.employeeCode}]` : ''}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* Title */}
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  size="small"
                  label="Homework Title / Topic"
                  placeholder="e.g. Mathematics Chapter 4 - Quadratic Equations Ex 4.2"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </Grid>

              {/* Dates */}
              <Grid item xs={12} sm={6}>
                <TextField
                  type="date"
                  required
                  fullWidth
                  size="small"
                  label="Assigned Date"
                  value={formData.homeworkDate}
                  onChange={(e) => setFormData({ ...formData, homeworkDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  type="date"
                  required
                  fullWidth
                  size="small"
                  label="Submission Due Date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              {/* Description */}
              <Grid item xs={12}>
                <TextField
                  multiline
                  rows={3}
                  fullWidth
                  size="small"
                  label="Homework Description / Questions"
                  placeholder="Detail out the exercise numbers, questions, page numbers, or guidelines for students..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </Grid>

              {/* Instructions / Notes */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="Parent / Student Instructions (Optional)"
                  placeholder="e.g. Please submit in rough notebook, check signatures, etc."
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                />
              </Grid>

              {/* FILE UPLOAD (PDF OR PHOTO) */}
              <Grid item xs={12}>
                <Box
                  sx={{
                    border: '2px dashed #93c5fd',
                    borderRadius: 2,
                    p: 2.5,
                    bgcolor: '#f8fafc',
                    textAlign: 'center'
                  }}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*,application/pdf,.pdf,.jpg,.jpeg,.png,.webp"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />

                  {!filePreview ? (
                    <Box>
                      <UploadIcon sx={{ fontSize: 40, color: primaryColor, mb: 1 }} />
                      <Typography variant="body1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                        Upload Homework PDF or Photo / Image
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
                        Upload textbook questions, handwritten notes, worksheets, or guidelines (Max: 15 MB)
                      </Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<UploadIcon />}
                        onClick={() => fileInputRef.current?.click()}
                        sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5 }}
                      >
                        Choose PDF or Image
                      </Button>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#fff', p: 1.5, borderRadius: 1.5, border: '1px solid #e2e8f0' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        {filePreview.isPdf ? (
                          <PdfIcon sx={{ fontSize: 36, color: '#ef4444' }} />
                        ) : (
                          <Box
                            component="img"
                            src={filePreview.url.startsWith('http') || filePreview.url.startsWith('data:') ? filePreview.url : `http://localhost:5171${filePreview.url}`}
                            alt="Preview"
                            sx={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 1, border: '1px solid #cbd5e1' }}
                          />
                        )}
                        <Box sx={{ textAlign: 'left' }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                            {filePreview.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {filePreview.isPdf ? 'PDF Document' : 'Photo / Image'}
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          variant="text"
                          color="primary"
                          onClick={() => fileInputRef.current?.click()}
                          sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                        >
                          Change
                        </Button>
                        <IconButton size="small" color="error" onClick={handleRemoveFile}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  )}
                </Box>
              </Grid>
            </Grid>
          </DialogContent>

          <Divider />

          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setDialogOpen(false)} disabled={submitting} sx={{ textTransform: 'none', fontWeight: 600 }}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
              sx={{
                bgcolor: primaryColor,
                fontWeight: 700,
                textTransform: 'none',
                px: 3,
                '&:hover': { bgcolor: primaryColor }
              }}
            >
              {submitting ? <CircularProgress size={20} color="inherit" /> : editingId ? 'Update Homework' : 'Assign Homework'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ATTACHMENT VIEWER MODAL (PDF & PHOTO) */}
      <Dialog
        open={viewerDialogOpen}
        onClose={() => setViewerDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2, height: viewerFile.isPdf ? '80vh' : 'auto' } }}
      >
        <DialogTitle sx={{ pb: 1, fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {viewerFile.isPdf ? <PdfIcon sx={{ color: '#ef4444' }} /> : <ImageIcon sx={{ color: '#3b82f6' }} />}
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
              {viewerFile.name || 'Attachment Preview'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Tooltip title="Open in new tab">
              <IconButton size="small" component="a" href={viewerFile.url} target="_blank" rel="noopener noreferrer">
                <OpenInNewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <IconButton size="small" onClick={() => setViewerDialogOpen(false)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ p: 1.5, textAlign: 'center', bgcolor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {viewerFile.isPdf ? (
            <Box
              component="iframe"
              src={viewerFile.url}
              title={viewerFile.name}
              sx={{ width: '100%', height: '100%', border: 'none', borderRadius: 1 }}
            />
          ) : (
            <Box
              component="img"
              src={viewerFile.url}
              alt={viewerFile.name}
              sx={{
                maxWidth: '100%',
                maxHeight: '70vh',
                objectFit: 'contain',
                borderRadius: 1,
                boxShadow: 2
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* DETAIL MODAL */}
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Homework Assignment Details</span>
          <IconButton size="small" onClick={() => setDetailDialogOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <Divider />
        {selectedHomework && (
          <DialogContent sx={{ pt: 2 }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary' }}>
                {selectedHomework.title}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                <Chip size="small" label={`Class: ${selectedHomework.className}`} color="primary" variant="outlined" />
                <Chip size="small" label={`Section: ${selectedHomework.sectionName}`} variant="outlined" />
                <Chip size="small" label={`Subject: ${selectedHomework.subjectName}`} color="secondary" variant="outlined" />
              </Box>
            </Box>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Assigned Date:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {selectedHomework.homeworkDate}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Submission Due Date:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#ef4444' }}>
                  {selectedHomework.dueDate}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Assigned Teacher:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {selectedHomework.teacherName || '—'}
                </Typography>
              </Grid>
            </Grid>

            {selectedHomework.description && (
              <Box sx={{ mb: 2, p: 1.5, bgcolor: '#f1f5f9', borderRadius: 1.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>
                  Questions / Description:
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                  {selectedHomework.description}
                </Typography>
              </Box>
            )}

            {selectedHomework.instructions && (
              <Box sx={{ mb: 2, p: 1.5, bgcolor: '#eff6ff', borderRadius: 1.5, border: '1px solid #bfdbfe' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#1e40af', textTransform: 'uppercase' }}>
                  Instructions:
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5, color: '#1e3a8a' }}>
                  {selectedHomework.instructions}
                </Typography>
              </Box>
            )}

            {selectedHomework.attachmentUrl && (
              <Box sx={{ mt: 2, p: 1.5, border: '1px solid #e2e8f0', borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {selectedHomework.isPdf ? <PdfIcon sx={{ color: '#ef4444' }} /> : <ImageIcon sx={{ color: '#3b82f6' }} />}
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {selectedHomework.attachmentFileName || 'Homework Attachment'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {selectedHomework.isPdf ? 'PDF Document' : 'Photo / Image'}
                    </Typography>
                  </Box>
                </Box>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => handleOpenViewer(selectedHomework.attachmentUrl, selectedHomework.attachmentFileName, selectedHomework.isPdf)}
                  sx={{ bgcolor: primaryColor, textTransform: 'none', fontWeight: 600, borderRadius: 1.5 }}
                >
                  View Attachment
                </Button>
              </Box>
            )}
          </DialogContent>
        )}
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDetailDialogOpen(false)} sx={{ textTransform: 'none', fontWeight: 600 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* DELETE CONFIRMATION */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Delete Homework?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Are you sure you want to delete this homework assignment? Students and parents will no longer see it in their portal.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} sx={{ textTransform: 'none', fontWeight: 600 }}>
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={handleDeleteConfirm} sx={{ textTransform: 'none', fontWeight: 700 }}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
export default HomeworkPage;
