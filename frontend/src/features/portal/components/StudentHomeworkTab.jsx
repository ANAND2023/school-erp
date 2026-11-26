import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Paper,
  Stack,
  Tooltip,
  ButtonGroup
} from '@mui/material';
import {
  MenuBook as HomeworkIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  OpenInNew as OpenInNewIcon,
  Download as DownloadIcon,
  Close as CloseIcon,
  CalendarToday as CalendarIcon,
  AccessTime as TimeIcon,
  Person as TeacherIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { portalApi } from '../api';

export const StudentHomeworkTab = ({ studentId, primaryColor = '#1e3a8a' }) => {
  const [loading, setLoading] = useState(false);
  const [homeworkList, setHomeworkList] = useState([]);
  const [filter, setFilter] = useState('all'); // all, pending, past

  // Attachment Viewer Modal
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerFile, setViewerFile] = useState({ url: '', name: '', isPdf: false });

  // Detail Modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeItem, setActiveItem] = useState(null);

  useEffect(() => {
    if (studentId) {
      loadHomework();
    }
  }, [studentId, filter]);

  const loadHomework = async () => {
    setLoading(true);
    try {
      const res = await portalApi.getHomework({
        studentId,
        filter: filter !== 'all' ? filter : undefined
      });
      if (res.data?.success) {
        setHomeworkList(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load student homework', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenViewer = (url, name, isPdf) => {
    const fullUrl = url.startsWith('http') ? url : `http://localhost:5171${url}`;
    setViewerFile({ url: fullUrl, name, isPdf });
    setViewerOpen(true);
  };

  const handleOpenDetail = (item) => {
    setActiveItem(item);
    setDetailOpen(true);
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <Box sx={{ mt: 1 }}>
      {/* HEADER & FILTER BAR */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1.5 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
            <HomeworkIcon sx={{ color: primaryColor }} />
            Class Homework & Assignments
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
            View daily homework assigned by teachers, download worksheets, and check due dates.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ButtonGroup size="small" variant="outlined">
            <Button
              onClick={() => setFilter('all')}
              variant={filter === 'all' ? 'contained' : 'outlined'}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                bgcolor: filter === 'all' ? primaryColor : 'transparent',
                borderColor: primaryColor
              }}
            >
              All ({homeworkList.length})
            </Button>
            <Button
              onClick={() => setFilter('pending')}
              variant={filter === 'pending' ? 'contained' : 'outlined'}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                bgcolor: filter === 'pending' ? primaryColor : 'transparent',
                borderColor: primaryColor
              }}
            >
              Upcoming / Due
            </Button>
            <Button
              onClick={() => setFilter('past')}
              variant={filter === 'past' ? 'contained' : 'outlined'}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                bgcolor: filter === 'past' ? primaryColor : 'transparent',
                borderColor: primaryColor
              }}
            >
              Past Homework
            </Button>
          </ButtonGroup>

          <Tooltip title="Refresh">
            <IconButton onClick={loadHomework} size="small" sx={{ border: '1px solid #cbd5e1' }}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* CONTENT AREA */}
      {loading ? (
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <CircularProgress size={36} sx={{ color: primaryColor }} />
          <Typography variant="body2" sx={{ mt: 1.5, color: 'text.secondary', fontWeight: 500 }}>
            Loading homework assignments...
          </Typography>
        </Box>
      ) : homeworkList.length === 0 ? (
        <Paper variant="outlined" sx={{ py: 6, px: 2, textAlign: 'center', borderRadius: 2, bgcolor: '#f8fafc' }}>
          <HomeworkIcon sx={{ fontSize: 56, color: 'action.disabled', mb: 1.5 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
            No Homework Assigned
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 450, mx: 'auto', mt: 0.5 }}>
            {filter === 'pending'
              ? 'Great job! You have no pending homework due right now.'
              : 'There are currently no homework assignments posted for your class.'}
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2.5}>
          {homeworkList.map((hw) => {
            const isDueToday = hw.dueDate === todayStr;
            const isOverdue = hw.dueDate < todayStr && hw.status === 'Active';

            return (
              <Grid item xs={12} md={6} key={hw.id}>
                <Card
                  variant="outlined"
                  sx={{
                    borderRadius: 2.5,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s ease-in-out',
                    borderLeft: `5px solid ${isOverdue ? '#ef4444' : isDueToday ? '#f59e0b' : primaryColor}`,
                    '&:hover': {
                      boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                      borderColor: primaryColor
                    }
                  }}
                >
                  <CardContent sx={{ p: 2.5, flexGrow: 1 }}>
                    {/* Top Row: Subject & Due Date */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5, gap: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Chip
                          size="small"
                          label={hw.subject || 'General'}
                          sx={{
                            fontWeight: 700,
                            bgcolor: '#eff6ff',
                            color: '#1e40af',
                            border: '1px solid #bfdbfe'
                          }}
                        />
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                          Assigned: {hw.homeworkDate}
                        </Typography>
                      </Box>

                      {/* Urgency Badge */}
                      {isOverdue ? (
                        <Chip
                          size="small"
                          icon={<WarningIcon sx={{ fontSize: '14px !important' }} />}
                          label="Overdue"
                          color="error"
                          sx={{ fontWeight: 700, height: 24, fontSize: '0.72rem' }}
                        />
                      ) : isDueToday ? (
                        <Chip
                          size="small"
                          icon={<TimeIcon sx={{ fontSize: '14px !important' }} />}
                          label="Due Today"
                          color="warning"
                          sx={{ fontWeight: 700, height: 24, fontSize: '0.72rem' }}
                        />
                      ) : (
                        <Chip
                          size="small"
                          label={`Due: ${hw.dueDate}`}
                          variant="outlined"
                          sx={{ fontWeight: 600, height: 24, fontSize: '0.72rem', borderColor: '#cbd5e1' }}
                        />
                      )}
                    </Box>

                    {/* Title */}
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 800,
                        color: 'text.primary',
                        fontSize: '1.05rem',
                        lineHeight: 1.3,
                        mb: 1,
                        cursor: 'pointer',
                        '&:hover': { color: primaryColor }
                      }}
                      onClick={() => handleOpenDetail(hw)}
                    >
                      {hw.title}
                    </Typography>

                    {/* Description */}
                    {hw.description && (
                      <Typography
                        variant="body2"
                        sx={{
                          color: 'text.secondary',
                          mb: 2,
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          lineHeight: 1.5
                        }}
                      >
                        {hw.description}
                      </Typography>
                    )}

                    {/* Instructions */}
                    {hw.instructions && (
                      <Box sx={{ mb: 2, p: 1.25, bgcolor: '#f8fafc', borderRadius: 1.5, borderLeft: '3px solid #3b82f6' }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#1e3a8a', display: 'block' }}>
                          Instructions:
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {hw.instructions}
                        </Typography>
                      </Box>
                    )}

                    {/* Attachment preview box if exists */}
                    {hw.attachmentUrl && (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          p: 1.25,
                          borderRadius: 2,
                          bgcolor: '#f1f5f9',
                          border: '1px solid #e2e8f0',
                          mt: 1.5
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, overflow: 'hidden' }}>
                          {hw.isPdf ? (
                            <PdfIcon sx={{ color: '#ef4444', fontSize: 28, flexShrink: 0 }} />
                          ) : (
                            <Box
                              component="img"
                              src={hw.attachmentUrl.startsWith('http') ? hw.attachmentUrl : `http://localhost:5171${hw.attachmentUrl}`}
                              alt="Thumbnail"
                              sx={{ width: 34, height: 34, objectFit: 'cover', borderRadius: 1, border: '1px solid #cbd5e1', flexShrink: 0 }}
                            />
                          )}
                          <Box sx={{ overflow: 'hidden' }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }} noWrap>
                              {hw.attachmentFileName || (hw.isPdf ? 'Homework_Document.pdf' : 'Homework_Photo.jpg')}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              {hw.isPdf ? 'PDF Worksheet' : 'Photo / Image'}
                            </Typography>
                          </Box>
                        </Box>

                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => handleOpenViewer(hw.attachmentUrl, hw.attachmentFileName, hw.isPdf)}
                          sx={{
                            bgcolor: primaryColor,
                            textTransform: 'none',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            borderRadius: 1.5,
                            flexShrink: 0,
                            px: 1.5,
                            '&:hover': { bgcolor: primaryColor }
                          }}
                        >
                          {hw.isPdf ? 'Open PDF' : 'View Photo'}
                        </Button>
                      </Box>
                    )}
                  </CardContent>

                  <Divider />

                  {/* Card Footer */}
                  <Box sx={{ px: 2.5, py: 1.25, bgcolor: '#fafafa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <TeacherIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      {hw.teacher || 'Class Teacher'}
                    </Typography>

                    <Button
                      size="small"
                      onClick={() => handleOpenDetail(hw)}
                      sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.78rem', color: primaryColor }}
                    >
                      View Details &rarr;
                    </Button>
                  </Box>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* FULL ATTACHMENT VIEWER MODAL */}
      <Dialog
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2.5, height: viewerFile.isPdf ? '82vh' : 'auto' } }}
      >
        <DialogTitle sx={{ pb: 1, fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {viewerFile.isPdf ? <PdfIcon sx={{ color: '#ef4444' }} /> : <ImageIcon sx={{ color: '#3b82f6' }} />}
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
              {viewerFile.name || 'Attachment Preview'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Tooltip title="Open in new tab / Download">
              <IconButton size="small" component="a" href={viewerFile.url} target="_blank" rel="noopener noreferrer">
                <OpenInNewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <IconButton size="small" onClick={() => setViewerOpen(false)}>
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
              sx={{ width: '100%', height: '100%', border: 'none', borderRadius: 1.5 }}
            />
          ) : (
            <Box
              component="img"
              src={viewerFile.url}
              alt={viewerFile.name}
              sx={{
                maxWidth: '100%',
                maxHeight: '75vh',
                objectFit: 'contain',
                borderRadius: 1.5,
                boxShadow: 2
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* DETAIL MODAL */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Homework Details</span>
          <IconButton size="small" onClick={() => setDetailOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <Divider />
        {activeItem && (
          <DialogContent sx={{ pt: 2.5 }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary' }}>
                {activeItem.title}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 0.75, flexWrap: 'wrap' }}>
                <Chip size="small" label={activeItem.subject || 'General'} color="primary" sx={{ fontWeight: 700 }} />
                <Chip size="small" label={`Assigned: ${activeItem.homeworkDate}`} variant="outlined" />
                <Chip size="small" label={`Due: ${activeItem.dueDate}`} color="warning" sx={{ fontWeight: 700 }} />
              </Box>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                Teacher:
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {activeItem.teacher || 'Class Teacher'}
              </Typography>
            </Box>

            {activeItem.description && (
              <Box sx={{ mb: 2.5, p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>
                  Homework Questions / Tasks:
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {activeItem.description}
                </Typography>
              </Box>
            )}

            {activeItem.instructions && (
              <Box sx={{ mb: 2.5, p: 1.5, bgcolor: '#eff6ff', borderRadius: 2, border: '1px solid #bfdbfe' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#1e40af', textTransform: 'uppercase' }}>
                  Parent & Student Instructions:
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5, color: '#1e3a8a' }}>
                  {activeItem.instructions}
                </Typography>
              </Box>
            )}

            {activeItem.attachmentUrl && (
              <Box sx={{ mt: 2, p: 1.5, border: '1px solid #cbd5e1', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#f8fafc' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                  {activeItem.isPdf ? <PdfIcon sx={{ color: '#ef4444', fontSize: 32 }} /> : <ImageIcon sx={{ color: '#3b82f6', fontSize: 32 }} />}
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {activeItem.attachmentFileName || 'Homework Attachment'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {activeItem.isPdf ? 'PDF Worksheet' : 'Photo / Image'}
                    </Typography>
                  </Box>
                </Box>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => handleOpenViewer(activeItem.attachmentUrl, activeItem.attachmentFileName, activeItem.isPdf)}
                  sx={{ bgcolor: primaryColor, textTransform: 'none', fontWeight: 700, borderRadius: 1.5 }}
                >
                  View Attachment
                </Button>
              </Box>
            )}
          </DialogContent>
        )}
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDetailOpen(false)} sx={{ textTransform: 'none', fontWeight: 600 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
export default StudentHomeworkTab;
