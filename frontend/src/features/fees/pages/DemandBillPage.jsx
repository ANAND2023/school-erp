import React, { useState, useEffect, useRef } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { Calendar } from 'primereact/calendar';
import { Dialog } from 'primereact/dialog';
import { SelectButton } from 'primereact/selectbutton';
import { Avatar } from 'primereact/avatar';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';

import { feesApi } from '../api';
import apiClient from '../../../api/client';
import { useAcademicYear } from '../../../hooks/useAcademicYear';
import { useAuthStore } from '../../../store/authStore';
import { DemandBillPrintModal } from '../components/DemandBillPrintModal';
import { AppInput, AppSelect, AppDatePicker } from '../../../components/common';
import { whatsappService } from '../../communication/services/whatsappService';

const ACADEMIC_MONTHS = [
  { index: 1, name: 'April', short: 'Apr' },
  { index: 2, name: 'May', short: 'May' },
  { index: 3, name: 'June', short: 'Jun' },
  { index: 4, name: 'July', short: 'Jul' },
  { index: 5, name: 'August', short: 'Aug' },
  { index: 6, name: 'September', short: 'Sep' },
  { index: 7, name: 'October', short: 'Oct' },
  { index: 8, name: 'November', short: 'Nov' },
  { index: 9, name: 'December', short: 'Dec' },
  { index: 10, name: 'January', short: 'Jan' },
  { index: 11, name: 'February', short: 'Feb' },
  { index: 12, name: 'March', short: 'Mar' },
];

