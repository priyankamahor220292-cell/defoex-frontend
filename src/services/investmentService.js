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
  approve: async (id, action) => {
    if (!id) {
      throw Object.assign(new Error('Missing investment id'), {
        response: { data: { message: 'Cannot approve — plan id missing. Refresh the page.' } },
      });
    }
    const tryApprove = (url) => api.post(url, { action });
    let res;
    try {
      res = await tryApprove(`/api/investment-plans/approve-investment/${id}`);
    } catch (e) {
      if (e.response?.status === 404) {
        res = await tryApprove(`/api/investment-plans/approve/${id}`);
      } else {
        throw e;
      }
    }
    if (!res.data?.success) {
      throw Object.assign(new Error(res.data?.message || 'Approve failed'), {
        response: { data: res.data },
      });
    }
    return res;
  },
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
