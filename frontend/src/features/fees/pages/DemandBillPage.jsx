import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { ProgressSpinner } from 'primereact/progressspinner';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';

import { feesApi } from '../api';
import apiClient from '../../../api/client';
import { useAcademicYear } from '../../../hooks/useAcademicYear';
import { useAuthStore } from '../../../store/authStore';
import { DemandBillPrintModal } from '../components/DemandBillPrintModal';

export const DemandBillPage = () => {
  const toastRef = useRef(null);
  const { activeAcademicYearId, activeAcademicYearName } = useAcademicYear();
  const { user } = useAuthStore();

  // Filter states
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
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
    const params = {
      academicYearId: activeAcademicYearId,
      classId: selectedClass || undefined,
      sectionId: selectedSection || undefined,
      installmentId: selectedInstallment || undefined,
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
  }, [activeAcademicYearId, selectedClass, selectedSection, selectedInstallment, statusFilter]);

  // Handle Single Student Print
  const handlePrintSingle = (student) => {
    setStudentsToPrint([student]);
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
    setPrintModalVisible(true);
  };

  // Handle WhatsApp Reminder
  const handleSendWhatsApp = (student) => {
    if (!student?.guardianMobile) {
      toastRef.current?.show({
        severity: 'warn',
        summary: 'Missing Mobile',
        detail: 'Guardian mobile number not available for this student.',
      });
      return;
    }
    const cleanMobile = student.guardianMobile.replace(/[^0-9]/g, '');
    const mobileWithCountry = cleanMobile.length === 10 ? `91${cleanMobile}` : cleanMobile;
    const dueDate = student.dueDate ? dayjs(student.dueDate).format('DD-MM-YYYY') : dayjs().add(10, 'day').format('DD-MM-YYYY');
    const netAmount = Number(student.netDemandAmount || student.balanceAmount || 0).toLocaleString('en-IN');
    
    const message = `*FEE DEMAND NOTICE - ${schoolInfo?.schoolName || 'SCHOOL'}*\n\n` +
      `Dear Parent,\n` +
      `This is a gentle reminder regarding the fee demand bill for your ward *${student.studentName}* (Class: *${student.className}${student.sectionName ? ' - ' + student.sectionName : ''}*, Adm No: *${student.admissionNo}*).\n\n` +
      `• *Total Due Demand:* ₹${netAmount}\n` +
      `• *Due Date:* ${dueDate}\n` +
      `• *Bill No:* ${student.demandBillNo || 'DB-' + student.admissionNo}\n\n` +
      `Please deposit the fees on or before the due date to avoid late charges. Ignore if already paid.\n\n` +
      `Thank you,\n*${schoolInfo?.schoolName || 'Accounts Office'}*`;

    const url = `https://wa.me/${mobileWithCountry}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (students.length === 0) return;

    const dataToExport = students.map((s, idx) => ({
      'S.No': idx + 1,
      'Bill No': s.demandBillNo,
      'Admission No': s.admissionNo,
      'Roll No': s.rollNo,
      'Student Name': s.studentName,
      'Father Name': s.fatherName,
      'Guardian Mobile': s.guardianMobile,
      'Class': s.className,
      'Section': s.sectionName,
      'Fee Periods': s.installmentNames?.join(', ') || '',
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

  // Status Chip Renderer
  const statusBodyTemplate = (rowData) => {
    const status = rowData.status;
    let severity = 'danger';
    if (status === 'Paid') severity = 'success';
    else if (status === 'Partially Paid') severity = 'warning';

    return <Tag value={status} severity={severity} className="text-xs font-semibold px-2 py-1" />;
  };

  // Amount Body Templates
  const netDemandBodyTemplate = (rowData) => (
    <span className="font-bold text-red-600 text-sm">
      ₹ {Number(rowData.netDemandAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
    </span>
  );

  const studentNameBodyTemplate = (rowData) => (
    <div className="flex flex-column">
      <span className="font-bold text-900">{rowData.studentName}</span>
      <span className="text-xs text-500">Adm: {rowData.admissionNo} | Roll: {rowData.rollNo || '-'}</span>
    </div>
  );

  const guardianBodyTemplate = (rowData) => (
    <div className="flex flex-column text-xs">
      <span className="font-semibold text-800">{rowData.fatherName || 'Guardian'}</span>
      <span className="text-500">{rowData.guardianMobile || '-'}</span>
    </div>
  );

  const actionBodyTemplate = (rowData) => (
    <div className="flex align-items-center gap-1">
      <Button
        icon="pi pi-print"
        className="p-button-rounded p-button-text p-button-primary p-button-sm"
        title="Print Demand Bill / Challan"
        onClick={() => handlePrintSingle(rowData)}
      />
      <Button
        icon="pi pi-list"
        className="p-button-rounded p-button-text p-button-secondary p-button-sm"
        title="View Fee Breakdown"
        onClick={() => setBreakdownStudent(rowData)}
      />
      {rowData.guardianMobile && (
        <Button
          icon="pi pi-whatsapp"
          className="p-button-rounded p-button-text p-button-success p-button-sm"
          title="Send WhatsApp Reminder"
          onClick={() => handleSendWhatsApp(rowData)}
        />
      )}
    </div>
  );

  return (
    <div className="p-3">
      <Toast ref={toastRef} />

      {/* Header Bar */}
      <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between mb-3 gap-2">
        <div>
          <div className="flex align-items-center gap-2">
            <h1 className="text-2xl font-bold m-0 text-900">Student Fee Demand Bills</h1>
            <Tag value={activeAcademicYearName || 'Active Session'} severity="info" className="font-semibold" />
          </div>
          <p className="text-xs text-500 m-0 mt-1">
            Generate, bulk print & dispatch student fee demand notices, invoices, and bank challans with itemized heads and overdue fines.
          </p>
        </div>

        <div className="flex align-items-center gap-2">
          <Button
            label="Export Excel"
            icon="pi pi-file-excel"
            className="p-button-success p-button-outlined p-button-sm font-semibold"
            onClick={handleExportExcel}
            disabled={students.length === 0}
          />
          <Button
            label={`Bulk Print (${selectedStudents.length || students.length})`}
            icon="pi pi-print"
            className="p-button-primary p-button-sm font-bold shadow-1"
            onClick={selectedStudents.length > 0 ? handlePrintBulk : handlePrintAll}
            disabled={students.length === 0}
          />
        </div>
      </div>

      {/* Top Statistics KPI Cards */}
      <div className="grid mb-3">
        <div className="col-12 sm:col-6 lg:col-3">
          <Card className="surface-card shadow-1 border-left-3 border-blue-500 py-1">
            <div className="flex justify-content-between align-items-center">
              <div>
                <span className="block text-500 font-medium text-xs mb-1">TOTAL DEMAND VALUE</span>
                <div className="text-900 font-bold text-xl text-blue-700">
                  ₹ {Number(summary?.totalNetDemandAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <span className="text-xs text-500">Gross: ₹{Number(summary?.totalGrossAmount || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex align-items-center justify-content-center bg-blue-100 border-round" style={{ width: '2.5rem', height: '2.5rem' }}>
                <i className="pi pi-wallet text-blue-600 text-lg" />
              </div>
            </div>
          </Card>
        </div>

        <div className="col-12 sm:col-6 lg:col-3">
          <Card className="surface-card shadow-1 border-left-3 border-orange-500 py-1">
            <div className="flex justify-content-between align-items-center">
              <div>
                <span className="block text-500 font-medium text-xs mb-1">PENDING DEFAULTERS</span>
                <div className="text-900 font-bold text-xl text-orange-600">
                  {summary?.totalDefaulters || 0} Students
                </div>
                <span className="text-xs text-500">Total Enrolled: {summary?.totalStudents || 0}</span>
              </div>
              <div className="flex align-items-center justify-content-center bg-orange-100 border-round" style={{ width: '2.5rem', height: '2.5rem' }}>
                <i className="pi pi-exclamation-triangle text-orange-600 text-lg" />
              </div>
            </div>
          </Card>
        </div>

        <div className="col-12 sm:col-6 lg:col-3">
          <Card className="surface-card shadow-1 border-left-3 border-green-500 py-1">
            <div className="flex justify-content-between align-items-center">
              <div>
                <span className="block text-500 font-medium text-xs mb-1">CONCESSIONS & DISCOUNTS</span>
                <div className="text-900 font-bold text-xl text-green-600">
                  ₹ {Number(summary?.totalConcessionAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <span className="text-xs text-500">Already Paid: ₹{Number(summary?.totalPaidAmount || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex align-items-center justify-content-center bg-green-100 border-round" style={{ width: '2.5rem', height: '2.5rem' }}>
                <i className="pi pi-tag text-green-600 text-lg" />
              </div>
            </div>
          </Card>
        </div>

        <div className="col-12 sm:col-6 lg:col-3">
          <Card className="surface-card shadow-1 border-left-3 border-indigo-500 py-1">
            <div className="flex justify-content-between align-items-center">
              <div>
                <span className="block text-500 font-medium text-xs mb-1">SELECTED DEMAND</span>
                <div className="text-900 font-bold text-xl text-indigo-700">
                  ₹ {selectedStudents.reduce((acc, s) => acc + Number(s.netDemandAmount || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <span className="text-xs text-indigo-600 font-semibold">{selectedStudents.length} Students Selected</span>
              </div>
              <div className="flex align-items-center justify-content-center bg-indigo-100 border-round" style={{ width: '2.5rem', height: '2.5rem' }}>
                <i className="pi pi-check-square text-indigo-600 text-lg" />
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Filter Toolbar Card */}
      <Card className="shadow-1 mb-3">
        <div className="grid align-items-center">
          <div className="col-12 sm:col-6 md:col-3">
            <label className="block text-xs font-semibold text-600 mb-1">Class</label>
            <Dropdown
              value={selectedClass}
              options={[{ label: 'All Classes', value: null }, ...classes.map(c => ({ label: c.name, value: c.id }))]}
              onChange={(e) => setSelectedClass(e.value)}
              placeholder="Select Class"
              className="w-full p-inputtext-sm"
            />
          </div>

          <div className="col-12 sm:col-6 md:col-2">
            <label className="block text-xs font-semibold text-600 mb-1">Section</label>
            <Dropdown
              value={selectedSection}
              options={[{ label: 'All Sections', value: null }, ...sections.map(s => ({ label: s.name, value: s.id }))]}
              onChange={(e) => setSelectedSection(e.value)}
              placeholder="All Sections"
              disabled={!selectedClass}
              className="w-full p-inputtext-sm"
            />
          </div>

          <div className="col-12 sm:col-6 md:col-2">
            <label className="block text-xs font-semibold text-600 mb-1">Fee Installment / Period</label>
            <Dropdown
              value={selectedInstallment}
              options={[{ label: 'All Due Periods', value: null }, ...installments.map(i => ({ label: i.name, value: i.id }))]}
              onChange={(e) => setSelectedInstallment(e.value)}
              placeholder="All Periods"
              className="w-full p-inputtext-sm"
            />
          </div>

          <div className="col-12 sm:col-6 md:col-2">
            <label className="block text-xs font-semibold text-600 mb-1">Due Status</label>
            <Dropdown
              value={statusFilter}
              options={[
                { label: 'Unpaid / Due Only', value: 'unpaid' },
                { label: 'All Students', value: 'all' },
                { label: 'Partially Paid', value: 'partial' },
              ]}
              onChange={(e) => setStatusFilter(e.value)}
              className="w-full p-inputtext-sm"
            />
          </div>

          <div className="col-12 sm:col-6 md:col-3">
            <label className="block text-xs font-semibold text-600 mb-1">Search Student / Mobile</label>
            <div className="p-inputgroup">
              <InputText
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchDemandBills()}
                placeholder="Name, Adm No, Roll, Phone..."
                className="p-inputtext-sm"
              />
              <Button icon="pi pi-search" className="p-button-sm p-button-primary" onClick={fetchDemandBills} />
            </div>
          </div>
        </div>
      </Card>

      {/* Demand Bills Data Table */}
      <Card className="shadow-1">
        <DataTable
          value={students}
          selection={selectedStudents}
          onSelectionChange={(e) => setSelectedStudents(e.value)}
          dataKey="studentId"
          loading={loading}
          paginator
          rows={25}
          rowsPerPageOptions={[10, 25, 50, 100]}
          emptyMessage="No students found matching the selected criteria."
          className="p-datatable-sm"
          responsiveLayout="scroll"
          stripedRows
        >
          <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />
          <Column field="demandBillNo" header="Bill No" sortable className="font-semibold text-xs text-700" style={{ width: '130px' }} />
          <Column header="Student Particulars" body={studentNameBodyTemplate} sortable field="studentName" />
          <Column header="Class - Sec" body={(r) => `${r.className}${r.sectionName ? ' - ' + r.sectionName : ''}`} sortable field="className" style={{ width: '110px' }} />
          <Column header="Parent & Contact" body={guardianBodyTemplate} />
          <Column header="Fee Period(s)" body={(r) => r.installmentNames?.join(', ') || '-'} className="text-xs text-600" style={{ maxWidth: '180px' }} />
          <Column field="grossAmount" header="Gross (₹)" body={(r) => Number(r.grossAmount || 0).toLocaleString('en-IN')} className="text-right text-xs" />
          <Column field="concessionAmount" header="Disc (₹)" body={(r) => Number(r.concessionAmount || 0) > 0 ? `-${Number(r.concessionAmount).toFixed(0)}` : '0'} className="text-right text-xs text-green-600" />
          <Column field="previousArrears" header="Arrears (₹)" body={(r) => Number(r.previousArrears || 0) > 0 ? Number(r.previousArrears).toLocaleString('en-IN') : '-'} className="text-right text-xs text-orange-600" />
          <Column field="fineAmount" header="Fine (₹)" body={(r) => Number(r.fineAmount || 0) > 0 ? Number(r.fineAmount).toFixed(0) : '-'} className="text-right text-xs text-red-500" />
          <Column field="netDemandAmount" header="Net Demand (₹)" body={netDemandBodyTemplate} sortable className="text-right" />
          <Column field="status" header="Status" body={statusBodyTemplate} sortable style={{ width: '110px' }} />
          <Column header="Actions" body={actionBodyTemplate} style={{ width: '130px' }} />
        </DataTable>
      </Card>

      {/* Print Modal for Single or Bulk Bills */}
      <DemandBillPrintModal
        visible={printModalVisible}
        onHide={() => setPrintModalVisible(false)}
        students={studentsToPrint}
        schoolInfo={schoolInfo}
      />

      {/* Student Dues Breakdown Dialog */}
      <Dialog
        visible={!!breakdownStudent}
        onHide={() => setBreakdownStudent(null)}
        header={`Fee Head Breakdown: ${breakdownStudent?.studentName} (${breakdownStudent?.admissionNo})`}
        style={{ width: '650px' }}
        modal
      >
        {breakdownStudent && (
          <div>
            <div className="flex justify-content-between p-2 bg-blue-50 border-round mb-3 text-xs">
              <span><strong>Class:</strong> {breakdownStudent.className} {breakdownStudent.sectionName}</span>
              <span><strong>Total Gross:</strong> ₹{Number(breakdownStudent.grossAmount).toLocaleString('en-IN')}</span>
              <span><strong>Net Demand Due:</strong> <strong className="text-red-600">₹{Number(breakdownStudent.netDemandAmount).toLocaleString('en-IN')}</strong></span>
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
