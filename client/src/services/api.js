import axios from 'axios';

const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
const baseURL = backendUrl ? `${backendUrl.replace(/\/$/, '')}/api` : '/api';

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

export default api;
