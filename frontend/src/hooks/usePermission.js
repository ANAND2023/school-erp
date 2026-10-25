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

    const targetKey = String(menu).trim().toLowerCase();

    // Audit logs strictly super admin only
    if (targetKey === 'auditlogs') {
      return false;
    }

    let perm = permissions.find(
      (p) => p.menu && p.menu.trim().toLowerCase() === targetKey
    );

    // Contextual parent fallbacks for high-level umbrella menus
    if (!perm && targetKey === 'fees') {
      perm = permissions.find((p) =>
        ['feecollection', 'feestructure', 'feeassignment', 'demandbill', 'feeconcessions', 'feereports'].includes(
          p.menu?.trim().toLowerCase()
        )
      );
    }

    if (!perm && targetKey === 'transport') {
      perm = permissions.find((p) =>
        ['vehicles', 'routesstops', 'transportallocations'].includes(
          p.menu?.trim().toLowerCase()
        )
      );
    }

    if (!perm && targetKey === 'promotion') {
      perm = permissions.find((p) =>
        ['promotion', 'transfercertificates'].includes(
          p.menu?.trim().toLowerCase()
        )
      );
    }

    if (!perm && (targetKey === 'feediscountmaster' || targetKey === 'feediscount')) {
      perm = permissions.find((p) =>
        ['feestructure', 'feeconcessions', 'feecollection'].includes(
          p.menu?.trim().toLowerCase()
        )
      );
    }

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
