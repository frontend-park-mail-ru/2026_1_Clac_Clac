const API_URL = 'https://clac-clac.mooo.com/api';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface ApiError<T = unknown> {
  status: number;
  data: T | null;
}

const getCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
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
    headers: { ...headers },
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
  } catch (err) {
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

  patch: <TResponse = unknown, TBody = unknown>(url: string, body?: TBody, headers?: HeadersInit): Promise<TResponse> =>
    request<TResponse, TBody>('PATCH', url, body, headers),

  delete: <TResponse = unknown>(url: string, headers?: HeadersInit): Promise<TResponse> =>
    request<TResponse>('DELETE', url, null, headers),
};

export const authApi = {
  checkAuth: () => apiClient.get('/me'),
  logout: () => apiClient.post('/logout'),
};

export const profileApi = {
  getProfile: () => apiClient.get('/profiles'),
  updateProfile: (data: { display_name: string; description_user: string }) => apiClient.put('/profiles', data),
  updateAvatar: (formData: FormData) => apiClient.put('/profiles/avatar', formData),
  deleteAvatar: () => apiClient.delete('/profiles/avatar'),
};

export const boardsApi = {
  getBoards: () => apiClient.get('/boards'),
  getBoard: (id: string) => apiClient.get(`/boards/${id}`),
  createBoard: (data: { name: string; description?: string, background?: string }) => apiClient.post('/boards', data),
  updateBoard: (id: string, data: { name: string; description?: string, background?: string }) => apiClient.put(`/boards/${id}`, { link: id, ...data }),
  updateBoardBackground: (id: string, formData: FormData) => apiClient.put(`/boards/${id}/background`, formData),
  deleteBoard: (id: string) => apiClient.delete(`/boards/${id}`),
};

export const kanbanApi = {
  getSections: (boardId: string) => apiClient.get(`/boards/${boardId}/sections`),
  createSection: (data: { board_link: string; section_name: string; max_tasks?: number; is_mandatory?: boolean; color?: string }) => apiClient.post(`/sections`, data),
  updateSection: (sectionId: string, data: any) => apiClient.put(`/sections/${sectionId}`, data),
  deleteSection: (sectionId: string) => apiClient.delete(`/sections/${sectionId}`),

  getTasks: (sectionId: string) => apiClient.get(`/sections/${sectionId}/tasks`),
  getTask: (taskId: string) => apiClient.get(`/cards/${taskId}`),
  createTask: (data: { title: string; link_section: string; description?: string; link_executer?: string; link_author?: string; data_dead_line?: string }) => apiClient.post(`/cards`, data),
  updateTask: (taskId: string, data: { link_card: string; title: string; link_executer?: string; description?: string; data_dead_line?: string }) => apiClient.put(`/cards/${taskId}`, data),
  deleteTask: (taskId: string) => apiClient.delete(`/cards/${taskId}`),
};
