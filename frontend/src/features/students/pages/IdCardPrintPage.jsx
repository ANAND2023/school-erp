import React, { useState, useEffect, useRef } from 'react';
import { Card } from 'primereact/card';
import { AppButton as Button } from '../../../components/common/AppButton';
import { InputText } from 'primereact/inputtext';
import { Toast } from 'primereact/toast';
import { Checkbox } from 'primereact/checkbox';
import { classApi, branchApi } from '../../masters/api';
import { useAuthStore } from '../../../store/authStore';
import { studentApi } from '../api';
import { AppSelect } from '../../../components/common';

export const IdCardPrintPage = () => {
    const { user } = useAuthStore();
    const toast = useRef(null);
    const [classes, setClasses] = useState([]);
    const [selectedClassId, setSelectedClassId] = useState(null);
    const [selectedSectionId, setSelectedSectionId] = useState(null);
    const [students, setStudents] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStudentIds, setSelectedStudentIds] = useState([]);
    const [printSide, setPrintSide] = useState('both');
    const [loading, setLoading] = useState(false);

    const [frontConfig, setFrontConfig] = useState(null);
    const [backConfig, setBackConfig] = useState(null);

    useEffect(() => {
        // Clear obsolete global items
        localStorage.removeItem('id_card_front');
        localStorage.removeItem('id_card_back');

        const loadBranchTemplate = async () => {
            try {
                const res = await branchApi.getIdCardTemplate();
                if (res.data?.success && res.data?.data) {
                    const data = res.data.data;
                    const bId = data.branchId || user?.branchId || 1;
                    const scopedFrontKey = `id_card_front_${bId}`;
                    const scopedBackKey = `id_card_back_${bId}`;

                    let front = null;
                    let back = null;

                    if (data.frontConfig) {
                        try { front = JSON.parse(data.frontConfig); } catch (e) {}
                    }
                    if (data.backConfig) {
                        try { back = JSON.parse(data.backConfig); } catch (e) {}
                    }

                    if (!front) {
                        const localF = localStorage.getItem(scopedFrontKey);
                        if (localF) try { front = JSON.parse(localF); } catch (e) {}
                    }
                    if (!back) {
                        const localB = localStorage.getItem(scopedBackKey);
                        if (localB) try { back = JSON.parse(localB); } catch (e) {}
                    }

                    if (front) setFrontConfig(front);
                    if (back) setBackConfig(back);
                }
            } catch (e) {
                console.error('Failed to load ID card template for print', e);
            }
        };

        loadBranchTemplate();
        loadRefData();
    }, [user?.branchId]);

    const loadRefData = async () => {
        try {
            const res = await classApi.getClasses();
            if (res.data?.success) setClasses(res.data.data);
        } catch (e) {
            console.error('Failed to load classes', e);
        }
    };

    const fetchStudents = async () => {
        if (!selectedClassId) return;
        setLoading(true);
        try {
            const res = await studentApi.getStudents({ classId: selectedClassId, sectionId: selectedSectionId, limit: 1000 });
            if (res.data?.success) {
                // Fetch full detail to get father name, DOB etc since list only gives basic
                const basicItems = res.data.data.items;
                const detailedItems = [];
                for (let s of basicItems) {
                    try {
                        const dRes = await studentApi.getStudentDetail(s.id);
                        if (dRes.data?.success) {
                            const detail = dRes.data.data;
                            const father = detail.guardians?.find(g => g.relation === 'Father') || {};
                            const mother = detail.guardians?.find(g => g.relation === 'Mother') || {};
                            detailedItems.push({
                                ...s,
                                firstName: detail.firstName || s.fullName.split(' ')[0] || '',
                                lastName: detail.lastName || s.fullName.split(' ').slice(1).join(' ') || '',
                                dateOfBirth: detail.dateOfBirth ? new Date(detail.dateOfBirth).toLocaleDateString('en-IN') : '',
                                address: detail.address || '',
                                phone: detail.emergencyContact || father.mobile || mother.mobile || '',
                                fatherName: father.name || '',
                                motherName: mother.name || '',
                                admissionNo: detail.admissionNo || ''
                            });
                        }
                    } catch(e) { detailedItems.push(s); }
                }
                setStudents(detailedItems);
                setSelectedStudentIds(detailedItems.map(s => s.id));
            }
        } catch (err) {
            toast.current.show({ severity: 'error', summary: 'Error', detail: 'Failed to fetch students' });
        } finally {
            setLoading(false);
        }
    };

    const activeClass = classes.find(c => c.id === selectedClassId);
    const sections = activeClass?.sections || [];

    const filteredStudents = students.filter(s => {
        if (searchQuery && !s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) && !s.admissionNo?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    const toggleSelectAll = (e) => {
        if (e.checked) setSelectedStudentIds(filteredStudents.map(s => s.id));
        else setSelectedStudentIds([]);
    };

    const toggleStudent = (id) => {
        if (selectedStudentIds.includes(id)) setSelectedStudentIds(selectedStudentIds.filter(x => x !== id));
        else setSelectedStudentIds([...selectedStudentIds, id]);
    };

    const handlePrint = () => {
        window.print();
    };

    const renderCard = (student, config) => {
        if (!config) return null;
        const isHorizontal = config.orientation === 'horizontal';
        const cardWidth = isHorizontal ? '86mm' : '54mm';
        const cardHeight = isHorizontal ? '54mm' : '86mm';
        const baseW = isHorizontal ? 330 : 210;
        const baseH = isHorizontal ? 210 : 330;

        return (
            <div className="id-card-render" style={{
                width: cardWidth, height: cardHeight, position: 'relative',
                backgroundImage: `url(${config.bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center',
                backgroundColor: '#fff', border: '1px solid #ccc', boxSizing: 'border-box', overflow: 'hidden',
                pageBreakInside: 'avoid'
            }}>
                {config.elements.map(el => {
                    let val = el.text;
                    if (el.field === 'studentName') val = student.fullName;
                    if (el.field === 'classSection') val = `${student.className || ''} - ${student.sectionName || ''}`;
                    if (el.field === 'fatherName') val = student.fatherName;
                    if (el.field === 'motherName') val = student.motherName;
                    if (el.field === 'phone') val = student.phone;
                    if (el.field === 'dob') val = student.dateOfBirth;
                    if (el.field === 'address') val = student.address;
                    if (el.field === 'admissionNo') val = student.admissionNo;

                    return (
                        <div key={el.id} style={{
                            position: 'absolute', 
                            left: `${(el.x / baseW) * (isHorizontal ? 86 : 54)}mm`, 
                            top: `${(el.y / baseH) * (isHorizontal ? 54 : 86)}mm`,
                            fontSize: `${(el.fontSize / baseW) * (isHorizontal ? 86 : 54)}mm`, 
                            color: `#${el.color}`, fontWeight: el.fontWeight,
                            width: el.isPhoto ? `${(el.width / baseW) * (isHorizontal ? 86 : 54)}mm` : 'auto',
                            height: el.isPhoto ? `${(el.height / baseH) * (isHorizontal ? 54 : 86)}mm` : 'auto',
                            display: 'flex', alignItems: 'center', justifyContent: el.isPhoto ? 'center' : 'flex-start',
                            whiteSpace: 'nowrap', lineHeight: 1
                        }}>
                            {el.isPhoto ? (
                                student.photoUrl ? <img src={student.photoUrl} alt="student" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : <div style={{ width: '100%', height: '100%', backgroundColor: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3mm' }}>PHOTO</div>
                            ) : (
                                <>{el.prefix && <span style={{marginRight: '2px'}}>{el.prefix}</span>}{val}</>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    const isHorizontalMode = 
        (printSide === 'front' && frontConfig?.orientation === 'horizontal') || 
        (printSide === 'back' && backConfig?.orientation === 'horizontal') || 
        (printSide === 'both' && (frontConfig?.orientation === 'horizontal' || backConfig?.orientation === 'horizontal'));

    return (
        <div className="p-3 print-wrapper">
            <style>{`
                @media print {
                    @page { size: ${isHorizontalMode ? 'A4 portrait' : 'A4 landscape'}; margin: 0; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff; margin: 0; padding: 0; }
                    
                    body * {
                        visibility: hidden;
                    }
                    
                    .print-wrapper, .print-wrapper * {
                        visibility: visible;
                    }
                    
                    .print-wrapper {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100vw !important;
                        height: 100vh !important;
                        margin: 0 !important;
                        padding: 2mm !important;
                        box-sizing: border-box !important;
                    }

                    .no-print, .no-print * { display: none !important; }
                    .id-cards-grid { 
                        display: flex !important; 
                        flex-wrap: wrap !important;
                        gap: 1mm !important; 
                        justify-content: flex-start !important; 
                        align-content: flex-start !important;
                    }
                }
            `}</style>

            <Toast ref={toast} />
            <div className="no-print">
                <h2 className="text-xl font-bold mb-4" style={{ color: '#1e293b' }}>Print ID Cards</h2>
                
                <Card className="mb-4">
                    <div className="flex flex-wrap gap-3 align-items-center mb-3">
                        <div style={{ width: '12rem' }}>
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
                        <div style={{ width: '12rem' }}>
                            <AppSelect 
                                label="Section"
                                value={selectedSectionId} 
                                options={sections} 
                                optionLabel="name" 
                                optionValue="id" 
                                onChange={(e) => setSelectedSectionId(e.value)} 
                                placeholder="All Sections" 
                            />
                        </div>
                        <div style={{ width: '12rem' }}>
                            <AppSelect 
                                label="Print Sides"
                                value={printSide} 
                                options={[{label: 'Front Only', value: 'front'}, {label: 'Back Only', value: 'back'}, {label: 'Both Sides', value: 'both'}]} 
                                onChange={(e) => setPrintSide(e.value)} 
                            />
                        </div>
                        
                        <div className="relative flex align-items-center ml-auto">
                            <i className="pi pi-search text-400 pointer-events-none" style={{ left: '0.5rem', position: 'absolute', top: '50%', transform: 'translateY(-50%)', fontSize: '10px' }} />
                            <InputText 
                                value={searchQuery} 
                                onChange={(e) => setSearchQuery(e.target.value)} 
                                placeholder="Search Name/Adm..." 
                                className="p-inputtext-sm"
                                style={{ width: '160px', height: '28px', fontSize: '11px', paddingLeft: '1.8rem', paddingTop: '0', paddingBottom: '0', borderRadius: '4px', boxShadow: 'none' }}
                            />
                        </div>
                        <Button label="Fetch" icon="pi pi-search" onClick={fetchStudents} loading={loading} />
                        <Button label={`PRINT (${selectedStudentIds.length})`} icon="pi pi-print" onClick={handlePrint} severity="success" disabled={selectedStudentIds.length === 0} />
                    </div>

                    {filteredStudents.length > 0 && (
                        <div className="flex align-items-center gap-2 mt-3 p-2 surface-100 border-round">
                            <Checkbox inputId="cb-all" checked={selectedStudentIds.length === filteredStudents.length} onChange={toggleSelectAll} />
                            <label htmlFor="cb-all" className="font-bold cursor-pointer">Select All ({filteredStudents.length} shown)</label>
                        </div>
                    )}
                </Card>

                {filteredStudents.length > 0 && (
                    <div className="mb-4">
                        <h4 className="mb-2">Select Students to Print</h4>
                        <div className="flex flex-wrap gap-3">
                            {filteredStudents.map(s => (
                                <div key={s.id} className="flex align-items-center gap-2 p-2 border-1 surface-border border-round">
                                    <Checkbox inputId={`cb-${s.id}`} checked={selectedStudentIds.includes(s.id)} onChange={() => toggleStudent(s.id)} />
                                    <label htmlFor={`cb-${s.id}`} className="cursor-pointer text-sm">{s.fullName} ({s.className}-{s.sectionName})</label>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Print Grid */}
            <div className="id-cards-grid flex flex-wrap gap-3">
                {filteredStudents.filter(s => selectedStudentIds.includes(s.id)).map(student => {
                    return (
                        <React.Fragment key={student.id}>
                            {(printSide === 'front' || printSide === 'both') && renderCard(student, frontConfig)}
                            {(printSide === 'back' || printSide === 'both') && renderCard(student, backConfig)}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};

export default IdCardPrintPage;