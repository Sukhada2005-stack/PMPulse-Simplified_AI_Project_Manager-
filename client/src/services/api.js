const API_BASE = '/api';

function getHeaders() {
  const token = localStorage.getItem('pulsepm_token');
  const headers = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    ...options,
    headers: {
      ...getHeaders(),
      ...(options.headers || {})
    }
  };

  try {
    const res = await fetch(url, config);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Server request failed');
    }
    return data;
  } catch (err) {
    console.error(`API Error [${endpoint}]:`, err);
    throw err;
  }
}

export const api = {
  auth: {
    login: (email, password) => request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),
    getMe: () => request('/auth/me'),
    getUsers: () => request('/auth/users')
  },
  employees: {
    getAll: () => request('/employees'),
    create: (data) => request('/employees', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    getAnalytics: (id) => request(`/employees/${id}/analytics`),
    remove: (id) => request(`/employees/${id}`, { method: 'DELETE' }),
    getMyWarnings: () => request('/employees/my/warnings'),
    sendWarning: (id, data) => request(`/employees/${id}/warnings`, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  },
  projects: {
    getAll: () => request('/projects'),
    getById: (id) => request(`/projects/${id}`),
    create: (data) => request('/projects', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    update: (id, data) => request(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    delete: (id) => request(`/projects/${id}`, {
      method: 'DELETE'
    }),
    createTask: (projectId, data) => request(`/projects/${projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    addMember: (projectId, userId) => request(`/projects/${projectId}/members`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId })
    }),
    removeMember: (projectId, userId) => request(`/projects/${projectId}/members/${userId}`, {
      method: 'DELETE'
    }),
    getMessages: (projectId) => request(`/projects/${projectId}/messages`),
    sendMessage: (projectId, data) => request(`/projects/${projectId}/messages`, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  },
  tasks: {
    getMyTasks: () => request('/tasks/my')
  },
  dailyLogs: {
    submit: (taskId, data) => request(`/tasks/${taskId}/daily-log`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    getProjectMatrix: (projectId, dateFrom, dateTo) => {
      let query = '';
      if (dateFrom && dateTo) query = `?date_from=${dateFrom}&date_to=${dateTo}`;
      return request(`/projects/${projectId}/matrix${query}`);
    },
    getFleetMatrix: (dateFrom, dateTo) => {
      let query = '';
      if (dateFrom && dateTo) query = `?date_from=${dateFrom}&date_to=${dateTo}`;
      return request(`/matrix/fleet${query}`);
    }
  },
  ai: {
    summarize: (payload) => request('/ai/summarize', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  }
};
