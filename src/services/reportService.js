import api from './api';

export const reportService = {
  businessSummary: (branch_id) => api.get('/api/reports/business-summary', { params: { branch_id } }),
  listInvestors: (params) => api.get('/api/reports/list-investors', { params }),
  dashboardStats: () => api.get('/api/reports/dashboard-stats'),
};
