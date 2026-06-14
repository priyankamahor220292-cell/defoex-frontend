import api from './api';

export const authService = {
  login: (credentials) => api.post('/api/auth/login', credentials),
  logout: () => api.post('/api/auth/logout'),
  me: () => api.get('/api/auth/me'),
  refresh: (token) => api.post('/api/auth/refresh', {}, { headers: { Authorization: `Bearer ${token}` } }),
  changePassword: (data) => api.post('/api/auth/change-password', data),
};
