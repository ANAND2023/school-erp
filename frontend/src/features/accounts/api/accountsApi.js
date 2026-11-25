import apiClient from '../../../api/client';

export const accountsApi = {
  // Financial & Operational KPI Summary
  getSummary: (params) => apiClient.get('/accounts/summary', { params }),

  // Day Book / Cash Book (Unified chronological ledger)
  getDayBook: (params) => apiClient.get('/accounts/daybook', { params }),

  // Daily Fee Collection
  getDailyCollection: (params) => apiClient.get('/fees/reports/daily-collection', { params }),

  // School Expenses
  getExpenses: (params) => apiClient.get('/expense', { params }),

  // Staff Salary Disbursements
  getPayrolls: (params) => apiClient.get('/payroll', { params }),

  // Total Enquiries & Conversion Funnel
  getEnquiryReport: (params) => apiClient.get('/accounts/enquiry-report', { params }),

  // Total Admissions Report
  getAdmissionReport: (params) => apiClient.get('/accounts/admission-report', { params }),

  // Outstanding Dues / Defaulters
  getDefaulters: (params) => apiClient.get('/accounts/pending-dues-report', { params }),
};
