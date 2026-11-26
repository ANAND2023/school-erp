import apiClient from '../../api/client';

export const homeworkApi = {
  getHomeworkList: (params) => apiClient.get('/homework', { params }),
  getHomeworkById: (id) => apiClient.get(`/homework/${id}`),
  createHomework: (formData) => apiClient.post('/homework', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateHomework: (id, formData) => apiClient.put(`/homework/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteHomework: (id) => apiClient.delete(`/homework/${id}`),
  getHomeworkMeta: () => apiClient.get('/homework/meta'),
};
