import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

const api = axios.create({
    baseURL: API_BASE,
    headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('urbanhelix_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401 errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('urbanhelix_token');
            localStorage.removeItem('urbanhelix_user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth
export const authAPI = {
    login: (data) => api.post('/auth/login', data),
    register: (data) => api.post('/auth/register', data),
    getProfile: () => api.get('/auth/me'),
    getUsers: (role) => api.get('/auth/users', { params: { role } }),
};

// Departments
export const deptAPI = {
    getAll: () => api.get('/departments'),
    getById: (id) => api.get(`/departments/${id}`),
    create: (data) => api.post('/departments', data),
    allocate: (id, amount) => api.put(`/departments/${id}/allocate`, { amount }),
};
// Wards
export const wardAPI = {
    getAll: () => api.get('/wards'),
};

// Projects
export const projectAPI = {
    getAll: (params) => api.get('/projects', { params }),
    getById: (id) => api.get(`/projects/${id}`),
    create: (data) => api.post('/projects', data),
    update: (id, data) => api.put(`/projects/${id}`, data),
    approve: (id, data) => api.put(`/projects/${id}/approve-v2`, data),
    assign: (id, data) => api.put(`/projects/${id}/assign`, data),
    updateStatus: (id, data) => api.put(`/projects/${id}/status`, data),
    reviseBudget: (id, data) => api.put(`/projects/${id}/revision`, data),
    logExpenditure: (id, data) => api.post(`/projects/${id}/expenditure`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
    verifyExpenditure: (projectId, expId, data) => api.put(`/projects/${projectId}/expenditure/${expId}/verify`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
    releaseExpenditure: (projectId, expId, data) => api.put(`/projects/${projectId}/expenditure/${expId}/release`, data),
    getMaterials: (category) => api.get(`/projects/materials/${category}`),
    getStats: () => api.get('/projects/stats/overview'),
};

// Milestones
export const milestoneAPI = {
    getAll: (params) => api.get('/milestones', { params }),
    create: (data) => api.post('/milestones', data),
    engineerApprove: (id, data) => api.put(`/milestones/${id}/engineer-approve`, data),
    financialApprove: (id, data) => api.put(`/milestones/${id}/financial-approve`, data),
};

// Fund Transactions
export const fundAPI = {
    getAll: (params) => api.get('/funds', { params }),
    disburse: (data) => api.post('/funds/disburse', data),
    verify: (id, data) => api.put(`/funds/${id}/verify`, data),
    getStats: () => api.get('/funds/stats/overview'),
};

// Grievances
export const grievanceAPI = {
    getAll: (params) => api.get('/grievances', { params }),
    create: (data) => api.post('/grievances', data),
    vote: (id, type) => api.put(`/grievances/${id}/vote`, { type }),
    resolve: (id, data) => api.put(`/grievances/${id}/resolve`, data),
};

// Audit / Blockchain
export const auditAPI = {
    verifyChain: () => api.get('/audit/verify-chain'),
    verifyRecord: (id) => api.get(`/audit/verify-record/${id}`),
    getChain: (params) => api.get('/audit/chain', { params }),
    getLogs: (params) => api.get('/audit/logs', { params }),
    getAnalytics: (category, ward, area) => api.get('/audit/analytics', { params: { category, ward, area } }),
};

// Notifications
export const notificationAPI = {
    getAll: () => api.get('/notifications'),
    markAsRead: (id) => api.put(`/notifications/${id}/read`),
};

export default api;
