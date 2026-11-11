import apiClient from '../../api/client';

export const feesApi = {
  // Masters
  getHeads: () => apiClient.get('/fees/heads'),
  createHead: (data) => apiClient.post('/fees/heads', data),
  updateHead: (id, data) => apiClient.put(`/fees/heads/${id}`, data),
  deleteHead: (id) => apiClient.delete(`/fees/heads/${id}`),

  getGroups: () => apiClient.get('/fees/groups'),
  createGroup: (data) => apiClient.post('/fees/groups', data),

  getInstallments: () => apiClient.get('/fees/installments'),
  createInstallment: (data) => apiClient.post('/fees/installments', data),

  getStructures: (classId, feeGroupId) =>
    apiClient.get('/fees/structures', { params: { classId, feeGroupId } }),
  getClassFeeSummary: async (classId, feeGroupId) => {
    try {
      const res = await apiClient.get('/fees/class-summary', { params: { classId, feeGroupId } });
      if (res?.data?.data) return res;
    } catch (err) {
      // If 404 on live/older backend instances, fallback to client-side synthesis from /fees/structures & /fees/installments
      if (err.response?.status === 404) {
        const [structuresRes, installmentsRes, classesRes, groupsRes] = await Promise.all([
          apiClient.get('/fees/structures', { params: { classId, feeGroupId } }).catch(() => ({ data: { data: [] } })),
          apiClient.get('/fees/installments').catch(() => ({ data: { data: [] } })),
          apiClient.get('/classes').catch(() => ({ data: { data: [] } })),
          apiClient.get('/fees/groups').catch(() => ({ data: { data: [] } })),
        ]);

        const structures = structuresRes?.data?.data || [];
        const installments = (installmentsRes?.data?.data || []).sort(
          (a, b) => (a.displayOrder || 0) - (b.displayOrder || 0) || new Date(a.dueDate) - new Date(b.dueDate)
        );
        const classes = classesRes?.data?.data || [];
        const groups = groupsRes?.data?.data || [];

        const targetClass = classes.find((c) => String(c.id) === String(classId)) || classes[0] || { id: classId, name: 'Class' };
        const targetGroup = groups.find((g) => String(g.id) === String(feeGroupId)) || groups[0] || { id: feeGroupId || 0, name: 'General' };

        let totalAnnual = 0;
        let totalMandatory = 0;
        let totalOptional = 0;
        let totalOneTime = 0;
        let totalRecurring = 0;

        const headDtos = structures.map((st) => {
          const totalAmt = Number(st.totalAmount || 0);
          const isOneTime = st.type === 1 || String(st.type).toLowerCase() === 'onetime';
          const isOptional = !!st.isOptional;

          totalAnnual += totalAmt;
          if (isOptional) totalOptional += totalAmt;
          else totalMandatory += totalAmt;

          if (isOneTime) totalOneTime += totalAmt;
          else totalRecurring += totalAmt;

          return {
            feeHeadId: st.feeHeadId,
            feeHeadName: st.feeHeadName,
            feeHeadCode: st.feeHeadCode,
            feeHeadType: isOneTime ? 'OneTime' : 'Recurring',
            isOptional,
            totalAnnualAmount: totalAmt,
            installmentAmounts: st.installmentAmounts || {},
          };
        });

        const installmentDtos = installments.map((inst) => {
          let instTotal = 0;
          for (const st of structures) {
            instTotal += Number(st.installmentAmounts?.[inst.id] || 0);
          }
          return {
            installmentId: inst.id,
            installmentName: inst.name,
            dueDate: inst.dueDate,
            displayOrder: inst.displayOrder,
            totalAmount: instTotal,
          };
        });

        return {
          data: {
            success: true,
            data: {
              classId: targetClass.id,
              className: targetClass.name,
              feeGroupId: targetGroup.id,
              feeGroupName: targetGroup.name,
              totalAnnualFee: totalAnnual,
              totalMandatoryFee: totalMandatory,
              totalOptionalFee: totalOptional,
              totalOneTimeFee: totalOneTime,
              totalRecurringFee: totalRecurring,
              heads: headDtos,
              installments: installmentDtos,
            },
          },
        };
      }
      throw err;
    }
  },
  saveStructures: (data) => apiClient.post('/fees/structures', data),

  getFineRules: () => apiClient.get('/fees/fine-rules'),
  saveFineRule: (data) => apiClient.post('/fees/fine-rules', data),

  // Monthly Setup
  generateMonthlySchedule: (data) => apiClient.post('/fees/monthly-setup/generate-schedule', data),
  saveMonthlyStructure: (data) => apiClient.post('/fees/monthly-setup/save-structure', data),
  getMonthlySetupStatus: () => apiClient.get('/fees/monthly-setup/status'),

  // Assignments & Concessions
  bulkAssign: (data) => apiClient.post('/fees/assignments/bulk', data),
  getConcessions: (studentId) => apiClient.get('/fees/concessions', { params: { studentId } }),
  createConcession: (data) => apiClient.post('/fees/concessions', data),
  deleteConcession: (id) => apiClient.delete(`/fees/concessions/${id}`),

  // Collection & Receipts
  getStudentDues: (studentId) => apiClient.get(`/fees/students/${studentId}/dues`),
  getDiscountEligibility: () => apiClient.get('/fees/discount-eligibility'),
  collectFee: (data) => apiClient.post('/fees/collect', data),
  getReceiptPrint: (id) => apiClient.get(`/fees/receipts/${id}/print`),
  cancelReceipt: (id, data) => apiClient.post(`/fees/receipts/${id}/cancel`, data),

  // Reports & Demand Bills
  getDemandBills: (params) => apiClient.get('/fees/demand-bills', { params }),
  getDailyCollection: (params) => apiClient.get('/fees/reports/daily-collection', { params }),
  getDefaulters: (params) => apiClient.get('/fees/reports/defaulters', { params }),
  getClassMonthStatus: (params) => apiClient.get('/fees/reports/class-month-status', { params }),
  getStudentFullHistory: (studentId) => apiClient.get(`/fees/reports/students/${studentId}/history`),
};
