import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Steps } from 'primereact/steps';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { Checkbox } from 'primereact/checkbox';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { Password } from 'primereact/password';
import { superAdminApi } from '../api/superAdminApi';
import { useAuthStore } from '../../../store/authStore';

export const CreateTenantWizardPage = () => {
  const navigate = useNavigate();
  const toastRef = useRef(null);
  const { startImpersonation } = useAuthStore();

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState([]);
  const [moduleCatalog, setModuleCatalog] = useState([]);
  const [provisionedSchool, setProvisionedSchool] = useState(null);
  const [showCreatedPassword, setShowCreatedPassword] = useState(false);

  const copyToClipboard = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toastRef.current?.show({
      severity: 'info',
      summary: 'Copied',
      detail: `${label} copied to clipboard!`,
      life: 2000,
    });
  };

  const copyAllCredentials = () => {
    if (!provisionedSchool) return;
    const text = `School ERP Credentials\nSchool: ${provisionedSchool.name}\nSubdomain: https://${provisionedSchool.slug}.schoolerp.com\nLogin ID: ${formData.adminUsername}\nPassword: ${formData.adminPassword}\nEmail: ${formData.adminEmail || formData.email}`;
    navigator.clipboard.writeText(text);
    toastRef.current?.show({
      severity: 'success',
      summary: 'Copied All Credentials',
      detail: 'Login credentials copied! You can now paste and send to school admin.',
      life: 3000,
    });
  };

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: School Identity
    name: '',
    code: '',
    slug: '',
    logoUrl: '',
    affiliationNumber: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    contactNumber: '',
    email: '',
    website: '',

    // Step 2: Branch & Academic Year
    branchName: 'Main Campus',
    branchCode: 'MAIN',
    academicYearName: '2026-27',
    academicYearStartDate: new Date(2026, 3, 1),
    academicYearEndDate: new Date(2027, 2, 31),

    // Step 3: Subscription & Modules
    planId: null,
    planCode: 'GROWTH',
    subscriptionStatus: 'Active',
    subscriptionStartDate: new Date(),
    subscriptionEndDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
    customMaxStudents: 1000,
    customMaxStaff: 75,
    amountPaid: 4999,
    enabledModuleCodes: ['STUDENTS', 'ACADEMICS', 'ATTENDANCE', 'FEES', 'EXAMINATIONS', 'STAFF_PAYROLL'],

    // Step 4: Initial School Admin
    adminFullName: '',
    adminUsername: '',
    adminEmail: '',
    adminMobile: '',
    adminPassword: '',
  });

  useEffect(() => {
    loadPlansAndCatalog();
  }, []);

  const loadPlansAndCatalog = async () => {
    try {
      const [plansRes, catalogRes] = await Promise.all([
        superAdminApi.getPlans(),
        superAdminApi.getModuleCatalog(),
      ]);
      if (plansRes.success) setPlans(plansRes.data);
      if (catalogRes.success) setModuleCatalog(catalogRes.data);

      const growth = plansRes.data?.find((p) => p.code === 'GROWTH');
      if (growth) {
        setFormData((prev) => ({
          ...prev,
          planId: growth.id,
          planCode: growth.code,
          customMaxStudents: growth.maxStudents,
          customMaxStaff: growth.maxStaff,
          amountPaid: growth.pricePerPeriod,
        }));
      }
    } catch (e) {
      console.error('Failed to load plans or catalog', e);
    }
  };

  const steps = [
    { label: 'School Identity' },
    { label: 'Campus & Academic' },
    { label: 'Subscription & Modules' },
    { label: 'Admin Account' },
    { label: 'Review & Onboard' },
  ];

  const updateField = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      // Auto-suggest slug from name if slug not yet manually modified
      if (field === 'name' && (!prev.slug || prev.slug === prev.name.toLowerCase().replace(/[^a-z0-9]/g, ''))) {
        updated.slug = value.toLowerCase().replace(/[^a-z0-9]/g, '');
      }

      // Auto-suggest school code from name initials
      if (field === 'name' && (!prev.code || prev.code === prev.name.split(' ').map(w => w[0]).join('').slice(0, 4).toUpperCase())) {
        updated.code = value.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 4).toUpperCase();
      }

      return updated;
    });
  };

  const handleSelectPlan = (plan) => {
    const included = plan.includedModules
      ? plan.includedModules.split(',').map((s) => s.trim().toUpperCase())
      : ['STUDENTS', 'ACADEMICS'];

    setFormData((prev) => ({
      ...prev,
      planId: plan.id,
      planCode: plan.code,
      customMaxStudents: plan.maxStudents,
      customMaxStaff: plan.maxStaff,
      amountPaid: plan.pricePerPeriod,
      enabledModuleCodes: included,
    }));
  };

  const handleToggleModuleCode = (code, isCore) => {
    if (isCore) return;
    setFormData((prev) => {
      const exists = prev.enabledModuleCodes.includes(code);
      const updated = exists
        ? prev.enabledModuleCodes.filter((c) => c !== code)
        : [...prev.enabledModuleCodes, code];
      return { ...prev, enabledModuleCodes: updated };
    });
  };

  // Step Validations
  const validateStep = () => {
    if (activeStep === 0) {
      if (!formData.name.trim()) {
        toastRef.current?.show({ severity: 'warn', summary: 'Required', detail: 'Please enter School Name.' });
        return false;
      }
      if (!formData.code.trim()) {
        toastRef.current?.show({ severity: 'warn', summary: 'Required', detail: 'Please enter School Code.' });
        return false;
      }
      if (!formData.slug.trim()) {
        toastRef.current?.show({ severity: 'warn', summary: 'Required', detail: 'Please enter Subdomain / Slug.' });
        return false;
      }
    } else if (activeStep === 1) {
      if (!formData.branchName.trim()) {
        toastRef.current?.show({ severity: 'warn', summary: 'Required', detail: 'Please enter Branch Name.' });
        return false;
      }
      if (!formData.academicYearName.trim()) {
        toastRef.current?.show({ severity: 'warn', summary: 'Required', detail: 'Please enter Academic Year Name.' });
        return false;
      }
    } else if (activeStep === 3) {
      if (!formData.adminUsername.trim()) {
        toastRef.current?.show({ severity: 'warn', summary: 'Required', detail: 'Please enter Initial Admin Username.' });
        return false;
      }
      if (!formData.adminPassword || formData.adminPassword.length < 6) {
        toastRef.current?.show({ severity: 'warn', summary: 'Required', detail: 'Password must be at least 6 characters.' });
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      setActiveStep((prev) => Math.min(prev + 1, steps.length - 1));
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        slug: formData.slug.trim().toLowerCase(),
        logoUrl: formData.logoUrl.trim() || null,
        affiliationNumber: formData.affiliationNumber.trim() || null,
        address: formData.address.trim() || null,
        city: formData.city.trim() || null,
        state: formData.state.trim() || null,
        pincode: formData.pincode.trim() || null,
        contactNumber: formData.contactNumber.trim() || null,
        email: formData.email.trim() || null,
        website: formData.website.trim() || null,

        branchName: formData.branchName.trim(),
        branchCode: formData.branchCode.trim().toUpperCase(),
        academicYearName: formData.academicYearName.trim(),
        academicYearStartDate: formData.academicYearStartDate,
        academicYearEndDate: formData.academicYearEndDate,

        planId: formData.planId,
        planCode: formData.planCode,
        subscriptionStartDate: formData.subscriptionStartDate,
        subscriptionEndDate: formData.subscriptionEndDate,
        customMaxStudents: Number(formData.customMaxStudents) || 1000,
        customMaxStaff: Number(formData.customMaxStaff) || 75,
        amountPaid: Number(formData.amountPaid) || 0,
        subscriptionStatus: formData.subscriptionStatus,

        enabledModuleCodes: formData.enabledModuleCodes,

        adminFullName: formData.adminFullName.trim() || `${formData.name} Admin`,
        adminUsername: formData.adminUsername.trim(),
        adminEmail: formData.adminEmail.trim() || formData.email.trim(),
        adminMobile: formData.adminMobile.trim() || formData.contactNumber.trim() || null,
        adminPassword: formData.adminPassword,
      };

      const res = await superAdminApi.createTenant(payload);
      if (res.success) {
        setProvisionedSchool(res.data);
        toastRef.current?.show({
          severity: 'success',
          summary: 'Tenant Provisioned!',
          detail: `Successfully created ${res.data.name}`,
          life: 4000,
        });
      }
    } catch (err) {
      toastRef.current?.show({
        severity: 'error',
        summary: 'Provisioning Error',
        detail: err.response?.data?.message || 'Failed to onboard school tenant',
        life: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImpersonateNewSchool = async () => {
    if (!provisionedSchool) return;
    try {
      setLoading(true);
      const res = await superAdminApi.impersonateTenant(provisionedSchool.id);
      if (res.success) {
        startImpersonation({
          user: res.data.user,
          accessToken: res.data.accessToken,
          refreshToken: res.data.refreshToken,
          permissions: res.data.permissions,
          school: {
            id: res.data.schoolId,
            name: res.data.schoolName,
            slug: res.data.schoolSlug,
          },
        });
        navigate('/dashboard');
      }
    } catch (err) {
      toastRef.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to impersonate newly created school.',
      });
    } finally {
      setLoading(false);
    }
  };

  // If already provisioned successfully
  if (provisionedSchool) {
    return (
      <div className="flex flex-column align-items-center justify-content-center p-6">
        <Toast ref={toastRef} />
        <div className="bg-white p-5 border-round-xl shadow-2 border-1 surface-border max-w-30rem w-full text-center flex flex-column align-items-center">
          <div
            className="flex align-items-center justify-content-center border-round-circle mb-3"
            style={{ width: '64px', height: '64px', backgroundColor: '#dcfce7' }}
          >
            <i className="pi pi-check text-3xl text-emerald-600"></i>
          </div>

          <h2 className="text-xl font-bold text-slate-800 m-0">School Provisioned Successfully!</h2>
          <p className="text-xs text-slate-500 mt-2 mb-4">
            <strong>{provisionedSchool.name}</strong> is now live with dedicated tenant space, initial branch, default academic session, and school administrator account.
          </p>

          <div className="w-full p-3 border-round bg-slate-50 border-1 surface-border text-left text-xs mb-4 flex flex-column gap-2">
            <div>
              <span className="text-slate-400">Subdomain: </span>
              <strong className="text-indigo-600 font-mono">https://{provisionedSchool.slug}.schoolerp.com</strong>
            </div>
            <div>
              <span className="text-slate-400">Plan: </span>
              <strong>{provisionedSchool.currentSubscription?.planName || formData.planCode}</strong>
            </div>
            <div className="flex align-items-center justify-content-between">
              <div>
                <span className="text-slate-400">Admin Username: </span>
                <strong className="text-indigo-700 font-mono">{formData.adminUsername}</strong>
              </div>
              <Button
                icon="pi pi-copy"
                text
                size="small"
                severity="secondary"
                title="Copy Username"
                onClick={() => copyToClipboard(formData.adminUsername, 'Admin Username')}
              />
            </div>
            <div className="flex align-items-center justify-content-between">
              <div>
                <span className="text-slate-400">Admin Password: </span>
                <strong className={`font-mono ${showCreatedPassword ? 'text-emerald-700' : 'text-slate-600'}`}>
                  {showCreatedPassword ? formData.adminPassword : '••••••••••••'}
                </strong>
              </div>
              <div className="flex align-items-center gap-1">
                <Button
                  icon={showCreatedPassword ? 'pi pi-eye-slash' : 'pi pi-eye'}
                  text
                  size="small"
                  severity="secondary"
                  title={showCreatedPassword ? 'Hide Password' : 'Show Password'}
                  onClick={() => setShowCreatedPassword(!showCreatedPassword)}
                />
                <Button
                  icon="pi pi-copy"
                  text
                  size="small"
                  severity="secondary"
                  title="Copy Password"
                  onClick={() => copyToClipboard(formData.adminPassword, 'Admin Password')}
                />
              </div>
            </div>
            <div>
              <span className="text-slate-400">Admin Email: </span>
              <span className="text-slate-700">{formData.adminEmail || formData.email}</span>
            </div>

            <Button
              label="Copy All Login Credentials"
              icon="pi pi-copy"
              size="small"
              outlined
              severity="secondary"
              className="mt-2 w-full text-xs"
              onClick={copyAllCredentials}
            />
          </div>

          <div className="flex flex-column gap-2 w-full">
            <Button
              label="Impersonate & Open School View"
              icon="pi pi-external-link"
              severity="warning"
              loading={loading}
              className="w-full font-bold"
              onClick={handleImpersonateNewSchool}
            />
            <Button
              label="View School Management Profile"
              icon="pi pi-sliders-h"
              outlined
              className="w-full"
              onClick={() => navigate(`/superadmin/tenants/${provisionedSchool.id}`)}
            />
            <Button
              label="Return to Tenants Directory"
              icon="pi pi-arrow-left"
              text
              severity="secondary"
              className="w-full text-xs"
              onClick={() => navigate('/superadmin/tenants')}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-column gap-4 max-w-60rem mx-auto pb-6">
      <Toast ref={toastRef} />

      {/* Header */}
      <div className="flex align-items-center justify-content-between bg-white p-4 border-round-lg shadow-1 border-1 surface-border">
        <div>
          <div className="flex align-items-center gap-2 mb-1">
            <Button
              icon="pi pi-arrow-left"
              size="small"
              text
              severity="secondary"
              className="p-0 text-slate-500"
              onClick={() => navigate('/superadmin/tenants')}
            />
            <h2 className="text-xl font-bold text-slate-800 m-0">Onboard New School (Multi-Tenant Wizard)</h2>
          </div>
          <p className="text-xs text-slate-500 m-0 pl-4">
            Follow this 5-step guided wizard to provision a new school entity, assign subscription quotas, configure modules, and issue admin access.
          </p>
        </div>
      </div>

      {/* Steps Navigation */}
      <div className="bg-white p-3 border-round-lg shadow-1 border-1 surface-border">
        <Steps
          model={steps}
          activeIndex={activeStep}
          onSelect={(e) => {
            if (e.index < activeStep) setActiveStep(e.index);
          }}
          readOnly={false}
          className="text-xs"
        />
      </div>

      {/* Step Content Card */}
      <div className="bg-white p-4 border-round-lg shadow-1 border-1 surface-border">
        {/* STEP 0: SCHOOL IDENTITY */}
        {activeStep === 0 && (
          <div className="flex flex-column gap-3">
            <h3 className="text-base font-bold text-slate-800 m-0 pb-2 border-bottom-1 surface-border">
              Step 1: School Identity & Subdomain
            </h3>

            <div className="grid">
              <div className="col-12 md:col-6">
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  School Name <span className="text-red-500">*</span>
                </label>
                <InputText
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="e.g. St. Xavier's International School"
                  className="p-inputtext-sm w-full"
                />
              </div>

              <div className="col-12 md:col-6">
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  School Code (Acronym) <span className="text-red-500">*</span>
                </label>
                <InputText
                  value={formData.code}
                  onChange={(e) => updateField('code', e.target.value.toUpperCase())}
                  placeholder="e.g. SXIS"
                  className="p-inputtext-sm w-full uppercase"
                  maxLength={10}
                />
              </div>

              <div className="col-12">
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Tenant Subdomain / Slug <span className="text-red-500">*</span>
                </label>
                <div className="flex align-items-center gap-2">
                  <InputText
                    value={formData.slug}
                    onChange={(e) => updateField('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="e.g. stxaviers"
                    className="p-inputtext-sm flex-1 font-mono"
                  />
                  <span className="text-xs font-mono text-slate-500 px-3 py-2 border-round bg-slate-100 border-1 surface-border">
                    .schoolerp.com
                  </span>
                </div>
                <small className="text-xs text-indigo-600 block mt-1">
                  Live Preview URL: https://{formData.slug || 'your-school'}.schoolerp.com
                </small>
              </div>

              <div className="col-12 md:col-6">
                <label className="text-xs font-semibold text-slate-700 block mb-1">Affiliation / Board Reg Number</label>
                <InputText
                  value={formData.affiliationNumber}
                  onChange={(e) => updateField('affiliationNumber', e.target.value)}
                  placeholder="e.g. CBSE/AFF/2026/8492"
                  className="p-inputtext-sm w-full"
                />
              </div>

              <div className="col-12 md:col-6">
                <label className="text-xs font-semibold text-slate-700 block mb-1">Logo URL (Optional)</label>
                <InputText
                  value={formData.logoUrl}
                  onChange={(e) => updateField('logoUrl', e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="p-inputtext-sm w-full"
                />
              </div>

              <div className="col-12 md:col-4">
                <label className="text-xs font-semibold text-slate-700 block mb-1">City</label>
                <InputText
                  value={formData.city}
                  onChange={(e) => updateField('city', e.target.value)}
                  placeholder="e.g. Bengaluru"
                  className="p-inputtext-sm w-full"
                />
              </div>

              <div className="col-12 md:col-4">
                <label className="text-xs font-semibold text-slate-700 block mb-1">State</label>
                <InputText
                  value={formData.state}
                  onChange={(e) => updateField('state', e.target.value)}
                  placeholder="e.g. Karnataka"
                  className="p-inputtext-sm w-full"
                />
              </div>

              <div className="col-12 md:col-4">
                <label className="text-xs font-semibold text-slate-700 block mb-1">Pincode</label>
                <InputText
                  value={formData.pincode}
                  onChange={(e) => updateField('pincode', e.target.value)}
                  placeholder="e.g. 560001"
                  className="p-inputtext-sm w-full"
                  maxLength={6}
                />
              </div>

              <div className="col-12 md:col-6">
                <label className="text-xs font-semibold text-slate-700 block mb-1">Contact Phone</label>
                <InputText
                  value={formData.contactNumber}
                  onChange={(e) => updateField('contactNumber', e.target.value)}
                  placeholder="+91 98765 43210"
                  className="p-inputtext-sm w-full"
                />
              </div>

              <div className="col-12 md:col-6">
                <label className="text-xs font-semibold text-slate-700 block mb-1">Official School Email</label>
                <InputText
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="info@school.edu.in"
                  className="p-inputtext-sm w-full"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 1: CAMPUS & ACADEMIC SETUP */}
        {activeStep === 1 && (
          <div className="flex flex-column gap-3">
            <h3 className="text-base font-bold text-slate-800 m-0 pb-2 border-bottom-1 surface-border">
              Step 2: Campus & Academic Year Initialization
            </h3>

            <p className="text-xs text-slate-500 m-0">
              Each school requires a root campus branch and an initial active academic session to support student admissions and fee collections.
            </p>

            <div className="grid">
              <div className="col-12 md:col-8">
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Primary Campus / Branch Name <span className="text-red-500">*</span>
                </label>
                <InputText
                  value={formData.branchName}
                  onChange={(e) => updateField('branchName', e.target.value)}
                  placeholder="e.g. Main Campus / Senior Wing"
                  className="p-inputtext-sm w-full"
                />
              </div>

              <div className="col-12 md:col-4">
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Branch Code <span className="text-red-500">*</span>
                </label>
                <InputText
                  value={formData.branchCode}
                  onChange={(e) => updateField('branchCode', e.target.value.toUpperCase())}
                  placeholder="e.g. MAIN"
                  className="p-inputtext-sm w-full uppercase"
                />
              </div>

              <div className="col-12 md:col-4">
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Academic Session Name <span className="text-red-500">*</span>
                </label>
                <InputText
                  value={formData.academicYearName}
                  onChange={(e) => updateField('academicYearName', e.target.value)}
                  placeholder="e.g. 2026-27"
                  className="p-inputtext-sm w-full"
                />
              </div>

              <div className="col-12 md:col-4">
                <label className="text-xs font-semibold text-slate-700 block mb-1">Session Start Date</label>
                <Calendar
                  value={formData.academicYearStartDate}
                  onChange={(e) => updateField('academicYearStartDate', e.value)}
                  dateFormat="dd/mm/yy"
                  className="p-inputtext-sm w-full"
                />
              </div>

              <div className="col-12 md:col-4">
                <label className="text-xs font-semibold text-slate-700 block mb-1">Session End Date</label>
                <Calendar
                  value={formData.academicYearEndDate}
                  onChange={(e) => updateField('academicYearEndDate', e.value)}
                  dateFormat="dd/mm/yy"
                  className="p-inputtext-sm w-full"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: SUBSCRIPTION PLAN & MODULES */}
        {activeStep === 2 && (
          <div className="flex flex-column gap-3">
            <h3 className="text-base font-bold text-slate-800 m-0 pb-2 border-bottom-1 surface-border">
              Step 3: License Tier & Module Enablement
            </h3>

            <span className="text-xs font-semibold text-slate-700 block">Choose Subscription Plan:</span>
            <div className="grid">
              {plans.map((p) => {
                const isSelected = formData.planCode === p.code;
                return (
                  <div key={p.id} className="col-12 md:col-4">
                    <div
                      onClick={() => handleSelectPlan(p)}
                      className="p-3 border-round-lg cursor-pointer transition-all border-2 flex flex-column justify-content-between h-full"
                      style={{
                        borderColor: isSelected ? '#4f46e5' : '#e2e8f0',
                        backgroundColor: isSelected ? '#eef2ff' : '#ffffff',
                      }}
                    >
                      <div>
                        <div className="flex align-items-center justify-content-between mb-2">
                          <span className="font-bold text-sm text-slate-800">{p.name}</span>
                          {isSelected && <Tag value="Selected" severity="success" />}
                        </div>
                        <div className="text-xl font-bold text-indigo-700 mb-1">
                          ₹{Number(p.pricePerPeriod).toLocaleString('en-IN')}{' '}
                          <span className="text-xs font-normal text-slate-500">/{p.billingPeriod}</span>
                        </div>
                        <p className="text-xs text-slate-500 m-0 mb-3">{p.description}</p>
                      </div>

                      <div className="pt-2 border-top-1 surface-border text-xs flex flex-column gap-1 text-slate-600">
                        <div>
                          <i className="pi pi-check text-emerald-500 mr-1 text-xs"></i>
                          Up to <strong>{p.maxStudents}</strong> Students
                        </div>
                        <div>
                          <i className="pi pi-check text-emerald-500 mr-1 text-xs"></i>
                          Up to <strong>{p.maxStaff}</strong> Faculty / Staff
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Custom Quota Overrides */}
            <div className="grid mt-2">
              <div className="col-12 md:col-4">
                <label className="text-xs font-semibold text-slate-700 block mb-1">Max Student Quota</label>
                <InputText
                  type="number"
                  value={formData.customMaxStudents}
                  onChange={(e) => updateField('customMaxStudents', e.target.value)}
                  className="p-inputtext-sm w-full"
                />
              </div>
              <div className="col-12 md:col-4">
                <label className="text-xs font-semibold text-slate-700 block mb-1">Max Staff Quota</label>
                <InputText
                  type="number"
                  value={formData.customMaxStaff}
                  onChange={(e) => updateField('customMaxStaff', e.target.value)}
                  className="p-inputtext-sm w-full"
                />
              </div>
              <div className="col-12 md:col-4">
                <label className="text-xs font-semibold text-slate-700 block mb-1">Subscription Status</label>
                <Dropdown
                  value={formData.subscriptionStatus}
                  options={[
                    { label: 'Active', value: 'Active' },
                    { label: 'Trial', value: 'Trial' },
                    { label: 'Suspended', value: 'Suspended' },
                  ]}
                  onChange={(e) => updateField('subscriptionStatus', e.value)}
                  className="p-inputtext-sm w-full"
                />
              </div>
            </div>

            {/* Feature Modules Toggle */}
            <div className="mt-3">
              <span className="text-xs font-semibold text-slate-700 block mb-2">
                Enable / Disable Feature Modules for this School:
              </span>
              <div className="grid">
                {moduleCatalog.map((mod) => {
                  const isChecked = mod.isCore || formData.enabledModuleCodes.includes(mod.code);
                  return (
                    <div key={mod.code} className="col-12 sm:col-6 md:col-4">
                      <div
                        onClick={() => handleToggleModuleCode(mod.code, mod.isCore)}
                        className={`p-2 border-round border-1 flex align-items-center justify-content-between cursor-pointer transition-colors ${
                          isChecked ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex flex-column">
                          <span className="text-xs font-semibold text-slate-800">{mod.name}</span>
                          <span className="text-xs text-slate-400">{mod.category}</span>
                        </div>
                        <Checkbox
                          checked={isChecked}
                          disabled={mod.isCore}
                          onChange={() => handleToggleModuleCode(mod.code, mod.isCore)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: INITIAL ADMIN ACCOUNT */}
        {activeStep === 3 && (
          <div className="flex flex-column gap-3">
            <h3 className="text-base font-bold text-slate-800 m-0 pb-2 border-bottom-1 surface-border">
              Step 4: Initial School Administrator Credentials
            </h3>

            <p className="text-xs text-slate-500 m-0">
              Create the primary school administrator user account. This administrator will have complete local operational permissions for this school.
            </p>

            <div className="grid">
              <div className="col-12 md:col-6">
                <label className="text-xs font-semibold text-slate-700 block mb-1">Admin Full Name</label>
                <InputText
                  value={formData.adminFullName}
                  onChange={(e) => updateField('adminFullName', e.target.value)}
                  placeholder="e.g. Dr. Rajesh Sharma"
                  className="p-inputtext-sm w-full"
                />
              </div>

              <div className="col-12 md:col-6">
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Admin Login Username <span className="text-red-500">*</span>
                </label>
                <InputText
                  value={formData.adminUsername}
                  onChange={(e) => updateField('adminUsername', e.target.value.toLowerCase().trim())}
                  placeholder="e.g. principal.dps"
                  className="p-inputtext-sm w-full font-mono"
                />
              </div>

              <div className="col-12 md:col-6">
                <label className="text-xs font-semibold text-slate-700 block mb-1">Admin Email</label>
                <InputText
                  value={formData.adminEmail}
                  onChange={(e) => updateField('adminEmail', e.target.value)}
                  placeholder="principal@school.edu.in"
                  className="p-inputtext-sm w-full"
                />
              </div>

              <div className="col-12 md:col-6">
                <label className="text-xs font-semibold text-slate-700 block mb-1">Admin Mobile</label>
                <InputText
                  value={formData.adminMobile}
                  onChange={(e) => updateField('adminMobile', e.target.value)}
                  placeholder="+91 98765 00000"
                  className="p-inputtext-sm w-full"
                />
              </div>

              <div className="col-12 md:col-6">
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Default Login Password <span className="text-red-500">*</span>
                </label>
                <Password
                  value={formData.adminPassword}
                  onChange={(e) => updateField('adminPassword', e.target.value)}
                  placeholder="Min 6 characters"
                  toggleMask
                  feedback
                  className="p-inputtext-sm w-full"
                  inputClassName="w-full"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: REVIEW & PROVISION */}
        {activeStep === 4 && (
          <div className="flex flex-column gap-3">
            <h3 className="text-base font-bold text-slate-800 m-0 pb-2 border-bottom-1 surface-border">
              Step 5: Review & Finalize Onboarding
            </h3>

            <div className="p-3 border-round-lg bg-indigo-50 border-1 border-indigo-200 text-xs text-indigo-900 flex align-items-center gap-2">
              <i className="pi pi-info-circle text-base text-indigo-600"></i>
              <span>
                Submitting will atomically create the School, Main Campus Branch, Academic Session, Subscription Plan, Module Grants, and the Initial School Admin account.
              </span>
            </div>

            <div className="grid">
              <div className="col-12 md:col-6">
                <div className="p-3 border-round border-1 surface-border bg-slate-50 flex flex-column gap-2 text-xs">
                  <span className="font-bold text-slate-700 text-sm">School Entity</span>
                  <div>
                    <span className="text-slate-400">Name: </span>
                    <strong>{formData.name}</strong> ({formData.code})
                  </div>
                  <div>
                    <span className="text-slate-400">Subdomain: </span>
                    <span className="font-mono text-indigo-600">https://{formData.slug}.schoolerp.com</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Location: </span>
                    <span>{formData.city}, {formData.state}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Contact: </span>
                    <span>{formData.contactNumber} | {formData.email}</span>
                  </div>
                </div>
              </div>

              <div className="col-12 md:col-6">
                <div className="p-3 border-round border-1 surface-border bg-slate-50 flex flex-column gap-2 text-xs">
                  <span className="font-bold text-slate-700 text-sm">Subscription & Quota</span>
                  <div>
                    <span className="text-slate-400">Plan: </span>
                    <strong className="text-purple-700">{formData.planCode}</strong> (Status: {formData.subscriptionStatus})
                  </div>
                  <div>
                    <span className="text-slate-400">Max Students: </span>
                    <strong>{formData.customMaxStudents}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Enabled Modules: </span>
                    <span>{formData.enabledModuleCodes.length} active features</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Initial Admin: </span>
                    <strong>{formData.adminUsername}</strong> ({formData.adminEmail || formData.email})
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Controls Footer */}
        <div className="flex align-items-center justify-content-between pt-4 mt-3 border-top-1 surface-border">
          <Button
            label="Back"
            icon="pi pi-arrow-left"
            size="small"
            outlined
            severity="secondary"
            disabled={activeStep === 0 || loading}
            onClick={handleBack}
          />

          {activeStep < steps.length - 1 ? (
            <Button
              label="Next Step"
              icon="pi pi-arrow-right"
              iconPos="right"
              size="small"
              className="bg-indigo-600 border-indigo-600 hover:bg-indigo-700"
              onClick={handleNext}
            />
          ) : (
            <Button
              label="Provision School & Launch"
              icon="pi pi-check"
              size="small"
              className="bg-emerald-600 border-emerald-600 hover:bg-emerald-700 font-bold"
              loading={loading}
              onClick={handleSubmit}
            />
          )}
        </div>
      </div>
    </div>
  );
};
