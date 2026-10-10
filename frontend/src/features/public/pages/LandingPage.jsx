import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, Container, Grid, Card, CardMedia, Avatar, 
  useTheme, Paper, AppBar, Toolbar, IconButton, TextField, Accordion, 
  AccordionSummary, AccordionDetails, Snackbar, Alert
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SchoolIcon from '@mui/icons-material/School';
import MenuIcon from '@mui/icons-material/Menu';
import apiClient from '../../../api/client';

// Mock images from the system
const screenshotFeatures = [
  {
    title: 'Comprehensive LMS & ERP Dashboard',
    description: 'A unified platform for schools and colleges. Seamlessly manage attendance, fees, and academic records while gaining real-time insights.',
    image: '/images/erp_dashboard.jpg',
  },
  {
    title: 'Smart Attendance with AI Analytics',
    description: 'Automate attendance marking and instantly notify parents. Role-based portals ensure maximum security and privacy.',
    image: '/images/erp_attendance.jpg',
  },
  {
    title: 'Next-Gen Fee Management',
    description: 'End-to-end financial operations. From dynamic fee structures to automated payment reminders and professional receipt generation.',
    image: '/images/erp_fees.jpg',
  },
];

const highlights = [
  { icon: <AutoAwesomeIcon fontSize="large" />, title: "AI-Powered Analytics", desc: "Intelligent analytics for student performance and institutional growth." },
  { icon: <SmartToyIcon fontSize="large" />, title: "Robotics & STEM", desc: "Integrated curriculum modules for future tech and skill development." },
  { icon: <FlightTakeoffIcon fontSize="large" />, title: "Drone Tech", desc: "Empowering innovators with advanced learning tools and modern systems." },
];

const detailedModules = [
  { icon: 'pi pi-users', title: 'Student Management', desc: 'Manage admissions, records, and promotions easily.' },
  { icon: 'pi pi-check-square', title: 'Smart Attendance', desc: 'App-based and biometric attendance with instant parent SMS.' },
  { icon: 'pi pi-money-bill', title: 'Fee Collection', desc: 'Online payments, automated receipts, and due reminders.' },
  { icon: 'pi pi-calendar-times', title: 'Timetable & Bell', desc: 'Automated scheduler with IoT enabled school bell.' },
  { icon: 'pi pi-book', title: 'Examinations', desc: 'Design report cards, grade books, and CCE evaluation.' },
  { icon: 'pi pi-box', title: 'Inventory System', desc: 'Track assets, uniforms, books, and supplier bills.' },
  { icon: 'pi pi-id-card', title: 'HR & Payroll', desc: 'Manage staff attendance, salary, and leaves efficiently.' },
  { icon: 'pi pi-car', title: 'Transport', desc: 'Vehicle tracking, route management, and transport fees.' },
];

const faqs = [
  { q: 'Can this ERP handle multiple branches?', a: 'Yes! DVS ERP is a multi-tenant system that allows Super Admins to manage infinite branches from a single unified dashboard.' },
  { q: 'Is the data secure?', a: 'Absolutely. We use enterprise-grade encryption and role-based access control (RBAC) to ensure your data is always safe.' },
  { q: 'Do you offer a mobile app for parents?', a: 'Yes, parents get dedicated portals to check fees, attendance, report cards, and daily homework.' },
  { q: 'Can we integrate biometric attendance?', a: 'Yes, our platform supports API integration with major biometric and RFID devices.' },
];

