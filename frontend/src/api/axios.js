/**
 * Axios instance with base URL and JWT interceptor.
 * For static prototype, timeout is kept low (2500ms) so failure
 * to reach offline/remote endpoints falls back immediately to mock data.
 */
import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 2500,
});

// Attach JWT token and demo headers to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('dsms_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;

  const user = localStorage.getItem('dsms_user');
  if (user) {
    try {
      const parsed = JSON.parse(user);
      if (parsed?.username) config.headers['X-Demo-Username'] = parsed.username;
    } catch (_) {}
  }
  return config;
});

// Handle 401 globally — do NOT redirect or clear state if in demo/mock mode
API.interceptors.response.use(
  (res) => res,
  (err) => {
    const token = localStorage.getItem('dsms_token');
    const isMock = !token || token.startsWith('mock_token_');
    if (err.response?.status === 401 && !isMock) {
      localStorage.removeItem('dsms_token');
      localStorage.removeItem('dsms_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default API;
