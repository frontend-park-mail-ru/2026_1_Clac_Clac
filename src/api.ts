const API_URL = "https://clac-clac.ru/api";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export interface ApiError<T = unknown> {
  status: number;
  data: T | null;
}

export interface BaseResponse {
  status: string;
}

export interface ApiResponse<T> {
  status: string;
  data: T;
}

export interface UserInfoResponse {
  avatar: string;
  display_name: string;
  email: string;
  link: string;
}
export interface LogInRequest {
  email: string;
  password: string;
}
export interface RegisterRequest {
  display_name: string;
  email: string;
  password: string;
  repeated_password: string;
}
export interface PasswordRecoveryRequest {
  email: string;
}
export interface RecoveryCodeRequest {
  code: string;
}
export interface NewPasswordRequest {
  password: string;
  repeated_password: string;
  token_id: string;
}

export interface ProfileResponse {
  avatar_url: string;
  description_user: string;
  display_name: string;
  email: string;
  link: string;
}
export interface UpdateProfileRequest {
  description_user: string;
  display_name: string;
}
export interface AvatarResponse {
  avatar_url: string;
}

export interface BoardInfo {
  background: string;
  description: string;
  link: string;
  name: string;
}
export interface CreateBoardRequest {
  background?: string;
  description?: string;
  name: string;
}
export interface UpdateBoardRequest {
  background?: string;
  board_link: string;
  description?: string;
  name?: string;
}
export interface GetMembersResponse {
  members: { link: string; role: string }[];
}
export interface UploadBackgroundResponse {
  background_key: string;
}

export interface SectionInfo {
  color: string;
  is_mandatory: boolean;
  link: string;
  max_tasks: number;
  name: string;
  position: number;
}
export interface CreateSectionRequest {
  board_link: string;
  color?: string;
  is_mandatory?: boolean;
  max_tasks?: number;
  name: string;
}
export interface ListSectionLink {
  list_links: string[];
}

export interface SubtaskInfo {
  description: string;
  is_done: boolean;
  link?: string;
  subtask_link?: string;
  position: number;
}
export interface SubtaskResponse {
  description: string;
  is_done: boolean;
  position: number;
  subtask_link: string;
}
export interface CreateSubtaskRequest {
  description: string;
}
export interface UpdateSubtaskRequest {
  description: string;
  is_done: boolean;
}

export interface Card {
  deadline: string;
  description: string;
  executor_link: string;
  link: string;
  subtasks: SubtaskInfo[];
  title: string;
  position: number;
}
export interface CardResponse {
  card_link: string;
  deadline: string;
  description: string;
  executor_link: string;
  subtasks: SubtaskResponse[];
  title: string;
  position: number;
}
export interface AttachmentResponse {
  attachment_link: string;
  attachment_path: string;
  display_name: string;
  position: number;
}
export interface CardSingle {
  card_link: string;
  deadline: string;
  description: string;
  executor_link: string;
  position: number;
  subtasks: SubtaskInfo[];
  title: string;
  attachments?: AttachmentResponse[];
}
export interface CardsResponse {
  cards: Card[];
}
export interface CreateCardRequest {
  deadline?: string;
  description?: string;
  executor_link?: string;
  section_link: string;
  title: string;
}
export interface CreateCardResponse {
  card_link: string;
  position: number;
  section_link: string;
}
export interface UpdateCardRequest {
  deadline?: string;
  description?: string;
  executor_link?: string | null;
  title: string;
}
export interface ReorderCardsRequest {
  position: number;
  section_link: string;
}

export interface CommentResponse {
  author_link: string;
  comment_link: string;
  parent_link: string;
  text: string;
  created_at: string;
}
export interface CommentsResponse {
  comments: CommentResponse[];
}
export interface CreateCommentRequest {
  parent_link?: string;
  text: string;
}
export interface CreateCommentResponse {
  comment_link: string;
}
export interface UpdateCommentRequest {
  text: string;
}

