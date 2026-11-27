import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  MenuItem,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  List,
  ListItem,
  ListItemText,
  Divider,
  Avatar,
} from '@mui/material';
import {
  Add as AddIcon,
  PhoneInTalk as FollowupIcon,
  HowToReg as ConvertIcon,
  Search as SearchIcon,
  ReceiptLong as ReceiptLongIcon,
  WhatsApp as WhatsAppIcon,
  AccountBalanceWallet as FeeStructureIcon,
  AppRegistration as RegistrationIcon,
  School as SchoolIcon,
  ContactSupport as OpenIcon,
  CheckCircle as ConvertedIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DataGrid } from '../../../components/DataGrid';
import { Modal } from '../../../components/Modal';
import { enquiryApi } from '../api';
import { classApi } from '../../masters/api';
import { useUiStore } from '../../../store/uiStore';
import { useAuthStore } from '../../../store/authStore';
import { usePermission } from '../../../hooks/usePermission';
import { EnquirySlipModal } from '../components/EnquirySlipModal';
import { WhatsAppDialog } from '../../communication/components/WhatsAppDialog';
import { ClassFeeProspectusModal } from '../../fees/components/ClassFeeProspectusModal';
import { AppDatePicker, AppInput, AppSelect, AppButton, SlideActionCell } from '../../../components/common';

const ENQUIRY_STATUSES = [
  { value: 1, label: 'Open', color: 'info' },
  { value: 2, label: 'Follow-up', color: 'warning' },
  { value: 3, label: 'Converted', color: 'success' },
  { value: 4, label: 'Closed', color: 'default' },
];

