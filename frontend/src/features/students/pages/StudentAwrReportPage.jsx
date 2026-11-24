import React, { useState, useEffect, useRef } from 'react';
import { Card } from 'primereact/card';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Tag } from 'primereact/tag';
import { Avatar } from 'primereact/avatar';
import { Toast } from 'primereact/toast';
import { useNavigate } from 'react-router-dom';
import { studentApi } from '../api';
import { classesApi } from '../../masters/api';
import { useAcademicYear } from '../../../hooks/useAcademicYear';
import { useThemeStore, shadeColor } from '../../../store/themeStore';
import { AwrStudentFolioModal } from '../components/AwrStudentFolioModal';
import { printElement } from '../../../utils/printUtils';

export const StudentAwrReportPage = () => {
  const navigate = useNavigate();
  const toastRef = useRef(null);
  const ledgerPrintRef = useRef(null);
  const { currentAcademicYearId } = useAcademicYear();
  const { currentColorHex, isDarkMode } = useThemeStore();
  const themeColor = currentColorHex || '#0f766e';
  const themeDarker = shadeColor(themeColor, -20);
  const themeLighterBg = isDarkMode ? 'rgba(255,255,255,0.04)' : `${themeColor}0d`;
  const themeBorder = isDarkMode ? 'rgba(255,255,255,0.12)' : `${themeColor}30`;

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    summary: { totalRegistered: 0, activeOnRoll: 0, totalWithdrawn: 0, newAdmissionsThisYear: 0 },
    students: [],
    config: null,
  });
  const [nextAwrNumber, setNextAwrNumber] = useState('');

  // Filter States
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'withdrawn'
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Student for Folio Modal
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showFolioModal, setShowFolioModal] = useState(false);

  useEffect(() => {
    loadClasses();
    studentApi
      .getAwrNextNumber()
      .then((res) => {
        if (res.data?.success && res.data.data) {
          setNextAwrNumber(res.data.data);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadReport();
  }, [currentAcademicYearId, selectedClassId, selectedSectionId, statusFilter]);

  const loadClasses = async () => {
    try {
      const res = await classesApi.getClasses();
      if (res?.data?.success && res.data.data) {
        setClasses(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load classes:', err);
    }
  };

  const handleClassChange = (classId) => {
    setSelectedClassId(classId);
    setSelectedSectionId(null);
    if (!classId) {
      setSections([]);
      return;
    }
    const cls = classes.find((c) => c.id === classId);
    if (cls && cls.sections) {
      setSections(cls.sections);
    } else {
      setSections([]);
    }
  };

  const loadReport = async () => {
    try {
      setLoading(true);
      const params = {
        academicYearId: currentAcademicYearId || undefined,
        classId: selectedClassId || undefined,
        sectionId: selectedSectionId || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: searchQuery.trim() || undefined,
      };

      const res = await studentApi.getAwrReport(params);
      if (res?.data?.success && res.data.data) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load AWR report:', err);
      toastRef.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load Admission & Withdrawal Register data.',
        life: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadReport();
  };

  const handleClearFilters = () => {
    setSelectedClassId(null);
    setSelectedSectionId(null);
    setStatusFilter('all');
    setSearchQuery('');
    setSections([]);
  };

  const handlePrintFullLedger = () => {
    if (ledgerPrintRef.current) {
      printElement(ledgerPrintRef.current, 'Official_AWR_Register_Ledger');
    }
  };

  const exportCsv = () => {
    if (!data.students || data.students.length === 0) {
      toastRef.current?.show({ severity: 'warn', summary: 'No Data', detail: 'No student records to export.' });
      return;
    }

    const headers = [
      'Scholar No',
      'Admission Date',
      'Student Name',
      'Gender',
      'DOB',
      'DOB Words',
      'Father Name',
      'Mother Name',
      'Category',
      'Religion',
      'Class Admitted',
      'Current Class',
      'Status',
      'Withdrawal Date',
      'Reason For Leaving',
      'TC Number',
      'Conduct',
    ];

    const rows = data.students.map((st) => [
      `"${st.admissionNo || ''}"`,
      `"${st.admissionDateFormatted || ''}"`,
      `"${st.studentName || ''}"`,
      `"${st.gender || ''}"`,
      `"${st.dobFormatted || ''}"`,
      `"${st.dobWords || ''}"`,
      `"${st.fatherName || ''}"`,
      `"${st.motherName || ''}"`,
      `"${st.categoryName || ''}"`,
      `"${st.religionName || ''}"`,
      `"${st.classAdmitted || ''}"`,
      `"${st.currentClass || ''} ${st.currentSection || ''}"`,
      `"${st.status || ''}"`,
      `"${st.withdrawalDateFormatted || ''}"`,
      `"${st.reasonForLeaving || ''}"`,
      `"${st.tcNumber || ''}"`,
      `"${st.conduct || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `AWR_Register_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const config = data.config || {
    primaryColor: '#065f46',
    secondaryColor: '#ecfdf5',
    accentColor: '#064e3b',
    borderColor: '#065f46',
    fontFamily: 'Inter, sans-serif',
    reportTitle: 'ADMISSION AND WITHDRAWAL REGISTER (A.W.R.)',
    reportSubtitle: 'Statutory General Register maintained under Education Act & Board Rules',
    refPrefix: 'DPS/AWR',
    signature1: 'Prepared By / Record Clerk',
    signature2: 'Checked By / Section In-Charge',
    signature3: 'Principal / Head of Institution',
    footerText:
      'Certified that this document is an authentic extract from the Admission and Withdrawal Register maintained by the institution.',
  };

  return (
    <div className="p-2 sm:p-3 surface-ground min-h-screen">
      <Toast ref={toastRef} />

      {/* Header Banner */}
      <Card
        className="mb-2.5 shadow-1 border-none py-1"
        style={{
          background: isDarkMode ? '#1e293b' : '#ffffff',
          borderRadius: '8px',
        }}
      >
        <div className="flex flex-column sm:flex-row justify-content-between align-items-start sm:align-items-center gap-2 p-1">
          <div>
            <div className="flex align-items-center gap-2 mb-1 flex-wrap">
              <i className="pi pi-table text-xl" style={{ color: themeColor }}></i>
              <h1
                className="text-lg sm:text-xl font-bold m-0"
                style={{ color: isDarkMode ? '#f8fafc' : '#0f172a' }}
              >
                Student AWR Report Management
              </h1>
              <span
                className="text-xs px-2 py-0.5 border-round font-semibold"
                style={{
                  backgroundColor: `${themeColor}18`,
                  color: themeColor,
                  border: `1px solid ${themeColor}35`,
                }}
              >
                Statutory Register: {data.config?.refPrefix || 'DPS/AWR'}
              </span>
              {nextAwrNumber && (
                <span
                  className="text-xs px-2 py-0.5 border-round font-mono hidden md:inline-block"
                  style={{
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                    color: isDarkMode ? '#cbd5e1' : '#475569',
                    border: '1px solid #cbd5e1',
                  }}
                  title="Next auto-generated AWR series reference number"
                >
                  Next Ref: <strong>{nextAwrNumber}</strong>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 m-0">
              Admission and Withdrawal Register (A.W.R.) — Official general register ledger, admission records, and student folio extracts.
            </p>
          </div>

          <div className="flex align-items-center gap-2 flex-wrap">
            <Button
              label="AWR Designer"
              icon="pi pi-sliders-h"
              severity="secondary"
              outlined
              size="small"
              onClick={() => navigate('/superadmin/awr-designer')}
              title="Configure AWR register template layout and letterhead"
              style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
            />
            <Button
              label="Export CSV"
              icon="pi pi-file-excel"
              severity="help"
              outlined
              size="small"
              onClick={exportCsv}
              disabled={loading || data.students.length === 0}
              style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
            />
            <Button
              label="Print Full Register"
              icon="pi pi-print"
              size="small"
              onClick={handlePrintFullLedger}
              disabled={loading || data.students.length === 0}
              style={{
                backgroundColor: themeColor,
                borderColor: themeColor,
                color: '#ffffff',
                fontSize: '0.8rem',
                fontWeight: 700,
                padding: '0.45rem 1rem',
                boxShadow: `0 3px 10px ${themeColor}35`,
              }}
            />
          </div>
        </div>
      </Card>

      {/* KPI Summary Cards (compact scaling matching Gate Pass / Certificate Register) */}
      <div className="grid mb-2">
        <div className="col-12 sm:col-6 md:col-3">
          <Card
            className="shadow-1 border-none"
            style={{
              backgroundColor: themeLighterBg,
              border: `1px solid ${themeBorder}`,
              borderRadius: '8px',
            }}
          >
            <div className="flex justify-content-between align-items-center p-1">
              <div>
                <span
                  className="block font-bold text-xs mb-1"
                  style={{ color: themeColor, fontSize: '0.68rem', letterSpacing: '0.5px' }}
                >
                  TOTAL IN REGISTER
                </span>
                <div
                  className="font-bold"
                  style={{ fontSize: '1.45rem', lineHeight: 1.2, color: isDarkMode ? '#f8fafc' : '#0f172a' }}
                >
                  {data.summary.totalRegistered}
                </div>
              </div>
              <div
                className="flex align-items-center justify-content-center border-round"
                style={{ width: '38px', height: '38px', backgroundColor: themeColor }}
              >
                <i className="pi pi-id-card text-white" style={{ fontSize: '18px' }}></i>
              </div>
            </div>
          </Card>
        </div>

        <div className="col-12 sm:col-6 md:col-3">
          <Card
            className="shadow-1 border-none"
            style={{
              backgroundColor: isDarkMode ? 'rgba(2, 132, 199, 0.08)' : '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '8px',
            }}
          >
            <div className="flex justify-content-between align-items-center p-1">
              <div>
                <span
                  className="block font-bold text-xs mb-1 text-sky-700"
                  style={{ fontSize: '0.68rem', letterSpacing: '0.5px' }}
                >
                  ACTIVE ON ROLL
                </span>
                <div
                  className="font-bold text-sky-900"
                  style={{ fontSize: '1.45rem', lineHeight: 1.2 }}
                >
                  {data.summary.activeOnRoll}
                </div>
              </div>
              <div
                className="flex align-items-center justify-content-center bg-sky-600 border-round"
                style={{ width: '38px', height: '38px' }}
              >
                <i className="pi pi-users text-white" style={{ fontSize: '18px' }}></i>
              </div>
            </div>
          </Card>
        </div>

        <div className="col-12 sm:col-6 md:col-3">
          <Card
            className="shadow-1 border-none"
            style={{
              backgroundColor: isDarkMode ? 'rgba(225, 29, 72, 0.08)' : '#fff1f2',
              border: '1px solid #fecdd3',
              borderRadius: '8px',
            }}
          >
            <div className="flex justify-content-between align-items-center p-1">
              <div>
                <span
                  className="block font-bold text-xs mb-1 text-rose-700"
                  style={{ fontSize: '0.68rem', letterSpacing: '0.5px' }}
                >
                  WITHDRAWN / TC ISSUED
                </span>
                <div
                  className="font-bold text-rose-900"
                  style={{ fontSize: '1.45rem', lineHeight: 1.2 }}
                >
                  {data.summary.totalWithdrawn}
                </div>
              </div>
              <div
                className="flex align-items-center justify-content-center bg-rose-600 border-round"
                style={{ width: '38px', height: '38px' }}
              >
                <i className="pi pi-user-minus text-white" style={{ fontSize: '18px' }}></i>
              </div>
            </div>
          </Card>
        </div>

        <div className="col-12 sm:col-6 md:col-3">
          <Card
            className="shadow-1 border-none"
            style={{
              backgroundColor: isDarkMode ? 'rgba(217, 119, 6, 0.08)' : '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '8px',
            }}
          >
            <div className="flex justify-content-between align-items-center p-1">
              <div>
                <span
                  className="block font-bold text-xs mb-1 text-amber-700"
                  style={{ fontSize: '0.68rem', letterSpacing: '0.5px' }}
                >
                  NEW ADMISSIONS (SESSION)
                </span>
                <div
                  className="font-bold text-amber-900"
                  style={{ fontSize: '1.45rem', lineHeight: 1.2 }}
                >
                  {data.summary.newAdmissionsThisYear}
                </div>
              </div>
              <div
                className="flex align-items-center justify-content-center bg-amber-600 border-round"
                style={{ width: '38px', height: '38px' }}
              >
                <i className="pi pi-user-plus text-white" style={{ fontSize: '18px' }}></i>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Filter Ribbon */}
      <Card className="mb-2.5 shadow-1 border-none py-1">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap align-items-center gap-2">
          {/* Class Filter */}
          <div className="w-10rem sm:w-11rem">
            <Dropdown
              value={selectedClassId}
              options={classes.map((c) => ({ label: `Class ${c.name}`, value: c.id }))}
              onChange={(e) => handleClassChange(e.value)}
              placeholder="All Classes"
              showClear
              className="w-full p-inputtext-sm"
            />
          </div>

          {/* Section Filter */}
          <div className="w-9rem sm:w-10rem">
            <Dropdown
              value={selectedSectionId}
              options={sections.map((s) => ({ label: `Sec ${s.name}`, value: s.id }))}
              onChange={(e) => setSelectedSectionId(e.value)}
              placeholder="All Sections"
              showClear
              disabled={!selectedClassId || sections.length === 0}
              className="w-full p-inputtext-sm"
            />
          </div>

          {/* Status Filter */}
          <div className="w-11rem sm:w-12rem">
            <Dropdown
              value={statusFilter}
              options={[
                { label: 'All Registered', value: 'all' },
                { label: 'Active (On Roll)', value: 'active' },
                { label: 'Withdrawn / TC Issued', value: 'withdrawn' },
              ]}
              onChange={(e) => setStatusFilter(e.value)}
              className="w-full p-inputtext-sm"
            />
          </div>

          {/* Search Box */}
          <div className="flex-1 min-w-12rem">
            <span className="p-input-icon-left w-full">
              <i className="pi pi-search" />
              <InputText
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Scholar No, Student Name, Father..."
                className="w-full p-inputtext-sm"
              />
            </span>
          </div>

          <Button
            type="submit"
            label="Filter"
            icon="pi pi-filter"
            size="small"
            style={{
              backgroundColor: themeColor,
              borderColor: themeColor,
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.8rem',
              padding: '0.45rem 1rem',
            }}
          />
          <Button
            type="button"
            icon="pi pi-refresh"
            size="small"
            severity="secondary"
            outlined
            onClick={handleClearFilters}
            title="Reset Filters"
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.75rem' }}
          />
        </form>
      </Card>

      {/* Main Ledger Table */}
      <Card className="shadow-2 border-none p-0 overflow-hidden">
        <DataTable
          value={data.students}
          loading={loading}
          paginator
          rows={15}
          rowsPerPageOptions={[10, 15, 25, 50, 100]}
          emptyMessage="No students found matching the selected AWR register filters."
          className="p-datatable-sm"
          stripedRows
          rowHover
          responsiveLayout="scroll"
        >
          {/* Scholar / Admission No */}
          <Column
            field="admissionNo"
            header="Scholar No"
            sortable
            style={{ width: '120px' }}
            body={(row) => (
              <div>
                <span className="font-bold" style={{ color: themeColor }}>{row.admissionNo}</span>
                <div className="text-2xs text-slate-500" style={{ fontSize: '10px' }}>
                  {row.admissionDateFormatted}
                </div>
              </div>
            )}
          />

          {/* Student Profile */}
          <Column
            field="studentName"
            header="Student Name & Parentage"
            sortable
            style={{ minWidth: '220px' }}
            body={(row) => (
              <div className="flex align-items-center gap-2">
                <Avatar
                  image={row.photoUrl || undefined}
                  label={!row.photoUrl ? (row.firstName?.[0] || 'S') : undefined}
                  shape="circle"
                  size="normal"
                  className="font-bold flex-shrink-0"
                  style={{
                    backgroundColor: `${themeColor}20`,
                    color: themeColor,
                    width: '32px',
                    height: '32px',
                    fontSize: '13px',
                  }}
                />
                <div>
                  <div className="font-bold text-slate-800">{row.studentName}</div>
                  <div className="text-xs text-slate-500">
                    S/D of: <strong className="text-slate-700">{row.fatherName || '-'}</strong> &{' '}
                    <span className="text-slate-600">{row.motherName || '-'}</span>
                  </div>
                </div>
              </div>
            )}
          />

          {/* Date of Birth */}
          <Column
            field="dobFormatted"
            header="Date of Birth"
            sortable
            style={{ minWidth: '150px' }}
            body={(row) => (
              <div>
                <div className="font-semibold text-slate-800">{row.dobFormatted}</div>
                <div className="text-2xs text-slate-500 italic" style={{ fontSize: '9px', lineHeight: 1.2 }}>
                  {row.dobWords}
                </div>
              </div>
            )}
          />

          {/* Category & Religion */}
          <Column
            header="Cat / Religion"
            style={{ minWidth: '120px' }}
            body={(row) => (
              <div className="text-xs">
                <span className="font-semibold text-slate-700">{row.categoryName}</span>
                <div className="text-slate-500">{row.religionName}</div>
              </div>
            )}
          />

          {/* Class Enrollment */}
          <Column
            header="Class Admitted & Current"
            style={{ minWidth: '150px' }}
            body={(row) => (
              <div className="text-xs">
                <div>
                  Admitted: <span className="font-semibold text-slate-700">{row.classAdmitted || '-'}</span>
                </div>
                <div>
                  Current:{' '}
                  <span className="font-bold" style={{ color: themeColor }}>
                    {row.currentClass} {row.currentSection ? `(${row.currentSection})` : ''}
                  </span>
                </div>
              </div>
            )}
          />

          {/* Register Status */}
          <Column
            field="status"
            header="Status"
            sortable
            style={{ width: '110px' }}
            body={(row) => (
              <Tag
                value={row.status === 'Active' ? 'Active / On Roll' : 'Withdrawn'}
                severity={row.status === 'Active' ? 'success' : 'danger'}
                className="text-xs px-2"
              />
            )}
          />

          {/* Leaving / TC Details */}
          <Column
            header="Leaving / TC Info"
            style={{ minWidth: '160px' }}
            body={(row) => (
              <div className="text-xs">
                {row.status === 'Active' ? (
                  <span className="text-slate-400 italic">On Roll (No TC)</span>
                ) : (
                  <div>
                    <div className="font-semibold text-rose-700">
                      Left: {row.withdrawalDateFormatted || '-'}
                    </div>
                    {row.tcNumber && (
                      <div className="font-mono text-slate-600" style={{ fontSize: '10px' }}>
                        TC: {row.tcNumber}
                      </div>
                    )}
                    {row.reasonForLeaving && (
                      <div className="text-slate-500 italic line-clamp-1" style={{ fontSize: '9.5px' }} title={row.reasonForLeaving}>
                        {row.reasonForLeaving}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          />

          {/* Actions */}
          <Column
            header="Action"
            alignHeader="center"
            style={{ width: '130px', textAlign: 'center' }}
            body={(row) => (
              <div className="flex justify-content-center gap-1">
                <Button
                  label="AWR Folio"
                  icon="pi pi-id-card"
                  size="small"
                  outlined
                  onClick={() => {
                    setSelectedStudent(row);
                    setShowFolioModal(true);
                  }}
                  style={{
                    color: themeColor,
                    borderColor: themeColor,
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    padding: '0.35rem 0.75rem',
                  }}
                  title="View and print official AWR Folio Sheet for this student"
                />
              </div>
            )}
          />
        </DataTable>
      </Card>

      {/* Student Folio Modal */}
      {selectedStudent && (
        <AwrStudentFolioModal
          open={showFolioModal}
          onClose={() => {
            setShowFolioModal(false);
            setSelectedStudent(null);
          }}
          student={selectedStudent}
          config={data.config}
        />
      )}

      {/* Hidden Master Ledger Print Template (Used by handlePrintFullLedger) */}
      <div style={{ display: 'none' }}>
        <div ref={ledgerPrintRef} style={{ padding: '15px', fontFamily: config.fontFamily || 'Inter, sans-serif' }}>
          {/* Header */}
          <div className="text-center pb-2 mb-2" style={{ borderBottom: `2.5px double ${config.borderColor || '#065f46'}` }}>
            <h2 style={{ margin: 0, fontSize: '20px', color: config.primaryColor || '#065f46', textTransform: 'uppercase' }}>
              {config.headerSchoolNameCustom || 'DELHI PUBLIC SCHOOL JAIPUR'}
            </h2>
            <div style={{ fontSize: '11px', color: '#334155', fontWeight: 600 }}>
              {config.headerSubtitleCustom || 'Affiliated to CBSE, New Delhi • Affil No: 1730245 • School Code: 10589 • U-DISE: 081203001'}
            </div>
            <div style={{ fontSize: '10px', color: '#475569' }}>
              {config.headerAddressCustom || 'Sector 4, Green Avenue, Vidyadhar Nagar, Jaipur - 302023 (Rajasthan)'}
            </div>
          </div>

          {/* Title */}
          <div
            style={{
              textAlign: 'center',
              backgroundColor: config.primaryColor || '#065f46',
              color: '#ffffff',
              padding: '6px',
              borderRadius: '4px',
              marginBottom: '10px',
            }}
          >
            <div style={{ fontSize: '14px', fontWeight: 'bold', letterSpacing: '1px' }}>
              {config.reportTitle || 'ADMISSION AND WITHDRAWAL REGISTER (A.W.R.)'}
            </div>
            <div style={{ fontSize: '9px', opacity: 0.9 }}>
              {config.reportSubtitle || 'Statutory General Register maintained under Education Act & Board Rules'}
            </div>
          </div>

          {/* Filter summary bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '8px', color: '#334155' }}>
            <div><strong>Ref:</strong> {config.refPrefix || 'DPS/AWR'}/REGISTER</div>
            <div><strong>Academic Session:</strong> 2025-2026</div>
            <div><strong>Total Students:</strong> {data.students.length} (Active: {data.summary.activeOnRoll}, Withdrawn: {data.summary.totalWithdrawn})</div>
            <div><strong>Date of Print:</strong> {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
          </div>

          {/* Master Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
            <thead>
              <tr style={{ backgroundColor: config.tableHeaderBgColor || '#065f46', color: '#ffffff', textAlign: 'left' }}>
                <th style={{ border: '1px solid #94a3b8', padding: '4px' }}>Scholar No</th>
                <th style={{ border: '1px solid #94a3b8', padding: '4px' }}>Adm Date</th>
                <th style={{ border: '1px solid #94a3b8', padding: '4px' }}>Student Name</th>
                <th style={{ border: '1px solid #94a3b8', padding: '4px' }}>Gender</th>
                <th style={{ border: '1px solid #94a3b8', padding: '4px' }}>DOB</th>
                <th style={{ border: '1px solid #94a3b8', padding: '4px' }}>DOB in Words</th>
                <th style={{ border: '1px solid #94a3b8', padding: '4px' }}>Father's Name & Occ</th>
                <th style={{ border: '1px solid #94a3b8', padding: '4px' }}>Mother's Name</th>
                <th style={{ border: '1px solid #94a3b8', padding: '4px' }}>Cat / Rel</th>
                <th style={{ border: '1px solid #94a3b8', padding: '4px' }}>Class Admitted</th>
                <th style={{ border: '1px solid #94a3b8', padding: '4px' }}>Current</th>
                <th style={{ border: '1px solid #94a3b8', padding: '4px' }}>Status</th>
                <th style={{ border: '1px solid #94a3b8', padding: '4px' }}>Leaving Info</th>
                <th style={{ border: '1px solid #94a3b8', padding: '4px' }}>TC No</th>
                <th style={{ border: '1px solid #94a3b8', padding: '4px' }}>Conduct</th>
              </tr>
            </thead>
            <tbody>
              {data.students.map((st, i) => (
                <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                  <td style={{ border: '1px solid #cbd5e1', padding: '4px', fontWeight: 'bold' }}>{st.admissionNo}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '4px' }}>{st.admissionDateFormatted}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '4px', fontWeight: 'bold' }}>{st.studentName}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '4px' }}>{st.gender}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '4px' }}>{st.dobFormatted}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '4px', fontStyle: 'italic', fontSize: '8px' }}>{st.dobWords}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '4px' }}>{st.fatherName}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '4px' }}>{st.motherName}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '4px' }}>{st.categoryName} / {st.religionName}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '4px' }}>{st.classAdmitted}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '4px', fontWeight: 'bold' }}>{st.currentClass}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '4px' }}>{st.status}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '4px' }}>
                    {st.status !== 'Active' ? `${st.withdrawalDateFormatted || ''} (${st.reasonForLeaving || ''})` : '-'}
                  </td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '4px', fontFamily: 'monospace' }}>{st.tcNumber || '-'}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '4px' }}>{st.conduct}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Signatures */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px', paddingTop: '10px' }}>
            <div style={{ textAlign: 'center', width: '200px' }}>
              <div style={{ height: '30px' }}></div>
              <div style={{ borderTop: '1px solid #065f46', paddingTop: '4px', fontWeight: 'bold', fontSize: '10px' }}>
                {config.signature1 || 'Prepared By / Record Clerk'}
              </div>
            </div>
            <div style={{ textAlign: 'center', width: '200px' }}>
              <div style={{ height: '30px' }}></div>
              <div style={{ borderTop: '1px solid #065f46', paddingTop: '4px', fontWeight: 'bold', fontSize: '10px' }}>
                {config.signature2 || 'Checked By / Section In-Charge'}
              </div>
            </div>
            <div style={{ textAlign: 'center', width: '200px' }}>
              <div style={{ height: '30px' }}></div>
              <div style={{ borderTop: '1px solid #065f46', paddingTop: '4px', fontWeight: 'bold', fontSize: '10px' }}>
                {config.signature3 || 'Principal / Head of Institution'}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', marginTop: '15px', fontStyle: 'italic', fontSize: '8px', color: '#64748b' }}>
            {config.footerText}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentAwrReportPage;
