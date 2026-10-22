import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  IconButton,
  Chip,
  Avatar,
  Tabs,
  Tab,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  Tooltip,
  Snackbar,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Badge as BadgeIcon,
  SwapHoriz as SwapHorizIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Home as HomeIcon,
  School as SchoolIcon,
  FolderShared as FolderSharedIcon,
  History as HistoryIcon,
  FamilyRestroom as FamilyIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Print as PrintIcon,
  ReceiptLong as ReceiptLongIcon,
  PhotoCamera as PhotoCameraIcon,
  Save as SaveIcon,
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon,
  CloudUpload as CloudUploadIcon,
  Visibility as VisibilityIcon,
  Download as DownloadIcon,
  Close as CloseIcon,
  PictureAsPdf as PictureAsPdfIcon,
  CameraAlt as CameraAltIcon,
  Image as ImageIcon,
  Cameraswitch as CameraswitchIcon,
} from '@mui/icons-material';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { studentApi } from '../api';
import { simpleMasterApi, classApi } from '../../masters/api';
import { usePermission } from '../../../hooks/usePermission';
import { AdmissionReportModal } from '../components/AdmissionReportModal';
import { PhotoCaptureUpload } from '../components/PhotoCaptureUpload';
import { printWithTitle } from '../../../utils/printUtils';
import { AppModal, AppInput, AppSelect, AppDatePicker } from '../../../components/common';

// Helper to compress image files client-side before uploading
const compressImage = (file, maxWidth = 1600, quality = 0.85) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => resolve(e.target.result);
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

