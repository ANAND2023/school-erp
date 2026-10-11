import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, Container, Grid, CardMedia, 
  Paper, AppBar, Toolbar, IconButton, TextField, 
  Snackbar, Alert, Chip, Drawer, List, ListItem, ListItemButton, ListItemText, Divider
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VerifiedIcon from '@mui/icons-material/Verified';
import PhoneInTalkIcon from '@mui/icons-material/PhoneInTalk';
import EmailIcon from '@mui/icons-material/Email';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import apiClient from '../../../api/client';

export const LandingPage = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeTab, setActiveTab] = useState('all');
  const [openFaq, setOpenFaq] = useState(null);
  const [formData, setFormData] = useState({ name: '', school: '', phone: '', email: '', message: '' });
  const [toastOpen, setToastOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Dynamic CMS Settings state
  const [cms, setCms] = useState({
    themeColor: '#0a387c', // Edumarshal Signature Deep Blue
    accentColor: '#ffb000', // Edumarshal Signature Shimmer Gold
    heroBadge: 'RATED 4.9/5 • TRUSTED BY 550+ INSTITUTES NATIONWIDE',
    heroTitle: 'School ERP Software & Complete Institutional Management System',
    heroSubtitle: 'One unified cloud platform running Admissions, Fee POS Counters, Biometric Attendance, Exam Marks Cards, GPS Transport, and Teacher & Parent Portals across all your campuses.',
    ctaPrimaryText: 'Book A Free 30-Min Demo',
    ctaSecondaryText: 'Explore 65+ Modules',
    sliderIntervalSeconds: 4,
    slides: [
      {
        badge: 'Executive Central Hub',
        title: 'Unified Institutional Dashboard & Multi-Branch Control',
        description: 'Single-click multi-campus oversight. Monitor real-time admissions, fee collection velocities, staff & student presence, pending dues, and academic milestones without switching spreadsheets.',
        image: '/images/erp_dashboard.jpg',
        stats: 'Real-Time Insights • 100% Automated'
      },
      {
        badge: 'Zero-Proxy Attendance',
        title: 'Smart Attendance with Instant WhatsApp / SMS Alerts',
        description: 'Biometric, RFID, app-based and QR attendance marking that automatically notifies parents the moment a student is absent or late, complete with monthly percentage analytics.',
        image: '/images/erp_attendance.jpg',
        stats: 'Instant Parent Sync • Zero Manual Registers'
      },
      {
        badge: 'Financial Governance',
        title: 'Automated Fee Collection, POS Counter & Demand Notices',
        description: 'End-to-end fee structures, installment planning, instant computer-generated A4/thermal receipts, payment gateway integrations, and automatic fee reminder notices.',
        image: '/images/erp_fees.jpg',
        stats: 'Zero Reconciliation Errors • 1-Click Receipts'
      }
    ],
    contactInfo: {
      phone: '9873993957, 9873998949',
      email: 'digitalvidyasaarthi@gmail.com',
      address: 'Faridabad, Delhi, Noida, Haryana | Muzaffarpur & Motihari (Bihar)',
      workingHours: 'Mon - Fri: 09:00 AM - 06:00 PM | Sat: 10:00 AM - 04:00 PM'
    }
  });

  useEffect(() => {
    const loadCms = async () => {
      try {
        const res = await apiClient.get('/public/landing-settings');
        if (res.data?.data) {
          const parsed = typeof res.data.data === 'string' ? JSON.parse(res.data.data) : res.data.data;
          setCms(prev => ({ ...prev, ...parsed }));
        }
      } catch (err) {
        console.warn('Using default landing page config', err);
      }
    };
    loadCms();
  }, []);

  // Slider auto-rotate
  useEffect(() => {
    if (!cms.slides || cms.slides.length === 0) return;
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % cms.slides.length);
    }, (cms.sliderIntervalSeconds || 4) * 1000);
    return () => clearInterval(interval);
  }, [cms.slides, cms.sliderIntervalSeconds]);

  const handleEnquirySubmit = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/public/enquiry', { ...formData, schoolName: formData.school });
      setToastOpen(true);
      setFormData({ name: '', school: '', phone: '', email: '', message: '' });
    } catch (err) {
      console.error(err);
    }
  };

  const primaryColor = cms.themeColor || '#0a387c';
  const goldColor = cms.accentColor || '#ffb000';

  const categorizedModules = [
    {
      category: 'admissions',
      title: 'Online Enquiries & Admissions',
      icon: 'pi pi-user-plus',
      tag: 'Admissions',
      desc: 'Digital registration, merit ranking, multi-step student admission forms, document verification, and auto admission number allocation.'
    },
    {
      category: 'finance',
      title: 'Fee Collection Counter POS',
      icon: 'pi pi-wallet',
      tag: 'Finance',
      desc: 'Custom heads (Tuition, Lab, Transport), concessions, online gateway integration, instant thermal/A4 receipts, and auto demand notices.'
    },
    {
      category: 'academics',
      title: 'Smart Attendance & Leaves',
      icon: 'pi pi-check-circle',
      tag: 'Daily Ops',
      desc: 'Biometric, RFID & teacher app attendance with instant automated parent SMS/WhatsApp notification and staff leave approvals.'
    },
    {
      category: 'academics',
      title: 'Timetable & Bell Scheduler',
      icon: 'pi pi-calendar',
      tag: 'Academics',
      desc: 'Weekly class & teacher period grids, bell schedules, and intelligent automated substitution suggesting proxy faculty for absent teachers.'
    },
    {
      category: 'academics',
      title: 'Exams & Automated Report Cards',
      icon: 'pi pi-file-edit',
      tag: 'Assessments',
      desc: 'Term-wise date sheets, subject teacher marks entry, automated grading/percentage calculations, and printable CBSE/ICSE report cards.'
    },
    {
      category: 'lifecycle',
      title: 'Promotion & Transfer Certificates',
      icon: 'pi pi-arrow-up-right',
      tag: 'Lifecycle',
      desc: 'Session-end 1-click bulk student promotion and formal verifiable Transfer Certificate (TC) issuance with QR verification.'
    },
    {
      category: 'identity',
      title: 'Dynamic ID Card Studio',
      icon: 'pi pi-id-card',
      tag: 'Identity',
      desc: 'Built-in visual ID card designer with custom school templates, photo alignment, QR codes/barcodes, and bulk print sheets.'
    },
    {
      category: 'hr',
      title: 'Staff Directory & HR Payroll',
      icon: 'pi pi-users',
      tag: 'Staff HR',
      desc: 'Complete employee credentials, qualification tracking, salary structures, class teacher allocations, and faculty subject mapping.'
    },
    {
      category: 'logistics',
      title: 'Transport Fleet & Route Tracking',
      icon: 'pi pi-car',
      tag: 'Logistics',
      desc: 'Bus vehicles, driver licensing, pickup/drop route stops, timings, distance slabs, and student/staff seat allocations.'
    },
    {
      category: 'logistics',
      title: 'Inventory & Stock Management',
      icon: 'pi pi-box',
      tag: 'Supply Chain',
      desc: 'Uniforms, books, stationery, item categories, supplier directory, purchase inward bills, department stock issue, and stock ledger.'
    },
    {
      category: 'finance',
      title: 'School Expense Management',
      icon: 'pi pi-chart-line',
      tag: 'Finance',
      desc: 'Petty cash tracking, operational expense categories, bill attachments, voucher receipts, and branch-level financial auditing.'
    },
    {
      category: 'platform',
      title: 'Super Admin Multi-Tenant SaaS',
      icon: 'pi pi-building',
      tag: 'Platform',
      desc: 'Executive portal to onboard infinite schools, toggle module catalogs, configure subscription plans, and inspect global audit logs.'
    },
    {
      category: 'platform',
      title: 'Granular Role-Based Security',
      icon: 'pi pi-shield',
      tag: 'Security',
      desc: 'Screen-level View, Add, Edit, Delete, Print and Export permissions for Principals, Accountants, Teachers, and Clerks.'
    },
    {
      category: 'platform',
      title: 'Central Analytical Reports Hub',
      icon: 'pi pi-chart-bar',
      tag: 'Analytics',
      desc: 'Consolidated multi-branch reporting covering fee collection trends, defaulters, daily attendance ratios, and institutional growth.'
    }
  ];

  const filteredModules = activeTab === 'all' 
    ? categorizedModules 
    : categorizedModules.filter(m => m.category === activeTab);

  const edumarshalFaqs = [
    {
      q: 'What is a School ERP software & Management System?',
      a: 'A School ERP is a unified cloud platform that connects every department of your institution — admissions, academics, biometric attendance, fee counter POS, examinations, report cards, transport, and inventory — onto a single real-time database instead of disjointed Excel registers.'
    },
    {
      q: 'Can this ERP handle multiple schools and branch campuses?',
      a: 'Yes! Built on an enterprise multi-tenant cloud architecture, Super Admins can manage multiple branch campuses from a single executive dashboard with centralized reporting, student transfers, and isolated branch permissions.'
    },
    {
      q: 'How does the Fee Management & POS Counter work?',
      a: 'You can configure custom fee heads (Tuition, Transport, Examination, Lab, Uniform), set installment schedules, apply concessions, take cash/cheque/online payments, and print computer receipts instantly in thermal or A4 formats.'
    },
    {
      q: 'Does it send automated attendance alerts to parents?',
      a: 'Yes. The moment student attendance is marked through biometric devices, RFID cards, or the teacher app, an automated WhatsApp/SMS notification is triggered immediately to parents if their child is absent or late.'
    },
    {
      q: 'Can Super Admin customize this landing page directly?',
      a: 'Yes! Super Admins have a dedicated Website CMS portal inside the ERP to change the theme brand colors, hero titles, descriptions, interactive photo sliders, and contact details in real time without touching any code.'
    }
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fdfefe', color: '#12233f', fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' }}>
      
      {/* Top Banner Ribbon */}
      <Box sx={{ bgcolor: '#071834', color: '#ffffff', py: 0.8, px: 2, fontSize: '0.82rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Container maxWidth="xl" sx={{ display: 'flex', justifyContent: { xs: 'center', md: 'space-between' }, alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          {/* Desktop trust badges - hidden on mobile */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 2 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: goldColor, fontWeight: 700 }}>
              <VerifiedIcon sx={{ fontSize: 16 }} /> ISO 27001 Certified & Bank-Grade Cloud Security
            </span>
            <span style={{ color: '#94a3b8' }}>•</span>
            <span style={{ color: '#cbd5e1' }}>Trusted by 550+ Schools & Colleges Across India</span>
          </Box>

          {/* Contact / Phone: On mobile, only show phone number cleanly */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2.5, width: { xs: '100%', md: 'auto' } }}>
            <a href={`tel:${cms.contactInfo?.phone?.split(',')[0] || '9873993957'}`} style={{ color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none', fontWeight: 700, fontSize: '0.85rem' }}>
              <PhoneInTalkIcon sx={{ fontSize: 16, color: goldColor }} /> {cms.contactInfo?.phone?.split(',')[0] || '9873993957'}
            </a>
            <a href="#contact" style={{ display: { xs: 'none', sm: 'inline' }, color: goldColor, fontWeight: 700, textDecoration: 'none' }}>
              Get Instant Quote &rarr;
            </a>
          </Box>
        </Container>
      </Box>

      {/* Main Sticky Navbar */}
      <AppBar position="sticky" sx={{ bgcolor: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(12px)', color: '#12233f', boxShadow: '0 4px 20px rgba(10,56,124,0.06)' }}>
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: { xs: 0.8, md: 1.2 } }}>
            
            {/* Brand Logo (Left Side) */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, cursor: 'pointer' }} onClick={() => window.scrollTo(0,0)}>
              <Box sx={{ 
                width: { xs: 38, sm: 44 }, 
                height: { xs: 38, sm: 44 }, 
                borderRadius: 2, 
                background: `linear-gradient(135deg, ${primaryColor} 0%, #071834 100%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff',
                boxShadow: `0 8px 18px -4px ${primaryColor}60`
              }}>
                <i className="pi pi-graduation-cap" style={{ fontSize: '1.35rem', color: goldColor }}></i>
              </Box>
              <Box>
                <Typography variant="h6" fontWeight="900" sx={{ color: '#0a387c', lineHeight: 1.1, letterSpacing: '-0.02em', fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
                  DVS <span style={{ color: '#12233f' }}>School ERP</span>
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: { xs: '0.62rem', sm: '0.68rem' }, display: 'block' }}>
                  Enterprise School Management
                </Typography>
              </Box>
            </Box>

            {/* Desktop Navigation Links */}
            <Box sx={{ display: { xs: 'none', lg: 'flex' }, gap: 3.5, alignItems: 'center' }}>
              <a href="#" style={{ textDecoration: 'none', color: '#12233f', fontWeight: 700, fontSize: '0.92rem' }}>Home</a>
              <a href="#slider-preview" style={{ textDecoration: 'none', color: '#475569', fontWeight: 600, fontSize: '0.92rem' }}>Product Tour</a>
              <a href="#modules-suite" style={{ textDecoration: 'none', color: '#475569', fontWeight: 600, fontSize: '0.92rem' }}>65+ ERP Modules</a>
              <a href="#why-us" style={{ textDecoration: 'none', color: '#475569', fontWeight: 600, fontSize: '0.92rem' }}>Why DVS ERP</a>
              <a href="#faq" style={{ textDecoration: 'none', color: '#475569', fontWeight: 600, fontSize: '0.92rem' }}>FAQ</a>
              <a href="#contact" style={{ textDecoration: 'none', color: '#475569', fontWeight: 600, fontSize: '0.92rem' }}>Contact</a>
            </Box>

            {/* Desktop Action Buttons */}
            <Box sx={{ display: { xs: 'none', lg: 'flex' }, alignItems: 'center', gap: 2 }}>
              <Button 
                variant="outlined" 
                sx={{ 
                  borderRadius: 99, 
                  px: 2.5, py: 0.9, 
                  fontWeight: 800, 
                  fontSize: '0.88rem',
                  borderColor: '#cbd5e1', 
                  color: '#0a387c',
                  textTransform: 'none',
                  '&:hover': { borderColor: '#0a387c', bgcolor: '#f1f5f9' }
                }} 
                onClick={() => navigate('/login')}
              >
                Portal Login
              </Button>
              <Button 
                variant="contained" 
                href="#contact"
                sx={{ 
                  borderRadius: 99, 
                  px: 3, py: 1, 
                  fontWeight: 800, 
                  fontSize: '0.9rem',
                  textTransform: 'none',
                  background: 'linear-gradient(120deg, #ffb000 30%, #ffd47e 48%, #ffb000 62%)',
                  backgroundSize: '220% 100%',
                  color: '#12233f',
                  boxShadow: '0 12px 26px -10px rgba(255, 176, 0, 0.65)',
                  '&:hover': { transform: 'translateY(-2px)' }
                }}
              >
                Book Free Demo &rarr;
              </Button>
            </Box>

            {/* Mobile Hamburger Menu Icon (Right Side) */}
            <IconButton 
              sx={{ 
                display: { xs: 'flex', lg: 'none' },
                color: '#0a387c',
                bgcolor: '#f1f5f9',
                p: 1,
                borderRadius: 2,
                '&:hover': { bgcolor: '#e2e8f0' }
              }}
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="open mobile menu"
            >
              <MenuIcon sx={{ fontSize: 28 }} />
            </IconButton>

          </Toolbar>
        </Container>
      </AppBar>

      {/* Mobile Slide-out Drawer */}
      <Drawer
        anchor="right"
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        PaperProps={{
          sx: { width: '82%', maxWidth: 340, bgcolor: '#ffffff', p: 2.5 }
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ 
              width: 32, height: 32, borderRadius: 1.5, 
              background: `linear-gradient(135deg, ${primaryColor} 0%, #071834 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff'
            }}>
              <i className="pi pi-graduation-cap" style={{ fontSize: '1.1rem', color: goldColor }}></i>
            </Box>
            <Typography variant="subtitle1" fontWeight={800} color="#0a387c">
              DVS ERP Menu
            </Typography>
          </Box>
          <IconButton onClick={() => setMobileDrawerOpen(false)} size="small" sx={{ bgcolor: '#f1f5f9' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Navigation list */}
        <List sx={{ p: 0, mb: 3 }}>
          {[
            { label: 'Home', href: '#' },
            { label: 'Product Tour', href: '#slider-preview' },
            { label: '65+ ERP Modules', href: '#modules-suite' },
            { label: 'Why DVS ERP', href: '#why-us' },
            { label: 'Frequently Asked Questions', href: '#faq' },
            { label: 'Contact Us', href: '#contact' },
          ].map((item, idx) => (
            <ListItem key={idx} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton 
                component="a" 
                href={item.href} 
                onClick={() => setMobileDrawerOpen(false)}
                sx={{ borderRadius: 1.5, py: 1 }}
              >
                <ListItemText 
                  primary={item.label} 
                  primaryTypographyProps={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }} 
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        <Divider sx={{ mb: 3 }} />

        {/* Action Buttons in Drawer */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Button 
            variant="contained" 
            href="#contact"
            onClick={() => setMobileDrawerOpen(false)}
            fullWidth
            sx={{ 
              borderRadius: 99, 
              py: 1.2, 
              fontWeight: 800, 
              fontSize: '0.92rem',
              textTransform: 'none',
              background: 'linear-gradient(120deg, #ffb000 30%, #ffd47e 48%, #ffb000 62%)',
              color: '#12233f',
              boxShadow: '0 8px 20px -6px rgba(255, 176, 0, 0.65)'
            }}
          >
            Book Free Demo &rarr;
          </Button>

          <Button 
            variant="outlined" 
            fullWidth
            sx={{ 
              borderRadius: 99, 
              py: 1.1, 
              fontWeight: 800, 
              fontSize: '0.92rem',
              borderColor: '#0a387c', 
              color: '#0a387c',
              textTransform: 'none'
            }} 
            onClick={() => {
              setMobileDrawerOpen(false);
              navigate('/login');
            }}
          >
            Portal Login
          </Button>

          <Box sx={{ mt: 3, p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 0.5 }}>
              Direct Helpline
            </Typography>
            <a href={`tel:${cms.contactInfo?.phone?.split(',')[0] || '9873993957'}`} style={{ color: '#0a387c', fontWeight: 800, fontSize: '0.95rem', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <PhoneInTalkIcon sx={{ fontSize: 16, color: '#ffb000' }} />
              {cms.contactInfo?.phone?.split(',')[0] || '9873993957'}
            </a>
          </Box>
        </Box>
      </Drawer>

      {/* Hero Section (Edumarshal Split Layout) */}
      <Box sx={{ 
        pt: { xs: 6, md: 10 }, pb: { xs: 8, md: 12 }, px: 2, 
        background: 'linear-gradient(180deg, #0a387c 0%, #072554 45%, #051b3d 100%)',
        color: '#ffffff',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle grid pattern background */}
        <Box sx={{ 
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          opacity: 0.8,
          pointerEvents: 'none'
        }} />

        <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
          <Grid container spacing={6} alignItems="center">
            
            {/* Hero Left Content */}
            <Grid item xs={12} md={7}>
              
              {/* Kick Badge */}
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <Box sx={{ width: 22, height: 4, borderRadius: 2, bgcolor: goldColor }} />
                <Typography sx={{ color: '#ffd47e', fontWeight: 800, fontSize: '0.82rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  {cms.heroBadge}
                </Typography>
              </Box>

              {/* Main Headline */}
              <Typography variant="h1" sx={{ 
                fontSize: { xs: '2.4rem', sm: '3.2rem', lg: '3.8rem' }, 
                fontWeight: 900, 
                lineHeight: 1.15, 
                letterSpacing: '-0.03em', 
                color: '#ffffff',
                mb: 3
              }}>
                {cms.heroTitle}
              </Typography>

              {/* Subtitle */}
              <Typography sx={{ 
                color: '#d0ddf5', 
                fontSize: { xs: '1.05rem', md: '1.2rem' }, 
                lineHeight: 1.65, 
                mb: 4, 
                maxWidth: '680px' 
              }}>
                {cms.heroSubtitle}
              </Typography>

              {/* Bullet Features Checklist */}
              <Grid container spacing={2} sx={{ mb: 5 }}>
                {[
                  '1-Click Online & POS Counter Fee Receipts',
                  'Biometric & RFID Smart Attendance with Instant Parent SMS',
                  'Automated CBSE/ICSE Grade Sheets & Report Cards',
                  'Real-Time GPS Fleet & Bus Route Allocation',
                  'Super Admin Multi-Tenant Campus Governance',
                  'Zero Setup Downtime & 24/7 Dedicated Support'
                ].map((item, idx) => (
                  <Grid item xs={12} sm={6} key={idx}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                      <CheckCircleIcon sx={{ color: goldColor, fontSize: 18 }} />
                      <Typography sx={{ color: '#f1f5f9', fontSize: '0.9rem', fontWeight: 600 }}>{item}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap' }}>
                <Button 
                  variant="contained" 
                  size="large" 
                  href="#contact"
                  sx={{ 
                    borderRadius: 99, 
                    px: 4.5, py: 1.7, 
                    fontWeight: 800, 
                    fontSize: '1rem',
                    textTransform: 'none',
                    background: 'linear-gradient(120deg, #ffb000 30%, #ffd47e 48%, #ffb000 62%)',
                    backgroundSize: '220% 100%',
                    color: '#12233f',
                    boxShadow: '0 14px 28px -8px rgba(255, 176, 0, 0.75)',
                    '&:hover': { transform: 'translateY(-2px)' }
                  }}
                >
                  {cms.ctaPrimaryText} &rarr;
                </Button>
                <Button 
                  variant="outlined" 
                  size="large" 
                  href="#modules-suite"
                  sx={{ 
                    borderRadius: 99, 
                    px: 4, py: 1.7, 
                    fontWeight: 700, 
                    fontSize: '1rem',
                    textTransform: 'none',
                    borderColor: 'rgba(255,255,255,0.3)', 
                    color: '#ffffff',
                    '&:hover': { borderColor: '#ffffff', bgcolor: 'rgba(255,255,255,0.06)' }
                  }}
                >
                  {cms.ctaSecondaryText}
                </Button>
              </Box>

            </Grid>

            {/* Hero Right: Fast Quick Consultation Card (Edumarshal Style) */}
            <Grid item xs={12} md={5}>
              <Paper sx={{ 
                p: { xs: 3.5, md: 4.5 }, 
                borderRadius: 4, 
                bgcolor: '#ffffff', 
                color: '#12233f',
                boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h5" fontWeight="900" sx={{ color: '#0a387c', mb: 0.5 }}>
                    Schedule Live Interactive Demo
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    See how DVS ERP automates daily workflows for your teachers, fee accountants, and students.
                  </Typography>
                </Box>

                <form onSubmit={handleEnquirySubmit}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField 
                      fullWidth 
                      placeholder="Your Full Name *" 
                      size="small"
                      required
                      value={formData.name} 
                      onChange={e => setFormData({ ...formData, name: e.target.value })} 
                      InputProps={{ sx: { borderRadius: 2 } }}
                    />
                    <TextField 
                      fullWidth 
                      placeholder="School / College / Institute Name *" 
                      size="small"
                      required
                      value={formData.school} 
                      onChange={e => setFormData({ ...formData, school: e.target.value })} 
                      InputProps={{ sx: { borderRadius: 2 } }}
                    />
                    <TextField 
                      fullWidth 
                      placeholder="10-Digit Mobile Number *" 
                      size="small"
                      required
                      value={formData.phone} 
                      onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })} 
                      inputProps={{ maxLength: 10, pattern: "[0-9]{10}" }}
                      InputProps={{ sx: { borderRadius: 2 } }}
                    />
                    <TextField 
                      fullWidth 
                      placeholder="Official Email Address" 
                      type="email"
                      size="small"
                      value={formData.email} 
                      onChange={e => setFormData({ ...formData, email: e.target.value })} 
                      InputProps={{ sx: { borderRadius: 2 } }}
                    />
                    <Button 
                      type="submit" 
                      variant="contained" 
                      fullWidth
                      sx={{ 
                        mt: 1,
                        py: 1.5, 
                        fontWeight: 900, 
                        fontSize: '1rem',
                        borderRadius: 2.5,
                        textTransform: 'none',
                        background: 'linear-gradient(120deg, #ffb000 30%, #ffd47e 48%, #ffb000 62%)',
                        backgroundSize: '220% 100%',
                        color: '#12233f',
                        boxShadow: '0 12px 24px -8px rgba(255, 176, 0, 0.65)',
                        '&:hover': { transform: 'translateY(-2px)' }
                      }}
                    >
                      Book 30-Minute Free Demo &rarr;
                    </Button>
                    <Typography variant="caption" sx={{ color: '#94a3b8', textAlign: 'center', mt: 0.5 }}>
                      🔒 Zero spam • Custom institution quote within 24 hours
                    </Typography>
                  </Box>
                </form>
              </Paper>
            </Grid>

          </Grid>
        </Container>
      </Box>

      {/* Institutional Stats & Scale Strip (Edumarshal Proven At Scale) */}
      <Box sx={{ bgcolor: '#ffffff', py: 5, borderBottom: '1px solid #e2e8f0' }}>
        <Container maxWidth="xl">
          <Grid container spacing={4} justifyContent="center" textAlign="center">
            {[
              { num: '550+', label: 'Institutions Powered', sub: 'Across 18+ States' },
              { num: '65+', label: 'Integrated Modules', sub: 'Admissions to Alumni' },
              { num: '100%', label: 'Zero Paper Fee Collection', sub: 'Instant POS Receipts' },
              { num: '4.9/5', label: 'Customer Satisfaction', sub: 'Rated by School Principals' }
            ].map((stat, idx) => (
              <Grid item xs={6} md={3} key={idx}>
                <Typography variant="h3" fontWeight="900" sx={{ color: '#0a387c', mb: 0.5 }}>
                  {stat.num}
                </Typography>
                <Typography variant="subtitle2" fontWeight="800" sx={{ color: '#12233f' }}>
                  {stat.label}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  {stat.sub}
                </Typography>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Product Tour & Interactive Hero Slider Showcase */}
      <Box id="slider-preview" sx={{ py: 10, bgcolor: '#f8fafc' }}>
        <Container maxWidth="xl">
          
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <Box sx={{ width: 18, height: 3, borderRadius: 2, bgcolor: goldColor }} />
              <Typography sx={{ color: '#0a387c', fontWeight: 800, fontSize: '0.8rem', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                LIVE PRODUCT INTERFACE
              </Typography>
              <Box sx={{ width: 18, height: 3, borderRadius: 2, bgcolor: goldColor }} />
            </Box>
            <Typography variant="h3" fontWeight="900" sx={{ color: '#0a387c', mb: 1.5 }}>
              Engineered For Modern Campus Excellence
            </Typography>
            <Typography variant="body1" sx={{ color: '#64748b', maxWidth: '750px', mx: 'auto' }}>
              Explore how administrative tasks, fee billing counters, and real-time attendance markings operate seamlessly.
            </Typography>
          </Box>

          {/* Interactive Slide Container */}
          {cms.slides && cms.slides.length > 0 && (
            <Paper 
              elevation={0}
              sx={{ 
                borderRadius: 4, 
                border: '1.5px solid rgba(10,56,124,0.15)', 
                overflow: 'hidden',
                boxShadow: '0 24px 60px -20px rgba(10, 56, 124, 0.25)',
                bgcolor: '#ffffff'
              }}
            >
              <Grid container alignItems="center">
                
                {/* Slide Details */}
                <Grid item xs={12} lg={5} sx={{ p: { xs: 4, md: 6 } }}>
                  <Chip 
                    label={cms.slides[currentSlide].badge} 
                    size="small" 
                    sx={{ 
                      mb: 2, 
                      bgcolor: '#e8f0fc', 
                      color: '#0a387c', 
                      fontWeight: 800,
                      borderRadius: 1.5
                    }} 
                  />
                  <Typography variant="h4" fontWeight="900" sx={{ mb: 2, color: '#0a387c', lineHeight: 1.25 }}>
                    {cms.slides[currentSlide].title}
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#475569', mb: 3.5, lineHeight: 1.75 }}>
                    {cms.slides[currentSlide].description}
                  </Typography>

                  {cms.slides[currentSlide].stats && (
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, mb: 4, px: 2, py: 1, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #bbf7d0', color: '#15803d' }}>
                      <CheckCircleIcon sx={{ fontSize: 18 }} />
                      <Typography variant="body2" fontWeight="800">{cms.slides[currentSlide].stats}</Typography>
                    </Box>
                  )}

                  {/* Slider Controls */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <IconButton 
                      size="small"
                      onClick={() => setCurrentSlide((currentSlide - 1 + cms.slides.length) % cms.slides.length)}
                      sx={{ bgcolor: '#e8f0fc', color: '#0a387c', '&:hover': { bgcolor: '#d0ddf5' } }}
                    >
                      <ArrowBackIosNewIcon fontSize="small" sx={{ fontSize: 14 }} />
                    </IconButton>

                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {cms.slides.map((_, dotIdx) => (
                        <Box 
                          key={dotIdx}
                          onClick={() => setCurrentSlide(dotIdx)}
                          sx={{ 
                            width: dotIdx === currentSlide ? 28 : 10, 
                            height: 10, 
                            borderRadius: 5, 
                            bgcolor: dotIdx === currentSlide ? goldColor : '#cbd5e1',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease'
                          }} 
                        />
                      ))}
                    </Box>

                    <IconButton 
                      size="small"
                      onClick={() => setCurrentSlide((currentSlide + 1) % cms.slides.length)}
                      sx={{ bgcolor: '#e8f0fc', color: '#0a387c', '&:hover': { bgcolor: '#d0ddf5' } }}
                    >
                      <ArrowForwardIosIcon fontSize="small" sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Box>
                </Grid>

                {/* Screenshot Visual */}
                <Grid item xs={12} lg={7}>
                  <Box sx={{ p: 2, bgcolor: '#071834' }}>
                    <CardMedia 
                      component="img" 
                      image={cms.slides[currentSlide].image} 
                      alt={cms.slides[currentSlide].title}
                      sx={{ 
                        borderRadius: 2.5, 
                        width: '100%', 
                        height: { xs: 260, md: 460 }, 
                        objectFit: 'cover' 
                      }} 
                    />
                  </Box>
                </Grid>

              </Grid>
            </Paper>
          )}

        </Container>
      </Box>

      {/* 65+ Modules Ecosystem Suite with Tabs (Edumarshal Style) */}
      <Box id="modules-suite" sx={{ py: 10, bgcolor: '#ffffff' }}>
        <Container maxWidth="xl">
          
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <Box sx={{ width: 18, height: 3, borderRadius: 2, bgcolor: goldColor }} />
              <Typography sx={{ color: '#0a387c', fontWeight: 800, fontSize: '0.8rem', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                MODULE SUITE ECOSYSTEM
              </Typography>
              <Box sx={{ width: 18, height: 3, borderRadius: 2, bgcolor: goldColor }} />
            </Box>
            <Typography variant="h3" fontWeight="900" sx={{ color: '#0a387c', mb: 1.5 }}>
              Complete End-to-End Institutional Modules
            </Typography>
            <Typography variant="body1" sx={{ color: '#64748b', maxWidth: '720px', mx: 'auto' }}>
              From initial admissions and fee collections to grade cards and alumni records — everything is connected in one database.
            </Typography>

            {/* Filter Pills */}
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5, flexWrap: 'wrap', mt: 4 }}>
              {[
                { id: 'all', label: 'All Modules' },
                { id: 'finance', label: 'Fees & Accounts' },
                { id: 'academics', label: 'Academics & Attendance' },
                { id: 'admissions', label: 'Admissions & CRM' },
                { id: 'logistics', label: 'Transport & Inventory' },
                { id: 'hr', label: 'Staff & HR Payroll' },
                { id: 'platform', label: 'Super Admin & RBAC' }
              ].map(tab => (
                <Button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  sx={{ 
                    borderRadius: 99, 
                    px: 3, py: 1, 
                    fontWeight: 700, 
                    fontSize: '0.86rem',
                    textTransform: 'none',
                    bgcolor: activeTab === tab.id ? '#0a387c' : '#f1f5f9',
                    color: activeTab === tab.id ? '#ffffff' : '#334155',
                    '&:hover': { bgcolor: activeTab === tab.id ? '#072554' : '#e2e8f0' }
                  }}
                >
                  {tab.label}
                </Button>
              ))}
            </Box>
          </Box>

          {/* Modules Grid (Edumarshal Card UI with Hover Lift) */}
          <Grid container spacing={3}>
            {filteredModules.map((item, idx) => (
              <Grid item xs={12} sm={6} md={4} key={idx}>
                <Paper 
                  sx={{ 
                    p: 3.5, 
                    height: '100%', 
                    borderRadius: 3.5, 
                    bgcolor: '#ffffff',
                    border: '1px solid rgba(44, 90, 160, 0.16)',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.25s ease',
                    '&:hover': {
                      transform: 'translateY(-5px)',
                      borderColor: goldColor,
                      boxShadow: '0 22px 44px -20px rgba(10, 56, 124, 0.45)'
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                    <Box sx={{ 
                      width: 48, height: 48, borderRadius: 2.5, 
                      bgcolor: '#e8f0fc', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#0a387c'
                    }}>
                      <i className={item.icon} style={{ fontSize: '1.4rem' }}></i>
                    </Box>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        px: 1.4, py: 0.5, 
                        borderRadius: 1.5, 
                        bgcolor: '#f8fafc', 
                        color: '#0a387c', 
                        fontWeight: 800,
                        border: '1px solid #e2e8f0',
                        fontSize: '0.72rem'
                      }}
                    >
                      {item.tag}
                    </Typography>
                  </Box>

                  <Typography variant="h6" fontWeight="800" sx={{ mb: 1.2, color: '#12233f', fontSize: '1.15rem' }}>
                    {item.title}
                  </Typography>

                  <Typography variant="body2" sx={{ color: '#565656', lineHeight: 1.65, mt: 'auto' }}>
                    {item.desc}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

        </Container>
      </Box>

      {/* Why Choose Us - 3 Pillars (Academics, Administration, Finance) */}
      <Box id="why-us" sx={{ py: 10, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
        <Container maxWidth="xl">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography variant="h3" fontWeight="900" sx={{ color: '#0a387c', mb: 1.5 }}>
              Why Indian Institutions Choose DVS ERP
            </Typography>
            <Typography variant="body1" sx={{ color: '#64748b' }}>
              Replace disparate spreadsheets and manual registers with automated, synchronized workflows.
            </Typography>
          </Box>

          <Grid container spacing={4}>
            {[
              {
                icon: 'pi pi-book',
                title: 'Academic Discipline & LMS',
                desc: 'Automate class timetables, teacher proxy substitution, term examinations, and generate CBSE/ICSE marks cards instantly.'
              },
              {
                icon: 'pi pi-shield',
                title: 'Institutional Administration',
                desc: 'Maintain student records from admission enquiry to TC generation, track fleet buses via GPS, and organize inventory and assets.'
              },
              {
                icon: 'pi pi-dollar',
                title: 'Financial Health & Transparency',
                desc: 'Eliminate fee leakages with automated POS counters, fee concessions, instant online gateway collection, and daily tally receipts.'
              }
            ].map((pillar, idx) => (
              <Grid item xs={12} md={4} key={idx}>
                <Paper sx={{ 
                  p: 4.5, 
                  height: '100%', 
                  borderRadius: 4, 
                  bgcolor: '#ffffff', 
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.03)'
                }}>
                  <Box sx={{ 
                    width: 52, height: 52, borderRadius: 2.5, 
                    bgcolor: '#0a387c', color: goldColor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    mb: 3
                  }}>
                    <i className={pillar.icon} style={{ fontSize: '1.5rem' }}></i>
                  </Box>
                  <Typography variant="h5" fontWeight="800" sx={{ mb: 1.5, color: '#12233f' }}>
                    {pillar.title}
                  </Typography>
                  <Typography sx={{ color: '#565656', lineHeight: 1.7 }}>
                    {pillar.desc}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Frequently Asked Questions (Edumarshal Style Accordions) */}
      <Box id="faq" sx={{ py: 10, bgcolor: '#ffffff' }}>
        <Container maxWidth="md">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <Box sx={{ width: 18, height: 3, borderRadius: 2, bgcolor: goldColor }} />
              <Typography sx={{ color: '#0a387c', fontWeight: 800, fontSize: '0.8rem', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                FREQUENTLY ASKED QUESTIONS
              </Typography>
              <Box sx={{ width: 18, height: 3, borderRadius: 2, bgcolor: goldColor }} />
            </Box>
            <Typography variant="h3" fontWeight="900" sx={{ color: '#0a387c' }}>
              Clear Answers to Common Questions
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {edumarshalFaqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <Paper 
                  key={idx}
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  sx={{ 
                    borderRadius: 3.5, 
                    border: '1px solid rgba(44,90,160,0.16)',
                    cursor: 'pointer',
                    transition: 'border-color 0.3s ease',
                    overflow: 'hidden',
                    '&:hover': { borderColor: goldColor }
                  }}
                >
                  <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                    <Typography fontWeight="800" sx={{ color: '#12233f', fontSize: '1.02rem' }}>
                      {faq.q}
                    </Typography>
                    <Box sx={{ 
                      width: 30, height: 30, borderRadius: 99, 
                      bgcolor: isOpen ? goldColor : '#e8f0fc', 
                      color: isOpen ? '#12233f' : '#0a387c',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 900,
                      flexShrink: 0,
                      transform: isOpen ? 'rotate(45deg)' : 'none',
                      transition: 'all 0.3s ease'
                    }}>
                      +
                    </Box>
                  </Box>
                  {isOpen && (
                    <Box sx={{ px: 2.5, pb: 2.5, color: '#565656', lineHeight: 1.7, fontSize: '0.94rem' }}>
                      {faq.a}
                    </Box>
                  )}
                </Paper>
              );
            })}
          </Box>
        </Container>
      </Box>

      {/* Main Demo Booking Form (Edumarshal Bottom Call to Action) */}
      <Box id="contact" sx={{ 
        py: 10, 
        background: 'linear-gradient(135deg, #0a387c 0%, #071834 100%)',
        color: '#ffffff'
      }}>
        <Container maxWidth="md">
          <Paper sx={{ 
            p: { xs: 4, md: 6 }, 
            borderRadius: 4.5, 
            bgcolor: '#ffffff', 
            color: '#12233f',
            boxShadow: '0 30px 70px -15px rgba(0,0,0,0.6)'
          }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography variant="h4" fontWeight="900" sx={{ color: '#0a387c', mb: 1 }}>
                Ready to Upgrade Your Institution?
              </Typography>
              <Typography sx={{ color: '#64748b' }}>
                Join 550+ institutions that run their entire academic and financial operations on our School ERP.
              </Typography>
            </Box>

            <form onSubmit={handleEnquirySubmit}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField 
                    fullWidth 
                    label="Principal / Director Name" 
                    required 
                    value={formData.name} 
                    onChange={e => setFormData({ ...formData, name: e.target.value })} 
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField 
                    fullWidth 
                    label="School / Campus Name" 
                    required 
                    value={formData.school} 
                    onChange={e => setFormData({ ...formData, school: e.target.value })} 
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField 
                    fullWidth 
                    label="10-Digit Mobile Number" 
                    required 
                    value={formData.phone} 
                    onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })} 
                    inputProps={{ maxLength: 10, pattern: "[0-9]{10}" }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField 
                    fullWidth 
                    label="Email Address" 
                    type="email"
                    value={formData.email} 
                    onChange={e => setFormData({ ...formData, email: e.target.value })} 
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField 
                    fullWidth 
                    label="Institution Requirements (Student Strength, Campuses)" 
                    multiline 
                    rows={3}
                    value={formData.message} 
                    onChange={e => setFormData({ ...formData, message: e.target.value })} 
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button 
                    type="submit" 
                    variant="contained" 
                    fullWidth
                    sx={{ 
                      py: 1.75, 
                      fontWeight: 900, 
                      fontSize: '1.05rem',
                      borderRadius: 3,
                      textTransform: 'none',
                      background: 'linear-gradient(120deg, #ffb000 30%, #ffd47e 48%, #ffb000 62%)',
                      backgroundSize: '220% 100%',
                      color: '#12233f',
                      boxShadow: '0 12px 28px -10px rgba(255, 176, 0, 0.7)',
                      '&:hover': { transform: 'translateY(-2px)' }
                    }}
                  >
                    Request Custom Quote & Free Demo &rarr;
                  </Button>
                </Grid>
              </Grid>
            </form>
          </Paper>
        </Container>
      </Box>

      {/* Footer (Edumarshal Deep Blue Footer) */}
      <Box sx={{ bgcolor: '#051124', color: '#94a3b8', pt: 8, pb: 4 }}>
        <Container maxWidth="xl">
          <Grid container spacing={5}>
            
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Box sx={{ 
                  width: 38, height: 38, borderRadius: 2, 
                  bgcolor: '#0a387c', display: 'flex', alignItems: 'center', justifyContent: 'center' 
                }}>
                  <i className="pi pi-graduation-cap" style={{ fontSize: '1.3rem', color: goldColor }}></i>
                </Box>
                <Typography variant="h6" fontWeight="900" sx={{ color: '#ffffff' }}>
                  DVS School ERP
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ lineHeight: 1.75, color: '#9aa5b5', mb: 3 }}>
                Complete cloud-native School ERP and institutional management software for Indian schools, colleges and universities. Automating admissions, fee counters, timetables, and academic reporting.
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                Hosted on AWS Enterprise Cloud with automatic backups and bank-grade data encryption.
              </Typography>
            </Grid>

            <Grid item xs={6} md={2}>
              <Typography variant="subtitle2" sx={{ color: '#ffffff', fontWeight: 800, mb: 2 }}>Core Modules</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2, fontSize: '0.88rem' }}>
                <a href="#modules-suite" style={{ color: '#9aa5b5', textDecoration: 'none' }}>Online Admissions</a>
                <a href="#modules-suite" style={{ color: '#9aa5b5', textDecoration: 'none' }}>Fee Counter POS</a>
                <a href="#modules-suite" style={{ color: '#9aa5b5', textDecoration: 'none' }}>Smart Attendance</a>
                <a href="#modules-suite" style={{ color: '#9aa5b5', textDecoration: 'none' }}>CBSE Report Cards</a>
                <a href="#modules-suite" style={{ color: '#9aa5b5', textDecoration: 'none' }}>GPS Transport</a>
              </Box>
            </Grid>

            <Grid item xs={6} md={2}>
              <Typography variant="subtitle2" sx={{ color: '#ffffff', fontWeight: 800, mb: 2 }}>Administration</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2, fontSize: '0.88rem' }}>
                <a href="#modules-suite" style={{ color: '#9aa5b5', textDecoration: 'none' }}>Multi-Campus SaaS</a>
                <a href="#modules-suite" style={{ color: '#9aa5b5', textDecoration: 'none' }}>Staff HR & Payroll</a>
                <a href="#modules-suite" style={{ color: '#9aa5b5', textDecoration: 'none' }}>School Inventory</a>
                <a href="#modules-suite" style={{ color: '#9aa5b5', textDecoration: 'none' }}>Role-Based Access</a>
                <a href="#modules-suite" style={{ color: '#9aa5b5', textDecoration: 'none' }}>Audit Trail Logs</a>
              </Box>
            </Grid>

            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" sx={{ color: '#ffffff', fontWeight: 800, mb: 2 }}>Institutional Offices</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, fontSize: '0.88rem' }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.2 }}>
                  <LocationOnIcon sx={{ fontSize: 18, color: goldColor, mt: 0.2 }} />
                  <Typography variant="body2" sx={{ color: '#cbd5e1' }}>
                    {cms.contactInfo?.address}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                  <PhoneInTalkIcon sx={{ fontSize: 18, color: goldColor }} />
                  <Typography variant="body2" sx={{ color: '#cbd5e1' }}>
                    {cms.contactInfo?.phone}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                  <EmailIcon sx={{ fontSize: 18, color: goldColor }} />
                  <Typography variant="body2" sx={{ color: '#cbd5e1' }}>
                    {cms.contactInfo?.email}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                  <AccessTimeIcon sx={{ fontSize: 18, color: goldColor }} />
                  <Typography variant="body2" sx={{ color: '#9aa5b5' }}>
                    {cms.contactInfo?.workingHours}
                  </Typography>
                </Box>
              </Box>
            </Grid>

          </Grid>

          <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.08)', mt: 6, pt: 3, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              &copy; {new Date().getFullYear()} Digital Vidya Saarthi (DVS ERP). All Rights Reserved. Proven at institutional scale.
            </Typography>
            <Box sx={{ display: 'flex', gap: 3 }}>
              <a href="#" style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.78rem' }}>Privacy Policy</a>
              <a href="#" style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.78rem' }}>Security Architecture</a>
              <a href="#" style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.78rem' }}>Terms of Service</a>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Floating Bottom CTA Bar for Mobile Devices */}
      <Box sx={{ 
        display: { xs: 'block', md: 'none' }, 
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000,
        bgcolor: 'rgba(10, 32, 67, 0.98)', backdropFilter: 'blur(10px)',
        p: 1.5, boxShadow: '0 -8px 24px rgba(7, 24, 52, 0.4)'
      }}>
        <Button 
          variant="contained" 
          fullWidth
          href="#contact"
          sx={{ 
            py: 1.2, 
            fontWeight: 800, 
            borderRadius: 99,
            background: 'linear-gradient(120deg, #ffb000 30%, #ffd47e 48%, #ffb000 62%)',
            color: '#12233f',
            textTransform: 'none'
          }}
        >
          Book Free Demo &rarr;
        </Button>
      </Box>

      {/* Snackbar Alert */}
      <Snackbar open={toastOpen} autoHideDuration={5000} onClose={() => setToastOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setToastOpen(false)} severity="success" sx={{ width: '100%', boxShadow: 3 }}>
          Thank you! Your institutional demo request has been registered. Our representative will contact you shortly.
        </Alert>
      </Snackbar>

    </Box>
  );
};

export default LandingPage;
