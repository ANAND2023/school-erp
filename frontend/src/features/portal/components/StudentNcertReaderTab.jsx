import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  TextField,
  InputAdornment,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Alert,
  Tooltip
} from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SearchIcon from '@mui/icons-material/Search';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CloseIcon from '@mui/icons-material/Close';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import DownloadForOfflineIcon from '@mui/icons-material/DownloadForOffline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

// NCERT Curated textbook catalog with high-availability verified PDF sources
const NCERT_BOOKS_CATALOG = [
  // Class 10
  {
    id: 'c10-math',
    classLevel: '10',
    subject: 'Mathematics',
    title: 'Mathematics (NCERT Class 10)',
    medium: 'English',
    color: '#0284c7',
    coverIcon: '📐',
    officialUrl: 'https://ncert.nic.in/textbook.php?jemh1=0-15',
    chapters: [
      { num: 1, name: 'Real Numbers', pdfUrl: 'https://ia800609.us.archive.org/31/items/ncert-jemh1/jemh101.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?jemh1=1-15' },
      { num: 2, name: 'Polynomials', pdfUrl: 'https://ia800609.us.archive.org/31/items/ncert-jemh1/jemh102.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?jemh1=2-15' },
      { num: 3, name: 'Pair of Linear Equations in Two Variables', pdfUrl: 'https://ia800609.us.archive.org/31/items/ncert-jemh1/jemh103.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?jemh1=3-15' },
      { num: 4, name: 'Quadratic Equations', pdfUrl: 'https://ia800609.us.archive.org/31/items/ncert-jemh1/jemh104.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?jemh1=4-15' },
      { num: 5, name: 'Arithmetic Progressions', pdfUrl: 'https://ia800609.us.archive.org/31/items/ncert-jemh1/jemh105.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?jemh1=5-15' },
      { num: 6, name: 'Triangles', pdfUrl: 'https://ia800609.us.archive.org/31/items/ncert-jemh1/jemh106.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?jemh1=6-15' },
      { num: 7, name: 'Coordinate Geometry', pdfUrl: 'https://ia800609.us.archive.org/31/items/ncert-jemh1/jemh107.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?jemh1=7-15' },
      { num: 8, name: 'Introduction to Trigonometry', pdfUrl: 'https://ia800609.us.archive.org/31/items/ncert-jemh1/jemh108.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?jemh1=8-15' },
    ]
  },
  {
    id: 'c10-sci',
    classLevel: '10',
    subject: 'Science',
    title: 'Science (NCERT Class 10)',
    medium: 'English',
    color: '#059669',
    coverIcon: '🔬',
    officialUrl: 'https://ncert.nic.in/textbook.php?jesc1=0-16',
    chapters: [
      { num: 1, name: 'Chemical Reactions and Equations', pdfUrl: 'https://archive.org/download/ncert-jesc1/jesc101.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?jesc1=1-16' },
      { num: 2, name: 'Acids, Bases and Salts', pdfUrl: 'https://archive.org/download/ncert-jesc1/jesc102.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?jesc1=2-16' },
      { num: 3, name: 'Metals and Non-metals', pdfUrl: 'https://archive.org/download/ncert-jesc1/jesc103.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?jesc1=3-16' },
      { num: 4, name: 'Carbon and its Compounds', pdfUrl: 'https://archive.org/download/ncert-jesc1/jesc104.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?jesc1=4-16' },
      { num: 5, name: 'Life Processes', pdfUrl: 'https://archive.org/download/ncert-jesc1/jesc105.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?jesc1=5-16' },
      { num: 6, name: 'Control and Coordination', pdfUrl: 'https://archive.org/download/ncert-jesc1/jesc106.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?jesc1=6-16' },
      { num: 7, name: 'How do Organisms Reproduce?', pdfUrl: 'https://archive.org/download/ncert-jesc1/jesc107.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?jesc1=7-16' },
      { num: 8, name: 'Heredity and Evolution', pdfUrl: 'https://archive.org/download/ncert-jesc1/jesc108.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?jesc1=8-16' },
      { num: 9, name: 'Light - Reflection and Refraction', pdfUrl: 'https://archive.org/download/ncert-jesc1/jesc109.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?jesc1=9-16' },
      { num: 10, name: 'Electricity', pdfUrl: 'https://archive.org/download/ncert-jesc1/jesc110.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?jesc1=10-16' },
    ]
  },
  {
    id: 'c10-eng',
    classLevel: '10',
    subject: 'English',
    title: 'First Flight (Class 10)',
    medium: 'English',
    color: '#d97706',
    coverIcon: '📖',
    officialUrl: 'https://ncert.nic.in/textbook.php?jeff1=0-11',
    chapters: [
      { num: 1, name: 'A Letter to God', pdfUrl: 'https://archive.org/download/ncert-jeff1/jeff101.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?jeff1=1-11' },
      { num: 2, name: 'Nelson Mandela: Long Walk to Freedom', pdfUrl: 'https://archive.org/download/ncert-jeff1/jeff102.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?jeff1=2-11' },
      { num: 3, name: 'Two Stories about Flying', pdfUrl: 'https://archive.org/download/ncert-jeff1/jeff103.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?jeff1=3-11' },
      { num: 4, name: 'From the Diary of Anne Frank', pdfUrl: 'https://archive.org/download/ncert-jeff1/jeff104.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?jeff1=4-11' },
    ]
  },
  {
    id: 'c10-sst',
    classLevel: '10',
    subject: 'Social Science',
    title: 'India and the Contemporary World - II (History)',
    medium: 'English',
    color: '#7c3aed',
    coverIcon: '🌍',
    officialUrl: 'https://ncert.nic.in/textbook.php?jess3=0-5',
    chapters: [
      { num: 1, name: 'The Rise of Nationalism in Europe', pdfUrl: 'https://archive.org/download/ncert-jess3/jess301.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?jess3=1-5' },
      { num: 2, name: 'Nationalism in India', pdfUrl: 'https://archive.org/download/ncert-jess3/jess302.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?jess3=2-5' },
      { num: 3, name: 'The Making of a Global World', pdfUrl: 'https://archive.org/download/ncert-jess3/jess303.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?jess3=3-5' },
    ]
  },

  // Class 9
  {
    id: 'c9-math',
    classLevel: '9',
    subject: 'Mathematics',
    title: 'Mathematics (NCERT Class 9)',
    medium: 'English',
    color: '#0284c7',
    coverIcon: '📐',
    officialUrl: 'https://ncert.nic.in/textbook.php?iemh1=0-15',
    chapters: [
      { num: 1, name: 'Number Systems', pdfUrl: 'https://archive.org/download/ncert-iemh1/iemh101.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?iemh1=1-15' },
      { num: 2, name: 'Polynomials', pdfUrl: 'https://archive.org/download/ncert-iemh1/iemh102.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?iemh1=2-15' },
      { num: 3, name: 'Coordinate Geometry', pdfUrl: 'https://archive.org/download/ncert-iemh1/iemh103.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?iemh1=3-15' },
      { num: 4, name: 'Linear Equations in Two Variables', pdfUrl: 'https://archive.org/download/ncert-iemh1/iemh104.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?iemh1=4-15' },
      { num: 5, name: 'Lines and Angles', pdfUrl: 'https://archive.org/download/ncert-iemh1/iemh106.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?iemh1=6-15' },
    ]
  },
  {
    id: 'c9-sci',
    classLevel: '9',
    subject: 'Science',
    title: 'Science (NCERT Class 9)',
    medium: 'English',
    color: '#059669',
    coverIcon: '🧪',
    officialUrl: 'https://ncert.nic.in/textbook.php?iesc1=0-15',
    chapters: [
      { num: 1, name: 'Matter in Our Surroundings', pdfUrl: 'https://archive.org/download/ncert-iesc1/iesc101.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?iesc1=1-15' },
      { num: 2, name: 'Is Matter Around Us Pure', pdfUrl: 'https://archive.org/download/ncert-iesc1/iesc102.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?iesc1=2-15' },
      { num: 3, name: 'Atoms and Molecules', pdfUrl: 'https://archive.org/download/ncert-iesc1/iesc103.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?iesc1=3-15' },
      { num: 4, name: 'Structure of the Atom', pdfUrl: 'https://archive.org/download/ncert-iesc1/iesc104.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?iesc1=4-15' },
      { num: 5, name: 'The Fundamental Unit of Life', pdfUrl: 'https://archive.org/download/ncert-iesc1/iesc105.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?iesc1=5-15' },
      { num: 6, name: 'Tissues', pdfUrl: 'https://archive.org/download/ncert-iesc1/iesc106.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?iesc1=6-15' },
      { num: 7, name: 'Motion', pdfUrl: 'https://archive.org/download/ncert-iesc1/iesc108.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?iesc1=8-15' },
    ]
  },

  // Class 8
  {
    id: 'c8-math',
    classLevel: '8',
    subject: 'Mathematics',
    title: 'Mathematics (NCERT Class 8)',
    medium: 'English',
    color: '#0284c7',
    coverIcon: '📐',
    officialUrl: 'https://ncert.nic.in/textbook.php?hemh1=0-16',
    chapters: [
      { num: 1, name: 'Rational Numbers', pdfUrl: 'https://archive.org/download/ncert-hemh1/hemh101.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?hemh1=1-16' },
      { num: 2, name: 'Linear Equations in One Variable', pdfUrl: 'https://archive.org/download/ncert-hemh1/hemh102.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?hemh1=2-16' },
      { num: 3, name: 'Understanding Quadrilaterals', pdfUrl: 'https://archive.org/download/ncert-hemh1/hemh103.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?hemh1=3-16' },
      { num: 4, name: 'Data Handling', pdfUrl: 'https://archive.org/download/ncert-hemh1/hemh105.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?hemh1=5-16' },
    ]
  },
  {
    id: 'c8-sci',
    classLevel: '8',
    subject: 'Science',
    title: 'Science (NCERT Class 8)',
    medium: 'English',
    color: '#059669',
    coverIcon: '🌱',
    officialUrl: 'https://ncert.nic.in/textbook.php?hesc1=0-18',
    chapters: [
      { num: 1, name: 'Crop Production and Management', pdfUrl: 'https://archive.org/download/ncert-hesc1/hesc101.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?hesc1=1-18' },
      { num: 2, name: 'Microorganisms : Friend and Foe', pdfUrl: 'https://archive.org/download/ncert-hesc1/hesc102.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?hesc1=2-18' },
      { num: 3, name: 'Synthetic Fibres and Plastics', pdfUrl: 'https://archive.org/download/ncert-hesc1/hesc103.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?hesc1=3-18' },
    ]
  },

  // Class 7
  {
    id: 'c7-math',
    classLevel: '7',
    subject: 'Mathematics',
    title: 'Mathematics (NCERT Class 7)',
    medium: 'English',
    color: '#0284c7',
    coverIcon: '📐',
    officialUrl: 'https://ncert.nic.in/textbook.php?gemh1=0-15',
    chapters: [
      { num: 1, name: 'Integers', pdfUrl: 'https://archive.org/download/ncert-gemh1/gemh101.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?gemh1=1-15' },
      { num: 2, name: 'Fractions and Decimals', pdfUrl: 'https://archive.org/download/ncert-gemh1/gemh102.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?gemh1=2-15' },
      { num: 3, name: 'Data Handling', pdfUrl: 'https://archive.org/download/ncert-gemh1/gemh103.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?gemh1=3-15' },
    ]
  },
  {
    id: 'c7-sci',
    classLevel: '7',
    subject: 'Science',
    title: 'Science (NCERT Class 7)',
    medium: 'English',
    color: '#059669',
    coverIcon: '🍃',
    officialUrl: 'https://ncert.nic.in/textbook.php?gesc1=0-18',
    chapters: [
      { num: 1, name: 'Nutrition in Plants', pdfUrl: 'https://archive.org/download/ncert-gesc1/gesc101.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?gesc1=1-18' },
      { num: 2, name: 'Nutrition in Animals', pdfUrl: 'https://archive.org/download/ncert-gesc1/gesc102.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?gesc1=2-18' },
      { num: 3, name: 'Heat', pdfUrl: 'https://archive.org/download/ncert-gesc1/gesc104.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?gesc1=4-18' },
    ]
  },

  // Class 6
  {
    id: 'c6-math',
    classLevel: '6',
    subject: 'Mathematics',
    title: 'Mathematics (NCERT Class 6)',
    medium: 'English',
    color: '#0284c7',
    coverIcon: '🔢',
    officialUrl: 'https://ncert.nic.in/textbook.php?femh1=0-14',
    chapters: [
      { num: 1, name: 'Knowing Our Numbers', pdfUrl: 'https://archive.org/download/ncert-femh1/femh101.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?femh1=1-14' },
      { num: 2, name: 'Whole Numbers', pdfUrl: 'https://archive.org/download/ncert-femh1/femh102.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?femh1=2-14' },
      { num: 3, name: 'Playing With Numbers', pdfUrl: 'https://archive.org/download/ncert-femh1/femh103.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?femh1=3-14' },
      { num: 4, name: 'Basic Geometrical Ideas', pdfUrl: 'https://archive.org/download/ncert-femh1/femh104.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?femh1=4-14' },
    ]
  },
  {
    id: 'c6-sci',
    classLevel: '6',
    subject: 'Science',
    title: 'Science (NCERT Class 6)',
    medium: 'English',
    color: '#059669',
    coverIcon: '🌿',
    officialUrl: 'https://ncert.nic.in/textbook.php?fesc1=0-12',
    chapters: [
      { num: 1, name: 'Food: Where Does It Come From?', pdfUrl: 'https://archive.org/download/ncert-fesc1/fesc101.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?fesc1=1-12' },
      { num: 2, name: 'Components of Food', pdfUrl: 'https://archive.org/download/ncert-fesc1/fesc102.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?fesc1=2-12' },
      { num: 3, name: 'Fibre to Fabric', pdfUrl: 'https://archive.org/download/ncert-fesc1/fesc103.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?fesc1=3-12' },
    ]
  },

  // Class 11 & 12
  {
    id: 'c11-phy',
    classLevel: '11',
    subject: 'Physics',
    title: 'Physics Part I (Class 11)',
    medium: 'English',
    color: '#2563eb',
    coverIcon: '⚡',
    officialUrl: 'https://ncert.nic.in/textbook.php?keph1=0-8',
    chapters: [
      { num: 1, name: 'Units and Measurements', pdfUrl: 'https://archive.org/download/ncert-keph1/keph101.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?keph1=1-8' },
      { num: 2, name: 'Motion in a Straight Line', pdfUrl: 'https://archive.org/download/ncert-keph1/keph102.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?keph1=2-8' },
      { num: 3, name: 'Motion in a Plane', pdfUrl: 'https://archive.org/download/ncert-keph1/keph103.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?keph1=3-8' },
    ]
  },
  {
    id: 'c12-phy',
    classLevel: '12',
    subject: 'Physics',
    title: 'Physics Part I (Class 12)',
    medium: 'English',
    color: '#2563eb',
    coverIcon: '⚛️',
    officialUrl: 'https://ncert.nic.in/textbook.php?leph1=0-8',
    chapters: [
      { num: 1, name: 'Electric Charges and Fields', pdfUrl: 'https://archive.org/download/ncert-leph1/leph101.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?leph1=1-8' },
      { num: 2, name: 'Electrostatic Potential and Capacitance', pdfUrl: 'https://archive.org/download/ncert-leph1/leph102.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?leph1=2-8' },
      { num: 3, name: 'Current Electricity', pdfUrl: 'https://archive.org/download/ncert-leph1/leph103.pdf', ncertUrl: 'https://ncert.nic.in/textbook.php?leph1=3-8' },
    ]
  }
];

