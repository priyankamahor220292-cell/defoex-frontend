import api from './api';

export const memberService = {
  checkAdviser: (code) => api.post('/api/registration/check-adviser', { adviser_code: code }),
  register: (data) => api.post('/api/registration/new', data),
  approve: (id, action) => api.post(`/api/registration/approve/${id}`, { action }),
  pending: (page = 1) => api.get(`/api/registration/pending?page=${page}`),
  list: (params) => api.get('/api/registration/list', { params }),
  get: (investorId) => api.get(`/api/registration/${investorId}`),
};
