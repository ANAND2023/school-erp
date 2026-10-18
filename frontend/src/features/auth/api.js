import apiClient from '../../api/client';

export const userApi = {
  getUsers: (params) => apiClient.get('/users', { params }),
  getUser: (id) => apiClient.get(`/users/${id}`),
  createUser: (data) => apiClient.post('/users', data),
  updateUser: (id, data) => apiClient.put(`/users/${id}`, data),
  toggleStatus: (id, isActive) => apiClient.put(`/users/${id}/status`, isActive),
  unlockUser: (id) => apiClient.put(`/users/${id}/unlock`),
  resetPassword: (id, newPassword) => apiClient.post(`/users/${id}/reset-password`, JSON.stringify(newPassword), {
    headers: { 'Content-Type': 'application/json' },
  }),
  updateDiscountEligibility: (id, data) => apiClient.put(`/users/${id}/discount-eligibility`, data),
};

export const roleApi = {
  getRoles: () => apiClient.get('/roles'),
  getRole: (id) => apiClient.get(`/roles/${id}`),
  createRole: (data) => apiClient.post('/roles', data),
  updateRole: (id, data) => apiClient.put(`/roles/${id}`, data),
  deleteRole: (id) => apiClient.delete(`/roles/${id}`),
};

export const auditLogApi = {
  getLogs: (params) => apiClient.get('/auditlogs', { params }),
};
