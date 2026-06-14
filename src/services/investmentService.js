import api from './api';

export const investmentService = {
  create: (data) => api.post('/api/investment-plans/create', data),
  approve: (id, action) => api.post(`/api/investment-plans/approve/${id}`, { action }),
  list: (params) => api.get('/api/investment-plans/list', { params }),
  print: (irn) => api.get(`/api/investment-plans/print/${irn}`),
};
