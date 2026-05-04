import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Only redirect if we are not already on the login page or trying to log in
      const isAuthPage = window.location.pathname === '/login' || window.location.pathname === '/register';
      if (!isAuthPage) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => {
    console.log("AUTH API REGISTER:", data);
    return api.post('/auth/register', data);
  },
  login: (data) => {
    console.log("AUTH API LOGIN:", data);
    return api.post('/auth/login', data);
  },
  getCurrentUser: () => api.get('/auth/me'),
};

export const usersAPI = {
  updateProfile: (data) => api.patch('/users/me', data),
};

export const tasksAPI = {
  create: (data) => api.post('/tasks', data),
  getAll: (status) => api.get('/tasks', { params: { status } }),
  getOne: (id) => api.get(`/tasks/${id}`),
  update: (id, data) => api.patch(`/tasks/${id}`, data),
  delete: (id) => api.delete(`/tasks/${id}`),
};

export const activityAPI = {
  log: (data) => api.post('/activity', data),
  getAll: (params) => api.get('/activity', { params }),
};

export const moodAPI = {
  create: (data) => api.post('/mood', data),
  getAll: (days = 30) => api.get('/mood', { params: { days } }),
};

export const burnoutAPI = {
  calculate: () => api.post('/burnout/calculate'),
  getHistory: (days = 30) => api.get('/burnout', { params: { days } }),
  getLatest: () => api.get('/burnout/latest'),
};

export const forecastAPI = {
  get: (days = 7) => api.get('/forecast', { params: { days } }),
};

export const dashboardAPI = {
  get: () => api.get('/dashboard'),
};

export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
};

export default api;
