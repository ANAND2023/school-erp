import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Typography,
  IconButton,
  Stack,
  CircularProgress,
  Tooltip,
  ClickAwayListener,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  FirstPage as FirstPageIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  LastPage as LastPageIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { studentApi } from '../../students/api';

/**
 * Dynamic multi-column table lookup dropdown for searching and selecting students.
 * Matches the reference ERP data-grid lookup with dotted grid lines and full pagination bar.
 */
export function StudentLookupDropdown({
  selectedStudentId,
  duesSummary,
  isLoadingDues,
  onSelectStudent,
  onClearSelection,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pageInput, setPageInput] = useState('1');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const inputRef = useRef(null);

  // Debounce search input (250ms) and reset to page 1 on search change
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setPageNo(1);
      setPageInput('1');
      setHighlightedIndex(-1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Sync pageInput when pageNo changes
  useEffect(() => {
    setPageInput(String(pageNo));
  }, [pageNo]);

  // Fetch paginated students dynamically when dropdown is open
  const {
    data: searchRes,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['fee-student-lookup-grid', debouncedSearch, pageNo, pageSize],
    queryFn: () =>
      studentApi.getStudents({
        search: debouncedSearch || undefined,
        pageNo,
        pageSize,
      }),
    enabled: isOpen,
    staleTime: 15000,
  });

  const pagedData = searchRes?.data?.data;
  const students = pagedData?.items || [];
  const totalCount = pagedData?.totalCount || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const startItem = totalCount === 0 ? 0 : (pageNo - 1) * pageSize + 1;
  const endItem = Math.min(pageNo * pageSize, totalCount);

  const handleRowSelect = (student) => {
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(-1);
    if (onSelectStudent) {
      onSelectStudent(student);
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setSearchTerm('');
    setDebouncedSearch('');
    setPageNo(1);
    setPageInput('1');
    setHighlightedIndex(-1);
    if (onClearSelection) {
      onClearSelection();
    }
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        students.length > 0 ? Math.min(students.length - 1, prev + 1) : -1
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(0, prev - 1));
    } else if (e.key === 'Enter' && highlightedIndex >= 0 && students[highlightedIndex]) {
      e.preventDefault();
      handleRowSelect(students[highlightedIndex]);
    }
  };

  const handlePageInputCommit = () => {
    const parsed = parseInt(pageInput, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= totalPages) {
      setPageNo(parsed);
    } else {
      setPageInput(String(pageNo));
    }
  };

  return (
    <ClickAwayListener onClickAway={() => setIsOpen(false)}>
      <Box sx={{ position: 'relative', width: '100%' }}>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ fontSize: 13 }}>
          Search & Select Student
        </Typography>

        <TextField
          inputRef={inputRef}
          fullWidth
          size="small"
          label="Search Student"
          placeholder={
            duesSummary
              ? `${duesSummary.studentName} (${duesSummary.admissionNo || 'Selected'})`
              : 'Admission No, Student Name, Guardian or Mobile...'
          }
          value={searchTerm}
          onFocus={() => setIsOpen(true)}
          onClick={() => setIsOpen(true)}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          InputProps={{
            startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1, fontSize: 18 }} />,
            endAdornment: (
              <Stack direction="row" spacing={0.5} alignItems="center">
                {(isFetching || isLoadingDues) && <CircularProgress size={16} />}
                {(selectedStudentId || searchTerm) && (
                  <Tooltip title="Clear selection / search">
                    <IconButton size="small" onClick={handleClear}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>
            ),
          }}
        />

        {/* Dynamic Reference-Style Multi-Column Grid Dropdown */}
        {isOpen && (
          <Paper
            elevation={8}
            sx={{
              position: 'absolute',
              top: '100%',
              left: 0,
              mt: 0.5,
              zIndex: 1300,
              width: { xs: 'calc(100vw - 48px)', sm: 680, md: 780, lg: 860 },
              maxWidth: '95vw',
              border: '1px solid #7ea8f8',
              borderRadius: '3px',
              overflow: 'hidden',
              bgcolor: '#ffffff',
              boxShadow: '0 10px 28px rgba(15, 23, 42, 0.22)',
            }}
          >
            {/* Scrollable Data Grid Container */}
            <Box
              sx={{
                maxHeight: 315,
                overflowY: 'auto',
                overflowX: 'auto',
                '&::-webkit-scrollbar': { width: 6, height: 6 },
                '&::-webkit-scrollbar-thumb': { bgcolor: '#cbd5e1', borderRadius: 3 },
              }}
            >
              <Table size="small" stickyHeader sx={{ borderCollapse: 'collapse', minWidth: 650 }}>
                <TableHead>
                  <TableRow>
                    {[
                      { label: 'Admission No', width: '18%' },
                      { label: 'Roll No.', width: '10%' },
                      { label: 'Class - Sec', width: '16%' },
                      { label: 'Student Name', width: '22%' },
                      { label: 'Guardian Name', width: '19%' },
                      { label: 'Contact No', width: '15%' },
                    ].map((col, idx, arr) => (
                      <TableCell
                        key={col.label}
                        sx={{
                          width: col.width,
                          py: 0.8,
                          px: 1.25,
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#1e293b',
                          background: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)',
                          borderBottom: '1px solid #cbd5e1',
                          borderRight: idx < arr.length - 1 ? '1px solid #cbd5e1' : 'none',
                          whiteSpace: 'nowrap',
                          userSelect: 'none',
                        }}
                      >
                        {col.label}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center">
                          <CircularProgress size={18} />
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12.5 }}>
                            Loading students...
                          </Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ) : students.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 3.5 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12.5 }}>
                          No matching students found{debouncedSearch ? ` for "${debouncedSearch}"` : ''}.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    students.map((st, idx) => {
                      const isHighlighted = idx === highlightedIndex;
                      const isCurrentSelected = String(st.id) === String(selectedStudentId);

                      return (
                        <TableRow
                          key={st.id}
                          onClick={() => handleRowSelect(st)}
                          onMouseEnter={() => setHighlightedIndex(idx)}
                          sx={{
                            cursor: 'pointer',
                            bgcolor: isHighlighted
                              ? '#dbeafe'
                              : isCurrentSelected
                              ? '#eff6ff'
                              : idx % 2 === 0
                              ? '#ffffff'
                              : '#f9fbfd',
                            '&:hover': {
                              bgcolor: '#dbeafe',
                            },
                          }}
                        >
                          {/* Admission No */}
                          <TableCell
                            sx={{
                              py: 0.65,
                              px: 1.25,
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#0f172a',
                              borderBottom: '1px dotted #cbd5e1',
                              borderRight: '1px dotted #cbd5e1',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {st.admissionNo || '—'}
                          </TableCell>

                          {/* Roll No. */}
                          <TableCell
                            sx={{
                              py: 0.65,
                              px: 1.25,
                              fontSize: '12px',
                              color: '#334155',
                              borderBottom: '1px dotted #cbd5e1',
                              borderRight: '1px dotted #cbd5e1',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {st.rollNo ?? ''}
                          </TableCell>

                          {/* Class - Section */}
                          <TableCell
                            sx={{
                              py: 0.65,
                              px: 1.25,
                              fontSize: '12px',
                              color: '#334155',
                              borderBottom: '1px dotted #cbd5e1',
                              borderRight: '1px dotted #cbd5e1',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {st.className}
                            {st.sectionName ? ` - ${st.sectionName}` : ''}
                          </TableCell>

                          {/* Student Name */}
                          <TableCell
                            sx={{
                              py: 0.65,
                              px: 1.25,
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#0f172a',
                              textTransform: 'uppercase',
                              borderBottom: '1px dotted #cbd5e1',
                              borderRight: '1px dotted #cbd5e1',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {st.fullName}
                          </TableCell>

                          {/* Guardian Name */}
                          <TableCell
                            sx={{
                              py: 0.65,
                              px: 1.25,
                              fontSize: '12px',
                              color: '#334155',
                              textTransform: 'uppercase',
                              borderBottom: '1px dotted #cbd5e1',
                              borderRight: '1px dotted #cbd5e1',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {st.guardianName || ''}
                          </TableCell>

                          {/* Contact No */}
                          <TableCell
                            sx={{
                              py: 0.65,
                              px: 1.25,
                              fontSize: '12px',
                              color: '#0f172a',
                              borderBottom: '1px dotted #cbd5e1',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {st.guardianMobile || ''}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </Box>

            {/* Reference-Style Bottom Pagination Bar */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 1,
                px: 1.25,
                py: 0.6,
                background: 'linear-gradient(180deg, #f8fafc 0%, #eaeff5 100%)',
                borderTop: '1px solid #cbd5e1',
                userSelect: 'none',
              }}
            >
              {/* Left Pagination Controls */}
              <Stack direction="row" spacing={0.5} alignItems="center">
                {/* Page Size Dropdown */}
                <Box
                  component="select"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPageNo(1);
                    setPageInput('1');
                  }}
                  sx={{
                    height: 24,
                    px: 0.75,
                    fontSize: '12px',
                    color: '#1e293b',
                    bgcolor: '#ffffff',
                    border: '1px solid #93c5fd',
                    borderRadius: '2px',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </Box>

                <Box sx={{ height: 18, borderLeft: '1px solid #cbd5e1', mx: 0.5 }} />

                {/* First Page */}
                <IconButton
                  size="small"
                  disabled={pageNo <= 1}
                  onClick={() => setPageNo(1)}
                  sx={{ p: 0.25, color: '#2563eb', '&.Mui-disabled': { color: '#94a3b8' } }}
                  title="First Page"
                >
                  <FirstPageIcon sx={{ fontSize: 18 }} />
                </IconButton>

                {/* Prev Page */}
                <IconButton
                  size="small"
                  disabled={pageNo <= 1}
                  onClick={() => setPageNo((p) => Math.max(1, p - 1))}
                  sx={{ p: 0.25, color: '#2563eb', '&.Mui-disabled': { color: '#94a3b8' } }}
                  title="Previous Page"
                >
                  <ChevronLeftIcon sx={{ fontSize: 18 }} />
                </IconButton>

                {/* Next Page */}
                <IconButton
                  size="small"
                  disabled={pageNo >= totalPages}
                  onClick={() => setPageNo((p) => Math.min(totalPages, p + 1))}
                  sx={{ p: 0.25, color: '#2563eb', '&.Mui-disabled': { color: '#94a3b8' } }}
                  title="Next Page"
                >
                  <ChevronRightIcon sx={{ fontSize: 18 }} />
                </IconButton>

                {/* Last Page */}
                <IconButton
                  size="small"
                  disabled={pageNo >= totalPages}
                  onClick={() => setPageNo(totalPages)}
                  sx={{ p: 0.25, color: '#2563eb', '&.Mui-disabled': { color: '#94a3b8' } }}
                  title="Last Page"
                >
                  <LastPageIcon sx={{ fontSize: 18 }} />
                </IconButton>

                <Box sx={{ height: 18, borderLeft: '1px solid #cbd5e1', mx: 0.5 }} />

                {/* Refresh Button */}
                <IconButton
                  size="small"
                  onClick={() => refetch()}
                  sx={{ p: 0.25, color: '#2563eb' }}
                  title="Refresh List"
                >
                  <RefreshIcon
                    sx={{
                      fontSize: 17,
                      animation: isFetching ? 'spin 1s linear infinite' : 'none',
                      '@keyframes spin': {
                        '0%': { transform: 'rotate(0deg)' },
                        '100%': { transform: 'rotate(360deg)' },
                      },
                    }}
                  />
                </IconButton>

                <Box sx={{ height: 18, borderLeft: '1px solid #cbd5e1', mx: 0.5 }} />

                {/* Page X of Y */}
                <Stack direction="row" spacing={0.6} alignItems="center" sx={{ pl: 0.25 }}>
                  <Typography sx={{ fontSize: '12px', color: '#1e293b' }}>Page</Typography>
                  <Box
                    component="input"
                    type="text"
                    value={pageInput}
                    onChange={(e) => setPageInput(e.target.value)}
                    onBlur={handlePageInputCommit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                        handlePageInputCommit();
                      }
                    }}
                    sx={{
                      width: 36,
                      height: 22,
                      textAlign: 'center',
                      fontSize: '12px',
                      color: '#0f172a',
                      bgcolor: '#ffffff',
                      border: '1px solid #93c5fd',
                      borderRadius: '2px',
                      outline: 'none',
                    }}
                  />
                  <Typography sx={{ fontSize: '12px', color: '#1e293b' }}>
                    of {totalPages}
                  </Typography>
                </Stack>
              </Stack>

              {/* Right Displaying X to Y of Z items */}
              <Typography sx={{ fontSize: '12px', color: '#0f172a', pr: 0.5 }}>
                Displaying {startItem} to {endItem} of {totalCount} items
              </Typography>
            </Box>
          </Paper>
        )}
      </Box>
    </ClickAwayListener>
  );
}
