import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Avatar } from 'primereact/avatar';
import { useAuthStore } from '../../../store/authStore';
import { ImpersonationBanner } from '../components/ImpersonationBanner';

export const SuperAdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isImpersonating } = useAuthStore();

  // Desktop sidebar collapse state (persisted across sessions)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('superadmin_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  // Mobile drawer state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('superadmin_sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Keyboard shortcut Ctrl+B or Cmd+B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        if (window.innerWidth < 768) {
          setMobileMenuOpen((prev) => !prev);
        } else {
          toggleSidebar();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
    { label: 'WhatsApp Modules', path: '/superadmin/whatsapp', icon: 'pi pi-whatsapp', badge: 'Active' },
    { label: 'Enquiry Slip Designer', path: '/superadmin/enquiry-slip-designer', icon: 'pi pi-file-edit', badge: 'Dynamic' },
    { label: 'Registration Slip Designer', path: '/superadmin/registration-slip-designer', icon: 'pi pi-book', badge: 'Dynamic' },
    { label: 'Fee Slip Designer', path: '/superadmin/fee-slip-designer', icon: 'pi pi-file', badge: 'Dynamic' },
    { label: 'Admission Slip Designer', path: '/superadmin/admission-slip-designer', icon: 'pi pi-id-card', badge: 'Dynamic' },
    { label: 'Certificate Designer (5 Types)', path: '/superadmin/certificate-designer', icon: 'pi pi-verified', badge: 'Dynamic' },
    { label: 'Inventory Slip Designer', path: '/superadmin/inventory-slip-designer', icon: 'pi pi-shopping-bag', badge: 'Store' },
    { label: 'Global Audit Trail', path: '/superadmin/audit-logs', icon: 'pi pi-history' },
    { label: 'System Error Logs', path: '/superadmin/error-logs', icon: 'pi pi-exclamation-triangle', badge: 'Live' },
    { label: 'SaaS Leads', path: '/superadmin/enquiries', icon: 'pi pi-envelope', badge: 'New' },
    { label: 'Website CMS', path: '/superadmin/website-cms', icon: 'pi pi-globe', badge: 'Manage' },
  ];

  return (
    <div className="min-h-screen flex flex-column bg-slate-50 text-slate-800" style={{ backgroundColor: '#f8fafc' }}>
      {/* Impersonation Banner if active */}
      <ImpersonationBanner />

      {/* Embedded sleek custom scrollbar for dark sidebar */}
      <style>{`
        .superadmin-sidebar-nav {
          scrollbar-width: thin;
          scrollbar-color: var(--app-scrollbar-thumb, #6366f1) transparent;
        }
        .superadmin-sidebar-nav::-webkit-scrollbar {
          width: 5px;
        }
        .superadmin-sidebar-nav::-webkit-scrollbar-track {
          background: transparent;
        }
        .superadmin-sidebar-nav::-webkit-scrollbar-thumb {
          background: var(--app-scrollbar-thumb, #6366f1);
          border-radius: 4px;
        }
        .superadmin-sidebar-nav::-webkit-scrollbar-thumb:hover {
          background: var(--app-scrollbar-thumb-hover, #818cf8);
        }
      `}</style>

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-5"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(2px)' }}
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div className="flex flex-1">
        {/* Dark Slate Executive Sidebar */}
        <aside
          className={`no-print flex flex-column justify-content-between border-right-1 ${
            mobileMenuOpen
              ? 'fixed left-0 top-0 bottom-0 z-5 block shadow-8'
              : 'hidden md:flex'
          }`}
          style={{
            width: mobileMenuOpen ? '280px' : isCollapsed ? '72px' : '260px',
            backgroundColor: '#0f172a',
            borderColor: '#1e293b',
            color: '#f8fafc',
            height: '100vh',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1), padding 0.25s ease',
            padding: isCollapsed && !mobileMenuOpen ? '12px 8px' : '16px 12px',
          }}
        >
          {/* Top Branding & Sidebar Toggle Button */}
          <div className="flex-shrink-0">
            {isCollapsed && !mobileMenuOpen ? (
              // Collapsed Mini Branding: Centered Shield + Expand Toggle
              <div className="flex flex-column align-items-center gap-2 pb-3 mb-2 border-bottom-1" style={{ borderColor: '#1e293b' }}>
                <div
                  className="flex align-items-center justify-content-center border-round-lg shadow-2 cursor-pointer transition-transform hover:scale-105"
                  onClick={toggleSidebar}
                  title="Expand Sidebar (Ctrl+B)"
                  style={{
                    width: '40px',
                    height: '40px',
                    background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
                  }}
                >
                  <i className="pi pi-shield text-xl text-white"></i>
                </div>
                {/* Toggle Expand Button on Mini Sidebar */}
                <button
                  type="button"
                  onClick={toggleSidebar}
                  className="border-none bg-slate-800 hover:bg-indigo-900 text-indigo-300 hover:text-white border-round-md cursor-pointer flex align-items-center justify-content-center transition-all p-0 shadow-1"
                  style={{ width: '32px', height: '24px' }}
                  title="Expand Sidebar (Ctrl+B)"
                >
                  <i className="pi pi-chevron-right text-xs font-bold"></i>
                </button>
              </div>
            ) : (
              // Expanded Branding: Logo + Title + Collapse Toggle Button
              <div className="flex align-items-center justify-content-between px-2 py-2 mb-2 border-bottom-1" style={{ borderColor: '#1e293b' }}>
                <div className="flex align-items-center gap-2.5 overflow-hidden">
                  <div
                    className="flex align-items-center justify-content-center border-round-lg shadow-2 flex-shrink-0"
                    style={{
                      width: '38px',
                      height: '38px',
                      background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
                    }}
                  >
                    <i className="pi pi-shield text-xl text-white"></i>
                  </div>
                  <div className="flex flex-column white-space-nowrap overflow-hidden">
                    <span className="font-bold text-sm text-white tracking-wide">DVS ERP</span>
                    <span className="text-xs text-indigo-400 font-semibold uppercase tracking-wider" style={{ fontSize: '10px' }}>
                      Digital Vidya Sarthi
                    </span>
                  </div>
                </div>

                {/* Sidebar Collapse Toggle Button (Desktop & Mobile) */}
                <button
                  type="button"
                  onClick={() => {
                    if (mobileMenuOpen) {
                      setMobileMenuOpen(false);
                    } else {
                      toggleSidebar();
                    }
                  }}
                  className="border-none bg-slate-800 hover:bg-indigo-900 text-slate-300 hover:text-white border-round-md cursor-pointer flex align-items-center justify-content-center transition-all flex-shrink-0 shadow-1"
                  style={{ width: '28px', height: '28px' }}
                  title={mobileMenuOpen ? 'Close Menu' : 'Collapse Sidebar (Ctrl+B)'}
                >
                  <i className={`pi ${mobileMenuOpen ? 'pi-times' : 'pi-chevron-left'} text-xs font-bold`}></i>
                </button>
              </div>
            )}
          </div>

          {/* Navigation Section (Scrollable, never cuts off bottom items) */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden superadmin-sidebar-nav pr-1 my-1">
            {(!isCollapsed || mobileMenuOpen) && (
              <div className="text-xs uppercase font-bold text-slate-400 px-2 mb-2 tracking-wider" style={{ fontSize: '10.5px' }}>
                Tenant Control
              </div>
            )}

            <nav className="flex flex-column gap-1">
              {menuItems.map((item) => {
                const isActive =
                  location.pathname === item.path ||
                  (item.path !== '/superadmin/dashboard' && location.pathname.startsWith(item.path));

                if (isCollapsed && !mobileMenuOpen) {
                  // Collapsed Mini-Icon Link with Tooltip
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      title={`${item.label}${item.badge ? ` (${item.badge})` : ''}`}
                      className="flex align-items-center justify-content-center border-round-md no-underline transition-all relative"
                      style={{
                        height: '42px',
                        backgroundColor: isActive ? '#312e81' : 'transparent',
                        color: isActive ? '#ffffff' : '#94a3b8',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.backgroundColor = '#1e293b';
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <i className={`${item.icon} text-lg`} style={{ color: isActive ? '#a5b4fc' : '#94a3b8' }}></i>
                      {item.badge && (
                        <span
                          className="absolute border-circle"
                          style={{
                            top: '8px',
                            right: '12px',
                            width: '7px',
                            height: '7px',
                            backgroundColor: '#6366f1',
                            boxShadow: '0 0 6px #6366f1',
                          }}
                        />
                      )}
                    </NavLink>
                  );
                }

                // Expanded Full Link
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
                      fontSize: '13px',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = '#1e293b';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div className="flex align-items-center gap-3 overflow-hidden">
                      <i className={`${item.icon} text-base flex-shrink-0`} style={{ color: isActive ? '#818cf8' : '#64748b' }}></i>
                      <span className="white-space-nowrap overflow-hidden text-overflow-ellipsis">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-xs px-2 py-0 border-round font-medium bg-indigo-500 text-white flex-shrink-0" style={{ fontSize: '10px' }}>
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </nav>

            <div className="border-top-1 my-2" style={{ borderColor: '#1e293b' }} />

            {(!isCollapsed || mobileMenuOpen) && (
              <div className="text-xs uppercase font-bold text-slate-400 px-2 mb-1 tracking-wider" style={{ fontSize: '10.5px' }}>
                System
              </div>
            )}

            {/* Tenant View Portal Link */}
            {isCollapsed && !mobileMenuOpen ? (
              <div
                onClick={() => navigate('/dashboard')}
                title="Open Tenant View Portal"
                className="flex align-items-center justify-content-center border-round-md cursor-pointer transition-colors"
                style={{ height: '42px', color: '#94a3b8' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1e293b')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <i className="pi pi-desktop text-lg text-teal-400"></i>
              </div>
            ) : (
              <div
                onClick={() => navigate('/dashboard')}
                className="flex align-items-center gap-3 px-3 py-2 border-round-md cursor-pointer transition-colors"
                style={{ color: '#94a3b8', fontSize: '13px' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1e293b')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <i className="pi pi-desktop text-base text-teal-400 flex-shrink-0"></i>
                <span className="white-space-nowrap">Tenant View Portal</span>
              </div>
            )}
          </div>

          {/* User & Logout section */}
          <div className="pt-2 border-top-1 flex-shrink-0" style={{ borderColor: '#1e293b' }}>
            {isCollapsed && !mobileMenuOpen ? (
              // Collapsed User Profile
              <div className="flex flex-column align-items-center gap-2 py-1">
                <Avatar
                  label={user?.fullName ? user.fullName[0].toUpperCase() : 'S'}
                  shape="circle"
                  title={user?.fullName || 'Super Admin'}
                  style={{ backgroundColor: '#4f46e5', color: '#ffffff', width: '34px', height: '34px', fontSize: '13px', cursor: 'default' }}
                />
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Sign Out of Super Admin"
                  className="border-none bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 p-2 border-round-md cursor-pointer flex align-items-center justify-content-center transition-colors"
                  style={{ width: '34px', height: '34px' }}
                >
                  <i className="pi pi-sign-out text-sm"></i>
                </button>
              </div>
            ) : (
              // Expanded User Profile
              <div className="flex align-items-center justify-content-between px-2 py-1">
                <div className="flex align-items-center gap-2 overflow-hidden">
                  <Avatar
                    label={user?.fullName ? user.fullName[0].toUpperCase() : 'S'}
                    shape="circle"
                    style={{ backgroundColor: '#4f46e5', color: '#ffffff', width: '32px', height: '32px', fontSize: '13px' }}
                  />
                  <div className="flex flex-column overflow-hidden" style={{ maxWidth: '140px' }}>
                    <span className="text-xs font-semibold text-white white-space-nowrap overflow-hidden text-overflow-ellipsis">
                      {user?.fullName || 'Super Admin'}
                    </span>
                    <span className="text-xs text-slate-400" style={{ fontSize: '10.5px' }}>
                      Root Administrator
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Sign Out of Super Admin"
                  className="border-none bg-transparent cursor-pointer p-2 border-round text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors flex-shrink-0"
                >
                  <i className="pi pi-sign-out text-base"></i>
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Main Workspace Area */}
        <div className="flex-1 flex flex-column min-h-screen overflow-x-hidden" style={{ minWidth: 0 }}>
          {/* Top Executive Header */}
          <header
            className="no-print flex align-items-center justify-content-between px-3 md:px-4 py-2.5 bg-white border-bottom-1 surface-border sticky top-0 z-3"
            style={{ height: '60px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}
          >
            <div className="flex align-items-center gap-2.5">
              {/* Universal Sidebar Toggle Button (Always visible on desktop and mobile) */}
              <button
                type="button"
                onClick={() => {
                  if (window.innerWidth < 768) {
                    setMobileMenuOpen(!mobileMenuOpen);
                  } else {
                    toggleSidebar();
                  }
                }}
                className="border-1 border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 p-2 border-round-md cursor-pointer flex align-items-center justify-content-center transition-all shadow-none"
                style={{ width: '34px', height: '34px' }}
                title={isCollapsed ? 'Expand Sidebar (Ctrl+B)' : 'Collapse Sidebar (Ctrl+B)'}
              >
                <i className={`pi ${isCollapsed ? 'pi-bars' : 'pi-align-left'} text-sm font-bold text-slate-700`}></i>
              </button>

              <div className="flex align-items-center gap-2 text-xs font-medium text-slate-500">
                <span className="text-indigo-600 font-bold hidden sm:inline">Platform Governance</span>
                <span className="hidden sm:inline">/</span>
                <span className="capitalize font-semibold text-slate-700">
                  {location.pathname.replace('/superadmin/', '').replace('-', ' ') || 'Dashboard'}
                </span>
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
          <main className="p-3 md:p-4 flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};