export const EnquiriesPage = () => {
  const navigate = useNavigate();
  const { showSnackbar } = useUiStore();
  const { hasPermission } = usePermission();
  const { user, activeAcademicYearId, activeAcademicYearName, academicYears } = useAuthStore();

  const [enquiries, setEnquiries] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [summary, setSummary] = useState({ total: 0, open: 0, followup: 0, converted: 0, closed: 0 });
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });

  // Add Enquiry Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newEnquiry, setNewEnquiry] = useState({
    academicYearId: activeAcademicYearId || '',
    studentName: '',
    classId: '',
    guardianName: '',
    mobile: '',
    email: '',
    source: 'Walk-in',
    nextFollowupDate: '',
    notes: '',
  });

  // Followup Modal
  const [followupModalOpen, setFollowupModalOpen] = useState(false);
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [followupResponse, setFollowupResponse] = useState('');
  const [followupNotes, setFollowupNotes] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [updateStatus, setUpdateStatus] = useState(2); // Follow-up

  // Enquiry Slip Modal
  const [slipModalOpen, setSlipModalOpen] = useState(false);
  const [slipEnquiry, setSlipEnquiry] = useState(null);
  const [isNewlyCreated, setIsNewlyCreated] = useState(false);

  // WhatsApp Dialog State
  const [whatsAppModal, setWhatsAppModal] = useState({
    open: false,
    recipientName: '',
    recipientPhone: '',
    recipientRole: '',
    moduleKey: 'enquiry',
    moduleTitle: '',
    templateData: {},
  });

  // Class Fee Prospectus Modal
  const [feeProspectusOpen, setFeeProspectusOpen] = useState(false);
  const [feeProspectusClassId, setFeeProspectusClassId] = useState('');

  const loadClasses = async () => {
    try {
      const res = await classApi.getClasses();
      if (res.data.success) setClasses(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await enquiryApi.getSummary({
        academicYearId: activeAcademicYearId || undefined,
        classId: selectedClass || undefined,
      });
      if (res.data?.success) {
        setSummary(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load enquiry summary', err);
    }
  };

  const fetchEnquiries = async () => {
    try {
      setLoading(true);
      const params = {
        search: search.trim() || undefined,
        classId: selectedClass || undefined,
        status: selectedStatus || undefined,
        academicYearId: activeAcademicYearId || undefined,
        pageNo: paginationModel.page + 1,
        pageSize: paginationModel.pageSize,
      };
      const res = await enquiryApi.getEnquiries(params);
      if (res.data.success) {
        setEnquiries(res.data.data.items || []);
        setTotalCount(res.data.data.totalCount || 0);
      }
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to load enquiries', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    fetchEnquiries();
    fetchSummary();
  }, [paginationModel, selectedClass, selectedStatus, activeAcademicYearId]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
    fetchEnquiries();
  };

  const handleCreateEnquiry = async (e) => {
    e.preventDefault();
    try {
      const selectedYearId = Number(newEnquiry.academicYearId || activeAcademicYearId || 1);
      const payload = {
        ...newEnquiry,
        classId: Number(newEnquiry.classId),
        academicYearId: selectedYearId,
        nextFollowupDate: newEnquiry.nextFollowupDate
          ? new Date(newEnquiry.nextFollowupDate).toISOString()
          : null,
      };
      const res = await enquiryApi.createEnquiry(payload);
      showSnackbar('Enquiry recorded successfully', 'success');
      setAddModalOpen(false);

      const createdData = res.data?.data;
      const matchedClass = classes.find((c) => c.id === Number(newEnquiry.classId));
      const matchedYear = academicYears.find((y) => y.id === selectedYearId);
      const fullEnquiryForSlip = {
        ...(createdData || {}),
        ...payload,
        className: matchedClass?.name || '',
        academicYearName: matchedYear?.rawName || matchedYear?.name || activeAcademicYearName || '',
        createdOn: new Date().toISOString(),
      };

      setNewEnquiry({
        academicYearId: activeAcademicYearId || '',
        studentName: '',
        classId: '',
        guardianName: '',
        mobile: '',
        email: '',
        source: 'Walk-in',
        nextFollowupDate: '',
        notes: '',
      });
      fetchEnquiries();

      // Show Enquiry Slip modal immediately
      setSlipEnquiry(fullEnquiryForSlip);
      setIsNewlyCreated(true);
      setSlipModalOpen(true);
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to save enquiry', 'error');
    }
  };

  const handleOpenSlip = (enquiry) => {
    setSlipEnquiry(enquiry);
    setIsNewlyCreated(false);
    setSlipModalOpen(true);
  };

  const handleOpenFollowup = async (enquiry) => {
    if (enquiry.status === 3) {
      showSnackbar('This enquiry has already been converted to an admission. Follow-ups are closed.', 'info');
      return;
    }
    try {
      const res = await enquiryApi.getEnquiry(enquiry.id);
      if (res.data.success) {
        setSelectedEnquiry(res.data.data);
        setFollowupResponse('');
        setFollowupNotes('');
        setNextDate('');
        setUpdateStatus(res.data.data.status);
        setFollowupModalOpen(true);
      }
    } catch (err) {
      showSnackbar('Failed to load enquiry history', 'error');
    }
  };

  const handleSaveFollowup = async (e) => {
    e.preventDefault();
    if (!followupResponse.trim()) {
      showSnackbar('Follow-up response is required', 'warning');
      return;
    }

    try {
      await enquiryApi.addFollowup(selectedEnquiry.id, {
        response: followupResponse,
        notes: followupNotes,
        nextFollowupDate: nextDate ? new Date(nextDate).toISOString() : null,
        updateStatus,
      });
      showSnackbar('Follow-up logged successfully', 'success');
      setFollowupModalOpen(false);
      fetchEnquiries();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Error logging follow-up', 'error');
    }
  };

  const handleConvertToAdmission = (enquiry) => {
    // Pre-fill admission with enquiry data (FR-3.2)
    navigate('/admissions/new', {
      state: {
        enquiryId: enquiry.id,
        studentName: enquiry.studentName,
        classId: enquiry.classId,
        guardianName: enquiry.guardianName,
        mobile: enquiry.mobile,
        email: enquiry.email,
      },
    });
  };

  const handleConvertToRegistration = (enquiry) => {
    // Pre-fill registration slip generator with enquiry data
    navigate('/registrations/slip-generator', {
      state: {
        enquiryId: enquiry.id,
        studentName: enquiry.studentName,
        classId: enquiry.classId,
        fatherName: enquiry.guardianName,
        contactNumber: enquiry.mobile,
        email: enquiry.email,
        gender: enquiry.gender || 'Male',
      },
    });
  };

  const getStatusChip = (status) => {
    const s = ENQUIRY_STATUSES.find((item) => item.value === status);
    return <Chip label={s?.label || 'Open'} color={s?.color || 'default'} size="small" />;
  };

  const handleOpenWhatsApp = (enquiry) => {
    setWhatsAppModal({
      open: true,
      recipientName: enquiry.guardianName || enquiry.studentName,
      recipientPhone: enquiry.mobile,
      recipientRole: `Parent of ${enquiry.studentName}`,
      moduleKey: 'enquiry',
      moduleTitle: 'Enquiry Acknowledgement (WhatsApp)',
      templateData: {
        ParentName: enquiry.guardianName || 'Parent',
        StudentName: enquiry.studentName,
        ClassName: enquiry.className || 'Class Seeking Admission',
        EnquiryNo: enquiry.enquiryNo || `ENQ-${enquiry.id}`,
      },
    });
  };

  // Fetch all matching records for full export (PDF or Excel)
  const fetchAllMatchingEnquiries = async () => {
    if (!enquiries.length && !totalCount) return [];
    if (totalCount <= enquiries.length) return enquiries;
    try {
      const res = await enquiryApi.getEnquiries({
        search: search.trim() || undefined,
        classId: selectedClass || undefined,
        status: selectedStatus || undefined,
        academicYearId: activeAcademicYearId || undefined,
        pageNo: 1,
        pageSize: totalCount || 1000,
      });
      if (res.data?.success && res.data.data?.items) {
        return res.data.data.items;
      }
    } catch (err) {
      console.error('Failed to fetch full enquiries list', err);
    }
    return enquiries;
  };

  // Export to PDF with Comprehensive Details
  const handleExportPDF = async () => {
    if (!totalCount && !enquiries.length) {
      showSnackbar('No enquiries found to export', 'warning');
      return;
    }

    setIsExportingPdf(true);
    try {
      const exportList = await fetchAllMatchingEnquiries();
      if (!exportList || !exportList.length) {
        showSnackbar('No enquiries to export', 'warning');
        return;
      }

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.width;

      const schoolName = (user?.schoolName || 'DELHI PUBLIC SCHOOL').toUpperCase();
      const branchName = user?.branchName || 'Main Campus';
      const schoolPhones = [user?.schoolPhone, user?.schoolAlternatePhone].filter(Boolean);
      const contactStr = schoolPhones.length > 0 ? `  |  Phone: ${schoolPhones.join(', ')}` : '';
      const matchedClass = classes.find((c) => String(c.id) === String(selectedClass));
      const className = matchedClass ? matchedClass.name : 'All Classes';
      const statusObj = ENQUIRY_STATUSES.find((s) => String(s.value) === String(selectedStatus));
      const statusLabel = statusObj ? statusObj.label : 'All Statuses';

      const openCount = exportList.filter((e) => e.status === 1).length;
      const followupCount = exportList.filter((e) => e.status === 2).length;
      const convertedCount = exportList.filter((e) => e.status === 3).length;

      let startX = 8;
      if (user?.schoolLogoUrl) {
        try {
          doc.addImage(user.schoolLogoUrl, 'PNG', 8, 8, 14, 14);
          startX = 25;
        } catch (e) {
          startX = 8;
        }
      }

      // School Name Header
      doc.setFontSize(14);
      doc.setTextColor(29, 78, 216); // Brand Blue
      doc.text(schoolName, startX, 12);

      // Subtitle
      doc.setFontSize(9.5);
      doc.setTextColor(51, 65, 85);
      doc.text(`${branchName}${contactStr}  •  STUDENT ENQUIRIES & ADMISSION LEADS REGISTER`, startX, 17.5);

      // Filter & Session info line
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Session: ${activeAcademicYearName || 'Current Session'}   |   Class: ${className}   |   Status: ${statusLabel}   |   Generated: ${dayjs().format('DD-MMM-YYYY, hh:mm A')}`,
        startX,
        22.5
      );

      // KPI Counts Banner
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.setFont(undefined, 'bold');
      doc.text(
        `Total Enquiries: ${exportList.length}   |   Open Leads: ${openCount}   |   Follow-up: ${followupCount}   |   Converted Admissions: ${convertedCount}`,
        8,
        27
      );
      doc.setFont(undefined, 'normal');

      // Table Data
      const tableData = exportList.map((e, idx) => {
        const dateStr = e.createdOn ? dayjs(e.createdOn).format('DD/MM/YYYY') : '—';
        const nextDateStr = e.nextFollowupDate ? dayjs(e.nextFollowupDate).format('DD/MM/YYYY') : '—';
        const stLabel = e.status === 1 ? 'Open' : (e.status === 2 ? 'Follow-up' : (e.status === 3 ? 'Converted' : 'Closed'));

        return [
          idx + 1,
          e.enquiryNo || `ENQ-${e.id}`,
          dateStr,
          e.studentName || '—',
          e.className || '—',
          e.academicYearName || activeAcademicYearName || '—',
          e.guardianName || '—',
          e.mobile || '—',
          e.source || 'Walk-in',
          stLabel,
          nextDateStr,
          e.notes || '—',
        ];
      });

      autoTable(doc, {
        startY: 30,
        margin: { left: 8, right: 8, bottom: 8 },
        tableWidth: 281,
        head: [
          [
            '#',
            'Enquiry No',
            'Date',
            'Student Name',
            'Class Sought',
            'Session',
            'Parent / Guardian',
            'Mobile',
            'Source',
            'Status',
            'Next Follow-up',
            'Notes / Remarks',
          ],
        ],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 7.2, textColor: [30, 41, 59], cellPadding: 1.5, valign: 'middle' },
        headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 7, halign: 'center' },
          1: { cellWidth: 24 },
          2: { cellWidth: 17 },
          3: { cellWidth: 34 },
          4: { cellWidth: 20 },
          5: { cellWidth: 17 },
          6: { cellWidth: 32 },
          7: { cellWidth: 23 },
          8: { cellWidth: 18 },
          9: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
          10: { cellWidth: 21 },
          11: { cellWidth: 48 },
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 9) {
            if (data.cell.raw === 'Converted') {
              data.cell.styles.textColor = [22, 163, 74];
            } else if (data.cell.raw === 'Open') {
              data.cell.styles.textColor = [2, 132, 199];
            } else if (data.cell.raw === 'Follow-up') {
              data.cell.styles.textColor = [217, 119, 6];
            }
          }
        },
        didDrawPage: () => {
          const pageCount = doc.internal.getNumberOfPages();
          doc.setFontSize(7.5);
          doc.setTextColor(148, 163, 184);
          doc.text(
            `Page ${doc.internal.getCurrentPageInfo().pageNumber} of ${pageCount} • School ERP Student Enquiries`,
            pageWidth - 75,
            doc.internal.pageSize.height - 5
          );
        },
      });

      const cleanClass = className.replace(/[\/\\:]/g, '-').replace(/\s+/g, '_');
      doc.save(`Student_Enquiries_${cleanClass}_${dayjs().format('YYYY-MM-DD')}.pdf`);
      showSnackbar('Enquiry register exported to PDF successfully', 'success');
    } catch (err) {
      console.error('Error generating Enquiry PDF', err);
      showSnackbar('Failed to generate PDF', 'error');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Export to Excel
  const handleExportExcel = async () => {
    if (!totalCount && !enquiries.length) {
      showSnackbar('No enquiries to export', 'warning');
      return;
    }

    setIsExportingExcel(true);
    try {
      const exportList = await fetchAllMatchingEnquiries();
      const dataToExport = exportList.map((e, idx) => ({
        'S.No': idx + 1,
        'Enquiry No': e.enquiryNo || `ENQ-${e.id}`,
        'Date': e.createdOn ? dayjs(e.createdOn).format('DD/MM/YYYY') : '—',
        'Student Name': e.studentName || '—',
        'Class Sought': e.className || '—',
        'Session': e.academicYearName || activeAcademicYearName || '—',
        'Parent / Guardian': e.guardianName || '—',
        'Mobile': e.mobile || '—',
        'Email': e.email || '—',
        'Source': e.source || 'Walk-in',
        'Status': e.status === 1 ? 'Open' : (e.status === 2 ? 'Follow-up' : (e.status === 3 ? 'Converted' : 'Closed')),
        'Next Follow-up': e.nextFollowupDate ? dayjs(e.nextFollowupDate).format('DD/MM/YYYY') : '—',
        'Notes': e.notes || '—',
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Enquiries');
      XLSX.writeFile(wb, `Student_Enquiries_${dayjs().format('YYYY-MM-DD')}.xlsx`);
      showSnackbar('Enquiry list exported to Excel', 'success');
    } catch (err) {
      console.error('Error exporting to Excel', err);
      showSnackbar('Failed to export Excel', 'error');
    } finally {
      setIsExportingExcel(false);
    }
  };

  const columns = [
    { field: 'studentName', headerName: 'Student Name', width: 170, minWidth: 170 },
    { field: 'className', headerName: 'Class Sought', width: 120, minWidth: 120 },
    {
      field: 'academicYearName',
      headerName: 'Session',
      width: 110,
      minWidth: 110,
      renderCell: (params) => (
        <Chip
          label={params.value || activeAcademicYearName || 'Current'}
          size="small"
          variant="outlined"
          color="primary"
          sx={{ fontWeight: 600, fontSize: '11px' }}
        />
      ),
    },
    { field: 'guardianName', headerName: 'Parent / Guardian', width: 160, minWidth: 160 },
    { field: 'mobile', headerName: 'Mobile', width: 130, minWidth: 130 },
    { field: 'source', headerName: 'Source', width: 110, minWidth: 110 },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      minWidth: 120,
      renderCell: (params) => getStatusChip(params.value),
    },
    {
      field: 'nextFollowupDate',
      headerName: 'Next Follow-up',
      width: 140,
      minWidth: 140,
      renderCell: (params) => (params.value ? dayjs(params.value).format('DD MMM YYYY') : '-'),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 90,
      minWidth: 90,
      sortable: false,
      frozen: true,
      alignFrozen: 'right',
      headerStyle: { width: '90px', minWidth: '90px', textAlign: 'center' },
      bodyStyle: { width: '90px', minWidth: '90px', textAlign: 'center', overflow: 'visible' },
      style: { width: '90px', minWidth: '90px', textAlign: 'center', overflow: 'visible' },
      renderCell: (params) => {
        const enq = params.row;
        const canAdmit = hasPermission('Admissions', 'Add');
        const isConverted = enq.status === 3;

        return (
          <SlideActionCell label="Actions">
            {/* 1. Send WhatsApp */}
            <Tooltip title="Send WhatsApp Message" arrow>
              <IconButton
                size="small"
                sx={{
                  width: 28,
                  height: 28,
                  color: '#16a34a',
                  bgcolor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  '&:hover': { bgcolor: '#dcfce7' },
                  borderRadius: '6px',
                }}
                onClick={() => handleOpenWhatsApp(enq)}
              >
                <WhatsAppIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>

            {/* 2. Print Enquiry Slip */}
            <Tooltip title="Print Enquiry Slip" arrow>
              <IconButton
                size="small"
                sx={{
                  width: 28,
                  height: 28,
                  color: '#0284c7',
                  bgcolor: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  '&:hover': { bgcolor: '#e0f2fe' },
                  borderRadius: '6px',
                }}
                onClick={() => handleOpenSlip(enq)}
              >
                <ReceiptLongIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>

            {/* 3. Class Fee Structure */}
            <Tooltip title={`Class Fee Structure (${enq.className || 'Class'})`} arrow>
              <IconButton
                size="small"
                sx={{
                  width: 28,
                  height: 28,
                  color: '#7c3aed',
                  bgcolor: '#f5f3ff',
                  border: '1px solid #ddd6fe',
                  '&:hover': { bgcolor: '#ede9fe' },
                  borderRadius: '6px',
                }}
                onClick={() => {
                  setFeeProspectusClassId(enq.classId || '');
                  setFeeProspectusOpen(true);
                }}
              >
                <FeeStructureIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>

            {/* 4. Log Follow-up */}
            <Tooltip title={isConverted ? "Enquiry is already converted to admission" : "Log Follow-up Call / Visit"} arrow>
              <span>
                <IconButton
                  size="small"
                  disabled={isConverted}
                  sx={{
                    width: 28,
                    height: 28,
                    color: isConverted ? '#94a3b8' : '#2563eb',
                    bgcolor: isConverted ? '#f8fafc' : '#eff6ff',
                    border: '1px solid',
                    borderColor: isConverted ? '#e2e8f0' : '#bfdbfe',
                    '&:hover': { bgcolor: isConverted ? '#f8fafc' : '#dbeafe' },
                    borderRadius: '6px',
                  }}
                  onClick={() => handleOpenFollowup(enq)}
                >
                  <FollowupIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </span>
            </Tooltip>

            {/* 5. Convert to Registration */}
            {!isConverted && (
              <Tooltip title="Convert to Registration (Issue Registration Slip)" arrow>
                <IconButton
                  size="small"
                  sx={{
                    width: 28,
                    height: 28,
                    color: '#0d9488',
                    bgcolor: '#f0fdfa',
                    border: '1px solid #99f6e4',
                    '&:hover': { bgcolor: '#ccfbf1' },
                    borderRadius: '6px',
                  }}
                  onClick={() => handleConvertToRegistration(enq)}
                >
                  <RegistrationIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            )}

            {/* 6. Convert to Admission */}
            {canAdmit && !isConverted && (
              <Tooltip title="Convert to Admission" arrow>
                <IconButton
                  size="small"
                  sx={{
                    width: 28,
                    height: 28,
                    color: '#ea580c',
                    bgcolor: '#fff7ed',
                    border: '1px solid #fed7aa',
                    '&:hover': { bgcolor: '#ffedd5' },
                    borderRadius: '6px',
                  }}
                  onClick={() => handleConvertToAdmission(enq)}
                >
                  <ConvertIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            )}
          </SlideActionCell>
        );
      },
    },
  ];

  return (
    <Box sx={{ pb: 2 }}>
      <Box sx={{ mb: 1.5, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 1 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, fontSize: { xs: '1.15rem', sm: '1.35rem' }, lineHeight: 1.2 }}>
            Student Enquiries & Leads
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.74rem', sm: '0.82rem' }, mt: 0.25 }}>
            Manage admission leads, follow-up calls, and lead conversions
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <AppButton
            variant="outlined"
            severity="danger"
            icon="pi pi-file-pdf"
            label="Download PDF"
            onClick={handleExportPDF}
            loading={isExportingPdf}
            disabled={!enquiries.length && totalCount === 0}
          />
          <AppButton
            variant="outlined"
            severity="success"
            icon="pi pi-file-excel"
            label="Export Excel"
            onClick={handleExportExcel}
            loading={isExportingExcel}
            disabled={!enquiries.length && totalCount === 0}
          />
          <Button
            variant="outlined"
            color="primary"
            startIcon={<FeeStructureIcon sx={{ fontSize: '16px !important' }} />}
            onClick={() => {
              setFeeProspectusClassId(selectedClass || '');
              setFeeProspectusOpen(true);
            }}
            sx={{
              height: 32,
              minHeight: 32,
              px: 1.5,
              py: 0,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '12px',
              borderRadius: '6px',
              borderWidth: '1.5px',
              alignSelf: { xs: 'flex-start', sm: 'center' },
              '&:hover': { borderWidth: '1.5px' },
            }}
          >
            Class Fee Structure
          </Button>
        </Box>
      </Box>

      {/* KPI Summary Cards: Total Enquiries, Open Leads, Follow-up, Converted */}
      <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            variant="outlined"
            sx={{
              p: '8px 12px',
              borderRadius: 2,
              borderLeft: '4px solid #2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              bgcolor: 'background.paper',
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase', fontSize: '10px' }}>
                Total Enquiries
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                {summary.total || totalCount}
              </Typography>
            </Box>
            <Avatar sx={{ bgcolor: '#eff6ff', color: '#2563eb', width: 34, height: 34 }}>
              <SchoolIcon fontSize="small" />
            </Avatar>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            variant="outlined"
            sx={{
              p: '8px 12px',
              borderRadius: 2,
              borderLeft: '4px solid #0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              bgcolor: 'background.paper',
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase', fontSize: '10px' }}>
                Open Leads
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0284c7', lineHeight: 1.2 }}>
                {summary.open ?? 0}
              </Typography>
            </Box>
            <Avatar sx={{ bgcolor: '#f0f9ff', color: '#0284c7', width: 34, height: 34 }}>
              <OpenIcon fontSize="small" />
            </Avatar>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            variant="outlined"
            sx={{
              p: '8px 12px',
              borderRadius: 2,
              borderLeft: '4px solid #d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              bgcolor: 'background.paper',
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase', fontSize: '10px' }}>
                Follow-up Pending
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#d97706', lineHeight: 1.2 }}>
                {summary.followup ?? 0}
              </Typography>
            </Box>
            <Avatar sx={{ bgcolor: '#fffbeb', color: '#d97706', width: 34, height: 34 }}>
              <FollowupIcon fontSize="small" />
            </Avatar>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            variant="outlined"
            sx={{
              p: '8px 12px',
              borderRadius: 2,
              borderLeft: '4px solid #16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              bgcolor: 'background.paper',
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase', fontSize: '10px' }}>
                Converted Admissions
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#16a34a', lineHeight: 1.2 }}>
                {summary.converted ?? 0}
              </Typography>
            </Box>
            <Avatar sx={{ bgcolor: '#f0fdf4', color: '#16a34a', width: 34, height: 34 }}>
              <ConvertedIcon fontSize="small" />
            </Avatar>
          </Paper>
        </Grid>
      </Grid>

      {/* Filter Toolbar */}
      <Paper sx={{ p: 1.5, mb: 1.5, borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Grid container spacing={1.5} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <Box component="form" onSubmit={handleSearchSubmit} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Box sx={{ flex: 1 }}>
                <AppInput
                  label="Search Enquiries"
                  placeholder="Student, parent, phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </Box>
              <Button
                variant="contained"
                type="submit"
                startIcon={<SearchIcon sx={{ fontSize: '16px !important' }} />}
                sx={{
                  height: 32,
                  minHeight: 32,
                  minWidth: 84,
                  px: 1.5,
                  py: 0,
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '12px',
                  flexShrink: 0,
                  borderRadius: '6px',
                }}
              >
                Search
              </Button>
            </Box>
          </Grid>
          <Grid item xs={12} sm={3} md={4}>
            <AppSelect
              label="Class Sought"
              placeholder="All Classes"
              value={selectedClass}
              options={classes.map((c) => ({ label: c.name, value: c.id }))}
              onChange={(e) => setSelectedClass(e.target.value)}
              showClear
            />
          </Grid>
          <Grid item xs={12} sm={3} md={4}>
            <AppSelect
              label="Enquiry Status"
              placeholder="All Statuses"
              value={selectedStatus}
              options={ENQUIRY_STATUSES.map((s) => ({ label: s.label, value: s.value }))}
              onChange={(e) => setSelectedStatus(e.target.value)}
              showClear
            />
          </Grid>
        </Grid>
      </Paper>

      {/* DataGrid */}
      <DataGrid
        menuKey="Enquiries"
        columns={columns}
        rows={enquiries}
        rowCount={totalCount}
        loading={loading}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        onAddClick={() => setAddModalOpen(true)}
        addLabel="Record New Enquiry"
        onExportClick={handleExportExcel}
        tableStyle={{ minWidth: '1050px' }}
      />

      {/* New Enquiry Modal */}
      <Modal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Record New Student Enquiry"
        maxWidth="sm"
        formId="enquiry-form"
        submitLabel="Save Enquiry"
      >
        <Box component="form" id="enquiry-form" onSubmit={handleCreateEnquiry} sx={{ mt: 1 }}>
          <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <AppSelect
                required
                label="Academic Session"
                value={newEnquiry.academicYearId || activeAcademicYearId || ''}
                options={academicYears.map((ay) => ({ label: ay.name || `Session ${ay.rawName}`, value: ay.id }))}
                onChange={(e) => setNewEnquiry({ ...newEnquiry, academicYearId: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <AppInput
                required
                label="Student Name"
                placeholder="Enter candidate name"
                value={newEnquiry.studentName}
                onChange={(e) => setNewEnquiry({ ...newEnquiry, studentName: e.target.value.toUpperCase() })}
                inputProps={{ style: { textTransform: 'uppercase' } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
                <Box sx={{ flex: 1 }}>
                  <AppSelect
                    required
                    label="Class Sought"
                    placeholder="Select Class"
                    value={newEnquiry.classId}
                    options={classes.map((c) => ({ label: c.name, value: c.id }))}
                    onChange={(e) => setNewEnquiry({ ...newEnquiry, classId: e.target.value })}
                  />
                </Box>
                {newEnquiry.classId && (
                  <Tooltip title="View fee details for this class">
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        setFeeProspectusClassId(newEnquiry.classId);
                        setFeeProspectusOpen(true);
                      }}
                      sx={{
                        height: 30,
                        minWidth: 70,
                        px: 1,
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '11px',
                        flexShrink: 0,
                        mb: '2px',
                        borderRadius: 1,
                      }}
                    >
                      Fee Info
                    </Button>
                  </Tooltip>
                )}
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <AppInput
                required
                label="Parent / Guardian Name"
                placeholder="Father or mother name"
                value={newEnquiry.guardianName}
                onChange={(e) => setNewEnquiry({ ...newEnquiry, guardianName: e.target.value.toUpperCase() })}
                inputProps={{ style: { textTransform: 'uppercase' } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <AppInput
                required
                label="Contact Mobile"
                placeholder="10 digit mobile"
                value={newEnquiry.mobile}
                maxLength={10}
                onChange={(e) => setNewEnquiry({ ...newEnquiry, mobile: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <AppInput
                label="Email Address"
                placeholder="parent@example.com"
                value={newEnquiry.email}
                onChange={(e) => setNewEnquiry({ ...newEnquiry, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <AppSelect
                label="Lead Source"
                placeholder="Select source"
                value={newEnquiry.source}
                options={[
                  { label: 'Walk-in Visit', value: 'Walk-in' },
                  { label: 'Website Form', value: 'Website' },
                  { label: 'Word of Mouth / Referral', value: 'Referral' },
                  { label: 'Social Media (FB/IG)', value: 'Social Media' },
                  { label: 'Newspaper Advertisement', value: 'Newspaper' },
                ]}
                onChange={(e) => setNewEnquiry({ ...newEnquiry, source: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <AppDatePicker
                label="Next Follow-up Date"
                value={newEnquiry.nextFollowupDate}
                onChange={(e) => {
                  setNewEnquiry({
                    ...newEnquiry,
                    nextFollowupDate: e.value ? dayjs(e.value).format('YYYY-MM-DD') : '',
                  });
                }}
                dateFormat="dd/M/yy"
              />
            </Grid>
            <Grid item xs={12}>
              <AppInput
                type="textarea"
                rows={2}
                label="Initial Discussion Notes"
                placeholder="Inquiries raised, discussion summary..."
                value={newEnquiry.notes}
                onChange={(e) => setNewEnquiry({ ...newEnquiry, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </Box>
      </Modal>

      {/* Follow-up History & Log Modal */}
      <Modal
        open={followupModalOpen}
        onClose={() => setFollowupModalOpen(false)}
        title={`Follow-up Log: ${selectedEnquiry?.studentName || ''}`}
        maxWidth="sm"
        formId="followup-form"
        submitLabel="Save Follow-up"
      >
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Parent: {selectedEnquiry?.guardianName} ({selectedEnquiry?.mobile})
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Class Sought: {selectedEnquiry?.className} | Status: {getStatusChip(selectedEnquiry?.status)}
            </Typography>
          </Box>

          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Previous Follow-up History
          </Typography>
          {selectedEnquiry?.followups?.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
              No follow-ups recorded yet.
            </Typography>
          ) : (
            <List dense sx={{ maxHeight: 180, overflow: 'auto', bgcolor: '#fafafa', borderRadius: 1, mb: 2 }}>
              {selectedEnquiry?.followups?.map((f) => (
                <ListItem key={f.id} alignItems="flex-start">
                  <ListItemText
                    primary={`${dayjs(f.followupDate).format('DD/MM/YYYY hh:mm A')} - ${f.response}`}
                    secondary={f.notes ? `Notes: ${f.notes}` : null}
                  />
                </ListItem>
              ))}
            </List>
          )}

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
            Log New Follow-up
          </Typography>
          <Box component="form" id="followup-form" onSubmit={handleSaveFollowup}>
            <Grid container spacing={1.5}>
              <Grid item xs={12}>
                <AppInput
                  required
                  label="Parent / Caller Response"
                  placeholder="e.g. Visited school, requested syllabus, will decide by Monday"
                  value={followupResponse}
                  onChange={(e) => setFollowupResponse(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <AppDatePicker
                  label="Next Follow-up Date"
                  value={nextDate}
                  onChange={(e) => {
                    setNextDate(e.value ? dayjs(e.value).format('YYYY-MM-DD') : '');
                  }}
                  dateFormat="dd/M/yy"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <AppSelect
                  label="Update Status"
                  value={updateStatus}
                  options={[
                    { label: 'Follow-up', value: 2 },
                    { label: 'Converted to Admission', value: 3 },
                    { label: 'Closed / Not Interested', value: 4 },
                  ]}
                  onChange={(e) => setUpdateStatus(Number(e.target.value))}
                />
              </Grid>
              <Grid item xs={12}>
                <AppInput
                  type="textarea"
                  rows={2}
                  label="Additional Internal Notes"
                  placeholder="Internal counselor remarks..."
                  value={followupNotes}
                  onChange={(e) => setFollowupNotes(e.target.value)}
                />
              </Grid>
            </Grid>
          </Box>
        </Modal>

      {/* Printable Enquiry Slip Modal */}
      <EnquirySlipModal
        open={slipModalOpen}
        onClose={() => setSlipModalOpen(false)}
        enquiryId={slipEnquiry?.id}
        enquiryData={slipEnquiry}
        isNew={isNewlyCreated}
        onConvertToRegistration={(enq) => {
          setSlipModalOpen(false);
          handleConvertToRegistration(enq);
        }}
        onConvertToAdmission={(enq) => {
          setSlipModalOpen(false);
          handleConvertToAdmission(enq);
        }}
      />

      {/* WhatsApp Dialog */}
      <WhatsAppDialog
        open={whatsAppModal.open}
        onClose={() => setWhatsAppModal((prev) => ({ ...prev, open: false }))}
        recipientName={whatsAppModal.recipientName}
        recipientPhone={whatsAppModal.recipientPhone}
        recipientRole={whatsAppModal.recipientRole}
        moduleKey={whatsAppModal.moduleKey}
        moduleTitle={whatsAppModal.moduleTitle}
        templateData={whatsAppModal.templateData}
      />

      {/* Class Fee Structure / Prospectus Modal */}
      <ClassFeeProspectusModal
        open={feeProspectusOpen}
        onClose={() => setFeeProspectusOpen(false)}
        initialClassId={feeProspectusClassId}
      />
    </Box>
  );
};
