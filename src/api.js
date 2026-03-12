const API_URL = 'https://clac-clac.mooo.com/api';

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
const request = async (method, url, body = null, headers = {}) => {
  const options = {
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
  
  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw { status: response.status, data };
  }
  
  return data;
};

export const apiClient = {
  /**
   * Выполняет GET-запрос к API.
   * 
   * @param {string} url - Относительный путь API.
   * @param {Object} [headers={}] - Дополнительные HTTP-заголовки.
   * @returns {Promise<any>} Ответ сервера.
   */
  get: (url, headers = {}) => request('GET', url, null, headers),

  /**
   * Выполняет POST-запрос к API.
   * 
   * @param {string} url - Относительный путь API.
   * @param {Object} body - Тело запроса.
   * @param {Object} [headers={}] - Дополнительные HTTP-заголовки.
   * @returns {Promise<any>} Ответ сервера.
   */
  post: (url, body, headers = {}) => request('POST', url, body, headers),

  /**
   * Выполняет PUT-запрос к API.
   * 
   * @param {string} url - Относительный путь API.
   * @param {Object} body - Тело запроса.
   * @param {Object} [headers={}] - Дополнительные HTTP-заголовки.
   * @returns {Promise<any>} Ответ сервера.
   */
  put: (url, body, headers = {}) => request('PUT', url, body, headers),

  /**
   * Выполняет DELETE-запрос к API.
   * 
   * @param {string} url - Относительный путь API.
   * @param {Object} [headers={}] - Дополнительные HTTP-заголовки.
   * @returns {Promise<any>} Ответ сервера.
   */
  delete: (url, headers = {}) => request('DELETE', url, null, headers),
};
