import React, { useState, useRef, useEffect } from 'react';
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
import { AppSelect, AppInput } from '../../../components/common';

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
    
    // Mass Edit State
    const [isEditMode, setIsEditMode] = useState(false);
    const [massApplyField, setMassApplyField] = useState('');
    const [massApplyValue, setMassApplyValue] = useState('');
    const [bulkRemarks, setBulkRemarks] = useState('Bulk update via Bulk Operations');

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
        setIsEditMode(false);
        setSelectedStudents(null);
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
                        try {
                            const dRes = await studentApi.getStudentDetail(s.id);
                            if (dRes.data?.success) {
                                const detail = dRes.data.data;
                                const father = detail.guardians?.find(g => g.relation === 'Father') || {};
                                const mother = detail.guardians?.find(g => g.relation === 'Mother') || {};
                                const currentEnrollment = detail.enrollments?.find(en => en.academicYearId === detail.academicYearId) || {};
                                
                                return {
                                    ...s,
                                    admissionNo: detail.admissionNo || s.admissionNo || '',
                                    firstName: detail.firstName || (s.fullName ? s.fullName.split(' ')[0] : '') || '',
                                    lastName: detail.lastName || (s.fullName ? s.fullName.split(' ').slice(1).join(' ') : '') || '',
                                    dateOfBirth: detail.dateOfBirth ? detail.dateOfBirth.split('T')[0] : '',
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
                                    rollNo: currentEnrollment.rollNo ?? (s.rollNo ?? ''),
                                    className: currentEnrollment.className || s.className || '',
                                    sectionName: currentEnrollment.sectionName || s.sectionName || '',
                                    _isDirty: false,
                                    _originalDetail: detail
                                };
                            }
                        } catch (e) {
                            console.error('Failed to get student detail', e);
                        }
                        return {
                            ...s,
                            admissionNo: s.admissionNo || '',
                            firstName: s.fullName ? s.fullName.split(' ')[0] : '',
                            lastName: s.fullName ? s.fullName.split(' ').slice(1).join(' ') : '',
                            _isDirty: false,
                            _originalDetail: {}
                        };
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

    const applyMassChange = () => {
        if (!massApplyField || massApplyValue === undefined || massApplyValue === null) return;
        if (!selectedStudents || selectedStudents.length === 0) {
            toast.current.show({ severity: 'warn', summary: 'No Selection', detail: 'Please select at least one row using the checkboxes to apply changes.' });
            return;
        }

        const selectedIds = new Set(selectedStudents.map(s => s.id));
        setEditStudents(prev => prev.map(s => {
            if (selectedIds.has(s.id)) {
                return { ...s, [massApplyField]: massApplyValue, _isDirty: true };
            }
            return s;
        }));

        setSelectedStudents(prev => prev.map(s => ({ ...s, [massApplyField]: massApplyValue, _isDirty: true })));

        toast.current.show({ severity: 'info', summary: 'Applied', detail: `Applied ${massApplyValue} to ${selectedStudents.length} rows.` });
    };

    const onCellChange = (id, field, value) => {
        setEditStudents(prev => prev.map(s => s.id === id ? { ...s, [field]: value, _isDirty: true } : s));
    };

    const saveAllChanges = async () => {
        const dirtyRows = editStudents.filter(s => s._isDirty);
        if (dirtyRows.length === 0) {
            toast.current.show({ severity: 'info', summary: 'No Changes', detail: 'No modifications to save.' });
            return;
        }

        setProgressStatus({ visible: true, current: 0, total: dirtyRows.length, message: 'Saving changes...' });
        let successCount = 0; let errorCount = 0;
        const errorList = [];

        for (let i = 0; i < dirtyRows.length; i++) {
            const newData = dirtyRows[i];
            setProgressStatus({ visible: true, current: i + 1, total: dirtyRows.length, message: `Saving ${newData.firstName}...` });

            try {
                const fullProfile = newData._originalDetail;
                const currentEnrollment = fullProfile.enrollments?.find(en => en.academicYearId === fullProfile.academicYearId);

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

                let classId = currentEnrollment?.classId;
                let sectionId = currentEnrollment?.sectionId;

                const mappedIds = findClassAndSection(newData.className, newData.sectionName);
                if (mappedIds && mappedIds.classId) {
                    classId = mappedIds.classId;
                    sectionId = mappedIds.sectionId;
                }

                const updatePayload = {
                    FirstName: (newData.firstName || '').trim().toUpperCase(),
                    LastName: (newData.lastName || '').trim().toUpperCase(),
                    DateOfBirth: newData.dateOfBirth ? new Date(newData.dateOfBirth).toISOString() : fullProfile.dateOfBirth,
                    Gender: newData.gender || 'Male',
                    AdmissionNo: (newData.admissionNo || fullProfile.admissionNo || '').trim(),
                    AdmissionDate: fullProfile.admissionDate || null,
                    BloodGroup: newData.bloodGroup,
                    AadhaarNo: newData.aadhaarNo,
                    CategoryId: fullProfile.categoryId,
                    ReligionId: fullProfile.religionId,
                    ClassId: classId,
                    SectionId: sectionId,
                    RollNo: newData.rollNo !== '' && newData.rollNo !== null ? Number(newData.rollNo) : (currentEnrollment?.rollNo || null),
                    Address: newData.address,
                    City: newData.city,
                    State: newData.state,
                    Pincode: newData.pincode,
                    EmergencyContact: newData.emergencyContact,
                    Status: currentEnrollment?.status || 1,
                    Remarks: (bulkRemarks || '').trim() || 'Bulk update via Bulk Operations',
                    Guardians: updatedGuardians
                };

                await studentApi.updateStudent(newData.id, updatePayload);
                successCount++;
            } catch (err) {
                console.error('Save row error:', err);
                errorCount++;
                const errorMsg = err.response?.data?.message || err.message;
                errorList.push({ ...newData, ErrorMessage: errorMsg });
            }
        }

        setProgressStatus({ visible: false, current: 0, total: 0, message: '' });
        toast.current.show({ severity: 'success', summary: 'Saved', detail: `Successfully updated: ${successCount}, Failed: ${errorCount}` });
        
        if (errorList.length > 0) {
            toast.current.show({ severity: 'warn', summary: 'Download Started', detail: 'Downloading list of failed updates...' });
            const cleanErrorList = errorList.map(item => {
                const { _originalDetail, ...rest } = item;
                return rest;
            });
            const wsErrors = XLSX.utils.json_to_sheet(cleanErrorList);
            const wbErrors = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wbErrors, wsErrors, 'FailedUpdates');
            XLSX.writeFile(wbErrors, 'Failed_Updates.xlsx');
        }
        
        // Reset dirty states locally rather than reloading completely to save API calls
        setEditStudents(prev => prev.map(s => ({...s, _isDirty: false})));
        setIsEditMode(false);
    };

    const textCell = (rowData, options) => {
        const field = options.field;
        const val = rowData[field] ?? '';
        if (!isEditMode) {
            return <div className={rowData._isDirty ? "text-primary font-bold" : ""}>{val !== '' ? val : '—'}</div>;
        }
        return (
            <InputText 
                value={val} 
                onChange={(e) => onCellChange(rowData.id, field, e.target.value)} 
                className="w-full p-inputtext-sm" 
                style={{ minHeight: '34px', fontSize: '13px' }}
            />
        );
    };

    const admissionNoCell = (rowData, options) => {
        const field = options.field;
        const val = rowData[field] ?? '';
        if (!isEditMode) {
            return (
                <span className={`px-2 py-1 border-round font-bold text-xs ${rowData._isDirty ? 'bg-primary-50 text-primary-700 border-1 border-primary-200' : 'bg-blue-50 text-blue-800'}`}>
                    {val || '—'}
                </span>
            );
        }
        return (
            <InputText 
                value={val} 
                onChange={(e) => onCellChange(rowData.id, field, e.target.value)} 
                placeholder="Adm No"
                className="w-full p-inputtext-sm font-semibold" 
                style={{ minHeight: '34px', fontSize: '13px' }}
            />
        );
    };
    
    const dateCell = (rowData, options) => {
        const field = options.field;
        if (!isEditMode) return <div className={rowData._isDirty ? "text-primary font-bold" : ""}>{rowData[field] || '—'}</div>;
        return <InputText type="date" value={rowData[field] || ''} onChange={(e) => onCellChange(rowData.id, field, e.target.value)} className="w-full p-inputtext-sm" style={{ minHeight: '34px', fontSize: '13px' }} />;
    };

    const genderCell = (rowData, options) => {
        const field = options.field;
        if (!isEditMode) return <div className={rowData._isDirty ? "text-primary font-bold" : ""}>{rowData[field] || '—'}</div>;
        return <Dropdown value={rowData[field]} options={[{label:'Male',value:'Male'},{label:'Female',value:'Female'}]} onChange={(e) => onCellChange(rowData.id, field, e.value)} className="w-full p-inputtext-sm" placeholder="Select" style={{ minHeight: '34px', fontSize: '13px' }} />;
    };

    const bloodGroupCell = (rowData, options) => {
        const field = options.field;
        const bgs = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
        if (!isEditMode) return <div className={rowData._isDirty ? "text-primary font-bold" : ""}>{rowData[field] || '—'}</div>;
        return <Dropdown value={rowData[field]} options={bgs} onChange={(e) => onCellChange(rowData.id, field, e.value)} className="w-full p-inputtext-sm" placeholder="Select" style={{ minHeight: '34px', fontSize: '13px' }} />;
    };

    const massFields = [
        { label: 'Admission No', value: 'admissionNo' },
        { label: 'First Name', value: 'firstName' },
        { label: 'Last Name', value: 'lastName' },
        { label: 'Roll Number', value: 'rollNo' },
        { label: 'Gender', value: 'gender' },
        { label: 'Blood Group', value: 'bloodGroup' },
        { label: 'City', value: 'city' },
        { label: 'State', value: 'state' },
        { label: 'Pincode', value: 'pincode' },
        { label: 'Address', value: 'address' },
        { label: 'Emergency Contact', value: 'emergencyContact' },
    ];

    return (
        <div className="p-3">
            <Toast ref={toast} />
            
            <TabView>
                <TabPanel header="UI Bulk Edit Students">
                    <Card>
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
                                    disabled={isEditMode}
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
                                    disabled={isEditMode}
                                />
                            </div>
                            <Button label="Load Students" icon="pi pi-search" onClick={fetchStudentsForEdit} loading={loadingStudents} disabled={isEditMode} />
                        </div>

                        {editStudents.length > 0 && (
                            <div className="card p-fluid">
                                <div className="flex flex-wrap align-items-center justify-content-between mb-3 p-3 bg-blue-50 border-round">
                                    <div className="flex align-items-center gap-3">
                                        {!isEditMode ? (
                                            <Button label="Enable Mass Edit" icon="pi pi-pencil" onClick={() => setIsEditMode(true)} severity="warning" />
                                        ) : (
                                            <>
                                                <Button 
                                                    label={`Save All Changes (${editStudents.filter(s => s._isDirty).length})`} 
                                                    icon="pi pi-save" 
                                                    onClick={saveAllChanges} 
                                                    severity="success" 
                                                    disabled={editStudents.filter(s => s._isDirty).length === 0} 
                                                />
                                                <Button label="Cancel" icon="pi pi-times" onClick={() => { setIsEditMode(false); fetchStudentsForEdit(); }} severity="secondary" text />
                                            </>
                                        )}
                                    </div>
                                    
                                    {isEditMode && (
                                        <div className="flex flex-wrap align-items-center gap-2">
                                            <span className="font-bold text-sm">Apply to Selected ({selectedStudents?.length || 0}):</span>
                                            <div style={{ width: '13rem' }}>
                                                <AppSelect 
                                                    label="Select Field"
                                                    value={massApplyField} 
                                                    options={massFields} 
                                                    onChange={(e) => setMassApplyField(e.value)} 
                                                />
                                            </div>
                                            <div style={{ width: '13rem' }}>
                                                <AppInput 
                                                    label="Value to apply..."
                                                    value={massApplyValue} 
                                                    onChange={(e) => setMassApplyValue(e.target.value)} 
                                                />
                                            </div>
                                            <Button label="Apply" icon="pi pi-check" onClick={applyMassChange} />
                                        </div>
                                    )}
                                </div>

                                <DataTable value={editStudents} dataKey="id" selection={selectedStudents} onSelectionChange={(e) => setSelectedStudents(e.value)} size="small" stripedRows scrollable scrollHeight="600px" className="p-datatable-sm" emptyMessage="No students found">
                                    <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} frozen></Column>
                                    <Column field="admissionNo" header="Adm No" body={admissionNoCell} style={{ minWidth: '140px' }} frozen></Column>
                                    <Column field="firstName" header="First Name" body={textCell} style={{ minWidth: '150px' }} frozen></Column>
                                    <Column field="lastName" header="Last Name" body={textCell} style={{ minWidth: '150px' }} frozen></Column>
                                    
                                    <Column field="className" header="Class" body={textCell} style={{ minWidth: '80px' }}></Column>
                                    <Column field="sectionName" header="Sec" body={textCell} style={{ minWidth: '80px' }}></Column>
                                    <Column field="rollNo" header="Roll No" body={textCell} style={{ minWidth: '80px' }}></Column>
                                    <Column field="gender" header="Gender" body={genderCell} style={{ minWidth: '120px' }}></Column>
                                    <Column field="dateOfBirth" header="DOB" body={dateCell} style={{ minWidth: '150px' }}></Column>
                                    <Column field="bloodGroup" header="Blood" body={bloodGroupCell} style={{ minWidth: '120px' }}></Column>
                                    <Column field="aadhaarNo" header="Aadhaar" body={textCell} style={{ minWidth: '150px' }}></Column>
                                    <Column field="address" header="Address" body={textCell} style={{ minWidth: '200px' }}></Column>
                                    <Column field="city" header="City" body={textCell} style={{ minWidth: '150px' }}></Column>
                                    <Column field="state" header="State" body={textCell} style={{ minWidth: '150px' }}></Column>
                                    <Column field="pincode" header="Pincode" body={textCell} style={{ minWidth: '120px' }}></Column>
                                    <Column field="emergencyContact" header="Emerg. Contact" body={textCell} style={{ minWidth: '150px' }}></Column>
                                    <Column field="fatherName" header="Father Name" body={textCell} style={{ minWidth: '150px' }}></Column>
                                    <Column field="fatherMobile" header="Father Mobile" body={textCell} style={{ minWidth: '150px' }}></Column>
                                    <Column field="motherName" header="Mother Name" body={textCell} style={{ minWidth: '150px' }}></Column>
                                    <Column field="motherMobile" header="Mother Mobile" body={textCell} style={{ minWidth: '150px' }}></Column>
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
