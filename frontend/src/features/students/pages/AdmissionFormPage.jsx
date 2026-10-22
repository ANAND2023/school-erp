import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Button,
  Grid,
  TextField,
  MenuItem,
  Alert,
  Divider,
  Card,
  CardContent,
  CircularProgress,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Person as StudentIcon,
  People as ParentIcon,
  Class as ClassIcon,
  CheckCircle as SuccessIcon,
  Group as SiblingIcon,
  Search as SearchIcon,
  Link as LinkIcon,
  Close as CloseIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  Edit as EditIcon,
  PhotoCamera as PhotoIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Home as AddressIcon,
  Badge as BadgeIcon,
  Cake as CakeIcon,
  Bloodtype as BloodIcon,
  School as SchoolIcon,
  Work as WorkIcon,
  FamilyRestroom as FamilyIcon,
  AssignmentInd as RollIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { studentApi } from '../api';
import { classApi, simpleMasterApi } from '../../masters/api';
import { useUiStore } from '../../../store/uiStore';
import { AdmissionReportModal } from '../components/AdmissionReportModal';
import { PhotoCaptureUpload } from '../components/PhotoCaptureUpload';
import { AppInput, AppSelect, AppDatePicker } from '../../../components/common';

const steps = ['Essential Details *', 'Personal & Address', 'Parents & Family', 'Review & Confirm'];

