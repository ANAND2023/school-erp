import apiClient from '../../api/client';

export const inventoryApi = {
  // Summary & Stats
  getSummary: () => apiClient.get('/inventory/summary'),

  // Categories
  getCategories: () => apiClient.get('/inventory/categories'),
  createCategory: (data) => apiClient.post('/inventory/categories', data),
  updateCategory: (id, data) => apiClient.put(`/inventory/categories/${id}`, data),
  deleteCategory: (id) => apiClient.delete(`/inventory/categories/${id}`),

  // Suppliers / Vendors
  getSuppliers: () => apiClient.get('/inventory/suppliers'),
  createSupplier: (data) => apiClient.post('/inventory/suppliers', data),
  updateSupplier: (id, data) => apiClient.put(`/inventory/suppliers/${id}`, data),
  deleteSupplier: (id) => apiClient.delete(`/inventory/suppliers/${id}`),

  // Items
  getItems: (params) => apiClient.get('/inventory/items', { params }),
  getItemById: (id) => apiClient.get(`/inventory/items/${id}`),
  createItem: (data) => apiClient.post('/inventory/items', data),
  updateItem: (id, data) => apiClient.put(`/inventory/items/${id}`, data),
  deleteItem: (id) => apiClient.delete(`/inventory/items/${id}`),

  // Purchases (Stock Inward)
  getPurchases: () => apiClient.get('/inventory/purchases'),
  createPurchase: (data) => apiClient.post('/inventory/purchases', data),

  // Issues (Stock Outward)
  getIssues: () => apiClient.get('/inventory/issues'),
  createIssue: (data) => apiClient.post('/inventory/issues', data),
  returnIssueItem: (data) => apiClient.post('/inventory/issues/return', data),
  batchReturnIssue: (data) => apiClient.post('/inventory/issues/batch-return', data),

  // Stock Ledger
  getStockLogs: (params) => apiClient.get('/inventory/stock-logs', { params }),

  // Store & Slip Setup Profile (When selling under custom bookstore/vendor name)
  getSlipConfig: () => apiClient.get('/inventory/slip-config'),
  saveSlipConfig: (data) => apiClient.post('/inventory/slip-config', data),
};

export default inventoryApi;