export const DemandBillPage = () => {
  const toastRef = useRef(null);
  const { activeAcademicYearId, activeAcademicYearName } = useAcademicYear();
  const { user } = useAuthStore();

  // Filter states
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(1); // Default to April (1)
  const [billingMode, setBillingMode] = useState('single_month'); // 'single_month', 'upto_month', 'all'
  const [selectedInstallment, setSelectedInstallment] = useState(null);
  const [statusFilter, setStatusFilter] = useState('unpaid');
  const [customDueDate, setCustomDueDate] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Data states
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [installments, setInstallments] = useState([]);
  const [students, setStudents] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState([]);

  // Modal states
  const [printModalVisible, setPrintModalVisible] = useState(false);
  const [studentsToPrint, setStudentsToPrint] = useState([]);
  const [breakdownStudent, setBreakdownStudent] = useState(null);
  const [schoolInfo, setSchoolInfo] = useState({
    schoolName: user?.schoolName || 'Digital Vidya Sarthi Public School',
    address: user?.schoolAddress || 'Main Campus Road, City Center',
    phone: user?.schoolPhone || '',
    email: user?.schoolEmail || '',
    affiliationNumber: '',
    logoUrl: user?.schoolLogoUrl || '',
  });

  // Fetch School & Branch Details
  useEffect(() => {
    apiClient.get('/branches/current')
      .then((res) => {
        if (res.data?.success && res.data?.data) {
          const b = res.data.data;
          const fullAddr = [b.address, b.city, b.state, b.pincode].filter(Boolean).join(', ');
          setSchoolInfo({
            schoolName: b.schoolName || b.name || user?.schoolName || 'Digital Vidya Sarthi Public School',
            address: fullAddr || user?.schoolAddress || '',
            phone: b.phone || user?.schoolPhone || '',
            email: b.email || user?.schoolEmail || '',
            affiliationNumber: b.affiliationNumber || '',
            logoUrl: b.logoUrl || user?.schoolLogoUrl || '',
          });
        }
      })
      .catch(() => {});
  }, [user]);

  // Load Classes & Installments
  useEffect(() => {
    apiClient.get('/classes')
      .then((res) => {
        if (res.data?.success) {
          setClasses(res.data.data || []);
        }
      })
      .catch(() => {});

    feesApi.getInstallments()
      .then((res) => {
        if (res.data?.success) {
          setInstallments(res.data.data || []);
        }
      })
      .catch(() => {});
  }, []);

  // Update sections when class changes
  useEffect(() => {
    if (!selectedClass) {
      setSections([]);
      setSelectedSection(null);
      return;
    }
    apiClient.get(`/classes/${selectedClass}/sections`)
      .then((res) => {
        if (res.data?.success) {
          setSections(res.data.data || []);
        }
      })
      .catch(() => setSections([]));
    setSelectedSection(null);
  }, [selectedClass]);

  // Fetch Demand Bills Data
  const fetchDemandBills = () => {
    setLoading(true);

    const selectedMonthObj = selectedMonthIndex
      ? ACADEMIC_MONTHS.find((m) => m.index === selectedMonthIndex)
      : null;

    const effectiveMode = selectedMonthIndex ? billingMode : 'all';

    const params = {
      academicYearId: activeAcademicYearId,
      classId: selectedClass || undefined,
      sectionId: selectedSection || undefined,
      installmentId: selectedInstallment || undefined,
      monthIndex: selectedMonthIndex || undefined,
      monthName: selectedMonthObj?.name || undefined,
      mode: effectiveMode,
      statusFilter: statusFilter || undefined,
      searchTerm: searchTerm || undefined,
      customDueDate: customDueDate ? dayjs(customDueDate).format('YYYY-MM-DD') : undefined,
    };

    feesApi.getDemandBills(params)
      .then((res) => {
        if (res.data?.success && res.data?.data) {
          const data = res.data.data;
          setStudents(data.students || []);
          setSummary({
            totalStudents: data.totalStudents || 0,
            totalGrossAmount: data.totalGrossAmount || 0,
            totalConcessionAmount: data.totalConcessionAmount || 0,
            totalPaidAmount: data.totalPaidAmount || 0,
            totalBalanceAmount: data.totalBalanceAmount || 0,
            totalFineAmount: data.totalFineAmount || 0,
            totalNetDemandAmount: data.totalNetDemandAmount || 0,
            totalDefaulters: data.totalDefaulters || 0,
          });
          setSelectedStudents([]);
        } else {
          setStudents([]);
        }
      })
      .catch((err) => {
        toastRef.current?.show({
          severity: 'error',
          summary: 'Error',
          detail: err.response?.data?.message || 'Failed to load Demand Bills.',
        });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDemandBills();
  }, [activeAcademicYearId, selectedClass, selectedSection, selectedInstallment, selectedMonthIndex, billingMode, statusFilter]);

  const [printFormat, setPrintFormat] = useState('8-per-page');

  // Handle Single Student Print
  const handlePrintSingle = (student) => {
    setStudentsToPrint([student]);
    setPrintFormat('2-copy');
    setPrintModalVisible(true);
  };

  // Handle Bulk Print for Selected
  const handlePrintBulk = () => {
    if (selectedStudents.length === 0) {
      toastRef.current?.show({
        severity: 'warn',
        summary: 'No Students Selected',
        detail: 'Please select one or more students to print demand bills.',
      });
      return;
    }
    setStudentsToPrint(selectedStudents);
    setPrintFormat('8-per-page');
    setPrintModalVisible(true);
  };

  // Handle Print 8-on-A4 directly
  const handlePrint8PerA4 = () => {
    const toPrint = selectedStudents.length > 0 ? selectedStudents : students;
    if (toPrint.length === 0) {
      toastRef.current?.show({
        severity: 'warn',
        summary: 'No Data',
        detail: 'No students available to print demand bills.',
      });
      return;
    }
    setStudentsToPrint(toPrint);
    setPrintFormat('8-per-page');
    setPrintModalVisible(true);
  };

  // Handle Print All in Current Query
  const handlePrintAll = () => {
    if (students.length === 0) {
      toastRef.current?.show({
        severity: 'warn',
        summary: 'No Data',
        detail: 'No demand bills available to print.',
      });
      return;
    }
    setStudentsToPrint(students);
    setPrintFormat('8-per-page');
    setPrintModalVisible(true);
  };

  // Handle WhatsApp Reminder
  const handleSendWhatsApp = async (student) => {
    if (!student?.guardianMobile) {
      toastRef.current?.show({
        severity: 'warn',
        summary: 'Missing Mobile',
        detail: 'Guardian mobile number not available for this student.',
      });
      return;
    }

    const config = await whatsappService.getConfig();
    if (!whatsappService.isModuleEnabled(config, 'feeDemand')) {
      toastRef.current?.show({
        severity: 'warn',
        summary: 'Module Disabled',
        detail: 'Fee Demand WhatsApp module is currently disabled by Super Admin.',
      });
      return;
    }

    const dueDate = student.dueDate ? dayjs(student.dueDate).format('DD-MM-YYYY') : dayjs().add(10, 'day').format('DD-MM-YYYY');
    const netAmount = Number(student.netDemandAmount || student.balanceAmount || 0).toLocaleString('en-IN');
    const period = (student.billingPeriod || student.monthName || 'Current Due').replace(/^month of\s+/i, '');
    const template =
      config?.feeDemand?.template ||
      'Dear Parent, this is a gentle reminder regarding pending school fees of Rs. {PendingAmount} for {StudentName} ({Month}) at {SchoolName}. Due Date: {DueDate}. Please clear the dues at your earliest convenience.';

    const message = whatsappService.interpolateTemplate(template, {
      StudentName: student.studentName,
      PendingAmount: netAmount,
      Month: period,
      DueDate: dueDate,
      SchoolName: schoolInfo?.schoolName || user?.schoolName || 'Our School',
    });

    whatsappService.sendDirectMessage(student.guardianMobile, message);
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (students.length === 0) return;

    const dataToExport = students.map((s, idx) => ({
      'S.No': idx + 1,
      'Bill No': s.demandBillNo,
      'Billing Period': s.billingPeriod || s.monthName || '',
      'Admission No': s.admissionNo,
      'Roll No': s.rollNo,
      'Student Name': s.studentName,
      'Father Name': s.fatherName,
      'Guardian Mobile': s.guardianMobile,
      'Class': s.className,
      'Section': s.sectionName,
      'Gross Fee (INR)': s.grossAmount,
      'Concession (INR)': s.concessionAmount,
      'Paid Fee (INR)': s.paidAmount,
      'Previous Arrears (INR)': s.previousArrears,
      'Late Fine (INR)': s.fineAmount,
      'Net Demand Due (INR)': s.netDemandAmount,
      'Due Date': dayjs(s.dueDate).format('DD-MM-YYYY'),
      'Status': s.status,
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Demand_Bills');
    XLSX.writeFile(wb, `Fee_Demand_Bills_${dayjs().format('YYYYMMDD_HHmm')}.xlsx`);

    toastRef.current?.show({
      severity: 'success',
      summary: 'Export Complete',
      detail: `Exported ${students.length} Demand Bills to Excel.`,
    });
  };

  // Clean, Modern Status Chip Renderer
  const statusBodyTemplate = (rowData) => {
    const status = rowData.status || 'Unpaid';
    if (status === 'Paid') {
      return (
        <span
          className="inline-flex align-items-center gap-1.5 px-2.5 py-1 text-xs font-bold"
          style={{
            backgroundColor: '#ecfdf5',
            color: '#065f46',
            border: '1px solid #a7f3d0',
            borderRadius: '9999px',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
          Paid
        </span>
      );
    }
    if (status === 'Partially Paid') {
      return (
        <span
          className="inline-flex align-items-center gap-1.5 px-2.5 py-1 text-xs font-bold"
          style={{
            backgroundColor: '#fffbeb',
            color: '#92400e',
            border: '1px solid #fde68a',
            borderRadius: '9999px',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
          Partial
        </span>
      );
    }
    return (
      <span
        className="inline-flex align-items-center gap-1.5 px-2.5 py-1 text-xs font-bold"
        style={{
          backgroundColor: '#fef2f2',
          color: '#991b1b',
          border: '1px solid #fecaca',
          borderRadius: '9999px',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
        Unpaid
      </span>
    );
  };

  // Clean, Unclipped Billing Period Tag Renderer
  const billingPeriodBodyTemplate = (rowData) => {
    const rawPeriod = rowData.billingPeriod || rowData.monthName || 'Full Session';
    const isSingle = rawPeriod.toLowerCase().includes('month of');
    const cleanLabel = rawPeriod.replace(/^month of\s+/i, '');

    return (
      <div className="flex flex-column justify-content-center" style={{ minWidth: '135px', lineHeight: '1.25' }}>
        <div
          className="inline-flex align-items-center gap-1 px-2 py-0.5 font-bold text-xs"
          style={{
            backgroundColor: '#eff6ff',
            color: '#1e40af',
            border: '1px solid #bfdbfe',
            borderRadius: '4px',
            width: 'fit-content',
            whiteSpace: 'nowrap',
          }}
        >
          <i className="pi pi-calendar text-xs text-blue-600" />
          <span>{cleanLabel}</span>
        </div>
        <span className="text-500 font-medium text-[10px] mt-1 ml-0.5 white-space-nowrap">
          {isSingle ? 'Single Month Bill' : 'Session Period'}
        </span>
      </div>
    );
  };

  // Clean Net Demand Container
  const netDemandBodyTemplate = (rowData) => (
    <div className="flex flex-column align-items-end justify-content-center" style={{ minWidth: '115px', lineHeight: '1.25' }}>
      <span
        className="font-bold text-sm px-2.5 py-1"
        style={{
          backgroundColor: '#fef2f2',
          color: '#b91c1c',
          border: '1px solid #fee2e2',
          borderRadius: '4px',
          whiteSpace: 'nowrap',
        }}
      >
        ₹ {Number(rowData.netDemandAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
      </span>
      {Number(rowData.previousArrears || 0) > 0 && (
        <span className="text-[10px] text-orange-600 font-semibold mt-1 white-space-nowrap">
          Arrears: ₹{Number(rowData.previousArrears).toLocaleString('en-IN')}
        </span>
      )}
    </div>
  );

  // Clean Student Name + Initials Avatar
  const studentNameBodyTemplate = (rowData) => {
    const initials = rowData.studentName
      ? rowData.studentName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
      : 'ST';

    return (
      <div className="flex align-items-center gap-2" style={{ minWidth: '180px' }}>
        <Avatar
          label={initials}
          size="normal"
          shape="circle"
          style={{
            backgroundColor: '#e0e7ff',
            color: '#3730a3',
            fontWeight: 'bold',
            fontSize: '11px',
            width: '32px',
            height: '32px',
            flexShrink: 0,
          }}
        />
        <div className="flex flex-column min-w-0" style={{ lineHeight: '1.25' }}>
          <span className="font-bold text-900 text-sm white-space-nowrap overflow-hidden text-overflow-ellipsis">
            {rowData.studentName}
          </span>
          <span className="text-xs text-600 flex align-items-center gap-1 mt-1 white-space-nowrap">
            <span className="font-semibold text-700">Adm: {rowData.admissionNo}</span>
            {rowData.rollNo && rowData.rollNo !== '-' && <span>• Roll: #{rowData.rollNo}</span>}
          </span>
        </div>
      </div>
    );
  };

  // Bill No Formatted - No ugly slicing
  const billNoBodyTemplate = (rowData) => {
    const billNo = rowData.demandBillNo || `DB-${rowData.admissionNo}`;

    return (
      <span
        title={billNo}
        className="font-bold text-xs text-blue-700 font-monospace cursor-pointer white-space-nowrap select-all"
        style={{
          backgroundColor: '#eff6ff',
          padding: '3px 8px',
          borderRadius: '4px',
          border: '1px solid #bfdbfe',
          display: 'inline-block',
        }}
      >
        {billNo}
      </span>
    );
  };

  const guardianBodyTemplate = (rowData) => (
    <div className="flex flex-column text-xs justify-content-center" style={{ minWidth: '135px', lineHeight: '1.25' }}>
      <span className="font-semibold text-800 white-space-nowrap">{rowData.fatherName || 'Guardian'}</span>
      <span className="text-500 flex align-items-center gap-1 mt-1 white-space-nowrap">
        <i className="pi pi-phone text-xs text-400" />
        <span>{rowData.guardianMobile || '-'}</span>
      </span>
    </div>
  );

  const actionBodyTemplate = (rowData) => (
    <div className="flex align-items-center gap-1 justify-content-center" style={{ minWidth: '115px' }}>
      <Button
        icon="pi pi-print"
        className="p-button-rounded p-button-text p-button-primary p-button-sm"
        tooltip="Print Demand Bill / Challan"
        tooltipOptions={{ position: 'top' }}
        style={{ width: '30px', height: '30px' }}
        onClick={() => handlePrintSingle(rowData)}
      />
      <Button
        icon="pi pi-list"
        className="p-button-rounded p-button-text p-button-secondary p-button-sm"
        tooltip="View Fee Breakdown"
        tooltipOptions={{ position: 'top' }}
        style={{ width: '30px', height: '30px' }}
        onClick={() => setBreakdownStudent(rowData)}
      />
      {rowData.guardianMobile && (
        <Button
          icon="pi pi-whatsapp"
          className="p-button-rounded p-button-text p-button-success p-button-sm"
          tooltip="Send WhatsApp Reminder"
          tooltipOptions={{ position: 'top' }}
          style={{ width: '30px', height: '30px' }}
          onClick={() => handleSendWhatsApp(rowData)}
        />
      )}
    </div>
  );

  const modeOptions = [
    { label: 'Selected Month Only', value: 'single_month' },
    { label: 'Cumulative (Up to Month)', value: 'upto_month' },
  ];

  return (
    <div className="p-3">
      <Toast ref={toastRef} />

      {/* Top Header Bar */}
      <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between mb-3 gap-2">
        <div>
          <div className="flex align-items-center gap-2">
            <h1 className="text-2xl font-bold m-0 text-900">Student Fee Demand Bills</h1>
            <Tag value={activeAcademicYearName || 'Active Session'} severity="info" className="font-semibold" />
          </div>
          <p className="text-xs text-500 m-0 mt-1">
            Generate, bulk print & dispatch month-wise student fee demand bills, notices, and bank challans.
          </p>
        </div>

        <div className="flex align-items-center gap-2 flex-wrap">
          <Button
            label="Export Excel"
            icon="pi pi-file-excel"
            className="p-button-success p-button-outlined p-button-sm font-semibold"
            onClick={handleExportExcel}
            disabled={students.length === 0}
          />
          <Button
            label={`Print 8 Slips / A4 (${selectedStudents.length || students.length})`}
            icon="pi pi-th-large"
            className="p-button-help p-button-sm font-bold shadow-1"
            onClick={handlePrint8PerA4}
            disabled={students.length === 0}
            tooltip="Print 8 compact demand slips on each A4 page (Paper & Cost Saver)"
            tooltipOptions={{ position: 'bottom' }}
          />
          <Button
            label={`Bulk Print (${selectedStudents.length || students.length})`}
            icon="pi pi-print"
            className="p-button-primary p-button-sm font-bold shadow-1"
            onClick={selectedStudents.length > 0 ? handlePrintBulk : handlePrintAll}
            disabled={students.length === 0}
            tooltip="Print standard 2-part / 3-part bank challans"
            tooltipOptions={{ position: 'bottom' }}
          />
        </div>
      </div>

      {/* 🗓️ Clean, High-Contrast 12-Month Selector Ribbon */}
      <div
        className="mb-3 p-2 border-round shadow-1 flex flex-column md:flex-row md:align-items-center justify-content-between gap-2"
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
        }}
      >
        <div className="flex align-items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-bold text-600 mr-1.5 flex align-items-center gap-1 select-none">
            <i className="pi pi-calendar text-primary text-sm" />
            MONTH:
          </span>

          <button
            type="button"
            onClick={() => setSelectedMonthIndex(null)}
            className="cursor-pointer border-none font-semibold text-xs px-2.5 py-1.5 border-round transition-all"
            style={{
              backgroundColor: selectedMonthIndex === null ? 'var(--primary-color, #1e3a8a)' : '#f1f5f9',
              color: selectedMonthIndex === null ? '#ffffff' : '#475569',
              boxShadow: selectedMonthIndex === null ? '0 2px 4px rgba(30, 58, 138, 0.25)' : 'none',
            }}
          >
            All Session
          </button>

          {ACADEMIC_MONTHS.map((m) => {
            const isSelected = selectedMonthIndex === m.index;
            return (
              <button
                key={m.index}
                type="button"
                onClick={() => setSelectedMonthIndex(m.index)}
                title={`Bill for Month of ${m.name}`}
                className="cursor-pointer border-none font-semibold text-xs px-2.5 py-1.5 border-round transition-all"
                style={{
                  backgroundColor: isSelected ? 'var(--primary-color, #1e3a8a)' : '#f1f5f9',
                  color: isSelected ? '#ffffff' : '#334155',
                  boxShadow: isSelected ? '0 2px 4px rgba(30, 58, 138, 0.25)' : 'none',
                }}
              >
                {m.short}
              </button>
            );
          })}
        </div>

        {/* Mode Selector for Selected Month */}
        {selectedMonthIndex !== null && (
          <div className="flex align-items-center gap-2 flex-shrink-0">
            <span className="text-xs text-500 font-semibold select-none">Mode:</span>
            <SelectButton
              value={billingMode}
              options={modeOptions}
              onChange={(e) => e.value && setBillingMode(e.value)}
              className="p-buttonset-xs"
              style={{ fontSize: '0.75rem' }}
            />
          </div>
        )}
      </div>

      {/* Top Statistics KPI Cards */}
      <div className="grid mb-3">
        <div className="col-12 sm:col-6 lg:col-3">
          <div className="surface-card shadow-1 border-round p-3 border-left-3 border-blue-600 flex justify-content-between align-items-center h-full">
            <div>
              <span className="block text-500 font-bold text-xs uppercase letter-spacing-1 mb-1">TOTAL DEMAND VALUE</span>
              <div className="text-900 font-bold text-xl text-blue-700">
                ₹ {Number(summary?.totalNetDemandAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-xs text-500 font-medium">Gross: ₹{Number(summary?.totalGrossAmount || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex align-items-center justify-content-center bg-blue-50 border-circle flex-shrink-0" style={{ width: '40px', height: '40px' }}>
              <i className="pi pi-wallet text-blue-600 text-lg" />
            </div>
          </div>
        </div>

        <div className="col-12 sm:col-6 lg:col-3">
          <div className="surface-card shadow-1 border-round p-3 border-left-3 border-orange-500 flex justify-content-between align-items-center h-full">
            <div>
              <span className="block text-500 font-bold text-xs uppercase letter-spacing-1 mb-1">PENDING DEFAULTERS</span>
              <div className="text-900 font-bold text-xl text-orange-600">
                {summary?.totalDefaulters || 0} Students
              </div>
              <span className="text-xs text-500 font-medium">Total Enrolled: {summary?.totalStudents || 0}</span>
            </div>
            <div className="flex align-items-center justify-content-center bg-orange-50 border-circle flex-shrink-0" style={{ width: '40px', height: '40px' }}>
              <i className="pi pi-exclamation-triangle text-orange-600 text-lg" />
            </div>
          </div>
        </div>

        <div className="col-12 sm:col-6 lg:col-3">
          <div className="surface-card shadow-1 border-round p-3 border-left-3 border-green-500 flex justify-content-between align-items-center h-full">
            <div>
              <span className="block text-500 font-bold text-xs uppercase letter-spacing-1 mb-1">CONCESSIONS & DISC</span>
              <div className="text-900 font-bold text-xl text-green-600">
                ₹ {Number(summary?.totalConcessionAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-xs text-500 font-medium">Already Paid: ₹{Number(summary?.totalPaidAmount || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex align-items-center justify-content-center bg-green-50 border-circle flex-shrink-0" style={{ width: '40px', height: '40px' }}>
              <i className="pi pi-tag text-green-600 text-lg" />
            </div>
          </div>
        </div>

        <div className="col-12 sm:col-6 lg:col-3">
          <div className="surface-card shadow-1 border-round p-3 border-left-3 border-indigo-600 flex justify-content-between align-items-center h-full">
            <div>
              <span className="block text-500 font-bold text-xs uppercase letter-spacing-1 mb-1">SELECTED DEMAND</span>
              <div className="text-900 font-bold text-xl text-indigo-700">
                ₹ {selectedStudents.reduce((acc, s) => acc + Number(s.netDemandAmount || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-xs text-indigo-600 font-semibold">{selectedStudents.length} Students Selected</span>
            </div>
            <div className="flex align-items-center justify-content-center bg-indigo-50 border-circle flex-shrink-0" style={{ width: '40px', height: '40px' }}>
              <i className="pi pi-check-square text-indigo-600 text-lg" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar Card - Admission Notched Style */}
      <div className="surface-card border-round shadow-1 px-3 pt-3 pb-1 mb-3">
        <div className="grid align-items-center">
          <div className="col-12 sm:col-6 md:col-3">
            <AppSelect
              label="Class"
              value={selectedClass}
              options={[{ label: 'All Classes', value: null }, ...classes.map(c => ({ label: c.name, value: c.id }))]}
              optionLabel="label"
              optionValue="value"
              onChange={(e) => setSelectedClass(e.value ?? null)}
              placeholder="Select Class"
              showClear
            />
          </div>

          <div className="col-12 sm:col-6 md:col-2">
            <AppSelect
              label="Section"
              value={selectedSection}
              options={[{ label: 'All Sections', value: null }, ...sections.map(s => ({ label: s.name, value: s.id }))]}
              optionLabel="label"
              optionValue="value"
              onChange={(e) => setSelectedSection(e.value ?? null)}
              placeholder="All Sections"
              disabled={!selectedClass}
              showClear
            />
          </div>

          <div className="col-12 sm:col-6 md:col-2">
            <AppSelect
              label="Due Status"
              value={statusFilter}
              options={[
                { label: 'Unpaid / Due Only', value: 'unpaid' },
                { label: 'All Students', value: 'all' },
                { label: 'Partially Paid', value: 'partial' },
              ]}
              optionLabel="label"
              optionValue="value"
              onChange={(e) => setStatusFilter(e.value ?? 'unpaid')}
              filter={false}
              showClear={false}
            />
          </div>

          <div className="col-12 sm:col-6 md:col-2">
            <AppDatePicker
              label="Custom Due Date"
              value={customDueDate}
              onChange={(e) => setCustomDueDate(e.value ?? null)}
              placeholder="Bill Due Date"
              dateFormat="dd-mm-yy"
            />
          </div>

          <div className="col-12 sm:col-6 md:col-3">
            <div className="flex align-items-center gap-1">
              <div className="flex-grow-1">
                <AppInput
                  label="Search Student / Mobile"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchDemandBills()}
                  placeholder="Name, Adm, Roll, Phone..."
                  addon={<i className="pi pi-search" />}
                  onAddonClick={fetchDemandBills}
                  addonTooltip="Search Demand Bills"
                />
              </div>
              {(searchTerm || selectedClass || statusFilter !== 'unpaid' || customDueDate) && (
                <Button
                  icon="pi pi-filter-slash"
                  className="p-button-outlined p-button-secondary p-button-sm mb-2"
                  style={{ height: '30px', width: '30px', flexShrink: 0 }}
                  onClick={() => {
                    setSelectedClass(null);
                    setSelectedSection(null);
                    setStatusFilter('unpaid');
                    setCustomDueDate(null);
                    setSearchTerm('');
                  }}
                  tooltip="Reset Filters"
                  tooltipOptions={{ position: 'top' }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Demand Bills Data Table */}
      <div className="surface-card border-round shadow-1 p-2">
        <DataTable
          value={students}
          selection={selectedStudents}
          onSelectionChange={(e) => setSelectedStudents(e.value)}
          dataKey="studentId"
          loading={loading}
          paginator
          rows={25}
          rowsPerPageOptions={[10, 25, 50, 100]}
          paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
          currentPageReportTemplate="Showing {first} to {last} of {totalRecords} students"
          emptyMessage="No students found matching the selected criteria."
          className="app-demand-bills-table p-datatable-gridlines"
          scrollable
          stripedRows
        >
          <Column selectionMode="multiple" headerStyle={{ width: '3.2rem', minWidth: '3.2rem' }} />
          <Column field="demandBillNo" header="Bill No" body={billNoBodyTemplate} sortable style={{ minWidth: '150px' }} />
          <Column header="Student Particulars" body={studentNameBodyTemplate} sortable field="studentName" style={{ minWidth: '200px' }} />
          <Column header="Class - Sec" body={(r) => `${r.className}${r.sectionName ? ' - ' + r.sectionName : ''}`} sortable field="className" style={{ minWidth: '100px' }} />
          <Column header="Parent & Contact" body={guardianBodyTemplate} style={{ minWidth: '140px' }} />
          <Column header="Billing Period" body={billingPeriodBodyTemplate} style={{ minWidth: '145px' }} />
          <Column field="grossAmount" header="Gross (₹)" body={(r) => Number(r.grossAmount || 0).toLocaleString('en-IN')} className="text-right text-xs" style={{ minWidth: '85px' }} />
          <Column field="concessionAmount" header="Disc (₹)" body={(r) => Number(r.concessionAmount || 0) > 0 ? `-${Number(r.concessionAmount).toFixed(0)}` : '0'} className="text-right text-xs text-green-600" style={{ minWidth: '80px' }} />
          <Column field="currentPeriodDue" header="Month Due (₹)" body={(r) => Number(r.currentPeriodDue || r.balanceAmount || 0).toLocaleString('en-IN')} className="text-right text-xs font-semibold text-blue-700" style={{ minWidth: '105px' }} />
          <Column field="previousArrears" header="Arrears (₹)" body={(r) => Number(r.previousArrears || 0) > 0 ? Number(r.previousArrears).toLocaleString('en-IN') : '-'} className="text-right text-xs text-orange-600" style={{ minWidth: '90px' }} />
          <Column field="fineAmount" header="Fine (₹)" body={(r) => Number(r.fineAmount || 0) > 0 ? Number(r.fineAmount).toFixed(0) : '-'} className="text-right text-xs text-red-500" style={{ minWidth: '80px' }} />
          <Column field="netDemandAmount" header="Net Demand (₹)" body={netDemandBodyTemplate} sortable className="text-right" style={{ minWidth: '130px' }} />
          <Column field="status" header="Status" body={statusBodyTemplate} sortable style={{ minWidth: '110px', textAlign: 'center' }} />
          <Column header="Actions" body={actionBodyTemplate} frozen alignFrozen="right" style={{ width: '120px', minWidth: '120px', textAlign: 'center' }} headerStyle={{ width: '120px', minWidth: '120px', textAlign: 'center' }} />
        </DataTable>
      </div>

      {/* Print Modal for Single or Bulk Bills */}
      <DemandBillPrintModal
        visible={printModalVisible}
        onHide={() => setPrintModalVisible(false)}
        students={studentsToPrint}
        schoolInfo={schoolInfo}
        initialFormat={printFormat}
      />

      {/* Student Dues Breakdown Dialog */}
      <Dialog
        visible={!!breakdownStudent}
        onHide={() => setBreakdownStudent(null)}
        header={`Fee Breakdown: ${breakdownStudent?.studentName} (${breakdownStudent?.admissionNo})`}
        style={{ width: '650px' }}
        modal
      >
        {breakdownStudent && (
          <div>
            <div className="flex justify-content-between p-2.5 bg-blue-50 border-round mb-3 text-xs border-1 border-blue-200">
              <span><strong>Class:</strong> {breakdownStudent.className} {breakdownStudent.sectionName}</span>
              <span><strong>Period:</strong> {breakdownStudent.billingPeriod || breakdownStudent.monthName}</span>
              <span><strong>Net Demand Due:</strong> <strong className="text-red-600 text-sm">₹{Number(breakdownStudent.netDemandAmount).toLocaleString('en-IN')}</strong></span>
            </div>

            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-primary text-white">
                  <th className="p-2 text-left">Fee Head</th>
                  <th className="p-2 text-left">Installment</th>
                  <th className="p-2 text-right">Gross (₹)</th>
                  <th className="p-2 text-right">Concession (₹)</th>
                  <th className="p-2 text-right">Paid (₹)</th>
                  <th className="p-2 text-right">Due (₹)</th>
                </tr>
              </thead>
              <tbody>
                {breakdownStudent.items?.map((item, i) => (
                  <tr key={i} className="border-bottom-1 surface-border">
                    <td className="p-2 font-semibold">{item.feeHeadName}</td>
                    <td className="p-2 text-600">{item.installmentName}</td>
                    <td className="p-2 text-right">{Number(item.originalAmount).toFixed(2)}</td>
                    <td className="p-2 text-right text-green-600">{Number(item.concessionAmount).toFixed(2)}</td>
                    <td className="p-2 text-right text-blue-600">{Number(item.paidAmount).toFixed(2)}</td>
                    <td className="p-2 text-right font-bold text-red-600">{Number(item.balanceAmount).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {Number(breakdownStudent.previousArrears || 0) > 0 && (
              <div className="flex justify-content-between p-2 bg-orange-50 border-round mt-2 text-xs font-semibold text-orange-800 border-1 border-orange-200">
                <span>Previous Unpaid Arrears:</span>
                <span>₹ {Number(breakdownStudent.previousArrears).toLocaleString('en-IN')}</span>
              </div>
            )}

            <div className="flex justify-content-end gap-2 mt-3">
              <Button
                label="Print Demand Slip"
                icon="pi pi-print"
                className="p-button-primary p-button-sm font-semibold"
                onClick={() => {
                  handlePrintSingle(breakdownStudent);
                  setBreakdownStudent(null);
                }}
              />
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};

export default DemandBillPage;