export interface AppealInfo {
  appeal_id: number;
  appeal_link: string;
  attachment_url: string;
  attachment_key?: string;
  category: string;
  created_at: string;
  description: string;
  display_name: string;
  email: string;
  status: string;
}
export interface GetAppealsResponse {
  appeals: AppealInfo[];
  role: string;
}
export interface CreateAppealRequest {
  category: string;
  description: string;
  display_name: string;
  email: string;
}
export interface ChangeAppealStatusInfo {
  appeal_link?: string;
  new_status: string;
}
export interface AppealsStats {
  close_appeals: number;
  in_work_appeals: number;
  open_appeals: number;
}
export interface UploadAttachmentResponse {
  attachment_url: string;
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
  checkAuth: () => apiClient.get<BaseResponse>("/me"),
  login: (data: LogInRequest) => apiClient.post<ApiResponse<UserInfoResponse>, LogInRequest>("/login", data),
  register: (data: RegisterRequest) => apiClient.post<ApiResponse<UserInfoResponse>, RegisterRequest>("/register", data),
  logout: () => apiClient.post<BaseResponse>("/logout"),
  forgotPassword: (data: PasswordRecoveryRequest) => apiClient.post<BaseResponse, PasswordRecoveryRequest>("/forgot-password", data),
  checkCode: (data: RecoveryCodeRequest) => apiClient.post<BaseResponse, RecoveryCodeRequest>("/check-code", data),
  resetPassword: (data: NewPasswordRequest) => apiClient.post<BaseResponse, NewPasswordRequest>("/reset-password", data),
};

export const profileApi = {
  getProfile: () => apiClient.get<ApiResponse<ProfileResponse>>("/profiles"),
  getProfileByLink: (link: string) => apiClient.get<ApiResponse<ProfileResponse>>(`/profiles/${link}`),
  updateProfile: (data: UpdateProfileRequest) => apiClient.post<BaseResponse, UpdateProfileRequest>("/profiles/info", data),
  updateAvatar: (formData: FormData) => apiClient.put<ApiResponse<AvatarResponse>, FormData>("/profiles/avatar", formData),
  deleteAvatar: () => apiClient.delete<BaseResponse>("/profiles/avatar"),
};

export const boardsApi = {
  getBoards: () => apiClient.get<ApiResponse<BoardInfo[]>>("/boards"),
  getBoard: (link: string) => apiClient.get<ApiResponse<BoardInfo>>(`/boards/${link}`),
  createBoard: (data: CreateBoardRequest) => apiClient.post<ApiResponse<BoardInfo>, CreateBoardRequest>("/boards", data),
  updateBoard: (link: string, data: UpdateBoardRequest) => apiClient.put<BaseResponse, UpdateBoardRequest>(`/boards/${link}`, data),
  updateBoardBackground: (link: string, formData: FormData) => apiClient.put<ApiResponse<UploadBackgroundResponse>, FormData>(`/boards/${link}/background`, formData),
  deleteBoard: (link: string) => apiClient.delete<BaseResponse>(`/boards/${link}`),
  getBoardUsers: (link: string) => apiClient.get<ApiResponse<GetMembersResponse>>(`/boards/${link}/users`),
};

