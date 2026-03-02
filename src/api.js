const API_URL = 'http://localhost:8081';

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

  if (!response.ok) {
    throw new Error(`[API] ${method} request failed: ${response.status}`);
  }
  
  return response.json();
};

export const apiClient = {
  get: (url, headers = {}) => request('GET', url, null, headers),
  post: (url, body, headers = {}) => request('POST', url, body, headers),
  put: (url, body, headers = {}) => request('PUT', url, body, headers),
  delete: (url, headers = {}) => request('DELETE', url, null, headers),
};
