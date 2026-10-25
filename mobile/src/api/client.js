import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const DEFAULT_PROD_URL = 'https://school-erp-api-fdjr.onrender.com/api';
export const DEFAULT_LOCAL_URL = 'http://192.168.1.2:5171/api';

const apiClient = axios.create({
  baseURL: DEFAULT_PROD_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const storedUrl = await AsyncStorage.getItem('@school_erp_api_url');
      if (storedUrl) {
        config.baseURL = storedUrl;
      }

      const token = await AsyncStorage.getItem('@school_erp_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      const activeYearId = await AsyncStorage.getItem('@school_erp_active_academic_year_id');
      if (activeYearId) {
        config.headers['X-Academic-Year'] = String(activeYearId);
      } else {
        const userStr = await AsyncStorage.getItem('@school_erp_user');
        if (userStr) {
          const user = JSON.parse(userStr);
          if (user.academicYearId) {
            config.headers['X-Academic-Year'] = String(user.academicYearId);
          }
        }
      }

      const userStr = await AsyncStorage.getItem('@school_erp_user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.branchId) {
          config.headers['X-Branch-Id'] = String(user.branchId);
        }
      }
    } catch (e) {
      console.warn('Interceptor storage error:', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auto Token Refresh Queue
let isRefreshing = false;
let failedQueue = [];
let sessionExpiredHandler = null;

export const setSessionExpiredHandler = (handler) => {
  sessionExpiredHandler = handler;
};

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response Interceptor: Auto Refresh Token on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (
        originalRequest.url?.includes('/auth/login') ||
        originalRequest.url?.includes('/auth/refresh-token')
      ) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const storedToken = await AsyncStorage.getItem('@school_erp_token');
        const storedRefresh = await AsyncStorage.getItem('@school_erp_refresh_token');

        if (!storedRefresh || !storedToken) {
          await AsyncStorage.multiRemove([
            '@school_erp_token',
            '@school_erp_user',
            '@school_erp_refresh_token',
          ]);
          if (sessionExpiredHandler) {
            sessionExpiredHandler();
          }
          isRefreshing = false;
          return Promise.reject(error);
        }

        const res = await axios.post(`${apiClient.defaults.baseURL}/auth/refresh-token`, {
          accessToken: storedToken,
          refreshToken: storedRefresh,
        });

        if (res.data?.success && res.data?.data) {
          const { accessToken: newAccess, refreshToken: newRefresh } = res.data.data;
          await AsyncStorage.setItem('@school_erp_token', newAccess);
          if (newRefresh) {
            await AsyncStorage.setItem('@school_erp_refresh_token', newRefresh);
          }
          apiClient.defaults.headers.common.Authorization = `Bearer ${newAccess}`;
          originalRequest.headers.Authorization = `Bearer ${newAccess}`;
          processQueue(null, newAccess);
          isRefreshing = false;
          return apiClient(originalRequest);
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        await AsyncStorage.multiRemove([
          '@school_erp_token',
          '@school_erp_user',
          '@school_erp_refresh_token',
        ]);
        if (sessionExpiredHandler) {
          sessionExpiredHandler();
        }
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Auth & Users
export const authApi = {
  login: (data) => apiClient.post('/auth/login', data),
  getSchools: () => apiClient.get('/auth/schools'),
  getUsers: (params) => apiClient.get('/users', { params }),
  getUser: (id) => apiClient.get(`/users/${id}`),
  getRoles: () => apiClient.get('/roles'),
  getRole: (id) => apiClient.get(`/roles/${id}`),
  createRole: (data) => apiClient.post('/roles', data),
  updateRole: (id, data) => apiClient.put(`/roles/${id}`, data),
  deleteRole: (id) => apiClient.delete(`/roles/${id}`),
  toggleUserStatus: (id) => apiClient.put(`/users/${id}/status`),
};

// Roles & Permissions Matrix
export const roleApi = {
  getRoles: () => apiClient.get('/roles'),
  getRole: (id) => apiClient.get(`/roles/${id}`),
  createRole: (data) => apiClient.post('/roles', data),
  updateRole: (id, data) => apiClient.put(`/roles/${id}`, data),
  deleteRole: (id) => apiClient.delete(`/roles/${id}`),
};

// Dashboard Stats
export const dashboardApi = {
  getStats: (params) => apiClient.get('/dashboard/stats', { params }),
  getBirthdays: (params) => apiClient.get('/dashboard/birthdays', { params }),
};

// Gate Pass
export const gatePassApi = {
  getStats: () => apiClient.get('/student-gate-pass/stats'),
  getGatePasses: (params) => apiClient.get('/student-gate-pass', { params }),
  getGatePass: (id) => apiClient.get(`/student-gate-pass/${id}`),
  searchStudents: async (params) => {
    try {
      const res = await apiClient.get('/student-gate-pass/search-students', { params });
      return res;
    } catch (e) {
      // Fallback to general students search if gate-pass endpoint is 404
      const query = params?.query || params?.search || '';
      const fallbackRes = await apiClient.get('/students', { params: { search: query, pageSize: params?.limit || 10 } });
      const items = fallbackRes.data?.data?.items || fallbackRes.data?.items || [];
      const formatted = items.map((s) => ({
        studentId: s.id,
        id: s.id,
        admissionNo: s.admissionNo,
        studentName: s.fullName,
        fullName: s.fullName,
        firstName: s.firstName || s.fullName,
        lastName: s.lastName || '',
        className: s.className,
        sectionName: s.sectionName,
        guardianName: s.guardianName,
        guardianMobile: s.guardianMobile,
      }));
      return { data: { success: true, data: formatted } };
    }
  },
  createGatePass: (data) => apiClient.post('/student-gate-pass', data),
  updateStatus: (id, data) => apiClient.put(`/student-gate-pass/${id}/status`, data),
  deleteGatePass: (id) => apiClient.delete(`/student-gate-pass/${id}`),
};

// Masters
export const classApi = {
  getClasses: () => apiClient.get('/classes'),
  createClass: (data) => apiClient.post('/classes', data),
  updateClass: (id, data) => apiClient.put(`/classes/${id}`, data),
  deleteClass: (id) => apiClient.delete(`/classes/${id}`),
  addSection: (classId, data) => apiClient.post(`/classes/${classId}/sections`, data),
  updateSection: (sectionId, data) => apiClient.put(`/classes/sections/${sectionId}`, data),
  deleteSection: (sectionId) => apiClient.delete(`/classes/sections/${sectionId}`),
  getSubjects: () => apiClient.get('/subjects'),
  createSubject: (data) => apiClient.post('/subjects', data),
  updateSubject: (id, data) => apiClient.put(`/subjects/${id}`, data),
  deleteSubject: (id) => apiClient.delete(`/subjects/${id}`),
  getAcademicYears: () => apiClient.get('/academicyears'),
  getBranch: () => apiClient.get('/branches/current'),
};

export const subjectApi = {
  getSubjects: () => apiClient.get('/subjects'),
  createSubject: (data) => apiClient.post('/subjects', data),
  updateSubject: (id, data) => apiClient.put(`/subjects/${id}`, data),
  deleteSubject: (id) => apiClient.delete(`/subjects/${id}`),
};

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
  deleteBranch: (id) => apiClient.delete(`/branches/${id}`),
  getCurrentBranch: () => apiClient.get('/branches/current'),
  getIdCardTemplate: () => apiClient.get('/branches/current/id-card-template'),
  saveIdCardTemplate: (data) => apiClient.post('/branches/current/id-card-template', data),
};

export const academicYearApi = {
  getAcademicYears: () => apiClient.get('/academicyears'),
  createAcademicYear: (data) => apiClient.post('/academicyears', data),
  setCurrent: (id) => apiClient.put(`/academicyears/${id}/set-current`),
};

// Attendance & Leaves
export const attendanceApi = {
  getStudentAttendance: (sectionId, date) =>
    apiClient.get('/attendance/students', { params: { sectionId, date } }),
  saveStudentAttendanceBulk: (data) =>
    apiClient.post('/attendance/students/bulk', data),
  getStaffAttendance: (date, departmentId) => {
    const query = departmentId ? `?date=${date}&departmentId=${departmentId}` : `?date=${date}`;
    return apiClient.get(`/attendance/staff${query}`);
  },
  saveStaffAttendanceBulk: (data) =>
    apiClient.post('/attendance/staff/bulk', data),
  getHolidays: () => apiClient.get('/attendance/holidays'),
  createHoliday: (data) => apiClient.post('/attendance/holidays', data),
  updateHoliday: (id, data) => apiClient.put(`/attendance/holidays/${id}`, data),
  deleteHoliday: (id) => apiClient.delete(`/attendance/holidays/${id}`),
  getLeaveRequests: (params) => apiClient.get('/leave-requests', { params }),
  applyLeave: (data) => apiClient.post('/leave-requests', data),
  actionLeave: (id, data) => apiClient.post(`/leave-requests/${id}/action`, data),
};

// Students & Admissions
export const studentApi = {
  getStudents: (params) => apiClient.get('/students', { params }),
  getStudentDetail: (id) => apiClient.get(`/students/${id}`),
  updateStudent: (id, data) => apiClient.put(`/students/${id}`, data),
  admitStudent: (data) => apiClient.post('/students/admit', data),
  getEnquiries: (params) => apiClient.get('/enquiries', { params }),
  getEnquiry: (id) => apiClient.get(`/enquiries/${id}`),
  createEnquiry: (data) => apiClient.post('/enquiries', data),
  updateEnquiry: (id, data) => apiClient.put(`/enquiries/${id}`, data),
  deleteEnquiry: (id) => apiClient.delete(`/enquiries/${id}`),
  addFollowup: (id, data) => apiClient.post(`/enquiries/${id}/followup`, data),
  getEnquirySlipConfig: () => apiClient.get('/enquiries/slip-config'),
  getAdmissionSlipConfig: () => apiClient.get('/students/admission-slip-config'),
  assignRollNumbers: (data) => apiClient.post('/students/assign-roll-numbers', data),
  changeSection: (data) => apiClient.post('/students/change-section', data),
};

// Fees
export const feesApi = {
  getDailyCollection: (params) => apiClient.get('/fees/reports/daily-collection', { params }),
  getStudentDues: (studentId) => apiClient.get(`/fees/students/${studentId}/dues`),
  getDiscountEligibility: () => apiClient.get('/fees/discount-eligibility'),
  collectFee: (data) => apiClient.post('/fees/collect', data),
  getReceipt: (id) => apiClient.get(`/fees/receipts/${id}`),
  getReceiptPrint: (id) => apiClient.get(`/fees/receipts/${id}/print`),
  cancelReceipt: (id, data) => apiClient.post(`/fees/receipts/${id}/cancel`, data),
  getReceiptConfig: () => apiClient.get('/fees/receipt-config'),
  getDefaulters: (params) => apiClient.get('/fees/reports/defaulters', { params }),
  getFeeStructures: () => apiClient.get('/fees/structures'),
  getFeeHeads: () => apiClient.get('/fees/heads'),
  getConcessions: (params) => apiClient.get('/fees/concessions', { params }),
  createConcession: (data) => apiClient.post('/fees/concessions', data),
  updateConcession: (id, data) => apiClient.put(`/fees/concessions/${id}`, data),
  deleteConcession: (id) => apiClient.delete(`/fees/concessions/${id}`),
  getDiscountSchemes: () => apiClient.get('/fees/discount-schemes'),
  createDiscountScheme: (data) => apiClient.post('/fees/discount-schemes', data),
  updateDiscountScheme: (id, data) => apiClient.put(`/fees/discount-schemes/${id}`, data),
  deleteDiscountScheme: (id) => apiClient.delete(`/fees/discount-schemes/${id}`),
};

// Staff & Faculty
export const staffApi = {
  getEmployees: (params) => apiClient.get('/employees', { params }),
  getEmployee: (id) => apiClient.get(`/employees/${id}`),
  getEmployeeDetail: (id) => apiClient.get(`/employees/${id}`),
  createEmployee: (data) => apiClient.post('/employees', data),
  updateEmployee: (id, data) => apiClient.put(`/employees/${id}`, data),
  getDepartments: () => apiClient.get('/simplemasters', { params: { type: 6 } }),
  getDesignations: () => apiClient.get('/simplemasters', { params: { type: 5 } }),
  getClassTeachers: (params) => {
    const classId = typeof params === 'object' ? params?.classId : params;
    const academicYearId = typeof params === 'object' ? params?.academicYearId : undefined;
    return apiClient.get('/teacher-allocations/class-teachers', { params: { classId, academicYearId } });
  },
  saveClassTeacher: (data) => apiClient.post('/teacher-allocations/class-teachers', data),
  getSubjectTeachers: (params) => apiClient.get('/teacher-allocations/subject-teachers', { params }),
  saveSubjectTeacher: (data) => apiClient.post('/teacher-allocations/subject-teachers', data),
  getMyAllocations: (params) => apiClient.get('/teacher-allocations/my-allocations', { params }),
};

// Teacher Allocations
export const teacherAllocationApi = {
  getClassTeachers: (params) => {
    const classId = typeof params === 'object' ? params?.classId : params;
    const academicYearId = typeof params === 'object' ? params?.academicYearId : undefined;
    return apiClient.get('/teacher-allocations/class-teachers', { params: { classId, academicYearId } });
  },
  saveClassTeacher: (data) => apiClient.post('/teacher-allocations/class-teachers', data),
  getSubjectTeachers: (params) => apiClient.get('/teacher-allocations/subject-teachers', { params }),
  saveSubjectTeacher: (data) => apiClient.post('/teacher-allocations/subject-teachers', data),
  getMyAllocations: (params) => apiClient.get('/teacher-allocations/my-allocations', { params }),
};

// Masters (Categories, Religions)
export const masterApi = {
  getCategories: () => apiClient.get('/simplemasters', { params: { type: 1 } }),
  getReligions: () => apiClient.get('/simplemasters', { params: { type: 2 } }),
};

// Exams
export const examsApi = {
  getExams: (params) => apiClient.get('/exams', { params }),
  getTerms: () => apiClient.get('/exams/terms'),
  getSchedules: (examId) => apiClient.get(`/exams/${examId}/schedules`),
  getMarks: (params) => apiClient.get('/exams/marks', { params }),
  getMarksForEntry: (scheduleId, sectionId) =>
    apiClient.get('/exams/marks', { params: { scheduleId, sectionId } }),
  saveMarksBulk: (data) => apiClient.post('/exams/marks/bulk', data),
};

// Transport
export const transportApi = {
  getVehicles: () => apiClient.get('/transport/vehicles'),
  saveVehicle: (data) => apiClient.post('/transport/vehicles', data),
  deleteVehicle: (id) => apiClient.delete(`/transport/vehicles/${id}`),
  getRoutes: () => apiClient.get('/transport/routes'),
  saveRoute: (data) => apiClient.post('/transport/routes', data),
  deleteRoute: (id) => apiClient.delete(`/transport/routes/${id}`),
};

// Inventory
export const inventoryApi = {
  getItems: (params) => apiClient.get('/inventory/items', { params }),
  createItem: (data) => apiClient.post('/inventory/items', data),
  updateItem: (id, data) => apiClient.put(`/inventory/items/${id}`, data),
  deleteItem: (id) => apiClient.delete(`/inventory/items/${id}`),
  getSummary: () => apiClient.get('/inventory/summary'),
  getCategories: () => apiClient.get('/inventory/categories'),
  getPurchases: () => apiClient.get('/inventory/purchases'),
  getIssues: () => apiClient.get('/inventory/issues'),
};

// Expenses
export const expenseApi = {
  getExpenses: (params) => apiClient.get('/expense', { params }),
  getCategories: () => apiClient.get('/expense/categories'),
  saveExpense: (data) => apiClient.post('/expense', data),
};

// Timetable
export const timetableApi = {
  getPeriods: () => apiClient.get('/timetable/periods'),
  getSectionTimetable: (sectionId) => apiClient.get(`/timetable/section/${sectionId}`),
  saveSlot: (data) => apiClient.post('/timetable/slot', data),
  deleteSlot: (id) => apiClient.delete(`/timetable/slot/${id}`),
  getTeacherTimetable: (employeeId) => apiClient.get(`/timetable/teacher/${employeeId}`),
  getFreeTeachers: (params) => apiClient.get('/timetable/free-teachers', { params }),
  getSubstitutions: (params) => apiClient.get('/timetable/substitutions', { params }),
  createSubstitution: (data) => apiClient.post('/timetable/substitutions', data),
  deleteSubstitution: (id) => apiClient.delete(`/timetable/substitutions/${id}`),
};

// Promotion & TC
export const tcApi = {
  getTransferCertificates: (params) => apiClient.get('/transfer-certificates', { params }),
  checkDues: (studentId) => apiClient.get(`/transfer-certificates/dues-check/${studentId}`),
  issueTc: (data) => apiClient.post('/transfer-certificates', data),
  getEligiblePromotion: (params) => apiClient.get('/promotion/eligible-students', { params }),
  promoteBulk: (data) => apiClient.post('/promotion/bulk', data),
};

// Notifications
export const notificationApi = {
  getNotifications: (params) => apiClient.get('/notifications', { params }),
  sendNotification: (data) => apiClient.post('/notifications', data),
  updateNotification: (id, data) => apiClient.put(`/notifications/${id}`, data),
  deleteNotification: (id) => apiClient.delete(`/notifications/${id}`),
};

// Student & Parent Portal API (Matching webapp portalApi)
export const portalApi = {
  getWards: () => apiClient.get('/portal/wards'),
  getDashboard: (studentId) => apiClient.get('/portal/dashboard', { params: { studentId } }),
  getAttendance: (params) => apiClient.get('/portal/attendance', { params }),
  getTimetable: (studentId) => apiClient.get('/portal/timetable', { params: { studentId } }),
  getExams: (studentId) => apiClient.get('/portal/exams', { params: { studentId } }),
  getFees: (studentId) => apiClient.get('/portal/fees', { params: { studentId } }),
  getReportCard: (studentId, examId) => apiClient.get('/portal/report-card', { params: { studentId, examId } }),
  getReceiptPrint: (receiptId, studentId) => apiClient.get(`/portal/receipts/${receiptId}/print`, { params: { studentId } }),
};

// WhatsApp Configuration & Communication
export const whatsappApi = {
  getConfig: () => apiClient.get('/whatsapp/config'),
};

// Super Admin SaaS & Multi-Tenant Management
export const superAdminApi = {
  getDashboardKpis: () => apiClient.get('/superadmin/dashboard/kpis'),
  getTenants: (params) => apiClient.get('/superadmin/tenants', { params }),
  getTenantById: (id) => apiClient.get(`/superadmin/tenants/${id}`),
  createTenant: (payload) => apiClient.post('/superadmin/tenants', payload),
  updateTenant: (id, payload) => apiClient.put(`/superadmin/tenants/${id}`, payload),
  resetAdminPassword: (id, newPassword) => apiClient.post(`/superadmin/tenants/${id}/reset-admin-password`, { newPassword }),
  updateTenantPortalAccess: (id, payload) => apiClient.put(`/superadmin/tenants/${id}/portal-access`, payload),
  getPlans: () => apiClient.get('/superadmin/plans'),
  getModuleCatalog: () => apiClient.get('/superadmin/modules/catalog'),
  getAuditLogs: (params) => apiClient.get('/superadmin/audit-logs', { params }),
  impersonateTenant: (schoolId) => apiClient.post(`/superadmin/tenants/${schoolId}/impersonate`),
};

export default apiClient;
