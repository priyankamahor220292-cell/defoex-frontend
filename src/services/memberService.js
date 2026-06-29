import api from './api';

export const memberService = {
  checkAdviser: async (code) => {
    const body = { adviser_code: code };
    try {
      return await api.post('/api/advisers/verify-promoter', body);
    } catch (e) {
      if (e.response?.status === 404) {
        return api.post('/api/registration/check-adviser', body);
      }
      throw e;
    }
  },
  register: (data) => api.post('/api/registration/new', data),
  approve: (id, action) => api.post(`/api/registration/approve/${id}`, { action }),
  pending: (page = 1) => api.get(`/api/registration/pending?page=${page}`),
  list: (params) => api.get('/api/registration/list', { params }),
  get: (investorId) => api.get(`/api/registration/${investorId}`),
};
