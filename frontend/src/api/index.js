// ============================================================
//  API Helper — all calls to the backend go through here
// ============================================================
import axios from 'axios';

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: BASE });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('ko_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('ko_token');
      localStorage.removeItem('ko_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ---- Auth ----
export const login           = (data)     => api.post('/auth/login', data);
export const getMe           = ()         => api.get('/auth/me');
export const changePassword  = (data)     => api.post('/auth/change-password', data);

// ---- Orders ----
export const getOrders       = (params)   => api.get('/orders', { params });
export const getOrder        = (id)       => api.get(`/orders/${id}`);
export const createOrder     = (data)     => api.post('/orders', data);
export const updateOrder     = (id, data) => api.patch(`/orders/${id}`, data);
export const deleteOrder     = (id)       => api.delete(`/orders/${id}`);
export const addCallLog      = (id, note) => api.post(`/orders/${id}/calllogs`, { note });

// ---- Customers ----
export const getCustomers    = (params)   => api.get('/customers', { params });
export const getCustomer     = (id)       => api.get(`/customers/${id}`);
export const createCustomer  = (data)     => api.post('/customers', data);
export const updateCustomer  = (id, data) => api.patch(`/customers/${id}`, data);
export const addCommLog      = (id, data) => api.post(`/customers/${id}/commlogs`, data);

// ---- Inventory ----
export const getInventory    = (params)   => api.get('/inventory', { params });
export const createItem      = (data)     => api.post('/inventory', data);
export const updateItem      = (id, data) => api.patch(`/inventory/${id}`, data);
export const deleteItem      = (id)       => api.delete(`/inventory/${id}`);

// ---- Dealers ----
export const getDealers         = ()          => api.get('/dealers');
export const createDealer       = (data)      => api.post('/dealers', data);
export const getDealerPurchases = (id)        => api.get(`/dealers/${id}/purchases`);
export const addPurchase        = (id, data)  => api.post(`/dealers/${id}/purchases`, data);

// ---- Lens Prices ----
export const getLensPrices      = (params)    => api.get('/lens-prices', { params });
export const matchLensPrice     = (params)    => api.get('/lens-prices/match', { params });
export const createLensPrice    = (data)      => api.post('/lens-prices', data);
export const updateLensPrice    = (id, data)  => api.patch(`/lens-prices/${id}`, data);
export const deleteLensPrice    = (id)        => api.delete(`/lens-prices/${id}`);

// ---- Reports ----
export const getDashboard    = ()         => api.get('/reports/dashboard');
export const getRevenue      = (month)    => api.get('/reports/revenue', { params: { month } });
export const getTopSellers   = ()         => api.get('/reports/topsellers');
export const getLensJobs     = ()         => api.get('/reports/lensjobs');

export default api;
