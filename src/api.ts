const API_URL = 'https://clac-clac.mooo.com/api';


export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface ApiError<T = unknown> {
  status: number;
  data: T | null;
}

const getCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
};

/**
 * Внутренняя функция для выполнения HTTP-запросов к API.
 * 
 * @param {string} method - HTTP-метод ('GET', 'POST', 'PUT', 'DELETE').
 * @param {string} url - Относительный путь API.
 * @param {Object|null} [body=null] - Тело запроса.
 * @param {Object} [headers={}] - Дополнительные HTTP-заголовки.
 * @returns {Promise<any>} Результат запроса.
 * @throws {Object} Объект ошибки, содержащий HTTP-статус и данные ошибки, если ответ не успешен.
 */
const request = async <TResponse = unknown, TBody = unknown>(
  method: HttpMethod,
  url: string,
  body: TBody | null = null,
  headers: HeadersInit = {}
): Promise<TResponse> => {
  const options: RequestInit = {
    method,
    headers: {
      ...headers,
    },
    credentials: 'include',
  };

  if (!(body instanceof FormData)) {
    (options.headers as Record<string, string>)['Content-Type'] = 'application/json';
  }

  if (method !== 'GET') {
    let csrfToken = getCookie('csrf_token');
    if (!csrfToken && url !== '/csrf') {
      try {
        await fetch(`${API_URL}/csrf`, { credentials: 'include' });
        csrfToken = getCookie('csrf_token');
      } catch (e) {
        console.error('Failed to get CSRF token', e);
      }
    }
    if (csrfToken) {
      (options.headers as Record<string, string>)['X-CSRF-Token'] = csrfToken;
    }
  }

  if (body) {
    if (body instanceof FormData) {
      options.body = body;
    } else {
      options.body = JSON.stringify(body);
    }
  }

  const response = await fetch(`${API_URL}${url}`, options);

  let data: TResponse | null;
  try {
    data = (await response.json()) as TResponse;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const error: ApiError = { status: response.status, data };
    throw error;
  }

  return data as TResponse;
};

export const apiClient = {
  get: <TResponse = unknown>(url: string, headers?: HeadersInit): Promise<TResponse> =>
    request<TResponse>('GET', url, null, headers),

  post: <TResponse = unknown, TBody = unknown>(url: string, body?: TBody, headers?: HeadersInit): Promise<TResponse> =>
    request<TResponse, TBody>('POST', url, body, headers),

  put: <TResponse = unknown, TBody = unknown>(url: string, body?: TBody, headers?: HeadersInit): Promise<TResponse> =>
    request<TResponse, TBody>('PUT', url, body, headers),

  delete: <TResponse = unknown>(url: string, headers?: HeadersInit): Promise<TResponse> =>
    request<TResponse>('DELETE', url, null, headers),
};

export const authApi = {
  checkAuth: () => apiClient.get('/me'),
  logout: () => apiClient.post('/logout'),
};

export const profileApi = {
  getProfile: () => apiClient.get('/profile'),
  updateProfile: (data: { display_name: string; description_user: string }) => apiClient.post('/update-profile', data),
  updateAvatar: (formData: FormData) => apiClient.post('/update-avatar', formData),
  deleteAvatar: () => apiClient.delete('/delete-avatar'),
};

export const boardsApi = {
  getBoards: () => apiClient.get('/home'),
  createBoard: (data: { board_name: string; description?: string }) => apiClient.post('/boards', data),
  updateBoard: (id: string, data: { board_name: string; description?: string }) => apiClient.put(`/boards/${id}`, data),
  deleteBoard: (id: string) => apiClient.delete(`/boards/${id}`),
};

export const kanbanApi = {
  getSections: (boardId: string) => apiClient.get(`/boards/${boardId}/sections`),
  createSection: (boardId: string, data: { section_name: string; position: number }) => apiClient.post(`/boards/${boardId}/sections`, data),
  updateSection: (sectionId: string, data: { section_name: string }) => apiClient.put(`/sections/${sectionId}`, data),
  deleteSection: (sectionId: string) => apiClient.delete(`/sections/${sectionId}`),

  getTasks: (sectionId: string) => apiClient.get(`/sections/${sectionId}/tasks`),
  createTask: (sectionId: string, data: { title: string, due_date?: string }) => apiClient.post(`/sections/${sectionId}/tasks`, data),
  updateTask: (taskId: string, data: { title: string, section_id?: string, assignee_id?: number | null }) => apiClient.put(`/tasks/${taskId}`, data),
  deleteTask: (taskId: string) => apiClient.delete(`/tasks/${taskId}`),
};
