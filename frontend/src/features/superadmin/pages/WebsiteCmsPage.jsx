import React, { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Toast } from 'primereact/toast';
import { TabView, TabPanel } from 'primereact/tabview';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { Tag } from 'primereact/tag';
import apiClient from '../../../api/client';
import { DEFAULT_CLIENTS_LIST, CLIENT_CATEGORIES, CLIENT_ICONS } from '../../public/data/clientsData';

export const WebsiteCmsPage = () => {
  const toastRef = React.useRef(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [cmsConfig, setCmsConfig] = useState({
    themeColor: '#2563eb',
    heroBadge: 'ALL-IN-ONE SMART SCHOOL ERP PLATFORM',
    heroTitle: 'Next-Generation Operating System For Smart Institutions',
    heroSubtitle: 'Complete digital transformation for schools, colleges & coaching chains. Automate admissions, fee counters, biometric attendance, smart timetables, examinations, student tracking, and accounts effortlessly.',
    ctaPrimaryText: 'Explore System Modules',
    ctaSecondaryText: 'Schedule Live Demo',
    sliderIntervalSeconds: 4,
    slides: [
      {
        badge: 'Institutional Command Center',
        title: 'Unified ERP & Analytics Dashboard',
        description: 'Real-time KPI monitor tracking live student enrollment, fee collections, staff attendance status, upcoming exams, and operational alerts in a single pane of glass.',
        image: '/images/erp_dashboard.jpg',
        stats: '100% Paperless • Real-Time KPIs'
      },
      {
        badge: 'Automated Operations',
        title: 'Smart Attendance & Parent SMS Alerts',
        description: 'Biometric, RFID and mobile teacher app attendance marking with automated real-time SMS notifications sent directly to parents with monthly analytics.',
        image: '/images/erp_attendance.jpg',
        stats: 'Zero Proxy • Instant SMS Sync'
      },
      {
        badge: 'Financial Governance',
        title: 'Automated Fee Billing & Counter POS',
        description: 'End-to-end fee structures, customizable heads, online payment gateway integrations, instant computer-generated thermal/A4 receipts, and auto demand notices.',
        image: '/images/erp_fees.jpg',
        stats: 'Zero Defaulters • 1-Click Receipts'
      }
    ],
    contactInfo: {
      phone: '9873993957, 9873998949',
      email: 'digitalvidyasaarthi@gmail.com',
      address: 'Faridabad, Delhi, Noida, Haryana | Muzaffarpur & Motihari (Bihar)',
      workingHours: 'Mon - Sun: 09:00 AM - 06:00 PM'
    },
    clients: DEFAULT_CLIENTS_LIST
  });

  // Client dialog state
  const [clientDialogVisible, setClientDialogVisible] = useState(false);
  const [editingClientIndex, setEditingClientIndex] = useState(-1);
  const defaultClientForm = {
    name: '',
    shortName: '',
    category: 'cbse',
    board: 'CBSE Affiliated',
    location: '',
    students: '2,500+ Students',
    primaryColor: '#0a387c',
    accentColor: '#d97706',
    motto: '',
    icon: 'pi pi-compass',
    image: '',
    type: 'Senior Secondary K-12'
  };
  const [clientForm, setClientForm] = useState(defaultClientForm);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/superadmin/landing-settings');
      if (res.data?.data) {
        const parsed = typeof res.data.data === 'string' ? JSON.parse(res.data.data) : res.data.data;
        setCmsConfig(prev => ({
          ...prev,
          ...parsed,
          clients: (parsed.clients && Array.isArray(parsed.clients) && parsed.clients.length > 0)
            ? parsed.clients
            : (prev.clients || DEFAULT_CLIENTS_LIST)
        }));
      }
    } catch (err) {
      console.error('Failed to load landing settings', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await apiClient.post('/superadmin/landing-settings', cmsConfig);
      toastRef.current?.show({
        severity: 'success',
        summary: 'Saved Successfully',
        detail: 'Landing page updated! Visit the website homepage to see your live changes.',
        life: 4000
      });
    } catch (err) {
      toastRef.current?.show({
        severity: 'error',
        summary: 'Save Failed',
        detail: err.response?.data?.message || err.message,
        life: 5000
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSlideChange = (index, field, value) => {
    const updated = [...cmsConfig.slides];
    updated[index] = { ...updated[index], [field]: value };
    setCmsConfig({ ...cmsConfig, slides: updated });
  };

  const handleAddSlide = () => {
    const newSlide = {
      badge: 'Feature Highlight',
      title: 'New ERP Capability',
      description: 'Describe this feature to visitors on the landing page.',
      image: '/images/erp_dashboard.jpg',
      stats: 'Real-Time Sync'
    };
    setCmsConfig({ ...cmsConfig, slides: [...cmsConfig.slides, newSlide] });
  };

  const handleRemoveSlide = (index) => {
    if (cmsConfig.slides.length <= 1) return;
    const updated = cmsConfig.slides.filter((_, i) => i !== index);
    setCmsConfig({ ...cmsConfig, slides: updated });
  };

  // Client Management Handlers
  const openAddClientDialog = () => {
    setEditingClientIndex(-1);
    setClientForm({
      ...defaultClientForm,
      id: Date.now()
    });
    setClientDialogVisible(true);
  };

  const openEditClientDialog = (index) => {
    setEditingClientIndex(index);
    setClientForm({ ...cmsConfig.clients[index] });
    setClientDialogVisible(true);
  };

  const handleSaveClient = () => {
    if (!clientForm.name?.trim()) {
      toastRef.current?.show({
        severity: 'warn',
        summary: 'School Name Required',
        detail: 'Please enter the institution / school full name.',
        life: 4000
      });
      return;
    }

    const updatedClients = [...(cmsConfig.clients || [])];
    const clientToSave = {
      ...clientForm,
      name: clientForm.name.trim(),
      shortName: clientForm.shortName?.trim() || clientForm.name.trim().substring(0, 8),
      motto: clientForm.motto?.trim() || 'Excellence in Education',
      board: clientForm.board?.trim() || 'CBSE Affiliated',
      location: clientForm.location?.trim() || 'All India',
      students: clientForm.students?.trim() || 'Active Campus',
      type: clientForm.type?.trim() || 'Senior Secondary',
      primaryColor: clientForm.primaryColor || '#0a387c',
      accentColor: clientForm.accentColor || '#d97706',
      icon: clientForm.icon || 'pi pi-compass'
    };

    if (editingClientIndex >= 0) {
      updatedClients[editingClientIndex] = clientToSave;
    } else {
      updatedClients.push({
        ...clientToSave,
        id: clientToSave.id || Date.now()
      });
    }

    setCmsConfig(prev => ({ ...prev, clients: updatedClients }));
    setClientDialogVisible(false);
    toastRef.current?.show({
      severity: 'info',
      summary: editingClientIndex >= 0 ? 'Client Updated' : 'Client Added',
      detail: `"${clientToSave.name}" updated in list. Click "Save & Publish Live" at top right to apply!`,
      life: 4000
    });
  };

  const handleDeleteClient = (index) => {
    const client = cmsConfig.clients[index];
    if (window.confirm(`Are you sure you want to remove "${client?.name || 'this school'}" from the landing page?`)) {
      const updated = cmsConfig.clients.filter((_, i) => i !== index);
      setCmsConfig(prev => ({ ...prev, clients: updated }));
      toastRef.current?.show({
        severity: 'info',
        summary: 'Client Removed',
        detail: 'Remember to click "Save & Publish Live" to update the live website.',
        life: 4000
      });
    }
  };

  const handleResetDefaultClients = () => {
    if (window.confirm('Reset the client list back to the standard 12 showcase schools? Any custom additions will be replaced.')) {
      setCmsConfig(prev => ({ ...prev, clients: DEFAULT_CLIENTS_LIST }));
      toastRef.current?.show({
        severity: 'success',
        summary: 'Reset to Defaults',
        detail: 'Default 12 partner schools loaded. Click "Save & Publish Live" to apply.',
        life: 4000
      });
    }
  };

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <Toast ref={toastRef} />
      
      {/* Header */}
      <div className="flex flex-column md:flex-row md:align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h2 className="text-2xl font-bold text-900 m-0 flex align-items-center gap-2">
            <i className="pi pi-globe text-primary text-2xl"></i>
            Landing Page & Website CMS
          </h2>
          <p className="text-500 m-0 mt-1 text-sm">
            Super Admin Controls: Manage Hero slider banners, theme brand color, headlines, partner schools / clients, and contact info live on the public landing page.
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            label="View Live Website" 
            icon="pi pi-external-link" 
            className="p-button-outlined p-button-secondary" 
            onClick={() => window.open('/', '_blank')} 
          />
          <Button 
            label={saving ? 'Saving Changes...' : 'Save & Publish Live'} 
            icon="pi pi-check" 
            className="p-button-primary" 
            loading={saving}
            onClick={handleSave} 
          />
        </div>
      </div>

      <TabView>
        {/* Tab 1: Theme & Hero Section */}
        <TabPanel header="Theme & Hero Headlines" leftIcon="pi pi-palette mr-2">
          <Card className="shadow-1 border-round-xl mb-4">
            <div className="grid">
              
              <div className="col-12 md:col-6 mb-3">
                <label className="block text-900 font-semibold mb-2">Theme Brand Accent Color</label>
                <div className="flex align-items-center gap-3">
                  <input 
                    type="color" 
                    value={cmsConfig.themeColor || '#2563eb'} 
                    onChange={e => setCmsConfig({ ...cmsConfig, themeColor: e.target.value })}
                    style={{ width: '48px', height: '42px', borderRadius: '8px', cursor: 'pointer', border: '1px solid #cbd5e1' }}
                  />
                  <InputText 
                    value={cmsConfig.themeColor || '#2563eb'} 
                    onChange={e => setCmsConfig({ ...cmsConfig, themeColor: e.target.value })}
                    className="w-10rem" 
                  />
                  <span className="text-500 text-sm">Buttons, badges & accents color</span>
                </div>
              </div>

              <div className="col-12 md:col-6 mb-3">
                <label className="block text-900 font-semibold mb-2">Top Hero Badge Text</label>
                <InputText 
                  value={cmsConfig.heroBadge} 
                  onChange={e => setCmsConfig({ ...cmsConfig, heroBadge: e.target.value })} 
                  className="w-full"
                />
              </div>

              <div className="col-12 mb-3">
                <label className="block text-900 font-semibold mb-2">Main Hero Headline</label>
                <InputText 
                  value={cmsConfig.heroTitle} 
                  onChange={e => setCmsConfig({ ...cmsConfig, heroTitle: e.target.value })} 
                  className="w-full font-semibold"
                />
              </div>

              <div className="col-12 mb-3">
                <label className="block text-900 font-semibold mb-2">Hero Subtitle / Description</label>
                <InputTextarea 
                  value={cmsConfig.heroSubtitle} 
                  onChange={e => setCmsConfig({ ...cmsConfig, heroSubtitle: e.target.value })} 
                  rows={3} 
                  className="w-full"
                />
              </div>

              <div className="col-12 md:col-6 mb-3">
                <label className="block text-900 font-semibold mb-2">Primary CTA Button Label</label>
                <InputText 
                  value={cmsConfig.ctaPrimaryText} 
                  onChange={e => setCmsConfig({ ...cmsConfig, ctaPrimaryText: e.target.value })} 
                  className="w-full"
                />
              </div>

              <div className="col-12 md:col-6 mb-3">
                <label className="block text-900 font-semibold mb-2">Secondary CTA Button Label</label>
                <InputText 
                  value={cmsConfig.ctaSecondaryText} 
                  onChange={e => setCmsConfig({ ...cmsConfig, ctaSecondaryText: e.target.value })} 
                  className="w-full"
                />
              </div>

            </div>
          </Card>
        </TabPanel>

        {/* Tab 2: Hero Slider & Feature Showcase */}
        <TabPanel header="Interactive Hero Slider & Photos" leftIcon="pi pi-images mr-2">
          <div className="flex justify-content-between align-items-center mb-3">
            <div>
              <h3 className="text-xl font-bold m-0 text-900">Slider Screens & Feature Banners</h3>
              <p className="text-500 text-sm m-0">In photos aur feature descriptions ko update karein jo landing page ke hero slider par show honge.</p>
            </div>
            <Button 
              label="Add New Slide" 
              icon="pi pi-plus" 
              className="p-button-outlined p-button-sm" 
              onClick={handleAddSlide} 
            />
          </div>

          <div className="flex flex-column gap-4">
            {cmsConfig.slides.map((slide, idx) => (
              <Card key={idx} className="shadow-1 border-round-xl border-1 border-200">
                <div className="flex justify-content-between align-items-center border-bottom-1 border-200 pb-2 mb-3">
                  <span className="font-bold text-primary flex align-items-center gap-2">
                    <span className="w-2rem h-2rem border-circle bg-primary text-white flex align-items-center justify-content-center text-sm font-bold">
                      {idx + 1}
                    </span>
                    Slide #{idx + 1}: {slide.title || 'Untitled Slide'}
                  </span>
                  {cmsConfig.slides.length > 1 && (
                    <Button 
                      icon="pi pi-trash" 
                      className="p-button-rounded p-button-danger p-button-text p-button-sm" 
                      onClick={() => handleRemoveSlide(idx)} 
                      tooltip="Delete Slide"
                    />
                  )}
                </div>

                <div className="grid">
                  <div className="col-12 md:col-4">
                    <label className="block text-900 font-semibold mb-2">Category Badge</label>
                    <InputText 
                      value={slide.badge} 
                      onChange={e => handleSlideChange(idx, 'badge', e.target.value)} 
                      className="w-full"
                    />
                  </div>

                  <div className="col-12 md:col-4">
                    <label className="block text-900 font-semibold mb-2">Feature Title</label>
                    <InputText 
                      value={slide.title} 
                      onChange={e => handleSlideChange(idx, 'title', e.target.value)} 
                      className="w-full"
                    />
                  </div>

                  <div className="col-12 md:col-4">
                    <label className="block text-900 font-semibold mb-2">Highlight Pill / Stats</label>
                    <InputText 
                      value={slide.stats} 
                      onChange={e => handleSlideChange(idx, 'stats', e.target.value)} 
                      className="w-full"
                    />
                  </div>

                  <div className="col-12 md:col-8">
                    <label className="block text-900 font-semibold mb-2">Feature Description</label>
                    <InputTextarea 
                      value={slide.description} 
                      onChange={e => handleSlideChange(idx, 'description', e.target.value)} 
                      rows={3} 
                      className="w-full"
                    />
                  </div>

                  <div className="col-12 md:col-4">
                    <label className="block text-900 font-semibold mb-2">Slide Screenshot / Banner Image</label>
                    
                    {/* Image Upload Box & File Selector */}
                    <div className="flex flex-column gap-2 mb-2">
                      <div className="flex gap-2 align-items-center">
                        <label 
                          htmlFor={`slide-file-upload-${idx}`}
                          className="p-button p-button-sm p-button-outlined p-button-primary cursor-pointer flex align-items-center gap-2 m-0"
                          style={{ padding: '6px 14px' }}
                        >
                          <i className="pi pi-upload"></i>
                          <span>Choose / Upload Image</span>
                        </label>
                        <input
                          id={`slide-file-upload-${idx}`}
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 5 * 1024 * 1024) {
                                toastRef.current?.show({
                                  severity: 'warn',
                                  summary: 'Image Too Large',
                                  detail: 'Please choose an image under 5 MB.',
                                  life: 4000
                                });
                                return;
                              }
                              const reader = new FileReader();
                              reader.onload = (uploadEvent) => {
                                handleSlideChange(idx, 'image', uploadEvent.target?.result);
                                toastRef.current?.show({
                                  severity: 'success',
                                  summary: 'Image Loaded',
                                  detail: `Image "${file.name}" loaded for Slide #${idx + 1}. Remember to click Save & Publish!`,
                                  life: 3000
                                });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />

                        {slide.image && (
                          <Button
                            type="button"
                            icon="pi pi-times"
                            className="p-button-sm p-button-rounded p-button-text p-button-danger"
                            tooltip="Remove Image"
                            onClick={() => handleSlideChange(idx, 'image', '')}
                          />
                        )}
                      </div>

                      {/* Optional URL input for online images */}
                      <div className="p-inputgroup">
                        <span className="p-inputgroup-addon" style={{ padding: '0 8px' }}>
                          <i className="pi pi-link text-xs"></i>
                        </span>
                        <InputText 
                          value={slide.image?.startsWith('data:') ? 'Image uploaded (Base64 file)' : slide.image} 
                          onChange={e => handleSlideChange(idx, 'image', e.target.value)} 
                          className="p-inputtext-sm"
                          placeholder="Or enter image URL / /images/name.jpg"
                          disabled={slide.image?.startsWith('data:')}
                        />
                      </div>
                    </div>

                    {/* Image Preview Box */}
                    {slide.image ? (
                      <div 
                        className="border-round overflow-hidden shadow-1 relative border-1 border-300" 
                        style={{ height: '140px', backgroundColor: '#071834' }}
                      >
                        <img 
                          src={slide.image} 
                          alt="Slide preview" 
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                          onError={(e) => { e.target.src = '/images/erp_dashboard.jpg'; }}
                        />
                        <span 
                          className="absolute bottom-0 left-0 right-0 p-1 text-center text-xs font-semibold"
                          style={{ background: 'rgba(0,0,0,0.65)', color: '#ffffff' }}
                        >
                          Live Preview for Slide #{idx + 1}
                        </span>
                      </div>
                    ) : (
                      <div 
                        className="border-round border-2 border-dashed border-300 flex flex-column align-items-center justify-content-center p-3 text-center"
                        style={{ height: '140px', background: '#f8fafc' }}
                      >
                        <i className="pi pi-image text-400 text-3xl mb-1"></i>
                        <span className="text-500 text-xs font-semibold">No Image Selected</span>
                        <span className="text-400 text-xs">Click Choose / Upload Image above</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabPanel>

        {/* Tab 3: Partner Schools & Clients */}
        <TabPanel header={`Partner Schools & Clients (${cmsConfig.clients?.length || 0})`} leftIcon="pi pi-building mr-2">
          <div className="flex flex-column md:flex-row md:align-items-center justify-content-between gap-3 mb-3">
            <div>
              <h3 className="text-xl font-bold m-0 text-900 flex align-items-center gap-2">
                <i className="pi pi-verified text-green-600"></i>
                Partner Institutions & Client Schools Showcase
              </h3>
              <p className="text-500 text-sm m-0 mt-1">
                Manage partner schools shown in the continuous running marquee and interactive category cards on the public landing page.
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                label="Reset to Default 12" 
                icon="pi pi-refresh" 
                className="p-button-outlined p-button-secondary p-button-sm" 
                onClick={handleResetDefaultClients}
                tooltip="Reload standard 12 showcase schools" 
              />
              <Button 
                label="Add New School" 
                icon="pi pi-plus" 
                className="p-button-primary p-button-sm" 
                onClick={openAddClientDialog} 
              />
            </div>
          </div>

          {/* Grid of Client Cards */}
          <div className="grid">
            {(cmsConfig.clients || []).map((client, idx) => (
              <div key={client.id || idx} className="col-12 sm:col-6 lg:col-4 mb-3">
                <Card 
                  className="shadow-1 border-round-xl h-full flex flex-column justify-content-between border-1 border-200 hover:shadow-3 transition-all transition-duration-200"
                  style={{ borderTop: `4px solid ${client.primaryColor || '#0a387c'}` }}
                >
                  <div>
                    {/* Card Top: Logo / Badge + Category Tag */}
                    <div className="flex align-items-start justify-content-between gap-2 mb-3">
                      <div 
                        className="border-round-lg flex align-items-center justify-content-center overflow-hidden flex-shrink-0"
                        style={{
                          width: '52px',
                          height: '52px',
                          backgroundColor: `${client.primaryColor || '#0a387c'}15`,
                          border: `1.5px solid ${client.primaryColor || '#0a387c'}30`,
                        }}
                      >
                        {client.image ? (
                          <img 
                            src={client.image} 
                            alt={client.name} 
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <div className="flex flex-column align-items-center justify-content-center">
                            <i className={client.icon || 'pi pi-compass'} style={{ color: client.primaryColor || '#0a387c', fontSize: '1.25rem' }}></i>
                            <span style={{ color: client.primaryColor || '#0a387c', fontSize: '0.6rem', fontWeight: 800 }}>
                              {(client.shortName || client.name).substring(0, 4).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-column align-items-end gap-1">
                        <Tag 
                          value={(client.category || 'cbse').toUpperCase()} 
                          severity={client.category === 'international' ? 'warning' : client.category === 'icse' ? 'danger' : client.category === 'convent' ? 'info' : 'success'}
                          className="text-xs uppercase font-bold"
                        />
                        <span className="text-xs text-500 font-semibold">{client.students || 'Active Campus'}</span>
                      </div>
                    </div>

                    {/* School Name */}
                    <h4 className="m-0 font-bold text-900 text-base line-clamp-1 mb-1" title={client.name}>
                      {client.name}
                    </h4>

                    {/* Motto */}
                    <p className="text-500 text-xs italic m-0 mb-2 line-clamp-1">
                      "{client.motto || 'Service Before Self'}"
                    </p>

                    {/* Board & Location */}
                    <div className="flex flex-column gap-1 text-xs text-600 mb-3">
                      <span className="flex align-items-center gap-1 font-semibold text-700">
                        <i className="pi pi-bookmark text-primary text-xs"></i>
                        {client.board || 'CBSE Affiliated'}
                      </span>
                      <span className="flex align-items-center gap-1">
                        <i className="pi pi-map-marker text-red-500 text-xs"></i>
                        {client.location || 'All India'}
                      </span>
                      <span className="text-500">{client.type || 'Senior Secondary'}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex align-items-center justify-content-between pt-2 border-top-1 border-200">
                    <span 
                      className="w-1rem h-1rem border-circle inline-block"
                      style={{ backgroundColor: client.primaryColor || '#0a387c' }}
                      title={`Color: ${client.primaryColor}`}
                    ></span>
                    <div className="flex gap-1">
                      <Button 
                        icon="pi pi-pencil" 
                        className="p-button-rounded p-button-text p-button-sm p-button-info" 
                        onClick={() => openEditClientDialog(idx)}
                        tooltip="Edit School Details" 
                      />
                      <Button 
                        icon="pi pi-trash" 
                        className="p-button-rounded p-button-text p-button-sm p-button-danger" 
                        onClick={() => handleDeleteClient(idx)}
                        tooltip="Remove School" 
                      />
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </TabPanel>

        {/* Tab 4: Contact & Footer Info */}
        <TabPanel header="Contact & Footer Info" leftIcon="pi pi-phone mr-2">
          <Card className="shadow-1 border-round-xl">
            <div className="grid">
              
              <div className="col-12 md:col-6 mb-3">
                <label className="block text-900 font-semibold mb-2">Support Phone Number(s)</label>
                <InputText 
                  value={cmsConfig.contactInfo?.phone} 
                  onChange={e => setCmsConfig({ 
                    ...cmsConfig, 
                    contactInfo: { ...cmsConfig.contactInfo, phone: e.target.value } 
                  })} 
                  className="w-full"
                />
              </div>

              <div className="col-12 md:col-6 mb-3">
                <label className="block text-900 font-semibold mb-2">Support Email Address</label>
                <InputText 
                  value={cmsConfig.contactInfo?.email} 
                  onChange={e => setCmsConfig({ 
                    ...cmsConfig, 
                    contactInfo: { ...cmsConfig.contactInfo, email: e.target.value } 
                  })} 
                  className="w-full"
                />
              </div>

              <div className="col-12 mb-3">
                <label className="block text-900 font-semibold mb-2">Office Address</label>
                <InputText 
                  value={cmsConfig.contactInfo?.address} 
                  onChange={e => setCmsConfig({ 
                    ...cmsConfig, 
                    contactInfo: { ...cmsConfig.contactInfo, address: e.target.value } 
                  })} 
                  className="w-full"
                />
              </div>

              <div className="col-12 md:col-6 mb-3">
                <label className="block text-900 font-semibold mb-2">Working Hours</label>
                <InputText 
                  value={cmsConfig.contactInfo?.workingHours} 
                  onChange={e => setCmsConfig({ 
                    ...cmsConfig, 
                    contactInfo: { ...cmsConfig.contactInfo, workingHours: e.target.value } 
                  })} 
                  className="w-full"
                />
              </div>

            </div>
          </Card>
        </TabPanel>
      </TabView>

      {/* Add / Edit Client Dialog */}
      <Dialog
        visible={clientDialogVisible}
        onHide={() => setClientDialogVisible(false)}
        header={editingClientIndex >= 0 ? 'Edit Partner School / Client' : 'Add New Partner School / Client'}
        style={{ width: '90vw', maxWidth: '720px' }}
        modal
        footer={
          <div className="flex justify-content-end gap-2">
            <Button 
              label="Cancel" 
              icon="pi pi-times" 
              className="p-button-text p-button-secondary" 
              onClick={() => setClientDialogVisible(false)} 
            />
            <Button 
              label={editingClientIndex >= 0 ? 'Update School' : 'Add School to List'} 
              icon="pi pi-check" 
              className="p-button-primary" 
              onClick={handleSaveClient} 
            />
          </div>
        }
      >
        <div className="grid p-fluid mt-1">
          <div className="col-12 md:col-8 mb-2">
            <label className="block text-900 font-semibold mb-1 text-sm">Institution / School Full Name *</label>
            <InputText 
              value={clientForm.name} 
              onChange={e => setClientForm({ ...clientForm, name: e.target.value })} 
              placeholder="e.g. Delhi Public School (DPS)"
              className="w-full"
            />
          </div>

          <div className="col-12 md:col-4 mb-2">
            <label className="block text-900 font-semibold mb-1 text-sm">Short Code / Monogram</label>
            <InputText 
              value={clientForm.shortName} 
              onChange={e => setClientForm({ ...clientForm, shortName: e.target.value })} 
              placeholder="e.g. DPS"
              className="w-full"
            />
          </div>

          <div className="col-12 md:col-6 mb-2">
            <label className="block text-900 font-semibold mb-1 text-sm">Institution Category</label>
            <Dropdown 
              value={clientForm.category} 
              options={CLIENT_CATEGORIES} 
              onChange={e => setClientForm({ ...clientForm, category: e.value })} 
              className="w-full"
            />
          </div>

          <div className="col-12 md:col-6 mb-2">
            <label className="block text-900 font-semibold mb-1 text-sm">Board / Affiliation</label>
            <InputText 
              value={clientForm.board} 
              onChange={e => setClientForm({ ...clientForm, board: e.target.value })} 
              placeholder="e.g. CBSE Affiliated, ICSE / ISC Board"
              className="w-full"
            />
          </div>

          <div className="col-12 md:col-6 mb-2">
            <label className="block text-900 font-semibold mb-1 text-sm">Campus Location / City</label>
            <InputText 
              value={clientForm.location} 
              onChange={e => setClientForm({ ...clientForm, location: e.target.value })} 
              placeholder="e.g. Faridabad, Haryana | Muzaffarpur, Bihar"
              className="w-full"
            />
          </div>

          <div className="col-12 md:col-6 mb-2">
            <label className="block text-900 font-semibold mb-1 text-sm">Student Strength</label>
            <InputText 
              value={clientForm.students} 
              onChange={e => setClientForm({ ...clientForm, students: e.target.value })} 
              placeholder="e.g. 2,500+ Students"
              className="w-full"
            />
          </div>

          <div className="col-12 md:col-8 mb-2">
            <label className="block text-900 font-semibold mb-1 text-sm">School Motto / Tagline</label>
            <InputText 
              value={clientForm.motto} 
              onChange={e => setClientForm({ ...clientForm, motto: e.target.value })} 
              placeholder="e.g. Service Before Self"
              className="w-full"
            />
          </div>

          <div className="col-12 md:col-4 mb-2">
            <label className="block text-900 font-semibold mb-1 text-sm">School Type / Level</label>
            <InputText 
              value={clientForm.type} 
              onChange={e => setClientForm({ ...clientForm, type: e.target.value })} 
              placeholder="e.g. Senior Secondary K-12"
              className="w-full"
            />
          </div>

          {/* Color pickers */}
          <div className="col-12 md:col-6 mb-2">
            <label className="block text-900 font-semibold mb-1 text-sm">Brand Primary Color</label>
            <div className="flex align-items-center gap-2">
              <input 
                type="color" 
                value={clientForm.primaryColor || '#0a387c'} 
                onChange={e => setClientForm({ ...clientForm, primaryColor: e.target.value })}
                style={{ width: '42px', height: '38px', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer' }}
              />
              <InputText 
                value={clientForm.primaryColor || '#0a387c'} 
                onChange={e => setClientForm({ ...clientForm, primaryColor: e.target.value })} 
                className="w-full"
              />
            </div>
          </div>

          <div className="col-12 md:col-6 mb-2">
            <label className="block text-900 font-semibold mb-1 text-sm">Brand Accent Color</label>
            <div className="flex align-items-center gap-2">
              <input 
                type="color" 
                value={clientForm.accentColor || '#d97706'} 
                onChange={e => setClientForm({ ...clientForm, accentColor: e.target.value })}
                style={{ width: '42px', height: '38px', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer' }}
              />
              <InputText 
                value={clientForm.accentColor || '#d97706'} 
                onChange={e => setClientForm({ ...clientForm, accentColor: e.target.value })} 
                className="w-full"
              />
            </div>
          </div>

          {/* Logo Upload & Icon Picker */}
          <div className="col-12 mb-2">
            <label className="block text-900 font-semibold mb-1 text-sm">School Logo (File Upload or Icon)</label>
            <div className="p-3 border-1 border-200 border-round-lg bg-50 flex flex-column md:flex-row gap-3 align-items-center">
              {/* Preview */}
              <div 
                className="border-round-lg flex align-items-center justify-content-center overflow-hidden flex-shrink-0 shadow-1"
                style={{
                  width: '64px',
                  height: '64px',
                  backgroundColor: `${clientForm.primaryColor || '#0a387c'}15`,
                  border: `2px solid ${clientForm.primaryColor || '#0a387c'}40`,
                }}
              >
                {clientForm.image ? (
                  <img 
                    src={clientForm.image} 
                    alt="Logo preview" 
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                  />
                ) : (
                  <div className="flex flex-column align-items-center justify-content-center">
                    <i className={clientForm.icon || 'pi pi-compass'} style={{ color: clientForm.primaryColor || '#0a387c', fontSize: '1.5rem' }}></i>
                    <span style={{ color: clientForm.primaryColor || '#0a387c', fontSize: '0.65rem', fontWeight: 800 }}>
                      {(clientForm.shortName || clientForm.name || 'SCH').substring(0, 4).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* Upload controls */}
              <div className="flex-1 w-full flex flex-column gap-2">
                <div className="flex flex-wrap gap-2 align-items-center">
                  <label 
                    htmlFor="client-logo-upload"
                    className="p-button p-button-sm p-button-outlined p-button-primary cursor-pointer flex align-items-center gap-2 m-0"
                    style={{ padding: '6px 14px' }}
                  >
                    <i className="pi pi-upload"></i>
                    <span>Upload Logo Image</span>
                  </label>
                  <input
                    id="client-logo-upload"
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 3 * 1024 * 1024) {
                          toastRef.current?.show({
                            severity: 'warn',
                            summary: 'Logo Too Large',
                            detail: 'Please upload an image under 3 MB.',
                            life: 4000
                          });
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          setClientForm(prev => ({ ...prev, image: ev.target?.result }));
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  {clientForm.image && (
                    <Button 
                      label="Remove Custom Logo" 
                      icon="pi pi-trash" 
                      className="p-button-danger p-button-outlined p-button-sm"
                      onClick={() => setClientForm(prev => ({ ...prev, image: '' }))} 
                    />
                  )}
                </div>

                <div className="grid">
                  <div className="col-12 md:col-6">
                    <InputText 
                      value={clientForm.image?.startsWith('data:') ? 'Image uploaded from device (Base64)' : clientForm.image} 
                      onChange={e => setClientForm({ ...clientForm, image: e.target.value })} 
                      placeholder="Or enter logo Image URL..."
                      disabled={clientForm.image?.startsWith('data:')}
                      className="p-inputtext-sm w-full"
                    />
                  </div>
                  <div className="col-12 md:col-6">
                    <Dropdown 
                      value={clientForm.icon} 
                      options={CLIENT_ICONS} 
                      onChange={e => setClientForm({ ...clientForm, icon: e.value })} 
                      placeholder="Or choose default badge icon"
                      className="p-inputtext-sm w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default WebsiteCmsPage;
