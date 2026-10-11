import apiClient from '../../api/client';

export const portalApi = {
  getWards: () => apiClient.get('/portal/wards'),
  getDashboard: (studentId) => apiClient.get('/portal/dashboard', { params: { studentId } }),
  getAttendance: (params) => apiClient.get('/portal/attendance', { params }),
  getTimetable: (studentId) => apiClient.get('/portal/timetable', { params: { studentId } }),
  getExams: (studentId) => apiClient.get('/portal/exams', { params: { studentId } }),
  getFees: (studentId) => apiClient.get('/portal/fees', { params: { studentId } }),
  getReportCard: (studentId, examId) => apiClient.get('/portal/report-card', { params: { studentId, examId } }),
  getReceiptPrint: (receiptId, studentId) => apiClient.get(`/portal/receipts/${receiptId}/print`, { params: { studentId } }),
  askAi: (data) => apiClient.post('/portal/ai-study-chat', data),
};
