import React, { useState, useEffect, useRef } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputSwitch } from 'primereact/inputswitch';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { Dropdown } from 'primereact/dropdown';
import { Divider } from 'primereact/divider';
import { superAdminApi } from '../api/superAdminApi';
import { whatsappService } from '../../communication/services/whatsappService';

const MODULE_DEFINITIONS = [
  {
    key: 'enquiry',
    title: 'Student Enquiry',
    icon: 'pi pi-user-plus',
    color: '#0284c7',
    description: 'Sent to prospective parents when a new enquiry is logged or updated with follow-up details.',
    placeholders: ['{ParentName}', '{StudentName}', '{ClassName}', '{EnquiryNo}', '{SchoolName}', '{SchoolPhone}'],
    defaultTemplate:
      'Dear {ParentName}, thank you for your enquiry for {StudentName} (Class: {ClassName}) at {SchoolName}. Enquiry No: {EnquiryNo}. For any queries, call {SchoolPhone}. Best regards!',
  },
  {
    key: 'admission',
    title: 'Admission Confirmation',
    icon: 'pi pi-id-card',
    color: '#16a34a',
    description: 'Sent to parents when a new student admission is registered and approved in the school.',
    placeholders: ['{ParentName}', '{StudentName}', '{AdmissionNo}', '{ClassName}', '{Section}', '{SchoolName}', '{Date}'],
    defaultTemplate:
      'Congratulations {ParentName}! Admission for {StudentName} is confirmed in Class {ClassName} (Section: {Section}) at {SchoolName}. Admission No: {AdmissionNo}. Welcome to our school family!',
  },
  {
    key: 'feeReceipt',
    title: 'Fee Payment Receipt',
    icon: 'pi pi-receipt',
    color: '#9333ea',
    description: 'Instant receipt confirmation sent whenever fee counter collects cash, cheque, UPI or card payment.',
    placeholders: ['{ParentName}', '{StudentName}', '{ReceiptNo}', '{PaidAmount}', '{PaymentMode}', '{Balance}', '{Date}', '{SchoolName}'],
    defaultTemplate:
      'Dear {ParentName}, Fee payment of Rs. {PaidAmount} for {StudentName} (Receipt: #{ReceiptNo}) has been successfully received on {Date}. Remaining balance: Rs. {Balance}. Thank you, {SchoolName}.',
  },
  {
    key: 'feeDemand',
    title: 'Fee Due / Demand Reminder',
    icon: 'pi pi-bell',
    color: '#ea580c',
    description: 'Fee collection reminder sent for outstanding monthly fees or fee demand bills.',
    placeholders: ['{StudentName}', '{PendingAmount}', '{Month}', '{DueDate}', '{SchoolName}'],
    defaultTemplate:
      'Dear Parent, this is a gentle reminder regarding pending school fees of Rs. {PendingAmount} for {StudentName} ({Month}) at {SchoolName}. Due Date: {DueDate}. Please clear the dues at your earliest convenience.',
  },
  {
    key: 'attendance',
    title: 'Absence Alert',
    icon: 'pi pi-calendar-times',
    color: '#dc2626',
    description: 'Daily alert automatically triggered when a student is marked Absent in the class register.',
    placeholders: ['{StudentName}', '{ClassName}', '{Date}', '{SchoolName}'],
    defaultTemplate:
      'Dear Parent, please note that your ward {StudentName} (Class: {ClassName}) is marked ABSENT today ({Date}) at {SchoolName}. If on leave, please submit an application.',
  },
  {
    key: 'birthday',
    title: 'Birthday Greetings',
    icon: 'pi pi-heart',
    color: '#db2777',
    description: 'Heartfelt birthday greetings sent to students and staff on their birthdays from the school.',
    placeholders: ['{StudentName}', '{Age}', '{SchoolName}'],
    defaultTemplate:
      '🎉 Warmest Birthday Wishes to {StudentName} on turning {Age} today! May your year ahead be filled with success, knowledge, and joy. From all of us at {SchoolName}! 🎂',
  },
  {
    key: 'general',
    title: 'General Notice / Broadcast',
    icon: 'pi pi-megaphone',
    color: '#4f46e5',
    description: 'Custom school circular, transport update, or parent communication announcement.',
    placeholders: ['{StudentName}', '{Title}', '{Message}', '{SchoolName}'],
    defaultTemplate:
      'Notice from {SchoolName}: Dear Parent, regarding {StudentName} - {Message}. Thank you.',
  },
];

