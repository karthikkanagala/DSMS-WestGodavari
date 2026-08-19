/**
 * Axios instance with base URL and JWT interceptor.
 * All API calls go through this instance.
 */
import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 30000,
});

// Attach JWT token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('dsms_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally — clear auth and redirect to login
API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('dsms_token');
      localStorage.removeItem('dsms_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default API;
