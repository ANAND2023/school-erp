import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Toast } from 'primereact/toast';
import { superAdminApi } from '../api/superAdminApi';
import { useAuthStore } from '../../../store/authStore';

export const SuperAdminDashboardPage = () => {
  const navigate = useNavigate();
  const toastRef = React.useRef(null);
  const { startImpersonation } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState(null);
  const [impersonatingId, setImpersonatingId] = useState(null);

  useEffect(() => {
    loadKpis();
  }, []);

  const loadKpis = async () => {
    try {
      setLoading(true);
      const res = await superAdminApi.getDashboardKpis();
      if (res.success) {
        setKpis(res.data);
      }
    } catch (err) {
      toastRef.current?.show({
        severity: 'error',
        summary: 'Failed to load KPIs',
        detail: err.response?.data?.message || 'Server connection error',
        life: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImpersonate = async (schoolId, schoolName) => {
    try {
      setImpersonatingId(schoolId);
      const res = await superAdminApi.impersonateTenant(schoolId);
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
          detail: `Switched into ${res.data.schoolName}`,
          life: 2000,
        });
        setTimeout(() => {
          navigate('/dashboard');
        }, 800);
      }
    } catch (err) {
      toastRef.current?.show({
        severity: 'error',
        summary: 'Impersonation Failed',
        detail: err.response?.data?.message || 'Unable to switch into school admin view',
        life: 4000,
      });
    } finally {
      setImpersonatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-column align-items-center justify-content-center p-8">
        <ProgressSpinner style={{ width: '45px', height: '45px' }} />
        <span className="text-sm text-slate-500 mt-3 font-medium">Aggregating multi-tenant metrics...</span>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Schools',
      value: kpis?.totalTenants || 0,
      subtitle: `${kpis?.activeTenants || 0} Active • ${kpis?.suspendedTenants || 0} Suspended • ${kpis?.trialTenants || 0} Trial`,
      icon: 'pi pi-building',
      iconBg: '#e0e7ff',
      iconColor: '#4f46e5',
      trend: 'Multi-Tenant Ecosystem',
    },
    {
      title: 'Enrolled Students',
      value: (kpis?.totalStudentsAcrossTenants || 0).toLocaleString(),
      subtitle: 'Across all active school branches',
      icon: 'pi pi-users',
      iconBg: '#ecfdf5',
      iconColor: '#059669',
      trend: 'Active Registrations',
    },
    {
      title: 'Staff & Teachers',
      value: (kpis?.totalStaffAcrossTenants || 0).toLocaleString(),
      subtitle: 'Verified faculty & employees',
      icon: 'pi pi-id-card',
      iconBg: '#eff6ff',
      iconColor: '#2563eb',
      trend: 'Workforce',
    },
    {
      title: 'Estimated MRR',
      value: `₹${(kpis?.totalMonthlyRevenue || 0).toLocaleString('en-IN')}`,
      subtitle: `Annualized: ₹${(kpis?.totalAnnualRevenue || 0).toLocaleString('en-IN')}`,
      icon: 'pi pi-dollar',
      iconBg: '#fef3c7',
      iconColor: '#d97706',
      trend: `${kpis?.activeSubscriptionsCount || 0} Active Subscriptions`,
    },
  ];

  return (
    <div className="flex flex-column gap-4">
      <Toast ref={toastRef} />

      {/* Top Banner & Quick Action */}
      <div className="flex flex-column sm:flex-row align-items-start sm:align-items-center justify-content-between gap-3 bg-white p-4 border-round-lg shadow-1 border-1 surface-border">
        <div>
          <h2 className="text-xl font-bold text-slate-800 m-0">Multi-Tenant Platform Overview</h2>
          <p className="text-xs text-slate-500 m-0 mt-1">
            Global governance, school provisioning, live subscription analytics, and tenant troubleshooting.
          </p>
        </div>
        <div className="flex align-items-center gap-2">
          <Button
            label="Refresh Metrics"
            icon="pi pi-refresh"
            size="small"
            outlined
            severity="secondary"
            onClick={loadKpis}
          />
          <Button
            label="Onboard New School"
            icon="pi pi-plus"
            size="small"
            className="bg-indigo-600 border-indigo-600 hover:bg-indigo-700"
            onClick={() => navigate('/superadmin/tenants/new')}
          />
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid">
        {statCards.map((card, idx) => (
          <div key={idx} className="col-12 sm:col-6 lg:col-3">
            <div className="bg-white p-3 border-round-lg shadow-1 border-1 surface-border flex flex-column justify-content-between h-full">
              <div className="flex align-items-center justify-content-between mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{card.title}</span>
                <div
                  className="flex align-items-center justify-content-center border-round-md"
                  style={{ width: '36px', height: '36px', backgroundColor: card.iconBg }}
                >
                  <i className={`${card.icon} text-base`} style={{ color: card.iconColor }}></i>
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800 mb-1">{card.value}</div>
                <div className="text-xs text-slate-500 font-medium">{card.subtitle}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main 2-Column Section */}
      <div className="grid">
        {/* Left Column: Recent Schools */}
        <div className="col-12 lg:col-7">
          <div className="bg-white p-4 border-round-lg shadow-1 border-1 surface-border h-full flex flex-column">
            <div className="flex align-items-center justify-content-between mb-3 pb-2 border-bottom-1 surface-border">
              <div className="flex align-items-center gap-2">
                <i className="pi pi-building text-indigo-600 font-bold"></i>
                <span className="font-bold text-sm text-slate-800">Recently Onboarded Schools</span>
              </div>
              <Button
                label="View All Tenants"
                icon="pi pi-arrow-right"
                iconPos="right"
                size="small"
                text
                className="text-xs p-0 text-indigo-600 font-semibold"
                onClick={() => navigate('/superadmin/tenants')}
              />
            </div>

            {(!kpis?.recentTenants || kpis.recentTenants.length === 0) ? (
              <div className="p-4 text-center text-xs text-slate-400">No schools onboarded yet.</div>
            ) : (
              <div className="flex flex-column gap-3">
                {kpis.recentTenants.map((school) => (
                  <div
                    key={school.id}
                    className="flex flex-column sm:flex-row align-items-start sm:align-items-center justify-content-between p-3 border-round-md border-1 surface-border hover:surface-50 transition-colors gap-3"
                  >
                    <div className="flex align-items-center gap-3">
                      <div
                        className="flex align-items-center justify-content-center border-round font-bold text-white shadow-1"
                        style={{
                          width: '40px',
                          height: '40px',
                          background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
                          fontSize: '14px',
                        }}
                      >
                        {school.code || school.name.slice(0, 3).toUpperCase()}
                      </div>
                      <div className="flex flex-column">
                        <div className="flex align-items-center gap-2">
                          <span className="font-bold text-sm text-slate-800">{school.name}</span>
                          {school.code && (
                            <span
                              className="font-mono font-bold text-xs px-2 py-0.5 border-round border-1 surface-border"
                              style={{ backgroundColor: '#eef2ff', color: '#4338ca', fontSize: '11px' }}
                              title="School Code"
                            >
                              Code: {school.code}
                            </span>
                          )}
                          <Tag
                            value={school.status || 'Active'}
                            severity={school.status === 'Active' ? 'success' : school.status === 'Trial' ? 'warning' : 'danger'}
                            style={{ fontSize: '10px', padding: '1px 6px' }}
                          />
                        </div>
                        <span className="text-xs text-slate-500 font-mono">
                          Subdomain: <strong>{school.slug}</strong>.schoolerp.com
                        </span>
                        <div className="flex align-items-center gap-3 text-xs text-slate-400 mt-1">
                          <span>
                            <i className="pi pi-users mr-1 text-xs"></i>
                            {school.studentCount} Students
                          </span>
                          <span>
                            <i className="pi pi-credit-card mr-1 text-xs"></i>
                            {school.currentPlanName || 'Standard'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex align-items-center gap-2 self-end sm:self-center">
                      <Button
                        icon="pi pi-external-link"
                        label="Impersonate"
                        size="small"
                        severity="warning"
                        loading={impersonatingId === school.id}
                        className="text-xs py-1 px-2 font-semibold"
                        onClick={() => handleImpersonate(school.id, school.name)}
                      />
                      <Button
                        icon="pi pi-cog"
                        size="small"
                        outlined
                        severity="secondary"
                        className="text-xs py-1 px-2"
                        title="Configure School"
                        onClick={() => navigate(`/superadmin/tenants/${school.id}`)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Upcoming Renewals & Alerts */}
        <div className="col-12 lg:col-5">
          <div className="bg-white p-4 border-round-lg shadow-1 border-1 surface-border h-full flex flex-column">
            <div className="flex align-items-center justify-content-between mb-3 pb-2 border-bottom-1 surface-border">
              <div className="flex align-items-center gap-2">
                <i className="pi pi-clock text-amber-600 font-bold"></i>
                <span className="font-bold text-sm text-slate-800">Expiring Subscriptions (30 Days)</span>
              </div>
              <Tag value={`${kpis?.expiringSubscriptions?.length || 0} Alerts`} severity="warning" />
            </div>

            {(!kpis?.expiringSubscriptions || kpis.expiringSubscriptions.length === 0) ? (
              <div className="p-6 text-center flex flex-column align-items-center justify-content-center text-slate-400 flex-1">
                <i className="pi pi-check-circle text-3xl text-emerald-500 mb-2"></i>
                <span className="text-sm font-semibold text-slate-700">All Subscriptions Healthy</span>
                <span className="text-xs text-slate-400 mt-1">No schools expiring within the next 30 days.</span>
              </div>
            ) : (
              <div className="flex flex-column gap-2 flex-1 overflow-y-auto">
                {kpis.expiringSubscriptions.map((exp, idx) => (
                  <div
                    key={idx}
                    className="p-3 border-round-md border-1 border-amber-200 bg-amber-50 flex align-items-center justify-content-between"
                  >
                    <div className="flex flex-column">
                      <span className="font-bold text-xs text-slate-800">{exp.schoolName}</span>
                      <span className="text-xs text-amber-800 font-medium">
                        Expires in <strong>{exp.daysRemaining} days</strong> ({new Date(exp.endDate).toLocaleDateString()})
                      </span>
                      <span className="text-xs text-slate-500 mt-0.5">Plan: {exp.planName}</span>
                    </div>
                    <Button
                      label="Renew"
                      icon="pi pi-refresh"
                      size="small"
                      severity="help"
                      className="text-xs py-1 px-2"
                      onClick={() => navigate(`/superadmin/tenants/${exp.schoolId}`)}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Quick Control Hub */}
            <div className="mt-4 pt-3 border-top-1 surface-border">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Quick Shortcuts</span>
              <div className="grid">
                <div className="col-6">
                  <div
                    onClick={() => navigate('/superadmin/tenants/new')}
                    className="p-2 border-1 surface-border border-round hover:surface-100 cursor-pointer flex align-items-center gap-2 transition-colors"
                  >
                    <i className="pi pi-user-plus text-indigo-600 text-sm"></i>
                    <span className="text-xs font-semibold text-slate-700">New School</span>
                  </div>
                </div>
                <div className="col-6">
                  <div
                    onClick={() => navigate('/superadmin/plans')}
                    className="p-2 border-1 surface-border border-round hover:surface-100 cursor-pointer flex align-items-center gap-2 transition-colors"
                  >
                    <i className="pi pi-tag text-purple-600 text-sm"></i>
                    <span className="text-xs font-semibold text-slate-700">Plans & Pricing</span>
                  </div>
                </div>
                <div className="col-6">
                  <div
                    onClick={() => navigate('/superadmin/gateways')}
                    className="p-2 border-1 surface-border border-round hover:surface-100 cursor-pointer flex align-items-center gap-2 transition-colors"
                  >
                    <i className="pi pi-key text-teal-600 text-sm"></i>
                    <span className="text-xs font-semibold text-slate-700">Gateways</span>
                  </div>
                </div>
                <div className="col-6">
                  <div
                    onClick={() => navigate('/superadmin/audit-logs')}
                    className="p-2 border-1 surface-border border-round hover:surface-100 cursor-pointer flex align-items-center gap-2 transition-colors"
                  >
                    <i className="pi pi-shield text-blue-600 text-sm"></i>
                    <span className="text-xs font-semibold text-slate-700">Audit Trail</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
