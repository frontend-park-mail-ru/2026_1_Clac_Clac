import { HttpMethod, ApiError } from "./types";

export const API_URL = "https://clac-clac.ru/api";

const getCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(";").shift() || null;
  }
  return null;
};

let cachedCsrfToken: string | null = null;

export const fetchCsrfToken = async (): Promise<string | null> => {
  try {
    const csrfRes = await fetch(`${API_URL}/csrf`, { credentials: "include" });

    let token =
      csrfRes.headers.get("X-CSRF-Token") ||
      csrfRes.headers.get("X-Csrf-Token");

    if (!token) {
      try {
        const data = await csrfRes.json();
        token = data.csrf_token || data.token || data.csrfToken || null;
      } catch {}
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

export const clearCachedCsrfToken = () => {
  cachedCsrfToken = null;
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
    (options.headers as Record<string, string>)["Content-Type"] = "application/json";
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
