export interface LoginState {
  isLoading: boolean;
  globalError: string | null;
  fieldErrors: {
    email?: boolean;
    password?: boolean;
  };
}

export interface ApiError extends Error {
  status: "error";
  code: number;
  message: string;
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
