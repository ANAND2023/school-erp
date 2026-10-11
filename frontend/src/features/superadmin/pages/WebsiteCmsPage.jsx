import React, { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Toast } from 'primereact/toast';
import { TabView, TabPanel } from 'primereact/tabview';
import apiClient from '../../../api/client';

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
    }
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/superadmin/landing-settings');
      if (res.data?.data) {
        const parsed = typeof res.data.data === 'string' ? JSON.parse(res.data.data) : res.data.data;
        setCmsConfig(prev => ({ ...prev, ...parsed }));
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
            Super Admin Controls: Manage Hero slider banners, theme brand color, headlines, descriptions, and contact info live on the public landing page.
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
                    <label className="block text-900 font-semibold mb-2">Image URL / Path</label>
                    <InputText 
                      value={slide.image} 
                      onChange={e => handleSlideChange(idx, 'image', e.target.value)} 
                      className="w-full mb-2"
                      placeholder="/images/erp_dashboard.jpg"
                    />
                    {slide.image && (
                      <div className="border-round overflow-hidden shadow-1" style={{ height: '110px' }}>
                        <img 
                          src={slide.image} 
                          alt="preview" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          onError={(e) => { e.target.src = '/images/erp_dashboard.jpg'; }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabPanel>

        {/* Tab 3: Contact & Footer Info */}
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
    </div>
  );
};
export default WebsiteCmsPage;
