import client from './client';

export const authApi = {
  login: (data) => client.post('/auth/login', data),
  me: () => client.get('/auth/me'),
  changePassword: (data) => client.post('/auth/change-password', data),
};

export const customerApi = {
  search: (q, ownerId) => client.get('/customers/search', { params: { q, ownerId } }),
  resolve: (data) => client.post('/customers/resolve', data),
  list: (params) => client.get('/customers', { params }),
  remove: (id) => client.delete(`/customers/${id}`),
};

export const leadApi = {
  create: (data) => client.post('/leads', data),
  list: (params) => client.get('/leads', { params }),
  summary: (params) => client.get('/leads/summary', { params }),
  close: (id) => client.patch(`/leads/${id}/close`),
  reassign: (id, ownerId) => client.patch(`/leads/${id}/reassign`, { ownerId }),
};

export const orderApi = {
  create: (data) => client.post('/orders', data),
  list: (params) => client.get('/orders', { params }),
  get: (id) => client.get(`/orders/${id}`),
  update: (id, data) => client.patch(`/orders/${id}`, data),
  setPriority: (id, priority) => client.patch(`/orders/${id}/priority`, { priority }),
  dispatch: (id, items) => client.post(`/orders/${id}/dispatch`, { items }),
  deliver: (id) => client.patch(`/orders/${id}/deliver`),
  cancel: (id, reason) => client.patch(`/orders/${id}/cancel`, { reason }),
  reassign: (id, ownerId) => client.patch(`/orders/${id}/reassign`, { ownerId }),
};

export const productFamilyApi = {
  list: (params) => client.get('/product-families', { params }),
  create: (data) => client.post('/product-families', data),
  update: (id, data) => client.patch(`/product-families/${id}`, data),
  remove: (id) => client.delete(`/product-families/${id}`),
};

export const productApi = {
  list: (params) => client.get('/products', { params }),
  create: (data) => client.post('/products', data),
  update: (id, data) => client.patch(`/products/${id}`, data),
  stockIn: (id, data) => client.post(`/products/${id}/stock-in`, data),
  ledger: (id) => client.get(`/products/${id}/ledger`),
  remove: (id) => client.delete(`/products/${id}`),
};

export const stockUploadApi = {
  preview: (formData) => client.post('/stock/upload/preview', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  commit: (data) => client.post('/stock/upload/commit', data),
};

export const userApi = {
  list: (params) => client.get('/users', { params }),
  create: (data) => client.post('/users', data),
  update: (id, data) => client.patch(`/users/${id}`, data),
  remove: (id) => client.delete(`/users/${id}`),
  detail: (id) => client.get(`/users/${id}/detail`),
};

export const bookMatchApi = {
  preview: (formData) => client.post('/book-match/preview', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export const notificationApi = {
  list: () => client.get('/notifications'),
  markRead: (id) => client.patch(`/notifications/${id}/read`),
  clearOne: (id) => client.delete(`/notifications/${id}`),
  clearAll: () => client.delete('/notifications'),
};

export const announcementApi = {
  list: () => client.get('/announcements'),
  create: (data) => client.post('/announcements', data),
  remove: (id) => client.delete(`/announcements/${id}`),
};

export const taskApi = {
  list: (params) => client.get('/tasks', { params }),
  create: (data) => client.post('/tasks', data),
  complete: (id) => client.patch(`/tasks/${id}/complete`),
};

export const dashboardApi = {
  marketing: (params) => client.get('/dashboard/marketing', { params }),
  warehouse: () => client.get('/dashboard/warehouse'),
  dispatch: () => client.get('/dashboard/dispatch'),
  admin: () => client.get('/dashboard/admin'),
  heatmap: (userId) => client.get('/dashboard/heatmap', { params: { userId } }),
  analytics: () => client.get('/dashboard/analytics'),
};
