import React, { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputSwitch } from 'primereact/inputswitch';
import { Avatar } from 'primereact/avatar';
import { Tag } from 'primereact/tag';
import { studentApi } from '../api';
import apiClient from '../../../api/client';
import { DEFAULT_CERT_TEMPLATES, dateToWords } from './BonafideCertificateModal';

const PURPOSE_OPTIONS = [
  { label: 'Passport Application', value: 'Passport Application' },
  { label: 'Visa Processing / Embassy Verification', value: 'Visa Processing / Embassy Verification' },
  { label: 'Bank Account Opening', value: 'Bank Account Opening' },
  { label: 'Bus / Rail Concession Pass', value: 'Bus / Rail Concession Pass' },
  { label: 'Scholarship Application', value: 'Scholarship Application' },
  { label: 'College / Higher Secondary Admission', value: 'College / Higher Secondary Admission' },
  { label: 'Aadhaar / Identity Proof Verification', value: 'Aadhaar / Identity Proof Verification' },
  { label: 'Sports & Tournament Age Verification', value: 'Sports & Tournament Age Verification' },
  { label: 'Government Welfare Scheme', value: 'Government Welfare Scheme' },
  { label: 'General Official Verification', value: 'General Official Verification' },
];

export const IssueCertificateModal = ({
  open,
  onClose,
  certificateType = 'bonafide',
  classes = [],
  onIssueSuccess,
}) => {
  const typeKey = certificateType || 'bonafide';
  const defaultTemplate = DEFAULT_CERT_TEMPLATES[typeKey] || DEFAULT_CERT_TEMPLATES.bonafide;

  // Search & Filter State
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [studentSearchText, setStudentSearchText] = useState('');
  const [studentsList, setStudentsList] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Certificate Parameters
  const [refNo, setRefNo] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [purpose, setPurpose] = useState(defaultTemplate.defaultPurpose);
  const [customPurpose, setCustomPurpose] = useState('');
  const [printWithLetterhead, setPrintWithLetterhead] = useState(true);

  // Section Options
  const currentClassObj = classes.find((c) => c.id === selectedClassId);
  const sectionOptions = currentClassObj?.sections
    ? currentClassObj.sections.map((s) => ({ label: s.name, value: s.id }))
    : [];

  // Reset & Initialize on Open
  useEffect(() => {
    if (open) {
      const today = new Date();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const formattedDate = `${String(today.getDate()).padStart(2, '0')}-${months[today.getMonth()]}-${today.getFullYear()}`;
      setIssueDate(formattedDate);
      setPurpose(defaultTemplate.defaultPurpose);
      setCustomPurpose('');
      setPrintWithLetterhead(true);
      setSelectedStudent(null);
      setStudentSearchText('');
      setRefNo('');
      loadStudents();
    }
  }, [open, typeKey, defaultTemplate.defaultPurpose]);

  // Load Students based on class / section / search
  useEffect(() => {
    if (open) {
      loadStudents();
    }
  }, [selectedClassId, selectedSectionId, studentSearchText]);

  const loadStudents = async () => {
    try {
      setSearching(true);
      const res = await studentApi.getStudents({
        classId: selectedClassId || undefined,
        sectionId: selectedSectionId || undefined,
        search: studentSearchText.trim() || undefined,
        limit: 25,
      });

      if (res?.data?.data) {
        const items = res.data.data.items || res.data.data || [];
        setStudentsList(items);
      } else {
        setStudentsList([]);
      }
    } catch (err) {
      console.error('Failed to search students for certificate:', err);
      setStudentsList([]);
    } finally {
      setSearching(false);
    }
  };

  const handleStudentSelect = (student) => {
    setSelectedStudent(student);
    if (student) {
      const today = new Date();
      const adm = student.admissionNo || student.id || '001';
      const prefix = defaultTemplate.refPrefix || 'DPS/BC';
      setRefNo(`${prefix}/${today.getFullYear()}/${adm}`);
    }
  };

  const handleGenerate = () => {
    if (!selectedStudent) return;

    const certOptions = {
      refNo: refNo.trim() || `${defaultTemplate.refPrefix}/${new Date().getFullYear()}/${selectedStudent.admissionNo || '001'}`,
      issueDate: issueDate || new Date().toLocaleDateString('en-GB'),
      purpose: customPurpose.trim() || purpose || defaultTemplate.defaultPurpose,
      printWithLetterhead,
    };

    if (onIssueSuccess) {
      onIssueSuccess(selectedStudent, certOptions);
    }
    onClose();
  };

  const sName =
    selectedStudent?.studentName ||
    selectedStudent?.fullName ||
    `${selectedStudent?.firstName || ''} ${selectedStudent?.lastName || ''}`.trim() ||
    'Student';

  const fName =
    selectedStudent?.fatherName ||
    selectedStudent?.guardians?.find((g) => g.relation === 'Father')?.fullName ||
    selectedStudent?.parentName ||
    'Father';

  const mName =
    selectedStudent?.motherName ||
    selectedStudent?.guardians?.find((g) => g.relation === 'Mother')?.fullName ||
    'Mother';

  const cls = selectedStudent?.className || selectedStudent?.currentEnrollment?.className || 'N/A';
  const sec = selectedStudent?.sectionName || selectedStudent?.currentEnrollment?.sectionName || 'A';
  const roll = selectedStudent?.rollNo || selectedStudent?.currentEnrollment?.rollNo || 'N/A';
  const admNo = selectedStudent?.admissionNo || 'N/A';
  const dobFormatted = selectedStudent?.dob ? new Date(selectedStudent.dob).toLocaleDateString('en-GB') : 'N/A';
  const dobInWords = selectedStudent?.dob ? dateToWords(selectedStudent.dob) : 'N/A';

  return (
    <Dialog
      visible={open}
      onHide={onClose}
      header={
        <div className="flex align-items-center justify-content-between w-full pr-3">
          <div className="flex align-items-center gap-2">
            <div
              className="w-2.5rem h-2.5rem border-round flex align-items-center justify-content-center"
              style={{ backgroundColor: `${defaultTemplate.primaryColor}15`, color: defaultTemplate.primaryColor }}
            >
              <i className="pi pi-verified text-xl"></i>
            </div>
            <div>
              <div className="font-bold text-lg text-slate-800">
                Issue {defaultTemplate.shortTitle || defaultTemplate.certificateTitle}
              </div>
              <div className="text-xs text-slate-500">
                Statutory Code: <strong style={{ color: defaultTemplate.primaryColor }}>{defaultTemplate.refPrefix}</strong> • Institutional School Register
              </div>
            </div>
          </div>
          <Tag value={defaultTemplate.refPrefix} severity="info" className="text-xs px-2 py-1 font-bold" />
        </div>
      }
      style={{ width: '840px', maxWidth: '96vw' }}
      modal
      className="p-fluid"
      footer={
        <div className="flex justify-content-between align-items-center">
          <Button label="Cancel" icon="pi pi-times" severity="secondary" outlined onClick={onClose} />
          <Button
            label="Generate & Preview Certificate"
            icon="pi pi-print"
            severity="primary"
            disabled={!selectedStudent}
            onClick={handleGenerate}
            className="shadow-1 font-bold"
          />
        </div>
      }
    >
      <div className="flex flex-column gap-3 pt-2">
        {/* Step 1: Student Lookup & Selection */}
        <div className="p-3 surface-50 border-round border-1 surface-border">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2 flex align-items-center gap-1">
            <i className="pi pi-user text-blue-600"></i> Step 1: Select Student for Certificate
          </div>

          <div className="grid">
            <div className="col-12 sm:col-4">
              <label className="text-xs font-semibold text-slate-600 block mb-1">Class Filter:</label>
              <Dropdown
                value={selectedClassId}
                options={classes.map((c) => ({ label: c.name, value: c.id }))}
                onChange={(e) => {
                  setSelectedClassId(e.value);
                  setSelectedSectionId(null);
                }}
                placeholder="All Classes"
                showClear
                className="p-inputtext-sm w-full"
              />
            </div>

            <div className="col-12 sm:col-4">
              <label className="text-xs font-semibold text-slate-600 block mb-1">Section Filter:</label>
              <Dropdown
                value={selectedSectionId}
                options={sectionOptions}
                onChange={(e) => setSelectedSectionId(e.value)}
                placeholder="All Sections"
                disabled={!selectedClassId || sectionOptions.length === 0}
                showClear
                className="p-inputtext-sm w-full"
              />
            </div>

            <div className="col-12 sm:col-4">
              <label className="text-xs font-semibold text-slate-600 block mb-1">Search Student:</label>
              <span className="p-input-icon-left w-full">
                <i className="pi pi-search" />
                <InputText
                  value={studentSearchText}
                  onChange={(e) => setStudentSearchText(e.target.value)}
                  placeholder="Name, Adm No, Roll..."
                  className="p-inputtext-sm w-full"
                />
              </span>
            </div>
          </div>

          {/* Quick Match Student Picker Dropdown */}
          <div className="mt-2">
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Select Student ({studentsList.length} matches):
            </label>
            <Dropdown
              value={selectedStudent?.id}
              options={studentsList.map((s) => ({
                label: `${s.studentName || s.fullName || 'Student'} (Adm: ${s.admissionNo || 'N/A'}${s.rollNo ? `, Roll: ${s.rollNo}` : ''} - Class ${s.className || s.currentEnrollment?.className || ''})`,
                value: s.id,
              }))}
              onChange={(e) => {
                const found = studentsList.find((s) => s.id === e.value);
                if (found) handleStudentSelect(found);
              }}
              placeholder={searching ? 'Searching students...' : 'Choose a student from list...'}
              filter
              showClear
              className="p-inputtext-sm w-full"
            />
          </div>
        </div>

        {/* Selected Student Profile Badge */}
        {selectedStudent ? (
          <div
            className="p-3 border-round border-1"
            style={{
              backgroundColor: `${defaultTemplate.secondaryColor}`,
              borderColor: `${defaultTemplate.primaryColor}40`,
            }}
          >
            <div className="flex justify-content-between align-items-center mb-2">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: defaultTemplate.primaryColor }}>
                <i className="pi pi-check-circle mr-1"></i> Selected Student Identity Profile
              </span>
              <Button
                label="Change Student"
                icon="pi pi-refresh"
                size="small"
                text
                severity="secondary"
                onClick={() => setSelectedStudent(null)}
                className="p-0 text-xs"
              />
            </div>

            <div className="flex flex-column sm:flex-row align-items-start sm:align-items-center gap-3">
              {selectedStudent.photoUrl || selectedStudent.photo ? (
                <img
                  src={selectedStudent.photoUrl || selectedStudent.photo}
                  alt={sName}
                  className="w-4rem h-4rem border-circle object-cover shadow-1 flex-shrink-0"
                  onError={(e) => {
                    e.target.src = '/dvslogo1.jpeg';
                  }}
                />
              ) : (
                <Avatar
                  label={sName.charAt(0).toUpperCase()}
                  shape="circle"
                  size="xlarge"
                  className="bg-blue-100 text-blue-800 font-bold flex-shrink-0"
                />
              )}

              <div className="flex-1">
                <div className="flex align-items-center gap-2 flex-wrap">
                  <h3 className="m-0 text-slate-800 text-base font-bold">{sName}</h3>
                  <Tag value={`Adm: ${admNo}`} severity="info" className="text-xs" />
                  {roll !== 'N/A' && <Tag value={`Roll: ${roll}`} severity="secondary" className="text-xs" />}
                  <Tag value={`Class: ${cls} - ${sec}`} severity="success" className="text-xs" />
                </div>

                <div className="grid mt-1 text-xs text-slate-600">
                  <div className="col-12 sm:col-6">
                    <span>Father: </span>
                    <strong className="text-slate-800">{fName}</strong>
                  </div>
                  <div className="col-12 sm:col-6">
                    <span>Mother: </span>
                    <strong className="text-slate-800">{mName}</strong>
                  </div>
                  <div className="col-12 sm:col-6">
                    <span>Date of Birth: </span>
                    <strong className="text-slate-800">{dobFormatted}</strong>
                  </div>
                  <div className="col-12 sm:col-6">
                    <span>DOB in Words: </span>
                    <strong className="text-slate-800">{dobInWords}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center p-3 surface-100 border-round border-1 surface-border text-xs text-slate-500">
            <i className="pi pi-info-circle mr-1"></i> Please search or select a student from above to populate certificate particulars.
          </div>
        )}

        {/* Step 2: Certificate Parameters & Dispatch Ref */}
        <div className="p-3 surface-50 border-round border-1 surface-border">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2 flex align-items-center gap-1">
            <i className="pi pi-file-edit text-blue-600"></i> Step 2: Certificate Particulars & Dispatch Ref
          </div>

          <div className="grid">
            <div className="col-12 sm:col-4">
              <label className="text-xs font-semibold text-slate-700 block mb-1">Dispatch Ref No:</label>
              <InputText
                value={refNo}
                onChange={(e) => setRefNo(e.target.value)}
                placeholder="e.g. DPS/DOB/2026/0412"
                className="p-inputtext-sm font-semibold w-full"
              />
            </div>

            <div className="col-12 sm:col-4">
              <label className="text-xs font-semibold text-slate-700 block mb-1">Date of Issue:</label>
              <InputText
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                placeholder="dd-MMM-yyyy"
                className="p-inputtext-sm w-full"
              />
            </div>

            <div className="col-12 sm:col-4">
              <label className="text-xs font-semibold text-slate-700 block mb-1">Letterhead Mode:</label>
              <div className="flex align-items-center gap-2 pt-1">
                <InputSwitch
                  checked={printWithLetterhead}
                  onChange={(e) => setPrintWithLetterhead(e.value)}
                />
                <span className="text-xs font-medium text-slate-600">
                  {printWithLetterhead ? 'Letterhead Active' : 'Plain Paper'}
                </span>
              </div>
            </div>

            <div className="col-12 sm:col-6">
              <label className="text-xs font-semibold text-slate-700 block mb-1">Certificate Purpose / Reason:</label>
              <Dropdown
                value={purpose}
                options={PURPOSE_OPTIONS}
                onChange={(e) => {
                  setPurpose(e.value);
                  setCustomPurpose('');
                }}
                placeholder="Select Purpose"
                className="p-inputtext-sm w-full"
              />
            </div>

            <div className="col-12 sm:col-6">
              <label className="text-xs font-semibold text-slate-700 block mb-1">Custom Purpose (Optional):</label>
              <InputText
                value={customPurpose}
                onChange={(e) => setCustomPurpose(e.target.value)}
                placeholder="e.g. Higher Studies / Passport"
                className="p-inputtext-sm w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default IssueCertificateModal;
