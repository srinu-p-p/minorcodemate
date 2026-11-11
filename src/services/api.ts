import axios from 'axios';
import {
  User,
  Project,
  ProjectFile,
  Task,
  Snapshot,
  ProjectMember,
  CodeReviewResult,
  CodeExplanationResult,
} from '../types/index.js';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to requests if present in localStorage
api.interceptors.request.use((reqConfig) => {
  const token = localStorage.getItem('codesync_token');
  if (token && reqConfig.headers) {
    reqConfig.headers.Authorization = `Bearer ${token}`;
  }
  return reqConfig;
});

// Handle 401 unauthenticated globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !window.location.pathname.startsWith('/login')) {
      // Token expired or invalid
      localStorage.removeItem('codesync_token');
      localStorage.removeItem('codesync_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  register: async (data: { email: string; password: string; name: string; role?: string }) => {
    const res = await api.post<{ token: string; user: User; message: string }>('/auth/register', data);
    return res.data;
  },
  login: async (data: { email: string; password: string }) => {
    const res = await api.post<{ token: string; user: User; message: string }>('/auth/login', data);
    return res.data;
  },
  me: async () => {
    const res = await api.get<{ user: User }>('/auth/me');
    return res.data.user;
  },
  updateProfile: async (data: { name?: string; role?: string; avatarUrl?: string }) => {
    const res = await api.patch<{ user: User; message: string }>('/auth/profile', data);
    return res.data;
  },
};

export const projectsApi = {
  list: async () => {
    const res = await api.get<{ projects: Project[] }>('/projects');
    return res.data.projects;
  },
  get: async (id: string) => {
    const res = await api.get<{ project: Project; userRole: 'owner' | 'editor' | 'viewer' }>(
      `/projects/${id}`
    );
    return res.data;
  },
  create: async (data: { name: string; description?: string; template?: string }) => {
    const res = await api.post<{ project: Project; message: string }>('/projects', data);
    return res.data.project;
  },
  update: async (id: string, data: { name?: string; description?: string }) => {
    const res = await api.patch<{ project: Project; message: string }>(`/projects/${id}`, data);
    return res.data.project;
  },
  delete: async (id: string) => {
    const res = await api.delete<{ message: string }>(`/projects/${id}`);
    return res.data;
  },
};

export const membersApi = {
  list: async (projectId: string) => {
    const res = await api.get<{ members: ProjectMember[] }>(`/projects/${projectId}/members`);
    return res.data.members;
  },
  add: async (projectId: string, data: { email: string; role?: string }) => {
    const res = await api.post<{ member: ProjectMember; message: string }>(
      `/projects/${projectId}/members`,
      data
    );
    return res.data.member;
  },
  updateRole: async (projectId: string, memberId: string, role: string) => {
    const res = await api.patch<{ member: ProjectMember; message: string }>(
      `/projects/${projectId}/members/${memberId}`,
      { role }
    );
    return res.data.member;
  },
  remove: async (projectId: string, memberId: string) => {
    const res = await api.delete<{ message: string }>(`/projects/${projectId}/members/${memberId}`);
    return res.data;
  },
};

export const filesApi = {
  list: async (projectId: string) => {
    const res = await api.get<{ files: ProjectFile[] }>(`/projects/${projectId}/files`);
    return res.data.files;
  },
  get: async (projectId: string, fileId: string) => {
    const res = await api.get<{ file: ProjectFile }>(`/projects/${projectId}/files/${fileId}`);
    return res.data.file;
  },
  create: async (
    projectId: string,
    data: { name?: string; path: string; content?: string; language?: string }
  ) => {
    const res = await api.post<{ file: ProjectFile; message: string }>(
      `/projects/${projectId}/files`,
      data
    );
    return res.data.file;
  },
  update: async (
    projectId: string,
    fileId: string,
    data: { content?: string; path?: string; name?: string; language?: string }
  ) => {
    const res = await api.patch<{ file: ProjectFile; message: string }>(
      `/projects/${projectId}/files/${fileId}`,
      data
    );
    return res.data.file;
  },
  delete: async (projectId: string, fileId: string) => {
    const res = await api.delete<{ message: string }>(`/projects/${projectId}/files/${fileId}`);
    return res.data;
  },
};

export const tasksApi = {
  list: async (projectId: string) => {
    const res = await api.get<{ tasks: Task[] }>(`/projects/${projectId}/tasks`);
    return res.data.tasks;
  },
  create: async (
    projectId: string,
    data: {
      title: string;
      description?: string;
      status?: string;
      priority?: string;
      dueDate?: string;
      assigneeId?: string;
    }
  ) => {
    const res = await api.post<{ task: Task; message: string }>(`/projects/${projectId}/tasks`, data);
    return res.data.task;
  },
  update: async (
    projectId: string,
    taskId: string,
    data: {
      title?: string;
      description?: string;
      status?: string;
      priority?: string;
      dueDate?: string;
      assigneeId?: string;
      order?: number;
    }
  ) => {
    const res = await api.patch<{ task: Task; message: string }>(
      `/projects/${projectId}/tasks/${taskId}`,
      data
    );
    return res.data.task;
  },
  delete: async (projectId: string, taskId: string) => {
    const res = await api.delete<{ message: string }>(`/projects/${projectId}/tasks/${taskId}`);
    return res.data;
  },
};

export const snapshotsApi = {
  list: async (projectId: string) => {
    const res = await api.get<{ snapshots: Snapshot[] }>(`/projects/${projectId}/snapshots`);
    return res.data.snapshots;
  },
  get: async (projectId: string, snapshotId: string) => {
    const res = await api.get<{ snapshot: Snapshot }>(`/projects/${projectId}/snapshots/${snapshotId}`);
    return res.data.snapshot;
  },
  create: async (projectId: string, data: { title: string; description?: string }) => {
    const res = await api.post<{ snapshot: Snapshot; message: string }>(
      `/projects/${projectId}/snapshots`,
      data
    );
    return res.data.snapshot;
  },
  restore: async (projectId: string, snapshotId: string) => {
    const res = await api.post<{ message: string; files: ProjectFile[] }>(
      `/projects/${projectId}/snapshots/${snapshotId}/restore`
    );
    return res.data;
  },
};

export const aiApi = {
  review: async (data: { code: string; language: string; filePath?: string }) => {
    const res = await api.post<CodeReviewResult>('/ai/review', data);
    return res.data;
  },
  explain: async (data: { code: string; language: string; context?: string }) => {
    const res = await api.post<CodeExplanationResult>('/ai/explain', data);
    return res.data;
  },
  chat: async (data: {
    question: string;
    code: string;
    language: string;
    history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  }) => {
    const res = await api.post<{ reply: string; provider: string; model: string }>('/ai/chat', data);
    return res.data;
  },
  status: async () => {
    const res = await api.get<{
      configuredModel: string;
      ollamaBaseUrl: string;
      hasGeminiFallback: boolean;
      timestamp: string;
    }>('/ai/status');
    return res.data;
  },
};

export default api;
