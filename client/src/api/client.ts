/** API error shape — mirrors the server envelope in docs/API.md */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

/**
 * API origin from env (e.g. https://taskdeck-api.vercel.app), no trailing
 * slash and no path — `/api` is appended here so routes match the server
 * (`app.use('/api', …)`). Dev falls back to `/api` via the Vite proxy.
 */
const API_ORIGIN = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');
const BASE = `${API_ORIGIN}/api`;

/**
 * Single fetch wrapper: JSON in/out, cookies included, typed error envelope.
 * Every API call in the app goes through this function.
 */
type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown };

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 204) return undefined as T;

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const envelope = (data as { error?: { message?: string; code?: string } } | null)?.error;
    throw new ApiError(
      envelope?.message ?? 'Something went wrong. Please try again.',
      response.status,
      envelope?.code ?? 'UNKNOWN',
    );
  }

  return data as T;
}

// ---------- types (mirror docs/API.md) ----------

export type User = { id: string; name: string; email: string; createdAt: string };
export type Role = 'owner' | 'member';
export type Status = 'todo' | 'doing' | 'done';
export type Priority = 'low' | 'medium' | 'high';

export type ProjectListItem = {
  id: string;
  name: string;
  description: string | null;
  role: Role;
  taskCount: number;
  createdAt: string;
};

export type Project = {
  id: string;
  name: string;
  description: string | null;
  role: Role;
  createdAt: string;
  updatedAt: string;
  members: Array<{ userId: string; name: string; email: string; role: Role }>;
  tasks: Task[];
};

export type Task = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: Status;
  priority: Priority;
  dueDate: string | null;
  position: number;
  createdById: string;
  createdAt: string;
  updatedAt: string;
};

export type Comment = {
  id: string;
  body: string;
  createdAt: string;
  authorId: string;
  authorName: string;
};

export type TaskDetail = Task & {
  project: { id: string; name: string };
  comments: Comment[];
};

// ---------- auth ----------

export const auth = {
  register: (body: { name: string; email: string; password: string }) =>
    request<{ user: User }>('/auth/register', { method: 'POST', body }),
  login: (body: { email: string; password: string }) =>
    request<{ user: User }>('/auth/login', { method: 'POST', body }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  me: () => request<{ user: User }>('/auth/me'),
};

// ---------- projects ----------

export const projects = {
  list: () => request<{ projects: ProjectListItem[] }>('/projects'),
  get: (id: string) => request<{ project: Project }>(`/projects/${id}`),
  create: (body: { name: string; description?: string }) =>
    request<{ project: Project }>('/projects', { method: 'POST', body }),
  update: (id: string, body: { name?: string; description?: string | null }) =>
    request<{ project: Project }>(`/projects/${id}`, { method: 'PATCH', body }),
  remove: (id: string) => request<void>(`/projects/${id}`, { method: 'DELETE' }),
  addMember: (id: string, body: { email: string; role?: Role }) =>
    request<{ member: { userId: string; name: string; email: string; role: Role } }>(
      `/projects/${id}/members`,
      { method: 'POST', body },
    ),
  removeMember: (id: string, userId: string) =>
    request<void>(`/projects/${id}/members/${userId}`, { method: 'DELETE' }),
};

// ---------- tasks ----------

export const tasks = {
  listByProject: (projectId: string, status?: Status) =>
    request<{ tasks: Task[] }>(
      `/projects/${projectId}/tasks${status ? `?status=${status}` : ''}`,
    ),
  create: (
    projectId: string,
    body: { title: string; description?: string; status?: Status; priority?: Priority; dueDate?: string | null },
  ) => request<{ task: Task }>(`/projects/${projectId}/tasks`, { method: 'POST', body }),
  get: (id: string) => request<{ task: TaskDetail }>(`/tasks/${id}`),
  update: (
    id: string,
    body: Partial<Pick<Task, 'title' | 'description' | 'status' | 'priority' | 'dueDate' | 'position'>>,
  ) => request<{ task: Task }>(`/tasks/${id}`, { method: 'PATCH', body }),
  remove: (id: string) => request<void>(`/tasks/${id}`, { method: 'DELETE' }),
};

// ---------- comments ----------

export const comments = {
  create: (taskId: string, body: string) =>
    request<{ comment: Comment }>(`/tasks/${taskId}/comments`, { method: 'POST', body: { body } }),
  remove: (id: string) => request<void>(`/comments/${id}`, { method: 'DELETE' }),
};
