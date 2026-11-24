import apiClient from '../../api/client';

export const enquiryApi = {
  getEnquiries: (params) => apiClient.get('/enquiries', { params }),
  getEnquiry: (id) => apiClient.get(`/enquiries/${id}`),
  createEnquiry: (data) => apiClient.post('/enquiries', data),
  updateEnquiry: (id, data) => apiClient.put(`/enquiries/${id}`, data),
  deleteEnquiry: (id) => apiClient.delete(`/enquiries/${id}`),
  addFollowup: (id, data) => apiClient.post(`/enquiries/${id}/followup`, data),
};

export const studentApi = {
  getStudents: (params) => apiClient.get('/students', { params }),
  getStudentDetail: (id) => apiClient.get(`/students/${id}`),
  admitStudent: (data) => apiClient.post('/students/admit', data),
  checkSiblings: (mobile, search) => apiClient.get('/students/siblings', { params: { mobile, search } }),
  assignRollNumbers: (data) => apiClient.post('/students/assign-roll-numbers', data),
  changeSection: (data) => apiClient.post('/students/change-section', data),
  updateStudent: (id, data) => apiClient.put(`/students/${id}`, data),
  addDocument: (id, data) => apiClient.post(`/students/${id}/documents`, data),
  deleteDocument: (id, docId) => apiClient.delete(`/students/${id}/documents/${docId}`),
  getSectionHistory: (id) => apiClient.get(`/students/${id}/section-history`),
  getAuditLogs: (id) => apiClient.get(`/students/${id}/audit-logs`),
  getAdmissionSummary: (params) => apiClient.get('/students/admission-summary', { params }),
  getAwrReport: (params) => apiClient.get('/students/awr-report', { params }),
  getAwrConfig: () => apiClient.get('/students/awr-config'),
  getAwrNextNumber: () => apiClient.get('/students/awr-next-number'),
};

export const gatePassApi = {
  getGatePasses: (params) => apiClient.get('/student-gate-pass', { params }),
  getGatePass: (id) => apiClient.get(`/student-gate-pass/${id}`),
  createGatePass: (data) => apiClient.post('/student-gate-pass', data),
  updateGatePass: (id, data) => apiClient.put(`/student-gate-pass/${id}`, data),
  updateStatus: (id, data) => apiClient.put(`/student-gate-pass/${id}/status`, data),
  deleteGatePass: (id) => apiClient.delete(`/student-gate-pass/${id}`),
  getStats: () => apiClient.get('/student-gate-pass/stats'),
  searchStudents: (params) => apiClient.get('/student-gate-pass/search-students', { params }),
};

export const certificateApi = {
  getCertificates: (params) => apiClient.get('/student-certificates', { params }),
  getCertificate: (id) => apiClient.get(`/student-certificates/${id}`),
  createCertificate: (data) => apiClient.post('/student-certificates', data),
  deleteCertificate: (id) => apiClient.delete(`/student-certificates/${id}`),
  getStats: (params) => apiClient.get('/student-certificates/stats', { params }),
  searchStudents: (params) => apiClient.get('/student-certificates/search-students', { params }),
  getNextNumber: (type) => apiClient.get(`/student-certificates/next-number/${type}`),
};


