const API_URL = "https://clac-clac.mooo.com/api";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export interface ApiError<T = unknown> {
  status: number;
  data: T | null;
}

const getCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(";").shift() || null;
  }
  return null;
};

let cachedCsrfToken: string | null = null;

const fetchCsrfToken = async (): Promise<string | null> => {
  try {
    const csrfRes = await fetch(`${API_URL}/csrf`, { credentials: "include" });

    let token =
      csrfRes.headers.get("X-CSRF-Token") ||
      csrfRes.headers.get("X-Csrf-Token");

    if (!token) {
      try {
        const data = await csrfRes.json();
        token = data.csrf_token || data.token || data.csrfToken || null;
      } catch { }
    }

    if (!token) {
      token = getCookie("csrf_token");
    }

    return token;
  } catch (e) {
    console.error("Failed to get CSRF token", e);
    return null;
  }
};

const request = async <TResponse = unknown, TBody = unknown>(
  method: HttpMethod,
  url: string,
  body: TBody | null = null,
  headers: HeadersInit = {},
): Promise<TResponse> => {
  const options: RequestInit = {
    method,
    headers: { ...headers },
    credentials: "include",
  };

  if (!(body instanceof FormData)) {
    (options.headers as Record<string, string>)["Content-Type"] =
      "application/json";
  }

  if (method !== "GET") {
    let csrfToken = getCookie("csrf_token") || cachedCsrfToken;

    if (!csrfToken && url !== "/csrf") {
      csrfToken = await fetchCsrfToken();
    }

    if (csrfToken) {
      cachedCsrfToken = csrfToken;
      (options.headers as Record<string, string>)["X-CSRF-Token"] = csrfToken;
    }
  }

  if (body) {
    if (body instanceof FormData) {
      options.body = body;
    } else {
      options.body = JSON.stringify(body);
    }
  }

  let response = await fetch(`${API_URL}${url}`, options);

  if (response.status === 403 && method !== "GET" && url !== "/csrf") {
    console.warn("Received 403 Forbidden. Retrying with fresh CSRF token...");
    cachedCsrfToken = null;
    const newToken = await fetchCsrfToken();

    if (newToken) {
      cachedCsrfToken = newToken;
      (options.headers as Record<string, string>)["X-CSRF-Token"] = newToken;
      response = await fetch(`${API_URL}${url}`, options);
    }
  }

  if (url === "/login" || url === "/logout" || url === "/register") {
    cachedCsrfToken = null;
  }

  if (response.status === 401) {
    cachedCsrfToken = null;
  }

  let data: TResponse | null = null;
  try {
    const text = await response.text();
    if (text) {
      try {
        data = JSON.parse(text) as TResponse;
      } catch {
        data = text as unknown as TResponse;
      }
    } else {
      data = null;
    }
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
  get: <TResponse = unknown>(
    url: string,
    headers?: HeadersInit,
  ): Promise<TResponse> => request<TResponse>("GET", url, null, headers),

  post: <TResponse = unknown, TBody = unknown>(
    url: string,
    body?: TBody,
    headers?: HeadersInit,
  ): Promise<TResponse> =>
    request<TResponse, TBody>("POST", url, body, headers),

  put: <TResponse = unknown, TBody = unknown>(
    url: string,
    body?: TBody,
    headers?: HeadersInit,
  ): Promise<TResponse> => request<TResponse, TBody>("PUT", url, body, headers),

  patch: <TResponse = unknown, TBody = unknown>(
    url: string,
    body?: TBody,
    headers?: HeadersInit,
  ): Promise<TResponse> =>
    request<TResponse, TBody>("PATCH", url, body, headers),

  delete: <TResponse = unknown>(
    url: string,
    headers?: HeadersInit,
  ): Promise<TResponse> => request<TResponse>("DELETE", url, null, headers),
};

export const authApi = {
  checkAuth: () => apiClient.get("/me"),
  logout: () => apiClient.post("/logout"),
};

export const profileApi = {
  getProfile: () => apiClient.get("/profiles"),
  getProfileByLink: (link: string) => apiClient.get(`/profiles/${link}`),
  updateProfile: (data: { display_name: string; description_user: string }) =>
    apiClient.post("/profiles/info", data),
  updateAvatar: (formData: FormData) =>
    apiClient.put("/profiles/avatar", formData),
  deleteAvatar: () => apiClient.delete("/profiles/avatar"),
};

export const boardsApi = {
  getBoards: () => apiClient.get("/boards"),
  getBoard: (id: string) => apiClient.get(`/boards/${id}`),
  createBoard: (data: {
    name: string;
    description?: string;
    background?: string;
  }) => apiClient.post("/boards", data),
  updateBoard: (
    id: string,
    data: { name: string; description?: string; background?: string },
  ) => apiClient.put(`/boards/${id}`, data),
  updateBoardBackground: (id: string, formData: FormData) =>
    apiClient.put(`/boards/${id}/background`, formData),
  deleteBoard: (id: string) => apiClient.delete(`/boards/${id}`),
  getBoardUsers: (id: string) => apiClient.get(`/boards/${id}/users`),
};

export const kanbanApi = {
  getSections: (boardId: string) =>
    apiClient.get(`/boards/${boardId}/sections`),
  reorderSections: (boardId: string, data: { list_links: Array<string> }) =>
    apiClient.patch(`/boards/${boardId}/sections/reorder`, data),
  createSection: (data: {
    board_link: string;
    section_name: string;
    max_tasks?: number;
    is_mandatory?: boolean;
    color?: string;
  }) => apiClient.post(`/sections`, data),
  getSection: (sectionId: string) => apiClient.get(`/sections/${sectionId}`),
  updateSection: (sectionId: string, data: any) =>
    apiClient.put(`/sections/${sectionId}`, data),
  deleteSection: (sectionId: string) =>
    apiClient.delete(`/sections/${sectionId}`),

  getTasks: (sectionId: string) =>
    apiClient.get(`/sections/${sectionId}/cards`),
  getTask: (taskId: string) => apiClient.get(`/cards/${taskId}`),
  createTask: (data: {
    title: string;
    link_section: string;
    description?: string;
    link_executer?: string | null;
    link_author?: string;
    data_dead_line?: string;
  }) => apiClient.post(`/cards`, data),
  updateTask: (
    taskId: string,
    data: {
      link_card: string;
      title: string;
      link_executer?: string | null;
      description?: string;
      data_dead_line?: string;
    },
  ) => apiClient.put(`/cards/${taskId}`, data),
  deleteTask: (taskId: string) => apiClient.delete(`/cards/${taskId}`),
  reorderTask: (
    taskId: string,
    data: { link_card: string; link_section: string; position: number },
  ) => apiClient.patch(`/cards/${taskId}/reorder`, data),
};

const categoryMap: Record<string, string> = {
  "Баг": "bug",
  "Предложение": "proposal",
  "Продуктовая проблема": "complaint"
};

export const supportApi = {
  getTickets: () => apiClient.get("/appeals"),
  createTicket: (data: { category: string; description: string; display_name: string; mail: string }) => {
    const categoryKey = categoryMap[data.category] || data.category;
    return apiClient.post("/appeals", { ...data, category: categoryKey });
  },
  updateTicket: (id: string, data: { status: string }) => apiClient.patch(`/appeals/${id}`, data),
  getStatistics: () => apiClient.get("/stats"),
  uploadAttachment: (id: string, formData: FormData) => apiClient.put(`/appeals/${id}/attachment`, formData),
};
