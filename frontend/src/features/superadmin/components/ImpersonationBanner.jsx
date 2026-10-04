import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';

export const ImpersonationBanner = () => {
  const navigate = useNavigate();
  const { isImpersonating, impersonatedSchool, user, exitImpersonation } = useAuthStore();

  if (!isImpersonating) return null;

  const handleExit = () => {
    const success = exitImpersonation();
    if (success) {
      navigate('/superadmin/tenants');
    } else {
      window.location.href = '/login';
    }
  };

  return (
    <div
      className="w-full text-white flex align-items-center justify-content-between px-3 py-2 shadow-2"
      style={{
        background: 'linear-gradient(90deg, #ea580c 0%, #b45309 100%)',
        position: 'sticky',
        top: 0,
        zIndex: 9999,
        fontSize: '13px',
      }}
    >
      <div className="flex align-items-center gap-2">
        <i className="pi pi-shield text-base text-yellow-300"></i>
        <span>
          <strong className="text-yellow-200">SUPER ADMIN IMPERSONATION:</strong> Viewing school{' '}
          <strong className="underline">{impersonatedSchool?.name || 'Tenant'}</strong> as user{' '}
          <strong className="text-yellow-100">{user?.fullName || user?.username}</strong>.
        </span>
        <span className="hidden md:inline text-xs text-orange-200">
          (All actions performed are logged in the global audit trail)
        </span>
      </div>

      <div className="flex align-items-center gap-2">
        <button
          type="button"
          onClick={() => navigate('/superadmin/tenants')}
          className="border-none text-white text-xs px-2 py-1 border-round cursor-pointer hover:bg-orange-700"
          style={{ background: 'rgba(255,255,255,0.2)' }}
        >
          <i className="pi pi-external-link mr-1 text-xs"></i>
          Super Admin Panel
        </button>
        <button
          type="button"
          onClick={handleExit}
          className="border-none text-xs font-semibold px-3 py-1 border-round cursor-pointer bg-white text-orange-800 hover:bg-orange-50 shadow-1 transition-colors flex align-items-center gap-1"
        >
          <i className="pi pi-sign-out text-xs"></i>
          Exit Impersonation
        </button>
      </div>
    </div>
  );
};
