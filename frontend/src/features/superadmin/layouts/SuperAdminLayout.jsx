import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Avatar } from 'primereact/avatar';
import { useAuthStore } from '../../../store/authStore';
import { ImpersonationBanner } from '../components/ImpersonationBanner';

export const SuperAdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isImpersonating } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { label: 'Executive Dashboard', path: '/superadmin/dashboard', icon: 'pi pi-chart-bar' },
    { label: 'Tenants & Schools', path: '/superadmin/tenants', icon: 'pi pi-building' },
    { label: 'Onboard School', path: '/superadmin/tenants/new', icon: 'pi pi-plus-circle', badge: 'Wizard' },
    { label: 'Subscription Plans', path: '/superadmin/plans', icon: 'pi pi-credit-card' },
    { label: 'Module Catalog', path: '/superadmin/modules', icon: 'pi pi-th-large' },
    { label: 'Gateways & APIs', path: '/superadmin/gateways', icon: 'pi pi-sliders-h' },
    { label: 'Global Audit Trail', path: '/superadmin/audit-logs', icon: 'pi pi-history' },
    { label: 'SaaS Leads', path: '/superadmin/enquiries', icon: 'pi pi-envelope', badge: 'New' },
  ];

  return (
    <div className="min-h-screen flex flex-column bg-slate-50 text-slate-800" style={{ backgroundColor: '#f8fafc' }}>
      {/* Impersonation Banner if active */}
      <ImpersonationBanner />

      <div className="flex flex-1">
        {/* Dark Slate Executive Sidebar */}
        <aside
          className={`flex flex-column justify-content-between p-3 border-right-1 ${
            mobileMenuOpen ? 'block' : 'hidden md:flex'
          }`}
          style={{
            width: '260px',
            backgroundColor: '#0f172a',
            borderColor: '#1e293b',
            color: '#f8fafc',
            minHeight: '100vh',
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
        >
          <div>
            {/* Super Admin Branding */}
            <div className="flex align-items-center gap-3 px-2 py-3 mb-4 border-bottom-1" style={{ borderColor: '#1e293b' }}>
              <div
                className="flex align-items-center justify-content-center border-round-lg shadow-2"
                style={{
                  width: '38px',
                  height: '38px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
                }}
              >
                <i className="pi pi-shield text-xl text-white"></i>
              </div>
              <div className="flex flex-column">
                <span className="font-bold text-sm text-white tracking-wide">DVS ERP</span>
                <span className="text-xs text-indigo-400 font-semibold uppercase tracking-wider">Digital Vidya Sarthi</span>
              </div>
            </div>

            {/* Navigation Section */}
            <div className="text-xs uppercase font-bold text-slate-400 px-3 mb-2 tracking-wider">Tenant Control</div>
            <nav className="flex flex-column gap-1">
              {menuItems.map((item) => {
                const isActive = location.pathname === item.path || (item.path !== '/superadmin/dashboard' && location.pathname.startsWith(item.path));
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex align-items-center justify-content-between px-3 py-2 border-round-md no-underline transition-all"
                    style={{
                      backgroundColor: isActive ? '#312e81' : 'transparent',
                      color: isActive ? '#ffffff' : '#94a3b8',
                      fontWeight: isActive ? 600 : 500,
                      fontSize: '13.5px',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = '#1e293b';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div className="flex align-items-center gap-3">
                      <i className={`${item.icon} text-base`} style={{ color: isActive ? '#818cf8' : '#64748b' }}></i>
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-xs px-2 py-0 border-round font-medium bg-indigo-500 text-white" style={{ fontSize: '10px' }}>
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </nav>

            <div className="text-xs uppercase font-bold text-slate-400 px-3 mt-4 mb-2 tracking-wider">System</div>
            <div
              onClick={() => navigate('/dashboard')}
              className="flex align-items-center gap-3 px-3 py-2 border-round-md cursor-pointer transition-colors"
              style={{ color: '#94a3b8', fontSize: '13.5px' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1e293b')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <i className="pi pi-desktop text-base text-teal-400"></i>
              <span>Tenant View Portal</span>
            </div>
          </div>

          {/* User & Logout section */}
          <div className="pt-3 border-top-1" style={{ borderColor: '#1e293b' }}>
            <div className="flex align-items-center justify-content-between px-2 py-2">
              <div className="flex align-items-center gap-2">
                <Avatar
                  label={user?.fullName ? user.fullName[0].toUpperCase() : 'S'}
                  shape="circle"
                  style={{ backgroundColor: '#4f46e5', color: '#ffffff', width: '32px', height: '32px', fontSize: '13px' }}
                />
                <div className="flex flex-column" style={{ maxWidth: '140px' }}>
                  <span className="text-xs font-semibold text-white white-space-nowrap overflow-hidden text-overflow-ellipsis">
                    {user?.fullName || 'Super Admin'}
                  </span>
                  <span className="text-xs text-slate-400">Root Administrator</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title="Sign Out of Super Admin"
                className="border-none bg-transparent cursor-pointer p-2 border-round text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
              >
                <i className="pi pi-sign-out text-base"></i>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Workspace Area */}
        <div className="flex-1 flex flex-column min-h-screen overflow-x-hidden">
          {/* Top Executive Header */}
          <header
            className="flex align-items-center justify-content-between px-4 py-3 bg-white border-bottom-1 surface-border sticky top-0 z-3"
            style={{ height: '60px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}
          >
            <div className="flex align-items-center gap-3">
              <button
                type="button"
                className="md:hidden border-none bg-transparent cursor-pointer text-slate-600 text-lg"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <i className="pi pi-bars"></i>
              </button>

              <div className="flex align-items-center gap-2 text-xs font-medium text-slate-500">
                <span className="text-indigo-600 font-bold">Platform Governance</span>
                <span>/</span>
                <span className="capitalize">{location.pathname.replace('/superadmin/', '').replace('-', ' ') || 'Dashboard'}</span>
              </div>
            </div>

            <div className="flex align-items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => navigate('/superadmin/tenants/new')}
                className="border-none px-3 py-2 border-round-md font-semibold text-xs text-white cursor-pointer shadow-1 flex align-items-center gap-2 transition-all"
                style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)' }}
              >
                <i className="pi pi-plus text-xs"></i>
                <span className="hidden sm:inline">Onboard School</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="hidden md:flex border-1 border-slate-200 px-3 py-2 border-round-md font-medium text-xs text-slate-700 bg-slate-50 hover:bg-slate-100 cursor-pointer align-items-center gap-2 transition-all"
              >
                <i className="pi pi-external-link text-xs text-slate-500"></i>
                <span>Open Tenant View</span>
              </button>

              {/* Top Header Logout Button */}
              <button
                type="button"
                onClick={handleLogout}
                className="border-1 border-red-200 text-red-600 bg-red-50 hover:bg-red-100 px-3 py-2 border-round-md font-semibold text-xs cursor-pointer flex align-items-center gap-1.5 transition-colors shadow-none"
                title="Sign Out of Super Admin"
              >
                <i className="pi pi-sign-out text-xs"></i>
                <span>Logout</span>
              </button>
            </div>
          </header>

          {/* Dynamic Content */}
          <main className="p-4 flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};
