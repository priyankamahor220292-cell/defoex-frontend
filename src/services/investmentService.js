import api from './api';

/** Normalize list API — supports legacy flat array or { items, total } shape */
export function normalizeInvestmentList(res) {
  const body = res?.data;
  if (!body) return { items: [], total: 0, page: 1, pages: 0, per_page: 20 };
  const payload = body.data;
  if (Array.isArray(payload)) {
    return {
      items: payload,
      total: body.total ?? payload.length,
      page: body.page ?? 1,
      pages: body.pages ?? 1,
      per_page: body.per_page ?? 20,
    };
  }
  return {
    items: payload?.items ?? [],
    total: payload?.total ?? 0,
    page: payload?.page ?? 1,
    pages: payload?.pages ?? 0,
    per_page: payload?.per_page ?? 20,
  };
}

export const investmentService = {
  create: (data) => api.post('/api/investment-plans/create', data),
  get: (id) => api.get(`/api/investment-plans/${id}`),
  update: (id, data) => api.put(`/api/investment-plans/${id}`, data),
  approve: (id, action) => api.post(`/api/investment-plans/approve-investment/${id}`, { action }),
  delete: (id) => api.delete(`/api/investment-plans/${id}`),
  list: async (params) => {
    const res = await api.get('/api/investment-plans/list', { params });
    const normalized = normalizeInvestmentList(res);
    return {
      ...res,
      data: {
        ...res.data,
        data: normalized,
      },
    };
  },
  print: (irn) => api.get(`/api/investment-plans/print/${irn}`),
  receipt: (irn) => api.get(`/api/investment-plans/receipt/${irn}`),
};
