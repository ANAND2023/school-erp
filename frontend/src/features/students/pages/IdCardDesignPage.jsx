import React, { useState, useEffect, useRef } from 'react';
import { Card } from 'primereact/card';
import { AppButton as Button } from '../../../components/common/AppButton';
import { ColorPicker } from 'primereact/colorpicker';
import { Toast } from 'primereact/toast';
import { TabView, TabPanel } from 'primereact/tabview';
import { InputNumber } from 'primereact/inputnumber';
import { AppSelect, AppInput } from '../../../components/common';

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

export const IdCardDesignPage = () => {
    const toast = useRef(null);
    const [activeTab, setActiveTab] = useState(0);

    const [frontConfig, setFrontConfig] = useState({ bgImage: '', orientation: 'vertical', elements: [] });
    const [backConfig, setBackConfig] = useState({ bgImage: '', orientation: 'vertical', elements: [] });
    const [selectedElementId, setSelectedElementId] = useState(null);
    const [selectedFieldToAdd, setSelectedFieldToAdd] = useState(null);

    // Draggable logic
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const savedFront = localStorage.getItem('id_card_front');
        const savedBack = localStorage.getItem('id_card_back');
        if (savedFront) setFrontConfig({ orientation: 'vertical', ...JSON.parse(savedFront) });
        if (savedBack) setBackConfig({ orientation: 'vertical', ...JSON.parse(savedBack) });
    }, []);

    const saveConfig = () => {
        localStorage.setItem('id_card_front', JSON.stringify(frontConfig));
        localStorage.setItem('id_card_back', JSON.stringify(backConfig));
        toast.current.show({ severity: 'success', summary: 'Saved', detail: 'ID Card Template Saved successfully!' });
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
        const rect = e.target.getBoundingClientRect();
        setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    const handleMouseMove = (e) => {
        if (!isDragging || !selectedElementId) return;
        const container = document.getElementById('canvas-container');
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
                            width: `${canvasWidth}px`, height: `${canvasHeight}px`, border: '1px solid #ccc', position: 'relative',
                            backgroundImage: `url(${currentConfig.bgImage})`, backgroundSize: 'cover',
                            backgroundPosition: 'center', backgroundColor: '#fff', overflow: 'hidden',
                            boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                        }}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onClick={() => setSelectedElementId(null)}
                    >
                        {currentConfig.elements.map(el => (
                            <div
                                key={el.id}
                                onMouseDown={(e) => handleMouseDown(e, el)}
                                style={{
                                    position: 'absolute', left: el.x, top: el.y,
                                    fontSize: `${el.fontSize}px`, color: `#${el.color}`,
                                    fontWeight: el.fontWeight, width: el.isPhoto ? el.width : 'auto',
                                    height: el.isPhoto ? el.height : 'auto',
                                    border: selectedElementId === el.id ? '1px dashed red' : (el.isPhoto ? '1px solid #ddd' : 'none'),
                                    cursor: 'move', backgroundColor: el.isPhoto ? '#eee' : 'transparent',
                                    display: 'flex', alignItems: 'center', justifyContent: el.isPhoto ? 'center' : 'flex-start',
                                    userSelect: 'none', whiteSpace: 'nowrap', lineHeight: 1
                                }}
                            >
                                {el.isPhoto ? 'PHOTO' : <>{el.prefix && <span style={{marginRight: '4px'}}>{el.prefix}</span>}{el.text}</>}
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
                        {currentConfig.bgImage && (
                            <div className="mt-1">
                                <Button label="Clear Background" icon="pi pi-trash" severity="danger" outlined size="small" onClick={() => setCurrentConfig(prev => ({...prev, bgImage: ''}))} />
                            </div>
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
                        <Button label="Save All Templates" icon="pi pi-save" severity="success" onClick={saveConfig} className="w-full" size="large" />
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
                <h2 className="text-xl font-bold m-0" style={{ color: '#1e293b' }}>ID Card Template Designer</h2>
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