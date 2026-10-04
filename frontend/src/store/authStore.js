import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  accessToken: localStorage.getItem('access_token'),
  refreshToken: localStorage.getItem('refresh_token'),
  permissions: JSON.parse(localStorage.getItem('permissions') || '[]'),
  activeBranchId: Number(localStorage.getItem('active_branch_id')) || null,
  activeAcademicYearId: Number(localStorage.getItem('active_academic_year_id')) || null,
  activeAcademicYearName: localStorage.getItem('active_academic_year_name') || '',
  academicYears: JSON.parse(localStorage.getItem('academic_years') || '[]'),
  isAuthenticated: !!localStorage.getItem('access_token'),

  setAuth: ({ user, accessToken, refreshToken, permissions }) => {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('permissions', JSON.stringify(permissions || []));
    localStorage.setItem('active_branch_id', String(user.branchId || ''));
    localStorage.setItem('active_academic_year_id', String(user.academicYearId || ''));

    set({
      user,
      accessToken,
      refreshToken,
      permissions: permissions || [],
      activeBranchId: user.branchId || null,
      activeAcademicYearId: user.academicYearId || null,
      isAuthenticated: true,
    });
  },

  setTokens: (accessToken, refreshToken) => {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    set({ accessToken, refreshToken });
  },

  setAcademicYears: (years) => {
    localStorage.setItem('academic_years', JSON.stringify(years || []));
    set({ academicYears: years || [] });
  },

  setActiveAcademicYear: (yearId, yearName = '') => {
    localStorage.setItem('active_academic_year_id', String(yearId));
    if (yearName) {
      localStorage.setItem('active_academic_year_name', yearName);
    }
    set((state) => {
      let resolvedName = yearName;
      if (!resolvedName && state.academicYears.length > 0) {
        const found = state.academicYears.find((y) => y.id === yearId);
        if (found) resolvedName = found.rawName || found.name;
      }
      return {
        activeAcademicYearId: yearId,
        ...(resolvedName ? { activeAcademicYearName: resolvedName } : {}),
      };
    });
  },

  setActiveBranch: (branchId) => {
    localStorage.setItem('active_branch_id', String(branchId));
    set({ activeBranchId: branchId });
  },

  isImpersonating: !!localStorage.getItem('sa_backup_session'),
  impersonatedSchool: JSON.parse(localStorage.getItem('impersonated_school') || 'null'),

  startImpersonation: ({ user, accessToken, refreshToken, permissions, school }) => {
    // Backup current Super Admin session if not already in an impersonated session
    const currentBackup = localStorage.getItem('sa_backup_session');
    if (!currentBackup) {
      const backupSession = {
        user: JSON.parse(localStorage.getItem('user') || 'null'),
        accessToken: localStorage.getItem('access_token'),
        refreshToken: localStorage.getItem('refresh_token'),
        permissions: JSON.parse(localStorage.getItem('permissions') || '[]'),
        activeBranchId: localStorage.getItem('active_branch_id'),
        activeAcademicYearId: localStorage.getItem('active_academic_year_id'),
      };
      localStorage.setItem('sa_backup_session', JSON.stringify(backupSession));
    }

    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('permissions', JSON.stringify(permissions || []));
    localStorage.setItem('active_branch_id', String(user.branchId || ''));
    localStorage.setItem('active_academic_year_id', String(user.academicYearId || ''));
    localStorage.setItem('impersonated_school', JSON.stringify(school || null));

    set({
      user,
      accessToken,
      refreshToken,
      permissions: permissions || [],
      activeBranchId: user.branchId || null,
      activeAcademicYearId: user.academicYearId || null,
      isAuthenticated: true,
      isImpersonating: true,
      impersonatedSchool: school || null,
    });
  },

  exitImpersonation: () => {
    const backupRaw = localStorage.getItem('sa_backup_session');
    if (backupRaw) {
      try {
        const backup = JSON.parse(backupRaw);
        localStorage.setItem('user', JSON.stringify(backup.user));
        localStorage.setItem('access_token', backup.accessToken);
        localStorage.setItem('refresh_token', backup.refreshToken);
        localStorage.setItem('permissions', JSON.stringify(backup.permissions || []));
        localStorage.setItem('active_branch_id', String(backup.activeBranchId || ''));
        localStorage.setItem('active_academic_year_id', String(backup.activeAcademicYearId || ''));

        localStorage.removeItem('sa_backup_session');
        localStorage.removeItem('impersonated_school');

        set({
          user: backup.user,
          accessToken: backup.accessToken,
          refreshToken: backup.refreshToken,
          permissions: backup.permissions || [],
          activeBranchId: backup.activeBranchId ? Number(backup.activeBranchId) : null,
          activeAcademicYearId: backup.activeAcademicYearId ? Number(backup.activeAcademicYearId) : null,
          isAuthenticated: true,
          isImpersonating: false,
          impersonatedSchool: null,
        });
        return true;
      } catch (e) {
        console.error('Failed to restore backup session', e);
      }
    }
    return false;
  },

  logout: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('permissions');
    localStorage.removeItem('active_branch_id');
    localStorage.removeItem('active_academic_year_id');
    localStorage.removeItem('sa_backup_session');
    localStorage.removeItem('impersonated_school');

    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      permissions: [],
      activeBranchId: null,
      activeAcademicYearId: null,
      isAuthenticated: false,
      isImpersonating: false,
      impersonatedSchool: null,
    });
  },
}));
