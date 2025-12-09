import axios from 'axios';

// Get the base API URL, removing any trailing slash
let API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
// Remove trailing slash if present
API_URL = API_URL.replace(/\/+$/, '');
// Remove /api or /api/v1 suffix if already present to avoid duplication
API_URL = API_URL.replace(/\/api(\/v1)?$/, '');

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically add trailing slashes to all API requests for Django REST Framework compatibility
// This ensures consistent behavior regardless of whether the developer remembers to add the slash
api.interceptors.request.use((config) => {
  if (config.url) {
    // Only add trailing slash if:
    // 1. URL doesn't already have one
    // 2. URL doesn't have a file extension (e.g., .json, .pdf)
    // 3. URL doesn't have query parameters starting without a slash
    const hasTrailingSlash = config.url.endsWith('/');
    const hasExtension = /\.[a-zA-Z0-9]+$/.test(config.url.split('?')[0]);
    const hasQueryParams = config.url.includes('?');
    
    if (!hasTrailingSlash && !hasExtension) {
      // Add trailing slash before query params if they exist
      if (hasQueryParams) {
        config.url = config.url.replace('?', '/?');
      } else {
        config.url = `${config.url}/`;
      }
    }
  }
  return config;
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
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
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
