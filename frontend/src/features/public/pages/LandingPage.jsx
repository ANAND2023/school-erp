import React, { useState, useEffect } from 'react';
import AOS from 'aos';
import { 
  Box, Typography, Button, Container, Grid, CardMedia, 
  Paper, AppBar, Toolbar, IconButton, TextField, 
  Snackbar, Alert, Chip, Drawer, List, ListItem, ListItemButton, ListItemText, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, Tooltip
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VerifiedIcon from '@mui/icons-material/Verified';
import SchoolIcon from '@mui/icons-material/School';
import PhoneInTalkIcon from '@mui/icons-material/PhoneInTalk';
import EmailIcon from '@mui/icons-material/Email';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import apiClient from '../../../api/client';
import { updateThemeCssVariables } from '../../../store/themeStore';
import { useAuthStore } from '../../../store/authStore';
import { DEFAULT_CLIENTS_LIST } from '../data/clientsData';

const CLIENTS_LIST = DEFAULT_CLIENTS_LIST;

export const LandingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const homeRoute = (user?.userType === 6 || user?.userType === 7) ? '/portal' : '/dashboard';

  // If already authenticated and user pressed browser back from dashboard, auto-return to dashboard
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (isAuthenticated && !searchParams.has('browse')) {
      navigate(homeRoute, { replace: true });
    }
  }, [isAuthenticated, homeRoute, navigate]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeTab, setActiveTab] = useState('all');
  const [clientCategory, setClientCategory] = useState('all');
  const [moduleSearch, setModuleSearch] = useState('');
  const [selectedModule, setSelectedModule] = useState(null);
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
    heroSubtitle: 'One unified cloud platform running Admissions, Fee POS Counters, Student & Staff Attendance, Exam Marks Cards, GPS Transport, and Teacher & Parent Portals across all your campuses.',
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
        badge: 'Daily Academic Ops',
        title: 'Smart Daily Student & Staff Attendance System',
        description: 'Class-wise student attendance registers and staff presence tracking with monthly percentage analytics and instant parent communication.',
        image: '/images/erp_attendance.jpg',
        stats: 'Instant Parent Sync • Zero Manual Registers'
      },
      {
        badge: 'Financial Governance',
        title: 'Automated Fee Collection, POS Counter & Demand Notices',
        description: 'End-to-end fee structures, installment planning, instant computer-generated A4/thermal receipts, payment gateway integrations, and automatic fee reminder notices.',
        image: '/images/erp_fees.jpg',
        stats: 'Zero Reconciliation Errors • 1-Click Receipts'
      },
      {
        badge: 'Smart Learning & AI',
        title: 'NCERT E-Books Reader & 24/7 AI Study Buddy Tutor',
        description: 'Empower students with a free in-portal digital NCERT textbook library (Classes 6-12) and an interactive AI Homework & Concept Doubt Solver powered by instant study tutoring.',
        image: '/images/erp_dashboard.jpg',
        stats: 'Zero-Cost Digital Library • 24/7 Homework Assistance'
      },
      {
        badge: 'Parent & Student Portals',
        title: 'Dedicated Multi-Child Mobile & Web Portals',
        description: 'Parents switch between siblings with 1-click to view live timetable schedules, attendance logs, exam report cards, digital fee receipts, and school circulars in real time.',
        image: '/images/erp_attendance.jpg',
        stats: 'Multi-Child Switcher • 100% Real-Time Sync'
      }
    ],
    contactInfo: {
      phone: '9873993957, 9873998949',
      email: 'digitalvidyasaarthi@gmail.com',
      address: 'Faridabad, Delhi, Noida, Haryana | Muzaffarpur & Motihari (Bihar)',
      workingHours: 'Mon - Fri: 09:00 AM - 06:00 PM | Sat: 10:00 AM - 04:00 PM'
    },
    clients: DEFAULT_CLIENTS_LIST
  });

  const displayClients = (cms.clients && Array.isArray(cms.clients) && cms.clients.length > 0)
    ? cms.clients
    : DEFAULT_CLIENTS_LIST;

  useEffect(() => {
    const loadCms = async () => {
      try {
        const res = await apiClient.get('/public/landing-settings');
        if (res.data?.data) {
          const parsed = typeof res.data.data === 'string' ? JSON.parse(res.data.data) : res.data.data;
          setCms(prev => ({
            ...prev,
            ...parsed,
            clients: (parsed.clients && Array.isArray(parsed.clients) && parsed.clients.length > 0)
              ? parsed.clients
              : (prev.clients || DEFAULT_CLIENTS_LIST)
          }));
        }
      } catch (err) {
        console.warn('Using default landing page config', err);
      }
    };
    loadCms();
  }, []);

  // Initialize AOS (Animate on Scroll) like eduerp.ai
  useEffect(() => {
    AOS.init({
      duration: 800,
      easing: 'ease-out-cubic',
      once: false,
      offset: 50,
    });
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

  useEffect(() => {
    updateThemeCssVariables(primaryColor, false);
  }, [primaryColor]);

  const categorizedModules = [
  {
    "category": "admissions",
    "title": "Online Enquiries & CRM Leads",
    "icon": "pi pi-user-plus",
    "tag": "Admissions & CRM",
    "badge": "Lead Tracking",
    "color": "#ea580c",
    "lightColor": "#fff7ed",
    "gradient": "linear-gradient(135deg, #ea580c 0%, #f97316 100%)",
    "desc": "Capture walk-in and online visitor enquiries, schedule follow-up calls, update conversion statuses, and engage parents directly via 1-click WhatsApp.",
    "highlights": [
      "Real-Time Lead Status",
      "Follow-up Scheduler",
      "1-Click WhatsApp Chat",
      "Lead to Admission Conversion"
    ],
    "targetUser": "Admission Counselors & Front Desk",
    "workflow": "Visitor Enquiry -> Follow-up Schedule -> Status Tracking -> Convert to Admission"
  },
  {
    "category": "admissions",
    "title": "New Registration Slip Generator",
    "icon": "pi pi-file-edit",
    "tag": "Student Onboarding",
    "badge": "Instant Slip",
    "color": "#0284c7",
    "lightColor": "#f0f9ff",
    "gradient": "linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)",
    "desc": "Rapid registration form generator capturing candidate particulars, parent details, registration fee receipts, and printing professional A4 registration slips.",
    "highlights": [
      "Unique Slip Numbering",
      "Auto Fee Calculation",
      "Thermal & A4 Printouts",
      "Direct WhatsApp Slip Share"
    ],
    "targetUser": "Registration Desk & Accounts",
    "workflow": "Applicant Entry -> Fee Deposit -> Generate Number -> Print A4 Slip"
  },
  {
    "category": "admissions",
    "title": "Registration Register & Archive",
    "icon": "pi pi-list",
    "tag": "Admissions Registry",
    "badge": "Searchable Log",
    "color": "#2563eb",
    "lightColor": "#eff6ff",
    "gradient": "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)",
    "desc": "Searchable historical registration master log with live filters, payment status badges (Paid, Partial, Unpaid), quick re-printing, and detailed data export.",
    "highlights": [
      "Real-time Search Filter",
      "Payment Status Badges",
      "1-Click Re-print",
      "Export to Excel & PDF"
    ],
    "targetUser": "Registrars & Cashiers",
    "workflow": "Search Record -> Review Payment -> Re-print Slip -> Export Reports"
  },
  {
    "category": "admissions",
    "title": "Dynamic Registration Form Builder",
    "icon": "pi pi-sliders-h",
    "tag": "Form Customization",
    "badge": "Drag & Drop",
    "color": "#7c3aed",
    "lightColor": "#f5f3ff",
    "gradient": "linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)",
    "desc": "Visual custom registration form designer allowing institutions to define custom fields, dropdowns, document attachments, mandatory flags, and section headers.",
    "highlights": [
      "Custom Form Fields",
      "Required/Optional Flags",
      "Multi-Section Layouts",
      "Dynamic Schema Engine"
    ],
    "targetUser": "School Super Admin & IT Coordinators",
    "workflow": "Add Form Field -> Set Validation -> Order Sections -> Live Form Integration"
  },
  {
    "category": "admissions",
    "title": "New Student Admission & KYC",
    "icon": "pi pi-id-card",
    "tag": "Enrollment",
    "badge": "Full KYC",
    "color": "#059669",
    "lightColor": "#ecfdf5",
    "gradient": "linear-gradient(135deg, #059669 0%, #10b981 100%)",
    "desc": "Multi-step admission engine capturing complete student bio-data, parent details, Aadhaar/KYC verification, photo upload, emergency contacts, and scholar number assignment.",
    "highlights": [
      "Scholar & Admission No Gen",
      "Document KYC Attachments",
      "Sibling & Category Tagging",
      "Medical & Emergency Info"
    ],
    "targetUser": "Admission Officers & Principals",
    "workflow": "Verify Registration -> Complete Admission Form -> Upload Documents -> Generate Scholar No"
  },
  {
    "category": "admissions",
    "title": "Admission Records & Profiles",
    "icon": "pi pi-users",
    "tag": "Student Archives",
    "badge": "Quick Actions",
    "color": "#0d9488",
    "lightColor": "#f0fdfa",
    "gradient": "linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)",
    "desc": "Centralized student admission repository with instant profile editing, class filtering, admission report generation, and student status management.",
    "highlights": [
      "Quick Profile Editor",
      "Direct Admission Report",
      "Class-wise Filters",
      "Export Student List"
    ],
    "targetUser": "Administrative Staff & Clerks",
    "workflow": "Filter Class -> Search Student -> View/Edit Profile -> Print Official Report"
  },
  {
    "category": "admissions",
    "title": "Bulk Student Upload & Migration",
    "icon": "pi pi-upload",
    "tag": "Data Operations",
    "badge": "Fast Migration",
    "color": "#d97706",
    "lightColor": "#fffbeb",
    "gradient": "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)",
    "desc": "High-volume Excel/CSV template download, validation engine, bulk student profile imports, and bulk class edits for rapid school onboarding.",
    "highlights": [
      "Excel Template Download",
      "Format Validation",
      "Zero-Downtime Import",
      "Bulk Class/Section Edit"
    ],
    "targetUser": "Data Entry Operators & IT Admins",
    "workflow": "Download Template -> Fill Excel Data -> Upload & Validate -> Batch Enrollment"
  },
  {
    "category": "admissions",
    "title": "Statutory A.W.R. Register & Folio",
    "icon": "pi pi-book",
    "tag": "Statutory Compliance",
    "badge": "Govt Standard",
    "color": "#065f46",
    "lightColor": "#ecfdf5",
    "gradient": "linear-gradient(135deg, #065f46 0%, #047857 100%)",
    "desc": "Official statutory Admission and Withdrawal Register (A.W.R.) maintaining legally required student entry/exit records, sequential ledger numbers, and verifiable folio extracts.",
    "highlights": [
      "Official AWR Ledger No",
      "Statutory Board Compliance",
      "Verifiable Student Folio Extract",
      "Landscape Full Register Print"
    ],
    "targetUser": "Principals & Record Keepers",
    "workflow": "Admission Recorded -> Auto AWR Numbering -> Statutory Register Update -> Issue Folio Extract"
  },
  {
    "category": "admissions",
    "title": "Student Directory & Demographics",
    "icon": "pi pi-table",
    "tag": "Student Master",
    "badge": "Smart Demographics",
    "color": "#4338ca",
    "lightColor": "#eef2ff",
    "gradient": "linear-gradient(135deg, #4338ca 0%, #6366f1 100%)",
    "desc": "Complete student database with live KPI counts (Total Students, Boys, Girls), active/inactive status toggle, class/section filters, and high-detail landscape PDF directory download.",
    "highlights": [
      "Live Boy/Girl Counters",
      "Active/Inactive Status Toggle",
      "Landscape A4 PDF Directory",
      "Detailed Contact & Address Export"
    ],
    "targetUser": "School Administration & Teachers",
    "workflow": "Select Class/Section -> View Live Demographics -> Toggle Status -> Download Master Directory PDF"
  },
  {
    "category": "admissions",
    "title": "Roll Number Allocation Matrix",
    "icon": "pi pi-sort-numeric-down",
    "tag": "Academic Organization",
    "badge": "Auto Sequence",
    "color": "#0891b2",
    "lightColor": "#ecfeff",
    "gradient": "linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)",
    "desc": "1-click automatic roll number generation by alphabetical order, gender sequence, or manual drag-and-drop ordering per class & section.",
    "highlights": [
      "Alphabetical Auto-Numbering",
      "Gender-wise Sequencing",
      "Manual Override Grid",
      "Conflict Prevention"
    ],
    "targetUser": "Class Teachers & Exam In-charge",
    "workflow": "Select Class & Section -> Choose Sorting Rule -> Auto Sequence -> Lock Roll Numbers"
  },
  {
    "category": "admissions",
    "title": "Section Change & Transfer",
    "icon": "pi pi-arrows-h",
    "tag": "Student Movement",
    "badge": "Seamless Transfer",
    "color": "#0284c7",
    "lightColor": "#f0f9ff",
    "gradient": "linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)",
    "desc": "Flexible mid-session student section reassignments, strength balancing between sections, and automatic attendance/timetable synchronization.",
    "highlights": [
      "Section Capacity Check",
      "Instant Roster Rebalance",
      "Attendance History Retained",
      "1-Click Student Transfer"
    ],
    "targetUser": "Academic Coordinators & Class Teachers",
    "workflow": "Select Student -> Choose Target Section -> Confirm Capacity -> Instant Transfer"
  },
  {
    "category": "admissions",
    "title": "Dynamic ID Card Studio",
    "icon": "pi pi-palette",
    "tag": "Identity & Security",
    "badge": "Visual Designer",
    "color": "#d97706",
    "lightColor": "#fffbeb",
    "gradient": "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)",
    "desc": "Built-in visual ID card designer with custom school templates, logo placement, barcode/QR code generation, and student photo auto-fitting.",
    "highlights": [
      "Custom Template Layouts",
      "Live Photo & Barcode",
      "Front & Back Card Designs",
      "Multiple Theme Presets"
    ],
    "targetUser": "Admin Office & Printing Cell",
    "workflow": "Choose Template -> Customise Branding -> Preview Live Student Data -> Save Template"
  },
  {
    "category": "admissions",
    "title": "Bulk ID Card Printing Studio",
    "icon": "pi pi-print",
    "tag": "Card Generation",
    "badge": "Multi-Up Grid",
    "color": "#b45309",
    "lightColor": "#fffbeb",
    "gradient": "linear-gradient(135deg, #b45309 0%, #d97706 100%)",
    "desc": "High-resolution multi-up A4 printable sheets for classroom or whole-school ID card batch printing with cutting guides and crop marks.",
    "highlights": [
      "A4 Multi-Up Layout",
      "Crop & Cutting Guidelines",
      "Class & Batch Filter",
      "High-Res Print Ready PDF"
    ],
    "targetUser": "Printing Department & Admin Clerks",
    "workflow": "Select Class/Section -> Select ID Template -> Generate A4 Sheet -> Print/Save PDF"
  },
  {
    "category": "admissions",
    "title": "Student Gate Pass & Movement Tracker",
    "icon": "pi pi-shield",
    "tag": "Campus Security",
    "badge": "Safety & Exit",
    "color": "#dc2626",
    "lightColor": "#fef2f2",
    "gradient": "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)",
    "desc": "Authorized early departure pass, guardian identity verification, reason logging, status tracking (Issued, Departed, Returned), and dual-copy printable security slip.",
    "highlights": [
      "Guardian Verification",
      "Real-Time Exit/Return Time",
      "Dual Copy Security Slip",
      "Exit History Audit"
    ],
    "targetUser": "Security Staff & Front Desk",
    "workflow": "Parent Request -> Reason & Guardian Verification -> Issue Gate Pass -> Security Verification at Gate"
  },
  {
    "category": "finance",
    "title": "Fee Collection Counter POS",
    "icon": "pi pi-wallet",
    "tag": "Finance & Accounts",
    "badge": "High Impact",
    "color": "#059669",
    "lightColor": "#ecfdf5",
    "gradient": "linear-gradient(135deg, #059669 0%, #10b981 100%)",
    "desc": "Rapid fee collection counter with barcode lookup, multi-head itemization, partial payment handling, instant thermal or dual-copy A4 receipt printing, and WhatsApp slip dispatch.",
    "highlights": [
      "Dual-Copy A4 & Thermal Slips",
      "Cash / Cheque / UPI / Gateway",
      "Auto WhatsApp Receipt Message",
      "Real-Time Daily Counter Summary"
    ],
    "targetUser": "Accountants & Cashiers",
    "workflow": "Student Lookup -> Head Selection -> Cash/UPI/Gateway -> Instant Printed Slip"
  },
  {
    "category": "finance",
    "title": "Comprehensive Fee Structure Master",
    "icon": "pi pi-sitemap",
    "tag": "Fee Configuration",
    "badge": "Flexible Rules",
    "color": "#0284c7",
    "lightColor": "#f0f9ff",
    "gradient": "linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)",
    "desc": "Annual, term, and monthly fee head definitions (Tuition, Development, Library, Lab, Sports, Transport), class-wise assignment, and customizable installment schedules.",
    "highlights": [
      "Unlimited Fee Heads",
      "One-Time vs Recurring Heads",
      "Custom Due Date Schedules",
      "Class-wise Fee Rules"
    ],
    "targetUser": "Finance Directors & Chief Accountants",
    "workflow": "Define Fee Heads -> Set Installment Schedules -> Map to Classes -> Activate Structure"
  },
  {
    "category": "finance",
    "title": "Class Fee Prospectus & Structure Slip",
    "icon": "pi pi-file-pdf",
    "tag": "Admission Prospectus",
    "badge": "A4 Prospectus",
    "color": "#2563eb",
    "lightColor": "#eff6ff",
    "gradient": "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)",
    "desc": "Clean, official class-wise fee breakdown slip detailing annual costs, mandatory vs optional heads, installment due dates, and school payment policies for parents.",
    "highlights": [
      "Full A4 Prospectus Frame",
      "One-Time vs Term Breakup",
      "Official Signatures & Stamp",
      "Installment Due Calendar"
    ],
    "targetUser": "Admissions Desk & Parents",
    "workflow": "Select Class -> View Breakdown -> 1-Click Print Prospectus -> Handover to Parent"
  },
  {
    "category": "finance",
    "title": "Student Fee Dues & Defaulter Tracking",
    "icon": "pi pi-exclamation-circle",
    "tag": "Dues Collection",
    "badge": "Auto Defaulters",
    "color": "#dc2626",
    "lightColor": "#fef2f2",
    "gradient": "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)",
    "desc": "Student-wise fee ledger, outstanding balance tracking, automatic late fine computation, customizable reminder notices, and defaulter list export.",
    "highlights": [
      "Automated Late Fine Rules",
      "Class-wise Defaulter Lists",
      "SMS/WhatsApp Payment Reminders",
      "Historical Payment Ledger"
    ],
    "targetUser": "Accounts Department",
    "workflow": "Filter Dues by Class -> Check Overdue Days -> Send Payment Reminders -> Record Collection"
  },
  {
    "category": "finance",
    "title": "Fee Discount & Concession Master",
    "icon": "pi pi-percentage",
    "tag": "Financial Aid",
    "badge": "Approval Workflow",
    "color": "#7c3aed",
    "lightColor": "#f5f3ff",
    "gradient": "linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)",
    "desc": "Merit scholarships, sibling concessions, staff ward waivers, RTE exemptions, and custom percentage/fixed fee discounts with audit logs.",
    "highlights": [
      "Sibling Concession Logic",
      "Merit & Need-based Waivers",
      "RTE Compliance Discounts",
      "Strict Manager Approval Logs"
    ],
    "targetUser": "Management & Fee In-charge",
    "workflow": "Create Concession Scheme -> Apply to Eligible Student -> Administrative Approval -> Automatic Bill Discount"
  },
  {
    "category": "finance",
    "title": "Financial Fee Reports & Analytics",
    "icon": "pi pi-chart-bar",
    "tag": "Financial Analytics",
    "badge": "Executive BI",
    "color": "#4338ca",
    "lightColor": "#eef2ff",
    "gradient": "linear-gradient(135deg, #4338ca 0%, #6366f1 100%)",
    "desc": "Daily collection register, payment mode breakup (Cash, Bank, UPI, POS), head-wise collection breakdown, class collection ratios, and exportable financial summaries.",
    "highlights": [
      "Daily Cashier Closing Book",
      "Head-wise Revenue Breakup",
      "Payment Mode Analytics",
      "Direct Excel & PDF Export"
    ],
    "targetUser": "Auditors, Accountants & Trustees",
    "workflow": "Select Date Range -> View Consolidated Analytics -> Audit Modes -> Export Financial Reports"
  },
  {
    "category": "finance",
    "title": "School Expense Management & Petty Cash",
    "icon": "pi pi-chart-line",
    "tag": "Expense & Audit",
    "badge": "Audit Trail",
    "color": "#0d9488",
    "lightColor": "#f0fdfa",
    "gradient": "linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)",
    "desc": "Petty cash tracking, operational expense categories, bill attachments, voucher receipts, and branch-level financial auditing.",
    "highlights": [
      "Petty Cash Accounts",
      "Voucher Numbering Series",
      "Expense Trend Analytics",
      "Bill Attachment Archives"
    ],
    "targetUser": "Accountant & Manager",
    "workflow": "Voucher Request -> Bill Document Upload -> Manager Approval -> Ledger Entry"
  },
  {
    "category": "finance",
    "title": "Isolated Slip & Voucher Designer",
    "icon": "pi pi-desktop",
    "tag": "Custom Slips",
    "badge": "Print Customization",
    "color": "#0891b2",
    "lightColor": "#ecfeff",
    "gradient": "linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)",
    "desc": "Visual customizers for Fee Receipts, Admission Slips, and Enquiry Slips with custom typography, borders, logos, signatures, and full A4 border framing.",
    "highlights": [
      "Live WYSIWYG Preview",
      "Custom Logo & Stamp Placements",
      "Print Margin & Padding Controls",
      "Complete A4 Enclosed Border"
    ],
    "targetUser": "System Administrators",
    "workflow": "Open Slip Designer -> Toggle Elements -> Adjust Branding -> Instant Print Preview"
  },
  {
    "category": "academics",
    "title": "Smart Student Attendance",
    "icon": "pi pi-check-circle",
    "tag": "Daily Operations",
    "badge": "1-Click Roll Call",
    "color": "#2563eb",
    "lightColor": "#eff6ff",
    "gradient": "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)",
    "desc": "Class-wise daily student roll-call attendance registers, monthly percentage reports, staff presence logs, and leave approval workflows.",
    "highlights": [
      "1-Click Roll-Call Register",
      "Monthly % Attendance Reports",
      "Parent Absent Alerts",
      "Holiday Calendar Sync"
    ],
    "targetUser": "Class Teachers & HR",
    "workflow": "Class Selection -> Mark Present/Absent -> Save Register -> Instant Parent Alert"
  },
  {
    "category": "academics",
    "title": "Monthly Attendance Register & % Summaries",
    "icon": "pi pi-calendar-times",
    "tag": "Attendance Audit",
    "badge": "CBSE % Threshold",
    "color": "#1d4ed8",
    "lightColor": "#eff6ff",
    "gradient": "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)",
    "desc": "Month-wise 31-day visual attendance sheet per class, working days count, attendance percentage calculation, and low-attendance alert lists for exam eligibility.",
    "highlights": [
      "31-Day Heatmap Grid",
      "Calculated Monthly %",
      "Below 75% Defaulter Alert",
      "Printable Monthly Register"
    ],
    "targetUser": "Principals & Academic Coordinators",
    "workflow": "Select Month & Class -> Review Student % -> Identify Short Attendance -> Print Monthly Sheet"
  },
  {
    "category": "academics",
    "title": "Class & Section Timetable Matrix",
    "icon": "pi pi-calendar",
    "tag": "Academic Planning",
    "badge": "Visual Grid",
    "color": "#0284c7",
    "lightColor": "#f0f9ff",
    "gradient": "linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)",
    "desc": "Weekly timetable schedule per class and section, period timings, break intervals, lab/library sessions, and visual conflict alerts.",
    "highlights": [
      "Visual Weekly Grids",
      "Automated Bell Timings",
      "Smart Proxy Substitution",
      "Printable Class Schedule"
    ],
    "targetUser": "Academic Coordinators",
    "workflow": "Period Matrix -> Teacher Assignment -> Conflict Check -> Live Display"
  },
  {
    "category": "academics",
    "title": "Teacher Timetable & Workload Matrix",
    "icon": "pi pi-clock",
    "tag": "Faculty Allocation",
    "badge": "Workload Balancing",
    "color": "#0369a1",
    "lightColor": "#f0f9ff",
    "gradient": "linear-gradient(135deg, #0369a1 0%, #0284c7 100%)",
    "desc": "Faculty-wise period matrix, weekly period quota tracking, free period indicators, and balanced teaching workload distribution.",
    "highlights": [
      "Teacher Weekly Period Counts",
      "Free Period Finder",
      "Workload Balancing",
      "Individual Teacher Time Slips"
    ],
    "targetUser": "Vice Principals & Coordinators",
    "workflow": "Select Faculty -> Inspect Weekly Schedule -> Balance Workload -> Print Faculty Roster"
  },
  {
    "category": "academics",
    "title": "Smart Proxy Substitution & Bell Timings",
    "icon": "pi pi-sync",
    "tag": "Automation",
    "badge": "Auto Proxy",
    "color": "#0284c7",
    "lightColor": "#f0f9ff",
    "gradient": "linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)",
    "desc": "Intelligent automated substitution suggesting proxy faculty for absent teachers by subject specialization and free periods.",
    "highlights": [
      "Automatic Absent Teacher Detection",
      "Smart Specialization Matching",
      "Proxy Slip Printing",
      "WhatsApp Alert to Assigned Proxy"
    ],
    "targetUser": "Daily Timetable In-charge",
    "workflow": "Mark Absent Teacher -> AI Finds Free Faculty -> 1-Click Assign -> Notify Teacher"
  },
  {
    "category": "academics",
    "title": "Class-Subject Curriculum Mapping",
    "icon": "pi pi-bookmark",
    "tag": "Curriculum",
    "badge": "Board Compliant",
    "color": "#4f46e5",
    "lightColor": "#eef2ff",
    "gradient": "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
    "desc": "Complete mapping of subjects (Core, Elective, Additional) to classes and sections, credit hours, passing marks, and board syllabus guidelines.",
    "highlights": [
      "Mandatory vs Optional Subjects",
      "Theory & Practical Weightage",
      "Class-wise Subject Roster",
      "Board Curriculum Codes"
    ],
    "targetUser": "Academic Head & Exam Cell",
    "workflow": "Create Subjects -> Map to Classes -> Set Evaluation Weightage -> Link with Teachers"
  },
  {
    "category": "academics",
    "title": "Class Homework & Daily Assignments",
    "icon": "pi pi-pencil",
    "tag": "Classroom Learning",
    "badge": "Digital Homework",
    "color": "#7c3aed",
    "lightColor": "#f5f3ff",
    "gradient": "linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)",
    "desc": "Daily subject-wise homework publishing with assignment descriptions, attachment files, submission due dates, and instant delivery to student/parent portals.",
    "highlights": [
      "Subject-wise Homework Posting",
      "Document & Image Attachments",
      "Submission Due Date Tracking",
      "Parent Portal Notification"
    ],
    "targetUser": "Subject Teachers & Students",
    "workflow": "Teacher Posts Assignment -> Attaches Study Material -> Published to Portal -> Parent Notified"
  },
  {
    "category": "academics",
    "title": "Exam Terms & Date Sheet Scheduler",
    "icon": "pi pi-calendar-plus",
    "tag": "Assessments",
    "badge": "CBSE / State Board",
    "color": "#4338ca",
    "lightColor": "#eef2ff",
    "gradient": "linear-gradient(135deg, #4338ca 0%, #6366f1 100%)",
    "desc": "Term examination creation (Unit Tests, Mid-Term, Half-Yearly, Annual), subject-wise exam dates, session timings, and printable date sheets for students.",
    "highlights": [
      "Multi-Term Exam Architecture",
      "Subject-wise Date & Shift Scheduler",
      "Student Date Sheet Printing",
      "Admit Card Generation"
    ],
    "targetUser": "Exam In-charge & Academic Cell",
    "workflow": "Create Exam Term -> Add Subject Dates & Times -> Check Date Gaps -> Print Date Sheets"
  },
  {
    "category": "academics",
    "title": "Exam Schedule & Seating Management",
    "icon": "pi pi-th-large",
    "tag": "Exam Operations",
    "badge": "Hall Seating",
    "color": "#3730a3",
    "lightColor": "#eef2ff",
    "gradient": "linear-gradient(135deg, #3730a3 0%, #4338ca 100%)",
    "desc": "Examination hall allocations, roll number seat matrices, room capacity management, and invigilator duty allocation.",
    "highlights": [
      "Room Capacity Allocation",
      "Roll Number Seating Grid",
      "Invigilation Duty Matrix",
      "Hall Door Seating Charts"
    ],
    "targetUser": "Exam Controllers",
    "workflow": "Allocate Rooms -> Map Students to Desks -> Assign Faculty Invigilators -> Print Room Slips"
  },
  {
    "category": "academics",
    "title": "Subject Teacher Marks Entry Grid",
    "icon": "pi pi-file-edit",
    "tag": "Evaluation",
    "badge": "Fast Spreadsheet",
    "color": "#4f46e5",
    "lightColor": "#eef2ff",
    "gradient": "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
    "desc": "Intuitive spreadsheet-style marks entry grid for teachers, supporting Theory, Practical, Periodic Tests, and Internal Assessments with validation locks.",
    "highlights": [
      "Fast Tab-key Grid Entry",
      "Theory & Practical Separate Columns",
      "Absent / Medical Flagging",
      "Max Marks Validation Lock"
    ],
    "targetUser": "Subject Teachers & Evaluators",
    "workflow": "Select Class, Subject & Exam -> Enter Marks in Spreadsheet Grid -> Validate Limits -> Submit for Grading"
  },
  {
    "category": "academics",
    "title": "Automated Grading & Student Marks Cards",
    "icon": "pi pi-calculator",
    "tag": "Grading Engine",
    "badge": "Auto Grade & Rank",
    "color": "#6366f1",
    "lightColor": "#eef2ff",
    "gradient": "linear-gradient(135deg, #6366f1 0%, #818cf8 100%)",
    "desc": "Automatic percentage, CGPA, and letter grade calculations according to CBSE 8-point / 9-point scale, class rank generation, and student marks cards.",
    "highlights": [
      "Configurable Grading Scales",
      "Automatic CGPA & Percentage",
      "Class Rank Determination",
      "Subject Highest Marks Comparison"
    ],
    "targetUser": "Exam Cell & Class Teachers",
    "workflow": "Finalize Marks -> Run Auto-Grading Engine -> Verify Grade Bounds -> Generate Marks Slips"
  },
  {
    "category": "academics",
    "title": "Exams & Automated Report Cards",
    "icon": "pi pi-file-edit",
    "tag": "Report Cards",
    "badge": "CBSE / ICSE",
    "color": "#4f46e5",
    "lightColor": "#eef2ff",
    "gradient": "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
    "desc": "Term-wise date sheets, subject teacher marks entry, automated grading/percentage calculations, and printable CBSE/ICSE report cards.",
    "highlights": [
      "Subject Marks Entry Grid",
      "Automated Grade & Rank Calc",
      "1-Click Multi-Term Slips",
      "Personalized Faculty Remarks"
    ],
    "targetUser": "Exam Cell & Faculty",
    "workflow": "Exam Date Sheet -> Faculty Marks Entry -> Auto Grading -> Download Report Cards"
  },
  {
    "category": "academics",
    "title": "Promotion & Transfer Certificates",
    "icon": "pi pi-arrow-up-right",
    "tag": "Student Lifecycle",
    "badge": "QR Verifiable",
    "color": "#0891b2",
    "lightColor": "#ecfeff",
    "gradient": "linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)",
    "desc": "Session-end 1-click bulk student promotion and formal verifiable Transfer Certificate (TC) issuance with QR verification.",
    "highlights": [
      "Bulk Class Promotion",
      "Official TC Numbering",
      "Tamper-Proof QR Code",
      "Dues Clearance Check"
    ],
    "targetUser": "Principals & Registrars",
    "workflow": "Select Class -> Academic Criteria -> 1-Click Promote -> Formal TC Archive"
  },
  {
    "category": "academics",
    "title": "Transfer Certificate (TC) with Tamper-Proof QR",
    "icon": "pi pi-verified",
    "tag": "Student Exit",
    "badge": "Govt Standard",
    "color": "#059669",
    "lightColor": "#ecfdf5",
    "gradient": "linear-gradient(135deg, #059669 0%, #10b981 100%)",
    "desc": "Statutory school Transfer Certificate (TC) generator adhering to board bylaws, sequential TC numbering series, reason for leaving, and verifiable public QR code.",
    "highlights": [
      "Statutory 20-Point CBSE Format",
      "Tamper-Proof Verification QR",
      "Sequential TC Numbering",
      "Complete Dues Clearance Check"
    ],
    "targetUser": "Principals & Registrars",
    "workflow": "TC Application -> Dues Verification -> Generate TC Number -> Print Official A4 Certificate"
  },
  {
    "category": "academics",
    "title": "Statutory Bonafide & Institutional Certificates",
    "icon": "pi pi-file-check",
    "tag": "Certificates",
    "badge": "5+ Legal Formats",
    "color": "#0d9488",
    "lightColor": "#f0fdfa",
    "gradient": "linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)",
    "desc": "Instant generation of legal institutional certificates including Bonafide Student, Date of Birth (DOB) extract, Certificate of Age, Character Certificate, and RTE Verification.",
    "highlights": [
      "Bonafide & Character Certificates",
      "Date of Birth (DOB) Statutory Extract",
      "Certificate of Age Calculation",
      "Custom Accent Colors & Letterheads"
    ],
    "targetUser": "Office Clerks & Principals",
    "workflow": "Select Student -> Choose Certificate Type -> Select Purpose -> Print Full A4 Certificate"
  },
  {
    "category": "hr",
    "title": "Staff Directory & HR Payroll",
    "icon": "pi pi-users",
    "tag": "Staff HR",
    "badge": "Full Lifecycle",
    "color": "#7c3aed",
    "lightColor": "#f5f3ff",
    "gradient": "linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)",
    "desc": "Complete employee credentials, qualification tracking, salary structures, class teacher allocations, and faculty subject mapping.",
    "highlights": [
      "Employee KYC & Records",
      "Teacher Subject Allocations",
      "Monthly Salary & Leaves",
      "Service Book Management"
    ],
    "targetUser": "HR & Administrative Head",
    "workflow": "Staff Onboarding -> Class Mapping -> Biometric Attendance -> Payroll Generation"
  },
  {
    "category": "hr",
    "title": "Teacher Class & Subject Allocation",
    "icon": "pi pi-user-edit",
    "tag": "Academic Staff",
    "badge": "Faculty Mapping",
    "color": "#6d28d9",
    "lightColor": "#f5f3ff",
    "gradient": "linear-gradient(135deg, #6d28d9 0%, #7c3aed 100%)",
    "desc": "Dedicated mapping tool to assign class teachers to sections and map subject specialist teachers across primary, secondary, and higher secondary grades.",
    "highlights": [
      "Class Teacher Designation",
      "Subject Specialist Assignments",
      "Visual Allocation Matrix",
      "Conflict Prevention"
    ],
    "targetUser": "Academic Coordinators & Principals",
    "workflow": "Select Teacher -> Assign Class Teacher Role -> Map Subject Classes -> Save Allocation Matrix"
  },
  {
    "category": "hr",
    "title": "Staff Attendance & Biometric Tracking",
    "icon": "pi pi-user-check",
    "tag": "Staff Attendance",
    "badge": "Shift Tracking",
    "color": "#2563eb",
    "lightColor": "#eff6ff",
    "gradient": "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)",
    "desc": "Daily punch-in/out logging for staff, biometric sync, leave application review, half-day recording, and monthly staff attendance register.",
    "highlights": [
      "Daily Manual & Biometric Log",
      "Approved Leave Integration",
      "Monthly Staff Duty Hours",
      "Absence Deductions Sync"
    ],
    "targetUser": "HR & Front Office",
    "workflow": "Daily Staff Check-in -> Review Late Arrivals -> Process Leaves -> Export Attendance Log"
  },
  {
    "category": "hr",
    "title": "Automated Monthly Staff Payroll & Salary Slips",
    "icon": "pi pi-money-bill",
    "tag": "Payroll & Salary",
    "badge": "Full A4 Slip",
    "color": "#059669",
    "lightColor": "#ecfdf5",
    "gradient": "linear-gradient(135deg, #059669 0%, #10b981 100%)",
    "desc": "Automated monthly payroll calculation based on attendance, earnings (Basic, HRA, DA, Allowances), deductions (PF, ESI, TDS, Leaves), and professional A4 salary slip printing.",
    "highlights": [
      "Auto Gross & Net Pay Calc",
      "Earnings & Deductions Itemization",
      "Enclosed A4 Salary Slip",
      "Bank Transfer Sheet & WhatsApp Share"
    ],
    "targetUser": "Accountants & HR Head",
    "workflow": "Select Month -> Sync Attendance & Leaves -> Calculate Net Pay -> Print Salary Slips & Bank Sheet"
  },
  {
    "category": "logistics",
    "title": "Transport Fleet & Route Tracking",
    "icon": "pi pi-car",
    "tag": "Fleet Logistics",
    "badge": "Route Mapping",
    "color": "#dc2626",
    "lightColor": "#fef2f2",
    "gradient": "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)",
    "desc": "Bus vehicles, driver licensing, pickup/drop route stops, timings, distance slabs, and student/staff seat allocations.",
    "highlights": [
      "Vehicle & Driver Matrix",
      "Route Stops & Pick Timings",
      "Distance Fare Slabs",
      "Seat Capacity Safety"
    ],
    "targetUser": "Transport In-charge",
    "workflow": "Create Route & Stops -> Assign Bus & Driver -> Allocate Students -> Fee Sync"
  },
  {
    "category": "logistics",
    "title": "Transport Bus Fleet & Vehicle Master",
    "icon": "pi pi-car",
    "tag": "Fleet Master",
    "badge": "Vehicle Security",
    "color": "#b91c1c",
    "lightColor": "#fef2f2",
    "gradient": "linear-gradient(135deg, #b91c1c 0%, #dc2626 100%)",
    "desc": "School bus and van tracking, registration numbers, vehicle fitness certificate expiry alerts, insurance documents, pollution checks, and driver/conductor profiles.",
    "highlights": [
      "Fitness & Insurance Expiry Alerts",
      "Driver & Conductor Licensing",
      "Vehicle Seating Capacity",
      "Maintenance & Service Log"
    ],
    "targetUser": "Transport In-charge & Fleet Admin",
    "workflow": "Register Vehicle -> Attach Insurance & Fitness Docs -> Assign Driver & Conductor -> Active Status"
  },
  {
    "category": "logistics",
    "title": "Transport Routes, Stops & Distance Slabs",
    "icon": "pi pi-map-marker",
    "tag": "Route Logistics",
    "badge": "Stop Schedules",
    "color": "#ea580c",
    "lightColor": "#fff7ed",
    "gradient": "linear-gradient(135deg, #ea580c 0%, #f97316 100%)",
    "desc": "Pickup and drop route creation, individual stop milestones, morning/evening timings, distance slabs, and route-wise monthly transport fee mapping.",
    "highlights": [
      "Morning & Evening Timings",
      "Distance-based Fare Slabs",
      "Ordered Route Milestones",
      "Fee Structure Integration"
    ],
    "targetUser": "Transport Manager",
    "workflow": "Define Route Name -> Add Ordered Stops & Times -> Set Fare Slabs -> Link Bus Vehicle"
  },
  {
    "category": "logistics",
    "title": "Student & Staff Transport Allocation",
    "icon": "pi pi-ticket",
    "tag": "Passenger Allocations",
    "badge": "Seat Management",
    "color": "#c2410c",
    "lightColor": "#fff7ed",
    "gradient": "linear-gradient(135deg, #c2410c 0%, #ea580c 100%)",
    "desc": "Student and staff bus seat bookings, route assignment, pickup stop selection, bus pass generation, and automated addition of transport fees to student fee dues.",
    "highlights": [
      "Seat Capacity Validation",
      "Pickup Stop Assignment",
      "Auto Transport Fee Addition",
      "Printable Bus Commuter Rosters"
    ],
    "targetUser": "Transport Office & Accounts",
    "workflow": "Select Student -> Assign Bus & Stop -> Automatic Transport Fee Sync -> Issue Bus Pass"
  },
  {
    "category": "logistics",
    "title": "School Inventory Store & Slip Setup",
    "icon": "pi pi-cog",
    "tag": "Supply Chain",
    "badge": "Store Configuration",
    "color": "#92400e",
    "lightColor": "#fffbeb",
    "gradient": "linear-gradient(135deg, #92400e 0%, #b45309 100%)",
    "desc": "Central store configuration, warehouse locations, departments, inventory slip formats, terms & conditions, and numbering series for stock documents.",
    "highlights": [
      "Warehouse Location Setup",
      "Departmental Cost Centers",
      "Custom Slip Layouts",
      "Sequential Stock Voucher Numbers"
    ],
    "targetUser": "Storekeeper & Procurement Manager",
    "workflow": "Configure Main Store -> Define Department Locations -> Set Voucher Formats -> Activate Store"
  },
  {
    "category": "logistics",
    "title": "Inventory & Stock Management",
    "icon": "pi pi-box",
    "tag": "Supply Chain",
    "badge": "Real-time Stock",
    "color": "#b45309",
    "lightColor": "#fffbeb",
    "gradient": "linear-gradient(135deg, #b45309 0%, #d97706 100%)",
    "desc": "Uniforms, books, stationery, item categories, supplier directory, purchase inward bills, department stock issue, and stock ledger.",
    "highlights": [
      "Purchase Inward Bills",
      "Department Issue Slips",
      "Real-Time Stock Ledger",
      "Low Stock Threshold Alerts"
    ],
    "targetUser": "Storekeeper & Procurement",
    "workflow": "Supplier PO -> Inward Stock Verification -> Department Issue -> Ledger Audit"
  },
  {
    "category": "logistics",
    "title": "Inventory Items Master & Categories",
    "icon": "pi pi-tags",
    "tag": "Stock Catalog",
    "badge": "Item Matrix",
    "color": "#d97706",
    "lightColor": "#fffbeb",
    "gradient": "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)",
    "desc": "Complete product catalog for textbooks, school uniforms, sports equipment, stationery, laboratory chemicals, and cleaning supplies with unit of measure and reorder levels.",
    "highlights": [
      "SKU Code & Item Categorization",
      "Unit of Measure (UOM)",
      "Minimum Reorder Level Alerts",
      "Tax Rate & Standard Cost"
    ],
    "targetUser": "Inventory Managers",
    "workflow": "Create Category -> Add Item Specifications -> Set Minimum Stock Threshold -> Catalog Ready"
  },
  {
    "category": "logistics",
    "title": "Suppliers & Vendor Management",
    "icon": "pi pi-briefcase",
    "tag": "Procurement",
    "badge": "Vendor Directory",
    "color": "#0d9488",
    "lightColor": "#f0fdfa",
    "gradient": "linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)",
    "desc": "Complete vendor directory, contact personnel, GSTIN verification, credit terms, payment tracking, and purchase transaction histories.",
    "highlights": [
      "Vendor GSTIN & Contact Info",
      "Credit Period & Bank Details",
      "Purchase Order History",
      "Vendor Balance Tracking"
    ],
    "targetUser": "Purchase Department & Accounts",
    "workflow": "Onboard Vendor -> Record Terms -> Issue Purchase Orders -> Verify Deliveries"
  },
  {
    "category": "logistics",
    "title": "Stock Inward & Department Issue (Outward)",
    "icon": "pi pi-arrow-right-arrow-left",
    "tag": "Material Dispatches",
    "badge": "Inward & Issue",
    "color": "#059669",
    "lightColor": "#ecfdf5",
    "gradient": "linear-gradient(135deg, #059669 0%, #10b981 100%)",
    "desc": "Purchase order receipts, vendor invoice recording, departmental requisitions, issue of items to science labs, libraries, teachers, and classrooms with authorized signature slips.",
    "highlights": [
      "Vendor Invoice Number Sync",
      "Batch & Expiry Date Tracking",
      "Authorized Issue Signature Slips",
      "Real-Time Stock Depletion"
    ],
    "targetUser": "Storekeeper & Department Heads",
    "workflow": "Receive Inward Goods -> Store in Warehouse -> Department Requisition -> Issue Material with Slip"
  },
  {
    "category": "logistics",
    "title": "Stock Movement Ledger & Item Returns",
    "icon": "pi pi-history",
    "tag": "Audit & Reconciliation",
    "badge": "Real-Time Ledger",
    "color": "#0284c7",
    "lightColor": "#f0f9ff",
    "gradient": "linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)",
    "desc": "Comprehensive bin-card style stock movement ledger tracking opening balance, inwards, issues, returns, and closing balance per item with date filters.",
    "highlights": [
      "Bin Card Stock Statement",
      "Uniform & Book Counter Sales",
      "Item Size Exchange Register",
      "Audited Physical vs System Count"
    ],
    "targetUser": "Auditors & School Management",
    "workflow": "Select Item & Date Range -> Generate Statement -> Reconcile Physical Stock -> Export Ledger"
  },
  {
    "category": "platform",
    "title": "Super Admin Multi-Tenant SaaS",
    "icon": "pi pi-building",
    "tag": "Enterprise Cloud",
    "badge": "Multi-Tenant",
    "color": "#0f172a",
    "lightColor": "#f8fafc",
    "gradient": "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
    "desc": "Executive portal to onboard infinite schools, toggle module catalogs, configure subscription plans, and inspect global audit logs.",
    "highlights": [
      "Infinite School Onboarding",
      "Module Feature Flags",
      "Subscription Tier Engine",
      "Central Database Isolations"
    ],
    "targetUser": "Trustees & Central Management",
    "workflow": "Tenant Onboarding -> Select Plan -> Assign Admin -> Global Dashboard"
  },
  {
    "category": "platform",
    "title": "Multi-Campus School & Branch Master",
    "icon": "pi pi-sitemap",
    "tag": "Campus Profiles",
    "badge": "Branding & Signatures",
    "color": "#1e3a8a",
    "lightColor": "#eff6ff",
    "gradient": "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
    "desc": "Official school details, branch names, affiliation codes (CBSE/ICSE/State), primary & alternate contact numbers, official logo upload, and principal/cashier signature graphics.",
    "highlights": [
      "Alternate Phone Support",
      "Official Logo & Stamp Upload",
      "Principal & Cashier Signatures",
      "CBSE/ICSE Affiliation Details"
    ],
    "targetUser": "Principals & School Owners",
    "workflow": "Update School Profile -> Upload Logo & Signatures -> Add Alternate Phones -> Auto-Applied across All Slips"
  },
  {
    "category": "platform",
    "title": "Granular Role-Based Security (RBAC)",
    "icon": "pi pi-shield",
    "tag": "Security & RBAC",
    "badge": "Bank Grade",
    "color": "#1e3a8a",
    "lightColor": "#eff6ff",
    "gradient": "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
    "desc": "Screen-level View, Add, Edit, Delete, Print and Export permissions for Principals, Accountants, Teachers, and Clerks.",
    "highlights": [
      "Granular Screen Permissions",
      "Print & Export Locks",
      "Full Mutation Audit Trail",
      "Dynamic Policy Enforcement"
    ],
    "targetUser": "System Administrator",
    "workflow": "Define Custom Roles -> Matrix Checkboxes -> Assign Users -> Active Policy"
  },
  {
    "category": "platform",
    "title": "User Management & Multi-Campus Access",
    "icon": "pi pi-lock",
    "tag": "Identity Management",
    "badge": "Multi-Campus",
    "color": "#334155",
    "lightColor": "#f1f5f9",
    "gradient": "linear-gradient(135deg, #334155 0%, #475569 100%)",
    "desc": "Staff login creation, password policies, multi-branch assignment, active/inactive suspension toggle, and last login tracking.",
    "highlights": [
      "Multi-Branch Switching",
      "Secure Hashed Passwords",
      "1-Click Account Suspension",
      "User Activity Timestamps"
    ],
    "targetUser": "IT Administrators",
    "workflow": "Create User -> Link to Staff Record -> Assign Branch & Role -> Send Login Credentials"
  },
  {
    "category": "platform",
    "title": "Academic Year Management & Sessions",
    "icon": "pi pi-calendar",
    "tag": "Session Management",
    "badge": "Active Session",
    "color": "#0284c7",
    "lightColor": "#f0f9ff",
    "gradient": "linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)",
    "desc": "Multi-year academic session setup (e.g. 2026-27, 2027-28), start/end date configuration, active session lock, and global instant session switcher.",
    "highlights": [
      "Multi-Session Support",
      "Active Session Tagging",
      "Global Header Session Switcher",
      "Historical Data Isolation"
    ],
    "targetUser": "System Administrators",
    "workflow": "Add Academic Session -> Set Start/End Dates -> Mark Active -> All Data Filters Updated"
  },
  {
    "category": "platform",
    "title": "Custom Numbering Series Engine",
    "icon": "pi pi-hashtag",
    "tag": "Document Control",
    "badge": "Prefix & Padding",
    "color": "#059669",
    "lightColor": "#ecfdf5",
    "gradient": "linear-gradient(135deg, #059669 0%, #10b981 100%)",
    "desc": "Automated, customizable sequential numbering series for Admissions, Enquiries, Fee Receipts, Gate Passes, Salary Slips, and Vouchers with branch-specific prefixes.",
    "highlights": [
      "Custom Prefixes & Suffixes",
      "Configurable Digit Padding",
      "Auto-Increment with Lock Protection",
      "Separate Series per Document Type"
    ],
    "targetUser": "Administrators & Accountants",
    "workflow": "Select Document Type -> Set Prefix (e.g. DPS/RCP/) -> Set Starting Number -> Seamless Sequential Numbering"
  },
  {
    "category": "platform",
    "title": "System Audit Logs & Mutation Tracking",
    "icon": "pi pi-eye",
    "tag": "Compliance & Security",
    "badge": "Audit Trail",
    "color": "#475569",
    "lightColor": "#f8fafc",
    "gradient": "linear-gradient(135deg, #475569 0%, #64748b 100%)",
    "desc": "Tamper-evident system activity logging recording every record creation, modification, deletion, fee adjustment, and administrative login with IP and timestamps.",
    "highlights": [
      "Mutation Delta Tracking",
      "User IP Address & Timestamp",
      "Action Categorization",
      "Non-Deletable Security Log"
    ],
    "targetUser": "Management & External Auditors",
    "workflow": "User Performs Mutation -> System Captures Payload -> Permanent Log Stored -> Audit Inspection"
  },
  {
    "category": "platform",
    "title": "Central Analytical Reports Hub",
    "icon": "pi pi-chart-bar",
    "tag": "BI & Analytics",
    "badge": "Executive BI",
    "color": "#4338ca",
    "lightColor": "#eef2ff",
    "gradient": "linear-gradient(135deg, #4338ca 0%, #6366f1 100%)",
    "desc": "Consolidated multi-branch reporting covering fee collection trends, defaulters, daily attendance ratios, and institutional growth.",
    "highlights": [
      "Fee Defaulter Rosters",
      "Attendance Ratio Graphs",
      "Export to Excel & PDF",
      "Multi-Branch Comparative Charts"
    ],
    "targetUser": "Trustees & Directors",
    "workflow": "Select Branch & Range -> Live Calculation -> Chart Visualization -> Export"
  },
  {
    "category": "platform",
    "title": "Centralized A4 Print & Slip Engine",
    "icon": "pi pi-desktop",
    "tag": "Print Utility",
    "badge": "A4 Full-Border",
    "color": "#1e40af",
    "lightColor": "#eff6ff",
    "gradient": "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
    "desc": "Isolated iframe print engine guaranteeing complete A4 bordered framing, identical 8mm margins and paddings on all 4 sides, zero popup blocks, and no multi-page spills.",
    "highlights": [
      "Complete A4 Enclosed Border",
      "Uniform 8mm Margin on All 4 Sides",
      "Zero Background Clutter in Print",
      "Thermal & A4 Multi-Format Ready"
    ],
    "targetUser": "All Administrative Users",
    "workflow": "Click Print -> Isolated Iframe Injected -> A4 Sizing Applied -> Clean Official Printout"
  },
  {
    "category": "portal",
    "title": "Student & Parent Self-Service Portal",
    "icon": "pi pi-user",
    "tag": "Family Portal",
    "badge": "Multi-Child",
    "color": "#9333ea",
    "lightColor": "#faf5ff",
    "gradient": "linear-gradient(135deg, #9333ea 0%, #a855f7 100%)",
    "desc": "Dedicated login for students and parents featuring multi-child switching, live period timetables, attendance tracking, and instant fee receipts.",
    "highlights": [
      "Multi-Sibling Switcher",
      "Personalized Student Dashboard",
      "Direct Communication with School",
      "Mobile Responsive Layout"
    ],
    "targetUser": "Parents & Students",
    "workflow": "Parent Login -> Choose Child -> View Attendance & Dues -> Download Receipts"
  },
  {
    "category": "portal",
    "title": "Live Class Timetable & Bell Schedule",
    "icon": "pi pi-calendar",
    "tag": "Daily Schedule",
    "badge": "Period Matrix",
    "color": "#0284c7",
    "lightColor": "#f0f9ff",
    "gradient": "linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)",
    "desc": "Real-time class timetable grid showing daily periods, subject names, assigned faculty, and bell timings for students and parents.",
    "highlights": [
      "Day-wise Period Grid",
      "Subject & Teacher Names",
      "Bell & Recess Timings",
      "Proxy Substitution Live Updates"
    ],
    "targetUser": "Students & Parents",
    "workflow": "Open Timetable Tab -> Select Day -> View Period Schedule -> Prepare School Bag"
  },
  {
    "category": "portal",
    "title": "Daily & Monthly Attendance Logs",
    "icon": "pi pi-check-circle",
    "tag": "Attendance Portal",
    "badge": "Attendance History",
    "color": "#2563eb",
    "lightColor": "#eff6ff",
    "gradient": "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)",
    "desc": "Transparent view of student daily attendance history with Present, Absent, Late, and Leave status flags alongside monthly percentage metrics.",
    "highlights": [
      "Calendar Attendance Visualizer",
      "Current Month Percentage",
      "Absent Date History",
      "Official Attendance Records"
    ],
    "targetUser": "Parents & Students",
    "workflow": "Open Attendance Tab -> View Monthly Calendar -> Inspect Absent Days -> Track 75% Requirement"
  },
  {
    "category": "portal",
    "title": "Term Marks, Report Cards & Grade Slips",
    "icon": "pi pi-file-edit",
    "tag": "Academic Results",
    "badge": "Instant Results",
    "color": "#4f46e5",
    "lightColor": "#eef2ff",
    "gradient": "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
    "desc": "Immediate access to published examination marks, subject grades, total scores, class rankings, and 1-click download of official CBSE report cards.",
    "highlights": [
      "Subject-wise Marks & Grades",
      "Term Comparison History",
      "Teacher Remarks View",
      "1-Click Official Report Card PDF"
    ],
    "targetUser": "Students & Parents",
    "workflow": "Open Exams Tab -> Select Exam Term -> View Detailed Scores -> Download Report Card PDF"
  },
  {
    "category": "portal",
    "title": "Instant Fee Receipts & Online Dues",
    "icon": "pi pi-wallet",
    "tag": "Fee Portal",
    "badge": "Receipts Download",
    "color": "#059669",
    "lightColor": "#ecfdf5",
    "gradient": "linear-gradient(135deg, #059669 0%, #10b981 100%)",
    "desc": "Complete historical record of all paid fee receipts, outstanding fee breakdown, due dates, and instant download of official signed payment vouchers.",
    "highlights": [
      "Historical Paid Receipts Archive",
      "1-Click PDF Receipt Download",
      "Outstanding Fee Head Breakdown",
      "Due Date Countdown"
    ],
    "targetUser": "Parents & Guardians",
    "workflow": "Open Fees Tab -> Inspect Pending Dues -> View Paid Invoices -> Download Official Receipt PDF"
  },
  {
    "category": "portal",
    "title": "Circulars, Homework & Digital Notices",
    "icon": "pi pi-bell",
    "tag": "School Notices",
    "badge": "Daily Updates",
    "color": "#ea580c",
    "lightColor": "#fff7ed",
    "gradient": "linear-gradient(135deg, #ea580c 0%, #f97316 100%)",
    "desc": "Digital notice board displaying official school circulars, event announcements, daily homework assignments with teacher attachments, and holiday alerts.",
    "highlights": [
      "Subject-wise Homework Descriptions",
      "Downloadable Assignment Files",
      "Urgent School Circulars",
      "Event & Exam Announcements"
    ],
    "targetUser": "Students & Parents",
    "workflow": "Open Notices / Homework Tab -> Read Announcement -> Download Attachment -> Complete Homework"
  },
  {
    "category": "portal",
    "title": "NCERT E-Books Digital Reader (Class 6-12)",
    "icon": "pi pi-book",
    "tag": "Digital Library",
    "badge": "Free Library",
    "color": "#0284c7",
    "lightColor": "#f0f9ff",
    "gradient": "linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)",
    "desc": "Complete syllabus textbooks for Mathematics, Science, English, Social Science & Physics with embedded HD reader, chapters breakdown, and direct PDF downloads.",
    "highlights": [
      "Classes 6 to 12 Covered",
      "Chapter-wise HD Reader",
      "Offline PDF Downloads",
      "Zero Additional Cost"
    ],
    "targetUser": "Students & Faculty",
    "workflow": "Select Class -> Select Subject -> Open Chapter -> Read or Download"
  },
  {
    "category": "portal",
    "title": "AI Study Buddy (24/7 Doubt Solver)",
    "icon": "pi pi-sparkles",
    "tag": "Next-Gen AI Tutor",
    "badge": "AI Powered",
    "color": "#ec4899",
    "lightColor": "#fdf2f8",
    "gradient": "linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)",
    "desc": "Smart interactive study buddy providing instantaneous, curriculum-aligned homework explanations, mathematical concept breakdowns, and grammar practice.",
    "highlights": [
      "Instant Doubt Clarification",
      "CBSE Syllabus Aligned",
      "Step-by-Step Explanations",
      "Friendly Encouraging Mentor"
    ],
    "targetUser": "Students & Self-Learners",
    "workflow": "Type Homework Question -> Instant AI Explanation -> Interactive Practice Qs"
  }
];

  const filteredModules = categorizedModules.filter(item => {
    const matchesTab = activeTab === 'all' || item.category === activeTab;
    const q = moduleSearch.trim().toLowerCase();
    const matchesSearch = !q || 
      item.title.toLowerCase().includes(q) ||
      item.desc.toLowerCase().includes(q) ||
      item.tag.toLowerCase().includes(q) ||
      (item.targetUser && item.targetUser.toLowerCase().includes(q)) ||
      (item.highlights && item.highlights.some(h => h.toLowerCase().includes(q)));
    return matchesTab && matchesSearch;
  });

  const edumarshalFaqs = [
    {
      q: 'What is a School ERP software & Management System?',
      a: 'A School ERP is a unified cloud platform that connects every department of your institution — admissions, academics, daily attendance, fee counter POS, examinations, report cards, transport, and inventory — onto a single real-time database instead of disjointed Excel registers.'
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
      a: 'Yes. When student attendance is recorded in the portal by teachers, automated parent communication and absent/leave tracking keep families instantly informed.'
    },
    {
      q: 'Is there a dedicated Portal for Students & Parents?',
      a: 'Yes! Students and parents have a specialized login portal with a multi-child switcher, live daily period timetable grids, attendance calendars, term exam report cards, digital fee receipts, and school circulars.'
    },
    {
      q: 'What is the NCERT Digital E-Books Reader and AI Study Buddy?',
      a: 'The student portal includes a built-in digital library with official NCERT textbooks (Classes 6 to 12) featuring chapter-wise online reading and direct PDF downloads, plus a 24/7 AI Study Buddy tutor that explains concepts, solves homework doubts, and guides students step-by-step.'
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }} onClick={() => window.scrollTo(0,0)}>
              <Box 
                component="img"
                src="/dvslogo1.jpeg"
                alt="Digital Vidya Saarthi Logo"
                sx={{ 
                  width: { xs: 44, sm: 50 }, 
                  height: { xs: 44, sm: 50 }, 
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 2px 6px rgba(10,56,124,0.18))',
                  transition: 'transform 0.2s ease-in-out',
                  '&:hover': { transform: 'scale(1.05)' }
                }}
              />
              <Box>
                <Typography variant="h6" fontWeight="900" sx={{ color: '#0a387c', lineHeight: 1.1, letterSpacing: '-0.02em', fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
                  Digital Vidya <span style={{ color: '#12233f' }}>Saarthi</span>
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: { xs: '0.62rem', sm: '0.68rem' }, display: 'block' }}>
                  Smart Workflow, Zero Chaos
                </Typography>
              </Box>
            </Box>

            {/* Desktop Navigation Links */}
            <Box sx={{ display: { xs: 'none', lg: 'flex' }, gap: 3.5, alignItems: 'center' }}>
              <a href="#" style={{ textDecoration: 'none', color: '#12233f', fontWeight: 700, fontSize: '0.92rem' }}>Home</a>
              <a href="#clients" style={{ textDecoration: 'none', color: '#475569', fontWeight: 600, fontSize: '0.92rem' }}>Our Clients</a>
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
                  borderColor: isAuthenticated ? '#0284c7' : '#cbd5e1', 
                  bgcolor: isAuthenticated ? '#0284c7' : 'transparent',
                  color: isAuthenticated ? '#ffffff' : '#0a387c',
                  textTransform: 'none',
                  boxShadow: isAuthenticated ? '0 4px 14px rgba(2, 132, 199, 0.4)' : 'none',
                  '&:hover': {
                    borderColor: '#0284c7',
                    bgcolor: isAuthenticated ? '#0369a1' : '#f1f5f9'
                  }
                }} 
                onClick={() => navigate(isAuthenticated ? homeRoute : '/login')}
              >
                {isAuthenticated ? 'Go to Dashboard →' : 'Portal Login'}
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <Box 
              component="img"
              src="/dvslogo1.jpeg"
              alt="Digital Vidya Saarthi"
              sx={{ width: 34, height: 34, objectFit: 'contain' }}
            />
            <Typography variant="subtitle1" fontWeight={800} color="#0a387c">
              Digital Vidya Saarthi
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
            { label: 'Our Clients & Schools', href: '#clients' },
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
            variant={isAuthenticated ? "contained" : "outlined"} 
            fullWidth
            sx={{ 
              borderRadius: 99, 
              py: 1.1, 
              fontWeight: 800, 
              fontSize: '0.92rem',
              borderColor: isAuthenticated ? '#0284c7' : '#0a387c', 
              bgcolor: isAuthenticated ? '#0284c7' : 'transparent',
              color: isAuthenticated ? '#ffffff' : '#0a387c',
              textTransform: 'none',
              boxShadow: isAuthenticated ? '0 4px 14px rgba(2, 132, 199, 0.4)' : 'none',
              '&:hover': {
                bgcolor: isAuthenticated ? '#0369a1' : 'rgba(10, 56, 124, 0.06)'
              }
            }} 
            onClick={() => {
              setMobileDrawerOpen(false);
              navigate(isAuthenticated ? homeRoute : '/login');
            }}
          >
            {isAuthenticated ? 'Go to Dashboard →' : 'Portal Login'}
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

      {/* Hero Section (Edumarshal Split Layout with EduERP.ai modern animations) */}
      <Box sx={{ 
        pt: { xs: 6, md: 10 }, pb: { xs: 8, md: 12 }, px: 2, 
        background: 'linear-gradient(180deg, #071e42 0%, #0a387c 40%, #051937 100%)',
        color: '#ffffff',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Ambient Glowing Orbs (EduERP Glow Effect) */}
        <Box className="eduerp-ambient-glow" sx={{
          position: 'absolute', top: '-10%', left: '15%', width: 450, height: 450,
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,165,233,0.22) 0%, rgba(14,165,233,0) 70%)',
          filter: 'blur(50px)', pointerEvents: 'none'
        }} />
        <Box className="eduerp-ambient-glow" sx={{
          position: 'absolute', bottom: '5%', right: '5%', width: 500, height: 500,
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,176,0,0.18) 0%, rgba(255,176,0,0) 70%)',
          filter: 'blur(60px)', pointerEvents: 'none'
        }} />

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
              
              {/* Kick Badge with pulse dot */}
              <Box 
                data-aos="fade-down" 
                data-aos-delay="100"
                sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5, mb: 3 }}
              >
                <Box sx={{ 
                  width: 10, height: 10, borderRadius: '50%', bgcolor: '#10b981',
                  boxShadow: '0 0 12px #10b981'
                }} />
                <Typography sx={{ color: '#ffd47e', fontWeight: 800, fontSize: '0.82rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  {cms.heroBadge}
                </Typography>
              </Box>

              {/* Main Headline */}
              <Typography 
                variant="h1" 
                data-aos="fade-up" 
                data-aos-delay="200"
                sx={{ 
                  fontSize: { xs: '2.4rem', sm: '3.2rem', lg: '3.8rem' }, 
                  fontWeight: 900, 
                  lineHeight: 1.15, 
                  letterSpacing: '-0.03em', 
                  color: '#ffffff',
                  mb: 3
                }}
              >
                {cms.heroTitle}
              </Typography>

              {/* Subtitle */}
              <Typography 
                data-aos="fade-up" 
                data-aos-delay="300"
                sx={{ 
                  color: '#d0ddf5', 
                  fontSize: { xs: '1.05rem', md: '1.2rem' }, 
                  lineHeight: 1.65, 
                  mb: 4, 
                  maxWidth: '680px' 
                }}
              >
                {cms.heroSubtitle}
              </Typography>

              {/* Bullet Features Checklist */}
              <Grid container spacing={2} sx={{ mb: 5 }}>
                {[
                  '1-Click Online & POS Counter Fee Receipts',
                  'Smart Daily Student & Staff Attendance Marking',
                  'Automated CBSE/ICSE Grade Sheets & Report Cards',
                  'Real-Time GPS Fleet & Bus Route Allocation',
                  'Super Admin Multi-Tenant Campus Governance',
                  'Zero Setup Downtime & 24/7 Dedicated Support'
                ].map((item, idx) => (
                  <Grid item xs={12} sm={6} key={idx} data-aos="fade-up" data-aos-delay={350 + idx * 50}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                      <CheckCircleIcon sx={{ color: goldColor, fontSize: 18 }} />
                      <Typography sx={{ color: '#f1f5f9', fontSize: '0.9rem', fontWeight: 600 }}>{item}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap' }} data-aos="fade-up" data-aos-delay="650">
                <Button 
                  variant="contained" 
                  size="large" 
                  href="#contact"
                  className="eduerp-btn-shimmer"
                  sx={{ 
                    borderRadius: 99, 
                    px: 4.5, py: 1.7, 
                    fontWeight: 800, 
                    fontSize: '1rem',
                    textTransform: 'none',
                    color: '#12233f',
                    boxShadow: '0 14px 28px -8px rgba(255, 176, 0, 0.75)',
                    transition: 'transform 0.2s ease',
                    '&:hover': { transform: 'translateY(-3px)' }
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
                    backdropFilter: 'blur(8px)',
                    transition: 'all 0.25s ease',
                    '&:hover': { borderColor: '#ffffff', bgcolor: 'rgba(255,255,255,0.1)', transform: 'translateY(-2px)' }
                  }}
                >
                  {cms.ctaSecondaryText}
                </Button>
              </Box>

            </Grid>

            {/* Hero Right: Fast Quick Consultation Card (with Floating 3D and floating mini badges) */}
            <Grid item xs={12} md={5}>
              <Box sx={{ position: 'relative' }} data-aos="zoom-in" data-aos-delay="250">
                
                {/* Floating EduERP-Style live status badge 1 */}
                <Box 
                  className="eduerp-floating-badge"
                  sx={{ 
                    position: 'absolute', top: -20, left: -20, zIndex: 3,
                    bgcolor: 'rgba(15, 23, 42, 0.92)', backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    boxShadow: '0 12px 30px rgba(0,0,0,0.35)',
                    borderRadius: 3, px: 2, py: 1.2,
                    display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1.2
                  }}
                >
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#22c55e', boxShadow: '0 0 10px #22c55e' }} />
                  <Box>
                    <Typography variant="caption" sx={{ color: '#cbd5e1', fontSize: '0.68rem', display: 'block', fontWeight: 600 }}>
                      Admissions & Fees
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 800, fontSize: '0.82rem' }}>
                      100% Real-Time Sync
                    </Typography>
                  </Box>
                </Box>

                {/* Floating EduERP-Style live status badge 2 */}
                <Box 
                  className="eduerp-floating-card"
                  sx={{ 
                    position: 'absolute', bottom: -22, right: -15, zIndex: 3,
                    bgcolor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(10,56,124,0.12)',
                    boxShadow: '0 16px 36px rgba(10,56,124,0.25)',
                    borderRadius: 3, px: 2.2, py: 1.2,
                    display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1.2
                  }}
                >
                  <Box sx={{ 
                    width: 32, height: 32, borderRadius: 2, bgcolor: '#fef3c7',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b45309'
                  }}>
                    <VerifiedIcon sx={{ fontSize: 20, color: '#f59e0b' }} />
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.68rem', display: 'block', fontWeight: 700 }}>
                      Curriculum Aligned
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#0a387c', fontWeight: 900, fontSize: '0.84rem' }}>
                      CBSE • ICSE • State Boards
                    </Typography>
                  </Box>
                </Box>

                <Paper className="eduerp-3d-card" sx={{ 
                  p: { xs: 3.5, md: 4.5 }, 
                  borderRadius: 4, 
                  bgcolor: '#ffffff', 
                  color: '#12233f',
                  boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  position: 'relative'
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
                        className="eduerp-btn-shimmer"
                        sx={{ 
                          mt: 1,
                          py: 1.5, 
                          fontWeight: 900, 
                          fontSize: '1rem',
                          borderRadius: 2.5,
                          textTransform: 'none',
                          color: '#12233f',
                          boxShadow: '0 12px 24px -8px rgba(255, 176, 0, 0.65)'
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
              </Box>
            </Grid>

          </Grid>
        </Container>
      </Box>

      {/* EduERP-Style High-Impact Infinite Animated Marquee Showcase (Dual Track) */}
      <Box sx={{ 
        bgcolor: '#041126', 
        borderTop: '1px solid rgba(255,255,255,0.1)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        py: { xs: 3.5, md: 4.5 }, 
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Ambient Top Glow */}
        <Box sx={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: '60%', height: '100%',
          background: 'radial-gradient(ellipse at center, rgba(14,165,233,0.12) 0%, rgba(0,0,0,0) 70%)',
          pointerEvents: 'none'
        }} />

        {/* Section Tag */}
        <Container maxWidth="xl" sx={{ mb: 2.5, textAlign: 'center' }}>
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.2, px: 2, py: 0.5, bgcolor: 'rgba(255,176,0,0.1)', borderRadius: 99, border: '1px solid rgba(255,176,0,0.25)' }}>
            <i className="pi pi-bolt" style={{ color: goldColor, fontSize: '0.85rem' }}></i>
            <Typography sx={{ color: goldColor, fontWeight: 800, fontSize: '0.76rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              POWERING END-TO-END SMART OPERATIONS
            </Typography>
          </Box>
        </Container>

        {/* Track 1: Left to Right Continuous Stream */}
        <Box sx={{ mb: 2 }}>
          <div className="eduerp-marquee-container">
            <div className="eduerp-marquee-track">
              {[
                { icon: 'pi pi-check-circle', title: 'Daily Student Roll-Call Attendance', tag: 'Fast Marking' },
                { icon: 'pi pi-wallet', title: 'Automated POS Fee Counter', tag: 'Instant Receipts' },
                { icon: 'pi pi-file-edit', title: 'CBSE & ICSE Grade Sheets', tag: '1-Click Marks Card' },
                { icon: 'pi pi-map-marker', title: 'Real-Time Bus GPS Tracking', tag: 'Live Fleet' },
                { icon: 'pi pi-book', title: 'NCERT Digital E-Books Library', tag: 'Classes 6-12' },
                { icon: 'pi pi-comments', title: 'Parent WhatsApp & SMS Gateway', tag: 'Instant Sync' },
                { icon: 'pi pi-server', title: 'Multi-Branch Super Admin Hub', tag: 'Cross-Campus' },
                { icon: 'pi pi-chart-line', title: 'Comprehensive Fee & Expense Analytics', tag: 'Instant Audit' },
              ].concat([
                { icon: 'pi pi-check-circle', title: 'Daily Student Roll-Call Attendance', tag: 'Fast Marking' },
                { icon: 'pi pi-wallet', title: 'Automated POS Fee Counter', tag: 'Instant Receipts' },
                { icon: 'pi pi-file-edit', title: 'CBSE & ICSE Grade Sheets', tag: '1-Click Marks Card' },
                { icon: 'pi pi-map-marker', title: 'Real-Time Bus GPS Tracking', tag: 'Live Fleet' },
                { icon: 'pi pi-book', title: 'NCERT Digital E-Books Library', tag: 'Classes 6-12' },
                { icon: 'pi pi-comments', title: 'Parent WhatsApp & SMS Gateway', tag: 'Instant Sync' },
                { icon: 'pi pi-server', title: 'Multi-Branch Super Admin Hub', tag: 'Cross-Campus' },
                { icon: 'pi pi-chart-line', title: 'Comprehensive Fee & Expense Analytics', tag: 'Instant Audit' },
              ]).map((item, idx) => (
                <div key={`track1-${idx}`} className="eduerp-marquee-pill">
                  <Box sx={{ 
                    width: 32, height: 32, borderRadius: '50%', 
                    bgcolor: 'rgba(255,176,0,0.18)', color: goldColor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <i className={item.icon} style={{ fontSize: '0.95rem' }}></i>
                  </Box>
                  <Typography sx={{ color: '#ffffff', fontSize: '0.92rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
                    {item.title}
                  </Typography>
                  <Box sx={{ 
                    px: 1.2, py: 0.3, borderRadius: 99, 
                    bgcolor: 'rgba(255,255,255,0.08)', color: '#93c5fd', 
                    fontSize: '0.72rem', fontWeight: 700 
                  }}>
                    {item.tag}
                  </Box>
                </div>
              ))}
            </div>
          </div>
        </Box>

        {/* Track 2: Reverse Direction Stream for dynamic contrast */}
        <Box>
          <div className="eduerp-marquee-container">
            <div className="eduerp-marquee-track reverse">
              {[
                { icon: 'pi pi-shield', title: 'Role-Based Permissions & Audit Logs', tag: '100% Secure' },
                { icon: 'pi pi-id-card', title: 'Student & Staff Smart ID Cards', tag: 'Barcode / QR' },
                { icon: 'pi pi-mobile', title: 'Dedicated Multi-Child Parent Portal', tag: 'Web & Mobile' },
                { icon: 'pi pi-calendar', title: 'Dynamic Timetable & Bell Scheduler', tag: 'Auto Proxy' },
                { icon: 'pi pi-sparkles', title: '24/7 AI Homework & Doubt Solver', tag: 'AI Tutor' },
                { icon: 'pi pi-users', title: 'Staff Attendance & Leave Approvals', tag: 'Staff Ops' },
                { icon: 'pi pi-box', title: 'Inventory & Asset Store Management', tag: 'Stock Audit' },
                { icon: 'pi pi-verified', title: 'Transfer Certificate & Promotion Engine', tag: '1-Click TC' }
              ].concat([
                { icon: 'pi pi-shield', title: 'Role-Based Permissions & Audit Logs', tag: '100% Secure' },
                { icon: 'pi pi-id-card', title: 'Student & Staff Smart ID Cards', tag: 'Barcode / QR' },
                { icon: 'pi pi-mobile', title: 'Dedicated Multi-Child Parent Portal', tag: 'Web & Mobile' },
                { icon: 'pi pi-calendar', title: 'Dynamic Timetable & Bell Scheduler', tag: 'Auto Proxy' },
                { icon: 'pi pi-sparkles', title: '24/7 AI Homework & Doubt Solver', tag: 'AI Tutor' },
                { icon: 'pi pi-users', title: 'Staff Attendance & Leave Approvals', tag: 'Staff Ops' },
                { icon: 'pi pi-box', title: 'Inventory & Asset Store Management', tag: 'Stock Audit' },
                { icon: 'pi pi-verified', title: 'Transfer Certificate & Promotion Engine', tag: '1-Click TC' }
              ]).map((item, idx) => (
                <div key={`track2-${idx}`} className="eduerp-marquee-pill" style={{ background: 'rgba(15,23,42,0.6)', borderColor: 'rgba(255,255,255,0.09)' }}>
                  <Box sx={{ 
                    width: 32, height: 32, borderRadius: '50%', 
                    bgcolor: 'rgba(56,189,248,0.18)', color: '#38bdf8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <i className={item.icon} style={{ fontSize: '0.95rem' }}></i>
                  </Box>
                  <Typography sx={{ color: '#e2e8f0', fontSize: '0.92rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
                    {item.title}
                  </Typography>
                  <Box sx={{ 
                    px: 1.2, py: 0.3, borderRadius: 99, 
                    bgcolor: 'rgba(255,176,0,0.12)', color: '#fde047', 
                    fontSize: '0.72rem', fontWeight: 700 
                  }}>
                    {item.tag}
                  </Box>
                </div>
              ))}
            </div>
          </div>
        </Box>

      </Box>

      {/* Institutional Stats & Scale Strip (Edumarshal Proven At Scale with AOS Animation) */}
      <Box sx={{ bgcolor: '#ffffff', py: 6, borderBottom: '1px solid #e2e8f0' }}>
        <Container maxWidth="xl">
          <Grid container spacing={4} justifyContent="center" textAlign="center">
            {[
              { num: '550+', label: 'Institutions Powered', sub: 'Across 18+ States' },
              { num: '65+', label: 'Integrated Modules', sub: 'Admissions to Alumni' },
              { num: '100%', label: 'Zero Paper Fee Collection', sub: 'Instant POS Receipts' },
              { num: '4.9/5', label: 'Customer Satisfaction', sub: 'Rated by School Principals' }
            ].map((stat, idx) => (
              <Grid item xs={6} md={3} key={idx} data-aos="fade-up" data-aos-delay={idx * 100}>
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

      {/* ── OUR CLIENTS & PARTNER INSTITUTIONS MODULE ── */}
      <Box id="clients" sx={{ py: { xs: 8, md: 10 }, bgcolor: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
        <Container maxWidth="xl">
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 5 }} data-aos="fade-up">
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <Box sx={{ width: 18, height: 3, borderRadius: 2, bgcolor: goldColor }} />
              <Typography sx={{ color: '#0a387c', fontWeight: 800, fontSize: '0.8rem', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                TRUSTED BY 550+ PREMIER INSTITUTES
              </Typography>
              <Box sx={{ width: 18, height: 3, borderRadius: 2, bgcolor: goldColor }} />
            </Box>
            <Typography variant="h3" fontWeight={900} sx={{ color: '#0f172a', fontSize: { xs: '1.8rem', sm: '2.4rem', md: '2.8rem' }, lineHeight: 1.2, mb: 1.5 }}>
              Our Esteemed Clients & Partner Schools
            </Typography>
            <Typography variant="body1" sx={{ color: '#64748b', maxWidth: 780, mx: 'auto', fontSize: { xs: '0.92rem', md: '1.05rem' } }}>
              From prestigious nationwide public school chains to progressive international day-boarding academies, Digital Vidya Saarthi (DVS ERP) powers mission-critical academic, fee counter, and administrative operations.
            </Typography>
          </Box>

          {/* Continuous Running Logo Stream (Marquee) */}
          <Box sx={{ mb: 5, overflow: 'hidden' }}>
            <div className="eduerp-marquee-container">
              <div className="eduerp-marquee-track">
                {displayClients.concat(displayClients).map((client, idx) => (
                  <Box
                    key={`client-logo-stream-${idx}`}
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 1.5,
                      py: 1,
                      px: 2.2,
                      bgcolor: '#f8fafc',
                      borderRadius: 99,
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: client.primaryColor || '#0a387c',
                        bgcolor: '#ffffff',
                        transform: 'translateY(-2px)',
                        boxShadow: `0 6px 16px ${client.primaryColor || '#0a387c'}20`,
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 38,
                        height: 38,
                        borderRadius: '50%',
                        bgcolor: `${client.primaryColor || '#0a387c'}14`,
                        border: `1.5px solid ${client.primaryColor || '#0a387c'}30`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: client.primaryColor || '#0a387c',
                        overflow: 'hidden',
                        flexShrink: 0,
                      }}
                    >
                      {client.image ? (
                        <img 
                          src={client.image} 
                          alt={client.name} 
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <i className={client.icon || 'pi pi-compass'} style={{ fontSize: '1rem' }}></i>
                      )}
                    </Box>
                    <Box>
                      <Typography sx={{ color: '#1e293b', fontWeight: 800, fontSize: '0.86rem', whiteSpace: 'nowrap', lineHeight: 1.2 }}>
                        {client.name}
                      </Typography>
                      <Typography sx={{ color: '#64748b', fontSize: '0.68rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {client.board} • {client.location}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </div>
            </div>
          </Box>

          {/* Interactive Category Filter Pills */}
          <Box sx={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 1, mb: 4 }} data-aos="fade-up">
            {[
              { id: 'all', label: 'All Institutions (550+)' },
              { id: 'cbse', label: 'CBSE Affiliated Schools' },
              { id: 'icse', label: 'ICSE & Convent Schools' },
              { id: 'international', label: 'International & Cambridge' },
            ].map((tab) => (
              <Chip
                key={tab.id}
                label={tab.label}
                clickable
                onClick={() => setClientCategory(tab.id)}
                sx={{
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  py: 2.2,
                  px: 1.5,
                  borderRadius: 99,
                  bgcolor: clientCategory === tab.id ? '#0a387c' : '#f1f5f9',
                  color: clientCategory === tab.id ? '#ffffff' : '#475569',
                  border: '1px solid',
                  borderColor: clientCategory === tab.id ? '#0a387c' : '#e2e8f0',
                  boxShadow: clientCategory === tab.id ? '0 4px 12px rgba(10, 56, 124, 0.25)' : 'none',
                  '&:hover': {
                    bgcolor: clientCategory === tab.id ? '#0a387c' : '#e2e8f0',
                  },
                }}
              />
            ))}
          </Box>

          {/* Client Cards Grid */}
          <Grid container spacing={2.5}>
            {displayClients.filter(c => clientCategory === 'all' || c.category === clientCategory).map((client, idx) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={client.id || idx} data-aos="fade-up" data-aos-delay={(idx % 4) * 80}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.25,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    borderRadius: 2.5,
                    border: '1px solid #e2e8f0',
                    bgcolor: '#ffffff',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                    position: 'relative',
                    overflow: 'hidden',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      borderColor: client.primaryColor || '#0a387c',
                      boxShadow: `0 12px 28px ${client.primaryColor || '#0a387c'}18`,
                    },
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 4,
                      bgcolor: client.primaryColor || '#0a387c',
                    },
                  }}
                >
                  <Box>
                    {/* Top Row: Logo Badge & Verified Tag */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                      <Box
                        sx={{
                          width: 54,
                          height: 54,
                          borderRadius: '14px',
                          bgcolor: `${client.primaryColor || '#0a387c'}10`,
                          border: `1.5px solid ${client.primaryColor || '#0a387c'}30`,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: `0 3px 10px ${client.primaryColor || '#0a387c'}15`,
                          position: 'relative',
                          overflow: 'hidden',
                          p: client.image ? 0.6 : 0
                        }}
                      >
                        {client.image ? (
                          <img 
                            src={client.image} 
                            alt={client.name} 
                            style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '10px' }} 
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <>
                            <i className={client.icon || 'pi pi-compass'} style={{ fontSize: '1.4rem', color: client.primaryColor || '#0a387c' }}></i>
                            <Typography sx={{ fontSize: '0.55rem', fontWeight: 900, color: client.primaryColor || '#0a387c', letterSpacing: '0.04em', textTransform: 'uppercase', mt: 0.1, lineHeight: 1 }}>
                              {(client.shortName || client.name).substring(0, 4)}
                            </Typography>
                          </>
                        )}
                      </Box>
                      <Chip
                        icon={<VerifiedIcon sx={{ fontSize: '13px !important', color: '#16a34a !important' }} />}
                        label="Verified Client"
                        size="small"
                        sx={{
                          bgcolor: '#f0fdf4',
                          color: '#15803d',
                          fontWeight: 700,
                          fontSize: '0.67rem',
                          height: 22,
                          border: '1px solid #bbf7d0',
                        }}
                      />
                    </Box>

                    {/* School Name */}
                    <Typography variant="h6" fontWeight={800} sx={{ color: '#0f172a', fontSize: '0.98rem', lineHeight: 1.3, mb: 0.5 }}>
                      {client.name}
                    </Typography>

                    {/* Motto */}
                    <Typography variant="caption" sx={{ color: '#64748b', fontStyle: 'italic', display: 'block', mb: 1.2, fontSize: '0.72rem' }}>
                      "{client.motto}"
                    </Typography>

                    {/* Board & Type Badge */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6, mb: 1.5 }}>
                      <Chip
                        label={client.board}
                        size="small"
                        sx={{
                          bgcolor: `${client.primaryColor || '#0a387c'}0d`,
                          color: client.primaryColor || '#0a387c',
                          fontWeight: 700,
                          fontSize: '0.68rem',
                          height: 22,
                          border: `1px solid ${client.primaryColor || '#0a387c'}25`,
                        }}
                      />
                      <Chip
                        label={client.type}
                        size="small"
                        sx={{
                          bgcolor: '#f1f5f9',
                          color: '#475569',
                          fontWeight: 600,
                          fontSize: '0.68rem',
                          height: 22,
                        }}
                      />
                    </Box>
                  </Box>

                  {/* Bottom Strip: Location & Students */}
                  <Box sx={{ pt: 1.25, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <LocationOnIcon sx={{ fontSize: 14, color: '#94a3b8' }} />
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, fontSize: '0.72rem' }}>
                        {client.location}
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: client.primaryColor, fontWeight: 800, fontSize: '0.72rem' }}>
                      {client.students}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            ))}

            {/* Final CTA Card in Grid: Join Network */}
            <Grid item xs={12} sm={6} md={4} lg={3} data-aos="fade-up">
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderRadius: 2.5,
                  background: 'linear-gradient(135deg, #0a387c 0%, #1e40af 100%)',
                  color: '#ffffff',
                  boxShadow: '0 8px 24px rgba(10, 56, 124, 0.3)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <Box>
                  <Box
                    sx={{
                      width: 54,
                      height: 54,
                      borderRadius: '14px',
                      bgcolor: 'rgba(255, 176, 0, 0.2)',
                      border: '1.5px solid #ffb000',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffb000',
                      mb: 2,
                    }}
                  >
                    <SchoolIcon sx={{ fontSize: 28 }} />
                  </Box>
                  <Typography variant="h6" fontWeight={900} sx={{ fontSize: '1.05rem', lineHeight: 1.3, mb: 1, color: '#ffffff' }}>
                    Join 550+ Esteemed Educational Institutions
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#93c5fd', display: 'block', fontSize: '0.76rem', lineHeight: 1.4, mb: 2 }}>
                    Ready to modernize fee collection, attendance, marksheets and parent communication at your campus?
                  </Typography>
                </Box>

                <Button
                  variant="contained"
                  href="#contact"
                  fullWidth
                  sx={{
                    background: 'linear-gradient(120deg, #ffb000 30%, #ffd47e 48%, #ffb000 62%)',
                    color: '#12233f',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    py: 1,
                    borderRadius: 99,
                    textTransform: 'none',
                    boxShadow: '0 6px 16px rgba(255, 176, 0, 0.4)',
                    '&:hover': { transform: 'translateY(-2px)' },
                  }}
                >
                  Book Demo For School →
                </Button>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Product Tour & Interactive Hero Slider Showcase */}
      <Box id="slider-preview" sx={{ py: 10, bgcolor: '#f8fafc' }}>
        <Container maxWidth="xl">
          
          <Box sx={{ textAlign: 'center', mb: 6 }} data-aos="fade-up">
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
          {cms.slides && cms.slides.length > 0 && (() => {
            const validIndex = (currentSlide >= 0 && currentSlide < cms.slides.length) ? currentSlide : 0;
            const slide = cms.slides[validIndex] || cms.slides[0];
            if (!slide) return null;

            return (
              <Paper 
                elevation={0}
                data-aos="zoom-in"
                data-aos-duration="800"
                className="eduerp-3d-card"
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
                    {slide.badge && (
                      <Chip 
                        label={slide.badge} 
                        size="small" 
                        sx={{ 
                          mb: 2, 
                          bgcolor: '#e8f0fc', 
                          color: '#0a387c', 
                          fontWeight: 800,
                          borderRadius: 1.5
                        }} 
                      />
                    )}
                    <Typography variant="h4" fontWeight="900" sx={{ mb: 2, color: '#0a387c', lineHeight: 1.25 }}>
                      {slide.title || 'Institutional Module'}
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#475569', mb: 3.5, lineHeight: 1.75 }}>
                      {slide.description || ''}
                    </Typography>

                    {slide.stats && (
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, mb: 4, px: 2, py: 1, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #bbf7d0', color: '#15803d' }}>
                        <CheckCircleIcon sx={{ fontSize: 18 }} />
                        <Typography variant="body2" fontWeight="800">{slide.stats}</Typography>
                      </Box>
                    )}

                    {/* Slider Controls */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <IconButton 
                        size="small"
                        onClick={() => setCurrentSlide((validIndex - 1 + cms.slides.length) % cms.slides.length)}
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
                              width: dotIdx === validIndex ? 28 : 10, 
                              height: 10, 
                              borderRadius: 5, 
                              bgcolor: dotIdx === validIndex ? goldColor : '#cbd5e1',
                              cursor: 'pointer',
                              transition: 'all 0.3s ease'
                            }} 
                          />
                        ))}
                      </Box>

                      <IconButton 
                        size="small"
                        onClick={() => setCurrentSlide((validIndex + 1) % cms.slides.length)}
                        sx={{ bgcolor: '#e8f0fc', color: '#0a387c', '&:hover': { bgcolor: '#d0ddf5' } }}
                      >
                        <ArrowForwardIosIcon fontSize="small" sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Box>
                  </Grid>

                  {/* Screenshot Visual */}
                  <Grid item xs={12} lg={7}>
                    <Box sx={{ 
                      p: { xs: 1.5, md: 2.5 }, 
                      bgcolor: '#071834', 
                      height: '100%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      minHeight: { xs: 260, md: 460 }
                    }}>
                      <CardMedia 
                        component="img" 
                        image={slide.image || '/images/erp_dashboard.jpg'} 
                        alt={slide.title || 'ERP Preview'}
                        sx={{ 
                          borderRadius: 2, 
                          width: '100%', 
                          maxHeight: { xs: 280, md: 460 }, 
                          objectFit: 'contain',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                          bgcolor: '#0b192e'
                        }} 
                      />
                    </Box>
                  </Grid>

                </Grid>
              </Paper>
            );
          })()}

        </Container>
      </Box>

      {/* 65+ Modules Ecosystem Suite with Modern Segmented Tabs, Live Search & Interactive Workflow Modal */}
      <Box id="modules-suite" sx={{ 
        py: { xs: 8, md: 12 }, 
        bgcolor: '#fbfcfd', 
        position: 'relative', 
        overflow: 'hidden',
        borderTop: '1px solid #eef2f6',
        borderBottom: '1px solid #eef2f6'
      }}>
        {/* Subtle Ambient Background Mesh */}
        <Box sx={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 1400, height: 500,
          background: 'radial-gradient(ellipse at 50% 0%, rgba(37,99,235,0.06) 0%, rgba(255,176,0,0.03) 40%, transparent 70%)',
          pointerEvents: 'none', zIndex: 0
        }} />

        <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
          
          <Box sx={{ textAlign: 'center', mb: 5 }} data-aos="fade-up">
            {/* Live Indicator Pill */}
            <Box sx={{ 
              display: 'inline-flex', alignItems: 'center', gap: 1.2, 
              px: 2.2, py: 0.8, borderRadius: 99, 
              bgcolor: '#f0fdf4', border: '1px solid #bbf7d0',
              mb: 2.2, boxShadow: '0 4px 12px rgba(16,185,129,0.08)' 
            }}>
              <Box sx={{ 
                width: 8, height: 8, borderRadius: '50%', 
                bgcolor: '#16a34a',
                boxShadow: '0 0 0 4px rgba(22,163,74,0.2)' 
              }} />
              <Typography sx={{ color: '#15803d', fontWeight: 800, fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Modular Institutional Ecosystem • 65+ Connected Capabilities
              </Typography>
            </Box>

            {/* Main Heading */}
            <Typography variant="h3" fontWeight="900" sx={{ 
              color: '#0a387c', 
              fontSize: { xs: '2rem', sm: '2.6rem', md: '3.2rem' },
              lineHeight: 1.18,
              letterSpacing: '-0.03em',
              mb: 1.8 
            }}>
              Complete End-to-End{' '}
              <Box component="span" sx={{ 
                background: 'linear-gradient(135deg, #0a387c 20%, #2563eb 80%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                display: { xs: 'block', sm: 'inline' }
              }}>
                Institutional Modules
              </Box>
            </Typography>

            {/* Subtitle */}
            <Typography variant="body1" sx={{ color: '#64748b', maxWidth: '780px', mx: 'auto', fontSize: { xs: '0.96rem', md: '1.08rem' }, lineHeight: 1.65 }}>
              From online admissions and POS fee collections to GPS bus tracking, CBSE report cards, and 24/7 AI study tutors — every operation seamlessly synchronizes in one unified database.
            </Typography>

            {/* Live Search & Quick Filter Bar */}
            <Box sx={{ maxWidth: 660, mx: 'auto', mt: 4, mb: 3 }}>
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                bgcolor: '#ffffff',
                borderRadius: 99,
                p: '6px 10px 6px 20px',
                border: '1.5px solid #e2e8f0',
                boxShadow: '0 10px 28px -8px rgba(10,56,124,0.08)',
                transition: 'all 0.25s ease',
                '&:focus-within': {
                  borderColor: '#2563eb',
                  boxShadow: '0 14px 34px -8px rgba(37,99,235,0.22)'
                }
              }}>
                <i className="pi pi-search" style={{ color: '#64748b', fontSize: '1.15rem', marginRight: 12 }}></i>
                <input
                  type="text"
                  placeholder="Quick search any module (e.g. Fees, Attendance, AI Tutor, Bus, ID Cards...)"
                  value={moduleSearch}
                  onChange={(e) => setModuleSearch(e.target.value)}
                  style={{
                    border: 'none',
                    outline: 'none',
                    width: '100%',
                    fontSize: '0.94rem',
                    fontFamily: 'inherit',
                    color: '#0f172a',
                    background: 'transparent'
                  }}
                />
                {moduleSearch && (
                  <IconButton size="small" onClick={() => setModuleSearch('')} sx={{ color: '#94a3b8', mr: 0.8 }}>
                    <CloseIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                )}
                <Box sx={{ 
                  bgcolor: '#eff6ff', 
                  color: '#1d4ed8', 
                  px: 2, py: 0.65, 
                  borderRadius: 99, 
                  fontSize: '0.78rem', 
                  fontWeight: 800,
                  whiteSpace: 'nowrap',
                  border: '1px solid #bfdbfe'
                }}>
                  {filteredModules.length} Modules
                </Box>
              </Box>
            </Box>

            {/* Segmented Category Navigation Tabs */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              gap: 1, 
              flexWrap: 'wrap', 
              p: 1.2,
              bgcolor: 'rgba(241, 245, 249, 0.82)',
              backdropFilter: 'blur(12px)',
              borderRadius: { xs: 4, md: 99 },
              border: '1px solid #e2e8f0',
              maxWidth: 1160,
              mx: 'auto',
              mt: 3.5,
              mb: 2,
              boxShadow: '0 4px 16px rgba(10,56,124,0.03)'
            }}>
              {[
                { id: 'all', label: 'All Modules', icon: 'pi pi-th-large' },
                { id: 'portal', label: 'Student, Parent & AI', icon: 'pi pi-sparkles' },
                { id: 'finance', label: 'Fees & Accounts', icon: 'pi pi-wallet' },
                { id: 'academics', label: 'Academics & Exams', icon: 'pi pi-graduation-cap' },
                { id: 'admissions', label: 'Admissions & Identity', icon: 'pi pi-user-plus' },
                { id: 'logistics', label: 'Transport & Stock', icon: 'pi pi-truck' },
                { id: 'hr', label: 'Staff & HR Payroll', icon: 'pi pi-users' },
                { id: 'platform', label: 'Super Admin & RBAC', icon: 'pi pi-shield' }
              ].map(tab => {
                const isActive = activeTab === tab.id;
                const count = tab.id === 'all' 
                  ? categorizedModules.length 
                  : categorizedModules.filter(m => m.category === tab.id).length;
                return (
                  <Button 
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); }}
                    sx={{ 
                      borderRadius: 99, 
                      px: { xs: 1.6, md: 2.2 }, 
                      py: 0.9, 
                      fontWeight: 700, 
                      fontSize: { xs: '0.8rem', sm: '0.85rem' },
                      textTransform: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                      background: isActive 
                        ? 'linear-gradient(135deg, #0a387c 0%, #1e40af 100%)' 
                        : 'transparent',
                      color: isActive ? '#ffffff' : '#475569',
                      boxShadow: isActive ? '0 8px 18px -4px rgba(10, 56, 124, 0.45)' : 'none',
                      border: isActive ? '1px solid rgba(255,255,255,0.2)' : '1px solid transparent',
                      '&:hover': { 
                        bgcolor: isActive ? '#072554' : '#ffffff',
                        color: isActive ? '#ffffff' : '#0a387c',
                        transform: 'translateY(-1px)',
                        boxShadow: isActive 
                          ? '0 10px 22px -4px rgba(10, 56, 124, 0.5)' 
                          : '0 4px 12px rgba(0,0,0,0.05)'
                      }
                    }}
                  >
                    <i className={tab.icon} style={{ fontSize: '0.95rem', color: isActive ? goldColor : '#64748b' }}></i>
                    <span>{tab.label}</span>
                    <Box component="span" sx={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      px: 0.8,
                      py: 0.2,
                      borderRadius: 99,
                      bgcolor: isActive ? 'rgba(255,255,255,0.22)' : '#e2e8f0',
                      color: isActive ? '#ffffff' : '#64748b',
                      lineHeight: 1
                    }}>
                      {count}
                    </Box>
                  </Button>
                );
              })}
            </Box>
          </Box>

          {/* Empty Search State */}
          {filteredModules.length === 0 && (
            <Box sx={{ 
              textAlign: 'center', 
              py: 8, px: 3, 
              bgcolor: '#ffffff', 
              borderRadius: 4, 
              border: '1.5px dashed #cbd5e1', 
              maxWidth: 500, 
              mx: 'auto',
              my: 4
            }}>
              <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                <i className="pi pi-search" style={{ fontSize: '1.8rem', color: '#94a3b8' }}></i>
              </Box>
              <Typography variant="h6" fontWeight="800" color="#1e293b" gutterBottom>
                No modules match "{moduleSearch}"
              </Typography>
              <Typography variant="body2" color="#64748b" sx={{ mb: 2.5 }}>
                Try searching for general keywords like "fee", "attendance", "books", or clear the filter.
              </Typography>
              <Button 
                variant="outlined" 
                onClick={() => { setModuleSearch(''); setActiveTab('all'); }}
                sx={{ borderRadius: 99, textTransform: 'none', fontWeight: 700 }}
              >
                Clear Search & View All
              </Button>
            </Box>
          )}

          {/* Modules Grid - Elevated High-Tech Cards with Feature Highlights & Color Squircles */}
          <Grid container spacing={3.2}>
            {filteredModules.map((item, idx) => (
              <Grid item xs={12} sm={6} md={4} key={idx} data-aos="fade-up" data-aos-delay={(idx % 6) * 50}>
                <Paper 
                  elevation={0}
                  onClick={() => setSelectedModule(item)}
                  sx={{ 
                    p: 0, 
                    height: '100%', 
                    borderRadius: 4, 
                    bgcolor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 16px -2px rgba(18, 35, 63, 0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      borderColor: item.color,
                      boxShadow: `0 24px 44px -16px ${item.color}35`,
                      '& .card-top-accent': {
                        height: '5px'
                      },
                      '& .card-icon-squircle': {
                        transform: 'scale(1.1) rotate(5deg)'
                      },
                      '& .card-arrow-icon': {
                        transform: 'translateX(6px)'
                      }
                    }
                  }}
                >
                  {/* Category Accent Top Line */}
                  <Box 
                    className="card-top-accent"
                    sx={{ 
                      height: '3.5px', 
                      background: item.gradient || `linear-gradient(90deg, ${item.color} 0%, #2563eb 100%)`, 
                      width: '100%',
                      transition: 'height 0.25s ease'
                    }} 
                  />

                  <Box sx={{ p: 3.5, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                    {/* Header Row: Squircle Icon & Badges */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5 }}>
                      {/* Squircle Icon */}
                      <Box 
                        className="card-icon-squircle"
                        sx={{ 
                          width: 52, 
                          height: 52, 
                          borderRadius: 3, 
                          background: item.lightColor || '#eff6ff', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          color: item.color || '#0a387c',
                          boxShadow: `0 8px 16px -6px ${item.color}30`,
                          border: `1px solid ${item.color}25`,
                          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                      >
                        <i className={item.icon} style={{ fontSize: '1.5rem', color: item.color }}></i>
                      </Box>

                      {/* Category & Status Badges */}
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.6 }}>
                        <Box sx={{ 
                          px: 1.3, py: 0.4, 
                          borderRadius: 99, 
                          bgcolor: item.lightColor || '#f8fafc', 
                          color: item.color || '#0a387c', 
                          fontWeight: 800,
                          border: `1px solid ${item.color}30`,
                          fontSize: '0.72rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.6
                        }}>
                          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: item.color }} />
                          {item.tag}
                        </Box>

                        {item.badge && (
                          <Typography variant="caption" sx={{ 
                            color: '#94a3b8', 
                            fontWeight: 700, 
                            fontSize: '0.68rem',
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase'
                          }}>
                            {item.badge}
                          </Typography>
                        )}
                      </Box>
                    </Box>

                    {/* Module Title */}
                    <Typography variant="h6" fontWeight="900" sx={{ 
                      mb: 1.2, 
                      color: '#0f172a', 
                      fontSize: '1.18rem',
                      lineHeight: 1.3,
                      letterSpacing: '-0.02em',
                      transition: 'color 0.2s ease',
                      '&:hover': { color: item.color }
                    }}>
                      {item.title}
                    </Typography>

                    {/* Description */}
                    <Typography variant="body2" sx={{ 
                      color: '#64748b', 
                      lineHeight: 1.65, 
                      fontSize: '0.88rem',
                      mb: 2.5 
                    }}>
                      {item.desc}
                    </Typography>

                    {/* Micro Feature Highlight Chips */}
                    {item.highlights && item.highlights.length > 0 && (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, mb: 3, mt: 'auto' }}>
                        {item.highlights.map((hl, hIdx) => (
                          <Box 
                            key={hIdx}
                            sx={{ 
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.6,
                              px: 1.1,
                              py: 0.4,
                              borderRadius: 1.5,
                              bgcolor: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              fontSize: '0.74rem',
                              fontWeight: 600,
                              color: '#334155'
                            }}
                          >
                            <i className="pi pi-check" style={{ fontSize: '0.65rem', color: item.color, fontWeight: 'bold' }}></i>
                            <span>{hl}</span>
                          </Box>
                        ))}
                      </Box>
                    )}

                    {/* Card Footer Bar */}
                    <Divider sx={{ my: 0, borderColor: '#f1f5f9' }} />
                    
                    <Box sx={{ 
                      pt: 2, 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center' 
                    }}>
                      <Typography variant="caption" sx={{ 
                        color: '#94a3b8', 
                        fontWeight: 600, 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 0.6,
                        fontSize: '0.74rem'
                      }}>
                        <i className="pi pi-cloud" style={{ fontSize: '0.8rem' }}></i> Cloud Sync
                      </Typography>

                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 0.8, 
                        color: item.color || '#0a387c', 
                        fontWeight: 800,
                        fontSize: '0.84rem'
                      }}>
                        <span>Explore Workflow</span>
                        <i className="pi pi-arrow-right card-arrow-icon" style={{ 
                          fontSize: '0.8rem', 
                          transition: 'transform 0.25s ease' 
                        }}></i>
                      </Box>
                    </Box>

                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>

        </Container>

        {/* Interactive Module Workflow Preview Modal */}
        <Dialog 
          open={Boolean(selectedModule)} 
          onClose={() => setSelectedModule(null)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: { 
              borderRadius: 4, 
              overflow: 'hidden', 
              p: 0,
              boxShadow: '0 25px 60px -15px rgba(10, 56, 124, 0.35)'
            }
          }}
        >
          {selectedModule && (
            <>
              {/* Top Color Accent */}
              <Box sx={{ height: 6, background: selectedModule.gradient }} />
              
              <DialogTitle sx={{ 
                p: 3, 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                borderBottom: '1px solid #e2e8f0',
                bgcolor: '#fafcff'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ 
                    width: 52, height: 52, borderRadius: 2.5, 
                    bgcolor: selectedModule.lightColor, 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: selectedModule.color,
                    boxShadow: `0 8px 18px -4px ${selectedModule.color}40`,
                    border: `1px solid ${selectedModule.color}30`
                  }}>
                    <i className={selectedModule.icon} style={{ fontSize: '1.6rem', color: selectedModule.color }}></i>
                  </Box>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="caption" sx={{ 
                        px: 1.2, py: 0.3, borderRadius: 99, 
                        bgcolor: selectedModule.lightColor, 
                        color: selectedModule.color, 
                        fontWeight: 800, fontSize: '0.72rem' 
                      }}>
                        {selectedModule.tag}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, fontSize: '0.72rem' }}>
                        • {selectedModule.badge}
                      </Typography>
                    </Box>
                    <Typography variant="h5" fontWeight="900" sx={{ color: '#0a387c', lineHeight: 1.2 }}>
                      {selectedModule.title}
                    </Typography>
                  </Box>
                </Box>

                <IconButton onClick={() => setSelectedModule(null)} sx={{ bgcolor: '#f1f5f9', '&:hover': { bgcolor: '#e2e8f0' } }}>
                  <CloseIcon />
                </IconButton>
              </DialogTitle>

              <DialogContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
                <Typography variant="body1" sx={{ color: '#475569', fontSize: '1.02rem', lineHeight: 1.6, mb: 3 }}>
                  {selectedModule.desc}
                </Typography>

                {/* Operational Workflow Steps */}
                <Box sx={{ mb: 3.5, p: 2.5, borderRadius: 3, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <Typography variant="subtitle2" fontWeight="800" sx={{ color: '#0a387c', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <i className="pi pi-compass" style={{ color: selectedModule.color }}></i> Operational Workflow
                  </Typography>
                  
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
                    {selectedModule.workflow?.split('->').map((step, sIdx, arr) => (
                      <React.Fragment key={sIdx}>
                        <Box sx={{ 
                          px: 1.8, py: 0.8, 
                          borderRadius: 2, 
                          bgcolor: '#ffffff', 
                          border: '1px solid #cbd5e1',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                          display: 'flex', alignItems: 'center', gap: 1
                        }}>
                          <Box sx={{ 
                            width: 20, height: 20, borderRadius: '50%', 
                            bgcolor: selectedModule.color, color: '#ffffff', 
                            fontSize: '0.72rem', fontWeight: 800,
                            display: 'flex', alignItems: 'center', justifyContent: 'center' 
                          }}>
                            {sIdx + 1}
                          </Box>
                          <Typography variant="body2" fontWeight="700" sx={{ color: '#1e293b', fontSize: '0.84rem' }}>
                            {step.trim()}
                          </Typography>
                        </Box>
                        {sIdx < arr.length - 1 && (
                          <i className="pi pi-arrow-right" style={{ color: '#94a3b8', fontSize: '0.85rem' }}></i>
                        )}
                      </React.Fragment>
                    ))}
                  </Box>
                </Box>

                <Grid container spacing={2.5}>
                  {/* Primary Stakeholders */}
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ p: 2, borderRadius: 2.5, bgcolor: '#ffffff', border: '1px solid #e2e8f0', height: '100%' }}>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', mb: 0.5 }}>
                        Primary Stakeholders
                      </Typography>
                      <Typography variant="body1" fontWeight="700" sx={{ color: '#0f172a' }}>
                        {selectedModule.targetUser}
                      </Typography>
                    </Box>
                  </Grid>

                  {/* Architecture & Compliance */}
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ p: 2, borderRadius: 2.5, bgcolor: '#ffffff', border: '1px solid #e2e8f0', height: '100%' }}>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', mb: 0.5 }}>
                        Architecture & Compliance
                      </Typography>
                      <Typography variant="body1" fontWeight="700" sx={{ color: '#0f172a' }}>
                        Real-time Cloud Sync • ISO 27001 Secure
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                {/* Capabilities Checklist */}
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" fontWeight="800" sx={{ color: '#0a387c', mb: 1.5 }}>
                    Core Capabilities Included:
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.2 }}>
                    {selectedModule.highlights?.map((hl, hlIdx) => (
                      <Box key={hlIdx} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <i className="pi pi-check-circle" style={{ color: selectedModule.color, fontSize: '1rem' }}></i>
                        <Typography variant="body2" fontWeight="600" sx={{ color: '#334155' }}>
                          {hl}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </DialogContent>

              <DialogActions sx={{ p: 3, pt: 0, gap: 1.5 }}>
                <Button 
                  variant="outlined" 
                  onClick={() => setSelectedModule(null)}
                  sx={{ borderRadius: 99, px: 3, fontWeight: 700, textTransform: 'none', borderColor: '#cbd5e1', color: '#64748b' }}
                >
                  Close Preview
                </Button>
                <Button 
                  variant="contained"
                  onClick={() => {
                    setFormData(prev => ({ 
                      ...prev, 
                      message: `Hi, I would like to schedule a demonstration of the "${selectedModule.title}" module for our institution.` 
                    }));
                    setSelectedModule(null);
                    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  sx={{ 
                    borderRadius: 99, px: 3.5, py: 1.1, 
                    fontWeight: 800, textTransform: 'none',
                    background: 'linear-gradient(135deg, #0a387c 0%, #1e40af 100%)',
                    boxShadow: '0 8px 20px -4px rgba(10, 56, 124, 0.4)'
                  }}
                >
                  Book Live Demo For This Module &rarr;
                </Button>
              </DialogActions>
            </>
          )}
        </Dialog>
      </Box>

      {/* Why Choose Us - 3 Pillars (Academics, Administration, Finance) */}
      <Box id="why-us" sx={{ py: 10, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
        <Container maxWidth="xl">
          <Box sx={{ textAlign: 'center', mb: 6 }} data-aos="fade-up">
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
                desc: 'Eliminate fee leakages with automated POS counters, fee concessions, instant online gateway collection, and daily collection reports.'
              }
            ].map((pillar, idx) => (
              <Grid item xs={12} md={4} key={idx} data-aos="fade-up" data-aos-delay={idx * 120}>
                <Paper 
                  className="eduerp-3d-card"
                  sx={{ 
                    p: 4.5, 
                    height: '100%', 
                    borderRadius: 4, 
                    bgcolor: '#ffffff', 
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.03)',
                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                >
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
          <Paper 
            data-aos="zoom-in"
            className="eduerp-3d-card"
            sx={{ 
              p: { xs: 4, md: 6 }, 
              borderRadius: 4.5, 
              bgcolor: '#ffffff', 
              color: '#12233f',
              boxShadow: '0 30px 70px -15px rgba(0,0,0,0.6)'
            }}
          >
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
                    className="eduerp-btn-shimmer"
                    sx={{ 
                      py: 1.75, 
                      fontWeight: 900, 
                      fontSize: '1.05rem',
                      borderRadius: 3,
                      textTransform: 'none',
                      color: '#12233f',
                      boxShadow: '0 12px 28px -10px rgba(255, 176, 0, 0.7)'
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
                <Box 
                  component="img"
                  src="/dvslogo1.jpeg"
                  alt="Digital Vidya Saarthi"
                  sx={{ width: 44, height: 44, objectFit: 'contain', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))' }}
                />
                <Typography variant="h6" fontWeight="900" sx={{ color: '#ffffff' }}>
                  Digital Vidya Saarthi ERP
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
