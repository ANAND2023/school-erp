import api from '../../api/client';

// Holidays
export const getHolidays = () => api.get('/attendance/holidays');
export const createHoliday = (data) => api.post('/attendance/holidays', data);
export const updateHoliday = (id, data) => api.put(`/attendance/holidays/${id}`, data);
export const deleteHoliday = (id) => api.delete(`/attendance/holidays/${id}`);

// Student Attendance
export const getStudentAttendance = (sectionId, date) =>
  api.get(`/attendance/students?sectionId=${sectionId}&date=${date}`);
export const saveStudentAttendanceBulk = (data) =>
  api.post('/attendance/students/bulk', data);
export const getAbsenteesToday = (params) =>
  api.get('/attendance/students/absentees-today', { params });
export const getStudentMonthlyRegister = (sectionId, month, year, classId) => {
  let url = `/attendance/students/monthly-register?month=${month}&year=${year}`;
  if (sectionId) url += `&sectionId=${sectionId}`;
  if (classId) url += `&classId=${classId}`;
  return api.get(url);
};

// Staff Attendance
export const getStaffAttendance = (date, departmentId) => {
  const query = departmentId ? `?date=${date}&departmentId=${departmentId}` : `?date=${date}`;
  return api.get(`/attendance/staff${query}`);
};
export const saveStaffAttendanceBulk = (data) =>
  api.post('/attendance/staff/bulk', data);
export const getStaffMonthlyRegister = (month, year, departmentId) => {
  const query = departmentId
    ? `?month=${month}&year=${year}&departmentId=${departmentId}`
    : `?month=${month}&year=${year}`;
  return api.get(`/attendance/staff/monthly-register${query}`);
};

// Leave Requests & Policy
export const getLeaveRequests = (params) =>
  api.get('/leave-requests', { params });
export const applyLeave = (data) =>
  api.post('/leave-requests', data);
export const actionLeave = (id, data) =>
  api.post(`/leave-requests/${id}/action`, data);

// Category-wise Staff Leave Policies (SL / CL Quotas)
export const getLeavePolicies = () =>
  api.get('/leave-requests/policies');
export const saveLeavePolicy = (data) =>
  api.post('/leave-requests/policies', data);
export const deleteLeavePolicy = (id) =>
  api.delete(`/leave-requests/policies/${id}`);

// Staff Leave Balances Ledger & Individual Allocation
export const getStaffLeaveBalances = (params) =>
  api.get('/leave-requests/staff-balances', { params });
export const setStaffLeaveAllocation = (data) =>
  api.post('/leave-requests/allocate-staff', data);
