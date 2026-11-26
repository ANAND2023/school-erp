import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from 'primereact/card';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { AppButton as Button } from '../../../components/common/AppButton';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Tag } from 'primereact/tag';
import { Avatar } from 'primereact/avatar';
import { Toast } from 'primereact/toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import dayjs from 'dayjs';
import { studentApi } from '../api';
import { classApi, academicYearApi } from '../../masters/api';
import { useAcademicYear } from '../../../hooks/useAcademicYear';
import { useAuthStore } from '../../../store/authStore';
import { AppInput, AppSelect } from '../../../components/common';

export const AdmissionRecordsPage = () => {
    const navigate = useNavigate();
    const toast = useRef(null);
    const { user } = useAuthStore();
    const { activeAcademicYearId } = useAcademicYear();

    const [exportingPdf, setExportingPdf] = useState(false);
    const [exportingExcel, setExportingExcel] = useState(false);

    const [summary, setSummary] = useState({
        totalAllTime: 0,
        totalSession: 0,
        newAdmissionsCount: 0,
        promotedCount: 0,
        boysCount: 0,
        girlsCount: 0,
        classWise: [],
        recentAdmissions: []
    });
    const [loadingSummary, setLoadingSummary] = useState(false);

    // Filter states
    const [academicYears, setAcademicYears] = useState([]);
    const [selectedYearId, setSelectedYearId] = useState(activeAcademicYearId || 0);
    const [classes, setClasses] = useState([]);
    const [selectedClassId, setSelectedClassId] = useState(null);
    const [selectedSectionId, setSelectedSectionId] = useState(null);
    const [admissionTypeFilter, setAdmissionTypeFilter] = useState('all'); // 'all', 'new', 'promoted'
    const [searchQuery, setSearchQuery] = useState('');
    
    // Students list state
    const [students, setStudents] = useState([]);
    const [totalRecords, setTotalRecords] = useState(0);
    const [loadingList, setLoadingList] = useState(false);
    const [lazyParams, setLazyParams] = useState({
        first: 0,
        rows: 20,
        page: 0
    });

    // Load initial reference data
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [clsRes, ayRes] = await Promise.all([
                    classApi.getClasses(),
                    academicYearApi.getAcademicYears()
                ]);
                if (clsRes.data?.success) setClasses(clsRes.data.data || []);
                if (ayRes.data?.success) {
                    const years = ayRes.data.data || [];
                    setAcademicYears(years);
                    if (!selectedYearId && years.length > 0) {
                        const cur = years.find(y => y.isCurrent) || years[0];
                        setSelectedYearId(cur.id);
                    }
                }
            } catch (err) {
                console.error('Failed to load classes or academic years', err);
            }
        };
        loadInitialData();
    }, []);

    // Load admission summary
    const fetchSummary = async () => {
        setLoadingSummary(true);
        try {
            const res = await studentApi.getAdmissionSummary({ academicYearId: selectedYearId || undefined });
            if (res.data?.success) {
                setSummary(res.data.data);
            }
        } catch (err) {
            console.error('Failed to fetch admission summary', err);
        } finally {
            setLoadingSummary(false);
        }
    };

    useEffect(() => {
        fetchSummary();
    }, [selectedYearId]);

    // Load students list
    const fetchStudents = async () => {
        setLoadingList(true);
        try {
            const params = {
                pageNo: lazyParams.page + 1,
                pageSize: lazyParams.rows,
                academicYearId: selectedYearId !== 0 ? selectedYearId : undefined,
                classId: selectedClassId || undefined,
                sectionId: selectedSectionId || undefined,
                admissionType: admissionTypeFilter !== 'all' ? admissionTypeFilter : undefined,
                search: searchQuery.trim() || undefined
            };
            const res = await studentApi.getStudents(params);
            if (res.data?.success) {
                setStudents(res.data.data.items || []);
                setTotalRecords(res.data.data.totalCount || 0);
            }
        } catch (err) {
            console.error('Failed to load students', err);
            toast.current?.show({ severity: 'error', summary: 'Error', detail: 'Failed to load admission list' });
        } finally {
            setLoadingList(false);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, [lazyParams, selectedYearId, selectedClassId, selectedSectionId, admissionTypeFilter]);

    const onSearchTrigger = (e) => {
        if (e.key === 'Enter') {
            setLazyParams(prev => ({ ...prev, first: 0, page: 0 }));
            fetchStudents();
        }
    };

    const resetFilters = () => {
        setSelectedClassId(null);
        setSelectedSectionId(null);
        setAdmissionTypeFilter('all');
        setSearchQuery('');
        setLazyParams({ first: 0, rows: 20, page: 0 });
    };

    // Fetch all matching records for full exports (Excel or PDF)
    const fetchAllMatchingStudents = async () => {
        if (students.length === 0 && totalRecords === 0) return [];
        if (totalRecords <= students.length) return students;
        try {
            const res = await studentApi.getStudents({
                pageNo: 1,
                pageSize: totalRecords || 1000,
                academicYearId: selectedYearId !== 0 ? selectedYearId : undefined,
                classId: selectedClassId || undefined,
                sectionId: selectedSectionId || undefined,
                admissionType: admissionTypeFilter !== 'all' ? admissionTypeFilter : undefined,
                search: searchQuery.trim() || undefined
            });
            if (res.data?.success && res.data.data?.items) {
                return res.data.data.items;
            }
        } catch (err) {
            console.error('Failed to fetch full student list for export', err);
        }
        return students;
    };

    const exportToExcel = async () => {
        if (totalRecords === 0 && students.length === 0) {
            toast.current?.show({ severity: 'warn', summary: 'Empty', detail: 'No admission records to export' });
            return;
        }

        setExportingExcel(true);
        try {
            const studentList = await fetchAllMatchingStudents();
            if (!studentList || studentList.length === 0) {
                toast.current?.show({ severity: 'warn', summary: 'Empty', detail: 'No records found to export' });
                return;
            }

            const dataToExport = studentList.map((s, idx) => ({
                'S.No': idx + 1,
                'Admission No': s.admissionNo,
                'Admission Date': s.admissionDate ? new Date(s.admissionDate).toLocaleDateString('en-IN') : '—',
                'Admission Type': s.admissionType || (s.isNewAdmission === false ? 'Promoted' : 'New Admission'),
                'Student Name': s.fullName || `${s.firstName || ''} ${s.lastName || ''}`.trim(),
                'Class': s.className,
                'Section': s.sectionName || '—',
                'Roll No': s.rollNo ?? '—',
                'Gender': s.gender,
                'DOB': s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString('en-IN') : '—',
                'Guardian Name': s.guardianName || '—',
                'Guardian Mobile': s.guardianMobile || s.mobileNo || '—',
                'Status': s.status === 1 ? 'Active' : 'Inactive'
            }));

            const ws = XLSX.utils.json_to_sheet(dataToExport);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Admissions');
            const selectedYear = academicYears.find(y => y.id === selectedYearId);
            const sessionName = selectedYear ? selectedYear.name.replace(/[\/\\:]/g, '-') : 'Session';
            XLSX.writeFile(wb, `Admission_Register_${sessionName}_${new Date().toISOString().split('T')[0]}.xlsx`);
            toast.current?.show({ severity: 'success', summary: 'Exported', detail: 'Admission register exported to Excel.' });
        } catch (err) {
            console.error('Error exporting to Excel', err);
            toast.current?.show({ severity: 'error', summary: 'Export Failed', detail: 'Could not export Excel file.' });
        } finally {
            setExportingExcel(false);
        }
    };

    const exportToPdf = async () => {
        if (totalRecords === 0 && students.length === 0) {
            toast.current?.show({ severity: 'warn', summary: 'Empty', detail: 'No admission records to export' });
            return;
        }

        setExportingPdf(true);
        try {
            const studentList = await fetchAllMatchingStudents();
            if (!studentList || studentList.length === 0) {
                toast.current?.show({ severity: 'warn', summary: 'Empty', detail: 'No records found to export' });
                return;
            }

            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            const pageWidth = doc.internal.pageSize.width;

            const schoolName = (user?.schoolName || 'DELHI PUBLIC SCHOOL').toUpperCase();
            const branchName = user?.branchName || 'Main Campus';
            const selectedYear = academicYears.find(y => y.id === selectedYearId);
            const sessionName = selectedYear ? selectedYear.name : 'Current Session';
            const selectedClass = classes.find(c => c.id === selectedClassId);
            const className = selectedClass ? selectedClass.name : 'All Classes';
            const typeFilterLabel = admissionTypeFilter === 'new' ? 'New Admissions Only' : (admissionTypeFilter === 'promoted' ? 'Promoted Only' : 'All Students');

            // Header - School Name
            doc.setFontSize(14);
            doc.setTextColor(29, 78, 216); // #1d4ed8 Blue
            doc.text(schoolName, 12, 14);

            // Subtitle
            doc.setFontSize(10);
            doc.setTextColor(51, 65, 85);
            doc.text(`${branchName}  •  ADMISSION RECORDS & REGISTER`, 12, 20);

            // Metadata info line
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            doc.text(
                `Academic Session: ${sessionName}   |   Admission Type: ${typeFilterLabel}   |   Class: ${className}   |   Generated On: ${dayjs().format('DD-MMM-YYYY, hh:mm A')}`,
                12,
                25.5
            );

            // KPI / Summary bar line
            doc.setFontSize(8.5);
            doc.setTextColor(15, 23, 42);
            doc.setFont(undefined, 'bold');
            doc.text(
                `Total Records: ${studentList.length}   |   New Admissions: ${summary.newAdmissionsCount ?? 0}   |   Promoted: ${summary.promotedCount ?? 0}   |   Gender: ${summary.boysCount || 0} Boys / ${summary.girlsCount || 0} Girls`,
                12,
                30.5
            );
            doc.setFont(undefined, 'normal');

            // Table Data Mapping
            const tableData = studentList.map((s, idx) => {
                const isPromoted = s.admissionType === 'Promoted' || s.isNewAdmission === false;
                const admType = isPromoted ? 'Promoted' : 'New Admission';
                const admDateStr = s.admissionDate ? dayjs(s.admissionDate).format('DD MMM YYYY') : '—';
                const classSecStr = `${s.className || '—'}${s.sectionName ? ` (${s.sectionName})` : ''}`;
                const studentNameStr = s.fullName || `${s.firstName || ''} ${s.lastName || ''}`.trim() || '—';
                const guardianStr = s.guardianName || '—';
                const contactStr = s.guardianMobile || s.mobileNo || '—';

                return [
                    idx + 1,
                    s.admissionNo || '—',
                    admDateStr,
                    admType,
                    studentNameStr,
                    classSecStr,
                    s.rollNo ?? '—',
                    s.gender || '—',
                    guardianStr,
                    contactStr,
                    s.status === 1 ? 'Active' : 'Inactive'
                ];
            });

            autoTable(doc, {
                startY: 34,
                margin: { left: 10, right: 10, bottom: 12 },
                tableWidth: 277,
                head: [['#', 'Adm No', 'Adm Date', 'Admission Type', 'Student Name', 'Class & Sec', 'Roll', 'Gender', 'Father / Guardian', 'Contact No', 'Status']],
                body: tableData,
                theme: 'grid',
                styles: { fontSize: 7.5, textColor: [30, 41, 59], cellPadding: 2, valign: 'middle' },
                headStyles: { fillColor: [29, 78, 216], textColor: 255, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                columnStyles: {
                    0: { cellWidth: 8, halign: 'center' },
                    1: { cellWidth: 28 },
                    2: { cellWidth: 20 },
                    3: { cellWidth: 24, fontStyle: 'bold' },
                    4: { cellWidth: 42 },
                    5: { cellWidth: 24 },
                    6: { cellWidth: 14, halign: 'center' },
                    7: { cellWidth: 16 },
                    8: { cellWidth: 42 },
                    9: { cellWidth: 26 },
                    10: { cellWidth: 15, halign: 'center' }
                },
                didParseCell: (data) => {
                    // Highlight Admission Type cell: Green for New Admission, Blue for Promoted
                    if (data.section === 'body' && data.column.index === 3) {
                        if (data.cell.raw === 'New Admission') {
                            data.cell.styles.textColor = [21, 128, 61]; // #15803d
                        } else if (data.cell.raw === 'Promoted') {
                            data.cell.styles.textColor = [3, 105, 161]; // #0369a1
                        }
                    }
                },
                didDrawPage: () => {
                    const pageCount = doc.internal.getNumberOfPages();
                    doc.setFontSize(8);
                    doc.setTextColor(148, 163, 184);
                    doc.text(
                        `Page ${doc.internal.getCurrentPageInfo().pageNumber} of ${pageCount} • School ERP Admission Register`,
                        pageWidth - 75,
                        doc.internal.pageSize.height - 6
                    );
                }
            });

            const safeSession = sessionName.replace(/[\/\\:]/g, '-');
            doc.save(`Admission_Register_${safeSession}_${dayjs().format('YYYY-MM-DD')}.pdf`);
            toast.current?.show({ severity: 'success', summary: 'Exported', detail: 'Admission register exported to PDF.' });
        } catch (err) {
            console.error('Error generating PDF', err);
            toast.current?.show({ severity: 'error', summary: 'Export Failed', detail: 'Could not generate PDF.' });
        } finally {
            setExportingPdf(false);
        }
    };

    // Class dropdown options with student counts
    const classDropdownOptions = useMemo(() => {
        const countMap = {};
        (summary.classWise || []).forEach(c => {
            countMap[c.classId] = c.count;
        });

        const list = classes.map(cls => {
            const count = countMap[cls.id] || 0;
            return {
                id: cls.id,
                label: count > 0 ? `${cls.name} (${count})` : cls.name,
                name: cls.name,
                count: count
            };
        });

        // Sort so classes with enrolled students appear nicely, keeping display order
        return list;
    }, [classes, summary.classWise]);

    const activeClass = classes.find(c => c.id === selectedClassId);
    const sections = activeClass?.sections || [];

    return (
        <div className="pb-2">
            <Toast ref={toast} />

            {/* Header Toolbar (Compact) */}
            <div className="flex flex-wrap align-items-center justify-content-between gap-2 mb-2 px-3 py-1.5 bg-white border-round shadow-1 border-left-3 border-blue-600">
                <div>
                    <h2 className="text-base font-bold m-0 text-900 flex align-items-center gap-2">
                        <i className="pi pi-id-card text-blue-600 text-lg" />
                        Admission Records & Register
                    </h2>
                    <span className="text-xs text-500">
                        Total Admissions: <b>{summary.totalAllTime || totalRecords}</b> | Current Session: <b>{summary.totalSession || totalRecords}</b>
                    </span>
                </div>
                <div className="flex flex-wrap gap-1">
                    <Button 
                        label="New Admission" 
                        icon="pi pi-user-plus" 
                        size="small"
                        severity="primary" 
                        className="p-button-sm py-1"
                        onClick={() => navigate('/admissions/new')} 
                    />
                    <Button 
                        label="Bulk Excel" 
                        icon="pi pi-file-excel" 
                        size="small"
                        severity="info" 
                        outlined 
                        className="p-button-sm py-1"
                        onClick={() => navigate('/students/bulk-operations')} 
                    />
                    <Button 
                        label="Export Excel" 
                        icon="pi pi-download" 
                        size="small"
                        severity="secondary" 
                        outlined 
                        className="p-button-sm py-1"
                        loading={exportingExcel}
                        onClick={exportToExcel} 
                    />
                    <Button 
                        label="Download PDF" 
                        icon="pi pi-file-pdf" 
                        size="small"
                        severity="danger" 
                        outlined 
                        className="p-button-sm py-1"
                        loading={exportingPdf}
                        onClick={exportToPdf} 
                    />
                </div>
            </div>

            {/* 5 Compact Metric Cards (Ultra-Slim & Minimal Height) */}
            <div className="grid grid-nogutter gap-2 mb-2">
                {/* Total All-Time Admissions */}
                <div className="col flex-1 surface-0 border-round px-2 py-1.5 shadow-1 border-left-3 border-blue-500 flex align-items-center justify-content-between" style={{ minHeight: '46px' }}>
                    <div>
                        <span className="text-xs text-500 font-semibold block uppercase" style={{ fontSize: '10px' }}>Total Admissions</span>
                        <div className="flex align-items-baseline gap-1">
                            <span className="text-lg font-bold text-900">{summary.totalAllTime || totalRecords}</span>
                            <span className="text-xs text-400">all-time</span>
                        </div>
                    </div>
                    <div className="flex align-items-center justify-content-center bg-blue-50 text-blue-600 border-round" style={{ width: '28px', height: '28px' }}>
                        <i className="pi pi-users text-xs" />
                    </div>
                </div>

                {/* Session Admissions */}
                <div className="col flex-1 surface-0 border-round px-2 py-1.5 shadow-1 border-left-3 border-cyan-500 flex align-items-center justify-content-between" style={{ minHeight: '46px' }}>
                    <div>
                        <span className="text-xs text-500 font-semibold block uppercase" style={{ fontSize: '10px' }}>Session Enrollments</span>
                        <div className="flex align-items-baseline gap-1">
                            <span className="text-lg font-bold text-cyan-700">{summary.totalSession || totalRecords}</span>
                            <span className="text-xs text-cyan-600">in session</span>
                        </div>
                    </div>
                    <div className="flex align-items-center justify-content-center bg-cyan-50 text-cyan-600 border-round" style={{ width: '28px', height: '28px' }}>
                        <i className="pi pi-calendar text-xs" />
                    </div>
                </div>

                {/* Fresh / New Admissions */}
                <div className="col flex-1 surface-0 border-round px-2 py-1.5 shadow-1 border-left-3 border-green-500 flex align-items-center justify-content-between" style={{ minHeight: '46px' }}>
                    <div>
                        <span className="text-xs text-500 font-semibold block uppercase" style={{ fontSize: '10px' }}>New Admissions</span>
                        <div className="flex align-items-baseline gap-1">
                            <span className="text-lg font-bold text-green-700">{summary.newAdmissionsCount ?? 0}</span>
                            <span className="text-xs text-green-600 font-medium">fresh</span>
                        </div>
                    </div>
                    <div className="flex align-items-center justify-content-center bg-green-50 text-green-600 border-round" style={{ width: '28px', height: '28px' }}>
                        <i className="pi pi-user-plus text-xs" />
                    </div>
                </div>

                {/* Promoted / Continuing */}
                <div className="col flex-1 surface-0 border-round px-2 py-1.5 shadow-1 border-left-3 border-indigo-500 flex align-items-center justify-content-between" style={{ minHeight: '46px' }}>
                    <div>
                        <span className="text-xs text-500 font-semibold block uppercase" style={{ fontSize: '10px' }}>Promoted Students</span>
                        <div className="flex align-items-baseline gap-1">
                            <span className="text-lg font-bold text-indigo-700">{summary.promotedCount ?? 0}</span>
                            <span className="text-xs text-indigo-600 font-medium">promoted</span>
                        </div>
                    </div>
                    <div className="flex align-items-center justify-content-center bg-indigo-50 text-indigo-600 border-round" style={{ width: '28px', height: '28px' }}>
                        <i className="pi pi-arrow-up-right text-xs" />
                    </div>
                </div>

                {/* Boys vs Girls */}
                <div className="col flex-1 surface-0 border-round px-2 py-1.5 shadow-1 border-left-3 border-pink-500 flex align-items-center justify-content-between" style={{ minHeight: '46px' }}>
                    <div>
                        <span className="text-xs text-500 font-semibold block uppercase" style={{ fontSize: '10px' }}>Gender Ratio</span>
                        <div className="text-sm font-bold text-900">
                            <span className="text-blue-700">{summary.boysCount} Boys</span>
                            <span className="text-300 mx-1">/</span>
                            <span className="text-pink-600">{summary.girlsCount} Girls</span>
                        </div>
                    </div>
                    <div className="flex align-items-center justify-content-center bg-pink-50 text-pink-600 border-round" style={{ width: '28px', height: '28px' }}>
                        <i className="pi pi-chart-pie text-xs" />
                    </div>
                </div>
            </div>

            {/* Main Admission Register Container (No Card default bulky padding) */}
            <div className="bg-white border-round shadow-1 p-2 border-1 border-200">
                {/* Unified Filter Toolbar with AppSelect & AppInput */}
                <div className="flex flex-wrap align-items-center justify-content-between gap-2 mb-2 p-2 surface-50 border-round border-1 border-200">
                    <div className="flex flex-wrap align-items-center gap-2">
                        {/* Academic Session AppSelect */}
                        <div style={{ width: '12rem' }}>
                            <AppSelect 
                                label="ACADEMIC SESSION"
                                value={selectedYearId} 
                                options={academicYears} 
                                optionLabel="name" 
                                optionValue="id" 
                                onChange={(e) => { setSelectedYearId(e.value); setLazyParams(p => ({ ...p, first: 0, page: 0 })); }} 
                                placeholder="Select Session" 
                                showClear={false}
                            />
                        </div>

                        {/* Admission Type AppSelect (Fresh vs Promoted) */}
                        <div style={{ width: '14rem' }}>
                            <AppSelect 
                                label="ADMISSION TYPE"
                                value={admissionTypeFilter} 
                                options={[
                                    { label: `All Students (${summary.totalSession || totalRecords})`, value: 'all' },
                                    { label: `New Admissions (${summary.newAdmissionsCount ?? 0})`, value: 'new' },
                                    { label: `Promoted (${summary.promotedCount ?? 0})`, value: 'promoted' }
                                ]} 
                                optionLabel="label" 
                                optionValue="value" 
                                onChange={(e) => { setAdmissionTypeFilter(e.value); setLazyParams(p => ({ ...p, first: 0, page: 0 })); }} 
                                placeholder="All Types" 
                                showClear={false}
                            />
                        </div>

                        {/* Class AppSelect (Enhanced with Student Counts) */}
                        <div style={{ width: '13.5rem' }}>
                            <AppSelect 
                                label="CLASS / GRADE"
                                value={selectedClassId} 
                                options={classDropdownOptions} 
                                optionLabel="label" 
                                optionValue="id" 
                                onChange={(e) => { setSelectedClassId(e.value); setSelectedSectionId(null); setLazyParams(p => ({ ...p, first: 0, page: 0 })); }} 
                                placeholder="ALL CLASSES" 
                                showClear 
                            />
                        </div>

                        {/* Section AppSelect */}
                        <div style={{ width: '10.5rem' }}>
                            <AppSelect 
                                label="SECTION"
                                value={selectedSectionId} 
                                options={sections} 
                                optionLabel="name" 
                                optionValue="id" 
                                onChange={(e) => { setSelectedSectionId(e.value); setLazyParams(p => ({ ...p, first: 0, page: 0 })); }} 
                                placeholder="ALL SECTIONS" 
                                showClear 
                                disabled={!selectedClassId}
                            />
                        </div>

                        {/* Reset Filters */}
                        {(selectedClassId || selectedSectionId || searchQuery || admissionTypeFilter !== 'all') && (
                            <Button label="Reset" icon="pi pi-refresh" text size="small" onClick={resetFilters} className="p-button-sm py-1" />
                        )}
                    </div>

                    {/* Search box with AppInput */}
                    <div className="flex align-items-center gap-1">
                        <div style={{ width: '16rem' }}>
                            <AppInput 
                                label="SEARCH STUDENT"
                                value={searchQuery} 
                                onChange={(e) => setSearchQuery(e.target.value)} 
                                onKeyDown={onSearchTrigger}
                                placeholder="NAME, ADM NO, MOBILE..." 
                                icon="pi pi-search"
                                addon={searchQuery ? "pi pi-times" : undefined}
                                onAddonClick={searchQuery ? () => { setSearchQuery(''); setLazyParams(p => ({ ...p, first: 0, page: 0 })); } : undefined}
                            />
                        </div>
                        <Button 
                            icon="pi pi-search" 
                            size="small"
                            onClick={() => { setLazyParams(p => ({ ...p, first: 0, page: 0 })); fetchStudents(); }} 
                            style={{ height: '36px', minWidth: '36px' }}
                        />
                    </div>
                </div>

                {/* Admission Records Data Table */}
                <DataTable 
                    value={students} 
                    lazy 
                    paginator 
                    first={lazyParams.first} 
                    rows={lazyParams.rows} 
                    totalRecords={totalRecords} 
                    onPage={(e) => setLazyParams(e)} 
                    rowsPerPageOptions={[10, 20, 50, 100]}
                    loading={loadingList} 
                    stripedRows 
                    size="small" 
                    className="p-datatable-sm" 
                    emptyMessage="No admission records found matching filters."
                >
                    <Column 
                        header="#" 
                        body={(data, options) => <span className="text-500 font-semibold">{lazyParams.first + options.rowIndex + 1}</span>} 
                        style={{ width: '3.5rem', textAlign: 'center' }} 
                    />
                    
                    <Column 
                        field="admissionNo" 
                        header="Admission No" 
                        body={(row) => (
                            <span 
                                onClick={() => navigate(`/students/profile/${row.id}`)}
                                className="px-2 py-1 bg-blue-50 text-blue-700 font-bold border-round text-xs cursor-pointer hover:bg-blue-100 border-1 border-blue-200 transition-colors inline-block"
                            >
                                {row.admissionNo}
                            </span>
                        )} 
                        style={{ minWidth: '150px' }} 
                    />

                    <Column 
                        field="admissionDate" 
                        header="Adm Date" 
                        body={(row) => (
                            <span className="text-xs font-semibold text-700">
                                {row.admissionDate ? new Date(row.admissionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                            </span>
                        )} 
                        style={{ minWidth: '110px' }} 
                    />

                    <Column 
                        field="admissionType" 
                        header="Admission Type" 
                        body={(row) => {
                            const isPromoted = row.admissionType === 'Promoted' || row.isNewAdmission === false;
                            return isPromoted ? (
                                <Tag 
                                    value="Promoted" 
                                    severity="info" 
                                    icon="pi pi-arrow-up-right"
                                    className="text-xs font-semibold px-2 py-1"
                                    style={{ backgroundColor: '#e0f2fe', color: '#0369a1', borderColor: '#bae6fd' }}
                                />
                            ) : (
                                <Tag 
                                    value="New Admission" 
                                    severity="success" 
                                    icon="pi pi-check"
                                    className="text-xs font-semibold px-2 py-1"
                                    style={{ backgroundColor: '#dcfce7', color: '#15803d', borderColor: '#bbf7d0' }}
                                />
                            );
                        }} 
                        style={{ minWidth: '135px' }} 
                    />

                    <Column 
                        field="fullName" 
                        header="Student Name" 
                        body={(row) => (
                            <div className="flex align-items-center gap-2">
                                <Avatar 
                                    image={row.photoUrl || undefined} 
                                    label={!row.photoUrl ? (row.firstName ? row.firstName.charAt(0) : 'S') : undefined} 
                                    shape="circle" 
                                    size="small" 
                                    style={{ backgroundColor: '#e0f2fe', color: '#0369a1', fontWeight: 'bold' }} 
                                />
                                <div>
                                    <span 
                                        onClick={() => navigate(`/students/profile/${row.id}`)}
                                        className="font-bold text-sm text-900 cursor-pointer hover:text-primary transition-colors block"
                                    >
                                        {row.fullName || `${row.firstName || ''} ${row.lastName || ''}`.trim()}
                                    </span>
                                    {row.rollNo && (
                                        <span className="text-xs text-500">Roll: #{row.rollNo}</span>
                                    )}
                                </div>
                            </div>
                        )} 
                        style={{ minWidth: '180px' }} 
                    />

                    <Column 
                        field="className" 
                        header="Class & Sec" 
                        body={(row) => (
                            <Tag 
                                value={`${row.className || '—'} ${row.sectionName ? `(${row.sectionName})` : ''}`} 
                                severity="info" 
                                className="text-xs font-semibold"
                            />
                        )} 
                        style={{ minWidth: '120px' }} 
                    />

                    <Column 
                        field="gender" 
                        header="Gender" 
                        body={(row) => (
                            <span className={`text-xs font-semibold ${row.gender?.toLowerCase() === 'female' ? 'text-pink-600' : 'text-blue-700'}`}>
                                {row.gender || '—'}
                            </span>
                        )} 
                        style={{ minWidth: '80px' }} 
                    />

                    <Column 
                        field="guardianName" 
                        header="Father / Guardian" 
                        body={(row) => (
                            <div>
                                <span className="text-xs font-bold text-800 block">{row.guardianName || '—'}</span>
                                {row.guardianMobile && (
                                    <a href={`tel:${row.guardianMobile}`} className="text-xs text-blue-600 hover:underline">
                                        <i className="pi pi-phone text-2xs mr-1" />
                                        {row.guardianMobile}
                                    </a>
                                )}
                            </div>
                        )} 
                        style={{ minWidth: '160px' }} 
                    />

                    <Column 
                        field="status" 
                        header="Status" 
                        body={(row) => (
                            <Tag 
                                value={row.status === 1 ? 'Active' : 'Inactive'} 
                                severity={row.status === 1 ? 'success' : 'danger'} 
                                className="text-xs"
                            />
                        )} 
                        style={{ minWidth: '90px' }} 
                    />

                    <Column 
                        header="Action" 
                        body={(row) => (
                            <div className="flex align-items-center gap-1">
                                <Button 
                                    icon="pi pi-eye" 
                                    size="small" 
                                    text 
                                    rounded 
                                    tooltip="View Profile" 
                                    onClick={() => navigate(`/students/profile/${row.id}`)} 
                                />
                            </div>
                        )} 
                        style={{ width: '4rem', textAlign: 'center' }} 
                    />
                </DataTable>
            </div>
        </div>
    );
};

export default AdmissionRecordsPage;