export const WhatsAppSettingsPage = () => {
  const toastRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [config, setConfig] = useState({
    isEnabled: true,
    provider: 'DIRECT_WEB',
    apiKey: '',
    apiSecret: '',
    phoneNumberId: '',
    isTestMode: false,
    enquiry: { enabled: true, template: '' },
    admission: { enabled: true, template: '' },
    feeReceipt: { enabled: true, template: '' },
    feeDemand: { enabled: true, template: '' },
    attendance: { enabled: true, template: '' },
    birthday: { enabled: true, template: '' },
    general: { enabled: true, template: '' },
  });

  // Test sender state
  const [testPhone, setTestPhone] = useState('');
  const [testModule, setTestModule] = useState('enquiry');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const res = await superAdminApi.getWhatsAppConfig();
      if (res.success && res.data) {
        // Ensure all modules are populated
        const merged = { ...res.data };
        MODULE_DEFINITIONS.forEach((mod) => {
          if (!merged[mod.key]) {
            merged[mod.key] = { enabled: true, template: mod.defaultTemplate };
          } else if (!merged[mod.key].template) {
            merged[mod.key].template = mod.defaultTemplate;
          }
        });
        setConfig(merged);
      }
    } catch (err) {
      console.error(err);
      toastRef.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load WhatsApp configurations.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await superAdminApi.saveWhatsAppConfig(config);
      if (res.success) {
        toastRef.current?.show({
          severity: 'success',
          summary: 'Configuration Saved',
          detail: 'WhatsApp module settings & templates updated successfully platform-wide.',
        });
      }
    } catch (err) {
      toastRef.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to save WhatsApp settings.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInsertPlaceholder = (moduleKey, placeholder) => {
    const current = config[moduleKey]?.template || '';
    const updated = current + (current.endsWith(' ') ? '' : ' ') + placeholder;
    setConfig({
      ...config,
      [moduleKey]: {
        ...config[moduleKey],
        template: updated,
      },
    });
  };

  const handleResetDefault = (moduleKey, defaultTemplate) => {
    setConfig({
      ...config,
      [moduleKey]: {
        ...config[moduleKey],
        template: defaultTemplate,
      },
    });
  };

  const handleSendTestMessage = () => {
    if (!testPhone.trim()) {
      toastRef.current?.show({
        severity: 'warn',
        summary: 'Mobile Required',
        detail: 'Please enter a test mobile number.',
      });
      return;
    }

    const template = config[testModule]?.template || 'Test message from DVS ERP';
    const sampleData = {
      ParentName: 'Mr. Rajesh Sharma',
      StudentName: 'Aarav Sharma',
      ClassName: 'Class 5',
      Section: 'A',
      AdmissionNo: 'MAIN/2026/0101',
      EnquiryNo: 'ENQ/2026/0042',
      ReceiptNo: 'RCP-2026-9081',
      PaidAmount: '4,500',
      PaymentMode: 'Cash',
      Balance: '0',
      PendingAmount: '3,200',
      DueDate: '20 Oct 2026',
      Month: 'October 2026',
      Date: '13-10-2026',
      Age: '10',
      SchoolName: 'Delhi Public Academy',
      SchoolPhone: '011-28945678',
      Title: 'Annual Sports Day',
      Message: 'Annual Sports Day will be held on Friday.',
    };

    const rendered = whatsappService.interpolateTemplate(template, sampleData);
    whatsappService.sendDirectMessage(testPhone, rendered);
  };

  const providerOptions = [
    {
      label: 'Direct Web / Mobile (Zero-Cost / Immediate WhatsApp Click-to-Chat)',
      value: 'DIRECT_WEB',
    },
    {
      label: 'WhatsApp Business API Gateway (Interakt / Gupshup / Twilio / Wati)',
      value: 'INTERAKT',
    },
  ];

  return (
    <div className="flex flex-column gap-4 pb-6">
      <Toast ref={toastRef} />

      {/* Header Banner */}
      <div className="bg-white p-4 border-round-xl shadow-1 border-1 surface-border flex flex-column md:flex-row align-items-start md:align-items-center justify-content-between gap-3">
        <div className="flex align-items-center gap-3">
          <div
            className="flex align-items-center justify-content-center border-round-xl text-white shadow-2"
            style={{ width: '48px', height: '48px', backgroundColor: '#25D366' }}
          >
            <i className="pi pi-whatsapp text-2xl"></i>
          </div>
          <div>
            <div className="flex align-items-center gap-2">
              <h2 className="text-xl font-bold text-slate-800 m-0">WhatsApp Integration & Module Controls</h2>
              <Tag
                value={config.isEnabled ? 'Service Active' : 'Service Disabled'}
                severity={config.isEnabled ? 'success' : 'danger'}
              />
            </div>
            <p className="text-xs text-slate-500 m-0 mt-1">
              Enable or disable WhatsApp features module-wise across Enquiries, Admissions, Fee Receipts, Attendance alerts, and customize dynamic message templates.
            </p>
          </div>
        </div>

        <div className="flex align-items-center gap-2">
          <Button
            label={saving ? 'Saving...' : 'Save All Settings'}
            icon="pi pi-check"
            size="small"
            loading={saving}
            className="bg-emerald-600 border-emerald-600 font-bold px-4"
            onClick={handleSave}
          />
        </div>
      </div>

      {/* Master Configuration & Mode Selection */}
      <div className="grid">
        <div className="col-12 lg:col-8">
          <div className="p-4 bg-white border-round-xl shadow-1 border-1 surface-border h-full">
            <h3 className="text-base font-bold text-slate-800 m-0 mb-3 flex align-items-center gap-2">
              <i className="pi pi-sliders-h text-indigo-600"></i>
              Platform Delivery Mode & Master Switch
            </h3>

            <div className="flex align-items-center justify-content-between p-3 border-round-lg mb-3" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <div>
                <span className="font-bold text-sm text-slate-800 block">Master WhatsApp Switch</span>
                <span className="text-xs text-slate-600">
                  When enabled, school staff will see WhatsApp action buttons in the respective enabled modules.
                </span>
              </div>
              <InputSwitch
                checked={config.isEnabled}
                onChange={(e) => setConfig({ ...config, isEnabled: e.value })}
              />
            </div>

            <div className="mb-3">
              <label className="font-semibold block mb-1 text-xs text-slate-700">Delivery Integration Provider</label>
              <Dropdown
                value={config.provider}
                options={providerOptions}
                onChange={(e) => setConfig({ ...config, provider: e.value })}
                className="w-full text-xs"
              />
              <span className="text-xs text-slate-400 mt-1 block">
                {config.provider === 'DIRECT_WEB'
                  ? '✓ Zero setup fee. Instantly opens WhatsApp Web or App on desktop and phone with pre-filled message.'
                  : 'ℹ Connects to official Meta WhatsApp Cloud API or BSP for programmatic automated background delivery.'}
              </span>
            </div>

            {config.provider !== 'DIRECT_WEB' && (
              <div className="grid mt-2">
                <div className="col-12 md:col-6">
                  <label className="font-semibold block mb-1 text-xs">API Key / Access Token</label>
                  <InputText
                    value={config.apiKey || ''}
                    onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                    placeholder="Enter API Key / Token"
                    className="p-inputtext-sm w-full font-mono text-xs"
                  />
                </div>
                <div className="col-12 md:col-6">
                  <label className="font-semibold block mb-1 text-xs">Auth Secret / Webhook Secret</label>
                  <InputText
                    type="password"
                    value={config.apiSecret || ''}
                    onChange={(e) => setConfig({ ...config, apiSecret: e.target.value })}
                    placeholder="••••••••••••••••••••"
                    className="p-inputtext-sm w-full font-mono text-xs"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live Test Sender */}
        <div className="col-12 lg:col-4">
          <div className="p-4 bg-white border-round-xl shadow-1 border-1 surface-border h-full">
            <h3 className="text-base font-bold text-slate-800 m-0 mb-3 flex align-items-center gap-2">
              <i className="pi pi-send text-emerald-600"></i>
              Live Test Simulator
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Test your templates with sample student data directly on WhatsApp.
            </p>

            <div className="flex flex-column gap-3">
              <div>
                <label className="font-semibold block mb-1 text-xs text-slate-700">Module Template</label>
                <Dropdown
                  value={testModule}
                  options={MODULE_DEFINITIONS.map((m) => ({ label: m.title, value: m.key }))}
                  onChange={(e) => setTestModule(e.value)}
                  className="w-full text-xs"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1 text-xs text-slate-700">Test Mobile Number</label>
                <InputText
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="e.g. 9811223344"
                  className="p-inputtext-sm w-full font-mono text-xs"
                />
              </div>

              <Button
                label="Send Test WhatsApp"
                icon="pi pi-whatsapp"
                size="small"
                className="bg-emerald-600 border-emerald-600 font-bold w-full"
                onClick={handleSendTestMessage}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex align-items-center justify-content-between mt-2">
        <h3 className="text-lg font-bold text-slate-800 m-0 flex align-items-center gap-2">
          <i className="pi pi-th-large text-indigo-600"></i>
          Module-Wise Enable / Disable & Message Templates
        </h3>
        <span className="text-xs text-slate-500">
          Click placeholders below to insert them into the template
        </span>
      </div>

      {/* Module Configuration Cards */}
      <div className="grid">
        {MODULE_DEFINITIONS.map((mod) => {
          const modConfig = config[mod.key] || { enabled: true, template: mod.defaultTemplate };

          return (
            <div key={mod.key} className="col-12 lg:col-6">
              <div
                className="p-4 bg-white border-round-xl shadow-1 border-1 surface-border flex flex-column justify-content-between h-full"
                style={{
                  borderLeft: `4px solid ${mod.color}`,
                }}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex align-items-center justify-content-between mb-2">
                    <div className="flex align-items-center gap-2">
                      <div
                        className="flex align-items-center justify-content-center border-round text-white font-bold"
                        style={{ width: '32px', height: '32px', backgroundColor: mod.color }}
                      >
                        <i className={`${mod.icon} text-sm`}></i>
                      </div>
                      <div>
                        <span className="font-bold text-sm text-slate-800 block">{mod.title}</span>
                        <span className="text-xs text-slate-400 font-mono">Module: {mod.key}</span>
                      </div>
                    </div>

                    <div className="flex align-items-center gap-2">
                      <span className="text-xs font-semibold text-slate-600">
                        {modConfig.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                      <InputSwitch
                        checked={modConfig.enabled}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            [mod.key]: {
                              ...modConfig,
                              enabled: e.value,
                            },
                          })
                        }
                      />
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 mb-3">{mod.description}</p>

                  {/* Template Editor */}
                  <div className="mb-2">
                    <div className="flex align-items-center justify-content-between mb-1">
                      <label className="font-semibold text-xs text-slate-700">Message Template</label>
                      <button
                        type="button"
                        onClick={() => handleResetDefault(mod.key, mod.defaultTemplate)}
                        className="text-xs text-indigo-600 bg-transparent border-none cursor-pointer hover:underline p-0"
                      >
                        Reset to Default
                      </button>
                    </div>

                    <InputTextarea
                      rows={4}
                      value={modConfig.template || ''}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          [mod.key]: {
                            ...modConfig,
                            template: e.target.value,
                          },
                        })
                      }
                      className="w-full text-xs"
                      style={{ fontSize: '12px', lineHeight: 1.5 }}
                      placeholder="Enter WhatsApp message template..."
                    />
                  </div>

                  {/* Available Placeholders */}
                  <div className="mt-2">
                    <span className="text-xs font-semibold text-slate-600 block mb-1">
                      Click to insert dynamic placeholder:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {mod.placeholders.map((ph) => (
                        <button
                          key={ph}
                          type="button"
                          onClick={() => handleInsertPlaceholder(mod.key, ph)}
                          className="px-2 py-1 text-xs border-round font-mono font-semibold cursor-pointer border-1 surface-border hover:surface-100 transition-all"
                          style={{ backgroundColor: '#f8fafc', color: '#0284c7' }}
                        >
                          + {ph}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-top-1 surface-border flex align-items-center justify-content-between">
                  <span className="text-xs text-slate-400">
                    Character Count: {(modConfig.template || '').length}
                  </span>
                  <Tag
                    value={modConfig.enabled ? 'Active on Student Actions' : 'Disabled'}
                    severity={modConfig.enabled ? 'success' : 'secondary'}
                    style={{ fontSize: '10px' }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-content-end mt-3">
        <Button
          label={saving ? 'Saving...' : 'Save All Settings'}
          icon="pi pi-check"
          size="small"
          loading={saving}
          className="bg-emerald-600 border-emerald-600 font-bold px-4"
          onClick={handleSave}
        />
      </div>
    </div>
  );
};

export default WhatsAppSettingsPage;
