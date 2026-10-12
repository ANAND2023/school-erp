import React, { useState, useEffect, useRef } from 'react';
import { Card } from 'primereact/card';
import { AppButton as Button } from '../../../components/common/AppButton';
import { ColorPicker } from 'primereact/colorpicker';
import { Toast } from 'primereact/toast';
import { TabView, TabPanel } from 'primereact/tabview';
import { InputNumber } from 'primereact/inputnumber';
import { AppSelect, AppInput } from '../../../components/common';
import { branchApi } from '../../masters/api';
import { useAuthStore } from '../../../store/authStore';

const AVAILABLE_FIELDS = [
    { label: 'Student Name', value: 'studentName' },
    { label: 'Class & Section', value: 'classSection' },
    { label: 'Father Name', value: 'fatherName' },
    { label: 'Mother Name', value: 'motherName' },
    { label: 'Phone', value: 'phone' },
    { label: 'DOB', value: 'dob' },
    { label: 'Address', value: 'address' },
    { label: 'Student Photo', value: 'photo' },
    { label: 'Admission No', value: 'admissionNo' },
    { label: 'Static Text', value: 'staticText' }
];

const createDefaultTemplate = (branch) => {
    const schoolTitle = branch?.schoolName || branch?.name || 'School Name';
    const address = branch?.address ? `${branch.address}${branch.city ? ', ' + branch.city : ''}` : '';
    const phone = branch?.phone ? `Ph: ${branch.phone}` : '';

    return {
        bgImage: '',
        orientation: 'vertical',
        elements: [
            {
                id: 'school_title',
                field: 'staticText',
                label: 'School Name',
                x: 10, y: 15,
                fontSize: 12, color: '1e3a8a', fontWeight: 'bold',
                text: schoolTitle.toUpperCase(),
                width: 190, height: 20, isPhoto: false, prefix: ''
            },
            ...(address ? [{
                id: 'school_address',
                field: 'staticText',
                label: 'Address',
                x: 10, y: 35,
                fontSize: 7, color: '475569', fontWeight: 'normal',
                text: address,
                width: 190, height: 16, isPhoto: false, prefix: ''
            }] : []),
            ...(phone ? [{
                id: 'school_phone',
                field: 'staticText',
                label: 'Contact',
                x: 10, y: 50,
                fontSize: 7, color: '64748b', fontWeight: 'normal',
                text: phone,
                width: 190, height: 14, isPhoto: false, prefix: ''
            }] : []),
            {
                id: 'std_photo',
                field: 'photo',
                label: 'Student Photo',
                x: 135, y: 75,
                fontSize: 10, color: '000000', fontWeight: 'normal',
                text: 'PHOTO',
                width: 60, height: 75, isPhoto: true, prefix: ''
            },
            {
                id: 'std_name',
                field: 'studentName',
                label: 'Student Name',
                x: 15, y: 80,
                fontSize: 10, color: '0f172a', fontWeight: 'bold',
                text: '[Student Name]',
                width: 110, height: 18, isPhoto: false, prefix: 'Name:'
            },
            {
                id: 'std_class',
                field: 'classSection',
                label: 'Class & Section',
                x: 15, y: 105,
                fontSize: 9, color: '334155', fontWeight: 'normal',
                text: '[Class & Sec]',
                width: 110, height: 18, isPhoto: false, prefix: 'Class:'
            },
            {
                id: 'std_adm',
                field: 'admissionNo',
                label: 'Admission No',
                x: 15, y: 130,
                fontSize: 9, color: '334155', fontWeight: 'normal',
                text: '[Admission No]',
                width: 110, height: 18, isPhoto: false, prefix: 'Adm No:'
            },
            {
                id: 'std_father',
                field: 'fatherName',
                label: 'Father Name',
                x: 15, y: 155,
                fontSize: 9, color: '334155', fontWeight: 'normal',
                text: '[Father Name]',
                width: 110, height: 18, isPhoto: false, prefix: 'Father:'
            },
            {
                id: 'std_dob',
                field: 'dob',
                label: 'DOB',
                x: 15, y: 180,
                fontSize: 9, color: '334155', fontWeight: 'normal',
                text: '[Date of Birth]',
                width: 110, height: 18, isPhoto: false, prefix: 'DOB:'
            },
            {
                id: 'std_phone',
                field: 'phone',
                label: 'Phone',
                x: 15, y: 205,
                fontSize: 9, color: '334155', fontWeight: 'normal',
                text: '[Phone]',
                width: 110, height: 18, isPhoto: false, prefix: 'Phone:'
            },
            {
                id: 'std_principal',
                field: 'staticText',
                label: 'Principal Signature',
                x: 130, y: 285,
                fontSize: 8, color: '475569', fontWeight: 'bold',
                text: 'Principal Sign',
                width: 70, height: 16, isPhoto: false, prefix: ''
            }
        ]
    };
};

