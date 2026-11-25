import apiClient from '../../api/client';

export const schoolApi = {
  getSchools: (params) => apiClient.get('/schools', { params }),
  getSchool: (id) => apiClient.get(`/schools/${id}`),
  createSchool: (data) => apiClient.post('/schools', data),
  updateSchool: (id, data) => apiClient.put(`/schools/${id}`, data),
  deleteSchool: (id) => apiClient.delete(`/schools/${id}`),
};

export const branchApi = {
  getBranches: (params) => apiClient.get('/branches', { params }),
  getBranch: (id) => apiClient.get(`/branches/${id}`),
  createBranch: (data) => apiClient.post('/branches', data),
  updateBranch: (id, data) => apiClient.put(`/branches/${id}`, data),
  getCurrentBranch: () => apiClient.get('/branches/current'),
  getIdCardTemplate: () => apiClient.get('/branches/current/id-card-template'),
  saveIdCardTemplate: (data) => apiClient.post('/branches/current/id-card-template', data),
};

export const academicYearApi = {
  getAcademicYears: () => apiClient.get('/academicyears'),
  createAcademicYear: (data) => apiClient.post('/academicyears', data),
  setCurrent: (id) => apiClient.put(`/academicyears/${id}/set-current`),
};

export const classApi = {
  getClasses: () => apiClient.get('/classes'),
  createClass: (data) => apiClient.post('/classes', data),
  updateClass: (id, data) => apiClient.put(`/classes/${id}`, data),
  deleteClass: (id) => apiClient.delete(`/classes/${id}`),
  addSection: (classId, data) => apiClient.post(`/classes/${classId}/sections`, data),
  updateSection: (sectionId, data) => apiClient.put(`/classes/sections/${sectionId}`, data),
  deleteSection: (sectionId) => apiClient.delete(`/classes/sections/${sectionId}`),
};
export const classesApi = classApi;


export const subjectApi = {
  getSubjects: () => apiClient.get('/subjects'),
  createSubject: (data) => apiClient.post('/subjects', data),
  updateSubject: (id, data) => apiClient.put(`/subjects/${id}`, data),
  deleteSubject: (id) => apiClient.delete(`/subjects/${id}`),
};

export const classSubjectApi = {
  getClassSubjects: (classId, academicYearId) =>
    apiClient.get('/classsubjects', { params: { classId, academicYearId } }),
  saveMapping: (data) => apiClient.post('/classsubjects/save-mapping', data),
  copyFromPreviousYear: (data) => apiClient.post('/classsubjects/copy-from-previous-year', data),
};

export const simpleMasterApi = {
  getMasters: (type) => apiClient.get('/simplemasters', { params: { type } }),
  getDepartments: () => apiClient.get('/simplemasters', { params: { type: 'Department' } }),
  getDesignations: () => apiClient.get('/simplemasters', { params: { type: 'Designation' } }),
  createMaster: (data) => apiClient.post('/simplemasters', data),
  updateMaster: (id, data) => apiClient.put(`/simplemasters/${id}`, data),
  deleteMaster: (id) => apiClient.delete(`/simplemasters/${id}`),
};

export const numberingSeriesApi = {
  getSeries: () => apiClient.get('/numberingseries'),
  saveSeries: (data) => apiClient.put('/numberingseries', data),
};

