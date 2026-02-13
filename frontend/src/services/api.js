import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data)
};

export const ocrAPI = {
  processImage: (formData) => api.post('/ocr/process', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getHistory: () => api.get('/ocr/history'),
  deleteRecord: (id) => api.delete(`/ocr/record/${id}`)
};

export default api;