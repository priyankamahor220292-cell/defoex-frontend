import api from './api';

export const walletService = {
  getBranch: (branchId) => api.get(`/api/branches/${branchId}`),
  topup: (branchId, data) => api.post(`/api/branches/${branchId}/topup`, data),
  history: (branchId, page = 1) => api.get(`/api/branches/${branchId}/wallet-history?page=${page}`),
};