export default function StudentProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { can } = usePermission();

  const [activeTab, setActiveTab] = useState(0);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editModalTab, setEditModalTab] = useState(0);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isIdCardOpen, setIsIdCardOpen] = useState(false);
  const [isAdmissionSlipOpen, setIsAdmissionSlipOpen] = useState(false);
  const [docFormData, setDocFormData] = useState({ title: '', documentTypeId: '', filePath: '' });
  const [docFileInfo, setDocFileInfo] = useState({ fileName: '', fileSize: '', isImage: false, isPdf: false });
  const [previewDoc, setPreviewDoc] = useState(null);
  const [isDocCameraOpen, setIsDocCameraOpen] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [facingMode, setFacingMode] = useState('environment');

  const docFileInputRef = useRef(null);
  const docVideoRef = useRef(null);
  const docStreamRef = useRef(null);
  const [editFormData, setEditFormData] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Fetch student details
  const {
    data: studentRes,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['student-detail', id],
    queryFn: () => studentApi.getStudentDetail(id),
    enabled: !!id,
  });

  const student = studentRes?.data?.data;

  // Fetch masters
  const { data: categoriesRes } = useQuery({
    queryKey: ['student-categories'],
    queryFn: () => simpleMasterApi.getMasters('Category'),
  });
  const categories = categoriesRes?.data?.data || [];

  const { data: religionsRes } = useQuery({
    queryKey: ['student-religions'],
    queryFn: () => simpleMasterApi.getMasters('Religion'),
  });
  const religions = religionsRes?.data?.data || [];

  const { data: docTypesRes } = useQuery({
    queryKey: ['document-types'],
    queryFn: () => simpleMasterApi.getMasters('DocumentType'),
  });
  const docTypes = docTypesRes?.data?.data || [];

  // Fetch classes & sections
  const { data: classesRes } = useQuery({
    queryKey: ['classes-sections'],
    queryFn: () => classApi.getClasses(),
  });
  const classes = classesRes?.data?.data || [];

  // Update Student Mutation
  const updateMutation = useMutation({
    mutationFn: (data) => studentApi.updateStudent(id, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['student-detail', id]);
      setIsEditOpen(false);
      setSnackbar({
        open: true,
        message: res.data?.message || 'Student master and all records updated successfully!',
        severity: 'success',
      });
    },
    onError: (err) => {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'Failed to update student profile.',
        severity: 'error',
      });
    },
  });

  // Add Document Mutation
  const addDocMutation = useMutation({
    mutationFn: (data) => studentApi.addDocument(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['student-detail', id]);
      setIsDocModalOpen(false);
      setDocFormData({ title: '', documentTypeId: '', filePath: '' });
      setDocFileInfo({ fileName: '', fileSize: '', isImage: false, isPdf: false });
      stopDocCamera();
      setIsDocCameraOpen(false);
      setSnackbar({ open: true, message: 'Document uploaded successfully.', severity: 'success' });
    },
    onError: (err) => {
      setSnackbar({ open: true, message: err.response?.data?.message || 'Failed to upload document.', severity: 'error' });
    },
  });

  // Delete Document Mutation
  const deleteDocMutation = useMutation({
    mutationFn: (docId) => studentApi.deleteDocument(id, docId),
    onSuccess: () => {
      queryClient.invalidateQueries(['student-detail', id]);
      setSnackbar({ open: true, message: 'Document deleted successfully.', severity: 'info' });
    },
  });

  const handleOpenEdit = () => {
    if (!student) return;

    const fatherDoc = student.documents?.find((d) => d.title?.toLowerCase().includes('father'));
    const motherDoc = student.documents?.find((d) => d.title?.toLowerCase().includes('mother'));
    const guardianDoc = student.documents?.find((d) => d.title?.toLowerCase().includes('guardian'));

    const father = student.guardians?.find((g) => g.relation?.toLowerCase() === 'father');
    const mother = student.guardians?.find((g) => g.relation?.toLowerCase() === 'mother');
    const otherGuardian =
      student.guardians?.find((g) => g.relation?.toLowerCase() !== 'father' && g.relation?.toLowerCase() !== 'mother') ||
      student.guardians?.find((g) => g.isPrimary) ||
      null;

    setEditFormData({
      // 1. Pupil Identity
      firstName: (student.firstName || '').toUpperCase(),
      lastName: (student.lastName || '').toUpperCase(),
      admissionNo: student.admissionNo || '',
      admissionDate: student.admissionDate
        ? dayjs(student.admissionDate).format('YYYY-MM-DD')
        : dayjs().format('YYYY-MM-DD'),
      dateOfBirth: student.dateOfBirth ? dayjs(student.dateOfBirth).format('YYYY-MM-DD') : '',
      gender: student.gender || 'Male',
      bloodGroup: student.bloodGroup || '',
      aadhaarNo: student.aadhaarNo || '',
      categoryId: student.categoryId || '',
      religionId: student.religionId || '',
      status: student.status ?? 1,

      // 2. Academic Enrollment
      classId: student.currentEnrollment?.classId || '',
      sectionId: student.currentEnrollment?.sectionId || '',
      rollNo: student.currentEnrollment?.rollNo ?? '',

      // 3. Address & Contact
      address: student.address || '',
      city: student.city || '',
      state: student.state || '',
      pincode: student.pincode || '',
      emergencyContact: student.emergencyContact || '',

      // 4. Identity Photographs (4 Photos)
      photoUrl: student.photoUrl || '',
      fatherPhotoUrl: fatherDoc?.filePath || '',
      motherPhotoUrl: motherDoc?.filePath || '',
      guardianPhotoUrl: guardianDoc?.filePath || '',

      // 5. Father's Details
      fatherId: father?.id || 0,
      fatherName: (father?.name || student.fatherName || '').toUpperCase(),
      fatherMobile: father?.mobile || student.fatherMobile || '',
      fatherEmail: father?.email || student.fatherEmail || '',
      fatherOccupation: father?.occupation || student.fatherOccupation || '',
      fatherAnnualIncome: father?.annualIncome || '',

      // 6. Mother's Details
      motherId: mother?.id || 0,
      motherName: (mother?.name || student.motherName || '').toUpperCase(),
      motherMobile: mother?.mobile || student.motherMobile || '',
      motherEmail: mother?.email || student.motherEmail || '',
      motherOccupation: mother?.occupation || student.motherOccupation || '',
      motherAnnualIncome: mother?.annualIncome || '',

      // 7. Local Guardian's Details
      guardianId: otherGuardian?.id || 0,
      guardianName: (otherGuardian?.name || '').toUpperCase(),
      guardianMobile: otherGuardian?.mobile || '',
      guardianEmail: otherGuardian?.email || '',
      guardianRelation: otherGuardian?.relation || 'Guardian',
      guardianOccupation: otherGuardian?.occupation || '',
      guardianAnnualIncome: otherGuardian?.annualIncome || '',
    });
    setEditModalTab(0);
    setIsEditOpen(true);
  };

  useEffect(() => {
    if (searchParams.get('edit') === 'true' && student && !isEditOpen) {
      handleOpenEdit();
    }
  }, [searchParams, student]);

  const handleSaveEdit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!editFormData) return;

    if (!editFormData.firstName?.trim()) {
      setSnackbar({ open: true, message: 'Student First Name is required.', severity: 'warning' });
      setEditModalTab(1);
      return;
    }
    if (!editFormData.dateOfBirth) {
      setSnackbar({ open: true, message: 'Date of Birth (DOB) is required.', severity: 'warning' });
      setEditModalTab(1);
      return;
    }

    const guardiansPayload = [];
    if (editFormData.fatherName?.trim() || editFormData.fatherMobile?.trim()) {
      guardiansPayload.push({
        id: editFormData.fatherId || 0,
        relation: 'Father',
        name: editFormData.fatherName?.trim()?.toUpperCase() || '',
        mobile: editFormData.fatherMobile?.trim() || editFormData.emergencyContact || '—',
        email: editFormData.fatherEmail?.trim() || null,
        occupation: editFormData.fatherOccupation?.trim() || null,
        annualIncome: editFormData.fatherAnnualIncome ? Number(editFormData.fatherAnnualIncome) : null,
        isPrimary: true,
      });
    }

    if (editFormData.motherName?.trim() || editFormData.motherMobile?.trim()) {
      guardiansPayload.push({
        id: editFormData.motherId || 0,
        relation: 'Mother',
        name: editFormData.motherName?.trim()?.toUpperCase() || '',
        mobile: editFormData.motherMobile?.trim() || editFormData.fatherMobile || '—',
        email: editFormData.motherEmail?.trim() || null,
        occupation: editFormData.motherOccupation?.trim() || null,
        annualIncome: editFormData.motherAnnualIncome ? Number(editFormData.motherAnnualIncome) : null,
        isPrimary: guardiansPayload.length === 0,
      });
    }

    if (
      editFormData.guardianName?.trim() &&
      editFormData.guardianName.trim() !== editFormData.fatherName?.trim() &&
      editFormData.guardianName.trim() !== editFormData.motherName?.trim()
    ) {
      guardiansPayload.push({
        id: editFormData.guardianId || 0,
        relation: editFormData.guardianRelation?.trim() || 'Guardian',
        name: editFormData.guardianName?.trim()?.toUpperCase() || '',
        mobile: editFormData.guardianMobile?.trim() || editFormData.fatherMobile || '—',
        email: editFormData.guardianEmail?.trim() || null,
        occupation: editFormData.guardianOccupation?.trim() || null,
        annualIncome: editFormData.guardianAnnualIncome ? Number(editFormData.guardianAnnualIncome) : null,
        isPrimary: guardiansPayload.length === 0,
      });
    }

    const payload = {
      firstName: editFormData.firstName?.trim()?.toUpperCase() || '',
      lastName: editFormData.lastName?.trim()?.toUpperCase() || '',
      admissionNo: editFormData.admissionNo?.trim() || null,
      admissionDate: editFormData.admissionDate ? new Date(editFormData.admissionDate).toISOString() : null,
      dateOfBirth: editFormData.dateOfBirth,
      gender: editFormData.gender || 'Male',
      categoryId: editFormData.categoryId ? Number(editFormData.categoryId) : null,
      religionId: editFormData.religionId ? Number(editFormData.religionId) : null,
      bloodGroup: editFormData.bloodGroup || null,
      aadhaarNo: editFormData.aadhaarNo?.trim() || null,
      status: Number(editFormData.status),
      classId: editFormData.classId ? Number(editFormData.classId) : null,
      sectionId: editFormData.sectionId ? Number(editFormData.sectionId) : null,
      rollNo: editFormData.rollNo !== '' && editFormData.rollNo !== null ? Number(editFormData.rollNo) : null,
      address: editFormData.address?.trim() || null,
      city: editFormData.city?.trim() || null,
      state: editFormData.state?.trim() || null,
      pincode: editFormData.pincode?.trim() || null,
      emergencyContact: editFormData.emergencyContact?.trim() || null,
      photoUrl: editFormData.photoUrl || null,
      fatherPhotoUrl: editFormData.fatherPhotoUrl || null,
      motherPhotoUrl: editFormData.motherPhotoUrl || null,
      guardianPhotoUrl: editFormData.guardianPhotoUrl || null,
      guardians: guardiansPayload,
    };

    updateMutation.mutate(payload);
  };

  const startDocCamera = async (mode = facingMode) => {
    setCameraLoading(true);
    setCameraError('');
    try {
      if (docStreamRef.current) {
        docStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      docStreamRef.current = stream;
      if (docVideoRef.current) {
        docVideoRef.current.srcObject = stream;
        docVideoRef.current.play();
      }
    } catch (err) {
      console.error('Camera error:', err);
      setCameraError('Unable to access camera. Please check camera permissions or browse an image file.');
    } finally {
      setCameraLoading(false);
    }
  };

  const stopDocCamera = () => {
    if (docStreamRef.current) {
      docStreamRef.current.getTracks().forEach((track) => track.stop());
      docStreamRef.current = null;
    }
  };

  const handleSwitchDocCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startDocCamera(nextMode);
  };

  const handleCaptureDocPhoto = () => {
    if (docVideoRef.current) {
      const video = docVideoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      const fileName = 'camera_capture_' + dayjs().format('HHmmss') + '.jpg';
      setDocFormData((prev) => ({
        ...prev,
        filePath: dataUrl,
        title: prev.title.trim() ? prev.title : 'Document Photo ' + dayjs().format('DD-MMM-YYYY'),
      }));
      setDocFileInfo({
        fileName,
        fileSize: Math.round((dataUrl.length * 3) / 4 / 1024) + ' KB',
        isImage: true,
        isPdf: false,
      });
      stopDocCamera();
      setIsDocCameraOpen(false);
    }
  };

  const handleDocFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImg = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
    const sizeFormatted = file.size < 1024 * 1024
      ? (file.size / 1024).toFixed(1) + ' KB'
      : (file.size / (1024 * 1024)).toFixed(2) + ' MB';

    const rawName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const cleanTitle = rawName
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

    if (isImg) {
      try {
        const compressedUrl = await compressImage(file, 1600, 0.85);
        setDocFormData((prev) => ({
          ...prev,
          filePath: compressedUrl,
          title: prev.title.trim() ? prev.title : cleanTitle,
        }));
        setDocFileInfo({
          fileName: file.name,
          fileSize: sizeFormatted,
          isImage: true,
          isPdf: false,
        });
      } catch (err) {
        console.error('Error compressing image:', err);
      }
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        setDocFormData((prev) => ({
          ...prev,
          filePath: event.target.result,
          title: prev.title.trim() ? prev.title : cleanTitle,
        }));
        setDocFileInfo({
          fileName: file.name,
          fileSize: sizeFormatted,
          isImage: false,
          isPdf: isPdf,
        });
      };
      reader.readAsDataURL(file);
    }

    if (docFileInputRef.current) {
      docFileInputRef.current.value = '';
    }
  };

  const handleClearDocFile = () => {
    setDocFormData((prev) => ({ ...prev, filePath: '' }));
    setDocFileInfo({ fileName: '', fileSize: '', isImage: false, isPdf: false });
    if (docFileInputRef.current) {
      docFileInputRef.current.value = '';
    }
  };

  const handleDownloadDoc = (doc) => {
    if (!doc?.filePath) return;
    const link = document.createElement('a');
    link.href = doc.filePath;
    const isPdf = doc.filePath.startsWith('data:application/pdf') || doc.filePath.endsWith('.pdf');
    link.download = `${(doc.title || 'document').replace(/\s+/g, '_')}.${isPdf ? 'pdf' : 'jpg'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    return () => {
      stopDocCamera();
    };
  }, []);

  const handleAddDocument = (e) => {
    e.preventDefault();
    if (!docFormData.title.trim()) {
      setSnackbar({ open: true, message: 'Please enter a document title.', severity: 'warning' });
      return;
    }
    if (!docFormData.filePath.trim()) {
      setSnackbar({ open: true, message: 'Please select an image or document file to upload.', severity: 'warning' });
      return;
    }
    addDocMutation.mutate({
      title: docFormData.title.trim(),
      documentTypeId: docFormData.documentTypeId || null,
      filePath: docFormData.filePath.trim(),
    });
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !student) {
    return (
      <Box sx={{ p: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/students')} sx={{ mb: 2 }}>
          Back to Directory
        </Button>
        <Alert severity="error">
          {error?.response?.data?.message || 'Failed to load student details.'}
        </Alert>
      </Box>
    );
  }

  // Calculate age
  const age = student.dateOfBirth ? dayjs().diff(dayjs(student.dateOfBirth), 'year') : null;

  return (
    <Box sx={{ p: { xs: 1.25, sm: 2.5 }, pb: 4 }}>
      {/* Back Button */}
      <Button
        startIcon={<ArrowBackIcon sx={{ fontSize: 18 }} />}
        onClick={() => navigate('/students')}
        size="small"
        sx={{
          mb: 1.5,
          textTransform: 'none',
          fontWeight: 600,
          fontSize: { xs: '0.78rem', sm: '0.875rem' },
        }}
      >
        Back to Student Directory
      </Button>

      {/* Header Profile Card */}
      <Card sx={{ mb: { xs: 2, sm: 3 }, boxShadow: 2, background: 'linear-gradient(135deg, #f8faff 0%, #ffffff 100%)', borderRadius: 2.5, overflow: 'hidden' }}>
        <CardContent sx={{ p: { xs: 1.5, sm: 2.5 } }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'stretch', md: 'center' }}
            spacing={{ xs: 2, md: 3 }}
          >
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={{ xs: 1.25, sm: 2.5 }}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              sx={{ minWidth: 0, flex: 1 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                <Avatar
                  src={student.photoUrl}
                  sx={{
                    width: { xs: 68, sm: 90 },
                    height: { xs: 68, sm: 90 },
                    border: '3px solid #1976d2',
                    boxShadow: 2,
                    bgcolor: 'primary.main',
                    fontSize: { xs: 24, sm: 32 },
                    flexShrink: 0,
                  }}
                >
                  {student.fullName ? student.fullName[0] : 'S'}
                </Avatar>

                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography
                    variant="h5"
                    fontWeight={800}
                    color="text.primary"
                    sx={{
                      fontSize: { xs: '1.15rem', sm: '1.45rem' },
                      lineHeight: 1.2,
                    }}
                  >
                    {student.fullName}
                  </Typography>

                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6, mt: 0.5 }}>
                    <Chip
                      label={student.admissionNo}
                      color="primary"
                      size="small"
                      sx={{ fontWeight: 700, height: 22, fontSize: '0.72rem' }}
                    />
                    <Chip
                      label={student.status === 1 ? 'Active' : 'Inactive'}
                      color={student.status === 1 ? 'success' : 'default'}
                      size="small"
                      sx={{ height: 22, fontSize: '0.72rem' }}
                    />
                  </Box>
                </Box>
              </Box>

              <Box sx={{ width: '100%', minWidth: 0 }}>
                <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600, fontSize: { xs: '0.82rem', sm: '0.92rem' } }}>
                  {student.currentEnrollment
                    ? `${student.currentEnrollment.className} - ${student.currentEnrollment.sectionName} (Roll No: ${
                        student.currentEnrollment.rollNo ? '#' + student.currentEnrollment.rollNo : 'Unassigned'
                      })`
                    : 'Not currently enrolled'}
                </Typography>

                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: 'block',
                    mt: 0.3,
                    fontSize: { xs: '0.72rem', sm: '0.78rem' },
                    lineHeight: 1.45,
                  }}
                >
                  Gender: <b>{student.gender}</b> &bull; DOB: <b>{student.dateOfBirth ? dayjs(student.dateOfBirth).format('DD MMM YYYY') : '—'}</b> {age !== null && `(${age} yrs)`} &bull; Admitted: <b>{dayjs(student.admissionDate).format('DD MMM YYYY')}</b>
                </Typography>
              </Box>
            </Stack>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, auto)' },
                gap: 1,
                width: { xs: '100%', md: 'auto' },
                pt: { xs: 0.5, md: 0 },
              }}
            >
              <Button
                variant="outlined"
                color="secondary"
                size="small"
                startIcon={<BadgeIcon sx={{ fontSize: 16 }} />}
                onClick={() => setIsIdCardOpen(true)}
                sx={{
                  fontSize: { xs: '0.75rem', sm: '0.85rem' },
                  py: 0.6,
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: 1.5,
                  whiteSpace: 'nowrap',
                }}
              >
                ID Card
              </Button>

              <Button
                variant="outlined"
                color="info"
                size="small"
                startIcon={<ReceiptLongIcon sx={{ fontSize: 16 }} />}
                onClick={() => setIsAdmissionSlipOpen(true)}
                sx={{
                  fontSize: { xs: '0.75rem', sm: '0.85rem' },
                  py: 0.6,
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: 1.5,
                  whiteSpace: 'nowrap',
                }}
              >
                Admission Slip
              </Button>

              {can('SectionChange', 'Edit') && (
                <Button
                  variant="outlined"
                  color="warning"
                  size="small"
                  startIcon={<SwapHorizIcon sx={{ fontSize: 16 }} />}
                  onClick={() => navigate(`/students/section-change?studentId=${student.id}`)}
                  sx={{
                    fontSize: { xs: '0.75rem', sm: '0.85rem' },
                    py: 0.6,
                    fontWeight: 600,
                    textTransform: 'none',
                    borderRadius: 1.5,
                    whiteSpace: 'nowrap',
                  }}
                >
                  Section Transfer
                </Button>
              )}

              {can('Students', 'Edit') && (
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  startIcon={<EditIcon sx={{ fontSize: 16 }} />}
                  onClick={handleOpenEdit}
                  sx={{
                    fontSize: { xs: '0.75rem', sm: '0.85rem' },
                    py: 0.6,
                    fontWeight: 700,
                    textTransform: 'none',
                    borderRadius: 1.5,
                    whiteSpace: 'nowrap',
                  }}
                >
                  Edit Profile
                </Button>
              )}
            </Box>
          </Stack>
        </CardContent>

        <Divider />

        {/* Tab Navigation */}
        <Tabs
          value={activeTab}
          onChange={(e, val) => setActiveTab(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            px: { xs: 1, sm: 2 },
            bgcolor: '#fafafa',
            minHeight: { xs: 40, sm: 46 },
            '& .MuiTab-root': {
              minHeight: { xs: 40, sm: 46 },
              py: { xs: 0.8, sm: 1.2 },
              px: { xs: 1.25, sm: 2 },
              fontSize: { xs: '0.75rem', sm: '0.85rem' },
              fontWeight: 700,
              textTransform: 'none',
              whiteSpace: 'nowrap',
            },
          }}
        >
          <Tab icon={<PersonIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Personal Details" />
          <Tab icon={<FamilyIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={`Guardians & Siblings (${student.guardians.length})`} />
          <Tab icon={<SchoolIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={`Enrollments (${student.enrollmentHistory.length})`} />
          <Tab icon={<FolderSharedIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={`Documents (${student.documents.length})`} />
          <Tab icon={<HistoryIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={`Section History (${student.sectionHistories.length})`} />
        </Tabs>
      </Card>

      {/* Tab Panels */}
      {/* 1. Personal Details */}
      {activeTab === 0 && (
        <Grid container spacing={{ xs: 1.5, sm: 3 }}>
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', boxShadow: 1, borderRadius: 2 }}>
              <CardContent sx={{ p: { xs: 1.5, sm: 2.5 } }}>
                <Typography variant="h6" fontWeight={700} gutterBottom color="primary" sx={{ fontSize: { xs: '0.95rem', sm: '1.15rem' } }}>
                  General Information
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Stack spacing={2}>
                  <Grid container spacing={1}>
                    <Grid item xs={5}><Typography variant="body2" color="text.secondary">Full Name:</Typography></Grid>
                    <Grid item xs={7}><Typography variant="body2" fontWeight={600}>{student.fullName}</Typography></Grid>
                  </Grid>

                  <Grid container spacing={1}>
                    <Grid item xs={5}><Typography variant="body2" color="text.secondary">Admission Number:</Typography></Grid>
                    <Grid item xs={7}><Typography variant="body2" fontWeight={600}>{student.admissionNo}</Typography></Grid>
                  </Grid>

                  <Grid container spacing={1}>
                    <Grid item xs={5}><Typography variant="body2" color="text.secondary">Date of Birth:</Typography></Grid>
                    <Grid item xs={7}>
                      <Typography variant="body2" fontWeight={600}>
                        {student.dateOfBirth ? dayjs(student.dateOfBirth).format('DD MMMM YYYY') : '—'}
                      </Typography>
                    </Grid>
                  </Grid>

                  <Grid container spacing={1}>
                    <Grid item xs={5}><Typography variant="body2" color="text.secondary">Gender:</Typography></Grid>
                    <Grid item xs={7}><Typography variant="body2" fontWeight={600}>{student.gender}</Typography></Grid>
                  </Grid>

                  <Grid container spacing={1}>
                    <Grid item xs={5}><Typography variant="body2" color="text.secondary">Blood Group:</Typography></Grid>
                    <Grid item xs={7}><Typography variant="body2" fontWeight={600}>{student.bloodGroup || '—'}</Typography></Grid>
                  </Grid>

                  <Grid container spacing={1}>
                    <Grid item xs={5}><Typography variant="body2" color="text.secondary">Category:</Typography></Grid>
                    <Grid item xs={7}><Typography variant="body2" fontWeight={600}>{student.categoryName || 'General'}</Typography></Grid>
                  </Grid>

                  <Grid container spacing={1}>
                    <Grid item xs={5}><Typography variant="body2" color="text.secondary">Religion:</Typography></Grid>
                    <Grid item xs={7}><Typography variant="body2" fontWeight={600}>{student.religionName || '—'}</Typography></Grid>
                  </Grid>

                  <Grid container spacing={1}>
                    <Grid item xs={5}><Typography variant="body2" color="text.secondary">Aadhaar Card No:</Typography></Grid>
                    <Grid item xs={7}><Typography variant="body2" fontWeight={600}>{student.aadhaarNo || '—'}</Typography></Grid>
                  </Grid>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', boxShadow: 1 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom color="primary">
                  Address & Contact Details
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Stack spacing={2}>
                  <Grid container spacing={1}>
                    <Grid item xs={5}><Typography variant="body2" color="text.secondary">Residential Address:</Typography></Grid>
                    <Grid item xs={7}><Typography variant="body2" fontWeight={600}>{student.address || '—'}</Typography></Grid>
                  </Grid>

                  <Grid container spacing={1}>
                    <Grid item xs={5}><Typography variant="body2" color="text.secondary">City:</Typography></Grid>
                    <Grid item xs={7}><Typography variant="body2" fontWeight={600}>{student.city || '—'}</Typography></Grid>
                  </Grid>

                  <Grid container spacing={1}>
                    <Grid item xs={5}><Typography variant="body2" color="text.secondary">State:</Typography></Grid>
                    <Grid item xs={7}><Typography variant="body2" fontWeight={600}>{student.state || '—'}</Typography></Grid>
                  </Grid>

                  <Grid container spacing={1}>
                    <Grid item xs={5}><Typography variant="body2" color="text.secondary">Pincode:</Typography></Grid>
                    <Grid item xs={7}><Typography variant="body2" fontWeight={600}>{student.pincode || '—'}</Typography></Grid>
                  </Grid>

                  <Grid container spacing={1}>
                    <Grid item xs={5}><Typography variant="body2" color="text.secondary">Emergency Contact:</Typography></Grid>
                    <Grid item xs={7}>
                      <Typography variant="body2" fontWeight={700} color="error.main">
                        {student.emergencyContact || '—'}
                      </Typography>
                    </Grid>
                  </Grid>

                  <Grid container spacing={1}>
                    <Grid item xs={5}><Typography variant="body2" color="text.secondary">Admission Date:</Typography></Grid>
                    <Grid item xs={7}>
                      <Typography variant="body2" fontWeight={600}>
                        {dayjs(student.admissionDate).format('DD MMMM YYYY')}
                      </Typography>
                    </Grid>
                  </Grid>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* 2. Guardians & Siblings */}
      {activeTab === 1 && (
        <Stack spacing={3}>
          {/* Guardians */}
          <Typography variant="h6" fontWeight={700} color="text.primary">
            Guardians / Parents
          </Typography>
          <Grid container spacing={2}>
            {student.guardians.map((g) => (
              <Grid item xs={12} md={6} key={g.id}>
                <Card sx={{ boxShadow: 1, border: g.isPrimary ? '2px solid #1976d2' : '1px solid #e0e0e0' }}>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar sx={{ bgcolor: 'secondary.main', width: 36, height: 36 }}>
                          {g.name ? g.name[0] : 'G'}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle1" fontWeight={700}>
                            {g.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Relation: <b>{g.relation}</b>
                          </Typography>
                        </Box>
                      </Stack>
                      {g.isPrimary && (
                        <Chip label="Primary Guardian" color="primary" size="small" icon={<CheckCircleIcon />} />
                      )}
                    </Stack>

                    <Divider sx={{ my: 1.5 }} />

                    <Stack spacing={1}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <PhoneIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          <a href={`tel:${g.mobile}`} style={{ color: '#1976d2', textDecoration: 'none', fontWeight: 600 }}>
                            {g.mobile}
                          </a>
                        </Typography>
                      </Stack>

                      {g.email && (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <EmailIcon fontSize="small" color="action" />
                          <Typography variant="body2" color="text.secondary">
                            {g.email}
                          </Typography>
                        </Stack>
                      )}

                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="caption" color="text.secondary">
                          Occupation: <b>{g.occupation || '—'}</b>
                        </Typography>
                        {g.annualIncome && (
                          <Typography variant="caption" color="text.secondary">
                            Annual Income: <b>₹{Number(g.annualIncome).toLocaleString()}</b>
                          </Typography>
                        )}
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Siblings */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" fontWeight={700} color="text.primary" gutterBottom>
              Detected Siblings in School (FR-3.4)
            </Typography>
            {student.siblings && student.siblings.length > 0 ? (
              <Grid container spacing={2}>
                {student.siblings.map((sib) => (
                  <Grid item xs={12} sm={6} md={4} key={sib.studentId}>
                    <Paper sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="subtitle2" fontWeight={700}>
                          {sib.fullName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Adm No: <b>{sib.admissionNo}</b>
                        </Typography>
                        <Typography variant="caption" color="primary" fontWeight={600}>
                          {sib.className} - {sib.sectionName}
                        </Typography>
                      </Box>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => navigate(`/students/profile/${sib.studentId}`)}
                      >
                        View Profile
                      </Button>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Alert severity="info" variant="outlined">
                No active siblings detected sharing the same guardian mobile number.
              </Alert>
            )}
          </Box>
        </Stack>
      )}

      {/* 3. Academic & Enrollments */}
      {activeTab === 2 && (
        <Card sx={{ boxShadow: 1 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={700} color="primary" gutterBottom>
              Enrollment History Across Academic Sessions (BR-3.3)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Student master record is permanent; each year creates an active enrollment record.
            </Typography>

            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                  <TableRow>
                    <TableCell><b>Academic Year</b></TableCell>
                    <TableCell><b>Class</b></TableCell>
                    <TableCell><b>Section</b></TableCell>
                    <TableCell><b>Roll Number</b></TableCell>
                    <TableCell><b>Status</b></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {student.enrollmentHistory.map((enh) => (
                    <TableRow key={enh.id}>
                      <TableCell>{enh.academicYearName || 'Current'}</TableCell>
                      <TableCell><b>{enh.className}</b></TableCell>
                      <TableCell>{enh.sectionName}</TableCell>
                      <TableCell>{enh.rollNo ? `#${enh.rollNo}` : '—'}</TableCell>
                      <TableCell>
                        <Chip
                          label={enh.status === 1 ? 'Active' : 'Archived'}
                          color={enh.status === 1 ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* 4. Documents */}
      {activeTab === 3 && (
        <Card sx={{ boxShadow: 1 }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Box>
                <Typography variant="h6" fontWeight={700} color="primary">
                  Student Documents & Certificates (FR-3.3)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Uploaded identity, birth certificate, and transfer documents
                </Typography>
              </Box>
              {can('Students', 'Edit') && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setIsDocModalOpen(true)}
                >
                  Upload Document
                </Button>
              )}
            </Stack>

            {student.documents.length > 0 ? (
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead sx={{ bgcolor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell width={70} align="center"><b>Preview</b></TableCell>
                      <TableCell><b>Document Title</b></TableCell>
                      <TableCell width={160}><b>Type</b></TableCell>
                      <TableCell><b>File Details</b></TableCell>
                      <TableCell align="right" width={140}><b>Actions</b></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {student.documents.map((doc) => {
                      const isImage = doc.filePath && (doc.filePath.startsWith('data:image') || /\.(jpg|jpeg|png|webp|gif)$/i.test(doc.filePath));
                      const isPdf = doc.filePath && (doc.filePath.startsWith('data:application/pdf') || /\.pdf$/i.test(doc.filePath));

                      return (
                        <TableRow key={doc.id} hover>
                          <TableCell align="center">
                            {isImage ? (
                              <Tooltip title="Click to view full image">
                                <Avatar
                                  variant="rounded"
                                  src={doc.filePath}
                                  sx={{
                                    width: 44,
                                    height: 44,
                                    cursor: 'pointer',
                                    border: '1.5px solid #cbd5e1',
                                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                                    transition: 'transform 0.15s ease-in-out',
                                    '&:hover': { transform: 'scale(1.1)', borderColor: '#1976d2' },
                                  }}
                                  onClick={() => setPreviewDoc(doc)}
                                />
                              </Tooltip>
                            ) : isPdf ? (
                              <Tooltip title="Click to view PDF document">
                                <Avatar
                                  variant="rounded"
                                  sx={{
                                    width: 44,
                                    height: 44,
                                    bgcolor: '#fee2e2',
                                    color: '#dc2626',
                                    cursor: 'pointer',
                                    border: '1.5px solid #fecaca',
                                    '&:hover': { transform: 'scale(1.1)' },
                                  }}
                                  onClick={() => setPreviewDoc(doc)}
                                >
                                  <PictureAsPdfIcon fontSize="small" />
                                </Avatar>
                              </Tooltip>
                            ) : (
                              <Avatar variant="rounded" sx={{ width: 44, height: 44, bgcolor: '#e2e8f0', color: '#64748b' }}>
                                <ImageIcon fontSize="small" />
                              </Avatar>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="subtitle2" fontWeight={700} color="#1e293b">
                              {doc.title}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={doc.documentTypeName || 'Document'} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                          </TableCell>
                          <TableCell>
                            {isImage ? (
                              <Chip size="small" color="success" variant="outlined" label="Image Document" sx={{ fontWeight: 600 }} />
                            ) : isPdf ? (
                              <Chip size="small" color="error" variant="outlined" label="PDF Document" sx={{ fontWeight: 600 }} />
                            ) : (
                              <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                                {doc.filePath?.length > 35 ? doc.filePath.substring(0, 32) + '...' : doc.filePath || '—'}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                              {doc.filePath && (
                                <Tooltip title="View Document">
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={() => setPreviewDoc(doc)}
                                  >
                                    <VisibilityIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                              {doc.filePath && (
                                <Tooltip title="Download">
                                  <IconButton
                                    size="small"
                                    color="secondary"
                                    onClick={() => handleDownloadDoc(doc)}
                                  >
                                    <DownloadIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                              {can('Students', 'Edit') && (
                                <Tooltip title="Delete Document">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => deleteDocMutation.mutate(doc.id)}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="info" variant="outlined">
                No documents uploaded yet for this student. Click "Upload Document" above to upload an image or PDF.
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* 5. Section Change History */}
      {activeTab === 4 && (
        <Card sx={{ boxShadow: 1 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={700} color="primary" gutterBottom>
              Section Change Audit Trail (FR-3.8)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Permanent record of section transfers with authorized reasons and timestamps
            </Typography>

            {student.sectionHistories && student.sectionHistories.length > 0 ? (
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                    <TableRow>
                      <TableCell><b>Date & Time</b></TableCell>
                      <TableCell><b>Class</b></TableCell>
                      <TableCell><b>From Section</b></TableCell>
                      <TableCell><b>To Section</b></TableCell>
                      <TableCell><b>Reason for Transfer</b></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {student.sectionHistories.map((h) => (
                      <TableRow key={h.id}>
                        <TableCell>{dayjs(h.changedOn).format('DD MMM YYYY, hh:mm A')}</TableCell>
                        <TableCell><b>{student.currentEnrollment?.className || '—'}</b></TableCell>
                        <TableCell>
                          <Chip label={h.fromSectionName || 'Section A'} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Chip label={h.toSectionName || 'Section B'} size="small" color="primary" />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontStyle="italic">
                            {h.reason || 'Administrative transfer'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="info" variant="outlined">
                No section change records for this student.
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Comprehensive Dynamic Edit Student Profile Modal */}
      <AppModal
        open={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        maxWidth="lg"
        fullWidth
        title="Edit Student Master & Profile"
        subtitle="Update identification photos, academic enrollment, pupil and guardian records"
        icon={<EditIcon sx={{ fontSize: 22 }} />}
        topRightAction={
          <Chip
            label={editFormData?.admissionNo || student?.admissionNo || 'Student'}
            size="small"
            sx={{
              bgcolor: 'rgba(255, 255, 255, 0.22)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.75rem',
              letterSpacing: '0.5px',
              border: '1px solid rgba(255, 255, 255, 0.35)',
              mr: 1,
            }}
          />
        }
        footer={
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              flexWrap: 'wrap',
              gap: 1.5,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                variant="outlined"
                color="inherit"
                onClick={() => setIsEditOpen(false)}
                sx={{
                  borderRadius: '6px',
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  borderColor: '#cbd5e1',
                  color: '#475569',
                }}
              >
                Cancel
              </Button>
              {editModalTab > 0 && (
                <Button
                  variant="outlined"
                  color="inherit"
                  startIcon={<PrevIcon />}
                  onClick={() => setEditModalTab((prev) => prev - 1)}
                  sx={{
                    borderRadius: '6px',
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    borderColor: '#cbd5e1',
                    color: '#475569',
                  }}
                >
                  Previous Tab
                </Button>
              )}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {editModalTab < 3 && (
                <Button
                  variant="outlined"
                  color="primary"
                  endIcon={<NextIcon />}
                  onClick={() => setEditModalTab((prev) => prev + 1)}
                  sx={{
                    borderRadius: '6px',
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                  }}
                >
                  Next Tab
                </Button>
              )}
              <Button
                type="submit"
                form="edit-student-profile-form"
                onClick={handleSaveEdit}
                variant="contained"
                color="primary"
                startIcon={updateMutation.isPending ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                disabled={updateMutation.isPending}
                sx={{
                  borderRadius: '6px',
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  px: 3,
                }}
              >
                {updateMutation.isPending ? 'Saving All Changes...' : 'Save All Changes'}
              </Button>
            </Box>
          </Box>
        }
      >
        {editFormData && (
          <form id="edit-student-profile-form" onSubmit={handleSaveEdit}>
            {/* Elegant Sub-Header Tab Ribbon */}
            <Box
              sx={{
                borderBottom: '1px solid',
                borderColor: 'divider',
                mb: 3,
                mt: -1,
                mx: { xs: -2, sm: -3 },
                px: { xs: 1, sm: 2 },
                bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8fafc'),
              }}
            >
              <Tabs
                value={editModalTab}
                onChange={(e, val) => setEditModalTab(val)}
                variant="scrollable"
                scrollButtons="auto"
                textColor="primary"
                indicatorColor="primary"
                sx={{
                  minHeight: 46,
                  width: '100%',
                  '& .MuiTab-root': {
                    minHeight: 46,
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    textTransform: 'none',
                    px: { xs: 1.5, sm: 2.5 },
                    gap: 1,
                    transition: 'all 0.2s ease',
                    '&.Mui-selected': {
                      color: 'primary.main',
                      bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#ffffff'),
                      borderBottom: '2px solid',
                      borderColor: 'primary.main',
                    },
                  },
                }}
              >
                <Tab icon={<PhotoCameraIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="1. 4 Photographs" />
                <Tab icon={<PersonIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="2. Pupil & Enrollment" />
                <Tab icon={<FamilyIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="3. Parents & Guardians" />
                <Tab icon={<HomeIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="4. Address & Contact" />
              </Tabs>
            </Box>

            {/* TAB 0: 4 PHOTOGRAPHS */}
            {editModalTab === 0 && (
              <Box>
                <Alert severity="info" sx={{ mb: 3 }}>
                  Capture or update all 4 official photographs: Student, Father, Mother, and Guardian. Click the <b>red camera icon</b> to capture live via webcam, or the <b>blue upload icon</b> to select a photo from your computer.
                </Alert>

                <Grid container spacing={2.5} justifyContent="center">
                  {[
                    { label: 'Student Photo', key: 'photoUrl', desc: 'Official pupil identification' },
                    { label: "Father's Photo", key: 'fatherPhotoUrl', desc: 'Father / primary guardian' },
                    { label: "Mother's Photo", key: 'motherPhotoUrl', desc: 'Mother identification' },
                    { label: "Guardian's Photo", key: 'guardianPhotoUrl', desc: 'Local guardian / emergency' },
                  ].map((item) => (
                    <Grid item xs={12} sm={6} md={3} key={item.key} sx={{ display: 'flex', justifyContent: 'center' }}>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 2,
                          width: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 2,
                          bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#f8fafc'),
                          border: '1px solid',
                          borderColor: 'divider',
                          transition: 'all 0.2s',
                          '&:hover': {
                            boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                            borderColor: 'primary.main',
                          },
                        }}
                      >
                        <PhotoCaptureUpload
                          label={item.label}
                          value={editFormData[item.key]}
                          onChange={(url) => setEditFormData({ ...editFormData, [item.key]: url })}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, textAlign: 'center', fontSize: '11px' }}>
                          {item.desc}
                        </Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {/* TAB 1: PUPIL & ENROLLMENT */}
            {editModalTab === 1 && (
              <Stack spacing={3}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <PersonIcon color="primary" fontSize="small" />
                    <Typography variant="subtitle2" fontWeight={800} color="primary.main" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      1. Basic Pupil Identity
                    </Typography>
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <AppInput
                        required
                        uppercase
                        label="First Name"
                        placeholder="Student First Name"
                        value={editFormData.firstName}
                        onChange={(e) => setEditFormData({ ...editFormData, firstName: (e.target?.value || '').toUpperCase() })}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <AppInput
                        uppercase
                        label="Last Name"
                        placeholder="Surname / Last Name"
                        value={editFormData.lastName}
                        onChange={(e) => setEditFormData({ ...editFormData, lastName: (e.target?.value || '').toUpperCase() })}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <AppInput
                        label="Admission Number"
                        placeholder="Registration / Adm No"
                        value={editFormData.admissionNo}
                        onChange={(e) => setEditFormData({ ...editFormData, admissionNo: e.target?.value || '' })}
                        helperText="Official school registration number"
                      />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <AppDatePicker
                        label="Date of Admission"
                        value={editFormData.admissionDate}
                        onChange={(e) => {
                          setEditFormData({
                            ...editFormData,
                            admissionDate: e.value ? dayjs(e.value).format('YYYY-MM-DD') : '',
                          });
                        }}
                        dateFormat="dd/M/yy"
                      />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <AppDatePicker
                        required
                        label="Date of Birth (DOB)"
                        value={editFormData.dateOfBirth}
                        onChange={(e) => {
                          setEditFormData({
                            ...editFormData,
                            dateOfBirth: e.value ? dayjs(e.value).format('YYYY-MM-DD') : '',
                          });
                        }}
                        dateFormat="dd/M/yy"
                      />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <AppSelect
                        label="Gender"
                        value={editFormData.gender}
                        onChange={(e) => setEditFormData({ ...editFormData, gender: e.value })}
                        options={['Male', 'Female', 'Other']}
                        placeholder="Select Gender"
                      />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <AppSelect
                        label="Blood Group"
                        value={editFormData.bloodGroup}
                        onChange={(e) => setEditFormData({ ...editFormData, bloodGroup: e.value })}
                        options={['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']}
                        placeholder="Select Blood Group"
                        showClear
                      />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <AppInput
                        label="Aadhaar Card No"
                        placeholder="12-digit UID"
                        maxLength={12}
                        value={editFormData.aadhaarNo}
                        onChange={(e) => {
                          const val = (e.target?.value || '').replace(/D/g, '').slice(0, 12);
                          setEditFormData({ ...editFormData, aadhaarNo: val });
                        }}
                      />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <AppSelect
                        label="Category"
                        value={editFormData.categoryId}
                        onChange={(e) => setEditFormData({ ...editFormData, categoryId: e.value })}
                        options={categories}
                        optionLabel="name"
                        optionValue="id"
                        placeholder="Select Category"
                        showClear
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <AppSelect
                        label="Religion"
                        value={editFormData.religionId}
                        onChange={(e) => setEditFormData({ ...editFormData, religionId: e.value })}
                        options={religions}
                        optionLabel="name"
                        optionValue="id"
                        placeholder="Select Religion"
                        showClear
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <AppSelect
                        label="Student Status"
                        value={editFormData.status}
                        onChange={(e) => setEditFormData({ ...editFormData, status: Number(e.value) })}
                        options={[
                          { id: 1, name: 'Active' },
                          { id: 2, name: 'Inactive' },
                          { id: 3, name: 'Suspended' },
                          { id: 4, name: 'Expelled' },
                          { id: 5, name: 'TC Issued' },
                        ]}
                        optionLabel="name"
                        optionValue="id"
                        placeholder="Select Status"
                      />
                    </Grid>
                  </Grid>
                </Box>

                <Divider />

                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <SchoolIcon color="primary" fontSize="small" />
                    <Typography variant="subtitle2" fontWeight={800} color="primary.main" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      2. Current Academic Enrollment
                    </Typography>
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <AppSelect
                        label="Class / Grade"
                        value={editFormData.classId}
                        onChange={(e) => {
                          setEditFormData({
                            ...editFormData,
                            classId: e.value,
                            sectionId: '',
                          });
                        }}
                        options={classes}
                        optionLabel="name"
                        optionValue="id"
                        placeholder="Select Class"
                      />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <AppSelect
                        label="Section"
                        value={editFormData.sectionId}
                        disabled={!editFormData.classId}
                        onChange={(e) => setEditFormData({ ...editFormData, sectionId: e.value })}
                        options={(classes.find((c) => c.id === Number(editFormData.classId))?.sections || []).map((sec) => ({
                          id: sec.id,
                          name: `${sec.name} (Cap: ${sec.capacity})`,
                        }))}
                        optionLabel="name"
                        optionValue="id"
                        placeholder="Select Section"
                      />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <AppInput
                        type="number"
                        label="Roll Number"
                        placeholder="e.g. 15"
                        value={editFormData.rollNo}
                        onChange={(e) => setEditFormData({ ...editFormData, rollNo: e.target?.value || '' })}
                      />
                    </Grid>
                  </Grid>
                </Box>
              </Stack>
            )}

            {/* TAB 2: PARENTS & GUARDIANS */}
            {editModalTab === 2 && (
              <Stack spacing={2.5}>
                {/* Father Card */}
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2.5,
                    borderRadius: 2,
                    bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#fafafa'),
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Typography variant="subtitle2" fontWeight={800} color="primary.main" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonIcon fontSize="small" /> FATHER'S DETAILS
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <AppInput
                        uppercase
                        label="Father Name"
                        placeholder="Father full name"
                        value={editFormData.fatherName}
                        onChange={(e) => setEditFormData({ ...editFormData, fatherName: (e.target?.value || '').toUpperCase() })}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <AppInput
                        label="Father Mobile"
                        placeholder="10-digit phone"
                        maxLength={10}
                        value={editFormData.fatherMobile}
                        onChange={(e) => {
                          const val = (e.target?.value || '').replace(/D/g, '').slice(0, 10);
                          setEditFormData({ ...editFormData, fatherMobile: val });
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <AppInput
                        type="email"
                        label="Father Email"
                        placeholder="name@example.com"
                        value={editFormData.fatherEmail}
                        onChange={(e) => setEditFormData({ ...editFormData, fatherEmail: e.target?.value || '' })}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <AppInput
                        label="Father Occupation"
                        placeholder="e.g. Business / Service"
                        value={editFormData.fatherOccupation}
                        onChange={(e) => setEditFormData({ ...editFormData, fatherOccupation: e.target?.value || '' })}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <AppInput
                        type="number"
                        label="Annual Income (₹)"
                        placeholder="Annual income"
                        value={editFormData.fatherAnnualIncome}
                        onChange={(e) => setEditFormData({ ...editFormData, fatherAnnualIncome: e.target?.value || '' })}
                      />
                    </Grid>
                  </Grid>
                </Paper>

                {/* Mother Card */}
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2.5,
                    borderRadius: 2,
                    bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#fafafa'),
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Typography variant="subtitle2" fontWeight={800} color="secondary.main" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonIcon fontSize="small" /> MOTHER'S DETAILS
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <AppInput
                        uppercase
                        label="Mother Name"
                        placeholder="Mother full name"
                        value={editFormData.motherName}
                        onChange={(e) => setEditFormData({ ...editFormData, motherName: (e.target?.value || '').toUpperCase() })}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <AppInput
                        label="Mother Mobile"
                        placeholder="10-digit phone"
                        maxLength={10}
                        value={editFormData.motherMobile}
                        onChange={(e) => {
                          const val = (e.target?.value || '').replace(/D/g, '').slice(0, 10);
                          setEditFormData({ ...editFormData, motherMobile: val });
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <AppInput
                        type="email"
                        label="Mother Email"
                        placeholder="name@example.com"
                        value={editFormData.motherEmail}
                        onChange={(e) => setEditFormData({ ...editFormData, motherEmail: e.target?.value || '' })}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <AppInput
                        label="Mother Occupation"
                        placeholder="e.g. Homemaker / Teacher"
                        value={editFormData.motherOccupation}
                        onChange={(e) => setEditFormData({ ...editFormData, motherOccupation: e.target?.value || '' })}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <AppInput
                        type="number"
                        label="Annual Income (₹)"
                        placeholder="Annual income"
                        value={editFormData.motherAnnualIncome}
                        onChange={(e) => setEditFormData({ ...editFormData, motherAnnualIncome: e.target?.value || '' })}
                      />
                    </Grid>
                  </Grid>
                </Paper>

                {/* Local Guardian Card */}
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2.5,
                    borderRadius: 2,
                    bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#fafafa'),
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Typography variant="subtitle2" fontWeight={800} color="text.primary" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FamilyIcon fontSize="small" /> LOCAL / OTHER GUARDIAN DETAILS
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <AppInput
                        uppercase
                        label="Guardian Name"
                        placeholder="Guardian full name"
                        value={editFormData.guardianName}
                        onChange={(e) => setEditFormData({ ...editFormData, guardianName: (e.target?.value || '').toUpperCase() })}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <AppInput
                        label="Guardian Mobile"
                        placeholder="10-digit phone"
                        maxLength={10}
                        value={editFormData.guardianMobile}
                        onChange={(e) => {
                          const val = (e.target?.value || '').replace(/D/g, '').slice(0, 10);
                          setEditFormData({ ...editFormData, guardianMobile: val });
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <AppInput
                        label="Relation"
                        placeholder="e.g. Uncle, Grandfather"
                        value={editFormData.guardianRelation}
                        onChange={(e) => setEditFormData({ ...editFormData, guardianRelation: e.target?.value || '' })}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <AppInput
                        type="email"
                        label="Guardian Email"
                        placeholder="name@example.com"
                        value={editFormData.guardianEmail}
                        onChange={(e) => setEditFormData({ ...editFormData, guardianEmail: e.target?.value || '' })}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <AppInput
                        label="Guardian Occupation"
                        placeholder="Occupation"
                        value={editFormData.guardianOccupation}
                        onChange={(e) => setEditFormData({ ...editFormData, guardianOccupation: e.target?.value || '' })}
                      />
                    </Grid>
                  </Grid>
                </Paper>
              </Stack>
            )}

            {/* TAB 3: ADDRESS & CONTACT */}
            {editModalTab === 3 && (
              <Stack spacing={2.5}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <HomeIcon color="primary" fontSize="small" />
                  <Typography variant="subtitle2" fontWeight={800} color="primary.main" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Residential Address & Emergency Contact
                  </Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <AppInput
                      type="textarea"
                      rows={2}
                      label="Street Address / Residence"
                      placeholder="Flat / House no, street, locality..."
                      value={editFormData.address}
                      onChange={(e) => setEditFormData({ ...editFormData, address: e.target?.value || '' })}
                    />
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <AppInput
                      label="City"
                      placeholder="City"
                      value={editFormData.city}
                      onChange={(e) => setEditFormData({ ...editFormData, city: e.target?.value || '' })}
                    />
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <AppInput
                      label="State"
                      placeholder="State"
                      value={editFormData.state}
                      onChange={(e) => setEditFormData({ ...editFormData, state: e.target?.value || '' })}
                    />
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <AppInput
                      label="Pincode"
                      placeholder="6-digit pincode"
                      maxLength={6}
                      value={editFormData.pincode}
                      onChange={(e) => {
                        const val = (e.target?.value || '').replace(/D/g, '').slice(0, 6);
                        setEditFormData({ ...editFormData, pincode: val });
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <AppInput
                      label="Emergency Contact Number"
                      placeholder="10-digit emergency phone number"
                      maxLength={10}
                      value={editFormData.emergencyContact}
                      onChange={(e) => {
                        const val = (e.target?.value || '').replace(/D/g, '').slice(0, 10);
                        setEditFormData({ ...editFormData, emergencyContact: val });
                      }}
                    />
                  </Grid>
                </Grid>
              </Stack>
            )}
          </form>
        )}
      </AppModal>

      {/* Upload Document Modal */}
      <Dialog
        open={isDocModalOpen}
        onClose={() => {
          setIsDocModalOpen(false);
          stopDocCamera();
          setIsDocCameraOpen(false);
        }}
        maxWidth="sm"
        fullWidth
      >
        <form onSubmit={handleAddDocument}>
          <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Upload Student Document</span>
            <IconButton size="small" onClick={() => {
              setIsDocModalOpen(false);
              stopDocCamera();
              setIsDocCameraOpen(false);
            }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2.5}>
              <TextField
                fullWidth
                size="small"
                required
                label="Document Title"
                placeholder="e.g. Birth Certificate, Aadhaar Card, Transfer Certificate..."
                value={docFormData.title}
                onChange={(e) => setDocFormData({ ...docFormData, title: e.target.value })}
              />

              <TextField
                select
                fullWidth
                size="small"
                label="Document Type"
                value={docFormData.documentTypeId}
                onChange={(e) => setDocFormData({ ...docFormData, documentTypeId: e.target.value })}
              >
                <MenuItem value="">Select Type</MenuItem>
                {docTypes.map((dt) => (
                  <MenuItem key={dt.id} value={dt.id}>{dt.name}</MenuItem>
                ))}
              </TextField>

              {/* Hidden File Input */}
              <input
                ref={docFileInputRef}
                type="file"
                accept="image/*,application/pdf"
                style={{ display: 'none' }}
                onChange={handleDocFileSelect}
              />

              {/* Live Camera View if Active */}
              {isDocCameraOpen ? (
                <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: '#0f172a', borderRadius: 2 }}>
                  {cameraLoading && <CircularProgress sx={{ color: '#fff', my: 2 }} />}
                  {cameraError ? (
                    <Alert severity="error" sx={{ mb: 2 }}>{cameraError}</Alert>
                  ) : (
                    <Box sx={{ position: 'relative', width: '100%', maxHeight: 300, overflow: 'hidden', borderRadius: 1.5 }}>
                      <video
                        ref={docVideoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{ width: '100%', maxHeight: 300, objectFit: 'contain', borderRadius: 6 }}
                      />
                    </Box>
                  )}
                  <Stack direction="row" spacing={1.5} justifyContent="center" sx={{ mt: 2 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<PhotoCameraIcon />}
                      onClick={handleCaptureDocPhoto}
                      disabled={cameraLoading || Boolean(cameraError)}
                    >
                      Capture Photo
                    </Button>
                    <Button
                      variant="outlined"
                      color="inherit"
                      sx={{ color: '#fff', borderColor: '#64748b' }}
                      startIcon={<CameraswitchIcon />}
                      onClick={handleSwitchDocCamera}
                    >
                      Switch Camera
                    </Button>
                    <Button
                      variant="text"
                      color="inherit"
                      sx={{ color: '#94a3b8' }}
                      onClick={() => {
                        stopDocCamera();
                        setIsDocCameraOpen(false);
                      }}
                    >
                      Cancel Camera
                    </Button>
                  </Stack>
                </Paper>
              ) : docFormData.filePath ? (
                /* Selected File / Image Preview Box */
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: '#f8fafc',
                    border: '1.5px solid #cbd5e1',
                  }}
                >
                  <Stack direction="row" spacing={2} alignItems="center">
                    {docFileInfo.isImage || docFormData.filePath.startsWith('data:image') ? (
                      <Box
                        component="img"
                        src={docFormData.filePath}
                        alt="Document Preview"
                        sx={{
                          width: 80,
                          height: 80,
                          objectFit: 'cover',
                          borderRadius: 1.5,
                          border: '1px solid #94a3b8',
                        }}
                      />
                    ) : (
                      <Avatar
                        variant="rounded"
                        sx={{ width: 64, height: 64, bgcolor: '#fee2e2', color: '#dc2626' }}
                      >
                        <PictureAsPdfIcon sx={{ fontSize: 36 }} />
                      </Avatar>
                    )}

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle2" fontWeight={700} noWrap>
                        {docFileInfo.fileName || 'Selected Document File'}
                      </Typography>
                      {docFileInfo.fileSize && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          Size: {docFileInfo.fileSize}
                        </Typography>
                      )}
                      <Chip
                        size="small"
                        color="success"
                        label="Ready to Save"
                        sx={{ height: 20, fontSize: '0.72rem', fontWeight: 600, mt: 0.5 }}
                      />
                    </Box>

                    <Stack spacing={0.8}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => docFileInputRef.current?.click()}
                        sx={{ textTransform: 'none', fontSize: '0.78rem' }}
                      >
                        Change
                      </Button>
                      <Button
                        size="small"
                        variant="text"
                        color="error"
                        onClick={handleClearDocFile}
                        sx={{ textTransform: 'none', fontSize: '0.78rem' }}
                      >
                        Remove
                      </Button>
                    </Stack>
                  </Stack>
                </Paper>
              ) : (
                /* Interactive Upload Dropzone */
                <Box
                  onClick={() => docFileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files?.[0]) {
                      handleDocFileSelect({ target: { files: e.dataTransfer.files } });
                    }
                  }}
                  sx={{
                    border: '2px dashed #3b82f6',
                    borderRadius: 2.5,
                    p: 3,
                    textAlign: 'center',
                    bgcolor: '#f0f7ff',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      bgcolor: '#e0f2fe',
                      borderColor: '#1d4ed8',
                      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)',
                    },
                  }}
                >
                  <CloudUploadIcon sx={{ fontSize: 48, color: '#2563eb', mb: 1 }} />
                  <Typography variant="subtitle1" fontWeight={700} color="#1e3a8a">
                    Click to browse or drag & drop image or PDF
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.82rem' }}>
                    Supports JPG, PNG, WEBP, and PDF documents (Aadhaar, Birth Certificate, TC, Report Card)
                  </Typography>

                  <Stack direction="row" spacing={1.5} justifyContent="center" sx={{ mt: 2 }}>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<CloudUploadIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        docFileInputRef.current?.click();
                      }}
                      sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                      Browse File
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<CameraAltIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsDocCameraOpen(true);
                        startDocCamera(facingMode);
                      }}
                      sx={{ textTransform: 'none', fontWeight: 600, bgcolor: '#fff' }}
                    >
                      Use Camera
                    </Button>
                  </Stack>
                </Box>
              )}

              {/* Optional Manual File URL input */}
              <TextField
                fullWidth
                size="small"
                label="Or enter File URL / Storage Path (Optional)"
                placeholder="e.g. https://... or /uploads/documents/doc.pdf"
                value={docFormData.filePath.startsWith('data:') ? '(File loaded in memory)' : docFormData.filePath}
                disabled={docFormData.filePath.startsWith('data:')}
                onChange={(e) => setDocFormData({ ...docFormData, filePath: e.target.value })}
                helperText={docFormData.filePath.startsWith('data:') ? 'Image/document file is attached and ready' : 'Direct link if already hosted on server'}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2, bgcolor: '#f8fafc' }}>
            <Button onClick={() => {
              setIsDocModalOpen(false);
              stopDocCamera();
              setIsDocCameraOpen(false);
            }}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={!docFormData.filePath}
              loading={addDocMutation.isPending}
              sx={{ px: 3, fontWeight: 700 }}
            >
              Save Document
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Full Document Preview Modal */}
      <Dialog
        open={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
              {previewDoc?.title || 'Document Preview'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {previewDoc?.documentTypeName || 'Student Document'}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setPreviewDoc(null)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2, textAlign: 'center', bgcolor: '#f8fafc', minHeight: 350 }}>
          {previewDoc?.filePath?.startsWith('data:application/pdf') || previewDoc?.filePath?.endsWith('.pdf') ? (
            <Box
              component="iframe"
              src={previewDoc.filePath}
              title={previewDoc.title}
              sx={{ width: '100%', height: 500, border: 'none', borderRadius: 1 }}
            />
          ) : (
            <Box
              component="img"
              src={previewDoc?.filePath}
              alt={previewDoc?.title}
              sx={{
                maxWidth: '100%',
                maxHeight: '70vh',
                objectFit: 'contain',
                borderRadius: 1.5,
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              }}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ p: 1.5, justifyContent: 'space-between' }}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => handleDownloadDoc(previewDoc)}
          >
            Download
          </Button>
          <Button onClick={() => setPreviewDoc(null)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Print ID Card Modal */}
      <Dialog
        open={isIdCardOpen}
        onClose={() => setIsIdCardOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ textAlign: 'center', pb: 1, fontWeight: 700 }}>
          Student ID Card
        </DialogTitle>
        <DialogContent>
          <Paper
            elevation={4}
            sx={{
              p: 3,
              borderRadius: 3,
              border: '2px solid #1976d2',
              background: 'linear-gradient(135deg, #ffffff 0%, #f4f8fd 100%)',
              textAlign: 'center',
            }}
          >
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

            <Avatar
              src={student.photoUrl}
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

            <Typography variant="subtitle1" fontWeight={700}>
              {student.fullName}
            </Typography>
            <Chip
              label={student.admissionNo}
              color="primary"
              size="small"
              sx={{ fontWeight: 700, mt: 0.5, mb: 2 }}
            />

            <Stack spacing={0.8} sx={{ textAlign: 'left', px: 2, mb: 2 }}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Class & Section:
                </Typography>
                <Typography variant="caption" fontWeight={700}>
                  {student.currentEnrollment?.className} - {student.currentEnrollment?.sectionName}
                </Typography>
              </Stack>

              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Roll Number:
                </Typography>
                <Typography variant="caption" fontWeight={700}>
                  {student.currentEnrollment?.rollNo ? `#${student.currentEnrollment.rollNo}` : '—'}
                </Typography>
              </Stack>

              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Blood Group:
                </Typography>
                <Typography variant="caption" fontWeight={700} color="error.main">
                  {student.bloodGroup || '—'}
                </Typography>
              </Stack>

              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Emergency Contact:
                </Typography>
                <Typography variant="caption" fontWeight={700}>
                  {student.emergencyContact || student.guardians?.[0]?.mobile || '—'}
                </Typography>
              </Stack>
            </Stack>

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
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
          <Button onClick={() => setIsIdCardOpen(false)}>Close</Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PrintIcon />}
            onClick={() => {
              const sName = [student?.firstName, student?.lastName].filter(Boolean).join(' ') || 'Student';
              const admNo = student?.admissionNumber ? `_${student.admissionNumber}` : '';
              printWithTitle(`Student_ID_Card_${sName}${admNo}`);
            }}
          >
            Print ID Card
          </Button>
        </DialogActions>
      </Dialog>

      {/* Official Admission Report & Slip Modal */}
      {student && (
        <AdmissionReportModal
          open={isAdmissionSlipOpen}
          onClose={() => setIsAdmissionSlipOpen(false)}
          studentId={student.id}
          studentData={student}
        />
      )}

      {/* Snackbar Notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%', fontWeight: 600 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
