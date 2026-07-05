import api from './api';

export const investmentService = {
  create: (data) => api.post('/api/investment-plans/create', data),
  get: (id) => api.get(`/api/investment-plans/${id}`),
  update: (id, data) => api.put(`/api/investment-plans/${id}`, data),
  approve: (id, action) => api.post(`/api/investment-plans/approve-investment/${id}`, { action }),
  delete: (id) => api.delete(`/api/investment-plans/${id}`),
  list: (params) => api.get('/api/investment-plans/list', { params }),
  print: (irn) => api.get(`/api/investment-plans/print/${irn}`),
  receipt: (irn) => api.get(`/api/investment-plans/receipt/${irn}`),
};
