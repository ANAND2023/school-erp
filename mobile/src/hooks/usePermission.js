import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export const usePermission = () => {
  const { permissions, user, isSuperAdmin, hasPermission } = useContext(AuthContext);

  return {
    hasPermission,
    can: hasPermission,
    isSuperAdmin,
    permissions,
    user,
  };
};

export default usePermission;