export const LandingPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [formData, setFormData] = useState({ name: '', school: '', phone: '', email: '', message: '' });
  const [toastOpen, setToastOpen] = useState(false);

  // Generate 20 clients
  const clients = Array.from({ length: 20 }, (_, i) => ({
    name: `Principal / Director ${i + 1}`,
    school: `Excellence Academy ${i + 1}`,
    text: `DVS ERP completely transformed how we operate. The AI analytics and fee management are outstanding. Highly recommended!`,
    avatar: `https://i.pravatar.cc/150?img=${(i % 50) + 1}`,
  }));

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % clients.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [clients.length]);

  const handleEnquirySubmit = async (e) => {
    e.preventDefault();
    try {
      // In a real app, this posts to a Lead / Contact endpoint
      await apiClient.post('/public/enquiry', { ...formData, schoolName: formData.school });
      setToastOpen(true);
      setFormData({ name: '', school: '', phone: '', email: '', message: '' });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', color: '#0f172a', fontFamily: '"Inter", sans-serif' }}>
      
      {/* Sticky Navbar */}
      <AppBar position="sticky" sx={{ bgcolor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', color: '#0f172a', boxShadow: 1 }}>
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }} onClick={() => window.scrollTo(0,0)}>
            <SchoolIcon sx={{ color: '#2563eb', fontSize: 32 }} />
            <Typography variant="h6" fontWeight="bold" sx={{ color: '#1e293b' }}>
              Digital Vidya Saarthi
            </Typography>
          </Box>
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 3, alignItems: 'center' }}>
            <a href="#" style={{ textDecoration: 'none', color: '#475569', fontWeight: 600 }}>Home</a>
            <a href="#features" style={{ textDecoration: 'none', color: '#475569', fontWeight: 600 }}>Features</a>
            <a href="#modules" style={{ textDecoration: 'none', color: '#475569', fontWeight: 600 }}>Modules</a>
            <a href="#clients" style={{ textDecoration: 'none', color: '#475569', fontWeight: 600 }}>Clients</a>
            <a href="#faq" style={{ textDecoration: 'none', color: '#475569', fontWeight: 600 }}>FAQ</a>
            <a href="#contact" style={{ textDecoration: 'none', color: '#475569', fontWeight: 600 }}>Contact</a>
            <Button variant="contained" sx={{ bgcolor: '#2563eb', borderRadius: 8, px: 3 }} onClick={() => navigate('/login')}>
              Login
            </Button>
          </Box>
          <IconButton sx={{ display: { xs: 'flex', md: 'none' } }}>
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Hero Section */}
      <Box sx={{ 
        pt: { xs: 8, md: 15 }, pb: { xs: 8, md: 12 }, px: 2, 
        textAlign: 'center', 
        background: 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)',
        position: 'relative', overflow: 'hidden'
      }}>
        <Container maxWidth="md">
          <Typography variant="h2" fontWeight="900" sx={{ mb: 3, color: '#1e293b', fontSize: { xs: '2.5rem', md: '3.5rem' }, lineHeight: 1.2 }}>
            The Operating System for <br />
            <span style={{ color: '#2563eb' }}>Next-Gen Schools</span>
          </Typography>
          <Typography variant="h6" sx={{ mb: 5, color: '#475569', fontWeight: 400 }}>
            Empower your institution with DVS ERP. Integrated with AI Analytics, Robotics, and Drone Tech frameworks to prepare students for tomorrow.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
            <Button variant="contained" size="large" onClick={() => navigate('/login')} sx={{ bgcolor: '#2563eb', borderRadius: 8, px: 5, py: 1.5, fontSize: '1.1rem' }}>
              Access ERP Portal
            </Button>
            <Button variant="outlined" size="large" href="#contact" sx={{ borderRadius: 8, px: 5, py: 1.5, fontSize: '1.1rem', borderColor: '#cbd5e1', color: '#334155' }}>
              Request Demo
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Core Highlights */}
      <Container id="features" sx={{ py: 10 }}>
        <Grid container spacing={4}>
          {highlights.map((item, idx) => (
            <Grid item xs={12} md={4} key={idx}>
              <Paper sx={{ p: 4, textAlign: 'center', height: '100%', borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', transition: 'transform 0.3s', '&:hover': { transform: 'translateY(-5px)' } }}>
                <Box sx={{ color: '#2563eb', mb: 2 }}>{item.icon}</Box>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>{item.title}</Typography>
                <Typography color="textSecondary">{item.desc}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Detailed Features / Screenshots */}
      <Box sx={{ bgcolor: '#ffffff', py: 10 }}>
        <Container>
          <Typography variant="h3" fontWeight="bold" textAlign="center" sx={{ mb: 8 }}>
            Beautiful. Powerful. <span style={{ color: '#2563eb' }}>Intuitive.</span>
          </Typography>
          {screenshotFeatures.map((feat, idx) => (
            <Grid container spacing={6} alignItems="center" key={idx} sx={{ mb: { xs: 8, md: 12 }, flexDirection: idx % 2 === 0 ? 'row' : 'row-reverse' }}>
              <Grid item xs={12} md={6}>
                <Typography variant="h4" fontWeight="bold" sx={{ mb: 2, color: '#1e293b' }}>{feat.title}</Typography>
                <Typography variant="h6" sx={{ color: '#64748b', mb: 4, fontWeight: 400, lineHeight: 1.6 }}>{feat.description}</Typography>
                <Button variant="text" sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Explore Feature &rarr;</Button>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card sx={{ borderRadius: 4, boxShadow: '0 20px 40px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                  <CardMedia component="img" image={feat.image} alt={feat.title} sx={{ width: '100%', height: 'auto', display: 'block' }} />
                </Card>
              </Grid>
            </Grid>
          ))}
        </Container>
      </Box>

      {/* Comprehensive Modules Grid */}
      <Container id="modules" sx={{ py: 10 }}>
        <Typography variant="h3" fontWeight="bold" textAlign="center" sx={{ mb: 2 }}>
          Everything You Need
        </Typography>
        <Typography variant="h6" textAlign="center" color="textSecondary" sx={{ mb: 8, fontWeight: 400 }}>
          30+ Modules designed specifically for the unique needs of Indian Educational Institutions.
        </Typography>
        
        <Grid container spacing={3}>
          {detailedModules.map((mod, idx) => (
            <Grid item xs={12} sm={6} md={3} key={idx}>
              <Paper sx={{ p: 3, height: '100%', borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                <i className={mod.icon} style={{ fontSize: '2rem', color: '#2563eb', marginBottom: '16px', display: 'block' }}></i>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 1, fontSize: '1.1rem' }}>{mod.title}</Typography>
                <Typography variant="body2" color="textSecondary">{mod.desc}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Clients Marquee Section */}
      <Box id="clients" sx={{ bgcolor: '#f8fafc', py: 10, overflow: 'hidden' }}>
        <Container maxWidth="lg">
          <Typography variant="overline" display="block" textAlign="center" sx={{ color: '#f97316', fontWeight: 'bold', letterSpacing: 2 }}>
            TRUSTED BY
          </Typography>
          <Typography variant="h3" fontWeight="900" textAlign="center" sx={{ mb: 6, color: '#0f172a' }}>
            <span style={{ color: '#2563eb' }}>OUR</span> <span style={{ color: '#f97316' }}>CLIENTS</span>
          </Typography>

          <style>{`
            @keyframes scroll {
              0% { transform: translateX(0); }
              100% { transform: translateX(calc(-250px * 10)); }
            }
            .marquee-track {
              display: flex;
              width: calc(250px * 20);
              animation: scroll 30s linear infinite;
            }
            .marquee-track:hover {
              animation-play-state: paused;
            }
          `}</style>

          <Box sx={{ position: 'relative', width: '100%', overflow: 'hidden', py: 2 }}>
            {/* Left and Right Fade Overlays for smooth scrolling edges */}
            <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100px', height: '100%', background: 'linear-gradient(to right, #f8fafc, transparent)', zIndex: 2 }} />
            <Box sx={{ position: 'absolute', top: 0, right: 0, width: '100px', height: '100%', background: 'linear-gradient(to left, #f8fafc, transparent)', zIndex: 2 }} />
            
            <Box className="marquee-track">
              {/* Render twice for continuous loop (10 original + 10 duplicate) */}
              {[...Array(20)].map((_, idx) => (
                <Paper 
                  key={idx} 
                  sx={{ 
                    minWidth: '200px', height: '100px', 
                    mx: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 2, boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                    border: '1px solid #e2e8f0', bgcolor: 'white',
                    filter: 'grayscale(100%) opacity(70%)',
                    transition: 'all 0.3s ease',
                    '&:hover': { filter: 'grayscale(0%) opacity(100%)', transform: 'scale(1.05)' }
                  }}
                >
                  {/* Using a placeholder school logo/icon */}
                  <SchoolIcon sx={{ fontSize: 40, color: '#94a3b8', mr: 1 }} />
                  <Typography fontWeight="bold" sx={{ color: '#64748b' }}>
                    School { (idx % 10) + 1 }
                  </Typography>
                </Paper>
              ))}
            </Box>
          </Box>
        </Container>
      </Box>

      {/* FAQ Section */}
      <Container id="faq" sx={{ py: 10, maxWidth: '800px !important' }}>
        <Typography variant="h3" fontWeight="bold" textAlign="center" sx={{ mb: 6 }}>
          Frequently Asked Questions
        </Typography>
        {faqs.map((faq, idx) => (
          <Accordion key={idx} sx={{ mb: 2, border: '1px solid #e2e8f0', boxShadow: 'none', '&:before': { display: 'none' }, borderRadius: '8px !important' }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography fontWeight="bold" fontSize="1.1rem">{faq.q}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography color="textSecondary">{faq.a}</Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Container>

      {/* Enquiry Form */}
      <Box id="contact" sx={{ bgcolor: '#e0e7ff', py: 10 }}>
        <Container maxWidth="md">
          <Paper sx={{ p: { xs: 4, md: 6 }, borderRadius: 4, boxShadow: '0 10px 30px rgba(37, 99, 235, 0.1)' }}>
            <Typography variant="h4" fontWeight="bold" textAlign="center" sx={{ mb: 1 }}>Request a Demo</Typography>
            <Typography textAlign="center" color="textSecondary" sx={{ mb: 5 }}>Leave your details and our team will contact you shortly.</Typography>
            
            <form onSubmit={handleEnquirySubmit}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Your Name" variant="outlined" required 
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="School / Institution Name" variant="outlined" required 
                    value={formData.school} onChange={e => setFormData({...formData, school: e.target.value})} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Phone Number" variant="outlined" required 
                    value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value.replace(/\D/g, '')})} inputProps={{ maxLength: 10, pattern: "[0-9]{10}", title: "Please enter exactly 10 digits" }} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Email Address" type="email" variant="outlined" 
                    value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth label="Message / Requirements" multiline rows={4} variant="outlined" 
                    value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} />
                </Grid>
                <Grid item xs={12}>
                  <Button type="submit" variant="contained" size="large" fullWidth sx={{ bgcolor: '#2563eb', py: 1.5, fontSize: '1.1rem', borderRadius: 2 }}>
                    Submit Enquiry
                  </Button>
                </Grid>
              </Grid>
            </form>
          </Paper>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ bgcolor: '#020617', color: '#94a3b8', py: 6 }}>
        <Container>
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <SchoolIcon sx={{ color: '#38bdf8', fontSize: 28 }} />
                <Typography variant="h6" fontWeight="bold" sx={{ color: 'white' }}>
                  Digital Vidya Saarthi
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.6 }}>
                Digital Vidya Saarthi is a complete one-stop solution for educational institutions, bringing technology and essential digital services under one roof for schools, colleges, and learning centers.
              </Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="h6" color="white" fontWeight="bold" sx={{ mb: 2 }}>Features</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <a href="#features" style={{ color: '#94a3b8', textDecoration: 'none' }}>Fee Management</a>
                <a href="#features" style={{ color: '#94a3b8', textDecoration: 'none' }}>Attendance</a>
                <a href="#features" style={{ color: '#94a3b8', textDecoration: 'none' }}>Parent Portal</a>
                <a href="#features" style={{ color: '#94a3b8', textDecoration: 'none' }}>Report Cards</a>
              </Box>
            </Grid>
            <Grid item xs={12} md={5}>
              <Typography variant="h6" color="white" fontWeight="bold" sx={{ mb: 2 }}>Contact Us</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="white" sx={{ mb: 0.5 }}>Our Address</Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>Faridabad, Delhi, Noida, HaryanaMuzaffarpur(Bihar), Motihari(Bihar)</Typography>
                  
                  <Typography variant="subtitle2" color="white" sx={{ mb: 0.5 }}>Working Hours</Typography>
                  <Typography variant="body2">Mon - Fri: 09:00 AM - 4:00 PM</Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>Sat - Sun: 11:00 AM - 4:00 PM</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="white" sx={{ mb: 0.5 }}>Mobile</Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>9873993957, 9873998949</Typography>
                  
                  <Typography variant="subtitle2" color="white" sx={{ mb: 0.5 }}>Mail</Typography>
                  <Typography variant="body2">digitalvidyasaarthi@gmail.com</Typography>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
          <Box sx={{ borderTop: '1px solid #1e293b', mt: 6, pt: 3, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2">
              &copy; 2026 DigitalVidyaSaarthi. Build the Future.
            </Typography>
            <Box sx={{ display: 'flex', gap: 3 }}>
              <a href="#" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem' }}>Privacy Policy</a>
              <a href="#" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem' }}>Terms of Use</a>
              <a href="#" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem' }}>Advisory Board</a>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Snackbar for Form Submit */}
      <Snackbar open={toastOpen} autoHideDuration={5000} onClose={() => setToastOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setToastOpen(false)} severity="success" sx={{ width: '100%', boxShadow: 3 }}>
          Thank you! Your enquiry has been sent to our Super Admin team successfully. We will get back to you soon.
        </Alert>
      </Snackbar>
    </Box>
  );
};
