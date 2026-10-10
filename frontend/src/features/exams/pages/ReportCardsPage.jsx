import React, { useState, useEffect } from 'react';
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
  Autocomplete,
  Checkbox,
  TextField,
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
} from '@mui/icons-material';
import { examApi } from '../api';
import api from '../../../api/client';
import { printWithTitle } from '../../../utils/printUtils';

const icon = <CheckBoxOutlineBlankIcon fontSize="small" />;
const checkedIcon = <CheckBoxIcon fontSize="small" />;
import { MultiTermReportCardSlip } from '../components/MultiTermReportCardSlip';
import { CceProgressReportCardSlip } from '../components/CceProgressReportCardSlip';

export const ReportCardsPage = () => {
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
        params: { classId: selectedClassId, sectionId: selectedSectionId || undefined, pageSize: 50 },
      });
      const list = res.data?.data?.items || res.data?.data || [];
      setStudents(list);
      if (list.length > 0) {
        setSelectedStudentIds([list[0].id]);
      } else {
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

  // Load CCE report card for selected student (Tab 0)
  useEffect(() => {
    if (selectedStudentIds.length > 0 && activeTab === 0) {
      loadCceReportCard(selectedStudentIds[0]);
    } else if (selectedStudentIds.length === 0) {
      setCceData(null);
    }
  }, [selectedStudentIds, activeTab]);

  const loadCceReportCard = async (studentId) => {
    if (!studentId) return;
    setCceLoading(true);
    try {
      const res = await examApi.getCceProgressReportCard(studentId);
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
    setCceBulkLoading(true);
    // We bypass the modal to print directly
    try {
      const res = await examApi.getCceClassProgressReportCards(selectedClassId, selectedSectionId || undefined);
      const allCards = res.data?.data || [];
      
      const missingStudents = [];
      const filtered = [];
      
      for (const sId of selectedStudentIds) {
         const card = allCards.find(c => {
            if (!c) return false;
            const cardStudentId = c.student?.studentId || c.Student?.StudentId;
            return cardStudentId == sId;
         });
         if (card) {
            filtered.push(card);
         } else {
            try {
               const singleRes = await examApi.getCceProgressReportCard(sId, selectedAcademicYearId || undefined);
               if (singleRes.data?.data) {
                  filtered.push(singleRes.data.data);
               } else {
                  const stObj = students.find(s => s.id == sId);
                  missingStudents.push(stObj ? (stObj.fullName || stObj.firstName || `Student ID ${sId}`) : `Student ID ${sId}`);
               }
            } catch (err) {
               const stObj = students.find(s => s.id == sId);
               missingStudents.push(stObj ? (stObj.fullName || stObj.firstName || `Student ID ${sId}`) : `Student ID ${sId}`);
            }
         }
      }

      if (missingStudents.length > 0) {
         setAlert({ type: 'error', message: `Cannot print. Missing data for: ${missingStudents.join(', ')}` });
         setCceBulkLoading(false);
         return; // Abort printing
      }

      setCceBulkData(filtered);
      // Wait for React to render the hidden print container, then print
      setTimeout(() => {
        handlePrintCceBulk();
        setCceBulkLoading(false);
      }, 1000); // slightly increased timeout for safety
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: `Failed to load class CCE report cards. Error: ${err.message}` });
      setCceBulkLoading(false);
    }
  };

  // Load Multi-Term report card for selected student (Tab 1)
  useEffect(() => {
    if (selectedStudentIds.length > 0 && activeTab === 1) {
      loadMultiTermReportCard(selectedStudentIds[0]);
    } else if (selectedStudentIds.length === 0) {
      setMultiTermData(null);
    }
  }, [selectedStudentIds, activeTab]);

  const loadMultiTermReportCard = async (studentId) => {
    if (!studentId) return;
    setMultiTermLoading(true);
    try {
      const res = await examApi.getMultiTermReportCard(studentId);
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
    setBulkLoading(true);
    // Bypass modal
    try {
      const res = await examApi.getMultiTermClassReportCards(selectedClassId, selectedSectionId || undefined);
      const allCards = res.data?.data || [];
      
      const missingStudents = [];
      const filtered = [];
      
      for (const sId of selectedStudentIds) {
         const card = allCards.find(c => {
            if (!c) return false;
            const cardStudentId = c.student?.studentId || c.Student?.StudentId;
            return cardStudentId == sId;
         });
         if (card) {
            filtered.push(card);
         } else {
            try {
               const singleRes = await examApi.getMultiTermReportCard(sId, selectedAcademicYearId || undefined);
               if (singleRes.data?.data) {
                  filtered.push(singleRes.data.data);
               } else {
                  const stObj = students.find(s => s.id == sId);
                  missingStudents.push(stObj ? (stObj.fullName || stObj.firstName || `Student ID ${sId}`) : `Student ID ${sId}`);
               }
            } catch (err) {
               const stObj = students.find(s => s.id == sId);
               missingStudents.push(stObj ? (stObj.fullName || stObj.firstName || `Student ID ${sId}`) : `Student ID ${sId}`);
            }
         }
      }

      if (missingStudents.length > 0) {
         setAlert({ type: 'error', message: `Cannot print. Missing data for: ${missingStudents.join(', ')}` });
         setBulkLoading(false);
         return; // Abort printing
      }

      setBulkData(filtered);
      setTimeout(() => {
        handlePrintBulk();
        setBulkLoading(false);
      }, 1000);
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
      <Stack className="no-print" direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="flex-start" spacing={2} sx={{ mb: 2.5 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h5" fontWeight={800} color="#0f2b48">
              Student Progress Report Cards
            </Typography>
            <Chip
              icon={<SparklesIcon sx={{ fontSize: 16 }} />}
              label="CCE 2-Term & CBSE Ready"
              size="small"
              color="primary"
              variant="filled"
              sx={{ fontWeight: 700 }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Generate, preview, and print comprehensive 2-Term CCE Progress Reports (Kush Public School format) or standard CBSE Term Cards.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5}>
          {activeTab === 0 ? (
            <>
              <Button
                variant="outlined"
                startIcon={<PrintIcon />}
                onClick={handleOpenCceBulkPrint}
                disabled={!selectedStudentIds.length}
                sx={{ borderColor: '#0f2b48', color: '#0f2b48', fontWeight: 700 }}
              >
                Print Selected ({selectedStudentIds.length})
              </Button>
              <Button
                variant="contained"
                startIcon={<PrintIcon />}
                onClick={handlePrintCce}
                disabled={!cceData}
                sx={{ bgcolor: '#0f2b48', '&:hover': { bgcolor: '#1e3a8a' }, fontWeight: 700 }}
              >
                Print Report Card
              </Button>
            </>
          ) : activeTab === 1 ? (
            <>
              <Button
                variant="outlined"
                startIcon={<PrintIcon />}
                onClick={handleOpenBulkPrint}
                disabled={!selectedStudentIds.length}
                sx={{ borderColor: '#0f2b48', color: '#0f2b48', fontWeight: 700 }}
              >
                Print Selected ({selectedStudentIds.length})
              </Button>
              <Button
                variant="contained"
                startIcon={<PrintIcon />}
                onClick={handlePrintMultiTerm}
                disabled={!multiTermData}
                sx={{ bgcolor: '#0f2b48', '&:hover': { bgcolor: '#1e3a8a' }, fontWeight: 700 }}
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
            >
              {loading ? 'Processing...' : 'Recalculate Results'}
            </Button>
          )}
        </Stack>
      </Stack>

      {/* Tabs */}
      <Paper className="no-print" sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(e, val) => setActiveTab(val)}
          indicatorColor="primary"
          textColor="primary"
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab
            label="CCE 2-Term Progress Report (Kush Public School Format)"
            sx={{ fontWeight: 700, textTransform: 'none', fontSize: '0.92rem' }}
          />
          <Tab
            label="Annual Multi-Term Report Card (Term 1, 2, 3 & Final)"
            sx={{ fontWeight: 700, textTransform: 'none', fontSize: '0.92rem' }}
          />
          <Tab
            label="Single Exam / Term-wise Results"
            sx={{ fontWeight: 700, textTransform: 'none', fontSize: '0.92rem' }}
          />
        </Tabs>
      </Paper>

      {alert && (
        <Alert className="no-print" severity={alert.type} sx={{ mb: 3 }} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      {/* Filters Card */}
      <Card className="no-print" sx={{ mb: 3, boxShadow: 1, borderRadius: 2 }}>
        <CardContent sx={{ p: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Class</InputLabel>
                <Select value={selectedClassId} label="Class" onChange={(e) => handleClassChange(e.target.value)}>
                  {classes.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Section</InputLabel>
                <Select
                  value={selectedSectionId}
                  label="Section"
                  onChange={(e) => setSelectedSectionId(e.target.value)}
                >
                  <MenuItem value="">All Sections</MenuItem>
                  {sections.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      Section {s.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {activeTab === 0 || activeTab === 1 ? (
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  multiple
                  size="small"
                  disableCloseOnSelect
                  options={students}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  value={students.filter(st => selectedStudentIds.includes(st.id))}
                  onChange={(e, newVal) => setSelectedStudentIds((newVal || []).map(v => v.id))}
                  getOptionLabel={(st) => {
                    const name = st.fullName || st.studentName || `${st.firstName || ''} ${st.lastName || ''}`.trim() || st.admissionNo || `Student #${st.id}`;
                    return `${st.rollNo ? `[Roll ${st.rollNo}] ` : ''}${name} ${st.admissionNo ? `(${st.admissionNo})` : ''}`;
                  }}
                  renderOption={(props, option, { selected }) => (
                    <li {...props} key={option.id}>
                      <Checkbox
                        icon={icon}
                        checkedIcon={checkedIcon}
                        style={{ marginRight: 8 }}
                        checked={selected}
                      />
                      {(() => {
                        const name = option.fullName || option.studentName || `${option.firstName || ''} ${option.lastName || ''}`.trim() || option.admissionNo || `Student #${option.id}`;
                        return `${option.rollNo ? `[Roll ${option.rollNo}] ` : ''}${name} ${option.admissionNo ? `(${option.admissionNo})` : ''}`;
                      })()}
                    </li>
                  )}
                  renderInput={(params) => (
                    <TextField 
                      {...params} 
                      label={selectedStudentIds.length > 0 ? `${selectedStudentIds.length} students selected` : "Select Student(s)"} 
                      placeholder="Search students..." 
                    />
                  )}
                  disabled={!students.length}
                />
              </Grid>
            ) : (
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Exam</InputLabel>
                  <Select
                    value={selectedExamId}
                    label="Exam"
                    onChange={(e) => setSelectedExamId(e.target.value)}
                    disabled={!exams.length}
                  >
                    {exams.map((ex) => (
                      <MenuItem key={ex.id} value={ex.id}>
                        {ex.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
          </Grid>

          {/* Quick Student Selection Chips */}
          {(activeTab === 0 || activeTab === 1) && students.length > 0 && (
            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', mr: 1 }}>
                Quick Select Student:
              </Typography>
              <Chip
                label="Select All"
                size="small"
                onClick={() => setSelectedStudentIds(students.map(s => s.id))}
                sx={{ mr: 0.5, bgcolor: '#e2e8f0', fontWeight: 600 }}
              />
              <Chip
                label="Clear All"
                size="small"
                onClick={() => setSelectedStudentIds([])}
                sx={{ mr: 1, bgcolor: '#e2e8f0', fontWeight: 600 }}
              />
              {students.map((st) => {
                const isSelected = selectedStudentIds.includes(st.id);
                const name = st.fullName || st.studentName || `${st.firstName || ''} ${st.lastName || ''}`.trim() || st.admissionNo || `Student #${st.id}`;
                const initial = name ? name[0].toUpperCase() : 'S';
                return (
                  <Chip
                    key={st.id}
                    avatar={<Avatar sx={{ width: 22, height: 22, fontSize: '0.75rem' }}>{initial}</Avatar>}
                    label={name}
                    clickable
                    color={isSelected ? 'primary' : 'default'}
                    variant={isSelected ? 'filled' : 'outlined'}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedStudentIds(prev => prev.filter(id => id !== st.id));
                      } else {
                        setSelectedStudentIds(prev => [...prev, st.id]);
                      }
                    }}
                    sx={{ fontWeight: isSelected ? 800 : 500 }}
                  />
                );
              })}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* ===================== TAB 0: CCE 2-TERM REPORT CARD PREVIEW ===================== */}
      {activeTab === 0 && (
        <Box className="no-print">
          {cceLoading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
              <CircularProgress size={40} />
              <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
                Loading CCE 2-Term Progress Report...
              </Typography>
            </Box>
          ) : cceData ? (
            <Box sx={{ bgcolor: '#f1f5f9', p: { xs: 1, sm: 2, md: 3 }, borderRadius: 2 }}>
              <CceProgressReportCardSlip data={cceData} />
            </Box>
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
              <Typography variant="body1" color="text.secondary">
                No student selected or data unavailable. Please select a student above.
              </Typography>
            </Paper>
          )}
        </Box>
      )}

      {/* ===================== TAB 1: MULTI-TERM REPORT CARD PREVIEW ===================== */}
      {activeTab === 1 && (
        <Box className="no-print">
          {multiTermLoading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
              <CircularProgress size={40} />
              <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
                Loading multi-term performance & remarks...
              </Typography>
            </Box>
          ) : multiTermData ? (
            <Box sx={{ bgcolor: '#f1f5f9', p: { xs: 1, sm: 2, md: 3 }, borderRadius: 2 }}>
              <MultiTermReportCardSlip data={multiTermData} />
            </Box>
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
              <Typography variant="body1" color="text.secondary">
                No report card data found. Please select a student with recorded exam marks.
              </Typography>
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
