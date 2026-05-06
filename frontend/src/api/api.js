import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authApi = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  register: (data) => api.post('/auth/register', data),
};

export const studentsApi = {
  getDashboard: () => api.get('/students/dashboard', { headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache', Expires: '0' } }),
  getAll: () => api.get('/students'),
  getById: (id) => api.get(`/students/${id}`),
};

export const attendanceApi = {
  record: (data) => api.post('/attendance', data),
  update: (id, data) => api.put(`/attendance/${id}`, data),
  getMonthly: (studentId, year, month) => api.get(`/attendance/student/${studentId}/monthly`, { params: { year, month } }),
  getHistory: (studentId) => api.get(`/attendance/history/${studentId}`),
  getMyHistory: () => api.get('/attendance/my-history', { headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache', Expires: '0' } }),
  getReport: (params) => api.get('/attendance/report', { params }),
  recordMonthlyPercentage: (data) => api.post('/attendance/monthly-percentage', data),
};

export const eligibilityApi = {
  check: (studentId) => api.get(`/eligibility/student/${studentId}`),
};

export const disciplineApi = {
  record: (data) => api.post('/discipline', data),
  getByStudent: (studentId) => api.get(`/discipline/student/${studentId}`),
};

export const paymentsApi = {
  getEligible: (month) => api.get('/payments/eligible', { params: { month } }),
  approve: (data) => api.post('/payments/approve', data),
  reject: (data) => api.post('/payments/reject', data),
};

export const notificationsApi = {
  getMy: () => api.get('/notifications/student', { headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache', Expires: '0' } }),
};

export const analyticsApi = {
  getDashboard: () => api.get('/analytics/dashboard', { headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache', Expires: '0' } }),
};

export const auditApi = {
  getLogs: () => api.get('/AuditLogs'),
};

export const governmentApi = {
  getAll: () => api.get('/GovernmentList'),
  add: (data) => api.post('/GovernmentList', data),
  assign: (id, scholarshipType) => api.put(`/GovernmentList/assign/${id}`, { scholarshipType }),
  delete: (id) => api.delete(`/GovernmentList/${id}`),
};

export const adminManagementApi = {
  getPendingStaff: () => api.get('/AdminManagement/pending-staff'),
  getApprovedStaff: () => api.get('/AdminManagement/approved-staff'),
  approveStaff: (userId) => api.post(`/AdminManagement/approve-staff/${userId}`),
  rejectStaff: (userId) => api.delete(`/AdminManagement/reject-staff/${userId}`),
  bulkAddStudents: (students) => api.post('/AdminManagement/bulk-students', students),
  getFinancialHistory: () => api.get('/AdminManagement/financial-history'),
  provisionAccount: (govListId, email) => api.post('/AdminManagement/provision-account', { govListId, email }),
};

export default api;
