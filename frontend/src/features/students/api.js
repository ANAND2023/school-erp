import apiClient from '../../api/client';

export const enquiryApi = {
  getEnquiries: (params) => apiClient.get('/enquiries', { params }),
  getEnquiry: (id) => apiClient.get(`/enquiries/${id}`),
  createEnquiry: (data) => apiClient.post('/enquiries', data),
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
};
