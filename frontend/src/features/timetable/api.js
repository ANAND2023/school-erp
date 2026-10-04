import api from '../../api/client';

// Period Master
export const getPeriods = () => api.get('/timetable/periods');
export const createPeriod = (data) => api.post('/timetable/periods', data);
export const deletePeriod = (id) => api.delete(`/timetable/periods/${id}`);

// Section Timetable
export const getSectionTimetable = (sectionId) =>
  api.get(`/timetable/section/${sectionId}`);
export const saveTimetableSlot = (data) =>
  api.post('/timetable/slot', data);
export const deleteTimetableSlot = (id) =>
  api.delete(`/timetable/slot/${id}`);

// Teacher Timetable
export const getTeacherTimetable = (employeeId) =>
  api.get(`/timetable/teacher/${employeeId}`);

// Substitutions & Free Teachers
export const getFreeTeachers = (date, periodId) =>
  api.get(`/timetable/free-teachers?date=${date}&periodId=${periodId}`);
export const getSubstitutions = (date) =>
  api.get(`/timetable/substitutions?date=${date}`);
export const createSubstitution = (data) =>
  api.post('/timetable/substitutions', data);
export const deleteSubstitution = (id) =>
  api.delete(`/timetable/substitutions/${id}`);
