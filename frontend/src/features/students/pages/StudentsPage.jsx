import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  MenuItem,
  Button,
  IconButton,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Stack,
  Tooltip,
  Paper
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  Badge as BadgeIcon,
  SwapHoriz as SwapHorizIcon,
  FileDownload as FileDownloadIcon,
  FormatListNumbered as RollNoIcon,
  Print as PrintIcon,
  Phone as PhoneIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  ReceiptLong as ReceiptLongIcon,
  Edit as EditIcon,
  WhatsApp as WhatsAppIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { studentApi } from '../api';
import { classesApi, simpleMasterApi } from '../../masters/api';
import { AdmissionReportModal } from '../components/AdmissionReportModal';
import { WhatsAppDialog } from '../../communication/components/WhatsAppDialog';
import { DataGrid } from '../../../components/DataGrid';
import { usePermission } from '../../../hooks/usePermission';
import { AppInput, AppSelect, AppButton, SlideActionCell } from '../../../components/common';
import { printWithTitle } from '../../../utils/printUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import dayjs from 'dayjs';
import { useAuthStore } from '../../../store/authStore';

export default function StudentsPage() {
  const navigate = useNavigate();
  const { can } = usePermission();
  const { user, activeAcademicYearName } = useAuthStore();

  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Filters state
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [status, setStatus] = useState('1'); // 1 = Active default
  const [categoryId, setCategoryId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // ID Card preview modal state
  const [selectedStudentForCard, setSelectedStudentForCard] = useState(null);
  const [isIdCardOpen, setIsIdCardOpen] = useState(false);

  // Admission Report modal state
  const [admissionReportStudent, setAdmissionReportStudent] = useState(null);
  const [isAdmissionReportOpen, setIsAdmissionReportOpen] = useState(false);

  const handleOpenAdmissionReport = (student) => {
    setAdmissionReportStudent(student);
    setIsAdmissionReportOpen(true);
  };

  // WhatsApp Dialog State
  const [whatsAppModal, setWhatsAppModal] = useState({
    open: false,
    recipientName: '',
    recipientPhone: '',
    recipientRole: '',
    moduleKey: 'admission',
    moduleTitle: '',
    templateData: {},
  });

  const handleOpenWhatsApp = (student) => {
    setWhatsAppModal({
      open: true,
      recipientName: student.guardianName || student.fullName,
      recipientPhone: student.guardianMobile || student.emergencyContactNumber || student.mobile,
      recipientRole: `Parent of ${student.fullName}`,
      moduleKey: 'admission',
      moduleTitle: 'WhatsApp Notification',
      templateData: {
        ParentName: student.guardianName || 'Parent',
        StudentName: student.fullName,
        AdmissionNo: student.admissionNo || '',
        ClassName: student.className || '',
        Section: student.sectionName || '',
        RollNo: student.rollNo || '',
        Date: dayjs().format('DD-MM-YYYY'),
      },
    });
  };

  // Fetch classes and sections
  const { data: classesRes } = useQuery({
    queryKey: ['classes-list'],
    queryFn: () => classesApi.getClasses(),
  });
  const classes = classesRes?.data?.data || [];

  const selectedClassObj = classes.find((c) => String(c.id) === String(classId));
  const sections = selectedClassObj ? selectedClassObj.sections : [];

  // Fetch student categories
  const { data: categoriesRes } = useQuery({
    queryKey: ['student-categories'],
    queryFn: () => simpleMasterApi.getMasters('Category'),
  });
  const categories = categoriesRes?.data?.data || [];

  // Fetch students
  const queryParams = {
    pageNo: page + 1,
    pageSize,
    search: searchTerm?.trim() || undefined,
    classId: (classId !== '' && classId != null) ? classId : undefined,
    sectionId: (sectionId !== '' && sectionId != null) ? sectionId : undefined,
    status: (status !== '' && status != null) ? status : undefined,
    categoryId: (categoryId !== '' && categoryId != null) ? categoryId : undefined,
  };

  const {
    data: studentsRes,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['students-directory', queryParams],
    queryFn: () => studentApi.getStudents(queryParams),
  });

  const studentData = studentsRes?.data?.data || {};
  const students = studentData.items || (Array.isArray(studentsRes?.data?.data) ? studentsRes?.data?.data : []);
  const totalCount = studentData.totalCount || students.length || 0;

  // Summary counts (Total, Boys, Girls)
  const { data: summaryRes } = useQuery({
    queryKey: ['students-admission-summary', classId, sectionId],
    queryFn: () =>
      studentApi.getAdmissionSummary({
        classId: classId || undefined,
        sectionId: sectionId || undefined,
      }),
  });
  const summary = summaryRes?.data?.data || { totalSession: 0, boysCount: 0, girlsCount: 0, totalAllTime: 0 };

  const handleResetFilters = () => {
    setClassId('');
    setSectionId('');
    setStatus('1');
    setCategoryId('');
    setSearchTerm('');
    setPage(0);
  };

  // Status Chip Colors
  const getStatusChip = (st) => {
    const statusMap = {
      1: { label: 'Active', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
      2: { label: 'Inactive', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
      3: { label: 'Suspended', bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
      4: { label: 'Expelled', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
      5: { label: 'TC Issued', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    };
    const s = statusMap[Number(st)] || statusMap[1];
    return (
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          px: 1,
          py: 0.2,
          borderRadius: '12px',
          bgcolor: s.bg,
          color: s.color,
          border: `1px solid ${s.border}`,
          fontSize: '10.5px',
          fontWeight: 600,
          lineHeight: 1.2,
          whiteSpace: 'nowrap',
        }}
      >
        <Box
          component="span"
          sx={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            bgcolor: s.color,
          }}
        />
        {s.label}
      </Box>
    );
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!students.length) return;
    const headers = ['Admission No', 'Name', 'Gender', 'Class', 'Section', 'Roll No', 'Guardian Name', 'Guardian Mobile', 'Status'];
    const rows = students.map((s) => [
      `"${s.admissionNo}"`,
      `"${s.fullName}"`,
      `"${s.gender || ''}"`,
      `"${s.className || ''}"`,
      `"${s.sectionName || ''}"`,
      `"${s.rollNo || ''}"`,
      `"${s.guardianName || ''}"`,
      `"${s.guardianMobile || ''}"`,
      s.status === 1 ? 'Active' : s.status === 2 ? 'Inactive' : s.status === 5 ? 'TC Issued' : 'Other',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Students_List_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to PDF with Maximum Student Details
  const handleExportPDF = async () => {
    if (!totalCount && !students.length) return;

    setIsExportingPdf(true);
    try {
      let exportList = students;
      // If there are more students than the current page, fetch all matching records
      if (totalCount > students.length) {
        const res = await studentApi.getStudents({
          pageNo: 1,
          pageSize: totalCount || 1000,
          search: searchTerm?.trim() || undefined,
          classId: classId !== '' && classId != null ? classId : undefined,
          sectionId: sectionId !== '' && sectionId != null ? sectionId : undefined,
          status: status !== '' && status != null ? status : undefined,
          categoryId: categoryId !== '' && categoryId != null ? categoryId : undefined,
        });
        if (res.data?.success && res.data.data?.items) {
          exportList = res.data.data.items;
        }
      }

      if (!exportList.length) return;

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.width;

      const schoolName = (user?.schoolName || 'DELHI PUBLIC SCHOOL').toUpperCase();
      const branchName = user?.branchName || 'Main Campus';
      const className = selectedClassObj ? selectedClassObj.name : 'All Classes';
      const secObj = sections.find((s) => String(s.id) === String(sectionId));
      const sectionName = secObj ? secObj.name : (sectionId ? 'Selected Section' : 'All Sections');

      const statusMap = { '1': 'Active', '2': 'Inactive', '3': 'Suspended', '4': 'Expelled', '5': 'TC Issued' };
      const statusLabel = status ? (statusMap[status] || 'All') : 'All';

      const boysInList = exportList.filter((s) => s.gender?.toLowerCase() === 'male').length;
      const girlsInList = exportList.filter((s) => s.gender?.toLowerCase() === 'female').length;

      // School Name Header
      doc.setFontSize(14);
      doc.setTextColor(29, 78, 216); // Brand Blue
      doc.text(schoolName, 8, 12);

      // Subtitle
      doc.setFontSize(9.5);
      doc.setTextColor(51, 65, 85);
      doc.text(`${branchName}  •  STUDENT DIRECTORY (COMPREHENSIVE REGISTER)`, 8, 17.5);

      // Filter & Session info line
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Session: ${activeAcademicYearName || 'Current Session'}   |   Class: ${className}   |   Section: ${sectionName}   |   Status: ${statusLabel}   |   Generated: ${dayjs().format('DD-MMM-YYYY, hh:mm A')}`,
        8,
        22.5
      );

      // KPI Counts Banner
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.setFont(undefined, 'bold');
      doc.text(
        `Total Students: ${exportList.length}   |   Boys (Male): ${boysInList}   |   Girls (Female): ${girlsInList}   |   Active: ${exportList.filter(s => s.status === 1).length}`,
        8,
        27
      );
      doc.setFont(undefined, 'normal');

      // Table Data with Maximum Student Details
      const tableData = exportList.map((s, idx) => {
        const admDateStr = s.admissionDate ? dayjs(s.admissionDate).format('DD/MM/YYYY') : '—';
        const dobStr = s.dateOfBirth ? dayjs(s.dateOfBirth).format('DD/MM/YYYY') : '—';
        const classSec = `${s.className || '—'}${s.sectionName ? ` (${s.sectionName})` : ''}`;
        const guardianInfo = s.fatherName
          ? `${s.fatherName}${s.fatherMobile ? ` (${s.fatherMobile})` : ''}`
          : (s.guardianName ? `${s.guardianName}${s.guardianMobile ? ` (${s.guardianMobile})` : ''}` : '—');
        const motherInfo = s.motherName ? `${s.motherName}${s.motherMobile ? ` (${s.motherMobile})` : ''}` : '—';
        const addressStr = [s.address, s.city].filter(Boolean).join(', ') || '—';
        const stStr = s.status === 1 ? 'Active' : s.status === 2 ? 'Inactive' : s.status === 5 ? 'TC Issued' : (s.status === 3 ? 'Suspended' : (s.status === 4 ? 'Expelled' : 'Active'));

        return [
          idx + 1,
          s.admissionNo || '—',
          admDateStr,
          s.fullName || '—',
          classSec,
          s.rollNo ?? '—',
          s.gender || '—',
          dobStr,
          s.bloodGroup || '—',
          guardianInfo,
          motherInfo,
          addressStr,
          stStr,
        ];
      });

      autoTable(doc, {
        startY: 30,
        margin: { left: 8, right: 8, bottom: 8 },
        tableWidth: 281,
        head: [
          [
            '#',
            'Adm No',
            'Adm Date',
            'Student Name',
            'Class & Sec',
            'Roll',
            'Gender',
            'DOB',
            'Blood',
            "Father's Name & Mobile",
            "Mother's Name",
            'Address & City',
            'Status',
          ],
        ],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 7, textColor: [30, 41, 59], cellPadding: 1.5, valign: 'middle' },
        headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 7, halign: 'center' },
          1: { cellWidth: 22 },
          2: { cellWidth: 17 },
          3: { cellWidth: 32 },
          4: { cellWidth: 20 },
          5: { cellWidth: 10, halign: 'center' },
          6: { cellWidth: 13 },
          7: { cellWidth: 16 },
          8: { cellWidth: 11, halign: 'center' },
          9: { cellWidth: 38 },
          10: { cellWidth: 28 },
          11: { cellWidth: 49 },
          12: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 12) {
            if (data.cell.raw === 'Active') {
              data.cell.styles.textColor = [22, 163, 74];
            } else {
              data.cell.styles.textColor = [220, 38, 38];
            }
          }
        },
        didDrawPage: () => {
          const pageCount = doc.internal.getNumberOfPages();
          doc.setFontSize(7.5);
          doc.setTextColor(148, 163, 184);
          doc.text(
            `Page ${doc.internal.getCurrentPageInfo().pageNumber} of ${pageCount} • School ERP Student Directory`,
            pageWidth - 75,
            doc.internal.pageSize.height - 5
          );
        },
      });

      const cleanClass = className.replace(/[\/\\:]/g, '-').replace(/\s+/g, '_');
      doc.save(`Student_Directory_${cleanClass}_${dayjs().format('YYYY-MM-DD')}.pdf`);
    } catch (err) {
      console.error('Error generating Student Directory PDF', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleOpenIdCard = (student) => {
    setSelectedStudentForCard(student);
    setIsIdCardOpen(true);
  };

  const handlePrintCard = () => {
    const sName = selectedStudentForCard?.fullName || 'Student';
    const admNo = selectedStudentForCard?.admissionNumber ? `_${selectedStudentForCard.admissionNumber}` : '';
    printWithTitle(`Student_ID_Card_${sName}${admNo}`);
  };

  // DataGrid Columns
  const columns = [
    {
      field: 'fullName',
      headerName: 'Student Name',
      minWidth: 200,
      flex: 1.3,
      renderCell: (params) => {
        const name = params.row?.fullName || '—';
        const initial = name !== '—' ? name.trim().charAt(0).toUpperCase() : 'S';
        return (
          <Stack direction="row" spacing={1.2} alignItems="center" sx={{ minWidth: 0, py: 0.25 }}>
            <Avatar
              src={params.row?.photoUrl}
              sx={{
                width: 30,
                height: 30,
                fontSize: '11px',
                fontWeight: 700,
                bgcolor: '#e0f2fe',
                color: '#0284c7',
                border: '1px solid #bae6fd',
                flexShrink: 0,
              }}
            >
              {initial}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="body2"
                sx={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#0f172a',
                  textTransform: 'capitalize',
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {name}
              </Typography>
              {params.row?.gender && (
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: '10.5px',
                    color: '#64748b',
                    textTransform: 'capitalize',
                    lineHeight: 1.1,
                    display: 'block',
                    mt: 0.2,
                  }}
                >
                  {params.row?.gender}
                </Typography>
              )}
            </Box>
          </Stack>
        );
      },
    },
    {
      field: 'admissionNo',
      headerName: 'Admission No',
      width: 155,
      renderCell: (params) => (
        <Box
          component="span"
          sx={{
            display: 'inline-block',
            px: 0.85,
            py: 0.2,
            bgcolor: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '4px',
            fontFamily: '"SFMono-Regular", Consolas, Menlo, monospace',
            fontSize: '11px',
            fontWeight: 600,
            color: '#334155',
            letterSpacing: '0.2px',
            whiteSpace: 'nowrap',
          }}
        >
          {params.value || params.row?.admissionNo || '—'}
        </Box>
      ),
    },
    {
      field: 'className',
      headerName: 'Class & Section',
      width: 145,
      renderCell: (params) => {
        const cName = params.row?.className;
        const sName = params.row?.sectionName;
        if (!cName && !sName) {
          return <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '11px' }}>—</Typography>;
        }
        return (
          <Stack direction="row" spacing={0.6} alignItems="center" sx={{ whiteSpace: 'nowrap' }}>
            <Typography variant="body2" sx={{ fontSize: '11.5px', fontWeight: 600, color: '#1e293b' }}>
              {cName || '—'}
            </Typography>
            {sName && (
              <Box
                component="span"
                sx={{
                  display: 'inline-block',
                  px: 0.65,
                  py: 0.1,
                  bgcolor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '4px',
                  color: '#1d4ed8',
                  fontSize: '10px',
                  fontWeight: 700,
                  lineHeight: 1.2,
                }}
              >
                Sec {sName}
              </Box>
            )}
          </Stack>
        );
      },
    },
    {
      field: 'rollNo',
      headerName: 'Roll No',
      width: 85,
      renderCell: (params) => {
        const val = params.value ?? params.row?.rollNo;
        if (!val && val !== 0) {
          return <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '11px' }}>—</Typography>;
        }
        return (
          <Box
            component="span"
            sx={{
              display: 'inline-block',
              px: 0.75,
              py: 0.1,
              bgcolor: '#f1f5f9',
              border: '1px solid #e2e8f0',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '11px',
              fontWeight: 600,
              color: '#475569',
            }}
          >
            #{val}
          </Box>
        );
      },
    },
    {
      field: 'guardian',
      headerName: 'Guardian Contact',
      minWidth: 170,
      flex: 1.2,
      renderCell: (params) => {
        const name = params.row?.guardianName;
        const mobile = params.row?.guardianMobile;
        if (!name && !mobile) {
          return <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '11px' }}>—</Typography>;
        }
        return (
          <Box sx={{ minWidth: 0, py: 0.25 }}>
            <Typography
              variant="body2"
              sx={{
                fontSize: '11.5px',
                fontWeight: 600,
                color: '#1e293b',
                textTransform: 'capitalize',
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {name || '—'}
            </Typography>
            {mobile && (
              <Stack direction="row" spacing={0.4} alignItems="center" sx={{ mt: 0.2 }}>
                <PhoneIcon sx={{ fontSize: 10.5, color: '#64748b' }} />
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    color: '#475569',
                    lineHeight: 1.2,
                    letterSpacing: '0.2px',
                  }}
                >
                  {mobile}
                </Typography>
                <Tooltip title="WhatsApp Guardian" arrow>
                  <IconButton
                    size="small"
                    sx={{
                      p: 0.1,
                      ml: 0.3,
                      color: '#25D366',
                      '&:hover': { bgcolor: '#f0fdf4' },
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenWhatsApp(params.row);
                    }}
                  >
                    <WhatsAppIcon sx={{ fontSize: 13 }} />
                  </IconButton>
                </Tooltip>
              </Stack>
            )}
          </Box>
        );
      },
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 105,
      renderCell: (params) => getStatusChip(params.value),
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
      renderCell: (params) => (
        <SlideActionCell label="Actions">
          <Tooltip title="Send WhatsApp" arrow>
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
              onClick={() => handleOpenWhatsApp(params.row)}
            >
              <WhatsAppIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="View Profile" arrow>
            <IconButton
              size="small"
              sx={{
                width: 28,
                height: 28,
                color: '#2563eb',
                bgcolor: '#eff6ff',
                border: '1px solid #bfdbfe',
                '&:hover': { bgcolor: '#dbeafe' },
                borderRadius: '6px',
              }}
              onClick={() => navigate(`/students/profile/${params.row?.id}`)}
            >
              <VisibilityIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
          {can('Students', 'Edit') && (
            <Tooltip title="Edit Student Profile" arrow>
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
                onClick={() => navigate(`/students/profile/${params.row?.id}?edit=true`)}
              >
                <EditIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Print Admission Slip / Report" arrow>
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
              onClick={() => handleOpenAdmissionReport(params.row)}
            >
              <ReceiptLongIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
          {can('SectionChange', 'Edit') && (
            <Tooltip title="Change Section" arrow>
              <IconButton
                size="small"
                sx={{
                  width: 28,
                  height: 28,
                  color: '#d97706',
                  bgcolor: '#fffbeb',
                  border: '1px solid #fde68a',
                  '&:hover': { bgcolor: '#fef3c7' },
                  borderRadius: '6px',
                }}
                onClick={() => navigate(`/students/section-change?studentId=${params.row?.id}`)}
              >
                <SwapHorizIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          )}
        </SlideActionCell>
      ),
    },
  ];

  return (
    <Box sx={{ pb: 2 }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'flex-start', md: 'center' },
          justifyContent: 'space-between',
          gap: { xs: 1, md: 1.5 },
          mb: 1.25,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" fontWeight={800} sx={{ fontSize: { xs: '1.15rem', sm: '1.25rem' }, color: '#1e293b', m: 0, lineHeight: 1.2 }}>
            Student Directory
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: { xs: '0.72rem', sm: '0.78rem' }, mt: 0.25 }}>
            Manage student records, profiles, roll numbers, and section allotments
          </Typography>
        </Box>

        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          flexWrap="wrap"
          sx={{
            width: { xs: '100%', md: 'auto' },
            '& .p-button': {
              height: '32px !important',
              py: '0 !important',
              fontSize: '11.5px !important',
              fontWeight: '600 !important',
            },
          }}
        >
          <AppButton
            variant="outlined"
            severity="success"
            icon="pi pi-download"
            label="Export CSV"
            onClick={handleExportCSV}
            disabled={!students.length}
          />

          <AppButton
            variant="outlined"
            severity="danger"
            icon="pi pi-file-pdf"
            label="Download PDF"
            onClick={handleExportPDF}
            loading={isExportingPdf}
            disabled={!students.length && totalCount === 0}
          />

          {can('RollNumbers', 'Edit') && (
            <AppButton
              variant="outlined"
              severity="help"
              icon="pi pi-list"
              label="Roll Numbers"
              onClick={() => navigate('/students/roll-numbers')}
            />
          )}

          {can('SectionChange', 'Edit') && (
            <AppButton
              variant="outlined"
              severity="warning"
              icon="pi pi-arrows-h"
              label="Section Transfer"
              onClick={() => navigate('/students/section-change')}
            />
          )}

          {can('Admissions', 'Add') && (
            <AppButton
              variant="contained"
              severity="success"
              icon="pi pi-plus"
              label="New Admission"
              onClick={() => navigate('/admissions/new')}
            />
          )}
        </Stack>
      </Box>

      {/* KPI Metric Cards: Total Students, Boys, Girls, Filtered Count */}
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
                Total Students
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                {summary.totalSession ?? totalCount}
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
                Boys (Male)
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0284c7', lineHeight: 1.2 }}>
                {summary.boysCount ?? 0}
              </Typography>
            </Box>
            <Avatar sx={{ bgcolor: '#f0f9ff', color: '#0284c7', width: 34, height: 34 }}>
              <PersonIcon fontSize="small" />
            </Avatar>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            variant="outlined"
            sx={{
              p: '8px 12px',
              borderRadius: 2,
              borderLeft: '4px solid #ec4899',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              bgcolor: 'background.paper',
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase', fontSize: '10px' }}>
                Girls (Female)
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#db2777', lineHeight: 1.2 }}>
                {summary.girlsCount ?? 0}
              </Typography>
            </Box>
            <Avatar sx={{ bgcolor: '#fdf2f8', color: '#ec4899', width: 34, height: 34 }}>
              <PersonIcon fontSize="small" />
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
                Filtered Records
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#16a34a', lineHeight: 1.2 }}>
                {totalCount}
              </Typography>
            </Box>
            <Avatar sx={{ bgcolor: '#f0fdf4', color: '#16a34a', width: 34, height: 34 }}>
              <ReceiptLongIcon fontSize="small" />
            </Avatar>
          </Paper>
        </Grid>
      </Grid>

      {/* Filter Toolbar (Single Row) */}
      <Paper
        variant="outlined"
        sx={{
          p: '6px 10px',
          mb: 1.5,
          borderRadius: 2,
          bgcolor: 'background.paper',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          flexWrap: { xs: 'wrap', lg: 'nowrap' },
        }}
      >
        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 200px', lg: '1.5 1 220px' }, minWidth: '160px' }}>
          <AppInput
            label="Search Student"
            placeholder="Name, Admission No, Mob"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </Box>

        <Box sx={{ flex: { xs: '1 1 45%', sm: '1 1 120px', lg: '1 1 130px' }, minWidth: '110px' }}>
          <AppSelect
            label="Class"
            placeholder="All Classes"
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value);
              setSectionId('');
            }}
            options={classes}
            optionLabel="name"
            optionValue="id"
            showClear
          />
        </Box>

        <Box sx={{ flex: { xs: '1 1 45%', sm: '1 1 120px', lg: '1 1 130px' }, minWidth: '110px' }}>
          <AppSelect
            label="Section"
            placeholder="All Sections"
            value={sectionId}
            disabled={!classId}
            onChange={(e) => setSectionId(e.target.value)}
            options={sections.map((sec) => ({
              id: sec.id,
              name: `${sec.name} (${sec.capacity})`,
            }))}
            optionLabel="name"
            optionValue="id"
            showClear
          />
        </Box>

        <Box sx={{ flex: { xs: '1 1 45%', sm: '1 1 110px', lg: '1 1 120px' }, minWidth: '105px' }}>
          <AppSelect
            label="Status"
            placeholder="All Statuses"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { label: 'Active', value: '1' },
              { label: 'Inactive', value: '2' },
              { label: 'Suspended', value: '3' },
              { label: 'Expelled', value: '4' },
              { label: 'TC Issued', value: '5' },
            ]}
            showClear
          />
        </Box>

        <Box sx={{ flex: { xs: '1 1 45%', sm: '1 1 120px', lg: '1 1 130px' }, minWidth: '110px' }}>
          <AppSelect
            label="Category"
            placeholder="All Categories"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            options={categories}
            optionLabel="name"
            optionValue="id"
            showClear
          />
        </Box>

        <Box sx={{ flexShrink: 0 }}>
          <AppButton
            variant="outlined"
            severity="secondary"
            icon="pi pi-refresh"
            label="Reset"
            onClick={handleResetFilters}
            tooltip="Reset all filters"
          />
        </Box>
      </Paper>

      {/* Students DataGrid */}
      <Box sx={{ mt: 1 }}>
        <DataGrid
          showHeader={false}
          rows={students}
          columns={columns}
          loading={isLoading}
          rowCount={totalCount}
          paginationMode="server"
          paginationModel={{ page, pageSize }}
          onPaginationModelChange={(model) => {
            setPage(model.page);
            setPageSize(model.pageSize);
          }}
          pageSizeOptions={[10, 25, 50, 100]}
          disableRowSelectionOnClick
        />
      </Box>

      {/* ID Card Preview Modal */}
      <Dialog
        open={isIdCardOpen}
        onClose={() => setIsIdCardOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ textAlign: 'center', pb: 1, fontWeight: 700 }}>
          Student ID Card Preview
        </DialogTitle>
        <DialogContent>
          {selectedStudentForCard && (
            <Paper
              elevation={4}
              id="printable-id-card"
              sx={{
                p: 3,
                borderRadius: 3,
                border: '2px solid #1976d2',
                background: 'linear-gradient(135deg, #ffffff 0%, #f4f8fd 100%)',
                textAlign: 'center',
                position: 'relative',
              }}
            >
              {/* Header */}
              <Stack direction="row" spacing={1} justifyContent="center" alignItems="center" sx={{ mb: 1.5 }}>
                <SchoolIcon color="primary" sx={{ fontSize: 28 }} />
                <Typography variant="h6" fontWeight={800} color="primary.main">
                  DELHI PUBLIC SCHOOL
                </Typography>
              </Stack>
              <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 2 }}>
                Main Campus | Session 2026-27
              </Typography>

              <Divider sx={{ mb: 2 }} />

              {/* Photo & Name */}
              <Avatar
                src={selectedStudentForCard.photoUrl}
                sx={{
                  width: 90,
                  height: 90,
                  mx: 'auto',
                  mb: 1.5,
                  border: '3px solid #1976d2',
                  boxShadow: 2,
                }}
              >
                <PersonIcon sx={{ fontSize: 50 }} />
              </Avatar>

              <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                {selectedStudentForCard.fullName}
              </Typography>
              <Chip
                label={selectedStudentForCard.admissionNo}
                color="primary"
                size="small"
                sx={{ fontWeight: 700, mt: 0.5, mb: 2 }}
              />

              {/* Key Details */}
              <Stack spacing={0.8} sx={{ textAlign: 'left', px: 2, mb: 2 }}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Class & Section:
                  </Typography>
                  <Typography variant="caption" fontWeight={700}>
                    {selectedStudentForCard.className} - {selectedStudentForCard.sectionName}
                  </Typography>
                </Stack>

                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Roll Number:
                  </Typography>
                  <Typography variant="caption" fontWeight={700}>
                    {selectedStudentForCard.rollNo ? `#${selectedStudentForCard.rollNo}` : '—'}
                  </Typography>
                </Stack>

                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Guardian:
                  </Typography>
                  <Typography variant="caption" fontWeight={700}>
                    {selectedStudentForCard.guardianName || '—'}
                  </Typography>
                </Stack>

                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Emergency Contact:
                  </Typography>
                  <Typography variant="caption" fontWeight={700}>
                    {selectedStudentForCard.guardianMobile || '—'}
                  </Typography>
                </Stack>
              </Stack>

              {/* Barcode Mock */}
              <Box
                sx={{
                  height: 32,
                  bgcolor: '#333',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  letterSpacing: 4,
                  fontFamily: 'monospace',
                  fontSize: 12,
                }}
              >
                ||| | |||| | || | |||| ||
              </Box>
            </Paper>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
          <Button onClick={() => setIsIdCardOpen(false)}>Close</Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PrintIcon />}
            onClick={handlePrintCard}
          >
            Print ID Card
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reusable Admission Report / Slip Modal */}
      <AdmissionReportModal
        open={isAdmissionReportOpen}
        onClose={() => setIsAdmissionReportOpen(false)}
        studentId={admissionReportStudent?.id}
        studentData={admissionReportStudent}
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
    </Box>
  );
}
