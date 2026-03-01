const API_URL = 'http://localhost:8081';

export const apiClient = {
  get: async (url, headers = {}) => {
    const response = await fetch(`${API_URL}${url}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Ошибка GET запроса: ${response.status}`);
    }
    return response.json();
  },

  post: async (url, body, headers = {}) => {
    const response = await fetch(`${API_URL}${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      credentials: 'include',
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Ошибка POST запроса: ${response.status}`);
    }
    return response.json();
  },
};
