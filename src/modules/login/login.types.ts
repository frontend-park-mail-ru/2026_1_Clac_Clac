export interface LoginState {
  isLoading: boolean;
  globalError: string | null;
  fieldErrors: {
    email?: boolean;
    password?: boolean;
  };
}

export interface ApiError extends Error {
  status: number;
  data: {
    message: string;
    error: string;
  };
}

export interface LoginErrorPayload {
  globalError: string;
  fieldErrors?: {
    email: boolean;
    password: boolean;
  };
}

export interface SetGlobalErrorPayload {
  error: string | null;
}
