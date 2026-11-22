import apiClient from '../../../api/client';

export const dynamicRegistrationApi = {
  // Form Builder
  getFormConfig: (academicYearId) =>
    apiClient.get('/DynamicAdmission/form-config', { params: { academicYearId } }),

  saveFormConfig: (data) =>
    apiClient.post('/DynamicAdmission/form-config', data),

  // Dynamic Registration Slip Layout & Styling (from Super Admin designer)
  getRegistrationSlipConfig: () =>
    apiClient.get('/DynamicAdmission/registration-slip-config'),

  // Slips Generation & Directory
  getSlips: (params) =>
    apiClient.get('/DynamicAdmission/slips', { params }),

  getSlipById: (id) =>
    apiClient.get(`/DynamicAdmission/slips/${id}`),

  markSlipAdmitted: (id) =>
    apiClient.post(`/DynamicAdmission/slips/${id}/admit`),

  createIndividualSlip: (data) =>
    apiClient.post('/DynamicAdmission/slips/individual', data),

  createBulkSlips: (data) =>
    apiClient.post('/DynamicAdmission/slips/bulk', data),

  // Payment
  collectPayment: (data) =>
    apiClient.post('/DynamicAdmission/payments/collect', data),

  // Dashboard Stats
  getDashboardStats: (academicYearId) =>
    apiClient.get('/DynamicAdmission/reports/dashboard-stats', { params: { academicYearId } }),
};

export const dynamicAdmissionApi = dynamicRegistrationApi;
export default dynamicRegistrationApi;
