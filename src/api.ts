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
