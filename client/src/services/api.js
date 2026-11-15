import axios from 'axios';

const backendUrl = import.meta.env.VITE_BACKEND_URL;
let baseURL = '/api';
if (backendUrl) {
  baseURL = `${backendUrl.replace(/\/$/, '')}/api`;
} else if (
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
) {
  baseURL = `http://${window.location.hostname}:5000/api`;
}

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
