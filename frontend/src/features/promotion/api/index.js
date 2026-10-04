import api from '../../../api/client';

export const promotionApi = {
  // Promotion
  getEligibleStudents: (classId, sectionId, academicYearId) =>
    api.get('/promotion/eligible-students', { params: { classId, sectionId, academicYearId } }),
  executeBulkPromotion: (data) => api.post('/promotion/bulk', data),
  getPromotionHistory: (params) => api.get('/promotion/history', { params }),
  rollbackPromotion: (id) => api.post(`/promotion/${id}/rollback`),

  // Transfer Certificates
  getTransferCertificates: (search) => api.get('/transfer-certificates', { params: { search } }),
  checkDuesForTc: (studentId) => api.get(`/transfer-certificates/dues-check/${studentId}`),
  issueTc: (data) => api.post('/transfer-certificates', data),
  getTcPrintData: (id) => api.get(`/transfer-certificates/${id}/print`),
  cancelTc: (id, data) => api.post(`/transfer-certificates/${id}/cancel`, data),
};
