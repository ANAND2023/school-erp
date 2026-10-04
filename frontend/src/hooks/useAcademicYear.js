import { useAuthStore } from '../store/authStore';
import { useQueryClient } from '@tanstack/react-query';

export const useAcademicYear = () => {
  const { activeAcademicYearId, activeAcademicYearName, academicYears, setActiveAcademicYear } = useAuthStore();
  const queryClient = useQueryClient();

  const switchAcademicYear = (newYearId, newYearName = '') => {
    setActiveAcademicYear(newYearId, newYearName);
    // Invalidate all queries so components refetch data for the new academic year
    queryClient.invalidateQueries();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('academicYearChanged', { detail: { yearId: newYearId, yearName: newYearName } }));
    }
  };

  return {
    activeAcademicYearId,
    activeAcademicYearName,
    academicYears,
    switchAcademicYear,
  };
};

