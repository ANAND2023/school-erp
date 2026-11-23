import React, { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Tag } from 'primereact/tag';
import { Avatar } from 'primereact/avatar';
import { useNavigate } from 'react-router-dom';
import { studentApi } from '../api';
import { classesApi } from '../../masters/api';
import { useAcademicYear } from '../../../hooks/useAcademicYear';
import { BonafideCertificateModal } from '../components/BonafideCertificateModal';
import { IssueCertificateModal } from '../components/IssueCertificateModal';

const CERT_META = {
  bonafide: {
    title: 'Bonafide Certificate',
    shortTitle: 'Bonafide',
    badge: 'DPS/BC',
    subtitle: 'Generate and print officially verified bonafide student certificates verifying institutional enrollment and session.',
    icon: 'pi pi-verified',
    colorClass: 'text-blue-700 bg-blue-100',
    buttonLabel: 'Issue Bonafide',
    themeColor: '#1e3a8a',
  },
  birth: {
    title: 'Date of Birth (DOB) Certificate',
    shortTitle: 'Birth Certificate',
    badge: 'DPS/DOB',
    subtitle: 'Extract and issue certified Date of Birth certificates directly from official school admission register records.',
    icon: 'pi pi-calendar',
    colorClass: 'text-teal-700 bg-teal-100',
    buttonLabel: 'Issue Birth Cert',
    themeColor: '#0f766e',
  },
  age: {
    title: 'Certificate of Age',
    shortTitle: 'Age Certificate',
    badge: 'DPS/AGE',
    subtitle: 'Generate verified age certificates showing student exact calculated age as of reference date from institutional records.',
    icon: 'pi pi-clock',
    colorClass: 'text-amber-700 bg-amber-100',
    buttonLabel: 'Issue Age Cert',
    themeColor: '#b45309',
  },
  character: {
    title: 'Character & Conduct Certificate',
    shortTitle: 'Character Certificate',
    badge: 'DPS/CC',
    subtitle: 'Issue certified moral character, obedience, exemplary discipline, and academic conduct certificates.',
    icon: 'pi pi-star',
    colorClass: 'text-rose-700 bg-rose-100',
    buttonLabel: 'Issue Character Cert',
    themeColor: '#831843',
  },
  ret: {
    title: 'RET Certificate',
    shortTitle: 'RET Certificate',
    badge: 'DPS/RET',
    subtitle: 'Generate verified record of education, examination results, academic performance, and retention status.',
    icon: 'pi pi-file',
    colorClass: 'text-purple-700 bg-purple-100',
    buttonLabel: 'Issue RET Cert',
    themeColor: '#581c87',
  },
};

const CERT_TABS = [
  { id: 'bonafide', label: 'Bonafide Certificate', badge: 'DPS/BC', icon: 'pi pi-verified', path: '/certificates/bonafide' },
  { id: 'birth', label: 'Date of Birth (DOB)', badge: 'DPS/DOB', icon: 'pi pi-calendar', path: '/certificates/birth' },
  { id: 'age', label: 'Certificate of Age', badge: 'DPS/AGE', icon: 'pi pi-clock', path: '/certificates/age' },
  { id: 'character', label: 'Character Certificate', badge: 'DPS/CC', icon: 'pi pi-star', path: '/certificates/character' },
  { id: 'ret', label: 'RET Certificate', badge: 'DPS/RET', icon: 'pi pi-file', path: '/certificates/ret' },
];

