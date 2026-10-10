import React from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Grid } from '@mui/material';

export const CceProgressReportCardSlip = ({ data }) => {
  if (!data) return null;

  const {
    schoolName = 'DELHI PUBLIC SCHOOL',
    address = '123 Knowledge Park, Sector 4',
    affiliationNo = 'CBSE/2026/0912',
    academicSession = '2026-27',
    reportTitle = 'PROGRESS REPORT — 2026-27',
    student = {},
    terms = [],
    subjects = [],
    totals = {},
    coScholastic = [],
    summary = {},
    gradingScale = [],
    note = 'This is a computer-generated report card. No signature is required.',
    footerText = 'Powered by Digital Vidya Saarthi • 2026-27',
  } = data;

  const defaultGradingScale = gradingScale && gradingScale.length > 0 ? gradingScale : [
    { grade: 'A+', marks: '91-100', description: 'Outstanding' },
    { grade: 'A', marks: '81-90', description: 'Excellent' },
    { grade: 'B+', marks: '71-80', description: 'Very Good' },
    { grade: 'B', marks: '61-70', description: 'Good' },
    { grade: 'C+', marks: '51-60', description: 'Above Average' },
    { grade: 'C', marks: '41-50', description: 'Average' },
    { grade: 'D', marks: '33-40', description: 'Below Average' },
    { grade: 'E', marks: '21-32', description: 'Needs Improvement' },
    { grade: 'F', marks: '0-20', description: 'Fail' },
  ];

  const hasConfiguredExams = terms && terms.length > 0 && terms.some((t) => (t.exams || t.Exams || []).length > 0);

  return (
    <Box
      className="report-card-print-page"
      sx={{
        width: '100%',
        maxWidth: '850px',
        margin: '0 auto',
        bgcolor: '#ffffff',
        p: { xs: 1.5, sm: 2.5, md: 3 },
        boxShadow: { xs: 1, sm: 3 },
        borderRadius: 1,
        fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif',
        color: '#0f172a',
        border: '2px solid #0f2b48',
        position: 'relative',
        boxSizing: 'border-box',
        '@media print': {
          boxShadow: 'none',
          border: '1.5px solid #0f2b48 !important',
          p: '2mm 3mm !important',
          maxWidth: '100% !important',
          width: '100% !important',
        },
      }}
    >
      {/* ===================== 1. SCHOOL HEADER ===================== */}
      <Box
        sx={{
          bgcolor: '#0f2b48',
          color: '#ffffff',
          borderRadius: '4px 4px 0 0',
          p: { xs: 1.5, sm: 2 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        {/* Left Emblem */}
        <Box
          sx={{
            width: { xs: 52, sm: 64 },
            height: { xs: 52, sm: 64 },
            flexShrink: 0,
            borderRadius: '50%',
            bgcolor: '#ffffff',
            border: '2px solid #f59e0b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 0.5,
          }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#0f2b48" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#0f2b48" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
            <circle cx="12" cy="12" r="2" fill="#f59e0b" />
          </svg>
        </Box>

        {/* Center School Details */}
        <Box sx={{ textAlign: 'center', flex: 1 }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 900,
              fontSize: { xs: '1.25rem', sm: '1.65rem' },
              color: '#ffffff',
              letterSpacing: 1.2,
              lineHeight: 1.15,
              textTransform: 'uppercase',
              fontFamily: '"Georgia", "Times New Roman", serif',
            }}
          >
            {schoolName}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontSize: { xs: '0.72rem', sm: '0.82rem' },
              color: '#cbd5e1',
              mt: 0.4,
              lineHeight: 1.3,
            }}
          >
            {address}
          </Typography>
          {affiliationNo && (
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.7rem',
                color: '#94a3b8',
                display: 'block',
                mt: 0.2,
              }}
            >
              Affiliation / Recognition No: {affiliationNo}
            </Typography>
          )}
        </Box>

        {/* Right CBSE Emblem */}
        <Box
          sx={{
            width: { xs: 52, sm: 64 },
            height: { xs: 52, sm: 64 },
            flexShrink: 0,
            borderRadius: '50%',
            bgcolor: '#ffffff',
            border: '2px solid #f59e0b',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: 0.5,
          }}
        >
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" stroke="#0f2b48" fill="#f8fafc" />
            <path d="M12 6v12M6 12h12" stroke="#b91c1c" />
            <circle cx="12" cy="12" r="4" fill="#f59e0b" stroke="#0f2b48" />
          </svg>
          <Typography sx={{ fontSize: '0.5rem', fontWeight: 800, color: '#0f2b48', mt: 0.2, lineHeight: 1 }}>
            CBSE
          </Typography>
        </Box>
      </Box>

      {/* Title Bar */}
      <Box
        sx={{
          bgcolor: '#f1f5f9',
          borderBottom: '2px solid #0f2b48',
          borderLeft: '1px solid #cbd5e1',
          borderRight: '1px solid #cbd5e1',
          py: 0.6,
          textAlign: 'center',
        }}
      >
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: { xs: '0.85rem', sm: '0.98rem' },
            color: '#0f2b48',
            letterSpacing: 1.5,
            textTransform: 'uppercase',
          }}
        >
          {reportTitle || `PROGRESS REPORT — ${academicSession}`}
        </Typography>
      </Box>

      {/* ===================== 2. STUDENT DETAILS ===================== */}
      <Box
        sx={{
          border: '1.5px solid #0f2b48',
          borderRadius: '4px',
          my: 1.2,
          p: 1.2,
          bgcolor: '#fafafa',
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 100px' },
          '@media print': {
            gridTemplateColumns: '1fr 1fr 100px !important',
          },
          gap: 1.5,
          alignItems: 'center',
        }}
      >
        {/* Left Column */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Box sx={{ display: 'flex', fontSize: '0.82rem' }}>
            <Typography sx={{ width: 120, fontWeight: 700, color: '#475569', fontSize: '0.8rem' }}>
              Admission No. :
            </Typography>
            <Typography sx={{ fontWeight: 800, color: '#0f172a', fontSize: '0.82rem' }}>
              {student?.admissionNo || student?.AdmissionNo || '-'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', fontSize: '0.82rem' }}>
            <Typography sx={{ width: 120, fontWeight: 700, color: '#475569', fontSize: '0.8rem' }}>
              Student&apos;s Name :
            </Typography>
            <Typography sx={{ fontWeight: 800, color: '#0f2b48', fontSize: '0.86rem' }}>
              {student?.studentName || student?.StudentName || student?.fullName || '-'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', fontSize: '0.82rem' }}>
            <Typography sx={{ width: 120, fontWeight: 700, color: '#475569', fontSize: '0.8rem' }}>
              Roll No. :
            </Typography>
            <Typography sx={{ fontWeight: 800, color: '#0f172a', fontSize: '0.82rem' }}>
              {student?.rollNo || student?.RollNo || '-'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', fontSize: '0.82rem' }}>
            <Typography sx={{ width: 120, fontWeight: 700, color: '#475569', fontSize: '0.8rem' }}>
              Father&apos;s Name :
            </Typography>
            <Typography sx={{ fontWeight: 700, color: '#334155', fontSize: '0.82rem' }}>
              {student?.fatherName || student?.FatherName || '-'}
            </Typography>
          </Box>
        </Box>

        {/* Middle Column */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Box sx={{ display: 'flex', fontSize: '0.82rem' }}>
            <Typography sx={{ width: 110, fontWeight: 700, color: '#475569', fontSize: '0.8rem' }}>
              Class :
            </Typography>
            <Typography sx={{ fontWeight: 800, color: '#0f172a', fontSize: '0.82rem' }}>
              {student?.className || student?.ClassName || '-'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', fontSize: '0.82rem' }}>
            <Typography sx={{ width: 110, fontWeight: 700, color: '#475569', fontSize: '0.8rem' }}>
              Section :
            </Typography>
            <Typography sx={{ fontWeight: 800, color: '#0f172a', fontSize: '0.82rem' }}>
              {student?.sectionName || student?.SectionName || '-'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', fontSize: '0.82rem' }}>
            <Typography sx={{ width: 110, fontWeight: 700, color: '#475569', fontSize: '0.8rem' }}>
              Date of Birth :
            </Typography>
            <Typography sx={{ fontWeight: 700, color: '#334155', fontSize: '0.82rem' }}>
              {student?.dob || student?.DOB || '-'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', fontSize: '0.82rem' }}>
            <Typography sx={{ width: 110, fontWeight: 700, color: '#475569', fontSize: '0.8rem' }}>
              Mother&apos;s Name :
            </Typography>
            <Typography sx={{ fontWeight: 700, color: '#334155', fontSize: '0.82rem' }}>
              {student?.motherName || student?.MotherName || '-'}
            </Typography>
          </Box>
        </Box>

        {/* Right Photo Box */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Box
            sx={{
              width: 82,
              height: 98,
              border: '1.5px dashed #94a3b8',
              borderRadius: '4px',
              bgcolor: '#f8fafc',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              p: 0.5,
              overflow: 'hidden',
            }}
          >
            {student?.photoUrl || student?.PhotoUrl ? (
              <img
                src={student?.photoUrl || student?.PhotoUrl}
                alt="Student"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <Typography sx={{ fontSize: '0.62rem', color: '#94a3b8', mt: 0.5, fontWeight: 600 }}>
                  Student Photo
                </Typography>
              </>
            )}
          </Box>
        </Box>
      </Box>

      {/* ===================== 3. SCHOLASTIC AREA TABLE (DYNAMIC TO CREATED EXAMS) ===================== */}
      <Box sx={{ mb: 1.5 }}>
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: '0.85rem',
            color: '#0f2b48',
            mb: 0.4,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          SCHOLASTIC AREA
        </Typography>

        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            border: '1.5px solid #0f2b48',
            borderRadius: 0,
            overflowX: 'auto',
          }}
        >
          <Table size="small" sx={{ minWidth: 650, borderCollapse: 'collapse' }}>
            <TableHead>
              {/* Row 1: Term / Main Headers */}
              <TableRow sx={{ bgcolor: '#0f2b48' }}>
                <TableCell
                  rowSpan={2}
                  sx={{
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.74rem',
                    border: '1px solid #334155',
                    textAlign: 'left',
                    p: '4px 8px',
                    minWidth: 120,
                  }}
                >
                  SUBJECTS
                </TableCell>

                {hasConfiguredExams ? (
                  terms.map((t, tIdx) => {
                    const tExams = t.exams || t.Exams || [];
                    const showTotalCol = tExams.length > 1;
                    const colSpan = tExams.length + (showTotalCol ? 1 : 0);
                    const bgColors = ['#1e3a8a', '#0f766e', '#7c3aed', '#b45309'];
                    const termBg = bgColors[tIdx % bgColors.length];

                    return (
                      <TableCell
                        key={tIdx}
                        colSpan={colSpan}
                        sx={{
                          color: '#ffffff',
                          fontWeight: 800,
                          fontSize: '0.74rem',
                          border: '1px solid #334155',
                          textAlign: 'center',
                          p: '3px 4px',
                          bgcolor: termBg,
                        }}
                      >
                        {t.termName || t.TermName || `TERM ${tIdx + 1}`}
                      </TableCell>
                    );
                  })
                ) : (
                  <TableCell
                    colSpan={2}
                    sx={{
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '0.74rem',
                      border: '1px solid #334155',
                      textAlign: 'center',
                      p: '3px 4px',
                      bgcolor: '#1e3a8a',
                    }}
                  >
                    EVALUATION (NO EXAMS CREATED YET)
                  </TableCell>
                )}

                <TableCell
                  rowSpan={2}
                  sx={{
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.72rem',
                    border: '1px solid #334155',
                    textAlign: 'center',
                    p: '4px 6px',
                    lineHeight: 1.1,
                    minWidth: 75,
                  }}
                >
                  GRAND TOTAL
                </TableCell>
                <TableCell
                  rowSpan={2}
                  sx={{
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.74rem',
                    border: '1px solid #334155',
                    textAlign: 'center',
                    p: '4px 6px',
                    minWidth: 55,
                  }}
                >
                  GRADE
                </TableCell>
              </TableRow>

              {/* Row 2: Sub Headers (Exact Created Exam Names & Max Marks) */}
              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                {hasConfiguredExams ? (
                  terms.map((t, tIdx) => {
                    const tExams = t.exams || t.Exams || [];
                    const showTotalCol = tExams.length > 1;

                    return (
                      <React.Fragment key={tIdx}>
                        {tExams.map((ex, exIdx) => (
                          <TableCell
                            key={exIdx}
                            sx={{
                              fontSize: '0.66rem',
                              fontWeight: 700,
                              border: '1px solid #cbd5e1',
                              textAlign: 'center',
                              p: '3px 3px',
                              minWidth: 50,
                            }}
                          >
                            {ex.examName || ex.ExamName}<br />({ex.maxMarks || ex.MaxMarks || 100})
                          </TableCell>
                        ))}
                        {showTotalCol && (
                          <TableCell
                            sx={{
                              fontSize: '0.66rem',
                              fontWeight: 800,
                              border: '1px solid #cbd5e1',
                              textAlign: 'center',
                              p: '3px 3px',
                              bgcolor: tIdx === 0 ? '#e0f2fe' : '#ccfbf1',
                              color: tIdx === 0 ? '#0369a1' : '#0f766e',
                              minWidth: 50,
                            }}
                          >
                            {t.termName || `T${tIdx + 1}`}<br />TOTAL
                          </TableCell>
                        )}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <>
                    <TableCell sx={{ fontSize: '0.66rem', fontWeight: 700, border: '1px solid #cbd5e1', textAlign: 'center', p: '3px 2px' }}>
                      Marks Obtained
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.66rem', fontWeight: 700, border: '1px solid #cbd5e1', textAlign: 'center', p: '3px 2px' }}>
                      Max Marks
                    </TableCell>
                  </>
                )}
              </TableRow>
            </TableHead>

            <TableBody>
              {subjects.map((sub, idx) => {
                const sName = sub.subjectName || sub.SubjectName || `Subject ${idx + 1}`;
                const termEvals = sub.termEvaluations || sub.TermEvaluations || [];
                const grandTotal = sub.grandTotal ?? sub.GrandTotal ?? '-';
                const grade = sub.grade || sub.Grade || '-';

                return (
                  <TableRow
                    key={idx}
                    sx={{
                      bgcolor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                      '&:hover': { bgcolor: '#f1f5f9' },
                    }}
                  >
                    <TableCell sx={{ fontSize: '0.74rem', fontWeight: 700, border: '1px solid #e2e8f0', p: '4px 8px', color: '#1e293b' }}>
                      {sName}
                    </TableCell>

                    {hasConfiguredExams ? (
                      termEvals.map((tEval, tIdx) => {
                        const examMarks = tEval.examMarks || tEval.ExamMarks || [];
                        const showTotalCol = examMarks.length > 1;
                        const tTotal = tEval.termTotal ?? tEval.TermTotal ?? '-';

                        return (
                          <React.Fragment key={tIdx}>
                            {examMarks.map((em, mIdx) => (
                              <TableCell
                                key={mIdx}
                                sx={{
                                  fontSize: '0.72rem',
                                  border: '1px solid #e2e8f0',
                                  textAlign: 'center',
                                  p: '4px 2px',
                                  fontWeight: em.marks && em.marks !== '-' ? 700 : 400,
                                }}
                              >
                                {em.marks !== null && em.marks !== undefined ? em.marks : '-'}
                              </TableCell>
                            ))}
                            {showTotalCol && (
                              <TableCell
                                sx={{
                                  fontSize: '0.74rem',
                                  fontWeight: 800,
                                  border: '1px solid #e2e8f0',
                                  textAlign: 'center',
                                  p: '4px 2px',
                                  bgcolor: tIdx === 0 ? '#f0f9ff' : '#f0fdf4',
                                  color: tIdx === 0 ? '#0369a1' : '#0f766e',
                                }}
                              >
                                {tTotal}
                              </TableCell>
                            )}
                          </React.Fragment>
                        );
                      })
                    ) : (
                      <>
                        <TableCell sx={{ fontSize: '0.72rem', border: '1px solid #e2e8f0', textAlign: 'center', p: '4px 2px' }}>
                          -
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.72rem', border: '1px solid #e2e8f0', textAlign: 'center', p: '4px 2px' }}>
                          100
                        </TableCell>
                      </>
                    )}

                    {/* Grand Total & Grade */}
                    <TableCell sx={{ fontSize: '0.76rem', fontWeight: 900, border: '1px solid #e2e8f0', textAlign: 'center', p: '4px 4px', color: '#0f2b48' }}>
                      {grandTotal}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.76rem', fontWeight: 900, border: '1px solid #e2e8f0', textAlign: 'center', p: '4px 4px', color: '#1e40af' }}>
                      {grade}
                    </TableCell>
                  </TableRow>
                );
              })}

              {/* Totals Row */}
              <TableRow sx={{ bgcolor: '#f1f5f9', fontWeight: 800 }}>
                <TableCell sx={{ fontSize: '0.74rem', fontWeight: 900, border: '1.5px solid #0f2b48', p: '5px 8px', color: '#0f2b48' }}>
                  TOTAL / SUMMARY
                </TableCell>

                {hasConfiguredExams && (
                  <TableCell
                    colSpan={
                      terms.reduce((acc, t) => {
                        const count = (t.exams || t.Exams || []).length;
                        return acc + count + (count > 1 ? 1 : 0);
                      }, 0)
                    }
                    sx={{ border: '1px solid #cbd5e1', textAlign: 'right', p: '4px 8px', fontSize: '0.72rem', color: '#64748b' }}
                  >
                    Total Marks Evaluated:
                  </TableCell>
                )}

                {!hasConfiguredExams && (
                  <TableCell colSpan={2} sx={{ border: '1px solid #cbd5e1', textAlign: 'center', fontSize: '0.72rem', color: '#64748b' }}>
                    —
                  </TableCell>
                )}

                <TableCell sx={{ fontSize: '0.8rem', fontWeight: 900, border: '1.5px solid #0f2b48', textAlign: 'center', p: '4px 4px', bgcolor: '#fef3c7', color: '#b45309' }}>
                  {(() => {
                    const rawFrac = totals?.summaryFraction || `${totals?.grandTotal ?? totals?.GrandTotal ?? '-'}/${totals?.maxMarks ?? totals?.MaxMarks ?? '-'}`;
                    if (!rawFrac || rawFrac === '-') return '-';
                    return rawFrac.split('/').map(v => {
                      const num = Number(v);
                      return isNaN(num) ? v : (num % 1 === 0 ? num.toString() : num.toFixed(1));
                    }).join('/');
                  })()}
                </TableCell>
                <TableCell sx={{ fontSize: '0.8rem', fontWeight: 900, border: '1.5px solid #0f2b48', textAlign: 'center', p: '4px 4px', bgcolor: '#fef3c7', color: '#b45309' }}>
                  {summary?.percentage || '-'}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* ===================== 4. CO-SCHOLASTIC AREA ===================== */}
      <Box sx={{ mb: 1.5 }}>
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: '0.85rem',
            color: '#0f2b48',
            mb: 0.4,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          CO-SCHOLASTIC AREA
        </Typography>

        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            border: '1.5px solid #0f2b48',
            borderRadius: 0,
            maxWidth: '100%',
          }}
        >
          <Table size="small" sx={{ borderCollapse: 'collapse' }}>
            <TableHead>
              <TableRow sx={{ bgcolor: '#0f2b48' }}>
                <TableCell sx={{ color: '#ffffff', fontWeight: 800, fontSize: '0.72rem', border: '1px solid #334155', p: '4px 8px' }}>
                  CO-SCHOLASTIC SUBJECTS
                </TableCell>
                {terms.map((t, idx) => (
                  <TableCell key={idx} sx={{ color: '#ffffff', fontWeight: 800, fontSize: '0.72rem', border: '1px solid #334155', textAlign: 'center', width: 120, p: '4px 8px' }}>
                    {t.termName || t.TermName}
                  </TableCell>
                ))}
                {terms.length === 0 && (
                  <TableCell sx={{ color: '#ffffff', fontWeight: 800, fontSize: '0.72rem', border: '1px solid #334155', textAlign: 'center', width: 120, p: '4px 8px' }}>
                    TERM
                  </TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {coScholastic.map((item, idx) => {
                const sName = item.subjectName || item.SubjectName || `Activity ${idx + 1}`;
                return (
                  <TableRow key={idx} sx={{ bgcolor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                    <TableCell sx={{ fontSize: '0.74rem', fontWeight: 700, border: '1px solid #e2e8f0', p: '3px 8px' }}>
                      {sName}
                    </TableCell>
                    {terms.length > 0 ? (
                      terms.map((t, i) => {
                        const gradesDict = item.grades || item.Grades || {};
                        const termName = t.termName || t.TermName;
                        let gradeVal = gradesDict[termName];
                        if (!gradeVal) {
                           gradeVal = i === 0 ? (item.term1 || item.Term1) : (i === 1 ? (item.term2 || item.Term2) : '');
                        }
                        return (
                          <TableCell key={i} sx={{ fontSize: '0.74rem', fontWeight: 800, border: '1px solid #e2e8f0', textAlign: 'center', color: '#15803d', p: '3px 8px' }}>
                            {gradeVal || '-'}
                          </TableCell>
                        );
                      })
                    ) : (
                      <TableCell sx={{ fontSize: '0.74rem', fontWeight: 800, border: '1px solid #e2e8f0', textAlign: 'center', color: '#15803d', p: '3px 8px' }}>
                        {item.term1 || item.Term1 || '-'}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* ===================== 5. 3-COLUMN SUMMARY & GRADING SCALE ===================== */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1.15fr 1.1fr 0.75fr' },
          '@media print': {
            gridTemplateColumns: '1.15fr 1.1fr 0.75fr !important',
          },
          gap: 1.5,
          mb: 1.5,
          alignItems: 'stretch',
        }}
      >
        {/* Left: Performance Summary Box */}
        <Box
          sx={{
            border: '1.5px solid #0f2b48',
            borderRadius: '4px',
            p: 1.2,
            bgcolor: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 0.4,
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', borderBottom: '1px dashed #e2e8f0', pb: 0.3 }}>
            <Typography sx={{ fontWeight: 700, color: '#475569', fontSize: '0.74rem' }}>Total Max Marks :</Typography>
            <Typography sx={{ fontWeight: 800, color: '#0f172a', fontSize: '0.76rem' }}>{summary?.totalMaxMarks ?? totals?.maxMarks ?? 0}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', borderBottom: '1px dashed #e2e8f0', pb: 0.3 }}>
            <Typography sx={{ fontWeight: 700, color: '#475569', fontSize: '0.74rem' }}>Total Marks Obtained :</Typography>
            <Typography sx={{ fontWeight: 800, color: '#0f172a', fontSize: '0.76rem' }}>{summary?.totalMarksObtained ?? totals?.grandTotal ?? '-'}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', borderBottom: '1px dashed #e2e8f0', pb: 0.3 }}>
            <Typography sx={{ fontWeight: 700, color: '#475569', fontSize: '0.74rem' }}>Percentage :</Typography>
            <Typography sx={{ fontWeight: 800, color: '#15803d', fontSize: '0.78rem' }}>{summary?.percentage ?? '-'}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', borderBottom: '1px dashed #e2e8f0', pb: 0.3 }}>
            <Typography sx={{ fontWeight: 700, color: '#475569', fontSize: '0.74rem' }}>Attendance Term 1 :</Typography>
            <Typography sx={{ fontWeight: 800, color: '#0f172a', fontSize: '0.76rem' }}>{Math.round(((summary?.attendanceTerm1 ?? 175) / 200) * 100)}%</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', borderBottom: '1px dashed #e2e8f0', pb: 0.3 }}>
            <Typography sx={{ fontWeight: 700, color: '#475569', fontSize: '0.74rem' }}>Attendance Term 2 :</Typography>
            <Typography sx={{ fontWeight: 800, color: '#0f172a', fontSize: '0.76rem' }}>{Math.round(((summary?.attendanceTerm2 ?? 200) / 220) * 100)}%</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', borderBottom: '1px dashed #e2e8f0', pb: 0.3 }}>
            <Typography sx={{ fontWeight: 700, color: '#475569', fontSize: '0.74rem' }}>Promoted to class :</Typography>
            <Typography sx={{ fontWeight: 800, color: '#0284c7', fontSize: '0.76rem' }}>{summary?.promotedToClass ?? 'Next Class'}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', borderBottom: '1px dashed #e2e8f0', pb: 0.3 }}>
            <Typography sx={{ fontWeight: 700, color: '#475569', fontSize: '0.74rem' }}>Position :</Typography>
            <Typography sx={{ fontWeight: 800, color: '#0f172a', fontSize: '0.76rem' }}>{summary?.position ?? 'Good Standing'}</Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.2, pt: 0.2 }}>
            <Typography sx={{ fontWeight: 700, color: '#475569', fontSize: '0.72rem' }}>Class Teacher Remark :</Typography>
            <Typography sx={{ fontWeight: 700, color: '#0f2b48', fontSize: '0.74rem', fontStyle: 'italic', bgcolor: '#f8fafc', p: 0.5, borderRadius: '4px', border: '1px solid #e2e8f0' }}>
              &ldquo;{summary?.classTeacherRemark || 'Good overall performance and behavior.'}&rdquo;
            </Typography>
          </Box>
        </Box>

        {/* Middle: Grading Scale Box */}
        <Box
          sx={{
            border: '1.5px solid #0f2b48',
            borderRadius: '4px',
            overflow: 'hidden',
            bgcolor: '#ffffff',
          }}
        >
          <Box sx={{ bgcolor: '#0f2b48', color: '#ffffff', py: 0.4, px: 1, textAlign: 'center' }}>
            <Typography sx={{ fontWeight: 800, fontSize: '0.72rem', letterSpacing: 0.5 }}>
              GRADING SCALE
            </Typography>
          </Box>
          <Table size="small" sx={{ borderCollapse: 'collapse' }}>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f1f5f9' }}>
                <TableCell sx={{ fontSize: '0.64rem', fontWeight: 800, p: '2px 4px', border: '1px solid #e2e8f0' }}>MARKS</TableCell>
                <TableCell sx={{ fontSize: '0.64rem', fontWeight: 800, p: '2px 4px', border: '1px solid #e2e8f0', textAlign: 'center' }}>GRADE</TableCell>
                <TableCell sx={{ fontSize: '0.64rem', fontWeight: 800, p: '2px 4px', border: '1px solid #e2e8f0' }}>REMARKS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {defaultGradingScale.map((g, idx) => (
                <TableRow key={idx} sx={{ '&:nth-of-type(even)': { bgcolor: '#fafafa' } }}>
                  <TableCell sx={{ fontSize: '0.62rem', fontWeight: 700, p: '1.5px 4px', border: '1px solid #e2e8f0' }}>
                    {g.marks || g.Marks}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.62rem', fontWeight: 800, p: '1.5px 4px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#0f2b48' }}>
                    {g.grade || g.Grade}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.6rem', color: '#64748b', p: '1.5px 4px', border: '1px solid #e2e8f0' }}>
                    {g.description || g.Description}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>

        {/* Right: Computer Note + Result Box */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 1,
          }}
        >
          {/* Note Box */}
          <Box
            sx={{
              border: '1.5px solid #cbd5e1',
              borderRadius: '4px',
              p: 1,
              bgcolor: '#f8fafc',
              textAlign: 'center',
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography sx={{ fontSize: '0.66rem', color: '#64748b', fontStyle: 'italic', lineHeight: 1.3 }}>
              {note}
            </Typography>
          </Box>

          {/* Result Box */}
          <Box
            sx={{
              border: '2px solid #16a34a',
              borderRadius: '6px',
              p: 1.2,
              bgcolor: '#f0fdf4',
              textAlign: 'center',
            }}
          >
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: '#15803d', textTransform: 'uppercase' }}>
              Result :
            </Typography>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 900,
                color: (summary?.result || summary?.Result || 'PASS') === 'PASS' ? '#15803d' : '#dc2626',
                letterSpacing: 2,
                mt: 0.2,
              }}
            >
              {summary?.result || summary?.Result || 'PASS'}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* ===================== 6. SIGNATURES ===================== */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 1,
          pt: 3,
          pb: 1,
          mt: 2,
          borderTop: '1px solid #cbd5e1',
          textAlign: 'center',
        }}
      >
        <Box>
          <Box sx={{ borderBottom: '1px solid #94a3b8', width: '80%', margin: '0 auto 4px' }} />
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#334155' }}>
            Class Teacher
          </Typography>
        </Box>
        <Box>
          <Box sx={{ borderBottom: '1px solid #94a3b8', width: '80%', margin: '0 auto 4px' }} />
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#334155' }}>
            Examination In-charge
          </Typography>
        </Box>
        <Box>
          <Box sx={{ borderBottom: '1px solid #94a3b8', width: '80%', margin: '0 auto 4px' }} />
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#334155' }}>
            Parent&apos;s Signature
          </Typography>
        </Box>
        <Box>
          <Box sx={{ borderBottom: '1px solid #94a3b8', width: '80%', margin: '0 auto 4px' }} />
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: '#0f2b48' }}>
            Principal
          </Typography>
        </Box>
      </Box>

      {/* ===================== 7. FOOTER RIBBON ===================== */}
      <Box
        sx={{
          bgcolor: '#0f2b48',
          color: '#ffffff',
          borderRadius: '0 0 4px 4px',
          py: 0.6,
          px: 1.5,
          mt: 1.2,
          textAlign: 'center',
        }}
      >
        <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: 0.8 }}>
          {footerText}
        </Typography>
      </Box>
    </Box>
  );
};

export default CceProgressReportCardSlip;