const createDefaultBackTemplate = (branch) => {
    return {
        bgImage: '',
        orientation: 'vertical',
        elements: [
            {
                id: 'back_inst_title',
                field: 'staticText',
                label: 'Instructions',
                x: 15, y: 20,
                fontSize: 10, color: '1e3a8a', fontWeight: 'bold',
                text: 'INSTRUCTIONS',
                width: 180, height: 18, isPhoto: false, prefix: ''
            },
            {
                id: 'back_inst_1',
                field: 'staticText',
                label: 'Instruction 1',
                x: 15, y: 45,
                fontSize: 8, color: '334155', fontWeight: 'normal',
                text: '1. This card must be carried daily.',
                width: 180, height: 16, isPhoto: false, prefix: ''
            },
            {
                id: 'back_inst_2',
                field: 'staticText',
                label: 'Instruction 2',
                x: 15, y: 65,
                fontSize: 8, color: '334155', fontWeight: 'normal',
                text: '2. In case of loss, inform school immediately.',
                width: 180, height: 16, isPhoto: false, prefix: ''
            },
            {
                id: 'std_address',
                field: 'address',
                label: 'Address',
                x: 15, y: 95,
                fontSize: 8, color: '334155', fontWeight: 'normal',
                text: '[Residential Address]',
                width: 180, height: 30, isPhoto: false, prefix: 'Address:'
            }
        ]
    };
};