export const StudentNcertReaderTab = ({ student, isDarkMode, primaryColor }) => {
  const defaultClass = (() => {
    if (!student?.className) return '10';
    const match = student.className.match(/\d+/);
    return match ? match[0] : '10';
  })();

  const [selectedClass, setSelectedClass] = useState(defaultClass);
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Chapter viewer dialog state
  const [selectedBook, setSelectedBook] = useState(null);
  const [activePdfUrl, setActivePdfUrl] = useState(null);
  const [activePdfTitle, setActivePdfTitle] = useState('');

  const filteredBooks = NCERT_BOOKS_CATALOG.filter((book) => {
    const matchClass = selectedClass === 'All' || book.classLevel === selectedClass;
    const matchSubject = selectedSubject === 'All' || book.subject === selectedSubject;
    const matchSearch =
      searchQuery.trim() === '' ||
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.chapters.some((ch) => ch.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchClass && matchSubject && matchSearch;
  });

  const availableSubjects = ['All', ...new Set(NCERT_BOOKS_CATALOG.map((b) => b.subject))];

  const handleOpenReader = (chapter, book) => {
    setSelectedBook(null);
    setActivePdfUrl(chapter.pdfUrl);
    setActivePdfTitle(`${book.title} — Ch ${chapter.num}: ${chapter.name}`);
  };

  return (
    <Box>
      {/* Top Welcome / Filter Bar */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 3,
          borderRadius: 2.5,
          border: '1px solid',
          borderColor: isDarkMode ? '#334155' : '#e2e8f0',
          bgcolor: isDarkMode ? '#1e293b' : '#ffffff',
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2} sx={{ mb: 2.5 }}>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h6" fontWeight={800} color={isDarkMode ? '#f8fafc' : '#0f172a'}>
                📚 NCERT E-Books & Chapter Reader
              </Typography>
              <Chip
                label="Official NCERT Curriculum"
                size="small"
                sx={{ bgcolor: '#0284c715', color: '#0284c7', fontWeight: 700 }}
              />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Free digital library for school students. Read chapter PDFs online directly or download for revision.
            </Typography>
          </Box>

          <Button
            variant="outlined"
            size="small"
            startIcon={<OpenInNewIcon />}
            href="https://ncert.nic.in/textbook.php"
            target="_blank"
            rel="noopener noreferrer"
            sx={{ textTransform: 'none', borderRadius: 2 }}
          >
            NCERT Official Portal
          </Button>
        </Stack>

        {/* Filter Controls */}
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Class</InputLabel>
              <Select
                value={selectedClass}
                label="Class"
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                <MenuItem value="All">All Classes (6 to 12)</MenuItem>
                <MenuItem value="6">Class 6</MenuItem>
                <MenuItem value="7">Class 7</MenuItem>
                <MenuItem value="8">Class 8</MenuItem>
                <MenuItem value="9">Class 9</MenuItem>
                <MenuItem value="10">Class 10</MenuItem>
                <MenuItem value="11">Class 11</MenuItem>
                <MenuItem value="12">Class 12</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Subject</InputLabel>
              <Select
                value={selectedSubject}
                label="Subject"
                onChange={(e) => setSelectedSubject(e.target.value)}
              >
                {availableSubjects.map((sub) => (
                  <MenuItem key={sub} value={sub}>{sub}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search textbook or chapter name (e.g., 'Real Numbers', 'Light')..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Book Cards Grid */}
      {filteredBooks.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: 2,
            border: '1px solid',
            borderColor: isDarkMode ? '#334155' : '#e2e8f0',
            bgcolor: isDarkMode ? '#1e293b' : '#ffffff'
          }}
        >
          <MenuBookIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
          <Typography variant="subtitle1" fontWeight={700}>
            No textbooks match your filter
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Try switching class or clearing the search query.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2.5}>
          {filteredBooks.map((book) => (
            <Grid item xs={12} sm={6} md={4} key={book.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 2.5,
                  border: '1px solid',
                  borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                  bgcolor: isDarkMode ? '#1e293b' : '#ffffff',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-3px)',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.06)'
                  }
                }}
              >
                <Box
                  sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    borderBottom: '1px solid',
                    borderColor: isDarkMode ? '#334155' : '#f1f5f9',
                    bgcolor: `${book.color}10`
                  }}
                >
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 24,
                      bgcolor: `${book.color}25`
                    }}
                  >
                    {book.coverIcon}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Chip
                      label={`Class ${book.classLevel} • ${book.subject}`}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        bgcolor: `${book.color}20`,
                        color: book.color,
                        mb: 0.5
                      }}
                    />
                    <Typography
                      variant="subtitle2"
                      fontWeight={800}
                      noWrap
                      title={book.title}
                      color={isDarkMode ? '#f8fafc' : '#0f172a'}
                    >
                      {book.title}
                    </Typography>
                  </Box>
                </Box>

                <CardContent sx={{ flex: 1, p: 2 }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    AVAILABLE CHAPTERS ({book.chapters.length})
                  </Typography>

                  <Stack spacing={0.8}>
                    {book.chapters.slice(0, 4).map((ch) => (
                      <Box
                        key={ch.num}
                        onClick={() => handleOpenReader(ch, book)}
                        sx={{
                          p: 1,
                          borderRadius: 1.5,
                          bgcolor: isDarkMode ? '#0f172a' : '#f8fafc',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          '&:hover': {
                            bgcolor: `${book.color}15`,
                            color: book.color
                          }
                        }}
                      >
                        <Typography variant="body2" fontSize="0.8rem" fontWeight={600} noWrap sx={{ maxWidth: '85%' }}>
                          Ch {ch.num}. {ch.name}
                        </Typography>
                        <AutoStoriesIcon sx={{ fontSize: 16, color: book.color }} />
                      </Box>
                    ))}
                    {book.chapters.length > 4 && (
                      <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', pt: 0.5 }}>
                        +{book.chapters.length - 4} more chapters
                      </Typography>
                    )}
                  </Stack>
                </CardContent>

                <CardActions sx={{ p: 2, pt: 0, justifyContent: 'space-between' }}>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<AutoStoriesIcon />}
                    onClick={() => setSelectedBook(book)}
                    sx={{
                      bgcolor: book.color,
                      textTransform: 'none',
                      fontWeight: 700,
                      borderRadius: 1.5,
                      boxShadow: 'none',
                      '&:hover': { bgcolor: book.color, opacity: 0.9 }
                    }}
                  >
                    All Chapters
                  </Button>

                  <Button
                    size="small"
                    variant="text"
                    endIcon={<OpenInNewIcon fontSize="inherit" />}
                    href={book.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ textTransform: 'none', fontSize: '0.75rem', color: 'text.secondary' }}
                  >
                    NCERT Source
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Chapters Modal Dialog */}
      <Dialog
        open={Boolean(selectedBook)}
        onClose={() => setSelectedBook(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            bgcolor: isDarkMode ? '#1e293b' : '#ffffff',
            color: isDarkMode ? '#f8fafc' : '#0f172a'
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" fontWeight={800}>
              {selectedBook?.title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Class {selectedBook?.classLevel} • {selectedBook?.subject} • Official NCERT Curriculum
            </Typography>
          </Box>
          <IconButton onClick={() => setSelectedBook(null)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: isDarkMode ? '#334155' : '#e2e8f0' }}>
          <Grid container spacing={1.5}>
            {selectedBook?.chapters.map((ch) => (
              <Grid item xs={12} sm={6} key={ch.num}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
                    border: '1px solid',
                    borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    bgcolor: isDarkMode ? '#0f172a' : '#f8fafc',
                    '&:hover': { borderColor: primaryColor }
                  }}
                >
                  <Box sx={{ maxWidth: '62%' }}>
                    <Typography variant="caption" fontWeight={700} color={primaryColor}>
                      Chapter {ch.num}
                    </Typography>
                    <Typography variant="body2" fontWeight={600} noWrap title={ch.name}>
                      {ch.name}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={0.8} alignItems="center">
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => handleOpenReader(ch, selectedBook)}
                      sx={{
                        textTransform: 'none',
                        bgcolor: primaryColor,
                        borderRadius: 1.5,
                        fontSize: '0.72rem',
                        px: 1.2,
                        minWidth: 'unset',
                        fontWeight: 700
                      }}
                    >
                      Read
                    </Button>
                    <Tooltip title="Direct Download PDF">
                      <IconButton
                        size="small"
                        component="a"
                        href={ch.pdfUrl}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ color: 'text.secondary' }}
                      >
                        <DownloadForOfflineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {ch.ncertUrl && (
                      <Tooltip title="View on Official NCERT Portal">
                        <IconButton
                          size="small"
                          component="a"
                          href={ch.ncertUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ color: 'text.secondary' }}
                        >
                          <OpenInNewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSelectedBook(null)} sx={{ textTransform: 'none', fontWeight: 600 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* In-App PDF Reader Dialog */}
      <Dialog
        open={Boolean(activePdfUrl)}
        onClose={() => setActivePdfUrl(null)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            height: '92vh',
            borderRadius: 3,
            bgcolor: isDarkMode ? '#0f172a' : '#ffffff'
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5, borderBottom: '1px solid', borderColor: isDarkMode ? '#334155' : '#e2e8f0' }}>
          <Box sx={{ maxWidth: '70%' }}>
            <Typography variant="subtitle1" fontWeight={800} noWrap>
              {activePdfTitle}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              NCERT Digital Reader • Fast High-Res PDF
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              size="small"
              variant="outlined"
              startIcon={<OpenInNewIcon />}
              href={activePdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ textTransform: 'none', borderRadius: 1.5 }}
            >
              Open Direct PDF
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<DownloadForOfflineIcon />}
              href={activePdfUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              sx={{ textTransform: 'none', bgcolor: primaryColor, borderRadius: 1.5 }}
            >
              Download
            </Button>
            <IconButton onClick={() => setActivePdfUrl(null)} size="small">
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ p: 0, height: '100%', bgcolor: '#1e293b', position: 'relative' }}>
          {activePdfUrl && (
            <iframe
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(activePdfUrl)}&embedded=true`}
              title={activePdfTitle}
              width="100%"
              height="100%"
              style={{ border: 'none' }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};
