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

const CERT_META = {
  bonafide: {
    title: 'Bonafide Certificate',
    subtitle: 'Generate and print officially verified bonafide student certificates verifying institutional enrollment and session.',
    icon: 'pi pi-verified',
    colorClass: 'text-blue-700 bg-blue-100',
    buttonLabel: 'Issue Bonafide',
    themeColor: '#1e3a8a',
  },
  birth: {
    title: 'Date of Birth (DOB) Certificate',
    subtitle: 'Extract and issue certified Date of Birth certificates directly from official school admission register records.',
    icon: 'pi pi-calendar',
    colorClass: 'text-teal-700 bg-teal-100',
    buttonLabel: 'Issue Birth Cert',
    themeColor: '#0f766e',
  },
  age: {
    title: 'Certificate of Age',
    subtitle: 'Generate verified age certificates showing student exact calculated age as of reference date from institutional records.',
    icon: 'pi pi-clock',
    colorClass: 'text-amber-700 bg-amber-100',
    buttonLabel: 'Issue Age Cert',
    themeColor: '#b45309',
  },
  character: {
    title: 'Character & Conduct Certificate',
    subtitle: 'Issue certified moral character, obedience, exemplary discipline, and academic conduct certificates.',
    icon: 'pi pi-star',
    colorClass: 'text-rose-700 bg-rose-100',
    buttonLabel: 'Issue Character Cert',
    themeColor: '#881337',
  },
  ret: {
    title: 'RET Certificate',
    subtitle: 'Generate verified record of education, examination results, academic performance, and retention status.',
    icon: 'pi pi-file',
    colorClass: 'text-purple-700 bg-purple-100',
    buttonLabel: 'Issue RET Cert',
    themeColor: '#581c87',
  },
};

const CERT_TABS = [
  { id: 'bonafide', label: 'Bonafide', icon: 'pi pi-verified', path: '/certificates/bonafide' },
  { id: 'birth', label: 'Birth (DOB)', icon: 'pi pi-calendar', path: '/certificates/birth' },
  { id: 'age', label: 'Age Proof', icon: 'pi pi-clock', path: '/certificates/age' },
  { id: 'character', label: 'Character', icon: 'pi pi-star', path: '/certificates/character' },
  { id: 'ret', label: 'RET Certificate', icon: 'pi pi-file', path: '/certificates/ret' },
];

export const BonafideCertificatesPage = ({ defaultType = 'bonafide' }) => {
  const navigate = useNavigate();
  const { activeAcademicYearId } = useAcademicYear();

  const [activeCertType, setActiveCertType] = useState(defaultType);
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

  // Modal State
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

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

  const openCertificate = (student) => {
    setSelectedStudent(student);
    setModalOpen(true);
  };

  const handleTabChange = (tab) => {
    setActiveCertType(tab.id);
    navigate(tab.path);
  };

  const activeMeta = CERT_META[activeCertType] || CERT_META.bonafide;

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

  const actionsTemplate = (row) => {
    return (
      <div className="flex align-items-center gap-2 justify-content-center">
        <Button
          label={activeMeta.buttonLabel}
          icon={activeMeta.icon}
          size="small"
          severity="primary"
          onClick={() => openCertificate(row)}
          className="p-button-sm shadow-1"
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
            </button>
          );
        })}
      </div>

      {/* Page Header */}
      <div className="flex flex-column md:flex-row md:align-items-center justify-content-between gap-3 mb-4">
        <div>
          <div className="flex align-items-center gap-2">
            <div className={`w-2.5rem h-2.5rem border-round flex align-items-center justify-content-center ${activeMeta.colorClass}`}>
              <i className={`${activeMeta.icon} text-xl`}></i>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 m-0">{activeMeta.title}</h1>
              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                School Certificates Module
              </span>
            </div>
          </div>
          <p className="text-sm text-slate-500 mt-2 mb-0">{activeMeta.subtitle}</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid mb-4">
        <div className="col-12 sm:col-6 lg:col-3">
          <Card className="shadow-1 border-none surface-card border-round">
            <div className="flex justify-content-between align-items-center">
              <div>
                <span className="block text-500 font-medium text-xs mb-1">Total Student Records</span>
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
                <span className="block text-500 font-medium text-xs mb-1">Active Classes</span>
                <div className="text-900 font-bold text-2xl">{classes.length}</div>
              </div>
              <div className="w-3rem h-3rem border-circle bg-green-50 text-green-600 flex align-items-center justify-content-center">
                <i className="pi pi-building text-xl"></i>
              </div>
            </div>
          </Card>
        </div>

        <div className="col-12 sm:col-6 lg:col-3">
          <Card className="shadow-1 border-none surface-card border-round">
            <div className="flex justify-content-between align-items-center">
              <div>
                <span className="block text-500 font-medium text-xs mb-1">Certificate Mode</span>
                <div className="text-900 font-bold text-base text-purple-700 mt-1">Dynamic + Letterhead</div>
              </div>
              <div className="w-3rem h-3rem border-circle bg-purple-50 text-purple-600 flex align-items-center justify-content-center">
                <i className="pi pi-image text-xl"></i>
              </div>
            </div>
          </Card>
        </div>

        <div className="col-12 sm:col-6 lg:col-3">
          <Card className="shadow-1 border-none surface-card border-round">
            <div className="flex justify-content-between align-items-center">
              <div>
                <span className="block text-500 font-medium text-xs mb-1">Authenticity & Security</span>
                <div className="text-900 font-bold text-base text-emerald-700 mt-1">QR Seal Verified</div>
              </div>
              <div className="w-3rem h-3rem border-circle bg-emerald-50 text-emerald-600 flex align-items-center justify-content-center">
                <i className="pi pi-qrcode text-xl"></i>
              </div>
            </div>
          </Card>
        </div>
      </div>

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
          <Column header="Class & Section" body={classSectionTemplate} style={{ minWidth: '140px' }} />
          <Column header="Father's Details" body={parentTemplate} style={{ minWidth: '180px' }} />
          <Column
            header="Gender"
            field="gender"
            body={(row) => <span className="text-sm text-slate-600">{row.gender || '—'}</span>}
            style={{ width: '100px' }}
          />
          <Column
            header="DOB"
            field="dob"
            body={(row) => (
              <span className="text-sm text-slate-600">
                {row.dob ? new Date(row.dob).toLocaleDateString('en-GB') : '—'}
              </span>
            )}
            style={{ width: '120px' }}
          />
          <Column header="Action" body={actionsTemplate} style={{ width: '180px', textAlign: 'center' }} />
        </DataTable>
      </Card>

      {/* Dynamic Certificate Print Modal */}
      {selectedStudent && (
        <BonafideCertificateModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedStudent(null);
          }}
          studentId={selectedStudent.id}
          studentData={selectedStudent}
          certificateType={activeCertType}
        />
      )}
    </div>
  );
};

export default BonafideCertificatesPage;
