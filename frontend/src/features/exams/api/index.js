import api from '../../../api/client';

export const examApi = {
  // Terms
  getTerms: (academicYearId) => api.get('/exams/terms', { params: { academicYearId } }),
  createTerm: (data) => api.post('/exams/terms', data),
  deleteTerm: (id) => api.delete(`/exams/terms/${id}`),

  // Exams
  getExams: (params) => api.get('/exams', { params }),
  createExam: (data) => api.post('/exams', data),
  toggleLockExam: (id) => api.post(`/exams/${id}/lock`),
  togglePublishExam: (id) => api.post(`/exams/${id}/publish`),

  // Schedules
  getSchedules: (examId) => api.get(`/exams/${examId}/schedules`),
  saveSchedule: (examId, data) => api.post(`/exams/${examId}/schedules`, data),
  deleteSchedule: (id) => api.delete(`/exams/schedules/${id}`),

  // Grade Scales
  getGradeScales: () => api.get('/exams/grade-scales'),

  // Marks Entry
  getMarksForEntry: (scheduleId, sectionId) =>
    api.get('/exams/marks', { params: { scheduleId, sectionId } }),
  saveMarksBulk: (data) => api.post('/exams/marks/bulk', data),

  // Results & Report Cards
  processResults: (examId, sectionId) =>
    api.get(`/exams/${examId}/process-results`, { params: { sectionId } }),
  getReportCard: (studentId, examId) =>
    api.get('/exams/report-card', { params: { studentId, examId } }),
};
