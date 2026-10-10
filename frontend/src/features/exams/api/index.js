import api from '../../../api/client';

export const examApi = {
  // Terms
  getTerms: (academicYearId) => api.get('/exams/terms', { params: { academicYearId } }),
  createTerm: (data) => api.post('/exams/terms', data),
  updateTerm: (id, data) => api.put(`/exams/terms/${id}`, data),
  deleteTerm: (id) => api.delete(`/exams/terms/${id}`),

  // Exams
  getExams: (params) => api.get('/exams', { params }),
  createExam: (data) => api.post('/exams', data),
  updateExam: (id, data) => api.put(`/exams/${id}`, data),
  deleteExam: (id) => api.delete(`/exams/${id}`),
  toggleLockExam: (id) => api.post(`/exams/${id}/lock`),
  togglePublishExam: (id) => api.post(`/exams/${id}/publish`),
  autoPopulateSubjects: (examId) => api.post(`/exams/${examId}/auto-populate-subjects`),

  // Schedules
  getSchedules: (examId) => api.get(`/exams/${examId}/schedules`),
  saveSchedule: (examId, data) => api.post(`/exams/${examId}/schedules`, data),
  saveSchedulesBulk: (examId, data) => api.post(`/exams/${examId}/schedules/bulk`, data),
  copySchedulesTo: (sourceExamId, targetExamIds) => api.post(`/exams/${sourceExamId}/copy-schedules-to`, targetExamIds),
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

  // Multi-Term Annual Report Cards (Term 1, Term 2, Term 3 & Final Year)
  getMultiTermReportCard: (studentId, academicYearId) =>
    api.get('/exams/multi-term-report-card', { params: { studentId, academicYearId } }),
  getMultiTermClassReportCards: (classId, sectionId, academicYearId) =>
    api.get('/exams/multi-term-class-report-cards', { params: { classId, sectionId, academicYearId } }),

  // CCE 2-Term Progress Report Card (Kush Public School Template)
  getCceProgressReportCard: (studentId, academicYearId) =>
    api.get('/exams/cce-progress-report-card', { params: { studentId, academicYearId } }),
  getCceClassProgressReportCards: (classId, sectionId, academicYearId) =>
    api.get('/exams/cce-class-progress-report-cards', { params: { classId, sectionId, academicYearId } }),
};


