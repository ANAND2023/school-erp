import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Stack,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tabs,
  Tab,
  CircularProgress,
  Avatar,
  Checkbox,
  TextField,
  InputAdornment,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Print as PrintIcon,
  Visibility as ViewIcon,
  Assessment as ResultIcon,
  School as SchoolIcon,
  EmojiEvents as RankIcon,
  Close as CloseIcon,
  Person as PersonIcon,
  AutoAwesome as SparklesIcon,
  CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon,
  CheckBox as CheckBoxIcon,
  Search as SearchIcon,
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  AssignmentOutlined as AssignmentIcon,
  RestartAlt as ResetIcon,
  FilterAltOff as FilterAltOffIcon,
} from '@mui/icons-material';
import { examApi } from '../api';
import api from '../../../api/client';
import { printWithTitle } from '../../../utils/printUtils';
import { useAcademicYear } from '../../../hooks/useAcademicYear';

const icon = <CheckBoxOutlineBlankIcon fontSize="small" />;
const checkedIcon = <CheckBoxIcon fontSize="small" />;
import { MultiTermReportCardSlip } from '../components/MultiTermReportCardSlip';
import { CceProgressReportCardSlip } from '../components/CceProgressReportCardSlip';

export const ReportCardsPage = () => {
  const { activeAcademicYearId, activeYearLabel } = useAcademicYear();

  // Tabs:
  // 0 -> CCE 2-Term Progress Report (Kush Public School Template)
  // 1 -> Multi-Term Annual Report Card (Term 1, 2, 3 & Final)
  // 2 -> Single Exam / Term-wise Results
  const [activeTab, setActiveTab] = useState(0);

  // Filters
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [sections, setSections] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState('');

  // Student list
  const [students, setStudents] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [previewStudentId, setPreviewStudentId] = useState(null);
  const [studentSearch, setStudentSearch] = useState('');

  // Helper to format student name cleanly
  const formatName = (str) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  // CCE 2-Term specific state (Tab 0)
  const [cceData, setCceData] = useState(null);
  const [cceLoading, setCceLoading] = useState(false);
  const [cceBulkData, setCceBulkData] = useState([]);
  const [cceBulkModalOpen, setCceBulkModalOpen] = useState(false);
  const [cceBulkLoading, setCceBulkLoading] = useState(false);

  // Multi-term specific state (Tab 1)
  const [multiTermData, setMultiTermData] = useState(null);
  const [multiTermLoading, setMultiTermLoading] = useState(false);
  const [bulkData, setBulkData] = useState([]);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Single Exam state (Tab 2)
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [resultsData, setResultsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [reportCardModal, setReportCardModal] = useState(false);
  const [selectedReportCard, setSelectedReportCard] = useState(null);
  const [cardLoading, setCardLoading] = useState(false);

  useEffect(() => {
    fetchInitial();
  }, []);

  const fetchInitial = async () => {
    try {
      const res = await api.get('/classes');
      const list = res.data?.data || [];
      setClasses(list);
      if (list.length > 0) {
        // Find UKG or Class 6 if available, or first
        const defaultClass =
          list.find((c) => c.name.toLowerCase().includes('ukg')) ||
          list.find((c) => c.name.toLowerCase().includes('6') || c.name.toLowerCase().includes('vi')) ||
          list[0];
        setSelectedClassId(defaultClass.id);
        const secs = defaultClass.sections || [];
        setSections(secs);
        if (secs.length > 0) setSelectedSectionId(secs[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClassChange = (classId) => {
    setSelectedClassId(classId);
    const found = classes.find((c) => c.id === classId);
    const secs = found?.sections || [];
    setSections(secs);
    if (secs.length > 0) setSelectedSectionId(secs[0].id);
    else setSelectedSectionId('');
  };

  // Fetch students for the selected class & section
  useEffect(() => {
    if (selectedClassId) {
      loadStudents();
      loadExams();
    }
  }, [selectedClassId, selectedSectionId]);

  const loadStudents = async () => {
    try {
      const res = await api.get('/students', {
        params: { classId: selectedClassId, sectionId: selectedSectionId || undefined, pageSize: 100 },
      });
      const list = res.data?.data?.items || res.data?.data || [];
      setStudents(list);
      if (list.length > 0) {
        setPreviewStudentId(list[0].id);
        setSelectedStudentIds(list.map((s) => s.id));
      } else {
        setPreviewStudentId(null);
        setSelectedStudentIds([]);
        setCceData(null);
        setMultiTermData(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadExams = async () => {
    try {
      const res = await examApi.getExams({ classId: selectedClassId });
      const list = res.data?.data || [];
      setExams(list);
      if (list.length > 0) setSelectedExamId(list[0].id);
      else {
        setSelectedExamId('');
        setResultsData(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Helper hooks for active student index & navigation
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students;
    const q = studentSearch.toLowerCase().trim();
    return students.filter((st) => {
      const name = (st.fullName || st.studentName || `${st.firstName || ''} ${st.lastName || ''}`).toLowerCase();
      const roll = String(st.rollNo || '').toLowerCase();
      const adm = String(st.admissionNo || '').toLowerCase();
      return name.includes(q) || roll.includes(q) || adm.includes(q);
    });
  }, [students, studentSearch]);

  const activeStudentIndex = students.findIndex((s) => String(s.id) === String(previewStudentId));
  const currentStudent = activeStudentIndex >= 0 ? students[activeStudentIndex] : students[0];

  const handleNextStudent = () => {
    if (activeStudentIndex >= 0 && activeStudentIndex < students.length - 1) {
      setPreviewStudentId(students[activeStudentIndex + 1].id);
    }
  };

  const handlePrevStudent = () => {
    if (activeStudentIndex > 0) {
      setPreviewStudentId(students[activeStudentIndex - 1].id);
    }
  };

  // Load CCE report card for active student (Tab 0)
  useEffect(() => {
    if (previewStudentId && activeTab === 0) {
      loadCceReportCard(previewStudentId);
    } else if (!previewStudentId) {
      setCceData(null);
    }
  }, [previewStudentId, activeTab, activeAcademicYearId]);

  const loadCceReportCard = async (studentId) => {
    if (!studentId) return;
    setCceLoading(true);
    try {
      const res = await examApi.getCceProgressReportCard(studentId, activeAcademicYearId || undefined);
      setCceData(res.data?.data || null);
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: 'Failed to load CCE progress report card.' });
    } finally {
      setCceLoading(false);
    }
  };

  // Load Bulk CCE cards for the entire class and trigger print directly
  const handleOpenCceBulkPrint = async () => {
    if (!selectedStudentIds.length) return;
    setCceBulkLoading(true);
    try {
      const res = await examApi.getCceClassProgressReportCards(selectedClassId, selectedSectionId || undefined);
      const allCards = res.data?.data || [];
      
      const missingStudents = [];
      const filtered = [];
      
      for (const sId of selectedStudentIds) {
         const card = allCards.find(c => {
            if (!c) return false;
            const cardStudentId = c.student?.studentId || c.Student?.StudentId;
            return String(cardStudentId) === String(sId);
         });
         if (card) {
            filtered.push(card);
         } else {
            try {
               const singleRes = await examApi.getCceProgressReportCard(sId, activeAcademicYearId || undefined);
               if (singleRes.data?.data) {
                  filtered.push(singleRes.data.data);
               } else {
                  const stObj = students.find(s => String(s.id) === String(sId));
                  missingStudents.push(stObj ? (stObj.fullName || stObj.firstName || `Student ID ${sId}`) : `Student ID ${sId}`);
               }
            } catch (err) {
               const stObj = students.find(s => String(s.id) === String(sId));
               missingStudents.push(stObj ? (stObj.fullName || stObj.firstName || `Student ID ${sId}`) : `Student ID ${sId}`);
            }
         }
      }

      if (missingStudents.length > 0) {
         setAlert({ type: 'warning', message: `Note: Missing exam data for: ${missingStudents.join(', ')}` });
      }

      if (filtered.length === 0) {
         setAlert({ type: 'error', message: 'No printable report card records found for selected students.' });
         setCceBulkLoading(false);
         return;
      }

      setCceBulkData(filtered);
      setTimeout(() => {
        handlePrintCceBulk();
        setCceBulkLoading(false);
      }, 800);
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: `Failed to load class CCE report cards. Error: ${err.message}` });
      setCceBulkLoading(false);
    }
  };

  // Load Multi-Term report card for active student (Tab 1)
  useEffect(() => {
    if (previewStudentId && activeTab === 1) {
      loadMultiTermReportCard(previewStudentId);
    } else if (!previewStudentId) {
      setMultiTermData(null);
    }
  }, [previewStudentId, activeTab, activeAcademicYearId]);

  const loadMultiTermReportCard = async (studentId) => {
    if (!studentId) return;
    setMultiTermLoading(true);
    try {
      const res = await examApi.getMultiTermReportCard(studentId, activeAcademicYearId || undefined);
      setMultiTermData(res.data?.data || null);
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: 'Failed to load multi-term report card.' });
    } finally {
      setMultiTermLoading(false);
    }
  };

  // Load Bulk Multi-Term cards for the entire class and trigger print directly
  const handleOpenBulkPrint = async () => {
    if (!selectedStudentIds.length) return;
    setBulkLoading(true);
    try {
      const res = await examApi.getMultiTermClassReportCards(selectedClassId, selectedSectionId || undefined);
      const allCards = res.data?.data || [];
      
      const missingStudents = [];
      const filtered = [];
      
      for (const sId of selectedStudentIds) {
         const card = allCards.find(c => {
            if (!c) return false;
            const cardStudentId = c.student?.studentId || c.Student?.StudentId;
            return String(cardStudentId) === String(sId);
         });
         if (card) {
            filtered.push(card);
         } else {
            try {
               const singleRes = await examApi.getMultiTermReportCard(sId, activeAcademicYearId || undefined);
               if (singleRes.data?.data) {
                  filtered.push(singleRes.data.data);
               } else {
                  const stObj = students.find(s => String(s.id) === String(sId));
                  missingStudents.push(stObj ? (stObj.fullName || stObj.firstName || `Student ID ${sId}`) : `Student ID ${sId}`);
               }
            } catch (err) {
               const stObj = students.find(s => String(s.id) === String(sId));
               missingStudents.push(stObj ? (stObj.fullName || stObj.firstName || `Student ID ${sId}`) : `Student ID ${sId}`);
            }
         }
      }

      if (missingStudents.length > 0) {
         setAlert({ type: 'warning', message: `Note: Missing data for: ${missingStudents.join(', ')}` });
      }

      if (filtered.length === 0) {
         setAlert({ type: 'error', message: 'No printable report card records found for selected students.' });
         setBulkLoading(false);
         return;
      }

      setBulkData(filtered);
      setTimeout(() => {
        handlePrintBulk();
        setBulkLoading(false);
      }, 800);
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: `Failed to load class report cards. Error: ${err.message}` });
      setBulkLoading(false);
    }
  };

  // Single Exam Results (Tab 2)
  useEffect(() => {
    if (selectedExamId && activeTab === 2) {
      loadResults();
    }
  }, [selectedExamId, selectedSectionId, activeTab]);

  const loadResults = async () => {
    setLoading(true);
    setAlert(null);
    try {
      const res = await examApi.processResults(selectedExamId, selectedSectionId || undefined);
      setResultsData(res.data?.data || null);
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to process results.' });
    } finally {
      setLoading(false);
    }
  };

  const handleViewReportCard = async (studentId) => {
    setCardLoading(true);
    setReportCardModal(true);
    try {
      const res = await examApi.getReportCard(studentId, selectedExamId);
      setSelectedReportCard(res.data?.data || null);
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: 'Failed to load report card details.' });
    } finally {
      setCardLoading(false);
    }
  };

  // Print Handlers
  const handlePrintCce = () => {
    const sName = cceData?.student?.studentName || 'Student';
    const roll = cceData?.student?.rollNo ? `_Roll${cceData.student.rollNo}` : '';
    printWithTitle(`CCE_Progress_Report_${sName}${roll}`);
  };

  const handlePrintCceBulk = () => {
    const cName = classes.find((c) => c.id === selectedClassId)?.name || 'Class';
    printWithTitle(`CCE_Progress_Reports_${cName}`);
  };

  const handlePrintMultiTerm = () => {
    const sName = multiTermData?.student?.studentName || 'Student';
    const roll = multiTermData?.student?.rollNo ? `_Roll${multiTermData.student.rollNo}` : '';
    printWithTitle(`Report_Card_${sName}${roll}_Annual`);
  };

  const handlePrintBulk = () => {
    const cName = classes.find((c) => c.id === selectedClassId)?.name || 'Class';
    printWithTitle(`Class_Report_Cards_${cName}`);
  };

  const handlePrintSingleExam = () => {
    const sName = selectedReportCard?.student?.fullName || 'Student';
    const admNo = selectedReportCard?.student?.admissionNo ? `_${selectedReportCard.student.admissionNo}` : '';
    const examName = selectedReportCard?.examName ? `_${selectedReportCard.examName}` : '';
    printWithTitle(`Report_Card_${sName}${admNo}${examName}`);
  };

  const studentsList = resultsData?.results || [];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <style>{`
        @media print {
          @page {
            margin: 5mm; /* Small margin removes browser headers/footers and gives max space */
            size: A4 portrait;
          }
          body, html {
            overflow: visible !important;
            height: auto !important;
            min-height: 100% !important;
            background-color: #fff !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Hide main dashboard components and root */
          #root, .MuiDrawer-root, header, nav, .sidebar, .no-print, .MuiBackdrop-root {
            display: none !important;
          }
          /* Fix Modal constraints to allow scrolling content to print */
          .MuiDialog-root {
            position: static !important;
            display: block !important;
            height: auto !important;
            overflow: visible !important;
            background-color: #fff !important;
            z-index: 999999 !important;
          }
          .MuiDialog-container, .MuiDialog-paper, .MuiDialogContent-root {
            position: static !important;
            display: block !important;
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            background: #fff !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          .MuiTableContainer-root {
            overflow: visible !important;
          }
          .MuiTable-root {
            min-width: auto !important;
            width: 100% !important;
          }
          .MuiTableCell-root {
            min-width: 0 !important;
            padding: 4px 4px !important;
          }
          /* Use break-before to avoid trailing blank pages and fix missing last card */
          .print-card-wrapper {
            page-break-before: always !important;
            break-before: page !important;
            page-break-after: auto !important;
            break-after: auto !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .print-card-wrapper:first-of-type {
            page-break-before: auto !important;
            break-before: auto !important;
          }
          .report-card-print-page {
            margin: 0 !important;
            box-shadow: none !important;
            width: 100% !important;
            max-width: none !important;
            zoom: 0.96;
          }
        }
      `}</style>
      {/* Header */}
      <Stack className="no-print" direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
            <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: 1.2, color: 'primary.main' }}>
              EXAMINATIONS & EVALUATIONS
            </Typography>
            {activeYearLabel && (
              <Chip
                icon={<SchoolIcon sx={{ fontSize: '14px !important' }} />}
                label={activeYearLabel}
                size="small"
                variant="outlined"
                sx={{ height: 20, fontSize: '0.72rem', fontWeight: 600, borderColor: '#cbd5e1' }}
              />
            )}
          </Stack>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Typography variant="h5" fontWeight={800} color="#0f2b48">
              Student Progress Report Cards
            </Typography>
            <Chip
              icon={<SparklesIcon sx={{ fontSize: 15 }} />}
              label="CCE 2-Term & CBSE Ready"
              size="small"
              color="primary"
              variant="filled"
              sx={{ fontWeight: 700, borderRadius: 1.5 }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Generate, preview, and print comprehensive 2-Term CCE Progress Reports (Kush Public School format) or standard CBSE Multi-Term Cards.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
          {activeTab === 0 ? (
            <>
              <Button
                variant="outlined"
                startIcon={cceBulkLoading ? <CircularProgress size={16} /> : <PrintIcon />}
                onClick={handleOpenCceBulkPrint}
                disabled={!selectedStudentIds.length || cceBulkLoading}
                sx={{
                  fontWeight: 700,
                  borderRadius: 2,
                  textTransform: 'none',
                  borderColor: '#cbd5e1',
                  color: '#1e293b',
                  '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' },
                }}
              >
                Print Selected ({selectedStudentIds.length})
              </Button>
              <Button
                variant="contained"
                startIcon={<PrintIcon />}
                onClick={handlePrintCce}
                disabled={!cceData || cceLoading}
                sx={{
                  fontWeight: 700,
                  borderRadius: 2,
                  textTransform: 'none',
                  boxShadow: 2,
                  px: 2.5,
                }}
              >
                Print Current Card
              </Button>
            </>
          ) : activeTab === 1 ? (
            <>
              <Button
                variant="outlined"
                startIcon={bulkLoading ? <CircularProgress size={16} /> : <PrintIcon />}
                onClick={handleOpenBulkPrint}
                disabled={!selectedStudentIds.length || bulkLoading}
                sx={{
                  fontWeight: 700,
                  borderRadius: 2,
                  textTransform: 'none',
                  borderColor: '#cbd5e1',
                  color: '#1e293b',
                  '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' },
                }}
              >
                Print Selected ({selectedStudentIds.length})
              </Button>
              <Button
                variant="contained"
                startIcon={<PrintIcon />}
                onClick={handlePrintMultiTerm}
                disabled={!multiTermData || multiTermLoading}
                sx={{
                  fontWeight: 700,
                  borderRadius: 2,
                  textTransform: 'none',
                  boxShadow: 2,
                  px: 2.5,
                }}
              >
                Print Multi-Term Card
              </Button>
            </>
          ) : (
            <Button
              variant="contained"
              color="primary"
              startIcon={<ResultIcon />}
              onClick={loadResults}
              disabled={loading || !selectedExamId}
              sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none', px: 2.5 }}
            >
              {loading ? 'Processing...' : 'Recalculate Results'}
            </Button>
          )}
        </Stack>
      </Stack>

      {/* Modern Segmented Tabs */}
      <Paper
        className="no-print"
        elevation={0}
        sx={{
          mb: 3,
          p: 0.75,
          bgcolor: '#f1f5f9',
          borderRadius: 3,
          border: '1px solid #e2e8f0',
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(e, val) => setActiveTab(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 44,
            '& .MuiTabs-indicator': {
              display: 'none',
            },
            '& .MuiTab-root': {
              minHeight: 40,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
              color: '#475569',
              transition: 'all 0.2s',
              mr: 1,
              px: 2.5,
              '&.Mui-selected': {
                color: '#0f172a',
                bgcolor: '#ffffff',
                fontWeight: 800,
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              },
              '&:hover:not(.Mui-selected)': {
                bgcolor: 'rgba(255,255,255,0.5)',
                color: '#1e293b',
              },
            },
          }}
        >
          <Tab
            icon={<SparklesIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label="CCE 2-Term Progress Report (Kush Public School Format)"
          />
          <Tab
            icon={<AssignmentIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label="Annual Multi-Term Report Card (Term 1, 2, 3 & Final)"
          />
          <Tab
            icon={<ResultIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label="Single Exam Results & Ranks"
          />
        </Tabs>
      </Paper>

      {alert && (
        <Alert className="no-print" severity={alert.type} sx={{ mb: 3, borderRadius: 2 }} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      {/* Filter & Student Roster Control Card */}
      <Card className="no-print" sx={{ mb: 3, borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.05)' }}>
        <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
          {/* Top Control Bar: Class, Section, and Search / Exam selection */}
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ fontWeight: 600 }}>Class</InputLabel>
                <Select
                  value={selectedClassId}
                  label="Class"
                  onChange={(e) => handleClassChange(e.target.value)}
                  sx={{ borderRadius: 2, bgcolor: '#ffffff' }}
                >
                  {classes.map((c) => (
                    <MenuItem key={c.id} value={c.id} sx={{ fontWeight: 600 }}>
                      {c.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={2.5}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ fontWeight: 600 }}>Section</InputLabel>
                <Select
                  value={selectedSectionId}
                  label="Section"
                  onChange={(e) => setSelectedSectionId(e.target.value)}
                  sx={{ borderRadius: 2, bgcolor: '#ffffff' }}
                >
                  <MenuItem value="">All Sections</MenuItem>
                  {sections.map((s) => (
                    <MenuItem key={s.id} value={s.id} sx={{ fontWeight: 600 }}>
                      Section {s.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {activeTab === 0 || activeTab === 1 ? (
              <>
                <Grid item xs={12} sm={6} md={3.5}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search by student name, roll, admission..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                      endAdornment: studentSearch ? (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setStudentSearch('')}>
                            <CloseIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </InputAdornment>
                      ) : null,
                    }}
                    sx={{
                      bgcolor: '#ffffff',
                      '& .MuiOutlinedInput-root': { borderRadius: 2 },
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Stack direction="row" spacing={1} justifyContent={{ xs: 'flex-start', md: 'flex-end' }} alignItems="center">
                    <Chip
                      label={`${students.length} Students`}
                      size="small"
                      sx={{ fontWeight: 700, bgcolor: '#f1f5f9', color: '#475569' }}
                    />
                    <Chip
                      label={`${selectedStudentIds.length} for Print`}
                      size="small"
                      color={selectedStudentIds.length > 0 ? 'primary' : 'default'}
                      variant={selectedStudentIds.length > 0 ? 'filled' : 'outlined'}
                      sx={{ fontWeight: 700 }}
                    />
                  </Stack>
                </Grid>
              </>
            ) : (
              <Grid item xs={12} md={6.5}>
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ fontWeight: 600 }}>Exam</InputLabel>
                  <Select
                    value={selectedExamId}
                    label="Exam"
                    onChange={(e) => setSelectedExamId(e.target.value)}
                    disabled={!exams.length}
                    sx={{ borderRadius: 2, bgcolor: '#ffffff' }}
                  >
                    {exams.map((ex) => (
                      <MenuItem key={ex.id} value={ex.id} sx={{ fontWeight: 600 }}>
                        {ex.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
          </Grid>

          {/* Interactive Student Roster Strip (Tab 0 & Tab 1) */}
          {(activeTab === 0 || activeTab === 1) && (
            <Box sx={{ mt: 2.5 }}>
              <Divider sx={{ mb: 2 }} />
              
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1} sx={{ mb: 1.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                  Student Roster — Click to preview card:
                </Typography>

                <Stack direction="row" spacing={1} alignItems="center">
                  <Button
                    size="small"
                    onClick={() => setSelectedStudentIds(students.map((s) => s.id))}
                    disabled={!students.length}
                    sx={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'none', py: 0.2, px: 1 }}
                  >
                    Select All ({students.length})
                  </Button>
                  <Typography variant="caption" color="text.secondary">|</Typography>
                  <Button
                    size="small"
                    onClick={() => setSelectedStudentIds([])}
                    disabled={!selectedStudentIds.length}
                    color="inherit"
                    sx={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'none', py: 0.2, px: 1, color: 'text.secondary' }}
                  >
                    Clear All
                  </Button>
                </Stack>
              </Stack>

              {students.length === 0 ? (
                <Box sx={{ p: 2, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: 2, border: '1px dashed #cbd5e1' }}>
                  <Typography variant="body2" color="text.secondary">
                    No students found for the selected class and section.
                  </Typography>
                </Box>
              ) : filteredStudents.length === 0 ? (
                <Box sx={{ p: 2, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: 2, border: '1px dashed #cbd5e1' }}>
                  <Typography variant="body2" color="text.secondary">
                    No students match search "{studentSearch}".{' '}
                    <Button size="small" onClick={() => setStudentSearch('')}>Reset Search</Button>
                  </Typography>
                </Box>
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 1,
                    maxHeight: 180,
                    overflowY: 'auto',
                    p: 0.5,
                    borderRadius: 2,
                    bgcolor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  {filteredStudents.map((st) => {
                    const isPreview = String(st.id) === String(previewStudentId);
                    const isChecked = selectedStudentIds.includes(st.id);
                    const rawName = st.fullName || st.studentName || `${st.firstName || ''} ${st.lastName || ''}`.trim() || st.admissionNo || `Student #${st.id}`;
                    const name = formatName(rawName);

                    return (
                      <Box
                        key={st.id}
                        onClick={() => setPreviewStudentId(st.id)}
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.75,
                          px: 1.25,
                          py: 0.5,
                          borderRadius: 2,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease-in-out',
                          bgcolor: isPreview ? '#eff6ff' : '#ffffff',
                          border: isPreview ? '2px solid #2563eb' : '1px solid #e2e8f0',
                          boxShadow: isPreview ? '0 2px 4px rgba(37,99,235,0.15)' : 'none',
                          '&:hover': {
                            bgcolor: isPreview ? '#eff6ff' : '#f1f5f9',
                            borderColor: isPreview ? '#2563eb' : '#cbd5e1',
                          },
                        }}
                      >
                        <Checkbox
                          size="small"
                          checked={isChecked}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isChecked) {
                              setSelectedStudentIds((prev) => prev.filter((id) => id !== st.id));
                            } else {
                              setSelectedStudentIds((prev) => [...prev, st.id]);
                            }
                          }}
                          sx={{ p: 0, '& .MuiSvgIcon-root': { fontSize: 18 } }}
                        />

                        {st.rollNo && (
                          <Chip
                            label={`#${st.rollNo}`}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              bgcolor: isPreview ? '#dbeafe' : '#e2e8f0',
                              color: isPreview ? '#1e40af' : '#475569',
                            }}
                          />
                        )}

                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: isPreview ? 800 : 500,
                            color: isPreview ? '#1d4ed8' : '#1e293b',
                            fontSize: '0.84rem',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {name}
                        </Typography>

                        {isPreview && (
                          <Chip
                            label="Viewing"
                            size="small"
                            color="primary"
                            sx={{
                              height: 18,
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              ml: 0.25,
                            }}
                          />
                        )}
                      </Box>
                    );
                  })}
                </Box>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* ===================== TAB 0: CCE 2-TERM REPORT CARD PREVIEW ===================== */}
      {activeTab === 0 && (
        <Box className="no-print">
          {cceLoading ? (
            <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3, border: '1px solid #e2e8f0' }}>
              <CircularProgress size={44} thickness={4} />
              <Typography variant="h6" fontWeight={700} sx={{ mt: 2, color: '#1e293b' }}>
                Loading CCE 2-Term Progress Report...
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Compiling scholastic, co-scholastic, and attendance evaluations
              </Typography>
            </Paper>
          ) : cceData ? (
            <Box>
              {/* Student Navigation Bar */}
              {students.length > 0 && (
                <Paper
                  elevation={0}
                  sx={{
                    mb: 2.5,
                    p: 1.5,
                    px: 2,
                    borderRadius: 2.5,
                    border: '1px solid #e2e8f0',
                    bgcolor: '#ffffff',
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    alignItems: { xs: 'stretch', md: 'center' },
                    justifyContent: 'space-between',
                    gap: 1.5,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<NavigateBeforeIcon />}
                      onClick={handlePrevStudent}
                      disabled={activeStudentIndex <= 0}
                      sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 1.5 }}
                    >
                      Previous
                    </Button>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#475569', px: 1 }}>
                      Student {activeStudentIndex + 1} of {students.length}
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      endIcon={<NavigateNextIcon />}
                      onClick={handleNextStudent}
                      disabled={activeStudentIndex >= students.length - 1}
                      sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 1.5 }}
                    >
                      Next
                    </Button>
                  </Stack>

                  {/* Active Student Pill */}
                  <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                    <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32, fontWeight: 700, fontSize: '0.85rem' }}>
                      {(currentStudent?.fullName || currentStudent?.studentName || 'S')[0]?.toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                        {formatName(currentStudent?.fullName || currentStudent?.studentName || currentStudent?.firstName || 'Student')}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {currentStudent?.rollNo ? `Roll #${currentStudent.rollNo} • ` : ''}
                        {currentStudent?.admissionNo ? `Adm: ${currentStudent.admissionNo}` : `ID: ${currentStudent?.id}`}
                      </Typography>
                    </Box>
                  </Stack>

                  {/* Actions */}
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Checkbox
                      size="small"
                      checked={selectedStudentIds.includes(previewStudentId)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStudentIds((prev) => [...prev, previewStudentId]);
                        } else {
                          setSelectedStudentIds((prev) => prev.filter((id) => id !== previewStudentId));
                        }
                      }}
                    />
                    <Typography variant="caption" sx={{ fontWeight: 600, color: '#475569', mr: 1 }}>
                      Include in Bulk Print
                    </Typography>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<PrintIcon />}
                      onClick={handlePrintCce}
                      sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 1.5 }}
                    >
                      Print This Card
                    </Button>
                  </Stack>
                </Paper>
              )}

              {/* Preview Sheet Container */}
              <Box
                sx={{
                  bgcolor: '#f1f5f9',
                  p: { xs: 1, sm: 2, md: 3 },
                  borderRadius: 3,
                  border: '1px solid #e2e8f0',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.03)',
                  overflowX: 'auto',
                }}
              >
                <CceProgressReportCardSlip data={cceData} />
              </Box>
            </Box>
          ) : (
            <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3, border: '1px dashed #cbd5e1', bgcolor: '#f8fafc' }}>
              <SchoolIcon sx={{ fontSize: 48, color: '#94a3b8', mb: 1.5 }} />
              <Typography variant="h6" fontWeight={700} color="#1e293b">
                No Student Report Card Loaded
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 450, mx: 'auto', mt: 0.5, mb: 2.5 }}>
                {students.length > 0
                  ? 'Click on any student in the roster above to view their CCE 2-Term Progress Report.'
                  : 'Please select a Class and Section with enrolled students to preview report cards.'}
              </Typography>
              {students.length > 0 && (
                <Button
                  variant="contained"
                  onClick={() => setPreviewStudentId(students[0]?.id)}
                  sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none' }}
                >
                  Preview First Student ({formatName(students[0]?.fullName || students[0]?.studentName)})
                </Button>
              )}
            </Paper>
          )}
        </Box>
      )}

      {/* ===================== TAB 1: MULTI-TERM REPORT CARD PREVIEW ===================== */}
      {activeTab === 1 && (
        <Box className="no-print">
          {multiTermLoading ? (
            <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3, border: '1px solid #e2e8f0' }}>
              <CircularProgress size={44} thickness={4} />
              <Typography variant="h6" fontWeight={700} sx={{ mt: 2, color: '#1e293b' }}>
                Loading Multi-Term Performance...
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Fetching multi-term scores, grades, and faculty remarks
              </Typography>
            </Paper>
          ) : multiTermData ? (
            <Box>
              {/* Student Navigation Bar */}
              {students.length > 0 && (
                <Paper
                  elevation={0}
                  sx={{
                    mb: 2.5,
                    p: 1.5,
                    px: 2,
                    borderRadius: 2.5,
                    border: '1px solid #e2e8f0',
                    bgcolor: '#ffffff',
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    alignItems: { xs: 'stretch', md: 'center' },
                    justifyContent: 'space-between',
                    gap: 1.5,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<NavigateBeforeIcon />}
                      onClick={handlePrevStudent}
                      disabled={activeStudentIndex <= 0}
                      sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 1.5 }}
                    >
                      Previous
                    </Button>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#475569', px: 1 }}>
                      Student {activeStudentIndex + 1} of {students.length}
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      endIcon={<NavigateNextIcon />}
                      onClick={handleNextStudent}
                      disabled={activeStudentIndex >= students.length - 1}
                      sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 1.5 }}
                    >
                      Next
                    </Button>
                  </Stack>

                  {/* Active Student Pill */}
                  <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                    <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32, fontWeight: 700, fontSize: '0.85rem' }}>
                      {(currentStudent?.fullName || currentStudent?.studentName || 'S')[0]?.toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                        {formatName(currentStudent?.fullName || currentStudent?.studentName || currentStudent?.firstName || 'Student')}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {currentStudent?.rollNo ? `Roll #${currentStudent.rollNo} • ` : ''}
                        {currentStudent?.admissionNo ? `Adm: ${currentStudent.admissionNo}` : `ID: ${currentStudent?.id}`}
                      </Typography>
                    </Box>
                  </Stack>

                  {/* Actions */}
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Checkbox
                      size="small"
                      checked={selectedStudentIds.includes(previewStudentId)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStudentIds((prev) => [...prev, previewStudentId]);
                        } else {
                          setSelectedStudentIds((prev) => prev.filter((id) => id !== previewStudentId));
                        }
                      }}
                    />
                    <Typography variant="caption" sx={{ fontWeight: 600, color: '#475569', mr: 1 }}>
                      Include in Bulk Print
                    </Typography>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<PrintIcon />}
                      onClick={handlePrintMultiTerm}
                      sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 1.5 }}
                    >
                      Print This Card
                    </Button>
                  </Stack>
                </Paper>
              )}

              {/* Preview Sheet Container */}
              <Box
                sx={{
                  bgcolor: '#f1f5f9',
                  p: { xs: 1, sm: 2, md: 3 },
                  borderRadius: 3,
                  border: '1px solid #e2e8f0',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.03)',
                  overflowX: 'auto',
                }}
              >
                <MultiTermReportCardSlip data={multiTermData} />
              </Box>
            </Box>
          ) : (
            <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3, border: '1px dashed #cbd5e1', bgcolor: '#f8fafc' }}>
              <AssignmentIcon sx={{ fontSize: 48, color: '#94a3b8', mb: 1.5 }} />
              <Typography variant="h6" fontWeight={700} color="#1e293b">
                No Multi-Term Card Available
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 450, mx: 'auto', mt: 0.5, mb: 2.5 }}>
                {students.length > 0
                  ? 'Click on any student in the roster above to view their Annual Multi-Term Report Card.'
                  : 'Please select a Class and Section with recorded exam marks.'}
              </Typography>
              {students.length > 0 && (
                <Button
                  variant="contained"
                  onClick={() => setPreviewStudentId(students[0]?.id)}
                  sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none' }}
                >
                  Preview First Student ({formatName(students[0]?.fullName || students[0]?.studentName)})
                </Button>
              )}
            </Paper>
          )}
        </Box>
      )}

      {/* ===================== TAB 2: SINGLE EXAM RESULTS TABLE ===================== */}
      {activeTab === 2 && (
        <Box className="no-print">
          {/* Results Overview Metrics */}
          {resultsData && (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6} sm={3}>
                <Card sx={{ bgcolor: '#eff6ff', borderRadius: 2 }}>
                  <CardContent sx={{ py: 2 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      TOTAL CANDIDATES
                    </Typography>
                    <Typography variant="h5" fontWeight={700} color="#1e40af">
                      {studentsList.length}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card sx={{ bgcolor: '#f0fdf4', borderRadius: 2 }}>
                  <CardContent sx={{ py: 2 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      PASSED
                    </Typography>
                    <Typography variant="h5" fontWeight={700} color="#15803d">
                      {studentsList.filter((s) => s.resultStatus === 'Pass').length}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card sx={{ bgcolor: '#fff1f2', borderRadius: 2 }}>
                  <CardContent sx={{ py: 2 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      NEEDS IMPROVEMENT
                    </Typography>
                    <Typography variant="h5" fontWeight={700} color="#b91c1c">
                      {studentsList.filter((s) => s.resultStatus !== 'Pass').length}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card sx={{ bgcolor: '#faf5ff', borderRadius: 2 }}>
                  <CardContent sx={{ py: 2 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      CLASS TOPPER %
                    </Typography>
                    <Typography variant="h5" fontWeight={700} color="#6b21a8">
                      {studentsList.length > 0
                        ? `${Math.max(...studentsList.map((s) => s.percentage))}%`
                        : '—'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* Results Table */}
          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table>
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Class Rank</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Sec Rank</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Roll No</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Student Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Section</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Total Marks</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Percentage</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Grade</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                      <CircularProgress size={30} />
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Processing exam results...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : studentsList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        No examination results found. Select an exam or click &ldquo;Recalculate Results&rdquo;.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  studentsList.map((st) => (
                    <TableRow key={st.studentId} hover>
                      <TableCell>
                        {st.classRank === 1 ? (
                          <Chip icon={<RankIcon />} label="1st (Topper)" size="small" color="warning" sx={{ fontWeight: 700 }} />
                        ) : st.classRank === 2 ? (
                          <Chip label="2nd" size="small" color="secondary" sx={{ fontWeight: 700 }} />
                        ) : st.classRank === 3 ? (
                          <Chip label="3rd" size="small" sx={{ fontWeight: 700 }} />
                        ) : (
                          `#${st.classRank}`
                        )}
                      </TableCell>
                      <TableCell>#{st.sectionRank}</TableCell>
                      <TableCell>{st.rollNo ? `#${st.rollNo}` : '—'}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{st.fullName}</TableCell>
                      <TableCell>{st.sectionName}</TableCell>
                      <TableCell align="right">
                        <strong>{st.totalObtained}</strong> / {st.totalMax}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {st.percentage}%
                      </TableCell>
                      <TableCell>
                        <Chip label={st.grade} size="small" color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
                      </TableCell>
                      <TableCell>
                        {st.resultStatus === 'Pass' ? (
                          <Chip label="Passed" size="small" color="success" />
                        ) : (
                          <Chip label="Failed" size="small" color="error" />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<ViewIcon />}
                          onClick={() => handleViewReportCard(st.studentId)}
                        >
                          Report Card
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* ===================== CCE BULK PRINT MODAL ===================== */}
      <Dialog
        open={cceBulkModalOpen}
        onClose={() => setCceBulkModalOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, bgcolor: '#f8fafc' } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, bgcolor: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
          <Box>
            <Typography variant="h6" fontWeight={800} color="#0f2b48">
              Class CCE 2-Term Progress Reports ({cceBulkData.length} Students)
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Print batch formatted for standard A4 pages matching Kush Public School layout.
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setCceBulkModalOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: { xs: 2, sm: 3 }, bgcolor: '#f1f5f9' }}>
          {cceBulkLoading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
              <CircularProgress size={40} />
              <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
                Preparing CCE progress reports for all students...
              </Typography>
            </Box>
          ) : cceBulkData.length === 0 ? (
            <Typography variant="body2" sx={{ textAlign: 'center', py: 4 }}>
              No student records found in this class.
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {cceBulkData.map((card, idx) => (
                <Box key={card.student?.studentId || card.student?.StudentId || idx}>
                  <CceProgressReportCardSlip data={card} />
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, bgcolor: '#ffffff', borderTop: '1px solid #e2e8f0' }}>
          <Button onClick={() => setCceBulkModalOpen(false)}>Close</Button>
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={handlePrintCceBulk}
            disabled={cceBulkData.length === 0}
            sx={{ bgcolor: '#0f2b48', '&:hover': { bgcolor: '#1e3a8a' }, fontWeight: 700 }}
          >
            Print All ({cceBulkData.length} Cards)
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===================== MULTI-TERM BULK PRINT MODAL ===================== */}
      <Dialog
        open={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, bgcolor: '#f8fafc' } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, bgcolor: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
          <Box>
            <Typography variant="h6" fontWeight={800} color="#0f2b48">
              Class Multi-Term Report Cards ({bulkData.length} Students)
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Print batch formatted for standard A4 pages with automatic page breaks.
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setBulkModalOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: { xs: 2, sm: 3 }, bgcolor: '#f1f5f9' }}>
          {bulkLoading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
              <CircularProgress size={40} />
              <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
                Preparing report cards for all students...
              </Typography>
            </Box>
          ) : bulkData.length === 0 ? (
            <Typography variant="body2" sx={{ textAlign: 'center', py: 4 }}>
              No student records found in this class.
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {bulkData.map((card, idx) => (
                <Box key={card.student?.studentId || idx}>
                  <MultiTermReportCardSlip data={card} />
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, bgcolor: '#ffffff', borderTop: '1px solid #e2e8f0' }}>
          <Button onClick={() => setBulkModalOpen(false)}>Close</Button>
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={handlePrintBulk}
            disabled={bulkData.length === 0}
            sx={{ bgcolor: '#0f2b48', '&:hover': { bgcolor: '#1e3a8a' }, fontWeight: 700 }}
          >
            Print All ({bulkData.length} Cards)
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===================== SINGLE EXAM REPORT CARD MODAL ===================== */}
      <Dialog
        open={reportCardModal}
        onClose={() => setReportCardModal(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Typography variant="h6" fontWeight={700}>
            CBSE Format Report Card
          </Typography>
          <IconButton size="small" onClick={() => setReportCardModal(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 4, bgcolor: '#ffffff' }}>
          {cardLoading || !selectedReportCard ? (
            <Typography variant="body2" sx={{ py: 6, textAlign: 'center' }}>
              Loading report card details...
            </Typography>
          ) : (
            <Box id="printable-report-card" sx={{ p: 2, border: '2px solid #1e3a8a', borderRadius: 2 }}>
              {/* Header */}
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Typography variant="h5" fontWeight={800} color="#1e3a8a" sx={{ letterSpacing: 1 }}>
                  {selectedReportCard.schoolName}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  Affiliated to CBSE, New Delhi (Affiliation No: {selectedReportCard.affiliationNo})
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  {selectedReportCard.address}
                </Typography>
                <Typography
                  variant="subtitle1"
                  fontWeight={700}
                  sx={{
                    mt: 1.5,
                    display: 'inline-block',
                    px: 3,
                    py: 0.5,
                    bgcolor: '#f1f5f9',
                    borderRadius: 1,
                    border: '1px solid #cbd5e1',
                  }}
                >
                  PROGRESS REPORT: {selectedReportCard.examName} ({selectedReportCard.academicYear})
                </Typography>
              </Box>

              {/* Student Details Grid */}
              <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: '#f8fafc', borderRadius: 1.5 }}>
                <Grid container spacing={1.5}>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">Student Name:</Typography>
                    <Typography variant="body2" fontWeight={700}>{selectedReportCard.student.fullName}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">Admission No:</Typography>
                    <Typography variant="body2" fontWeight={700}>{selectedReportCard.student.admissionNo}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">Class & Section:</Typography>
                    <Typography variant="body2" fontWeight={700}>
                      {selectedReportCard.student.className} - {selectedReportCard.student.sectionName}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">Roll Number:</Typography>
                    <Typography variant="body2" fontWeight={700}>{selectedReportCard.student.rollNo || '—'}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">Father&apos;s Name:</Typography>
                    <Typography variant="body2" fontWeight={600}>{selectedReportCard.student.fatherName}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">Mother&apos;s Name:</Typography>
                    <Typography variant="body2" fontWeight={600}>{selectedReportCard.student.motherName}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">Date of Birth:</Typography>
                    <Typography variant="body2">{selectedReportCard.student.dob}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">Attendance:</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {selectedReportCard.attendance.daysPresent} / {selectedReportCard.attendance.totalWorkingDays} ({selectedReportCard.attendance.percentage}%)
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              {/* Part 1: Scholastic Subjects Table */}
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: '#1e3a8a' }}>
                PART 1: ACADEMIC PERFORMANCE (SCHOLASTIC AREAS)
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Subject Code & Name</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Max Marks</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Pass Marks</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Marks Obtained</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Grade</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedReportCard.scholasticSubjects.map((sub, idx) => (
                      <TableRow key={idx}>
                        <TableCell sx={{ fontWeight: 500 }}>
                          {sub.subjectName} {sub.subjectCode ? `(${sub.subjectCode})` : ''}
                        </TableCell>
                        <TableCell align="center">{sub.maxMarks}</TableCell>
                        <TableCell align="center">{sub.passMarks}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700 }}>{sub.marksObtained}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700 }}>{sub.grade}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow sx={{ bgcolor: '#f8fafc' }}>
                      <TableCell sx={{ fontWeight: 700 }}>GRAND TOTAL / SUMMARY</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>{selectedReportCard.totalMaxMarks}</TableCell>
                      <TableCell align="center">—</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800, color: '#15803d' }}>
                        {selectedReportCard.totalObtainedMarks}
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800 }}>
                        {selectedReportCard.overallGrade}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Part 2: Co-Scholastic Activities */}
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: '#1e3a8a' }}>
                PART 2: CO-SCHOLASTIC ACTIVITIES & ATTITUDES (3-POINT SCALE A, B, C)
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Activity Area</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, width: 100 }}>Grade</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Remarks</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedReportCard.coScholastic.map((cs, idx) => (
                      <TableRow key={idx}>
                        <TableCell sx={{ fontWeight: 500 }}>{cs.activityName}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700 }}>{cs.grade}</TableCell>
                        <TableCell>{cs.remarks}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Remarks & Result */}
              <Paper variant="outlined" sx={{ p: 2, mb: 4, bgcolor: '#f8fafc' }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={8}>
                    <Typography variant="caption" color="text.secondary">Class Teacher Remarks:</Typography>
                    <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1 }}>
                      &ldquo;{selectedReportCard.remarks.teacherRemarks}&rdquo;
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Final Result:</Typography>
                    <Typography variant="subtitle2" fontWeight={700} color="#15803d">
                      {selectedReportCard.result} (Percentage: {selectedReportCard.percentage}%, Grade: {selectedReportCard.overallGrade})
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ border: '1px dashed #cbd5e1', p: 1.5, textAlign: 'center', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">Grading Scale:</Typography>
                      <Typography variant="caption" display="block">
                        A1 (91-100) | A2 (81-90) | B1 (71-80) | B2 (61-70)
                      </Typography>
                      <Typography variant="caption" display="block">
                        C1 (51-60) | C2 (41-50) | D (33-40) | E (Below 33)
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>

              {/* Signatures */}
              <Grid container spacing={2} sx={{ mt: 3, pt: 3 }}>
                <Grid item xs={4} sx={{ textAlign: 'center' }}>
                  <Box sx={{ borderTop: '1px solid #94a3b8', pt: 1 }}>
                    <Typography variant="caption" fontWeight={600}>Class Teacher Signature</Typography>
                  </Box>
                </Grid>
                <Grid item xs={4} sx={{ textAlign: 'center' }}>
                  <Box sx={{ borderTop: '1px solid #94a3b8', pt: 1 }}>
                    <Typography variant="caption" fontWeight={600}>Parent&apos;s Signature</Typography>
                  </Box>
                </Grid>
                <Grid item xs={4} sx={{ textAlign: 'center' }}>
                  <Box sx={{ borderTop: '1px solid #94a3b8', pt: 1 }}>
                    <Typography variant="caption" fontWeight={600}>Principal / Head</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setReportCardModal(false)}>Close</Button>
          <Button variant="contained" startIcon={<PrintIcon />} onClick={handlePrintSingleExam}>
            Print Report Card
          </Button>
        </DialogActions>
      </Dialog>
      {/* ===================== HIDDEN PRINT CONTAINERS ===================== */}
      {typeof document !== 'undefined' && createPortal(
        <Box className="print-only" sx={{ display: 'none', '@media print': { display: 'block', position: 'static', width: '100%', height: 'auto', bgcolor: '#fff' } }}>
          <Box sx={{ display: 'block' }}>
            {cceBulkData.map((card, idx) => (
              <Box className="print-card-wrapper" key={card.student?.studentId || card.student?.StudentId || idx}>
                <CceProgressReportCardSlip data={card} />
              </Box>
            ))}
          </Box>
          <Box sx={{ display: 'block' }}>
            {bulkData.map((card, idx) => (
              <Box className="print-card-wrapper" key={card.student?.studentId || idx}>
                <MultiTermReportCardSlip data={card} />
              </Box>
            ))}
          </Box>
        </Box>,
        document.body
      )}
    </Box>
  );
};

export default ReportCardsPage;
