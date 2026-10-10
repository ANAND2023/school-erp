import React from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Grid } from '@mui/material';

export const MultiTermReportCardSlip = ({ data }) => {
  if (!data) return null;

  const {
    schoolName = 'Bright Future Public School',
    tagline = 'Learn • Grow • Succeed',
    slogan = 'Good Education\nBuilds a Better Tomorrow',
    academicSession = '2024 – 2025',
    reportTitle = 'REPORT CARD',
    subtitle = 'Class – 6  |  Final Year',
    student = {},
    subjects = [],
    overallGrades = {},
    coScholastic = [],
    teacherRemarks = '',
    promotedToClass = '7',
    result = 'Pass',
    date = '31-03-2025',
    bottomQuote = 'Small Steps Every Day Lead to Big Achievements',
  } = data;

  return (
    <Box
      className="report-card-print-page"
      sx={{
        width: '100%',
        maxWidth: '820px',
        margin: '0 auto',
        bgcolor: '#ffffff',
        p: { xs: 2, sm: 3, md: 3.5 },
        boxShadow: { xs: 1, sm: 3 },
        borderRadius: 2,
        fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        color: '#1e293b',
        border: '1.5px solid #cbd5e1',
        position: 'relative',
        boxSizing: 'border-box',
        '@media print': {
          boxShadow: 'none',
          border: 'none',
          p: '2mm 3mm !important',
          maxWidth: '100% !important',
          width: '100% !important',
        },
      }}
    >
      {/* ===================== 1. TOP HEADER ===================== */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, gap: 2 }}>
        {/* Left: School Crest Logo + Name */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
          {/* Circular Gold/Blue School Crest SVG */}
          <Box
            sx={{
              width: { xs: 58, sm: 68 },
              height: { xs: 58, sm: 68 },
              flexShrink: 0,
              borderRadius: '50%',
              bgcolor: '#0f2b48',
              border: '3px solid #d97706',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f59e0b',
            }}
          >
            <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" fill="#1e3a8a" />
              <path d="M12 6.5v11" stroke="#f59e0b" strokeWidth="1.2" />
              <path d="M12 17.5c-2.5-1.5-5-1.5-7 0V9.5c2-1.5 4.5-1.5 7 0" stroke="#fef08a" strokeWidth="1.2" />
              <path d="M12 17.5c2.5-1.5 5-1.5 7 0V9.5c-2-1.5-4.5-1.5-7 0" stroke="#fef08a" strokeWidth="1.2" />
              <circle cx="12" cy="4" r="1" fill="#f59e0b" />
            </svg>
          </Box>

          <Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 900,
                fontSize: { xs: '1.25rem', sm: '1.5rem' },
                color: '#0f2b48',
                letterSpacing: 0.5,
                lineHeight: 1.15,
                fontFamily: '"Georgia", "Times New Roman", serif',
              }}
            >
              {schoolName}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                fontWeight: 700,
                color: '#0284c7',
                letterSpacing: 1.2,
                fontSize: { xs: '0.7rem', sm: '0.78rem' },
                mt: 0.3,
                textTransform: 'uppercase',
              }}
            >
              {tagline}
            </Typography>
          </Box>
        </Box>

        {/* Right: Navy Polygon Banner */}
        <Box
          sx={{
            bgcolor: '#0f2b48',
            color: '#ffffff',
            px: { xs: 1.5, sm: 2.2 },
            py: 0.8,
            borderRadius: '6px 0px 6px 14px',
            textAlign: 'right',
            boxShadow: '0 2px 4px rgba(15, 43, 72, 0.2)',
            display: { xs: 'none', sm: 'block' },
            minWidth: 160,
          }}
        >
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#38bdf8', lineHeight: 1.2 }}>
            Good Education
          </Typography>
          <Typography sx={{ fontSize: '0.68rem', fontWeight: 600, color: '#f1f5f9', lineHeight: 1.2 }}>
            Builds a Better Tomorrow
          </Typography>
        </Box>
      </Box>

      {/* ===================== 2. TITLE BAR & CLASS PILL ===================== */}
      <Box
        sx={{
          bgcolor: '#e0f2fe',
          border: '1px solid #bae6fd',
          borderRadius: '4px',
          py: 0.6,
          textAlign: 'center',
          mb: 1.2,
        }}
      >
        <Typography
          sx={{
            fontWeight: 900,
            fontSize: { xs: '1rem', sm: '1.15rem' },
            letterSpacing: 3,
            color: '#0f2b48',
            textTransform: 'uppercase',
          }}
        >
          {reportTitle}
        </Typography>
      </Box>

      {/* Pill Badge */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
        <Box
          sx={{
            bgcolor: '#0f2b48',
            color: '#ffffff',
            px: 3,
            py: 0.4,
            borderRadius: '16px',
            fontSize: '0.8rem',
            fontWeight: 800,
            letterSpacing: 0.8,
            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
          }}
        >
          {student.fullClassName || subtitle}
        </Box>
      </Box>

      {/* ===================== 3. STUDENT DETAILS BOX ===================== */}
      <Box
        sx={{
          border: '1.5px solid #38bdf8',
          borderRadius: '6px',
          p: { xs: 1, sm: 1.2 },
          mb: 2,
          bgcolor: '#ffffff',
        }}
      >
        <Grid container spacing={1} sx={{ fontSize: { xs: '0.75rem', sm: '0.82rem' } }}>
          {/* Column 1 */}
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '110px 10px 1fr', rowGap: 0.4, alignItems: 'center' }}>
              <Typography sx={{ fontSize: 'inherit', fontWeight: 700, color: '#0f2b48' }}>Student Name</Typography>
              <Typography sx={{ fontSize: 'inherit', fontWeight: 700, color: '#0f2b48' }}>:</Typography>
              <Typography sx={{ fontSize: 'inherit', fontWeight: 800, color: '#0f172a' }}>{student.studentName || '—'}</Typography>

              <Typography sx={{ fontSize: 'inherit', fontWeight: 700, color: '#0f2b48' }}>Roll No.</Typography>
              <Typography sx={{ fontSize: 'inherit', fontWeight: 700, color: '#0f2b48' }}>:</Typography>
              <Typography sx={{ fontSize: 'inherit', fontWeight: 700, color: '#0f172a' }}>{student.rollNo || '—'}</Typography>

              <Typography sx={{ fontSize: 'inherit', fontWeight: 700, color: '#0f2b48' }}>Class</Typography>
              <Typography sx={{ fontSize: 'inherit', fontWeight: 700, color: '#0f2b48' }}>:</Typography>
              <Typography sx={{ fontSize: 'inherit', fontWeight: 700, color: '#0f172a' }}>{student.className || '6'}</Typography>

              <Typography sx={{ fontSize: 'inherit', fontWeight: 700, color: '#0f2b48' }}>Section</Typography>
              <Typography sx={{ fontSize: 'inherit', fontWeight: 700, color: '#0f2b48' }}>:</Typography>
              <Typography sx={{ fontSize: 'inherit', fontWeight: 700, color: '#0f172a' }}>{student.sectionName || 'A'}</Typography>
            </Box>
          </Grid>

          {/* Column 2 */}
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '120px 10px 1fr', rowGap: 0.4, alignItems: 'center' }}>
              <Typography sx={{ fontSize: 'inherit', fontWeight: 700, color: '#0f2b48' }}>Academic Session</Typography>
              <Typography sx={{ fontSize: 'inherit', fontWeight: 700, color: '#0f2b48' }}>:</Typography>
              <Typography sx={{ fontSize: 'inherit', fontWeight: 700, color: '#0f172a' }}>{academicSession}</Typography>

              <Typography sx={{ fontSize: 'inherit', fontWeight: 700, color: '#0f2b48' }}>Date of Birth</Typography>
              <Typography sx={{ fontSize: 'inherit', fontWeight: 700, color: '#0f2b48' }}>:</Typography>
              <Typography sx={{ fontSize: 'inherit', fontWeight: 700, color: '#0f172a' }}>{student.dob || '—'}</Typography>

              <Typography sx={{ fontSize: 'inherit', fontWeight: 700, color: '#0f2b48' }}>Father's Name</Typography>
              <Typography sx={{ fontSize: 'inherit', fontWeight: 700, color: '#0f2b48' }}>:</Typography>
              <Typography sx={{ fontSize: 'inherit', fontWeight: 700, color: '#0f172a' }}>{student.fatherName || '—'}</Typography>

              <Typography sx={{ fontSize: 'inherit', fontWeight: 700, color: '#0f2b48' }}>Mother's Name</Typography>
              <Typography sx={{ fontSize: 'inherit', fontWeight: 700, color: '#0f2b48' }}>:</Typography>
              <Typography sx={{ fontSize: 'inherit', fontWeight: 700, color: '#0f172a' }}>{student.motherName || '—'}</Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* ===================== 4. ACADEMIC PERFORMANCE TABLE ===================== */}
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          mb: 2,
          border: '1.5px solid #0f2b48',
          borderRadius: '4px',
          overflow: 'hidden',
        }}
      >
        <Table size="small" sx={{ minWidth: 550, '& th, & td': { p: '4px 6px', fontSize: { xs: '0.7rem', sm: '0.75rem' } } }}>
          <TableHead>
            {/* Main Header */}
            <TableRow>
              <TableCell
                rowSpan={2}
                sx={{
                  bgcolor: '#0f2b48',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.8rem !important',
                  textAlign: 'left',
                  borderRight: '1px solid #334155',
                  width: '26%',
                }}
              >
                Subject
              </TableCell>
              <TableCell
                colSpan={6}
                sx={{
                  bgcolor: '#1e6091',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.78rem !important',
                  textAlign: 'center',
                  letterSpacing: 0.8,
                  borderRight: '1.5px solid #ffffff',
                }}
              >
                TERM WISE PERFORMANCE
              </TableCell>
              <TableCell
                colSpan={2}
                sx={{
                  bgcolor: '#15803d',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.78rem !important',
                  textAlign: 'center',
                  letterSpacing: 0.8,
                }}
              >
                FINAL YEAR (CURRENT) PERFORMANCE
              </TableCell>
            </TableRow>

            {/* Sub-Header */}
            <TableRow sx={{ bgcolor: '#f1f5f9' }}>
              {/* Term 1 */}
              <TableCell sx={{ fontWeight: 700, textAlign: 'center', width: '9%', borderRight: '1px solid #cbd5e1' }}>Term 1</TableCell>
              <TableCell sx={{ fontWeight: 700, textAlign: 'center', width: '7%', borderRight: '1px solid #cbd5e1' }}>Grade</TableCell>

              {/* Term 2 */}
              <TableCell sx={{ fontWeight: 700, textAlign: 'center', width: '9%', borderRight: '1px solid #cbd5e1' }}>Term 2</TableCell>
              <TableCell sx={{ fontWeight: 700, textAlign: 'center', width: '7%', borderRight: '1px solid #cbd5e1' }}>Grade</TableCell>

              {/* Term 3 */}
              <TableCell sx={{ fontWeight: 700, textAlign: 'center', width: '9%', borderRight: '1px solid #cbd5e1' }}>Term 3</TableCell>
              <TableCell sx={{ fontWeight: 700, textAlign: 'center', width: '7%', borderRight: '1.5px solid #64748b' }}>Grade</TableCell>

              {/* Final */}
              <TableCell sx={{ fontWeight: 700, textAlign: 'center', width: '13%', bgcolor: '#dcfce7', borderRight: '1px solid #cbd5e1' }}>
                Final / Current
              </TableCell>
              <TableCell sx={{ fontWeight: 700, textAlign: 'center', width: '8%', bgcolor: '#dcfce7' }}>
                Grade
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {subjects.map((row, idx) => (
              <TableRow
                key={row.subjectId || idx}
                sx={{
                  bgcolor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                  '&:hover': { bgcolor: '#f0f9ff' },
                }}
              >
                <TableCell sx={{ fontWeight: 700, color: '#0f172a', borderRight: '1px solid #e2e8f0' }}>
                  {row.subjectName}
                </TableCell>
                <TableCell sx={{ textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>{row.term1?.marksObtained ?? '—'}</TableCell>
                <TableCell sx={{ textAlign: 'center', fontWeight: 600, borderRight: '1px solid #e2e8f0', color: '#0369a1' }}>
                  {row.term1?.grade ?? '—'}
                </TableCell>

                <TableCell sx={{ textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>{row.term2?.marksObtained ?? '—'}</TableCell>
                <TableCell sx={{ textAlign: 'center', fontWeight: 600, borderRight: '1px solid #e2e8f0', color: '#0369a1' }}>
                  {row.term2?.grade ?? '—'}
                </TableCell>

                <TableCell sx={{ textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>{row.term3?.marksObtained ?? '—'}</TableCell>
                <TableCell sx={{ textAlign: 'center', fontWeight: 600, borderRight: '1.5px solid #94a3b8', color: '#0369a1' }}>
                  {row.term3?.grade ?? '—'}
                </TableCell>

                <TableCell sx={{ textAlign: 'center', fontWeight: 700, bgcolor: '#f0fdf4', borderRight: '1px solid #e2e8f0', color: '#166534' }}>
                  {row.final?.marksObtained ?? '—'}
                </TableCell>
                <TableCell sx={{ textAlign: 'center', fontWeight: 800, bgcolor: '#f0fdf4', color: '#15803d' }}>
                  {row.final?.grade ?? '—'}
                </TableCell>
              </TableRow>
            ))}

            {/* Overall Grade Row */}
            <TableRow sx={{ bgcolor: '#e2e8f0', borderTop: '2px solid #0f2b48' }}>
              <TableCell sx={{ fontWeight: 900, color: '#0f2b48', fontSize: '0.78rem !important', borderRight: '1px solid #cbd5e1' }}>
                Overall Grade
              </TableCell>
              <TableCell colSpan={2} sx={{ textAlign: 'center', fontWeight: 800, color: '#0369a1', borderRight: '1px solid #cbd5e1' }}>
                {overallGrades?.term1 || 'A-'}
              </TableCell>
              <TableCell colSpan={2} sx={{ textAlign: 'center', fontWeight: 800, color: '#0369a1', borderRight: '1px solid #cbd5e1' }}>
                {overallGrades?.term2 || 'A'}
              </TableCell>
              <TableCell colSpan={2} sx={{ textAlign: 'center', fontWeight: 800, color: '#0369a1', borderRight: '1.5px solid #64748b' }}>
                {overallGrades?.term3 || 'A+'}
              </TableCell>
              <TableCell colSpan={2} sx={{ textAlign: 'center', fontWeight: 900, color: '#15803d', bgcolor: '#bbf7d0', fontSize: '0.82rem !important' }}>
                {overallGrades?.final || 'A'}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* ===================== 5. CO-SCHOLASTIC TABLE ===================== */}
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          mb: 2,
          border: '1.5px solid #6b46c1',
          borderRadius: '4px',
          overflow: 'hidden',
        }}
      >
        <Table size="small" sx={{ '& th, & td': { p: '3.5px 6px', fontSize: { xs: '0.7rem', sm: '0.74rem' } } }}>
          <TableHead>
            <TableRow sx={{ bgcolor: '#6b46c1' }}>
              <TableCell sx={{ color: '#ffffff', fontWeight: 800, width: '38%', borderRight: '1px solid #9333ea' }}>
                Area
              </TableCell>
              <TableCell sx={{ color: '#ffffff', fontWeight: 800, textAlign: 'center', width: '15%', borderRight: '1px solid #9333ea' }}>
                Term 1
              </TableCell>
              <TableCell sx={{ color: '#ffffff', fontWeight: 800, textAlign: 'center', width: '15%', borderRight: '1px solid #9333ea' }}>
                Term 2
              </TableCell>
              <TableCell sx={{ color: '#ffffff', fontWeight: 800, textAlign: 'center', width: '15%', borderRight: '1px solid #9333ea' }}>
                Term 3
              </TableCell>
              <TableCell sx={{ color: '#ffffff', fontWeight: 800, textAlign: 'center', width: '17%' }}>
                Final / Current
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {coScholastic.map((cs, idx) => (
              <TableRow
                key={cs.area || idx}
                sx={{
                  bgcolor: idx % 2 === 0 ? '#ffffff' : '#faf5ff',
                  '&:hover': { bgcolor: '#f3e8ff' },
                }}
              >
                <TableCell sx={{ fontWeight: 600, color: '#3b0764', borderRight: '1px solid #e9d5ff' }}>
                  {cs.area}
                </TableCell>
                <TableCell sx={{ textAlign: 'center', fontWeight: 700, color: '#6b21a8', borderRight: '1px solid #e9d5ff' }}>
                  {cs.term1}
                </TableCell>
                <TableCell sx={{ textAlign: 'center', fontWeight: 700, color: '#6b21a8', borderRight: '1px solid #e9d5ff' }}>
                  {cs.term2}
                </TableCell>
                <TableCell sx={{ textAlign: 'center', fontWeight: 700, color: '#6b21a8', borderRight: '1px solid #e9d5ff' }}>
                  {cs.term3}
                </TableCell>
                <TableCell sx={{ textAlign: 'center', fontWeight: 800, color: '#581c87', bgcolor: '#f3e8ff' }}>
                  {cs.final}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ===================== 6. REMARKS, PROMOTION & SIGNATURES ===================== */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1.8fr 1.1fr 1fr' }, gap: 1.5, mb: 1.5, alignItems: 'stretch' }}>
        {/* Box 1: Teacher's Remarks */}
        <Box
          sx={{
            border: '1.2px solid #cbd5e1',
            borderRadius: '4px',
            p: 1.2,
            bgcolor: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: '#0f2b48', mb: 0.5 }}>
            Teacher's Remarks:
          </Typography>
          <Typography
            sx={{
              fontSize: '0.73rem',
              color: '#334155',
              fontStyle: 'italic',
              lineHeight: 1.35,
              flex: 1,
            }}
          >
            "{teacherRemarks || 'Consistent performance and great dedication shown throughout the academic session.'}"
          </Typography>
        </Box>

        {/* Box 2: Promotion & Status */}
        <Box
          sx={{
            border: '1.2px solid #cbd5e1',
            borderRadius: '4px',
            p: 1.2,
            bgcolor: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 0.4,
            fontSize: '0.74rem',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography sx={{ fontSize: 'inherit', fontWeight: 700, color: '#0f2b48' }}>Promoted to Class</Typography>
            <Typography sx={{ fontSize: 'inherit', fontWeight: 800, color: '#0f2b48' }}>: {promotedToClass}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography sx={{ fontSize: 'inherit', fontWeight: 700, color: '#0f2b48' }}>Result</Typography>
            <Typography sx={{ fontSize: 'inherit', fontWeight: 800, color: '#15803d' }}>: {result}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography sx={{ fontSize: 'inherit', fontWeight: 700, color: '#0f2b48' }}>Date</Typography>
            <Typography sx={{ fontSize: 'inherit', fontWeight: 600, color: '#475569' }}>: {date}</Typography>
          </Box>
        </Box>

        {/* Box 3: Class Teacher Signature */}
        <Box
          sx={{
            border: '1.2px solid #cbd5e1',
            borderRadius: '4px',
            p: 1.2,
            bgcolor: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-end',
            minHeight: 70,
          }}
        >
          {/* Stylized Handwritten Signature Font / SVG */}
          <Box sx={{ mb: 0.3 }}>
            <Typography
              sx={{
                fontFamily: '"Brush Script MT", "Caveat", "Dancing Script", cursive',
                fontSize: '1.35rem',
                color: '#1e3a8a',
                lineHeight: 1,
                transform: 'rotate(-4deg)',
              }}
            >
              Jkuse
            </Typography>
          </Box>
          <Box sx={{ width: '85%', height: '1px', bgcolor: '#64748b', mb: 0.4 }} />
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: '#0f2b48' }}>
            Class Teacher
          </Typography>
        </Box>
      </Box>

      {/* ===================== 7. BOTTOM QUOTE BANNER ===================== */}
      <Box
        sx={{
          bgcolor: '#0f2b48',
          color: '#ffffff',
          borderRadius: '4px',
          py: 0.6,
          px: 2,
          textAlign: 'center',
        }}
      >
        <Typography
          sx={{
            fontSize: { xs: '0.68rem', sm: '0.75rem' },
            fontStyle: 'italic',
            fontWeight: 600,
            letterSpacing: 0.5,
          }}
        >
          "{bottomQuote}"
        </Typography>
      </Box>
    </Box>
  );
};

export default MultiTermReportCardSlip;
