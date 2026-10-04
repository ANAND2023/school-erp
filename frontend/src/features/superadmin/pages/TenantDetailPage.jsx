import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TabView, TabPanel } from 'primereact/tabview';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { InputSwitch } from 'primereact/inputswitch';
import { Dialog } from 'primereact/dialog';
import { Calendar } from 'primereact/calendar';
import { ProgressSpinner } from 'primereact/progressspinner';
import { superAdminApi } from '../api/superAdminApi';
import { useAuthStore } from '../../../store/authStore';

export const TenantDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toastRef = useRef(null);
  const { startImpersonation } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingModules, setSavingModules] = useState(false);
  const [impersonating, setImpersonating] = useState(false);

  // Profile Form state
  const [profileForm, setProfileForm] = useState({
    name: '',
    code: '',
    slug: '',
    city: '',
    state: '',
    pincode: '',
    contactNumber: '',
    email: '',
    website: '',
    affiliationNumber: '',
    status: 'Active',
    isActive: true,
  });

  // Modules local state
  const [modulesList, setModulesList] = useState([]);

  // Renewal Dialog state
  const [renewalDialogVisible, setRenewalDialogVisible] = useState(false);
  const [plans, setPlans] = useState([]);
  const [renewalForm, setRenewalForm] = useState({
    planId: null,
    startDate: new Date(),
    endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
    customMaxStudents: 1000,
    customMaxStaff: 75,
    amountPaid: 4999,
    status: 'Active',
    notes: 'Renewed via Super Admin',
  });
  const [savingRenewal, setSavingRenewal] = useState(false);

  // Password visibility & reset state
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [resetDialogVisible, setResetDialogVisible] = useState(false);
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [savingNewPassword, setSavingNewPassword] = useState(false);

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

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$!';
    let pwd = '';
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewAdminPassword(pwd);
  };

  const handleResetPasswordSubmit = async () => {
    if (!newAdminPassword || newAdminPassword.length < 6) {
      toastRef.current?.show({
        severity: 'warn',
        summary: 'Invalid Password',
        detail: 'Password must be at least 6 characters long.',
      });
      return;
    }

    try {
      setSavingNewPassword(true);
      const res = await superAdminApi.resetAdminPassword(id, newAdminPassword);
      if (res.success) {
        toastRef.current?.show({
          severity: 'success',
          summary: 'Password Updated',
          detail: 'School admin password updated successfully.',
        });
        setTenant((prev) => ({
          ...prev,
          initialAdminPassword: newAdminPassword,
          adminUser: prev.adminUser ? { ...prev.adminUser, initialPassword: newAdminPassword } : prev.adminUser,
        }));
        setShowAdminPassword(true);
        setResetDialogVisible(false);
      }
    } catch (err) {
      toastRef.current?.show({
        severity: 'error',
        summary: 'Reset Failed',
        detail: err.response?.data?.message || 'Failed to update admin password',
      });
    } finally {
      setSavingNewPassword(false);
    }
  };

  useEffect(() => {
    loadTenantDetail();
  }, [id]);

  const loadTenantDetail = async () => {
    try {
      setLoading(true);
      const res = await superAdminApi.getTenantById(id);
      if (res.success) {
        setTenant(res.data);
        setProfileForm({
          name: res.data.name,
          code: res.data.code,
          slug: res.data.slug,
          city: res.data.city || '',
          state: res.data.state || '',
          pincode: res.data.pincode || '',
          contactNumber: res.data.contactNumber || '',
          email: res.data.email || '',
          website: res.data.website || '',
          affiliationNumber: res.data.affiliationNumber || '',
          status: res.data.status,
          isActive: res.data.isActive,
        });
        setModulesList(res.data.modules);
      }
    } catch (err) {
      toastRef.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load school tenant details',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true);
      const res = await superAdminApi.updateTenant(id, profileForm);
      if (res.success) {
        toastRef.current?.show({
          severity: 'success',
          summary: 'Updated',
          detail: 'School profile details updated successfully.',
        });
        loadTenantDetail();
      }
    } catch (err) {
      toastRef.current?.show({
        severity: 'error',
        summary: 'Update Failed',
        detail: err.response?.data?.message || 'Failed to update tenant profile',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleToggleModule = (code, currentVal, isCore) => {
    if (isCore) return;
    setModulesList((prev) =>
      prev.map((m) => (m.code === code ? { ...m, isEnabled: !currentVal } : m))
    );
  };

  const handleSaveModules = async () => {
    try {
      setSavingModules(true);
      const enabledCodes = modulesList.filter((m) => m.isEnabled).map((m) => m.code);
      const res = await superAdminApi.updateTenantModules(id, enabledCodes);
      if (res.success) {
        toastRef.current?.show({
          severity: 'success',
          summary: 'Saved',
          detail: 'Active functional modules updated.',
        });
        setModulesList(res.data);
      }
    } catch (err) {
      toastRef.current?.show({
        severity: 'error',
        summary: 'Save Failed',
        detail: err.response?.data?.message || 'Failed to save module configuration',
      });
    } finally {
      setSavingModules(false);
    }
  };

  const handleImpersonate = async () => {
    try {
      setImpersonating(true);
      const res = await superAdminApi.impersonateTenant(id);
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
        toastRef.current?.show({
          severity: 'success',
          summary: 'Impersonation Active',
          detail: `Switching into ${res.data.schoolName}...`,
        });
        setTimeout(() => {
          navigate('/dashboard');
        }, 600);
      }
    } catch (err) {
      toastRef.current?.show({
        severity: 'error',
        summary: 'Impersonation Failed',
        detail: err.response?.data?.message || 'Unable to switch into tenant account',
      });
    } finally {
      setImpersonating(false);
    }
  };

  const openRenewalDialog = async () => {
    try {
      const plansRes = await superAdminApi.getPlans();
      if (plansRes.success) {
        setPlans(plansRes.data);
        const curPlan = tenant?.currentSubscription;
        setRenewalForm({
          planId: curPlan?.planId || plansRes.data[0]?.id,
          startDate: new Date(),
          endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
          customMaxStudents: curPlan?.customMaxStudents || 1000,
          customMaxStaff: curPlan?.customMaxStaff || 75,
          amountPaid: curPlan?.amountPaid || 4999,
          status: 'Active',
          notes: 'Renewed via Super Admin',
        });
        setRenewalDialogVisible(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveRenewal = async () => {
    try {
      setSavingRenewal(true);
      const res = await superAdminApi.renewSubscription(id, renewalForm);
      if (res.success) {
        toastRef.current?.show({
          severity: 'success',
          summary: 'Subscription Renewed',
          detail: 'New validity period and quotas activated.',
        });
        setRenewalDialogVisible(false);
        loadTenantDetail();
      }
    } catch (err) {
      toastRef.current?.show({
        severity: 'error',
        summary: 'Renewal Failed',
        detail: err.response?.data?.message || 'Failed to renew subscription',
      });
    } finally {
      setSavingRenewal(false);
    }
  };

  if (loading || !tenant) {
    return (
      <div className="flex flex-column align-items-center justify-content-center p-8">
        <ProgressSpinner style={{ width: '45px', height: '45px' }} />
        <span className="text-sm text-slate-500 mt-3 font-medium">Loading school details...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-column gap-4 max-w-70rem mx-auto pb-6">
      <Toast ref={toastRef} />

      {/* Header Banner */}
      <div className="bg-white p-4 border-round-lg shadow-1 border-1 surface-border flex flex-column sm:flex-row align-items-start sm:align-items-center justify-content-between gap-3">
        <div className="flex align-items-center gap-3">
          <Button
            icon="pi pi-arrow-left"
            size="small"
            text
            severity="secondary"
            className="p-0 text-slate-500"
            onClick={() => navigate('/superadmin/tenants')}
          />
          <div
            className="flex align-items-center justify-content-center border-round font-bold text-white shadow-1"
            style={{
              width: '48px',
              height: '48px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
              fontSize: '16px',
            }}
          >
            {tenant.code || tenant.name.slice(0, 3).toUpperCase()}
          </div>
          <div className="flex flex-column">
            <div className="flex align-items-center gap-2">
              <h2 className="text-xl font-bold text-slate-800 m-0">{tenant.name}</h2>
              <Tag
                value={tenant.status}
                severity={tenant.status === 'Active' ? 'success' : tenant.status === 'Trial' ? 'warning' : 'danger'}
              />
            </div>
            <div className="flex align-items-center gap-3 text-xs text-slate-500 mt-1">
              <span className="font-mono text-indigo-600">https://{tenant.slug}.schoolerp.com</span>
              <span>•</span>
              <span>{tenant.city || 'No City'}, {tenant.state || ''}</span>
              <span>•</span>
              <span>{tenant.totalStudents} Students</span>
            </div>
          </div>
        </div>

        <div className="flex align-items-center gap-2">
          <Button
            label="Switch to School Admin"
            icon="pi pi-external-link"
            size="small"
            severity="warning"
            loading={impersonating}
            className="font-semibold"
            onClick={handleImpersonate}
          />
        </div>
      </div>

      {/* Main Tabs */}
      <div className="bg-white border-round-lg shadow-1 border-1 surface-border overflow-hidden">
        <TabView>
          {/* TAB 1: PROFILE & BRANCHES */}
          <TabPanel header="Overview & Profile" leftIcon="pi pi-building mr-2">
            <div className="p-3 flex flex-column gap-4">
              <div className="grid">
                <div className="col-12 md:col-6">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">School Name</label>
                  <InputText
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="p-inputtext-sm w-full"
                  />
                </div>
                <div className="col-12 md:col-3">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">School Code</label>
                  <InputText
                    value={profileForm.code}
                    onChange={(e) => setProfileForm({ ...profileForm, code: e.target.value.toUpperCase() })}
                    className="p-inputtext-sm w-full uppercase"
                  />
                </div>
                <div className="col-12 md:col-3">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Subdomain Slug</label>
                  <InputText
                    value={profileForm.slug}
                    onChange={(e) => setProfileForm({ ...profileForm, slug: e.target.value.toLowerCase() })}
                    className="p-inputtext-sm w-full font-mono"
                  />
                </div>

                <div className="col-12 md:col-4">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">City</label>
                  <InputText
                    value={profileForm.city}
                    onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                    className="p-inputtext-sm w-full"
                  />
                </div>
                <div className="col-12 md:col-4">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">State</label>
                  <InputText
                    value={profileForm.state}
                    onChange={(e) => setProfileForm({ ...profileForm, state: e.target.value })}
                    className="p-inputtext-sm w-full"
                  />
                </div>
                <div className="col-12 md:col-4">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Pincode</label>
                  <InputText
                    value={profileForm.pincode}
                    onChange={(e) => setProfileForm({ ...profileForm, pincode: e.target.value })}
                    className="p-inputtext-sm w-full"
                  />
                </div>

                <div className="col-12 md:col-4">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Contact Phone</label>
                  <InputText
                    value={profileForm.contactNumber}
                    onChange={(e) => setProfileForm({ ...profileForm, contactNumber: e.target.value })}
                    className="p-inputtext-sm w-full"
                  />
                </div>
                <div className="col-12 md:col-4">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Official Email</label>
                  <InputText
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="p-inputtext-sm w-full"
                  />
                </div>
                <div className="col-12 md:col-4">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Status</label>
                  <Dropdown
                    value={profileForm.status}
                    options={[
                      { label: 'Active', value: 'Active' },
                      { label: 'Suspended', value: 'Suspended' },
                      { label: 'Trial', value: 'Trial' },
                    ]}
                    onChange={(e) => setProfileForm({ ...profileForm, status: e.value })}
                    className="p-inputtext-sm w-full"
                  />
                </div>
              </div>

              <div className="flex justify-content-end">
                <Button
                  label="Save Profile Changes"
                  icon="pi pi-check"
                  size="small"
                  className="bg-indigo-600 border-indigo-600"
                  loading={savingProfile}
                  onClick={handleSaveProfile}
                />
              </div>

              {/* Branches list */}
              <div className="mt-4 pt-3 border-top-1 surface-border">
                <span className="font-bold text-sm text-slate-800 block mb-2">Registered Campus Branches</span>
                <div className="grid">
                  {tenant.branches.map((b) => (
                    <div key={b.id} className="col-12 md:col-6">
                      <div className="p-3 border-round border-1 surface-border bg-slate-50 flex align-items-center justify-content-between">
                        <div className="flex flex-column">
                          <span className="font-bold text-xs text-slate-800">{b.name}</span>
                          <span className="text-xs text-slate-400">Code: {b.code} | {b.city || 'No City'}</span>
                        </div>
                        <Tag value={b.isActive ? 'Active' : 'Inactive'} severity={b.isActive ? 'success' : 'secondary'} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabPanel>

          {/* TAB 2: MODULES MANAGEMENT */}
          <TabPanel header="Module Management" leftIcon="pi pi-th-large mr-2">
            <div className="p-3 flex flex-column gap-3">
              <div className="flex align-items-center justify-content-between pb-2 border-bottom-1 surface-border">
                <div>
                  <span className="font-bold text-sm text-slate-800 block">Feature Module Switches</span>
                  <span className="text-xs text-slate-500">
                    Enable or disable specific features per school. Core modules remain permanently locked to maintain data integrity.
                  </span>
                </div>
                <Button
                  label="Save Module Settings"
                  icon="pi pi-check"
                  size="small"
                  className="bg-indigo-600 border-indigo-600"
                  loading={savingModules}
                  onClick={handleSaveModules}
                />
              </div>

              <div className="grid">
                {modulesList.map((mod) => (
                  <div key={mod.code} className="col-12 md:col-6">
                    <div
                      className="p-3 border-round border-1 surface-border flex align-items-center justify-content-between h-full"
                      style={{ backgroundColor: mod.isCore ? '#f8fafc' : '#ffffff' }}
                    >
                      <div className="flex flex-column pr-3">
                        <div className="flex align-items-center gap-2">
                          <span className="font-bold text-xs text-slate-800">{mod.name}</span>
                          {mod.isCore && (
                            <Tag value="Core" severity="secondary" style={{ fontSize: '9px', padding: '0 4px' }} />
                          )}
                          <span className="text-xs text-slate-400">({mod.category})</span>
                        </div>
                        <span className="text-xs text-slate-500 mt-1">{mod.description}</span>
                      </div>

                      <InputSwitch
                        checked={mod.isEnabled}
                        disabled={mod.isCore}
                        onChange={() => handleToggleModule(mod.code, mod.isEnabled, mod.isCore)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabPanel>

          {/* TAB 3: SUBSCRIPTIONS & LICENSES */}
          <TabPanel header="Subscription & License" leftIcon="pi pi-credit-card mr-2">
            <div className="p-3 flex flex-column gap-4">
              <div className="flex align-items-center justify-content-between pb-2 border-bottom-1 surface-border">
                <div>
                  <span className="font-bold text-sm text-slate-800 block">Current Active Subscription</span>
                  <span className="text-xs text-slate-500">
                    Controls validity period, max students and faculty quotas, and billing status.
                  </span>
                </div>
                <Button
                  label="Renew / Extend Subscription"
                  icon="pi pi-refresh"
                  size="small"
                  className="bg-purple-600 border-purple-600 hover:bg-purple-700"
                  onClick={openRenewalDialog}
                />
              </div>

              {tenant.currentSubscription ? (
                <div className="grid">
                  <div className="col-12 md:col-3">
                    <div className="p-3 border-round border-1 surface-border bg-slate-50">
                      <span className="text-xs text-slate-400 block mb-1">Active Plan</span>
                      <strong className="text-base text-indigo-700">{tenant.currentSubscription.planName}</strong>
                    </div>
                  </div>
                  <div className="col-12 md:col-3">
                    <div className="p-3 border-round border-1 surface-border bg-slate-50">
                      <span className="text-xs text-slate-400 block mb-1">Validity Period</span>
                      <span className="text-xs text-slate-700 font-semibold block">
                        {new Date(tenant.currentSubscription.startDate).toLocaleDateString()} — {new Date(tenant.currentSubscription.endDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="col-12 md:col-3">
                    <div className="p-3 border-round border-1 surface-border bg-slate-50">
                      <span className="text-xs text-slate-400 block mb-1">Max Student Limit</span>
                      <strong className="text-base text-slate-800">{tenant.currentSubscription.customMaxStudents || 'Unlimited'}</strong>
                    </div>
                  </div>
                  <div className="col-12 md:col-3">
                    <div className="p-3 border-round border-1 surface-border bg-slate-50">
                      <span className="text-xs text-slate-400 block mb-1">Amount Paid</span>
                      <strong className="text-base text-emerald-600">₹{Number(tenant.currentSubscription.amountPaid).toLocaleString('en-IN')}</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-slate-400">No active subscription found.</div>
              )}

              {/* Subscription History */}
              <div className="mt-2">
                <span className="font-bold text-xs text-slate-700 uppercase tracking-wider block mb-2">Subscription History</span>
                <div className="flex flex-column gap-2">
                  {tenant.subscriptionHistory.map((sub) => (
                    <div
                      key={sub.id}
                      className="p-3 border-round border-1 surface-border flex align-items-center justify-content-between text-xs"
                    >
                      <div className="flex align-items-center gap-3">
                        <Tag value={sub.status} severity={sub.status === 'Active' ? 'success' : 'secondary'} />
                        <span className="font-bold text-slate-800">{sub.planName}</span>
                        <span className="text-slate-500">
                          {new Date(sub.startDate).toLocaleDateString()} to {new Date(sub.endDate).toLocaleDateString()}
                        </span>
                      </div>
                      <span className="font-semibold text-slate-700">₹{Number(sub.amountPaid).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabPanel>

          {/* TAB 4: SCHOOL ADMIN ACCOUNT */}
          <TabPanel header="Admin Account" leftIcon="pi pi-user mr-2">
            <div className="p-3 flex flex-column gap-3">
              <div className="flex align-items-center justify-content-between">
                <div>
                  <span className="font-bold text-sm text-slate-800 block">Initial School Administrator</span>
                  <span className="text-xs text-slate-500">Master account credentials provisioned for this school tenant</span>
                </div>
                {tenant.adminUser && (
                  <Button
                    label="Reset Password"
                    icon="pi pi-key"
                    size="small"
                    severity="warning"
                    outlined
                    onClick={() => {
                      setNewAdminPassword('');
                      setResetDialogVisible(true);
                    }}
                  />
                )}
              </div>

              {tenant.adminUser ? (
                <div className="p-4 border-round border-1 surface-border bg-slate-50 max-w-35rem flex flex-column gap-3 text-xs">
                  <div className="flex align-items-center justify-content-between">
                    <div>
                      <span className="text-slate-400 block mb-1">Administrator Full Name</span>
                      <strong className="text-slate-800 text-sm">{tenant.adminUser.fullName}</strong>
                    </div>
                    <Tag value={tenant.adminUser.isActive ? 'Active' : 'Inactive'} severity={tenant.adminUser.isActive ? 'success' : 'danger'} />
                  </div>

                  <div className="surface-border border-top-1 my-1"></div>

                  {/* Login Username */}
                  <div className="flex align-items-center justify-content-between bg-white p-2 border-round border-1 surface-border">
                    <div className="flex flex-column">
                      <span className="text-xs text-slate-400">Login ID / Username</span>
                      <span className="font-mono text-sm font-bold text-indigo-700">{tenant.adminUser.username}</span>
                    </div>
                    <Button
                      icon="pi pi-copy"
                      text
                      size="small"
                      severity="secondary"
                      title="Copy Username"
                      onClick={() => copyToClipboard(tenant.adminUser.username, 'Username')}
                    />
                  </div>

                  {/* Password */}
                  <div className="flex align-items-center justify-content-between bg-white p-2 border-round border-1 surface-border">
                    <div className="flex flex-column">
                      <span className="text-xs text-slate-400">Initial / Current Password</span>
                      <span className={`font-mono text-sm font-bold ${showAdminPassword ? 'text-emerald-700' : 'text-slate-600'}`}>
                        {showAdminPassword
                          ? (tenant.adminUser.initialPassword || tenant.initialAdminPassword || 'Admin@123')
                          : '••••••••••••'}
                      </span>
                    </div>
                    <div className="flex align-items-center gap-1">
                      <Button
                        icon={showAdminPassword ? 'pi pi-eye-slash' : 'pi pi-eye'}
                        text
                        size="small"
                        severity="secondary"
                        title={showAdminPassword ? 'Hide Password' : 'Show Password'}
                        onClick={() => setShowAdminPassword(!showAdminPassword)}
                      />
                      <Button
                        icon="pi pi-copy"
                        text
                        size="small"
                        severity="secondary"
                        title="Copy Password"
                        onClick={() =>
                          copyToClipboard(
                            tenant.adminUser.initialPassword || tenant.initialAdminPassword || 'Admin@123',
                            'Password'
                          )
                        }
                      />
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="grid mt-1">
                    <div className="col-6">
                      <span className="text-slate-400 block mb-1">Email Address</span>
                      <span className="font-medium text-slate-700">{tenant.adminUser.email || '—'}</span>
                    </div>
                    <div className="col-6">
                      <span className="text-slate-400 block mb-1">Mobile Number</span>
                      <span className="font-medium text-slate-700">{tenant.adminUser.mobile || '—'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400">No admin account linked yet.</div>
              )}
            </div>
          </TabPanel>
        </TabView>
      </div>

      {/* Renewal Dialog */}
      <Dialog
        header="Renew or Upgrade Subscription"
        visible={renewalDialogVisible}
        style={{ width: '480px' }}
        modal
        onHide={() => setRenewalDialogVisible(false)}
        footer={
          <div className="flex align-items-center justify-content-end gap-2">
            <Button
              label="Cancel"
              size="small"
              outlined
              severity="secondary"
              onClick={() => setRenewalDialogVisible(false)}
            />
            <Button
              label="Apply Renewal"
              icon="pi pi-check"
              size="small"
              className="bg-purple-600 border-purple-600"
              loading={savingRenewal}
              onClick={handleSaveRenewal}
            />
          </div>
        }
      >
        <div className="flex flex-column gap-3 py-2 text-xs">
          <div>
            <label className="font-semibold block mb-1">Select Plan</label>
            <Dropdown
              value={renewalForm.planId}
              options={plans.map((p) => ({ label: `${p.name} (₹${p.pricePerPeriod})`, value: p.id }))}
              onChange={(e) => {
                const selected = plans.find((p) => p.id === e.value);
                setRenewalForm({
                  ...renewalForm,
                  planId: e.value,
                  customMaxStudents: selected?.maxStudents || 1000,
                  customMaxStaff: selected?.maxStaff || 75,
                  amountPaid: selected?.pricePerPeriod || 0,
                });
              }}
              className="p-inputtext-sm w-full"
            />
          </div>

          <div className="grid">
            <div className="col-6">
              <label className="font-semibold block mb-1">Start Date</label>
              <Calendar
                value={renewalForm.startDate}
                onChange={(e) => setRenewalForm({ ...renewalForm, startDate: e.value })}
                dateFormat="dd/mm/yy"
                className="p-inputtext-sm w-full"
              />
            </div>
            <div className="col-6">
              <label className="font-semibold block mb-1">End Date</label>
              <Calendar
                value={renewalForm.endDate}
                onChange={(e) => setRenewalForm({ ...renewalForm, endDate: e.value })}
                dateFormat="dd/mm/yy"
                className="p-inputtext-sm w-full"
              />
            </div>
          </div>

          <div className="grid">
            <div className="col-6">
              <label className="font-semibold block mb-1">Max Students</label>
              <InputText
                type="number"
                value={renewalForm.customMaxStudents}
                onChange={(e) => setRenewalForm({ ...renewalForm, customMaxStudents: Number(e.target.value) })}
                className="p-inputtext-sm w-full"
              />
            </div>
            <div className="col-6">
              <label className="font-semibold block mb-1">Amount Paid (₹)</label>
              <InputText
                type="number"
                value={renewalForm.amountPaid}
                onChange={(e) => setRenewalForm({ ...renewalForm, amountPaid: Number(e.target.value) })}
                className="p-inputtext-sm w-full"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold block mb-1">Notes</label>
            <InputText
              value={renewalForm.notes}
              onChange={(e) => setRenewalForm({ ...renewalForm, notes: e.target.value })}
              className="p-inputtext-sm w-full"
            />
          </div>
        </div>
      </Dialog>

      {/* Reset Admin Password Dialog */}
      <Dialog
        header={`Reset Admin Password: ${tenant.name}`}
        visible={resetDialogVisible}
        style={{ width: '420px' }}
        modal
        onHide={() => setResetDialogVisible(false)}
        footer={
          <div className="flex align-items-center justify-content-end gap-2">
            <Button
              label="Cancel"
              size="small"
              outlined
              severity="secondary"
              onClick={() => setResetDialogVisible(false)}
            />
            <Button
              label="Save New Password"
              icon="pi pi-check"
              size="small"
              className="bg-indigo-600 border-indigo-600"
              loading={savingNewPassword}
              onClick={handleResetPasswordSubmit}
            />
          </div>
        }
      >
        <div className="flex flex-column gap-3 py-2 text-xs">
          <p className="text-xs text-slate-500 m-0">
            Set a new password for the school administrator (<strong>{tenant.adminUser?.username || 'admin'}</strong>).
          </p>

          <div className="flex flex-column gap-1">
            <label className="font-semibold text-slate-700">New Password</label>
            <div className="flex gap-2">
              <InputText
                value={newAdminPassword}
                onChange={(e) => setNewAdminPassword(e.target.value)}
                placeholder="Enter at least 6 characters"
                className="p-inputtext-sm w-full font-mono"
              />
              <Button
                icon="pi pi-refresh"
                size="small"
                outlined
                severity="secondary"
                title="Generate Random Password"
                onClick={generateRandomPassword}
              />
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
