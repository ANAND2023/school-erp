import apiClient from '../../api/client';

export const dashboardApi = {
  getStats: (params) => apiClient.get('/dashboard/stats', { params }),
};
