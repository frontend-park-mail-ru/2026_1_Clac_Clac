const API_URL = 'https://clac-clac.mooo.com/api';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface ApiError<T = unknown> {
  status: number;
  data: T | null;
}

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
      'Content-Type': 'application/json',
      ...headers,
    },
    credentials: 'include',
  };

  if (body) {
    options.body = JSON.stringify(body);
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
  /**
   * Выполняет GET-запрос к API.
   * 
   * @param {string} url - Относительный путь API.
   * @param {Object} [headers={}] - Дополнительные HTTP-заголовки.
   * @returns {Promise<any>} Ответ сервера.
   */
  get: <TResponse = unknown>(url: string, headers?: HeadersInit): Promise<TResponse> =>
    request<TResponse>('GET', url, null, headers),

  /**
   * Выполняет POST-запрос к API.
   * 
   * @param {string} url - Относительный путь API.
   * @param {Object} body - Тело запроса.
   * @param {Object} [headers={}] - Дополнительные HTTP-заголовки.
   * @returns {Promise<any>} Ответ сервера.
   */
  post: <TResponse = unknown, TBody = unknown>(url: string, body?: TBody, headers?: HeadersInit): Promise<TResponse> =>
    request<TResponse, TBody>('POST', url, body, headers),

  /**
   * Выполняет PUT-запрос к API.
   * 
   * @param {string} url - Относительный путь API.
   * @param {Object} body - Тело запроса.
   * @param {Object} [headers={}] - Дополнительные HTTP-заголовки.
   * @returns {Promise<any>} Ответ сервера.
   */
  put: <TResponse = unknown, TBody = unknown>(url: string, body: TBody, headers?: HeadersInit): Promise<TResponse> =>
    request<TResponse, TBody>('PUT', url, body, headers),

  /**
   * Выполняет DELETE-запрос к API.
   * 
   * @param {string} url - Относительный путь API.
   * @param {Object} [headers={}] - Дополнительные HTTP-заголовки.
   * @returns {Promise<any>} Ответ сервера.
   */
  delete: <TResponse = unknown>(url: string, headers?: HeadersInit): Promise<TResponse> =>
    request<TResponse>('DELETE', url, null, headers),
};

export const profileApi = {
  getProfile: () => apiClient.get('/profile'),
  updateProfile: (data: { display_name: string; description_user: string }) => apiClient.post('/update-profile', data),
  updateAvatar: (formData: FormData) => {
    return fetch(`${API_URL}/api/update-avatar`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    }).then(res => {
      if (!res.ok) throw new Error('Ошибка загрузки аватара');
      return res.json();
    });
  },
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
  updateTask: (taskId: string, data: { title: string, section_id?: string }) => apiClient.put(`/tasks/${taskId}`, data),
  deleteTask: (taskId: string) => apiClient.delete(`/tasks/${taskId}`),
};