export const kanbanApi = {
  getSections: (boardLink: string) => apiClient.get<ApiResponse<SectionInfo[]>>(`/boards/${boardLink}/sections`),
  reorderSections: (boardLink: string, data: ListSectionLink) => apiClient.patch<BaseResponse, ListSectionLink>(`/boards/${boardLink}/sections/reorder`, data),
  createSection: (data: CreateSectionRequest) => apiClient.post<ApiResponse<SectionInfo>, CreateSectionRequest>(`/sections`, data),
  getSection: (sectionLink: string) => apiClient.get<ApiResponse<SectionInfo>>(`/sections/${sectionLink}`),
  updateSection: (sectionLink: string, data: Partial<SectionInfo>) => apiClient.put<BaseResponse, Partial<SectionInfo>>(`/sections/${sectionLink}`, data),
  deleteSection: (sectionLink: string) => apiClient.delete<BaseResponse>(`/sections/${sectionLink}`),

  getTasks: (sectionLink: string) => apiClient.get<ApiResponse<CardsResponse>>(`/sections/${sectionLink}/cards`),
  getTask: (taskLink: string) => apiClient.get<ApiResponse<CardSingle>>(`/cards/${taskLink}`),
  createTask: (data: CreateCardRequest) => apiClient.post<ApiResponse<CreateCardResponse>, CreateCardRequest>(`/cards`, data),
  updateTask: (taskLink: string, data: UpdateCardRequest) => apiClient.put<BaseResponse, UpdateCardRequest>(`/cards/${taskLink}`, data),
  deleteTask: (taskLink: string) => apiClient.delete<BaseResponse>(`/cards/${taskLink}`),
  reorderTask: (taskLink: string, data: ReorderCardsRequest) => apiClient.patch<BaseResponse, ReorderCardsRequest>(`/cards/${taskLink}/reorder`, data),

  getComments: (taskLink: string) => apiClient.get<ApiResponse<CommentsResponse>>(`/cards/${taskLink}/comments`),
  createComment: (taskLink: string, data: CreateCommentRequest) => apiClient.post<ApiResponse<CreateCommentResponse>, CreateCommentRequest>(`/cards/${taskLink}/comments`, data),
  updateComment: (commentLink: string, data: UpdateCommentRequest) => apiClient.put<BaseResponse, UpdateCommentRequest>(`/comments/${commentLink}`, data),
  deleteComment: (commentLink: string) => apiClient.delete<BaseResponse>(`/comments/${commentLink}`),

  createSubtask: (taskLink: string, data: CreateSubtaskRequest) => apiClient.post<ApiResponse<SubtaskResponse>, CreateSubtaskRequest>(`/cards/${taskLink}/subtasks`, data),
  updateSubtask: (subtaskLink: string, data: UpdateSubtaskRequest) => apiClient.put<BaseResponse, UpdateSubtaskRequest>(`/subtasks/${subtaskLink}`, data),
  deleteSubtask: (subtaskLink: string) => apiClient.delete<BaseResponse>(`/subtasks/${subtaskLink}`),

  uploadAttachment: (taskLink: string, formData: FormData) => apiClient.post<ApiResponse<AttachmentResponse>, FormData>(`/cards/${taskLink}/attachments`, formData),
  deleteAttachment: (attachmentLink: string) => apiClient.delete<BaseResponse>(`/attachments/${attachmentLink}`),
};

const categoryMap: Record<string, string> = {
  "Баг": "bug",
  "Предложение": "proposal",
  "Продуктовая проблема": "complaint"
};

export const supportApi = {
  getTickets: () => apiClient.get<ApiResponse<GetAppealsResponse>>("/appeals"),
  createTicket: (data: CreateAppealRequest) => {
    const categoryKey = categoryMap[data.category] || data.category;
    return apiClient.post<ApiResponse<{ appeal_link: string }>, CreateAppealRequest>("/appeals", { ...data, category: categoryKey });
  },
  updateTicket: (link: string, data: ChangeAppealStatusInfo) => apiClient.patch<ApiResponse<string>, ChangeAppealStatusInfo>(`/appeals/${link}`, data),
  deleteTicket: (link: string) => apiClient.delete<ApiResponse<string>>(`/appeals/${link}`),
  getStatistics: () => apiClient.get<ApiResponse<AppealsStats>>("/appeals/stats"),
  uploadAttachment: (link: string, formData: FormData) => apiClient.put<ApiResponse<UploadAttachmentResponse>, FormData>(`/appeals/${link}/attachment`, formData),
};