export const AdmissionFormPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { showSnackbar } = useUiStore();

  const [activeStep, setActiveStep] = useState(0);
  const [classes, setClasses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [religions, setReligions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Sibling state
  const [detectedSiblings, setDetectedSiblings] = useState([]);
  const [checkingSiblings, setCheckingSiblings] = useState(false);
  const [attachedSibling, setAttachedSibling] = useState(null);
  const [isSiblingDialogOpen, setIsSiblingDialogOpen] = useState(false);
  const [siblingSearchTerm, setSiblingSearchTerm] = useState('');
  const [siblingSearchResults, setSiblingSearchResults] = useState([]);
  const [isSearchingSibling, setIsSearchingSibling] = useState(false);
  const [isLockParentInfo, setIsLockParentInfo] = useState(true);

  // Age warning (BR-3.5)
  const [ageWarning, setAgeWarning] = useState('');

  // Admission Report Modal State
  const [admittedStudent, setAdmittedStudent] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showFamilyPhotosDialog, setShowFamilyPhotosDialog] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Student
    firstName: '',
    lastName: '',
    dateOfBirth: '2020-05-15',
    gender: 'Male',
    categoryId: '',
    religionId: '',
    bloodGroup: 'B+',
    aadhaarNo: '',
    photoUrl: '',
    fatherPhotoUrl: '',
    motherPhotoUrl: '',
    guardianPhotoUrl: '',
    address: '',
    city: 'New Delhi',
    state: 'Delhi',
    pincode: '110001',
    emergencyContact: '',

    // Sibling connection (FR-3.4)
    siblingStudentId: null,

    // Step 2: Guardians
    fatherName: '',
    fatherMobile: '',
    fatherEmail: '',
    fatherOccupation: '',
    motherName: '',
    motherMobile: '',
    motherOccupation: '',

    // Step 3: Allotment
    classId: '',
    sectionId: '',
    rollNo: '',

    // Enquiry Link if pre-filled (FR-3.2)
    enquiryId: null,
  });

  // Pre-fill if coming from enquiry
  useEffect(() => {
    if (location.state) {
      const state = location.state;
      const parts = (state.studentName || '').split(' ');
      setFormData((prev) => ({
        ...prev,
        firstName: parts[0] || '',
        lastName: parts.slice(1).join(' ') || '',
        classId: state.classId || '',
        fatherName: state.guardianName || '',
        fatherMobile: state.mobile || '',
        fatherEmail: state.email || '',
        enquiryId: state.enquiryId || null,
      }));
    }
  }, [location.state]);

  useEffect(() => {
    const loadMasters = async () => {
      try {
        setLoading(true);
        const [cRes, catRes, relRes] = await Promise.all([
          classApi.getClasses(),
          simpleMasterApi.getMasters(1), // Categories
          simpleMasterApi.getMasters(2), // Religions
        ]);
        if (cRes.data.success) {
          setClasses(cRes.data.data || []);
          if (!formData.classId && cRes.data.data?.length > 0) {
            setFormData((prev) => ({ ...prev, classId: cRes.data.data[0].id }));
          }
        }
        if (catRes.data.success) setCategories(catRes.data.data || []);
        if (relRes.data.success) setReligions(relRes.data.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadMasters();
  }, []);

  // Set default section when class changes
  const selectedClassObj = classes.find((c) => c.id === Number(formData.classId));
  useEffect(() => {
    if (selectedClassObj && selectedClassObj.sections?.length > 0) {
      setFormData((prev) => ({ ...prev, sectionId: selectedClassObj.sections[0].id }));
    }
  }, [formData.classId, classes]);

  // BR-3.5: Age check warning against 31st March cutoff
  useEffect(() => {
    if (formData.dateOfBirth) {
      const dob = dayjs(formData.dateOfBirth);
      const cutOff = dayjs('2026-03-31');
      const ageYears = cutOff.diff(dob, 'year', true);

      if (ageYears < 3) {
        setAgeWarning(`Notice: Student will be ${ageYears.toFixed(1)} years old as of 31-March-2026. Minimum age for Nursery is typically 3 years.`);
      } else {
        setAgeWarning('');
      }
    }
  }, [formData.dateOfBirth]);

  // FR-3.4: Check siblings when father/guardian mobile changes
  const handleMobileBlur = async () => {
    const mobile = formData.fatherMobile.trim();
    if (mobile.length >= 10) {
      try {
        setCheckingSiblings(true);
        const res = await studentApi.checkSiblings(mobile);
        if (res.data.success && res.data.data?.length > 0) {
          setDetectedSiblings(res.data.data);
        } else {
          setDetectedSiblings([]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setCheckingSiblings(false);
      }
    }
  };

  // Search siblings by name, admission no, or guardian mobile
  const handleSearchSibling = async (term) => {
    setSiblingSearchTerm(term);
    if (!term || term.trim().length < 2) {
      setSiblingSearchResults([]);
      return;
    }
    try {
      setIsSearchingSibling(true);
      const res = await studentApi.checkSiblings('', term.trim());
      if (res.data?.success && res.data.data?.length > 0) {
        setSiblingSearchResults(res.data.data);
      } else {
        // Fallback to getStudents
        const fallbackRes = await studentApi.getStudents({ search: term.trim(), pageSize: 10 });
        const items = fallbackRes.data?.data?.items || [];
        setSiblingSearchResults(items.map((s) => ({
          studentId: s.id,
          admissionNo: s.admissionNo,
          fullName: s.fullName,
          className: s.className,
          sectionName: s.sectionName,
          guardianName: s.guardianName,
          guardianMobile: s.guardianMobile,
          photoUrl: s.photoUrl,
        })));
      }
    } catch (err) {
      console.error('Error searching siblings:', err);
      try {
        const fallbackRes = await studentApi.getStudents({ search: term.trim(), pageSize: 10 });
        const items = fallbackRes.data?.data?.items || [];
        setSiblingSearchResults(items.map((s) => ({
          studentId: s.id,
          admissionNo: s.admissionNo,
          fullName: s.fullName,
          className: s.className,
          sectionName: s.sectionName,
          guardianName: s.guardianName,
          guardianMobile: s.guardianMobile,
          photoUrl: s.photoUrl,
        })));
      } catch (fallbackErr) {
        console.error(fallbackErr);
      }
    } finally {
      setIsSearchingSibling(false);
    }
  };

  // Attach sibling and auto-populate all parent & family information
  const handleAttachSibling = async (siblingItem) => {
    try {
      setLoading(true);
      const targetId = siblingItem.studentId || siblingItem.id;
      const res = await studentApi.getStudentDetail(targetId);
      if (res.data?.success) {
        const detail = res.data.data;
        const father = detail.guardians?.find((g) => g.relation?.toLowerCase() === 'father');
        const mother = detail.guardians?.find((g) => g.relation?.toLowerCase() === 'mother');
        const primary = detail.guardians?.find((g) => g.isPrimary) || detail.guardians?.[0];

        const fatherDoc = detail.documents?.find((d) => d.title?.toLowerCase().includes('father'));
        const motherDoc = detail.documents?.find((d) => d.title?.toLowerCase().includes('mother'));
        const guardianDoc = detail.documents?.find((d) => d.title?.toLowerCase().includes('guardian'));

        const fatherName = father?.name || (primary?.relation?.toLowerCase() === 'father' ? primary.name : '') || primary?.name || '';
        const fatherMobile = father?.mobile || primary?.mobile || '';
        const fatherEmail = father?.email || primary?.email || '';
        const fatherOccupation = father?.occupation || primary?.occupation || '';

        const motherName = mother?.name || '';
        const motherMobile = mother?.mobile || fatherMobile;
        const motherOccupation = mother?.occupation || '';

        setAttachedSibling({
          id: detail.id,
          admissionNo: detail.admissionNo,
          fullName: detail.fullName,
          className: detail.currentEnrollment?.className || siblingItem.className || '',
          sectionName: detail.currentEnrollment?.sectionName || siblingItem.sectionName || '',
          fatherName,
          motherName,
          guardianMobile: fatherMobile,
          photoUrl: detail.photoUrl,
        });

        setFormData((prev) => ({
          ...prev,
          siblingStudentId: detail.id,
          // Parent Info
          fatherName,
          fatherMobile,
          fatherEmail,
          fatherOccupation,
          motherName,
          motherMobile,
          motherOccupation,
          fatherPhotoUrl: fatherDoc?.filePath || prev.fatherPhotoUrl,
          motherPhotoUrl: motherDoc?.filePath || prev.motherPhotoUrl,
          guardianPhotoUrl: guardianDoc?.filePath || prev.guardianPhotoUrl,
          // Address & Family Details
          address: detail.address || prev.address,
          city: detail.city || prev.city,
          state: detail.state || prev.state,
          pincode: detail.pincode || prev.pincode,
          emergencyContact: detail.emergencyContact || fatherMobile || prev.emergencyContact,
          categoryId: detail.categoryId || prev.categoryId,
          religionId: detail.religionId || prev.religionId,
        }));

        setDetectedSiblings([{
          studentId: detail.id,
          admissionNo: detail.admissionNo,
          fullName: detail.fullName,
          className: detail.currentEnrollment?.className || siblingItem.className || '',
          sectionName: detail.currentEnrollment?.sectionName || siblingItem.sectionName || '',
          guardianName: fatherName,
          guardianMobile: fatherMobile,
        }]);

        setIsSiblingDialogOpen(false);
        setIsLockParentInfo(true);
        showSnackbar(`Sibling (${detail.fullName} - ${detail.admissionNo}) linked! Parent details have been auto-attached.`, 'success');
      }
    } catch (err) {
      console.error('Failed to attach sibling detail:', err);
      showSnackbar('Failed to fetch sibling parent details.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Detach sibling link
  const handleDetachSibling = () => {
    setAttachedSibling(null);
    setFormData((prev) => ({
      ...prev,
      siblingStudentId: null,
    }));
    setDetectedSiblings([]);
    setIsLockParentInfo(false);
    showSnackbar('Sibling link removed.', 'info');
  };

  const validateEssential = () => {
    if (!formData.firstName.trim()) {
      showSnackbar('Student First Name is required', 'warning');
      return false;
    }
    if (!formData.dateOfBirth) {
      showSnackbar('Date of Birth is required', 'warning');
      return false;
    }
    if (!formData.classId || !formData.sectionId) {
      showSnackbar('Class and Section are required', 'warning');
      return false;
    }
    if (!formData.fatherName.trim() || !formData.fatherMobile.trim()) {
      showSnackbar('Father / Primary Guardian Name and Mobile are required', 'warning');
      return false;
    }
    if (formData.fatherMobile.trim().length < 10) {
      showSnackbar('Primary Mobile Number must be at least 10 digits', 'warning');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (activeStep === 0) {
      if (!validateEssential()) return;
    }
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleDirectSave = async () => {
    if (!validateEssential()) return;
    await handleSubmitAdmission();
  };

  const handleSubmitAdmission = async () => {
    try {
      setSubmitting(true);

      const guardians = [];
      if (formData.fatherName.trim()) {
        guardians.push({
          relation: 'Father',
          name: formData.fatherName.trim().toUpperCase(),
          mobile: formData.fatherMobile.trim(),
          email: formData.fatherEmail?.trim() || null,
          occupation: formData.fatherOccupation || null,
          isPrimary: true,
        });
      }
      if (formData.motherName.trim()) {
        guardians.push({
          relation: 'Mother',
          name: formData.motherName.trim().toUpperCase(),
          mobile: formData.motherMobile?.trim() || formData.fatherMobile.trim(),
          occupation: formData.motherOccupation || null,
          isPrimary: false,
        });
      }

      const payload = {
        firstName: formData.firstName.trim().toUpperCase(),
        lastName: formData.lastName.trim().toUpperCase(),
        dateOfBirth: new Date(formData.dateOfBirth).toISOString(),
        gender: formData.gender,
        categoryId: formData.categoryId ? Number(formData.categoryId) : null,
        religionId: formData.religionId ? Number(formData.religionId) : null,
        bloodGroup: formData.bloodGroup,
        aadhaarNo: formData.aadhaarNo || null,
        photoUrl: formData.photoUrl || null,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        emergencyContact: formData.emergencyContact || formData.fatherMobile,
        classId: Number(formData.classId),
        sectionId: Number(formData.sectionId),
        rollNo: formData.rollNo ? Number(formData.rollNo) : null,
        guardians,
        enquiryId: formData.enquiryId,
        siblingStudentId: formData.siblingStudentId ? Number(formData.siblingStudentId) : null,
      };

      const res = await studentApi.admitStudent(payload);
      if (res.data.success) {
        showSnackbar(res.data.message || 'Student admitted successfully!', 'success');
        const admData = res.data.data || {};
        const newStudentId = admData.id;

        // Persist Father, Mother, Guardian photos into student document records
        if (newStudentId) {
          if (formData.fatherPhotoUrl) {
            studentApi.addDocument(newStudentId, { title: 'Father Photo', filePath: formData.fatherPhotoUrl }).catch(() => {});
          }
          if (formData.motherPhotoUrl) {
            studentApi.addDocument(newStudentId, { title: 'Mother Photo', filePath: formData.motherPhotoUrl }).catch(() => {});
          }
          if (formData.guardianPhotoUrl) {
            studentApi.addDocument(newStudentId, { title: 'Guardian Photo', filePath: formData.guardianPhotoUrl }).catch(() => {});
          }
        }

        const siblingList = attachedSibling
          ? [{
              studentId: attachedSibling.id,
              admissionNo: attachedSibling.admissionNo,
              fullName: attachedSibling.fullName,
              className: attachedSibling.className,
              sectionName: attachedSibling.sectionName,
            }, ...detectedSiblings.filter((s) => (s.studentId || s.id) !== attachedSibling.id)]
          : detectedSiblings;

        setAdmittedStudent({
          ...admData,
          ...payload,
          photoUrl: formData.photoUrl,
          fatherPhotoUrl: formData.fatherPhotoUrl,
          motherPhotoUrl: formData.motherPhotoUrl,
          guardianPhotoUrl: formData.guardianPhotoUrl,
          fullName: `${payload.firstName} ${payload.lastName}`.trim(),
          className: selectedClassObj?.name || '',
          sectionName: selectedSectionObj?.name || '',
          dateOfBirth: payload.dateOfBirth,
          admissionDate: new Date().toISOString(),
          siblings: siblingList,
        });
        setShowReportModal(true);
      }
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Admission failed. Please check inputs.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setShowReportModal(false);
    setAdmittedStudent(null);
    setActiveStep(0);
    setAttachedSibling(null);
    setIsLockParentInfo(true);
    setDetectedSiblings([]);
    setFormData({
      firstName: '',
      lastName: '',
      dateOfBirth: '2020-05-15',
      gender: 'Male',
      categoryId: '',
      religionId: '',
      bloodGroup: 'B+',
      aadhaarNo: '',
      photoUrl: '',
      fatherPhotoUrl: '',
      motherPhotoUrl: '',
      guardianPhotoUrl: '',
      address: '',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110001',
      emergencyContact: '',
      fatherName: '',
      fatherMobile: '',
      fatherEmail: '',
      fatherOccupation: '',
      motherName: '',
      motherMobile: '',
      motherOccupation: '',
      classId: classes[0]?.id || '',
      sectionId: '',
      rollNo: '',
      enquiryId: null,
      siblingStudentId: null,
    });
  };

  const selectedSectionObj = selectedClassObj?.sections?.find((s) => s.id === Number(formData.sectionId));

  return (
    <Box sx={{ maxWidth: '100%' }}>
      {/* Sleek Top Bar: Title + Compact Ribbon Stepper */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1,
          mb: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#1e293b', m: 0 }}>
            New Student Admission
          </Typography>
          <Chip
            size="small"
            label="FR-3.3"
            sx={{ height: 20, fontSize: '10px', fontWeight: 700, bgcolor: '#f1f5f9', color: '#475569' }}
          />
        </Box>

        {/* Compact Ribbon Stepper */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
          {steps.map((label, idx) => {
            const isActive = activeStep === idx;
            const isCompleted = activeStep > idx;
            return (
              <React.Fragment key={label}>
                {idx > 0 && (
                  <Box
                    sx={{
                      width: 14,
                      height: 2,
                      bgcolor: isCompleted ? 'var(--primary-color, #1976d2)' : '#e2e8f0',
                      display: { xs: 'none', sm: 'block' },
                    }}
                  />
                )}
                <Box
                  onClick={() => {
                    if (isCompleted) setActiveStep(idx);
                  }}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    px: 1.2,
                    py: 0.35,
                    borderRadius: '16px',
                    fontSize: '11px',
                    fontWeight: isActive ? 700 : 500,
                    cursor: isCompleted ? 'pointer' : 'default',
                    bgcolor: isActive
                      ? 'var(--primary-color, #1976d2)'
                      : isCompleted
                      ? '#e0f2fe'
                      : '#f8fafc',
                    color: isActive
                      ? '#fff'
                      : isCompleted
                      ? '#0369a1'
                      : '#64748b',
                    border: isActive
                      ? 'none'
                      : isCompleted
                      ? '1px solid #bae6fd'
                      : '1px solid #e2e8f0',
                    transition: 'all 0.15s ease',
                    '&:hover': isCompleted ? { bgcolor: '#bae6fd' } : {},
                  }}
                >
                  <Box
                    sx={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      fontWeight: 700,
                      bgcolor: isActive ? '#fff' : isCompleted ? '#0284c7' : '#e2e8f0',
                      color: isActive ? 'var(--primary-color, #1976d2)' : isCompleted ? '#fff' : '#64748b',
                    }}
                  >
                    {isCompleted ? '✓' : idx + 1}
                  </Box>
                  <span>{label}</span>
                </Box>
              </React.Fragment>
            );
          })}
        </Box>
      </Box>

      {/* Main Form Paper */}
      <Paper sx={{ p: { xs: 1.5, sm: 2 }, mb: 2, borderRadius: 2, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        {/* Sibling Link Compact Bar */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 1.5,
            py: 0.5,
            mb: 1.5,
            borderRadius: 1,
            border: attachedSibling ? '1px solid #86efac' : '1px dashed #93c5fd',
            bgcolor: attachedSibling ? '#f0fdf4' : '#f0f7ff',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LinkIcon sx={{ fontSize: 16, color: attachedSibling ? '#16a34a' : '#2563eb' }} />
            <Typography sx={{ fontSize: '11px', color: attachedSibling ? '#166534' : '#1e3a8a' }}>
              {attachedSibling ? (
                <>
                  <strong>Sibling Attached:</strong> {attachedSibling.fullName} (Adm: <strong>{attachedSibling.admissionNo}</strong> &bull; Class {attachedSibling.className}-{attachedSibling.sectionName}) &mdash; Parent details auto-linked.
                </>
              ) : (
                'Has a sibling already studying in this school? Attach them to auto-fill parent info.'
              )}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {attachedSibling ? (
              <>
                <Button
                  size="small"
                  variant="outlined"
                  color="primary"
                  onClick={() => {
                    setSiblingSearchTerm('');
                    setSiblingSearchResults([]);
                    setIsSiblingDialogOpen(true);
                  }}
                  sx={{ fontSize: '10px', py: 0.2, px: 0.8, minHeight: '22px', textTransform: 'none' }}
                >
                  Change
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  onClick={handleDetachSibling}
                  sx={{ fontSize: '10px', py: 0.2, px: 0.8, minHeight: '22px', textTransform: 'none' }}
                >
                  Remove
                </Button>
              </>
            ) : (
              <Button
                size="small"
                variant="contained"
                color="primary"
                startIcon={<SearchIcon sx={{ fontSize: '13px !important' }} />}
                onClick={() => {
                  setSiblingSearchTerm('');
                  setSiblingSearchResults([]);
                  setIsSiblingDialogOpen(true);
                }}
                sx={{
                  fontSize: '11px',
                  py: 0.25,
                  px: 1,
                  minHeight: '24px',
                  textTransform: 'none',
                  fontWeight: 600,
                  boxShadow: 'none',
                }}
              >
                Search & Attach Sibling
              </Button>
            )}
          </Box>
        </Box>

        {/* Step 0: Essential Details (Required) */}
        {activeStep === 0 && (
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: 'flex-start' }}>
            {/* Left Column: Student Photo + Family Photos Button */}
            <Box sx={{ width: { xs: '100%', md: 105 }, display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <PhotoCaptureUpload
                label="Student Photo"
                value={formData.photoUrl}
                onChange={(url) => setFormData((prev) => ({ ...prev, photoUrl: url }))}
              />
              <Button
                size="small"
                variant="outlined"
                color="inherit"
                onClick={() => setShowFamilyPhotosDialog(true)}
                sx={{
                  fontSize: '10px',
                  py: 0.2,
                  px: 0.5,
                  mt: 0.8,
                  width: '100%',
                  minHeight: '24px',
                  textTransform: 'none',
                  borderColor: '#cbd5e1',
                  color: '#475569',
                }}
              >
                Family Photos
              </Button>
            </Box>

            {/* Right Column: Required Fields Grouped */}
            <Box sx={{ flex: 1, width: '100%' }}>
              {ageWarning && (
                <Alert severity="warning" sx={{ mb: 1, py: 0.2, px: 1, fontSize: '11px', '& .MuiAlert-icon': { fontSize: '16px', mr: 0.5, my: 0 } }}>
                  {ageWarning}
                </Alert>
              )}

              {/* 1. Student Identity */}
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'var(--primary-color, #1976d2)', mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <StudentIcon sx={{ fontSize: 14 }} /> 1. STUDENT IDENTITY (MANDATORY)
              </Typography>
              <Grid container spacing={1} sx={{ mb: 1.5 }}>
                <Grid item xs={12} sm={4}>
                  <AppInput
                    required
                    label="First Name"
                    placeholder="Student first name"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value.toUpperCase() })}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <AppInput
                    label="Last Name"
                    placeholder="Surname"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value.toUpperCase() })}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <AppDatePicker
                    required
                    label="Date of Birth"
                    value={formData.dateOfBirth}
                    onChange={(e) => {
                      if (e.value) {
                        setFormData({ ...formData, dateOfBirth: dayjs(e.value).format('YYYY-MM-DD') });
                      }
                    }}
                    dateFormat="dd/M/yy"
                  />
                </Grid>
                <Grid item xs={12} sm={2}>
                  <AppSelect
                    required
                    label="Gender"
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    options={['Male', 'Female', 'Other']}
                  />
                </Grid>
              </Grid>

              {/* 2. Class & Allotment */}
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'var(--primary-color, #1976d2)', mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <ClassIcon sx={{ fontSize: 14 }} /> 2. CLASS ALLOTMENT (MANDATORY)
              </Typography>
              <Grid container spacing={1} sx={{ mb: 1.5 }}>
                <Grid item xs={12} sm={5}>
                  <AppSelect
                    required
                    label="Class / Grade"
                    value={formData.classId}
                    onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                    options={classes}
                    optionLabel="name"
                    optionValue="id"
                    placeholder="Select Class"
                  />
                </Grid>
                <Grid item xs={12} sm={5}>
                  <AppSelect
                    required
                    label="Section"
                    value={formData.sectionId}
                    onChange={(e) => setFormData({ ...formData, sectionId: e.target.value })}
                    options={(selectedClassObj?.sections || []).map((s) => ({
                      id: s.id,
                      label: `Section ${s.name} (Capacity: ${s.capacity})`,
                    }))}
                    optionLabel="label"
                    optionValue="id"
                    placeholder="Select Section"
                  />
                </Grid>
                <Grid item xs={12} sm={2}>
                  <AppInput
                    type="number"
                    label="Roll No"
                    placeholder="Optional"
                    value={formData.rollNo}
                    onChange={(e) => setFormData({ ...formData, rollNo: e.target.value })}
                  />
                </Grid>
              </Grid>

              {/* 3. Primary Parent / Guardian Contact */}
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'var(--primary-color, #1976d2)', mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <ParentIcon sx={{ fontSize: 14 }} /> 3. PARENT / GUARDIAN CONTACT (MANDATORY)
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={12} sm={4}>
                  <AppInput
                    required
                    label="Father / Guardian Full Name"
                    placeholder="Primary contact name"
                    value={formData.fatherName}
                    onChange={(e) => setFormData({ ...formData, fatherName: e.target.value.toUpperCase() })}
                    disabled={isLockParentInfo && Boolean(attachedSibling)}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <AppInput
                    required
                    label="Primary Mobile No"
                    placeholder="10-digit mobile"
                    maxLength={10}
                    value={formData.fatherMobile}
                    onChange={(e) => setFormData({ ...formData, fatherMobile: e.target.value })}
                    onBlur={handleMobileBlur}
                    disabled={isLockParentInfo && Boolean(attachedSibling)}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <AppInput
                    label="Mother Full Name"
                    placeholder="Mother's name (optional)"
                    value={formData.motherName}
                    onChange={(e) => setFormData({ ...formData, motherName: e.target.value.toUpperCase() })}
                    disabled={isLockParentInfo && Boolean(attachedSibling)}
                  />
                </Grid>
              </Grid>
            </Box>
          </Box>
        )}

        {/* Step 1: Personal & Address Information (Optional) */}
        {activeStep === 1 && (
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'var(--primary-color, #1976d2)', mb: 0.8, display: 'block' }}>
              PERSONAL IDENTIFICATION & DEMOGRAPHICS (OPTIONAL)
            </Typography>
            <Grid container spacing={1} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={3}>
                <AppInput
                  label="Aadhaar Card No"
                  placeholder="12-digit UID"
                  maxLength={12}
                  value={formData.aadhaarNo}
                  onChange={(e) => setFormData({ ...formData, aadhaarNo: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <AppSelect
                  label="Blood Group"
                  value={formData.bloodGroup}
                  onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                  options={['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']}
                  placeholder="Select Blood Group"
                  showClear
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <AppSelect
                  label="Category"
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  options={categories}
                  optionLabel="name"
                  optionValue="id"
                  placeholder="Select Category"
                  showClear
                  addon="H"
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <AppSelect
                  label="Religion"
                  value={formData.religionId}
                  onChange={(e) => setFormData({ ...formData, religionId: e.target.value })}
                  options={religions}
                  optionLabel="name"
                  optionValue="id"
                  placeholder="Select Religion"
                  showClear
                  addon="H"
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 1.5 }} />

            <Typography variant="caption" sx={{ fontWeight: 700, color: 'var(--primary-color, #1976d2)', mb: 0.8, display: 'block' }}>
              RESIDENTIAL ADDRESS & EMERGENCY CONTACT
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={12} sm={6}>
                <AppInput
                  label="Residential Address"
                  placeholder="Street / House / Landmark"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <AppInput
                  label="City"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <AppInput
                  label="State"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <AppInput
                  label="Pincode"
                  placeholder="6-digit PIN"
                  maxLength={6}
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <AppInput
                  label="Emergency Contact Number"
                  placeholder="10-digit mobile"
                  maxLength={10}
                  value={formData.emergencyContact}
                  onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                />
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Step 2: Parents & Family Profile (Optional) */}
        {activeStep === 2 && (
          <Box>
            {/* Sibling Attached Parent Info Banner */}
            {attachedSibling ? (
              <Alert
                severity="success"
                icon={<LinkIcon sx={{ fontSize: 18 }} />}
                action={
                  <Button
                    size="small"
                    color="inherit"
                    startIcon={isLockParentInfo ? <LockOpenIcon sx={{ fontSize: 14 }} /> : <LockIcon sx={{ fontSize: 14 }} />}
                    onClick={() => setIsLockParentInfo(!isLockParentInfo)}
                    sx={{ textTransform: 'none', fontWeight: 600, fontSize: '10px', py: 0.2, px: 0.8, bgcolor: '#fff', border: '1px solid #cbd5e1' }}
                  >
                    {isLockParentInfo ? 'Unlock to Edit' : 'Lock Parent Info'}
                  </Button>
                }
                sx={{ mb: 1.5, py: 0.3, px: 1.2, fontSize: '11px', '& .MuiAlert-icon': { mr: 1, my: 0 } }}
              >
                Parent Information Attached from Sibling (<strong>{attachedSibling.fullName}</strong> - {attachedSibling.admissionNo})
              </Alert>
            ) : (
              detectedSiblings.length > 0 && (
                <Alert
                  severity="info"
                  icon={<SiblingIcon sx={{ fontSize: 18 }} />}
                  action={
                    <Button
                      size="small"
                      variant="contained"
                      color="primary"
                      startIcon={<LinkIcon sx={{ fontSize: 14 }} />}
                      onClick={() => handleAttachSibling(detectedSiblings[0])}
                      sx={{ textTransform: 'none', fontWeight: 600, fontSize: '10px', py: 0.2, px: 1 }}
                    >
                      Attach Sibling
                    </Button>
                  }
                  sx={{ mb: 1.5, py: 0.3, px: 1.2, fontSize: '11px', '& .MuiAlert-icon': { mr: 1, my: 0 } }}
                >
                  Sibling(s) detected via mobile: <strong>{detectedSiblings.map((s) => `${s.fullName} (${s.admissionNo})`).join(', ')}</strong>.
                </Alert>
              )
            )}

            {/* Father Section */}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: 'flex-start', mb: 1.5 }}>
              <Box sx={{ width: { xs: '100%', md: 100 }, display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <PhotoCaptureUpload
                  label="Father Photo"
                  value={formData.fatherPhotoUrl}
                  onChange={(url) => setFormData((prev) => ({ ...prev, fatherPhotoUrl: url }))}
                />
              </Box>
              <Box sx={{ flex: 1, width: '100%' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'var(--primary-color, #1976d2)', mb: 0.5, display: 'block' }}>
                  FATHER ADDITIONAL DETAILS
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={12} sm={4}>
                    <AppInput
                      label="Father Full Name"
                      value={formData.fatherName}
                      onChange={(e) => setFormData({ ...formData, fatherName: e.target.value.toUpperCase() })}
                      disabled={isLockParentInfo && Boolean(attachedSibling)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <AppInput
                      label="Primary Mobile No"
                      placeholder="10-digit mobile"
                      maxLength={10}
                      value={formData.fatherMobile}
                      onChange={(e) => setFormData({ ...formData, fatherMobile: e.target.value })}
                      disabled={isLockParentInfo && Boolean(attachedSibling)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <AppInput
                      label="Email Address"
                      value={formData.fatherEmail}
                      onChange={(e) => setFormData({ ...formData, fatherEmail: e.target.value })}
                      disabled={isLockParentInfo && Boolean(attachedSibling)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <AppInput
                      label="Occupation"
                      value={formData.fatherOccupation}
                      onChange={(e) => setFormData({ ...formData, fatherOccupation: e.target.value })}
                      disabled={isLockParentInfo && Boolean(attachedSibling)}
                    />
                  </Grid>
                </Grid>
              </Box>
            </Box>

            <Divider sx={{ my: 1.5 }} />

            {/* Mother Section */}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: 'flex-start' }}>
              <Box sx={{ width: { xs: '100%', md: 100 }, display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <PhotoCaptureUpload
                  label="Mother Photo"
                  value={formData.motherPhotoUrl}
                  onChange={(url) => setFormData((prev) => ({ ...prev, motherPhotoUrl: url }))}
                />
              </Box>
              <Box sx={{ flex: 1, width: '100%' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'var(--primary-color, #1976d2)', mb: 0.5, display: 'block' }}>
                  MOTHER ADDITIONAL DETAILS
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={12} sm={4}>
                    <AppInput
                      label="Mother Full Name"
                      value={formData.motherName}
                      onChange={(e) => setFormData({ ...formData, motherName: e.target.value.toUpperCase() })}
                      disabled={isLockParentInfo && Boolean(attachedSibling)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <AppInput
                      label="Mother Mobile No"
                      placeholder="10-digit mobile"
                      maxLength={10}
                      value={formData.motherMobile}
                      onChange={(e) => setFormData({ ...formData, motherMobile: e.target.value })}
                      disabled={isLockParentInfo && Boolean(attachedSibling)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <AppInput
                      label="Mother Occupation"
                      value={formData.motherOccupation}
                      onChange={(e) => setFormData({ ...formData, motherOccupation: e.target.value })}
                      disabled={isLockParentInfo && Boolean(attachedSibling)}
                    />
                  </Grid>
                </Grid>
              </Box>
            </Box>
          </Box>
        )}

        {/* Step 3: Review & Submit (Comprehensive View of All Fields & Photographs) */}
        {activeStep === 3 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Top Summary Header Banner */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: '#f0f9ff',
                border: '1px solid #bae6fd',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar
                  src={formData.photoUrl}
                  sx={{
                    width: 56,
                    height: 56,
                    bgcolor: 'var(--primary-color, #1976d2)',
                    fontWeight: 800,
                    fontSize: '1.4rem',
                    border: '2px solid #fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                  }}
                >
                  {formData.firstName ? formData.firstName.charAt(0).toUpperCase() : 'S'}
                </Avatar>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', fontSize: '1.2rem', lineHeight: 1.2 }}>
                      {formData.firstName} {formData.lastName}
                    </Typography>
                    <Chip
                      size="small"
                      label={formData.gender || 'Not specified'}
                      color={formData.gender === 'Female' ? 'secondary' : 'primary'}
                      sx={{ height: 22, fontSize: '11px', fontWeight: 700 }}
                    />
                    <Chip
                      size="small"
                      label={`DOB: ${formData.dateOfBirth ? dayjs(formData.dateOfBirth).format('DD MMM YYYY') : '—'}`}
                      sx={{ height: 22, fontSize: '11px', fontWeight: 600, bgcolor: '#e0f2fe', color: '#0369a1' }}
                    />
                  </Box>
                  <Typography variant="body2" sx={{ color: '#475569', mt: 0.5, fontSize: '12px' }}>
                    Applying for: <strong>{selectedClassObj?.name || 'Class —'} &bull; Section {selectedSectionObj?.name || '—'}</strong>
                    {formData.rollNo && <> &bull; Roll No: <strong>{formData.rollNo}</strong></>}
                  </Typography>
                </Box>
              </Box>

              <Button
                size="small"
                variant="outlined"
                startIcon={<EditIcon sx={{ fontSize: 14 }} />}
                onClick={() => setActiveStep(0)}
                sx={{ textTransform: 'none', fontSize: '12px', fontWeight: 600, bgcolor: '#fff' }}
              >
                Edit Details
              </Button>
            </Paper>

            {/* 1. Photographs Section (All 4 Images) */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 2,
                border: '1px solid #e2e8f0',
                bgcolor: '#ffffff',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PhotoIcon sx={{ color: 'var(--primary-color, #1976d2)', fontSize: 20 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                    Photographs & Identity Images
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="outlined"
                  color="primary"
                  startIcon={<PhotoIcon sx={{ fontSize: 14 }} />}
                  onClick={() => setShowFamilyPhotosDialog(true)}
                  sx={{ textTransform: 'none', fontSize: '11px', py: 0.25, px: 1, minHeight: '24px' }}
                >
                  Manage / Upload Photos
                </Button>
              </Box>

              <Grid container spacing={2}>
                {/* Student Photo */}
                <Grid item xs={6} sm={3}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      height: '100%',
                    }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#334155', mb: 1 }}>
                      Student Photo
                    </Typography>
                    {formData.photoUrl ? (
                      <Box
                        component="img"
                        src={formData.photoUrl}
                        alt="Student"
                        sx={{
                          width: 88,
                          height: 104,
                          objectFit: 'cover',
                          borderRadius: 1.5,
                          border: '2px solid #3b82f6',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: 88,
                          height: 104,
                          borderRadius: 1.5,
                          border: '1px dashed #cbd5e1',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: '#fff',
                        }}
                      >
                        <StudentIcon sx={{ fontSize: 32, color: '#94a3b8' }} />
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px', mt: 0.5 }}>
                          No Photo
                        </Typography>
                      </Box>
                    )}
                    <Chip
                      size="small"
                      label={formData.photoUrl ? 'Uploaded' : 'Pending'}
                      color={formData.photoUrl ? 'success' : 'default'}
                      sx={{ height: 18, fontSize: '9px', fontWeight: 700, mt: 1 }}
                    />
                  </Box>
                </Grid>

                {/* Father Photo */}
                <Grid item xs={6} sm={3}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      height: '100%',
                    }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#334155', mb: 1 }}>
                      Father Photo
                    </Typography>
                    {formData.fatherPhotoUrl ? (
                      <Box
                        component="img"
                        src={formData.fatherPhotoUrl}
                        alt="Father"
                        sx={{
                          width: 88,
                          height: 104,
                          objectFit: 'cover',
                          borderRadius: 1.5,
                          border: '2px solid #10b981',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: 88,
                          height: 104,
                          borderRadius: 1.5,
                          border: '1px dashed #cbd5e1',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: '#fff',
                        }}
                      >
                        <ParentIcon sx={{ fontSize: 32, color: '#94a3b8' }} />
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px', mt: 0.5 }}>
                          No Photo
                        </Typography>
                      </Box>
                    )}
                    <Chip
                      size="small"
                      label={formData.fatherPhotoUrl ? 'Uploaded' : 'Pending'}
                      color={formData.fatherPhotoUrl ? 'success' : 'default'}
                      sx={{ height: 18, fontSize: '9px', fontWeight: 700, mt: 1 }}
                    />
                  </Box>
                </Grid>

                {/* Mother Photo */}
                <Grid item xs={6} sm={3}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      height: '100%',
                    }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#334155', mb: 1 }}>
                      Mother Photo
                    </Typography>
                    {formData.motherPhotoUrl ? (
                      <Box
                        component="img"
                        src={formData.motherPhotoUrl}
                        alt="Mother"
                        sx={{
                          width: 88,
                          height: 104,
                          objectFit: 'cover',
                          borderRadius: 1.5,
                          border: '2px solid #ec4899',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: 88,
                          height: 104,
                          borderRadius: 1.5,
                          border: '1px dashed #cbd5e1',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: '#fff',
                        }}
                      >
                        <ParentIcon sx={{ fontSize: 32, color: '#94a3b8' }} />
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px', mt: 0.5 }}>
                          No Photo
                        </Typography>
                      </Box>
                    )}
                    <Chip
                      size="small"
                      label={formData.motherPhotoUrl ? 'Uploaded' : 'Pending'}
                      color={formData.motherPhotoUrl ? 'success' : 'default'}
                      sx={{ height: 18, fontSize: '9px', fontWeight: 700, mt: 1 }}
                    />
                  </Box>
                </Grid>

                {/* Guardian Photo */}
                <Grid item xs={6} sm={3}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      height: '100%',
                    }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#334155', mb: 1 }}>
                      Guardian Photo
                    </Typography>
                    {formData.guardianPhotoUrl ? (
                      <Box
                        component="img"
                        src={formData.guardianPhotoUrl}
                        alt="Guardian"
                        sx={{
                          width: 88,
                          height: 104,
                          objectFit: 'cover',
                          borderRadius: 1.5,
                          border: '2px solid #8b5cf6',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: 88,
                          height: 104,
                          borderRadius: 1.5,
                          border: '1px dashed #cbd5e1',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: '#fff',
                        }}
                      >
                        <FamilyIcon sx={{ fontSize: 32, color: '#94a3b8' }} />
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px', mt: 0.5 }}>
                          Optional
                        </Typography>
                      </Box>
                    )}
                    <Chip
                      size="small"
                      label={formData.guardianPhotoUrl ? 'Uploaded' : 'Optional'}
                      color={formData.guardianPhotoUrl ? 'success' : 'default'}
                      sx={{ height: 18, fontSize: '9px', fontWeight: 700, mt: 1 }}
                    />
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            {/* 2. Detailed Data Cards */}
            <Grid container spacing={2}>
              {/* Card 1: Student Profile Details */}
              <Grid item xs={12} md={6}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: '1px solid #e2e8f0',
                    bgcolor: '#ffffff',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, pb: 1, borderBottom: '1px solid #f1f5f9' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <StudentIcon color="primary" sx={{ fontSize: 20 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                        Student Personal & Demographic Details
                      </Typography>
                    </Box>
                    <IconButton size="small" onClick={() => setActiveStep(0)} color="primary">
                      <EditIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>

                  <Grid container spacing={1.5} sx={{ fontSize: '12px' }}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
                        First Name
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                        {formData.firstName || '—'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
                        Last Name
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                        {formData.lastName || '—'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
                        Date of Birth (Age)
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                        {formData.dateOfBirth ? `${dayjs(formData.dateOfBirth).format('DD MMM YYYY')} (${dayjs().diff(dayjs(formData.dateOfBirth), 'year')} yrs)` : '—'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
                        Gender
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                        {formData.gender || '—'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
                        Blood Group
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#dc2626' }}>
                        {formData.bloodGroup || '—'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
                        Category
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                        {categories.find((c) => c.id === Number(formData.categoryId))?.name || 'General / Unspecified'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
                        Religion
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                        {religions.find((r) => r.id === Number(formData.religionId))?.name || '—'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
                        Aadhaar Card No
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                        {formData.aadhaarNo || '—'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
                        Emergency Contact
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                        {formData.emergencyContact || formData.fatherMobile || '—'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
                        City, State & Pin
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                        {[formData.city, formData.state, formData.pincode].filter(Boolean).join(', ') || '—'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
                        Residential Address
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                        {formData.address || '—'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              {/* Card 2: Parents, Guardian & Sibling Details */}
              <Grid item xs={12} md={6}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: '1px solid #e2e8f0',
                    bgcolor: '#ffffff',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1, borderBottom: '1px solid #f1f5f9' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ParentIcon color="primary" sx={{ fontSize: 20 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                        Parents & Guardian Information
                      </Typography>
                    </Box>
                    <IconButton size="small" onClick={() => setActiveStep(1)} color="primary">
                      <EditIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>

                  {/* Father Info */}
                  <Box sx={{ p: 1.2, borderRadius: 1.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#0369a1', display: 'block', mb: 0.5 }}>
                      FATHER / PRIMARY GUARDIAN
                    </Typography>
                    <Grid container spacing={1} sx={{ fontSize: '12px' }}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Name</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{formData.fatherName || '—'}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Mobile</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{formData.fatherMobile || '—'}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Email</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{formData.fatherEmail || '—'}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Occupation</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{formData.fatherOccupation || '—'}</Typography>
                      </Grid>
                    </Grid>
                  </Box>

                  {/* Mother Info */}
                  <Box sx={{ p: 1.2, borderRadius: 1.5, bgcolor: '#fdf2f8', border: '1px solid #fbcfe8' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#be185d', display: 'block', mb: 0.5 }}>
                      MOTHER DETAILS
                    </Typography>
                    <Grid container spacing={1} sx={{ fontSize: '12px' }}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Name</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{formData.motherName || '—'}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Mobile</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{formData.motherMobile || formData.fatherMobile || '—'}</Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Occupation</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{formData.motherOccupation || '—'}</Typography>
                      </Grid>
                    </Grid>
                  </Box>

                  {/* Sibling Link */}
                  <Box sx={{ p: 1.2, borderRadius: 1.5, bgcolor: attachedSibling ? '#f0fdf4' : '#f8fafc', border: attachedSibling ? '1px solid #86efac' : '1px solid #e2e8f0' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SiblingIcon sx={{ fontSize: 18, color: attachedSibling ? '#16a34a' : '#64748b' }} />
                        <Typography variant="caption" sx={{ fontWeight: 700, color: attachedSibling ? '#166534' : '#475569' }}>
                          Sibling Link Status:
                        </Typography>
                      </Box>
                      {attachedSibling ? (
                        <Chip
                          size="small"
                          color="success"
                          label={`${attachedSibling.fullName} (${attachedSibling.admissionNo} • Class ${attachedSibling.className}-${attachedSibling.sectionName})`}
                          sx={{ height: 22, fontSize: '11px', fontWeight: 700 }}
                        />
                      ) : (
                        <Typography variant="caption" color="text.secondary">No Sibling Attached</Typography>
                      )}
                    </Box>
                  </Box>
                </Paper>
              </Grid>

              {/* Card 3: Class Allotment & Admission Summary */}
              <Grid item xs={12}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: '1px solid #e2e8f0',
                    bgcolor: '#ffffff',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, pb: 1, borderBottom: '1px solid #f1f5f9' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ClassIcon color="primary" sx={{ fontSize: 20 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                        Class Allotment & Academic Enrollment
                      </Typography>
                    </Box>
                    <IconButton size="small" onClick={() => setActiveStep(0)} color="primary">
                      <EditIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={3}>
                      <Box sx={{ p: 1.2, borderRadius: 1.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
                          Class / Grade
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 700, color: '#1e293b', mt: 0.2 }}>
                          {selectedClassObj?.name || 'Not Selected'}
                        </Typography>
                      </Box>
                    </Grid>

                    <Grid item xs={12} sm={3}>
                      <Box sx={{ p: 1.2, borderRadius: 1.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
                          Section
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 700, color: '#1e293b', mt: 0.2 }}>
                          {selectedSectionObj ? `Section ${selectedSectionObj.name}` : 'Not Selected'}
                        </Typography>
                      </Box>
                    </Grid>

                    <Grid item xs={12} sm={3}>
                      <Box sx={{ p: 1.2, borderRadius: 1.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
                          Roll Number
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 700, color: '#1e293b', mt: 0.2 }}>
                          {formData.rollNo || 'Auto-assigned'}
                        </Typography>
                      </Box>
                    </Grid>

                    <Grid item xs={12} sm={3}>
                      <Box sx={{ p: 1.2, borderRadius: 1.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
                          Section Capacity Limit
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 700, color: '#0369a1', mt: 0.2 }}>
                          {selectedSectionObj ? `${selectedSectionObj.capacity} Students Max` : '—'}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            </Grid>

            <Alert severity="success" sx={{ py: 0.8, px: 1.5, fontSize: '12px', '& .MuiAlert-icon': { fontSize: 20, mr: 1 } }}>
              All details and photographs verified! Upon clicking <strong>Confirm & Admit Student</strong>, the system will atomically create student, parent records, and documents, automatically assigning a unique Admission Number.
            </Alert>
          </Box>
        )}

        {/* Compact Navigation Bar */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, pt: 1, borderTop: '1px solid #e2e8f0' }}>
          <Button
            disabled={activeStep === 0 || submitting}
            onClick={handleBack}
            size="small"
            variant="outlined"
            color="inherit"
            sx={{ textTransform: 'none', fontSize: '12px', py: 0.3, px: 1.8, minHeight: '26px' }}
          >
            Back
          </Button>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Quick / Direct Save Button on earlier steps */}
            {activeStep < steps.length - 1 && (
              <Button
                variant="outlined"
                color="success"
                size="small"
                onClick={handleDirectSave}
                disabled={submitting}
                startIcon={submitting ? <CircularProgress size={14} color="inherit" /> : <SuccessIcon sx={{ fontSize: 16 }} />}
                sx={{
                  textTransform: 'none',
                  fontSize: '12px',
                  py: 0.3,
                  px: 1.8,
                  minHeight: '26px',
                  fontWeight: 700,
                  bgcolor: '#f0fdf4',
                  borderColor: '#86efac',
                  '&:hover': { bgcolor: '#dcfce7', borderColor: '#22c55e' }
                }}
              >
                {activeStep === 0 ? 'Quick Save & Admit' : 'Save & Admit Now'}
              </Button>
            )}

            {activeStep < steps.length - 1 ? (
              <Button
                variant="contained"
                size="small"
                onClick={handleNext}
                disabled={submitting}
                sx={{ textTransform: 'none', fontSize: '12px', py: 0.3, px: 2, minHeight: '26px', fontWeight: 600 }}
              >
                Continue &rarr;
              </Button>
            ) : (
              <Button
                variant="contained"
                color="success"
                size="small"
                onClick={handleSubmitAdmission}
                disabled={submitting}
                startIcon={submitting ? <CircularProgress size={14} color="inherit" /> : <SuccessIcon sx={{ fontSize: 16 }} />}
                sx={{ textTransform: 'none', fontSize: '12px', py: 0.3, px: 2, minHeight: '26px', fontWeight: 600 }}
              >
                Confirm & Admit Student
              </Button>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Family Photos Modal */}
      <Dialog
        open={showFamilyPhotosDialog}
        onClose={() => setShowFamilyPhotosDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ m: 0, p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '0.95rem' }}>
            Student & Family Photographs
          </Typography>
          <IconButton onClick={() => setShowFamilyPhotosDialog(false)} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 2 }}>
          <Grid container spacing={2} justifyContent="center">
            <Grid item xs={6} sm={3} sx={{ display: 'flex', justifyContent: 'center' }}>
              <PhotoCaptureUpload
                label="Student Photo"
                value={formData.photoUrl}
                onChange={(url) => setFormData((prev) => ({ ...prev, photoUrl: url }))}
              />
            </Grid>
            <Grid item xs={6} sm={3} sx={{ display: 'flex', justifyContent: 'center' }}>
              <PhotoCaptureUpload
                label="Father Photo"
                value={formData.fatherPhotoUrl}
                onChange={(url) => setFormData((prev) => ({ ...prev, fatherPhotoUrl: url }))}
              />
            </Grid>
            <Grid item xs={6} sm={3} sx={{ display: 'flex', justifyContent: 'center' }}>
              <PhotoCaptureUpload
                label="Mother Photo"
                value={formData.motherPhotoUrl}
                onChange={(url) => setFormData((prev) => ({ ...prev, motherPhotoUrl: url }))}
              />
            </Grid>
            <Grid item xs={6} sm={3} sx={{ display: 'flex', justifyContent: 'center' }}>
              <PhotoCaptureUpload
                label="Guardian Photo"
                value={formData.guardianPhotoUrl}
                onChange={(url) => setFormData((prev) => ({ ...prev, guardianPhotoUrl: url }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 1.5, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
          <Button onClick={() => setShowFamilyPhotosDialog(false)} size="small" variant="contained">
            Done
          </Button>
        </DialogActions>
      </Dialog>

      {/* Sibling Search & Attach Dialog */}
      <Dialog
        open={isSiblingDialogOpen}
        onClose={() => setIsSiblingDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LinkIcon color="primary" />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem', lineHeight: 1.2 }}>
                Search & Attach Sibling
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Search by Student Name, Admission Number, or Guardian Mobile Number
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={() => setIsSiblingDialogOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 2.5 }}>
          <Box sx={{ mb: 2.5, mt: 1 }}>
            <TextField
              fullWidth
              autoFocus
              variant="outlined"
              placeholder="Type student name, admission number, or parent mobile number (e.g. Rahul, ADM-2026-0001, 9876543210)..."
              value={siblingSearchTerm}
              onChange={(e) => handleSearchSibling(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />,
                endAdornment: isSearchingSibling ? (
                  <CircularProgress size={20} />
                ) : siblingSearchTerm ? (
                  <IconButton size="small" onClick={() => handleSearchSibling('')}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                ) : null,
              }}
            />
          </Box>

          {isSearchingSibling ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
              <CircularProgress size={36} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                Searching students database...
              </Typography>
            </Box>
          ) : siblingSearchResults.length > 0 ? (
            <Stack spacing={1.5} sx={{ maxHeight: 380, overflowY: 'auto', pr: 0.5 }}>
              {siblingSearchResults.map((sib) => (
                <Paper
                  key={sib.studentId || sib.id}
                  variant="outlined"
                  sx={{
                    p: 1.8,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 1.5,
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderColor: '#1976d2',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
                      bgcolor: '#f8fafc',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar
                      src={sib.photoUrl}
                      sx={{ width: 48, height: 48, bgcolor: '#e0e7ff', color: '#3730a3', fontWeight: 700 }}
                    >
                      {sib.fullName ? sib.fullName.charAt(0).toUpperCase() : 'S'}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.95rem' }}>
                        {sib.fullName}
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.3, flexWrap: 'wrap' }}>
                        <Chip
                          size="small"
                          label={`Adm: ${sib.admissionNo}`}
                          sx={{ height: 22, fontSize: '0.75rem', fontWeight: 600, bgcolor: '#e2e8f0' }}
                        />
                        <Chip
                          size="small"
                          color="primary"
                          variant="outlined"
                          label={`Class: ${sib.className || '—'} - ${sib.sectionName || '—'}`}
                          sx={{ height: 22, fontSize: '0.75rem' }}
                        />
                      </Stack>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        Guardian: <strong>{sib.guardianName || '—'}</strong> | Mobile: <strong>{sib.guardianMobile || '—'}</strong>
                      </Typography>
                    </Box>
                  </Box>

                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    startIcon={<LinkIcon />}
                    onClick={() => handleAttachSibling(sib)}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                      px: 2,
                      py: 0.75,
                      borderRadius: 1.5,
                    }}
                  >
                    Attach Parent Info
                  </Button>
                </Paper>
              ))}
            </Stack>
          ) : siblingSearchTerm.trim().length >= 2 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
                No students found matching "{siblingSearchTerm}".
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Please check admission number, student name, or 10-digit mobile number and try again.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4, bgcolor: '#f8fafc', borderRadius: 2, border: '1px dashed #cbd5e1' }}>
              <SearchIcon sx={{ fontSize: 40, color: '#94a3b8', mb: 1 }} />
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                Type at least 2 characters or a mobile number in the search bar above
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Type student name, admission number, or parent mobile number above to find existing sibling.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
          <Button onClick={() => setIsSiblingDialogOpen(false)} color="inherit">
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Admission Report / Slip Modal */}
      <AdmissionReportModal
        open={showReportModal}
        onClose={() => {
          setShowReportModal(false);
          navigate('/students');
        }}
        studentId={admittedStudent?.id}
        studentData={admittedStudent}
        isNewlyAdmitted={true}
        onAdmitAnother={handleResetForm}
        onNavigateDirectory={() => navigate('/students')}
      />
    </Box>
  );
};