export const BonafideCertificatesPage = ({ defaultType = 'bonafide' }) => {
  const navigate = useNavigate();
  const { activeAcademicYearId, activeAcademicYear } = useAcademicYear();

  const [activeCertType, setActiveCertType] = useState(defaultType);
  const [activeViewTab, setActiveViewTab] = useState('register'); // 'register' | 'log'
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState(15);
  const [totalRecords, setTotalRecords] = useState(0);

  // Modals
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [customCertOptions, setCustomCertOptions] = useState(null);

  // Persistent Issued Certificates History
  const [issuedLog, setIssuedLog] = useState(() => {
    try {
      const saved = localStorage.getItem('dvs_issued_certificates_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    setActiveCertType(defaultType);
  }, [defaultType]);

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    loadStudents();
  }, [page, rows, selectedClassId, selectedSectionId, activeAcademicYearId]);

  const loadClasses = async () => {
    try {
      const res = await classesApi.getClasses();
      if (res?.data?.data) {
        setClasses(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load classes:', err);
    }
  };

  const loadStudents = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: rows,
        academicYearId: activeAcademicYearId || undefined,
        classId: selectedClassId || undefined,
        sectionId: selectedSectionId || undefined,
        search: search.trim() || undefined,
      };

      const res = await studentApi.getStudents(params);
      if (res?.data?.data) {
        const studentList = res.data.data.items || res.data.data || [];
        setStudents(studentList);
        setTotalRecords(res.data.data.totalCount || studentList.length || 0);
      } else {
        setStudents([]);
        setTotalRecords(0);
      }
    } catch (err) {
      console.error('Failed to load students for certificates:', err);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadStudents();
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedClassId(null);
    setSelectedSectionId(null);
    setPage(1);
    loadStudents();
  };

  const openCertificate = (student, customOpts = null) => {
    setSelectedStudent(student);
    setCustomCertOptions(customOpts);
    setModalOpen(true);
  };

  const handleIssueFromModal = (student, certOptions) => {
    setSelectedStudent(student);
    setCustomCertOptions(certOptions);
    setModalOpen(true);
  };

  const handleCertificatePrinted = (logEntry) => {
    const updated = [logEntry, ...issuedLog.filter((item) => item.refNo !== logEntry.refNo)].slice(0, 100);
    setIssuedLog(updated);
    try {
      localStorage.setItem('dvs_issued_certificates_history', JSON.stringify(updated));
    } catch (e) {
      console.error('Could not save certificate log:', e);
    }
  };

  const handleTabChange = (tab) => {
    setActiveCertType(tab.id);
    navigate(tab.path);
  };

  const activeMeta = CERT_META[activeCertType] || CERT_META.bonafide;

  // Filtered Issued Log for current Certificate Type
  const currentTypeIssuedLog = issuedLog.filter((l) => l.certificateType === activeCertType);

  // Section options based on selected class
  const currentClassObj = classes.find((c) => c.id === selectedClassId);
  const sectionOptions = currentClassObj?.sections
    ? currentClassObj.sections.map((s) => ({ label: s.name, value: s.id }))
    : [];

  // Table Templates
  const studentInfoTemplate = (row) => {
    const photo = row.photoUrl || row.studentPhotoUrl || row.photo;
    const name = row.studentName || row.fullName || `${row.firstName || ''} ${row.lastName || ''}`.trim() || 'Student';
    return (
      <div className="flex align-items-center gap-3">
        {photo ? (
          <img
            src={photo}
            alt={name}
            className="w-3rem h-3rem border-circle object-cover shadow-1 flex-shrink-0"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        ) : (
          <Avatar
            label={name.charAt(0).toUpperCase()}
            shape="circle"
            size="large"
            className="bg-blue-100 text-blue-800 font-bold flex-shrink-0"
          />
        )}
        <div>
          <div
            className="font-bold text-slate-800 hover:text-blue-600 transition-colors cursor-pointer"
            onClick={() => openCertificate(row)}
          >
            {name}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex align-items-center gap-2">
            <span>
              Adm: <strong className="text-slate-700">{row.admissionNo || 'N/A'}</strong>
            </span>
            {row.rollNo && (
              <>
                <span>•</span>
                <span>
                  Roll: <strong className="text-slate-700">{row.rollNo}</strong>
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const classSectionTemplate = (row) => {
    const className = row.className || row.currentEnrollment?.className || 'N/A';
    const sectionName = row.sectionName || row.currentEnrollment?.sectionName || '';
    return (
      <div>
        <Tag value={`${className} ${sectionName ? `- ${sectionName}` : ''}`} severity="info" className="font-semibold" />
      </div>
    );
  };

  const parentTemplate = (row) => {
    const fatherName =
      row.fatherName || row.guardians?.find((g) => g.relation === 'Father')?.fullName || row.parentName || '—';
    const contact = row.contactNumber || row.fatherPhone || row.phone || row.mobileNo || '';
    return (
      <div>
        <div className="font-medium text-slate-700 text-sm">{fatherName}</div>
        {contact && (
          <div className="text-xs text-slate-500 mt-1">
            <i className="pi pi-phone mr-1"></i>
            {contact}
          </div>
        )}
      </div>
    );
  };

  const refNoPreviewTemplate = (row) => {
    const year = new Date().getFullYear();
    const adm = row.admissionNo || row.id || '001';
    return (
      <span className="font-mono text-xs font-bold" style={{ color: activeMeta.themeColor }}>
        {`${activeMeta.badge}/${year}/${adm}`}
      </span>
    );
  };

  const actionsTemplate = (row) => {
    return (
      <div className="flex align-items-center gap-2 justify-content-center">
        <Button
          label={activeMeta.buttonLabel}
          icon="pi pi-print"
          size="small"
          onClick={() => openCertificate(row)}
          className="p-button-sm shadow-1 font-semibold"
          style={{
            backgroundColor: activeMeta.themeColor,
            borderColor: activeMeta.themeColor,
          }}
        />
      </div>
    );
  };

  return (
    <div className="p-3 md:p-4">
      {/* Certificate Type Switcher Ribbon */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
        {CERT_TABS.map((tab) => {
          const isActive = activeCertType === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab)}
              className={`p-2 px-3 border-round border-none font-bold text-xs flex align-items-center gap-2 cursor-pointer transition-all shadow-1 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-2'
                  : 'surface-card text-slate-700 hover:surface-100 hover:text-blue-600'
              }`}
            >
              <i className={tab.icon}></i>
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 border-round text-xs ${
                  isActive ? 'bg-blue-700 text-blue-100' : 'bg-slate-200 text-slate-700'
                }`}
                style={{ fontSize: '10px' }}
              >
                {tab.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* Page Header with Gate Pass Style + Issue New Certificate Action */}
      <div className="flex flex-column md:flex-row md:align-items-center justify-content-between gap-3 mb-4">
        <div>
          <div className="flex align-items-center gap-2">
            <div className={`w-3rem h-3rem border-round flex align-items-center justify-content-center ${activeMeta.colorClass}`}>
              <i className={`${activeMeta.icon} text-2xl`}></i>
            </div>
            <div>
              <div className="flex align-items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-800 m-0">{activeMeta.title}</h1>
                <Tag
                  value={activeMeta.badge}
                  className="font-bold text-xs px-2 py-1"
                  style={{ backgroundColor: activeMeta.themeColor, color: '#ffffff' }}
                />
              </div>
              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                Institutional Certificates Module • School Register
              </span>
            </div>
          </div>
          <p className="text-sm text-slate-500 mt-2 mb-0">{activeMeta.subtitle}</p>
        </div>

        {/* Primary Action Button: Mirroring + Issue New Gate Pass */}
        <div className="flex align-items-center gap-2">
          <Button
            label={`+ Issue ${activeMeta.shortTitle || activeMeta.title}`}
            icon="pi pi-plus"
            severity="primary"
            onClick={() => setIssueModalOpen(true)}
            className="p-button font-bold px-3 py-2 shadow-2"
            style={{
              backgroundColor: activeMeta.themeColor,
              borderColor: activeMeta.themeColor,
            }}
          />
        </div>
      </div>

      {/* Quick Stats Summary Cards (Matching Gate Pass Style) */}
      <div className="grid mb-4">
        <div className="col-12 sm:col-6 lg:col-3">
          <Card className="shadow-1 border-none surface-card border-round">
            <div className="flex justify-content-between align-items-center">
              <div>
                <span className="block text-500 font-medium text-xs mb-1">Total Enrolled Students</span>
                <div className="text-900 font-bold text-2xl">{totalRecords}</div>
              </div>
              <div className="w-3rem h-3rem border-circle bg-blue-50 text-blue-600 flex align-items-center justify-content-center">
                <i className="pi pi-users text-xl"></i>
              </div>
            </div>
          </Card>
        </div>

        <div className="col-12 sm:col-6 lg:col-3">
          <Card className="shadow-1 border-none surface-card border-round">
            <div className="flex justify-content-between align-items-center">
              <div>
                <span className="block text-500 font-medium text-xs mb-1">Statutory Certificate Ref</span>
                <div className="font-bold text-2xl" style={{ color: activeMeta.themeColor }}>
                  {activeMeta.badge}
                </div>
              </div>
              <div
                className="w-3rem h-3rem border-circle flex align-items-center justify-content-center"
                style={{ backgroundColor: `${activeMeta.themeColor}15`, color: activeMeta.themeColor }}
              >
                <i className={`${activeMeta.icon} text-xl`}></i>
              </div>
            </div>
          </Card>
        </div>

        <div className="col-12 sm:col-6 lg:col-3">
          <Card className="shadow-1 border-none surface-card border-round">
            <div className="flex justify-content-between align-items-center">
              <div>
                <span className="block text-500 font-medium text-xs mb-1">Issued in Session Log</span>
                <div className="text-900 font-bold text-2xl text-purple-700">
                  {currentTypeIssuedLog.length} Passes
                </div>
              </div>
              <div className="w-3rem h-3rem border-circle bg-purple-50 text-purple-600 flex align-items-center justify-content-center">
                <i className="pi pi-history text-xl"></i>
              </div>
            </div>
          </Card>
        </div>

        <div className="col-12 sm:col-6 lg:col-3">
          <Card className="shadow-1 border-none surface-card border-round">
            <div className="flex justify-content-between align-items-center">
              <div>
                <span className="block text-500 font-medium text-xs mb-1">Academic Session</span>
                <div className="text-900 font-bold text-base text-emerald-700 mt-1">
                  {activeAcademicYear?.name || '2025-2026 Session'}
                </div>
              </div>
              <div className="w-3rem h-3rem border-circle bg-emerald-50 text-emerald-600 flex align-items-center justify-content-center">
                <i className="pi pi-check-circle text-xl"></i>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* View Switcher: Students Register vs Issued Certificates Log */}
      <div className="flex align-items-center justify-content-between mb-3 border-bottom-1 surface-border pb-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveViewTab('register')}
            className={`px-3 py-2 border-round border-none font-bold text-xs flex align-items-center gap-2 cursor-pointer transition-all ${
              activeViewTab === 'register'
                ? 'bg-blue-600 text-white shadow-1'
                : 'surface-100 text-slate-700 hover:surface-200'
            }`}
          >
            <i className="pi pi-list"></i>
            <span>Students Register (Issue Certificate)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveViewTab('log')}
            className={`px-3 py-2 border-round border-none font-bold text-xs flex align-items-center gap-2 cursor-pointer transition-all ${
              activeViewTab === 'log'
                ? 'bg-blue-600 text-white shadow-1'
                : 'surface-100 text-slate-700 hover:surface-200'
            }`}
          >
            <i className="pi pi-history"></i>
            <span>Recently Issued Log ({currentTypeIssuedLog.length})</span>
          </button>
        </div>

        <Button
          label={`+ Quick Issue`}
          icon="pi pi-plus-circle"
          size="small"
          text
          onClick={() => setIssueModalOpen(true)}
          className="text-xs font-bold"
        />
      </div>

      {activeViewTab === 'register' ? (
        <>
          {/* Filter and Search Bar */}
          <Card className="shadow-1 border-none mb-4">
            <form onSubmit={handleSearchSubmit} className="grid align-items-end">
              <div className="col-12 md:col-4">
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Search Student / Admission / Roll:
                </label>
                <span className="p-input-icon-left w-full">
                  <i className="pi pi-search" />
                  <InputText
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by student name, adm no..."
                    className="w-full p-inputtext-sm"
                  />
                </span>
              </div>

              <div className="col-12 sm:col-6 md:col-3">
                <label className="text-xs font-semibold text-slate-700 block mb-1">Class:</label>
                <Dropdown
                  value={selectedClassId}
                  options={classes.map((c) => ({ label: c.name, value: c.id }))}
                  onChange={(e) => {
                    setSelectedClassId(e.value);
                    setSelectedSectionId(null);
                    setPage(1);
                  }}
                  placeholder="All Classes"
                  showClear
                  className="w-full p-inputtext-sm"
                />
              </div>

              <div className="col-12 sm:col-6 md:col-3">
                <label className="text-xs font-semibold text-slate-700 block mb-1">Section:</label>
                <Dropdown
                  value={selectedSectionId}
                  options={sectionOptions}
                  onChange={(e) => {
                    setSelectedSectionId(e.value);
                    setPage(1);
                  }}
                  placeholder="All Sections"
                  disabled={!selectedClassId || sectionOptions.length === 0}
                  showClear
                  className="w-full p-inputtext-sm"
                />
              </div>

              <div className="col-12 md:col-2 flex gap-2">
                <Button type="submit" label="Filter" icon="pi pi-filter" size="small" className="w-full p-button-sm" />
                <Button
                  type="button"
                  icon="pi pi-refresh"
                  outlined
                  severity="secondary"
                  size="small"
                  onClick={handleResetFilters}
                  title="Reset Filters"
                />
              </div>
            </form>
          </Card>

          {/* Students Data Table */}
          <Card className="shadow-1 border-none">
            <DataTable
              value={students}
              loading={loading}
              paginator
              rows={rows}
              totalRecords={totalRecords}
              lazy
              first={(page - 1) * rows}
              onPage={(e) => {
                setPage(Math.floor(e.first / e.rows) + 1);
                setRows(e.rows);
              }}
              rowsPerPageOptions={[10, 15, 25, 50]}
              emptyMessage="No students found matching current filters."
              responsiveLayout="stack"
              className="p-datatable-sm"
            >
              <Column header="Student" body={studentInfoTemplate} style={{ minWidth: '240px' }} />
              <Column header="Class & Section" body={classSectionTemplate} style={{ minWidth: '130px' }} />
              <Column header="Parent's Name" body={parentTemplate} style={{ minWidth: '160px' }} />
              <Column
                header="DOB"
                field="dob"
                body={(row) => (
                  <span className="text-sm text-slate-700 font-medium">
                    {row.dob ? new Date(row.dob).toLocaleDateString('en-GB') : '—'}
                  </span>
                )}
                style={{ width: '120px' }}
              />
              <Column
                header="Ref Preview"
                body={refNoPreviewTemplate}
                style={{ width: '150px' }}
              />
              <Column header="Action" body={actionsTemplate} style={{ width: '170px', textAlign: 'center' }} />
            </DataTable>
          </Card>
        </>
      ) : (
        /* Recently Issued Certificates Log */
        <Card className="shadow-1 border-none">
          {currentTypeIssuedLog.length === 0 ? (
            <div className="text-center py-6 text-slate-500">
              <i className="pi pi-inbox text-4xl mb-3 block text-slate-300"></i>
              <div className="font-bold text-base text-slate-700">No {activeMeta.title} issued yet</div>
              <p className="text-xs text-slate-500 mt-1 mb-3">
                Click "+ Issue {activeMeta.shortTitle}" above to issue a certificate for any student.
              </p>
              <Button
                label={`+ Issue New ${activeMeta.shortTitle}`}
                icon="pi pi-plus"
                size="small"
                onClick={() => setIssueModalOpen(true)}
                style={{ backgroundColor: activeMeta.themeColor, borderColor: activeMeta.themeColor }}
              />
            </div>
          ) : (
            <DataTable
              value={currentTypeIssuedLog}
              paginator
              rows={10}
              className="p-datatable-sm"
              responsiveLayout="stack"
            >
              <Column
                header="Dispatch Ref No"
                field="refNo"
                body={(row) => (
                  <span className="font-mono font-bold text-sm" style={{ color: activeMeta.themeColor }}>
                    {row.refNo}
                  </span>
                )}
              />
              <Column
                header="Student"
                body={(row) => (
                  <div>
                    <div className="font-bold text-slate-800">{row.studentName}</div>
                    <div className="text-xs text-slate-500">Adm No: {row.admissionNo}</div>
                  </div>
                )}
              />
              <Column
                header="Class - Section"
                body={(row) => (
                  <Tag value={`${row.className || ''} ${row.sectionName ? `- ${row.sectionName}` : ''}`} severity="info" />
                )}
              />
              <Column
                header="Date of Issue"
                field="issueDate"
                body={(row) => <span className="text-xs font-semibold">{row.issueDate}</span>}
              />
              <Column
                header="Purpose / Reason"
                field="purpose"
                body={(row) => <span className="text-xs text-slate-600">{row.purpose}</span>}
              />
              <Column
                header="Action"
                body={(row) => (
                  <Button
                    label="Re-print"
                    icon="pi pi-print"
                    size="small"
                    outlined
                    onClick={() => {
                      const studentObj = {
                        id: row.studentId,
                        studentName: row.studentName,
                        fullName: row.studentName,
                        admissionNo: row.admissionNo,
                        className: row.className,
                        sectionName: row.sectionName,
                        rollNo: row.rollNo,
                      };
                      openCertificate(studentObj, {
                        refNo: row.refNo,
                        issueDate: row.issueDate,
                        purpose: row.purpose,
                      });
                    }}
                    className="p-button-sm text-xs font-semibold"
                  />
                )}
                style={{ width: '130px', textAlign: 'center' }}
              />
            </DataTable>
          )}
        </Card>
      )}

      {/* Step 1: Issue Certificate Modal (Same as CreateGatePassModal) */}
      <IssueCertificateModal
        open={issueModalOpen}
        onClose={() => setIssueModalOpen(false)}
        certificateType={activeCertType}
        classes={classes}
        onIssueSuccess={handleIssueFromModal}
      />

      {/* Step 2: Dynamic Certificate Print / Slip Modal */}
      {selectedStudent && (
        <BonafideCertificateModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedStudent(null);
            setCustomCertOptions(null);
          }}
          studentId={selectedStudent.id}
          studentData={selectedStudent}
          certificateType={activeCertType}
          initialRefNo={customCertOptions?.refNo}
          initialPurpose={customCertOptions?.purpose}
          initialDate={customCertOptions?.issueDate}
          initialPrintWithLetterhead={customCertOptions?.printWithLetterhead}
          onPrinted={handleCertificatePrinted}
        />
      )}
    </div>
  );
};

export default BonafideCertificatesPage;
