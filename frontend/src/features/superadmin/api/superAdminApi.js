import apiClient from '../../../api/client';

export const superAdminApi = {
  // 1. Dashboard & KPIs
  getDashboardKpis: async () => {
    const res = await apiClient.get('/superadmin/dashboard/kpis');
    return res.data;
  },

  // 2. Tenants Management
  getTenants: async (params = {}) => {
    const res = await apiClient.get('/superadmin/tenants', { params });
    return res.data;
  },

  getTenantById: async (id) => {
    const res = await apiClient.get(`/superadmin/tenants/${id}`);
    return res.data;
  },

  createTenant: async (payload) => {
    const res = await apiClient.post('/superadmin/tenants', payload);
    return res.data;
  },

  updateTenant: async (id, payload) => {
    const res = await apiClient.put(`/superadmin/tenants/${id}`, payload);
    return res.data;
  },

  resetAdminPassword: async (id, newPassword) => {
    const res = await apiClient.post(`/superadmin/tenants/${id}/reset-admin-password`, { newPassword });
    return res.data;
  },

  // 3. Module Management
  updateTenantModules: async (id, enabledModuleCodes) => {
    const res = await apiClient.put(`/superadmin/tenants/${id}/modules`, { enabledModuleCodes });
    return res.data;
  },

  getModuleCatalog: async () => {
    const res = await apiClient.get('/superadmin/modules/catalog');
    return res.data;
  },

  // 4. Subscriptions & Plans
  renewSubscription: async (id, payload) => {
    const res = await apiClient.post(`/superadmin/tenants/${id}/subscriptions`, payload);
    return res.data;
  },

  getPlans: async () => {
    const res = await apiClient.get('/superadmin/plans');
    return res.data;
  },

  createPlan: async (payload) => {
    const res = await apiClient.post('/superadmin/plans', payload);
    return res.data;
  },

  // 5. Impersonation
  impersonateTenant: async (id) => {
    const res = await apiClient.post(`/superadmin/tenants/${id}/impersonate`);
    return res.data;
  },

  // 6. Gateways
  getGateways: async (schoolId = null) => {
    const res = await apiClient.get('/superadmin/gateways', { params: { schoolId } });
    return res.data;
  },

  saveGateway: async (payload) => {
    const res = await apiClient.post('/superadmin/gateways', payload);
    return res.data;
  },

  // 7. Global Audit Trail
  getAuditLogs: async (schoolId = null, limit = 50) => {
    const res = await apiClient.get('/superadmin/audit-logs', { params: { schoolId, limit } });
    return res.data;
  },
};
