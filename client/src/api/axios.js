/**
 * Axios HTTP Client (axios.js)
 * ----------------------------
 * Centralized HTTP request client with automatic JWT token attachment
 * and global 401 unauthorized session expiration handling.
 * 
 * Beginner Concept:
 * An interceptor acts like a toll booth: every outbound request gets stamped
 * with the user's secret token, and every inbound response is inspected for errors.
 */

import axios from 'axios';

// Base API URL from environment variable or dynamic hostname fallback
const defaultBaseUrl =
  typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost'
    ? `http://${window.location.hostname}:5000/api`
    : 'http://localhost:5000/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || defaultBaseUrl;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout
});

// Request Interceptor: Attach JWT bearer token if user is logged in
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('billsnap_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Catch expired or invalid authentication tokens
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear expired credentials
      localStorage.removeItem('billsnap_token');
      localStorage.removeItem('billsnap_user');

      // If user isn't already on the login page, redirect them
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
