import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hdl_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('hdl_token');
      const isAuthPath = window.location.pathname === '/login' || window.location.pathname === '/register';
      if (!isAuthPath) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
