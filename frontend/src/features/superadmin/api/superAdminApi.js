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

  updateTenantPortalAccess: async (id, payload) => {
    const res = await apiClient.put(`/superadmin/tenants/${id}/portal-access`, payload);
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

  // 8. System Error Logs (Super Admin Diagnostics)
  getErrorLogs: async (params = {}) => {
    const res = await apiClient.get('/superadmin/error-logs', { params });
    return res.data;
  },

  getErrorLogById: async (id) => {
    const res = await apiClient.get(`/superadmin/error-logs/${id}`);
    return res.data;
  },

  resolveErrorLog: async (id, payload = {}) => {
    const res = await apiClient.post(`/superadmin/error-logs/${id}/resolve`, payload);
    return res.data;
  },

  unresolveErrorLog: async (id) => {
    const res = await apiClient.post(`/superadmin/error-logs/${id}/unresolve`);
    return res.data;
  },

  deleteErrorLog: async (id) => {
    const res = await apiClient.delete(`/superadmin/error-logs/${id}`);
    return res.data;
  },

  clearResolvedLogs: async () => {
    const res = await apiClient.post('/superadmin/error-logs/clear-resolved');
    return res.data;
  },

  clearAllLogs: async (daysOld = 0) => {
    const res = await apiClient.post('/superadmin/error-logs/clear-all', null, { params: { daysOld } });
    return res.data;
  },

  // 9. WhatsApp Module Configuration
  getWhatsAppConfig: async (schoolId = null) => {
    const res = await apiClient.get('/superadmin/whatsapp-config', { params: { schoolId } });
    return res.data;
  },

  saveWhatsAppConfig: async (payload, schoolId = null) => {
    const res = await apiClient.post('/superadmin/whatsapp-config', payload, { params: { schoolId } });
    return res.data;
  },

  // 10. Dynamic Enquiry Slip Designer (School-wise)
  getEnquirySlipConfig: async (schoolId = null) => {
    const res = await apiClient.get('/superadmin/enquiry-slip-config', { params: { schoolId } });
    return res.data;
  },

  saveEnquirySlipConfig: async (payload, schoolId = null) => {
    const res = await apiClient.post('/superadmin/enquiry-slip-config', payload, { params: { schoolId } });
    return res.data;
  },

  resetEnquirySlipConfig: async (schoolId) => {
    const res = await apiClient.delete('/superadmin/enquiry-slip-config', { params: { schoolId } });
    return res.data;
  },

  // 11. Dynamic Fee Receipt Slip Designer (School-wise)
  getFeeSlipConfig: async (schoolId = null) => {
    const res = await apiClient.get('/superadmin/fee-slip-config', { params: { schoolId } });
    return res.data;
  },

  saveFeeSlipConfig: async (payload, schoolId = null) => {
    const res = await apiClient.post('/superadmin/fee-slip-config', payload, { params: { schoolId } });
    return res.data;
  },

  resetFeeSlipConfig: async (schoolId) => {
    const res = await apiClient.delete('/superadmin/fee-slip-config', { params: { schoolId } });
    return res.data;
  },

  // 12. Dynamic Admission Slip Designer (School-wise)
  getAdmissionSlipConfig: async (schoolId = null) => {
    const res = await apiClient.get('/superadmin/admission-slip-config', { params: { schoolId } });
    return res.data;
  },

  saveAdmissionSlipConfig: async (payload, schoolId = null) => {
    const res = await apiClient.post('/superadmin/admission-slip-config', payload, { params: { schoolId } });
    return res.data;
  },

  resetAdmissionSlipConfig: async (schoolId) => {
    const res = await apiClient.delete('/superadmin/admission-slip-config', { params: { schoolId } });
    return res.data;
  },

  // 13. Dynamic Registration Slip Designer (School-wise)
  getRegistrationSlipConfig: async (schoolId = null) => {
    const res = await apiClient.get('/superadmin/registration-slip-config', { params: { schoolId } });
    return res.data;
  },

  saveRegistrationSlipConfig: async (payload, schoolId = null) => {
    const res = await apiClient.post('/superadmin/registration-slip-config', payload, { params: { schoolId } });
    return res.data;
  },

  resetRegistrationSlipConfig: async (schoolId) => {
    const res = await apiClient.delete('/superadmin/registration-slip-config', { params: { schoolId } });
    return res.data;
  },

  // 13. Dynamic Inventory Store Profile & Slip Designer (School-wise)
  getInventorySlipConfig: async (schoolId = null) => {
    const res = await apiClient.get('/superadmin/inventory-slip-config', { params: { schoolId } });
    return res.data;
  },

  saveInventorySlipConfig: async (payload, schoolId = null) => {
    const res = await apiClient.post('/superadmin/inventory-slip-config', payload, { params: { schoolId } });
    return res.data;
  },

  resetInventorySlipConfig: async (schoolId) => {
    const res = await apiClient.delete('/superadmin/inventory-slip-config', { params: { schoolId } });
    return res.data;
  },
};
