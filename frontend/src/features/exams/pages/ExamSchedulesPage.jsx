import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
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
  Stack,
  Alert,
  Tooltip,
  Drawer,
  Divider,
  Stepper,
  Step,
  StepLabel,
  Checkbox,
  ListItemText,
  OutlinedInput,
  Tabs,
  Tab,
  CircularProgress,
  InputAdornment,
  ToggleButtonGroup,
  ToggleButton,
  Badge,
  Autocomplete,
  Snackbar,
} from '@mui/material';
import {
  Add as AddIcon,
  Event as EventIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  Publish as PublishIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Assignment as ExamIcon,
  CalendarMonth as CalendarIcon,
  AutoAwesome as SparklesIcon,
  Print as PrintIcon,
  CheckCircle as CheckCircleIcon,
  ArrowForward as NextIcon,
  ArrowBack as BackIcon,
  Close as CloseIcon,
  School as SchoolIcon,
  Class as ClassIcon,
  MenuBook as SubjectIcon,
  MeetingRoom as RoomIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  FolderSpecial as FolderIcon,
  ArrowRightAlt as ArrowIcon,
  ContentCopy as CopyIcon,
  PlaylistAdd as AddRowIcon,
  ChevronRight as ChevronRightIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { examApi } from '../api';
import api from '../../../api/client';
import { printWithTitle } from '../../../utils/printUtils';
import { usePermission } from '../../../hooks/usePermission';
import { AppDatePicker } from '../../../components/common';
import { Modal } from '../../../components/Modal';

export const ExamSchedulesPage = () => {
  const { hasPermission, can } = usePermission();

  // Active view tab:
  // 0 -> Term-Wise Independent Exam Master Table (Term ↔ Exam Mapping)
  // 1 -> Class-Wise Created Examinations Table
  // 2 -> Academic Terms Master Table
  // 3 -> Subject Date Sheets & Timetables
  const [activeTab, setActiveTab] = useState(0);

  // Independent view style: 'grouped' (Cards per Term) or 'table' (Flat Master Table)
  const [masterViewMode, setMasterViewMode] = useState('grouped');

  // Filter & Search states
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [terms, setTerms] = useState([]);
  const [selectedTermId, setSelectedTermId] = useState('');
  const [examSearch, setExamSearch] = useState('');
  const [termSearch, setTermSearch] = useState('');

  // Data states
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  // Active exam for schedules drawer / tab
  const [selectedExam, setSelectedExam] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Printable Date Sheet modal
  const [dateSheetModalOpen, setDateSheetModalOpen] = useState(false);

  // Term Modals (Create & Edit)
  const [termModal, setTermModal] = useState(false);
  const [editingTerm, setEditingTerm] = useState(null);
  const [termForm, setTermForm] = useState({ name: '', termCode: '', weightage: 50, description: '' });

  // Exam Modals (Create & Edit)
  const [examModal, setExamModal] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [examForm, setExamForm] = useState({
    name: '',
    code: '',
    termId: '',
    classId: '',
    classIds: [],
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    resultPublishDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    description: '',
  });

  // Tab 3 State: Dedicated Subject Date Sheet Mapping (Matches Screenshot 2)
  const [tab3ExamTitle, setTab3ExamTitle] = useState('');
  const [tab3ClassId, setTab3ClassId] = useState('');
  const [tab3Schedules, setTab3Schedules] = useState([]);
  const [tab3Saving, setTab3Saving] = useState(false);
  const [tab3BulkTimings, setTab3BulkTimings] = useState({
    assessmentName: 'Periodic Assessment',
    maxMarks: 100,
    passMarks: 33,
    examDate: new Date().toISOString().split('T')[0],
    startTime: '10:47',
    endTime: '12:00',
  });
  const [collapsedSubjects, setCollapsedSubjects] = useState({});
  const [allCollapsed, setAllCollapsed] = useState(false);

  const formatLocalDate = (val) => {
    if (!val) return '';
    if (val instanceof Date) {
      const y = val.getFullYear();
      const m = String(val.getMonth() + 1).padStart(2, '0');
      const d = String(val.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    if (typeof val === 'string') {
      return val.split('T')[0];
    }
    return '';
  };

  // Schedule Modal
  const [scheduleModal, setScheduleModal] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [scheduleForm, setScheduleForm] = useState({
    subjectId: '',
    examDate: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '12:00',
    maxMarks: 100,
    passMarks: 33,
    roomNo: 'Hall 1',
  });

  useEffect(() => {
    fetchInitial();
  }, []);

  const fetchInitial = async () => {
    try {
      const [classRes, termRes, subRes] = await Promise.all([
        api.get('/classes'),
        examApi.getTerms(),
        api.get('/subjects'),
      ]);
      const classList = classRes.data?.data || [];
      const termList = termRes.data?.data || [];
      setClasses(classList);
      setTerms(termList);
      setSubjects(subRes.data?.data || []);

      if (termList.length > 0) {
        setWizardData((prev) => ({ ...prev, termId: termList[0].id }));
      }
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: 'Failed to load initial master data.' });
    }
  };

  useEffect(() => {
    loadExams();
  }, [selectedClassId, selectedTermId]);

  const loadExams = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedClassId) params.classId = selectedClassId;
      if (selectedTermId) params.termId = selectedTermId;

      const res = await examApi.getExams(params);
      const examList = res.data?.data || [];
      setExams(examList);
      if (examList.length > 0 && !selectedExam) {
        setSelectedExam(examList[0]);
        setTab3ExamTitle(examList[0].name);
        setTab3ClassId(examList[0].classId);
        loadTab3Schedules(examList[0].id, examList[0].classId);
      }
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: 'Failed to load examinations.' });
    } finally {
      setLoading(false);
    }
  };

  const loadTerms = async () => {
    try {
      const res = await examApi.getTerms();
      setTerms(res.data?.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenSchedules = async (exam) => {
    setSelectedExam(exam);
    setDrawerOpen(true);
    setSchedulesLoading(true);
    try {
      const res = await examApi.getSchedules(exam.id);
      setSchedules(res.data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSchedulesLoading(false);
    }
  };

  const handleSelectExamForTab = async (exam) => {
    setSelectedExam(exam);
    setTab3ClassId(exam.classId);
    setTab3ExamTitle(exam.name);
    setActiveTab(3);
    loadTab3Schedules(exam.id, exam.classId);
  };

  const handleAutoPopulate = async (examIdToUse) => {
    const targetId = examIdToUse || selectedExam?.id;
    if (!targetId) return;
    setSchedulesLoading(true);
    try {
      const res = await examApi.autoPopulateSubjects(targetId);
      setSchedules(res.data?.data || []);
      setAlert({ type: 'success', message: 'Class subjects automatically mapped with default date & timings!' });
      loadExams();
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to auto-populate subjects.' });
    } finally {
      setSchedulesLoading(false);
    }
  };

  // --- TERM CRUD HANDLERS ---
  const handleOpenCreateTerm = () => {
    setEditingTerm(null);
    setTermForm({ name: '', termCode: '', weightage: 50, description: '' });
    setTermModal(true);
  };

  const handleOpenEditTerm = (term) => {
    setEditingTerm(term);
    setTermForm({
      name: term.name || '',
      termCode: term.termCode || '',
      weightage: term.weightage ?? 50,
      description: term.description || '',
    });
    setTermModal(true);
  };

  const handleSaveTerm = async () => {
    if (!termForm.name.trim() || !termForm.termCode.trim()) {
      setAlert({ type: 'error', message: 'Term name and code are required.' });
      return;
    }
    try {
      if (editingTerm) {
        await examApi.updateTerm(editingTerm.id, termForm);
        setAlert({ type: 'success', message: 'Academic Term updated successfully.' });
      } else {
        await examApi.createTerm(termForm);
        setAlert({ type: 'success', message: 'Academic Term created successfully.' });
      }
      setTermModal(false);
      loadTerms();
      loadExams();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to save term.' });
    }
  };

  const handleDeleteTerm = async (id) => {
    if (!window.confirm('Are you sure you want to delete this term?')) return;
    try {
      await examApi.deleteTerm(id);
      setAlert({ type: 'success', message: 'Term deleted successfully.' });
      loadTerms();
      loadExams();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Cannot delete term with existing exams.' });
    }
  };

  // --- EXAM CRUD HANDLERS ---
  const handleOpenCreateExam = (preferredTermId) => {
    setEditingExam(null);
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysLater = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    setExamForm({
      name: '',
      code: '',
      termId: preferredTermId || terms[0]?.id || '',
      classId: classes[0]?.id || '',
      classIds: classes.map((c) => c.id),
      startDate: today,
      endDate: sevenDaysLater,
      startTime: '09:00',
      endTime: '12:00',
      maxMarks: 100,
      passMarks: 33,
      roomNo: 'Exam Hall 1',
      autoPopulateSubjects: true,
      description: '',
    });
    setExamModal(true);
  };

  const handleOpenEditExam = (exam) => {
    setEditingExam(exam);
    let cleanCode = '';
    let cleanDesc = exam.description || '';
    const match = cleanDesc.match(/^\[(.*?)\]\s*(.*)$/);
    if (match) {
      cleanCode = match[1];
      cleanDesc = match[2];
    }
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysLater = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    setExamForm({
      name: exam.name || '',
      code: cleanCode,
      termId: exam.termId || terms[0]?.id || '',
      classId: exam.classId || '',
      classIds: [exam.classId],
      startDate: today,
      endDate: sevenDaysLater,
      startTime: '09:00',
      endTime: '12:00',
      maxMarks: 100,
      passMarks: 33,
      roomNo: 'Exam Hall 1',
      autoPopulateSubjects: false,
      description: cleanDesc,
    });
    setExamModal(true);
  };

  const handleSaveExam = async () => {
    if (!examForm.name.trim() || !examForm.termId) {
      setAlert({ type: 'error', message: 'Examination Title and Academic Term are required.' });
      return;
    }
    try {
      if (editingExam) {
        await examApi.updateExam(editingExam.id, {
          name: examForm.name,
          code: examForm.code,
          termId: examForm.termId,
          classId: examForm.classId,
          description: examForm.description,
        });
        setAlert({ type: 'success', message: 'Examination updated successfully.' });
      } else {
        const targetClassIds = examForm.classIds.length ? examForm.classIds : (examForm.classId ? [examForm.classId] : []);
        if (targetClassIds.length === 0) {
          setAlert({ type: 'error', message: 'Please select at least one class for this exam.' });
          return;
        }

        await examApi.createExam({
          name: examForm.name,
          code: examForm.code,
          termId: examForm.termId,
          classIds: targetClassIds,
          description: examForm.description,
        });

        // If auto populate requested, trigger auto-population for each newly created exam
        if (examForm.autoPopulateSubjects) {
          try {
            const updatedExamsRes = await examApi.getExams({});
            const allExams = updatedExamsRes.data?.data || [];
            const createdList = allExams.filter((e) => e.name === examForm.name && targetClassIds.includes(e.classId));
            for (const ex of createdList) {
              await examApi.autoPopulateSubjects(ex.id);
            }
          } catch (populateErr) {
            console.error('Auto populate note:', populateErr);
          }
        }

        setAlert({
          type: 'success',
          message: `Created Examination "${examForm.name}" for ${targetClassIds.length} class(es) successfully! Subject date sheets can be viewed and customized in Tab 3 anytime.`,
        });

        // Set Tab 3 default to the newly created exam title
        setTab3ExamTitle(examForm.name);
        if (targetClassIds.length > 0) {
          setTab3ClassId(targetClassIds[0]);
        }
      }
      setExamModal(false);
      loadExams();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to save examination.' });
    }
  };

  // --- TAB 3 (EXAM-WISE CLASS SUBJECT MAPPING - MATCHES SCREENSHOT 2) ---
  const loadTab3Schedules = async (examId, targetClassId) => {
    if (!examId) {
      setTab3Schedules([]);
      return;
    }
    setSchedulesLoading(true);
    try {
      const res = await examApi.getSchedules(examId);
      const data = res.data?.data || [];
      if (data.length > 0) {
        setTab3Schedules(data);
        setSchedules(data);
      } else {
        // Auto-initialize with class subjects
        const baseDate = new Date(tab3BulkTimings.examDate || new Date());
        const initialList = subjects.map((sub, idx) => {
          const sDate = new Date(baseDate);
          sDate.setDate(sDate.getDate() + idx);
          return {
            subjectId: sub.id,
            subjectName: sub.name,
            subjectCode: sub.code || '',
            roomNo: tab3BulkTimings.assessmentName || 'Hall 1',
            maxMarks: Number(tab3BulkTimings.maxMarks) || 100,
            passMarks: Number(tab3BulkTimings.passMarks) || 33,
            examDate: sDate.toISOString().split('T')[0],
            startTime: tab3BulkTimings.startTime || '10:47',
            endTime: tab3BulkTimings.endTime || '12:00',
          };
        });
        setTab3Schedules(initialList);
        setSchedules(initialList);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSchedulesLoading(false);
    }
  };

  const handleTab3SubjectsChipChange = (selectedIds) => {
    const currentMap = new Map(tab3Schedules.map((s) => [s.subjectId, s]));
    const baseDate = new Date(tab3BulkTimings.examDate || new Date());
    const nextList = selectedIds.map((subId, idx) => {
      if (currentMap.has(subId)) {
        return currentMap.get(subId);
      }
      const subObj = subjects.find((s) => s.id === subId);
      const sDate = new Date(baseDate);
      sDate.setDate(sDate.getDate() + idx);
      return {
        subjectId: subId,
        subjectName: subObj?.name || 'Subject',
        subjectCode: subObj?.code || '',
        roomNo: tab3BulkTimings.assessmentName || 'Hall 1',
        maxMarks: Number(tab3BulkTimings.maxMarks) || 100,
        passMarks: Number(tab3BulkTimings.passMarks) || 33,
        examDate: sDate.toISOString().split('T')[0],
        startTime: tab3BulkTimings.startTime || '10:47',
        endTime: tab3BulkTimings.endTime || '12:00',
      };
    });
    setTab3Schedules(nextList);
  };

  const handleTab3RowChange = (index, field, value) => {
    setTab3Schedules((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleTab3RemoveRow = (index) => {
    setTab3Schedules((prev) => {
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
  };

  const handleTab3ApplyBulkTimings = () => {
    setTab3Schedules((prev) =>
      prev.map((r, idx) => {
        const baseDate = new Date(tab3BulkTimings.examDate || new Date());
        baseDate.setDate(baseDate.getDate() + idx);
        return {
          ...r,
          roomNo: tab3BulkTimings.assessmentName || r.roomNo || 'Hall 1',
          maxMarks: Number(tab3BulkTimings.maxMarks) || 100,
          passMarks: Number(tab3BulkTimings.passMarks) || 33,
          examDate: baseDate.toISOString().split('T')[0],
          startTime: tab3BulkTimings.startTime || '10:47',
          endTime: tab3BulkTimings.endTime || '12:00',
        };
      })
    );
    setAlert({ type: 'success', message: 'Applied bulk assessment values across all subject schedules.' });
  };

  const handleTab3SaveAllSchedules = async () => {
    const activeExam = exams.find((x) => x.name === tab3ExamTitle && x.classId === Number(tab3ClassId));
    if (!activeExam) {
      setAlert({ type: 'error', message: 'Please select a Class and Exam first.' });
      return;
    }

    setTab3Saving(true);
    try {
      const payload = tab3Schedules.map((r) => ({
        subjectId: r.subjectId,
        examDate: r.examDate,
        startTime: r.startTime,
        endTime: r.endTime,
        maxMarks: Number(r.maxMarks) || 100,
        passMarks: Number(r.passMarks) || 33,
        roomNo: r.roomNo || 'Hall 1',
      }));

      const res = await examApi.saveSchedulesBulk(activeExam.id, payload);
      const data = res.data?.data || [];
      setTab3Schedules(data);
      setSchedules(data);
      setAlert({ type: 'success', message: `Subject Mapping successfully saved for ${activeExam.name} (${activeExam.className})!` });
      loadExams();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to save subject mapping.' });
    } finally {
      setTab3Saving(false);
    }
  };

  const handleTab3CopyScheduleToOtherClasses = async () => {
    const activeExam = exams.find((x) => x.name === tab3ExamTitle && x.classId === Number(tab3ClassId));
    if (!activeExam) return;

    const otherExams = exams.filter((x) => x.name === tab3ExamTitle && x.classId !== Number(tab3ClassId));
    if (otherExams.length === 0) {
      setAlert({ type: 'info', message: 'No other classes are mapped to this examination.' });
      return;
    }

    if (!window.confirm(`Copy this date sheet from ${activeExam.className} to all ${otherExams.length} other mapped classes?`)) {
      return;
    }

    setTab3Saving(true);
    try {
      const payload = tab3Schedules.map((r) => ({
        subjectId: r.subjectId,
        examDate: r.examDate,
        startTime: r.startTime,
        endTime: r.endTime,
        maxMarks: Number(r.maxMarks) || 100,
        passMarks: Number(r.passMarks) || 33,
        roomNo: r.roomNo || 'Exam Hall 1',
      }));
      await examApi.saveSchedulesBulk(activeExam.id, payload);

      const targetExamIds = otherExams.map((x) => x.id);
      await examApi.copySchedulesTo(activeExam.id, targetExamIds);
      setAlert({ type: 'success', message: `Date sheet copied to all ${otherExams.length} other classes!` });
      loadExams();
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to copy date sheet.' });
    } finally {
      setTab3Saving(false);
    }
  };

  const handleDeleteExam = async (id) => {
    if (!window.confirm('Are you sure you want to delete this exam and its subject date sheets?')) return;
    try {
      await examApi.deleteExam(id);
      setAlert({ type: 'success', message: 'Exam deleted successfully.' });
      loadExams();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Cannot delete exam with recorded marks.' });
    }
  };

  const handleDeleteMasterExamGroup = async (masterExam) => {
    if (!window.confirm(`Are you sure you want to delete "${masterExam.examName}" for all ${masterExam.classInstances.length} classes?`)) return;
    try {
      for (const instance of masterExam.classInstances) {
        await examApi.deleteExam(instance.id);
      }
      setAlert({ type: 'success', message: `Master Exam "${masterExam.examName}" deleted across all classes.` });
      loadExams();
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to delete some exam instances (may have recorded marks).' });
      loadExams();
    }
  };

  const handleToggleLock = async (exam) => {
    try {
      const res = await examApi.toggleLockExam(exam.id);
      setAlert({ type: 'success', message: res.data?.message || 'Lock status updated.' });
      loadExams();
      if (selectedExam?.id === exam.id) {
        setSelectedExam((prev) => ({ ...prev, isLocked: !prev.isLocked }));
      }
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to update lock status.' });
    }
  };

  const handleTogglePublish = async (exam) => {
    try {
      const res = await examApi.togglePublishExam(exam.id);
      setAlert({ type: 'success', message: res.data?.message || 'Publish status updated.' });
      loadExams();
      if (selectedExam?.id === exam.id) {
        setSelectedExam((prev) => ({ ...prev, isPublished: !prev.isPublished }));
      }
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to update publish status.' });
    }
  };

  // --- SCHEDULE HANDLERS ---
  const handleSaveSchedule = async () => {
    if (!scheduleForm.subjectId || !scheduleForm.examDate) {
      setAlert({ type: 'error', message: 'Subject and date are required.' });
      return;
    }
    try {
      await examApi.saveSchedule(selectedExam.id, scheduleForm);
      setScheduleModal(false);
      const res = await examApi.getSchedules(selectedExam.id);
      setSchedules(res.data?.data || []);
      setAlert({ type: 'success', message: 'Subject exam schedule saved.' });
      loadExams();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to save schedule.' });
    }
  };

  const handleDeleteSchedule = async (id) => {
    if (!window.confirm('Are you sure you want to delete this subject schedule?')) return;
    try {
      await examApi.deleteSchedule(id);
      const res = await examApi.getSchedules(selectedExam.id);
      setSchedules(res.data?.data || []);
      setAlert({ type: 'success', message: 'Schedule deleted.' });
      loadExams();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Cannot delete schedule with recorded marks.' });
    }
  };

  // 5-Step Wizard Execution
  const handleWizardSubmit = async () => {
    setWizardSubmitting(true);
    try {
      let finalTermId = wizardData.termId;

      // 1. Create Term if in new mode
      if (wizardData.termMode === 'new') {
        await examApi.createTerm({
          name: wizardData.termName,
          termCode: wizardData.termCode,
          weightage: wizardData.termWeightage,
          description: wizardData.termDescription,
        });
        const termsList = await examApi.getTerms();
        setTerms(termsList.data?.data || []);
        const created = termsList.data?.data?.find((t) => t.termCode === wizardData.termCode);
        if (created) finalTermId = created.id;
      }

      if (!finalTermId) {
        throw new Error('Please select or create an academic term.');
      }

      // 2. Create Exams for Selected Classes
      await examApi.createExam({
        name: wizardData.examName,
        code: wizardData.examCode,
        termId: finalTermId,
        classIds: wizardData.selectedClassIds,
        description: wizardData.examDescription,
      });

      // 3. Reload exams and auto-populate subjects if selected
      const updatedExamsRes = await examApi.getExams({});
      const updatedExams = updatedExamsRes.data?.data || [];

      if (wizardData.autoPopulateSubjects) {
        const newCreated = updatedExams.filter((e) => e.name === wizardData.examName);
        for (const ex of newCreated) {
          try {
            await examApi.autoPopulateSubjects(ex.id);
          } catch (e) {
            console.error('Auto populate failed for exam', ex.id, e);
          }
        }
      }

      setAlert({
        type: 'success',
        message: `Examination flow completed! Created exams for ${wizardData.selectedClassIds.length} class(es) with subjects mapped.`,
      });
      setWizardOpen(false);
      setWizardStep(0);
      loadExams();
      loadTerms();
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: err.message || 'Failed to complete examination wizard.' });
    } finally {
      setWizardSubmitting(false);
    }
  };

  const printDateSheet = () => {
    const examTitle = selectedExam?.name?.replace(/\s+/g, '_') || 'Datesheet';
    const cName = selectedExam?.className?.replace(/\s+/g, '_') || 'Class';
    printWithTitle(`Exam_Datesheet_${cName}_${examTitle}`);
  };

  const steps = [
    '1. Exam Term Setup',
    '2. Exam Master (Name & Code)',
    '3. Class Mapping',
    '4. Subject Date Sheet Mapping',
  ];

  // Filtering for tables
  const filteredExams = exams.filter((e) => {
    const q = examSearch.toLowerCase();
    return (
      (e.name || '').toLowerCase().includes(q) ||
      (e.className || '').toLowerCase().includes(q) ||
      (e.termName || '').toLowerCase().includes(q) ||
      (e.description || '').toLowerCase().includes(q)
    );
  });

  const filteredTerms = terms.filter((t) => {
    const q = termSearch.toLowerCase();
    return (
      (t.name || '').toLowerCase().includes(q) ||
      (t.termCode || '').toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q)
    );
  });

  // =========================================================================
  // GROUP EXAMS BY TERM (INDEPENDENT MASTER EXAM STRUCTURE)
  // This satisfies: "mujhe exam ka table independent show krna hai jisme term me koun kousa exam hai sirf ye dekhne ke liye"
  // =========================================================================
  const termWiseMasterExams = (selectedTermId ? terms.filter((t) => t.id === Number(selectedTermId)) : terms).map((term) => {
    const termExams = exams.filter((e) => e.termId === term.id);
    const distinctExamMap = new Map();

    termExams.forEach((e) => {
      let cleanCode = '';
      let cleanDesc = e.description || '';
      const match = cleanDesc.match(/^\[(.*?)\]\s*(.*)$/);
      if (match) {
        cleanCode = match[1];
        cleanDesc = match[2];
      }

      if (!distinctExamMap.has(e.name)) {
        distinctExamMap.set(e.name, {
          examName: e.name,
          examCode: cleanCode,
          description: cleanDesc,
          termId: term.id,
          termName: term.name,
          termCode: term.termCode,
          termWeightage: term.weightage,
          classInstances: [],
          totalSchedules: 0,
        });
      }

      const item = distinctExamMap.get(e.name);
      item.classInstances.push(e);
      item.totalSchedules += (e.scheduleCount || 0);
    });

    return {
      term,
      exams: Array.from(distinctExamMap.values()),
    };
  });

  // Flat list of all master exams
  const allMasterExams = termWiseMasterExams.flatMap((t) => t.exams).filter((me) => {
    const q = examSearch.toLowerCase();
    return (
      me.examName.toLowerCase().includes(q) ||
      me.termName.toLowerCase().includes(q) ||
      me.examCode.toLowerCase().includes(q) ||
      me.description.toLowerCase().includes(q)
    );
  });

  const totalDistinctExamsCount = new Set(exams.map((e) => `${e.termId}_${e.name}`)).size;
  const totalSchedulesCount = exams.reduce((sum, e) => sum + (e.scheduleCount || 0), 0);
  const publishedExamsCount = exams.filter((e) => e.isPublished).length;

  // Options for Examination Title Dropdown (only user-created exam names)
  const existingExamNames = Array.from(new Set(exams.map((e) => e.name?.trim()))).filter(Boolean);
  const examTitleDropdownOptions = existingExamNames;

  return (
    <Box sx={{ pb: 2 }}>
      {/* ===================== TOP HEADER & WORKFLOW GUIDE ===================== */}
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={1.5} sx={{ mb: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Typography variant="h5" fontWeight={900} color="text.primary">
              Examination & Academic Terms Master
            </Typography>
            <Chip
              icon={<SparklesIcon sx={{ fontSize: 16 }} />}
              label="Unified Exam Flow"
              size="small"
              color="primary"
              variant="filled"
              sx={{ fontWeight: 700 }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Independent view of Term ↔ Exam configurations, class mappings, and subject date sheets.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<CalendarIcon />}
            onClick={handleOpenCreateTerm}
            sx={{
              borderColor: 'var(--primary-color, #14b8a6)',
              color: 'var(--primary-color, #14b8a6)',
              fontWeight: 700,
              textTransform: 'none',
              '&:hover': {
                borderColor: 'var(--primary-color, #14b8a6)',
                bgcolor: 'rgba(20, 184, 166, 0.08)',
              },
            }}
          >
            Add Term
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenCreateExam()}
            sx={{
              bgcolor: 'var(--primary-color, #14b8a6)',
              color: '#ffffff',
              '&:hover': { filter: 'brightness(0.92)', bgcolor: 'var(--primary-color, #14b8a6)' },
              fontWeight: 700,
              textTransform: 'none',
              boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
            }}
          >
            Create Exam
          </Button>
        </Stack>
      </Stack>

      {/* ===================== METRIC SUMMARY CARDS ===================== */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 1.75,
              borderRadius: 2,
              bgcolor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderLeft: '4px solid var(--primary-color, #14b8a6)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <Box>
              <Typography sx={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                Academic Terms
              </Typography>
              <Typography sx={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary-color, #14b8a6)', lineHeight: 1.2, my: 0.25 }}>
                {terms.length}
              </Typography>
              <Typography sx={{ fontSize: '11px', color: 'var(--primary-color, #14b8a6)', fontWeight: 600 }}>
                Configured assessment terms
              </Typography>
            </Box>
            <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: 'rgba(20, 184, 166, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <SchoolIcon sx={{ fontSize: 22, color: 'var(--primary-color, #14b8a6)' }} />
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 1.75,
              borderRadius: 2,
              bgcolor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderLeft: '4px solid #16a34a',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <Box>
              <Typography sx={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                Master Exams
              </Typography>
              <Typography sx={{ fontSize: '1.5rem', fontWeight: 900, color: '#14532d', lineHeight: 1.2, my: 0.25 }}>
                {totalDistinctExamsCount}
              </Typography>
              <Typography sx={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>
                {exams.length} Class Mappings
              </Typography>
            </Box>
            <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ExamIcon sx={{ fontSize: 22, color: '#16a34a' }} />
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 1.75,
              borderRadius: 2,
              bgcolor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderLeft: '4px solid #9333ea',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <Box>
              <Typography sx={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                Subject Date Sheets
              </Typography>
              <Typography sx={{ fontSize: '1.5rem', fontWeight: 900, color: '#581c87', lineHeight: 1.2, my: 0.25 }}>
                {totalSchedulesCount}
              </Typography>
              <Typography sx={{ fontSize: '11px', color: '#9333ea', fontWeight: 600 }}>
                Scheduled subject slots
              </Typography>
            </Box>
            <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: '#faf5ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <SubjectIcon sx={{ fontSize: 22, color: '#9333ea' }} />
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 1.75,
              borderRadius: 2,
              bgcolor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderLeft: '4px solid #ea580c',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <Box>
              <Typography sx={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                Published Status
              </Typography>
              <Typography sx={{ fontSize: '1.5rem', fontWeight: 900, color: '#7c2d12', lineHeight: 1.2, my: 0.25 }}>
                {publishedExamsCount} / {exams.length}
              </Typography>
              <Typography sx={{ fontSize: '11px', color: '#ea580c', fontWeight: 600 }}>
                Live results visibility
              </Typography>
            </Box>
            <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <PublishIcon sx={{ fontSize: 22, color: '#ea580c' }} />
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* ===================== PROMINENT NAVIGATION TABS ===================== */}
      <Paper sx={{ mb: 2.5, borderRadius: 2, bgcolor: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
        <Tabs
          value={activeTab}
          onChange={(e, val) => {
            setActiveTab(val);
            if (val === 3 && !tab3ClassId) {
              if (selectedExam) {
                setTab3ClassId(selectedExam.classId);
                setTab3ExamTitle(selectedExam.name);
                loadTab3Schedules(selectedExam.id, selectedExam.classId);
              } else if (exams.length > 0) {
                const first = exams[0];
                setSelectedExam(first);
                setTab3ClassId(first.classId);
                setTab3ExamTitle(first.name);
                loadTab3Schedules(first.id, first.classId);
              }
            }
          }}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 46,
            px: 1.5,
            '& .MuiTab-root': {
              minHeight: 46,
              py: 1,
              px: 2,
              fontWeight: 800,
              fontSize: '0.85rem',
              textTransform: 'none',
              letterSpacing: '0.2px',
            },
            '& .Mui-selected': {
              color: 'var(--primary-color, #14b8a6) !important',
            },
            '& .MuiTabs-indicator': {
              backgroundColor: 'var(--primary-color, #14b8a6)',
            },
          }}
        >
          <Tab
            icon={<FolderIcon sx={{ fontSize: 18, color: '#0284c7' }} />}
            iconPosition="start"
            label={`Term & Exams Master (${totalDistinctExamsCount})`}
          />
          <Tab
            icon={<ExamIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label={`Class-Wise Exams (${exams.length})`}
          />
          <Tab
            icon={<SchoolIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label={`Academic Terms (${terms.length})`}
          />
          <Tab
            icon={<EventIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label={`Subject Date Sheet & Timetable ${selectedExam ? `(${selectedExam.name} - ${selectedExam.className})` : ''}`}
          />
        </Tabs>
      </Paper>

      {/* Global Snackbar for success/error messages */}
      <Snackbar
        open={Boolean(alert)}
        autoHideDuration={6000}
        onClose={() => setAlert(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {alert ? (
          <Alert
            onClose={() => setAlert(null)}
            severity={alert.type || 'info'}
            variant="filled"
            sx={{ width: '100%', boxShadow: 6, fontWeight: 600 }}
          >
            {alert.message}
          </Alert>
        ) : undefined}
      </Snackbar>

      {/* =========================================================================
          TAB 0: INDEPENDENT TERM-WISE EXAMS MASTER TABLE (MAIN FOCUS)
          ========================================================================= */}
      {activeTab === 0 && (
        <Box>
          {/* Filter, Search & View Switch Header */}
          <Card sx={{ mb: 3, boxShadow: 1, borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={12} md={4.5}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search by Exam Title, Code, or Term..."
                    value={examSearch}
                    onChange={(e) => setExamSearch(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={3.5}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Filter by Term</InputLabel>
                    <Select
                      value={selectedTermId}
                      label="Filter by Term"
                      onChange={(e) => setSelectedTermId(e.target.value)}
                    >
                      <MenuItem value="">All Academic Terms ({terms.length})</MenuItem>
                      {terms.map((t) => (
                        <MenuItem key={t.id} value={t.id}>
                          {t.name} ({t.termCode}) — {t.weightage}% Weightage
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6} md={4} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' }, gap: 1 }}>
                  <ToggleButtonGroup
                    size="small"
                    value={masterViewMode}
                    exclusive
                    onChange={(e, val) => val && setMasterViewMode(val)}
                  >
                    <ToggleButton value="grouped" sx={{ fontWeight: 700, px: 1.5, textTransform: 'none' }}>
                      <ViewModuleIcon fontSize="small" sx={{ mr: 0.5 }} /> Term Groups
                    </ToggleButton>
                    <ToggleButton value="table" sx={{ fontWeight: 700, px: 1.5, textTransform: 'none' }}>
                      <ViewListIcon fontSize="small" sx={{ mr: 0.5 }} /> Master Table
                    </ToggleButton>
                  </ToggleButtonGroup>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenCreateExam(selectedTermId || undefined)}
                    sx={{
                      bgcolor: 'var(--primary-color, #14b8a6)',
                      color: '#ffffff',
                      '&:hover': { filter: 'brightness(0.92)', bgcolor: 'var(--primary-color, #14b8a6)' },
                      fontWeight: 700,
                      textTransform: 'none',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Create Exam
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* MODE 1: GROUPED BY TERM CARDS & TABLES */}
          {masterViewMode === 'grouped' ? (
            <Stack spacing={3}>
              {termWiseMasterExams.map(({ term, exams: termExamsList }) => (
                <Card key={term.id} sx={{ borderRadius: 2, boxShadow: 2, border: '1px solid #cbd5e1', overflow: 'hidden' }}>
                  {/* Term Header Banner */}
                  <Box
                    sx={{
                      p: 2,
                      background: 'var(--app-modal-header-bg, linear-gradient(135deg, var(--app-theme-primary, #14b8a6) 0%, var(--app-theme-darker, #0d9488) 100%))',
                      color: '#ffffff',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 1,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <SchoolIcon sx={{ color: '#ffffff' }} />
                      <Box>
                        <Typography variant="h6" fontWeight={900} color="#ffffff">
                          {term.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.85)' }}>
                          Code: <strong>{term.termCode}</strong> | Weightage: <strong>{term.weightage}%</strong>
                          {term.description ? ` | ${term.description}` : ''}
                        </Typography>
                      </Box>
                    </Box>

                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip
                        label={`${termExamsList.length} Exam(s) in this Term`}
                        size="small"
                        sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)', color: '#ffffff', fontWeight: 800, backdropFilter: 'blur(4px)' }}
                      />
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenCreateExam(term.id)}
                        sx={{
                          bgcolor: '#ffffff',
                          color: 'var(--primary-color, #14b8a6)',
                          '&:hover': { bgcolor: '#f8fafc' },
                          fontWeight: 800,
                          textTransform: 'none',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                      >
                        Add Exam in {term.name}
                      </Button>
                    </Stack>
                  </Box>

                  {/* Term's Exams Table */}
                  <TableContainer>
                    <Table size="medium">
                      <TableHead sx={{ bgcolor: '#f8fafc' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 800, color: 'text.primary', width: '28%' }}>Examination Name & Code</TableCell>
                          <TableCell sx={{ fontWeight: 800, color: 'text.primary', width: '40%' }}>Mapped Classes ({classes.length} Total)</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 800, color: 'text.primary', width: '15%' }}>Subject Schedules</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800, color: 'text.primary', width: '17%' }}>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {termExamsList.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                              <Typography variant="body2" fontWeight={600}>
                                No examinations created under {term.name} ({term.termCode}) yet.
                              </Typography>
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<AddIcon />}
                                onClick={() => {
                                  setEditingExam(null);
                                  setExamForm({
                                    name: '',
                                    code: '',
                                    termId: term.id,
                                    classId: classes[0]?.id || '',
                                    classIds: classes.map((c) => c.id),
                                    description: '',
                                  });
                                  setExamModal(true);
                                }}
                                sx={{ mt: 1, textTransform: 'none', fontWeight: 700 }}
                              >
                                Create Exam for {term.name}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ) : (
                          termExamsList.map((me, idx) => (
                            <TableRow key={idx} hover sx={{ '&:hover': { bgcolor: '#f1f5f9' } }}>
                              <TableCell>
                                <Typography variant="body1" fontWeight={800} color="text.primary">
                                  {me.examName}
                                </Typography>
                                <Stack direction="row" spacing={1} sx={{ mt: 0.5 }} alignItems="center">
                                  {me.examCode && (
                                    <Chip label={me.examCode} size="small" color="primary" sx={{ fontWeight: 800, height: 22 }} />
                                  )}
                                  {me.description && (
                                    <Typography variant="caption" color="text.secondary">
                                      {me.description}
                                    </Typography>
                                  )}
                                </Stack>
                              </TableCell>

                              {/* Mapped Classes List */}
                              <TableCell>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6, alignItems: 'center' }}>
                                  {me.classInstances.map((ci) => (
                                    <Tooltip
                                      key={ci.id}
                                      title={`Class: ${ci.className} | Schedules: ${ci.scheduleCount || 0} | Status: ${ci.isPublished ? 'Published' : 'Draft'} | Marks: ${ci.isLocked ? 'Locked' : 'Open'}`}
                                    >
                                      <Chip
                                        icon={<ClassIcon sx={{ fontSize: 13 }} />}
                                        label={ci.className}
                                        size="small"
                                        clickable
                                        onClick={() => handleSelectExamForTab(ci)}
                                        color={(ci.scheduleCount || 0) > 0 ? 'success' : 'default'}
                                        variant="outlined"
                                        sx={{ fontWeight: 700, fontSize: '0.75rem' }}
                                      />
                                    </Tooltip>
                                  ))}
                                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, ml: 0.5 }}>
                                    ({me.classInstances.length} Classes Mapped)
                                  </Typography>
                                </Box>
                              </TableCell>

                              {/* Subject Schedules */}
                              <TableCell align="center">
                                <Chip
                                  icon={<SubjectIcon sx={{ fontSize: 14 }} />}
                                  label={`${me.totalSchedules} Subject Slots`}
                                  size="small"
                                  color={me.totalSchedules > 0 ? 'primary' : 'default'}
                                  sx={{ fontWeight: 800 }}
                                />
                              </TableCell>

                              {/* Actions */}
                              <TableCell align="right">
                                <Stack direction="row" spacing={1} justifyContent="flex-end">
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<EventIcon />}
                                    onClick={() => handleSelectExamForTab(me.classInstances[0])}
                                    sx={{ fontWeight: 700, textTransform: 'none' }}
                                  >
                                    View Timetable
                                  </Button>
                                  <Tooltip title="Delete this master exam across all mapped classes">
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => handleDeleteMasterExamGroup(me)}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </Stack>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Card>
              ))}
            </Stack>
          ) : (
            /* MODE 2: FLAT MASTER EXAMS TABLE */
            <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: 2, overflow: 'hidden' }}>
              <Box
                sx={{
                  p: 2,
                  background: 'var(--app-modal-header-bg, linear-gradient(135deg, var(--app-theme-primary, #14b8a6) 0%, var(--app-theme-darker, #0d9488) 100%))',
                  color: '#ffffff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <Box>
                  <Typography variant="subtitle1" fontWeight={800} color="#ffffff">
                    Independent Examination Master Table (Term-Wise Overview)
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.85)' }}>
                    Showing all distinct examination definitions and their mapped terms & classes
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={handleOpenCreateExam}
                  sx={{
                    bgcolor: '#ffffff',
                    color: 'var(--primary-color, #14b8a6)',
                    '&:hover': { bgcolor: '#f8fafc' },
                    fontWeight: 800,
                    textTransform: 'none',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                >
                  Create Exam
                </Button>
              </Box>

              <Table>
                <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, color: 'text.primary' }}>Academic Term</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: 'text.primary' }}>Exam Name & Code</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: 'text.primary' }}>Mapped Classes List</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800, color: 'text.primary' }}>Total Classes</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800, color: 'text.primary' }}>Total Subject Schedules</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: 'text.primary' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {allMasterExams.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                        <ExamIcon sx={{ fontSize: 52, color: '#cbd5e1', mb: 1 }} />
                        <Typography variant="body1" fontWeight={700}>No examinations found.</Typography>
                        <Typography variant="body2">Click &ldquo;+ Create Exam&rdquo; to define exams under your terms.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    allMasterExams.map((me, idx) => (
                      <TableRow key={idx} hover sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                        <TableCell>
                          <Chip
                            label={`${me.termName} (${me.termCode})`}
                            size="small"
                            color="primary"
                            variant="filled"
                            sx={{ fontWeight: 800 }}
                          />
                          <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.3 }}>
                            Weightage: <strong>{me.termWeightage}%</strong>
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2" fontWeight={800} color="text.primary">
                            {me.examName}
                          </Typography>
                          {me.examCode && (
                            <Chip label={me.examCode} size="small" variant="outlined" sx={{ fontWeight: 700, mt: 0.3, height: 20 }} />
                          )}
                        </TableCell>

                        <TableCell>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {me.classInstances.map((ci) => (
                              <Chip
                                key={ci.id}
                                label={ci.className}
                                size="small"
                                clickable
                                onClick={() => handleSelectExamForTab(ci)}
                                sx={{ fontSize: '0.72rem', height: 22 }}
                              />
                            ))}
                          </Box>
                        </TableCell>

                        <TableCell align="center">
                          <Chip label={`${me.classInstances.length} Classes`} size="small" sx={{ fontWeight: 700 }} />
                        </TableCell>

                        <TableCell align="center">
                          <Chip
                            label={`${me.totalSchedules} Slots`}
                            size="small"
                            color={me.totalSchedules > 0 ? 'success' : 'default'}
                            sx={{ fontWeight: 700 }}
                          />
                        </TableCell>

                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<EventIcon />}
                              onClick={() => handleSelectExamForTab(me.classInstances[0])}
                              sx={{
                                bgcolor: 'var(--primary-color, #14b8a6)',
                                color: '#ffffff',
                                '&:hover': { filter: 'brightness(0.92)', bgcolor: 'var(--primary-color, #14b8a6)' },
                                fontWeight: 700,
                                textTransform: 'none'
                              }}
                            >
                              Date Sheet
                            </Button>
                            <Tooltip title="Delete across all classes">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteMasterExamGroup(me)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* =========================================================================
          TAB 1: CLASS-WISE CREATED EXAMINATIONS TABLE
          ========================================================================= */}
      {activeTab === 1 && (
        <Box>
          {/* Filters and Search */}
          <Card sx={{ mb: 3, boxShadow: 1, borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search by Exam Name, Class, or Term..."
                    value={examSearch}
                    onChange={(e) => setExamSearch(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Filter by Class</InputLabel>
                    <Select
                      value={selectedClassId}
                      label="Filter by Class"
                      onChange={(e) => setSelectedClassId(e.target.value)}
                    >
                      <MenuItem value="">All Classes</MenuItem>
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
                    <InputLabel>Filter by Term</InputLabel>
                    <Select
                      value={selectedTermId}
                      label="Filter by Term"
                      onChange={(e) => setSelectedTermId(e.target.value)}
                    >
                      <MenuItem value="">All Terms</MenuItem>
                      {terms.map((t) => (
                        <MenuItem key={t.id} value={t.id}>
                          {t.name} ({t.termCode})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={3} sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={loadExams}
                    sx={{ height: 40, fontWeight: 700 }}
                  >
                    Refresh
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenCreateExam(selectedTermId || undefined)}
                    sx={{
                      bgcolor: 'var(--primary-color, #14b8a6)',
                      color: '#ffffff',
                      '&:hover': { filter: 'brightness(0.92)', bgcolor: 'var(--primary-color, #14b8a6)' },
                      height: 40,
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      flex: 1
                    }}
                  >
                    Create Exam
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Created Examinations Table */}
          <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: 2, overflow: 'hidden' }}>
            <Box
              sx={{
                p: 2,
                background: 'var(--app-modal-header-bg, linear-gradient(135deg, var(--app-theme-primary, #14b8a6) 0%, var(--app-theme-darker, #0d9488) 100%))',
                color: '#ffffff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <Box>
                <Typography variant="subtitle1" fontWeight={800} color="#ffffff">
                  Class-Wise Examination Instances Table
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.85)' }}>
                  Showing {filteredExams.length} individual class examination rows with lock & publish controls
                </Typography>
              </Box>
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={handleOpenCreateExam}
                sx={{
                  bgcolor: '#ffffff',
                  color: 'var(--primary-color, #14b8a6)',
                  '&:hover': { bgcolor: '#f8fafc' },
                  fontWeight: 800,
                  textTransform: 'none',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                New Exam
              </Button>
            </Box>

            <Table>
              <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, color: 'text.primary' }}>Exam Name & Details</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: 'text.primary' }}>Academic Term</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: 'text.primary' }}>Target Class</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: 'text.primary' }}>Scheduled Subjects</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: 'text.primary' }}>Marks Entry</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: 'text.primary' }}>Publish Status</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: 'text.primary' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={32} />
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Loading examinations table...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : filteredExams.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                      <ExamIcon sx={{ fontSize: 52, color: '#cbd5e1', mb: 1 }} />
                      <Typography variant="body1" fontWeight={700}>No examinations created yet.</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Click &ldquo;5-Step Exam Wizard&rdquo; or &ldquo;+ Create Exam&rdquo; above to create exams.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExams.map((exam) => (
                    <TableRow key={exam.id} hover sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={800} color="text.primary">
                          {exam.name}
                        </Typography>
                        {exam.description && (
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.3 }}>
                            {exam.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={exam.termName || 'Term 1'}
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={<ClassIcon sx={{ fontSize: 14 }} />}
                          label={exam.className || 'Class'}
                          size="small"
                          sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={<SubjectIcon sx={{ fontSize: 14 }} />}
                          label={`${exam.scheduleCount || 0} Subjects`}
                          size="small"
                          color={(exam.scheduleCount || 0) > 0 ? 'success' : 'default'}
                          onClick={() => handleSelectExamForTab(exam)}
                          sx={{ fontWeight: 700, cursor: 'pointer' }}
                        />
                      </TableCell>
                      <TableCell>
                        {exam.isLocked ? (
                          <Chip icon={<LockIcon sx={{ fontSize: 14 }} />} label="Locked" size="small" color="error" />
                        ) : (
                          <Chip icon={<LockOpenIcon sx={{ fontSize: 14 }} />} label="Open" size="small" color="success" />
                        )}
                      </TableCell>
                      <TableCell>
                        {exam.isPublished ? (
                          <Chip label="Published" size="small" color="info" sx={{ fontWeight: 700 }} />
                        ) : (
                          <Chip label="Draft" size="small" variant="outlined" />
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<EventIcon />}
                            onClick={() => handleOpenSchedules(exam)}
                            sx={{
                              bgcolor: 'var(--primary-color, #14b8a6)',
                              color: '#ffffff',
                              '&:hover': { filter: 'brightness(0.92)', bgcolor: 'var(--primary-color, #14b8a6)' },
                              fontWeight: 700,
                              textTransform: 'none'
                            }}
                          >
                            Date Sheet ({exam.scheduleCount || 0})
                          </Button>
                          <Tooltip title="Edit Exam Details">
                            <IconButton size="small" color="primary" onClick={() => handleOpenEditExam(exam)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={exam.isLocked ? 'Unlock Marks Entry' : 'Lock Marks Entry'}>
                            <IconButton
                              size="small"
                              color={exam.isLocked ? 'error' : 'success'}
                              onClick={() => handleToggleLock(exam)}
                            >
                              {exam.isLocked ? <LockIcon fontSize="small" /> : <LockOpenIcon fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={exam.isPublished ? 'Unpublish Results' : 'Publish Results'}>
                            <IconButton
                              size="small"
                              color={exam.isPublished ? 'info' : 'default'}
                              onClick={() => handleTogglePublish(exam)}
                            >
                              <PublishIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Exam">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteExam(exam.id)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* =========================================================================
          TAB 2: ACADEMIC TERMS MASTER TABLE
          ========================================================================= */}
      {activeTab === 2 && (
        <Box>
          {/* Terms Search and Actions */}
          <Card sx={{ mb: 3, boxShadow: 1, borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search Academic Terms by Name, Code, or Description..."
                    value={termSearch}
                    onChange={(e) => setTermSearch(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', sm: 'flex-end' }, gap: 1 }}>
                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={loadTerms}
                    sx={{ fontWeight: 700 }}
                  >
                    Refresh
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleOpenCreateTerm}
                    sx={{
                      bgcolor: 'var(--primary-color, #14b8a6)',
                      color: '#ffffff',
                      '&:hover': { filter: 'brightness(0.92)', bgcolor: 'var(--primary-color, #14b8a6)' },
                      fontWeight: 700,
                      textTransform: 'none'
                    }}
                  >
                    Add New Term
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Academic Terms Table */}
          <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: 2, overflow: 'hidden' }}>
            <Box
              sx={{
                p: 2,
                background: 'var(--app-modal-header-bg, linear-gradient(135deg, var(--app-theme-primary, #14b8a6) 0%, var(--app-theme-darker, #0d9488) 100%))',
                color: '#ffffff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <Box>
                <Typography variant="subtitle1" fontWeight={800} color="#ffffff">
                  Academic Terms Master Table
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.85)' }}>
                  Terms define academic session partitions (e.g., Term 1, Term 2, Annual, Unit Tests)
                </Typography>
              </Box>
            </Box>

            <Table>
              <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, color: 'text.primary' }}>Term Name</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: 'text.primary' }}>Term Code</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: 'text.primary' }}>Evaluation Weightage (%)</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: 'text.primary' }}>Description / Purpose</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: 'text.primary' }}>Linked Examinations</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: 'text.primary' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTerms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                      <SchoolIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 1 }} />
                      <Typography variant="body1" fontWeight={700}>No academic terms found.</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Click &ldquo;+ Add New Term&rdquo; to define Term 1, Term 2, or Unit Tests.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTerms.map((t) => (
                    <TableRow key={t.id} hover sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                      <TableCell sx={{ fontWeight: 800, color: 'text.primary' }}>
                        {t.name}
                      </TableCell>
                      <TableCell>
                        <Chip label={t.termCode} size="small" color="primary" sx={{ fontWeight: 700 }} />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${t.weightage}%`}
                          size="small"
                          color={t.weightage >= 50 ? 'success' : 'default'}
                          variant="outlined"
                          sx={{ fontWeight: 800 }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>
                        {t.description || '—'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={<ExamIcon sx={{ fontSize: 14 }} />}
                          label={`${t.examCount || 0} Linked Exams`}
                          size="small"
                          color={(t.examCount || 0) > 0 ? 'info' : 'default'}
                          sx={{ fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => handleOpenCreateExam(t.id)}
                            sx={{
                              bgcolor: 'var(--primary-color, #14b8a6)',
                              color: '#ffffff',
                              '&:hover': { filter: 'brightness(0.92)', bgcolor: 'var(--primary-color, #14b8a6)' },
                              fontWeight: 700,
                              textTransform: 'none',
                              py: 0.5,
                              px: 1.5
                            }}
                          >
                            Add Exam
                          </Button>
                          <Tooltip title="Edit Term">
                            <IconButton size="small" color="primary" onClick={() => handleOpenEditTerm(t)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={(t.examCount || 0) > 0 ? 'Cannot delete term linked to existing exams' : 'Delete Term'}>
                            <span>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteTerm(t.id)}
                                disabled={(t.examCount || 0) > 0}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* =========================================================================
          TAB 3: SUBJECT DATE SHEET MASTER & TIMETABLES (MATCHES SCREENSHOT 2)
          ========================================================================= */}
      {activeTab === 3 && (
        <Box>
          {/* TOP SELECTORS: CLASS, EXAM, SUBJECT CHIPS */}
          <Card sx={{ mb: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderRadius: 2, border: '1px solid #e2e8f0' }}>
            <CardContent sx={{ p: 2 }}>
              <Grid container spacing={2} alignItems="center">
                {/* 1. Class Dropdown */}
                <Grid item xs={12} sm={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Class</InputLabel>
                    <Select
                      value={tab3ClassId}
                      label="Class"
                      onChange={(e) => {
                        const newClassId = e.target.value;
                        setTab3ClassId(newClassId);
                        const found = exams.find((x) => x.name === tab3ExamTitle && x.classId === Number(newClassId));
                        if (found) {
                          loadTab3Schedules(found.id, newClassId);
                          setSelectedExam(found);
                        } else {
                          const anyExamForClass = exams.find((x) => x.classId === Number(newClassId));
                          if (anyExamForClass) {
                            setTab3ExamTitle(anyExamForClass.name);
                            loadTab3Schedules(anyExamForClass.id, newClassId);
                            setSelectedExam(anyExamForClass);
                          }
                        }
                      }}
                    >
                      {classes.map((c) => (
                        <MenuItem key={c.id} value={c.id}>
                          {c.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* 2. EXAM Dropdown */}
                <Grid item xs={12} sm={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Examination</InputLabel>
                    <Select
                      value={tab3ExamTitle}
                      label="Examination"
                      onChange={(e) => {
                        const newTitle = e.target.value;
                        setTab3ExamTitle(newTitle);
                        const matched = exams.filter((x) => x.name === newTitle);
                        if (matched.length > 0) {
                          const targetExam = matched.find((x) => x.classId === Number(tab3ClassId)) || matched[0];
                          setTab3ClassId(targetExam.classId);
                          loadTab3Schedules(targetExam.id, targetExam.classId);
                          setSelectedExam(targetExam);
                        }
                      }}
                    >
                      {existingExamNames.map((name) => (
                        <MenuItem key={name} value={name}>
                          {name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* 3. Multi-Select Subject Chips */}
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Select Subjects</InputLabel>
                    <Select
                      multiple
                      value={tab3Schedules.map((s) => s.subjectId)}
                      onChange={(e) => {
                        const val = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                        handleTab3SubjectsChipChange(val);
                      }}
                      input={<OutlinedInput label="Select Subjects" />}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((val) => {
                            const subObj = subjects.find((s) => s.id === val);
                            return (
                              <Chip
                                key={val}
                                label={subObj?.name || val}
                                size="small"
                                color="primary"
                                variant="outlined"
                                onDelete={() => {
                                  const filtered = tab3Schedules.filter((s) => s.subjectId !== val).map((s) => s.subjectId);
                                  handleTab3SubjectsChipChange(filtered);
                                }}
                              />
                            );
                          })}
                        </Box>
                      )}
                    >
                      {subjects.map((sub) => (
                        <MenuItem key={sub.id} value={sub.id}>
                          <Checkbox checked={tab3Schedules.some((s) => s.subjectId === sub.id)} />
                          <ListItemText primary={`${sub.name} ${sub.code ? `(${sub.code})` : ''}`} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* ⚡ BULK EDIT ASSESSMENTS BAR */}
          <Card variant="outlined" sx={{ p: 1.75, mb: 2, bgcolor: '#ffffff', borderRadius: 2, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="subtitle2" fontWeight={800} color="text.primary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <SparklesIcon sx={{ fontSize: 18, color: '#eab308' }} /> Bulk Apply Timings & Marks
              </Typography>
              <Button
                variant="contained"
                size="small"
                onClick={handleTab3ApplyBulkTimings}
                sx={{
                  bgcolor: 'var(--primary-color, #14b8a6)',
                  color: '#ffffff',
                  '&:hover': { filter: 'brightness(0.92)', bgcolor: 'var(--primary-color, #14b8a6)' },
                  fontWeight: 700,
                  textTransform: 'none',
                  px: 2
                }}
              >
                Apply to All Subjects
              </Button>
            </Box>
            <Grid container spacing={1.5} alignItems="center">
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Assessment Name / Room"
                  placeholder="e.g. Periodic Test / Hall 1"
                  value={tab3BulkTimings.assessmentName}
                  onChange={(e) => setTab3BulkTimings({ ...tab3BulkTimings, assessmentName: e.target.value })}
                  inputProps={{ style: { fontSize: '0.85rem' } }}
                />
              </Grid>
              <Grid item xs={6} sm={1.5}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Total Marks"
                  value={tab3BulkTimings.maxMarks}
                  onChange={(e) => setTab3BulkTimings({ ...tab3BulkTimings, maxMarks: e.target.value })}
                  inputProps={{ style: { fontSize: '0.85rem' } }}
                />
              </Grid>
              <Grid item xs={6} sm={1.5}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Passing Marks"
                  value={tab3BulkTimings.passMarks}
                  onChange={(e) => setTab3BulkTimings({ ...tab3BulkTimings, passMarks: e.target.value })}
                  inputProps={{ style: { fontSize: '0.85rem' } }}
                />
              </Grid>
              <Grid item xs={12} sm={2}>
                <AppDatePicker
                  label="Date"
                  value={tab3BulkTimings.examDate}
                  onChange={(e) => {
                    const val = formatLocalDate(e.value);
                    setTab3BulkTimings({ ...tab3BulkTimings, examDate: val });
                  }}
                  placeholder="Select Date"
                  dateFormat="dd/mm/yy"
                  style={{ marginBottom: 0 }}
                />
              </Grid>
              <Grid item xs={6} sm={2}>
                <TextField
                  fullWidth
                  size="small"
                  type="time"
                  label="Start Time"
                  InputLabelProps={{ shrink: true }}
                  value={tab3BulkTimings.startTime}
                  onChange={(e) => setTab3BulkTimings({ ...tab3BulkTimings, startTime: e.target.value })}
                  inputProps={{ style: { fontSize: '0.85rem' } }}
                />
              </Grid>
              <Grid item xs={6} sm={2}>
                <TextField
                  fullWidth
                  size="small"
                  type="time"
                  label="End Time"
                  InputLabelProps={{ shrink: true }}
                  value={tab3BulkTimings.endTime}
                  onChange={(e) => setTab3BulkTimings({ ...tab3BulkTimings, endTime: e.target.value })}
                  inputProps={{ style: { fontSize: '0.85rem' } }}
                />
              </Grid>
            </Grid>
          </Card>

          {/* SUBJECT-WISE SCHEDULE SECTION */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="h6" fontWeight={800} color="text.primary">
                Subject-wise Schedule
              </Typography>
              <Button
                size="small"
                onClick={() => {
                  const nextState = !allCollapsed;
                  setAllCollapsed(nextState);
                  const updated = {};
                  tab3Schedules.forEach((_, idx) => {
                    updated[idx] = nextState;
                  });
                  setCollapsedSubjects(updated);
                }}
                sx={{ textTransform: 'none', fontWeight: 700, color: 'var(--primary-color, #14b8a6)' }}
              >
                {allCollapsed ? 'Expand All' : 'Collapse All'}
              </Button>
            </Box>

            {schedulesLoading ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <CircularProgress size={32} />
                <Typography variant="body2" sx={{ mt: 1 }}>Loading subject schedules...</Typography>
              </Box>
            ) : !selectedExam ? (
              <Card variant="outlined" sx={{ p: 4, textAlign: 'center', color: 'text.secondary', borderRadius: 2 }}>
                <ExamIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 1 }} />
                <Typography variant="body1" fontWeight={700}>Please select a Class and Exam from top dropdowns.</Typography>
                <Typography variant="body2">Once selected, class subjects will appear for timetable schedule mapping.</Typography>
              </Card>
            ) : tab3Schedules.length === 0 ? (
              <Card variant="outlined" sx={{ p: 4, textAlign: 'center', color: 'text.secondary', borderRadius: 2 }}>
                <SubjectIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 1 }} />
                <Typography variant="body1" fontWeight={700}>No subjects selected for {selectedExam.name} ({selectedExam.className}).</Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  Select subjects from the &ldquo;Select Subjects&rdquo; dropdown above to configure their schedule.
                </Typography>
              </Card>
            ) : (
              <Stack spacing={2}>
                {tab3Schedules.map((row, idx) => {
                  const isCollapsed = Boolean(collapsedSubjects[idx]);
                  return (
                    <Card
                      key={idx}
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: '#ffffff',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        '&:hover': { borderColor: '#94a3b8' },
                      }}
                    >
                      {/* Subject Card Header */}
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer',
                          pb: isCollapsed ? 0 : 1.5,
                        }}
                        onClick={() => {
                          setCollapsedSubjects((prev) => ({ ...prev, [idx]: !prev[idx] }));
                        }}
                      >
                        <Typography variant="subtitle1" fontWeight={800} color="text.primary">
                          {row.subjectName?.toUpperCase()} {row.subjectCode ? `(${row.subjectCode})` : ''}
                        </Typography>
                        <IconButton size="small">
                          {isCollapsed ? <ChevronRightIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                      </Box>

                      {/* Subject Card Inputs Row */}
                      {!isCollapsed && (
                        <Grid container spacing={1.5} alignItems="center">
                          <Grid item xs={12} sm={3}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Assessment Name / Room"
                              placeholder="e.g. Hall 1"
                              value={row.roomNo}
                              onChange={(e) => handleTab3RowChange(idx, 'roomNo', e.target.value)}
                              inputProps={{ style: { fontSize: '0.85rem' } }}
                            />
                          </Grid>
                          <Grid item xs={6} sm={1.5}>
                            <TextField
                              fullWidth
                              size="small"
                              type="number"
                              label="Total Marks"
                              value={row.maxMarks}
                              onChange={(e) => handleTab3RowChange(idx, 'maxMarks', e.target.value)}
                              inputProps={{ style: { fontSize: '0.85rem' } }}
                            />
                          </Grid>
                          <Grid item xs={6} sm={1.5}>
                            <TextField
                              fullWidth
                              size="small"
                              type="number"
                              label="Passing Marks"
                              value={row.passMarks}
                              onChange={(e) => handleTab3RowChange(idx, 'passMarks', e.target.value)}
                              inputProps={{ style: { fontSize: '0.85rem' } }}
                            />
                          </Grid>
                          <Grid item xs={12} sm={2}>
                            <AppDatePicker
                              label="Date"
                              value={row.examDate}
                              onChange={(e) => {
                                const val = formatLocalDate(e.value);
                                handleTab3RowChange(idx, 'examDate', val);
                              }}
                              placeholder="Select Date"
                              dateFormat="dd/mm/yy"
                              style={{ marginBottom: 0 }}
                            />
                          </Grid>
                          <Grid item xs={5} sm={1.8}>
                            <TextField
                              fullWidth
                              size="small"
                              type="time"
                              label="Start Time"
                              InputLabelProps={{ shrink: true }}
                              value={row.startTime}
                              onChange={(e) => handleTab3RowChange(idx, 'startTime', e.target.value)}
                              inputProps={{ style: { fontSize: '0.85rem' } }}
                            />
                          </Grid>
                          <Grid item xs={5} sm={1.8}>
                            <TextField
                              fullWidth
                              size="small"
                              type="time"
                              label="End Time"
                              InputLabelProps={{ shrink: true }}
                              value={row.endTime}
                              onChange={(e) => handleTab3RowChange(idx, 'endTime', e.target.value)}
                              inputProps={{ style: { fontSize: '0.85rem' } }}
                            />
                          </Grid>
                          <Grid item xs={2} sm={0.4} sx={{ textAlign: 'center' }}>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleTab3RemoveRow(idx)}
                              title="Delete this subject schedule"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Grid>
                        </Grid>
                      )}
                    </Card>
                  );
                })}
              </Stack>
            )}
          </Box>

          {/* BOTTOM RIGHT ACTION BAR: MAPPING BTN */}
          {selectedExam && tab3Schedules.length > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mb: 4 }}>
              <Button
                variant="contained"
                onClick={handleTab3SaveAllSchedules}
                disabled={tab3Saving}
                sx={{
                  bgcolor: '#dc2626',
                  '&:hover': { bgcolor: '#b91c1c' },
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: '1rem',
                  px: 4,
                  py: 1.5,
                  borderRadius: 2,
                  boxShadow: 3,
                  textTransform: 'none',
                }}
              >
                {tab3Saving ? 'Saving Subject Mapping...' : 'Save Subject Mapping'}
              </Button>
            </Box>
          )}
        </Box>
      )}

      {/* ===================== DRAWER: QUICK DATE SHEET EDIT ===================== */}
      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: { xs: 340, sm: 580 }, p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Drawer Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box>
              <Typography variant="h6" fontWeight={800} color="text.primary">
                {selectedExam?.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Class: <strong>{selectedExam?.className}</strong> | Term: <strong>{selectedExam?.termName}</strong>
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => setDrawerOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Quick Action Buttons */}
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<SparklesIcon />}
              onClick={() => handleAutoPopulate()}
              sx={{
                borderColor: 'var(--primary-color, #14b8a6)',
                color: 'var(--primary-color, #14b8a6)',
                fontWeight: 700,
                flex: 1,
                '&:hover': {
                  borderColor: 'var(--primary-color, #14b8a6)',
                  bgcolor: 'rgba(20, 184, 166, 0.08)'
                }
              }}
            >
              Auto-Populate
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => {
                setScheduleForm({
                  subjectId: subjects[0]?.id || '',
                  examDate: new Date().toISOString().split('T')[0],
                  startTime: '09:00',
                  endTime: '12:00',
                  maxMarks: 100,
                  passMarks: 33,
                  roomNo: 'Hall 1',
                });
                setScheduleModal(true);
              }}
              sx={{
                bgcolor: 'var(--primary-color, #14b8a6)',
                color: '#ffffff',
                '&:hover': { filter: 'brightness(0.92)', bgcolor: 'var(--primary-color, #14b8a6)' },
                fontWeight: 700,
                textTransform: 'none'
              }}
            >
              Add Slot
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<PrintIcon />}
              onClick={() => setDateSheetModalOpen(true)}
              disabled={schedules.length === 0}
              sx={{ fontWeight: 700 }}
            >
              Print
            </Button>
          </Stack>
          <Divider sx={{ mb: 2 }} />

          {/* Schedules List in Drawer */}
          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            {schedulesLoading ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <CircularProgress size={32} />
                <Typography variant="body2" sx={{ mt: 1 }}>Loading date sheet...</Typography>
              </Box>
            ) : schedules.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
                <ExamIcon sx={{ fontSize: 52, color: '#cbd5e1', mb: 1 }} />
                <Typography variant="body1" fontWeight={700}>No subjects scheduled yet.</Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  Click &ldquo;Auto-Populate&rdquo; to pull all class subjects automatically.
                </Typography>
              </Box>
            ) : (
              <Stack spacing={1.5}>
                {schedules.map((sch) => (
                  <Card key={sch.id} variant="outlined" sx={{ p: 2, borderRadius: 2, '&:hover': { bgcolor: '#f8fafc' } }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle2" fontWeight={800} color="text.primary">
                            {sch.subjectName}
                          </Typography>
                          {sch.subjectCode && (
                            <Chip label={sch.subjectCode} size="small" sx={{ fontSize: '0.7rem', height: 20 }} />
                          )}
                        </Box>

                        <Typography variant="body2" sx={{ mt: 0.5, color: '#334155', fontWeight: 600 }}>
                          📅 Date: <strong>{sch.examDate}</strong> | ⏰ Timing: <strong>{sch.startTime} - {sch.endTime}</strong>
                        </Typography>

                        <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
                          <Chip label={`Max Marks: ${sch.maxMarks}`} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
                          <Chip label={`Pass: ${sch.passMarks}`} size="small" variant="outlined" color="warning" sx={{ fontWeight: 700 }} />
                          {sch.roomNo && <Chip icon={<RoomIcon sx={{ fontSize: 14 }} />} label={`Room: ${sch.roomNo}`} size="small" variant="outlined" />}
                          <Chip
                            label={`${sch.marksEnteredCount || 0} Marks Entered`}
                            size="small"
                            color={(sch.marksEnteredCount || 0) > 0 ? 'success' : 'default'}
                            sx={{ fontWeight: 700 }}
                          />
                        </Stack>
                      </Box>
                      <IconButton size="small" color="error" onClick={() => handleDeleteSchedule(sch.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Card>
                ))}
              </Stack>
            )}
          </Box>
        </Box>
      </Drawer>

      {/* ===================== MODAL: PRINTABLE DATE SHEET PREVIEW ===================== */}
      <Dialog
        open={dateSheetModalOpen}
        onClose={() => setDateSheetModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Typography variant="h6" fontWeight={800}>
            Examination Date Sheet Official Preview
          </Typography>
          <IconButton size="small" onClick={() => setDateSheetModalOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 3, bgcolor: '#f8fafc' }}>
          <Box
            id="printable-datesheet"
            sx={{
              p: 3,
              bgcolor: '#ffffff',
              border: '2px solid #0f2b48',
              borderRadius: 1,
              fontFamily: 'serif',
            }}
          >
            {/* Header */}
            <Box sx={{ textAlign: 'center', pb: 2, borderBottom: '2px solid #0f2b48', mb: 2 }}>
              <Typography variant="h5" fontWeight={900} color="#0f2b48" sx={{ textTransform: 'uppercase' }}>
                KUSH PUBLIC SCHOOL
              </Typography>
              <Typography variant="body2" sx={{ color: '#475569', fontSize: '0.85rem' }}>
                Plot No. 999 Main Road, Surya Vihar, Part 3, Near Sec-91, Faridabad
              </Typography>
              <Box sx={{ mt: 1, display: 'inline-block', bgcolor: '#0f2b48', color: '#ffffff', px: 2, py: 0.5, borderRadius: 1 }}>
                <Typography variant="subtitle2" fontWeight={800} sx={{ letterSpacing: 1 }}>
                  EXAMINATION DATE SHEET — {selectedExam?.name?.toUpperCase()}
                </Typography>
              </Box>
            </Box>

            {/* Exam Meta */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, fontSize: '0.88rem', fontWeight: 700 }}>
              <Typography>Class: <strong>{selectedExam?.className}</strong></Typography>
              <Typography>Term: <strong>{selectedExam?.termName}</strong></Typography>
              <Typography>Academic Year: <strong>2025-2026</strong></Typography>
            </Box>

            {/* Timetable Table */}
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #0f2b48', mb: 3 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#0f2b48' }}>
                  <TableRow>
                    <TableCell sx={{ color: '#ffffff', fontWeight: 800 }}>Date</TableCell>
                    <TableCell sx={{ color: '#ffffff', fontWeight: 800 }}>Subject</TableCell>
                    <TableCell sx={{ color: '#ffffff', fontWeight: 800 }}>Subject Code</TableCell>
                    <TableCell sx={{ color: '#ffffff', fontWeight: 800 }}>Timing</TableCell>
                    <TableCell align="center" sx={{ color: '#ffffff', fontWeight: 800 }}>Max Marks</TableCell>
                    <TableCell align="center" sx={{ color: '#ffffff', fontWeight: 800 }}>Pass Marks</TableCell>
                    <TableCell align="center" sx={{ color: '#ffffff', fontWeight: 800 }}>Room / Hall</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {schedules.map((s, idx) => (
                    <TableRow key={s.id} sx={{ bgcolor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                      <TableCell sx={{ fontWeight: 700 }}>{s.examDate}</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#0f2b48' }}>{s.subjectName}</TableCell>
                      <TableCell>{s.subjectCode || '—'}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{s.startTime} - {s.endTime}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>{s.maxMarks}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>{s.passMarks}</TableCell>
                      <TableCell align="center">{s.roomNo || 'Hall-1'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Instructions & Signatures */}
            <Box sx={{ mt: 2, pt: 1, borderTop: '1px solid #cbd5e1' }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#0f2b48', display: 'block', mb: 0.5 }}>
                General Guidelines for Students:
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                1. Students must report to the examination room 15 minutes before the scheduled start time.
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                2. Admit Card and School ID Card are mandatory during all examination days.
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4, pt: 2, textAlign: 'center' }}>
              <Box sx={{ width: 140, borderTop: '1px solid #94a3b8', pt: 0.5 }}>
                <Typography variant="caption" fontWeight={700}>Exam In-charge</Typography>
              </Box>
              <Box sx={{ width: 140, borderTop: '1px solid #94a3b8', pt: 0.5 }}>
                <Typography variant="caption" fontWeight={800} color="#0f2b48">Principal Signature</Typography>
              </Box>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDateSheetModalOpen(false)}>Close</Button>
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={printDateSheet}
            sx={{
              bgcolor: 'var(--primary-color, #14b8a6)',
              color: '#ffffff',
              '&:hover': { filter: 'brightness(0.92)', bgcolor: 'var(--primary-color, #14b8a6)' },
              fontWeight: 700,
              textTransform: 'none'
            }}
          >
            Print Official Date Sheet
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===================== MODAL: ADD / EDIT SUBJECT SCHEDULE ===================== */}
      <Dialog open={scheduleModal} onClose={() => setScheduleModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: 'text.primary' }}>
          Schedule Subject Exam (Step 5: Subject Mapping)
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Select Subject</InputLabel>
                <Select
                  value={scheduleForm.subjectId}
                  label="Select Subject"
                  onChange={(e) => setScheduleForm({ ...scheduleForm, subjectId: e.target.value })}
                >
                  {subjects.map((sub) => (
                    <MenuItem key={sub.id} value={sub.id}>
                      {sub.name} {sub.code ? `(${sub.code})` : ''}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <AppDatePicker
                label="Exam Date"
                value={scheduleForm.examDate}
                onChange={(e) => {
                  const val = formatLocalDate(e.value);
                  setScheduleForm({ ...scheduleForm, examDate: val });
                }}
                placeholder="Select Date"
                dateFormat="dd/mm/yy"
                style={{ marginBottom: 0 }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Room / Hall No."
                placeholder="e.g. Hall 1, Room 102"
                value={scheduleForm.roomNo}
                onChange={(e) => setScheduleForm({ ...scheduleForm, roomNo: e.target.value })}
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                size="small"
                type="time"
                label="Start Time"
                InputLabelProps={{ shrink: true }}
                value={scheduleForm.startTime}
                onChange={(e) => setScheduleForm({ ...scheduleForm, startTime: e.target.value })}
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                size="small"
                type="time"
                label="End Time"
                InputLabelProps={{ shrink: true }}
                value={scheduleForm.endTime}
                onChange={(e) => setScheduleForm({ ...scheduleForm, endTime: e.target.value })}
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Maximum Marks"
                value={scheduleForm.maxMarks}
                onChange={(e) => setScheduleForm({ ...scheduleForm, maxMarks: Number(e.target.value) })}
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Passing Marks"
                value={scheduleForm.passMarks}
                onChange={(e) => setScheduleForm({ ...scheduleForm, passMarks: Number(e.target.value) })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setScheduleModal(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveSchedule}
            sx={{
              bgcolor: 'var(--primary-color, #14b8a6)',
              color: '#ffffff',
              '&:hover': { filter: 'brightness(0.92)', bgcolor: 'var(--primary-color, #14b8a6)' },
              fontWeight: 700,
              textTransform: 'none'
            }}
          >
            Save Subject Schedule
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===================== MODAL: CREATE / EDIT TERM (STEP 1) ===================== */}
      <Dialog open={termModal} onClose={() => setTermModal(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: 'text.primary' }}>
          {editingTerm ? 'Edit Academic Term' : 'Step 1: Create Academic Term'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Term Name"
                placeholder="e.g. Term 1, Half Yearly, Unit Test 1"
                value={termForm.name}
                onChange={(e) => setTermForm({ ...termForm, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                size="small"
                label="Term Code"
                placeholder="e.g. T1, HY, UT1"
                value={termForm.termCode}
                onChange={(e) => setTermForm({ ...termForm, termCode: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Weightage (%)"
                value={termForm.weightage}
                onChange={(e) => setTermForm({ ...termForm, weightage: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Description"
                multiline
                rows={2}
                placeholder="e.g. First term comprehensive examination"
                value={termForm.description}
                onChange={(e) => setTermForm({ ...termForm, description: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setTermModal(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveTerm}
            sx={{
              bgcolor: 'var(--primary-color, #14b8a6)',
              color: '#ffffff',
              '&:hover': { filter: 'brightness(0.92)', bgcolor: 'var(--primary-color, #14b8a6)' },
              fontWeight: 700,
              textTransform: 'none'
            }}
          >
            {editingTerm ? 'Update Term' : 'Save Term'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===================== MODAL: CREATE / EDIT EXAM (TERM WISE) ===================== */}
      <Modal
        open={examModal}
        onClose={() => setExamModal(false)}
        title={editingExam ? 'Edit Examination Master' : 'Create Examination Master'}
        maxWidth="sm"
        actions={
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, width: '100%' }}>
            <Button onClick={() => setExamModal(false)} sx={{ fontWeight: 700, color: '#475569' }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSaveExam}
              sx={{ 
                background: 'var(--app-modal-header-bg, linear-gradient(135deg, var(--primary-color, #14b8a6) 0%, var(--app-theme-darker, #0d9488) 100%))', 
                '&:hover': { opacity: 0.95 }, 
                fontWeight: 700, 
                px: 3,
                boxShadow: 'var(--app-modal-shadow, 0 4px 14px rgba(20, 184, 166, 0.35))'
              }}
            >
              {editingExam ? 'Update Exam' : 'Save Exam'}
            </Button>
          </Box>
        }
      >
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          {/* Exam Name (Dropdown + Custom Input) */}
          <Grid item xs={12} sm={7}>
            <Autocomplete
              freeSolo
              options={examTitleDropdownOptions}
              value={examForm.name}
              onInputChange={(event, newInputValue) => {
                setExamForm((prev) => ({ ...prev, name: newInputValue || '' }));
              }}
              onChange={(event, newValue) => {
                if (typeof newValue === 'string') {
                  setExamForm((prev) => ({ ...prev, name: newValue }));
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  label="Exam Name *"
                  placeholder="e.g. Periodic Test - 1, Half Yearly Examination"
                />
              )}
            />
          </Grid>

          {/* Academic Term (TERMS) */}
          <Grid item xs={12} sm={5}>
            <FormControl fullWidth size="small">
              <InputLabel>TERMS *</InputLabel>
              <Select
                value={examForm.termId}
                label="TERMS *"
                onChange={(e) => setExamForm({ ...examForm, termId: e.target.value })}
              >
                {terms.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.name} ({t.termCode})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Start Date */}
          <Grid item xs={12} sm={4}>
            <AppDatePicker
              label="Start Date"
              value={examForm.startDate}
              onChange={(e) => {
                const val = e.value instanceof Date 
                  ? `${e.value.getFullYear()}-${String(e.value.getMonth() + 1).padStart(2, '0')}-${String(e.value.getDate()).padStart(2, '0')}`
                  : (e.value || '');
                setExamForm({ ...examForm, startDate: val });
              }}
            />
          </Grid>

          {/* End Date */}
          <Grid item xs={12} sm={4}>
            <AppDatePicker
              label="End Date"
              value={examForm.endDate}
              onChange={(e) => {
                const val = e.value instanceof Date 
                  ? `${e.value.getFullYear()}-${String(e.value.getMonth() + 1).padStart(2, '0')}-${String(e.value.getDate()).padStart(2, '0')}`
                  : (e.value || '');
                setExamForm({ ...examForm, endDate: val });
              }}
            />
          </Grid>

          {/* Result Publish Date */}
          <Grid item xs={12} sm={4}>
            <AppDatePicker
              label="Result Publish Date"
              value={examForm.resultPublishDate}
              onChange={(e) => {
                const val = e.value instanceof Date 
                  ? `${e.value.getFullYear()}-${String(e.value.getMonth() + 1).padStart(2, '0')}-${String(e.value.getDate()).padStart(2, '0')}`
                  : (e.value || '');
                setExamForm({ ...examForm, resultPublishDate: val });
              }}
            />
          </Grid>

          {/* Target Classes Mapping */}
          {editingExam ? (
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Target Class</InputLabel>
                <Select
                  value={examForm.classId}
                  label="Target Class"
                  onChange={(e) => setExamForm({ ...examForm, classId: e.target.value })}
                >
                  {classes.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          ) : (
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Map to Classes</InputLabel>
                <Select
                  multiple
                  value={examForm.classIds}
                  onChange={(e) => {
                    const val = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                    setExamForm({ ...examForm, classIds: val });
                  }}
                  input={<OutlinedInput label="Map to Classes" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((val) => {
                        const cObj = classes.find((c) => c.id === val);
                        return <Chip key={val} label={cObj?.name || val} size="small" />;
                      })}
                    </Box>
                  )}
                >
                  {classes.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      <Checkbox checked={examForm.classIds.indexOf(c.id) > -1} />
                      <ListItemText primary={c.name} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Box sx={{ mt: 0.5, display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  onClick={() => setExamForm({ ...examForm, classIds: classes.map((c) => c.id) })}
                  sx={{ textTransform: 'none', fontSize: '0.75rem', p: 0 }}
                >
                  Select All Classes ({classes.length})
                </Button>
                <Typography variant="caption" sx={{ color: 'text.disabled' }}>|</Typography>
                <Button
                  size="small"
                  onClick={() => setExamForm({ ...examForm, classIds: [] })}
                  sx={{ textTransform: 'none', fontSize: '0.75rem', color: 'text.secondary', p: 0 }}
                >
                  Clear Selection
                </Button>
              </Box>
            </Grid>
          )}

          {/* Description / Instructions */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              size="small"
              label="Description & Instructions"
              multiline
              rows={2}
              placeholder="e.g. Conducted as per CBSE Term evaluation guidelines"
              value={examForm.description}
              onChange={(e) => setExamForm({ ...examForm, description: e.target.value })}
            />
          </Grid>
        </Grid>
      </Modal>
    </Box>
  );
};

export default ExamSchedulesPage;
