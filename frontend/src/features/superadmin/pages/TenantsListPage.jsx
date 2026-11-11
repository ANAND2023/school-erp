import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { Dialog } from 'primereact/dialog';
import { InputSwitch } from 'primereact/inputswitch';
import { superAdminApi } from '../api/superAdminApi';
import { useAuthStore } from '../../../store/authStore';

export const TenantsListPage = () => {
  const navigate = useNavigate();
  const toastRef = useRef(null);
  const { startImpersonation } = useAuthStore();

  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [planFilter, setPlanFilter] = useState('All');
  const [impersonatingId, setImpersonatingId] = useState(null);

  // Quick Module Toggle Dialog state
  const [moduleDialogVisible, setModuleDialogVisible] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [schoolModules, setSchoolModules] = useState([]);
  const [savingModules, setSavingModules] = useState(false);

  // Credentials visibility & Password Reset state
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [resetDialogVisible, setResetDialogVisible] = useState(false);
  const [schoolForPasswordReset, setSchoolForPasswordReset] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [savingNewPassword, setSavingNewPassword] = useState(false);

  const togglePasswordVisibility = (id) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

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

  const openResetPasswordDialog = (school) => {
    setSchoolForPasswordReset(school);
    setNewPassword('');
    setResetDialogVisible(true);
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$!';
    let pwd = '';
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pwd);
  };

  const handleResetPasswordSubmit = async () => {
    if (!schoolForPasswordReset) return;
    if (!newPassword || newPassword.length < 6) {
      toastRef.current?.show({
        severity: 'warn',
        summary: 'Invalid Password',
        detail: 'Password must be at least 6 characters long.',
      });
      return;
    }

    try {
      setSavingNewPassword(true);
      const res = await superAdminApi.resetAdminPassword(schoolForPasswordReset.id, newPassword);
      if (res.success) {
        toastRef.current?.show({
          severity: 'success',
          summary: 'Password Updated',
          detail: `Admin password for ${schoolForPasswordReset.name} updated successfully.`,
        });
        // Update local state so table shows the new password immediately
        setTenants((prev) =>
          prev.map((t) => (t.id === schoolForPasswordReset.id ? { ...t, adminPassword: newPassword } : t))
        );
        setVisiblePasswords((prev) => ({ ...prev, [schoolForPasswordReset.id]: true }));
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
    loadTenants();
  }, [statusFilter, planFilter]);

  const loadTenants = async () => {
    try {
      setLoading(true);
      const res = await superAdminApi.getTenants({
        search: search.trim() || undefined,
        status: statusFilter !== 'All' ? statusFilter : undefined,
        planCode: planFilter !== 'All' ? planFilter : undefined,
      });
      if (res.success) {
        setTenants(res.data);
      }
    } catch (err) {
      toastRef.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load school tenants.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadTenants();
  };

  const handleImpersonate = async (school) => {
    try {
      setImpersonatingId(school.id);
      const res = await superAdminApi.impersonateTenant(school.id);
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
          summary: 'Impersonation Started',
          detail: `Switched into ${res.data.schoolName}`,
        });
        setTimeout(() => {
          navigate('/dashboard');
        }, 600);
      }
    } catch (err) {
      toastRef.current?.show({
        severity: 'error',
        summary: 'Impersonation Error',
        detail: err.response?.data?.message || 'Failed to switch into tenant account',
      });
    } finally {
      setImpersonatingId(null);
    }
  };

  const openModuleDialog = async (school) => {
    setSelectedSchool(school);
    try {
      const res = await superAdminApi.getTenantById(school.id);
      if (res.success) {
        setSchoolModules(res.data.modules);
        setModuleDialogVisible(true);
      }
    } catch (err) {
      toastRef.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Could not load tenant module configuration.',
      });
    }
  };

  const handleToggleModule = (code, currentEnabled, isCore) => {
    if (isCore) return; // Core modules cannot be disabled
    setSchoolModules((prev) =>
      prev.map((m) => (m.code === code ? { ...m, isEnabled: !currentEnabled } : m))
    );
  };

  const saveModuleChanges = async () => {
    if (!selectedSchool) return;
    try {
      setSavingModules(true);
      const enabledCodes = schoolModules.filter((m) => m.isEnabled).map((m) => m.code);
      const res = await superAdminApi.updateTenantModules(selectedSchool.id, enabledCodes);
      if (res.success) {
        toastRef.current?.show({
          severity: 'success',
          summary: 'Modules Updated',
          detail: `Updated active modules for ${selectedSchool.name}`,
        });
        setModuleDialogVisible(false);
        loadTenants();
      }
    } catch (err) {
      toastRef.current?.show({
        severity: 'error',
        summary: 'Save Failed',
        detail: err.response?.data?.message || 'Failed to update tenant modules',
      });
    } finally {
      setSavingModules(false);
    }
  };

  const handleTogglePortalAccess = async (school, field, newValue) => {
    const updatedStudentLogin = field === 'student' ? newValue : (school.allowStudentLogin !== false);
    const updatedParentLogin = field === 'parent' ? newValue : (school.allowParentLogin !== false);

    // Optimistic UI update
    setTenants((prev) =>
      prev.map((t) =>
        t.id === school.id
          ? { ...t, allowStudentLogin: updatedStudentLogin, allowParentLogin: updatedParentLogin }
          : t
      )
    );

    if (selectedSchool && selectedSchool.id === school.id) {
      setSelectedSchool((prev) => ({
        ...prev,
        allowStudentLogin: updatedStudentLogin,
        allowParentLogin: updatedParentLogin,
      }));
    }

    try {
      const res = await superAdminApi.updateTenantPortalAccess(school.id, {
        allowStudentLogin: updatedStudentLogin,
        allowParentLogin: updatedParentLogin,
      });

      if (res.success) {
        toastRef.current?.show({
          severity: 'success',
          summary: 'Portal Access Updated',
          detail: `${field === 'student' ? 'Student' : 'Parent'} login for "${school.name}" is now ${newValue ? 'ACTIVE' : 'INACTIVE'}.`,
        });
      }
    } catch (err) {
      // Revert on error
      setTenants((prev) =>
        prev.map((t) =>
          t.id === school.id
            ? { ...t, allowStudentLogin: school.allowStudentLogin, allowParentLogin: school.allowParentLogin }
            : t
        )
      );
      toastRef.current?.show({
        severity: 'error',
        summary: 'Update Failed',
        detail: err.response?.data?.message || 'Failed to update portal access.',
      });
    }
  };

  const portalAccessBodyTemplate = (rowData) => {
    const studentActive = rowData.allowStudentLogin !== false;
    const parentActive = rowData.allowParentLogin !== false;

    return (
      <div className="flex flex-column gap-2" style={{ minWidth: '160px' }}>
        {/* Student Login Switch */}
        <div className="flex align-items-center justify-content-between p-1 px-2 border-round border-1 surface-border bg-slate-50">
          <div className="flex align-items-center gap-1">
            <span className="text-xs">🎓</span>
            <span className="text-xs font-semibold text-slate-700">Student:</span>
            <Tag
              value={studentActive ? 'Active' : 'Inactive'}
              severity={studentActive ? 'success' : 'danger'}
              style={{ fontSize: '9px', padding: '1px 4px' }}
            />
          </div>
          <InputSwitch
            checked={studentActive}
            onChange={(e) => handleTogglePortalAccess(rowData, 'student', e.value)}
            className="p-inputswitch-sm"
            style={{ transform: 'scale(0.8)' }}
            title={studentActive ? 'Click to disable Student Login for this school' : 'Click to enable Student Login for this school'}
          />
        </div>

        {/* Parent Login Switch */}
        <div className="flex align-items-center justify-content-between p-1 px-2 border-round border-1 surface-border bg-slate-50">
          <div className="flex align-items-center gap-1">
            <span className="text-xs">👨‍👩‍👧</span>
            <span className="text-xs font-semibold text-slate-700">Parent:</span>
            <Tag
              value={parentActive ? 'Active' : 'Inactive'}
              severity={parentActive ? 'success' : 'danger'}
              style={{ fontSize: '9px', padding: '1px 4px' }}
            />
          </div>
          <InputSwitch
            checked={parentActive}
            onChange={(e) => handleTogglePortalAccess(rowData, 'parent', e.value)}
            className="p-inputswitch-sm"
            style={{ transform: 'scale(0.8)' }}
            title={parentActive ? 'Click to disable Parent Login for this school' : 'Click to enable Parent Login for this school'}
          />
        </div>
      </div>
    );
  };

  const exportCsv = () => {
    if (!tenants || tenants.length === 0) return;
    const headers = ['School Name', 'Code', 'Subdomain/Slug', 'Admin Username (ID)', 'Admin Password', 'Admin Email', 'City', 'Status', 'Plan', 'Expiry', 'Students', 'Staff'];
    const rows = tenants.map((t) => [
      `"${t.name}"`,
      `"${t.code}"`,
      `"${t.slug}"`,
      `"${t.adminUsername || ''}"`,
      `"${t.adminPassword || 'Admin@123'}"`,
      `"${t.adminEmail || ''}"`,
      `"${t.city || ''}"`,
      `"${t.status}"`,
      `"${t.currentPlanName || ''}"`,
      `"${t.subscriptionEndDate ? new Date(t.subscriptionEndDate).toLocaleDateString() : ''}"`,
      t.studentCount,
      t.staffCount,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `schools_tenants_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Status Badge Template
  const statusBodyTemplate = (rowData) => {
    const sev = rowData.status === 'Active' ? 'success' : rowData.status === 'Trial' ? 'warning' : 'danger';
    return <Tag value={rowData.status} severity={sev} />;
  };

  // Plan & Expiry Template
  const planBodyTemplate = (rowData) => {
    const isExpiring = rowData.daysRemaining !== null && rowData.daysRemaining <= 30;
    const isExpired = rowData.daysRemaining !== null && rowData.daysRemaining <= 0;
    return (
      <div className="flex flex-column gap-1">
        <span className="font-semibold text-xs text-slate-800">{rowData.currentPlanName || 'Standard'}</span>
        {rowData.subscriptionEndDate ? (
          <div className="flex align-items-center gap-1">
            <span className="text-xs text-slate-500">{new Date(rowData.subscriptionEndDate).toLocaleDateString()}</span>
            {isExpired ? (
              <Tag value="Expired" severity="danger" style={{ fontSize: '9px', padding: '0 4px' }} />
            ) : isExpiring ? (
              <Tag value={`${rowData.daysRemaining}d left`} severity="warning" style={{ fontSize: '9px', padding: '0 4px' }} />
            ) : null}
          </div>
        ) : (
          <span className="text-xs text-slate-400">No active plan</span>
        )}
      </div>
    );
  };

  // School Code Template with Copy action
  const codeBodyTemplate = (rowData) => {
    const code = rowData.code || '—';
    return (
      <div className="flex align-items-center gap-1">
        <span
          className="font-mono font-bold text-xs px-2 py-1 border-round border-1 surface-border shadow-xs"
          style={{
            backgroundColor: '#eef2ff',
            color: '#4338ca',
            letterSpacing: '0.8px',
          }}
          title={`School Code for Login: ${code}`}
        >
          {code}
        </span>
        {rowData.code && (
          <Button
            icon="pi pi-copy"
            text
            rounded
            size="small"
            severity="secondary"
            className="p-0 text-slate-400 hover:text-indigo-600"
            style={{ width: '22px', height: '22px' }}
            title="Copy School Code"
            onClick={() => copyToClipboard(rowData.code, 'School Code')}
          />
        )}
      </div>
    );
  };

  // Name & Slug Template
  const nameBodyTemplate = (rowData) => (
    <div className="flex align-items-center gap-2">
      <div
        className="flex align-items-center justify-content-center border-round font-bold text-white shadow-1"
        style={{
          width: '34px',
          height: '34px',
          background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
          fontSize: '12px',
        }}
      >
        {rowData.code || rowData.name.slice(0, 3).toUpperCase()}
      </div>
      <div className="flex flex-column">
        <span
          className="font-bold text-xs text-slate-800 hover:text-indigo-600 cursor-pointer"
          onClick={() => navigate(`/superadmin/tenants/${rowData.id}`)}
        >
          {rowData.name}
        </span>
        <span className="text-xs text-slate-400 font-mono">
          {rowData.slug}.schoolerp.com
        </span>
      </div>
    </div>
  );

  // Actions Template
  const actionsBodyTemplate = (rowData) => (
    <div className="flex align-items-center gap-1">
      <Button
        icon="pi pi-external-link"
        size="small"
        severity="warning"
        className="p-button-sm py-1 px-2 text-xs"
        label="Switch"
        loading={impersonatingId === rowData.id}
        title="Impersonate School Admin"
        onClick={() => handleImpersonate(rowData)}
      />
      <Button
        icon="pi pi-th-large"
        size="small"
        outlined
        severity="info"
        className="p-button-sm py-1 px-2"
        title="Toggle Modules"
        onClick={() => openModuleDialog(rowData)}
      />
      <Button
        icon="pi pi-eye"
        size="small"
        outlined
        severity="secondary"
        className="p-button-sm py-1 px-2"
        title="Manage School Profile"
        onClick={() => navigate(`/superadmin/tenants/${rowData.id}`)}
      />
    </div>
  );

  return (
    <div className="flex flex-column gap-4">
      <Toast ref={toastRef} />

      {/* Header with Title and Create Action */}
      <div className="flex flex-column sm:flex-row align-items-start sm:align-items-center justify-content-between gap-3 bg-white p-4 border-round-lg shadow-1 border-1 surface-border">
        <div>
          <h2 className="text-xl font-bold text-slate-800 m-0">Schools & Tenants Directory</h2>
          <p className="text-xs text-slate-500 m-0 mt-1">
            Browse, search, toggle functional modules, manage subscriptions, and switch into tenant sessions.
          </p>
        </div>
        <div className="flex align-items-center gap-2">
          <Button
            label="Export CSV"
            icon="pi pi-download"
            size="small"
            outlined
            severity="secondary"
            onClick={exportCsv}
          />
          <Button
            label="Onboard School"
            icon="pi pi-plus"
            size="small"
            className="bg-indigo-600 border-indigo-600 hover:bg-indigo-700"
            onClick={() => navigate('/superadmin/tenants/new')}
          />
        </div>
      </div>

      {/* Search & Filters FilterBar */}
      <div className="bg-white p-3 border-round-lg shadow-1 border-1 surface-border flex flex-column md:flex-row align-items-center justify-content-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex align-items-center gap-2 w-full md:w-auto">
          <span className="p-input-icon-left w-full md:w-20rem">
            <i className="pi pi-search text-xs" />
            <InputText
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search school name, slug, code, city..."
              className="p-inputtext-sm w-full"
            />
          </span>
          <Button type="submit" label="Filter" icon="pi pi-filter" size="small" outlined />
        </form>

        <div className="flex align-items-center gap-3 w-full md:w-auto justify-content-end">
          <div className="flex align-items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Status:</span>
            <Dropdown
              value={statusFilter}
              options={[
                { label: 'All Statuses', value: 'All' },
                { label: 'Active', value: 'Active' },
                { label: 'Suspended', value: 'Suspended' },
                { label: 'Trial', value: 'Trial' },
              ]}
              onChange={(e) => setStatusFilter(e.value)}
              className="p-inputtext-sm"
              style={{ width: '130px' }}
            />
          </div>

          <div className="flex align-items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Plan:</span>
            <Dropdown
              value={planFilter}
              options={[
                { label: 'All Plans', value: 'All' },
                { label: 'Starter', value: 'STARTER' },
                { label: 'Growth', value: 'GROWTH' },
                { label: 'Enterprise', value: 'ENTERPRISE' },
              ]}
              onChange={(e) => setPlanFilter(e.value)}
              className="p-inputtext-sm"
              style={{ width: '130px' }}
            />
          </div>
        </div>
      </div>

      {/* Tenants DataTable */}
      <div className="bg-white border-round-lg shadow-1 border-1 surface-border overflow-hidden">
        <DataTable
          value={tenants}
          loading={loading}
          paginator
          rows={10}
          rowsPerPageOptions={[10, 25, 50]}
          emptyMessage="No school tenants match your filters."
          className="p-datatable-sm"
          stripedRows
          rowHover
        >
          <Column header="School / Subdomain" body={nameBodyTemplate} style={{ minWidth: '240px' }} />
          <Column
            field="code"
            header="School Code"
            body={codeBodyTemplate}
            style={{ width: '130px' }}
            sortable
          />
          <Column
            field="city"
            header="Location"
            body={(row) => (
              <span className="text-xs text-slate-600">
                {row.city ? `${row.city}, ${row.state || ''}` : '—'}
              </span>
            )}
            style={{ width: '140px' }}
          />
          <Column header="Subscription Plan" body={planBodyTemplate} style={{ minWidth: '170px' }} />
          <Column
            header="Students"
            body={(row) => (
              <div className="flex flex-column">
                <span className="font-bold text-xs text-slate-700">{row.studentCount}</span>
                <span className="text-xs text-slate-400">Limit: {row.maxStudents}</span>
              </div>
            )}
            style={{ width: '100px' }}
          />
          <Column
            header="Modules"
            body={(row) => (
              <Tag
                value={`${row.enabledModulesCount || 0} active`}
                severity="info"
                style={{ fontSize: '11px', cursor: 'pointer' }}
                onClick={() => openModuleDialog(row)}
                title="Click to configure modules"
              />
            )}
            style={{ width: '110px' }}
          />
          <Column header="Status" body={statusBodyTemplate} style={{ width: '90px' }} />
          <Column
            header="Portal Access (Student / Parent)"
            body={portalAccessBodyTemplate}
            style={{ width: '180px' }}
          />
          <Column
            header="Admin Login (ID & Password)"
            body={(row) => {
              const isVisible = !!visiblePasswords[row.id];
              const password = row.adminPassword || 'Admin@123';
              return (
                <div className="flex flex-column gap-1" style={{ minWidth: '220px' }}>
                  {/* ID / Username Row */}
                  <div
                    className="flex align-items-center justify-content-between px-2 py-1 border-round border-1 surface-border"
                    style={{ backgroundColor: '#f1f5f9' }}
                  >
                    <div className="flex align-items-center gap-1 overflow-hidden">
                      <span className="text-xs font-bold text-slate-500">ID:</span>
                      <span
                        className="font-mono text-xs font-semibold text-indigo-700 text-overflow-ellipsis overflow-hidden"
                        title={row.adminUsername || 'N/A'}
                      >
                        {row.adminUsername || 'admin'}
                      </span>
                    </div>
                    {row.adminUsername && (
                      <Button
                        icon="pi pi-copy"
                        text
                        rounded
                        size="small"
                        severity="secondary"
                        className="p-0 text-slate-400 hover:text-indigo-600"
                        style={{ width: '22px', height: '22px' }}
                        title="Copy Login ID / Username"
                        onClick={() => copyToClipboard(row.adminUsername, 'Login ID')}
                      />
                    )}
                  </div>

                  {/* Password Row */}
                  <div
                    className="flex align-items-center justify-content-between px-2 py-1 border-round border-1 surface-border"
                    style={{ backgroundColor: isVisible ? '#ecfdf5' : '#f8fafc' }}
                  >
                    <div className="flex align-items-center gap-1 overflow-hidden">
                      <span className="text-xs font-bold text-slate-500">Pass:</span>
                      <span
                        className={`font-mono text-xs font-semibold ${
                          isVisible ? 'text-emerald-800' : 'text-slate-600'
                        } text-overflow-ellipsis overflow-hidden`}
                        title={isVisible ? password : 'Click eye to reveal'}
                      >
                        {isVisible ? password : '••••••••'}
                      </span>
                    </div>
                    <div className="flex align-items-center gap-1">
                      <Button
                        icon={isVisible ? 'pi pi-eye-slash' : 'pi pi-eye'}
                        text
                        rounded
                        size="small"
                        severity="secondary"
                        className="p-0 text-slate-400 hover:text-slate-700"
                        style={{ width: '22px', height: '22px' }}
                        title={isVisible ? 'Hide Password' : 'Show Password'}
                        onClick={() => togglePasswordVisibility(row.id)}
                      />
                      <Button
                        icon="pi pi-copy"
                        text
                        rounded
                        size="small"
                        severity="secondary"
                        className="p-0 text-slate-400 hover:text-emerald-600"
                        style={{ width: '22px', height: '22px' }}
                        title="Copy Password"
                        onClick={() => copyToClipboard(password, 'Password')}
                      />
                      <Button
                        icon="pi pi-key"
                        text
                        rounded
                        size="small"
                        severity="secondary"
                        className="p-0 text-slate-400 hover:text-amber-600"
                        style={{ width: '22px', height: '22px' }}
                        title="Change / Reset Password"
                        onClick={() => openResetPasswordDialog(row)}
                      />
                    </div>
                  </div>

                  {/* Admin Name & Email Subtext */}
                  {row.adminFullName && (
                    <span className="text-xs text-slate-400 text-overflow-ellipsis overflow-hidden" title={row.adminEmail ? `${row.adminFullName} (${row.adminEmail})` : row.adminFullName}>
                      {row.adminFullName} {row.adminEmail ? `• ${row.adminEmail}` : ''}
                    </span>
                  )}
                </div>
              );
            }}
            style={{ minWidth: '230px' }}
          />
          <Column header="Actions" body={actionsBodyTemplate} style={{ width: '180px', textAlign: 'center' }} />
        </DataTable>
      </div>

      {/* Quick Module Toggle Dialog */}
      <Dialog
        header={`Configure Functional Modules: ${selectedSchool?.name || ''}`}
        visible={moduleDialogVisible}
        style={{ width: '560px' }}
        modal
        onHide={() => setModuleDialogVisible(false)}
        footer={
          <div className="flex align-items-center justify-content-end gap-2">
            <Button
              label="Cancel"
              size="small"
              outlined
              severity="secondary"
              onClick={() => setModuleDialogVisible(false)}
            />
            <Button
              label="Save Module Settings"
              icon="pi pi-check"
              size="small"
              className="bg-indigo-600 border-indigo-600"
              loading={savingModules}
              onClick={saveModuleChanges}
            />
          </div>
        }
      >
        <div className="flex flex-column gap-3 py-2">
          {/* Portal Access Controls */}
          {selectedSchool && (
            <div className="p-3 border-round border-1 surface-border bg-indigo-50 flex flex-column gap-2">
              <div className="flex align-items-center justify-content-between">
                <div>
                  <span className="font-bold text-xs text-indigo-900 block">Student & Parent Portal Permissions</span>
                  <span className="text-xs text-slate-500">Enable or disable portal sign-in specifically for this school</span>
                </div>
              </div>
              <div className="grid mt-1">
                <div className="col-12 sm:col-6">
                  <div className="flex align-items-center justify-content-between p-2 bg-white border-round border-1 surface-border">
                    <div className="flex align-items-center gap-2">
                      <span className="text-base">🎓</span>
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">Student Login</span>
                        <Tag
                          value={selectedSchool.allowStudentLogin !== false ? 'Enabled' : 'Disabled'}
                          severity={selectedSchool.allowStudentLogin !== false ? 'success' : 'danger'}
                          style={{ fontSize: '9px', padding: '0 4px' }}
                        />
                      </div>
                    </div>
                    <InputSwitch
                      checked={selectedSchool.allowStudentLogin !== false}
                      onChange={(e) => handleTogglePortalAccess(selectedSchool, 'student', e.value)}
                    />
                  </div>
                </div>
                <div className="col-12 sm:col-6">
                  <div className="flex align-items-center justify-content-between p-2 bg-white border-round border-1 surface-border">
                    <div className="flex align-items-center gap-2">
                      <span className="text-base">👨‍👩‍👧</span>
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">Parent Login</span>
                        <Tag
                          value={selectedSchool.allowParentLogin !== false ? 'Enabled' : 'Disabled'}
                          severity={selectedSchool.allowParentLogin !== false ? 'success' : 'danger'}
                          style={{ fontSize: '9px', padding: '0 4px' }}
                        />
                      </div>
                    </div>
                    <InputSwitch
                      checked={selectedSchool.allowParentLogin !== false}
                      onChange={(e) => handleTogglePortalAccess(selectedSchool, 'parent', e.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <p className="text-xs text-slate-500 m-0">
            Control which feature modules are accessible to this school's users. Core modules cannot be disabled.
          </p>

          <div className="flex flex-column gap-2 max-h-25rem overflow-y-auto pr-1">
            {schoolModules.map((mod) => (
              <div
                key={mod.code}
                className="flex align-items-center justify-content-between p-3 border-round border-1 surface-border hover:surface-50 transition-colors"
                style={{ backgroundColor: mod.isCore ? '#f8fafc' : '#ffffff' }}
              >
                <div className="flex flex-column pr-3">
                  <div className="flex align-items-center gap-2">
                    <span className="font-bold text-xs text-slate-800">{mod.name}</span>
                    {mod.isCore && (
                      <Tag value="Core (Locked)" severity="secondary" style={{ fontSize: '9px', padding: '0 4px' }} />
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
            ))}
          </div>
        </div>
      </Dialog>

      {/* Reset Admin Password Dialog */}
      <Dialog
        header={`Reset Admin Password: ${schoolForPasswordReset?.name || ''}`}
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
            Enter a new password for the school administrator (<strong>{schoolForPasswordReset?.adminUsername || 'admin'}</strong>). This will immediately update their login credentials and show in the table.
          </p>

          <div className="flex flex-column gap-1">
            <label className="font-semibold text-slate-700">New Password</label>
            <div className="flex gap-2">
              <InputText
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
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
