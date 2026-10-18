import { useAuthStore } from '../store/authStore';

export const usePermission = () => {
  const { permissions, user } = useAuthStore();

  const isSuperAdmin =
    user?.userType === 'SuperAdmin' ||
    user?.userType === 1 ||
    user?.roleName?.toLowerCase() === 'super admin' ||
    user?.username?.toLowerCase() === 'superadmin';

  const hasPermission = (menu, action = 'View') => {
    if (isSuperAdmin) return true;
    if (!permissions || !Array.isArray(permissions)) return false;

    // Support array of menus
    if (Array.isArray(menu)) {
      return menu.some((m) => hasPermission(m, action));
    }

    if (!menu) return false;

    let perm = permissions.find(
      (p) => p.menu?.toLowerCase() === menu?.toLowerCase()
    );

    // Cross-module fallback between Admissions and Students
    if (!perm && menu.toLowerCase() === 'admissions') {
      perm = permissions.find((p) => p.menu?.toLowerCase() === 'students');
    }
    if (!perm && menu.toLowerCase() === 'students') {
      perm = permissions.find((p) =>
        ['admissions', 'feecollection', 'feeassignment', 'demandbill', 'studentattendance', 'marksentry'].includes(p.menu?.toLowerCase())
      );
    }

    if (!perm && (menu.toLowerCase() === 'feediscountmaster' || menu.toLowerCase() === 'feediscount')) {
      perm = permissions.find((p) =>
        ['fees', 'feestructure', 'feecollection', 'users', 'simplemasters', 'masters'].includes(p.menu?.toLowerCase())
      );
    }

    if (!perm && menu.toLowerCase() === 'transport') return true;
    if (!perm) return false;

    switch (action) {
      case 'View':
        return !!perm.canView;
      case 'Add':
        return !!perm.canAdd;
      case 'Edit':
        return !!perm.canEdit;
      case 'Delete':
        return !!perm.canDelete;
      case 'Print':
        return !!perm.canPrint;
      case 'Export':
        return !!perm.canExport;
      default:
        return false;
    }
  };

  return {
    hasPermission,
    can: hasPermission,
    isSuperAdmin,
    permissions,
  };
};
