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
import { AwrStudentFolioModal } from '../components/AwrStudentFolioModal';
import { printElement } from '../../../utils/printUtils';

export const StudentAwrReportPage = () => {
  const navigate = useNavigate();
  const toastRef = useRef(null);
  const ledgerPrintRef = useRef(null);
  const { currentAcademicYearId } = useAcademicYear();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    summary: { totalRegistered: 0, activeOnRoll: 0, totalWithdrawn: 0, newAdmissionsThisYear: 0 },
    students: [],
    config: null,
  });

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
    <div className="p-3 surface-ground min-h-screen">
      <Toast ref={toastRef} />

      {/* Header Banner */}
      <Card className="mb-3 shadow-1 border-none">
        <div className="flex flex-column md:flex-row justify-content-between align-items-start md:align-items-center gap-3">
          <div>
            <div className="flex align-items-center gap-2 mb-1">
              <i className="pi pi-table text-2xl text-emerald-600"></i>
              <h1 className="text-2xl font-bold text-slate-800 m-0">Student AWR Report Management</h1>
              <Tag value="Statutory Register" severity="success" className="text-xs px-2" />
            </div>
            <p className="text-sm text-slate-500 m-0">
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
            />
            <Button
              label="Export CSV"
              icon="pi pi-file-excel"
              severity="help"
              outlined
              size="small"
              onClick={exportCsv}
              disabled={loading || data.students.length === 0}
            />
            <Button
              label="Print Full Register"
              icon="pi pi-print"
              severity="success"
              size="small"
              onClick={handlePrintFullLedger}
              disabled={loading || data.students.length === 0}
            />
          </div>
        </div>
      </Card>

      {/* KPI Summary Cards */}
      <div className="grid mb-3">
        <div className="col-12 sm:col-6 md:col-3">
          <Card className="shadow-1 border-none border-left-3 border-emerald-500 surface-card">
            <div className="flex justify-content-between align-items-center">
              <div>
                <span className="block text-500 font-medium text-xs mb-1">TOTAL IN REGISTER</span>
                <div className="text-900 font-bold text-2xl">{data.summary.totalRegistered}</div>
              </div>
              <div
                className="flex align-items-center justify-content-center bg-emerald-100 border-round"
                style={{ width: '2.5rem', height: '2.5rem' }}
              >
                <i className="pi pi-id-card text-emerald-700 text-lg"></i>
              </div>
            </div>
          </Card>
        </div>

        <div className="col-12 sm:col-6 md:col-3">
          <Card className="shadow-1 border-none border-left-3 border-blue-500 surface-card">
            <div className="flex justify-content-between align-items-center">
              <div>
                <span className="block text-500 font-medium text-xs mb-1">ACTIVE ON ROLL</span>
                <div className="text-900 font-bold text-2xl">{data.summary.activeOnRoll}</div>
              </div>
              <div
                className="flex align-items-center justify-content-center bg-blue-100 border-round"
                style={{ width: '2.5rem', height: '2.5rem' }}
              >
                <i className="pi pi-users text-blue-700 text-lg"></i>
              </div>
            </div>
          </Card>
        </div>

        <div className="col-12 sm:col-6 md:col-3">
          <Card className="shadow-1 border-none border-left-3 border-rose-500 surface-card">
            <div className="flex justify-content-between align-items-center">
              <div>
                <span className="block text-500 font-medium text-xs mb-1">WITHDRAWN / TC ISSUED</span>
                <div className="text-900 font-bold text-2xl">{data.summary.totalWithdrawn}</div>
              </div>
              <div
                className="flex align-items-center justify-content-center bg-rose-100 border-round"
                style={{ width: '2.5rem', height: '2.5rem' }}
              >
                <i className="pi pi-user-minus text-rose-700 text-lg"></i>
              </div>
            </div>
          </Card>
        </div>

        <div className="col-12 sm:col-6 md:col-3">
          <Card className="shadow-1 border-none border-left-3 border-amber-500 surface-card">
            <div className="flex justify-content-between align-items-center">
              <div>
                <span className="block text-500 font-medium text-xs mb-1">NEW ADMISSIONS (SESSION)</span>
                <div className="text-900 font-bold text-2xl">{data.summary.newAdmissionsThisYear}</div>
              </div>
              <div
                className="flex align-items-center justify-content-center bg-amber-100 border-round"
                style={{ width: '2.5rem', height: '2.5rem' }}
              >
                <i className="pi pi-user-plus text-amber-700 text-lg"></i>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Filter Ribbon */}
      <Card className="mb-3 shadow-1 border-none">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap align-items-center gap-2">
          {/* Class Filter */}
          <div className="w-12rem">
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
          <div className="w-10rem">
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
          <div className="w-12rem">
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
          <div className="flex-1 min-w-15rem">
            <span className="p-input-icon-left w-full">
              <i className="pi pi-search" />
              <InputText
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Scholar No, Student Name, Father Name, Mobile..."
                className="w-full p-inputtext-sm"
              />
            </span>
          </div>

          <Button type="submit" label="Filter" icon="pi pi-filter" size="small" severity="primary" />
          <Button
            type="button"
            icon="pi pi-refresh"
            size="small"
            severity="secondary"
            outlined
            onClick={handleClearFilters}
            title="Reset Filters"
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
                <span className="font-bold text-emerald-800">{row.admissionNo}</span>
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
                  className="bg-emerald-100 text-emerald-800 font-bold flex-shrink-0"
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
                  <span className="font-bold text-emerald-700">
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
                  severity="success"
                  outlined
                  onClick={() => {
                    setSelectedStudent(row);
                    setShowFolioModal(true);
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
