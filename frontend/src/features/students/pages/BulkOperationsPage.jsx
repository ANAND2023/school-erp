import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Card } from 'primereact/card';
import { AppButton as Button } from '../../../components/common/AppButton';
import { FileUpload } from 'primereact/fileupload';
import { Toast } from 'primereact/toast';
import { TabView, TabPanel } from 'primereact/tabview';
import { ProgressBar } from 'primereact/progressbar';
import { Dialog } from 'primereact/dialog';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import * as XLSX from 'xlsx';
import { studentApi } from '../api';
import { classApi } from '../../masters/api';
import { AppSelect } from '../../../components/common';

export const BulkOperationsPage = () => {
    const toast = useRef(null);
    const [classes, setClasses] = useState([]);
    const [progressStatus, setProgressStatus] = useState({ visible: false, current: 0, total: 0, message: '' });
    const [confirmValidation, setConfirmValidation] = useState({ visible: false, validRows: [], errorList: [], uploaderInstance: null });

    // UI Bulk Edit State
    const [selectedClassId, setSelectedClassId] = useState(null);
    const [selectedSectionId, setSelectedSectionId] = useState(null);
    const [editStudents, setEditStudents] = useState([]);
    const [selectedStudents, setSelectedStudents] = useState(null);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Mass Apply State
    const [massApplyField, setMassApplyField] = useState('city');
    const [massApplyValue, setMassApplyValue] = useState('');
    const [bulkRemarks, setBulkRemarks] = useState('Bulk update via Bulk Operations');

    const genderOptions = [
        { label: 'Male', value: 'Male' },
        { label: 'Female', value: 'Female' },
        { label: 'Other', value: 'Other' }
    ];

    const bloodGroupOptions = [
        { label: 'A+', value: 'A+' },
        { label: 'A-', value: 'A-' },
        { label: 'B+', value: 'B+' },
        { label: 'B-', value: 'B-' },
        { label: 'O+', value: 'O+' },
        { label: 'O-', value: 'O-' },
        { label: 'AB+', value: 'AB+' },
        { label: 'AB-', value: 'AB-' }
    ];

    const massFields = [
        { label: 'City', value: 'city' },
        { label: 'State', value: 'state' },
        { label: 'Pincode', value: 'pincode' },
        { label: 'Blood Group', value: 'bloodGroup' },
        { label: 'Gender', value: 'gender' },
        { label: 'Address', value: 'address' },
        { label: 'Emergency Contact', value: 'emergencyContact' },
        { label: 'Father Mobile', value: 'fatherMobile' },
        { label: 'Mother Mobile', value: 'motherMobile' }
    ];

    const loadRefData = async () => {
        try {
            const res = await classApi.getClasses();
            if (res.data?.success) setClasses(res.data.data);
        } catch (e) {
            console.error('Failed to load classes', e);
        }
    };

    useEffect(() => { loadRefData(); }, []);

    const findClassAndSection = (className, sectionName) => {
        if (!className) return null;
        const cls = classes.find(c => c.name.trim().toLowerCase() === className.toString().trim().toLowerCase());
        if (!cls) return null;
        const sec = cls.sections?.find(s => s.name.trim().toLowerCase() === sectionName?.toString().trim().toLowerCase());
        return { classId: cls.id, sectionId: sec?.id };
    };

    // --- TAB 1: BULK ADMISSION (Excel) ---
    const downloadAdmitTemplate = () => {
        const ws = XLSX.utils.json_to_sheet([{
            FirstName: 'John', LastName: 'Doe', DateOfBirth: '2015-05-20', Gender: 'Male', BloodGroup: 'O+', AadhaarNo: '123456789012',
            ClassName: 'Class 1', SectionName: 'A', RollNo: 1, 
            Address: '123 Main St', City: 'Delhi', State: 'Delhi', Pincode: '110001', EmergencyContact: '9876543210',
            FatherName: 'Mark Doe', FatherMobile: '9876543210', FatherEmail: 'mark@example.com', FatherOccupation: 'Business', FatherIncome: 500000,
            MotherName: 'Jane Doe', MotherMobile: '', MotherEmail: '', MotherOccupation: 'Housewife', MotherIncome: 0
        }]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Admissions');
        XLSX.writeFile(wb, 'Bulk_Admission_Template.xlsx');
    };

    const executeBulkAdmission = async (dataToProcess, errorListToStart, uploaderInstance) => {
        setProgressStatus({ visible: true, current: 0, total: dataToProcess.length, message: 'Starting bulk admission...' });

        let successCount = 0;
        let errorCount = errorListToStart.length;
        const finalErrorList = [...errorListToStart];

        for (let i = 0; i < dataToProcess.length; i++) {
            const row = dataToProcess[i];
            setProgressStatus({ visible: true, current: i + 1, total: dataToProcess.length, message: `Admitting ${row.FirstName} ${row.LastName || ''}` });
            
            try {
                const mappedIds = findClassAndSection(row.ClassName, row.SectionName);
                if (!mappedIds || !mappedIds.sectionId) {
                    throw new Error(`Invalid Class or Section (${row.ClassName} - ${row.SectionName})`);
                }

                const guardians = [];
                if (row.FatherName) guardians.push({ Relation: 'Father', Name: row.FatherName, Mobile: row.FatherMobile?.toString() || '', Email: row.FatherEmail || '', Occupation: row.FatherOccupation || '', AnnualIncome: row.FatherIncome || 0, IsPrimary: true });
                if (row.MotherName) guardians.push({ Relation: 'Mother', Name: row.MotherName, Mobile: row.MotherMobile?.toString() || '', Email: row.MotherEmail || '', Occupation: row.MotherOccupation || '', AnnualIncome: row.MotherIncome || 0, IsPrimary: false });

                const payload = {
                    FirstName: row.FirstName,
                    LastName: row.LastName || '',
                    DateOfBirth: row.DateOfBirth ? new Date(row.DateOfBirth).toISOString() : new Date().toISOString(),
                    Gender: row.Gender || 'Male',
                    BloodGroup: row.BloodGroup || '',
                    AadhaarNo: row.AadhaarNo?.toString() || '',
                    ClassId: mappedIds.classId,
                    SectionId: mappedIds.sectionId,
                    RollNo: row.RollNo || null,
                    Address: row.Address || '',
                    City: row.City || '',
                    State: row.State || '',
                    Pincode: row.Pincode?.toString() || '',
                    EmergencyContact: row.EmergencyContact?.toString() || '',
                    Guardians: guardians
                };

                await studentApi.admitStudent(payload);
                successCount++;
            } catch (err) {
                console.error('Row failed:', row, err);
                errorCount++;
                const errorMsg = err.response?.data?.message || err.message;
                finalErrorList.push({ ...row, ErrorMessage: errorMsg });
            }
        }

        setProgressStatus({ visible: false, current: 0, total: 0, message: '' });
        toast.current.show({ severity: 'success', summary: 'Completed', detail: `Successfully admitted: ${successCount}, Failed: ${errorCount}` });
        
        if (finalErrorList.length > 0) {
            toast.current.show({ severity: 'warn', summary: 'Download Started', detail: 'Downloading list of failed rows...' });
            const wsErrors = XLSX.utils.json_to_sheet(finalErrorList);
            const wbErrors = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wbErrors, wsErrors, 'FailedRows');
            XLSX.writeFile(wbErrors, 'Failed_Admissions.xlsx');
        }
        
        if (uploaderInstance) uploaderInstance.options.clear();
    };

    const handleAdmitUpload = async (e) => {
        const file = e.files[0];
        const reader = new FileReader();
        reader.onload = async (evt) => {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(ws);

            if (data.length === 0) {
                toast.current.show({ severity: 'error', summary: 'Error', detail: 'File is empty' });
                return;
            }

            setProgressStatus({ visible: true, current: 0, total: data.length, message: 'Validating rows...' });

            const validRows = [];
            const errorList = [];

            for (let i = 0; i < data.length; i++) {
                const row = data[i];
                let rowError = null;

                const mappedIds = findClassAndSection(row.ClassName, row.SectionName);
                if (!mappedIds || !mappedIds.sectionId) {
                    rowError = `Invalid Class or Section (${row.ClassName} - ${row.SectionName})`;
                } else if (!row.FirstName || row.FirstName.toString().trim() === '') {
                    rowError = "First name is mandatory.";
                } else {
                    const fatherMobile = row.FatherMobile?.toString().trim();
                    const motherMobile = row.MotherMobile?.toString().trim();
                    if (!fatherMobile && !motherMobile) {
                        rowError = "At least one guardian with a valid mobile number is mandatory (BR-3.4).";
                    }
                }

                if (rowError) {
                    errorList.push({ ...row, ErrorMessage: rowError });
                } else {
                    validRows.push(row);
                }
            }

            setProgressStatus({ visible: false, current: 0, total: 0, message: '' });

            if (errorList.length > 0) {
                setConfirmValidation({ visible: true, validRows, errorList, uploaderInstance: e });
            } else {
                executeBulkAdmission(validRows, [], e);
            }
        };
        reader.readAsBinaryString(file);
    };

    // --- TAB 2: BULK EDIT STUDENTS (UI) ---
    const activeClass = classes.find(c => c.id === selectedClassId);
    const sections = activeClass?.sections || [];

    const fetchStudentsForEdit = async () => {
        if (!selectedClassId) return;
        setLoadingStudents(true);
        setSelectedStudents(null);
        setSearchTerm('');
        try {
            setProgressStatus({ visible: true, current: 0, total: 100, message: 'Fetching student list...' });
            const res = await studentApi.getStudents({ classId: selectedClassId, sectionId: selectedSectionId, limit: 1000 });
            if (res.data?.success) {
                const basicItems = res.data.data.items || [];
                const detailedItems = [];
                const batchSize = 10;

                for (let i = 0; i < basicItems.length; i += batchSize) {
                    const batch = basicItems.slice(i, i + batchSize);
                    setProgressStatus({ 
                        visible: true, 
                        current: Math.min(i + batch.length, basicItems.length), 
                        total: basicItems.length, 
                        message: `Loading details (${i + 1} - ${Math.min(i + batch.length, basicItems.length)} of ${basicItems.length})...` 
                    });

                    const batchResults = await Promise.all(batch.map(async (s) => {
                        let detail = {};
                        try {
                            const dRes = await studentApi.getStudentDetail(s.id);
                            if (dRes.data?.success) {
                                detail = dRes.data.data;
                            }
                        } catch (e) {
                            console.error('Failed to get student detail', e);
                        }

                        const father = detail.guardians?.find(g => g.relation === 'Father') || {};
                        const mother = detail.guardians?.find(g => g.relation === 'Mother') || {};
                        const currEnrollment = detail.currentEnrollment || detail.enrollmentHistory?.[0] || {};

                        const row = {
                            id: s.id,
                            admissionNo: detail.admissionNo || s.admissionNo || '',
                            firstName: detail.firstName || (s.fullName ? s.fullName.split(' ')[0] : '') || '',
                            lastName: detail.lastName || (s.fullName ? s.fullName.split(' ').slice(1).join(' ') : '') || '',
                            gender: detail.gender || s.gender || 'Male',
                            dateOfBirth: detail.dateOfBirth ? detail.dateOfBirth.split('T')[0] : (s.dateOfBirth ? s.dateOfBirth.split('T')[0] : ''),
                            bloodGroup: detail.bloodGroup || '',
                            aadhaarNo: detail.aadhaarNo || '',
                            address: detail.address || '',
                            city: detail.city || '',
                            state: detail.state || '',
                            pincode: detail.pincode || '',
                            emergencyContact: detail.emergencyContact || '',
                            fatherName: father.name || '',
                            fatherMobile: father.mobile || '',
                            motherName: mother.name || '',
                            motherMobile: mother.mobile || '',
                            rollNo: currEnrollment.rollNo ?? (s.rollNo ?? ''),
                            className: currEnrollment.className || s.className || '',
                            sectionName: currEnrollment.sectionName || s.sectionName || '',
                            _isDirty: false,
                            _dirtyFields: {},
                            _originalDetail: detail
                        };

                        row._originalValues = {
                            admissionNo: row.admissionNo,
                            firstName: row.firstName,
                            lastName: row.lastName,
                            gender: row.gender,
                            dateOfBirth: row.dateOfBirth,
                            bloodGroup: row.bloodGroup,
                            aadhaarNo: row.aadhaarNo,
                            address: row.address,
                            city: row.city,
                            state: row.state,
                            pincode: row.pincode,
                            emergencyContact: row.emergencyContact,
                            fatherName: row.fatherName,
                            fatherMobile: row.fatherMobile,
                            motherName: row.motherName,
                            motherMobile: row.motherMobile,
                            rollNo: row.rollNo
                        };

                        return row;
                    }));

                    detailedItems.push(...batchResults);
                }
                setEditStudents(detailedItems);
            }
        } catch (err) {
            toast.current.show({ severity: 'error', summary: 'Error', detail: 'Failed to fetch students' });
        } finally {
            setProgressStatus({ visible: false, current: 0, total: 0, message: '' });
            setLoadingStudents(false);
        }
    };

    // Fast inline cell edit tracker
    const onCellChange = (id, field, value) => {
        setEditStudents(prev => prev.map(s => {
            if (s.id !== id) return s;
            
            const origVal = s._originalValues ? s._originalValues[field] : (s._originalDetail?.[field] ?? s[field]);
            const isFieldDirty = String(value ?? '').trim() !== String(origVal ?? '').trim();
            
            const dirtyFields = { ...(s._dirtyFields || {}) };
            if (isFieldDirty) {
                dirtyFields[field] = true;
            } else {
                delete dirtyFields[field];
            }
            
            const isDirty = Object.keys(dirtyFields).length > 0;
            return {
                ...s,
                [field]: value,
                _dirtyFields: dirtyFields,
                _isDirty: isDirty
            };
        }));
    };

    // Revert all edits back to loaded state
    const resetAllChanges = () => {
        setEditStudents(prev => prev.map(s => {
            if (!s._originalValues) return s;
            return {
                ...s,
                ...s._originalValues,
                _dirtyFields: {},
                _isDirty: false
            };
        }));
        toast.current.show({ severity: 'info', summary: 'Reverted', detail: 'All unsaved modifications have been reset.' });
    };

    const applyMassChange = () => {
        if (!massApplyField || massApplyValue === undefined || massApplyValue === null) {
            toast.current.show({ severity: 'warn', summary: 'Missing Value', detail: 'Please select a field and value to apply.' });
            return;
        }
        if (!selectedStudents || selectedStudents.length === 0) {
            toast.current.show({ severity: 'warn', summary: 'No Selection', detail: 'Please select at least one row using the checkboxes.' });
            return;
        }

        const selectedIds = new Set(selectedStudents.map(s => s.id));
        setEditStudents(prev => prev.map(s => {
            if (!selectedIds.has(s.id)) return s;
            
            const origVal = s._originalValues ? s._originalValues[massApplyField] : (s._originalDetail?.[massApplyField] ?? s[massApplyField]);
            const isFieldDirty = String(massApplyValue ?? '').trim() !== String(origVal ?? '').trim();
            
            const dirtyFields = { ...(s._dirtyFields || {}) };
            if (isFieldDirty) {
                dirtyFields[massApplyField] = true;
            } else {
                delete dirtyFields[massApplyField];
            }
            
            return {
                ...s,
                [massApplyField]: massApplyValue,
                _dirtyFields: dirtyFields,
                _isDirty: Object.keys(dirtyFields).length > 0
            };
        }));

        setSelectedStudents(prev => (prev || []).map(s => ({
            ...s,
            [massApplyField]: massApplyValue,
            _isDirty: true
        })));

        toast.current.show({ 
            severity: 'success', 
            summary: 'Applied', 
            detail: `Applied "${massApplyValue}" to ${selectedStudents.length} selected row(s). Click Save to commit.` 
        });
    };

    const saveAllChanges = async () => {
        const dirtyRows = editStudents.filter(s => s._isDirty);
        if (dirtyRows.length === 0) {
            toast.current.show({ severity: 'info', summary: 'No Changes', detail: 'No modifications to save.' });
            return;
        }

        setProgressStatus({ visible: true, current: 0, total: dirtyRows.length, message: 'Saving changes...' });
        let successCount = 0; 
        let errorCount = 0;
        const errorList = [];

        for (let i = 0; i < dirtyRows.length; i++) {
            const newData = dirtyRows[i];
            setProgressStatus({ visible: true, current: i + 1, total: dirtyRows.length, message: `Saving ${newData.firstName}...` });

            try {
                const fullProfile = newData._originalDetail || {};
                const currEnrollment = fullProfile.currentEnrollment || fullProfile.enrollmentHistory?.[0] || {};

                // Reconstruct Guardians
                const updatedGuardians = (fullProfile.guardians || []).map(g => {
                    if (g.relation === 'Father') return { ...g, name: newData.fatherName, mobile: newData.fatherMobile };
                    if (g.relation === 'Mother') return { ...g, name: newData.motherName, mobile: newData.motherMobile };
                    return g;
                });
                if (!updatedGuardians.find(g => g.relation === 'Father') && newData.fatherName) {
                    updatedGuardians.push({ Relation: 'Father', Name: newData.fatherName, Mobile: newData.fatherMobile, IsPrimary: true });
                }
                if (!updatedGuardians.find(g => g.relation === 'Mother') && newData.motherName) {
                    updatedGuardians.push({ Relation: 'Mother', Name: newData.motherName, Mobile: newData.motherMobile, IsPrimary: false });
                }

                let classId = currEnrollment.classId || fullProfile.classId || selectedClassId;
                let sectionId = currEnrollment.sectionId || fullProfile.sectionId || selectedSectionId;

                const mappedIds = findClassAndSection(newData.className, newData.sectionName);
                if (mappedIds && mappedIds.classId) {
                    classId = mappedIds.classId;
                    sectionId = mappedIds.sectionId;
                }

                const updatePayload = {
                    FirstName: (newData.firstName || '').trim().toUpperCase(),
                    LastName: (newData.lastName || '').trim().toUpperCase(),
                    DateOfBirth: newData.dateOfBirth ? new Date(newData.dateOfBirth).toISOString() : fullProfile.dateOfBirth,
                    Gender: newData.gender || fullProfile.gender || 'Male',
                    AdmissionNo: (newData.admissionNo || fullProfile.admissionNo || '').trim(),
                    AdmissionDate: fullProfile.admissionDate || null,
                    BloodGroup: newData.bloodGroup || null,
                    AadhaarNo: newData.aadhaarNo || null,
                    CategoryId: fullProfile.categoryId || null,
                    ReligionId: fullProfile.religionId || null,
                    ClassId: classId,
                    SectionId: sectionId,
                    RollNo: newData.rollNo !== '' && newData.rollNo !== null ? Number(newData.rollNo) : (currEnrollment.rollNo || null),
                    Address: newData.address || null,
                    City: newData.city || null,
                    State: newData.state || null,
                    Pincode: newData.pincode || null,
                    EmergencyContact: newData.emergencyContact || null,
                    Status: currEnrollment.status || 1,
                    Remarks: (bulkRemarks || '').trim() || 'Bulk update via Bulk Operations',
                    Guardians: updatedGuardians
                };

                await studentApi.updateStudent(newData.id, updatePayload);
                successCount++;

                // Reset dirty status locally for this student and update original values
                setEditStudents(prev => prev.map(s => {
                    if (s.id !== newData.id) return s;
                    const newOrigValues = {
                        ...s._originalValues,
                        admissionNo: newData.admissionNo,
                        firstName: newData.firstName,
                        lastName: newData.lastName,
                        gender: newData.gender,
                        dateOfBirth: newData.dateOfBirth,
                        bloodGroup: newData.bloodGroup,
                        aadhaarNo: newData.aadhaarNo,
                        address: newData.address,
                        city: newData.city,
                        state: newData.state,
                        pincode: newData.pincode,
                        emergencyContact: newData.emergencyContact,
                        fatherName: newData.fatherName,
                        fatherMobile: newData.fatherMobile,
                        motherName: newData.motherName,
                        motherMobile: newData.motherMobile,
                        rollNo: newData.rollNo
                    };
                    return {
                        ...s,
                        _isDirty: false,
                        _dirtyFields: {},
                        _originalValues: newOrigValues
                    };
                }));
            } catch (err) {
                console.error('Save row error:', err);
                errorCount++;
                const errorMsg = err.response?.data?.message || err.message;
                errorList.push({ ...newData, ErrorMessage: errorMsg });
            }
        }

        setProgressStatus({ visible: false, current: 0, total: 0, message: '' });
        
        if (successCount > 0) {
            toast.current.show({ severity: 'success', summary: 'Saved Successfully', detail: `Updated ${successCount} student record(s).` });
        }
        
        if (errorCount > 0) {
            toast.current.show({ severity: 'error', summary: 'Save Errors', detail: `Failed to update ${errorCount} student(s). See downloaded report.` });
            const cleanErrorList = errorList.map(item => {
                const { _originalDetail, _originalValues, _dirtyFields, ...rest } = item;
                return rest;
            });
            const wsErrors = XLSX.utils.json_to_sheet(cleanErrorList);
            const wbErrors = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wbErrors, wsErrors, 'FailedUpdates');
            XLSX.writeFile(wbErrors, 'Failed_Updates.xlsx');
        }
    };

    // Filter students inside grid
    const filteredStudents = useMemo(() => {
        if (!searchTerm.trim()) return editStudents;
        const term = searchTerm.trim().toLowerCase();
        return editStudents.filter(s => 
            (s.admissionNo && s.admissionNo.toLowerCase().includes(term)) ||
            (s.firstName && s.firstName.toLowerCase().includes(term)) ||
            (s.lastName && s.lastName.toLowerCase().includes(term)) ||
            (s.rollNo !== null && s.rollNo !== undefined && String(s.rollNo).includes(term)) ||
            (s.fatherMobile && s.fatherMobile.includes(term)) ||
            (s.city && s.city.toLowerCase().includes(term))
        );
    }, [editStudents, searchTerm]);

    const dirtyCount = useMemo(() => editStudents.filter(s => s._isDirty).length, [editStudents]);

    // --- Cell Renderers (Row-wise and Column-wise Open Inputs) ---
    const renderAdmNoCell = (rowData) => {
        const isDirty = rowData._dirtyFields?.['admissionNo'];
        return (
            <div className="relative w-full">
                <InputText 
                    value={rowData.admissionNo ?? ''} 
                    onChange={(e) => onCellChange(rowData.id, 'admissionNo', e.target.value)} 
                    placeholder="Adm No"
                    className="w-full p-inputtext-sm font-semibold" 
                    style={{ 
                        minHeight: '34px', 
                        fontSize: '13px',
                        backgroundColor: isDirty ? '#fefce8' : '#eff6ff',
                        borderColor: isDirty ? '#f59e0b' : '#bfdbfe',
                        color: isDirty ? '#92400e' : '#1e40af'
                    }}
                />
                {isDirty && (
                    <span 
                        title={`Original: ${rowData._originalValues?.admissionNo || 'empty'}`}
                        style={{
                            position: 'absolute',
                            top: '-3px',
                            right: '3px',
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            backgroundColor: '#f59e0b'
                        }}
                    />
                )}
            </div>
        );
    };

    const renderTextCell = (rowData, field, placeholder, isNumber = false) => {
        const isDirty = rowData._dirtyFields?.[field];
        return (
            <div className="relative w-full">
                <InputText 
                    type={isNumber ? "number" : "text"}
                    value={rowData[field] ?? ''} 
                    onChange={(e) => onCellChange(rowData.id, field, e.target.value)} 
                    placeholder={placeholder}
                    className="w-full p-inputtext-sm" 
                    style={{ 
                        minHeight: '34px', 
                        fontSize: '13px',
                        backgroundColor: isDirty ? '#fefce8' : '#ffffff',
                        borderColor: isDirty ? '#f59e0b' : '#cbd5e1',
                        color: isDirty ? '#92400e' : '#1e293b',
                        fontWeight: isDirty ? '600' : 'normal'
                    }}
                />
                {isDirty && (
                    <span 
                        title={`Original: ${rowData._originalValues?.[field] || 'empty'}`}
                        style={{
                            position: 'absolute',
                            top: '-3px',
                            right: '3px',
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            backgroundColor: '#f59e0b'
                        }}
                    />
                )}
            </div>
        );
    };
    
    const renderDateCell = (rowData, field) => {
        const isDirty = rowData._dirtyFields?.[field];
        return (
            <div className="relative w-full">
                <InputText 
                    type="date" 
                    value={rowData[field] || ''} 
                    onChange={(e) => onCellChange(rowData.id, field, e.target.value)} 
                    className="w-full p-inputtext-sm" 
                    style={{ 
                        minHeight: '34px', 
                        fontSize: '13px',
                        backgroundColor: isDirty ? '#fefce8' : '#ffffff',
                        borderColor: isDirty ? '#f59e0b' : '#cbd5e1'
                    }} 
                />
                {isDirty && (
                    <span 
                        title={`Original: ${rowData._originalValues?.[field] || 'empty'}`}
                        style={{
                            position: 'absolute',
                            top: '-3px',
                            right: '3px',
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            backgroundColor: '#f59e0b'
                        }}
                    />
                )}
            </div>
        );
    };

    const renderGenderCell = (rowData) => {
        const isDirty = rowData._dirtyFields?.['gender'];
        const currentVal = (rowData.gender || 'Male').toLowerCase() === 'female' ? 'Female' : 'Male';
        return (
            <Dropdown 
                value={currentVal} 
                options={genderOptions} 
                onChange={(e) => onCellChange(rowData.id, 'gender', e.value)} 
                className="w-full p-inputtext-sm" 
                style={{ 
                    minHeight: '34px', 
                    fontSize: '13px',
                    backgroundColor: isDirty ? '#fefce8' : '#ffffff',
                    borderColor: isDirty ? '#f59e0b' : '#cbd5e1'
                }} 
            />
        );
    };

    const renderBloodGroupCell = (rowData) => {
        const isDirty = rowData._dirtyFields?.['bloodGroup'];
        return (
            <Dropdown 
                value={rowData.bloodGroup || ''} 
                options={bloodGroupOptions} 
                onChange={(e) => onCellChange(rowData.id, 'bloodGroup', e.value)} 
                className="w-full p-inputtext-sm" 
                placeholder="Select" 
                style={{ 
                    minHeight: '34px', 
                    fontSize: '13px',
                    backgroundColor: isDirty ? '#fefce8' : '#ffffff',
                    borderColor: isDirty ? '#f59e0b' : '#cbd5e1'
                }} 
            />
        );
    };

    const renderClassBadge = (rowData) => {
        return (
            <div className="flex align-items-center">
                <span className="px-2 py-1 bg-bluegray-50 text-700 border-round font-medium text-xs whitespace-nowrap">
                    {rowData.className || '—'} {rowData.sectionName ? `(${rowData.sectionName})` : ''}
                </span>
            </div>
        );
    };

    const renderIndexCell = (rowData, options) => {
        const isDirty = rowData._isDirty;
        return (
            <div className="flex align-items-center justify-content-center">
                {isDirty ? (
                    <span 
                        title="Modified student"
                        className="inline-flex align-items-center justify-content-center border-round font-bold text-xs" 
                        style={{ width: '24px', height: '24px', backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #f59e0b' }}
                    >
                        {options.rowIndex + 1}
                    </span>
                ) : (
                    <span className="text-500 font-medium text-sm">{options.rowIndex + 1}</span>
                )}
            </div>
        );
    };

    return (
        <div className="p-3">
            <Toast ref={toast} />
            
            <TabView>
                <TabPanel header="UI Bulk Edit Students">
                    <Card>
                        {/* Filter Bar */}
                        <div className="flex flex-wrap gap-3 mb-4 align-items-center p-3 surface-100 border-round">
                            <div style={{ width: '14rem' }}>
                                <AppSelect 
                                    label="Class"
                                    value={selectedClassId} 
                                    options={classes} 
                                    optionLabel="name" 
                                    optionValue="id" 
                                    onChange={(e) => { setSelectedClassId(e.value); setSelectedSectionId(null); }} 
                                    placeholder="Select Class" 
                                />
                            </div>
                            <div style={{ width: '14rem' }}>
                                <AppSelect 
                                    label="Section (Optional)"
                                    value={selectedSectionId} 
                                    options={sections} 
                                    optionLabel="name" 
                                    optionValue="id" 
                                    onChange={(e) => setSelectedSectionId(e.value)} 
                                    placeholder="All Sections" 
                                />
                            </div>
                            <Button label="Load Students" icon="pi pi-search" onClick={fetchStudentsForEdit} loading={loadingStudents} />
                        </div>

                        {/* Interactive Grid & Mass Operations */}
                        {editStudents.length > 0 && (
                            <div className="card p-fluid">
                                {/* Action & Toolbar */}
                                <div className="flex flex-wrap align-items-center justify-content-between gap-3 mb-3 p-3 surface-50 border-1 border-200 border-round shadow-1">
                                    <div className="flex flex-wrap align-items-center gap-2">
                                        <Button 
                                            label={`Save All Changes (${dirtyCount})`} 
                                            icon="pi pi-check" 
                                            onClick={saveAllChanges} 
                                            severity="success" 
                                            disabled={dirtyCount === 0} 
                                            className="font-bold"
                                        />
                                        {dirtyCount > 0 && (
                                            <Button 
                                                label="Reset Changes" 
                                                icon="pi pi-undo" 
                                                onClick={resetAllChanges} 
                                                severity="secondary" 
                                                outlined 
                                            />
                                        )}
                                        <div className="flex align-items-center gap-2 ml-2">
                                            <span className="text-xs font-bold text-600 uppercase">Remarks:</span>
                                            <InputText 
                                                value={bulkRemarks} 
                                                onChange={(e) => setBulkRemarks(e.target.value)} 
                                                placeholder="Reason for change (required)" 
                                                className="p-inputtext-sm"
                                                style={{ width: '220px', fontSize: '13px' }}
                                            />
                                        </div>
                                        <div className="ml-2 flex align-items-center gap-2">
                                            <span className="text-xs text-500 font-semibold">Total: <b>{editStudents.length}</b></span>
                                            {dirtyCount > 0 && (
                                                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 border-round font-bold text-xs">
                                                    {dirtyCount} unsaved
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-wrap align-items-center gap-2">
                                        <span className="p-input-icon-left">
                                            <i className="pi pi-search" />
                                            <InputText 
                                                value={searchTerm} 
                                                onChange={(e) => setSearchTerm(e.target.value)} 
                                                placeholder="Filter in table..." 
                                                className="p-inputtext-sm" 
                                                style={{ width: '150px', fontSize: '13px' }}
                                            />
                                        </span>
                                        
                                        <div className="flex align-items-center gap-2 border-left-1 border-300 pl-2">
                                            <span className="font-semibold text-xs text-700">Apply to Selected ({selectedStudents?.length || 0}):</span>
                                            <Dropdown 
                                                value={massApplyField} 
                                                options={massFields} 
                                                onChange={(e) => setMassApplyField(e.value)} 
                                                placeholder="Select Field"
                                                className="p-inputtext-sm" 
                                                style={{ width: '130px', fontSize: '13px' }}
                                            />
                                            {massApplyField === 'gender' ? (
                                                <Dropdown 
                                                    value={massApplyValue} 
                                                    options={genderOptions} 
                                                    onChange={(e) => setMassApplyValue(e.value)} 
                                                    placeholder="Select" 
                                                    className="p-inputtext-sm" 
                                                    style={{ width: '110px', fontSize: '13px' }}
                                                />
                                            ) : massApplyField === 'bloodGroup' ? (
                                                <Dropdown 
                                                    value={massApplyValue} 
                                                    options={bloodGroupOptions} 
                                                    onChange={(e) => setMassApplyValue(e.value)} 
                                                    placeholder="Select" 
                                                    className="p-inputtext-sm" 
                                                    style={{ width: '110px', fontSize: '13px' }}
                                                />
                                            ) : (
                                                <InputText 
                                                    value={massApplyValue} 
                                                    onChange={(e) => setMassApplyValue(e.target.value)} 
                                                    placeholder="Value..." 
                                                    className="p-inputtext-sm" 
                                                    style={{ width: '120px', fontSize: '13px' }}
                                                />
                                            )}
                                            <Button 
                                                label="Apply" 
                                                icon="pi pi-copy" 
                                                onClick={applyMassChange} 
                                                disabled={!selectedStudents || selectedStudents.length === 0} 
                                                className="p-button-sm"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Row-wise and Column-wise Open Input Grid */}
                                <DataTable 
                                    value={filteredStudents} 
                                    dataKey="id" 
                                    selection={selectedStudents} 
                                    onSelectionChange={(e) => setSelectedStudents(e.value)} 
                                    size="small" 
                                    stripedRows 
                                    scrollable 
                                    scrollHeight="620px" 
                                    className="p-datatable-sm" 
                                    emptyMessage="No students found"
                                    responsiveLayout="scroll"
                                >
                                    <Column selectionMode="multiple" headerStyle={{ width: '3rem', minWidth: '3rem' }} frozen></Column>
                                    <Column header="#" body={renderIndexCell} headerStyle={{ width: '3.5rem', minWidth: '3.5rem', textAlign: 'center' }} style={{ textAlign: 'center' }} frozen></Column>
                                    <Column field="admissionNo" header="Adm No *" body={renderAdmNoCell} headerStyle={{ minWidth: '160px', width: '160px' }} frozen></Column>
                                    <Column field="firstName" header="First Name *" body={(data) => renderTextCell(data, 'firstName', 'First Name')} headerStyle={{ minWidth: '150px', width: '150px' }} frozen></Column>
                                    <Column field="lastName" header="Last Name" body={(data) => renderTextCell(data, 'lastName', 'Last Name')} headerStyle={{ minWidth: '150px', width: '150px' }}></Column>
                                    <Column field="rollNo" header="Roll No" body={(data) => renderTextCell(data, 'rollNo', 'Roll No', true)} headerStyle={{ minWidth: '95px', width: '95px' }}></Column>
                                    <Column field="className" header="Class" body={renderClassBadge} headerStyle={{ minWidth: '110px', width: '110px' }}></Column>
                                    <Column field="gender" header="Gender" body={renderGenderCell} headerStyle={{ minWidth: '120px', width: '120px' }}></Column>
                                    <Column field="dateOfBirth" header="DOB" body={(data) => renderDateCell(data, 'dateOfBirth')} headerStyle={{ minWidth: '150px', width: '150px' }}></Column>
                                    <Column field="bloodGroup" header="Blood" body={renderBloodGroupCell} headerStyle={{ minWidth: '110px', width: '110px' }}></Column>
                                    <Column field="aadhaarNo" header="Aadhaar" body={(data) => renderTextCell(data, 'aadhaarNo', 'Aadhaar')} headerStyle={{ minWidth: '150px', width: '150px' }}></Column>
                                    <Column field="address" header="Address" body={(data) => renderTextCell(data, 'address', 'Address')} headerStyle={{ minWidth: '200px', width: '200px' }}></Column>
                                    <Column field="city" header="City" body={(data) => renderTextCell(data, 'city', 'City')} headerStyle={{ minWidth: '130px', width: '130px' }}></Column>
                                    <Column field="state" header="State" body={(data) => renderTextCell(data, 'state', 'State')} headerStyle={{ minWidth: '130px', width: '130px' }}></Column>
                                    <Column field="pincode" header="Pincode" body={(data) => renderTextCell(data, 'pincode', 'Pincode')} headerStyle={{ minWidth: '110px', width: '110px' }}></Column>
                                    <Column field="emergencyContact" header="Emerg. Contact" body={(data) => renderTextCell(data, 'emergencyContact', 'Emerg. Contact')} headerStyle={{ minWidth: '140px', width: '140px' }}></Column>
                                    <Column field="fatherName" header="Father Name" body={(data) => renderTextCell(data, 'fatherName', 'Father Name')} headerStyle={{ minWidth: '150px', width: '150px' }}></Column>
                                    <Column field="fatherMobile" header="Father Mobile" body={(data) => renderTextCell(data, 'fatherMobile', 'Mobile')} headerStyle={{ minWidth: '140px', width: '140px' }}></Column>
                                    <Column field="motherName" header="Mother Name" body={(data) => renderTextCell(data, 'motherName', 'Mother Name')} headerStyle={{ minWidth: '150px', width: '150px' }}></Column>
                                    <Column field="motherMobile" header="Mother Mobile" body={(data) => renderTextCell(data, 'motherMobile', 'Mobile')} headerStyle={{ minWidth: '140px', width: '140px' }}></Column>
                                </DataTable>
                            </div>
                        )}
                    </Card>
                </TabPanel>

                <TabPanel header="Bulk Admission (Excel Upload)">
                    <Card>
                        <p className="mb-4 text-700">Download the Excel template, fill in the comprehensive student admission data, and upload it back here. The system will process rows sequentially.</p>
                        <Button label="Download Admission Template" icon="pi pi-download" severity="info" onClick={downloadAdmitTemplate} className="mb-4" />
                        
                        <div className="card mt-2">
                            <FileUpload name="admissions" accept=".xlsx, .xls" maxFileSize={5000000} customUpload uploadHandler={handleAdmitUpload} emptyTemplate={<p className="m-0">Drag and drop the filled admission Excel file here.</p>} chooseLabel="Select Filled Excel" uploadLabel="Start Bulk Admission" />
                        </div>
                    </Card>
                </TabPanel>
            </TabView>

            <Dialog visible={progressStatus.visible} closable={false} showHeader={false} modal style={{ width: '400px' }}>
                <div className="p-4 text-center">
                    <h3 className="mb-3">Processing...</h3>
                    <ProgressBar value={Math.round((progressStatus.current / (progressStatus.total || 1)) * 100)}></ProgressBar>
                    <p className="mt-3 text-sm text-600">{progressStatus.message}</p>
                    <p className="text-xs font-bold">{progressStatus.current} of {progressStatus.total} Rows</p>
                </div>
            </Dialog>

            <Dialog header="Validation Errors Found" visible={confirmValidation.visible} style={{ width: '500px' }} modal onHide={() => setConfirmValidation({ visible: false, validRows: [], errorList: [], uploaderInstance: null })}>
                <div className="p-3">
                    <i className="pi pi-exclamation-triangle text-orange-500 mb-3" style={{ fontSize: '2rem' }}></i>
                    <p>We found errors in <b>{confirmValidation.errorList?.length}</b> row(s).</p>
                    <p>Would you like to skip the invalid rows and import the <b>{confirmValidation.validRows?.length}</b> valid rows, or cancel and download the error report?</p>
                </div>
                <div className="flex justify-content-end gap-2 mt-4">
                    <Button label="Cancel & Download Errors" icon="pi pi-times" severity="danger" outlined onClick={() => {
                        toast.current.show({ severity: 'warn', summary: 'Download Started', detail: 'Downloading list of failed rows...' });
                        const wsErrors = XLSX.utils.json_to_sheet(confirmValidation.errorList);
                        const wbErrors = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(wbErrors, wsErrors, 'FailedRows');
                        XLSX.writeFile(wbErrors, 'Failed_Admissions.xlsx');
                        if (confirmValidation.uploaderInstance) confirmValidation.uploaderInstance.options.clear();
                        setConfirmValidation({ visible: false, validRows: [], errorList: [], uploaderInstance: null });
                    }} />
                    <Button label="Skip Errors & Import Valid" icon="pi pi-check" severity="success" onClick={() => {
                        const { validRows, errorList, uploaderInstance } = confirmValidation;
                        setConfirmValidation({ visible: false, validRows: [], errorList: [], uploaderInstance: null });
                        executeBulkAdmission(validRows, errorList, uploaderInstance);
                    }} />
                </div>
            </Dialog>
        </div>
    );
};

export default BulkOperationsPage;