export const IdCardDesignPage = () => {
    const toast = useRef(null);
    const { user } = useAuthStore();
    const [activeTab, setActiveTab] = useState(0);
    const [branchInfo, setBranchInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [frontConfig, setFrontConfig] = useState({ bgImage: '', orientation: 'vertical', elements: [] });
    const [backConfig, setBackConfig] = useState({ bgImage: '', orientation: 'vertical', elements: [] });
    const [selectedElementId, setSelectedElementId] = useState(null);
    const [selectedFieldToAdd, setSelectedFieldToAdd] = useState(null);

    // Draggable logic
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    useEffect(() => {
        // Clear obsolete global items so foreign backgrounds never leak across schools
        localStorage.removeItem('id_card_front');
        localStorage.removeItem('id_card_back');

        const loadBranchAndTemplate = async () => {
            try {
                setLoading(true);
                const res = await branchApi.getIdCardTemplate();
                if (res.data?.success && res.data?.data) {
                    const data = res.data.data;
                    setBranchInfo(data);
                    const bId = data.branchId || user?.branchId || 1;
                    const scopedFrontKey = `id_card_front_${bId}`;
                    const scopedBackKey = `id_card_back_${bId}`;

                    let front = null;
                    let back = null;

                    // 1. Try backend config
                    if (data.frontConfig) {
                        try { front = JSON.parse(data.frontConfig); } catch (e) {}
                    }
                    if (data.backConfig) {
                        try { back = JSON.parse(data.backConfig); } catch (e) {}
                    }

                    // 2. Fallback to branch-scoped localStorage
                    if (!front) {
                        const localF = localStorage.getItem(scopedFrontKey);
                        if (localF) try { front = JSON.parse(localF); } catch (e) {}
                    }
                    if (!back) {
                        const localB = localStorage.getItem(scopedBackKey);
                        if (localB) try { back = JSON.parse(localB); } catch (e) {}
                    }

                    // 3. Fallback to fresh school-specific default template
                    if (!front) {
                        front = createDefaultTemplate(data);
                    }
                    if (!back) {
                        back = createDefaultBackTemplate(data);
                    }

                    setFrontConfig({ orientation: 'vertical', ...front });
                    setBackConfig({ orientation: 'vertical', ...back });
                }
            } catch (err) {
                console.error('Failed to load ID card template', err);
                const fallbackData = {
                    schoolName: user?.schoolName || 'School Name',
                    branchName: user?.branchName || 'Main Campus',
                    branchId: user?.branchId || 1,
                    address: user?.schoolAddress || '',
                    phone: user?.schoolPhone || ''
                };
                setBranchInfo(fallbackData);
                setFrontConfig(createDefaultTemplate(fallbackData));
                setBackConfig(createDefaultBackTemplate(fallbackData));
            } finally {
                setLoading(false);
            }
        };

        loadBranchAndTemplate();
    }, [user?.branchId]);

    const saveConfig = async () => {
        try {
            setSaving(true);
            const bId = branchInfo?.branchId || user?.branchId || 1;
            const scopedFrontKey = `id_card_front_${bId}`;
            const scopedBackKey = `id_card_back_${bId}`;

            // Save to branch-scoped localStorage
            localStorage.setItem(scopedFrontKey, JSON.stringify(frontConfig));
            localStorage.setItem(scopedBackKey, JSON.stringify(backConfig));

            // Save to Backend Database
            await branchApi.saveIdCardTemplate({
                frontConfig: JSON.stringify(frontConfig),
                backConfig: JSON.stringify(backConfig)
            });

            toast.current.show({
                severity: 'success',
                summary: 'Saved',
                detail: `ID Card Template saved for ${branchInfo?.schoolName || 'School'}!`
            });
        } catch (err) {
            console.error('Error saving template:', err);
            toast.current.show({
                severity: 'success',
                summary: 'Saved Locally',
                detail: 'Template saved in browser storage for this branch.'
            });
        } finally {
            setSaving(false);
        }
    };

    const currentConfig = activeTab === 0 ? frontConfig : backConfig;
    const setCurrentConfig = activeTab === 0 ? setFrontConfig : setBackConfig;

    const isHorizontal = currentConfig.orientation === 'horizontal';
    const canvasWidth = isHorizontal ? 330 : 210;
    const canvasHeight = isHorizontal ? 210 : 330;

    const handleBgUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (evt) => setCurrentConfig(prev => ({ ...prev, bgImage: evt.target.result }));
            reader.readAsDataURL(file);
        }
    };

    const addElement = (fieldValue) => {
        if (!fieldValue) return;
        const fieldObj = AVAILABLE_FIELDS.find(f => f.value === fieldValue);
        if (!fieldObj) return;
        
        const newEl = {
            id: Date.now().toString(),
            field: fieldObj.value,
            label: fieldObj.label,
            x: 20, y: 20,
            fontSize: 10, color: '000000', fontWeight: 'normal',
            text: fieldObj.value === 'staticText' ? 'Double click to edit' : `[${fieldObj.label}]`,
            width: fieldObj.value === 'photo' ? 50 : 100,
            height: fieldObj.value === 'photo' ? 65 : 20,
            isPhoto: fieldObj.value === 'photo',
            prefix: ''
        };
        setCurrentConfig(prev => ({ ...prev, elements: [...prev.elements, newEl] }));
        setSelectedElementId(newEl.id);
        setSelectedFieldToAdd(null);
    };

    const updateSelectedElement = (updates) => {
        if (!selectedElementId) return;
        setCurrentConfig(prev => ({
            ...prev,
            elements: prev.elements.map(el => el.id === selectedElementId ? { ...el, ...updates } : el)
        }));
    };

    const deleteSelectedElement = () => {
        if (!selectedElementId) return;
        setCurrentConfig(prev => ({
            ...prev,
            elements: prev.elements.filter(el => el.id !== selectedElementId)
        }));
        setSelectedElementId(null);
    };

    const handleMouseDown = (e, el) => {
        e.stopPropagation();
        setSelectedElementId(el.id);
        setIsDragging(true);
        const rect = e.currentTarget.getBoundingClientRect();
        setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    const handleMouseMove = (e) => {
        if (!isDragging || !selectedElementId) return;
        const container = document.getElementById('canvas-container');
        if (!container) return;
        const rect = container.getBoundingClientRect();
        let newX = e.clientX - rect.left - dragOffset.x;
        let newY = e.clientY - rect.top - dragOffset.y;
        
        // Boundaries
        newX = Math.max(0, Math.min(newX, canvasWidth - 20));
        newY = Math.max(0, Math.min(newY, canvasHeight - 20));

        updateSelectedElement({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const renderCanvas = () => {
        const selectedEl = currentConfig.elements.find(e => e.id === selectedElementId);

        return (
            <div className="flex flex-wrap lg:flex-nowrap gap-6 mt-2 h-full">
                {/* Canvas Side - Fixed */}
                <div className="flex-none" style={{ minWidth: '350px' }}>
                    <div 
                        id="canvas-container"
                        style={{
                            width: `${canvasWidth}px`, height: `${canvasHeight}px`, border: '1px solid #cbd5e1', position: 'relative',
                            backgroundImage: currentConfig.bgImage ? `url(${currentConfig.bgImage})` : 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center', backgroundColor: '#fff', overflow: 'hidden',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                            borderRadius: '6px'
                        }}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onClick={(e) => {
                            if (e.target.id === 'canvas-container') {
                                setSelectedElementId(null);
                            }
                        }}
                    >
                        {currentConfig.elements.map(el => (
                            <div
                                key={el.id}
                                onMouseDown={(e) => handleMouseDown(e, el)}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedElementId(el.id);
                                }}
                                style={{
                                    position: 'absolute', left: el.x, top: el.y,
                                    fontSize: `${el.fontSize}px`, color: el.color?.startsWith('#') ? el.color : `#${el.color}`,
                                    fontWeight: el.fontWeight, width: el.isPhoto ? el.width : 'auto',
                                    height: el.isPhoto ? el.height : 'auto',
                                    border: selectedElementId === el.id ? '1px dashed #ef4444' : (el.isPhoto ? '1px solid #cbd5e1' : 'none'),
                                    cursor: 'move', backgroundColor: el.isPhoto ? '#e2e8f0' : 'transparent',
                                    display: 'flex', alignItems: 'center', justifyContent: el.isPhoto ? 'center' : 'flex-start',
                                    userSelect: 'none', whiteSpace: 'nowrap', lineHeight: 1,
                                    borderRadius: el.isPhoto ? '4px' : '0'
                                }}
                            >
                                {el.isPhoto ? (
                                    <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>PHOTO</span>
                                ) : (
                                    <>{el.prefix && <span style={{ marginRight: '4px', fontWeight: 600 }}>{el.prefix}</span>}{el.text}</>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Settings Side - Scrollable General Options */}
                <div className="flex-1 flex flex-column gap-3 bg-gray-50 p-3 border-round overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)', minWidth: '250px' }}>
                    <div className="p-fluid">
                        <AppSelect 
                            label="Orientation"
                            value={currentConfig.orientation || 'vertical'} 
                            options={[{label:'Vertical (Portrait)', value:'vertical'}, {label:'Horizontal (Landscape)', value:'horizontal'}]} 
                            onChange={(e) => setCurrentConfig(prev => ({...prev, orientation: e.value}))} 
                        />
                    </div>

                    <div className="p-fluid">
                        <label className="font-bold text-sm block mb-1">Upload Background</label>
                        <input type="file" accept="image/*" onChange={handleBgUpload} className="p-inputtext p-component p-2 text-sm" />
                        {currentConfig.bgImage ? (
                            <div className="mt-2">
                                <Button label="Clear Background" icon="pi pi-trash" severity="danger" outlined size="small" onClick={() => setCurrentConfig(prev => ({...prev, bgImage: ''}))} />
                            </div>
                        ) : (
                            <small className="text-500 block mt-1">Default background is active for this school. Upload an image if you have a custom card design.</small>
                        )}
                    </div>

                    <div className="p-fluid">
                        <AppSelect 
                            label="Add Field"
                            value={selectedFieldToAdd} 
                            options={AVAILABLE_FIELDS} 
                            onChange={e => addElement(e.value)} 
                            placeholder="Select a field to add"
                            addon={<i className="pi pi-plus" />}
                            onAddonClick={() => addElement(selectedFieldToAdd)}
                        />
                    </div>
                    
                    <div className="mt-auto pt-3 border-top-1 surface-border">
                        <Button 
                            label={saving ? "Saving..." : "Save All Templates"} 
                            icon="pi pi-save" 
                            severity="success" 
                            loading={saving}
                            onClick={saveConfig} 
                            className="w-full" 
                            size="large" 
                        />
                    </div>
                </div>

                {/* Edit Selected Item Column */}
                <div className="flex-1 flex flex-column bg-gray-50 p-4 border-round overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)', minWidth: '250px' }}>
                    {selectedEl ? (
                        <div className="flex flex-column gap-3 h-full">
                            <h4 className="m-0 text-primary">Edit Selected: {selectedEl.label}</h4>
                            
                            {selectedEl.field === 'staticText' && (
                                <div className="p-fluid mt-2">
                                    <AppInput 
                                        label="Static Text Content"
                                        value={selectedEl.text} 
                                        onChange={e => updateSelectedElement({ text: e.target.value })} 
                                    />
                                </div>
                            )}

                            {!selectedEl.isPhoto && selectedEl.field !== 'staticText' && (
                                <div className="p-fluid mt-2">
                                    <AppInput 
                                        label='Prefix (e.g. "Name: ")'
                                        value={selectedEl.prefix || ''} 
                                        onChange={e => updateSelectedElement({ prefix: e.target.value })} 
                                    />
                                </div>
                            )}

                            <div className="flex align-items-end gap-3 mt-2">
                                <div className="p-fluid" style={{ width: '80px' }}>
                                    <label className="text-sm block mb-1">Size</label>
                                    <InputNumber value={selectedEl.fontSize} onValueChange={e => updateSelectedElement({ fontSize: e.value })} min={6} max={48} inputClassName="p-inputtext-sm p-2" />
                                </div>
                                <div>
                                    <label className="text-sm block mb-1">Color</label>
                                    <ColorPicker value={selectedEl.color} onChange={e => updateSelectedElement({ color: e.value })} />
                                </div>
                                <div className="ml-auto">
                                    <label className="text-sm block mb-1">Bold</label>
                                    <Button 
                                        icon={selectedEl.fontWeight === 'bold' ? 'pi pi-check' : 'pi pi-times'} 
                                        severity={selectedEl.fontWeight === 'bold' ? 'success' : 'secondary'}
                                        onClick={() => updateSelectedElement({ fontWeight: selectedEl.fontWeight === 'bold' ? 'normal' : 'bold' })} 
                                        rounded
                                    />
                                </div>
                            </div>

                            {selectedEl.isPhoto && (
                                <div className="flex gap-3 mt-2">
                                    <div className="p-fluid flex-1">
                                        <label className="text-sm block mb-1">Width</label>
                                        <InputNumber value={selectedEl.width} onValueChange={e => updateSelectedElement({ width: e.value })} min={20} max={200} inputClassName="p-inputtext-sm p-2" />
                                    </div>
                                    <div className="p-fluid flex-1">
                                        <label className="text-sm block mb-1">Height</label>
                                        <InputNumber value={selectedEl.height} onValueChange={e => updateSelectedElement({ height: e.value })} min={20} max={200} inputClassName="p-inputtext-sm p-2" />
                                    </div>
                                </div>
                            )}

                            <div className="mt-auto pt-4">
                                <Button label="Remove Field" icon="pi pi-trash" severity="danger" outlined onClick={deleteSelectedElement} className="w-full" />
                            </div>
                        </div>
                    ) : (
                        <div className="flex align-items-center justify-content-center h-full text-500 flex-column gap-3">
                            <i className="pi pi-file-edit text-4xl"></i>
                            <p className="m-0">Click any field on the canvas to edit its properties</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="p-3 h-screen flex flex-column overflow-hidden" style={{ maxHeight: '100vh' }}>
            <Toast ref={toast} />
            <div className="flex justify-content-between align-items-center mb-3 flex-none">
                <div>
                    <h2 className="text-xl font-bold m-0" style={{ color: '#1e293b' }}>ID Card Template Designer</h2>
                    {branchInfo && (
                        <div className="text-xs text-600 mt-1 flex align-items-center gap-2">
                            <span className="font-semibold text-primary"><i className="pi pi-building mr-1" />{branchInfo.schoolName}</span>
                            <span>•</span>
                            <span>Branch: <strong>{branchInfo.branchName}</strong></span>
                        </div>
                    )}
                </div>
            </div>

            <Card className="flex-1 overflow-hidden flex flex-column" pt={{ body: { className: 'p-0 h-full flex flex-column overflow-hidden' }, content: { className: 'h-full overflow-hidden' } }}>
                <TabView activeIndex={activeTab} onTabChange={(e) => setActiveTab(e.index)} className="h-full flex flex-column" pt={{ panelContainer: { className: 'flex-1 overflow-hidden p-3' } }}>
                    <TabPanel header="Front Side Design">
                        {renderCanvas()}
                    </TabPanel>
                    <TabPanel header="Back Side Design">
                        {renderCanvas()}
                    </TabPanel>
                </TabView>
            </Card>
        </div>
    );
};

export default IdCardDesignPage;