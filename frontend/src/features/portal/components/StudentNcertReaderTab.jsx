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
  CircularProgress
} from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SearchIcon from '@mui/icons-material/Search';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CloseIcon from '@mui/icons-material/Close';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import DownloadForOfflineIcon from '@mui/icons-material/DownloadForOffline';

// NCERT Curated textbook catalog with official NCERT links & reader access
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
    chaptersCount: 15,
    officialUrl: 'https://ncert.nic.in/textbook.php?jemh1=0-15',
    chapters: [
      { num: 1, name: 'Real Numbers', pdfUrl: 'https://ncert.nic.in/textbook/pdf/jemh101.pdf' },
      { num: 2, name: 'Polynomials', pdfUrl: 'https://ncert.nic.in/textbook/pdf/jemh102.pdf' },
      { num: 3, name: 'Pair of Linear Equations in Two Variables', pdfUrl: 'https://ncert.nic.in/textbook/pdf/jemh103.pdf' },
      { num: 4, name: 'Quadratic Equations', pdfUrl: 'https://ncert.nic.in/textbook/pdf/jemh104.pdf' },
      { num: 5, name: 'Arithmetic Progressions', pdfUrl: 'https://ncert.nic.in/textbook/pdf/jemh105.pdf' },
      { num: 6, name: 'Triangles', pdfUrl: 'https://ncert.nic.in/textbook/pdf/jemh106.pdf' },
      { num: 7, name: 'Coordinate Geometry', pdfUrl: 'https://ncert.nic.in/textbook/pdf/jemh107.pdf' },
      { num: 8, name: 'Introduction to Trigonometry', pdfUrl: 'https://ncert.nic.in/textbook/pdf/jemh108.pdf' },
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
    chaptersCount: 16,
    officialUrl: 'https://ncert.nic.in/textbook.php?jesc1=0-16',
    chapters: [
      { num: 1, name: 'Chemical Reactions and Equations', pdfUrl: 'https://ncert.nic.in/textbook/pdf/jesc101.pdf' },
      { num: 2, name: 'Acids, Bases and Salts', pdfUrl: 'https://ncert.nic.in/textbook/pdf/jesc102.pdf' },
      { num: 3, name: 'Metals and Non-metals', pdfUrl: 'https://ncert.nic.in/textbook/pdf/jesc103.pdf' },
      { num: 4, name: 'Carbon and its Compounds', pdfUrl: 'https://ncert.nic.in/textbook/pdf/jesc104.pdf' },
      { num: 5, name: 'Life Processes', pdfUrl: 'https://ncert.nic.in/textbook/pdf/jesc105.pdf' },
      { num: 6, name: 'Control and Coordination', pdfUrl: 'https://ncert.nic.in/textbook/pdf/jesc106.pdf' },
      { num: 7, name: 'How do Organisms Reproduce?', pdfUrl: 'https://ncert.nic.in/textbook/pdf/jesc107.pdf' },
      { num: 8, name: 'Heredity and Evolution', pdfUrl: 'https://ncert.nic.in/textbook/pdf/jesc108.pdf' },
      { num: 9, name: 'Light - Reflection and Refraction', pdfUrl: 'https://ncert.nic.in/textbook/pdf/jesc109.pdf' },
      { num: 10, name: 'Electricity', pdfUrl: 'https://ncert.nic.in/textbook/pdf/jesc110.pdf' },
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
    chaptersCount: 11,
    officialUrl: 'https://ncert.nic.in/textbook.php?jeff1=0-11',
    chapters: [
      { num: 1, name: 'A Letter to God', pdfUrl: 'https://ncert.nic.in/textbook/pdf/jeff101.pdf' },
      { num: 2, name: 'Nelson Mandela: Long Walk to Freedom', pdfUrl: 'https://ncert.nic.in/textbook/pdf/jeff102.pdf' },
      { num: 3, name: 'Two Stories about Flying', pdfUrl: 'https://ncert.nic.in/textbook/pdf/jeff103.pdf' },
      { num: 4, name: 'From the Diary of Anne Frank', pdfUrl: 'https://ncert.nic.in/textbook/pdf/jeff104.pdf' },
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
    chaptersCount: 5,
    officialUrl: 'https://ncert.nic.in/textbook.php?jess3=0-5',
    chapters: [
      { num: 1, name: 'The Rise of Nationalism in Europe', pdfUrl: 'https://ncert.nic.in/textbook/pdf/jess301.pdf' },
      { num: 2, name: 'Nationalism in India', pdfUrl: 'https://ncert.nic.in/textbook/pdf/jess302.pdf' },
      { num: 3, name: 'The Making of a Global World', pdfUrl: 'https://ncert.nic.in/textbook/pdf/jess303.pdf' },
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
    chaptersCount: 15,
    officialUrl: 'https://ncert.nic.in/textbook.php?iemh1=0-15',
    chapters: [
      { num: 1, name: 'Number Systems', pdfUrl: 'https://ncert.nic.in/textbook/pdf/iemh101.pdf' },
      { num: 2, name: 'Polynomials', pdfUrl: 'https://ncert.nic.in/textbook/pdf/iemh102.pdf' },
      { num: 3, name: 'Coordinate Geometry', pdfUrl: 'https://ncert.nic.in/textbook/pdf/iemh103.pdf' },
      { num: 4, name: 'Linear Equations in Two Variables', pdfUrl: 'https://ncert.nic.in/textbook/pdf/iemh104.pdf' },
      { num: 5, name: 'Lines and Angles', pdfUrl: 'https://ncert.nic.in/textbook/pdf/iemh106.pdf' },
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
    chaptersCount: 15,
    officialUrl: 'https://ncert.nic.in/textbook.php?iesc1=0-15',
    chapters: [
      { num: 1, name: 'Matter in Our Surroundings', pdfUrl: 'https://ncert.nic.in/textbook/pdf/iesc101.pdf' },
      { num: 2, name: 'Is Matter Around Us Pure', pdfUrl: 'https://ncert.nic.in/textbook/pdf/iesc102.pdf' },
      { num: 3, name: 'Atoms and Molecules', pdfUrl: 'https://ncert.nic.in/textbook/pdf/iesc103.pdf' },
      { num: 4, name: 'Structure of the Atom', pdfUrl: 'https://ncert.nic.in/textbook/pdf/iesc104.pdf' },
      { num: 5, name: 'The Fundamental Unit of Life', pdfUrl: 'https://ncert.nic.in/textbook/pdf/iesc105.pdf' },
      { num: 6, name: 'Tissues', pdfUrl: 'https://ncert.nic.in/textbook/pdf/iesc106.pdf' },
      { num: 7, name: 'Motion', pdfUrl: 'https://ncert.nic.in/textbook/pdf/iesc108.pdf' },
      { num: 8, name: 'Force and Laws of Motion', pdfUrl: 'https://ncert.nic.in/textbook/pdf/iesc109.pdf' },
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
    chaptersCount: 16,
    officialUrl: 'https://ncert.nic.in/textbook.php?hemh1=0-16',
    chapters: [
      { num: 1, name: 'Rational Numbers', pdfUrl: 'https://ncert.nic.in/textbook/pdf/hemh101.pdf' },
      { num: 2, name: 'Linear Equations in One Variable', pdfUrl: 'https://ncert.nic.in/textbook/pdf/hemh102.pdf' },
      { num: 3, name: 'Understanding Quadrilaterals', pdfUrl: 'https://ncert.nic.in/textbook/pdf/hemh103.pdf' },
      { num: 4, name: 'Data Handling', pdfUrl: 'https://ncert.nic.in/textbook/pdf/hemh105.pdf' },
      { num: 5, name: 'Squares and Square Roots', pdfUrl: 'https://ncert.nic.in/textbook/pdf/hemh106.pdf' },
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
    chaptersCount: 18,
    officialUrl: 'https://ncert.nic.in/textbook.php?hesc1=0-18',
    chapters: [
      { num: 1, name: 'Crop Production and Management', pdfUrl: 'https://ncert.nic.in/textbook/pdf/hesc101.pdf' },
      { num: 2, name: 'Microorganisms : Friend and Foe', pdfUrl: 'https://ncert.nic.in/textbook/pdf/hesc102.pdf' },
      { num: 3, name: 'Synthetic Fibres and Plastics', pdfUrl: 'https://ncert.nic.in/textbook/pdf/hesc103.pdf' },
      { num: 4, name: 'Materials : Metals and Non-Metals', pdfUrl: 'https://ncert.nic.in/textbook/pdf/hesc104.pdf' },
      { num: 5, name: 'Coal and Petroleum', pdfUrl: 'https://ncert.nic.in/textbook/pdf/hesc105.pdf' },
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
    chaptersCount: 15,
    officialUrl: 'https://ncert.nic.in/textbook.php?gemh1=0-15',
    chapters: [
      { num: 1, name: 'Integers', pdfUrl: 'https://ncert.nic.in/textbook/pdf/gemh101.pdf' },
      { num: 2, name: 'Fractions and Decimals', pdfUrl: 'https://ncert.nic.in/textbook/pdf/gemh102.pdf' },
      { num: 3, name: 'Data Handling', pdfUrl: 'https://ncert.nic.in/textbook/pdf/gemh103.pdf' },
      { num: 4, name: 'Simple Equations', pdfUrl: 'https://ncert.nic.in/textbook/pdf/gemh104.pdf' },
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
    chaptersCount: 18,
    officialUrl: 'https://ncert.nic.in/textbook.php?gesc1=0-18',
    chapters: [
      { num: 1, name: 'Nutrition in Plants', pdfUrl: 'https://ncert.nic.in/textbook/pdf/gesc101.pdf' },
      { num: 2, name: 'Nutrition in Animals', pdfUrl: 'https://ncert.nic.in/textbook/pdf/gesc102.pdf' },
      { num: 3, name: 'Heat', pdfUrl: 'https://ncert.nic.in/textbook/pdf/gesc104.pdf' },
      { num: 4, name: 'Acids, Bases and Salts', pdfUrl: 'https://ncert.nic.in/textbook/pdf/gesc105.pdf' },
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
    chaptersCount: 14,
    officialUrl: 'https://ncert.nic.in/textbook.php?femh1=0-14',
    chapters: [
      { num: 1, name: 'Knowing Our Numbers', pdfUrl: 'https://ncert.nic.in/textbook/pdf/femh101.pdf' },
      { num: 2, name: 'Whole Numbers', pdfUrl: 'https://ncert.nic.in/textbook/pdf/femh102.pdf' },
      { num: 3, name: 'Playing With Numbers', pdfUrl: 'https://ncert.nic.in/textbook/pdf/femh103.pdf' },
      { num: 4, name: 'Basic Geometrical Ideas', pdfUrl: 'https://ncert.nic.in/textbook/pdf/femh104.pdf' },
    ]
  },
  {
    id: 'c6-sci',
    classLevel: '6',
    subject: 'Science',
    title: 'Curiosity: Science (Class 6)',
    medium: 'English',
    color: '#059669',
    coverIcon: '🌿',
    chaptersCount: 12,
    officialUrl: 'https://ncert.nic.in/textbook.php?fesc1=0-12',
    chapters: [
      { num: 1, name: 'The Wonderful World of Science', pdfUrl: 'https://ncert.nic.in/textbook/pdf/fesc101.pdf' },
      { num: 2, name: 'Diversity in the Living World', pdfUrl: 'https://ncert.nic.in/textbook/pdf/fesc102.pdf' },
      { num: 3, name: 'Mindful Eating: A Path to a Healthy Body', pdfUrl: 'https://ncert.nic.in/textbook/pdf/fesc103.pdf' },
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
    chaptersCount: 8,
    officialUrl: 'https://ncert.nic.in/textbook.php?keph1=0-8',
    chapters: [
      { num: 1, name: 'Units and Measurements', pdfUrl: 'https://ncert.nic.in/textbook/pdf/keph101.pdf' },
      { num: 2, name: 'Motion in a Straight Line', pdfUrl: 'https://ncert.nic.in/textbook/pdf/keph102.pdf' },
      { num: 3, name: 'Motion in a Plane', pdfUrl: 'https://ncert.nic.in/textbook/pdf/keph103.pdf' },
      { num: 4, name: 'Laws of Motion', pdfUrl: 'https://ncert.nic.in/textbook/pdf/keph104.pdf' },
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
    chaptersCount: 8,
    officialUrl: 'https://ncert.nic.in/textbook.php?leph1=0-8',
    chapters: [
      { num: 1, name: 'Electric Charges and Fields', pdfUrl: 'https://ncert.nic.in/textbook/pdf/leph101.pdf' },
      { num: 2, name: 'Electrostatic Potential and Capacitance', pdfUrl: 'https://ncert.nic.in/textbook/pdf/leph102.pdf' },
      { num: 3, name: 'Current Electricity', pdfUrl: 'https://ncert.nic.in/textbook/pdf/leph103.pdf' },
      { num: 4, name: 'Moving Charges and Magnetism', pdfUrl: 'https://ncert.nic.in/textbook/pdf/leph104.pdf' },
    ]
  }
];

export const StudentNcertReaderTab = ({ student, isDarkMode, primaryColor }) => {
  // Extract number from student class if present (e.g. "Class 10th" -> "10")
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
                        onClick={() => {
                          setActivePdfUrl(ch.pdfUrl);
                          setActivePdfTitle(`${book.title} — Ch ${ch.num}: ${ch.name}`);
                        }}
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
              Class {selectedBook?.classLevel} • {selectedBook?.subject} • Official NCERT PDFs
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
                  <Box sx={{ maxWidth: '70%' }}>
                    <Typography variant="caption" fontWeight={700} color={primaryColor}>
                      Chapter {ch.num}
                    </Typography>
                    <Typography variant="body2" fontWeight={600} noWrap title={ch.name}>
                      {ch.name}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => {
                        setSelectedBook(null);
                        setActivePdfUrl(ch.pdfUrl);
                        setActivePdfTitle(`${selectedBook.title} — Ch ${ch.num}: ${ch.name}`);
                      }}
                      sx={{
                        textTransform: 'none',
                        bgcolor: primaryColor,
                        borderRadius: 1.5,
                        fontSize: '0.72rem',
                        px: 1.2,
                        minWidth: 'unset'
                      }}
                    >
                      Read
                    </Button>
                    <IconButton
                      size="small"
                      component="a"
                      href={ch.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open in new window / Download"
                      sx={{ color: 'text.secondary' }}
                    >
                      <DownloadForOfflineIcon fontSize="small" />
                    </IconButton>
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
            height: '90vh',
            borderRadius: 3,
            bgcolor: isDarkMode ? '#0f172a' : '#ffffff'
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5 }}>
          <Box sx={{ maxWidth: '80%' }}>
            <Typography variant="subtitle1" fontWeight={800} noWrap>
              {activePdfTitle}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              NCERT Digital Reader • Official Textbook PDF
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              size="small"
              startIcon={<OpenInNewIcon />}
              href={activePdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ textTransform: 'none' }}
            >
              Open in Tab
            </Button>
            <IconButton onClick={() => setActivePdfUrl(null)} size="small">
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ p: 0, height: '100%', bgcolor: '#334155' }}>
          {activePdfUrl && (
            <iframe
              src={activePdfUrl}
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
