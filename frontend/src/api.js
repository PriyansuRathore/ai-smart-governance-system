import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:5000/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Normalize response — backend returns { complaints, total } or flat array
const normalize = (res) => {
  const data = Array.isArray(res.data) ? res.data : (res.data.complaints ?? []);
  return { ...res, data };
};

export const submitComplaint         = (data)       => api.post('/complaints', data);
export const forceSubmitComplaint    = (data)       => api.post('/complaints/force', data);
export const getComplaints           = (params)     => api.get('/complaints', { params }).then(normalize);
export const getComplaint            = (id)         => api.get(`/complaints/${id}`);
export const getPublicComplaints     = (params)     => api.get('/complaints/public', { params });
export const getDepartmentComplaints = (params)     => api.get('/complaints/my-department', { params });
export const updateStatus            = (id, status) => api.patch(`/complaints/${id}/status`, { status });
export const reassignComplaint       = (id, data)   => api.patch(`/complaints/${id}/reassign`, data);
export const getAuditLog             = (id)         => api.get(`/complaints/${id}/audit`);
export const getStats                = ()           => api.get('/complaints/stats');
export const upvoteComplaint         = (id, voterEmail) => api.post(`/complaints/${id}/upvote`, { voterEmail });
export const getComments             = (id)         => api.get(`/complaints/${id}/comments`);
export const postComment             = (id, data)   => api.post(`/complaints/${id}/comments`, data);
