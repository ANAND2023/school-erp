import apiClient from '../../api/client';

export const feesApi = {
  // Masters
  getHeads: () => apiClient.get('/fees/heads'),
  createHead: (data) => apiClient.post('/fees/heads', data),
  updateHead: (id, data) => apiClient.put(`/fees/heads/${id}`, data),
  deleteHead: (id) => apiClient.delete(`/fees/heads/${id}`),

  getGroups: () => apiClient.get('/fees/groups'),
  createGroup: (data) => apiClient.post('/fees/groups', data),

  getInstallments: () => apiClient.get('/fees/installments'),
  createInstallment: (data) => apiClient.post('/fees/installments', data),

  getStructures: (classId, feeGroupId) =>
    apiClient.get('/fees/structures', { params: { classId, feeGroupId } }),
  saveStructures: (data) => apiClient.post('/fees/structures', data),

  getFineRules: () => apiClient.get('/fees/fine-rules'),
  saveFineRule: (data) => apiClient.post('/fees/fine-rules', data),

  // Monthly Setup
  generateMonthlySchedule: (data) => apiClient.post('/fees/monthly-setup/generate-schedule', data),
  saveMonthlyStructure: (data) => apiClient.post('/fees/monthly-setup/save-structure', data),
  getMonthlySetupStatus: () => apiClient.get('/fees/monthly-setup/status'),

  // Assignments & Concessions
  bulkAssign: (data) => apiClient.post('/fees/assignments/bulk', data),
  getConcessions: (studentId) => apiClient.get('/fees/concessions', { params: { studentId } }),
  createConcession: (data) => apiClient.post('/fees/concessions', data),
  deleteConcession: (id) => apiClient.delete(`/fees/concessions/${id}`),

  // Collection & Receipts
  getStudentDues: (studentId) => apiClient.get(`/fees/students/${studentId}/dues`),
  collectFee: (data) => apiClient.post('/fees/collect', data),
  getReceiptPrint: (id) => apiClient.get(`/fees/receipts/${id}/print`),
  cancelReceipt: (id, data) => apiClient.post(`/fees/receipts/${id}/cancel`, data),

  // Reports
  getDailyCollection: (params) => apiClient.get('/fees/reports/daily-collection', { params }),
  getDefaulters: (params) => apiClient.get('/fees/reports/defaulters', { params }),
  getClassMonthStatus: (params) => apiClient.get('/fees/reports/class-month-status', { params }),
  getStudentFullHistory: (studentId) => apiClient.get(`/fees/reports/students/${studentId}/history`),
};
