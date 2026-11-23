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
import { studentApi } from '../api';
import { classApi, academicYearApi } from '../../masters/api';
import { useAcademicYear } from '../../../hooks/useAcademicYear';

export const AdmissionRecordsPage = () => {
    const navigate = useNavigate();
    const toast = useRef(null);
    const { activeAcademicYearId } = useAcademicYear();

    const [summary, setSummary] = useState({
        totalAllTime: 0,
        totalSession: 0,
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
    }, [lazyParams, selectedYearId, selectedClassId, selectedSectionId]);

    const onSearchTrigger = (e) => {
        if (e.key === 'Enter') {
            setLazyParams(prev => ({ ...prev, first: 0, page: 0 }));
            fetchStudents();
        }
    };

    const resetFilters = () => {
        setSelectedClassId(null);
        setSelectedSectionId(null);
        setSearchQuery('');
        setLazyParams({ first: 0, rows: 20, page: 0 });
    };

    const exportToExcel = () => {
        if (students.length === 0) {
            toast.current?.show({ severity: 'warn', summary: 'Empty', detail: 'No admission records to export' });
            return;
        }
        const dataToExport = students.map((s, idx) => ({
            'S.No': idx + 1,
            'Admission No': s.admissionNo,
            'Admission Date': s.admissionDate ? new Date(s.admissionDate).toLocaleDateString('en-IN') : '—',
            'Student Name': s.fullName || `${s.firstName || ''} ${s.lastName || ''}`.trim(),
            'Class': s.className,
            'Section': s.sectionName || '—',
            'Roll No': s.rollNo ?? '—',
            'Gender': s.gender,
            'DOB': s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString('en-IN') : '—',
            'Guardian Name': s.guardianName || '—',
            'Guardian Mobile': s.guardianMobile || '—',
            'Status': s.status === 1 ? 'Active' : 'Inactive'
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Admissions');
        XLSX.writeFile(wb, `Admission_Register_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.current?.show({ severity: 'success', summary: 'Exported', detail: 'Admission register exported to Excel.' });
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
        <div className="p-3">
            <Toast ref={toast} />

            {/* Header Toolbar (Compact) */}
            <div className="flex flex-wrap align-items-center justify-content-between gap-3 mb-3 p-3 bg-white border-round shadow-1 border-left-3 border-blue-600">
                <div>
                    <h2 className="text-lg font-bold m-0 text-900 flex align-items-center gap-2">
                        <i className="pi pi-id-card text-blue-600 text-xl" />
                        Admission Records & Register
                    </h2>
                    <span className="text-xs text-600">
                        Total Admissions: <b>{summary.totalAllTime || totalRecords}</b> | Current Session: <b>{summary.totalSession || totalRecords}</b>
                    </span>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button 
                        label="New Admission" 
                        icon="pi pi-user-plus" 
                        size="small"
                        severity="primary" 
                        onClick={() => navigate('/admissions/new')} 
                    />
                    <Button 
                        label="Bulk Excel Admission" 
                        icon="pi pi-file-excel" 
                        size="small"
                        severity="info" 
                        outlined 
                        onClick={() => navigate('/students/bulk-operations')} 
                    />
                    <Button 
                        label="Export Excel" 
                        icon="pi pi-download" 
                        size="small"
                        severity="secondary" 
                        outlined 
                        onClick={exportToExcel} 
                    />
                </div>
            </div>

            {/* 4 Compact Metric Cards (Slim & Low Height) */}
            <div className="grid grid-nogutter gap-2 mb-3">
                {/* Total All-Time Admissions */}
                <div className="col flex-1 surface-0 border-round p-2 px-3 shadow-1 border-left-3 border-blue-500 flex align-items-center justify-content-between" style={{ minHeight: '60px' }}>
                    <div>
                        <span className="text-xs text-500 font-semibold block uppercase" style={{ fontSize: '11px' }}>Total Admissions</span>
                        <div className="flex align-items-baseline gap-1">
                            <span className="text-xl font-bold text-900">{summary.totalAllTime || totalRecords}</span>
                            <span className="text-xs text-500">all-time</span>
                        </div>
                    </div>
                    <div className="flex align-items-center justify-content-center bg-blue-100 border-round" style={{ width: '34px', height: '34px' }}>
                        <i className="pi pi-users text-blue-600 text-sm" />
                    </div>
                </div>

                {/* Session Admissions */}
                <div className="col flex-1 surface-0 border-round p-2 px-3 shadow-1 border-left-3 border-green-500 flex align-items-center justify-content-between" style={{ minHeight: '60px' }}>
                    <div>
                        <span className="text-xs text-500 font-semibold block uppercase" style={{ fontSize: '11px' }}>Session Enrollments</span>
                        <div className="flex align-items-baseline gap-1">
                            <span className="text-xl font-bold text-green-700">{summary.totalSession || totalRecords}</span>
                            <span className="text-xs text-green-600">in session</span>
                        </div>
                    </div>
                    <div className="flex align-items-center justify-content-center bg-green-100 border-round" style={{ width: '34px', height: '34px' }}>
                        <i className="pi pi-calendar-plus text-green-600 text-sm" />
                    </div>
                </div>

                {/* Boys vs Girls */}
                <div className="col flex-1 surface-0 border-round p-2 px-3 shadow-1 border-left-3 border-pink-500 flex align-items-center justify-content-between" style={{ minHeight: '60px' }}>
                    <div>
                        <span className="text-xs text-500 font-semibold block uppercase" style={{ fontSize: '11px' }}>Gender Ratio</span>
                        <div className="text-base font-bold text-900">
                            <span className="text-blue-700">{summary.boysCount} Boys</span>
                            <span className="text-300 mx-1">/</span>
                            <span className="text-pink-600">{summary.girlsCount} Girls</span>
                        </div>
                    </div>
                    <div className="flex align-items-center justify-content-center bg-pink-100 border-round" style={{ width: '34px', height: '34px' }}>
                        <i className="pi pi-chart-pie text-pink-600 text-sm" />
                    </div>
                </div>

                {/* Active Classes */}
                <div className="col flex-1 surface-0 border-round p-2 px-3 shadow-1 border-left-3 border-orange-500 flex align-items-center justify-content-between" style={{ minHeight: '60px' }}>
                    <div>
                        <span className="text-xs text-500 font-semibold block uppercase" style={{ fontSize: '11px' }}>Enrolled Classes</span>
                        <div className="flex align-items-baseline gap-1">
                            <span className="text-xl font-bold text-orange-600">{summary.classWise?.length || classes.length}</span>
                            <span className="text-xs text-orange-500">classes</span>
                        </div>
                    </div>
                    <div className="flex align-items-center justify-content-center bg-orange-100 border-round" style={{ width: '34px', height: '34px' }}>
                        <i className="pi pi-sitemap text-orange-600 text-sm" />
                    </div>
                </div>
            </div>

            {/* Main Admission Register Card */}
            <Card className="shadow-1 border-round surface-0 p-2">
                {/* Unified Filter Toolbar with Dropdowns */}
                <div className="flex flex-wrap align-items-center justify-content-between gap-3 mb-3 p-3 surface-50 border-round border-1 border-200">
                    <div className="flex flex-wrap align-items-center gap-3">
                        {/* Academic Session Dropdown */}
                        <div style={{ width: '13rem' }}>
                            <span className="block text-xs font-bold text-600 mb-1">Academic Session:</span>
                            <Dropdown 
                                value={selectedYearId} 
                                options={academicYears} 
                                optionLabel="name" 
                                optionValue="id" 
                                onChange={(e) => { setSelectedYearId(e.value); setLazyParams(p => ({ ...p, first: 0, page: 0 })); }} 
                                placeholder="Select Session" 
                                className="w-full p-inputtext-sm"
                            />
                        </div>

                        {/* Class Dropdown (Enhanced with Student Counts) */}
                        <div style={{ width: '14rem' }}>
                            <span className="block text-xs font-bold text-600 mb-1">Filter by Class:</span>
                            <Dropdown 
                                value={selectedClassId} 
                                options={classDropdownOptions} 
                                optionLabel="label" 
                                optionValue="id" 
                                onChange={(e) => { setSelectedClassId(e.value); setSelectedSectionId(null); setLazyParams(p => ({ ...p, first: 0, page: 0 })); }} 
                                placeholder="All Classes" 
                                showClear 
                                className="w-full p-inputtext-sm"
                            />
                        </div>

                        {/* Section Dropdown */}
                        <div style={{ width: '11rem' }}>
                            <span className="block text-xs font-bold text-600 mb-1">Section:</span>
                            <Dropdown 
                                value={selectedSectionId} 
                                options={sections} 
                                optionLabel="name" 
                                optionValue="id" 
                                onChange={(e) => { setSelectedSectionId(e.value); setLazyParams(p => ({ ...p, first: 0, page: 0 })); }} 
                                placeholder="All Sections" 
                                showClear 
                                disabled={!selectedClassId}
                                className="w-full p-inputtext-sm"
                            />
                        </div>

                        {/* Reset Filters */}
                        {(selectedClassId || selectedSectionId || searchQuery) && (
                            <div className="pt-3">
                                <Button label="Reset" icon="pi pi-refresh" text size="small" onClick={resetFilters} />
                            </div>
                        )}
                    </div>

                    {/* Search box */}
                    <div className="flex align-items-center gap-2">
                        <span className="p-input-icon-left">
                            <i className="pi pi-search" />
                            <InputText 
                                value={searchQuery} 
                                onChange={(e) => setSearchQuery(e.target.value)} 
                                onKeyDown={onSearchTrigger}
                                placeholder="Search Name, Adm No, Mobile..." 
                                className="p-inputtext-sm" 
                                style={{ width: '250px' }}
                            />
                        </span>
                        <Button 
                            icon="pi pi-search" 
                            size="small"
                            onClick={() => { setLazyParams(p => ({ ...p, first: 0, page: 0 })); fetchStudents(); }} 
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
            </Card>
        </div>
    );
};

export default AdmissionRecordsPage;