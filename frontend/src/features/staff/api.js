import apiClient from '../../api/client';

export const staffApi = {
  // Employees
  getEmployees: (params) => apiClient.get('/employees', { params }),
  getEmployee: (id) => apiClient.get(`/employees/${id}`),
  getNextCode: () => apiClient.get('/employees/next-code'),
  createEmployee: (data) => apiClient.post('/employees', data),
  updateEmployee: (id, data) => apiClient.put(`/employees/${id}`, data),
  processExit: (id, data) => apiClient.post(`/employees/${id}/exit`, data),

  // Allocations
  getClassTeachers: (classId) => apiClient.get('/teacher-allocations/class-teachers', { params: { classId } }),
  saveClassTeacher: (data) => apiClient.post('/teacher-allocations/class-teachers', data),
  getSubjectTeachers: (params) => apiClient.get('/teacher-allocations/subject-teachers', { params }),
  saveSubjectTeacher: (data) => apiClient.post('/teacher-allocations/subject-teachers', data),
  getMyAllocations: () => apiClient.get('/teacher-allocations/my-allocations'),
};
